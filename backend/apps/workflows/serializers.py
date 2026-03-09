"""
Serializers for Workflow Management API.

Provides serialization for workflow templates, instances, tasks, and related models.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.workflows.models import (
    WorkflowTemplate,
    WorkflowStep,
    WorkflowInstance,
    WorkflowTask,
    WorkflowComment,
    WorkflowAuditLog,
    WorkflowAutoTriggerRule,
    WorkflowPriority,
    WorkflowStepType,
    WorkflowApprovalType,
    WorkflowInstanceStatus,
    WorkflowTaskStatus,
)

User = get_user_model()


# =============================================================================
# User Serializers (for nested representation)
# =============================================================================

class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal user info for workflow display."""
    full_name = serializers.CharField(source='get_full_name', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name']
        read_only_fields = fields


# =============================================================================
# Workflow Step Serializers
# =============================================================================

class WorkflowStepSerializer(serializers.ModelSerializer):
    """Serializer for workflow steps."""
    assigned_users_detail = UserMinimalSerializer(
        source='assigned_users',
        many=True,
        read_only=True
    )
    department_name = serializers.CharField(
        source='assigned_department.name',
        read_only=True,
        allow_null=True
    )

    class Meta:
        model = WorkflowStep
        fields = [
            'id', 'name', 'description', 'order',
            'step_type', 'approval_type', 'approval_percentage',
            'assigned_users', 'assigned_users_detail',
            'assigned_role', 'assigned_department', 'department_name',
            'sla_hours', 'escalation_hours', 'escalate_to',
            'conditions', 'auto_approve_if_same_user', 'require_comment',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class WorkflowStepCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating workflow steps."""

    class Meta:
        model = WorkflowStep
        fields = [
            'name', 'description', 'order',
            'step_type', 'approval_type', 'approval_percentage',
            'assigned_users', 'assigned_role', 'assigned_department',
            'sla_hours', 'escalation_hours', 'escalate_to',
            'conditions', 'auto_approve_if_same_user', 'require_comment',
        ]

    def validate(self, data):
        """Validate step configuration."""
        step_type = data.get('step_type', WorkflowStepType.APPROVAL)
        approval_type = data.get('approval_type', WorkflowApprovalType.ALL)

        # If approval_type is PERCENTAGE, require approval_percentage
        if approval_type == WorkflowApprovalType.PERCENTAGE:
            if not data.get('approval_percentage'):
                raise serializers.ValidationError({
                    'approval_percentage': 'Required when approval_type is PERCENTAGE'
                })
            if data['approval_percentage'] < 1 or data['approval_percentage'] > 100:
                raise serializers.ValidationError({
                    'approval_percentage': 'Must be between 1 and 100'
                })

        # Validate escalation_hours < sla_hours
        sla_hours = data.get('sla_hours')
        escalation_hours = data.get('escalation_hours')
        if sla_hours and escalation_hours and escalation_hours >= sla_hours:
            raise serializers.ValidationError({
                'escalation_hours': 'Must be less than SLA hours'
            })

        return data


# =============================================================================
# Workflow Template Serializers
# =============================================================================

class WorkflowTemplateListSerializer(serializers.ModelSerializer):
    """Serializer for listing workflow templates (minimal data)."""
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    step_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = WorkflowTemplate
        fields = [
            'id', 'name', 'description', 'category',
            'is_active', 'is_system',
            'default_priority', 'default_due_days',
            'times_used', 'avg_completion_days',
            'step_count', 'created_by', 'created_by_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'times_used', 'avg_completion_days', 'created_at', 'updated_at']


class WorkflowTemplateDetailSerializer(serializers.ModelSerializer):
    """Serializer for workflow template details (with steps)."""
    steps = WorkflowStepSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    step_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = WorkflowTemplate
        fields = [
            'id', 'name', 'description', 'category',
            'is_active', 'is_system',
            'default_priority', 'default_due_days',
            'applicable_document_types',
            'times_used', 'avg_completion_days',
            'step_count', 'steps',
            'created_by', 'created_by_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'times_used', 'avg_completion_days', 'created_at', 'updated_at']


class WorkflowTemplateCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating workflow templates."""
    steps = WorkflowStepCreateSerializer(many=True, required=False)

    class Meta:
        model = WorkflowTemplate
        fields = [
            'name', 'description', 'category',
            'is_active', 'default_priority', 'default_due_days',
            'applicable_document_types', 'steps',
        ]

    def create(self, validated_data):
        """Create template with steps."""
        steps_data = validated_data.pop('steps', [])
        validated_data['created_by'] = self.context['request'].user
        validated_data['organization'] = self.context['request'].user.organization

        template = WorkflowTemplate.objects.create(**validated_data)

        # Create steps
        for order, step_data in enumerate(steps_data, start=1):
            assigned_users = step_data.pop('assigned_users', [])
            step = WorkflowStep.objects.create(
                template=template,
                order=order,
                **step_data
            )
            if assigned_users:
                step.assigned_users.set(assigned_users)

        return template

    def update(self, instance, validated_data):
        """Update template and optionally its steps."""
        steps_data = validated_data.pop('steps', None)

        # Update template fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update steps if provided
        if steps_data is not None:
            # Delete existing steps
            instance.steps.all().delete()

            # Create new steps
            for order, step_data in enumerate(steps_data, start=1):
                assigned_users = step_data.pop('assigned_users', [])
                step = WorkflowStep.objects.create(
                    template=instance,
                    order=order,
                    **step_data
                )
                if assigned_users:
                    step.assigned_users.set(assigned_users)

        return instance


# =============================================================================
# Workflow Task Serializers
# =============================================================================

class WorkflowTaskListSerializer(serializers.ModelSerializer):
    """Serializer for listing tasks (My Tasks inbox)."""
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    delegated_from_name = serializers.CharField(
        source='delegated_from.get_full_name',
        read_only=True,
        allow_null=True
    )
    workflow_id = serializers.UUIDField(source='workflow.id', read_only=True)
    target_id = serializers.UUIDField(source='workflow.target_object_id', read_only=True)
    target_title = serializers.CharField(source='workflow.target_title', read_only=True)
    target_type = serializers.CharField(source='workflow.target_type', read_only=True)
    workflow_name = serializers.CharField(source='workflow.template_name', read_only=True)
    priority = serializers.CharField(source='workflow.priority', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = WorkflowTask
        fields = [
            'id', 'workflow_id', 'target_id', 'target_title', 'target_type',
            'workflow_name',
            'step_order', 'step_name', 'step_type',
            'assigned_to', 'assigned_to_name',
            'delegated_from', 'delegated_from_name',
            'status', 'action_taken', 'priority',
            'due_date', 'assigned_at', 'completed_at',
            'is_escalated', 'is_read', 'is_overdue',
            'comment',
        ]
        read_only_fields = fields


class WorkflowTaskDetailSerializer(serializers.ModelSerializer):
    """Serializer for task details."""
    assigned_to_detail = UserMinimalSerializer(source='assigned_to', read_only=True)
    delegated_from_detail = UserMinimalSerializer(source='delegated_from', read_only=True)
    workflow_detail = serializers.SerializerMethodField()
    comments = serializers.SerializerMethodField()
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = WorkflowTask
        fields = [
            'id', 'workflow', 'workflow_detail',
            'step_order', 'step_name', 'step_type',
            'assigned_to', 'assigned_to_detail',
            'delegated_from', 'delegated_from_detail',
            'status', 'action_taken',
            'due_date', 'assigned_at', 'started_at', 'completed_at',
            'is_escalated', 'escalated_at',
            'is_read', 'read_at', 'is_overdue',
            'comment', 'comments',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_workflow_detail(self, obj):
        """Get basic workflow info."""
        workflow = obj.workflow
        target_info = {
            'id': str(workflow.target_object_id),
            'title': workflow.target_title,
            'type': workflow.target_type,
        }
        # Add extra fields if the target is a document and is loaded
        target = workflow.target
        if target and workflow.is_document_workflow:
            target_info['file_name'] = getattr(target, 'file_name', '')
        return {
            'id': str(workflow.id),
            'template_name': workflow.template_name,
            'status': workflow.status,
            'priority': workflow.priority,
            'target': target_info,
            'initiated_by': {
                'id': workflow.initiated_by.id,
                'name': workflow.initiated_by.get_full_name(),
            },
            'due_date': workflow.due_date,
            'current_step': workflow.current_step,
        }

    def get_comments(self, obj):
        """Get comments on this task."""
        comments = obj.comments.select_related('author').all()
        return WorkflowCommentSerializer(comments, many=True).data


class TaskActionSerializer(serializers.Serializer):
    """Serializer for task actions (approve/reject/delegate)."""
    action = serializers.ChoiceField(choices=['approve', 'reject', 'delegate'])
    comment = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    delegate_to = serializers.IntegerField(required=False, help_text='User ID to delegate to')

    def validate(self, data):
        """Validate action-specific requirements."""
        action = data.get('action')

        if action == 'delegate' and not data.get('delegate_to'):
            raise serializers.ValidationError({
                'delegate_to': 'Required when action is delegate'
            })

        # Check if delegate_to user exists
        if data.get('delegate_to'):
            try:
                User.objects.get(pk=data['delegate_to'])
            except User.DoesNotExist:
                raise serializers.ValidationError({
                    'delegate_to': 'User not found'
                })

        return data


# =============================================================================
# Workflow Instance Serializers
# =============================================================================

class WorkflowInstanceListSerializer(serializers.ModelSerializer):
    """Serializer for listing workflow instances."""
    initiated_by_name = serializers.CharField(source='initiated_by.get_full_name', read_only=True)
    target_id = serializers.UUIDField(source='target_object_id', read_only=True)
    target_title = serializers.CharField(read_only=True)
    target_type = serializers.CharField(read_only=True)
    current_step_name = serializers.SerializerMethodField()
    current_assignee = serializers.SerializerMethodField()
    is_overdue = serializers.BooleanField(read_only=True)
    days_remaining = serializers.IntegerField(read_only=True)

    class Meta:
        model = WorkflowInstance
        fields = [
            'id', 'template', 'template_name',
            'target_id', 'target_title', 'target_type',
            'target_content_type',
            'status', 'priority',
            'current_step', 'current_step_name', 'current_assignee',
            'due_date', 'started_at', 'completed_at',
            'is_overdue', 'days_remaining',
            'initiated_by', 'initiated_by_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_current_step_name(self, obj):
        """Get the name of the current step."""
        current_task = obj.tasks.filter(
            step_order=obj.current_step,
            status__in=[WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS]
        ).first()
        return current_task.step_name if current_task else None

    def get_current_assignee(self, obj):
        """Get the current assignee(s)."""
        current_tasks = obj.tasks.filter(
            step_order=obj.current_step,
            status__in=[WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS]
        ).select_related('assigned_to')
        return [
            {
                'id': task.assigned_to.id,
                'name': task.assigned_to.get_full_name(),
            }
            for task in current_tasks
        ]


class WorkflowInstanceDetailSerializer(serializers.ModelSerializer):
    """Serializer for workflow instance details."""
    initiated_by_detail = UserMinimalSerializer(source='initiated_by', read_only=True)
    target_detail = serializers.SerializerMethodField()
    target_type = serializers.CharField(read_only=True)
    template_detail = serializers.SerializerMethodField()
    tasks = WorkflowTaskListSerializer(many=True, read_only=True)
    comments = serializers.SerializerMethodField()
    audit_logs = serializers.SerializerMethodField()
    is_overdue = serializers.BooleanField(read_only=True)
    days_remaining = serializers.IntegerField(read_only=True)

    class Meta:
        model = WorkflowInstance
        fields = [
            'id', 'template', 'template_name', 'template_detail',
            'target_content_type', 'target_object_id', 'target_title',
            'target_type', 'target_detail',
            'status', 'priority', 'current_step',
            'due_date', 'started_at', 'completed_at',
            'is_overdue', 'days_remaining',
            'initiated_by', 'initiated_by_detail',
            'notes', 'outcome_reason',
            'tasks', 'comments', 'audit_logs',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_target_detail(self, obj):
        """Get target object details (Document, Procedure, etc.)."""
        target = obj.target
        detail = {
            'id': str(obj.target_object_id),
            'title': obj.target_title,
            'type': obj.target_type,
        }
        if target and obj.is_document_workflow:
            detail.update({
                'file_name': getattr(target, 'file_name', ''),
                'file_type': getattr(target, 'file_type', ''),
                'document_type': getattr(target, 'document_type', ''),
                'confidentiality_level': getattr(target, 'confidentiality_level', ''),
            })
        elif target and obj.is_procedure_workflow:
            detail.update({
                'status': getattr(target, 'status', ''),
                'current_version': getattr(target, 'current_version', None),
            })
        return detail

    def get_template_detail(self, obj):
        """Get template details if still exists."""
        if not obj.template:
            return None
        return {
            'id': str(obj.template.id),
            'name': obj.template.name,
            'category': obj.template.category,
            'step_count': obj.template.step_count,
        }

    def get_comments(self, obj):
        """Get workflow-level comments."""
        comments = obj.comments.filter(task__isnull=True).select_related('author')
        return WorkflowCommentSerializer(comments, many=True).data

    def get_audit_logs(self, obj):
        """Get recent audit logs."""
        logs = obj.audit_logs.select_related('actor', 'task')[:20]
        return WorkflowAuditLogSerializer(logs, many=True).data


class WorkflowInstanceCreateSerializer(serializers.Serializer):
    """Serializer for starting a new workflow."""
    template_id = serializers.UUIDField()
    # Generic target: provide target_type + target_id
    # target_type is the model name (e.g. 'document', 'procedure')
    target_type = serializers.CharField(
        default='document',
        help_text='Model name of the target: "document" or "procedure"'
    )
    target_id = serializers.UUIDField(
        help_text='UUID of the target object (document or procedure)'
    )
    priority = serializers.ChoiceField(
        choices=WorkflowPriority.choices,
        default=WorkflowPriority.MEDIUM
    )
    due_date = serializers.DateTimeField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True, max_length=2000)

    def validate_template_id(self, value):
        """Validate template exists and is active."""
        try:
            template = WorkflowTemplate.objects.get(pk=value, is_active=True)
            if template.steps.count() == 0:
                raise serializers.ValidationError('Template has no steps configured')
            return value
        except WorkflowTemplate.DoesNotExist:
            raise serializers.ValidationError('Template not found or inactive')

    def validate(self, data):
        """Validate target object exists based on target_type."""
        from django.contrib.contenttypes.models import ContentType

        target_type = data.get('target_type', 'document')
        target_id = data.get('target_id')

        # Resolve content type
        app_label_map = {
            'document': 'documents',
            'procedure': 'procedures',
        }
        app_label = app_label_map.get(target_type)
        if not app_label:
            raise serializers.ValidationError({
                'target_type': f'Unsupported target type: {target_type}. '
                               f'Supported: {", ".join(app_label_map.keys())}'
            })

        try:
            ct = ContentType.objects.get(app_label=app_label, model=target_type)
        except ContentType.DoesNotExist:
            raise serializers.ValidationError({
                'target_type': f'Content type not found for {target_type}'
            })

        # Verify the object exists
        model_class = ct.model_class()
        if model_class and not model_class.objects.filter(pk=target_id).exists():
            raise serializers.ValidationError({
                'target_id': f'{target_type.capitalize()} not found'
            })

        data['content_type'] = ct
        return data


# =============================================================================
# Workflow Comment Serializers
# =============================================================================

class WorkflowCommentSerializer(serializers.ModelSerializer):
    """Serializer for workflow comments."""
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)

    class Meta:
        model = WorkflowComment
        fields = [
            'id', 'workflow', 'task',
            'author', 'author_name', 'content',
            'mentions', 'is_edited',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'author', 'is_edited', 'created_at', 'updated_at']


class WorkflowCommentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating comments."""

    class Meta:
        model = WorkflowComment
        fields = ['content', 'mentions', 'task']

    def create(self, validated_data):
        validated_data['author'] = self.context['request'].user
        validated_data['workflow'] = self.context['workflow']
        return super().create(validated_data)


# =============================================================================
# Workflow Audit Log Serializers
# =============================================================================

class WorkflowAuditLogSerializer(serializers.ModelSerializer):
    """Serializer for workflow audit logs."""
    actor_name = serializers.CharField(source='actor.get_full_name', read_only=True, allow_null=True)
    task_name = serializers.CharField(source='task.step_name', read_only=True, allow_null=True)

    class Meta:
        model = WorkflowAuditLog
        fields = [
            'id', 'workflow', 'task', 'task_name',
            'action', 'actor', 'actor_name',
            'details', 'metadata',
            'timestamp',
        ]
        read_only_fields = fields


# =============================================================================
# Dashboard/Stats Serializers
# =============================================================================

class WorkflowStatsSerializer(serializers.Serializer):
    """Serializer for workflow statistics."""
    total_active = serializers.IntegerField()
    pending_my_action = serializers.IntegerField()
    overdue = serializers.IntegerField()
    completed_this_week = serializers.IntegerField()
    completed_this_month = serializers.IntegerField()
    avg_completion_days = serializers.FloatField()


class TaskStatsSerializer(serializers.Serializer):
    """Serializer for task statistics."""
    total_pending = serializers.IntegerField()
    total_in_progress = serializers.IntegerField()
    total_overdue = serializers.IntegerField()
    unread = serializers.IntegerField()
    completed_today = serializers.IntegerField()
    completed_this_week = serializers.IntegerField()


# =============================================================================
# Workflow Auto-Trigger Rule Serializers
# =============================================================================

class AutoTriggerRuleListSerializer(serializers.ModelSerializer):
    """Serializer for listing auto-trigger rules."""
    workflow_template_name = serializers.CharField(
        source='workflow_template.name',
        read_only=True
    )
    created_by_name = serializers.CharField(
        source='created_by.get_full_name',
        read_only=True
    )
    trigger_folder_count = serializers.SerializerMethodField()
    trigger_department_count = serializers.SerializerMethodField()

    class Meta:
        model = WorkflowAutoTriggerRule
        fields = [
            'id', 'name', 'description', 'is_active',
            'workflow_template', 'workflow_template_name',
            'document_types', 'confidentiality_levels',
            'trigger_folder_count', 'trigger_department_count',
            'priority', 'default_priority', 'auto_start',
            'times_triggered', 'last_triggered_at',
            'created_by', 'created_by_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'times_triggered', 'last_triggered_at',
            'created_by', 'created_at', 'updated_at'
        ]

    def get_trigger_folder_count(self, obj):
        return obj.trigger_folders.count()

    def get_trigger_department_count(self, obj):
        return obj.trigger_departments.count()


class AutoTriggerRuleDetailSerializer(serializers.ModelSerializer):
    """Serializer for auto-trigger rule details."""
    workflow_template_name = serializers.CharField(
        source='workflow_template.name',
        read_only=True
    )
    workflow_template_detail = serializers.SerializerMethodField()
    created_by_detail = UserMinimalSerializer(source='created_by', read_only=True)
    trigger_folders_detail = serializers.SerializerMethodField()
    trigger_departments_detail = serializers.SerializerMethodField()

    class Meta:
        model = WorkflowAutoTriggerRule
        fields = [
            'id', 'name', 'description', 'is_active',
            'workflow_template', 'workflow_template_name', 'workflow_template_detail',
            'document_types', 'trigger_folders', 'trigger_folders_detail',
            'include_subfolders', 'trigger_departments', 'trigger_departments_detail',
            'confidentiality_levels',
            'min_file_size', 'max_file_size',
            'additional_conditions',
            'default_priority', 'due_days_override', 'auto_start',
            'priority', 'stop_processing',
            'times_triggered', 'last_triggered_at',
            'created_by', 'created_by_detail',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'times_triggered', 'last_triggered_at',
            'created_by', 'created_at', 'updated_at'
        ]

    def get_workflow_template_detail(self, obj):
        """Get template details."""
        template = obj.workflow_template
        return {
            'id': str(template.id),
            'name': template.name,
            'category': template.category,
            'step_count': template.step_count,
            'is_active': template.is_active,
        }

    def get_trigger_folders_detail(self, obj):
        """Get folder details."""
        return [
            {
                'id': str(folder.id),
                'name': folder.name,
                'path': folder.path,
            }
            for folder in obj.trigger_folders.all()
        ]

    def get_trigger_departments_detail(self, obj):
        """Get department details."""
        return [
            {
                'id': dept.id,
                'name': dept.name,
            }
            for dept in obj.trigger_departments.all()
        ]


class AutoTriggerRuleCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating auto-trigger rules."""

    class Meta:
        model = WorkflowAutoTriggerRule
        fields = [
            'name', 'description', 'is_active',
            'workflow_template',
            'document_types', 'trigger_folders', 'include_subfolders',
            'trigger_departments', 'confidentiality_levels',
            'min_file_size', 'max_file_size',
            'additional_conditions',
            'default_priority', 'due_days_override', 'auto_start',
            'priority', 'stop_processing',
        ]

    def validate_workflow_template(self, value):
        """Validate template is active."""
        if not value.is_active:
            raise serializers.ValidationError(
                'Cannot use an inactive workflow template'
            )
        if value.steps.count() == 0:
            raise serializers.ValidationError(
                'Workflow template has no steps configured'
            )
        return value

    def validate(self, data):
        """Validate rule configuration."""
        # Validate file size range
        min_size = data.get('min_file_size')
        max_size = data.get('max_file_size')
        if min_size and max_size and min_size > max_size:
            raise serializers.ValidationError({
                'max_file_size': 'Must be greater than min_file_size'
            })

        return data

    def create(self, validated_data):
        """Create rule with M2M relationships."""
        trigger_folders = validated_data.pop('trigger_folders', [])
        trigger_departments = validated_data.pop('trigger_departments', [])

        validated_data['created_by'] = self.context['request'].user
        validated_data['organization'] = self.context['request'].user.organization

        rule = WorkflowAutoTriggerRule.objects.create(**validated_data)

        if trigger_folders:
            rule.trigger_folders.set(trigger_folders)
        if trigger_departments:
            rule.trigger_departments.set(trigger_departments)

        return rule

    def update(self, instance, validated_data):
        """Update rule with M2M relationships."""
        trigger_folders = validated_data.pop('trigger_folders', None)
        trigger_departments = validated_data.pop('trigger_departments', None)

        # Update fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update M2M relationships if provided
        if trigger_folders is not None:
            instance.trigger_folders.set(trigger_folders)
        if trigger_departments is not None:
            instance.trigger_departments.set(trigger_departments)

        return instance


class AutoTriggerTestSerializer(serializers.Serializer):
    """Serializer for testing auto-trigger rules against a document."""
    document_id = serializers.UUIDField()

    def validate_document_id(self, value):
        """Validate document exists."""
        from apps.documents.models import Document
        try:
            Document.objects.get(pk=value)
            return value
        except Document.DoesNotExist:
            raise serializers.ValidationError('Document not found')
