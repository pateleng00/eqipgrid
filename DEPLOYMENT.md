# 🌐 EquipGrid — Monolith Deployment & Custom Domain Setup Guide

This guide provides an end-to-end walkthrough for deploying the **EquipGrid** platform:
1. **Monolith Machine**: React Vite Frontend (`equipgrid-station`) + Spring Boot Backend (`equipgrid-power`) + PostgreSQL on an EC2 Linux Server under `station.equipgrid.in`
2. **Standalone Website Machine**: Marketing & Catalog Portal (`equipgrid-website`) under `equipgrid.in` and `www.equipgrid.in`
3. Custom domain mapping with **Porkbun** DNS and automated SSL/TLS (HTTPS).

---

## 📌 Architecture Overview

```
                                  DNS Resolution (Porkbun / Cloudflare)
                                                   │
           User visits                             ▼
    https://station.equipgrid.in ──► [DNS Provider] (Porkbun / Cloudflare)
                                                   │ (Resolves to Server Elastic IP)
                                                   ▼
                                       [AWS EC2 Linux Server]
                                                   │
                                   ┌───────────────┴───────────────┐
                                   │    Nginx Reverse Proxy        │
                                   │    Ports 80 (HTTP) & 443(SSL) │
                                   └───────────────┬───────────────┘
                                                   │
                            ┌──────────────────────┴──────────────────────┐
                            │                                             │
                 Path: /* (Station Web App)                     Path: /equipgrid/* (REST API)
                            │                                             │
                            ▼                                             ▼
             [equipgrid-station-frontend]                   [equipgrid-power-backend]
              Docker Container (Port 80)                    Docker Container (Port 8081)
                                                                          │
                                                                          ▼
                                                            [PostgreSQL DB / AWS RDS]
```

---

## 🛠️ Step 0: Server & Network Prerequisites

1. **AWS EC2 Security Group Inbound Rules**:
   Ensure your instance security group permits traffic on the following ports:
   - `HTTP` (Port `80`) — Source: `0.0.0.0/0`
   - `HTTPS` (Port `443`) — Source: `0.0.0.0/0`
   - `SSH` (Port `22`) — Source: `Your IP`
   *(Internal backend port `8081` and DB port `5432` should NOT be exposed to the public internet).*

2. **Allocate an AWS Elastic IP**:
   - In AWS Console: **EC2** ➔ **Network & Security** ➔ **Elastic IPs** ➔ **Allocate Elastic IP**.
   - Select the allocated IP ➔ **Actions** ➔ **Associate Elastic IP address** ➔ select your EC2 instance.
   > **Why?** Standard EC2 public IPs change if the VM is rebooted or stopped. An Elastic IP is permanent and guarantees your domain DNS never breaks.

---

## 🌐 Step 1: DNS Records Setup (Porkbun Console)

