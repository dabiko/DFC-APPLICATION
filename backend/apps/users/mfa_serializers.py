"""
MFA (Multi-Factor Authentication) serializers.

Handles serialization for:
- MFA setup (TOTP device creation)
- MFA verification
- Backup code management
- MFA status
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django_otp.plugins.otp_totp.models import TOTPDevice
from apps.users.mfa_models import MFABackupCode, MFASettings
import io
import qrcode
import base64

User = get_user_model()


class MFASetupSerializer(serializers.Serializer):
    """
    Serializer for MFA setup initiation.
    Generates TOTP secret and QR code.
    """
    secret = serializers.CharField(read_only=True)
    qr_code = serializers.CharField(read_only=True, help_text="Base64-encoded QR code image")
    backup_codes = serializers.ListField(
        child=serializers.CharField(),
        read_only=True,
        required=False
    )

    def create(self, validated_data):
        """Generate TOTP device and QR code"""
        user = self.context['request'].user

        # Delete any existing unconfirmed devices
        TOTPDevice.objects.filter(user=user, confirmed=False).delete()

        # Create new TOTP device
        device = TOTPDevice.objects.create(
            user=user,
            name=f"{user.email}",
            confirmed=False
        )

        # Generate QR code
        otpauth_url = device.config_url
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(otpauth_url)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()

        return {
            'secret': device.key,
            'qr_code': f"data:image/png;base64,{img_str}"
        }


class MFAConfirmSerializer(serializers.Serializer):
    """
    Serializer for confirming MFA setup.
    Verifies TOTP code and enables MFA.
    """
    token = serializers.CharField(
        max_length=6,
        min_length=6,
        help_text="6-digit TOTP code"
    )
    backup_codes = serializers.ListField(
        child=serializers.CharField(),
        read_only=True
    )

    def validate_token(self, value):
        """Validate TOTP token"""
        user = self.context['request'].user

        # Get unconfirmed device
        device = TOTPDevice.objects.filter(
            user=user,
            confirmed=False
        ).first()

        if not device:
            raise serializers.ValidationError("No MFA setup in progress")

        # Verify token
        if not device.verify_token(value):
            raise serializers.ValidationError("Invalid verification code")

        return value

    def create(self, validated_data):
        """Confirm MFA setup"""
        user = self.context['request'].user

        # Get and confirm device
        device = TOTPDevice.objects.filter(
            user=user,
            confirmed=False
        ).first()

        device.confirmed = True
        device.save()

        # Create or update MFA settings
        mfa_settings, _ = MFASettings.objects.get_or_create(user=user)
        mfa_settings.totp_enabled = True
        mfa_settings.confirm_totp()
        mfa_settings.enable_mfa()

        # Generate backup codes
        codes = MFABackupCode.generate_codes_for_user(user, count=10)
        plain_codes = [code[0] for code in codes]

        return {
            'backup_codes': plain_codes
        }


class MFAVerifySerializer(serializers.Serializer):
    """
    Serializer for MFA verification during login.
    Supports both TOTP tokens and backup codes.
    """
    token = serializers.CharField(
        max_length=9,  # 6 for TOTP, 9 for backup (XXXX-XXXX)
        help_text="6-digit TOTP code or backup code (XXXX-XXXX)"
    )

    def validate_token(self, value):
        """Validate token (TOTP or backup code)"""
        user = self.context['user']

        # Check if it's a backup code (contains dash)
        if '-' in value:
            # Backup code
            ip_address = self.context.get('ip_address')
            if MFABackupCode.verify_and_use_code(user, value, ip_address):
                return value
            raise serializers.ValidationError("Invalid or already used backup code")

        # TOTP token
        device = TOTPDevice.objects.filter(
            user=user,
            confirmed=True
        ).first()

        if not device:
            raise serializers.ValidationError("MFA not configured")

        if not device.verify_token(value):
            raise serializers.ValidationError("Invalid verification code")

        return value

    def create(self, validated_data):
        """Record successful verification"""
        user = self.context['user']

        # Update MFA settings
        mfa_settings, _ = MFASettings.objects.get_or_create(user=user)
        mfa_settings.record_verification_success()

        return {'verified': True}


class MFAStatusSerializer(serializers.ModelSerializer):
    """Serializer for MFA status"""
    is_enforced = serializers.BooleanField(source='mfa_enforced', read_only=True)
    is_enabled = serializers.BooleanField(source='mfa_enabled', read_only=True)
    is_configured = serializers.SerializerMethodField()
    totp_enabled = serializers.BooleanField(read_only=True)
    backup_codes_remaining = serializers.SerializerMethodField()

    class Meta:
        model = MFASettings
        fields = [
            'is_enforced',
            'is_enabled',
            'is_configured',
            'totp_enabled',
            'enabled_at',
            'last_verified_at',
            'backup_codes_remaining',
        ]

    def get_is_configured(self, obj):
        """Check if MFA is fully configured"""
        return obj.is_fully_configured

    def get_backup_codes_remaining(self, obj):
        """Get number of unused backup codes"""
        return MFABackupCode.get_unused_count(obj.user)


class MFADisableSerializer(serializers.Serializer):
    """Serializer for disabling MFA"""
    token = serializers.CharField(
        max_length=6,
        help_text="Current TOTP code to confirm disable"
    )

    def validate_token(self, value):
        """Validate TOTP token before disabling"""
        user = self.context['request'].user

        # Verify token
        device = TOTPDevice.objects.filter(
            user=user,
            confirmed=True
        ).first()

        if not device or not device.verify_token(value):
            raise serializers.ValidationError("Invalid verification code")

        return value

    def create(self, validated_data):
        """Disable MFA"""
        user = self.context['request'].user

        # Get MFA settings
        mfa_settings = MFASettings.objects.get(user=user)

        # Check if MFA is enforced
        if mfa_settings.mfa_enforced:
            raise serializers.ValidationError(
                "Cannot disable MFA - it is enforced for your account"
            )

        # Disable MFA
        mfa_settings.disable_mfa()

        # Delete TOTP devices
        TOTPDevice.objects.filter(user=user).delete()

        return {'disabled': True}


class BackupCodeRegenerateSerializer(serializers.Serializer):
    """Serializer for regenerating backup codes"""
    token = serializers.CharField(
        max_length=6,
        help_text="Current TOTP code to confirm regeneration"
    )
    backup_codes = serializers.ListField(
        child=serializers.CharField(),
        read_only=True
    )

    def validate_token(self, value):
        """Validate TOTP token before regenerating"""
        user = self.context['request'].user

        # Verify token
        device = TOTPDevice.objects.filter(
            user=user,
            confirmed=True
        ).first()

        if not device or not device.verify_token(value):
            raise serializers.ValidationError("Invalid verification code")

        return value

    def create(self, validated_data):
        """Regenerate backup codes"""
        user = self.context['request'].user

        # Generate new backup codes
        codes = MFABackupCode.generate_codes_for_user(user, count=10)
        plain_codes = [code[0] for code in codes]

        return {
            'backup_codes': plain_codes
        }
