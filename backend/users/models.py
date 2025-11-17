from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    """
    Custom User model for DFC application
    Extends Django's AbstractUser with role and department fields
    """

    class Role(models.TextChoices):
        VIEWER = 'viewer', 'Viewer'
        EDITOR = 'editor', 'Editor'
        MANAGER = 'manager', 'Manager'
        ADMIN = 'admin', 'Admin'

    class Department(models.TextChoices):
        ENGAGEMENTS = 'Engagements', 'Engagements'
        ACCOUNTING = 'Accounting', 'Accounting'
        IT = 'IT', 'IT'
        COMPLIANCE = 'Compliance', 'Compliance'
        RISK = 'Risk', 'Risk'
        AUDIT = 'Audit', 'Audit'

    # Override email to make it unique and required
    email = models.EmailField(unique=True, blank=False)

    # Additional fields
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.VIEWER,
        help_text="User's role in the system"
    )

    department = models.CharField(
        max_length=50,
        choices=Department.choices,
        help_text="User's department"
    )

    mfa_enabled = models.BooleanField(
        default=False,
        help_text="Whether Multi-Factor Authentication is enabled"
    )

    avatar = models.ImageField(
        upload_to='avatars/',
        null=True,
        blank=True,
        help_text="User profile picture"
    )

    # Login attempt tracking
    failed_login_attempts = models.IntegerField(
        default=0,
        help_text="Number of consecutive failed login attempts"
    )

    is_locked = models.BooleanField(
        default=False,
        help_text="Account locked due to too many failed login attempts"
    )

    locked_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when account was locked"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Use email as the username field for authentication
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name', 'department']

    # Maximum login attempts before account lockout
    MAX_LOGIN_ATTEMPTS = 5

    class Meta:
        ordering = ['-date_joined']
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"

    def get_full_name(self):
        """Return the user's full name"""
        return f"{self.first_name} {self.last_name}".strip() or self.username

    @property
    def is_admin(self):
        """Check if user has admin role"""
        return self.role == self.Role.ADMIN

    @property
    def is_manager(self):
        """Check if user has manager role or higher"""
        return self.role in [self.Role.MANAGER, self.Role.ADMIN]

    @property
    def is_editor(self):
        """Check if user has editor role or higher"""
        return self.role in [self.Role.EDITOR, self.Role.MANAGER, self.Role.ADMIN]

    def increment_failed_login_attempts(self):
        """Increment failed login attempts and lock account if necessary"""
        from django.utils import timezone

        self.failed_login_attempts += 1

        if self.failed_login_attempts >= self.MAX_LOGIN_ATTEMPTS:
            self.is_locked = True
            self.locked_at = timezone.now()
            self.is_active = False  # Deactivate account

        self.save(update_fields=['failed_login_attempts', 'is_locked', 'locked_at', 'is_active'])

    def reset_failed_login_attempts(self):
        """Reset failed login attempts on successful login"""
        self.failed_login_attempts = 0
        self.save(update_fields=['failed_login_attempts'])

    def unlock_account(self):
        """Unlock account (admin action)"""
        self.failed_login_attempts = 0
        self.is_locked = False
        self.locked_at = None
        self.is_active = True
        self.save(update_fields=['failed_login_attempts', 'is_locked', 'locked_at', 'is_active'])

    @property
    def remaining_login_attempts(self):
        """Get number of remaining login attempts"""
        return max(0, self.MAX_LOGIN_ATTEMPTS - self.failed_login_attempts)
