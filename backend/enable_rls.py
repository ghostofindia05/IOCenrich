import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings

async def enable_rls():
    print(f"Connecting to database: {settings.async_database_url}")
    engine = create_async_engine(settings.async_database_url)
    
    rls_commands = [
        # Create auth schema and uid mock function for local postgres
        "CREATE SCHEMA IF NOT EXISTS auth;",
        "CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid; $$ LANGUAGE SQL STABLE;",
        
        # Submissions
        "ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;",
        "DROP POLICY IF EXISTS subs_user_policy ON submissions;",
        "CREATE POLICY subs_user_policy ON submissions FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);",
        
        # User Settings
        "ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;",
        "DROP POLICY IF EXISTS setts_user_policy ON user_settings;",
        "CREATE POLICY setts_user_policy ON user_settings FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);"
    ]
    
    async with engine.begin() as conn:
        for cmd in rls_commands:
            from sqlalchemy import text
            await conn.execute(text(cmd))
            print(f"Executed: {cmd}")
            
    await engine.dispose()
    print("RLS successfully enabled on tables.")

if __name__ == "__main__":
    asyncio.run(enable_rls())
