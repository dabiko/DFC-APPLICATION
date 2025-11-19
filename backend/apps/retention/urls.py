"""
URL configuration for retention app.

Provides REST API endpoints for:
- Retention policies
- Legal holds
- Retention schedules
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.retention.views import (
    RetentionPolicyViewSet,
    LegalHoldViewSet,
    RetentionScheduleViewSet,
)

router = DefaultRouter()
router.register(r'policies', RetentionPolicyViewSet, basename='retention-policy')
router.register(r'legal-holds', LegalHoldViewSet, basename='legal-hold')
router.register(r'schedules', RetentionScheduleViewSet, basename='retention-schedule')

urlpatterns = [
    path('', include(router.urls)),
]
