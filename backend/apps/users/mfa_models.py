"""
MFA (Multi-Factor Authentication) models.

This module provides:
- Backup code functionality for MFA recovery
- MFA settings per user
- Trusted device management
- MFA enforcement policies
- Risk-based authentication data
"""

import secrets
import hashlib
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta


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

    @classmethod
    def cleanup_old_used_codes(cls, days=90):
        """
        Delete used backup codes older than specified days.
        Returns tuple: (deleted_count, deleted_user_ids)
        """
        cutoff_date = timezone.now() - timedelta(days=days)
        old_codes = cls.objects.filter(
            used=True,
            used_at__lt=cutoff_date
        )

        # Get user IDs for audit logging
        user_ids = list(old_codes.values_list('user_id', flat=True).distinct())
        deleted_count = old_codes.count()

        # Delete the old codes
        old_codes.delete()

        return (deleted_count, user_ids)


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

    # Backup code regeneration tracking (for rate limiting)
    backup_codes_regenerated_count = models.IntegerField(
        default=0,
        help_text='Number of times backup codes have been regenerated in the current period'
    )
    backup_codes_regenerated_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Last time backup codes were regenerated'
    )
    backup_codes_regeneration_reset_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the regeneration counter was last reset (24h window start)'
    )

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

    # Backup code regeneration rate limiting constants
    REGENERATION_MAX_PER_DAY = 3
    REGENERATION_COOLDOWN_MINUTES = 5

    def can_regenerate_backup_codes(self):
        """
        Check if user can regenerate backup codes.
        Returns tuple: (can_regenerate: bool, reason: str, wait_seconds: int)
        """
        now = timezone.now()

        # Check cooldown (5 minutes between regenerations)
        if self.backup_codes_regenerated_at:
            cooldown_end = self.backup_codes_regenerated_at + timedelta(minutes=self.REGENERATION_COOLDOWN_MINUTES)
            if now < cooldown_end:
                wait_seconds = int((cooldown_end - now).total_seconds())
                return (False, f'Please wait {wait_seconds // 60} minutes and {wait_seconds % 60} seconds before regenerating again', wait_seconds)

        # Check rate limit (3 per 24 hours)
        # Reset counter if 24 hours have passed since the reset time
        if self.backup_codes_regeneration_reset_at:
            reset_window_end = self.backup_codes_regeneration_reset_at + timedelta(hours=24)
            if now >= reset_window_end:
                # Reset the counter - 24 hours have passed
                self.backup_codes_regenerated_count = 0
                self.backup_codes_regeneration_reset_at = now
                self.save(update_fields=['backup_codes_regenerated_count', 'backup_codes_regeneration_reset_at'])

        if self.backup_codes_regenerated_count >= self.REGENERATION_MAX_PER_DAY:
            if self.backup_codes_regeneration_reset_at:
                reset_time = self.backup_codes_regeneration_reset_at + timedelta(hours=24)
                wait_seconds = int((reset_time - now).total_seconds())
                hours = wait_seconds // 3600
                minutes = (wait_seconds % 3600) // 60
                return (False, f'Daily limit reached ({self.REGENERATION_MAX_PER_DAY} regenerations per 24 hours). Try again in {hours} hours and {minutes} minutes', wait_seconds)
            return (False, f'Daily limit reached ({self.REGENERATION_MAX_PER_DAY} regenerations per 24 hours)', 0)

        return (True, '', 0)

    def record_backup_code_regeneration(self):
        """Record a successful backup code regeneration."""
        now = timezone.now()

        # Initialize reset time if not set or if 24 hours have passed
        if not self.backup_codes_regeneration_reset_at:
            self.backup_codes_regeneration_reset_at = now
            self.backup_codes_regenerated_count = 0
        elif now >= self.backup_codes_regeneration_reset_at + timedelta(hours=24):
            self.backup_codes_regeneration_reset_at = now
            self.backup_codes_regenerated_count = 0

        self.backup_codes_regenerated_count += 1
        self.backup_codes_regenerated_at = now
        self.save(update_fields=[
            'backup_codes_regenerated_count',
            'backup_codes_regenerated_at',
            'backup_codes_regeneration_reset_at'
        ])

    def get_regeneration_stats(self):
        """Get current regeneration statistics."""
        now = timezone.now()
        remaining = self.REGENERATION_MAX_PER_DAY - self.backup_codes_regenerated_count

        # Check if we need to reset
        if self.backup_codes_regeneration_reset_at:
            reset_window_end = self.backup_codes_regeneration_reset_at + timedelta(hours=24)
            if now >= reset_window_end:
                remaining = self.REGENERATION_MAX_PER_DAY

        return {
            'regenerations_today': self.backup_codes_regenerated_count,
            'regenerations_remaining': max(0, remaining),
            'max_per_day': self.REGENERATION_MAX_PER_DAY,
            'last_regenerated_at': self.backup_codes_regenerated_at,
            'cooldown_minutes': self.REGENERATION_COOLDOWN_MINUTES,
        }


