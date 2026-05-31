#!/usr/bin/env bash
# IOCenrich — Setup (Linux/macOS)
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "\n============================================================"
echo -e "  IOCenrich — Requirements Installation (Linux/macOS)"
echo -e "============================================================\n"

# ── Check Python ─────────────────────────────────────────────
echo -e "${BLUE}[1/6] Checking Python installation...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}[ERROR] Python 3 is not installed or not on PATH.${NC}"
    echo -e "        Install it using your package manager (e.g., sudo apt install python3 python3-pip python3-venv)"
    exit 1
fi
python3_ver=$(python3 --version)
echo -e "       Found: ${python3_ver}"

# ── Check Node.js ────────────────────────────────────────────
echo -e "\n${BLUE}[2/6] Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js is not installed or not on PATH.${NC}"
    echo -e "        Install it using your package manager (e.g., nodejs)"
    exit 1
fi
if ! command -v npm &> /dev/null; then
    echo -e "${RED}[ERROR] npm is not installed or not on PATH.${NC}"
    exit 1
fi
echo -e "       Found: node $(node --version)"
echo -e "       Found: npm $(npm --version)"

# ── Check PostgreSQL ─────────────────────────────────────────
echo -e "\n${BLUE}[3/6] Checking PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}[WARN]  psql not found on PATH. Make sure PostgreSQL is installed and running.${NC}"
else
    echo -e "       Found: $(psql --version)"
fi

# ── Check Redis ──────────────────────────────────────────────
echo -e "\n${BLUE}[4/6] Checking Redis...${NC}"
if ! command -v redis-cli &> /dev/null; then
    echo -e "${YELLOW}[WARN]  redis-cli not found. You can run Redis via Docker:${NC}"
    echo -e "        docker run -d -p 6379:6379 redis:7-alpine"
else
    echo -e "       Found: $(redis-cli --version)"
fi

# ── Backend Python dependencies ──────────────────────────────
echo -e "\n${BLUE}[5/6] Installing backend Python dependencies...${NC}"
if [ ! -d "backend/venv" ]; then
    echo -e "       Creating virtual environment..."
    python3 -m venv backend/venv
    echo -e "       Virtual environment created at backend/venv"
else
    echo -e "       Virtual environment already exists, skipping creation."
fi

echo -e "       Activating virtual environment..."
source backend/venv/bin/activate

echo -e "       Installing pip packages from requirements.txt..."
pip install --upgrade pip --quiet
pip install -r backend/requirements.txt

echo -e "       Installing Playwright browser (Chromium) for URL evidence capture..."
python3 -m playwright install chromium --with-deps || echo -e "${YELLOW}[WARN] Playwright browser dependencies install failed. URL screenshot feature might be unavailable.${NC}"

deactivate
echo -e "       ${GREEN}[OK] Backend dependencies installed.${NC}"

# ── Frontend Node dependencies ───────────────────────────────
echo -e "\n${BLUE}[6/6] Installing frontend Node.js dependencies...${NC}"
cd frontend
npm install --legacy-peer-deps
cd ..
echo -e "       ${GREEN}[OK] Frontend dependencies installed.${NC}"

# ── Copy .env if not exists ───────────────────────────────────
echo -e ""
if [ ! -f ".env" ]; then
    echo -e "${BLUE}[INFO]  Copying .env.example to .env for local development...${NC}"
    cp .env.example .env
    echo -e "        Edit .env to set your database password and vault key."
fi
if [ ! -f "frontend/.env.local" ]; then
    echo -e "${BLUE}[INFO]  Copying frontend/.env.local.example to frontend/.env.local...${NC}"
    cp frontend/.env.local.example frontend/.env.local
fi

echo -e "\n============================================================"
echo -e "  ${GREEN}Setup complete!${NC}"
echo -e "============================================================"
echo -e "\n  Next steps:"
echo -e "  1. Make sure PostgreSQL is running and create the database:"
echo -e "        psql -U postgres -c \"CREATE USER ioc_admin WITH PASSWORD 'ioc_dev_password';\""
echo -e "        psql -U postgres -c \"CREATE DATABASE ioc_platform OWNER ioc_admin;\""
echo -e "  2. Run database migrations:"
echo -e "        cd backend && source venv/bin/activate && alembic upgrade head"
echo -e "  3. Start the app:"
echo -e "        Run ./start-backend.sh   (in one terminal)"
echo -e "        Run ./start-frontend.sh  (in another terminal)"
echo -e "        Run ./start-worker.sh    (in a third terminal)\n"
