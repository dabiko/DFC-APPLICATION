"""
MFA URL Configuration.

All MFA endpoints are under /api/v1/auth/mfa/
"""

from django.urls import path
from apps.users.mfa_views import (
    MFASetupView,
    MFAConfirmView,
    MFAVerifyView,
    MFAStatusView,
    MFADisableView,
    BackupCodeRegenerateView
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
]
