"""
URL configuration for system administration.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PublicPlatformInfoView,
    SystemSettingsView,
    AuditConfigurationView,
    PlatformAnnouncementViewSet,
    ActiveAnnouncementsView,
    SystemHealthView,
    PlatformStatsView,
    OrganizationManagementViewSet,
)

app_name = 'system'

router = DefaultRouter()
router.register(r'announcements', PlatformAnnouncementViewSet, basename='announcements')
router.register(r'organizations', OrganizationManagementViewSet, basename='organizations')

urlpatterns = [
    # Public — no auth required
    path('public-info/', PublicPlatformInfoView.as_view(), name='public-info'),

    # System settings
    path('settings/', SystemSettingsView.as_view(), name='settings'),
    path('audit-config/', AuditConfigurationView.as_view(), name='audit-config'),

    # Health and stats
    path('health/', SystemHealthView.as_view(), name='health'),
    path('stats/', PlatformStatsView.as_view(), name='stats'),

    # Public endpoint for active announcements
    path('active-announcements/', ActiveAnnouncementsView.as_view(), name='active-announcements'),

    # Router URLs
    path('', include(router.urls)),
]
