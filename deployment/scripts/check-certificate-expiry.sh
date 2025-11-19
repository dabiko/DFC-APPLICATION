#!/bin/bash
# ==============================================================================
# Certificate Expiration Check Script
# ==============================================================================
# This script checks SSL certificate expiration and sends alerts
# Should be run via cron: 0 9 * * * /path/to/check-certificate-expiry.sh

set -e

# Configuration
CERT_PATH="/etc/nginx/ssl/dfc.cccplc.com.crt"
WARNING_DAYS=30
CRITICAL_DAYS=7
EMAIL_ADMIN="admin@cccplc.com"

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "=========================================="
echo "SSL Certificate Expiration Check"
echo "=========================================="

# Check if certificate exists
if [ ! -f "$CERT_PATH" ]; then
    echo -e "${RED}ERROR: Certificate not found at $CERT_PATH${NC}"
    exit 1
fi

# Get certificate expiration date
EXPIRY_DATE=$(openssl x509 -enddate -noout -in "$CERT_PATH" | cut -d= -f2)
echo "Certificate expires on: $EXPIRY_DATE"

# Calculate days until expiration
EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))

echo "Days until expiration: $DAYS_UNTIL_EXPIRY"

# Check and alert
if [ $DAYS_UNTIL_EXPIRY -lt 0 ]; then
    echo -e "${RED}CRITICAL: Certificate has EXPIRED!${NC}"
    echo "CRITICAL: SSL certificate for DFC has EXPIRED!" | \
        mail -s "DFC SSL Certificate - EXPIRED" "$EMAIL_ADMIN"
    exit 2
elif [ $DAYS_UNTIL_EXPIRY -lt $CRITICAL_DAYS ]; then
    echo -e "${RED}CRITICAL: Certificate expires in $DAYS_UNTIL_EXPIRY days!${NC}"
    echo "CRITICAL: SSL certificate for DFC expires in $DAYS_UNTIL_EXPIRY days!" | \
        mail -s "DFC SSL Certificate - CRITICAL WARNING" "$EMAIL_ADMIN"
    exit 1
elif [ $DAYS_UNTIL_EXPIRY -lt $WARNING_DAYS ]; then
    echo -e "${YELLOW}WARNING: Certificate expires in $DAYS_UNTIL_EXPIRY days${NC}"
    echo "WARNING: SSL certificate for DFC expires in $DAYS_UNTIL_EXPIRY days. Please renew soon." | \
        mail -s "DFC SSL Certificate - Warning" "$EMAIL_ADMIN"
else
    echo -e "${GREEN}OK: Certificate is valid for $DAYS_UNTIL_EXPIRY more days${NC}"
fi

# Display certificate details
echo ""
echo "Certificate Details:"
openssl x509 -in "$CERT_PATH" -noout -subject -issuer -dates

echo "=========================================="
exit 0
