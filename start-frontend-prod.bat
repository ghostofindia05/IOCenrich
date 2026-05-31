@echo off
setlocal EnableDelayedExpansion
title IOCenrich — Frontend (Next.js Production)

echo.
echo ============================================================
echo   IOCenrich — Frontend (Next.js Production Server)
echo   Listening on: http://localhost:3000
echo ============================================================
echo.

:: ── Check node_modules ───────────────────────────────────────
if not exist "frontend\node_modules" (
    echo [ERROR] Node modules not found. Run setup.bat first.
    pause & exit /b 1
)

:: ── Check .env.local ─────────────────────────────────────────
if not exist "frontend\.env.local" (
    echo [WARN]  frontend\.env.local not found.
    if exist "frontend\.env.local.example" (
        echo [INFO]  Copying .env.local.example to .env.local...
        copy "frontend\.env.local.example" "frontend\.env.local" >nul
    )
)

cd frontend

:: ── Build Next.js ────────────────────────────────────────────
echo [INFO] Building Next.js application for production...
echo.
call npm run build
if errorlevel 1 (
    echo [ERROR] Next.js production build failed.
    cd ..
    pause & exit /b 1
)

:: ── Start Next.js ────────────────────────────────────────────
echo.
echo [INFO] Starting Next.js production server...
echo        Press CTRL+C to stop.
echo.

call npm run start

echo.
echo [INFO] Frontend stopped.
cd ..
pause
