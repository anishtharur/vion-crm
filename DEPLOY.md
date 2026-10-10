# Deploying Vion CRM on Oracle Cloud Always Free with SQLite

The app and its SQLite database run on one Oracle Cloud VM. This is the simplest
setup for a small team: no remote database account or database migration is
needed. Keep the database on persistent VM storage and maintain off-VM backups.
The VM also runs Chromium for PDF generation. Oracle's Always Free tier
includes an Ampere ARM VM (up to 4 OCPU / 24 GB RAM), subject to account
eligibility and regional capacity.

Run one app instance against this local database file. Do not scale the app to
multiple VMs sharing the same SQLite file; use a remote database if you later
need multiple app instances.

Total setup time: roughly an hour, most of it Oracle signup.

## 1. Create the VM

1. Sign up at [oracle.com/cloud/free](https://www.oracle.com/cloud/free/)
   (credit card required for identity, not charged). Pick a home region close
   to you — it cannot be changed later.
2. Console → **Compute → Instances → Create instance**:
   - Image: **Ubuntu 24.04** (aarch64)
   - Shape: **VM.Standard.A1.Flex** — 2 OCPU / 12 GB is plenty and stays
     within the free allowance (you can use up to 4 OCPU / 24 GB).
   - Upload or generate an SSH key, download the private key.
3. If creation fails with **"Out of capacity"** (common for A1 shapes), retry
   at another time / availability domain, or fall back to the x86
   `VM.Standard.E2.1.Micro` shape (also always free, 1 GB RAM — workable but
   tight; add swap before building).
4. Note the instance's **public IP**.

## 2. Open ports 80 and 443

Two firewalls stand in the way — Oracle's and Ubuntu's.

**Oracle (VCN):** Instance page → Virtual cloud network → the subnet's
**Security List** → Add ingress rules:

- Source `0.0.0.0/0`, protocol TCP, destination port `80`
- Source `0.0.0.0/0`, protocol TCP, destination port `443`

**On the VM** (Oracle's Ubuntu images ship restrictive iptables rules):

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

## 3. Install software

SSH in (`ssh -i <key> ubuntu@<public-ip>`), then:

```bash
# Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git sqlite3

# Chromium for PDF generation. Puppeteer has no downloadable build for
# Linux ARM, so we use the system browser (snap ships it on Ubuntu 24.04).
sudo snap install chromium
```

## 4. Set up the app and SQLite database

```bash
git clone <your-repo-url> ~/vion-crm
cd ~/vion-crm

# Skip Puppeteer's Chromium download — it fails on ARM and we use snap's anyway
PUPPETEER_SKIP_DOWNLOAD=1 npm ci
mkdir -p ~/data
```

Create `~/vion-crm/.env`:

```bash
DATABASE_PATH=/home/ubuntu/data/vion.db
SESSION_SECRET=<output of: openssl rand -base64 32>
AUTH_USERS=you@example.com:Your Name:<hash>,them@example.com:Their Name:<hash>
PDF_BASE_URL=http://127.0.0.1:3000
PUPPETEER_EXECUTABLE_PATH=/snap/bin/chromium
```

Generate each password hash on the VM (or locally) with:

```bash
npm run auth:hash -- "the password"
```

### Copy the existing local database

Stop the local development server first so the SQLite file is closed cleanly.
Then copy the database to the VM:

```bash
scp vion.db ubuntu@<public-ip>:/home/ubuntu/data/vion.db
```

If you have the SQLite CLI installed locally, prefer making a consistent
backup first and copy that instead:

```bash
sqlite3 vion.db ".backup 'vion-backup.db'"
scp vion-backup.db ubuntu@<public-ip>:/home/ubuntu/vion-backup.db
```

On the VM, move the backup into the configured location:

```bash
mv /home/ubuntu/vion-backup.db /home/ubuntu/data/vion.db
```

If starting fresh instead, omit the copy step and run `npm run db:push` to
create an empty database. For a copied database, `db:push` is only needed when
the application schema changes. Keep the original local file as a backup until
the VM copy is verified.

## 5. Run it as a service

`sudo nano /etc/systemd/system/vion-crm.service`:

```ini
[Unit]
Description=Vion CRM
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/vion-crm
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

(`npm start` loads `.env` itself via Next.js, so no EnvironmentFile needed.)

```bash
sudo systemctl enable --now vion-crm
sudo systemctl status vion-crm     # should be active (running)
```

## 6. HTTPS with Caddy

Set an A record for `vion-labs.com` to the VM's public IP in the domain's DNS
controls (currently managed through Vercel). Caddy provisions and renews
Let's Encrypt certificates automatically.

```bash
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update && sudo apt-get install -y caddy
```

`sudo nano /etc/caddy/Caddyfile`:

```
vion-labs.com {
    reverse_proxy 127.0.0.1:3000
}
```

```bash
sudo systemctl reload caddy
```

Open `https://vion-labs.com` and verify the login page. Add `www.vion-labs.com`
to Caddy only after configuring its DNS record too.

> No domain yet? You can temporarily set `COOKIE_SECURE=0` in `.env` and use
> `http://<public-ip>` directly, but traffic (including passwords) is then
> unencrypted — don't put real data in until HTTPS is up.

## 7. Database backups and recovery

Production data lives at `/home/ubuntu/data/vion.db`. Schedule SQLite's online
backup command and keep copies off the VM; the backup works while the app is
running:

```bash
mkdir -p ~/backups
sqlite3 /home/ubuntu/data/vion.db ".backup '/home/ubuntu/backups/vion-$(date +\%F).db'"
```

Copy backups to storage outside the VM and periodically test restoring one.
Do not rely on the VM's boot disk as the only copy of customer and invoice data.

## 8. Updating the app

```bash
cd ~/vion-crm
git pull
PUPPETEER_SKIP_DOWNLOAD=1 npm ci
npm run db:push        # only when the schema changed
npm run build
sudo systemctl restart vion-crm
```
