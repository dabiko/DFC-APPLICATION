#!/bin/bash
# ==============================================================================
# Certificate Renewal Script for Let's Encrypt
# ==============================================================================
# This script renews SSL certificates and reloads services
# Should be run via cron: 0 3 * * * /path/to/renew-certificates.sh

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/var/log/dfc/cert-renewal.log"
EMAIL_ADMIN="admin@cccplc.com"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR] $1${NC}" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}" | tee -a "$LOG_FILE"
}

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

log "=========================================="
log "Starting SSL Certificate Renewal"
log "=========================================="

# Change to project directory
cd "$PROJECT_ROOT"

# Check if certificates are due for renewal (within 30 days)
log "Checking certificate expiration..."

# Run certbot renew (dry-run first to test)
log "Running certbot dry-run..."
if docker-compose -f certbot/docker-compose.certbot.yml run --rm certbot renew --dry-run; then
    log_success "Dry-run successful"
else
    log_error "Dry-run failed - aborting renewal"
    exit 1
fi

# Actual renewal
log "Running certificate renewal..."
if docker-compose -f certbot/docker-compose.certbot.yml run --rm certbot renew; then
    log_success "Certificate renewal completed"

    # Copy certificates to nginx directory
    log "Copying certificates to nginx..."
    docker cp dfc_certbot:/etc/letsencrypt/live/dfc.cccplc.com/fullchain.pem ./certs/nginx/dfc.cccplc.com.crt
    docker cp dfc_certbot:/etc/letsencrypt/live/dfc.cccplc.com/privkey.pem ./certs/nginx/dfc.cccplc.com.key

    # Set correct permissions
    chmod 644 ./certs/nginx/dfc.cccplc.com.crt
    chmod 600 ./certs/nginx/dfc.cccplc.com.key

    # Reload nginx to use new certificates
    log "Reloading nginx..."
    docker exec dfc_nginx nginx -s reload

    log_success "Nginx reloaded with new certificates"

    # Send success notification email
    echo "SSL certificates for DFC have been renewed successfully." | \
        mail -s "DFC SSL Certificate Renewal - Success" "$EMAIL_ADMIN"

else
    log_error "Certificate renewal failed"

    # Send failure notification email
    echo "SSL certificate renewal for DFC failed. Please check the logs at $LOG_FILE" | \
        mail -s "DFC SSL Certificate Renewal - FAILED" "$EMAIL_ADMIN"

    exit 1
fi

# Check certificate validity
log "Verifying certificate validity..."
EXPIRY_DATE=$(openssl x509 -enddate -noout -in ./certs/nginx/dfc.cccplc.com.crt | cut -d= -f2)
log "Certificate expires on: $EXPIRY_DATE"

# Calculate days until expiration
EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))

log "Days until expiration: $DAYS_UNTIL_EXPIRY"

if [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
    log_warning "Certificate expires in less than 30 days!"
elif [ $DAYS_UNTIL_EXPIRY -lt 7 ]; then
    log_error "URGENT: Certificate expires in less than 7 days!"
    echo "URGENT: SSL certificate for DFC expires in $DAYS_UNTIL_EXPIRY days!" | \
        mail -s "DFC SSL Certificate - URGENT EXPIRATION WARNING" "$EMAIL_ADMIN"
else
    log_success "Certificate is valid for $DAYS_UNTIL_EXPIRY more days"
fi

log "=========================================="
log "Certificate Renewal Completed Successfully"
log "=========================================="

exit 0
