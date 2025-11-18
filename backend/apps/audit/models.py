from django.conf import settings
from django.db import models
import uuid


class AuditLog(models.Model):
    """
    Immutable audit trail for all user actions in the system.

    Features:
    - Append-only (no updates or deletes allowed)
    - Comprehensive action tracking
    - IP address and user agent logging
    - Success/failure tracking
    - Additional metadata support via JSONField
    - Support for failed login tracking
    - ACCOUNT_LOCKED action for lockout events
    """

    ACTION_CHOICES = [
        ('CREATE', 'Create'),
        ('VIEW', 'View'),
        ('EDIT', 'Edit'),
        ('DELETE', 'Delete'),
        ('DOWNLOAD', 'Download'),
        ('SHARE', 'Share'),
        ('MOVE', 'Move'),
        ('COPY', 'Copy'),
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
        ('FAILED_LOGIN', 'Failed Login'),
        ('ACCOUNT_LOCKED', 'Account Locked'),
        ('ACCOUNT_UNLOCKED', 'Account Unlocked'),
        ('PASSWORD_RESET', 'Password Reset'),
        ('MFA_ENABLED', 'MFA Enabled'),
        ('MFA_DISABLED', 'MFA Disabled'),
        ('PERMISSION_CHANGED', 'Permission Changed'),
    ]

    OUTCOME_CHOICES = [
        ('SUCCESS', 'Success'),
        ('FAILURE', 'Failure'),
    ]

    RESOURCE_TYPE_CHOICES = [
        ('DOCUMENT', 'Document'),
        ('FOLDER', 'Folder'),
        ('USER', 'User'),
        ('TAG', 'Tag'),
        ('PERMISSION', 'Permission'),
        ('SHARE', 'Share'),
        ('RETENTION_POLICY', 'Retention Policy'),
        ('LEGAL_HOLD', 'Legal Hold'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # User who performed the action (nullable for failed logins)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name='audit_logs'
    )

    # Action details
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    resource_type = models.CharField(max_length=50, choices=RESOURCE_TYPE_CHOICES)
    resource_id = models.UUIDField(null=True, blank=True)
    resource_name = models.CharField(max_length=500)

    # Timestamp
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    # Request details
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()

    # Outcome
    outcome = models.CharField(max_length=20, choices=OUTCOME_CHOICES)
    error_message = models.TextField(blank=True)

    # Additional context (JSON)
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional context: before/after values, failed login count, etc.'
    )

    class Meta:
        db_table = 'audit_logs'
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'
        indexes = [
            models.Index(fields=['user', 'timestamp']),
            models.Index(fields=['resource_type', 'resource_id']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['action']),
            models.Index(fields=['outcome']),
        ]
        ordering = ['-timestamp']
        # Prevent updates and deletes at the database level
        permissions = [
            ('view_audit_log', 'Can view audit logs'),
        ]

    def __str__(self):
        user_str = self.user.username if self.user else 'Unknown'
        return f"{user_str} - {self.action} - {self.resource_type} - {self.timestamp}"

    def save(self, *args, **kwargs):
        """Only allow creation, not updates"""
        if self.pk is not None:
            raise ValueError("Audit logs cannot be modified after creation")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """Prevent deletion of audit logs"""
        raise ValueError("Audit logs cannot be deleted")
