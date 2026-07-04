# Deployment Guide — DigitalOcean Droplet

Steps to deploy this app (FastAPI + Motor/MongoDB Atlas backend, Vite/React frontend) to a fresh DigitalOcean droplet, from droplet creation through a publicly reachable URL.

Replace `165.245.253.130` and `<your-username>` below with your own droplet IP and GitHub username throughout.

## 1. Connect to the droplet

Via SSH client:
```powershell
ssh root@165.245.253.130
```
Or use DigitalOcean's browser-based **Console** (droplet dashboard → Console) if you don't want to rely on SSH at all — it isn't affected by the firewall rules in step 8.

## 2. Create a non-root user (recommended)
```bash
adduser deploy
usermod -aG sudo deploy
```
Reconnect as that user for everything else:
```powershell
ssh deploy@165.245.253.130
```

## 3. Install system dependencies
```bash
sudo apt update
sudo apt install -y git python3.12-venv python3-pip nginx
```
If `python3.12-venv` isn't found, check your Python version first (`python3 --version`) and install the matching venv package (e.g. `python3.10-venv` on Ubuntu 22.04).

Install Node.js via NodeSource (the default `apt install npm` pulls a very old version that won't work with Vite 5):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version   # v20.x
npm --version    # 10.x
```

## 4. Clone the repo from GitHub

**Public repo:**
```bash
sudo mkdir -p /var/www
sudo chown $USER:$USER /var/www
git clone https://github.com/<your-username>/pmer-dataset-collector.git /var/www/pmer-dataset-collector
```

**Private repo (SSH deploy key — recommended):**
```bash
ssh-keygen -t ed25519 -C "droplet-deploy-key" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```
Copy the output → GitHub repo → **Settings → Deploy keys → Add deploy key** (read-only is fine) → paste it in. Then:
```bash
git clone git@github.com:<your-username>/pmer-dataset-collector.git /var/www/pmer-dataset-collector
```

**Private repo (Personal Access Token — simpler, less clean):**
```bash
git clone https://<your-username>:<your-token>@github.com/<your-username>/pmer-dataset-collector.git /var/www/pmer-dataset-collector
```

## 5. Backend — install dependencies
```bash
cd /var/www/pmer-dataset-collector/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn
```

## 6. Backend — production `.env`
```bash
nano /var/www/pmer-dataset-collector/backend/.env
```
```env
DEBUG=False
SECRET_KEY=<generate with: openssl rand -hex 32>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=43200
ALLOWED_ORIGINS=http://165.245.253.130
MONGODB_URI=<your Atlas connection string>
MONGODB_DB_NAME=pmer-dataset-collector
ADMIN_EMAILS=<your real admin email>
```
Notes:
- `DEBUG` must be `False` in production.
- Make sure MongoDB Atlas → **Network Access** allows the droplet's IP (or `0.0.0.0/0` temporarily to test).
- Rotate your Atlas DB password if it was ever pasted anywhere insecure (chat logs, tickets, etc.) before going live.

## 7. Backend — run as a systemd service
```bash
sudo nano /etc/systemd/system/pmer-backend.service
```
```ini
[Unit]
Description=PMER Dataset Collector API
After=network.target

[Service]
User=deploy
WorkingDirectory=/var/www/pmer-dataset-collector/backend
Environment="PATH=/var/www/pmer-dataset-collector/backend/venv/bin"
ExecStart=/var/www/pmer-dataset-collector/backend/venv/bin/gunicorn main:app \
    -k uvicorn.workers.UvicornWorker \
    --workers 2 \
    --bind 127.0.0.1:8000
Restart=always

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now pmer-backend
sudo systemctl status pmer-backend
curl http://127.0.0.1:8000/api/health   # {"status":"healthy","database":"connected"}
```

## 8. Frontend — build

```bash
cd /var/www/pmer-dataset-collector/frontend
nano .env
```
```env
VITE_API_URL=http://165.245.253.130
```
```bash
npm install     # not "npm ci" - package-lock.json is gitignored in this repo
npm run build
```

**If the build gets `Killed`** (OOM on small droplets), either add swap:
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```
...or build locally on your dev machine instead and upload the result:
```powershell
# locally, in frontend/
npm install
npm run build
scp -r dist deploy@165.245.253.130:/var/www/pmer-dataset-collector/frontend/dist
```

This produces `frontend/dist/`.

## 9. Nginx — serve frontend + reverse proxy API
```bash
sudo nano /etc/nginx/sites-available/pmer
```
```nginx
server {
    listen 80;
    server_name 165.245.253.130;

    root /var/www/pmer-dataset-collector/frontend/dist;
    index index.html;

    client_max_body_size 20M;   # sheet music PDF uploads are capped at 16MB

    # Never cache the HTML shell - it must always be fetched fresh so users
    # get the latest JS/CSS bundle reference immediately after each deploy,
    # instead of the browser silently serving a stale cached index.html.
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        expires 0;
    }

    # Hashed JS/CSS/font/image files are safe to cache aggressively - Vite
    # gives each build's files a new content hash, so a new deploy naturally
    # produces new filenames and busts any old cache automatically.
    location ~* \.(?:js|css|png|jpg|jpeg|gif|svg|woff2?|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    location / {
        try_files $uri /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/pmer /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## 10. Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```
- Without this, port `8000` (Gunicorn/FastAPI) is directly reachable from the internet, bypassing Nginx entirely.
- `ufw allow OpenSSH` is safe to include even if you only use DigitalOcean's web Console (it doesn't force you to use SSH, it just keeps the option open). If you skip it and ever rely on a real SSH client instead of the web console, `ufw enable` will lock you out.

