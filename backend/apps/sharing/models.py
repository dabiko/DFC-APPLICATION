"""
Document sharing models for secure collaboration.

Models:
- Share: Represents a document share with token, permissions, and expiration
- ShareAccess: Tracks individual access to shares for analytics
- SharedItemAccess: Tracks all items shared with a user (for "Shared with Me" view)
- ShareInvitation: Pending share invitations requiring user acceptance
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


class SharedItemAccess(models.Model):
    """
    Tracks all items (documents and folders) shared with a user.
    This is the source of truth for the "Shared with Me" view.

    Key design decisions:
    - Separate from Share model (which is for external link sharing)
    - Supports both documents and folders
    - Tracks the sharing user (owner/sharer)
    - Stores permission level granted
    - Tracks user engagement (viewed, shortcuts, etc.)
    """

    class ResourceType(models.TextChoices):
        DOCUMENT = 'DOCUMENT', 'Document'
        FOLDER = 'FOLDER', 'Folder'

    class PermissionLevel(models.TextChoices):
        VIEW = 'VIEW', 'View Only'
        COMMENT = 'COMMENT', 'View and Comment'
        EDIT = 'EDIT', 'View and Edit'
        FULL = 'FULL', 'Full Access (including delete)'

    class ShareSource(models.TextChoices):
        DIRECT = 'DIRECT', 'Directly shared with user'
        FOLDER_INHERITED = 'FOLDER_INHERITED', 'Inherited from parent folder'
        DEPARTMENT = 'DEPARTMENT', 'Department-based access'
        TEAM = 'TEAM', 'Team membership'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # The user who received the share
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='shared_with_me'
    )

    # The user who shared the item
    shared_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='shared_by_me'
    )

    # Resource reference (document or folder)
    resource_type = models.CharField(
        max_length=20,
        choices=ResourceType.choices
    )
    resource_id = models.UUIDField()

    # Denormalized fields for faster queries (avoid JOINs)
    resource_name = models.CharField(max_length=500)
    file_type = models.CharField(max_length=50, blank=True)  # For documents (e.g., pdf, docx)
    file_size = models.BigIntegerField(default=0)  # For documents
    folder_path = models.CharField(max_length=1000, blank=True)
    confidentiality_level = models.CharField(max_length=20, blank=True)
    thumbnail_url = models.URLField(max_length=500, blank=True)

    # Permission details
    permission_level = models.CharField(
        max_length=20,
        choices=PermissionLevel.choices,
        default=PermissionLevel.VIEW
    )
    share_source = models.CharField(
        max_length=30,
        choices=ShareSource.choices,
        default=ShareSource.DIRECT
    )

    # Share metadata
    shared_at = models.DateTimeField(auto_now_add=True, db_index=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    message = models.TextField(blank=True, help_text='Optional message from sharer')

    # User engagement tracking
    is_shortcut = models.BooleanField(default=False, db_index=True)  # Pinned to top
    shortcut_order = models.IntegerField(default=0)  # Order in shortcuts
    first_viewed_at = models.DateTimeField(null=True, blank=True)
    last_accessed_at = models.DateTimeField(null=True, blank=True)
    access_count = models.IntegerField(default=0)
    is_hidden = models.BooleanField(default=False)  # User hid this item

    # Notification tracking
    is_notified = models.BooleanField(default=False)
    notification_sent_at = models.DateTimeField(null=True, blank=True)
    is_acknowledged = models.BooleanField(default=False)  # For confidential docs
    acknowledged_at = models.DateTimeField(null=True, blank=True)

    # External user flag (for security awareness)
    is_external_share = models.BooleanField(default=False)

    # Status
    is_active = models.BooleanField(default=True, db_index=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoked_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='revoked_shared_access'
    )

    class Meta:
        db_table = 'shared_item_access'
        ordering = ['-shared_at']
        verbose_name = 'Shared Item Access'
        verbose_name_plural = 'Shared Item Accesses'
        indexes = [
            models.Index(fields=['recipient', '-shared_at']),
            models.Index(fields=['recipient', 'resource_type', '-shared_at']),
            models.Index(fields=['recipient', 'is_shortcut', '-shared_at']),
            models.Index(fields=['recipient', 'shared_by', '-shared_at']),
            models.Index(fields=['recipient', 'is_active', '-shared_at']),
            models.Index(fields=['resource_type', 'resource_id']),
            models.Index(fields=['recipient', 'is_hidden', '-shared_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['recipient', 'resource_type', 'resource_id'],
                name='unique_recipient_resource'
            )
        ]

    # Constants
    MAX_SHORTCUTS = 20  # Maximum pinned items per user

    def __str__(self):
        return f'{self.resource_name} shared with {self.recipient.email} by {self.shared_by.email}'

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
        return True

    def can_edit(self):
        """Check if user can edit the resource"""
        return self.permission_level in [self.PermissionLevel.EDIT, self.PermissionLevel.FULL]

    def can_comment(self):
        """Check if user can comment on the resource"""
        return self.permission_level in [
            self.PermissionLevel.COMMENT,
            self.PermissionLevel.EDIT,
            self.PermissionLevel.FULL
        ]

    def can_delete(self):
        """Check if user can delete the resource"""
        return self.permission_level == self.PermissionLevel.FULL

    def record_access(self):
        """Record an access to this shared item"""
        now = timezone.now()
        if not self.first_viewed_at:
            self.first_viewed_at = now
        self.last_accessed_at = now
        self.access_count += 1
        self.save(update_fields=['first_viewed_at', 'last_accessed_at', 'access_count'])

    def add_shortcut(self, order=None):
        """Add this item to user's shortcuts"""
        if order is None:
            # Get the max order for this user's shortcuts
            max_order = SharedItemAccess.objects.filter(
                recipient=self.recipient,
                is_shortcut=True
            ).aggregate(models.Max('shortcut_order'))['shortcut_order__max'] or 0
            order = max_order + 1

        self.is_shortcut = True
        self.shortcut_order = order
        self.save(update_fields=['is_shortcut', 'shortcut_order'])

    def remove_shortcut(self):
        """Remove this item from user's shortcuts"""
        self.is_shortcut = False
        self.shortcut_order = 0
        self.save(update_fields=['is_shortcut', 'shortcut_order'])

    def hide(self):
        """Hide this item from the shared with me list"""
        self.is_hidden = True
        self.save(update_fields=['is_hidden'])

    def unhide(self):
        """Unhide this item"""
        self.is_hidden = False
        self.save(update_fields=['is_hidden'])

    def revoke(self, user):
        """Revoke the share access"""
        self.is_active = False
        self.revoked_at = timezone.now()
        self.revoked_by = user
        self.save(update_fields=['is_active', 'revoked_at', 'revoked_by'])

        # Log audit event
        from apps.audit.models import AuditLog
        AuditLog.log_action(
            user=user,
            action='SHARED_ACCESS_REVOKE',
            resource_type=self.resource_type,
            resource_id=str(self.resource_id),
            resource_name=self.resource_name,
            details={
                'recipient_id': str(self.recipient.id),
                'recipient_email': self.recipient.email,
                'permission_level': self.permission_level,
            }
        )

    def acknowledge(self):
        """Acknowledge access to a confidential document"""
        self.is_acknowledged = True
        self.acknowledged_at = timezone.now()
        self.save(update_fields=['is_acknowledged', 'acknowledged_at'])

    @classmethod
    def create_share(cls, document=None, folder=None, recipient=None, shared_by=None,
                     permission_level=None, message='', expires_at=None,
                     share_source=None, is_external=False):
        """
        Factory method to create a shared item access record.

        Args:
            document: Document instance (if sharing a document)
            folder: Folder instance (if sharing a folder)
            recipient: User who will receive the share
            shared_by: User who is sharing the item
            permission_level: Permission level to grant
            message: Optional message to recipient
            expires_at: Optional expiration datetime
            share_source: Source of the share (DIRECT, FOLDER_INHERITED, etc.)
            is_external: Whether the sharer is external to organization

        Returns:
            SharedItemAccess instance
        """
        if document:
            resource_type = cls.ResourceType.DOCUMENT
            resource_id = document.id
            resource_name = document.title
            file_type = document.file_type if hasattr(document, 'file_type') else ''
            file_size = document.file_size if hasattr(document, 'file_size') else 0
            folder_path = document.folder.path if hasattr(document, 'folder') and document.folder else ''
            confidentiality = document.confidentiality_level if hasattr(document, 'confidentiality_level') else ''
        elif folder:
            resource_type = cls.ResourceType.FOLDER
            resource_id = folder.id
            resource_name = folder.name
            file_type = ''
            file_size = 0
            folder_path = folder.path if hasattr(folder, 'path') else ''
            confidentiality = folder.confidentiality if hasattr(folder, 'confidentiality') else ''
        else:
            raise ValueError("Either document or folder must be provided")

        # Check if share already exists - update if so
        existing = cls.objects.filter(
            recipient=recipient,
            resource_type=resource_type,
            resource_id=resource_id
        ).first()

        if existing:
            # Update existing share
            existing.shared_by = shared_by
            existing.permission_level = permission_level or cls.PermissionLevel.VIEW
            existing.message = message
            existing.expires_at = expires_at
            existing.share_source = share_source or cls.ShareSource.DIRECT
            existing.is_external_share = is_external
            existing.is_active = True
            existing.revoked_at = None
            existing.revoked_by = None
            existing.shared_at = timezone.now()
            existing.save()
            return existing

        # Create new share
        return cls.objects.create(
            recipient=recipient,
            shared_by=shared_by,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_name=resource_name,
            file_type=file_type,
            file_size=file_size,
            folder_path=folder_path,
            confidentiality_level=confidentiality,
            permission_level=permission_level or cls.PermissionLevel.VIEW,
            share_source=share_source or cls.ShareSource.DIRECT,
            message=message,
            expires_at=expires_at,
            is_external_share=is_external,
        )


