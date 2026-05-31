# Service Startup Guide

This document outlines the steps required to configure and run all components of the IOCenrich platform. 

The platform consists of four main parts:
1. **Infrastructure (Docker):** PostgreSQL (database) & Redis (message broker/cache)
2. **Backend API:** FastAPI application
3. **Celery Worker:** Asynchronous background threat intelligence processing
4. **Frontend:** Next.js React client application

---

## 0. Cloudflare WARP — One-time Setup (Optional)

Cloudflare WARP hides the server's public IP address when capturing visual screenshots of malicious URLs. It runs as a **local SOCKS5 proxy on `127.0.0.1:40000`** — only Playwright uses it. All other services (vendor APIs, domain/IP telemetry queries) continue using the system's real internet connection.

### Install (run once on Linux)
```bash
# Add Cloudflare apt repo
curl -fsSL https://pkg.cloudflareclient.com/pubkey.gpg | sudo gpg --yes --dearmor --output /usr/share/keyrings/cloudflare-warp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/cloudflare-warp-archive-keyring.gpg] https://pkg.cloudflareclient.com/ $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflare-client.list
sudo apt-get update && sudo apt-get install -y cloudflare-warp

# Register (run once — skip if already registered)
warp-cli registration new
```

### Enable proxy mode & connect
```bash
warp-cli mode proxy   # proxy-only mode — does NOT affect system-wide routing
warp-cli connect
warp-cli status       # should show: Connected
```

### Verify proxy connection
```bash
curl ifconfig.me                                               # → your real IP
curl --proxy socks5://127.0.0.1:40000 ifconfig.me             # → Cloudflare IP
```

---

## 🚀 Recommended: Launch Using Script Utilities

We provide utility scripts to automate the installation and execution of all components.

### 1. Requirements Installation
Run the setup script from the root project directory:
*   **Windows:**
    ```cmd
    setup.bat
    ```
*   **Linux / macOS:**
    ```bash
    chmod +x setup.sh
    ./setup.sh
    ```

### 2. Launch Services
You can check prerequisites and start all services with a single command using the master script:
*   **Windows:**
    ```cmd
    start-all.bat
    ```
*   **Linux / macOS:**
    ```bash
    chmod +x start-all.sh
    ./start-all.sh
    ```
This utility automatically checks dependencies, starts Redis in the background if not active, and asks you whether to launch the servers in **Development** or **Production** mode.

Alternatively, you can start Docker services manually:
```bash
docker compose up -d
```

Ensure migrations are up to date:
*   **Windows:** `cd backend && venv\Scripts\activate && alembic upgrade head && cd ..`
*   **Linux/macOS:** `cd backend && source venv/bin/activate && alembic upgrade head && cd ..`

Or launch each service in its own terminal session:

### Development Mode

| Component | Windows Utility | Linux/macOS Utility |
|---|---|---|
| **Backend API** | `start-backend.bat` | `./start-backend.sh` |
| **Next.js Frontend** | `start-frontend.bat` | `./start-frontend.sh` |
| **Celery Workers** | `start-worker.bat` | `./start-worker.sh` |

### Production Mode

| Component | Windows Utility | Linux/macOS Utility |
|---|---|---|
| **Backend API** | `start-backend-prod.bat` | `./start-backend-prod.sh` |
| **Next.js Frontend** | `start-frontend-prod.bat` | `./start-frontend-prod.sh` |
| **Celery Workers** | `start-worker.bat` | `./start-worker.sh` | (Same as Dev)

---

## 🛠️ Option 2: Manual Step-by-Step Launch

If you prefer to start individual components manually, follow these instructions:

### 1. Infrastructure (Docker)
Start PostgreSQL and Redis in detached mode:
```bash
docker compose up -d
```

### 2. Backend API
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Activate the virtual environment:
   *   **Linux/macOS:** `source venv/bin/activate`
   *   **Windows:** `venv\Scripts\activate`
3. Load env variables and run Uvicorn:
   ```bash
   # Linux/macOS
   export $(grep -v '^#' .env | xargs)
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   
   # Windows (CMD)
   for /f "tokens=*" %i in ('type .env') do @set %i
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
*The REST API Docs will be available at `http://localhost:8000/docs`.*

### 3. Celery Background Worker
1. Navigate to the backend folder and activate virtual env.
2. Launch the worker process:
   *   **Linux/macOS:**
       ```bash
       celery -A app.workers.celery_app.celery_app worker --loglevel=info -E
       ```
   *   **Windows (requires solo pool constraint):**
       ```cmd
       celery -A app.workers.celery_app.celery_app worker --loglevel=info --pool=solo -E
       ```

### 4. Next.js Frontend
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Run the Next.js production build or developer server:
   ```bash
   # Development Server
   npm run dev
   
   # Production Build & Start
   npm run build
   npm start
   ```
*The interface will be live at `http://localhost:3000`.*
