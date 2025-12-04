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
from apps.users.mfa_models import (
    MFABackupCode,
    MFASettings,
    TrustedDevice,
    MFAEnforcementPolicy,
    LoginRiskAssessment
)
import io
import qrcode
import base64

User = get_user_model()


class MFASetupSerializer(serializers.Serializer):
    """
    Serializer for MFA setup initiation.
    Requires password verification before generating TOTP secret and QR code.
    Implements account lockout after 5 failed password attempts.
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        help_text="Current password for verification"
    )
    secret = serializers.CharField(read_only=True)
    qr_code = serializers.CharField(read_only=True, help_text="Base64-encoded QR code image")
    backup_codes = serializers.ListField(
        child=serializers.CharField(),
        read_only=True,
        required=False
    )

    def validate_password(self, value):
        """
        Verify the user's password before allowing MFA setup.
        Implements account lockout after 5 failed attempts.
        """
        user = self.context['request'].user

        # Check if account is already locked
        if user.is_account_locked:
            raise serializers.ValidationError(
                f"Your account is locked due to too many failed attempts. "
                f"Please try again later or contact your administrator."
            )

        # Verify password
        if not user.check_password(value):
            # Record failed attempt and get lockout status
            lockout_result = user.record_failed_login()

            if lockout_result['locked']:
                raise serializers.ValidationError(lockout_result['message'])
            else:
                raise serializers.ValidationError(
                    f"Invalid password. {lockout_result['remaining_attempts']} attempt(s) remaining."
                )

        # Password is correct - reset failed attempts counter
        user.failed_login_attempts = 0
        user.last_failed_login = None
        user.save(update_fields=['failed_login_attempts', 'last_failed_login', 'updated_at'])

        return value

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

        # Convert hex key to base32 for manual entry in authenticator apps
        # device.key is hex-encoded, we need to convert to bytes then base32
        hex_key = device.key
        key_bytes = bytes.fromhex(hex_key)
        base32_secret = base64.b32encode(key_bytes).decode('utf-8').rstrip('=')

        return {
            'secret': base32_secret,
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

        # IMPORTANT: Also set mfa_enabled on the user model
        # This is checked during login to determine if MFA verification is required
        user.mfa_enabled = True
        user.save(update_fields=['mfa_enabled'])

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

        # Disable MFA on settings model
        mfa_settings.disable_mfa()

        # IMPORTANT: Also set mfa_enabled = False on the user model
        user.mfa_enabled = False
        user.save(update_fields=['mfa_enabled'])

        # Delete TOTP devices
        TOTPDevice.objects.filter(user=user).delete()

        return {'disabled': True}


class BackupCodeRegenerateSerializer(serializers.Serializer):
    """Serializer for regenerating backup codes with rate limiting"""
    token = serializers.CharField(
        max_length=6,
        help_text="Current TOTP code to confirm regeneration"
    )
    backup_codes = serializers.ListField(
        child=serializers.CharField(),
        read_only=True
    )

    def validate(self, attrs):
        """Check rate limiting before validating token"""
        user = self.context['request'].user

        # Get or create MFA settings
        mfa_settings, _ = MFASettings.objects.get_or_create(user=user)

        # Check rate limiting
        can_regenerate, reason, wait_seconds = mfa_settings.can_regenerate_backup_codes()
        if not can_regenerate:
            raise serializers.ValidationError({
                'rate_limit': reason,
                'wait_seconds': wait_seconds
            })

        return attrs

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
        """Regenerate backup codes and record the regeneration"""
        user = self.context['request'].user

        # Get or create MFA settings and record regeneration
        mfa_settings, _ = MFASettings.objects.get_or_create(user=user)
        mfa_settings.record_backup_code_regeneration()

        # Generate new backup codes
        codes = MFABackupCode.generate_codes_for_user(user, count=10)
        plain_codes = [code[0] for code in codes]

        # Get regeneration stats for response
        stats = mfa_settings.get_regeneration_stats()

        return {
            'backup_codes': plain_codes,
            'regenerations_remaining': stats['regenerations_remaining'],
            'next_regeneration_available_in': stats['cooldown_minutes'] * 60,  # seconds
        }


# ============================================================================
# Trusted Device Serializers
# ============================================================================

class TrustedDeviceSerializer(serializers.ModelSerializer):
    """Serializer for trusted device list and details"""
    is_current = serializers.SerializerMethodField()
    expires_in_days = serializers.SerializerMethodField()

    class Meta:
        model = TrustedDevice
        fields = [
            'id',
            'device_id',
            'device_name',
            'device_type',
            'location',
            'trusted_at',
            'expires_at',
            'last_used_at',
            'is_revoked',
            'is_valid',
            'is_current',
            'expires_in_days',
        ]
        read_only_fields = ['device_id', 'trusted_at', 'last_used_at']

    def get_is_current(self, obj):
        """Check if this is the current device"""
        request = self.context.get('request')
        if not request:
            return False
        device_fingerprint = request.META.get('HTTP_X_DEVICE_FINGERPRINT', '')
        if not device_fingerprint:
            return False
        import hashlib
        current_device_id = hashlib.sha256(device_fingerprint.encode()).hexdigest()
        return obj.device_id == current_device_id

    def get_expires_in_days(self, obj):
        """Get number of days until trust expires"""
        from django.utils import timezone
        if obj.is_expired:
            return 0
        delta = obj.expires_at - timezone.now()
        return max(0, delta.days)


class TrustDeviceSerializer(serializers.Serializer):
    """Serializer for trusting a new device"""
    device_fingerprint = serializers.CharField(
        max_length=256,
        help_text="Device fingerprint from client"
    )
    device_name = serializers.CharField(
        max_length=255,
        required=False,
        default='',
        help_text="User-friendly device name"
    )
    device_type = serializers.ChoiceField(
        choices=TrustedDevice.DEVICE_TYPE_CHOICES,
        default='other'
    )
    trust_days = serializers.IntegerField(
        default=30,
        min_value=1,
        max_value=365,
        help_text="Number of days to trust this device"
    )

    def create(self, validated_data):
        """Create a trusted device"""
        request = self.context['request']
        user = request.user

        device = TrustedDevice.create_trusted_device(
            user=user,
            device_fingerprint=validated_data['device_fingerprint'],
            device_name=validated_data.get('device_name', ''),
            device_type=validated_data.get('device_type', 'other'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            ip_address=request.META.get('REMOTE_ADDR'),
            trust_days=validated_data.get('trust_days', 30)
        )

        return TrustedDeviceSerializer(device, context=self.context).data


class RevokeDeviceSerializer(serializers.Serializer):
    """Serializer for revoking device trust"""
    reason = serializers.CharField(
        max_length=255,
        required=False,
        default='',
        help_text="Reason for revoking trust"
    )


# ============================================================================
# MFA Enforcement Policy Serializers
# ============================================================================

class MFAEnforcementPolicySerializer(serializers.ModelSerializer):
    """Serializer for MFA enforcement policies"""
    created_by_email = serializers.EmailField(
        source='created_by.email',
        read_only=True
    )
    affected_users_count = serializers.SerializerMethodField()

    class Meta:
        model = MFAEnforcementPolicy
        fields = [
            'id',
            'name',
            'description',
            'is_active',
            'enforcement_level',
            'scope',
            'scope_criteria',
            'grace_period_days',
            'enforcement_start_date',
            'allowed_methods',
            'send_reminders',
            'reminder_days_before',
            'created_at',
            'updated_at',
            'created_by',
            'created_by_email',
            'is_in_grace_period',
            'affected_users_count',
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by']

    def get_affected_users_count(self, obj):
        """Get count of users affected by this policy"""
        if not obj.is_active:
            return 0
        User = get_user_model()
        count = 0
        for user in User.objects.filter(is_active=True):
            if obj.applies_to_user(user):
                count += 1
        return count


class MFAEnforcementPolicyCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating MFA enforcement policies"""

    class Meta:
        model = MFAEnforcementPolicy
        fields = [
            'name',
            'description',
            'is_active',
            'enforcement_level',
            'scope',
            'scope_criteria',
            'grace_period_days',
            'enforcement_start_date',
            'allowed_methods',
            'send_reminders',
            'reminder_days_before',
        ]

    def create(self, validated_data):
        """Create policy with current user as creator"""
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


