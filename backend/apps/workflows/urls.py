"""
URL configuration for Workflow Management API.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers as nested_routers

from apps.workflows.views import (
    WorkflowTemplateViewSet,
    WorkflowInstanceViewSet,
    WorkflowTaskViewSet,
    WorkflowCommentViewSet,
    WorkflowStatsView,
    TaskStatsView,
    AutoTriggerRuleViewSet,
)
from apps.workflows.external_api import (
    ExternalWorkflowAPIView,
    ExternalTaskAPIView,
    WebhookTestView,
)

# Main router
router = DefaultRouter()
router.register(r'templates', WorkflowTemplateViewSet, basename='workflow-template')
router.register(r'instances', WorkflowInstanceViewSet, basename='workflow-instance')
router.register(r'tasks', WorkflowTaskViewSet, basename='workflow-task')
router.register(r'auto-trigger-rules', AutoTriggerRuleViewSet, basename='auto-trigger-rule')

# Nested router for comments under instances
instances_router = nested_routers.NestedDefaultRouter(router, r'instances', lookup='workflow')
instances_router.register(r'comments', WorkflowCommentViewSet, basename='workflow-comment')

app_name = 'workflows'

urlpatterns = [
    # Stats endpoints
    path('stats/', WorkflowStatsView.as_view(), name='workflow-stats'),
    path('tasks/stats/', TaskStatsView.as_view(), name='task-stats'),

    # External API endpoints (for integrations)
    path('external/workflows/', ExternalWorkflowAPIView.as_view(), name='external-workflow-list'),
    path('external/workflows/<uuid:workflow_id>/', ExternalWorkflowAPIView.as_view(), name='external-workflow-detail'),
    path('external/tasks/', ExternalTaskAPIView.as_view(), name='external-task-list'),
    path('external/tasks/<uuid:task_id>/', ExternalTaskAPIView.as_view(), name='external-task-detail'),
    path('external/tasks/<uuid:task_id>/action/', ExternalTaskAPIView.as_view(), name='external-task-action'),
    path('external/webhook/test/', WebhookTestView.as_view(), name='external-webhook-test'),

    # Router URLs
    path('', include(router.urls)),
    path('', include(instances_router.urls)),
]
