from celery import group
from app.workers.celery_app import celery_app
# Task imports moved inside process_indicators_pipeline
from app.models.domain import Indicator
from app.db.session import get_async_session_maker
from sqlalchemy.orm import selectinload
from sqlalchemy import select
from datetime import datetime, timezone
import asyncio

from app.models.domain import Indicator, Submission, submission_indicators

@celery_app.task
def process_indicators_pipeline(user_id: str, extracted_indicators: list, defang: bool = True, submission_id: str = None):
    """
    Main orchestration entry point. 
    1. Saves indicators to DB.
    2. Dispatches async enrichment tasks for multiple vendors.
    """
    import asyncio
    from app.workers.tasks import resolve_dns, query_external_ti
    from app.workers.playwright_worker import capture_url_evidence
    
    async def _orchestrate():
        async_session_factory = get_async_session_maker()
        async with async_session_factory() as db:
            # Fetch the submission if ID provided
            submission = None
            if submission_id:
                res = await db.execute(
                    select(Submission)
                    .options(selectinload(Submission.indicators))
                    .where(Submission.id == submission_id)
                )
                submission = res.scalar_one_or_none()

            try:
                for ind in extracted_indicators:
                    # 1. Deduplication / Check if exists
                    stmt = select(Indicator).where(Indicator.value == ind["value"])
                    res = await db.execute(stmt)
                    existing = res.scalars().first()
                    
                    target_indicator = None
                    if existing:
                        existing.last_seen = datetime.now(timezone.utc)
                        if ind.get("is_internal", False):
                            existing.analysis_status = "COMPLETED"
                        else:
                            existing.analysis_status = "ENRICHING"
                        target_indicator = existing
                    else:
                        new_ind = Indicator(
                            value=ind["value"],
                            type=ind["type"],
                            is_internal=ind.get("is_internal", False),
                            analysis_status="COMPLETED" if ind.get("is_internal", False) else "ENRICHING"
                        )
                        db.add(new_ind)
                        target_indicator = new_ind
                    
                    await db.flush() # Get IDs for relationships

                    # Link to submission
                    if submission and target_indicator not in submission.indicators:
                        submission.indicators.append(target_indicator)

                    await db.commit()

                    # 2. Dispatch sub-tasks (simplified parallel dispatch)
                    if ind["type"] == "domain":
                        resolve_dns.delay(ind["value"], indicator_id=target_indicator.id)
                    
                    if ind["type"] == "url":
                        capture_url_evidence.delay(user_id, target_indicator.id, ind["value"])
                    
                    if not ind.get("is_internal"):
                        # Primary Routing Engine logic (OTX for IPs/Domains/Hashes, URLhaus for URLs)
                        if ind["type"] == "url":
                            query_external_ti.delay(user_id, ind["value"], ind["type"], vendor="urlhaus", indicator_id=target_indicator.id)
                        else:
                            query_external_ti.delay(user_id, ind["value"], ind["type"], vendor="alienvault", indicator_id=target_indicator.id)
                        
                        # Trigger multi-vendor intelligence enrichment
                        # VT is always triggered if configured
                        query_external_ti.delay(user_id, ind["value"], ind["type"], vendor="vt", indicator_id=target_indicator.id)
                        
                        # IP-specific reputation checks
                        if ind["type"] == "ipv4":
                            query_external_ti.delay(user_id, ind["value"], ind["type"], vendor="abuseipdb", indicator_id=target_indicator.id)
                            query_external_ti.delay(user_id, ind["value"], ind["type"], vendor="greynoise", indicator_id=target_indicator.id)
                        
                if submission:
                    submission.status = "completed"
                    await db.commit()
            except Exception as e:
                if submission:
                    submission.status = "failed"
                    await db.commit()
                # Re-raise to let celery log the failure
                raise e

            return f"Orchestration started for {len(extracted_indicators)} indicators. Defanging: {defang}"

    return asyncio.run(_orchestrate())
