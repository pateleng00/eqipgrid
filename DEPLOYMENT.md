# 🌐 EquipGrid — Complete Production Deployment Guide
> **Platform Domain:** `equipgrid.in` (Registered on Porkbun)  
> **Architecture:** Monolith Service (`station.equipgrid.in`) + Standalone Website (`equipgrid.in` & `www.equipgrid.in`)

---

## 📌 Architecture Diagram

```
                                      DNS Resolution (Porkbun / Cloudflare)
                                                        │
                      ┌─────────────────────────────────┴─────────────────────────────────┐
                      ▼                                                                   ▼
       User visits: https://equipgrid.in                                   User visits: https://station.equipgrid.in
                      │                                                                   │
                      ▼ (Resolves to Website IP)                                          ▼ (Resolves to Monolith IP)
         [AWS EC2 Linux Server #1]                                           [AWS EC2 Linux Server #2]
        (Standalone Website Machine)                                            (Monolith Machine)
                      │                                                                   │
                      ▼                                                   ┌───────────────┴───────────────┐
            Nginx Web Server (:80 / :443)                                 │    Nginx Reverse Proxy        │
                      │                                                   │    Ports 80 (HTTP) & 443(SSL) │
                      ▼                                                   └───────────────┬───────────────┘
          [equipgrid-website-prod]                                                        │
        Docker Container (Vite SPA)                                ┌──────────────────────┴──────────────────────┐
                                                                   │                                             │
                                                        Path: /* (Station UI)                         Path: /equipgrid/* (REST API)
                                                                   │                                             │
                                                                   ▼                                             ▼
                                                    [equipgrid-station-frontend]                   [equipgrid-power-backend]
                                                     Docker Container (Port 80)                    Docker Container (Port 8081)
                                                                                                                 │
                                                                                                                 ▼
                                                                                                   [AWS RDS PostgreSQL Database]
                                                                                            (equipgrid-power.clkwqae24w3l.ap-south-1)
```

---

## 🌐 Step 1: Porkbun DNS Configuration

