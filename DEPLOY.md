# Deploying Moximos to the Hostinger VPS

Everything runs on one machine: Nginx serves the built frontend and proxies
`/api` to the Node server on port 8787. Same origin, so there is no CORS
config and no `VITE_BASE_URL` to set.

**Why the VPS rather than Vercel:** generation runs for 30 seconds to several
minutes (a measured worst case was 727s during an NVIDIA outage), it continues
*after* the HTTP response is sent so the UI can poll progress, and the database
is a JSON file on disk. Serverless platforms break all three.

- **Server:** `srv1837596.hstgr.cloud` — `2.25.87.48`
- **Domain:** `moximos.com`

---

## 1. DNS (hPanel → Domains → moximos.com → DNS)

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `@` | `2.25.87.48` | 14400 |
| A | `www` | `2.25.87.48` | 14400 |

Delete any existing A or CNAME record on `@` or `www` first, or they will
conflict. Propagation is usually minutes; check with `nslookup moximos.com`.

---

## 2. Server setup (once)

SSH in as root:

```bash
ssh root@2.25.87.48
```

```bash
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx git
npm install -g pm2
node -v && nginx -v
```

---

## 3. Get the code

```bash
mkdir -p /var/www && cd /var/www
git clone https://github.com/Subhan-Tanveer/Moximos.git moximos
cd moximos
npm ci
```

---

## 4. Environment

`.env` is gitignored, so it must be created on the server. Copy the values
from your local `.env`:

```bash
nano /var/www/moximos/.env
```

```env
NVIDIA_API_KEY=your_key_here
GOOGLE_PLACES_API_KEY=your_key_here
GOOGLE_PLACES_DAILY_CAP=50
NODE_ENV=production
PORT=8787

# The QA pass mostly times out and adds ~180s to every build.
AI_ENABLE_QA_PASS=false
```

```bash
chmod 600 /var/www/moximos/.env
```

Do **not** set `VITE_BASE_URL` — the frontend uses relative `/api` paths and
Nginx proxies them, which is what keeps the session cookie first-party.

---

## 5. Build the frontend

```bash
cd /var/www/moximos && npm run build
```

Produces `dist/`, which Nginx serves.

---

## 6. Start the API

```bash
mkdir -p /var/log/moximos
cd /var/www/moximos
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup        # run the command it prints, so it survives reboot
pm2 logs moximos-api --lines 30
```

Expect: `[server] Moximos API listening on http://localhost:8787`.
No `NVIDIA_API_KEY is not set` warning — if you see one, `.env` is wrong.

---

## 7. Nginx

```bash
cp /var/www/moximos/deploy/nginx.conf /etc/nginx/sites-available/moximos
ln -sf /etc/nginx/sites-available/moximos /etc/nginx/sites-enabled/moximos
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

`http://moximos.com` should now load once DNS has propagated.

---

## 8. HTTPS

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d moximos.com -d www.moximos.com
```

Certbot rewrites the site config for TLS and installs auto-renewal. HTTPS
matters here beyond the padlock: `NODE_ENV=production` marks the session
cookie `Secure`, so **logins will not persist over plain HTTP**.

---

## Deploying updates

```bash
cd /var/www/moximos
git pull
npm ci
npm run build
pm2 restart moximos-api
```

Only restart the API when server code changed; frontend-only changes just need
the rebuild.

---

## Backups — do this

The entire database is one file: `server/data/db.json`. It holds every user
account and every generated project, and it is gitignored, so nothing else has
a copy.

```bash
crontab -e
```

```cron
0 3 * * * cp /var/www/moximos/server/data/db.json /var/backups/moximos-$(date +\%F).json
```

```bash
mkdir -p /var/backups
```

Moving to Postgres (Neon and Supabase both have free tiers) is the real fix
later; `server/store.js` is written so only `loadDB`/`saveDB` need replacing.

---

## Checks

```bash
curl -I https://moximos.com                  # 200, text/html
curl https://moximos.com/api/health          # {"ok":true}
pm2 status                                   # moximos-api online
pm2 logs moximos-api --lines 50
tail -f /var/log/nginx/error.log
```

Then sign up at `https://moximos.com/signup` and generate a project.

## If something breaks

| Symptom | Cause |
|---|---|
| 502 Bad Gateway | API is down — `pm2 status`, `pm2 logs moximos-api` |
| Site loads, API 404s | Nginx `location /api/` block missing or not reloaded |
| Login does not persist | Site is on HTTP, or `NODE_ENV` is not `production` |
| Build fails on `npm run build` | Low memory — add swap: `fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile` |
| Generation times out at 60s | Nginx `proxy_read_timeout` not applied — re-check the config is the one in `deploy/` |
