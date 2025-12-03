"""
Department-related models for the Department-as-Root architecture.

This module contains models that support departments as the primary
organizational and RBAC boundary in the Digital Filing Cabinet system.
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
import uuid


class DepartmentSettings(models.Model):
    """
    Department-specific settings and defaults.

    Stores configuration options for each department including:
    - Default folder templates for new structures
    - Retention policy defaults
    - Notification preferences
    - Access control defaults
    """

    department = models.OneToOneField(
        'users.Department',
        on_delete=models.CASCADE,
        related_name='settings',
        primary_key=True
    )

    # Default Folder Structure
    auto_create_structure = models.BooleanField(
        default=False,
        help_text='Automatically create default folder structure for new department members'
    )
    default_folder_template = models.ForeignKey(
        'folders.FolderTemplate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='default_for_departments',
        help_text='Default folder template to use when creating structures'
    )

    # Retention Defaults
    default_retention_days = models.IntegerField(
        default=2555,  # ~7 years
        help_text='Default retention period in days for documents in this department'
    )
    enforce_retention = models.BooleanField(
        default=True,
        help_text='Whether to enforce retention policies automatically'
    )

    # Notification Preferences
    notify_on_upload = models.BooleanField(
        default=False,
        help_text='Notify department managers when new documents are uploaded'
    )
    notify_managers_on_delete = models.BooleanField(
        default=True,
        help_text='Notify department managers when documents are deleted'
    )
    notify_on_access_request = models.BooleanField(
        default=True,
        help_text='Notify department managers when cross-department access is requested'
    )

    # Access Control Defaults
    allow_external_sharing = models.BooleanField(
        default=False,
        help_text='Allow sharing documents outside the organization'
    )
    require_approval_for_sharing = models.BooleanField(
        default=True,
        help_text='Require manager approval for sharing documents'
    )
    allow_cross_department_access = models.BooleanField(
        default=True,
        help_text='Allow granting access to users from other departments'
    )
    default_share_expiry_days = models.IntegerField(
        default=30,
        help_text='Default expiration period for shared document links'
    )

    # Document Defaults
    require_classification = models.BooleanField(
        default=True,
        help_text='Require documents to be classified before upload'
    )
    auto_index_documents = models.BooleanField(
        default=True,
        help_text='Automatically index documents for full-text search'
    )
    require_metadata = models.BooleanField(
        default=True,
        help_text='Require mandatory metadata fields to be filled'
    )

    # Audit Settings
    enhanced_audit_logging = models.BooleanField(
        default=False,
        help_text='Enable enhanced audit logging for compliance-sensitive departments'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'department_settings'
        verbose_name = 'Department Settings'
        verbose_name_plural = 'Department Settings'

    def __str__(self):
        return f"Settings for {self.department.name}"


class CrossDepartmentAccess(models.Model):
    """
    Explicit grant for accessing another department's content.

    Used for users who need access to departments other than their primary
    department, such as:
    - Auditors who need to review multiple departments
    - Managers overseeing multiple departments
    - Cross-functional team members
    - Compliance officers

    Access grants can be:
    - Time-limited (with expiration date)
    - Role-specific (different permission levels)
    - Audited (with reason and approval tracking)
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Who is granted access
    user = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.CASCADE,
        related_name='cross_department_access_grants'
    )

    # Which department they can access
    department = models.ForeignKey(
        'users.Department',
        on_delete=models.CASCADE,
        related_name='external_access_grants'
    )

    # What role they have in that department
    role = models.ForeignKey(
        'permissions.Role',
        on_delete=models.CASCADE,
        related_name='cross_department_grants',
        help_text='Role determining permission level in the target department'
    )

    # Grant metadata
    granted_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cross_department_access_granted'
    )
    granted_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When this access grant expires (null = no expiration)'
    )

    # Justification (required for audit trail)
    reason = models.TextField(
        help_text='Justification for granting cross-department access'
    )

    # Status
    is_active = models.BooleanField(
        default=True,
        help_text='Whether this access grant is currently active'
    )

    # Optional approval workflow
    requires_approval = models.BooleanField(
        default=False,
        help_text='Whether this grant requires additional approval'
    )
    approved_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cross_department_access_approved'
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    # Revocation tracking
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoked_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cross_department_access_revoked'
    )
    revocation_reason = models.TextField(blank=True)

    class Meta:
        db_table = 'cross_department_access'
        verbose_name = 'Cross-Department Access'
        verbose_name_plural = 'Cross-Department Access Grants'
        unique_together = [['user', 'department']]
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['department', 'is_active']),
            models.Index(fields=['expires_at']),
            models.Index(fields=['granted_at']),
        ]

    def __str__(self):
        status = 'Active' if self.is_active else 'Inactive'
        return f"{self.user.username} -> {self.department.name} ({self.role.name}) [{status}]"

    def clean(self):
        """Validate the access grant."""
        # User cannot have cross-department access to their own department
        if self.user.department_id == self.department_id:
            raise ValidationError(
                "Cannot grant cross-department access to user's own department"
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        """Check if this access grant has expired."""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False

    @property
    def is_effective(self):
        """Check if this access grant is currently effective (active and not expired)."""
        return self.is_active and not self.is_expired

    def revoke(self, user, reason=''):
        """
        Revoke this access grant.

        Args:
            user: The user performing the revocation
            reason: Reason for revocation
        """
        self.is_active = False
        self.revoked_at = timezone.now()
        self.revoked_by = user
        self.revocation_reason = reason
        self.save(update_fields=[
            'is_active', 'revoked_at', 'revoked_by', 'revocation_reason'
        ])

    def extend(self, new_expiry_date, extended_by):
        """
        Extend the expiration date of this access grant.

        Args:
            new_expiry_date: New expiration datetime
            extended_by: The user extending the grant
        """
        self.expires_at = new_expiry_date
        self.save(update_fields=['expires_at'])
        # Log the extension in audit trail (implement as needed)

    @classmethod
    def get_active_grants_for_user(cls, user):
        """Get all active cross-department access grants for a user."""
        return cls.objects.filter(
            user=user,
            is_active=True
        ).filter(
            models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=timezone.now())
        ).select_related('department', 'role')

    @classmethod
    def get_active_grants_for_department(cls, department):
        """Get all active cross-department access grants to a department."""
        return cls.objects.filter(
            department=department,
            is_active=True
        ).filter(
            models.Q(expires_at__isnull=True) | models.Q(expires_at__gt=timezone.now())
        ).select_related('user', 'role')

    @classmethod
    def cleanup_expired_grants(cls):
        """
        Deactivate all expired grants.
        Call this periodically via Celery task.
        """
        expired = cls.objects.filter(
            is_active=True,
            expires_at__lte=timezone.now()
        )
        count = expired.count()
        expired.update(is_active=False)
        return count


