"""
Password History Model
Tracks user password changes to prevent password reuse
"""
from django.db import models
from django.conf import settings
from django.utils import timezone


class PasswordHistory(models.Model):
    """
    Stores hashed passwords for password history enforcement.
    Prevents users from reusing recent passwords.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='password_history'
    )
    password_hash = models.CharField(max_length=255)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'users_password_history'
        ordering = ['-created_at']
        verbose_name = 'Password History'
        verbose_name_plural = 'Password Histories'
        indexes = [
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"


class PasswordResetAttempt(models.Model):
    """
    Tracks password reset attempts for rate limiting and security monitoring.
    """
    email = models.EmailField()
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True, null=True)
    success = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    # Geolocation data (optional, for enhanced security)
    country = models.CharField(max_length=100, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'users_password_reset_attempt'
        ordering = ['-created_at']
        verbose_name = 'Password Reset Attempt'
        verbose_name_plural = 'Password Reset Attempts'
        indexes = [
            models.Index(fields=['email', '-created_at']),
            models.Index(fields=['ip_address', '-created_at']),
        ]

    def __str__(self):
        return f"{self.email} from {self.ip_address} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"


class PasswordResetToken(models.Model):
    """
    Stores password reset tokens with expiry tracking.
    Allows for token validation without parsing.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reset_tokens'
    )
    token = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'users_password_reset_token'
        ordering = ['-created_at']
        verbose_name = 'Password Reset Token'
        verbose_name_plural = 'Password Reset Tokens'
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"

    def is_valid(self):
        """Check if token is still valid"""
        if self.used_at:
            return False
        return timezone.now() < self.expires_at

    def mark_as_used(self):
        """Mark token as used"""
        self.used_at = timezone.now()
        self.save()
