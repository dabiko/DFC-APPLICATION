"""
Document sharing models for secure collaboration.

Models:
- Share: Represents a document share with token, permissions, and expiration
- ShareAccess: Tracks individual access to shares for analytics
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import EmailValidator
from datetime import timedelta
import uuid
import secrets
import hashlib

User = get_user_model()


class Share(models.Model):
    """
    Document share with secure token, permissions, and expiration.

    Features:
    - Unique secure token for access
    - Multiple permission levels (VIEW_ONLY, VIEW_DOWNLOAD, VIEW_DOWNLOAD_COMMENT)
    - Optional password protection
    - Configurable expiration
    - Email notifications to recipients
    - Access analytics (views, downloads)
    - Revocation capability
    """

    # Permission levels
    VIEW_ONLY = 'VIEW_ONLY'
    VIEW_DOWNLOAD = 'VIEW_DOWNLOAD'
    VIEW_DOWNLOAD_COMMENT = 'VIEW_DOWNLOAD_COMMENT'

    PERMISSION_CHOICES = [
        (VIEW_ONLY, 'View Only'),
        (VIEW_DOWNLOAD, 'View and Download'),
        (VIEW_DOWNLOAD_COMMENT, 'View, Download, and Comment'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Document being shared
    document = models.ForeignKey(
        'documents.Document',
        on_delete=models.CASCADE,
        related_name='shares'
    )

    # Share token (unique, secure, URL-safe)
    token = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        editable=False,
        help_text='Unique secure token for accessing the share'
    )

    # Permissions
    permission = models.CharField(
        max_length=30,
        choices=PERMISSION_CHOICES,
        default=VIEW_ONLY
    )

    # Password protection (optional)
    password_hash = models.CharField(
        max_length=128,
        blank=True,
        null=True,
        help_text='SHA-256 hash of password (if password-protected)'
    )
    is_password_protected = models.BooleanField(default=False)

    # Expiration
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the share expires (null = never expires)'
    )
    is_active = models.BooleanField(default=True, db_index=True)

    # Recipients (optional email list for notifications)
    recipient_emails = models.JSONField(
        default=list,
        blank=True,
        help_text='List of email addresses to notify'
    )

    # Analytics
    access_count = models.IntegerField(default=0, help_text='Total access count')
    download_count = models.IntegerField(default=0, help_text='Total download count')
    view_count = models.IntegerField(default=0, help_text='Total view count')
    last_accessed_at = models.DateTimeField(null=True, blank=True)

    # Audit
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_shares'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoked_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='revoked_shares'
    )

    # Additional settings
    allow_public_access = models.BooleanField(
        default=True,
        help_text='Allow anyone with link to access'
    )
    max_access_count = models.IntegerField(
        null=True,
        blank=True,
        help_text='Maximum number of accesses allowed (null = unlimited)'
    )
    notes = models.TextField(blank=True, help_text='Internal notes about this share')

    class Meta:
        db_table = 'shares'
        ordering = ['-created_at']
        verbose_name = 'Share'
        verbose_name_plural = 'Shares'
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['is_active', 'expires_at']),
            models.Index(fields=['created_by', 'created_at']),
        ]

    def __str__(self):
        status = 'Active' if self.is_active and not self.is_expired() else 'Inactive/Expired'
        return f'{self.document.title} - {status}'

    def save(self, *args, **kwargs):
        # Generate secure token on creation
        if not self.token:
            self.token = self.generate_token()
        super().save(*args, **kwargs)

    @staticmethod
    def generate_token():
        """Generate a secure URL-safe token"""
        return secrets.token_urlsafe(32)

    def set_password(self, password):
        """Set password protection (stores SHA-256 hash)"""
        if password:
            self.password_hash = hashlib.sha256(password.encode()).hexdigest()
            self.is_password_protected = True
        else:
            self.password_hash = None
            self.is_password_protected = False

    def check_password(self, password):
        """Verify password for password-protected shares"""
        if not self.is_password_protected:
            return True
        if not password:
            return False
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        return password_hash == self.password_hash

    def is_expired(self):
        """Check if share has expired"""
        if not self.expires_at:
            return False
        return timezone.now() > self.expires_at

    def is_accessible(self):
        """Check if share is currently accessible"""
        if not self.is_active:
            return False
        if self.is_expired():
            return False
        if self.max_access_count and self.access_count >= self.max_access_count:
            return False
        return True

    def can_download(self):
        """Check if share allows downloads"""
        return self.permission in [self.VIEW_DOWNLOAD, self.VIEW_DOWNLOAD_COMMENT]

    def can_comment(self):
        """Check if share allows comments"""
        return self.permission == self.VIEW_DOWNLOAD_COMMENT

    def record_access(self, access_type='view', ip_address=None, user_agent=None, user=None):
        """Record an access to this share"""
        # Update analytics
        self.access_count += 1
        if access_type == 'download':
            self.download_count += 1
        elif access_type == 'view':
            self.view_count += 1
        self.last_accessed_at = timezone.now()
        self.save(update_fields=['access_count', 'download_count', 'view_count', 'last_accessed_at'])

        # Create ShareAccess record
        ShareAccess.objects.create(
            share=self,
            access_type=access_type,
            ip_address=ip_address or '',
            user_agent=user_agent or '',
            user=user
        )

        # Log audit event
        from apps.audit.models import AuditLog
        AuditLog.log_action(
            user=user,
            action=f'SHARE_{access_type.upper()}',
            resource_type='Share',
            resource_id=str(self.id),
            resource_name=self.document.title,
            details={
                'share_token': self.token[:8] + '...',  # Partial token for security
                'access_type': access_type,
                'permission': self.permission,
            },
            ip_address=ip_address or '127.0.0.1',
            user_agent=user_agent or 'Unknown'
        )

    def revoke(self, user):
        """Revoke the share"""
        self.is_active = False
        self.revoked_at = timezone.now()
        self.revoked_by = user
        self.save()

        # Log audit event
        from apps.audit.models import AuditLog
        AuditLog.log_action(
            user=user,
            action='SHARE_REVOKE',
            resource_type='Share',
            resource_id=str(self.id),
            resource_name=self.document.title,
            details={
                'share_token': self.token[:8] + '...',
                'permission': self.permission,
                'access_count': self.access_count,
                'download_count': self.download_count,
            }
        )

    def get_share_url(self, request=None):
        """Get the full share URL"""
        if request:
            return request.build_absolute_uri(f'/api/v1/shares/public/{self.token}/')
        return f'/api/v1/shares/public/{self.token}/'


class ShareAccess(models.Model):
    """
    Individual access record for analytics.
    Tracks each view/download of a share.
    """

    ACCESS_VIEW = 'view'
    ACCESS_DOWNLOAD = 'download'
    ACCESS_COMMENT = 'comment'

    ACCESS_TYPE_CHOICES = [
        (ACCESS_VIEW, 'View'),
        (ACCESS_DOWNLOAD, 'Download'),
        (ACCESS_COMMENT, 'Comment'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    share = models.ForeignKey(
        Share,
        on_delete=models.CASCADE,
        related_name='access_records'
    )

    access_type = models.CharField(
        max_length=20,
        choices=ACCESS_TYPE_CHOICES,
        default=ACCESS_VIEW
    )

    # User (if authenticated)
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='share_accesses'
    )

    # Request details
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True)
    accessed_at = models.DateTimeField(auto_now_add=True)

    # Geolocation (optional, can be populated via IP lookup)
    country = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = 'share_accesses'
        ordering = ['-accessed_at']
        verbose_name = 'Share Access'
        verbose_name_plural = 'Share Accesses'
        indexes = [
            models.Index(fields=['share', '-accessed_at']),
            models.Index(fields=['access_type', '-accessed_at']),
        ]

    def __str__(self):
        user_str = self.user.email if self.user else self.ip_address or 'Unknown'
        return f'{self.access_type} by {user_str} at {self.accessed_at}'
