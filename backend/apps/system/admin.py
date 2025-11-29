"""
Admin configuration for system models.
"""

from django.contrib import admin
from .models import (
    SystemSettings,
    AuditConfiguration,
    PlatformAnnouncement,
    SystemHealthCheck,
)


@admin.register(SystemSettings)
class SystemSettingsAdmin(admin.ModelAdmin):
    list_display = ['platform_name', 'maintenance_mode', 'allow_registration', 'updated_at']
    fieldsets = (
        ('Platform Identity', {
            'fields': ('platform_name', 'platform_tagline', 'support_email', 'support_phone')
        }),
        ('Maintenance', {
            'fields': ('maintenance_mode', 'maintenance_message', 'maintenance_allowed_ips')
        }),
        ('Registration', {
            'fields': ('allow_registration', 'require_email_verification',
                      'auto_approve_organizations', 'default_trial_days')
        }),
        ('Security', {
            'fields': ('global_rate_limit', 'max_file_size_mb',
                      'allowed_file_types', 'blocked_file_types')
        }),
        ('Email', {
            'fields': ('email_from_name', 'email_from_address',
                      'smtp_host', 'smtp_port', 'smtp_use_tls', 'smtp_username')
        }),
        ('Storage', {
            'fields': ('storage_provider', 'storage_region', 'storage_bucket',
                      'enable_redundant_storage')
        }),
        ('Search', {
            'fields': ('search_provider', 'search_index_delay_seconds',
                      'enable_ocr', 'ocr_languages')
        }),
        ('Compliance', {
            'fields': ('audit_retention_days', 'enable_gdpr_compliance',
                      'data_residency_required')
        }),
        ('Features', {
            'fields': ('enable_public_api', 'enable_webhooks',
                      'enable_third_party_integrations')
        }),
    )

    def has_add_permission(self, request):
        # Only allow one instance
        return not SystemSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(AuditConfiguration)
class AuditConfigurationAdmin(admin.ModelAdmin):
    list_display = ['log_auth_events', 'log_document_events', 'alert_on_failed_logins', 'updated_at']
    fieldsets = (
        ('Event Logging', {
            'fields': ('log_auth_events', 'log_document_events', 'log_folder_events',
                      'log_user_events', 'log_permission_events', 'log_search_events',
                      'log_api_events', 'log_system_events')
        }),
        ('Alerts', {
            'fields': ('alert_on_failed_logins', 'failed_login_threshold',
                      'alert_on_bulk_deletion', 'bulk_deletion_threshold',
                      'alert_on_permission_changes', 'alert_recipients')
        }),
    )

    def has_add_permission(self, request):
        return not AuditConfiguration.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(PlatformAnnouncement)
class PlatformAnnouncementAdmin(admin.ModelAdmin):
    list_display = ['title', 'severity', 'is_active', 'starts_at', 'ends_at', 'created_at']
    list_filter = ['severity', 'is_active', 'is_dismissible']
    search_fields = ['title', 'message']
    date_hierarchy = 'created_at'


@admin.register(SystemHealthCheck)
class SystemHealthCheckAdmin(admin.ModelAdmin):
    list_display = ['service_name', 'status', 'response_time_ms', 'checked_at']
    list_filter = ['service_name', 'status']
    readonly_fields = ['id', 'service_name', 'status', 'response_time_ms', 'details',
                       'error_message', 'checked_at']
    date_hierarchy = 'checked_at'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
