# Department-as-Root Architecture Migration Runbook

## Overview

This runbook provides step-by-step instructions for migrating the DFC application to the Department-as-Root architecture. This migration establishes departments as the primary RBAC boundary and root container for folders.

## Pre-Migration Checklist

### Environment Requirements
- [ ] PostgreSQL database backup completed
- [ ] MinIO/S3 storage backup completed
- [ ] Application in maintenance mode
- [ ] All users logged out
- [ ] Celery workers stopped
- [ ] Redis cache cleared

### Verification Steps
1. Verify current migration state:
   ```bash
   python manage.py showmigrations users
   python manage.py showmigrations folders
   python manage.py showmigrations permissions
   ```

2. Check database connections:
   ```bash
   python manage.py dbshell
   \dt  # List all tables
   ```

3. Record current statistics:
   ```sql
   SELECT COUNT(*) as total_departments FROM departments;
   SELECT COUNT(*) as total_folders FROM folders;
   SELECT COUNT(*) as total_documents FROM documents;
   SELECT COUNT(*) as total_users FROM users;
   ```

## Migration Steps

### Step 1: Create Database Backup

```bash
# PostgreSQL backup
pg_dump -h localhost -U dfc_user -d dfc_database > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -la backup_*.sql
```

### Step 2: Apply Schema Migrations

```bash
# Apply Phase 1 schema migrations
python manage.py migrate users 0015_department_as_root_fields
python manage.py migrate users 0016_department_settings_and_cross_access
python manage.py migrate users 0017_alter_department_options_and_more
```

### Step 3: Run Data Migration

```bash
# Apply data migration (creates settings, assigns folders, updates paths)
python manage.py migrate users 0018_department_as_root_data_migration
```

Expected output:
```
============================================================
Department-as-Root Data Migration
============================================================

Step 1: Creating department settings...
✓ Created DepartmentSettings for X departments

Step 2: Assigning folders to departments...
✓ Assigned departments to X folders

Step 3: Updating folder paths with department prefix...
✓ Updated paths for X folders with department prefix

Step 4: Creating default roles...
✓ Created X default roles

Step 5: Calculating department storage usage...
✓ Updated storage calculations for X departments

Step 6: Running data integrity checks...
✓ All data integrity checks passed

📊 Migration Statistics:
  Total Departments: X
  Active Departments: X
  Total Folders: X
  Total Documents: X
  Departments with Settings: X

============================================================
Migration Complete!
============================================================
```

### Step 4: Verify Data Integrity

Run verification queries:

```sql
-- Check for folders without departments
SELECT COUNT(*) FROM folders WHERE department_id IS NULL;
-- Expected: 0

-- Check for departments without settings
SELECT d.id, d.name
FROM departments d
LEFT JOIN department_settings ds ON d.id = ds.department_id
WHERE ds.department_id IS NULL;
-- Expected: Empty result

-- Verify folder paths have department prefix
SELECT COUNT(*) FROM folders
WHERE path NOT LIKE '/%/' OR path IS NULL;
-- Expected: 0

-- Check active users without departments
SELECT COUNT(*) FROM users
WHERE department_id IS NULL AND is_active = true;
-- Expected: 0
```

### Step 5: Run Integration Tests

```bash
# Run all department-related tests
python manage.py test apps.users.tests.test_department_api -v 2
python manage.py test apps.users.tests.test_data_migration -v 2
python manage.py test apps.permissions.tests.test_department_resolver -v 2
python manage.py test apps.users.tests.test_migration_performance -v 2
```

All tests should pass.

### Step 6: Restart Services

```bash
# Start Celery workers
celery -A config worker --loglevel=info &

# Start Celery beat (scheduler)
celery -A config beat --loglevel=info &

# Restart application
systemctl restart gunicorn  # or your application service
```

### Step 7: Post-Migration Verification

1. **Test API endpoints:**
   ```bash
   # Test department list
   curl -X GET http://localhost:8000/api/v1/dept/departments/ \
     -H "Authorization: Bearer <token>"

   # Test navigation
   curl -X GET http://localhost:8000/api/v1/dept/departments/navigation/ \
     -H "Authorization: Bearer <token>"
   ```

2. **Verify user access:**
   - Log in as a regular user
   - Verify they can see their department's folders
   - Verify they cannot see other departments' folders

3. **Test cross-department access:**
   - Create a cross-department access grant
   - Verify user can access the granted department

## Rollback Procedure

If issues are encountered, rollback using these steps:

### Step 1: Stop Application

```bash
systemctl stop gunicorn
pkill -f celery
```

### Step 2: Restore Database

```bash
# Drop and recreate database
psql -h localhost -U postgres -c "DROP DATABASE dfc_database;"
psql -h localhost -U postgres -c "CREATE DATABASE dfc_database OWNER dfc_user;"

# Restore backup
psql -h localhost -U dfc_user -d dfc_database < backup_YYYYMMDD_HHMMSS.sql
```

### Step 3: Reverse Migrations (Alternative)

If you prefer to reverse migrations instead of restoring backup:

```bash
# Reverse the data migration
python manage.py migrate users 0017_alter_department_options_and_more --fake

# Note: This will not undo all data changes, use database restore for complete rollback
```

### Step 4: Restart Services

```bash
systemctl start gunicorn
celery -A config worker --loglevel=info &
```

## Troubleshooting

### Issue: Folders without department assignment

**Symptom:** Migration reports folders without departments

**Solution:**
```python
# In Django shell
from apps.folders.models import Folder
from apps.users.models import Department

# Get default department
default_dept = Department.objects.first()

# Assign orphaned folders
Folder.objects.filter(department__isnull=True).update(department=default_dept)
```

### Issue: Migration fails with IntegrityError

**Symptom:** Unique constraint violation

**Solution:**
1. Check for duplicate department codes
2. Check for duplicate folder names in same parent

```sql
-- Find duplicate department codes
SELECT code, COUNT(*)
FROM departments
GROUP BY code
HAVING COUNT(*) > 1;

-- Find duplicate folder names
SELECT parent_id, name, department_id, COUNT(*)
FROM folders
GROUP BY parent_id, name, department_id
HAVING COUNT(*) > 1;
```

### Issue: Slow migration performance

**Symptom:** Migration takes longer than expected

**Solution:**
1. Run migration during low-traffic periods
2. Consider batching large datasets:

```python
# Process in batches
from django.db import transaction

BATCH_SIZE = 1000
folders = Folder.objects.filter(department__isnull=True)

for i in range(0, folders.count(), BATCH_SIZE):
    batch = folders[i:i+BATCH_SIZE]
    with transaction.atomic():
        for folder in batch:
            folder.department = folder.owner.department
            folder.save(update_fields=['department'])
```

### Issue: Permission errors after migration

**Symptom:** Users cannot access folders they should have access to

**Solution:**
1. Clear permission cache:
```python
from apps.permissions.models import PermissionCache
PermissionCache.objects.all().delete()
```

2. Verify cross-department access grants are active:
```sql
SELECT * FROM cross_department_access WHERE is_active = true;
```

## Performance Benchmarks

Expected performance after migration:

| Operation | Target Time | Max Queries |
|-----------|-------------|-------------|
| List departments | < 100ms | 2 |
| Get accessible folders | < 200ms | 3 |
| Permission check | < 50ms | 2 |
| Folder tree (100 folders) | < 500ms | 2 |

## Support Contact

For migration issues, contact:
- Technical Lead: [Contact Info]
- Database Admin: [Contact Info]
- On-call Engineer: [Contact Info]

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-03 | Claude | Initial runbook |
