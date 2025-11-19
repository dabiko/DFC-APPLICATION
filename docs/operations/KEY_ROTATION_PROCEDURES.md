# Encryption Key Rotation Procedures

## Overview

This document provides step-by-step procedures for rotating encryption keys used for field-level encryption in the Digital Filing Cabinet (DFC) system.

## When to Rotate Keys

Rotate encryption keys in the following scenarios:

1. **Scheduled Rotation**: Every 90-180 days (recommended)
2. **Security Breach**: If key compromise is suspected
3. **Compliance Requirement**: As mandated by security policies
4. **Personnel Changes**: When key-holding staff leave the organization
5. **Algorithm Upgrade**: When upgrading encryption algorithms

## Key Rotation Overview

The key rotation process:

1. Generate new encryption key
2. Backup current keys
3. Re-encrypt all existing data with new key
4. Update Vault with new key configuration
5. Deploy new key to application servers
6. Keep old key for decryption (grace period)
7. Remove old key after grace period

## Preparation

### Prerequisites

- [ ] **Backup**: Full database backup completed
- [ ] **Access**: Access to Vault and production servers
- [ ] **Notification**: Stakeholders informed of maintenance window
- [ ] **Monitoring**: Monitoring systems active
- [ ] **Rollback Plan**: Tested and ready

### Timing

- **Recommended Time**: During low-traffic period (e.g., 2-4 AM)
- **Estimated Duration**: 30 minutes - 2 hours (depends on data volume)
- **Maintenance Window**: Plan for 4 hours

## Step-by-Step Rotation Procedure

### Step 1: Pre-Rotation Checks

```bash
# 1. Verify current encryption status
python manage.py verify_encryption --verbose

# 2. Backup database
pg_dump -U dfc_user -h localhost dfc_prod > /backups/dfc_pre_rotation_$(date +%Y%m%d).sql

# 3. Check disk space (need ~2x current database size)
df -h

# 4. Verify Vault connectivity
curl -H "X-Vault-Token: $VAULT_TOKEN" $VAULT_ADDR/v1/sys/health
```

### Step 2: Test Rotation (Dry Run)

```bash
# Run dry-run to simulate rotation
python manage.py rotate_encryption_keys --dry-run --batch-size=100

# Review output for any errors
```

### Step 3: Notify Systems

```bash
# Put application in maintenance mode (optional)
# This prevents new data writes during rotation

# Send notification
echo "Key rotation starting" | mail -s "DFC Maintenance" ops@cccplc.com
```

### Step 4: Execute Key Rotation

```bash
# Run actual rotation
python manage.py rotate_encryption_keys \
  --batch-size=100 \
  --backup-path=/var/backups/dfc/encryption-keys

# Monitor progress
# This will:
# - Backup current keys
# - Generate new key
# - Re-encrypt all documents
# - Update Vault
```

**Expected Output**:
```
====================================================================================
ENCRYPTION KEY ROTATION
====================================================================================

Step 1: Backing up current encryption keys...
✓ Keys backed up to: /var/backups/dfc/encryption-keys

Step 2: Generating new encryption key...
✓ New key generated

Step 3: Analyzing encrypted data...
✓ Found 15420 documents with encrypted fields
  - With customer_id: 8230
  - With account_number: 7891
  - With tax_id: 6543
  - With notes: 12100

This operation will re-encrypt all encrypted data.
Continue? [y/N]: y

Step 4: Re-encrypting data...
  Progress: 15420/15420 (100.0%)
✓ Re-encrypted 15420 documents

Step 5: Updating Vault with new keys...
✓ Vault updated

====================================================================================
KEY ROTATION COMPLETE
====================================================================================
```

### Step 5: Update Environment Variables

```bash
# Get new keys from rotation output
NEW_PRIMARY_KEY="<new-key-from-output>"
OLD_PRIMARY_KEY="<old-key-from-output>"

# Update .env or environment
export FERNET_KEY_PRIMARY="$NEW_PRIMARY_KEY"
export FERNET_KEY_SECONDARY="$OLD_PRIMARY_KEY"

# Or update in deployment configuration
vim /path/to/deployment/.env.production
```

### Step 6: Deploy New Keys

```bash
# Restart application servers with new environment
docker-compose -f docker-compose.production.yml restart django celery_worker

# Or for Kubernetes
kubectl rollout restart deployment/dfc-django
kubectl rollout restart deployment/dfc-celery

# Wait for services to be ready
docker-compose ps
```

### Step 7: Verify Rotation

```bash
# 1. Verify encryption with new keys
python manage.py verify_encryption

# 2. Test decryption of sample data
python manage.py shell
>>> from apps.documents.models import Document
>>> doc = Document.objects.filter(customer_id__isnull=False).first()
>>> print(doc.customer_id)  # Should decrypt successfully

# 3. Check application logs
tail -f /var/log/dfc/django.log | grep -i "decrypt\|encrypt"

# 4. Test API endpoints
curl -H "Authorization: Bearer $TOKEN" https://dfc.cccplc.com/api/v1/documents/

# 5. Monitor error rates
# Check Sentry/monitoring for any decryption errors
```

