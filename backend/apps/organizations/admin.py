"""
Admin interface for organization management with color-coded status.
"""
from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import Organization, OrganizationMember, OrganizationInvitation


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    """Admin interface for Organization model."""

    list_display = [
        'name',
        'domain',
        'colored_subscription_status',
        'subscription_plan',
        'user_count_display',
        'storage_display',
        'trial_status',
        'is_active',
        'created_at'
    ]
    list_filter = [
        'subscription_plan',
        'subscription_status',
        'is_active',
        'created_at'
    ]
    search_fields = ['name', 'domain', 'slug']
    readonly_fields = [
        'slug',
        'created_at',
        'updated_at',
        'current_user_count',
        'trial_status',
        'days_until_trial_expires'
    ]
    fieldsets = (
        ('Organization Identity', {
            'fields': ('name', 'domain', 'slug')
        }),
        ('Subscription', {
            'fields': (
                'subscription_plan',
                'subscription_status',
                'trial_ends_at',
                'trial_status',
                'days_until_trial_expires'
            )
        }),
        ('Resource Limits', {
            'fields': (
                'max_users',
                'max_storage_gb',
                'max_documents',
                'current_user_count'
            )
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def colored_subscription_status(self, obj):
        """Display subscription status with color coding."""
        colors = {
            'trial': '#FFA500',      # Orange
            'active': '#28a745',     # Green
            'past_due': '#ffc107',   # Yellow
            'cancelled': '#dc3545',  # Red
            'suspended': '#6c757d',  # Gray
        }
        color = colors.get(obj.subscription_status, '#000000')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_subscription_status_display()
        )
    colored_subscription_status.short_description = 'Status'

    def user_count_display(self, obj):
        """Display current user count vs limit."""
        current = obj.current_user_count
        maximum = obj.max_users
        percentage = (current / maximum * 100) if maximum > 0 else 0

        # Color code based on usage
        if percentage >= 90:
            color = '#dc3545'  # Red
        elif percentage >= 75:
            color = '#ffc107'  # Yellow
        else:
            color = '#28a745'  # Green

        return format_html(
            '<span style="color: {};">{} / {}</span>',
            color,
            current,
            maximum
        )
    user_count_display.short_description = 'Users'

    def storage_display(self, obj):
        """Display storage limit."""
        return f"{obj.max_storage_gb} GB"
    storage_display.short_description = 'Storage'

    def trial_status(self, obj):
        """Display trial expiration status."""
        if obj.subscription_status != 'trial':
            return 'N/A'

        if obj.is_trial_expired:
            return format_html('<span style="color: #dc3545;">Expired</span>')

        days = obj.days_until_trial_expires
        if days is None:
            return 'N/A'

        if days <= 3:
            color = '#dc3545'  # Red
        elif days <= 7:
            color = '#ffc107'  # Yellow
        else:
            color = '#28a745'  # Green

        return format_html(
            '<span style="color: {};">{} days left</span>',
            color,
            days
        )
    trial_status.short_description = 'Trial Status'

    # Bulk actions
    actions = ['activate_organizations', 'suspend_organizations', 'extend_trial']

    @admin.action(description='Activate selected organizations')
    def activate_organizations(self, request, queryset):
        """Bulk activate organizations."""
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} organization(s) activated successfully.')

    @admin.action(description='Suspend selected organizations')
    def suspend_organizations(self, request, queryset):
        """Bulk suspend organizations."""
        updated = queryset.update(
            is_active=False,
            subscription_status='suspended'
        )
        self.message_user(request, f'{updated} organization(s) suspended.')

    @admin.action(description='Extend trial by 14 days')
    def extend_trial(self, request, queryset):
        """Extend trial period by 14 days for selected organizations."""
        from datetime import timedelta

        count = 0
        for org in queryset:
            if org.trial_ends_at:
                org.trial_ends_at = org.trial_ends_at + timedelta(days=14)
            else:
                org.trial_ends_at = timezone.now() + timedelta(days=14)
            org.subscription_status = 'trial'
            org.save()
            count += 1

        self.message_user(request, f'Trial extended by 14 days for {count} organization(s).')


@admin.register(OrganizationMember)
class OrganizationMemberAdmin(admin.ModelAdmin):
    """Admin interface for OrganizationMember model."""

    list_display = [
        'user_email',
        'organization',
        'colored_role',
        'is_active',
        'joined_at'
    ]
    list_filter = [
        'role',
        'is_active',
        'organization',
        'joined_at'
    ]
    search_fields = [
        'user__email',
        'user__first_name',
        'user__last_name',
        'organization__name'
    ]
    readonly_fields = ['joined_at', 'updated_at']
    fieldsets = (
        ('Membership', {
            'fields': ('organization', 'user', 'role', 'is_active')
        }),
        ('Metadata', {
            'fields': ('joined_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def user_email(self, obj):
        """Display user email."""
        return obj.user.email
    user_email.short_description = 'User'

    def colored_role(self, obj):
        """Display role with color coding."""
        colors = {
            'owner': '#dc3545',     # Red
            'admin': '#fd7e14',     # Orange
            'manager': '#ffc107',   # Yellow
            'member': '#28a745',    # Green
            'viewer': '#6c757d',    # Gray
        }
        color = colors.get(obj.role, '#000000')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_role_display()
        )
    colored_role.short_description = 'Role'


@admin.register(OrganizationInvitation)
class OrganizationInvitationAdmin(admin.ModelAdmin):
    """Admin interface for OrganizationInvitation model."""

    list_display = [
        'email',
        'organization',
        'colored_status',
        'role',
        'invited_by_email',
        'created_at',
        'expiry_display'
    ]
    list_filter = [
        'status',
        'role',
        'organization',
        'created_at'
    ]
    search_fields = [
        'email',
        'organization__name',
        'invited_by__email'
    ]
    readonly_fields = [
        'token',
        'created_at',
        'expires_at',
        'accepted_at',
        'declined_at',
        'revoked_at',
        'is_expired',
        'is_valid',
        'matches_organization_domain'
    ]
    fieldsets = (
        ('Invitation Details', {
            'fields': (
                'organization',
                'email',
                'invited_by',
                'role',
                'status'
            )
        }),
        ('Token', {
            'fields': ('token',),
            'classes': ('collapse',)
        }),
        ('Validation', {
            'fields': (
                'is_valid',
                'is_expired',
                'matches_organization_domain'
            )
        }),
        ('Timestamps', {
            'fields': (
                'created_at',
                'expires_at',
                'accepted_at',
                'declined_at',
                'revoked_at'
            ),
            'classes': ('collapse',)
        }),
    )

    def invited_by_email(self, obj):
        """Display inviter email."""
        return obj.invited_by.email
    invited_by_email.short_description = 'Invited By'

    def colored_status(self, obj):
        """Display status with color coding."""
        colors = {
            'pending': '#ffc107',   # Yellow
            'accepted': '#28a745',  # Green
            'declined': '#6c757d',  # Gray
            'expired': '#dc3545',   # Red
            'revoked': '#dc3545',   # Red
        }
        color = colors.get(obj.status, '#000000')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    colored_status.short_description = 'Status'

    def expiry_display(self, obj):
        """Display expiration info with color coding."""
        if obj.status != 'pending':
            return 'N/A'

        if obj.is_expired:
            return format_html('<span style="color: #dc3545;">Expired</span>')

        delta = obj.expires_at - timezone.now()
        hours = int(delta.total_seconds() / 3600)

        if hours <= 24:
            color = '#dc3545'  # Red
        elif hours <= 72:
            color = '#ffc107'  # Yellow
        else:
            color = '#28a745'  # Green

        days = delta.days
        if days > 0:
            text = f"{days} day{'s' if days != 1 else ''}"
        else:
            text = f"{hours} hour{'s' if hours != 1 else ''}"

        return format_html(
            '<span style="color: {};">{}</span>',
            color,
            text
        )
    expiry_display.short_description = 'Expires In'

    actions = ['revoke_invitations']

    def revoke_invitations(self, request, queryset):
        """Bulk revoke invitations."""
        count = 0
        for invitation in queryset:
            if invitation.status == 'pending':
                invitation.revoke()
                count += 1
        self.message_user(request, f'{count} invitation(s) revoked.')
    revoke_invitations.short_description = 'Revoke selected invitations'
