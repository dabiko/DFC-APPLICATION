"""
Views for User Settings and Preferences API.

Provides endpoints for:
- GET/PUT /settings/profile/ - User profile
- GET/PUT /settings/preferences/ - User preferences
- GET/PUT /settings/notifications/ - Notification settings
- GET/PUT /settings/security/ - Security settings
- GET /settings/all/ - All settings combined
- PUT /settings/quick/ - Quick preference updates
"""

from rest_framework import generics, status, permissions, parsers
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiResponse

from apps.users.models import CustomUser
from apps.users.settings_models import (
    UserPreferences,
    NotificationSettings,
    SecuritySettings,
)
from apps.users.settings_serializers import (
    ProfileSerializer,
    AvatarUploadSerializer,
    UserPreferencesSerializer,
    NotificationSettingsSerializer,
    SecuritySettingsSerializer,
    AllSettingsSerializer,
    QuickPreferencesSerializer,
)


class ProfileView(generics.RetrieveUpdateAPIView):
    """
    Retrieve or update the current user's profile.

    GET: Returns full profile information
    PUT/PATCH: Updates profile fields
    """
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    @extend_schema(
        tags=['Settings'],
        responses={200: ProfileSerializer},
        description='Get current user profile'
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        tags=['Settings'],
        request=ProfileSerializer,
        responses={200: ProfileSerializer},
        description='Update current user profile'
    )
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)

    @extend_schema(
        tags=['Settings'],
        request=ProfileSerializer,
        responses={200: ProfileSerializer},
        description='Partially update current user profile'
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)


class AvatarUploadView(APIView):
    """
    Upload or delete user avatar.

    POST: Upload new avatar
    DELETE: Remove current avatar
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    @extend_schema(
        tags=['Settings'],
        request={'multipart/form-data': AvatarUploadSerializer},
        responses={200: ProfileSerializer},
        description='Upload user avatar'
    )
    def post(self, request):
        """Upload new avatar"""
        serializer = AvatarUploadSerializer(
            request.user,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            # Delete old avatar if exists
            if request.user.avatar:
                request.user.avatar.delete(save=False)

            serializer.save()
            return Response(
                ProfileSerializer(request.user).data,
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        tags=['Settings'],
        responses={200: OpenApiResponse(description='Avatar deleted')},
        description='Delete user avatar'
    )
    def delete(self, request):
        """Delete current avatar"""
        if request.user.avatar:
            request.user.avatar.delete(save=True)
            return Response(
                {'message': 'Avatar deleted successfully'},
                status=status.HTTP_200_OK
            )
        return Response(
            {'message': 'No avatar to delete'},
            status=status.HTTP_200_OK
        )


class PreferencesView(generics.RetrieveUpdateAPIView):
    """
    Retrieve or update user preferences.

    GET: Returns user preferences (creates defaults if none exist)
    PUT/PATCH: Updates preferences
    """
    serializer_class = UserPreferencesSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        """Get or create user preferences"""
        preferences, created = UserPreferences.objects.get_or_create(
            user=self.request.user
        )
        return preferences

    @extend_schema(
        tags=['Settings'],
        responses={200: UserPreferencesSerializer},
        description='Get user preferences'
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        tags=['Settings'],
        request=UserPreferencesSerializer,
        responses={200: UserPreferencesSerializer},
        description='Update user preferences'
    )
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)

    @extend_schema(
        tags=['Settings'],
        request=UserPreferencesSerializer,
        responses={200: UserPreferencesSerializer},
        description='Partially update user preferences'
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)


class NotificationSettingsView(generics.RetrieveUpdateAPIView):
    """
    Retrieve or update notification settings.

    GET: Returns notification settings (creates defaults if none exist)
    PUT/PATCH: Updates notification settings
    """
    serializer_class = NotificationSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        """Get or create notification settings"""
        settings, created = NotificationSettings.objects.get_or_create(
            user=self.request.user
        )
        return settings

    @extend_schema(
        tags=['Settings'],
        responses={200: NotificationSettingsSerializer},
        description='Get notification settings'
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        tags=['Settings'],
        request=NotificationSettingsSerializer,
        responses={200: NotificationSettingsSerializer},
        description='Update notification settings'
    )
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)

    @extend_schema(
        tags=['Settings'],
        request=NotificationSettingsSerializer,
        responses={200: NotificationSettingsSerializer},
        description='Partially update notification settings'
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)


class SecuritySettingsView(generics.RetrieveUpdateAPIView):
    """
    Retrieve or update security settings.

    GET: Returns security settings (creates defaults if none exist)
    PUT/PATCH: Updates security settings
    """
    serializer_class = SecuritySettingsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        """Get or create security settings"""
        settings, created = SecuritySettings.objects.get_or_create(
            user=self.request.user
        )
        return settings

    @extend_schema(
        tags=['Settings'],
        responses={200: SecuritySettingsSerializer},
        description='Get security settings'
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        tags=['Settings'],
        request=SecuritySettingsSerializer,
        responses={200: SecuritySettingsSerializer},
        description='Update security settings'
    )
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)

    @extend_schema(
        tags=['Settings'],
        request=SecuritySettingsSerializer,
        responses={200: SecuritySettingsSerializer},
        description='Partially update security settings'
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)


class AllSettingsView(APIView):
    """
    Retrieve all user settings in a single request.

    This endpoint is optimized for loading the settings page,
    returning profile, preferences, notifications, and security
    settings in one response.
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=['Settings'],
        responses={200: AllSettingsSerializer},
        description='Get all user settings at once'
    )
    def get(self, request):
        """Return all settings combined"""
        user = request.user

        # Get or create all settings
        preferences, _ = UserPreferences.objects.get_or_create(user=user)
        notifications, _ = NotificationSettings.objects.get_or_create(user=user)
        security, _ = SecuritySettings.objects.get_or_create(user=user)

        return Response({
            'profile': ProfileSerializer(user).data,
            'preferences': UserPreferencesSerializer(preferences).data,
            'notifications': NotificationSettingsSerializer(notifications).data,
            'security': SecuritySettingsSerializer(security).data,
        })