class ShareInvitation(models.Model):
    """
    Pending share invitations that require user acceptance.
    Used for confidential documents or when explicit consent is required.
    """

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        ACCEPTED = 'ACCEPTED', 'Accepted'
        DECLINED = 'DECLINED', 'Declined'
        EXPIRED = 'EXPIRED', 'Expired'

    class ResourceType(models.TextChoices):
        DOCUMENT = 'DOCUMENT', 'Document'
        FOLDER = 'FOLDER', 'Folder'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Invitation details
    invited_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='share_invitations'
    )
    invited_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sent_share_invitations'
    )

    # Resource reference
    resource_type = models.CharField(
        max_length=20,
        choices=ResourceType.choices
    )
    resource_id = models.UUIDField()
    resource_name = models.CharField(max_length=500)

    # Permission offered
    permission_level = models.CharField(
        max_length=20,
        choices=SharedItemAccess.PermissionLevel.choices,
        default=SharedItemAccess.PermissionLevel.VIEW
    )

    # Invitation metadata
    message = models.TextField(blank=True, help_text='Message from inviter')
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True
    )

    # Timestamps
    invited_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    # Requires acknowledgement for highly confidential docs
    requires_acknowledgement = models.BooleanField(default=False)
    acknowledgement_text = models.TextField(
        blank=True,
        help_text='Text user must acknowledge before accepting'
    )

    # Decline reason (optional)
    decline_reason = models.TextField(blank=True)

    class Meta:
        db_table = 'share_invitations'
        ordering = ['-invited_at']
        verbose_name = 'Share Invitation'
        verbose_name_plural = 'Share Invitations'
        indexes = [
            models.Index(fields=['invited_user', 'status', '-invited_at']),
            models.Index(fields=['invited_by', '-invited_at']),
            models.Index(fields=['resource_type', 'resource_id']),
        ]

    def __str__(self):
        return f'Invitation for {self.resource_name} to {self.invited_user.email} ({self.status})'

    def is_expired(self):
        """Check if invitation has expired"""
        if not self.expires_at:
            return False
        return timezone.now() > self.expires_at

    def is_pending(self):
        """Check if invitation is still pending"""
        return self.status == self.Status.PENDING and not self.is_expired()

    def accept(self, acknowledged=False):
        """
        Accept the invitation and create SharedItemAccess.

        Args:
            acknowledged: Whether user acknowledged (for confidential docs)

        Returns:
            SharedItemAccess instance
        """
        if not self.is_pending():
            raise ValueError("Invitation is not pending")

        if self.requires_acknowledgement and not acknowledged:
            raise ValueError("Acknowledgement required for this invitation")

        self.status = self.Status.ACCEPTED
        self.responded_at = timezone.now()
        self.save(update_fields=['status', 'responded_at'])

        # Create the shared item access
        from apps.documents.models import Document
        from apps.folders.models import Folder

        document = None
        folder = None

        if self.resource_type == self.ResourceType.DOCUMENT:
            document = Document.objects.filter(id=self.resource_id).first()
        else:
            folder = Folder.objects.filter(id=self.resource_id).first()

        shared_access = SharedItemAccess.create_share(
            document=document,
            folder=folder,
            recipient=self.invited_user,
            shared_by=self.invited_by,
            permission_level=self.permission_level,
            message=self.message,
            share_source=SharedItemAccess.ShareSource.DIRECT,
        )

        if acknowledged:
            shared_access.acknowledge()

        # Log audit event
        from apps.audit.models import AuditLog
        AuditLog.log_action(
            user=self.invited_user,
            action='SHARE_INVITATION_ACCEPT',
            resource_type=self.resource_type,
            resource_id=str(self.resource_id),
            resource_name=self.resource_name,
            details={
                'invited_by': str(self.invited_by.id),
                'permission_level': self.permission_level,
            }
        )

        return shared_access

    def decline(self, reason=''):
        """Decline the invitation"""
        if not self.is_pending():
            raise ValueError("Invitation is not pending")

        self.status = self.Status.DECLINED
        self.responded_at = timezone.now()
        self.decline_reason = reason
        self.save(update_fields=['status', 'responded_at', 'decline_reason'])

        # Log audit event
        from apps.audit.models import AuditLog
        AuditLog.log_action(
            user=self.invited_user,
            action='SHARE_INVITATION_DECLINE',
            resource_type=self.resource_type,
            resource_id=str(self.resource_id),
            resource_name=self.resource_name,
            details={
                'invited_by': str(self.invited_by.id),
                'reason': reason,
            }
        )

    @classmethod
    def create_invitation(cls, document=None, folder=None, invited_user=None,
                          invited_by=None, permission_level=None, message='',
                          expires_at=None, requires_acknowledgement=False,
                          acknowledgement_text=''):
        """
        Factory method to create a share invitation.
        """
        if document:
            resource_type = cls.ResourceType.DOCUMENT
            resource_id = document.id
            resource_name = document.title
        elif folder:
            resource_type = cls.ResourceType.FOLDER
            resource_id = folder.id
            resource_name = folder.name
        else:
            raise ValueError("Either document or folder must be provided")

        return cls.objects.create(
            invited_user=invited_user,
            invited_by=invited_by,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_name=resource_name,
            permission_level=permission_level or SharedItemAccess.PermissionLevel.VIEW,
            message=message,
            expires_at=expires_at,
            requires_acknowledgement=requires_acknowledgement,
            acknowledgement_text=acknowledgement_text,
        )


