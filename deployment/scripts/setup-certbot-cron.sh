#!/bin/bash
# ==============================================================================
# Setup Cron Jobs for Certificate Management
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Setting up cron jobs for certificate management..."

# Make scripts executable
chmod +x "$SCRIPT_DIR/renew-certificates.sh"
chmod +x "$SCRIPT_DIR/check-certificate-expiry.sh"

# Add cron jobs
(crontab -l 2>/dev/null || echo "") | \
    grep -v "renew-certificates.sh" | \
    grep -v "check-certificate-expiry.sh" | \
    cat - <(echo "") \
        <(echo "# DFC Certificate Renewal (Daily at 3 AM)") \
        <(echo "0 3 * * * $SCRIPT_DIR/renew-certificates.sh >> /var/log/dfc/cron.log 2>&1") \
        <(echo "") \
        <(echo "# DFC Certificate Expiry Check (Daily at 9 AM)") \
        <(echo "0 9 * * * $SCRIPT_DIR/check-certificate-expiry.sh >> /var/log/dfc/cron.log 2>&1") | \
    crontab -

echo "Cron jobs installed successfully!"
echo ""
echo "Scheduled tasks:"
echo "  - Certificate renewal: Daily at 3:00 AM"
echo "  - Expiry check: Daily at 9:00 AM"
echo ""
echo "Logs will be written to: /var/log/dfc/cert-renewal.log and /var/log/dfc/cron.log"

crontab -l