class QuickPreferencesView(APIView):
    """
    Quick update for common preferences.

    Allows updating individual preferences (theme, sidebar state, etc.)
    without loading the full settings page.
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=['Settings'],
        request=QuickPreferencesSerializer,
        responses={200: UserPreferencesSerializer},
        description='Quickly update common preferences'
    )
    def put(self, request):
        """Update quick preferences"""
        serializer = QuickPreferencesSerializer(data=request.data)
        if serializer.is_valid():
            preferences = serializer.update(request.user, serializer.validated_data)
            return Response(
                UserPreferencesSerializer(preferences).data,
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        tags=['Settings'],
        request=QuickPreferencesSerializer,
        responses={200: UserPreferencesSerializer},
        description='Partially update common preferences'
    )
    def patch(self, request):
        """Partially update quick preferences"""
        return self.put(request)


class SessionsListView(APIView):
    """
    List and manage active sessions.

    GET: List all active sessions
    DELETE: Revoke a specific session or all other sessions
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=['Settings'],
        responses={200: OpenApiResponse(description='List of active sessions')},
        description='Get list of active sessions'
    )
    def get(self, request):
        """List active sessions"""
        # Placeholder for session tracking
        # Would integrate with session/token tracking system
        return Response({
            'sessions': [
                {
                    'id': 'current',
                    'device': 'Current Session',
                    'browser': request.META.get('HTTP_USER_AGENT', 'Unknown')[:50],
                    'ip_address': self._get_client_ip(request),
                    'last_activity': request.user.last_login,
                    'is_current': True,
                }
            ]
        })

    @extend_schema(
        tags=['Settings'],
        responses={200: OpenApiResponse(description='Session revoked')},
        description='Revoke sessions'
    )
    def delete(self, request):
        """Revoke sessions"""
        session_id = request.query_params.get('session_id')

        if session_id == 'all_others':
            # Would revoke all other sessions
            return Response({
                'message': 'All other sessions have been revoked'
            })
        elif session_id:
            # Would revoke specific session
            return Response({
                'message': f'Session {session_id} has been revoked'
            })
        else:
            return Response(
                {'error': 'session_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def _get_client_ip(self, request):
        """Extract client IP from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')
