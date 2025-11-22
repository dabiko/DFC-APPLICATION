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
from apps.users.password_reset_enterprise import (
    EnterprisePasswordResetRequestView,
    TokenValidationView,
    EnterprisePasswordResetConfirmView,
)
from apps.users.views_otp import (
    send_email_otp_view,
    verify_email_otp_view,
    send_phone_otp_view,
    verify_phone_otp_view,
)

app_name = 'users'

urlpatterns = [
    # Authentication endpoints
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('register/', RegisterView.as_view(), name='register'),
    path('register/comprehensive/', ComprehensiveRegisterView.as_view(), name='comprehensive_register'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Enterprise Password reset endpoints
    path('password/reset/request/', EnterprisePasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password/reset/validate/', TokenValidationView.as_view(), name='password_reset_validate'),
    path('password/reset/confirm/', EnterprisePasswordResetConfirmView.as_view(), name='password_reset_confirm'),

    # OTP verification endpoints
    path('otp/email/send/', send_email_otp_view, name='send_email_otp'),
    path('otp/email/verify/', verify_email_otp_view, name='verify_email_otp'),
    path('otp/phone/send/', send_phone_otp_view, name='send_phone_otp'),
    path('otp/phone/verify/', verify_phone_otp_view, name='verify_phone_otp'),

    # User management endpoints
    path('me/', CurrentUserView.as_view(), name='current_user'),
    path('password/change/', PasswordChangeView.as_view(), name='password_change'),
    path('users/', UserListView.as_view(), name='user_list'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user_detail'),

    # Department endpoints
    path('departments/', DepartmentListView.as_view(), name='department_list'),
    path('departments/<int:pk>/', DepartmentDetailView.as_view(), name='department_detail'),
]
