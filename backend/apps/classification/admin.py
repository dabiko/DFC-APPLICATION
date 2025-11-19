"""
Django admin configuration for classification models.
"""
from django.contrib import admin
from apps.classification.models import ClassificationRule, ClassificationLog


@admin.register(ClassificationRule)
class ClassificationRuleAdmin(admin.ModelAdmin):
    """Admin interface for ClassificationRule."""

    list_display = [
        'name',
        'priority',
        'is_active',
        'applied_count',
        'last_applied_at',
        'created_at',
        'created_by',
    ]

    list_filter = [
        'is_active',
        'created_at',
        'last_applied_at',
    ]

    search_fields = [
        'name',
        'description',
    ]

    readonly_fields = [
        'applied_count',
        'last_applied_at',
        'created_at',
        'created_by',
        'updated_at',
        'updated_by',
    ]

    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'priority', 'is_active')
        }),
        ('Rule Configuration', {
            'fields': ('conditions', 'actions'),
            'description': 'Define when and how this rule should be applied'
        }),
        ('Statistics', {
            'fields': ('applied_count', 'last_applied_at'),
            'classes': ('collapse',)
        }),
        ('Audit Information', {
            'fields': ('created_at', 'created_by', 'updated_at', 'updated_by'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        """Set created_by/updated_by on save."""
        if not change:  # Creating new object
            obj.created_by = request.user
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(ClassificationLog)
class ClassificationLogAdmin(admin.ModelAdmin):
    """Admin interface for ClassificationLog."""

    list_display = [
        'id',
        'rule',
        'document',
        'applied_at',
        'success',
        'triggered_by',
    ]

    list_filter = [
        'success',
        'triggered_by',
        'applied_at',
    ]

    search_fields = [
        'rule__name',
        'document__title',
        'document__file_name',
    ]

    readonly_fields = [
        'rule',
        'document',
        'applied_at',
        'conditions_matched',
        'actions_applied',
        'success',
        'error_message',
        'triggered_by',
    ]

    fieldsets = (
        ('Classification Details', {
            'fields': ('rule', 'document', 'applied_at', 'triggered_by')
        }),
        ('Rule Configuration', {
            'fields': ('conditions_matched', 'actions_applied'),
        }),
        ('Result', {
            'fields': ('success', 'error_message'),
        }),
    )

    def has_add_permission(self, request):
        """Disable manual creation of logs."""
        return False

    def has_change_permission(self, request, obj=None):
        """Disable editing of logs."""
        return False

    def has_delete_permission(self, request, obj=None):
        """Only superusers can delete logs."""
        return request.user.is_superuser
