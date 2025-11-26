"""
Django admin interface for retention policies and legal holds.

Admin classes:
- RetentionPolicyAdmin: Manage retention policies
- LegalHoldAdmin: Manage legal holds
- RetentionScheduleAdmin: View retention schedules (read-only)
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from apps.retention.models import (
    RetentionPolicy,
    LegalHold,
    LegalHoldDocument,
    RetentionSchedule
)


@admin.register(RetentionPolicy)
class RetentionPolicyAdmin(admin.ModelAdmin):
    """Admin interface for retention policies"""

    list_display = [
        'name',
        'policy_type',
        'retention_days_display',
        'grace_period_days',
        'priority',
        'is_active_display',
        'applied_count',
        'created_at',
    ]

    list_filter = [
        'policy_type',
        'is_active',
        'created_at',
    ]

    search_fields = [
        'name',
        'description',
    ]

    readonly_fields = [
        'id',
        'created_by',
        'created_at',
        'updated_at',
        'applied_count',
    ]

    fieldsets = [
        ('Basic Information', {
            'fields': [
                'id',
                'name',
                'description',
                'policy_type',
            ]
        }),
        ('Retention Settings', {
            'fields': [
                'retention_days',
                'grace_period_days',
                'notify_before_days',
            ]
        }),
        ('Matching Criteria', {
            'fields': [
                'criteria',
            ],
            'description': 'JSON criteria for matching documents'
        }),
        ('Status', {
            'fields': [
                'is_active',
                'priority',
            ]
        }),
        ('Audit Information', {
            'fields': [
                'created_by',
                'created_at',
                'updated_at',
                'applied_count',
            ],
            'classes': ['collapse'],
        }),
    ]

    def retention_days_display(self, obj):
        """Display retention days with years conversion"""
        years = obj.retention_days / 365.25
        return f'{obj.retention_days} days (~{years:.1f} years)'
    retention_days_display.short_description = 'Retention Period'

    def is_active_display(self, obj):
        """Display active status with colored icon"""
        if obj.is_active:
            return format_html(
                '<span style="color: green;">✓ Active</span>'
            )
        return format_html(
            '<span style="color: red;">✗ Inactive</span>'
        )
    is_active_display.short_description = 'Status'

    def applied_count(self, obj):
        """Display count of applied schedules"""
        count = obj.schedules.count()
        if count > 0:
            url = reverse('admin:retention_retentionschedule_changelist') + f'?policy__id__exact={obj.id}'
            return format_html(
                '<a href="{}">{} documents</a>',
                url,
                count
            )
        return '0 documents'
    applied_count.short_description = 'Applied To'

    def save_model(self, request, obj, form, change):
        """Set created_by on creation"""
        if not change:  # Creating new
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


class LegalHoldDocumentInline(admin.TabularInline):
    """Inline for documents under legal hold"""

    model = LegalHoldDocument
    extra = 0
    readonly_fields = ['document', 'added_by', 'added_at']
    fields = ['document', 'added_by', 'added_at', 'reason']
    can_delete = True


@admin.register(LegalHold)
class LegalHoldAdmin(admin.ModelAdmin):
    """Admin interface for legal holds"""

    list_display = [
        'case_number',
        'title',
        'is_active_display',
        'document_count',
        'start_date',
        'end_date',
        'created_by',
        'released_status',
    ]

    list_filter = [
        'is_active',
        'start_date',
        'created_at',
    ]

    search_fields = [
        'case_number',
        'title',
        'reason',
    ]

    readonly_fields = [
        'id',
        'created_by',
        'created_at',
        'updated_at',
        'released_by',
        'released_at',
        'document_count',
    ]

    fieldsets = [
        ('Case Information', {
            'fields': [
                'id',
                'case_number',
                'title',
                'reason',
            ]
        }),
        ('Hold Period', {
            'fields': [
                'start_date',
                'end_date',
            ]
        }),
        ('Status', {
            'fields': [
                'is_active',
            ]
        }),
        ('Creation Details', {
            'fields': [
                'created_by',
                'created_at',
                'updated_at',
            ],
            'classes': ['collapse'],
        }),
        ('Release Details', {
            'fields': [
                'released_by',
                'released_at',
            ],
            'classes': ['collapse'],
        }),
        ('Summary', {
            'fields': [
                'document_count',
            ],
            'classes': ['collapse'],
        }),
    ]

    inlines = [LegalHoldDocumentInline]

    def is_active_display(self, obj):
        """Display active status with colored icon"""
        if obj.is_active:
            return format_html(
                '<span style="color: red; font-weight: bold;">⚠ ACTIVE HOLD</span>'
            )
        return format_html(
            '<span style="color: gray;">Released</span>'
        )
    is_active_display.short_description = 'Status'

    def document_count(self, obj):
        """Display count of held documents"""
        count = obj.documents.count()
        if count > 0:
            return format_html(
                '<strong>{} documents</strong>',
                count
            )
        return '0 documents'
    document_count.short_description = 'Documents Held'

    def released_status(self, obj):
        """Display release information"""
        if obj.released_at:
            return f'Released {obj.released_at.strftime("%Y-%m-%d")}'
        return '-'
    released_status.short_description = 'Released'

    def save_model(self, request, obj, form, change):
        """Set created_by on creation"""
        if not change:  # Creating new
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(RetentionSchedule)
class RetentionScheduleAdmin(admin.ModelAdmin):
    """Admin interface for retention schedules (read-only)"""

    list_display = [
        'document',
        'policy',
        'status_display',
        'notification_date',
        'deletion_date',
        'days_remaining',
        'can_delete_display',
    ]

    list_filter = [
        'status',
        'notification_sent',
        'created_at',
    ]

    search_fields = [
        'document__title',
        'policy__name',
    ]

    readonly_fields = [
        'id',
        'document',
        'policy',
        'retention_end_date',
        'notification_date',
        'deletion_date',
        'status',
        'notification_sent',
        'created_at',
        'updated_at',
        'deleted_at',
        'days_remaining',
        'can_delete_display',
    ]

    fieldsets = [
        ('Schedule Information', {
            'fields': [
                'id',
                'document',
                'policy',
            ]
        }),
        ('Important Dates', {
            'fields': [
                'retention_end_date',
                'notification_date',
                'deletion_date',
                'days_remaining',
            ]
        }),
        ('Status', {
            'fields': [
                'status',
                'notification_sent',
                'can_delete_display',
            ]
        }),
        ('Audit', {
            'fields': [
                'created_at',
                'updated_at',
                'deleted_at',
            ],
            'classes': ['collapse'],
        }),
    ]

    def has_add_permission(self, request):
        """Disable manual creation"""
        return False

    def has_delete_permission(self, request, obj=None):
        """Disable manual deletion"""
        return False

    def status_display(self, obj):
        """Display status with colors"""
        colors = {
            'PENDING': 'orange',
            'NOTIFIED': 'blue',
            'DELETED': 'gray',
            'CANCELLED': 'red',
        }
        color = colors.get(obj.status, 'black')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_display.short_description = 'Status'

    def days_remaining(self, obj):
        """Calculate and display days until deletion"""
        from django.utils import timezone
        delta = obj.deletion_date - timezone.now()
        days = delta.days

        if days < 0:
            return format_html(
                '<span style="color: red; font-weight: bold;">OVERDUE by {} days</span>',
                abs(days)
            )
        elif days <= 7:
            return format_html(
                '<span style="color: red;">{} days</span>',
                days
            )
        elif days <= 30:
            return format_html(
                '<span style="color: orange;">{} days</span>',
                days
            )
        else:
            return f'{days} days'
    days_remaining.short_description = 'Days Until Deletion'

    def can_delete_display(self, obj):
        """Display whether document can be deleted"""
        if obj.can_delete():
            return format_html(
                '<span style="color: green;">✓ Can Delete</span>'
            )
        else:
            return format_html(
                '<span style="color: red;">✗ Legal Hold Active</span>'
            )
    can_delete_display.short_description = 'Deletion Allowed'