class TrustedDevice(models.Model):
    """
    Trusted devices for MFA bypass.

    When a user marks a device as trusted during MFA verification,
    they won't need to verify MFA again on that device for a specified period.
    """

    DEVICE_TYPE_CHOICES = [
        ('desktop', 'Desktop'),
        ('laptop', 'Laptop'),
        ('mobile', 'Mobile'),
        ('tablet', 'Tablet'),
        ('other', 'Other'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='trusted_devices'
    )
    device_id = models.CharField(
        max_length=64,
        db_index=True,
        help_text='Unique device fingerprint hash'
    )
    device_name = models.CharField(
        max_length=255,
        blank=True,
        help_text='User-friendly device name (e.g., "Chrome on Windows")'
    )
    device_type = models.CharField(
        max_length=20,
        choices=DEVICE_TYPE_CHOICES,
        default='other'
    )
    user_agent = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    location = models.CharField(
        max_length=255,
        blank=True,
        help_text='Approximate location based on IP'
    )

    # Trust period
    trusted_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    last_used_at = models.DateTimeField(auto_now=True)

    # Revocation
    is_revoked = models.BooleanField(default=False)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoked_reason = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = 'mfa_trusted_devices'
        ordering = ['-last_used_at']
        unique_together = ['user', 'device_id']
        indexes = [
            models.Index(fields=['user', '-last_used_at']),
            models.Index(fields=['device_id']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"{self.device_name or 'Unknown device'} for {self.user.email}"

    @property
    def is_valid(self):
        """Check if the device trust is still valid."""
        if self.is_revoked:
            return False
        return timezone.now() < self.expires_at

    @property
    def is_expired(self):
        """Check if the device trust has expired."""
        return timezone.now() >= self.expires_at

    def revoke(self, reason=''):
        """Revoke trust for this device."""
        self.is_revoked = True
        self.revoked_at = timezone.now()
        self.revoked_reason = reason
        self.save(update_fields=['is_revoked', 'revoked_at', 'revoked_reason'])

    def extend_trust(self, days=30):
        """Extend the trust period for this device."""
        self.expires_at = timezone.now() + timedelta(days=days)
        self.save(update_fields=['expires_at'])

    @classmethod
    def create_trusted_device(cls, user, device_fingerprint, device_name='',
                               device_type='other', user_agent='', ip_address=None,
                               location='', trust_days=30):
        """
        Create or update a trusted device for a user.
        Returns the TrustedDevice instance.
        """
        # Hash the device fingerprint for storage
        device_id = hashlib.sha256(device_fingerprint.encode()).hexdigest()

        device, created = cls.objects.update_or_create(
            user=user,
            device_id=device_id,
            defaults={
                'device_name': device_name,
                'device_type': device_type,
                'user_agent': user_agent,
                'ip_address': ip_address,
                'location': location,
                'expires_at': timezone.now() + timedelta(days=trust_days),
                'is_revoked': False,
                'revoked_at': None,
                'revoked_reason': '',
            }
        )
        return device

    @classmethod
    def is_device_trusted(cls, user, device_fingerprint):
        """
        Check if a device is trusted for a user.
        Returns True if the device is trusted and valid.
        """
        device_id = hashlib.sha256(device_fingerprint.encode()).hexdigest()

        try:
            device = cls.objects.get(
                user=user,
                device_id=device_id,
                is_revoked=False
            )
            if device.is_valid:
                # Update last used timestamp
                device.save(update_fields=['last_used_at'])
                return True
            return False
        except cls.DoesNotExist:
            return False

    @classmethod
    def cleanup_expired_devices(cls):
        """Remove all expired trusted devices."""
        return cls.objects.filter(
            expires_at__lt=timezone.now()
        ).delete()


class MFAEnforcementPolicy(models.Model):
    """
    Organization-wide MFA enforcement policies.

    Allows admins to enforce MFA for specific user groups,
    departments, or based on risk levels.
    """

    ENFORCEMENT_LEVEL_CHOICES = [
        ('optional', 'Optional'),
        ('recommended', 'Recommended'),
        ('required', 'Required'),
        ('strict', 'Strict (No bypass allowed)'),
    ]

    SCOPE_CHOICES = [
        ('all_users', 'All Users'),
        ('admin_users', 'Admin Users Only'),
        ('department', 'Specific Department'),
        ('role', 'Specific Role'),
        ('custom', 'Custom Criteria'),
    ]

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    # Enforcement settings
    enforcement_level = models.CharField(
        max_length=20,
        choices=ENFORCEMENT_LEVEL_CHOICES,
        default='optional'
    )
    scope = models.CharField(
        max_length=20,
        choices=SCOPE_CHOICES,
        default='all_users'
    )

    # Scope criteria (JSON field for flexible configuration)
    scope_criteria = models.JSONField(
        default=dict,
        blank=True,
        help_text='JSON criteria for custom scopes (e.g., {"departments": ["IT", "Finance"]})'
    )

    # Grace period for enforcement
    grace_period_days = models.IntegerField(
        default=7,
        help_text='Days before enforcement becomes mandatory'
    )
    enforcement_start_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When enforcement begins'
    )

    # Allowed MFA methods
    allowed_methods = models.JSONField(
        default=list,
        help_text='List of allowed MFA methods (e.g., ["totp", "sms", "email"])'
    )

    # Notification settings
    send_reminders = models.BooleanField(default=True)
    reminder_days_before = models.JSONField(
        default=list,
        help_text='Days before deadline to send reminders (e.g., [7, 3, 1])'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_mfa_policies'
    )

    class Meta:
        db_table = 'mfa_enforcement_policies'
        verbose_name = 'MFA Enforcement Policy'
        verbose_name_plural = 'MFA Enforcement Policies'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.enforcement_level})"

    def applies_to_user(self, user):
        """Check if this policy applies to a specific user."""
        if not self.is_active:
            return False

        if self.scope == 'all_users':
            return True
        elif self.scope == 'admin_users':
            return user.is_staff or user.is_superuser
        elif self.scope == 'department':
            user_dept = getattr(user, 'department', None)
            return user_dept in self.scope_criteria.get('departments', [])
        elif self.scope == 'role':
            user_roles = [g.name for g in user.groups.all()]
            return any(role in self.scope_criteria.get('roles', []) for role in user_roles)
        elif self.scope == 'custom':
            # Custom criteria evaluation
            return self._evaluate_custom_criteria(user)

        return False

    def _evaluate_custom_criteria(self, user):
        """Evaluate custom criteria against a user."""
        # Implement custom logic based on scope_criteria
        return False

    @property
    def is_in_grace_period(self):
        """Check if the policy is currently in grace period."""
        if not self.enforcement_start_date:
            return False
        grace_end = self.enforcement_start_date + timedelta(days=self.grace_period_days)
        return timezone.now() < grace_end


