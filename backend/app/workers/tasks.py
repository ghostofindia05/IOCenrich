import os
import httpx
from sqlalchemy import select, delete
from datetime import datetime, timedelta, timezone
from app.workers.celery_app import celery_app
import dns.resolver
from typing import Dict, Any, List
import redis
import json
from app.core.config import settings
from app.core.vault import decrypt_api_key
from app.core.scoring import aggregate_threat_score, extract_intel_context
from app.db.session import get_async_session_maker
from app.models.domain import UserSetting, Indicator, DNSRecord
from app.models.audit import AuditLog
import logging
import logging

# Rate limiting settings for Celery workers (we don't want to get banned by alienvault/urlhaus)
r = redis.Redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"))

# Strict caching rule set per documentation (24-hour TTL)
CACHE_TTL_SECONDS = 86400  # 24 hours * 60 * 60

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, max_retries=3, default_retry_delay=5)
def resolve_dns(self, domain: str, indicator_id: str = None) -> Dict[str, Any]:
    """
    Performs concurrent DNS lookups utilizing `dnspython`.
    Checks the Redis cache first. If a fresh lookup isn't needed, returns cached data to save API latency.
    """
    cache_key = f"dns_cache:{domain}"
    
    # 1. Check Rate-Limiter/Cache
    cached = r.get(cache_key)
    if cached:
        logger.info(f"DNS Cache hit for {domain}")
        records = json.loads(cached)
        if indicator_id:
            a_records = records.get("A", [])
            aaaa_records = records.get("AAAA", [])
            if a_records or aaaa_records:
                _sync_dns_records_to_db(indicator_id, a_records, aaaa_records, domain)
        return records
        
    records = {
        "A": [],
        "AAAA": [],
        "MX": [],
        "NS": [],
        "TXT": [],
        "SOA": []
    }
    
    # 2. Execute Lookups (Using the dnspython library specified in the requirements)
    for record_type in records.keys():
        try:
            answers = dns.resolver.resolve(domain, record_type)
            records[record_type] = [str(rdata) for rdata in answers]
        except dns.resolver.NoAnswer:
            pass  # Normal, means record type doesn't exist for this domain
        except dns.resolver.NXDOMAIN:
            return {"error": "Domain does not exist"}
        except Exception as exc:
            logger.warning(f"DNS Error looking up {record_type} for {domain}: {exc}")
            
    # 3. Save to Redis Cache with a 24-hour expire (TTL)
    r.setex(cache_key, CACHE_TTL_SECONDS, json.dumps(records))

    # 4. Save to Database if indicator_id is provided
    a_records = records.get("A", [])
    aaaa_records = records.get("AAAA", [])
    if indicator_id and (a_records or aaaa_records):
        _sync_dns_records_to_db(indicator_id, a_records, aaaa_records, domain)
    
    return records

def _sync_dns_records_to_db(indicator_id: str, a_records: List[str], aaaa_records: List[str], domain: str):
    """Persist A (IPv4) and AAAA (IPv6) DNS records to the database."""
    import asyncio
    import threading

    async def _save_dns():
        async_session_factory = get_async_session_maker()
        async with async_session_factory() as db:
            # Clear existing A and AAAA records to avoid duplicates
            await db.execute(
                delete(DNSRecord).where(
                    DNSRecord.indicator_id == indicator_id,
                    DNSRecord.record_type.in_(["A", "AAAA"])
                )
            )
            for ip in a_records:
                db.add(DNSRecord(indicator_id=indicator_id, record_type="A", value=ip))
            for ip in aaaa_records:
                db.add(DNSRecord(indicator_id=indicator_id, record_type="AAAA", value=ip))
            await db.commit()

    def _run_in_thread():
        # Each thread owns its own event loop — safe from any existing Celery loop
        loop = asyncio.new_event_loop()
        try:
            loop.run_until_complete(_save_dns())
        finally:
            loop.close()

    try:
        t = threading.Thread(target=_run_in_thread, daemon=True)
        t.start()
        t.join(timeout=10)
    except Exception as e:
        logger.error(f"Failed to save DNS records for {domain}: {e}")

