# DigitalOcean Deployment Guide — Digital Filing Cabinet (DFC)

End-to-end guide for deploying the DFC stack (Django + React + Postgres + MinIO + Elasticsearch + Redis + RabbitMQ + Celery + Nginx) to DigitalOcean.

This guide targets a **single-Droplet Docker Compose deployment** as the default (good for staging and small production tenants), and documents the **scale-out path** to managed services + Kubernetes (DOKS) for high-availability production.

---

## Table of Contents

1. [Architecture Choices on DigitalOcean](#1-architecture-choices-on-digitalocean)
2. [Prerequisites](#2-prerequisites)
3. [Provision the Droplet](#3-provision-the-droplet)
4. [Domain, DNS, and TLS](#4-domain-dns-and-tls)
5. [Server Hardening](#5-server-hardening)
6. [Install Docker & Docker Compose](#6-install-docker--docker-compose)
7. [Clone the Repository](#7-clone-the-repository)
8. [Generate Secrets](#8-generate-secrets)
9. [Configure Environment Variables](#9-configure-environment-variables)
10. [TLS Certificates with Let's Encrypt](#10-tls-certificates-with-lets-encrypt)
11. [Frontend: Build & Wire Into Nginx](#11-frontend-build--wire-into-nginx)
12. [First-Time Bring-Up](#12-first-time-bring-up)
13. [Post-Deploy Tasks](#13-post-deploy-tasks)
14. [Backups](#14-backups)
15. [Monitoring & Logs](#15-monitoring--logs)
16. [Updates & Zero-Downtime Releases](#16-updates--zero-downtime-releases)
17. [Scale-Out Path: Managed Services + DOKS](#17-scale-out-path-managed-services--doks)
18. [Cost Estimate](#18-cost-estimate)
19. [Troubleshooting](#19-troubleshooting)
20. [Production Hardening Checklist](#20-production-hardening-checklist)
21. [Appendix A: Deploying Without a Domain Name](#appendix-a-deploying-without-a-domain-name)
22. [Appendix B: Useful Commands](#appendix-b-useful-commands)

---

## 1. Architecture Choices on DigitalOcean

You have three deployment shapes. Pick one before starting.

| Shape | When to use | Monthly cost (rough) |
|---|---|---|
| **A. Single Droplet, all-in-one Docker Compose** | Staging, pilot tenants, < 100 concurrent users | ~$48–$96 |
| **B. Droplet + Managed Postgres + Spaces** | Production, single region, < 500 concurrent | ~$140–$250 |
| **C. DOKS (Kubernetes) + Managed Postgres + Spaces + Managed Redis** | HA production, 1000+ concurrent users, 99.9% SLA | ~$400–$900+ |

**This guide implements Shape A** end-to-end (using `deployment/docker-compose.production.yml`), and covers the migration path to Shape B/C in [§17](#17-scale-out-path-managed-services--doks).

### Mapping repo components to DO services

| DFC component | Shape A (Droplet) | Shape B/C (managed) |
|---|---|---|
| Django + Celery worker/beat | Containers on Droplet | Containers on DOKS |
| PostgreSQL | `postgres` container | DO Managed Postgres |
| Redis | `redis` container | DO Managed Redis |
| RabbitMQ | `rabbitmq` container | RabbitMQ on Droplet or CloudAMQP |
| MinIO (S3 API) | `minio` container with attached volume | **DO Spaces** (drop-in S3 replacement) |
| Elasticsearch | `elasticsearch` container | Self-hosted on dedicated Droplet, or Elastic Cloud |
| Nginx + TLS | `nginx` container + Let's Encrypt | DO Load Balancer or Ingress + cert-manager |

---

## 2. Prerequisites

On your local machine:
- A **DigitalOcean account** with billing enabled.
- The **`doctl`** CLI installed and authenticated: `doctl auth init`.
- An **SSH keypair** (`~/.ssh/id_ed25519`); the public key uploaded to DO (Settings → Security → SSH Keys).
- A **registered domain** you can point at the Droplet (e.g. `dfc.cccplc.com`). The repo's `nginx/dfc.conf` already references this hostname — change it if yours differs.
- Local clone of this repo with the production branch checked out.

---

## 3. Provision the Droplet

Recommended starting size for Shape A:

- **Image:** Ubuntu 24.04 LTS x64
- **Plan:** Basic Premium Intel — **8 GB RAM / 4 vCPU / 160 GB SSD** (~$48/mo)
  - Elasticsearch alone wants 2 GB heap; Postgres + Django + Celery + Redis + RabbitMQ on top means **8 GB is the floor**. Don't try this on 4 GB.
- **Datacenter region:** closest to your users (e.g. `fra1`, `nyc3`, `sfo3`).
- **Authentication:** SSH key (do **not** use password auth).
- **Add block storage:** attach a **100 GB Volume** for `/var/lib/docker/volumes` so document data isn't on the boot disk.

Via `doctl`:

```bash
doctl compute droplet create dfc-prod-01 \
  --region fra1 \
  --size s-4vcpu-8gb-intel \
  --image ubuntu-24-04-x64 \
  --ssh-keys <YOUR_SSH_KEY_FINGERPRINT> \
  --enable-monitoring \
  --enable-backups \
  --tag-names dfc,prod

doctl compute volume create dfc-data \
  --region fra1 \
  --size 100GiB \
  --fs-type ext4

doctl compute volume-action attach <VOLUME_ID> <DROPLET_ID>
```

`--enable-backups` adds DO weekly snapshots (~20% of Droplet cost). `--enable-monitoring` installs the DO agent for CPU/memory/disk dashboards.

### Mount the volume

SSH into the Droplet, then:

```bash
ssh root@<DROPLET_IP>

# Confirm the volume device name (typically /dev/sda for the first volume)
lsblk

# Mount and persist
mkdir -p /mnt/dfc-data
mount -o discard,defaults /dev/sda /mnt/dfc-data
echo '/dev/sda /mnt/dfc-data ext4 defaults,nofail,discard 0 0' >> /etc/fstab
```

You'll redirect Docker's data-root onto this volume in [§6](#6-install-docker--docker-compose).

---

## 4. Domain, DNS, and TLS

Point your domain at the Droplet **before** issuing certificates.

```bash
# At your DNS provider (or via doctl if domain is on DO):
doctl compute domain records create cccplc.com \
  --record-type A --record-name dfc --record-data <DROPLET_IP> --record-ttl 300
```

Verify propagation:

```bash
dig +short dfc.cccplc.com
```

If the repo's hostname differs from yours, update `nginx/dfc.conf`:

```bash
# Change every occurrence of dfc.cccplc.com to your hostname
sed -i 's/dfc\.cccplc\.com/<your-domain>/g' nginx/dfc.conf
```

---

## 5. Server Hardening

Run these as root on the Droplet **before** exposing any services.

```bash
# 1. Patch
apt-get update && apt-get -y upgrade

# 2. Create a non-root deploy user
adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys

# 3. Disable root login + password auth
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl reload ssh

# 4. Firewall — only 22, 80, 443 to the world
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 5. Fail2ban for SSH brute-force protection
apt-get install -y fail2ban
systemctl enable --now fail2ban

# 6. Unattended security updates
apt-get install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

After this, reconnect as `deploy` (not `root`) for everything below: `ssh deploy@<DROPLET_IP>`.

> **Important:** Internal-only ports (5432 Postgres, 6379 Redis, 9200 Elasticsearch, 9000/9001 MinIO, 5672/15672 RabbitMQ) are exposed by `deployment/docker-compose.production.yml`. With UFW blocking them at the host level, they're only reachable from inside the Docker network — but if you ever disable UFW or move to host networking, those ports must be locked down. See [§20](#20-production-hardening-checklist).

---

## 6. Install Docker & Docker Compose

```bash
# Docker Engine (official repo, not Ubuntu's older docker.io)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker deploy
newgrp docker  # apply group change in current shell

# Verify
docker --version
docker compose version  # built into modern Docker
```

### Move Docker storage to the attached volume

You don't want a 50 GB Postgres database filling the boot disk.

```bash
sudo systemctl stop docker
sudo mkdir -p /mnt/dfc-data/docker
sudo rsync -aP /var/lib/docker/ /mnt/dfc-data/docker/

# Tell Docker the new data-root
sudo tee /etc/docker/daemon.json > /dev/null <<'JSON'
{
  "data-root": "/mnt/dfc-data/docker",
  "log-driver": "json-file",
  "log-opts": { "max-size": "50m", "max-file": "5" }
}
JSON

sudo systemctl start docker
docker info | grep "Docker Root Dir"  # should print /mnt/dfc-data/docker
```

The `log-opts` cap container log growth — without them a chatty container can fill the disk.

---

## 7. Clone the Repository

```bash
sudo mkdir -p /opt/dfc && sudo chown deploy:deploy /opt/dfc
cd /opt/dfc
git clone <YOUR_REPO_URL> .
git checkout master  # or your release branch
```

---

## 8. Generate Secrets

The production compose file (`deployment/docker-compose.production.yml`) reads ~15 secrets from environment variables. Generate them once and keep them in a password manager (1Password, Bitwarden) — **do not commit `.env` to git**.

Run on your laptop or the Droplet:

```bash
# Django SECRET_KEY (50+ chars)
python3 -c "import secrets; print(secrets.token_urlsafe(50))"

# Fernet keys for django-fernet-fields (must be valid Fernet keys, not random bytes)
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Postgres / Redis / RabbitMQ / MinIO passwords (32 chars, URL-safe)
for i in 1 2 3 4 5; do python3 -c "import secrets; print(secrets.token_urlsafe(32))"; done

# MinIO KMS key (32 bytes, base64)
python3 -c "import secrets, base64; print(base64.b64encode(secrets.token_bytes(32)).decode())"

# Vault root token (only needed if you keep the vault service)
python3 -c "import secrets; print(secrets.token_hex(16))"

# Elasticsearch password
python3 -c "import secrets; print(secrets.token_urlsafe(24))"
```

If you don't have Python on the Droplet yet: `sudo apt-get install -y python3-cryptography`.

---

## 9. Configure Environment Variables

Create `/opt/dfc/deployment/.env` with the values from the previous step:

```bash
cd /opt/dfc/deployment
nano .env
```

```env
# === Django ===
DJANGO_SECRET_KEY=<from generator>
ALLOWED_HOSTS=dfc.cccplc.com,localhost
DJANGO_SETTINGS_MODULE=config.settings.production

# === PostgreSQL ===
DB_NAME=dfc_prod
DB_USER=dfc_user
DB_PASSWORD=<from generator>

# === MinIO ===
MINIO_ROOT_USER=dfc_minio_admin
MINIO_ROOT_PASSWORD=<from generator>
MINIO_KMS_SECRET_KEY=<base64 KMS key>

# === Elasticsearch ===
ELASTICSEARCH_PASSWORD=<from generator>

# === Redis ===
REDIS_PASSWORD=<from generator>

# === RabbitMQ ===
RABBITMQ_USER=dfc_user
RABBITMQ_PASSWORD=<from generator>

# === Encryption (django-fernet-fields) ===
FERNET_KEY_PRIMARY=<Fernet key 1>
FERNET_KEY_SECONDARY=<Fernet key 2>

# === Vault (only if running the vault container) ===
VAULT_TOKEN=<from generator>
```

Lock the file down:

```bash
chmod 600 .env
```

Verify the production Django settings file (`backend/config/settings/production.py`) reads each of these. If any are missing or named differently, fix the variable name in `.env` to match — don't edit settings just to make this guide work.

---

## 10. TLS Certificates with Let's Encrypt

The repo's `nginx/dfc.conf` expects certs at `/etc/nginx/ssl/dfc.cccplc.com.{crt,key}`. Use **certbot** in standalone mode for the initial issuance, then mount the certs into the Nginx container.

### 10a. Issue the certificate (one-time)

Stop anything on port 80 first (the compose stack isn't running yet, so this should be clean):

```bash
sudo apt-get install -y certbot
sudo certbot certonly --standalone \
  -d dfc.cccplc.com \
  --email admin@cccplc.com \
  --agree-tos --no-eff-email
```

Certs land in `/etc/letsencrypt/live/dfc.cccplc.com/`.

### 10b. Wire certs into the Nginx container

The compose file mounts `./certs/nginx`. Symlink Let's Encrypt's live certs into that path with the filenames `nginx/dfc.conf` expects:

```bash
mkdir -p /opt/dfc/deployment/certs/nginx
sudo ln -sf /etc/letsencrypt/live/dfc.cccplc.com/fullchain.pem \
            /opt/dfc/deployment/certs/nginx/dfc.cccplc.com.crt
sudo ln -sf /etc/letsencrypt/live/dfc.cccplc.com/privkey.pem \
            /opt/dfc/deployment/certs/nginx/dfc.cccplc.com.key
sudo ln -sf /etc/letsencrypt/live/dfc.cccplc.com/chain.pem \
            /opt/dfc/deployment/certs/nginx/ca-bundle.crt
```

### 10c. DH parameters (referenced by the Nginx config)

```bash
sudo openssl dhparam -out /opt/dfc/deployment/dhparam.pem 2048
# 4096 is more secure but takes ~30 minutes on a 4-vCPU box
```

### 10d. Auto-renewal

Add a cron job that renews and reloads Nginx inside the container:

```bash
sudo crontab -e
```

```cron
0 3 * * * certbot renew --quiet --deploy-hook "docker exec dfc_nginx nginx -s reload"
```

> **Alternative:** Use the `certbot/certbot` Docker image with a webroot challenge served by Nginx itself — the `nginx/dfc.conf` already has a `/.well-known/acme-challenge/` location block. The standalone approach above is simpler for first deploy.

---

## 11. Frontend: Build & Wire Into Nginx

The current `nginx/dfc.conf` proxies **everything** to Django. The React SPA at `frontend/` builds to static files — you need to serve those on `/` and reverse-proxy `/api/` to Django.

### 11a. Build the frontend

Build locally (faster) or in a container on the Droplet. Local is preferred:

```bash
# On your laptop
cd frontend
npm ci --legacy-peer-deps
VITE_API_BASE_URL=https://dfc.cccplc.com/api/v1 npm run build

# Copy dist to the Droplet
rsync -av dist/ deploy@<DROPLET_IP>:/opt/dfc/deployment/frontend-dist/
```

### 11b. Patch the Nginx config

Edit `/opt/dfc/nginx/dfc.conf` and replace the single `location /` block with three locations: SPA root, API, and Django admin.

```nginx
# Frontend SPA
location / {
    root /var/www/frontend;
    try_files $uri $uri/ /index.html;
    expires 1h;
}

# API → Django
location /api/ {
    proxy_pass http://django:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 300s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
}

# Django admin
location /admin/ {
    proxy_pass http://django:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### 11c. Mount the dist directory into Nginx

In `deployment/docker-compose.production.yml`, add a volume to the `nginx` service:

```yaml
nginx:
  volumes:
    - ../nginx/dfc.conf:/etc/nginx/conf.d/default.conf:ro
    - ./certs/nginx:/etc/nginx/ssl:ro
    - ./dhparam.pem:/etc/nginx/dhparam.pem:ro
    - ./backend/static:/var/www/static:ro
    - ./backend/media:/var/www/media:ro
    - ./frontend-dist:/var/www/frontend:ro   # <-- new
```

> The `Content-Security-Policy` header in `nginx/dfc.conf` has `connect-src 'self'`, which is fine for same-origin API calls. If you serve the API from a different subdomain, widen it.

---

## 12. First-Time Bring-Up

From `/opt/dfc/deployment` on the Droplet:

```bash
# Build images
docker compose -f docker-compose.production.yml --env-file .env build

# Start infra first, let it settle (Elasticsearch is the slowest)
docker compose -f docker-compose.production.yml --env-file .env up -d \
  postgres redis rabbitmq minio elasticsearch
sleep 60
docker compose -f docker-compose.production.yml --env-file .env ps

# Bootstrap Elasticsearch user (xpack security is enabled in the prod compose)
docker exec -it dfc_elasticsearch bin/elasticsearch-setup-passwords interactive
# Set the elastic user's password to whatever you put in ELASTICSEARCH_PASSWORD

# Start the app tier
docker compose -f docker-compose.production.yml --env-file .env up -d \
  django celery_worker celery_beat nginx

# Apply migrations
docker exec -it dfc_django python manage.py migrate --noinput

# Collect static files
docker exec -it dfc_django python manage.py collectstatic --noinput

# Create the first superuser
docker exec -it dfc_django python manage.py createsuperuser

# Build search indexes
docker exec -it dfc_django python manage.py search_index --rebuild
```

Smoke test:

```bash
curl -I https://dfc.cccplc.com/health/
curl -I https://dfc.cccplc.com/api/v1/auth/login/
```

Open `https://dfc.cccplc.com` in a browser and confirm the SPA loads and the API responds.

---

## 13. Post-Deploy Tasks

### Create the MinIO bucket

```bash
docker run --rm --network dfc_network minio/mc \
  alias set dfc http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
docker run --rm --network dfc_network minio/mc mb dfc/dfc-documents
docker run --rm --network dfc_network minio/mc anonymous set none dfc/dfc-documents
```

### Seed retention policies / default tenant

If the project has management commands for these (`generate_seed_data`, `setup_tenant`, etc.), run them now via `docker exec dfc_django python manage.py <cmd>`.

### Health checks

```bash
docker compose -f docker-compose.production.yml ps
docker exec dfc_django curl -sf http://localhost:8000/health/
docker exec dfc_django curl -sf http://elasticsearch:9200 -u elastic:$ELASTICSEARCH_PASSWORD --insecure
```

---

## 14. Backups

Three layers — none of them is optional in production.

### 14a. Postgres logical backups → DO Spaces

```bash
# Install s3cmd or use the AWS CLI configured for DO Spaces
sudo apt-get install -y s3cmd
s3cmd --configure  # endpoint: <region>.digitaloceanspaces.com
```

Cron job (`/etc/cron.daily/dfc-pg-backup`):

```bash
#!/bin/bash
set -euo pipefail
TS=$(date +%Y%m%d-%H%M)
docker exec dfc_postgres pg_dump -U "$DB_USER" "$DB_NAME" | gzip > /tmp/dfc-$TS.sql.gz
s3cmd put /tmp/dfc-$TS.sql.gz s3://dfc-backups/postgres/
rm /tmp/dfc-$TS.sql.gz
# Prune older than 30 days
s3cmd ls s3://dfc-backups/postgres/ | awk '$1 < "'$(date -d '30 days ago' +%Y-%m-%d)'"{print $4}' | xargs -r s3cmd del
```

### 14b. MinIO bucket replication → DO Spaces

```bash
docker run --rm --network dfc_network minio/mc \
  alias set spaces https://<region>.digitaloceanspaces.com <SPACES_KEY> <SPACES_SECRET>
docker run --rm --network dfc_network minio/mc mirror --watch dfc/dfc-documents spaces/dfc-docs-backup
```

Run that as a systemd service or in a long-lived container.

### 14c. Droplet snapshots

Already enabled via `--enable-backups`. DO takes a weekly snapshot. For more frequent recovery points, schedule manual snapshots:

```bash
doctl compute droplet-action snapshot <DROPLET_ID> --snapshot-name "dfc-$(date +%F)"
```

### Restore drill

Quarterly: provision a fresh Droplet, restore the latest pg_dump, mirror the MinIO bucket back, and confirm the application boots. Restore drills are the only way to know your backups actually work.

---

## 15. Monitoring & Logs

### DO native monitoring

The agent installed via `--enable-monitoring` gives you CPU, memory, disk, and bandwidth dashboards out of the box. **Add alert policies** in the DO console:

- CPU > 80% for 5 min
- Memory > 90% for 5 min
- Disk > 85%
- Droplet down

### Application metrics

Add a Prometheus + Grafana stack alongside the existing compose. The CLAUDE.md already calls these out as the standard. Minimum exporters:

- `node_exporter` (host metrics)
- `postgres_exporter`
- `redis_exporter`
- `nginx-prometheus-exporter`
- Django: `django-prometheus` middleware exposing `/metrics`

### Centralised logs

Container logs are JSON files capped via `/etc/docker/daemon.json` from [§6](#6-install-docker--docker-compose). For real log aggregation:

- **Cheap:** ship to **DO Managed Logs** (Papertrail-style) or Logtail.
- **Compliant:** ship to a self-hosted ELK/Loki stack — you already run Elasticsearch.

### Error tracking

Add `sentry-sdk` to `requirements/production.txt` and set `SENTRY_DSN` in `.env`. CLAUDE.md lists Sentry as the standard.

---

## 16. Updates & Zero-Downtime Releases

Single-Droplet deployments can't be truly zero-downtime, but you can get close.

```bash
cd /opt/dfc
git fetch && git checkout <release-tag>

# Rebuild only what changed
docker compose -f deployment/docker-compose.production.yml --env-file deployment/.env build django celery_worker celery_beat

# Apply migrations BEFORE swapping containers
docker exec dfc_django python manage.py migrate --noinput

# Recreate app containers (Nginx keeps running, brief 502s during the swap)
docker compose -f deployment/docker-compose.production.yml --env-file deployment/.env up -d --no-deps django celery_worker celery_beat

# Front-end refresh
rsync -av --delete frontend/dist/ deployment/frontend-dist/
docker exec dfc_nginx nginx -s reload
```

For true zero-downtime: graduate to Shape C (DOKS rolling deployments) — see [§17](#17-scale-out-path-managed-services--doks).

### Rollback

Tag every release. To roll back:

```bash
git checkout <previous-tag>
docker compose -f deployment/docker-compose.production.yml --env-file deployment/.env up -d --no-deps django celery_worker celery_beat
docker exec dfc_django python manage.py migrate <app> <prev_migration>  # only if forward migration was destructive
```

Backwards-incompatible migrations are the failure mode. Use the **expand-and-contract** pattern: ship the read-compatible migration first, deploy code, then ship the destructive cleanup later.

---

## 17. Scale-Out Path: Managed Services + DOKS

When the single Droplet stops scaling (typically: > 200 concurrent users, > 100 GB documents, or you need 99.9% SLA), migrate components in this order:

### Step 1 — Move object storage to DO Spaces

Easiest win. MinIO speaks the same S3 API as Spaces.

1. Create a Space + access key in the DO console.
2. Switch backend env vars:
   ```env
   MINIO_ENDPOINT=<region>.digitaloceanspaces.com
   MINIO_ACCESS_KEY=<spaces key>
   MINIO_SECRET_KEY=<spaces secret>
   MINIO_BUCKET_NAME=dfc-documents
   MINIO_USE_SSL=True
   ```
3. Mirror existing MinIO data: `mc mirror dfc/dfc-documents spaces/dfc-documents`.
4. Remove the `minio` service from `docker-compose.production.yml`.

### Step 2 — Move Postgres to DO Managed Database

1. Provision: `doctl databases create dfc-pg --engine pg --version 16 --region fra1 --size db-s-2vcpu-4gb`.
2. Restore from your latest pg_dump.
3. Update `DB_HOST`, `DB_PORT`, and add `DB_SSLMODE=require` in `.env`.
4. Remove the `postgres` service.

You now get automated point-in-time recovery, failover, and version upgrades for free.

### Step 3 — Move Redis to DO Managed Redis

Same pattern. Update `REDIS_URL` to the managed instance's connection string. Remove the `redis` service.

### Step 4 — Move to DOKS (Kubernetes)

Once stateful services are external, the app tier becomes stateless and trivially Kubernetisable.

```bash
doctl kubernetes cluster create dfc-prod \
  --region fra1 --version 1.31 \
  --node-pool "name=app;size=s-4vcpu-8gb;count=3;auto-scale=true;min-nodes=3;max-nodes=10"
```

Workloads to deploy as Helm charts or kustomize overlays:
- `Deployment` — Django (3+ replicas, behind a `Service` of type ClusterIP)
- `Deployment` — Celery worker (HPA on queue depth)
- `Deployment` — Celery beat (single replica, leader election)
- `Deployment` — Elasticsearch via the official ECK operator, **or** Elastic Cloud
- `Ingress` — DO Load Balancer + cert-manager for Let's Encrypt
- `StatefulSet` — RabbitMQ cluster (or migrate to CloudAMQP)

CI/CD: GitHub Actions builds images, pushes to **DO Container Registry** (`registry.digitalocean.com/<your-registry>`), and `kubectl rollout` deploys.

---

## 18. Cost Estimate

### Shape A (this guide)

| Item | Monthly |
|---|---|
| Droplet 8 GB / 4 vCPU Premium Intel | $48 |
| 100 GB Block Storage | $10 |
| Droplet weekly backups (20%) | $10 |
| 250 GB Spaces (backups + replication) | $5 |
| Bandwidth overage (typical) | $0–$10 |
| **Total** | **~$73–$83** |

### Shape B (Droplet + managed Postgres + Spaces)

| Item | Monthly |
|---|---|
| Droplet 8 GB / 4 vCPU | $48 |
| Managed Postgres (2 vCPU / 4 GB) | $60 |
| 250 GB Spaces | $5 |
| Load Balancer | $12 |
| **Total** | **~$125** |

### Shape C (DOKS)

| Item | Monthly |
|---|---|
| DOKS control plane | Free (HA tier: $40) |
| 3× s-4vcpu-8gb worker nodes | $144 |
| Managed Postgres HA (2 vCPU / 4 GB) | $120 |
| Managed Redis (1 GB) | $15 |
| Spaces | $5 |
| Load Balancer | $12 |
| Container Registry (basic) | $5 |
| **Total** | **~$300–$400+** (more for larger nodes/HA Postgres) |

---

## 19. Troubleshooting

### Containers exit immediately

```bash
docker compose -f deployment/docker-compose.production.yml logs --tail=200 <service>
```

Common causes:
- `.env` missing a required variable → service crashes on startup.
- Wrong Fernet key format (must be base64 urlsafe, 44 chars).
- Elasticsearch refuses to start: usually the kernel `vm.max_map_count` is too low. Fix: `sudo sysctl -w vm.max_map_count=262144` and persist in `/etc/sysctl.conf`.

### Nginx returns 502

```bash
docker exec dfc_nginx nginx -t   # config syntax
docker exec dfc_django curl -I http://localhost:8000/health/   # is Django up?
```

If Django is up and Nginx still 502s, the `proxy_pass` host (`django`) likely can't resolve — check both containers are on the `dfc_network`.

### TLS handshake fails

- Cert symlinks broken? `ls -la deployment/certs/nginx/`
- Cert expired? `openssl x509 -in /etc/letsencrypt/live/dfc.cccplc.com/fullchain.pem -noout -dates`
- DH params missing? `ls -la deployment/dhparam.pem`

### Migrations fail mid-deploy

```bash
docker exec -it dfc_django python manage.py showmigrations
docker exec -it dfc_django python manage.py migrate <app> <prev_migration>  # roll back
```

Then fix the migration locally, push, redeploy.

### Disk filling up

```bash
df -h /mnt/dfc-data
docker system df
docker system prune -af --volumes   # CAREFUL: removes unused volumes too
```

The biggest culprits are usually Elasticsearch indexes and Postgres WAL. For ES: lower `index.number_of_replicas` to 0 on a single node and rotate old indices. For Postgres: tune `wal_keep_size`.

---

## 20. Production Hardening Checklist

Don't go live without these:

- [ ] `.env` file has `chmod 600` and is **not** in git
- [ ] `DEBUG=False` in production settings
- [ ] `ALLOWED_HOSTS` is restrictive (no `*`)
- [ ] All passwords are 24+ chars, generated, unique per service
- [ ] UFW blocks all ports except 22, 80, 443
- [ ] SSH password auth disabled, root login disabled
- [ ] Fail2ban running
- [ ] Unattended upgrades enabled
- [ ] Let's Encrypt auto-renew cron tested (`certbot renew --dry-run`)
- [ ] `vm.max_map_count=262144` persisted for Elasticsearch
- [ ] Daily Postgres backup verified by a restore drill
- [ ] MinIO → Spaces mirroring running
- [ ] Droplet weekly snapshots enabled
- [ ] DO monitoring alerts configured (CPU/mem/disk)
- [ ] Sentry DSN set, errors flowing
- [ ] Django `SECURE_HSTS_PRELOAD`, `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE` all `True`
- [ ] Rate limiting on `/api/v1/auth/` endpoints (django-ratelimit or nginx `limit_req`)
- [ ] Admin URL renamed from `/admin/` to a non-guessable path
- [ ] MFA required for all admin users
- [ ] Penetration test scheduled before first real customer onboarding

---

## Appendix A: Deploying Without a Domain Name

If you don't own a domain yet, you have four workarounds. Ranked by how little they break the existing security posture:

### A.1 (Recommended) — Use `nip.io` for free wildcard DNS + real Let's Encrypt certs

`nip.io` (and its sibling `sslip.io`) resolve `<your-ip>.nip.io` → your IP automatically. **Let's Encrypt issues real certs for them**, so HTTPS, HSTS, secure cookies, and the strict CSP in `nginx/dfc.conf` all keep working unchanged.

Example: Droplet IP `203.0.113.42` → hostname `203-0-113-42.nip.io`.

#### What changes vs. the main guide

**§4 DNS:** Skip entirely. Just pick your nip.io hostname (use dashes, not dots, in the IP — both work but dashes are friendlier with some certbot validators).

**§5 hardening:** No change.

**§9 `.env`:**

```env
ALLOWED_HOSTS=203-0-113-42.nip.io,203.0.113.42,localhost
```

If your Django settings file reads `CSRF_TRUSTED_ORIGINS`, also add:

```env
CSRF_TRUSTED_ORIGINS=https://203-0-113-42.nip.io
```

**§10 TLS — issue the cert:**

```bash
sudo apt-get install -y certbot
sudo certbot certonly --standalone \
  -d 203-0-113-42.nip.io \
  --email you@example.com \
  --agree-tos --no-eff-email
```

Symlink certs the same way as §10b, but with the nip.io hostname:

```bash
mkdir -p /opt/dfc/deployment/certs/nginx
sudo ln -sf /etc/letsencrypt/live/203-0-113-42.nip.io/fullchain.pem \
            /opt/dfc/deployment/certs/nginx/dfc.cccplc.com.crt
sudo ln -sf /etc/letsencrypt/live/203-0-113-42.nip.io/privkey.pem \
            /opt/dfc/deployment/certs/nginx/dfc.cccplc.com.key
sudo ln -sf /etc/letsencrypt/live/203-0-113-42.nip.io/chain.pem \
            /opt/dfc/deployment/certs/nginx/ca-bundle.crt
```

> Keeping the cert filenames as `dfc.cccplc.com.*` lets you avoid editing the cert paths in `nginx/dfc.conf` — only the `server_name` needs to change.

**`nginx/dfc.conf`:** Replace the hostname:

```bash
sed -i 's/dfc\.cccplc\.com/203-0-113-42.nip.io/g' /opt/dfc/nginx/dfc.conf
```

**§10d auto-renewal:** Use the nip.io hostname in the cron deploy hook (no functional change — certbot tracks it by domain).

**§11 frontend build:**

```bash
VITE_API_BASE_URL=https://203-0-113-42.nip.io/api/v1 npm run build
```

That's it. The rest of the guide (§12 onward) is identical.

#### Caveats

- nip.io is rate-limited by Let's Encrypt at ~50 certs/week per subdomain. Fine for one Droplet; not fine if you're spinning up dozens.
- The URL is ugly. When you eventually buy a domain, you re-run §4 + §10 with the real hostname and update `ALLOWED_HOSTS` + the Nginx `server_name`. No data migration needed.
- nip.io is operated by a third party and has occasionally had outages. For a real production tenant, get a domain — it's $10/year.

---

### A.2 — Cloudflare Tunnel (no inbound ports, free TLS at the edge)

Run `cloudflared` on the Droplet; it dials out to Cloudflare and Cloudflare hands you a `https://<name>.trycloudflare.com` URL (or a stable hostname if you have a free Cloudflare account with any domain).

```bash
# On the Droplet
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

# Quick (ephemeral) tunnel — instant URL, changes every restart
cloudflared tunnel --url http://localhost:80
```

For a stable hostname, log into Cloudflare and follow their **Named Tunnel** flow.

**What changes:**
- You can close ports 80/443 on UFW — only port 22 (SSH) needs to be open.
- Skip §10 (TLS) entirely. Cloudflare terminates HTTPS at their edge and forwards plain HTTP to your Nginx (which can stay on port 80 internally).
- `nginx/dfc.conf`: keep only the HTTP `server` block; remove the HTTPS one and the redirect.
- Set `SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')` in Django so `request.is_secure()` returns True (Cloudflare sets that header).

**Trade-offs:**
- All traffic transits Cloudflare's network. For a financial-document app, check whether your compliance posture allows a third-party TLS-terminating proxy. If yes, this is the cleanest no-domain option. If no, use A.1.
- You're now dependent on Cloudflare uptime and ToS.

---

### A.3 — IP + self-signed certificate (HTTPS, but browser warning every visit)

Use this only for internal demos to people you can tell "click 'Advanced' → 'Proceed anyway'."

```bash
# Generate self-signed cert valid for 365 days
sudo openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
  -keyout /opt/dfc/deployment/certs/nginx/dfc.cccplc.com.key \
  -out /opt/dfc/deployment/certs/nginx/dfc.cccplc.com.crt \
  -subj "/CN=203.0.113.42" \
  -addext "subjectAltName=IP:203.0.113.42"

# CA bundle — for self-signed, just point to the cert itself
sudo cp /opt/dfc/deployment/certs/nginx/dfc.cccplc.com.crt \
        /opt/dfc/deployment/certs/nginx/ca-bundle.crt
```

**Critical: disable HSTS** in `nginx/dfc.conf` before going live. If you don't, the first user who clicks "proceed anyway" will have HSTS pinned to your IP — and when you later switch to a real cert (or a different server on that IP), their browser will refuse to connect:

```nginx
# Comment this line out:
# add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```

Also disable OCSP stapling (won't work for self-signed):

```nginx
# ssl_stapling on;
# ssl_stapling_verify on;
# ssl_trusted_certificate /etc/nginx/ssl/ca-bundle.crt;
```

Update `.env`:

```env
ALLOWED_HOSTS=203.0.113.42,localhost
```

Browser warning every visit. Don't ship this to real users.

---

### A.4 — Plain HTTP on the IP (don't, but here's how if you must)

Only acceptable for **local testing on a private network**. Not for anything reachable from the public internet.

- Edit `nginx/dfc.conf`: delete the HTTPS server block and the HTTP→HTTPS redirect, leaving only a plain `server { listen 80; ... }` that proxies to Django.
- In production Django settings, set:
  ```python
  SECURE_SSL_REDIRECT = False
  SESSION_COOKIE_SECURE = False
  CSRF_COOKIE_SECURE = False
  SECURE_HSTS_SECONDS = 0
  ```
- `ALLOWED_HOSTS=203.0.113.42`

JWT auth tokens and session cookies will travel plaintext. This violates the encryption-in-transit requirement in CLAUDE.md. **Use A.1 instead — it's no harder.**

---

### When to migrate to a real domain

You'll want a real domain before:
- Onboarding any real customer
- Enabling MFA QR codes (TOTP issuer URIs look weird with IP-based hostnames)
- Setting up email-based password reset (deliverability tanks for IP-only senders)
- Any compliance/security audit

Migration is painless: buy a domain, point an A record at the Droplet, re-run §10 with the new hostname, update `ALLOWED_HOSTS`, redeploy. No data changes.

---

## Appendix B: Useful Commands

```bash
# Tail all logs
docker compose -f deployment/docker-compose.production.yml logs -f

# Restart one service
docker compose -f deployment/docker-compose.production.yml restart django

# Open Django shell
docker exec -it dfc_django python manage.py shell

# Open Postgres shell
docker exec -it dfc_postgres psql -U dfc_user dfc_prod

# Flush Redis
docker exec -it dfc_redis redis-cli -a "$REDIS_PASSWORD" FLUSHDB

# Re-run failed Celery task
docker exec -it dfc_django python manage.py shell
>>> from apps.workflows.tasks import reindex_document
>>> reindex_document.delay(<doc_id>)

# Check queue depth
docker exec dfc_rabbitmq rabbitmqctl list_queues -p dfc

# Inspect Elasticsearch indices
docker exec dfc_elasticsearch curl -s -u elastic:$ELASTICSEARCH_PASSWORD --insecure https://localhost:9200/_cat/indices?v
```

---

**Last updated:** 2026-05-06
**Maintainer:** DFC platform team
