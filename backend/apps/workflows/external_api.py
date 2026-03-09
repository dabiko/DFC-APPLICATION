"""
External API for Workflow Integrations.

Provides REST endpoints for external systems to interact with the workflow engine.
Supports API key authentication for machine-to-machine communication.
"""

from datetime import timedelta

from django.utils import timezone
from rest_framework import views, status, permissions
from rest_framework.response import Response
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from apps.workflows.models import (
    WorkflowTemplate,
    WorkflowInstance,
    WorkflowTask,
    WorkflowAutoTriggerRule,
    WorkflowAuditLog,
    WorkflowInstanceStatus,
    WorkflowTaskStatus,
    WorkflowPriority,
    ExternalAPIKey,
)


# =============================================================================
# API Key Authentication
# =============================================================================

class ExternalAPIKeyAuthentication(BaseAuthentication):
    """
    Custom authentication for external API keys.

    API keys should be provided in the Authorization header:
    Authorization: ApiKey dfc_xxxxxxxxxxxxx
    """

    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')

        if not auth_header.startswith('ApiKey '):
            return None

        api_key = auth_header[7:]  # Remove 'ApiKey ' prefix

        if len(api_key) < 8:
            raise AuthenticationFailed('Invalid API key format')

        key_prefix = api_key[:8]

        try:
            api_key_obj = ExternalAPIKey.objects.get(
                key_prefix=key_prefix,
                is_active=True
            )
        except ExternalAPIKey.DoesNotExist:
            raise AuthenticationFailed('Invalid API key')

        if not api_key_obj.verify_key(api_key):
            raise AuthenticationFailed('Invalid API key')

        # Check IP whitelist
        client_ip = self.get_client_ip(request)
        if api_key_obj.allowed_ips and client_ip not in api_key_obj.allowed_ips:
            raise AuthenticationFailed('IP address not allowed')

        # Record usage
        api_key_obj.record_usage(client_ip)

        # Return (user, auth) - use created_by as the user
        return (api_key_obj.created_by, api_key_obj)

    def get_client_ip(self, request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')


# =============================================================================
# Permission Classes
# =============================================================================

class HasExternalAPIPermission(permissions.BasePermission):
    """
    Permission class to check API key permissions.
    """

    def __init__(self, required_permission):
        self.required_permission = required_permission

    def has_permission(self, request, view):
        if not hasattr(request, 'auth') or not isinstance(request.auth, ExternalAPIKey):
            return False
        return request.auth.has_permission(self.required_permission)


def require_api_permission(permission):
    """Decorator to check API permission."""
    def decorator(view_func):
        def wrapped_view(self, request, *args, **kwargs):
            if hasattr(request, 'auth') and isinstance(request.auth, ExternalAPIKey):
                if not request.auth.has_permission(permission):
                    return Response(
                        {'error': f'Missing permission: {permission}'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            return view_func(self, request, *args, **kwargs)
        return wrapped_view
    return decorator


# =============================================================================
# External API Views
# =============================================================================

class ExternalWorkflowAPIView(views.APIView):
    """
    External API for workflow operations.

    Endpoints:
    - POST /api/v1/external/workflows/trigger/ - Trigger a workflow
    - GET /api/v1/external/workflows/{id}/ - Get workflow status
    - POST /api/v1/external/workflows/{id}/cancel/ - Cancel a workflow
    - GET /api/v1/external/tasks/ - List pending tasks
    - POST /api/v1/external/tasks/{id}/action/ - Take action on a task
    """

    authentication_classes = [ExternalAPIKeyAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, workflow_id=None):
        """Get workflow status or list workflows."""
        if workflow_id:
            return self.get_workflow_status(request, workflow_id)
        return self.list_workflows(request)

    @require_api_permission('read_workflows')
    def get_workflow_status(self, request, workflow_id):
        """Get detailed workflow status."""
        try:
            workflow = WorkflowInstance.objects.select_related(
                'template', 'target_content_type', 'initiated_by'
            ).prefetch_related('tasks').get(pk=workflow_id)
        except WorkflowInstance.DoesNotExist:
            return Response(
                {'error': 'Workflow not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({
            'id': str(workflow.id),
            'template_name': workflow.template_name,
            'status': workflow.status,
            'priority': workflow.priority,
            'current_step': workflow.current_step,
            'target': {
                'id': str(workflow.target_object_id),
                'title': workflow.target_title,
                'type': workflow.target_type,
            },
            'initiated_by': workflow.initiated_by.get_full_name(),
            'due_date': workflow.due_date.isoformat() if workflow.due_date else None,
            'started_at': workflow.started_at.isoformat() if workflow.started_at else None,
            'completed_at': workflow.completed_at.isoformat() if workflow.completed_at else None,
            'is_overdue': workflow.is_overdue,
            'tasks': [
                {
                    'id': str(task.id),
                    'step_name': task.step_name,
                    'step_order': task.step_order,
                    'assigned_to': task.assigned_to.get_full_name(),
                    'status': task.status,
                    'due_date': task.due_date.isoformat() if task.due_date else None,
                }
                for task in workflow.tasks.all()
            ],
            'created_at': workflow.created_at.isoformat(),
            'updated_at': workflow.updated_at.isoformat(),
        })

    @require_api_permission('read_workflows')
    def list_workflows(self, request):
        """List workflows with filtering."""
        queryset = WorkflowInstance.objects.select_related(
            'target_content_type', 'initiated_by'
        )

        # Apply filters
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        target_id = request.query_params.get('target_id')
        if target_id:
            queryset = queryset.filter(target_object_id=target_id)

        # Backward-compatible: also accept document_id
        document_id = request.query_params.get('document_id')
        if document_id:
            queryset = queryset.filter(
                target_content_type__model='document',
                target_object_id=document_id,
            )

        # Filter by target type
        target_type = request.query_params.get('target_type')
        if target_type:
            queryset = queryset.filter(target_content_type__model=target_type)

        # Pagination
        limit = min(int(request.query_params.get('limit', 50)), 100)
        offset = int(request.query_params.get('offset', 0))

        workflows = queryset.order_by('-created_at')[offset:offset + limit]

        return Response({
            'count': queryset.count(),
            'results': [
                {
                    'id': str(w.id),
                    'template_name': w.template_name,
                    'target_id': str(w.target_object_id),
                    'target_title': w.target_title,
                    'target_type': w.target_type,
                    'status': w.status,
                    'priority': w.priority,
                    'current_step': w.current_step,
                    'is_overdue': w.is_overdue,
                    'created_at': w.created_at.isoformat(),
                }
                for w in workflows
            ]
        })

    @require_api_permission('trigger_workflows')
    def post(self, request):
        """Trigger a new workflow."""
        template_id = request.data.get('template_id')
        document_id = request.data.get('document_id')
        priority = request.data.get('priority', WorkflowPriority.MEDIUM)
        due_days = request.data.get('due_days')
        notes = request.data.get('notes', '')

        # Validate inputs
        if not template_id:
            return Response(
                {'error': 'template_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not document_id:
            return Response(
                {'error': 'document_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            template = WorkflowTemplate.objects.get(pk=template_id, is_active=True)
        except WorkflowTemplate.DoesNotExist:
            return Response(
                {'error': 'Template not found or inactive'},
                status=status.HTTP_404_NOT_FOUND
            )

        from django.contrib.contenttypes.models import ContentType
        from apps.documents.models import Document
        try:
            document = Document.objects.get(pk=document_id)
        except Document.DoesNotExist:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Calculate due date
        due_days = due_days or template.default_due_days
        due_date = timezone.now() + timedelta(days=due_days)

        # Resolve ContentType
        doc_ct = ContentType.objects.get_for_model(Document)

        # Create workflow instance
        instance = WorkflowInstance.objects.create(
            template=template,
            template_name=template.name,
            target_content_type=doc_ct,
            target_object_id=document.pk,
            target_title=document.title or '',
            status=WorkflowInstanceStatus.DRAFT,
            priority=priority,
            due_date=due_date,
            initiated_by=request.user,
            notes=f"{notes}\n[Triggered via External API]".strip()
        )

        # Create initial tasks
        first_step = template.steps.filter(order=1).first()
        if first_step:
            assignees = list(first_step.assigned_users.all())
            for assignee in assignees:
                WorkflowTask.objects.create(
                    workflow=instance,
                    step_order=first_step.order,
                    step_name=first_step.name,
                    step_type=first_step.step_type,
                    assigned_to=assignee,
                    due_date=timezone.now() + timedelta(hours=first_step.sla_hours or 24)
                )

        # Start the workflow
        instance.start()

        # Log audit
        WorkflowAuditLog.log(
            workflow=instance,
            action='CREATED',
            actor=request.user,
            details='Workflow triggered via External API',
            metadata={
                'api_key_id': str(request.auth.id) if hasattr(request, 'auth') else None,
                'source': 'external_api'
            }
        )

        # Send webhook if configured
        if hasattr(request, 'auth') and isinstance(request.auth, ExternalAPIKey):
            request.auth.send_webhook('workflow.created', {
                'workflow_id': str(instance.id),
                'template_name': template.name,
                'document_id': str(document.id),
                'status': instance.status,
            })

        return Response({
            'message': 'Workflow triggered successfully',
            'workflow_id': str(instance.id),
            'template_name': instance.template_name,
            'status': instance.status,
            'due_date': instance.due_date.isoformat(),
        }, status=status.HTTP_201_CREATED)


class ExternalTaskAPIView(views.APIView):
    """
    External API for task operations.
    """

    authentication_classes = [ExternalAPIKeyAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    @require_api_permission('read_tasks')
    def get(self, request, task_id=None):
        """Get task details or list tasks."""
        if task_id:
            try:
                task = WorkflowTask.objects.select_related(
                    'workflow', 'assigned_to'
                ).get(pk=task_id)
            except WorkflowTask.DoesNotExist:
                return Response(
                    {'error': 'Task not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            return Response({
                'id': str(task.id),
                'workflow_id': str(task.workflow_id),
                'step_name': task.step_name,
                'step_order': task.step_order,
                'step_type': task.step_type,
                'assigned_to': {
                    'id': task.assigned_to.id,
                    'name': task.assigned_to.get_full_name(),
                    'email': task.assigned_to.email,
                },
                'status': task.status,
                'due_date': task.due_date.isoformat() if task.due_date else None,
                'is_overdue': task.is_overdue,
                'is_escalated': task.is_escalated,
                'comment': task.comment,
                'created_at': task.created_at.isoformat(),
            })

        # List tasks
        queryset = WorkflowTask.objects.select_related(
            'workflow', 'assigned_to'
        )

        # Apply filters
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        workflow_id = request.query_params.get('workflow_id')
        if workflow_id:
            queryset = queryset.filter(workflow_id=workflow_id)

        assigned_to_id = request.query_params.get('assigned_to')
        if assigned_to_id:
            queryset = queryset.filter(assigned_to_id=assigned_to_id)

        # Pagination
        limit = min(int(request.query_params.get('limit', 50)), 100)
        offset = int(request.query_params.get('offset', 0))

        tasks = queryset.order_by('-created_at')[offset:offset + limit]

        return Response({
            'count': queryset.count(),
            'results': [
                {
                    'id': str(t.id),
                    'workflow_id': str(t.workflow_id),
                    'step_name': t.step_name,
                    'assigned_to_id': t.assigned_to_id,
                    'assigned_to_name': t.assigned_to.get_full_name(),
                    'status': t.status,
                    'due_date': t.due_date.isoformat() if t.due_date else None,
                    'is_overdue': t.is_overdue,
                }
                for t in tasks
            ]
        })

    @require_api_permission('write_tasks')
    def post(self, request, task_id):
        """Take action on a task (approve/reject/delegate)."""
        action = request.data.get('action')
        comment = request.data.get('comment', '')

        if action not in ['approve', 'reject', 'delegate']:
            return Response(
                {'error': 'Invalid action. Must be: approve, reject, or delegate'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            task = WorkflowTask.objects.select_related('workflow').get(pk=task_id)
        except WorkflowTask.DoesNotExist:
            return Response(
                {'error': 'Task not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if task.status not in [WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS]:
            return Response(
                {'error': 'Task cannot be actioned (already completed or cancelled)'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Execute action
        if action == 'approve':
            task.approve(actor=request.user, comment=comment)
        elif action == 'reject':
            task.reject(actor=request.user, comment=comment)
        elif action == 'delegate':
            delegate_to_id = request.data.get('delegate_to')
            if not delegate_to_id:
                return Response(
                    {'error': 'delegate_to is required for delegation'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                delegate_to = User.objects.get(pk=delegate_to_id)
            except User.DoesNotExist:
                return Response(
                    {'error': 'Delegate user not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            task.delegate(to_user=delegate_to, comment=comment)

        # Log audit
        WorkflowAuditLog.log(
            workflow=task.workflow,
            task=task,
            action=action.upper(),
            actor=request.user,
            details=f'Task {action}d via External API',
            metadata={
                'api_key_id': str(request.auth.id) if hasattr(request, 'auth') else None,
                'source': 'external_api'
            }
        )

        # Send webhook
        if hasattr(request, 'auth') and isinstance(request.auth, ExternalAPIKey):
            request.auth.send_webhook(f'task.{action}d', {
                'task_id': str(task.id),
                'workflow_id': str(task.workflow_id),
                'action': action,
                'actor': request.user.get_full_name(),
            })

        return Response({
            'message': f'Task {action}d successfully',
            'task_id': str(task.id),
            'new_status': task.status,
            'workflow_status': task.workflow.status,
        })


class WebhookTestView(views.APIView):
    """
    Endpoint to test webhook configuration.
    """

    authentication_classes = [ExternalAPIKeyAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Send a test webhook event."""
        if not hasattr(request, 'auth') or not isinstance(request.auth, ExternalAPIKey):
            return Response(
                {'error': 'API key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        api_key = request.auth

        if not api_key.webhook_url:
            return Response(
                {'error': 'No webhook URL configured'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Send test webhook
        api_key.send_webhook('webhook.test', {
            'message': 'This is a test webhook event',
            'api_key_name': api_key.name,
            'timestamp': timezone.now().isoformat(),
        })

        return Response({
            'message': 'Test webhook sent',
            'webhook_url': api_key.webhook_url,
        })
