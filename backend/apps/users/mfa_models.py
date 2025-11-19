"""
MFA (Multi-Factor Authentication) models for backup codes.

This module provides backup code functionality for MFA, allowing users
to access their accounts when they don't have access to their TOTP device.
"""

import secrets
import hashlib
from django.db import models
from django.conf import settings
from django.utils import timezone


class MFABackupCode(models.Model):
    """
    Backup codes for MFA recovery.

    Users get 10 backup codes when enabling MFA. Each code can only be used once.
    Codes are hashed using SHA-256 for security.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='mfa_backup_codes'
    )
    code_hash = models.CharField(max_length=64, unique=True, db_index=True)
    used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)
    used_from_ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'mfa_backup_codes'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['used', 'user']),
        ]

    def __str__(self):
        return f"Backup code for {self.user.email} ({'used' if self.used else 'unused'})"

    @staticmethod
    def generate_code():
        """
        Generate a random 8-character alphanumeric backup code.
        Format: XXXX-XXXX for readability.
        """
        # Generate 8 random characters
        code = ''.join(secrets.choice('ABCDEFGHJKLMNPQRSTUVWXYZ23456789') for _ in range(8))
        # Format with dash for readability
        return f"{code[:4]}-{code[4:]}"

    @staticmethod
    def hash_code(code):
        """Hash a backup code using SHA-256."""
        # Remove dash and convert to uppercase for consistency
        normalized_code = code.replace('-', '').upper()
        return hashlib.sha256(normalized_code.encode()).hexdigest()

    def verify_code(self, code):
        """
        Verify if the provided code matches this backup code.
        Returns True if the code matches and hasn't been used.
        """
        if self.used:
            return False

        code_hash = self.hash_code(code)
        return code_hash == self.code_hash

    def mark_as_used(self, ip_address=None):
        """Mark this backup code as used."""
        self.used = True
        self.used_at = timezone.now()
        self.used_from_ip = ip_address
        self.save(update_fields=['used', 'used_at', 'used_from_ip'])

    @classmethod
    def generate_codes_for_user(cls, user, count=10):
        """
        Generate backup codes for a user.
        Returns a list of (code, MFABackupCode instance) tuples.
        The plain codes should be displayed to the user only once.
        """
        # Delete any existing unused backup codes
        cls.objects.filter(user=user, used=False).delete()

        codes = []
        for _ in range(count):
            plain_code = cls.generate_code()
            code_hash = cls.hash_code(plain_code)

            backup_code = cls.objects.create(
                user=user,
                code_hash=code_hash
            )
            codes.append((plain_code, backup_code))

        return codes

    @classmethod
    def verify_and_use_code(cls, user, code, ip_address=None):
        """
        Verify a backup code and mark it as used if valid.
        Returns True if the code was valid and unused, False otherwise.
        """
        code_hash = cls.hash_code(code)

        try:
            backup_code = cls.objects.get(
                user=user,
                code_hash=code_hash,
                used=False
            )
            backup_code.mark_as_used(ip_address)
            return True
        except cls.DoesNotExist:
            return False

    @classmethod
    def get_unused_count(cls, user):
        """Get the number of unused backup codes for a user."""
        return cls.objects.filter(user=user, used=False).count()


class MFASettings(models.Model):
    """
    User-specific MFA settings and preferences.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='mfa_settings',
        primary_key=True
    )

    # MFA enforcement
    mfa_enabled = models.BooleanField(default=False)
    mfa_enforced = models.BooleanField(
        default=False,
        help_text='If True, user cannot disable MFA (admin/superuser enforcement)'
    )

    # TOTP setup
    totp_enabled = models.BooleanField(default=False)
    totp_confirmed = models.BooleanField(default=False)
    totp_confirmed_at = models.DateTimeField(null=True, blank=True)

    # Timestamps
    enabled_at = models.DateTimeField(null=True, blank=True)
    disabled_at = models.DateTimeField(null=True, blank=True)
    last_verified_at = models.DateTimeField(null=True, blank=True)

    # Statistics
    verification_failures = models.IntegerField(default=0)
    last_failure_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'mfa_settings'
        verbose_name = 'MFA Settings'
        verbose_name_plural = 'MFA Settings'

    def __str__(self):
        return f"MFA Settings for {self.user.email}"

    def enable_mfa(self):
        """Enable MFA for the user."""
        self.mfa_enabled = True
        self.enabled_at = timezone.now()
        self.disabled_at = None
        self.save(update_fields=['mfa_enabled', 'enabled_at', 'disabled_at'])

    def disable_mfa(self):
        """Disable MFA for the user (only if not enforced)."""
        if self.mfa_enforced:
            raise ValueError("Cannot disable MFA - it is enforced for this user")

        self.mfa_enabled = False
        self.totp_enabled = False
        self.totp_confirmed = False
        self.disabled_at = timezone.now()
        self.save(update_fields=[
            'mfa_enabled', 'totp_enabled', 'totp_confirmed', 'disabled_at'
        ])

        # Delete all backup codes
        MFABackupCode.objects.filter(user=self.user).delete()

    def confirm_totp(self):
        """Confirm TOTP setup."""
        self.totp_confirmed = True
        self.totp_confirmed_at = timezone.now()
        self.save(update_fields=['totp_confirmed', 'totp_confirmed_at'])

    def record_verification_success(self):
        """Record a successful MFA verification."""
        self.last_verified_at = timezone.now()
        self.verification_failures = 0
        self.save(update_fields=['last_verified_at', 'verification_failures'])

    def record_verification_failure(self):
        """Record a failed MFA verification attempt."""
        self.verification_failures += 1
        self.last_failure_at = timezone.now()
        self.save(update_fields=['verification_failures', 'last_failure_at'])

    @property
    def is_fully_configured(self):
        """Check if MFA is fully configured and ready to use."""
        return self.mfa_enabled and self.totp_confirmed

    @property
    def requires_mfa(self):
        """Check if user requires MFA verification."""
        return self.is_fully_configured