class Notification(models.Model):
    """
    In-app notifications for users.
    Used for real-time notifications about shares, access requests, etc.
    """

    class NotificationType(models.TextChoices):
        SHARE_RECEIVED = 'SHARE_RECEIVED', 'Document/Folder shared with you'
        SHARE_INVITATION = 'SHARE_INVITATION', 'Share invitation received'
        ACCESS_REQUEST = 'ACCESS_REQUEST', 'Access request submitted'
        ACCESS_GRANTED = 'ACCESS_GRANTED', 'Access request approved'
        ACCESS_DENIED = 'ACCESS_DENIED', 'Access request denied'
        SHARE_REVOKED = 'SHARE_REVOKED', 'Share access revoked'
        SHARE_EXPIRING = 'SHARE_EXPIRING', 'Share about to expire'
        INVITATION_ACCEPTED = 'INVITATION_ACCEPTED', 'Share invitation accepted'
        INVITATION_DECLINED = 'INVITATION_DECLINED', 'Share invitation declined'
        WEEKLY_DIGEST = 'WEEKLY_DIGEST', 'Weekly sharing digest'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Recipient of the notification
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications'
    )

    # Notification type and content
    notification_type = models.CharField(
        max_length=30,
        choices=NotificationType.choices
    )
    title = models.CharField(max_length=255)
    message = models.TextField()

    # Optional actor (who triggered the notification)
    actor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='triggered_notifications'
    )

    # Optional resource reference
    resource_type = models.CharField(max_length=20, blank=True)  # DOCUMENT, FOLDER
    resource_id = models.UUIDField(null=True, blank=True)
    resource_name = models.CharField(max_length=500, blank=True)

    # Action URL (for navigation)
    action_url = models.CharField(max_length=500, blank=True)

    # Status
    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)

    # Email notification status
    email_sent = models.BooleanField(default=False)
    email_sent_at = models.DateTimeField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        indexes = [
            models.Index(fields=['recipient', '-created_at']),
            models.Index(fields=['recipient', 'is_read', '-created_at']),
            models.Index(fields=['notification_type', '-created_at']),
        ]

    def __str__(self):
        return f'{self.notification_type} for {self.recipient.email}'

    def mark_as_read(self):
        """Mark notification as read"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])

    @classmethod
    def create_share_notification(cls, recipient, shared_by, resource_type, resource_id,
                                  resource_name, permission_level, notification_type=None):
        """
        Factory method to create a share-related notification.
        """
        if notification_type is None:
            notification_type = cls.NotificationType.SHARE_RECEIVED

        title_map = {
            cls.NotificationType.SHARE_RECEIVED: f'{shared_by.get_full_name()} shared a {resource_type.lower()} with you',
            cls.NotificationType.SHARE_INVITATION: f'{shared_by.get_full_name()} invited you to access a {resource_type.lower()}',
            cls.NotificationType.SHARE_REVOKED: f'Access to {resource_name} has been revoked',
            cls.NotificationType.SHARE_EXPIRING: f'Your access to {resource_name} expires soon',
        }

        message_map = {
            cls.NotificationType.SHARE_RECEIVED: f'"{resource_name}" has been shared with you with {permission_level} permission.',
            cls.NotificationType.SHARE_INVITATION: f'You have been invited to access "{resource_name}" with {permission_level} permission.',
            cls.NotificationType.SHARE_REVOKED: f'Your access to "{resource_name}" has been removed.',
            cls.NotificationType.SHARE_EXPIRING: f'Your access to "{resource_name}" will expire soon. Please take any necessary action.',
        }

        action_url = '/shared-with-me' if notification_type != cls.NotificationType.SHARE_INVITATION else '/shared-with-me?tab=invitations'

        return cls.objects.create(
            recipient=recipient,
            notification_type=notification_type,
            title=title_map.get(notification_type, 'Sharing notification'),
            message=message_map.get(notification_type, 'You have a new sharing notification.'),
            actor=shared_by,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_name=resource_name,
            action_url=action_url,
        )

    @classmethod
    def create_access_request_notification(cls, owner, requester, resource_type, resource_id,
                                           resource_name, requested_permission, reason):
        """
        Create notification for resource owner when access is requested.
        """
        return cls.objects.create(
            recipient=owner,
            notification_type=cls.NotificationType.ACCESS_REQUEST,
            title=f'{requester.get_full_name()} requested higher access',
            message=f'{requester.get_full_name()} has requested {requested_permission} access to "{resource_name}". Reason: {reason}',
            actor=requester,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_name=resource_name,
            action_url=f'/sharing/access-requests',
        )


class NotificationPreferences(models.Model):
    """
    User preferences for notifications.
    Controls which notifications users receive via email and in-app.
    """

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='notification_preferences'
    )

    # In-app notification preferences (all default to True)
    in_app_share_received = models.BooleanField(
        default=True,
        help_text='Notify when someone shares a document/folder with me'
    )
    in_app_share_invitation = models.BooleanField(
        default=True,
        help_text='Notify when I receive a share invitation'
    )
    in_app_access_request = models.BooleanField(
        default=True,
        help_text='Notify when someone requests access to my shared items'
    )
    in_app_share_expiring = models.BooleanField(
        default=True,
        help_text='Notify when shared access is about to expire'
    )

    # Email notification preferences
    email_share_received = models.BooleanField(
        default=True,
        help_text='Send email when someone shares a document/folder with me'
    )
    email_share_invitation = models.BooleanField(
        default=True,
        help_text='Send email when I receive a share invitation'
    )
    email_access_request = models.BooleanField(
        default=True,
        help_text='Send email when someone requests access to my shared items'
    )
    email_share_expiring = models.BooleanField(
        default=False,
        help_text='Send email when shared access is about to expire'
    )

    # Weekly digest
    weekly_digest_enabled = models.BooleanField(
        default=True,
        help_text='Receive weekly email summary of sharing activity'
    )
    weekly_digest_day = models.IntegerField(
        default=1,  # Monday
        help_text='Day of week for weekly digest (0=Sunday, 1=Monday, etc.)'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'notification_preferences'
        verbose_name = 'Notification Preferences'
        verbose_name_plural = 'Notification Preferences'

    def __str__(self):
        return f'Notification preferences for {self.user.email}'

    @classmethod
    def get_or_create_for_user(cls, user):
        """Get or create notification preferences for a user"""
        preferences, _ = cls.objects.get_or_create(user=user)
        return preferences

    def should_send_email(self, notification_type):
        """Check if email should be sent for this notification type"""
        type_to_pref = {
            Notification.NotificationType.SHARE_RECEIVED: self.email_share_received,
            Notification.NotificationType.SHARE_INVITATION: self.email_share_invitation,
            Notification.NotificationType.ACCESS_REQUEST: self.email_access_request,
            Notification.NotificationType.SHARE_EXPIRING: self.email_share_expiring,
            Notification.NotificationType.ACCESS_GRANTED: self.email_share_received,
            Notification.NotificationType.ACCESS_DENIED: self.email_share_received,
            Notification.NotificationType.SHARE_REVOKED: self.email_share_received,
            Notification.NotificationType.INVITATION_ACCEPTED: self.email_share_received,
            Notification.NotificationType.INVITATION_DECLINED: self.email_share_received,
        }
        return type_to_pref.get(notification_type, False)

    def should_send_in_app(self, notification_type):
        """Check if in-app notification should be created for this notification type"""
        type_to_pref = {
            Notification.NotificationType.SHARE_RECEIVED: self.in_app_share_received,
            Notification.NotificationType.SHARE_INVITATION: self.in_app_share_invitation,
            Notification.NotificationType.ACCESS_REQUEST: self.in_app_access_request,
            Notification.NotificationType.SHARE_EXPIRING: self.in_app_share_expiring,
            Notification.NotificationType.ACCESS_GRANTED: self.in_app_share_received,
            Notification.NotificationType.ACCESS_DENIED: self.in_app_share_received,
            Notification.NotificationType.SHARE_REVOKED: self.in_app_share_received,
            Notification.NotificationType.INVITATION_ACCEPTED: self.in_app_share_received,
            Notification.NotificationType.INVITATION_DECLINED: self.in_app_share_received,
        }
        return type_to_pref.get(notification_type, True)
