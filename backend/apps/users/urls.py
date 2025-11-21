"""
URL configuration for users app.
"""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from apps.users.views import (
    LoginView,
    LogoutView,
    RegisterView,
    ComprehensiveRegisterView,
    CurrentUserView,
    PasswordChangeView,
    UserListView,
    UserDetailView,
    DepartmentListView,
    DepartmentDetailView,
)
from apps.users.password_reset import (
    PasswordResetRequestView,
    PasswordResetConfirmView,
)

app_name = 'users'

urlpatterns = [
    # Authentication endpoints
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('register/', RegisterView.as_view(), name='register'),
    path('register/comprehensive/', ComprehensiveRegisterView.as_view(), name='comprehensive_register'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Password reset endpoints
    path('password/reset/request/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password/reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),

    # User management endpoints
    path('me/', CurrentUserView.as_view(), name='current_user'),
    path('password/change/', PasswordChangeView.as_view(), name='password_change'),
    path('users/', UserListView.as_view(), name='user_list'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user_detail'),

    # Department endpoints
    path('departments/', DepartmentListView.as_view(), name='department_list'),
    path('departments/<int:pk>/', DepartmentDetailView.as_view(), name='department_detail'),
]
