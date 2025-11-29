"""
URL Configuration for Organization Settings API.

Routes:
- /org-settings/general/     - Organization general settings
- /org-settings/security/    - Security policy settings
- /org-settings/features/    - Feature flags
- /org-settings/usage/       - Usage statistics
- /org-settings/logo/        - Logo upload/delete
- /org-settings/all/         - All settings combined
"""

from django.urls import path
from apps.organizations.settings_views import (
    OrganizationGeneralSettingsView,
    OrganizationSecurityPolicyView,
    OrganizationFeatureFlagsView,
    OrganizationUsageView,
    OrganizationLogoView,
    AllOrganizationSettingsView,
)

app_name = 'org_settings'

urlpatterns = [
    # General Settings
    path('general/', OrganizationGeneralSettingsView.as_view(), name='general'),

    # Security Policy
    path('security/', OrganizationSecurityPolicyView.as_view(), name='security'),

    # Feature Flags
    path('features/', OrganizationFeatureFlagsView.as_view(), name='features'),

    # Usage Statistics
    path('usage/', OrganizationUsageView.as_view(), name='usage'),

    # Logo Management
    path('logo/', OrganizationLogoView.as_view(), name='logo'),

    # All Settings Combined
    path('all/', AllOrganizationSettingsView.as_view(), name='all'),
]
