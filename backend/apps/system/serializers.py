"""
Serializers for system administration.
"""

from rest_framework import serializers
from .models import (
    SystemSettings,
    AuditConfiguration,
    PlatformAnnouncement,
    SystemHealthCheck,
)


class SystemSettingsSerializer(serializers.ModelSerializer):
    """Serializer for system-wide settings."""

    maintenance_started_by_name = serializers.SerializerMethodField(read_only=True)

    def get_maintenance_started_by_name(self, obj):
        if obj.maintenance_started_by:
            return obj.maintenance_started_by.get_full_name() or obj.maintenance_started_by.email
        return None

    class Meta:
        model = SystemSettings
        fields = [
            'id',
            # Platform Identity
            'platform_name',
            'platform_tagline',
            'support_email',
            'support_phone',
            # Maintenance
            'maintenance_mode',
            'maintenance_message',
            'maintenance_allowed_ips',
            'maintenance_started_at',
            'maintenance_started_by_name',
            'maintenance_estimated_end',
            # Registration
            'allow_registration',
            'require_email_verification',
            'auto_approve_organizations',
            'default_trial_days',
            # Security
            'global_rate_limit',
            'max_file_size_mb',
            'allowed_file_types',
            'blocked_file_types',
            # Email
            'email_from_name',
            'email_from_address',
            'smtp_host',
            'smtp_port',
            'smtp_use_tls',
            'smtp_username',
            # Storage
            'storage_provider',
            'storage_region',
            'storage_bucket',
            'enable_redundant_storage',
            # Search
            'search_provider',
            'search_index_delay_seconds',
            'enable_ocr',
            'ocr_languages',
            # Audit & Compliance
            'audit_retention_days',
            'enable_gdpr_compliance',
            'data_residency_required',
            # Feature Toggles
            'enable_public_api',
            'enable_webhooks',
            'enable_third_party_integrations',
            # Timestamps
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'maintenance_started_at', 'maintenance_started_by_name', 'created_at', 'updated_at']


class AuditConfigurationSerializer(serializers.ModelSerializer):
    """Serializer for audit configuration."""

    class Meta:
        model = AuditConfiguration
        fields = [
            'id',
            # Event Categories
            'log_auth_events',
            'log_document_events',
            'log_folder_events',
            'log_user_events',
            'log_permission_events',
            'log_search_events',
            'log_api_events',
            'log_system_events',
            # Alerts
            'alert_on_failed_logins',
            'failed_login_threshold',
            'alert_on_bulk_deletion',
            'bulk_deletion_threshold',
            'alert_on_permission_changes',
            'alert_recipients',
            # Timestamps
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PlatformAnnouncementSerializer(serializers.ModelSerializer):
    """Serializer for platform announcements."""

    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = PlatformAnnouncement
        fields = [
            'id',
            'title',
            'message',
            'severity',
            'is_active',
            'is_dismissible',
            'target_all_users',
            'target_plans',
            'starts_at',
            'ends_at',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_by_name', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None


class SystemHealthCheckSerializer(serializers.ModelSerializer):
    """Serializer for system health checks."""

    class Meta:
        model = SystemHealthCheck
        fields = [
            'id',
            'service_name',
            'status',
            'response_time_ms',
            'details',
            'error_message',
            'checked_at',
        ]
        read_only_fields = fields


class PlatformStatsSerializer(serializers.Serializer):
    """Serializer for platform-wide statistics."""

    total_organizations = serializers.IntegerField()
    active_organizations = serializers.IntegerField()
    trial_organizations = serializers.IntegerField()
    total_users = serializers.IntegerField()
    active_users_today = serializers.IntegerField()
    total_documents = serializers.IntegerField()
    total_storage_used_gb = serializers.FloatField()
    api_requests_today = serializers.IntegerField()
    organizations_by_plan = serializers.DictField()
    recent_signups = serializers.IntegerField()
    bucket_used_bytes = serializers.IntegerField()
    bucket_used_gb = serializers.FloatField()
    server_total_bytes = serializers.IntegerField()
    server_total_gb = serializers.FloatField()
    server_available_bytes = serializers.IntegerField()
    server_available_gb = serializers.FloatField()


class OrganizationListSerializer(serializers.Serializer):
    """Brief organization info for super admin listing."""

    id = serializers.IntegerField()
    name = serializers.CharField()
    domain = serializers.CharField()
    subscription_plan = serializers.CharField()
    subscription_status = serializers.CharField()
    max_users = serializers.IntegerField()
    current_user_count = serializers.IntegerField()
    max_storage_gb = serializers.IntegerField()
    current_storage_gb = serializers.FloatField()
    is_active = serializers.BooleanField()
    created_at = serializers.DateTimeField()


class FeatureFlagsUpdateSerializer(serializers.Serializer):
    """Serializer for updating organization feature flags."""

    # Core Features
    advanced_search = serializers.BooleanField(required=False)
    ocr_processing = serializers.BooleanField(required=False)
    version_control = serializers.BooleanField(required=False)
    folder_templates = serializers.BooleanField(required=False)

    # Collaboration
    external_sharing = serializers.BooleanField(required=False)
    real_time_collaboration = serializers.BooleanField(required=False)
    comments_annotations = serializers.BooleanField(required=False)

    # Compliance & Security
    advanced_audit = serializers.BooleanField(required=False)
    retention_policies = serializers.BooleanField(required=False)
    legal_hold = serializers.BooleanField(required=False)
    compliance_reports = serializers.BooleanField(required=False)
    data_classification = serializers.BooleanField(required=False)

    # Workflow & Automation
    basic_workflows = serializers.BooleanField(required=False)
    advanced_workflows = serializers.BooleanField(required=False)
    scheduled_tasks = serializers.BooleanField(required=False)
    api_access = serializers.BooleanField(required=False)
    webhooks = serializers.BooleanField(required=False)

    # Analytics & Reporting
    basic_analytics = serializers.BooleanField(required=False)
    advanced_analytics = serializers.BooleanField(required=False)
    custom_reports = serializers.BooleanField(required=False)
    export_reports = serializers.BooleanField(required=False)

    # Administration
    custom_roles = serializers.BooleanField(required=False)
    sso_integration = serializers.BooleanField(required=False)
    custom_branding = serializers.BooleanField(required=False)
    priority_support = serializers.BooleanField(required=False)
