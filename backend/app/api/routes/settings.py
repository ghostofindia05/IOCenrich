from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api.deps.db import get_authenticated_db
from app.models.domain import UserSetting
from app.api.deps.auth import verify_token
from app.core.vault import encrypt_api_key
from app.core.warp_manager import verify_warp_active, get_proxy_url
from pydantic import BaseModel, constr
from typing import Optional

router = APIRouter()

@router.get("/warp-status")
async def get_warp_status(
    user_id: str = Depends(verify_token),
):
    """Check if Cloudflare WARP proxy is active (used by URL-to-PNG capture)."""
    connected, message = verify_warp_active()
    return {
        "warp_connected": connected,
        "proxy": get_proxy_url() if connected else None,
        "message": message,
    }

APIKeyStr = constr(strip_whitespace=True, max_length=255)

class SettingsUpdate(BaseModel):
    vt_api_key: Optional[APIKeyStr] = None
    abuseipdb_api_key: Optional[APIKeyStr] = None
    greynoise_api_key: Optional[APIKeyStr] = None
    urlscan_api_key: Optional[APIKeyStr] = None
    whoisxml_api_key: Optional[APIKeyStr] = None
    hybrid_analysis_api_key: Optional[APIKeyStr] = None
    alienvault_api_key: Optional[APIKeyStr] = None
    urlhaus_api_key: Optional[APIKeyStr] = None

@router.get("")
async def get_settings(
    user_id: str = Depends(verify_token),
    db: AsyncSession = Depends(get_authenticated_db)
):
    result = await db.execute(select(UserSetting).where(UserSetting.user_id == user_id))
    settings = result.scalar_one_or_none()
    
    if not settings:
        return {}

    # We only return placeholders/status, never the raw keys
    return {
        "vt_api_key_configured": bool(settings.vt_api_key_encrypted),
        "abuseipdb_api_key_configured": bool(settings.abuseipdb_api_key_encrypted),
        "greynoise_api_key_configured": bool(settings.greynoise_api_key_encrypted),
        "urlscan_api_key_configured": bool(settings.urlscan_api_key_encrypted),
        "whoisxml_api_key_configured": bool(settings.whoisxml_api_key_encrypted),
        "hybrid_analysis_api_key_configured": bool(settings.hybrid_analysis_api_key_encrypted),
        "alienvault_api_key_configured": bool(settings.alienvault_api_key_encrypted),
        "urlhaus_api_key_configured": bool(settings.urlhaus_api_key_encrypted),
    }

@router.post("")
async def update_settings(
    update_data: SettingsUpdate,
    user_id: str = Depends(verify_token),
    db: AsyncSession = Depends(get_authenticated_db)
):
    result = await db.execute(select(UserSetting).where(UserSetting.user_id == user_id))
    settings = result.scalar_one_or_none()
    
    if not settings:
        settings = UserSetting(user_id=user_id)
        db.add(settings)

    if update_data.vt_api_key is not None:
        settings.vt_api_key_encrypted = encrypt_api_key(update_data.vt_api_key, user_id) if update_data.vt_api_key else None
        
    if update_data.abuseipdb_api_key is not None:
        settings.abuseipdb_api_key_encrypted = encrypt_api_key(update_data.abuseipdb_api_key, user_id) if update_data.abuseipdb_api_key else None

    if update_data.greynoise_api_key is not None:
        settings.greynoise_api_key_encrypted = encrypt_api_key(update_data.greynoise_api_key, user_id) if update_data.greynoise_api_key else None

    if update_data.urlscan_api_key is not None:
        settings.urlscan_api_key_encrypted = encrypt_api_key(update_data.urlscan_api_key, user_id) if update_data.urlscan_api_key else None

    if update_data.whoisxml_api_key is not None:
        settings.whoisxml_api_key_encrypted = encrypt_api_key(update_data.whoisxml_api_key, user_id) if update_data.whoisxml_api_key else None

    if update_data.hybrid_analysis_api_key is not None:
        settings.hybrid_analysis_api_key_encrypted = encrypt_api_key(update_data.hybrid_analysis_api_key, user_id) if update_data.hybrid_analysis_api_key else None

    if update_data.alienvault_api_key is not None:
        settings.alienvault_api_key_encrypted = encrypt_api_key(update_data.alienvault_api_key, user_id) if update_data.alienvault_api_key else None

    if update_data.urlhaus_api_key is not None:
        settings.urlhaus_api_key_encrypted = encrypt_api_key(update_data.urlhaus_api_key, user_id) if update_data.urlhaus_api_key else None

    await db.commit()
    return {"message": "Settings updated successfully"}
