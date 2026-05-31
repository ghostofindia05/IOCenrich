#!/usr/bin/env bash
# IOCenrich — Master Startup Utility (Linux/macOS)
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "\n============================================================"
echo -e "  IOCenrich — Master Control Startup Script (Linux/macOS)"
echo -e "============================================================\n"

# ── Check Prerequisites ──────────────────────────────────────
echo -e "${BLUE}[1/4] Checking system dependencies...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}[ERROR] Python 3 is not installed.${NC}"
    exit 1
fi
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js is not installed.${NC}"
    exit 1
fi
echo -e "      ${GREEN}[OK]${NC} Python & Node.js are available."

# ── Check & Start Redis ──────────────────────────────────────
echo -e "\n${BLUE}[2/4] Checking Redis service...${NC}"
if ! command -v redis-cli &> /dev/null; then
    echo -e "${YELLOW}[WARN]  redis-cli not found. Cannot verify Redis status.${NC}"
else
    if ! redis-cli ping &> /dev/null; then
        echo -e "${YELLOW}[WARN] Redis is not running on port 6379.${NC}"
        echo -e "       Attempting to start Redis server in the background..."
        if command -v redis-server &> /dev/null; then
            redis-server --daemonize yes
            sleep 2
            if redis-cli ping &> /dev/null; then
                echo -e "      ${GREEN}[OK]${NC} Redis started successfully in daemon mode."
            else
                echo -e "${RED}[ERROR] Failed to start Redis daemon.${NC}"
                exit 1
            fi
        else
            echo -e "${RED}[ERROR] redis-server executable not found. Please start Redis manually.${NC}"
            exit 1
        fi
    else
        echo -e "      ${GREEN}[OK]${NC} Redis is already running."
    fi
fi

# ── Check PostgreSQL ─────────────────────────────────────────
echo -e "\n${BLUE}[3/4] Checking PostgreSQL server on port 5432...${NC}"
if ! command -v pg_isready &> /dev/null; then
    echo -e "${YELLOW}[WARN] pg_isready utility not found. Checking port connection...${NC}"
    if ! nc -z localhost 5432 &> /dev/null; then
        echo -e "${RED}[ERROR] PostgreSQL port 5432 is unreachable.${NC}"
        exit 1
    fi
else
    if ! pg_isready -h localhost -p 5432 &> /dev/null; then
        echo -e "${RED}[ERROR] PostgreSQL server is not responding.${NC}"
        exit 1
    fi
fi
echo -e "      ${GREEN}[OK]${NC} PostgreSQL server is ready."

# ── Choose Mode & Launch ──────────────────────────────────────
echo -e "\n${BLUE}[4/4] Select execution mode:${NC}"
echo -e "      [1] Development Mode (default - enables code reloading)"
echo -e "      [2] Production Mode (compiles optimized build & multi-worker backend)"
echo -e ""
read -p "Enter choice [1 or 2]: " mode

mkdir -p logs

if [ "$mode" = "2" ]; then
    echo -e "\n${GREEN}[INFO] Launching IOCenrich in PRODUCTION mode...${NC}"
    echo -e "       Logs will be redirected to the 'logs/' folder."
    
    # Start worker
    ./start-worker.sh > logs/worker.log 2>&1 &
    
    # Start backend
    ./start-backend-prod.sh > logs/backend.log 2>&1 &
    
    # Start frontend (runs build then start)
    ./start-frontend-prod.sh > logs/frontend.log 2>&1 &
else
    echo -e "\n${GREEN}[INFO] Launching IOCenrich in DEVELOPMENT mode...${NC}"
    echo -e "       Logs will be redirected to the 'logs/' folder."
    
    # Start worker
    ./start-worker.sh > logs/worker.log 2>&1 &
    
    # Start backend
    ./start-backend.sh > logs/backend.log 2>&1 &
    
    # Start frontend
    ./start-frontend.sh > logs/frontend.log 2>&1 &
fi

echo -e "\n============================================================"
echo -e "  ${GREEN}All services triggered successfully in the background!${NC}"
echo -e "============================================================"
echo -e "\n  You can monitor logs using:"
echo -e "    tail -f logs/backend.log   (Backend API logs)"
echo -e "    tail -f logs/frontend.log  (Frontend UI logs)"
echo -e "    tail -f logs/worker.log    (Celery background task logs)"
echo -e "\n  To stop all services, run:"
echo -e "    pkill -f uvicorn"
echo -e "    pkill -f next-server"
echo -e "    pkill -f celery\n"
