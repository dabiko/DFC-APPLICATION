from django.conf import settings
from django.db import models
from django.contrib.postgres.fields import ArrayField
import uuid
from django.utils import timezone


class AuditLog(models.Model):
    """
    Immutable audit trail for all user actions in the system.

    Features:
    - Append-only (no updates or deletes allowed)
    - Comprehensive action tracking
    - IP address and user agent logging
    - Success/failure tracking
    - Before/after value tracking for changes
    - Changed fields detection
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
        ('RESTORE', 'Restore'),
        ('ARCHIVE', 'Archive'),
        ('UNARCHIVE', 'Unarchive'),
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
    resource_id = models.CharField(max_length=255, null=True, blank=True)  # Changed from UUIDField to support both UUID and integer IDs
    resource_name = models.CharField(max_length=500)

    # Timestamp
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    # Request details
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()

    # Outcome
    outcome = models.CharField(max_length=20, choices=OUTCOME_CHOICES)
    error_message = models.TextField(blank=True)

    # Change tracking (for EDIT actions)
    before_value = models.JSONField(
        null=True,
        blank=True,
        help_text='State of the resource before the change'
    )
    after_value = models.JSONField(
        null=True,
        blank=True,
        help_text='State of the resource after the change'
    )
    changed_fields = ArrayField(
        models.CharField(max_length=100),
        null=True,
        blank=True,
        help_text='List of fields that were changed in this action'
    )

    # Additional context (JSON)
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional context: failed login count, session info, etc.'
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
        """
        Only allow creation, not updates.
        Audit logs are immutable - once created, they cannot be modified.
        """
        # Check if this is an update operation (not a new creation)
        # We check _state.adding which is False for existing objects
        if not self._state.adding and self.pk is not None:
            # This is an attempt to update an existing audit log
            raise ValueError("Audit logs cannot be modified after creation")

        # Allow creation (first save)
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """Prevent deletion of audit logs"""
        raise ValueError("Audit logs cannot be deleted")

    @classmethod
    def log_action(
        cls,
        user,
        action,
        resource_type,
        resource_id=None,
        resource_name='',
        outcome='SUCCESS',
        error_message='',
        before_value=None,
        after_value=None,
        changed_fields=None,
        ip_address=None,
        user_agent=None,
        metadata=None
    ):
        """
        Class method to create an audit log entry.

        Args:
            user: User who performed the action (can be None for failed logins)
            action: Action type from ACTION_CHOICES
            resource_type: Resource type from RESOURCE_TYPE_CHOICES
            resource_id: UUID of the resource (optional)
            resource_name: Name/title of the resource
            outcome: SUCCESS or FAILURE
            error_message: Error message if outcome is FAILURE
            before_value: State before change (for EDIT actions)
            after_value: State after change (for EDIT actions)
            changed_fields: List of fields that changed
            ip_address: IP address of the request
            user_agent: User agent string
            metadata: Additional context as dict

        Returns:
            AuditLog instance
        """
        return cls.objects.create(
            user=user,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_name=resource_name,
            outcome=outcome,
            error_message=error_message,
            before_value=before_value,
            after_value=after_value,
            changed_fields=changed_fields,
            ip_address=ip_address or '0.0.0.0',
            user_agent=user_agent or 'Unknown',
            metadata=metadata or {}
        )

    @staticmethod
    def detect_changes(before, after, exclude_fields=None):
        """
        Detect changes between before and after states.

        Args:
            before: Dict representing state before change
            after: Dict representing state after change
            exclude_fields: List of field names to exclude from comparison

        Returns:
            Tuple of (changed_fields_list, before_values, after_values)
        """
        if exclude_fields is None:
            exclude_fields = ['updated_at', 'created_at']

        changed_fields = []
        before_values = {}
        after_values = {}

        # Get all keys from both dicts
        all_keys = set(before.keys()) | set(after.keys())

        for key in all_keys:
            if key in exclude_fields:
                continue

            before_val = before.get(key)
            after_val = after.get(key)

            if before_val != after_val:
                changed_fields.append(key)
                before_values[key] = before_val
                after_values[key] = after_val

        return changed_fields, before_values, after_values
