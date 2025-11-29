"""
URL configuration for retention app.

Provides REST API endpoints for:
- Retention policies
- Legal holds
- Retention schedules
- Automation stats and jobs
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.retention.views import (
    RetentionPolicyViewSet,
    LegalHoldViewSet,
    RetentionScheduleViewSet,
    AutomationStatsView,
    ScheduledJobsView,
    UpcomingJobsView,
)

router = DefaultRouter()
router.register(r'policies', RetentionPolicyViewSet, basename='retention-policy')
router.register(r'legal-holds', LegalHoldViewSet, basename='legal-hold')
router.register(r'schedules', RetentionScheduleViewSet, basename='retention-schedule')

urlpatterns = [
    path('', include(router.urls)),
    # Automation endpoints
    path('automation/stats/', AutomationStatsView.as_view(), name='automation-stats'),
    path('automation/jobs/', ScheduledJobsView.as_view(), name='scheduled-jobs'),
    path('automation/jobs/upcoming/', UpcomingJobsView.as_view(), name='upcoming-jobs'),
]
