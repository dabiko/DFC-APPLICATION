"""
Views for Workflow Management API.

Provides REST API endpoints for:
- Workflow Templates (CRUD)
- Workflow Instances (create, view, cancel)
- Workflow Tasks (My Tasks inbox, approve/reject/delegate)
- Comments and Audit Logs
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q, Count, Avg, F
from django.db.models.functions import Coalesce
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model

from apps.workflows.models import (
    WorkflowTemplate,
    WorkflowStep,
    WorkflowInstance,
    WorkflowTask,
    WorkflowComment,
    WorkflowAuditLog,
    WorkflowAutoTriggerRule,
    WorkflowInstanceStatus,
    WorkflowTaskStatus,
    WorkflowPriority,
)
from apps.workflows.serializers import (
    WorkflowTemplateListSerializer,
    WorkflowTemplateDetailSerializer,
    WorkflowTemplateCreateSerializer,
    WorkflowStepSerializer,
    WorkflowInstanceListSerializer,
    WorkflowInstanceDetailSerializer,
    WorkflowInstanceCreateSerializer,
    WorkflowTaskListSerializer,
    WorkflowTaskDetailSerializer,
    TaskActionSerializer,
    WorkflowCommentSerializer,
    WorkflowCommentCreateSerializer,
    WorkflowAuditLogSerializer,
    WorkflowStatsSerializer,
    TaskStatsSerializer,
    AutoTriggerRuleListSerializer,
    AutoTriggerRuleDetailSerializer,
    AutoTriggerRuleCreateSerializer,
    AutoTriggerTestSerializer,
)
from apps.workflows.engine import (
    workflow_engine,
    WorkflowEngineError,
    WorkflowValidationError,
    WorkflowTransitionError,
    TaskAssignmentError,
)

User = get_user_model()


def get_client_ip(request):
    """Extract client IP from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '0.0.0.0')


# =============================================================================
# Workflow Template Views
# =============================================================================

class WorkflowTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for workflow templates.

    Endpoints:
    - GET /api/v1/workflows/templates/ - List templates
    - POST /api/v1/workflows/templates/ - Create template
    - GET /api/v1/workflows/templates/{id}/ - Get template details
    - PUT /api/v1/workflows/templates/{id}/ - Update template
    - DELETE /api/v1/workflows/templates/{id}/ - Delete template
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter templates by organization."""
        user = self.request.user
        queryset = WorkflowTemplate.objects.filter(
            Q(organization=user.organization) | Q(organization__isnull=True)
        ).annotate(
            step_count=Count('steps')
        ).select_related('created_by', 'organization')

        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category__iexact=category)

        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        return queryset.order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'list':
            return WorkflowTemplateListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return WorkflowTemplateCreateSerializer
        return WorkflowTemplateDetailSerializer

    def destroy(self, request, *args, **kwargs):
        """Prevent deletion of system templates."""
        instance = self.get_object()
        if instance.is_system:
            return Response(
                {'error': 'System templates cannot be deleted'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Get list of template categories."""
        categories = WorkflowTemplate.objects.filter(
            Q(organization=request.user.organization) | Q(organization__isnull=True),
            is_active=True
        ).values_list('category', flat=True).distinct()
        return Response({'categories': [c for c in categories if c]})


# =============================================================================
# Workflow Instance Views
# =============================================================================

class WorkflowInstanceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for workflow instances.

    Endpoints:
    - GET /api/v1/workflows/instances/ - List instances
    - POST /api/v1/workflows/instances/ - Start new workflow
    - GET /api/v1/workflows/instances/{id}/ - Get instance details
    - POST /api/v1/workflows/instances/{id}/cancel/ - Cancel workflow
    """
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']  # No PUT/DELETE

    def get_queryset(self):
        """Filter instances by organization and access."""
        user = self.request.user
        queryset = WorkflowInstance.objects.filter(
            organization=user.organization
        ).select_related(
            'document', 'template', 'initiated_by'
        ).prefetch_related('tasks')

        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())

        # Filter by my initiated
        my_initiated = self.request.query_params.get('my_initiated')
        if my_initiated and my_initiated.lower() == 'true':
            queryset = queryset.filter(initiated_by=user)

        # Filter by document
        document_id = self.request.query_params.get('document_id')
        if document_id:
            queryset = queryset.filter(document_id=document_id)

        # Filter by overdue
        overdue = self.request.query_params.get('overdue')
        if overdue and overdue.lower() == 'true':
            queryset = queryset.filter(
                due_date__lt=timezone.now(),
                status__in=[WorkflowInstanceStatus.ACTIVE, WorkflowInstanceStatus.PENDING]
            )

        return queryset.order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'list':
            return WorkflowInstanceListSerializer
        elif self.action == 'create':
            return WorkflowInstanceCreateSerializer
        return WorkflowInstanceDetailSerializer

    def create(self, request, *args, **kwargs):
        """Start a new workflow instance using the workflow engine."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            # Get template and document
            template = WorkflowTemplate.objects.get(pk=serializer.validated_data['template_id'])
            from apps.documents.models import Document
            document = Document.objects.get(pk=serializer.validated_data['document_id'])

            # Use workflow engine to start the workflow
            instance = workflow_engine.start_workflow(
                template=template,
                document=document,
                initiated_by=request.user,
                priority=serializer.validated_data.get('priority'),
                due_date=serializer.validated_data.get('due_date'),
                notes=serializer.validated_data.get('notes', '')
            )

            return Response(
                WorkflowInstanceDetailSerializer(instance).data,
                status=status.HTTP_201_CREATED
            )

        except WorkflowValidationError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except TaskAssignmentError as e:
            return Response(
                {'error': f'Task assignment failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except WorkflowEngineError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a workflow instance using the workflow engine."""
        instance = self.get_object()
        reason = request.data.get('reason', '')

        try:
            instance = workflow_engine.cancel_workflow(
                workflow=instance,
                cancelled_by=request.user,
                reason=reason
            )
            return Response(WorkflowInstanceDetailSerializer(instance).data)

        except WorkflowTransitionError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'], url_path='start-from-document')
    def start_from_document(self, request):
        """
        Start a workflow directly from a document.

        Request body:
        {
            "document_id": "uuid",
            "template_id": "uuid",  // optional - will use best match if not provided
            "priority": "MEDIUM",   // optional
            "notes": ""             // optional
        }
        """
        document_id = request.data.get('document_id')
        template_id = request.data.get('template_id')

        if not document_id:
            return Response(
                {'error': 'document_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from apps.documents.models import Document
            document = Document.objects.get(pk=document_id)

            # Get template - either specified or auto-select based on document type
            if template_id:
                template = WorkflowTemplate.objects.get(pk=template_id, is_active=True)
            else:
                # Auto-select template based on document type
                template = WorkflowTemplate.objects.filter(
                    Q(organization=request.user.organization) | Q(organization__isnull=True),
                    is_active=True,
                    applicable_document_types__contains=[document.document_type]
                ).first()

                if not template:
                    # Fallback to any active template
                    template = WorkflowTemplate.objects.filter(
                        Q(organization=request.user.organization) | Q(organization__isnull=True),
                        is_active=True
                    ).first()

                if not template:
                    return Response(
                        {'error': 'No applicable workflow template found'},
                        status=status.HTTP_404_NOT_FOUND
                    )

            # Start the workflow
            instance = workflow_engine.start_workflow(
                template=template,
                document=document,
                initiated_by=request.user,
                priority=request.data.get('priority'),
                notes=request.data.get('notes', '')
            )

            return Response(
                WorkflowInstanceDetailSerializer(instance).data,
                status=status.HTTP_201_CREATED
            )

        except Document.DoesNotExist:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except WorkflowTemplate.DoesNotExist:
            return Response(
                {'error': 'Template not found or not active'},
                status=status.HTTP_404_NOT_FOUND
            )
        except WorkflowValidationError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except TaskAssignmentError as e:
            return Response(
                {'error': f'Task assignment failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


# =============================================================================
# Workflow Task Views
# =============================================================================

class WorkflowTaskViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for workflow tasks (My Tasks inbox).

    Endpoints:
    - GET /api/v1/workflows/tasks/ - List my tasks
    - GET /api/v1/workflows/tasks/{id}/ - Get task details
    - POST /api/v1/workflows/tasks/{id}/action/ - Take action (approve/reject/delegate)
    - POST /api/v1/workflows/tasks/{id}/mark-read/ - Mark as read
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Get tasks assigned to current user."""
        user = self.request.user
        queryset = WorkflowTask.objects.filter(
            assigned_to=user
        ).select_related(
            'workflow', 'workflow__document', 'workflow__initiated_by',
            'assigned_to', 'delegated_from'
        )

        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter.upper())
        else:
            # By default, show pending and in_progress tasks
            queryset = queryset.filter(
                status__in=[WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS]
            )

        # Filter by unread
        unread = self.request.query_params.get('unread')
        if unread and unread.lower() == 'true':
            queryset = queryset.filter(is_read=False)

        # Filter by overdue
        overdue = self.request.query_params.get('overdue')
        if overdue and overdue.lower() == 'true':
            queryset = queryset.filter(
                due_date__lt=timezone.now(),
                status__in=[WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS]
            )

        return queryset.order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'list':
            return WorkflowTaskListSerializer
        return WorkflowTaskDetailSerializer

    @action(detail=True, methods=['post'], url_path='take-action')
    def take_action(self, request, pk=None):
        """Take action on a task (approve/reject/delegate) using the workflow engine."""
        task = self.get_object()

        serializer = TaskActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action_type = serializer.validated_data['action']
        comment = serializer.validated_data.get('comment', '')

        # Check if comment is required
        if task.workflow.template:
            step = task.workflow.template.steps.filter(order=task.step_order).first()
            if step and step.require_comment and not comment:
                return Response(
                    {'error': 'A comment is required for this step'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        try:
            # Get delegate_to user if delegating
            delegate_to = None
            if action_type == 'delegate':
                delegate_to_id = serializer.validated_data.get('delegate_to')
                if delegate_to_id:
                    delegate_to = User.objects.get(pk=delegate_to_id)

            # Use workflow engine to complete the task
            result = workflow_engine.complete_task(
                task=task,
                action=action_type,
                actor=request.user,
                comment=comment,
                delegate_to=delegate_to
            )

            # Refresh task from database
            task.refresh_from_db()

            return Response({
                'task': WorkflowTaskDetailSerializer(task).data,
                'message': result.message,
                'workflow_status': result.new_status,
                'tasks_created': len(result.tasks_created)
            })

        except WorkflowTransitionError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except TaskAssignmentError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except User.DoesNotExist:
            return Response(
                {'error': 'Delegate user not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        """Mark a task as read."""
        task = self.get_object()
        task.mark_as_read()
        return Response({'status': 'marked as read'})


# =============================================================================
# Comment Views
# =============================================================================

class WorkflowCommentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for workflow comments.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = WorkflowCommentSerializer

    def get_queryset(self):
        workflow_id = self.kwargs.get('workflow_pk')
        return WorkflowComment.objects.filter(
            workflow_id=workflow_id
        ).select_related('author')

    def get_serializer_class(self):
        if self.action == 'create':
            return WorkflowCommentCreateSerializer
        return WorkflowCommentSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        workflow_id = self.kwargs.get('workflow_pk')
        context['workflow'] = WorkflowInstance.objects.get(pk=workflow_id)
        return context

    def perform_create(self, serializer):
        comment = serializer.save()

        # Log comment
        WorkflowAuditLog.log(
            workflow=comment.workflow,
            task=comment.task,
            action='COMMENT_ADDED',
            actor=self.request.user,
            details=f'Comment added by {self.request.user.get_full_name()}',
            ip_address=get_client_ip(self.request),
            user_agent=self.request.META.get('HTTP_USER_AGENT', '')
        )


# =============================================================================
# Statistics Views
# =============================================================================

class WorkflowStatsView(APIView):
    """
    Get workflow statistics for the current user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        now = timezone.now()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)

        # Workflow stats
        workflows = WorkflowInstance.objects.filter(organization=user.organization)

        total_active = workflows.filter(
            status__in=[WorkflowInstanceStatus.ACTIVE, WorkflowInstanceStatus.PENDING]
        ).count()

        overdue = workflows.filter(
            status__in=[WorkflowInstanceStatus.ACTIVE, WorkflowInstanceStatus.PENDING],
            due_date__lt=now
        ).count()

        completed_this_week = workflows.filter(
            status=WorkflowInstanceStatus.APPROVED,
            completed_at__gte=week_ago
        ).count()

        completed_this_month = workflows.filter(
            status=WorkflowInstanceStatus.APPROVED,
            completed_at__gte=month_ago
        ).count()

        # Tasks requiring my action
        pending_my_action = WorkflowTask.objects.filter(
            assigned_to=user,
            status__in=[WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS]
        ).count()

        # Average completion time (in days)
        avg_completion = workflows.filter(
            status=WorkflowInstanceStatus.APPROVED,
            started_at__isnull=False,
            completed_at__isnull=False
        ).aggregate(
            avg_days=Avg(
                (F('completed_at') - F('started_at'))
            )
        )
        avg_days = avg_completion['avg_days']
        if avg_days:
            avg_days = avg_days.total_seconds() / 86400  # Convert to days
        else:
            avg_days = 0

        serializer = WorkflowStatsSerializer(data={
            'total_active': total_active,
            'pending_my_action': pending_my_action,
            'overdue': overdue,
            'completed_this_week': completed_this_week,
            'completed_this_month': completed_this_month,
            'avg_completion_days': round(avg_days, 1),
        })
        serializer.is_valid()
        return Response(serializer.data)


class TaskStatsView(APIView):
    """
    Get task statistics for the current user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = now - timedelta(days=7)

        tasks = WorkflowTask.objects.filter(assigned_to=user)

        total_pending = tasks.filter(status=WorkflowTaskStatus.PENDING).count()
        total_in_progress = tasks.filter(status=WorkflowTaskStatus.IN_PROGRESS).count()
        total_overdue = tasks.filter(
            status__in=[WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS],
            due_date__lt=now
        ).count()
        unread = tasks.filter(
            status__in=[WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS],
            is_read=False
        ).count()
        completed_today = tasks.filter(
            status__in=[WorkflowTaskStatus.APPROVED, WorkflowTaskStatus.REJECTED],
            completed_at__gte=today_start
        ).count()
        completed_this_week = tasks.filter(
            status__in=[WorkflowTaskStatus.APPROVED, WorkflowTaskStatus.REJECTED],
            completed_at__gte=week_ago
        ).count()

        serializer = TaskStatsSerializer(data={
            'total_pending': total_pending,
            'total_in_progress': total_in_progress,
            'total_overdue': total_overdue,
            'unread': unread,
            'completed_today': completed_today,
            'completed_this_week': completed_this_week,
        })
        serializer.is_valid()
        return Response(serializer.data)


# =============================================================================
# Auto-Trigger Rule Views
# =============================================================================

class AutoTriggerRuleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for workflow auto-trigger rules.

    Endpoints:
    - GET /api/v1/workflows/auto-trigger-rules/ - List rules
    - POST /api/v1/workflows/auto-trigger-rules/ - Create rule
    - GET /api/v1/workflows/auto-trigger-rules/{id}/ - Get rule details
    - PUT /api/v1/workflows/auto-trigger-rules/{id}/ - Update rule
    - DELETE /api/v1/workflows/auto-trigger-rules/{id}/ - Delete rule
    - POST /api/v1/workflows/auto-trigger-rules/{id}/test/ - Test rule against a document
    - POST /api/v1/workflows/auto-trigger-rules/{id}/toggle/ - Toggle rule active state
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter rules by organization."""
        user = self.request.user
        queryset = WorkflowAutoTriggerRule.objects.filter(
            Q(organization=user.organization) | Q(organization__isnull=True)
        ).select_related(
            'workflow_template', 'created_by'
        ).prefetch_related(
            'trigger_folders', 'trigger_departments'
        )

        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        # Filter by template
        template_id = self.request.query_params.get('template_id')
        if template_id:
            queryset = queryset.filter(workflow_template_id=template_id)

        return queryset.order_by('priority', '-created_at')

    def get_serializer_class(self):
        if self.action == 'list':
            return AutoTriggerRuleListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return AutoTriggerRuleCreateSerializer
        return AutoTriggerRuleDetailSerializer

    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        """
        Test this rule against a specific document.

        Returns whether the rule would match and what workflow would be triggered.
        """
        rule = self.get_object()

        serializer = AutoTriggerTestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from apps.documents.models import Document
        document = Document.objects.get(pk=serializer.validated_data['document_id'])

        matches = rule.matches_document(document)

        return Response({
            'rule_id': str(rule.id),
            'rule_name': rule.name,
            'document_id': str(document.id),
            'document_title': document.title,
            'matches': matches,
            'workflow_template': {
                'id': str(rule.workflow_template.id),
                'name': rule.workflow_template.name,
            } if matches else None,
            'would_auto_start': rule.auto_start if matches else False,
        })

    @action(detail=True, methods=['post'])
    def toggle(self, request, pk=None):
        """Toggle the active state of a rule."""
        rule = self.get_object()
        rule.is_active = not rule.is_active
        rule.save(update_fields=['is_active', 'updated_at'])

        return Response({
            'id': str(rule.id),
            'name': rule.name,
            'is_active': rule.is_active,
            'message': f"Rule {'activated' if rule.is_active else 'deactivated'} successfully"
        })

    @action(detail=True, methods=['post'], url_path='trigger-now')
    def trigger_now(self, request, pk=None):
        """
        Manually trigger this rule for a specific document.

        This bypasses the normal upload flow and immediately creates
        a workflow instance if the document matches the rule.
        """
        rule = self.get_object()

        serializer = AutoTriggerTestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from apps.documents.models import Document
        document = Document.objects.get(pk=serializer.validated_data['document_id'])

        if not rule.matches_document(document):
            return Response(
                {'error': 'Document does not match rule conditions'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            workflow_instance = rule.trigger_workflow(document, request.user)
            return Response({
                'message': 'Workflow triggered successfully',
                'workflow_instance': {
                    'id': str(workflow_instance.id),
                    'template_name': workflow_instance.template_name,
                    'status': workflow_instance.status,
                    'due_date': workflow_instance.due_date,
                }
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {'error': f'Failed to trigger workflow: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='test-all')
    def test_all(self, request):
        """
        Test all active rules against a specific document.

        Returns which rules would match and in what order they would be evaluated.
        """
        serializer = AutoTriggerTestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from apps.documents.models import Document
        document = Document.objects.get(pk=serializer.validated_data['document_id'])

        # Get all active rules
        rules = self.get_queryset().filter(is_active=True)

        matching_rules = []
        first_match = None

        for rule in rules:
            matches = rule.matches_document(document)
            rule_info = {
                'id': str(rule.id),
                'name': rule.name,
                'priority': rule.priority,
                'matches': matches,
                'workflow_template': rule.workflow_template.name,
                'stop_processing': rule.stop_processing,
            }
            if matches:
                matching_rules.append(rule_info)
                if first_match is None:
                    first_match = rule_info
                if rule.stop_processing:
                    break

        return Response({
            'document_id': str(document.id),
            'document_title': document.title,
            'total_rules_evaluated': rules.count(),
            'matching_rules_count': len(matching_rules),
            'matching_rules': matching_rules,
            'first_match': first_match,
            'would_trigger_workflow': first_match is not None,
        })
