#!/bin/bash
# ==============================================================================
# DFC Production Deployment Script
# Target: DigitalOcean Droplet — dfc.dabiko-software.tech (162.243.32.216)
# Run as: root (first-time setup) or deploy user (re-deploys)
# ==============================================================================

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
DOMAIN="dfc.dabiko-software.tech"
REPO_URL="https://github.com/dabiko/DFC-APPLICATION.git"
APP_DIR="/opt/dfc"
DEPLOY_USER="deploy"
ADMIN_EMAIL="dabikotech@gmail.com"
COMPOSE_FILE="deployment/docker-compose.production.simplified.yml"

# ── Colours ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[$(date +%H:%M:%S)] $*${NC}"; }
warn() { echo -e "${YELLOW}[WARN] $*${NC}"; }
die()  { echo -e "${RED}[ERROR] $*${NC}"; exit 1; }

# ── Detect who is running the script ─────────────────────────────────────────
CURRENT_USER=$(whoami)

# ==============================================================================
# PHASE 1 — Server hardening (run once as root)
# ==============================================================================
phase1_server_setup() {
    [[ "$CURRENT_USER" != "root" ]] && die "Phase 1 must be run as root."
    log "Phase 1: patching system..."
    apt-get update && apt-get -y upgrade

    log "Creating deploy user..."
    if ! id "$DEPLOY_USER" &>/dev/null; then
        adduser --disabled-password --gecos "" "$DEPLOY_USER"
        usermod -aG sudo "$DEPLOY_USER"
        mkdir -p /home/"$DEPLOY_USER"/.ssh
        cp /root/.ssh/authorized_keys /home/"$DEPLOY_USER"/.ssh/
        chown -R "$DEPLOY_USER":"$DEPLOY_USER" /home/"$DEPLOY_USER"/.ssh
        chmod 700 /home/"$DEPLOY_USER"/.ssh
        chmod 600 /home/"$DEPLOY_USER"/.ssh/authorized_keys
        log "deploy user created — reconnect as 'deploy' for phase 2 onward"
    else
        warn "deploy user already exists, skipping"
    fi

    log "Hardening SSH..."
    sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
    sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
    systemctl reload ssh

    log "Configuring UFW firewall..."
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable

    log "Installing fail2ban + unattended-upgrades..."
    apt-get install -y fail2ban unattended-upgrades
    systemctl enable --now fail2ban
    dpkg-reconfigure -plow unattended-upgrades

    log "Installing Docker..."
    if ! command -v docker &>/dev/null; then
        curl -fsSL https://get.docker.com | sh
    fi
    usermod -aG docker "$DEPLOY_USER"

    # Increase vm.max_map_count for Elasticsearch
    sysctl -w vm.max_map_count=262144
    grep -q 'vm.max_map_count' /etc/sysctl.conf \
        || echo 'vm.max_map_count=262144' >> /etc/sysctl.conf

    log "Phase 1 complete. SSH in as 'deploy' and run: bash deploy.sh phase2"
}

# ==============================================================================
# PHASE 2 — Clone repo + generate secrets
# ==============================================================================
phase2_clone_and_secrets() {
    log "Phase 2: cloning repository..."
    sudo mkdir -p "$APP_DIR"
    sudo chown "$DEPLOY_USER":"$DEPLOY_USER" "$APP_DIR"
    cd "$APP_DIR"

    if [[ -d ".git" ]]; then
        warn "Repo already cloned — pulling latest..."
        git pull origin master
    else
        git clone "$REPO_URL" .
        git checkout master
    fi

    log "Generating secrets..."
    python3 -c "
import secrets, base64
try:
    from cryptography.fernet import Fernet
    fernet_available = True
except ImportError:
    fernet_available = False

print()
print('=== GENERATED SECRETS — copy these into deployment/.env ===')
print()
print('SECRET_KEY=' + secrets.token_urlsafe(50))
print('DB_PASSWORD=' + secrets.token_urlsafe(32))
print('MINIO_ROOT_PASSWORD=' + secrets.token_urlsafe(32))
print('REDIS_PASSWORD=' + secrets.token_urlsafe(32))
print('RABBITMQ_PASSWORD=' + secrets.token_urlsafe(32))
if fernet_available:
    print('FERNET_KEY_PRIMARY=' + Fernet.generate_key().decode())
    print('FERNET_KEY_SECONDARY=' + Fernet.generate_key().decode())
else:
    print()
    print('[!] cryptography not installed — install it then run:')
    print('    python3 -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\"')
    print('    twice, for FERNET_KEY_PRIMARY and FERNET_KEY_SECONDARY')
print()
print('=== END GENERATED SECRETS ===')
"

    log "Copy the values above into deployment/.env"
    log "Template is at: $APP_DIR/deployment/.env.template"
    echo ""
    log "Phase 2 complete. Next steps:"
    echo "  1.  nano $APP_DIR/deployment/.env     # fill in the .env file"
    echo "  2.  bash deploy.sh phase3             # issue TLS cert"
}

