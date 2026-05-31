import asyncio
from app.workers.tasks import resolve_dns
from app.models.domain import Indicator
from app.db.session import get_async_session_maker
from sqlalchemy import select

async def trigger():
    async_session_factory = get_async_session_maker()
    async with async_session_factory() as db:
        stmt = select(Indicator).where(Indicator.value == "microsoft.com")
        res = await db.execute(stmt)
        ind = res.scalar_one_or_none()
        
        if ind:
            print("Triggering resolve_dns for ID:", ind.id)
            # Call it synchronously to test logic directly, or asynchronously
            # we'll just run it as a celery task:
            resolve_dns.delay(ind.value, indicator_id=ind.id)
            print("Celery task dispatch complete. Wait 3 seconds and check db.")
        else:
            print("Indicator not found.")

if __name__ == "__main__":
    asyncio.run(trigger())
