import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def check():
    engine = create_async_engine(settings.async_database_url)
    async with engine.begin() as conn:
        result = await conn.execute(text("SELECT user_id, vt_api_key_encrypted, urlscan_api_key_encrypted FROM user_settings"))
        rows = result.fetchall()
        for r in rows:
            print(f"User: {r[0]}")
            print(f"VT Key Encrypted: {r[1]}")
            print(f"URLScan Key Encrypted: {r[2]}")
            
            # Simple check to ensure it's not plaintext
            if r[1] == "dummy_secret_vt_key":
                print("[!] ERROR: VT Key is stored in plaintext!")
            else:
                print("[+] VT Key appears encrypted (or is None).")
                
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check())
