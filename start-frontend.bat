@echo off
setlocal EnableDelayedExpansion
title IOCenrich — Frontend (Next.js)

echo.
echo ============================================================
echo   IOCenrich — Frontend (Next.js Dev Server)
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

:: ── Start Next.js ────────────────────────────────────────────
echo [INFO] Starting Next.js development server (verbose)...
echo        Press CTRL+C to stop.
echo.

cd frontend
npm run dev

echo.
echo [INFO] Frontend stopped.
pause
