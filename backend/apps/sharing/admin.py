"""
Django admin interface for document sharing.

Admin classes:
- ShareAdmin: Manage shares with analytics
- ShareAccessAdmin: View access logs (read-only)
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from django.utils import timezone
from apps.sharing.models import Share, ShareAccess


@admin.register(Share)
class ShareAdmin(admin.ModelAdmin):
    """Admin interface for document shares"""

    list_display = [
        'document_link',
        'permission_badge',
        'created_by',
        'is_active_status',
        'access_stats',
        'expiration_status',
        'created_at',
    ]

    list_filter = [
        'permission',
        'is_active',
        'is_password_protected',
        'created_at',
    ]

    search_fields = [
        'document__title',
        'token',
        'created_by__email',
        'notes',
    ]

    readonly_fields = [
        'id',
        'token',
        'created_by',
        'created_at',
        'updated_at',
        'revoked_at',
        'revoked_by',
        'access_count',
        'download_count',
        'view_count',
        'last_accessed_at',
        'share_link',
        'password_protected_status',
    ]

    fieldsets = [
        ('Document Information', {
            'fields': [
                'id',
                'document',
                'share_link',
            ]
        }),
        ('Share Settings', {
            'fields': [
                'token',
                'permission',
                'is_password_protected',
                'password_protected_status',
                'allow_public_access',
            ]
        }),
        ('Expiration & Limits', {
            'fields': [
                'expires_at',
                'is_active',
                'max_access_count',
            ]
        }),
        ('Recipients', {
            'fields': [
                'recipient_emails',
            ]
        }),
        ('Analytics', {
            'fields': [
                'access_count',
                'download_count',
                'view_count',
                'last_accessed_at',
            ],
            'classes': ['collapse'],
        }),
        ('Audit Information', {
            'fields': [
                'created_by',
                'created_at',
                'updated_at',
                'revoked_by',
                'revoked_at',
                'notes',
            ],
            'classes': ['collapse'],
        }),
    ]

    def document_link(self, obj):
        """Link to document"""
        url = reverse('admin:documents_document_change', args=[obj.document.id])
        return format_html('<a href="{}">{}</a>', url, obj.document.title)
    document_link.short_description = 'Document'

    def permission_badge(self, obj):
        """Display permission as colored badge"""
        colors = {
            Share.VIEW_ONLY: '#6c757d',  # Gray
            Share.VIEW_DOWNLOAD: '#0d6efd',  # Blue
            Share.VIEW_DOWNLOAD_COMMENT: '#198754',  # Green
        }
        color = colors.get(obj.permission, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.get_permission_display()
        )
    permission_badge.short_description = 'Permission'

    def is_active_status(self, obj):
        """Display active status with icon"""
        if not obj.is_active:
            return format_html('<span style="color: red;">&#x2717; Revoked</span>')
        elif obj.is_expired():
            return format_html('<span style="color: orange;">&#x23F0; Expired</span>')
        else:
            return format_html('<span style="color: green;">&#x2713; Active</span>')
    is_active_status.short_description = 'Status'

    def access_stats(self, obj):
        """Display access statistics"""
        return format_html(
            '<div style="font-size: 11px;">'
            'Views: {} | Downloads: {} | Total: {}'
            '</div>',
            obj.view_count,
            obj.download_count,
            obj.access_count
        )
    access_stats.short_description = 'Access Stats'

    def expiration_status(self, obj):
        """Display expiration information"""
        if not obj.expires_at:
            return format_html('<span style="color: gray;">Never</span>')

        now = timezone.now()
        if obj.expires_at <= now:
            return format_html(
                '<span style="color: red;">Expired {}</span>',
                obj.expires_at.strftime('%Y-%m-%d')
            )
        else:
            days_left = (obj.expires_at - now).days
            if days_left <= 7:
                color = 'orange'
            else:
                color = 'green'
            return format_html(
                '<span style="color: {};">{} ({} days)</span>',
                color,
                obj.expires_at.strftime('%Y-%m-%d'),
                days_left
            )
    expiration_status.short_description = 'Expires'

    def share_link(self, obj):
        """Display share link"""
        return format_html(
            '<input type="text" value="{}" readonly style="width: 100%; font-family: monospace;" onclick="this.select();">',
            obj.get_share_url()
        )
    share_link.short_description = 'Share Link'

    def password_protected_status(self, obj):
        """Display password protection status"""
        if obj.is_password_protected:
            return format_html('<span style="color: green;">&#x1F512; Yes</span>')
        return format_html('<span style="color: gray;">No</span>')
    password_protected_status.short_description = 'Password Protected'

    def has_add_permission(self, request):
        """Disable add through admin (use API instead)"""
        return False


@admin.register(ShareAccess)
class ShareAccessAdmin(admin.ModelAdmin):
    """Admin interface for share access logs (read-only)"""

    list_display = [
        'share_link',
        'access_type_badge',
        'user_info',
        'ip_address',
        'accessed_at',
        'location',
    ]

    list_filter = [
        'access_type',
        'accessed_at',
    ]

    search_fields = [
        'share__document__title',
        'share__token',
        'user__email',
        'ip_address',
    ]

    readonly_fields = [
        'id',
        'share',
        'access_type',
        'user',
        'ip_address',
        'user_agent',
        'accessed_at',
        'country',
        'city',
    ]

    fieldsets = [
        ('Access Information', {
            'fields': [
                'id',
                'share',
                'access_type',
                'accessed_at',
            ]
        }),
        ('User Details', {
            'fields': [
                'user',
                'ip_address',
                'user_agent',
            ]
        }),
        ('Location', {
            'fields': [
                'country',
                'city',
            ],
            'classes': ['collapse'],
        }),
    ]

    def share_link(self, obj):
        """Link to share"""
        url = reverse('admin:sharing_share_change', args=[obj.share.id])
        return format_html('<a href="{}">{}</a>', url, obj.share.document.title)
    share_link.short_description = 'Share'

    def access_type_badge(self, obj):
        """Display access type as badge"""
        colors = {
            'view': '#0d6efd',
            'download': '#198754',
            'comment': '#ffc107',
        }
        color = colors.get(obj.access_type, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px; font-size: 11px;">{}</span>',
            color,
            obj.access_type.upper()
        )
    access_type_badge.short_description = 'Type'

    def user_info(self, obj):
        """Display user information"""
        if obj.user:
            return format_html(
                '<div>{}</div><div style="font-size: 10px; color: gray;">{}</div>',
                obj.user.get_full_name(),
                obj.user.email
            )
        return format_html('<span style="color: gray;">Anonymous</span>')
    user_info.short_description = 'User'

    def location(self, obj):
        """Display location"""
        if obj.country or obj.city:
            parts = [p for p in [obj.city, obj.country] if p]
            return ', '.join(parts)
        return '-'
    location.short_description = 'Location'

    def has_add_permission(self, request):
        """Disable manual creation"""
        return False

    def has_change_permission(self, request, obj=None):
        """Make read-only"""
        return False

    def has_delete_permission(self, request, obj=None):
        """Allow deletion for cleanup"""
        return request.user.is_superuser
