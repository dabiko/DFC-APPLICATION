"""
Organization Settings Serializers.

Provides serializers for organization-level settings:
- OrganizationSettingsSerializer
- OrganizationSecurityPolicySerializer
- OrganizationFeatureFlagsSerializer
"""

from rest_framework import serializers
from apps.organizations.models import Organization
from apps.organizations.settings_models import (
    OrganizationSettings,
    OrganizationSecurityPolicy,
    OrganizationFeatureFlags,
)


class OrganizationSettingsSerializer(serializers.ModelSerializer):
    """Serializer for OrganizationSettings model."""

    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = OrganizationSettings
        fields = [
            'id',
            'logo',
            'logo_url',
            'primary_color',
            'secondary_color',
            'contact_email',
            'contact_phone',
            'website',
            'address_line1',
            'address_line2',
            'city',
            'state',
            'postal_code',
            'country',
            'timezone',
            'date_format',
            'language',
            'default_confidentiality',
            'require_classification',
            'allow_external_sharing',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'logo_url', 'created_at', 'updated_at']

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None


class OrganizationSecurityPolicySerializer(serializers.ModelSerializer):
    """Serializer for OrganizationSecurityPolicy model."""

    password_requirements = serializers.SerializerMethodField()

    class Meta:
        model = OrganizationSecurityPolicy
        fields = [
            'id',
            # Password Policy
            'password_min_length',
            'password_require_uppercase',
            'password_require_lowercase',
            'password_require_numbers',
            'password_require_special',
            'password_expiry_days',
            'password_history_count',
            'password_requirements',
            # MFA Policy
            'mfa_required',
            'mfa_required_for_admins',
            'mfa_grace_period_days',
            'allowed_mfa_methods',
            # Session Policy
            'session_timeout_minutes',
            'max_concurrent_sessions',
            'require_reauthentication',
            # Login Security
            'max_login_attempts',
            'lockout_duration_minutes',
            'login_notification_enabled',
            'suspicious_activity_alerts',
            # IP Restrictions
            'ip_whitelist_enabled',
            'ip_whitelist',
            # Data Security
            'data_export_restricted',
            'require_encryption',
            'audit_log_retention_days',
            # Timestamps
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'password_requirements', 'created_at', 'updated_at']

    def get_password_requirements(self, obj):
        return obj.get_password_requirements()

    def validate_password_min_length(self, value):
        if value < 6:
            raise serializers.ValidationError("Minimum password length must be at least 6 characters")
        if value > 32:
            raise serializers.ValidationError("Maximum password length cannot exceed 32 characters")
        return value

    def validate_allowed_mfa_methods(self, value):
        valid_methods = ['totp', 'sms', 'email']
        if not value:
            return ['totp']  # Default to TOTP
        for method in value:
            if method not in valid_methods:
                raise serializers.ValidationError(f"Invalid MFA method: {method}. Valid methods are: {valid_methods}")
        return value


class OrganizationFeatureFlagsSerializer(serializers.ModelSerializer):
    """Serializer for OrganizationFeatureFlags model."""

    class Meta:
        model = OrganizationFeatureFlags
        fields = [
            'id',
            # Core Features
            'advanced_search',
            'ocr_processing',
            'version_control',
            'folder_templates',
            # Collaboration
            'external_sharing',
            'real_time_collaboration',
            'comments_annotations',
            # Compliance & Security
            'advanced_audit',
            'retention_policies',
            'legal_hold',
            'compliance_reports',
            'data_classification',
            # Workflow & Automation
            'basic_workflows',
            'advanced_workflows',
            'scheduled_tasks',
            'api_access',
            'webhooks',
            # Analytics & Reporting
            'basic_analytics',
            'advanced_analytics',
            'custom_reports',
            'export_reports',
            # Administration
            'custom_roles',
            'sso_integration',
            'custom_branding',
            'priority_support',
            # Timestamps
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class OrganizationGeneralSettingsSerializer(serializers.ModelSerializer):
    """
    Serializer for organization general info combined with settings.
    Used in the Organization Settings page - General tab.
    """

    settings = OrganizationSettingsSerializer(read_only=True)
    subscription_display = serializers.CharField(read_only=True)
    current_user_count = serializers.IntegerField(read_only=True)
    can_add_users = serializers.BooleanField(read_only=True)
    is_trial_expired = serializers.BooleanField(read_only=True)
    days_until_trial_expires = serializers.IntegerField(read_only=True)

    class Meta:
        model = Organization
        fields = [
            'id',
            'name',
            'domain',
            'slug',
            'registration_number',
            'tax_id',
            'industry',
            'country',
            'subscription_plan',
            'subscription_status',
            'subscription_display',
            'max_users',
            'max_storage_gb',
            'max_documents',
            'current_user_count',
            'can_add_users',
            'trial_ends_at',
            'is_trial_expired',
            'days_until_trial_expires',
            'is_active',
            'settings',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id', 'domain', 'slug', 'subscription_plan', 'subscription_status',
            'subscription_display', 'max_users', 'max_storage_gb', 'max_documents',
            'current_user_count', 'can_add_users', 'trial_ends_at', 'is_trial_expired',
            'days_until_trial_expires', 'is_active', 'settings', 'created_at', 'updated_at'
        ]


class OrganizationUsageSerializer(serializers.Serializer):
    """Serializer for organization usage statistics."""

    # User Stats
    current_users = serializers.IntegerField()
    max_users = serializers.IntegerField()
    users_percentage = serializers.FloatField()

    # Storage Stats
    current_storage_gb = serializers.FloatField()
    max_storage_gb = serializers.IntegerField()
    storage_percentage = serializers.FloatField()

    # Document Stats
    current_documents = serializers.IntegerField()
    max_documents = serializers.IntegerField()
    documents_percentage = serializers.FloatField()

    # Limits
    users_limit_reached = serializers.BooleanField()
    storage_limit_reached = serializers.BooleanField()
    documents_limit_reached = serializers.BooleanField()


class AllOrganizationSettingsSerializer(serializers.Serializer):
    """
    Combined serializer for all organization settings.
    Used in the frontend to load all settings at once.
    """

    organization = OrganizationGeneralSettingsSerializer()
    settings = OrganizationSettingsSerializer()
    security_policy = OrganizationSecurityPolicySerializer()
    feature_flags = OrganizationFeatureFlagsSerializer()
    usage = OrganizationUsageSerializer()


class LogoUploadSerializer(serializers.Serializer):
    """Serializer for logo upload."""

    logo = serializers.ImageField(required=True)

    def validate_logo(self, value):
        # Validate file size (max 2MB)
        if value.size > 2 * 1024 * 1024:
            raise serializers.ValidationError("Logo file size cannot exceed 2MB")

        # Validate file type
        valid_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if value.content_type not in valid_types:
            raise serializers.ValidationError(
                f"Invalid file type. Allowed types: {', '.join(valid_types)}"
            )

        return value
