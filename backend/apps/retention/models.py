"""
Retention policy and legal hold models for document lifecycle management.

Models:
- RetentionPolicy: Defines retention rules for documents
- LegalHold: Prevents deletion during legal proceedings
- LegalHoldDocument: Through model for legal hold-document relationship
- RetentionSchedule: Tracks scheduled deletions and notifications
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
import uuid

User = get_user_model()


class RetentionPolicy(models.Model):
    """
    Retention policies define how long documents should be kept
    before automatic deletion.

    Features:
    - Flexible policy types (document type, department, folder, tag-based)
    - Configurable retention periods in days
    - Grace period before deletion
    - Email notifications before deletion
    - Priority-based conflict resolution
    """

    # Policy types
    DOCUMENT_TYPE_BASED = 'DOCUMENT_TYPE'
    DEPARTMENT_BASED = 'DEPARTMENT'
    FOLDER_BASED = 'FOLDER'
    TAG_BASED = 'TAG'
    CUSTOM = 'CUSTOM'

    POLICY_TYPE_CHOICES = [
        (DOCUMENT_TYPE_BASED, 'Document Type Based'),
        (DEPARTMENT_BASED, 'Department Based'),
        (FOLDER_BASED, 'Folder Based'),
        (TAG_BASED, 'Tag Based'),
        (CUSTOM, 'Custom Rule'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, unique=True, db_index=True)
    description = models.TextField(blank=True)
    policy_type = models.CharField(max_length=50, choices=POLICY_TYPE_CHOICES)

    # Retention period
    retention_days = models.IntegerField(
        help_text='Number of days to retain documents (e.g., 2555 = 7 years)'
    )

    # Rule criteria (JSONField for flexible matching)
    criteria = models.JSONField(
        default=dict,
        help_text='Matching criteria (e.g., {"document_type": "Invoice", "department_id": "..."})'
    )

    # Grace period before deletion
    grace_period_days = models.IntegerField(
        default=30,
        help_text='Days to wait after retention period expires before deletion'
    )

    # Notifications
    notify_before_days = models.IntegerField(
        default=30,
        help_text='Notify document owner N days before deletion'
    )

    # Status
    is_active = models.BooleanField(default=True, db_index=True)
    priority = models.IntegerField(
        default=0,
        help_text='Higher priority policies override lower (for conflicts)'
    )

    # Audit
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_retention_policies'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'retention_policies'
        ordering = ['-priority', 'name']
        verbose_name = 'Retention Policy'
        verbose_name_plural = 'Retention Policies'
        indexes = [
            models.Index(fields=['-priority', 'is_active']),
        ]

    def __str__(self):
        return f'{self.name} ({self.retention_days} days)'

    def get_deletion_date(self, document):
        """Calculate when a document should be deleted based on this policy"""
        # Retention period starts from upload date
        retention_end = document.uploaded_at + timedelta(days=self.retention_days)
        # Add grace period
        deletion_date = retention_end + timedelta(days=self.grace_period_days)
        return deletion_date

    def get_notification_date(self, document):
        """Calculate when to notify about upcoming deletion"""
        deletion_date = self.get_deletion_date(document)
        return deletion_date - timedelta(days=self.notify_before_days)

    def get_retention_end_date(self, document):
        """Calculate when retention period ends (before grace period)"""
        return document.uploaded_at + timedelta(days=self.retention_days)

    def matches_document(self, document):
        """Check if this policy applies to the given document"""
        if not self.is_active:
            return False

        criteria = self.criteria

        # Document type matching
        if 'document_type' in criteria:
            if document.document_type != criteria['document_type']:
                return False

        # Department matching
        if 'department_id' in criteria:
            if hasattr(document, 'folder') and document.folder and hasattr(document.folder, 'department_id'):
                if str(document.folder.department_id) != criteria['department_id']:
                    return False
            else:
                return False

        # Folder matching
        if 'folder_id' in criteria:
            if str(document.folder_id) != criteria['folder_id']:
                return False

        # Tag matching
        if 'tags' in criteria:
            doc_tags = set(document.tags.values_list('name', flat=True))
            required_tags = set(criteria['tags'])
            if not required_tags.issubset(doc_tags):
                return False

        # Confidentiality level matching
        if 'confidentiality_level' in criteria:
            if document.confidentiality_level != criteria['confidentiality_level']:
                return False

        return True


class LegalHold(models.Model):
    """
    Legal holds prevent documents from being deleted,
    regardless of retention policies.

    Features:
    - Case number tracking
    - Active/released status
    - Documents associated via many-to-many relationship
    - Audit trail of placement and release
    """

    # Using BigAutoField to match existing DB schema (bigint with auto-increment)
    id = models.BigAutoField(primary_key=True)
    case_number = models.CharField(max_length=200, unique=True, db_index=True)
    title = models.CharField(max_length=500)  # Display name for the case
    reason = models.TextField()  # Why the hold was placed

    # Hold period
    start_date = models.DateField()  # When the hold starts
    end_date = models.DateField(null=True, blank=True)  # Optional end date

    # Documents under hold (many-to-many through LegalHoldDocument)
    documents = models.ManyToManyField(
        'documents.Document',
        related_name='legal_holds',
        through='LegalHoldDocument'
    )

    # Status
    is_active = models.BooleanField(default=True, db_index=True)

    # Audit
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_legal_holds'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    released_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='released_legal_holds'
    )
    released_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'legal_holds'
        ordering = ['-created_at']
        verbose_name = 'Legal Hold'
        verbose_name_plural = 'Legal Holds'

    def __str__(self):
        status = 'Active' if self.is_active else 'Released'
        return f'{self.case_number} - {status}'

    def release(self, user):
        """Release the legal hold"""
        self.is_active = False
        self.released_by = user
        self.released_at = timezone.now()
        self.save()

        # Log audit event
        from apps.audit.models import AuditLog
        AuditLog.log_action(
            user=user,
            action='LEGAL_RELEASE',
            resource_type='LegalHold',
            resource_id=str(self.id),
            resource_name=self.case_number,
            details={
                'case_number': self.case_number,
                'document_count': self.documents.count()
            }
        )


class LegalHoldDocument(models.Model):
    """Through model for legal hold documents with audit trail"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    legal_hold = models.ForeignKey(LegalHold, on_delete=models.CASCADE)
    document = models.ForeignKey('documents.Document', on_delete=models.CASCADE)

    added_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    added_at = models.DateTimeField(auto_now_add=True)
    reason = models.TextField(blank=True)

    class Meta:
        db_table = 'legal_hold_documents'
        unique_together = [['legal_hold', 'document']]
        ordering = ['-added_at']
        verbose_name = 'Legal Hold Document'
        verbose_name_plural = 'Legal Hold Documents'

    def __str__(self):
        return f'{self.legal_hold.case_number} - {self.document.title}'


