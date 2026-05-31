#!/usr/bin/env bash
# IOCenrich — Backend Server Startup (Production - Linux/macOS)
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "\n============================================================"
echo -e "  IOCenrich — Backend (FastAPI + Uvicorn) [PRODUCTION]"
echo -e "  Listening on: http://localhost:8000"
echo -e "  API Docs:     http://localhost:8000/docs"
echo -e "============================================================\n"

# ── Activate virtual environment ─────────────────────────────
if [ ! -f "backend/venv/bin/activate" ]; then
    echo -e "${RED}[ERROR] Virtual environment not found. Run ./setup.sh first.${NC}"
    exit 1
fi

echo -e "${BLUE}[INFO] Activating Python virtual environment...${NC}"
source backend/venv/bin/activate

# ── Check Redis is reachable ─────────────────────────────────
echo -e "${BLUE}[INFO] Checking Redis connection...${NC}"
if ! command -v redis-cli &> /dev/null; then
    echo -e "${YELLOW}[WARN]  redis-cli not installed. Cannot check Redis connection.${NC}"
else
    if ! redis-cli ping &> /dev/null; then
        echo -e "${YELLOW}[WARN]  Redis is not responding. Celery workers will not function.${NC}"
        echo -e "        Start Redis before running the backend."
    else
        echo -e "       ${GREEN}[OK]   Redis is reachable.${NC}"
    fi
fi

# ── Run DB migrations ────────────────────────────────────────
echo -e "${BLUE}[INFO] Running database migrations (alembic upgrade head)...${NC}"
cd backend
alembic upgrade head || echo -e "${YELLOW}[WARN] Migration failed. The database may be out of sync.${NC}"
cd ..

# ── Start Uvicorn ────────────────────────────────────────────
echo -e "\n${BLUE}[INFO] Starting FastAPI backend with uvicorn (production, multi-worker)...${NC}"
echo -e "       Press CTRL+C to stop.\n"

cd backend
venv/bin/uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --log-level info \
    --workers 4 \
    --use-colors

echo -e "\n[INFO] Backend stopped."
