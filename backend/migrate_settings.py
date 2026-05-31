import asyncio
from sqlalchemy import text
from app.db.session import get_async_session_maker

async def migrate():
    async_session_factory = get_async_session_maker()
    async with async_session_factory() as db:
        try:
            await db.execute(text("ALTER TABLE user_settings ADD COLUMN alienvault_api_key_encrypted VARCHAR;"))
            await db.execute(text("ALTER TABLE user_settings ADD COLUMN urlhaus_api_key_encrypted VARCHAR;"))
            await db.commit()
            print("Migration successful")
        except Exception as e:
            print(f"Migration error (might already exist): {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
