import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import text
from app.models.domain import Indicator, Submission

async def check():
    try:
        async with AsyncSessionLocal() as db:
            print("DB Connected")
            res = await db.execute(text("SELECT count(*) FROM indicators"))
            print(f"Indicators count: {res.scalar()}")
            
            res = await db.execute(text("SELECT id, status FROM submissions ORDER BY created_at DESC LIMIT 5"))
            submissions = res.all()
            print("Recent submissions:")
            for s in submissions:
                print(f"  ID: {s.id}, Status: {s.status}")
    except Exception as e:
        print(f"Error checking DB: {e}")

if __name__ == "__main__":
    asyncio.run(check())
