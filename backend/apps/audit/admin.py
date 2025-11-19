"""
Django admin interface for Audit Log.

Read-only interface for viewing audit logs.
"""

from django.contrib import admin
from django.utils.html import format_html
from apps.audit.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """
    Read-only admin interface for audit logs.

    Features:
    - View-only (no add, change, or delete)
    - Comprehensive filtering
    - Search functionality
    - Color-coded outcomes
    - Expandable JSON fields
    """

    list_display = [
        'timestamp',
        'colored_outcome',
        'user_email',
        'action',
        'resource_type',
        'resource_name',
        'ip_address',
    ]

    list_filter = [
        'outcome',
        'action',
        'resource_type',
        'timestamp',
    ]

    search_fields = [
        'user__email',
        'resource_name',
        'resource_id',
        'ip_address',
    ]

    readonly_fields = [
        'id',
        'user',
        'action',
        'resource_type',
        'resource_id',
        'resource_name',
        'timestamp',
        'ip_address',
        'user_agent',
        'outcome',
        'error_message',
        'formatted_before_value',
        'formatted_after_value',
        'changed_fields',
        'metadata',
    ]

    fieldsets = (
        ('Basic Information', {
            'fields': (
                'id',
                'timestamp',
                'user',
                'outcome',
                'error_message',
            )
        }),
        ('Action Details', {
            'fields': (
                'action',
                'resource_type',
                'resource_id',
                'resource_name',
            )
        }),
        ('Change Tracking', {
            'fields': (
                'changed_fields',
                'formatted_before_value',
                'formatted_after_value',
            ),
            'classes': ('collapse',),
        }),
        ('Request Metadata', {
            'fields': (
                'ip_address',
                'user_agent',
            ),
            'classes': ('collapse',),
        }),
        ('Additional Data', {
            'fields': (
                'metadata',
            ),
            'classes': ('collapse',),
        }),
    )

    ordering = ['-timestamp']

    date_hierarchy = 'timestamp'

    # Make it read-only
    def has_add_permission(self, request):
        """Prevent adding audit logs via admin."""
        return False

    def has_change_permission(self, request, obj=None):
        """Prevent editing audit logs via admin."""
        return False

    def has_delete_permission(self, request, obj=None):
        """Prevent deleting audit logs via admin."""
        return False

    def colored_outcome(self, obj):
        """Display outcome with color coding."""
        colors = {
            'SUCCESS': 'green',
            'FAILURE': 'red',
        }
        color = colors.get(obj.outcome, 'gray')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_outcome_display()
        )
    colored_outcome.short_description = 'Outcome'
    colored_outcome.admin_order_field = 'outcome'

    def user_email(self, obj):
        """Display user email or 'System' for null users."""
        if obj.user:
            return obj.user.email
        return format_html('<em>System</em>')
    user_email.short_description = 'User'
    user_email.admin_order_field = 'user__email'

    def formatted_before_value(self, obj):
        """Format before_value JSON for better readability."""
        if obj.before_value:
            import json
            return format_html(
                '<pre style="background: #f4f4f4; padding: 10px; border-radius: 4px;">{}</pre>',
                json.dumps(obj.before_value, indent=2)
            )
        return '-'
    formatted_before_value.short_description = 'Before Value'

    def formatted_after_value(self, obj):
        """Format after_value JSON for better readability."""
        if obj.after_value:
            import json
            return format_html(
                '<pre style="background: #f4f4f4; padding: 10px; border-radius: 4px;">{}</pre>',
                json.dumps(obj.after_value, indent=2)
            )
        return '-'
    formatted_after_value.short_description = 'After Value'

    def get_actions(self, request):
        """Disable all bulk actions."""
        actions = super().get_actions(request)
        # Remove delete action
        if 'delete_selected' in actions:
            del actions['delete_selected']
        return actions