class LoginRiskAssessment(models.Model):
    """
    Risk assessment data for login attempts.

    Used for risk-based authentication to determine if additional
    verification is needed.
    """

    RISK_LEVEL_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='login_risk_assessments'
    )

    # Request details
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    device_fingerprint = models.CharField(max_length=64, blank=True)

    # Location data
    country = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    is_vpn = models.BooleanField(default=False)
    is_tor = models.BooleanField(default=False)

    # Risk factors
    risk_level = models.CharField(
        max_length=20,
        choices=RISK_LEVEL_CHOICES,
        default='low'
    )
    risk_score = models.IntegerField(
        default=0,
        help_text='Risk score from 0-100'
    )
    risk_factors = models.JSONField(
        default=list,
        help_text='List of detected risk factors'
    )

    # Behavioral analysis
    is_new_device = models.BooleanField(default=False)
    is_new_location = models.BooleanField(default=False)
    is_unusual_time = models.BooleanField(default=False)
    failed_attempts_24h = models.IntegerField(default=0)

    # Actions taken
    mfa_required = models.BooleanField(default=False)
    login_blocked = models.BooleanField(default=False)
    additional_verification_required = models.BooleanField(default=False)

    # Outcome
    login_successful = models.BooleanField(null=True)
    assessed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'mfa_login_risk_assessments'
        ordering = ['-assessed_at']
        indexes = [
            models.Index(fields=['user', '-assessed_at']),
            models.Index(fields=['ip_address']),
            models.Index(fields=['risk_level']),
        ]

    def __str__(self):
        return f"Risk assessment for {self.user.email} at {self.assessed_at}"

    @classmethod
    def assess_login_risk(cls, user, ip_address, user_agent, device_fingerprint=''):
        """
        Perform risk assessment for a login attempt.
        Returns a LoginRiskAssessment instance.
        """
        risk_factors = []
        risk_score = 0

        # Check for new device
        device_id = hashlib.sha256(device_fingerprint.encode()).hexdigest() if device_fingerprint else ''
        is_new_device = not TrustedDevice.objects.filter(
            user=user,
            device_id=device_id,
            is_revoked=False
        ).exists() if device_id else True

        if is_new_device:
            risk_factors.append('new_device')
            risk_score += 20

        # Check for new IP/location
        recent_ips = cls.objects.filter(
            user=user,
            assessed_at__gte=timezone.now() - timedelta(days=30),
            login_successful=True
        ).values_list('ip_address', flat=True).distinct()

        is_new_location = ip_address not in list(recent_ips)
        if is_new_location:
            risk_factors.append('new_location')
            risk_score += 15

        # Check failed attempts in last 24 hours
        failed_attempts = cls.objects.filter(
            user=user,
            assessed_at__gte=timezone.now() - timedelta(hours=24),
            login_successful=False
        ).count()

        if failed_attempts >= 5:
            risk_factors.append('multiple_failed_attempts')
            risk_score += 30
        elif failed_attempts >= 3:
            risk_factors.append('some_failed_attempts')
            risk_score += 15

        # Check for unusual time (outside 6 AM - 10 PM local time)
        current_hour = timezone.now().hour
        is_unusual_time = current_hour < 6 or current_hour > 22
        if is_unusual_time:
            risk_factors.append('unusual_time')
            risk_score += 10

        # Determine risk level
        if risk_score >= 70:
            risk_level = 'critical'
        elif risk_score >= 50:
            risk_level = 'high'
        elif risk_score >= 25:
            risk_level = 'medium'
        else:
            risk_level = 'low'

        # Determine actions
        mfa_required = risk_level in ['medium', 'high', 'critical']
        login_blocked = risk_level == 'critical' and failed_attempts >= 10
        additional_verification = risk_level == 'high'

        # Create assessment record
        assessment = cls.objects.create(
            user=user,
            ip_address=ip_address,
            user_agent=user_agent,
            device_fingerprint=device_id,
            risk_level=risk_level,
            risk_score=risk_score,
            risk_factors=risk_factors,
            is_new_device=is_new_device,
            is_new_location=is_new_location,
            is_unusual_time=is_unusual_time,
            failed_attempts_24h=failed_attempts,
            mfa_required=mfa_required,
            login_blocked=login_blocked,
            additional_verification_required=additional_verification,
        )

        return assessment

    def mark_login_outcome(self, successful):
        """Record the outcome of the login attempt."""
        self.login_successful = successful
        self.save(update_fields=['login_successful'])
