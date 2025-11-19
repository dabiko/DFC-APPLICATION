# Retention Policies & Legal Hold Procedures

## Table of Contents
1. [Overview](#overview)
2. [Retention Policies](#retention-policies)
3. [Legal Holds](#legal-holds)
4. [Automated Enforcement](#automated-enforcement)
5. [Management Commands](#management-commands)
6. [API Endpoints](#api-endpoints)
7. [Admin Interface](#admin-interface)
8. [Best Practices](#best-practices)

## Overview

The DFC retention system automates document lifecycle management while ensuring compliance with legal requirements. It provides:

- **Retention Policies**: Automated deletion based on document age and type
- **Legal Holds**: Prevent deletion during legal proceedings
- **Grace Periods**: Configurable waiting periods before deletion
- **Notifications**: Email alerts before document deletion
- **Audit Trail**: Complete logging of all retention actions

### Key Components

- **RetentionPolicy**: Defines retention rules
- **LegalHold**: Places documents on litigation hold
- **RetentionSchedule**: Tracks scheduled deletions
- **Celery Tasks**: Automated policy enforcement
- **Management Commands**: Manual operations

## Retention Policies

### Policy Types

1. **DOCUMENT_TYPE** - Match by document type (e.g., "Invoice", "Contract")
2. **DEPARTMENT** - Match by department
3. **FOLDER** - Match by folder
4. **TAG** - Match by tags
5. **CUSTOM** - Custom matching rules

### Creating a Retention Policy

#### Via Django Admin

1. Navigate to **Admin > Retention > Retention Policies**
2. Click **Add Retention Policy**
3. Fill in the form:
   - **Name**: Descriptive policy name (e.g., "7-Year Invoice Retention")
   - **Policy Type**: Select matching criteria
   - **Retention Days**: Number of days to retain (e.g., 2555 for 7 years)
   - **Grace Period Days**: Days to wait after retention expires (default: 30)
   - **Notify Before Days**: Days before deletion to send notification (default: 30)
   - **Criteria**: JSON criteria for matching (e.g., `{"document_type": "Invoice"}`)
   - **Priority**: Higher numbers override lower (for conflicts)
   - **Is Active**: Enable/disable policy
4. Click **Save**

#### Via API

```bash
POST /api/v1/retention/policies/
{
  "name": "7-Year Invoice Retention",
  "description": "Retain invoices for 7 years per regulatory requirements",
  "policy_type": "DOCUMENT_TYPE",
  "retention_days": 2555,
  "grace_period_days": 30,
  "notify_before_days": 30,
  "criteria": {"document_type": "Invoice"},
  "priority": 10,
  "is_active": true
}
```

### Policy Matching Criteria

#### Document Type Based
```json
{
  "document_type": "Invoice"
}
```

#### Department Based
```json
{
  "department_id": "uuid-here"
}
```

#### Folder Based
```json
{
  "folder_id": "uuid-here"
}
```

#### Tag Based
```json
{
  "tags": ["Financial", "Audit"]
}
```

#### Confidentiality Based
```json
{
  "confidentiality_level": "HIGHLY_CONFIDENTIAL"
}
```

#### Combined Criteria
```json
{
  "document_type": "Invoice",
  "confidentiality_level": "CONFIDENTIAL",
  "department_id": "uuid-here"
}
```

### Priority-Based Conflict Resolution

When multiple policies match a document, the **highest priority** policy wins:

```python
# Example: Multiple matching policies
Policy A: Priority 100, 7 years retention
Policy B: Priority 50, 5 years retention
Policy C: Priority 10, 3 years retention

# Document matches all three → Policy A applied
```

### Retention Timeline

```
Document Upload
    ↓
Retention Period (e.g., 7 years)
    ↓
[Retention End Date]
    ↓
Notification Sent (-30 days before deletion)
    ↓
Grace Period (30 days)
    ↓
[Deletion Date]
    ↓
Document Soft Deleted
```

## Legal Holds

### When to Use Legal Holds

- Active litigation involving documents
- Government investigations
- Regulatory audits
- Internal compliance reviews
- Pending legal proceedings

### Creating a Legal Hold

#### Via Django Admin

1. Navigate to **Admin > Retention > Legal Holds**
2. Click **Add Legal Hold**
3. Fill in the form:
   - **Case Number**: Unique case identifier (e.g., "CASE-2025-001")
   - **Case Name**: Descriptive name (e.g., "Smith vs. Company")
   - **Description**: Details about the legal matter
   - **Notes**: Additional context
4. Click **Save**
5. Add documents via the **Documents** inline section

#### Via API

```bash
# Create legal hold
POST /api/v1/retention/legal-holds/
{
  "case_number": "CASE-2025-001",
  "case_name": "Smith vs. Company",
  "description": "Contract dispute regarding 2024 agreement",
  "is_active": true
}

# Add documents to hold
POST /api/v1/retention/legal-holds/{hold_id}/add_documents/
{
  "document_ids": ["uuid1", "uuid2", "uuid3"],
  "reason": "Evidence for contract dispute"
}
```

### Releasing a Legal Hold

#### Via Management Command

```bash
python manage.py release_legal_hold CASE-2025-001 \
  --username legal@cccplc.com \
  --notes "Settlement reached, case closed"
```

#### Via API

```bash
POST /api/v1/retention/legal-holds/{hold_id}/release/
{
  "notes": "Settlement reached, case closed"
}
```

### Legal Hold Protection

Documents under active legal holds:
- ✗ Cannot be deleted (manual or automatic)
- ✗ Retention policies paused
- ✓ Can be viewed, downloaded, shared
- ✓ Metadata can be updated
- ✓ Versions can be added

When attempting to delete a document with an active legal hold:
```json
{
  "detail": "Cannot delete document under legal hold. Active cases: CASE-2025-001, CASE-2025-002"
}
```

## Automated Enforcement

### Celery Tasks

Four automated tasks run daily:

#### 1. Apply Retention Policies (2:00 AM)
- Scans documents without retention schedules
- Matches documents to active policies
- Creates retention schedules

#### 2. Send Retention Notifications (3:00 AM)
- Finds schedules where notification_date has passed
- Sends email to document owners
- Updates notification status

#### 3. Execute Retention Deletions (4:00 AM)
- Finds schedules where deletion_date has passed
- Checks for legal holds
- Soft deletes eligible documents
- Logs audit events

#### 4. Check Legal Holds (5:00 AM)
- Reports on active legal holds
- Identifies expired holds
- Sends compliance reports

### Celery Beat Schedule

```python
CELERY_BEAT_SCHEDULE = {
    'apply-retention-policies': {
        'task': 'apply_retention_policies',
        'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
    },
    'send-retention-notifications': {
        'task': 'send_retention_notifications',
        'schedule': crontab(hour=3, minute=0),  # Daily at 3 AM
    },
    'execute-retention-deletions': {
        'task': 'execute_retention_deletions',
        'schedule': crontab(hour=4, minute=0),  # Daily at 4 AM
    },
    'check-legal-holds': {
        'task': 'check_legal_holds',
        'schedule': crontab(hour=5, minute=0),  # Daily at 5 AM
    },
}
```

## Management Commands

### Apply Retention Policies

```bash
# Apply to all documents without schedules
python manage.py apply_retention_policies

# Reapply to all documents (delete and recreate schedules)
python manage.py apply_retention_policies --force

# Apply specific policy
python manage.py apply_retention_policies --policy-id <uuid>

# Apply to specific document
python manage.py apply_retention_policies --document-id <uuid>
```

### Check Retention Schedules

```bash
# View upcoming deletions (next 30 days)
python manage.py check_retention_schedules

# Check next 7 days
python manage.py check_retention_schedules --days 7

# View overdue deletions
python manage.py check_retention_schedules --overdue

# Export to CSV
python manage.py check_retention_schedules --export report.csv

# Filter by status
python manage.py check_retention_schedules --status PENDING
```

### Execute Retention Deletions

```bash
# Dry run (preview only)
python manage.py execute_retention_deletions --dry-run

# Execute deletions
python manage.py execute_retention_deletions

# Delete specific document
python manage.py execute_retention_deletions --document-id <uuid>
```

### Release Legal Hold

```bash
python manage.py release_legal_hold CASE-2025-001 \
  --username legal@cccplc.com \
  --notes "Settlement reached"
```

## API Endpoints

### Retention Policies

```bash
# List policies
GET /api/v1/retention/policies/

# Create policy
POST /api/v1/retention/policies/

# Get policy details
GET /api/v1/retention/policies/{id}/

# Update policy
PUT /api/v1/retention/policies/{id}/

# Partial update
PATCH /api/v1/retention/policies/{id}/

# Delete policy
DELETE /api/v1/retention/policies/{id}/

# Activate policy
POST /api/v1/retention/policies/{id}/activate/

# Deactivate policy
POST /api/v1/retention/policies/{id}/deactivate/

# Test which documents would match
GET /api/v1/retention/policies/{id}/test_match/
```

### Legal Holds

```bash
# List legal holds
GET /api/v1/retention/legal-holds/

# Create legal hold
POST /api/v1/retention/legal-holds/

# Get hold details
GET /api/v1/retention/legal-holds/{id}/

# Update hold
PUT /api/v1/retention/legal-holds/{id}/

# Add documents to hold
POST /api/v1/retention/legal-holds/{id}/add_documents/

# Remove documents from hold
POST /api/v1/retention/legal-holds/{id}/remove_documents/

# Release hold
POST /api/v1/retention/legal-holds/{id}/release/
```

### Retention Schedules

```bash
# List schedules (read-only)
GET /api/v1/retention/schedules/

# Get schedule details
GET /api/v1/retention/schedules/{id}/

# Upcoming deletions
GET /api/v1/retention/schedules/upcoming_deletions/?days=30
```

## Admin Interface

### Retention Policies Admin

**Features**:
- List view with retention period display (days + years)
- Colored status indicators (Active/Inactive)
- Applied document count with links
- Search by name, description
- Filter by type, status, creation date
- Priority-based ordering

### Legal Holds Admin

**Features**:
- Active hold warning badges
- Document count display
- Placement and release tracking
- Inline document management
- Case number search
- Active/Released filters

### Retention Schedules Admin

**Features**:
- Read-only (auto-managed by Celery)
- Days remaining calculation
- Color-coded urgency (red < 7 days, orange < 30 days)
- Legal hold status indicator
- Export to CSV
- Overdue deletion warnings

## Best Practices

### Policy Design

1. **Start Conservative**: Begin with longer retention periods
2. **Use Priority Wisely**: Reserve high priorities (90-100) for critical policies
3. **Test Before Activating**: Use `test_match` endpoint to preview
4. **Document Business Rules**: Add clear descriptions
5. **Review Quarterly**: Ensure policies align with regulations

### Legal Hold Management

1. **Immediate Action**: Place holds as soon as litigation is anticipated
2. **Broad Coverage**: Include all potentially relevant documents
3. **Document Rationale**: Add detailed notes and descriptions
4. **Regular Review**: Check active holds monthly
5. **Prompt Release**: Release holds immediately when case concludes

### Notification Best Practices

1. **Adequate Notice**: Minimum 30 days before deletion
2. **Clear Communication**: Email should explain why document is being deleted
3. **Opt-Out Process**: Allow users to extend retention if needed
4. **Multiple Reminders**: Consider 30-day and 7-day warnings

### Grace Period Guidelines

1. **Minimum 30 Days**: Allow time for review and appeals
2. **Department-Specific**: Adjust based on department needs
3. **Holiday Consideration**: Extend grace period during year-end

### Audit and Compliance

1. **Regular Audits**: Review retention logs monthly
2. **Compliance Reports**: Generate quarterly reports for management
3. **Exception Tracking**: Monitor cancelled schedules (legal holds)
4. **Policy Effectiveness**: Track policy application rates

### Disaster Recovery

1. **Backup Schedules**: Include retention_schedules table in backups
2. **Document Legal Holds**: Keep separate record of active holds
3. **Policy Documentation**: Maintain written retention policy documentation
4. **Recovery Testing**: Verify retention enforcement after restore

## Troubleshooting

### Policy Not Applying

**Symptom**: Documents not getting schedules
**Checks**:
1. Is policy active? (`is_active=True`)
2. Does criteria match document attributes?
3. Is document already deleted? (`is_deleted=False`)
4. Does higher priority policy match?

**Solution**:
```bash
# Test policy matching
GET /api/v1/retention/policies/{id}/test_match/?document_id={doc_id}

# Manually apply
python manage.py apply_retention_policies --document-id {doc_id}
```

### Notifications Not Sending

**Symptom**: No notification emails sent
**Checks**:
1. Email configuration correct? (SMTP settings)
2. Is notification_date in past?
3. Is notification_sent already True?
4. Is schedule status PENDING?

**Solution**:
```bash
# Check schedules ready for notification
python manage.py check_retention_schedules --days 0

# Manually trigger
python manage.py shell
>>> from apps.retention.tasks import send_retention_notifications
>>> send_retention_notifications()
```

### Deletion Not Executing

**Symptom**: Documents not deleted when due
**Checks**:
1. Is deletion_date in past?
2. Is document under legal hold?
3. Is Celery worker running?
4. Check Celery logs for errors

**Solution**:
```bash
# Check overdue deletions
python manage.py check_retention_schedules --overdue

# Execute with dry-run first
python manage.py execute_retention_deletions --dry-run

# Execute
python manage.py execute_retention_deletions
```

### Legal Hold Not Preventing Deletion

**Symptom**: Document deleted despite active hold
**Checks**:
1. Is hold active? (`is_active=True`)
2. Is document associated with hold?
3. Check audit logs for deletion event

**Solution**:
```bash
# Verify document is under hold
GET /api/v1/retention/legal-holds/{hold_id}/

# Check document's legal holds
GET /api/v1/documents/{doc_id}/
# Response includes: "legal_holds": [...]
```

## Security Considerations

1. **RBAC Enforcement**: Ensure proper permissions for retention operations
2. **Audit All Actions**: Log all policy changes, hold placements, deletions
3. **Encrypt Criteria**: Criteria may contain sensitive department/folder IDs
4. **Rate Limiting**: Apply to API endpoints
5. **Secure Celery**: Protect Celery broker (RabbitMQ/Redis)

## Compliance Notes

### Regulatory Requirements

- **GDPR**: Right to erasure vs. retention requirements
- **SOX**: 7-year retention for financial records
- **HIPAA**: 6-year retention for healthcare records
- **SEC**: 7-year retention for securities
- **IRS**: 7-year retention for tax documents

### Legal Hold Obligations

- **Duty to Preserve**: Immediate hold placement
- **Over-Preservation**: Better to hold too much than too little
- **Release Promptly**: Don't keep unnecessary holds
- **Document Everything**: Audit trail critical for litigation

---

**Document Version**: 1.0
**Last Updated**: 2025-11-19
**Author**: DFC Development Team
