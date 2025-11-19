"""
Django admin configuration for permissions app.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from apps.permissions.models import Role, UserRole, FolderPermission, PermissionCache


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    """Admin interface for Role model"""

    list_display = [
        'name',
        'description_short',
        'permission_badges',
        'user_count',
        'created_at',
    ]
    list_filter = ['name', 'created_at']
    search_fields = ['name', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at', 'permissions_summary']
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'name', 'description')
        }),
        ('Document Permissions', {
            'fields': (
                'can_view',
                'can_download',
                'can_upload',
                'can_edit',
                'can_delete',
                'can_share',
            )
        }),
        ('Administrative Permissions', {
            'fields': (
                'can_manage_permissions',
                'can_view_audit_log',
                'can_manage_retention',
                'can_manage_classification',
            )
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'permissions_summary'),
            'classes': ('collapse',)
        }),
    )

    def description_short(self, obj):
        """Truncated description"""
        if obj.description:
            return obj.description[:50] + '...' if len(obj.description) > 50 else obj.description
        return '-'
    description_short.short_description = 'Description'

    def permission_badges(self, obj):
        """Display permission badges"""
        permissions = obj.get_permissions_list()
        badges = []
        for perm in permissions[:3]:  # Show first 3
            badges.append(f'<span style="background: #4CAF50; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; margin-right: 3px;">{perm}</span>')
        if len(permissions) > 3:
            badges.append(f'<span style="background: #2196F3; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">+{len(permissions) - 3} more</span>')
        return mark_safe(''.join(badges)) if badges else '-'
    permission_badges.short_description = 'Permissions'

    def user_count(self, obj):
        """Count of users with this role"""
        count = obj.user_assignments.filter(is_active=True).count()
        return f'{count} users'
    user_count.short_description = 'Assigned To'

    def permissions_summary(self, obj):
        """Full list of permissions"""
        permissions = obj.get_permissions_list()
        return ', '.join(permissions) if permissions else 'No permissions'
    permissions_summary.short_description = 'All Permissions'


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    """Admin interface for UserRole model"""

    list_display = [
        'user',
        'role',
        'scope_badge',
        'department',
        'is_active_badge',
        'expiration_status',
        'granted_by',
        'granted_at',
    ]
    list_filter = ['role', 'scope', 'is_active', 'granted_at']
    search_fields = ['user__username', 'user__email', 'role__name', 'department__name']
    readonly_fields = ['id', 'granted_at']
    # autocomplete_fields = ['user', 'department', 'granted_by']  # Disabled: requires admin registration
    date_hierarchy = 'granted_at'

    fieldsets = (
        ('Assignment Details', {
            'fields': ('id', 'user', 'role', 'scope', 'department')
        }),
        ('Status', {
            'fields': ('is_active', 'expires_at')
        }),
        ('Audit Information', {
            'fields': ('granted_by', 'granted_at'),
            'classes': ('collapse',)
        }),
    )

    def scope_badge(self, obj):
        """Display scope with color badge"""
        colors = {
            'GLOBAL': '#4CAF50',
            'DEPARTMENT': '#2196F3',
            'FOLDER': '#FF9800',
        }
        color = colors.get(obj.scope, '#9E9E9E')
        return format_html(
            '<span style="background: {}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">{}</span>',
            color,
            obj.get_scope_display()
        )
    scope_badge.short_description = 'Scope'

    def is_active_badge(self, obj):
        """Display active status badge"""
        if obj.is_active:
            return format_html(
                '<span style="background: #4CAF50; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">✓ Active</span>'
            )
        return format_html(
            '<span style="background: #F44336; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">✗ Inactive</span>'
        )
    is_active_badge.short_description = 'Status'

    def expiration_status(self, obj):
        """Display expiration status"""
        if not obj.expires_at:
            return format_html('<span style="color: #4CAF50;">No expiration</span>')

        from django.utils import timezone
        if obj.expires_at <= timezone.now():
            return format_html('<span style="color: #F44336;">Expired: {}</span>', obj.expires_at.strftime('%Y-%m-%d'))
        return format_html('<span style="color: #FF9800;">Expires: {}</span>', obj.expires_at.strftime('%Y-%m-%d'))
    expiration_status.short_description = 'Expiration'

    actions = ['activate_roles', 'deactivate_roles']

    def activate_roles(self, request, queryset):
        """Bulk activate user roles"""
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} user roles activated.')
    activate_roles.short_description = 'Activate selected user roles'

    def deactivate_roles(self, request, queryset):
        """Bulk deactivate user roles"""
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} user roles deactivated.')
    deactivate_roles.short_description = 'Deactivate selected user roles'


@admin.register(FolderPermission)
class FolderPermissionAdmin(admin.ModelAdmin):
    """Admin interface for FolderPermission model"""

    list_display = [
        'folder',
        'target_display',
        'permission_level_badge',
        'inherit_badge',
        'granted_by',
        'granted_at',
    ]
    list_filter = ['permission_level', 'inherit_from_parent', 'granted_at']
    search_fields = ['folder__name', 'user__username', 'department__name']
    readonly_fields = ['id', 'granted_at', 'effective_permissions_display']
    # autocomplete_fields = ['folder', 'user', 'department', 'granted_by']  # Disabled: requires admin registration
    date_hierarchy = 'granted_at'

    fieldsets = (
        ('Permission Assignment', {
            'fields': ('id', 'folder', 'user', 'department', 'permission_level')
        }),
        ('Inheritance', {
            'fields': ('inherit_from_parent', 'effective_permissions_display')
        }),
        ('Audit Information', {
            'fields': ('granted_by', 'granted_at'),
            'classes': ('collapse',)
        }),
    )

    def target_display(self, obj):
        """Display permission target (user or department)"""
        if obj.user:
            return format_html(
                '<span style="background: #2196F3; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">👤 {}</span>',
                obj.user.username
            )
        elif obj.department:
            return format_html(
                '<span style="background: #FF9800; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">🏢 {}</span>',
                obj.department.name
            )
        return '-'
    target_display.short_description = 'Target'

    def permission_level_badge(self, obj):
        """Display permission level with color"""
        colors = {
            'NO_ACCESS': '#F44336',
            'VIEW_ONLY': '#9E9E9E',
            'VIEW_DOWNLOAD': '#2196F3',
            'CONTRIBUTE': '#FF9800',
            'EDIT': '#FF5722',
            'FULL_CONTROL': '#4CAF50',
        }
        color = colors.get(obj.permission_level, '#9E9E9E')
        return format_html(
            '<span style="background: {}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">{}</span>',
            color,
            obj.get_permission_level_display()
        )
    permission_level_badge.short_description = 'Permission Level'

    def inherit_badge(self, obj):
        """Display inheritance status"""
        if obj.inherit_from_parent:
            return format_html('<span style="color: #4CAF50;">✓ Inherits</span>')
        return format_html('<span style="color: #9E9E9E;">✗ No Inherit</span>')
    inherit_badge.short_description = 'Inheritance'

    def effective_permissions_display(self, obj):
        """Display effective permissions"""
        perms = obj.get_effective_permissions()
        active_perms = [k.replace('can_', '').title() for k, v in perms.items() if v]
        if active_perms:
            return ', '.join(active_perms)
        return 'No permissions'
    effective_permissions_display.short_description = 'Effective Permissions'


@admin.register(PermissionCache)
class PermissionCacheAdmin(admin.ModelAdmin):
    """Admin interface for PermissionCache model"""

    list_display = [
        'user',
        'folder',
        'permission_type',
        'has_permission_badge',
        'cached_at',
        'expires_at',
        'is_expired',
    ]
    list_filter = ['has_permission', 'permission_type', 'cached_at', 'expires_at']
    search_fields = ['user__username', 'folder__name', 'permission_type']
    readonly_fields = ['id', 'user', 'folder', 'permission_type', 'has_permission', 'cached_at', 'expires_at']
    date_hierarchy = 'cached_at'

    def has_add_permission(self, request):
        """Disable manual cache creation"""
        return False

    def has_permission_badge(self, obj):
        """Display permission result badge"""
        if obj.has_permission:
            return format_html('<span style="background: #4CAF50; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">✓ Allowed</span>')
        return format_html('<span style="background: #F44336; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">✗ Denied</span>')
    has_permission_badge.short_description = 'Result'

    def is_expired(self, obj):
        """Check if cache entry is expired"""
        from django.utils import timezone
        if obj.expires_at <= timezone.now():
            return format_html('<span style="color: #F44336;">✗ Expired</span>')
        return format_html('<span style="color: #4CAF50;">✓ Valid</span>')
    is_expired.short_description = 'Status'

    actions = ['clear_cache_entries']

    def clear_cache_entries(self, request, queryset):
        """Bulk delete cache entries"""
        count = queryset.count()
        queryset.delete()
        self.message_user(request, f'{count} cache entries cleared.')
    clear_cache_entries.short_description = 'Clear selected cache entries'
