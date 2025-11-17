from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    """Admin interface for CustomUser model"""

    list_display = (
        'email',
        'first_name',
        'last_name',
        'role',
        'department',
        'mfa_enabled',
        'failed_login_attempts',
        'is_locked',
        'is_active',
        'date_joined',
    )
    list_filter = ('role', 'department', 'is_active', 'is_locked', 'mfa_enabled', 'date_joined')
    search_fields = ('email', 'first_name', 'last_name', 'username')
    ordering = ('-date_joined',)

    fieldsets = UserAdmin.fieldsets + (
        ('Additional Info', {
            'fields': ('role', 'department', 'mfa_enabled', 'avatar')
        }),
        ('Security & Login Tracking', {
            'fields': ('failed_login_attempts', 'is_locked', 'locked_at'),
            'classes': ('collapse',),
        }),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Additional Info', {
            'fields': ('email', 'first_name', 'last_name', 'role', 'department')
        }),
    )

    readonly_fields = ('locked_at',)

    actions = ['unlock_selected_accounts']

    def unlock_selected_accounts(self, request, queryset):
        """Admin action to unlock selected accounts"""
        locked_users = queryset.filter(is_locked=True)
        count = locked_users.count()
        for user in locked_users:
            user.unlock_account()
        self.message_user(request, f'Successfully unlocked {count} account(s).')

    unlock_selected_accounts.short_description = 'Unlock selected accounts'
