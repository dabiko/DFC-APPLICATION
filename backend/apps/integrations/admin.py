"""
Integrations Admin Configuration.
"""

from django.contrib import admin
from .models import APIKey, Webhook, Integration, IntegrationLog


@admin.register(APIKey)
class APIKeyAdmin(admin.ModelAdmin):
    list_display = ['name', 'organization', 'key_prefix', 'scope', 'is_active', 'last_used_at', 'created_at']
    list_filter = ['scope', 'is_active', 'organization']
    search_fields = ['name', 'key_prefix', 'organization__name']
    readonly_fields = ['key_prefix', 'key_hash', 'last_used_at', 'last_used_ip', 'total_requests', 'created_at', 'updated_at']
    ordering = ['-created_at']


@admin.register(Webhook)
class WebhookAdmin(admin.ModelAdmin):
    list_display = ['name', 'organization', 'url', 'is_active', 'is_verified', 'total_deliveries', 'last_delivery_at']
    list_filter = ['is_active', 'is_verified', 'auto_disabled', 'organization']
    search_fields = ['name', 'url', 'organization__name']
    readonly_fields = ['secret', 'total_deliveries', 'successful_deliveries', 'failed_deliveries', 'last_delivery_at', 'created_at', 'updated_at']
    ordering = ['-created_at']


@admin.register(Integration)
class IntegrationAdmin(admin.ModelAdmin):
    list_display = ['name', 'organization', 'integration_type', 'status', 'last_sync_at', 'created_at']
    list_filter = ['integration_type', 'status', 'organization']
    search_fields = ['name', 'organization__name']
    readonly_fields = ['status_message', 'last_sync_at', 'last_error_at', 'created_at', 'updated_at']
    ordering = ['-created_at']


@admin.register(IntegrationLog)
class IntegrationLogAdmin(admin.ModelAdmin):
    list_display = ['action', 'status', 'organization', 'api_key', 'webhook', 'integration', 'created_at']
    list_filter = ['action', 'status', 'organization']
    search_fields = ['organization__name', 'endpoint']
    readonly_fields = ['id', 'created_at']
    ordering = ['-created_at']
