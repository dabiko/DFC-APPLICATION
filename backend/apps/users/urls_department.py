"""
URL configuration for Department-as-Root Architecture APIs.

These URLs provide access to:
- Enhanced department management
- Cross-department access
- Access request workflow
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.users.views_department import (
    DepartmentViewSet,
    CrossDepartmentAccessViewSet,
    DepartmentAccessRequestViewSet,
    UserAccessibleDepartmentsView,
)

# Create routers
router = DefaultRouter()
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'cross-department-access', CrossDepartmentAccessViewSet, basename='cross-department-access')
router.register(r'access-requests', DepartmentAccessRequestViewSet, basename='access-request')

app_name = 'departments'

urlpatterns = [
    # ViewSet routes
    path('', include(router.urls)),

    # Additional endpoints
    path('my-departments/', UserAccessibleDepartmentsView.as_view(), name='my-departments'),
]