class DepartmentAccessRequest(models.Model):
    """
    Request for cross-department access (workflow support).

    Allows users to request access to other departments with
    an approval workflow.
    """

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('CANCELLED', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Who is requesting
    requester = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.CASCADE,
        related_name='department_access_requests'
    )

    # Which department
    department = models.ForeignKey(
        'users.Department',
        on_delete=models.CASCADE,
        related_name='access_requests'
    )

    # Requested role
    requested_role = models.ForeignKey(
        'permissions.Role',
        on_delete=models.CASCADE,
        related_name='access_requests'
    )

    # Request details
    reason = models.TextField(
        help_text='Justification for requesting access'
    )
    requested_duration_days = models.IntegerField(
        null=True,
        blank=True,
        help_text='Requested access duration in days (null = permanent)'
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING'
    )

    # Workflow tracking
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='department_access_requests_reviewed'
    )
    review_notes = models.TextField(blank=True)

    # Resulting grant (if approved)
    resulting_grant = models.OneToOneField(
        CrossDepartmentAccess,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='source_request'
    )

    class Meta:
        db_table = 'department_access_requests'
        verbose_name = 'Department Access Request'
        verbose_name_plural = 'Department Access Requests'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['requester', 'status']),
            models.Index(fields=['department', 'status']),
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f"{self.requester.username} -> {self.department.name} ({self.status})"

    def approve(self, reviewer, notes=''):
        """
        Approve the access request and create the grant.

        Args:
            reviewer: The user approving the request
            notes: Optional review notes
        """
        User = get_user_model()

        # Calculate expiration if duration specified
        expires_at = None
        if self.requested_duration_days:
            from datetime import timedelta
            expires_at = timezone.now() + timedelta(days=self.requested_duration_days)

        # Create the access grant
        grant = CrossDepartmentAccess.objects.create(
            user=self.requester,
            department=self.department,
            role=self.requested_role,
            granted_by=reviewer,
            expires_at=expires_at,
            reason=self.reason,
            is_active=True
        )

        # Update request status
        self.status = 'APPROVED'
        self.reviewed_at = timezone.now()
        self.reviewed_by = reviewer
        self.review_notes = notes
        self.resulting_grant = grant
        self.save()

        return grant

    def reject(self, reviewer, notes=''):
        """
        Reject the access request.

        Args:
            reviewer: The user rejecting the request
            notes: Reason for rejection
        """
        self.status = 'REJECTED'
        self.reviewed_at = timezone.now()
        self.reviewed_by = reviewer
        self.review_notes = notes
        self.save()

    def cancel(self):
        """Cancel the access request (by requester)."""
        if self.status == 'PENDING':
            self.status = 'CANCELLED'
            self.save(update_fields=['status'])
