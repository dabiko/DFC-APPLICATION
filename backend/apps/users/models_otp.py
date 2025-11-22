"""
OTP (One-Time Password) models for email and phone verification.
"""
from django.db import models
from django.utils import timezone
from datetime import timedelta
import random
import string


class EmailOTP(models.Model):
    """
    Email OTP verification model for user registration.

    Features:
    - 6-digit numeric code
    - 10-minute expiry
    - Single-use validation
    - Rate limiting support
    """
    email = models.EmailField(
        db_index=True,
        help_text='Email address to verify'
    )
    code = models.CharField(
        max_length=6,
        help_text='6-digit OTP code'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(
        help_text='Expiration timestamp'
    )
    is_used = models.BooleanField(
        default=False,
        help_text='Whether this OTP has been used'
    )
    is_verified = models.BooleanField(
        default=False,
        help_text='Whether verification was successful'
    )
    verified_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Timestamp when OTP was verified'
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text='IP address that requested the OTP'
    )
    attempts = models.IntegerField(
        default=0,
        help_text='Number of verification attempts'
    )

    # Constants
    CODE_LENGTH = 6
    EXPIRY_MINUTES = 10
    MAX_ATTEMPTS = 5
    RESEND_COOLDOWN_SECONDS = 60  # 1 minute cooldown between resends

    class Meta:
        db_table = 'email_otp'
        verbose_name = 'Email OTP'
        verbose_name_plural = 'Email OTPs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email', '-created_at']),
            models.Index(fields=['code']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"{self.email} - {self.code} ({'Verified' if self.is_verified else 'Pending'})"

    @classmethod
    def generate_code(cls):
        """Generate a random 6-digit OTP code."""
        return ''.join(random.choices(string.digits, k=cls.CODE_LENGTH))

    @classmethod
    def create_otp(cls, email, ip_address=None):
        """
        Create a new OTP for the given email.

        Args:
            email: Email address to send OTP to
            ip_address: Optional IP address of requester

        Returns:
            EmailOTP instance
        """
        code = cls.generate_code()
        expires_at = timezone.now() + timedelta(minutes=cls.EXPIRY_MINUTES)

        return cls.objects.create(
            email=email,
            code=code,
            expires_at=expires_at,
            ip_address=ip_address
        )

    @classmethod
    def can_resend(cls, email):
        """
        Check if a new OTP can be sent to this email (rate limiting).

        Args:
            email: Email address to check

        Returns:
            tuple: (can_resend: bool, seconds_remaining: int)
        """
        # Get the most recent OTP for this email
        latest_otp = cls.objects.filter(email=email).order_by('-created_at').first()

        if not latest_otp:
            return True, 0

        # Check if enough time has passed since last OTP
        cooldown_end = latest_otp.created_at + timedelta(seconds=cls.RESEND_COOLDOWN_SECONDS)
        now = timezone.now()

        if now < cooldown_end:
            seconds_remaining = int((cooldown_end - now).total_seconds())
            return False, seconds_remaining

        return True, 0

    @property
    def is_expired(self):
        """Check if this OTP has expired."""
        return timezone.now() > self.expires_at

    @property
    def is_valid(self):
        """Check if this OTP is valid (not used, not expired)."""
        return not self.is_used and not self.is_expired

    @property
    def seconds_until_expiry(self):
        """Get seconds remaining until expiry."""
        if self.is_expired:
            return 0
        return int((self.expires_at - timezone.now()).total_seconds())

    def verify(self, code):
        """
        Verify if the provided code matches this OTP.

        Args:
            code: The code to verify

        Returns:
            dict: Verification result with success status and message
        """
        self.attempts += 1
        self.save(update_fields=['attempts'])

        # Check if too many attempts
        if self.attempts > self.MAX_ATTEMPTS:
            return {
                'success': False,
                'error': 'Too many attempts. Please request a new code.'
            }

        # Check if already used
        if self.is_used:
            return {
                'success': False,
                'error': 'This code has already been used. Please request a new one.'
            }

        # Check if expired
        if self.is_expired:
            return {
                'success': False,
                'error': 'This code has expired. Please request a new one.'
            }

        # Verify code
        if self.code != code:
            remaining_attempts = self.MAX_ATTEMPTS - self.attempts
            return {
                'success': False,
                'error': f'Invalid code. {remaining_attempts} attempt(s) remaining.'
            }

        # Success - mark as verified
        self.is_used = True
        self.is_verified = True
        self.verified_at = timezone.now()
        self.save(update_fields=['is_used', 'is_verified', 'verified_at'])

        return {
            'success': True,
            'message': 'Email verified successfully!'
        }

    @classmethod
    def cleanup_expired(cls):
        """Delete expired OTPs older than 24 hours."""
        cutoff_time = timezone.now() - timedelta(hours=24)
        cls.objects.filter(expires_at__lt=cutoff_time).delete()

    @classmethod
    def is_email_verified(cls, email):
        """
        Check if an email has been successfully verified.

        Args:
            email: Email address to check

        Returns:
            bool: True if email has been verified
        """
        return cls.objects.filter(
            email=email,
            is_verified=True
        ).exists()


class PhoneOTP(models.Model):
    """
    Phone OTP verification model for user registration.
    Similar to EmailOTP but for phone numbers.
    """
    phone_number = models.CharField(
        max_length=20,
        db_index=True,
        help_text='Phone number to verify (with country code)'
    )
    code = models.CharField(
        max_length=6,
        help_text='6-digit OTP code'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(
        help_text='Expiration timestamp'
    )
    is_used = models.BooleanField(
        default=False,
        help_text='Whether this OTP has been used'
    )
    is_verified = models.BooleanField(
        default=False,
        help_text='Whether verification was successful'
    )
    verified_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Timestamp when OTP was verified'
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text='IP address that requested the OTP'
    )
    attempts = models.IntegerField(
        default=0,
        help_text='Number of verification attempts'
    )

    # Constants
    CODE_LENGTH = 6
    EXPIRY_MINUTES = 10
    MAX_ATTEMPTS = 5
    RESEND_COOLDOWN_SECONDS = 60

    class Meta:
        db_table = 'phone_otp'
        verbose_name = 'Phone OTP'
        verbose_name_plural = 'Phone OTPs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['phone_number', '-created_at']),
            models.Index(fields=['code']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"{self.phone_number} - {self.code} ({'Verified' if self.is_verified else 'Pending'})"

    @classmethod
    def generate_code(cls):
        """Generate a random 6-digit OTP code."""
        return ''.join(random.choices(string.digits, k=cls.CODE_LENGTH))

    @classmethod
    def create_otp(cls, phone_number, ip_address=None):
        """
        Create a new OTP for the given phone number.

        Args:
            phone_number: Phone number to send OTP to
            ip_address: Optional IP address of requester

        Returns:
            PhoneOTP instance
        """
        code = cls.generate_code()
        expires_at = timezone.now() + timedelta(minutes=cls.EXPIRY_MINUTES)

        return cls.objects.create(
            phone_number=phone_number,
            code=code,
            expires_at=expires_at,
            ip_address=ip_address
        )

    @classmethod
    def can_resend(cls, phone_number):
        """
        Check if a new OTP can be sent to this phone (rate limiting).

        Args:
            phone_number: Phone number to check

        Returns:
            tuple: (can_resend: bool, seconds_remaining: int)
        """
        latest_otp = cls.objects.filter(phone_number=phone_number).order_by('-created_at').first()

        if not latest_otp:
            return True, 0

        cooldown_end = latest_otp.created_at + timedelta(seconds=cls.RESEND_COOLDOWN_SECONDS)
        now = timezone.now()

        if now < cooldown_end:
            seconds_remaining = int((cooldown_end - now).total_seconds())
            return False, seconds_remaining

        return True, 0

    @property
    def is_expired(self):
        """Check if this OTP has expired."""
        return timezone.now() > self.expires_at

    @property
    def is_valid(self):
        """Check if this OTP is valid (not used, not expired)."""
        return not self.is_used and not self.is_expired

    @property
    def seconds_until_expiry(self):
        """Get seconds remaining until expiry."""
        if self.is_expired:
            return 0
        return int((self.expires_at - timezone.now()).total_seconds())

    def verify(self, code):
        """
        Verify if the provided code matches this OTP.

        Args:
            code: The code to verify

        Returns:
            dict: Verification result with success status and message
        """
        self.attempts += 1
        self.save(update_fields=['attempts'])

        if self.attempts > self.MAX_ATTEMPTS:
            return {
                'success': False,
                'error': 'Too many attempts. Please request a new code.'
            }

        if self.is_used:
            return {
                'success': False,
                'error': 'This code has already been used. Please request a new one.'
            }

        if self.is_expired:
            return {
                'success': False,
                'error': 'This code has expired. Please request a new one.'
            }

        if self.code != code:
            remaining_attempts = self.MAX_ATTEMPTS - self.attempts
            return {
                'success': False,
                'error': f'Invalid code. {remaining_attempts} attempt(s) remaining.'
            }

        # Success
        self.is_used = True
        self.is_verified = True
        self.verified_at = timezone.now()
        self.save(update_fields=['is_used', 'is_verified', 'verified_at'])

        return {
            'success': True,
            'message': 'Phone number verified successfully!'
        }

    @classmethod
    def cleanup_expired(cls):
        """Delete expired OTPs older than 24 hours."""
        cutoff_time = timezone.now() - timedelta(hours=24)
        cls.objects.filter(expires_at__lt=cutoff_time).delete()

    @classmethod
    def is_phone_verified(cls, phone_number):
        """
        Check if a phone number has been successfully verified.

        Args:
            phone_number: Phone number to check

        Returns:
            bool: True if phone has been verified
        """
        return cls.objects.filter(
            phone_number=phone_number,
            is_verified=True
        ).exists()
