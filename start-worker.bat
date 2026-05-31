@echo off
setlocal EnableDelayedExpansion
title IOCenrich — Celery Worker

echo.
echo ============================================================
echo   IOCenrich — Celery Background Worker
echo   Processes IOC enrichment tasks from the Redis queue.
echo   Pool: solo (Windows-compatible single-process mode)
echo ============================================================
echo.

:: ── Activate virtual environment ─────────────────────────────
if not exist "backend\venv\Scripts\activate.bat" (
    echo [ERROR] Virtual environment not found. Run setup.bat first.
    pause & exit /b 1
)

echo [INFO] Activating Python virtual environment...
call backend\venv\Scripts\activate.bat

:: ── Check Redis ──────────────────────────────────────────────
echo [INFO] Checking Redis connection...
redis-cli ping >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Redis is not responding on localhost:6379.
    echo         Start Redis before running the worker.
    echo         Quick start: docker run -d -p 6379:6379 redis:7-alpine
    pause & exit /b 1
)
echo [OK]   Redis is reachable.

:: ── Start Celery ─────────────────────────────────────────────
echo.
echo [INFO] Starting Celery worker (verbose, log level: INFO)...
echo        Worker processes: IOC enrichment, DNS resolution, threat intel queries
echo        Press CTRL+C to stop.
echo.

cd backend
venv\Scripts\celery.exe -A app.workers.celery_app.celery_app worker ^
    --loglevel=info ^
    --pool=solo ^
    --concurrency=1 ^
    -E

echo.
echo [INFO] Celery worker stopped.
pause
