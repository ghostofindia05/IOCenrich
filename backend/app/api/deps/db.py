from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.session import get_db
from app.api.deps.auth import verify_token

async def get_authenticated_db(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(verify_token)
) -> AsyncSession:
    """
    Sets the authenticated user_id in the PostgreSQL transaction context.
    This enables app-level Row Level Security policies to evaluate correctly.
    """
    await db.execute(
        text("SELECT set_config('request.jwt.claim.sub', :user_id, true)"),
        {"user_id": user_id}
    )
    yield db
