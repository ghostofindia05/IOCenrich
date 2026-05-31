@echo off
setlocal EnableDelayedExpansion
title IOCenrich — Setup (Windows)

echo.
echo ============================================================
echo   IOCenrich — Requirements Installation (Windows)
echo ============================================================
echo.

:: ── Check Python ─────────────────────────────────────────────
echo [1/6] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not on PATH.
    echo         Download from: https://www.python.org/downloads/
    echo         Make sure to check "Add Python to PATH" during installation.
    pause & exit /b 1
)
for /f "tokens=*" %%v in ('python --version') do echo        Found: %%v
echo.

:: ── Check Node.js ────────────────────────────────────────────
echo [2/6] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not on PATH.
    echo         Download from: https://nodejs.org/ (LTS version recommended)
    pause & exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do echo        Found: node %%v
for /f "tokens=*" %%v in ('npm --version') do echo        Found: npm %%v
echo.

:: ── Check PostgreSQL ─────────────────────────────────────────
echo [3/6] Checking PostgreSQL...
psql --version >nul 2>&1
if errorlevel 1 (
    echo [WARN]  psql not found on PATH. Make sure PostgreSQL is installed and running.
    echo         Download from: https://www.postgresql.org/download/windows/
    echo         Continuing setup...
) else (
    for /f "tokens=*" %%v in ('psql --version') do echo        Found: %%v
)
echo.

:: ── Check Redis ──────────────────────────────────────────────
echo [4/6] Checking Redis...
redis-cli --version >nul 2>&1
if errorlevel 1 (
    echo [WARN]  redis-cli not found. You can run Redis via Docker:
    echo         docker run -d -p 6379:6379 redis:7-alpine
    echo         Or install Memurai (Windows-native Redis): https://www.memurai.com/
    echo         Continuing setup...
) else (
    for /f "tokens=*" %%v in ('redis-cli --version') do echo        Found: %%v
)
echo.

:: ── Backend Python dependencies ──────────────────────────────
echo [5/6] Installing backend Python dependencies...
if not exist "backend\venv" (
    echo        Creating virtual environment...
    python -m venv backend\venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment.
        pause & exit /b 1
    )
    echo        Virtual environment created at backend\venv
) else (
    echo        Virtual environment already exists, skipping creation.
)

echo        Activating virtual environment...
call backend\venv\Scripts\activate.bat

echo        Installing pip packages from requirements.txt...
pip install --upgrade pip --quiet
pip install -r backend\requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install Python dependencies.
    pause & exit /b 1
)

echo        Installing Playwright browser (Chromium) for URL evidence capture...
python -m playwright install chromium --with-deps
if errorlevel 1 (
    echo [WARN]  Playwright browser install failed. URL screenshot feature will be unavailable.
)

call backend\venv\Scripts\deactivate.bat
echo        [OK] Backend dependencies installed.
echo.

:: ── Frontend Node dependencies ───────────────────────────────
echo [6/6] Installing frontend Node.js dependencies...
cd frontend
npm install
if errorlevel 1 (
    echo [ERROR] npm install failed.
    cd ..
    pause & exit /b 1
)
cd ..
echo        [OK] Frontend dependencies installed.
echo.

:: ── Copy .env if not exists ───────────────────────────────────
if not exist ".env" (
    echo [INFO]  Copying .env.example to .env for local development...
    copy ".env.example" ".env" >nul
    echo        Edit .env to set your database password and vault key.
)
if not exist "frontend\.env.local" (
    echo [INFO]  Copying frontend\.env.local.example to frontend\.env.local...
    copy "frontend\.env.local.example" "frontend\.env.local" >nul
)

echo.
echo ============================================================
echo   Setup complete!
echo ============================================================
echo.
echo   Next steps:
echo   1. Make sure PostgreSQL is running and create the database:
echo         psql -U postgres -c "CREATE USER ioc_admin WITH PASSWORD 'ioc_dev_password';"
echo         psql -U postgres -c "CREATE DATABASE ioc_platform OWNER ioc_admin;"
echo   2. Run database migrations:
echo         cd backend ^& venv\Scripts\activate ^& alembic upgrade head
echo   3. Start the app:
echo         Run start-backend.bat   (in one terminal)
echo         Run start-frontend.bat  (in another terminal)
echo         Run start-worker.bat    (in a third terminal)
echo.
pause
