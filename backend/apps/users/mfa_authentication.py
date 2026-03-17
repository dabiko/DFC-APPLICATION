"""
Custom JWT Authentication with MFA verification.

Extends the default JWT authentication to check if the user has
completed MFA verification when required.
"""

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.settings import api_settings
from rest_framework.exceptions import AuthenticationFailed
from apps.users.mfa_models import MFASettings


class MFAJWTAuthentication(JWTAuthentication):
    """
    Custom JWT Authentication that enforces MFA verification.

    After successful JWT validation, checks if:
    1. User account is still active (returns specific error code if deactivated)
    2. User has MFA enabled
    3. User has completed MFA verification (checked via JWT claim)

    If MFA is required but not verified, raises AuthenticationFailed.
    """

    def get_user(self, validated_token):
        """
        Override to return deactivated users instead of raising a generic error.
        SimpleJWT's default get_user() raises a generic AuthenticationFailed for
        inactive users. We override to provide a specific 'account_deactivated'
        error code so the frontend can show an appropriate message.
        """
        try:
            user_id = validated_token[api_settings.USER_ID_CLAIM]
        except KeyError:
            raise AuthenticationFailed(
                "Token contained no recognizable user identification",
                code="token_not_valid",
            )

        try:
            user = self.user_model.objects.get(**{api_settings.USER_ID_FIELD: user_id})
        except self.user_model.DoesNotExist:
            raise AuthenticationFailed(
                "User not found",
                code="user_not_found",
            )

        # Check is_active with a specific error code instead of SimpleJWT's generic one
        if not user.is_active:
            # Audit log: forced logout due to account deactivation
            try:
                from apps.audit.utils import log_user_action
                log_user_action(
                    action='LOGOUT',
                    target_user=user,
                    user=user,
                    metadata={'reason': 'account_deactivated'},
                )
            except Exception:
                pass

            raise AuthenticationFailed({
                'detail': 'Your account has been deactivated. Please contact your administrator.',
                'code': 'account_deactivated',
            })

        return user

    def authenticate(self, request):
        """
        Authenticate the request and check MFA status.
        """
        # Perform JWT authentication (uses our custom get_user above)
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

    def get_user(self, validated_token):
        """
        Override to return deactivated users with specific error code.
        """
        try:
            user_id = validated_token[api_settings.USER_ID_CLAIM]
        except KeyError:
            raise AuthenticationFailed(
                "Token contained no recognizable user identification",
                code="token_not_valid",
            )

        try:
            user = self.user_model.objects.get(**{api_settings.USER_ID_FIELD: user_id})
        except self.user_model.DoesNotExist:
            raise AuthenticationFailed(
                "User not found",
                code="user_not_found",
            )

        if not user.is_active:
            # Audit log: forced logout due to account deactivation
            try:
                from apps.audit.utils import log_user_action
                log_user_action(
                    action='LOGOUT',
                    target_user=user,
                    user=user,
                    metadata={'reason': 'account_deactivated'},
                )
            except Exception:
                pass

            raise AuthenticationFailed({
                'detail': 'Your account has been deactivated. Please contact your administrator.',
                'code': 'account_deactivated',
            })

        return user

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
