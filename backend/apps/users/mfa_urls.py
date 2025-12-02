"""
MFA URL Configuration.

All MFA endpoints are under /api/v1/auth/mfa/
"""

from django.urls import path
from apps.users.mfa_views import (
    # Core MFA views
    MFASetupView,
    MFAConfirmView,
    MFAVerifyView,
    MFAStatusView,
    MFADisableView,
    BackupCodeRegenerateView,
    # Trusted Device views
    TrustedDeviceListView,
    TrustedDeviceDetailView,
    TrustDeviceView,
    CheckTrustedDeviceView,
    RevokeAllDevicesView,
    # Admin / Compliance views
    MFAComplianceStatsView,
    AllUsersMFAStatusView,
    EnforceMFAForUserView,
    MFAEnforcementPolicyListView,
    MFAEnforcementPolicyDetailView,
    # Risk Assessment views
    AssessLoginRiskView,
    # SMS/Email OTP views
    MFASendOTPView,
    MFAVerifyOTPView,
)

app_name = 'mfa'

urlpatterns = [
    # MFA Setup Flow
    path('setup/', MFASetupView.as_view(), name='mfa-setup'),
    path('confirm/', MFAConfirmView.as_view(), name='mfa-confirm'),

    # MFA Verification (during login)
    path('verify/', MFAVerifyView.as_view(), name='mfa-verify'),

    # MFA Status
    path('status/', MFAStatusView.as_view(), name='mfa-status'),

    # MFA Management
    path('disable/', MFADisableView.as_view(), name='mfa-disable'),
    path('backup-codes/regenerate/', BackupCodeRegenerateView.as_view(), name='backup-codes-regenerate'),

    # Trusted Devices
    path('trusted-devices/', TrustedDeviceListView.as_view(), name='trusted-devices-list'),
    path('trusted-devices/<int:device_id>/', TrustedDeviceDetailView.as_view(), name='trusted-device-detail'),
    path('trusted-devices/trust/', TrustDeviceView.as_view(), name='trust-device'),
    path('trusted-devices/check/', CheckTrustedDeviceView.as_view(), name='check-trusted-device'),
    path('trusted-devices/revoke-all/', RevokeAllDevicesView.as_view(), name='revoke-all-devices'),

    # Admin / Compliance endpoints
    path('admin/compliance/stats/', MFAComplianceStatsView.as_view(), name='mfa-compliance-stats'),
    path('admin/users/', AllUsersMFAStatusView.as_view(), name='all-users-mfa-status'),
    path('admin/users/<int:user_id>/enforce/', EnforceMFAForUserView.as_view(), name='enforce-mfa-for-user'),
    path('admin/policies/', MFAEnforcementPolicyListView.as_view(), name='mfa-policies-list'),
    path('admin/policies/<int:policy_id>/', MFAEnforcementPolicyDetailView.as_view(), name='mfa-policy-detail'),

    # Risk Assessment
    path('risk/assess/', AssessLoginRiskView.as_view(), name='assess-login-risk'),

    # SMS/Email OTP
    path('otp/send/', MFASendOTPView.as_view(), name='mfa-send-otp'),
    path('otp/verify/', MFAVerifyOTPView.as_view(), name='mfa-verify-otp'),
]