### Step 8: Monitoring Period (7 Days)

Keep **both** keys active for 7 days:

- **FERNET_KEY_PRIMARY**: New key (for encryption)
- **FERNET_KEY_SECONDARY**: Old key (for decryption fallback)

Monitor for:
- Decryption errors
- Application errors
- Performance issues
- User reports

### Step 9: Remove Old Key (After 7 Days)

```bash
# After grace period with no issues
# Remove old key from environment
unset FERNET_KEY_SECONDARY

# Update .env
vim /path/to/deployment/.env.production
# Remove FERNET_KEY_SECONDARY line

# Update Vault
python manage.py shell
>>> from apps.core.vault_client import get_vault_client
>>> vault = get_vault_client()
>>> vault.set_secret('dfc/encryption', {
...     'fernet_key_primary': '<new-key>',
...     'fernet_key_secondary': None
... })

# Restart services
docker-compose restart django celery_worker
```

### Step 10: Cleanup

```bash
# Remove old key backups after 90 days
# Keep encrypted backups in secure storage

# Document rotation in change log
echo "$(date): Encryption key rotation completed" >> /var/log/dfc/key-rotation.log

# Send completion notification
echo "Key rotation completed successfully" | mail -s "DFC Key Rotation Complete" ops@cccplc.com
```

## Rollback Procedure

If rotation fails or causes issues:

### Immediate Rollback

```bash
# 1. Stop rotation if still running
# Ctrl+C or kill process

# 2. Restore database from backup
psql -U dfc_user -h localhost dfc_prod < /backups/dfc_pre_rotation_YYYYMMDD.sql

# 3. Restore old keys from backup
cp /var/backups/dfc/encryption-keys/keys_backup_*.json ./keys_backup.json

# 4. Extract old keys
python -c "import json; data = json.load(open('keys_backup.json')); print(f'PRIMARY={data[\"primary\"]}\nSECONDARY={data[\"secondary\"]}')"

# 5. Update environment with old keys
export FERNET_KEY_PRIMARY="<old-primary>"
export FERNET_KEY_SECONDARY="<old-secondary>"

# 6. Restart services
docker-compose restart django celery_worker

# 7. Verify
python manage.py verify_encryption
```

## Troubleshooting

### Issue: Rotation Hangs

**Cause**: Large dataset, slow database

**Solution**:
- Reduce batch size: `--batch-size=50`
- Check database performance
- Increase timeout settings

### Issue: Decryption Failures After Rotation

**Cause**: Old key not set as secondary

**Solution**:
```bash
# Ensure FERNET_KEY_SECONDARY is set to old key
export FERNET_KEY_SECONDARY="<old-key>"
# Restart services
```

### Issue: Out of Disk Space

**Cause**: Insufficient space for re-encryption

**Solution**:
- Free up disk space
- Use external backup location
- Temporarily disable transaction logs

### Issue: Vault Update Fails

**Cause**: Vault connectivity or permissions

**Solution**:
- Verify Vault token: `curl -H "X-Vault-Token: $VAULT_TOKEN" $VAULT_ADDR/v1/sys/health`
- Check Vault permissions
- Manual update if necessary

## Best Practices

1. **Always Test First**: Use `--dry-run` flag
2. **Backup Everything**: Database + current keys
3. **Communicate**: Inform all stakeholders
4. **Monitor Closely**: Watch logs during and after
5. **Grace Period**: Keep old key active for 7 days
6. **Document**: Record all rotation activities
7. **Verify**: Test decryption after rotation
8. **Schedule**: Rotate during low-traffic periods
9. **Automate**: Use scripts, avoid manual steps
10. **Audit**: Review and approve rotation procedures

## Automated Rotation (Future)

For future implementation:

```python
# Celery periodic task for automatic rotation
@periodic_task(run_every=timedelta(days=90))
def auto_rotate_keys():
    # Check if rotation needed
    # Run rotation with notification
    # Send report to admins
    pass
```

## Security Considerations

- **Key Storage**: Never store keys in code or logs
- **Access Control**: Limit who can rotate keys
- **Audit Trail**: Log all rotation activities
- **Secure Backup**: Encrypt key backups
- **Secure Delete**: Securely wipe old keys after grace period
- **Multi-Person Process**: Require two-person integrity for production

## Compliance Notes

- **PCI DSS**: Keys rotated every 90-365 days
- **GDPR**: Document key management procedures
- **SOC 2**: Maintain audit trail of rotations
- **HIPAA**: Encrypt backups of encryption keys

---

**Last Updated**: 2025-11-19
**Version**: 1.0
**Next Review**: 2026-02-19
