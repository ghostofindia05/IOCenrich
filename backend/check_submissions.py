import asyncio
from sqlalchemy import select
from app.db.session import get_async_session_maker
from app.models.domain import Submission

async def get_submissions():
    async_session_factory = get_async_session_maker()
    async with async_session_factory() as db:
        res = await db.execute(select(Submission).order_by(Submission.created_at.desc()).limit(5))
        submissions = res.scalars().all()
        for sub in submissions:
            print(f"ID: {sub.id}, Status: {sub.status}, Created: {sub.created_at}")

asyncio.run(get_submissions())
