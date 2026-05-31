import asyncio
from sqlalchemy import text
from app.db.session import get_async_session_maker

async def migrate():
    async_session_factory = get_async_session_maker()
    async with async_session_factory() as db:
        try:
            await db.execute(text("ALTER TABLE indicators ADD COLUMN analysis_status VARCHAR DEFAULT 'PENDING';"))
            await db.commit()
            print("Migration successful")
        except Exception as e:
            print(f"Migration error (might already exist): {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
