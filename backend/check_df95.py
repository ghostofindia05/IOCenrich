import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def check():
    engine = create_async_engine(settings.async_database_url)
    async with engine.begin() as conn:
        result = await conn.execute(text("""
            SELECT i.value, i.threat_score
            FROM indicators i
            JOIN submission_indicators si ON i.id = si.indicator_id
            WHERE si.submission_id = 'df95a283-31dd-4ea3-af0a-63d6712c95cb'
        """))
        rows = result.fetchall()
        for r in rows:
            print(f"Indicator: {r[0]}, Score: {r[1]}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check())
