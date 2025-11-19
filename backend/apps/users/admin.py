"""
Admin interface for Users and MFA models.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.utils import timezone
from apps.users.models import CustomUser, Department
from apps.users.mfa_models import MFASettings, MFABackupCode


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    """Admin interface for Department model."""
    list_display = ['code', 'name', 'parent', 'storage_quota_gb', 'created_at']
    list_filter = ['created_at', 'parent']
    search_fields = ['name', 'code']
    ordering = ['code']


@admin.register(CustomUser)
class CustomUserAdmin(BaseUserAdmin):
    """Admin interface for CustomUser model."""
    list_display = [
        'username', 'email', 'employee_id', 'department',
        'is_active', 'is_staff', 'mfa_status', 'account_status',
        'failed_login_attempts', 'last_login'
    ]
    list_filter = [
        'is_active', 'is_staff', 'is_superuser',
        'mfa_enabled', 'locked_by_failed_attempts',
        'department', 'created_at'
    ]
    search_fields = ['username', 'email', 'employee_id', 'first_name', 'last_name']
    ordering = ['-created_at']

    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'email', 'phone_number', 'avatar')}),
        ('Organization', {'fields': ('employee_id', 'department')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Multi-Factor Authentication', {'fields': ('mfa_enabled', 'mfa_secret')}),
        ('Security', {
            'fields': (
                'failed_login_attempts', 'last_failed_login',
                'account_locked_until', 'locked_by_failed_attempts'
            )
        }),
        ('Timestamps', {'fields': ('last_login', 'last_login_ip', 'created_at', 'updated_at')}),
    )

    readonly_fields = ['created_at', 'updated_at', 'last_login', 'last_login_ip']

    actions = ['unlock_accounts', 'reset_failed_attempts', 'enforce_mfa']

    def mfa_status(self, obj):
        """Display MFA status with color coding."""
        if obj.mfa_enabled:
            return format_html(
                '<span style="color: green; font-weight: bold;">✓ Enabled</span>'
            )
        return format_html(
            '<span style="color: gray;">✗ Disabled</span>'
        )
    mfa_status.short_description = 'MFA Status'

    def account_status(self, obj):
        """Display account lock status with color coding."""
        if obj.is_account_locked:
            return format_html(
                '<span style="color: red; font-weight: bold;">🔒 LOCKED</span>'
            )
        elif obj.failed_login_attempts > 0:
            return format_html(
                '<span style="color: orange;">⚠️ {} failed attempts</span>',
                obj.failed_login_attempts
            )
        return format_html(
            '<span style="color: green;">✓ Active</span>'
        )
    account_status.short_description = 'Account Status'

    @admin.action(description='Unlock selected user accounts')
    def unlock_accounts(self, request, queryset):
        """Unlock selected user accounts."""
        count = 0
        for user in queryset:
            if user.is_account_locked:
                user.unlock_account()
                count += 1
        self.message_user(request, f'{count} account(s) unlocked successfully.')

    @admin.action(description='Reset failed login attempts')
    def reset_failed_attempts(self, request, queryset):
        """Reset failed login attempts for selected users."""
        updated = queryset.update(
            failed_login_attempts=0,
            last_failed_login=None
        )
        self.message_user(request, f'{updated} user(s) updated successfully.')

    @admin.action(description='Enforce MFA for selected users')
    def enforce_mfa(self, request, queryset):
        """Enforce MFA for selected users."""
        count = 0
        for user in queryset:
            mfa_settings, created = MFASettings.objects.get_or_create(user=user)
            if not mfa_settings.mfa_enforced:
                mfa_settings.mfa_enforced = True
                mfa_settings.save(update_fields=['mfa_enforced'])
                count += 1
        self.message_user(request, f'MFA enforced for {count} user(s).')


@admin.register(MFASettings)
class MFASettingsAdmin(admin.ModelAdmin):
    """Admin interface for MFASettings model."""
    list_display = [
        'user_email', 'mfa_status', 'enforcement_status',
        'totp_status', 'enabled_at', 'last_verified_at',
        'verification_failures'
    ]
    list_filter = [
        'mfa_enabled', 'mfa_enforced', 'totp_enabled',
        'totp_confirmed', 'enabled_at'
    ]
    search_fields = ['user__email', 'user__username', 'user__employee_id']
    ordering = ['-enabled_at']

    readonly_fields = [
        'enabled_at', 'disabled_at', 'last_verified_at',
        'totp_confirmed_at', 'last_failure_at',
        'created_at', 'updated_at'
    ]

    fieldsets = (
        ('User', {'fields': ('user',)}),
        ('MFA Status', {
            'fields': (
                'mfa_enabled', 'mfa_enforced',
                'enabled_at', 'disabled_at'
            )
        }),
        ('TOTP Configuration', {
            'fields': (
                'totp_enabled', 'totp_confirmed',
                'totp_confirmed_at'
            )
        }),
        ('Verification Statistics', {
            'fields': (
                'last_verified_at', 'verification_failures',
                'last_failure_at'
            )
        }),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )

    def user_email(self, obj):
        """Display user email."""
        return obj.user.email
    user_email.short_description = 'User Email'
    user_email.admin_order_field = 'user__email'

    def mfa_status(self, obj):
        """Display MFA enabled status."""
        if obj.mfa_enabled:
            return format_html('<span style="color: green;">✓ Enabled</span>')
        return format_html('<span style="color: gray;">✗ Disabled</span>')
    mfa_status.short_description = 'MFA Enabled'

    def enforcement_status(self, obj):
        """Display MFA enforcement status."""
        if obj.mfa_enforced:
            return format_html('<span style="color: orange; font-weight: bold;">🔒 Enforced</span>')
        return format_html('<span style="color: gray;">Optional</span>')
    enforcement_status.short_description = 'Enforcement'

    def totp_status(self, obj):
        """Display TOTP configuration status."""
        if obj.totp_confirmed:
            return format_html('<span style="color: green;">✓ Confirmed</span>')
        elif obj.totp_enabled:
            return format_html('<span style="color: orange;">⚠️ Pending</span>')
        return format_html('<span style="color: gray;">✗ Not configured</span>')
    totp_status.short_description = 'TOTP Status'


@admin.register(MFABackupCode)
class MFABackupCodeAdmin(admin.ModelAdmin):
    """Admin interface for MFABackupCode model."""
    list_display = [
        'user_email', 'code_status', 'created_at',
        'used_at', 'used_from_ip'
    ]
    list_filter = ['used', 'created_at', 'used_at']
    search_fields = ['user__email', 'user__username', 'used_from_ip']
    ordering = ['-created_at']

    readonly_fields = [
        'code_hash', 'created_at', 'used_at',
        'used_from_ip'
    ]

    fieldsets = (
        ('User', {'fields': ('user',)}),
        ('Code Information', {
            'fields': ('code_hash', 'used', 'created_at')
        }),
        ('Usage Information', {
            'fields': ('used_at', 'used_from_ip')
        }),
    )

    def user_email(self, obj):
        """Display user email."""
        return obj.user.email
    user_email.short_description = 'User Email'
    user_email.admin_order_field = 'user__email'

    def code_status(self, obj):
        """Display backup code status."""
        if obj.used:
            return format_html(
                '<span style="color: red;">✗ Used ({})</span>',
                obj.used_at.strftime('%Y-%m-%d %H:%M') if obj.used_at else 'Unknown'
            )
        return format_html('<span style="color: green;">✓ Available</span>')
    code_status.short_description = 'Status'

    def has_add_permission(self, request):
        """Prevent manual creation of backup codes via admin."""
        return False

# Note: TOTPDevice is already registered by django_otp.plugins.otp_totp
# We don't need to register it again here to avoid conflicts