class RetentionSchedule(models.Model):
    """
    Tracks when documents are scheduled for deletion and notifications.
    Auto-populated by Celery task based on retention policies.

    Features:
    - Tracks retention end date, notification date, and deletion date
    - Status tracking (pending, notified, deleted, cancelled)
    - Links to applied retention policy
    - Checks for legal holds before deletion
    """

    # Status choices
    PENDING = 'PENDING'
    NOTIFIED = 'NOTIFIED'
    DELETED = 'DELETED'
    CANCELLED = 'CANCELLED'  # If legal hold applied

    STATUS_CHOICES = [
        (PENDING, 'Pending'),
        (NOTIFIED, 'Notified'),
        (DELETED, 'Deleted'),
        (CANCELLED, 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.OneToOneField(
        'documents.Document',
        on_delete=models.CASCADE,
        related_name='retention_schedule'
    )
    policy = models.ForeignKey(
        RetentionPolicy,
        on_delete=models.SET_NULL,
        null=True,
        related_name='schedules'
    )

    # Dates
    retention_end_date = models.DateTimeField(
        help_text='When retention period ends'
    )
    notification_date = models.DateTimeField(
        help_text='When to notify owner'
    )
    deletion_date = models.DateTimeField(
        help_text='When to delete (retention_end + grace period)'
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=PENDING,
        db_index=True
    )
    notification_sent = models.BooleanField(default=False)

    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'retention_schedules'
        ordering = ['deletion_date']
        verbose_name = 'Retention Schedule'
        verbose_name_plural = 'Retention Schedules'
        indexes = [
            models.Index(fields=['status', 'deletion_date']),
            models.Index(fields=['status', 'notification_date']),
            models.Index(fields=['notification_sent', 'notification_date']),
        ]

    def __str__(self):
        return f'{self.document.title} - Delete on {self.deletion_date.date()}'

    def can_delete(self):
        """Check if document can be deleted (no active legal holds)"""
        return not self.document.legal_holds.filter(is_active=True).exists()

    def is_ready_for_deletion(self):
        """Check if deletion date has passed and status allows deletion"""
        return (
            self.status in [self.PENDING, self.NOTIFIED] and
            self.deletion_date <= timezone.now() and
            self.can_delete()
        )

    def is_ready_for_notification(self):
        """Check if notification should be sent"""
        return (
            self.status == self.PENDING and
            not self.notification_sent and
            self.notification_date <= timezone.now()
        )
