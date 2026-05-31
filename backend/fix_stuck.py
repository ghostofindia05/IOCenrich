import asyncio
from sqlalchemy import select, update
from app.db.session import get_async_session_maker
from app.models.domain import Submission

async def fix_stuck():
    async_session_factory = get_async_session_maker()
    async with async_session_factory() as db:
        await db.execute(
            update(Submission)
            .where(Submission.status == 'processing')
            .values(status='failed')
        )
        await db.commit()
    print("Fixed stuck submissions")

asyncio.run(fix_stuck())