# ============================================================================
# Risk Assessment Serializers
# ============================================================================

class LoginRiskAssessmentSerializer(serializers.ModelSerializer):
    """Serializer for login risk assessment"""
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = LoginRiskAssessment
        fields = [
            'id',
            'user',
            'user_email',
            'ip_address',
            'risk_level',
            'risk_score',
            'risk_factors',
            'is_new_device',
            'is_new_location',
            'is_unusual_time',
            'failed_attempts_24h',
            'mfa_required',
            'login_blocked',
            'additional_verification_required',
            'login_successful',
            'assessed_at',
        ]
        read_only_fields = ['user', 'assessed_at']


class AssessLoginRiskSerializer(serializers.Serializer):
    """Serializer for assessing login risk"""
    device_fingerprint = serializers.CharField(
        max_length=256,
        required=False,
        default='',
        help_text="Device fingerprint for risk assessment"
    )

    def create(self, validated_data):
        """Perform risk assessment"""
        request = self.context['request']
        user = self.context['user']

        assessment = LoginRiskAssessment.assess_login_risk(
            user=user,
            ip_address=request.META.get('REMOTE_ADDR', ''),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            device_fingerprint=validated_data.get('device_fingerprint', '')
        )

        return LoginRiskAssessmentSerializer(assessment).data


# ============================================================================
# MFA Compliance Dashboard Serializers
# ============================================================================

class MFAComplianceStatsSerializer(serializers.Serializer):
    """Serializer for MFA compliance statistics"""
    total_users = serializers.IntegerField()
    mfa_enabled_count = serializers.IntegerField()
    mfa_enabled_percentage = serializers.FloatField()
    mfa_enforced_count = serializers.IntegerField()
    totp_enabled_count = serializers.IntegerField()
    users_needing_setup = serializers.IntegerField()
    recent_verifications_24h = serializers.IntegerField()
    failed_verifications_24h = serializers.IntegerField()
    active_trusted_devices = serializers.IntegerField()


class UserMFAStatusSerializer(serializers.Serializer):
    """Serializer for individual user MFA status in admin view"""
    id = serializers.IntegerField()
    email = serializers.EmailField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    is_active = serializers.BooleanField()
    mfa_enabled = serializers.BooleanField()
    mfa_enforced = serializers.BooleanField()
    totp_confirmed = serializers.BooleanField()
    backup_codes_remaining = serializers.IntegerField()
    last_verified_at = serializers.DateTimeField(allow_null=True)
    trusted_devices_count = serializers.IntegerField()


class EnforceMFASerializer(serializers.Serializer):
    """Serializer for enforcing MFA on a user"""
    enforce = serializers.BooleanField(
        default=True,
        help_text="Whether to enforce or un-enforce MFA"
    )
    notify_user = serializers.BooleanField(
        default=True,
        help_text="Send email notification to user"
    )
