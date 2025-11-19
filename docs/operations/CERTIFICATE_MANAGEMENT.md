# SSL/TLS Certificate Management Guide

## Overview

This document provides comprehensive procedures for managing SSL/TLS certificates for the Digital Filing Cabinet (DFC) application, including initial setup, renewal, and emergency procedures.

## Table of Contents

- [Certificate Architecture](#certificate-architecture)
- [Initial Certificate Setup](#initial-certificate-setup)
- [Automated Renewal](#automated-renewal)
- [Manual Renewal](#manual-renewal)
- [Certificate Verification](#certificate-verification)
- [Troubleshooting](#troubleshooting)
- [Emergency Procedures](#emergency-procedures)
- [Certificate Expiration Monitoring](#certificate-expiration-monitoring)

---

## Certificate Architecture

### Domains Covered

The DFC system uses SSL/TLS certificates for the following domains:

- `dfc.cccplc.com` - Main application
- `api.dfc.cccplc.com` - API endpoints
- `minio.dfc.cccplc.com` - MinIO object storage console

### Certificate Authority

- **Production**: Let's Encrypt (free, automated, trusted)
- **Staging/Development**: Self-signed certificates or Let's Encrypt staging

### Certificate Type

- **Multi-domain (SAN) certificate** covering all DFC subdomains
- **Validity**: 90 days (Let's Encrypt standard)
- **Renewal**: Automated 30 days before expiration

---

## Initial Certificate Setup

### Prerequisites

1. **DNS Configuration**: Ensure all domains point to the server's public IP
   ```bash
   # Verify DNS resolution
   dig dfc.cccplc.com
   dig api.dfc.cccplc.com
   dig minio.dfc.cccplc.com
   ```

2. **Ports Open**: Ensure ports 80 and 443 are accessible
   ```bash
   # Test port accessibility
   nc -zv your-server-ip 80
   nc -zv your-server-ip 443
   ```

3. **Email for Notifications**: Valid admin email for Let's Encrypt notifications

### Initial Certificate Obtainment

#### Step 1: Start Certbot Service

```bash
cd /path/to/dfc/deployment/certbot

# Start nginx for ACME challenge
docker-compose -f docker-compose.certbot.yml up -d nginx_certbot

# Obtain certificate (interactive)
docker-compose -f docker-compose.certbot.yml run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email admin@cccplc.com \
  --agree-tos \
  --no-eff-email \
  -d dfc.cccplc.com \
  -d api.dfc.cccplc.com \
  -d minio.dfc.cccplc.com
```

#### Step 2: Copy Certificates to Nginx

```bash
# Create certificate directory
mkdir -p /path/to/dfc/deployment/certs/nginx

# Copy certificates from certbot container
docker cp dfc_certbot:/etc/letsencrypt/live/dfc.cccplc.com/fullchain.pem \
  ./certs/nginx/dfc.cccplc.com.crt

docker cp dfc_certbot:/etc/letsencrypt/live/dfc.cccplc.com/privkey.pem \
  ./certs/nginx/dfc.cccplc.com.key

# Set correct permissions
chmod 644 ./certs/nginx/dfc.cccplc.com.crt
chmod 600 ./certs/nginx/dfc.cccplc.com.key
```

#### Step 3: Generate Diffie-Hellman Parameters

```bash
# Generate strong DH parameters (takes 5-10 minutes)
openssl dhparam -out /path/to/dfc/deployment/dhparam.pem 4096
```

#### Step 4: Start Production Services

```bash
cd /path/to/dfc/deployment

# Start all services with SSL enabled
docker-compose -f docker-compose.production.yml up -d
```

#### Step 5: Verify HTTPS

```bash
# Test HTTPS connectivity
curl -I https://dfc.cccplc.com

# Check certificate details
openssl s_client -connect dfc.cccplc.com:443 -servername dfc.cccplc.com < /dev/null
```

---

## Automated Renewal

### Setup Automated Renewal

The system includes automated certificate renewal via cron jobs.

#### Install Cron Jobs

```bash
cd /path/to/dfc/deployment/scripts

# Make scripts executable
chmod +x renew-certificates.sh
chmod +x check-certificate-expiry.sh
chmod +x setup-certbot-cron.sh

# Setup cron jobs
./setup-certbot-cron.sh
```

#### Scheduled Tasks

- **Certificate Renewal**: Daily at 3:00 AM
  - Checks if certificates expire within 30 days
  - Renews if necessary
  - Reloads nginx
  - Sends email notification

- **Expiry Check**: Daily at 9:00 AM
  - Checks days until expiration
  - Sends alerts if < 30 days
  - Sends critical alerts if < 7 days

#### Verify Cron Jobs

```bash
# List installed cron jobs
crontab -l

# Check renewal logs
tail -f /var/log/dfc/cert-renewal.log

# Check cron logs
tail -f /var/log/dfc/cron.log
```

### Renewal Process

The automated renewal process:

1. **Dry Run**: Tests renewal without making changes
2. **Actual Renewal**: Requests new certificate from Let's Encrypt
3. **Certificate Copy**: Copies new certificates to nginx directory
4. **Permission Set**: Sets correct file permissions
5. **Nginx Reload**: Gracefully reloads nginx (no downtime)
6. **Verification**: Checks new certificate validity
7. **Notification**: Sends email to administrators

---

## Manual Renewal

### When to Manually Renew

- Automated renewal failed
- Adding new domains
- Certificate compromised
- Testing renewal process

### Manual Renewal Procedure

#### Step 1: Run Renewal Script Manually

```bash
cd /path/to/dfc/deployment/scripts

# Run with logging
./renew-certificates.sh
```

#### Step 2: If Script Fails, Use Certbot Directly

```bash
cd /path/to/dfc/deployment/certbot

# Stop nginx temporarily
docker stop dfc_nginx

# Start certbot nginx
docker-compose -f docker-compose.certbot.yml up -d nginx_certbot

# Renew certificate
docker-compose -f docker-compose.certbot.yml run --rm certbot renew --force-renewal

# Copy certificates
docker cp dfc_certbot:/etc/letsencrypt/live/dfc.cccplc.com/fullchain.pem \
  ../certs/nginx/dfc.cccplc.com.crt

docker cp dfc_certbot:/etc/letsencrypt/live/dfc.cccplc.com/privkey.pem \
  ../certs/nginx/dfc.cccplc.com.key

# Set permissions
chmod 644 ../certs/nginx/dfc.cccplc.com.crt
chmod 600 ../certs/nginx/dfc.cccplc.com.key

# Stop certbot nginx
docker-compose -f docker-compose.certbot.yml down

# Start production nginx
docker start dfc_nginx
```

---

## Certificate Verification

### Verify Certificate Validity

```bash
# Check expiration date
openssl x509 -enddate -noout -in /path/to/cert.crt

# View full certificate details
openssl x509 -text -noout -in /path/to/cert.crt

# Check certificate chain
openssl verify -CAfile /path/to/ca-bundle.crt /path/to/cert.crt
```

### Test SSL/TLS Configuration

```bash
# Test SSL connection
openssl s_client -connect dfc.cccplc.com:443 -servername dfc.cccplc.com

# Check supported protocols
nmap --script ssl-enum-ciphers -p 443 dfc.cccplc.com

# Test using SSL Labs (online)
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=dfc.cccplc.com
```

### Check Certificate in Browser

1. Open https://dfc.cccplc.com in browser
2. Click lock icon in address bar
3. Click "Certificate" or "Connection is secure"
4. Verify:
   - Issued to: dfc.cccplc.com
   - Issued by: Let's Encrypt
   - Valid from/to dates
   - SAN includes all domains

---

## Troubleshooting

### Common Issues

#### Issue: Certificate Renewal Fails

**Symptoms**:
- Email notification of renewal failure
- Error in `/var/log/dfc/cert-renewal.log`

**Solutions**:

1. **Check DNS**:
   ```bash
   dig dfc.cccplc.com
   # Ensure it points to correct IP
   ```

2. **Check Port 80 Accessibility**:
   ```bash
   nc -zv your-server-ip 80
   # Must be accessible for HTTP-01 challenge
   ```

3. **Check Certbot Logs**:
   ```bash
   docker logs dfc_certbot
   ```

4. **Rate Limit Exceeded**:
   - Let's Encrypt has rate limits (50 certificates per domain per week)
   - Wait or use staging environment for testing

#### Issue: Nginx Fails to Reload

**Symptoms**:
- Certificate renewed but nginx not using it
- Old certificate still active

**Solutions**:

1. **Test Nginx Configuration**:
   ```bash
   docker exec dfc_nginx nginx -t
   ```

2. **Restart Nginx** (if reload failed):
   ```bash
   docker restart dfc_nginx
   ```

3. **Check Certificate Paths**:
   ```bash
   # Verify certificates exist and are readable
   ls -la /path/to/certs/nginx/
   ```

#### Issue: Certificate Expired

**Symptoms**:
- Browser shows "Your connection is not private"
- Certificate expiration error

**Emergency Procedure**:

1. **Immediate Renewal**:
   ```bash
   cd /path/to/dfc/deployment/scripts
   ./renew-certificates.sh
   ```

2. **If Renewal Fails, Use Staging Certificate**:
   ```bash
   # Temporarily use self-signed certificate
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
     -keyout temp.key -out temp.crt \
     -subj "/CN=dfc.cccplc.com"

   # Copy to nginx
   cp temp.crt /path/to/certs/nginx/dfc.cccplc.com.crt
   cp temp.key /path/to/certs/nginx/dfc.cccplc.com.key

   # Reload nginx
   docker exec dfc_nginx nginx -s reload
   ```

3. **Notify Users**:
   - Send communication about temporary certificate
   - Provide ETA for proper certificate

---

## Emergency Procedures

### Certificate Compromised

If a private key is compromised:

1. **Immediate Revocation**:
   ```bash
   docker-compose -f certbot/docker-compose.certbot.yml run --rm certbot revoke \
     --cert-path /etc/letsencrypt/live/dfc.cccplc.com/cert.pem \
     --reason keycompromise
   ```

2. **Request New Certificate**:
   ```bash
   docker-compose -f certbot/docker-compose.certbot.yml run --rm certbot certonly \
     --webroot \
     --webroot-path=/var/www/certbot \
     --email admin@cccplc.com \
     --agree-tos \
     --force-renewal \
     -d dfc.cccplc.com \
     -d api.dfc.cccplc.com \
     -d minio.dfc.cccplc.com
   ```

3. **Update All Services**:
   - Copy new certificates
   - Reload/restart all services
   - Verify new certificate in use

4. **Investigate Breach**:
   - Review access logs
   - Check for unauthorized access
   - Update security procedures

### Adding New Domain

To add a new domain to the certificate:

1. **Update DNS**: Point new domain to server

2. **Request New Certificate**:
   ```bash
   docker-compose -f certbot/docker-compose.certbot.yml run --rm certbot certonly \
     --webroot \
     --webroot-path=/var/www/certbot \
     --email admin@cccplc.com \
     --agree-tos \
     --expand \
     -d dfc.cccplc.com \
     -d api.dfc.cccplc.com \
     -d minio.dfc.cccplc.com \
     -d newdomain.dfc.cccplc.com
   ```

3. **Copy and Reload**:
   ```bash
   ./scripts/renew-certificates.sh
   ```

---

## Certificate Expiration Monitoring

### Monitoring Tools

1. **Cron Job**: Daily check at 9 AM (automated)

2. **Manual Check**:
   ```bash
   ./scripts/check-certificate-expiry.sh
   ```

3. **External Monitoring**:
   - SSL Labs Monitor: https://www.ssllabs.com/ssltest/
   - Uptime Robot: https://uptimerobot.com/
   - StatusCake: https://www.statuscake.com/

### Alert Thresholds

- **30 days**: Warning email sent
- **7 days**: Critical email sent
- **0 days (expired)**: Critical email + immediate notification

### Notification Recipients

Configure in scripts:
```bash
EMAIL_ADMIN="admin@cccplc.com"
```

---

## Best Practices

1. **Never Commit Private Keys**: Keep `.key` files out of version control
2. **Use Strong DH Parameters**: 4096-bit recommended
3. **Enable HSTS**: Force HTTPS with preload
4. **Monitor Expiration**: Multiple monitoring methods
5. **Test Renewals**: Periodic dry-run tests
6. **Document Changes**: Keep this guide updated
7. **Backup Certificates**: Store encrypted backups securely
8. **Use SAN Certificates**: Cover all subdomains
9. **Keep Let's Encrypt Updated**: Use latest certbot version
10. **Review Logs Regularly**: Check renewal and expiry logs

---

## Contact & Support

- **Let's Encrypt Documentation**: https://letsencrypt.org/docs/
- **Certbot Documentation**: https://certbot.eff.org/docs/
- **DFC Admin**: admin@cccplc.com
- **Emergency Contact**: [Your emergency contact]

---

**Last Updated**: 2025-11-19
**Version**: 1.0
**Author**: DFC DevOps Team
