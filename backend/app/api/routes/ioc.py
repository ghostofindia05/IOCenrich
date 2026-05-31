from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from app.api.deps.db import get_authenticated_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.domain import Submission
from sqlalchemy import select
from app.api.deps.auth import verify_token
from app.core.extractor import extract_indicators
from app.workers.orchestrator import process_indicators_pipeline
from fastapi_limiter.depends import RateLimiter
from app.schemas.ioc import IOCSubmission, IOCResponse, ExtractResponse, AnalyzeRequest

router = APIRouter()

@router.post("/extract", response_model=ExtractResponse, dependencies=[Depends(RateLimiter(times=10, seconds=60))])
async def extract(
    submission: IOCSubmission,
    user_id: str = Depends(verify_token)
):
    """
    Step 1: Parse raw text, extract, deduplicate, and classify IOCs.
    """
    if not submission.raw_text.strip():
        raise HTTPException(status_code=400, detail="Empty submission text")
        
    indicators = extract_indicators(submission.raw_text)
    
    if not indicators:
        raise HTTPException(status_code=400, detail="No readable indicators (IPs, Domains, URLs, Hashes) found in text.")

    return ExtractResponse(indicators=indicators)


@router.post("/analyze", response_model=IOCResponse, dependencies=[Depends(RateLimiter(times=10, seconds=60))])
async def submit_iocs(
    request: AnalyzeRequest,
    user_id: str = Depends(verify_token),
    db: AsyncSession = Depends(get_authenticated_db)
):
    """
    Step 2: Accepts pre-extracted indicators and dispatches async Celery task queues.
    """
    if not request.indicators:
        raise HTTPException(status_code=400, detail="No indicators provided for analysis.")

    # Convert the pydantic indicator objects into dictionaries for the pipeline
    indicators_dict = [ind.model_dump() for ind in request.indicators]

    # Phase 2: Create a persistent Submission record
    db_submission = Submission(
        user_id=user_id,
        raw_text=request.raw_text,
        defang=request.defang,
        status="processing"
    )
    db.add(db_submission)
    await db.commit()
    await db.refresh(db_submission)

    # Phase 3: Dispatch to Celery pipeline with the new submission_id
    task = process_indicators_pipeline.delay(user_id, indicators_dict, request.defang, db_submission.id)
    
    return IOCResponse(
        task_id=task.id,
        message="Indicators queued for analysis. Orchestration pipeline started.",
        extracted_count=len(request.indicators),
        submission_id=db_submission.id
    )