## 11. Verify
Open in a browser:
```
http://165.245.253.130
```

Checklist:
- `/api/health` reports `"database": "connected"`.
- Login works end-to-end (create/verify a test user).
- `ADMIN_EMAILS` in `.env` matches the real admin account (drives the `is_admin` flag).
- Only run `backend/db/seed.py` against a fresh/empty Atlas database — never against a populated one.

## 12. Updating the app after code changes
```bash
cd /var/www/pmer-dataset-collector
git pull

# backend (if backend changed)
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart pmer-backend

# frontend (if frontend changed)
cd ../frontend
npm install
npm run build
```
No Nginx restart needed — it always serves the latest `dist/` contents.

## 13. HTTPS with a real domain

Let's Encrypt/Certbot cannot issue a certificate for a bare IP address, so this
requires owning a domain (or subdomain) first.

### 13.1 Register a domain
Buy one from any registrar (Namecheap, Porkbun, GoDaddy, Cloudflare Registrar,
etc.) — a `.com`/`.dev`/`.app` is usually a few dollars/year. You don't need
anything fancy; even a cheap TLD works fine for a thesis project.

### 13.2 Point DNS at the droplet (Cloudflare)
Domains bought through **Cloudflare Registrar** are already on Cloudflare's
nameservers, so DNS is managed directly in the Cloudflare dashboard — no
nameserver change needed.

1. Go to the Cloudflare dashboard → select `pmer-dataset-collector.com` → **DNS → Records**.
2. Add:
   | Type | Name  | IPv4 address        | Proxy status |
   |------|-------|----------------------|--------------|
   | A    | `@`   | `165.245.253.130`    | **DNS only** (grey cloud) |
   | A    | `www` | `165.245.253.130`    | **DNS only** (grey cloud) |

   Keep the proxy **off (grey cloud)** for now — Certbot's HTTP validation
   needs to reach your droplet directly. You can switch it to **Proxied**
   (orange cloud) afterward once HTTPS is working on the origin, to get
   Cloudflare's CDN/DDoS protection on top.
3. Verify propagation (usually near-instant with Cloudflare):
   ```powershell
   nslookup pmer-dataset-collector.com
   ```
   It should resolve to `165.245.253.130`.

### 13.3 Update Nginx to use the domain name
```bash
sudo nano /etc/nginx/sites-available/pmer
```
Change:
```nginx
server_name 165.245.253.130;
```
to:
```nginx
server_name pmer-dataset-collector.com www.pmer-dataset-collector.com;
```
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 13.4 Issue the certificate
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d pmer-dataset-collector.com -d www.pmer-dataset-collector.com
```
Certbot will ask for an email (for renewal/expiry notices) and whether to
redirect HTTP→HTTPS — choose **yes/redirect**. It automatically edits the
Nginx config to add the `listen 443 ssl` block and the cert paths, and sets up
a systemd timer for auto-renewal (certs are valid 90 days). Verify the timer:
```bash
sudo systemctl list-timers | grep certbot
sudo certbot renew --dry-run   # confirms auto-renewal works, doesn't renew anything yet
```

### 13.5 Update app config to use `https://pmer-dataset-collector.com`
Backend — `/var/www/pmer-dataset-collector/backend/.env`:
```env
ALLOWED_ORIGINS=https://pmer-dataset-collector.com,https://www.pmer-dataset-collector.com
```
```bash
sudo systemctl restart pmer-backend
```

Frontend — rebuild with the new API origin (do this locally or on the droplet,
same as section 8):
```env
VITE_API_URL=https://pmer-dataset-collector.com
```
```bash
npm run build
# if built locally: scp -r dist deploy@165.245.253.130:/var/www/pmer-dataset-collector/frontend/dist
```

### 13.6 Verify
Open `https://pmer-dataset-collector.com` in a browser — should show a valid
padlock, and `http://pmer-dataset-collector.com` / the bare IP should redirect
to it.
