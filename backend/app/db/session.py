from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings

Base = declarative_base()

def get_async_session_maker():
    """
    Returns a fresh async session maker. 
    In Celery workers, we call this inside the task loop to avoid cross-loop errors.
    """
    engine = create_async_engine(settings.async_database_url, echo=False)
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# For FastAPI dependency (runs in its own loop per request usually)
AsyncSessionLocal = get_async_session_maker()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
