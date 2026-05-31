from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from sqlalchemy import func
from app.api.deps.db import get_authenticated_db
from app.models.domain import Submission, Indicator, submission_indicators
from app.api.deps.auth import verify_token
from app.core.extractor import extract_indicators
from app.workers.orchestrator import process_indicators_pipeline
from typing import List
import os
import pathlib
from fastapi.responses import FileResponse

router = APIRouter()

@router.delete("/{submission_id}")
async def delete_report(
    submission_id: str,
    user_id: str = Depends(verify_token),
    db: AsyncSession = Depends(get_authenticated_db)
):
    """
    Deletes a specific submission and its associations.
    """
    # Verify ownership and existence
    result = await db.execute(
        select(Submission)
        .where(Submission.id == submission_id, Submission.user_id == user_id)
    )
    submission = result.scalar_one_or_none()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Report not found")

    # Delete associations in the many-to-many table
    await db.execute(
        delete(submission_indicators)
        .where(submission_indicators.c.submission_id == submission_id)
    )
    
    # Delete the submission
    await db.execute(
        delete(Submission)
        .where(Submission.id == submission_id)
    )
    
    await db.commit()
    
    return {"message": "Report deleted successfully"}

@router.post("/{submission_id}/reanalyze")
async def reanalyze_report(
    submission_id: str,
    user_id: str = Depends(verify_token),
    db: AsyncSession = Depends(get_authenticated_db)
):
    """
    Reanalyzes an existing submission by clearing its indicators and re-running the extraction and enrichment pipeline.
    """
    # Fetch the submission
    result = await db.execute(
        select(Submission)
        .where(Submission.id == submission_id, Submission.user_id == user_id)
    )
    submission = result.scalar_one_or_none()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Report not found")
        
    # Delete associations in the many-to-many table
    await db.execute(
        delete(submission_indicators)
        .where(submission_indicators.c.submission_id == submission_id)
    )
    
    # Extract indicators from raw text again
    indicators = extract_indicators(submission.raw_text)
    
    if not indicators:
        raise HTTPException(status_code=400, detail="No readable indicators found in the original submission text.")
        
    # Update status to processing
    submission.status = "processing"
    db.add(submission)
    await db.commit()
    
    # Dispatch Celery pipeline
    task = process_indicators_pipeline.delay(user_id, indicators, submission.defang, submission.id)
    
    return {
        "message": "Report reanalysis started.",
        "task_id": task.id,
        "extracted_count": len(indicators)
    }

@router.get("")
async def list_reports(
    user_id: str = Depends(verify_token),
    db: AsyncSession = Depends(get_authenticated_db)
):
    """
    Returns a list of all historical submissions for the current user.
    """
    result = await db.execute(
        select(Submission)
        .where(Submission.user_id == user_id)
        .order_by(Submission.created_at.desc())
    )
    submissions = result.scalars().all()
    
    return [
        {
            "id": s.id,
            "created_at": s.created_at,
            "status": s.status,
            "indicator_count": await _get_indicator_count(s.id, db),
            "defang": s.defang
        }
        for s in submissions
    ]

@router.get("/evidence/{indicator_id}")
async def get_url_evidence(
    indicator_id: str,
    user_id: str = Depends(verify_token)
):
    """
    Serves the URL screenshot for a given indicator ID.
    Path traversal is prevented by resolving the canonical path and asserting
    it stays within the evidence directory before serving.
    """
    EVIDENCE_DIR = "/tmp/ioc_evidence"
    safe_dir = pathlib.Path(EVIDENCE_DIR).resolve()
    filepath = (safe_dir / f"{indicator_id}.png").resolve()

    # [H-5] Reject any path that escapes the evidence directory
    if not str(filepath).startswith(str(safe_dir) + "/"):
        raise HTTPException(status_code=400, detail="Invalid indicator ID")

    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Evidence not found or still processing")

    return FileResponse(str(filepath), media_type="image/png")


@router.get("/{submission_id}")
async def get_report_detail(
    submission_id: str,
    user_id: str = Depends(verify_token),
    db: AsyncSession = Depends(get_authenticated_db)
):
    """
    Fetches the detailed results for a specific submission.
    """
    result = await db.execute(
        select(Submission)
        .options(
            selectinload(Submission.indicators).selectinload(Indicator.dns_records)
        )
        .where(Submission.id == submission_id, Submission.user_id == user_id)
    )
    submission = result.scalar_one_or_none()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Report not found")
        
    return {
        "id": submission.id,
        "created_at": submission.created_at,
        "status": submission.status,
        "raw_text": submission.raw_text,
        "defang": submission.defang,
        "indicators": [
            {
                "id": i.id,
                "value": i.value,
                "type": i.type,
                "threat_score": i.threat_score,
                "mapped_ttp": i.mapped_ttp,
                "campaign": i.campaign,
                "asn": i.asn,
                "geoip": i.geoip,
                "is_internal": i.is_internal,
                "analysis_status": i.analysis_status,
                "dns_records": [{"type": d.record_type, "value": d.value} for d in i.dns_records],
                "first_seen": i.first_seen.isoformat() if i.first_seen else None,
                "last_seen": i.last_seen.isoformat() if i.last_seen else None
            }
            for i in submission.indicators
        ]
    }

async def _get_indicator_count(submission_id: str, db: AsyncSession) -> int:
    # Helper to count indicators (could be optimized with a join/count)
    from sqlalchemy import func
    from app.models.domain import submission_indicators
    result = await db.execute(
        select(func.count())
        .select_from(submission_indicators)
        .where(submission_indicators.c.submission_id == submission_id)
    )
    return result.scalar() or 0


