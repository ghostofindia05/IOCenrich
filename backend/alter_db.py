import asyncio
from sqlalchemy import text
from app.db.session import get_async_session_maker

async def alter_db():
    async_session = get_async_session_maker()
    async with async_session() as session:
        try:
            await session.execute(text("ALTER TABLE indicators ADD COLUMN asn VARCHAR"))
            await session.commit()
            print("Added asn column.")
        except Exception as e:
            await session.rollback()
            print(f"Error adding asn: {e}")
            
        try:
            await session.execute(text("ALTER TABLE indicators ADD COLUMN geoip VARCHAR"))
            await session.commit()
            print("Added geoip column.")
        except Exception as e:
            await session.rollback()
            print(f"Error adding geoip: {e}")
            
        try:
            await session.execute(text("ALTER TABLE indicators ADD COLUMN campaign VARCHAR"))
            await session.commit()
            print("Added campaign column.")
        except Exception as e:
            await session.rollback()
            print(f"Error adding campaign: {e}")
            
        print("Database migration complete.")

if __name__ == "__main__":
    asyncio.run(alter_db())