# ==============================================================================
# PHASE 3 — TLS certificates via Let's Encrypt
# ==============================================================================
phase3_tls() {
    cd "$APP_DIR"
    [[ -f "deployment/.env" ]] || die "deployment/.env not found — complete phase 2 first"

    log "Phase 3: issuing Let's Encrypt certificate for $DOMAIN ..."

    # Install certbot if missing
    if ! command -v certbot &>/dev/null; then
        sudo apt-get install -y certbot
    fi

    # Nothing should be on port 80 yet
    sudo certbot certonly --standalone \
        -d "$DOMAIN" \
        --email "$ADMIN_EMAIL" \
        --agree-tos --no-eff-email

    log "Wiring certificate into nginx mount path..."
    mkdir -p "$APP_DIR/deployment/certs/nginx"
    sudo ln -sf "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" \
                "$APP_DIR/deployment/certs/nginx/$DOMAIN.crt"
    sudo ln -sf "/etc/letsencrypt/live/$DOMAIN/privkey.pem" \
                "$APP_DIR/deployment/certs/nginx/$DOMAIN.key"
    sudo ln -sf "/etc/letsencrypt/live/$DOMAIN/chain.pem" \
                "$APP_DIR/deployment/certs/nginx/ca-bundle.crt"

    log "Generating DH parameters (takes ~2 minutes)..."
    if [[ ! -f "$APP_DIR/deployment/dhparam.pem" ]]; then
        openssl dhparam -out "$APP_DIR/deployment/dhparam.pem" 2048
    else
        warn "dhparam.pem already exists, skipping"
    fi

    log "Setting up auto-renewal cron..."
    RENEW_CMD="certbot renew --quiet --deploy-hook 'docker exec dfc_nginx nginx -s reload'"
    (sudo crontab -l 2>/dev/null | grep -v certbot; echo "0 3 * * * $RENEW_CMD") \
        | sudo crontab -

    log "Phase 3 complete. Run: bash deploy.sh phase4"
}

# ==============================================================================
# PHASE 4 — Build frontend + bring up the stack
# ==============================================================================
phase4_deploy() {
    cd "$APP_DIR"
    [[ -f "deployment/.env" ]] || die "deployment/.env not found"
    [[ -f "deployment/certs/nginx/$DOMAIN.crt" ]] || die "TLS cert missing — run phase 3 first"

    log "Phase 4: building React frontend..."
    cd "$APP_DIR/frontend"
    if command -v npm &>/dev/null; then
        npm ci --legacy-peer-deps
        VITE_API_BASE_URL="https://$DOMAIN/api/v1" npm run build
        mkdir -p "$APP_DIR/deployment/frontend-dist"
        cp -r dist/. "$APP_DIR/deployment/frontend-dist/"
        log "Frontend built → deployment/frontend-dist/"
    else
        warn "npm not found on this server."
        warn "Build the frontend on your local machine and rsync it:"
        warn "  cd frontend && npm ci && VITE_API_BASE_URL=https://$DOMAIN/api/v1 npm run build"
        warn "  rsync -av dist/ deploy@162.243.32.216:$APP_DIR/deployment/frontend-dist/"
        warn "Then re-run: bash deploy.sh phase4"
        read -rp "Press Enter once you've rsynced the frontend, or Ctrl-C to abort..."
    fi

    cd "$APP_DIR"

    log "Building Docker images..."
    docker compose -f "$COMPOSE_FILE" --env-file deployment/.env build

    log "Starting infrastructure services (postgres, redis, rabbitmq, minio, elasticsearch)..."
    docker compose -f "$COMPOSE_FILE" --env-file deployment/.env up -d \
        postgres redis rabbitmq minio elasticsearch

    log "Waiting 60 s for services to initialise (Elasticsearch is slow)..."
    sleep 60
    docker compose -f "$COMPOSE_FILE" --env-file deployment/.env ps

    log "Starting application tier (django, celery_worker, celery_beat, nginx)..."
    docker compose -f "$COMPOSE_FILE" --env-file deployment/.env up -d \
        django celery_worker celery_beat nginx

    log "Running database migrations..."
    docker exec dfc_django python manage.py migrate --noinput

    log "Collecting static files..."
    docker exec dfc_django python manage.py collectstatic --noinput

    log "Building Elasticsearch search indexes..."
    docker exec dfc_django python manage.py search_index --rebuild || \
        warn "search_index rebuild failed — will retry after Elasticsearch is healthy"

    log "Creating MinIO bucket..."
    docker run --rm --network dfc_network minio/mc \
        alias set dfc http://minio:9000 \
        "$(grep MINIO_ROOT_USER deployment/.env | cut -d= -f2)" \
        "$(grep MINIO_ROOT_PASSWORD deployment/.env | cut -d= -f2)" 2>/dev/null || true
    docker run --rm --network dfc_network minio/mc mb --ignore-existing dfc/dfc-documents 2>/dev/null || true
    docker run --rm --network dfc_network minio/mc anonymous set none dfc/dfc-documents 2>/dev/null || true

    log ""
    log "=== Stack is up! ==="
    log ""
    log "Next: create a Django superuser:"
    log "  docker exec -it dfc_django python manage.py createsuperuser"
    log ""
    log "Smoke test:"
    log "  curl -I https://$DOMAIN/health/"
    log "  curl -I https://$DOMAIN/api/v1/auth/login/"
    log ""
    log "Open https://$DOMAIN in a browser."
}

