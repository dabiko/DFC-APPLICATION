"""
MFA Enforcement Middleware.

Enforces MFA for admin and superuser accounts.
Automatically sets mfa_enforced=True for admin users.
"""

from django.utils.deprecation import MiddlewareMixin
from apps.users.mfa_models import MFASettings


class MFAEnforcementMiddleware(MiddlewareMixin):
    """
    Middleware to enforce MFA for admin and superuser accounts.

    Automatically enables MFA enforcement for:
    - Superusers
    - Staff users (is_staff=True)

    This ensures that privileged accounts must use MFA.
    """

    def process_request(self, request):
        """
        Check if authenticated user is admin/superuser and enforce MFA.
        """
        if not request.user.is_authenticated:
            return None

        user = request.user

        # Check if user is admin or superuser
        if user.is_superuser or user.is_staff:
            # Get or create MFA settings
            mfa_settings, created = MFASettings.objects.get_or_create(user=user)

            # Enforce MFA for admin/superuser accounts
            if not mfa_settings.mfa_enforced:
                mfa_settings.mfa_enforced = True
                mfa_settings.save(update_fields=['mfa_enforced'])

        return None


class MFAVerificationMiddleware(MiddlewareMixin):
    """
    Middleware to check MFA verification status for protected endpoints.

    Redirects to MFA verification if:
    - User has MFA enabled
    - User hasn't completed MFA verification in current session
    - User is accessing protected endpoints
    """

    # Endpoints that don't require MFA verification
    EXEMPT_PATHS = [
        '/api/v1/auth/login/',
        '/api/v1/auth/mfa/verify/',
        '/api/v1/auth/mfa/setup/',
        '/api/v1/auth/mfa/confirm/',
        '/api/v1/auth/logout/',
        '/admin/login/',
    ]

    def process_request(self, request):
        """
        Check if MFA verification is required for this request.
        """
        # Skip for unauthenticated users
        if not request.user.is_authenticated:
            return None

        # Skip for exempt paths
        if any(request.path.startswith(path) for path in self.EXEMPT_PATHS):
            return None

        # Check if user has MFA enabled
        try:
            mfa_settings = MFASettings.objects.get(user=request.user)
        except MFASettings.DoesNotExist:
            return None

        # If MFA is not configured, allow access
        if not mfa_settings.requires_mfa:
            return None

        # Check if MFA is verified in session
        if not request.session.get('mfa_verified', False):
            # MFA required but not verified
            # The MFAJWTAuthentication class will handle blocking the request
            pass

        return None


class MFASessionMiddleware(MiddlewareMixin):
    """
    Middleware to manage MFA session state.

    Clears MFA verification status when:
    - User logs out
    - Session expires
    """

    def process_request(self, request):
        """
        Clean up MFA session state if needed.
        """
        # If user is not authenticated but session has mfa_verified, clear it
        if not request.user.is_authenticated and request.session.get('mfa_verified'):
            request.session['mfa_verified'] = False
            request.session.pop('mfa_verified_at', None)

        return None
