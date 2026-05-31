@echo off
setlocal EnableDelayedExpansion
title IOCenrich — Master Startup Utility

echo.
echo ============================================================
echo   IOCenrich — Master Control Startup Script (Windows)
echo ============================================================
echo.

:: ── Check Prerequisites ──────────────────────────────────────
echo [1/4] Checking system dependencies...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed. Run setup.bat first.
    pause & exit /b 1
)
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed. Run setup.bat first.
    pause & exit /b 1
)
echo      [OK] Python & Node.js are available.

:: ── Check & Start Redis ──────────────────────────────────────
echo.
echo [2/4] Checking Redis service...
redis-cli ping >nul 2>&1
if errorlevel 1 (
    echo [WARN] Redis is not running on port 6379.
    echo        Attempting to start Redis server in the background...
    start "IOCenrich — Redis Service" /min redis-server
    timeout /t 3 /nobreak >nul
    redis-cli ping >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Failed to start Redis. Please launch it manually.
        pause & exit /b 1
    ) else (
        echo      [OK] Redis started successfully.
    )
) else (
    echo      [OK] Redis is already running.
)

:: ── Check PostgreSQL ─────────────────────────────────────────
echo.
echo [3/4] Checking PostgreSQL server on port 5432...
:: Simple check to see if port 5432 is open
netstat -ano | findstr :5432 >nul 2>&1
if errorlevel 1 (
    echo [ERROR] PostgreSQL does not appear to be listening on port 5432.
    echo         Please ensure PostgreSQL is started and running.
    pause & exit /b 1
)
echo      [OK] PostgreSQL port is active.

:: ── Choose Mode ─────────────────────────────────────────────
echo.
echo [4/4] Select execution mode:
echo      [1] Development Mode (default - enables code reloading)
echo      [2] Production Mode (compiles optimized build & multi-worker backend)
echo.
set /p mode="Enter choice [1 or 2]: "

if "%mode%"=="2" (
    echo [INFO] Launching IOCenrich in PRODUCTION mode...
    echo        Opening startup windows...
    start "IOCenrich — Backend (Production)" cmd /c "start-backend-prod.bat"
    start "IOCenrich — Frontend (Production)" cmd /c "start-frontend-prod.bat"
    start "IOCenrich — Celery Worker" cmd /c "start-worker.bat"
) else (
    echo [INFO] Launching IOCenrich in DEVELOPMENT mode...
    echo        Opening startup windows...
    start "IOCenrich — Backend (Dev)" cmd /c "start-backend.bat"
    start "IOCenrich — Frontend (Dev)" cmd /c "start-frontend.bat"
    start "IOCenrich — Celery Worker" cmd /c "start-worker.bat"
)

echo.
echo ============================================================
echo   All services have been triggered!
echo   Monitor the logs in the newly opened console windows.
echo ============================================================
echo.
pause