# ==============================================================================
# UPDATE — Pull latest code and redeploy app tier only
# ==============================================================================
update() {
    cd "$APP_DIR"
    [[ -f "deployment/.env" ]] || die "deployment/.env not found"

    log "Pulling latest code..."
    git fetch && git checkout master && git pull origin master

    log "Rebuilding app images..."
    docker compose -f "$COMPOSE_FILE" --env-file deployment/.env \
        build django celery_worker celery_beat

    log "Running migrations..."
    docker exec dfc_django python manage.py migrate --noinput

    log "Restarting app containers..."
    docker compose -f "$COMPOSE_FILE" --env-file deployment/.env \
        up -d --no-deps django celery_worker celery_beat

    log "Collecting static files..."
    docker exec dfc_django python manage.py collectstatic --noinput

    log "Rebuilding frontend..."
    if command -v npm &>/dev/null; then
        cd "$APP_DIR/frontend"
        npm ci --legacy-peer-deps
        VITE_API_BASE_URL="https://$DOMAIN/api/v1" npm run build
        rsync -av --delete dist/ "$APP_DIR/deployment/frontend-dist/"
    else
        warn "npm not on server — rsync frontend-dist manually then reload nginx:"
        warn "  docker exec dfc_nginx nginx -s reload"
    fi

    docker exec dfc_nginx nginx -s reload
    log "Update complete."
}

# ==============================================================================
# STATUS — Show running containers
# ==============================================================================
status() {
    cd "$APP_DIR"
    docker compose -f "$COMPOSE_FILE" --env-file deployment/.env ps
    echo ""
    log "Quick health check:"
    curl -sf "https://$DOMAIN/health/" && echo " — OK" || echo " — FAILED"
}

# ==============================================================================
# LOGS — Tail all logs (Ctrl-C to stop)
# ==============================================================================
logs() {
    cd "$APP_DIR"
    docker compose -f "$COMPOSE_FILE" --env-file deployment/.env logs -f "$@"
}

# ==============================================================================
# Entry point
# ==============================================================================
COMMAND="${1:-help}"
case "$COMMAND" in
    phase1) phase1_server_setup ;;
    phase2) phase2_clone_and_secrets ;;
    phase3) phase3_tls ;;
    phase4) phase4_deploy ;;
    update) update ;;
    status) status ;;
    logs)   shift; logs "$@" ;;
    *)
        echo ""
        echo "DFC Deployment Script — dfc.dabiko-software.tech"
        echo ""
        echo "Usage: bash deploy.sh <command>"
        echo ""
        echo "Commands:"
        echo "  phase1   — Server hardening, Docker install  (run as root, once)"
        echo "  phase2   — Clone repo, generate secrets      (run as deploy)"
        echo "  phase3   — Issue Let's Encrypt TLS cert      (run as deploy)"
        echo "  phase4   — Build images, start full stack    (run as deploy)"
        echo "  update   — Pull latest code, redeploy        (run as deploy)"
        echo "  status   — Show container status + health check"
        echo "  logs     — Tail all container logs"
        echo ""
        ;;
esac
