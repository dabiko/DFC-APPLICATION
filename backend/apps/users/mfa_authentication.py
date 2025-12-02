"""
Custom JWT Authentication with MFA verification.

Extends the default JWT authentication to check if the user has
completed MFA verification when required.
"""

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed
from apps.users.mfa_models import MFASettings


class MFAJWTAuthentication(JWTAuthentication):
    """
    Custom JWT Authentication that enforces MFA verification.

    After successful JWT validation, checks if:
    1. User has MFA enabled
    2. User has completed MFA verification (checked via JWT claim)

    If MFA is required but not verified, raises AuthenticationFailed.
    """

    def authenticate(self, request):
        """
        Authenticate the request and check MFA status.
        """
        # First, perform standard JWT authentication
        result = super().authenticate(request)

        if result is None:
            return None

        user, validated_token = result

        # Check if user requires MFA
        try:
            mfa_settings = MFASettings.objects.get(user=user)
        except MFASettings.DoesNotExist:
            # No MFA settings, allow access
            return result

        # If MFA is not configured/enabled, allow access
        if not mfa_settings.requires_mfa:
            return result

        # MFA is required - check if verified via JWT claim
        # The mfa_verified claim is added to the token after successful MFA verification
        mfa_verified = validated_token.get('mfa_verified', False)

        if not mfa_verified:
            raise AuthenticationFailed({
                'detail': 'MFA verification required',
                'code': 'mfa_required',
                'user_id': str(user.id)
            })

        # MFA verified, allow access
        return result


class MFAOptionalJWTAuthentication(JWTAuthentication):
    """
    JWT Authentication that checks MFA but doesn't enforce it.

    Adds 'mfa_verified' flag to request.user but doesn't block access.
    Useful for endpoints that need to know MFA status but don't require it.
    """

    def authenticate(self, request):
        """
        Authenticate and annotate user with MFA status.
        """
        result = super().authenticate(request)

        if result is None:
            return None

        user, validated_token = result

        # Add MFA status to user object (from JWT claim)
        try:
            mfa_settings = MFASettings.objects.get(user=user)
            user.mfa_configured = mfa_settings.requires_mfa
            user.mfa_verified = validated_token.get('mfa_verified', False)
        except MFASettings.DoesNotExist:
            user.mfa_configured = False
            user.mfa_verified = False

        return result
