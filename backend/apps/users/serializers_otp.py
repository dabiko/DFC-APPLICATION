"""
Serializers for OTP verification during registration.
"""
from rest_framework import serializers
from apps.users.models_otp import EmailOTP, PhoneOTP


class SendEmailOTPSerializer(serializers.Serializer):
    """Serializer for sending email OTP."""
    email = serializers.EmailField(required=True)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)

    def validate_email(self, value):
        """
        Validate email domain (business email only).
        """
        # Personal email domains to block
        PERSONAL_EMAIL_DOMAINS = [
            'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
            'aol.com', 'icloud.com', 'mail.com', 'protonmail.com',
            'yandex.com', 'zoho.com', 'gmx.com', 'live.com',
            'msn.com', 'me.com', 'mac.com', 'inbox.com'
        ]

        # Extract domain from email
        try:
            domain = value.split('@')[1].lower()
        except IndexError:
            raise serializers.ValidationError('Invalid email format.')

        # Check if it's a personal email domain
        if domain in PERSONAL_EMAIL_DOMAINS:
            raise serializers.ValidationError(
                f'Personal email addresses ({domain}) are not allowed. '
                'Please use your company email address.'
            )

        # Additional validation: domain should have a proper format
        if '.' not in domain:
            raise serializers.ValidationError('Invalid email domain.')

        return value.lower()


class VerifyEmailOTPSerializer(serializers.Serializer):
    """Serializer for verifying email OTP."""
    email = serializers.EmailField(required=True)
    code = serializers.CharField(required=True, min_length=6, max_length=6)

    def validate_code(self, value):
        """Ensure code is 6 digits."""
        if not value.isdigit():
            raise serializers.ValidationError('Code must be 6 digits.')
        return value


class SendPhoneOTPSerializer(serializers.Serializer):
    """Serializer for sending phone OTP."""
    phone_number = serializers.CharField(required=True, max_length=20)
    country_code = serializers.CharField(required=False, allow_blank=True)

    def validate_phone_number(self, value):
        """Validate phone number format."""
        # Remove all non-digit characters for validation
        digits_only = ''.join(filter(str.isdigit, value))

        if len(digits_only) < 6:
            raise serializers.ValidationError('Phone number is too short.')

        if len(digits_only) > 15:
            raise serializers.ValidationError('Phone number is too long.')

        return value


class VerifyPhoneOTPSerializer(serializers.Serializer):
    """Serializer for verifying phone OTP."""
    phone_number = serializers.CharField(required=True, max_length=20)
    code = serializers.CharField(required=True, min_length=6, max_length=6)

    def validate_code(self, value):
        """Ensure code is 6 digits."""
        if not value.isdigit():
            raise serializers.ValidationError('Code must be 6 digits.')
        return value
