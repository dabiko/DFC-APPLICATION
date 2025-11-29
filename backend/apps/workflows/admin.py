"""
Admin configuration for Workflow Management models.
"""

from django.contrib import admin
from apps.workflows.models import (
    WorkflowTemplate,
    WorkflowStep,
    WorkflowInstance,
    WorkflowTask,
    WorkflowComment,
    WorkflowAuditLog,
)


class WorkflowStepInline(admin.TabularInline):
    """Inline for workflow steps within template."""
    model = WorkflowStep
    extra = 1
    fields = ['order', 'name', 'step_type', 'assigned_role', 'sla_hours', 'require_comment']
    ordering = ['order']


@admin.register(WorkflowTemplate)
class WorkflowTemplateAdmin(admin.ModelAdmin):
    """Admin for workflow templates."""
    list_display = ['name', 'category', 'is_active', 'is_system', 'times_used', 'created_by', 'created_at']
    list_filter = ['is_active', 'is_system', 'category', 'organization']
    search_fields = ['name', 'description', 'category']
    readonly_fields = ['id', 'times_used', 'avg_completion_days', 'created_at', 'updated_at']
    inlines = [WorkflowStepInline]

    fieldsets = (
        (None, {
            'fields': ('id', 'name', 'description', 'category', 'organization')
        }),
        ('Configuration', {
            'fields': ('is_active', 'is_system', 'default_priority', 'default_due_days', 'applicable_document_types')
        }),
        ('Statistics', {
            'fields': ('times_used', 'avg_completion_days'),
            'classes': ('collapse',)
        }),
        ('Tracking', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(WorkflowStep)
class WorkflowStepAdmin(admin.ModelAdmin):
    """Admin for workflow steps."""
    list_display = ['template', 'order', 'name', 'step_type', 'assigned_role', 'sla_hours']
    list_filter = ['step_type', 'template']
    search_fields = ['name', 'template__name']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['template', 'order']


class WorkflowTaskInline(admin.TabularInline):
    """Inline for workflow tasks within instance."""
    model = WorkflowTask
    extra = 0
    fields = ['step_order', 'step_name', 'assigned_to', 'status', 'due_date', 'completed_at']
    readonly_fields = ['step_order', 'step_name', 'assigned_to', 'status', 'due_date', 'completed_at']
    ordering = ['step_order']
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(WorkflowInstance)
class WorkflowInstanceAdmin(admin.ModelAdmin):
    """Admin for workflow instances."""
    list_display = ['template_name', 'document', 'status', 'priority', 'current_step', 'due_date', 'initiated_by', 'created_at']
    list_filter = ['status', 'priority', 'organization']
    search_fields = ['template_name', 'document__title', 'initiated_by__username']
    readonly_fields = ['id', 'template_name', 'started_at', 'completed_at', 'created_at', 'updated_at']
    date_hierarchy = 'created_at'
    inlines = [WorkflowTaskInline]

    fieldsets = (
        (None, {
            'fields': ('id', 'template', 'template_name', 'document', 'organization')
        }),
        ('Status', {
            'fields': ('status', 'priority', 'current_step', 'due_date')
        }),
        ('Outcome', {
            'fields': ('notes', 'outcome_reason')
        }),
        ('Timing', {
            'fields': ('started_at', 'completed_at', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
        ('Initiator', {
            'fields': ('initiated_by',)
        }),
    )


@admin.register(WorkflowTask)
class WorkflowTaskAdmin(admin.ModelAdmin):
    """Admin for workflow tasks."""
    list_display = ['step_name', 'workflow', 'assigned_to', 'status', 'due_date', 'is_escalated', 'is_read']
    list_filter = ['status', 'step_type', 'is_escalated', 'is_read']
    search_fields = ['step_name', 'workflow__template_name', 'assigned_to__username']
    readonly_fields = ['id', 'assigned_at', 'started_at', 'completed_at', 'read_at', 'escalated_at', 'created_at', 'updated_at']
    date_hierarchy = 'assigned_at'

    fieldsets = (
        (None, {
            'fields': ('id', 'workflow', 'step_order', 'step_name', 'step_type')
        }),
        ('Assignment', {
            'fields': ('assigned_to', 'delegated_from')
        }),
        ('Status', {
            'fields': ('status', 'action_taken', 'comment')
        }),
        ('Timing', {
            'fields': ('due_date', 'assigned_at', 'started_at', 'completed_at')
        }),
        ('Escalation', {
            'fields': ('is_escalated', 'escalated_at'),
            'classes': ('collapse',)
        }),
        ('Read Status', {
            'fields': ('is_read', 'read_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(WorkflowComment)
class WorkflowCommentAdmin(admin.ModelAdmin):
    """Admin for workflow comments."""
    list_display = ['author', 'workflow', 'task', 'created_at', 'is_edited']
    list_filter = ['is_edited']
    search_fields = ['content', 'author__username', 'workflow__template_name']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(WorkflowAuditLog)
class WorkflowAuditLogAdmin(admin.ModelAdmin):
    """Admin for workflow audit logs (read-only)."""
    list_display = ['action', 'actor', 'workflow', 'task', 'timestamp']
    list_filter = ['action']
    search_fields = ['details', 'actor__username', 'workflow__template_name']
    readonly_fields = ['id', 'workflow', 'task', 'action', 'actor', 'details', 'metadata', 'ip_address', 'user_agent', 'timestamp']
    date_hierarchy = 'timestamp'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
