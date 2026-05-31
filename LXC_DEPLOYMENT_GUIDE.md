# LXC Deployment Guide (Detailed From-Scratch Setup)

This guide outlines a complete, step-by-step process for deploying the IOCenrich platform across two Ubuntu LXC containers from scratch. It includes creating a secure non-root user, setting up permissions, installing necessary dependencies, and configuring the services to run automatically.

* **Server 1 (Frontend)**: IP `192.168.100.50`
* **Server 2 (Backend)**: IP `192.168.100.51`

---

## 1. Initial Server Setup (Both Servers)

Before installing the application, we must secure the servers and set up basic dependencies.
*(Run these steps on both `192.168.100.50` and `192.168.100.51` as the `root` user)*

### 1.1 Update System and Install Basic Tools
```bash
apt update && apt upgrade -y
apt install -y curl wget git nano sudo ufw build-essential
```

### 1.2 Create a Dedicated User
It is best practice not to run the application as `root` for security reasons. We will create a non-root user named `iocadmin`.
```bash
adduser iocadmin
# Follow the prompts to set a strong password and user information

# Add the user to the sudo group so they can run administrative commands
usermod -aG sudo iocadmin
```

### 1.3 Switch to the New User
Switch to your newly created user for the remaining installation steps:
```bash
su - iocadmin
```

---

## 2. Server 2: Backend Setup (192.168.100.51)

This server hosts the FastAPI backend, Celery workers, PostgreSQL, and Redis.
*(Log into the backend server `192.168.100.51` and ensure you are logged in as `iocadmin`)*

### 2.1 Install Python and Virtual Environment Dependencies
```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv python3-dev libpq-dev
```

### 2.2 Install Docker (For Database and Redis)
If you are running LXC, ensure your Proxmox container has `nesting` and `keyctl` enabled in its Options before installing Docker.
```bash
# Add Docker's official GPG key:
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add the iocadmin user to the docker group so you can run docker without sudo
sudo usermod -aG docker $USER
newgrp docker
```

### 2.3 Set Up Directory Permissions & Clone the Repository
```bash
# Create the directory and grant ownership to iocadmin
sudo mkdir -p /opt/IOC
sudo chown iocadmin:iocadmin /opt/IOC
cd /opt/IOC

# Clone the repository
git clone <your-repo-url> platform
cd platform
```

### 2.4 Start Infrastructure (Database & Redis)
```bash
cd /opt/IOC/platform
docker compose up -d
```

### 2.5 Configure Backend Environment Variables
```bash
cd /opt/IOC/platform/backend
cp .env.example .env
nano .env
```
Ensure the following settings are configured to allow the frontend (`192.168.100.50`) to access the backend:
```env
# Allow Cross-Origin Requests from the Frontend IP
FRONTEND_URL=http://192.168.100.50:3000
FRONTEND_WEBSITE_URL=http://192.168.100.50:3000

# Database and Redis URLs
DATABASE_URL=postgresql+asyncpg://<db_user>:<db_password>@localhost:5432/iocenrich
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

### 2.6 Setup Python Environment and Install Dependencies
```bash
cd /opt/IOC/platform/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2.7 Start Backend Services via Systemd (Recommended)
Creating Systemd services ensures the backend and background workers start automatically on boot and restart if they crash.

**1. Create FastAPI Systemd Service:**
```bash
sudo nano /etc/systemd/system/ioc-backend.service
```
Paste the following configuration:
```ini
[Unit]
Description=IOCenrich FastAPI Backend
After=network.target

[Service]
User=iocadmin
Group=iocadmin
WorkingDirectory=/opt/IOC/platform/backend
Environment="PATH=/opt/IOC/platform/backend/venv/bin"
EnvironmentFile=/opt/IOC/platform/backend/.env
ExecStart=/opt/IOC/platform/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

**2. Create Celery Worker Systemd Service:**
```bash
sudo nano /etc/systemd/system/ioc-celery.service
```
Paste the following configuration:
```ini
[Unit]
Description=IOCenrich Celery Worker
After=network.target

[Service]
User=iocadmin
Group=iocadmin
WorkingDirectory=/opt/IOC/platform/backend
Environment="PATH=/opt/IOC/platform/backend/venv/bin"
EnvironmentFile=/opt/IOC/platform/backend/.env
ExecStart=/opt/IOC/platform/backend/venv/bin/celery -A app.workers.celery_app worker --loglevel=info
Restart=always

[Install]
WantedBy=multi-user.target
```

**3. Enable and Start Services:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable ioc-backend ioc-celery
sudo systemctl start ioc-backend ioc-celery
```

Check their statuses to ensure they are actively running:
```bash
sudo systemctl status ioc-backend
sudo systemctl status ioc-celery
```

---

## 3. Server 1: Frontend Setup (192.168.100.50)

This server hosts the Next.js web application.
*(Log into the frontend server `192.168.100.50` and ensure you are logged in as `iocadmin`)*

### 3.1 Install Node.js
We will install Node.js v20 since it is the current LTS version supported by modern React/Next.js setups.
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 3.2 Set Up Directory Permissions & Clone the Repository
```bash
sudo mkdir -p /opt/IOC
sudo chown iocadmin:iocadmin /opt/IOC
cd /opt/IOC

# Clone the repository
git clone <your-repo-url> platform
cd platform/frontend
```

### 3.3 Configure Frontend Environment Variables
```bash
cd /opt/IOC/platform/frontend
cp .env.example .env.local
nano .env.local
```
Update the API URL to explicitly point to your configured Backend server (`192.168.100.51`):
```env
NEXT_PUBLIC_API_URL=http://192.168.100.51:8000
```

### 3.4 Install Dependencies and Build
Install the required NPM packages and build the Next.js app for production performance.
```bash
# We use --legacy-peer-deps to prevent peer dependency conflicts common in modern React upgrades
npm install --legacy-peer-deps
npm run build
```

### 3.5 Start the Frontend App using PM2
PM2 is a robust production process manager for Node.js. It restarts the application if it crashes and easily sets up a script to start the app on server reboot.
```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the frontend on port 3000
pm2 start npm --name "ioc-frontend" -- run start -- -p 3000

# Save the PM2 list and configure it to start on boot
pm2 save
pm2 startup
# (Run the specific command PM2 outputs to setup the startup script for the iocadmin user)
```

---

## 4. Firewall Configuration (Optional but Recommended)

To restrict access and secure your servers, it is highly recommended to configure UFW (Uncomplicated Firewall) on both.

**On Backend (192.168.100.51):**
```bash
sudo ufw allow ssh
sudo ufw allow from 192.168.100.50 to any port 8000  # Allow Frontend IP to access backend API
sudo ufw enable
```

**On Frontend (192.168.100.50):**
```bash
sudo ufw allow ssh
sudo ufw allow 3000/tcp # Allow external users to access the Web UI
sudo ufw enable
```

---

## 5. Verification Steps

1. **Test the Backend API:**
   From your local browser, navigate to: `http://192.168.100.51:8000/docs`
   You should see the FastAPI Swagger UI loading correctly, which means the backend and database are functional.

2. **Test the Frontend UI:**
   From your local browser, navigate to: `http://192.168.100.50:3000`
   You should see the IOCenrich interface. Try logging in or fetching data to ensure it successfully communicates with the API backend.
