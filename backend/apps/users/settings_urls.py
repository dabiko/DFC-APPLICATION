"""
URL Configuration for User Settings API.

Routes:
- /settings/profile/          - User profile CRUD
- /settings/profile/avatar/   - Avatar upload/delete
- /settings/preferences/      - User preferences
- /settings/notifications/    - Notification settings
- /settings/security/         - Security settings
- /settings/all/              - All settings combined
- /settings/quick/            - Quick preference updates
- /settings/sessions/         - Session management
"""

from django.urls import path
from apps.users.settings_views import (
    ProfileView,
    AvatarUploadView,
    PreferencesView,
    NotificationSettingsView,
    SecuritySettingsView,
    AllSettingsView,
    QuickPreferencesView,
    SessionsListView,
)

app_name = 'settings'

urlpatterns = [
    # Profile
    path('profile/', ProfileView.as_view(), name='profile'),
    path('profile/avatar/', AvatarUploadView.as_view(), name='avatar'),

    # Preferences
    path('preferences/', PreferencesView.as_view(), name='preferences'),

    # Notifications
    path('notifications/', NotificationSettingsView.as_view(), name='notifications'),

    # Security
    path('security/', SecuritySettingsView.as_view(), name='security'),

    # Combined/Quick
    path('all/', AllSettingsView.as_view(), name='all'),
    path('quick/', QuickPreferencesView.as_view(), name='quick'),

    # Sessions
    path('sessions/', SessionsListView.as_view(), name='sessions'),
]