Log in to **[Porkbun](https://porkbun.com)**, navigate to **Domain Management** ➔ click **Details** ➔ **DNS Records** (or the **DNS** badge) for **`equipgrid.in`** and configure:

### 1. Monolith Subdomain Setup (`station.equipgrid.in`)

| Type | Host / Name | Answer / Target Value | TTL | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `station` | `YOUR_MONOLITH_ELASTIC_IP` | 300 / 600 | Directs `station.equipgrid.in` to the Monolith EC2 server |
| **CNAME** | `www.station` | `station.equipgrid.in` | 300 / 600 | Directs `www.station.equipgrid.in` to main station subdomain |

### 2. Standalone Website Setup (`equipgrid.in`)

| Type | Host / Name | Answer / Target Value | TTL | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **A** | *(leave blank or `@`)* | `YOUR_WEBSITE_ELASTIC_IP` | 300 / 600 | Directs `equipgrid.in` to the standalone website server |
| **CNAME** | `www` | `equipgrid.in` | 300 / 600 | Directs `www.equipgrid.in` to root domain |

---

## 🔒 Step 2: SSL / HTTPS Encryption Setup

You have two industry-standard ways to secure your domain with HTTPS:

---

### Option A: Cloudflare Managed SSL (Fastest — 0 Server Config)

If your nameservers are pointed to Cloudflare:
1. In Cloudflare DNS, set the **Proxy Status** to **Proxied (Orange Cloud)**.
2. In Cloudflare Dashboard ➔ **SSL/TLS** ➔ set encryption mode to **Full**.
3. In **SSL/TLS** ➔ **Edge Certificates** ➔ enable **Always Use HTTPS**.
4. **Done!** Cloudflare handles automatic renewals, DDoS protection, and edge caching without requiring Certbot installation on your server.

---

### Option B: Certbot (Let's Encrypt) on the EC2 Server

If you are managing SSL directly on Ubuntu / Amazon Linux:

1. **Install Certbot on the host**:
   ```bash
   sudo apt update
   sudo apt install -y certbot python3-certbot-nginx
   ```

2. **Generate the SSL Certificate**:
   *(Make sure port 80 is temporarily free or use certbot standalone)*:
   ```bash
   sudo certbot certonly --standalone -d station.equipgrid.in -d www.station.equipgrid.in
   ```
   Certificates are saved to `/etc/letsencrypt/live/station.equipgrid.in/`.

3. **Mount Certificates in `docker-compose.prod.yml`**:
   The `station-frontend` service in `docker-compose.prod.yml` already has the mount configured:
   ```yaml
     station-frontend:
       volumes:
         - /etc/letsencrypt:/etc/letsencrypt:ro
   ```

---

## ⚙️ Step 3: Nginx Reverse Proxy Configuration

In `equipgrid-station/nginx.conf`, the reverse proxy handles both the frontend SPA and backend API calls:

```nginx
server {
    listen 80;
    server_name station.equipgrid.in www.station.equipgrid.in localhost _;

    root /usr/share/nginx/html;
    index index.html;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # SPA Client-Side Routing Fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API Requests to Spring Boot Container
    location /equipgrid/ {
        proxy_pass http://power-backend:8081/equipgrid/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backward-compatible aliases
    location /power/ {
        proxy_pass http://power-backend:8081/equipgrid/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static Assets Caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```

---

## 🚀 Step 4: Deploy Using `./deploy.sh`

The `./deploy.sh` script automates pulling git updates, building containers, restarting services, and pruning old images:

### Deploy Only the Frontend
```bash
./deploy.sh frontend
# or:
./deploy.sh fe
# or:
./deploy.sh station
```

### Deploy Only the Backend
```bash
./deploy.sh backend
# or:
./deploy.sh be
# or:
./deploy.sh power
```

### Deploy Full Monolith (Database + Backend + Frontend)
```bash
./deploy.sh all
# or:
./deploy.sh monolith
```

### Check Container Status
```bash
./deploy.sh status
# or:
./deploy.sh ps
```

### Live Logs Stream
```bash
./deploy.sh logs
```

---

## 🌐 Step 5: Deploying Standalone Website Machine

On the separate server hosting the marketing website:

```bash
cd /opt/equipgrid-website

# Rebuild and run
./deploy.sh all

# Check status
./deploy.sh status
```

---

## 🔍 Step 6: Verification & Diagnostics

1. **Verify DNS Resolution from your local terminal**:
   ```bash
   dig +short station.equipgrid.in
   # or
   nslookup station.equipgrid.in
   ```
   *Expected output: Your Monolith server's Elastic IP.*

2. **Verify Nginx Proxy inside Container**:
   ```bash
   curl -I http://station.equipgrid.in
   ```
   *Expected output: `HTTP/1.1 200 OK`.*

3. **Verify Backend API through Proxy**:
   ```bash
   curl -I http://station.equipgrid.in/equipgrid/swagger-ui/index.html
   ```
   *Expected output: `HTTP/1.1 200 OK` or `302 Found`.*

4. **Live Logs Stream**:
   ```bash
   ./deploy.sh logs
   # or for specific container:
   docker compose -f docker-compose.prod.yml logs -f station-frontend
   docker compose -f docker-compose.prod.yml logs -f power-backend
   ```
