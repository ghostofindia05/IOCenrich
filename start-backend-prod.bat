@echo off
setlocal EnableDelayedExpansion
title IOCenrich — Backend Server (Production)

echo.
echo ============================================================
echo   IOCenrich — Backend (FastAPI + Uvicorn) [PRODUCTION]
echo   Listening on: http://localhost:8000
echo   API Docs:     http://localhost:8000/docs
echo ============================================================
echo.

:: ── Activate virtual environment ─────────────────────────────
if not exist "backend\venv\Scripts\activate.bat" (
    echo [ERROR] Virtual environment not found. Run setup.bat first.
    pause & exit /b 1
)

echo [INFO] Activating Python virtual environment...
call backend\venv\Scripts\activate.bat

:: ── Check Redis is reachable ─────────────────────────────────
echo [INFO] Checking Redis connection...
redis-cli ping >nul 2>&1
if errorlevel 1 (
    echo [WARN]  Redis is not responding. Celery workers will not function.
    echo         Start Redis before running the backend.
) else (
    echo [OK]   Redis is reachable.
)

:: ── Run DB migrations ────────────────────────────────────────
echo [INFO] Running database migrations (alembic upgrade head)...
cd backend
alembic upgrade head
if errorlevel 1 (
    echo [WARN]  Migration failed. The database may be out of sync.
)
cd ..

:: ── Start Uvicorn ────────────────────────────────────────────
echo.
echo [INFO] Starting FastAPI backend with uvicorn (production, multi-worker)...
echo        Press CTRL+C to stop.
echo.

cd backend
venv\Scripts\uvicorn.exe app.main:app ^
    --host 0.0.0.0 ^
    --port 8000 ^
    --log-level info ^
    --workers 4 ^
    --use-colors

echo.
echo [INFO] Backend stopped.
pause
