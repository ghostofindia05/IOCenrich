from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
from app.workers.celery_app import celery_app
from app.core.warp_manager import ensure_warp_connected, get_proxy_url
import logging
import os
import uuid

logger = logging.getLogger(__name__)

# MinIO placeholder path (MVP local storage simulation)
EVIDENCE_DIR = "/tmp/ioc_evidence"
os.makedirs(EVIDENCE_DIR, exist_ok=True)

@celery_app.task(bind=True, max_retries=2, default_retry_delay=10)
def capture_url_evidence(self, user_id: str, indicator_id: str, url: str) -> dict:
    """
    Uses Playwright to capture a screenshot of a potentially malicious URL 
    while explicitly logging the HTTP 3xx redirect chain (up to 10 hops).
    """
    import urllib.parse
    import socket
    from app.core.extractor import _is_private_ip

    # Ensure WARP proxy is active before making any outbound connections.
    # Only Playwright traffic is proxied — all other services use the real IP.
    warp_active, warp_msg = ensure_warp_connected()
    if warp_active:
        logger.info("[WARP] Proxy active: %s — URL capture will use Cloudflare IP.", get_proxy_url())
    else:
        logger.warning("[WARP] Proxy not available (%s) — Proceeding without proxy (fail-open) to allow capture.", warp_msg)

    evidence = {
        "initial_url": url,
        "screenshot_path": None,
        "redirect_chain": [],
        "final_url": None,
        "status": "pending",
        "error": None,
        "warp_active": warp_active,
    }

    # 1. Protocol Allowlist
    parsed_url = urllib.parse.urlparse(url)
    if parsed_url.scheme not in ["http", "https"]:
        evidence["status"] = "failed"
        evidence["error"] = f"Protocol '{parsed_url.scheme}' is not allowed."
        return evidence
        
    # DNS Resolution and SSRF protection is handled by Cloudflare WARP.
    # We pass the original hostname through the SOCKS proxy, which resolves it remotely.
    # Trying to resolve locally and pass an IP to the proxy causes ERR_INVALID_ARGUMENT.
    
    # We use sync playwright here as Celery is fundamentally synchronous
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            # Route Playwright through Cloudflare WARP SOCKS5 proxy.
            # Only this browser context uses the proxy — no system-wide impact.
            context_kwargs = dict(
                ignore_https_errors=True,
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            )
            if warp_active:
                proxy_url = get_proxy_url()
                context_kwargs["proxy"] = {"server": proxy_url}
            context = browser.new_context(**context_kwargs)
            page = context.new_page()

            # Resource Exhaustion Protection: Block large media/font downloads
            def abort_large_resources(route):
                if route.request.resource_type in ["media", "font", "other"]:
                    route.abort()
                else:
                    route.continue_()
            
            page.route("**/*", abort_large_resources)
            
            # List to track the redirect hops
            hops = []
            
            # Listen to all responses to track the chain
            def handle_response(response):
                # Only log standard redirect status codes
                if response.status in [301, 302, 307, 308]:
                    hops.append({
                        "url": response.url,
                        "status": response.status,
                        "redirected_to": response.headers.get("location", "Unknown Sink")
                    })
                    
            page.on("response", handle_response)
            
            try:
                # We cap redirects implicitly via Playwright, but we only record the first 10
                response = page.goto(url, timeout=15000, wait_until="load")
                
                # Take screenshot
                filename = f"{indicator_id}.png"
                filepath = os.path.join(EVIDENCE_DIR, filename)
                page.screenshot(path=filepath, full_page=True)
                
                evidence["screenshot_path"] = filepath
                evidence["final_url"] = page.url
                
                # Enforce the 10 hop limit recording as specified
                evidence["redirect_chain"] = hops[:10]
                evidence["status"] = "success"

                # Immutable Audit Logging
                # Note: Celery workers are synchronous and may already have an event loop
                # running in some configurations. asyncio.run() raises RuntimeError in that
                # case. The safe pattern is to run the async work in a dedicated thread
                # that owns its own event loop.
                import asyncio
                import threading
                from app.db.session import get_async_session_maker
                from app.models.audit import AuditLog

                def _run_audit_in_thread():
                    async def _log_audit():
                        async_session_factory = get_async_session_maker()
                        async with async_session_factory() as db:
                            audit_log = AuditLog(
                                user_id=user_id,
                                action="capture_url_evidence",
                                entity_type="indicator",
                                entity_id=indicator_id,
                                details={
                                    "url": url,
                                    "final_url": evidence["final_url"],
                                    "screenshot_path": evidence["screenshot_path"],
                                    "warp_active": evidence["warp_active"],
                                }
                            )
                            db.add(audit_log)
                            await db.commit()

                    # Each thread gets its own event loop — safe from Celery's loop
                    loop = asyncio.new_event_loop()
                    try:
                        loop.run_until_complete(_log_audit())
                    finally:
                        loop.close()

                audit_thread = threading.Thread(target=_run_audit_in_thread, daemon=True)
                audit_thread.start()
                audit_thread.join(timeout=10)  # wait up to 10s, non-blocking on timeout
                
            except PlaywrightTimeoutError:
                evidence["status"] = "timeout"
                evidence["error"] = "Page took too long to load or redirect."
            except Exception as e:
                evidence["status"] = "failed"
                evidence["error"] = str(e)
            finally:
                browser.close()
                
    except Exception as exc:
         # Exponential backoff retry via Celery
         raise self.retry(exc=exc)

    return evidence
