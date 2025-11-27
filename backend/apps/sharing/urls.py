"""
URL configuration for sharing app.

Provides REST API endpoints for:
- Document shares (authenticated)
- Public share access (no authentication)
- Direct downloads
- Shared with me (items shared with current user)
- Share invitations
- Notifications
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.sharing.views import (
    ShareViewSet,
    PublicShareAccessView,
    PublicShareDownloadView,
    verify_share_password,
    SharedWithMeViewSet,
    ShareInvitationViewSet,
    share_with_users,
    NotificationViewSet,
    NotificationPreferencesView,
)

router = DefaultRouter()
router.register(r'shares', ShareViewSet, basename='share')
router.register(r'shared-with-me', SharedWithMeViewSet, basename='shared-with-me')
router.register(r'share-invitations', ShareInvitationViewSet, basename='share-invitation')
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    # Authenticated share management
    path('', include(router.urls)),

    # Share with users endpoint
    path('share-with-users/', share_with_users, name='share-with-users'),

    # Notification preferences
    path('notification-preferences/', NotificationPreferencesView.as_view(), name='notification-preferences'),

    # Public access endpoints (no authentication required)
    path('shares/public/<str:token>/', PublicShareAccessView.as_view(), name='public-share-access'),
    path('shares/public/<str:token>/download/', PublicShareDownloadView.as_view(), name='public-share-download'),
    path('shares/public/<str:token>/verify-password/', verify_share_password, name='verify-share-password'),
]