In your **[Porkbun Dashboard](https://porkbun.com)**, locate **`equipgrid.in`**, click **Details** ➔ **DNS Records** (or click the red **`DNS`** tag) and add the following 4 records:

| Type | Host / Subdomain | Answer / Target Value | TTL | Description |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `station` | `<MONOLITH_SERVER_ELASTIC_IP>` | 300 | Directs `station.equipgrid.in` to Monolith Server |
| **CNAME** | `www.station` | `station.equipgrid.in` | 300 | Directs `www.station.equipgrid.in` to Station |
| **A** | *(leave blank or `@`)* | `<WEBSITE_SERVER_ELASTIC_IP>` | 300 | Directs root `equipgrid.in` to Standalone Website Server |
| **CNAME** | `www` | `equipgrid.in` | 300 | Directs `www.equipgrid.in` to root domain |

---

## 🛠️ Step 2: Server Prerequisites (Run on BOTH EC2 Instances)

Perform these steps on both the **Monolith Server** and the **Website Server**:

### 1. Inbound Firewall Rules (AWS Security Groups)
In AWS Console ➔ **EC2** ➔ **Security Groups** ➔ edit **Inbound rules**:
- **Port 80 (HTTP)** ➔ Source: `0.0.0.0/0`
- **Port 443 (HTTPS)** ➔ Source: `0.0.0.0/0`
- **Port 22 (SSH)** ➔ Source: `My IP` (or your IP range)
> *Note: Port 8081 (Spring Boot) and Port 5432 (PostgreSQL) should **NOT** be exposed publicly.*

### 2. Allocate and Attach Elastic IPs
- In AWS Console ➔ **EC2** ➔ **Elastic IPs** ➔ **Allocate Elastic IP**.
- Select the IP ➔ **Actions** ➔ **Associate Elastic IP** ➔ select your instance.
> *This guarantees your public IPs never change after reboots.*

### 3. Install Docker & Git
SSH into the server and run:
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2 git
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
newgrp docker
```

---

## 🚜 Step 3: Deploy Monolith Machine (`station.equipgrid.in`)

SSH into your **Monolith EC2 Server**:

### 1. Create Directory with Permissions
```bash
sudo mkdir -p /opt/equipgrid
sudo chown -R $USER:$USER /opt/equipgrid
```

### 2. Clone the Repository
```bash
git clone https://github.com/pateleng00/eqipgrid.git /opt/equipgrid
cd /opt/equipgrid
```

### 3. Verify Database Configuration
The backend is already configured in `equipgrid-power/src/main/resources/application.properties` to connect to your AWS RDS:
```properties
spring.datasource.url=jdbc:postgresql://equipgrid-power.clkwqae24w3l.ap-south-1.rds.amazonaws.com:5432/postgres
spring.datasource.username=postgres
spring.datasource.password=b6GXOWwaEq3yVfLoujfH
```

> **Important AWS RDS Check**: In the AWS Console, open your **RDS Security Group** and verify it allows inbound **Port 5432** from your Monolith EC2 instance's IP (or security group ID).

### 4. Deploy the Monolith
```bash
./deploy.sh all
```

**What happens automatically:**
1. Builds `equipgrid-power` (Java 21 Spring Boot) in Docker.
2. Builds `equipgrid-station` (React Vite SPA) in Docker with Nginx.
3. Automatically runs Flyway migrations against AWS RDS on startup.
4. Starts Nginx on Port 80, proxying `/equipgrid/` API traffic internally to port 8081.

### 5. Daily Maintenance Commands (Monolith)
```bash
cd /opt/equipgrid

# Deploy only frontend after UI changes:
./deploy.sh frontend

# Deploy only backend after API changes:
./deploy.sh backend

# Check container status:
./deploy.sh status

# Follow real-time application logs:
./deploy.sh logs
```

---

## 🌐 Step 4: Deploy Standalone Website Machine (`equipgrid.in`)

SSH into your **Website EC2 Server**:

### 1. Create Directory with Permissions
```bash
sudo mkdir -p /opt/equipgrid-website
sudo chown -R $USER:$USER /opt/equipgrid-website
```

### 2. Clone and Deploy
```bash
git clone https://github.com/pateleng00/equipgrid-website.git /opt/equipgrid-website
cd /opt/equipgrid-website
./deploy.sh all
```

### 3. Daily Maintenance Commands (Website)
```bash
cd /opt/equipgrid-website

# Re-deploy latest updates:
./deploy.sh all

# Check container status:
./deploy.sh status

# Follow real-time access logs:
./deploy.sh logs
```

---

## 🔒 Step 5: Free SSL / HTTPS Setup (Certbot)

Once DNS propagation is complete (verify with `curl -I http://station.equipgrid.in` and `curl -I http://equipgrid.in`):

### 1. On Monolith Server (`station.equipgrid.in`)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot certonly --standalone -d station.equipgrid.in -d www.station.equipgrid.in
```

### 2. On Standalone Website Server (`equipgrid.in`)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot certonly --standalone -d equipgrid.in -d www.equipgrid.in
```

> **Alternative (Cloudflare)**: If you point Porkbun nameservers to Cloudflare, you can enable **Proxied (Orange Cloud)** and set SSL to **Full** in Cloudflare — this gives 100% automated SSL without installing Certbot.

---

## 🔍 Step 6: Verification & Health Checks

Test the live endpoints from your local terminal:

```bash
# 1. Verify Monolith Station UI
curl -I http://station.equipgrid.in
# Expected: HTTP/1.1 200 OK

# 2. Verify Backend API through Nginx Proxy
curl -I http://station.equipgrid.in/equipgrid/swagger-ui/index.html
# Expected: HTTP/1.1 200 OK (or 302 redirect)

# 3. Verify Standalone Website
curl -I http://equipgrid.in
# Expected: HTTP/1.1 200 OK
```

---

## 🛠️ Troubleshooting Cheat Sheet

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `Permission denied` on `/opt/...` | `/opt` is owned by `root` | Run `sudo mkdir -p /opt/equipgrid && sudo chown -R $USER:$USER /opt/equipgrid` |
| Backend cannot connect to RDS | RDS Security Group blocks EC2 | In AWS Console ➔ RDS ➔ Security Group ➔ Add Inbound rule for Port `5432` from EC2 IP |
| Nginx returns `502 Bad Gateway` on `/equipgrid/*` | Spring Boot is still booting up | Wait 15–30 seconds for Spring Boot & Flyway to finish initializing. Check logs with `./deploy.sh logs` |
| Domain doesn't open in browser | DNS propagation delay | Wait 5–15 minutes, or test with `dig +short station.equipgrid.in` |
