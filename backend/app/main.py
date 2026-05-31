from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.db.session import Base
from app.models import domain, audit
from app.core.config import settings
from app.core.logging_filters import setup_secure_logging

setup_secure_logging()
from sqlalchemy.ext.asyncio import create_async_engine

from fastapi_limiter import FastAPILimiter
import redis.asyncio as redis
import os

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.debug("main.py - Entering lifespan")
    engine = create_async_engine(settings.async_database_url)
    async with engine.begin() as conn:
        logger.debug("main.py - Running metadata create_all")
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()
    
    # Initialize Rate Limiter
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    redis_conn = redis.from_url(redis_url, encoding="utf-8", decode_responses=True)
    await FastAPILimiter.init(redis_conn)
    
    logger.debug("main.py - Lifespan yield")
    yield
    await redis_conn.close()
    logger.debug("main.py - Lifespan exit")

app = FastAPI(
    title="IOC Analysis Platform API",
    description="Backend engine for threat intelligence extraction, enrichment, and deduplication.",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://iocenrich.netdefend.in",
        "https://api-iocenrich.netdefend.in",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
)

from fastapi.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; frame-src 'self';"
        return response

app.add_middleware(SecurityHeadersMiddleware)

import logging
from fastapi import Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Log the full traceback internally
    logger.error(f"Unhandled exception at {request.url}: {repr(exc)}", exc_info=True)
    # Return a sanitized error message to the client
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again later."},
    )

logger.debug("main.py - About to import routes")
try:
    from app.api.routes import ioc, tracking, settings as settings_route, reports
    logger.debug("main.py - Routes imported successfully")
except Exception as e:
    logger.error(f"main.py - Error importing routes: {e}")
    raise

app.include_router(ioc.router, prefix="/api/v1/ioc", tags=["Indicators"])
app.include_router(tracking.router, prefix="/api/v1/tracking", tags=["Live Tracking"])
app.include_router(settings_route.router, prefix="/api/v1/settings", tags=["User Settings"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["Analysis Reports"])
logger.debug("main.py - Routers included")

@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "IOC Platform API is running."}
