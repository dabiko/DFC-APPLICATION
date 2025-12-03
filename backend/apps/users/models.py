from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.core.validators import EmailValidator
from django.db import models
from django.utils import timezone
from datetime import timedelta


def validate_company_email(value):
    """
    Validate that email address belongs to a business domain.

    DEPRECATED: This validator is kept for backward compatibility.
    Multi-tenant email validation is now handled by apps.organizations.validators.validate_business_email

    For now, this just validates it's a proper email format.
    Domain validation is enforced during organization creation/invitation.
    """
    # For multi-tenant, we'll validate the domain matches organization during user creation
    # This is just a basic email format check now
    if '@' not in value:
        raise ValidationError('Please enter a valid email address.')


class Department(models.Model):
    """
    Organization departments with storage quota management.

    In the Department-as-Root architecture, departments serve as the top-level
    organizational containers for folders. All folders must belong to exactly
    one department, and departments act as the primary RBAC boundary.

    Features:
    - Hierarchical department structure (parent-child)
    - Storage quota management per department
    - Visual customization (icon, color) for sidebar display
    - Default confidentiality level for new documents
    - Active/inactive status for soft-disable
    """

    CONFIDENTIALITY_CHOICES = [
        ('PUBLIC', 'Public'),
        ('INTERNAL', 'Internal'),
        ('CONFIDENTIAL', 'Confidential'),
        ('HIGHLY_CONFIDENTIAL', 'Highly Confidential'),
    ]

    ICON_CHOICES = [
        ('folder', 'Folder'),
        ('briefcase', 'Briefcase'),
        ('calculator', 'Calculator'),
        ('shield', 'Shield'),
        ('alert-triangle', 'Alert Triangle'),
        ('clipboard-check', 'Clipboard Check'),
        ('server', 'Server'),
        ('users', 'Users'),
        ('file-text', 'File Text'),
        ('archive', 'Archive'),
        ('database', 'Database'),
        ('lock', 'Lock'),
    ]

    # Multi-tenant organization
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.PROTECT,
        related_name='departments',
        null=True,  # Nullable for migration - will be non-null after data migration
        blank=True,
        help_text='Organization this department belongs to'
    )

    # Basic Information
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20)  # Removed unique=True - will use unique_together
    description = models.TextField(
        blank=True,
        help_text='Description of the department purpose and scope'
    )

    # Hierarchy
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='children'
    )

    # Storage Management
    storage_quota_gb = models.IntegerField(
        default=100,
        help_text='Storage quota in gigabytes for this department'
    )
    storage_used_bytes = models.BigIntegerField(
        default=0,
        help_text='Current storage usage in bytes (updated by document operations)'
    )

    # Visual Customization (for sidebar display)
    icon = models.CharField(
        max_length=50,
        choices=ICON_CHOICES,
        default='folder',
        help_text='Icon to display in sidebar navigation'
    )
    color = models.CharField(
        max_length=7,
        default='#3B82F6',
        help_text='Hex color code for department visual identification'
    )
    display_order = models.IntegerField(
        default=0,
        db_index=True,
        help_text='Order in which departments appear in sidebar'
    )

    # Status
    is_active = models.BooleanField(
        default=True,
        help_text='Whether this department is active and accessible'
    )

    # Default Settings
    default_confidentiality = models.CharField(
        max_length=20,
        choices=CONFIDENTIALITY_CHOICES,
        default='INTERNAL',
        help_text='Default confidentiality level for new documents in this department'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'departments'
        verbose_name = 'Department'
        verbose_name_plural = 'Departments'
        ordering = ['display_order', 'code']
        # Department code must be unique within each organization
        unique_together = [['organization', 'code']]
        indexes = [
            models.Index(fields=['organization', 'is_active']),
            models.Index(fields=['display_order']),
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"

    @property
    def root_path(self):
        """Returns the department code as root path element for folder paths."""
        return f"/{self.code}/"

    @property
    def storage_used_gb(self):
        """Returns storage used in gigabytes."""
        return self.storage_used_bytes / (1024 ** 3)

    @property
    def storage_percentage(self):
        """Returns percentage of quota used."""
        if self.storage_quota_gb == 0:
            return 0
        return (self.storage_used_gb / self.storage_quota_gb) * 100

    @property
    def storage_available_bytes(self):
        """Returns available storage in bytes."""
        quota_bytes = self.storage_quota_gb * (1024 ** 3)
        return max(0, quota_bytes - self.storage_used_bytes)

    def has_storage_capacity(self, required_bytes):
        """Check if department has enough storage for the specified bytes."""
        return self.storage_available_bytes >= required_bytes

    def update_storage_used(self):
        """
        Recalculate storage used from all documents in the department.
        Call this periodically or after bulk operations.
        """
        from apps.documents.models import Document
        total = Document.objects.filter(
            department=self,
            is_deleted=False
        ).aggregate(total=models.Sum('file_size'))['total'] or 0
        self.storage_used_bytes = total
        self.save(update_fields=['storage_used_bytes', 'updated_at'])


class CustomUser(AbstractUser):
    """
    Extended user model with additional fields for DFC.

    Security Features:
    - Email domain restriction to cccplc.net (deprecated - now handled by organization)
    - Account lockout after 5 failed login attempts
    - Failed login attempt tracking
    - Multi-factor authentication support
    - Multi-tenant organization support
    """
    employee_id = models.CharField(max_length=50, unique=True)

    # Multi-tenant organization (nullable initially for migration)
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.PROTECT,
        related_name='users',
        null=True,  # Nullable for migration - will be non-null after data migration
        blank=True,
        help_text='Organization this user belongs to'
    )

    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name='employees'
    )

    # Contact Information
    email = models.EmailField(
        unique=True,
        validators=[EmailValidator(), validate_company_email],
        help_text='Must be a valid @cccplc.net email address'
    )
    phone_number = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)

    # Profile Information (from registration)
    job_title = models.CharField(
        max_length=100,
        blank=True,
        help_text='User job title/position'
    )

    # Address Information
    address_line1 = models.CharField(
        max_length=255,
        blank=True,
        help_text='Primary address line'
    )
    address_line2 = models.CharField(
        max_length=255,
        blank=True,
        help_text='Secondary address line (optional)'
    )
    city = models.CharField(
        max_length=100,
        blank=True,
        help_text='City'
    )
    state = models.CharField(
        max_length=100,
        blank=True,
        help_text='State/Province/Region'
    )
    postal_code = models.CharField(
        max_length=20,
        blank=True,
        help_text='Postal/ZIP code'
    )
    country = models.CharField(
        max_length=100,
        blank=True,
        help_text='Country'
    )

    # Compliance & Consent (GDPR, Terms of Service)
    terms_accepted_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Timestamp when user accepted Terms of Service'
    )
    privacy_accepted_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Timestamp when user accepted Privacy Policy'
    )
    marketing_consent = models.BooleanField(
        default=False,
        help_text='User consent for marketing communications'
    )

    # Multi-Factor Authentication
    mfa_enabled = models.BooleanField(default=False)
    mfa_secret = models.CharField(max_length=32, blank=True)

    # Account Security - Failed Login Tracking
    failed_login_attempts = models.IntegerField(
        default=0,
        help_text='Number of consecutive failed login attempts'
    )
    last_failed_login = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Timestamp of last failed login attempt'
    )
    account_locked_until = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Account locked until this timestamp. NULL means not locked.'
    )
    locked_by_failed_attempts = models.BooleanField(
        default=False,
        help_text='True if account was locked due to failed login attempts'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)

    # Constants
    MAX_FAILED_LOGIN_ATTEMPTS = 5
    LOCKOUT_DURATION_HOURS = 24  # Account locked for 24 hours after max attempts

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['employee_id']),
            models.Index(fields=['department']),
            models.Index(fields=['account_locked_until']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.username} ({self.employee_id})"

    @property
    def full_name(self):
        """Return user's full name"""
        return f"{self.first_name} {self.last_name}".strip() or self.username

    @property
    def is_account_locked(self):
        """
        Check if account is currently locked.
        Automatically unlocks if lockout period has expired.
        """
        if self.account_locked_until:
            if timezone.now() < self.account_locked_until:
                return True
            else:
                # Lockout period expired, unlock account
                self.unlock_account()
                return False
        return False

    @property
    def remaining_login_attempts(self):
        """Calculate remaining login attempts before account lockout"""
        return max(0, self.MAX_FAILED_LOGIN_ATTEMPTS - self.failed_login_attempts)

    def record_failed_login(self):
        """
        Record a failed login attempt.
        Locks account if max attempts reached.
        Returns dict with lockout status and remaining attempts.
        """
        self.failed_login_attempts += 1
        self.last_failed_login = timezone.now()

        # Check if max attempts reached
        if self.failed_login_attempts >= self.MAX_FAILED_LOGIN_ATTEMPTS:
            self.lock_account()
            self.save(update_fields=[
                'failed_login_attempts',
                'last_failed_login',
                'account_locked_until',
                'locked_by_failed_attempts',
                'updated_at'
            ])

            # Send account locked email notification
            try:
                from apps.users.emails import send_account_locked_email
                send_account_locked_email(self)
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to send account locked email: {str(e)}")

            return {
                'locked': True,
                'remaining_attempts': 0,
                'locked_until': self.account_locked_until,
                'message': (
                    f'Your account has been locked due to {self.MAX_FAILED_LOGIN_ATTEMPTS} '
                    f'consecutive failed login attempts. Please contact your system '
                    f'administrator to unlock your account or reset your password. '
                    f'Account will be automatically unlocked after {self.LOCKOUT_DURATION_HOURS} hours.'
                )
            }
        else:
            self.save(update_fields=['failed_login_attempts', 'last_failed_login', 'updated_at'])
            remaining = self.remaining_login_attempts
            return {
                'locked': False,
                'remaining_attempts': remaining,
                'message': (
                    f'Invalid credentials. You have {remaining} login attempt(s) remaining '
                    f'before your account is locked.'
                )
            }

    def record_successful_login(self, ip_address=None):
        """
        Record a successful login and reset failed attempt counter.
        """
        self.failed_login_attempts = 0
        self.last_failed_login = None
        self.last_login_ip = ip_address
        self.save(update_fields=[
            'failed_login_attempts',
            'last_failed_login',
            'last_login_ip',
            'updated_at'
        ])

    def lock_account(self):
        """Lock the account for LOCKOUT_DURATION_HOURS"""
        self.account_locked_until = timezone.now() + timedelta(hours=self.LOCKOUT_DURATION_HOURS)
        self.locked_by_failed_attempts = True

    def unlock_account(self):
        """
        Unlock the account and reset failed login attempts.
        This should be called by admin or automatically after lockout period.
        """
        self.failed_login_attempts = 0
        self.account_locked_until = None
        self.locked_by_failed_attempts = False
        self.last_failed_login = None
        self.save(update_fields=[
            'failed_login_attempts',
            'account_locked_until',
            'locked_by_failed_attempts',
            'last_failed_login',
            'updated_at'
        ])

    def clean(self):
        """
        Validate model data before saving.
        Ensures email domain compliance.
        """
        super().clean()
        if self.email:
            validate_company_email(self.email)

    def save(self, *args, **kwargs):
        """Override save to run full validation"""
        self.full_clean()
        super().save(*args, **kwargs)


# Import MFA models
from apps.users.mfa_models import MFABackupCode, MFASettings

# Import Password History models
from apps.users.models_password_history import (
    PasswordHistory,
    PasswordResetAttempt,
    PasswordResetToken
)

# Import OTP models
from apps.users.models_otp import EmailOTP, PhoneOTP

# Import Favorites models
from apps.users.models_favorites import FavoriteFolder, FavoriteDocument

# Import Settings models
from apps.users.settings_models import UserPreferences, NotificationSettings, SecuritySettings

# Import Department-related models (Department-as-Root architecture)
from apps.users.models_department import (
    DepartmentSettings,
    CrossDepartmentAccess,
    DepartmentAccessRequest
)
