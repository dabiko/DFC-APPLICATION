"""
URL configuration for permissions API.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.permissions import views

# Create router for viewsets
router = DefaultRouter()
router.register(r'roles', views.RoleViewSet, basename='role')
router.register(r'user-roles', views.UserRoleViewSet, basename='user-role')
router.register(r'folder-permissions', views.FolderPermissionViewSet, basename='folder-permission')

app_name = 'permissions'

urlpatterns = [
    # Router URLs
    path('', include(router.urls)),

    # Custom endpoints
    path('check/', views.PermissionCheckView.as_view(), name='permission-check'),
    path('users/<uuid:user_id>/summary/', views.UserPermissionSummaryView.as_view(), name='user-permission-summary'),
    path('cache/clear/', views.ClearPermissionCacheView.as_view(), name='clear-permission-cache'),
]