@celery_app.task(bind=True)
def query_external_ti(self, user_id: str, indicator_value: str, indicator_type: str, vendor: str = "vt", indicator_id: str = None) -> Dict[str, Any]:
    """
    Queries external APIs (VT, AbuseIPDB, GreyNoise, etc.) using envelope-encrypted user keys.
    """
    import asyncio
    
    async def _async_enrichment():
        # strict pre-flight check for RFC 1918 to prevent CWE-200
        from app.core.extractor import _is_private_ip
        if indicator_type == "ipv4" and _is_private_ip(indicator_value):
            return {"error": "Internal Asset - RFC 1918 address dropping enrichment request."}

        async_session_factory = get_async_session_maker()
        async with async_session_factory() as db:
            
            async def _update_db_score():
                if not indicator_id:
                    return
                # Calculate and update score
                results = {}
                for v in ['vt', 'abuseipdb', 'greynoise', 'urlscan']:
                    v_cache = r.get(f"ti_cache:{v}:{indicator_value}")
                    if v_cache:
                        v_data = json.loads(v_cache)
                        if "raw" in v_data:
                            results[v] = v_data["raw"]
                
                score = aggregate_threat_score(results)
                context = extract_intel_context(results)
                
                stmt = select(Indicator).where(Indicator.id == indicator_id)
                ind_res = await db.execute(stmt)
                ind_db = ind_res.scalar_one_or_none()
                if ind_db:
                    ind_db.threat_score = max(ind_db.threat_score or 0, int(score))
                    ind_db.analysis_status = "COMPLETED"
                    if context.get("asn"):
                        ind_db.asn = context["asn"]
                    if context.get("geoip"):
                        ind_db.geoip = context["geoip"]
                    if context.get("campaign"):
                        ind_db.campaign = context["campaign"]
                    if context.get("mapped_ttp"):
                        ind_db.mapped_ttp = context["mapped_ttp"]
                    await db.commit()

            cache_key = f"ti_cache:{vendor}:{indicator_value}"
            cached = r.get(cache_key)
            if cached:
                await _update_db_score()
                return json.loads(cached)

            stmt = select(UserSetting).where(UserSetting.user_id == user_id)
            result = await db.execute(stmt)
            user_settings = result.scalar_one_or_none()
            
            if not user_settings:
                return {"error": "User settings not found"}

            async with httpx.AsyncClient() as client:
                try:
                    if vendor == "vt":
                        if not user_settings.vt_api_key_encrypted:
                            await _update_db_score()
                            return {"error": "VT API key not configured"}
                        key = decrypt_api_key(user_settings.vt_api_key_encrypted, user_id)
                        headers = {"x-apikey": key}
                        endpoint = f"https://www.virustotal.com/api/v3/files/{indicator_value}" if indicator_type == "hash" else \
                                   f"https://www.virustotal.com/api/v3/ip_addresses/{indicator_value}" if indicator_type == "ipv4" else \
                                   f"https://www.virustotal.com/api/v3/domains/{indicator_value}"
                        resp = await client.get(endpoint, headers=headers, timeout=10.0)
                        
                    elif vendor == "abuseipdb":
                        if indicator_type != "ipv4":
                            await _update_db_score()
                            return {"error": "AbuseIPDB only supports IPs"}
                        if not user_settings.abuseipdb_api_key_encrypted:
                            await _update_db_score()
                            return {"error": "AbuseIPDB API key not configured"}
                        key = decrypt_api_key(user_settings.abuseipdb_api_key_encrypted, user_id)
                        headers = {"Key": key, "Accept": "application/json"}
                        endpoint = "https://api.abuseipdb.com/api/v2/check"
                        resp = await client.get(endpoint, headers=headers, params={"ipAddress": indicator_value}, timeout=10.0)

                    elif vendor == "greynoise":
                        if indicator_type != "ipv4":
                            await _update_db_score()
                            return {"error": "GreyNoise only supports IPs"}
                        if not user_settings.greynoise_api_key_encrypted:
                            await _update_db_score()
                            return {"error": "GreyNoise API key not configured"}
                        key = decrypt_api_key(user_settings.greynoise_api_key_encrypted, user_id)
                        headers = {"key": key}
                        endpoint = f"https://api.greynoise.io/v3/community/{indicator_value}"
                        resp = await client.get(endpoint, headers=headers, timeout=10.0)
                    
                    elif vendor == "urlhaus":
                        if indicator_type != "url":
                            await _update_db_score()
                            return {"error": "URLhaus is primarily for URLs"}
                        
                        headers = {}
                        if user_settings.urlhaus_api_key_encrypted:
                            key = decrypt_api_key(user_settings.urlhaus_api_key_encrypted, user_id)
                            headers["Auth-Key"] = key
                            
                        endpoint = "https://urlhaus-api.abuse.ch/v1/url/"
                        resp = await client.post(endpoint, data={"url": indicator_value}, headers=headers, timeout=10.0)
                        
                    elif vendor == "alienvault":
                        # AlienVault OTX allows 10,000 req/hr for free, no auth required for some public endpoints,
                        # but we still need an API key to avoid strict IP limits or get better data if available.
                        # For now we'll just try without API key or with an empty one if not set, or you can add to settings.
                        # Assuming no key required for public access based on user prompt ("With a free API key..." - they might add it later).
                        # We'll just pass it if it exists, otherwise omit or fail. Let's omit for now since user said "free API".
                        otx_type = "IPv4" if indicator_type == "ipv4" else "domain" if indicator_type == "domain" else "file"
                        endpoint = f"https://otx.alienvault.com/api/v1/indicators/{otx_type}/{indicator_value}/general"
                        resp = await client.get(endpoint, timeout=10.0)

                    else:
                        await _update_db_score()
                        return {"error": f"Unsupported vendor: {vendor}"}

                    if resp.status_code == 200:
                        data = resp.json()
                        result_data = {"raw": data, "vendor": vendor}
                        r.setex(cache_key, CACHE_TTL_SECONDS, json.dumps(result_data))
                        
                        await _update_db_score()

                        # Immutable Audit Logging
                        audit_log = AuditLog(
                            user_id=user_id,
                            action=f"query_external_ti_{vendor}",
                            entity_type="indicator",
                            entity_id=indicator_id,
                            details={"indicator": indicator_value, "type": indicator_type}
                        )
                        db.add(audit_log)
                        await db.commit()
                                
                        return result_data
                    
                    await _update_db_score()
                    return {"error": f"{vendor} returned {resp.status_code}", "detail": resp.text}
                except Exception as e:
                    import traceback
                    tb = traceback.format_exc()
                    logger.error(f"Error querying {vendor} for {indicator_value}: {e}\n{tb}")
                    # Only mark as FAILED if no other vendor has already completed this indicator.
                    # A timeout on one vendor (e.g. alienvault) should not override a COMPLETED
                    # result written by another vendor (e.g. VT).
                    async def _mark_failed():
                        if indicator_id:
                            stmt = select(Indicator).where(Indicator.id == indicator_id)
                            ind_res = await db.execute(stmt)
                            ind_db = ind_res.scalar_one_or_none()
                            if ind_db and ind_db.analysis_status == "ENRICHING":
                                # Still in ENRICHING — no other vendor finished, mark FAILED
                                ind_db.analysis_status = "FAILED"
                                await db.commit()
                            # If already COMPLETED or FAILED by another vendor, leave it alone
                    await _mark_failed()
                    return {"error": str(e), "traceback": tb}

    return asyncio.run(_async_enrichment())

@celery_app.task
def prune_stale_indicators():
    """
    Background worker to archive/prune indicators that haven't been sighted in 30 days.
    (IPs are pruned after 14 days as per recommendation).
    """
    import asyncio
    
    async def _do_pruning():
        async_session_factory = get_async_session_maker()
        async with async_session_factory() as db:
            now = datetime.now(timezone.utc)
            
            # Prune IPs > 14 days
            ip_cutoff = now - timedelta(days=14)
            await db.execute(
                delete(Indicator).where(Indicator.type == 'ipv4', Indicator.last_seen < ip_cutoff)
            )
            
            # Prune others > 30 days
            std_cutoff = now - timedelta(days=30)
            await db.execute(
                delete(Indicator).where(Indicator.type != 'ipv4', Indicator.last_seen < std_cutoff)
            )
            
            await db.commit()
            
    asyncio.run(_do_pruning())
    return "Pruning complete"
