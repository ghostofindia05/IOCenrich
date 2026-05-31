import asyncio
import json
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.session import get_async_session_maker
from app.models.domain import Indicator, DNSRecord

async def check():
    async_session_factory = get_async_session_maker()
    async with async_session_factory() as db:
        # get indicator for microsoft.com
        stmt = select(Indicator).options(selectinload(Indicator.dns_records)).where(Indicator.value == "microsoft.com")
        res = await db.execute(stmt)
        ind = res.scalar_one_or_none()
        
        if not ind:
            print("Indicator 'microsoft.com' not found in DB.")
            return
            
        print(f"Indicator: {ind.value}, ID: {ind.id}")
        
        if not ind.dns_records:
            print("No DNS records found for this indicator.")
        else:
            for rec in ind.dns_records:
                print(f"Record: type={rec.record_type}, value={rec.value}")

if __name__ == "__main__":
    asyncio.run(check())
