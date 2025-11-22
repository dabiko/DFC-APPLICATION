"""
Enterprise Password Reset functionality
Implements comprehensive security features for password reset
"""
from datetime import timedelta
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.hashers import check_password
from django.core.mail import EmailMultiAlternatives
from django.core.exceptions import ValidationError
from django.template.loader import render_to_string
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.conf import settings
from django.utils import timezone
from django.db.models import Q
from rest_framework import serializers, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from drf_spectacular.utils import extend_schema, OpenApiResponse
import logging

from apps.users.models import CustomUser
from apps.users.models_password_history import (
    PasswordHistory,
    PasswordResetAttempt,
    PasswordResetToken
)
from apps.audit.models import AuditLog
from apps.organizations.validators import validate_business_email
from apps.users.services import EmailService

logger = logging.getLogger(__name__)


def get_client_ip(request):
    """Extract client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def check_rate_limit(email, ip_address, max_attempts=3, window_hours=1):
    """
    Check if email or IP has exceeded rate limit.
    Returns (is_allowed, attempts_count, wait_time_minutes)
    """
    cutoff_time = timezone.now() - timedelta(hours=window_hours)

    # Count recent attempts by email
    email_attempts = PasswordResetAttempt.objects.filter(
        email=email,
        created_at__gte=cutoff_time
    ).count()

    # Count recent attempts by IP
    ip_attempts = PasswordResetAttempt.objects.filter(
        ip_address=ip_address,
        created_at__gte=cutoff_time
    ).count()

    # Calculate wait time if rate limited
    if email_attempts >= max_attempts or ip_attempts >= max_attempts:
        # Find the oldest attempt that counts toward the limit
        oldest_attempt = PasswordResetAttempt.objects.filter(
            Q(email=email) | Q(ip_address=ip_address),
            created_at__gte=cutoff_time
        ).order_by('created_at').first()

        if oldest_attempt:
            time_until_reset = oldest_attempt.created_at + timedelta(hours=window_hours) - timezone.now()
            wait_minutes = max(1, int(time_until_reset.total_seconds() / 60))
        else:
            wait_minutes = 60

        return False, max(email_attempts, ip_attempts), wait_minutes

    return True, max(email_attempts, ip_attempts), 0


def check_password_history(user, new_password, history_count=5):
    """
    Check if new password was used recently.
    Returns (is_valid, message)
    """
    recent_passwords = PasswordHistory.objects.filter(
        user=user
    ).order_by('-created_at')[:history_count]

    for pwd_history in recent_passwords:
        if check_password(new_password, pwd_history.password_hash):
            return False, f"You cannot reuse any of your last {history_count} passwords. Please choose a different password."

    return True, ""


def save_password_to_history(user, password_hash):
    """Save password hash to history"""
    PasswordHistory.objects.create(
        user=user,
        password_hash=password_hash
    )

    # Keep only last 10 passwords in history
    old_passwords = PasswordHistory.objects.filter(
        user=user
    ).order_by('-created_at')[10:]

    for old_pwd in old_passwords:
        old_pwd.delete()


def send_password_reset_email(user, reset_url, request):
    """
    Send password reset email using EmailService with Resend.

    Args:
        user: CustomUser instance
        reset_url: Full password reset URL with token
        request: HTTP request object (for logging IP address)

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        # Extract token from reset_url
        token = reset_url.split('token=')[-1] if 'token=' in reset_url else 'N/A'

        # Get user's full name or default to email prefix
        user_name = user.get_full_name() if user.first_name or user.last_name else user.email.split('@')[0]

        # Use EmailService with our new Resend integration
        success = EmailService.send_password_reset_email(
            user_email=user.email,
            reset_token=token,
            reset_url=reset_url,
            user_name=user_name,
            expires_in_minutes=60  # Token expires in 1 hour
        )

        if success:
            logger.info(f"Password reset email sent to {user.email} via EmailService (IP: {get_client_ip(request)})")
        else:
            logger.error(f"EmailService failed to send password reset email to {user.email}")

        return success

    except Exception as e:
        logger.error(f"Failed to send password reset email to {user.email}: {str(e)}", exc_info=True)
        return False


def send_password_changed_notification(user, request):
    """
    Send notification email after successful password change using EmailService.

    Args:
        user: CustomUser instance
        request: HTTP request object (for logging IP address)

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        ip_address = get_client_ip(request)
        change_time = timezone.now().strftime('%Y-%m-%d %H:%M:%S %Z')

        # Get user's full name or default to email prefix
        user_name = user.get_full_name() if user.first_name or user.last_name else user.email.split('@')[0]

        # Use EmailService with our new Resend integration
        success = EmailService.send_password_changed_notification(
            user_email=user.email,
            user_name=user_name,
            change_time=change_time,
            ip_address=ip_address
        )

        if success:
            logger.info(f"Password changed notification sent to {user.email} via EmailService")
        else:
            logger.error(f"EmailService failed to send password changed notification to {user.email}")

        return success

    except Exception as e:
        logger.error(f"Failed to send password changed notification to {user.email}: {str(e)}", exc_info=True)
        return False


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for password reset request"""
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        return value.lower()


class TokenValidationSerializer(serializers.Serializer):
    """Serializer for token validation"""
    token = serializers.CharField(required=True)


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for password reset confirmation"""
    token = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)
    password_confirm = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        """Validate that passwords match"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError(
                {"password_confirm": "Passwords do not match"}
            )

        # Validate password strength
        from django.contrib.auth.password_validation import validate_password
        from django.core import exceptions as django_exceptions

        try:
            validate_password(attrs['password'])
        except django_exceptions.ValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})

        return attrs


@extend_schema(
    tags=['Authentication'],
    request=PasswordResetRequestSerializer,
    responses={
        200: OpenApiResponse(description='Password reset email sent'),
        429: OpenApiResponse(description='Rate limit exceeded'),
    }
)
class EnterprisePasswordResetRequestView(APIView):
    """
    Enterprise Password Reset Request with comprehensive security features.

    Features:
    - Rate limiting (3 requests per hour per email/IP)
    - IP address tracking
    - Audit trail logging
    - Secure token generation with expiry
    """
    permission_classes = [AllowAny]
    serializer_class = PasswordResetRequestSerializer

    def post(self, request):
        """Send password reset email with rate limiting and audit trail"""
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        # 1. VALIDATE EMAIL IS A BUSINESS EMAIL (not personal)
        try:
            validate_business_email(email)
        except ValidationError as e:
            # TODO: RESTORE AUDIT LOGGING FOR PERSONAL EMAIL REJECTION
            # The action type needs to be added to AuditLog.ACTION_CHOICES first
            AuditLog.log_action(
                user=None,
                action='PASSWORD_RESET',
                resource_type='USER',
                resource_id=None,
                resource_name=email,
                outcome='FAILURE',
                error_message='Personal email rejected',
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={'email': email, 'reason': 'personal_email'}
            )

            # Extract error message from ValidationError
            error_messages = e.messages if hasattr(e, 'messages') else [str(e)]
            error_message = error_messages[0] if error_messages else 'Please use your business email address. Personal email addresses are not allowed.'

            return Response({
                'detail': error_message
            }, status=status.HTTP_400_BAD_REQUEST)

        # 2. CHECK IF EMAIL EXISTS IN DATABASE
        try:
            user = CustomUser.objects.get(email=email)
        except CustomUser.DoesNotExist:
            # Don't reveal that email doesn't exist (security best practice to prevent email enumeration)
            # TODO: RESTORE AUDIT LOGGING FOR NONEXISTENT EMAIL
            # The action type needs to be added to AuditLog.ACTION_CHOICES first
            AuditLog.log_action(
                user=None,
                action='PASSWORD_RESET',
                resource_type='USER',
                resource_id=None,
                resource_name=email,
                outcome='FAILURE',
                error_message='Nonexistent email',
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={'email': email, 'reason': 'email_not_found'}
            )

            # Return generic success message (don't reveal email doesn't exist)
            return Response({
                'detail': 'If an account exists with this email, password reset instructions have been sent.'
            }, status=status.HTTP_200_OK)

        # Check rate limit
        is_allowed, attempts, wait_minutes = check_rate_limit(email, ip_address)

        if not is_allowed:
            # TODO: RESTORE AUDIT LOGGING - Temporarily disabled due to compatibility issues
            AuditLog.log_action(
                user=None,
                action='PASSWORD_RESET',
                resource_type='USER',
                resource_id=None,
                resource_name=email,
                outcome='FAILURE',
                error_message=f'Rate limit exceeded: {attempts} attempts',
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={'email': email, 'attempts': attempts, 'reason': 'rate_limited'}
            )

            return Response({
                'detail': f'Too many password reset attempts. Please try again in {wait_minutes} minutes.',
                'wait_minutes': wait_minutes
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # Log attempt
        PasswordResetAttempt.objects.create(
            email=email,
            ip_address=ip_address,
            user_agent=user_agent,
            success=False
        )

        # 3. GENERATE PASSWORD RESET TOKEN AND SEND EMAIL
        # At this point, we know:
        # - Email is a business email (not personal)
        # - Email exists in database
        # - Rate limit not exceeded
        try:
            # Generate password reset token
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token_string = f"{uid}-{token}"

            # Store token in database
            expires_at = timezone.now() + timedelta(hours=1)
            PasswordResetToken.objects.create(
                user=user,
                token=token_string,
                expires_at=expires_at,
                ip_address=ip_address,
                user_agent=user_agent
            )

            # Build reset URL
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
            reset_url = f"{frontend_url}/reset-password?token={token_string}"

            # Send email
            email_sent = send_password_reset_email(user, reset_url, request)

            # Mark attempt as successful (using update to avoid save() issues)
            PasswordResetAttempt.objects.filter(
                email=email,
                ip_address=ip_address
            ).order_by('-created_at').update(success=True)

            # Log password reset action to audit trail
            # Note: resource_id is None because User model uses integer IDs, not UUIDs
            # The user is identified via resource_name (email) and the user foreign key
            AuditLog.log_action(
                user=user,
                action='PASSWORD_RESET',
                resource_type='USER',
                resource_id=None,  # User IDs are integers, not UUIDs
                resource_name=user.full_name if user.full_name else user.email,
                outcome='SUCCESS',
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={'reset_url_sent': True, 'email_sent': email_sent}
            )

            if settings.DEBUG:
                print("=" * 80)
                print("PASSWORD RESET EMAIL")
                print("=" * 80)
                print(f"To: {user.email}")
                print(f"Reset URL: {reset_url}")
                print(f"Expires: {expires_at}")
                print("=" * 80)

            # Return success message
            return Response({
                'detail': 'Password reset instructions have been sent to your email address.'
            }, status=status.HTTP_200_OK)

        except Exception as e:
            # Log unexpected errors
            logger.error(f"Unexpected error during password reset: {str(e)}")
            # TODO: RESTORE AUDIT LOGGING FOR ERRORS
            AuditLog.log_action(
                user=user,
                action='PASSWORD_RESET',
                resource_type='USER',
                resource_id=str(user.id),
                resource_name=user.email,
                outcome='FAILURE',
                error_message=str(e),
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={'error': str(e)}
            )

            # Return generic error (don't expose internal details)
            return Response({
                'detail': 'An error occurred while processing your request. Please try again later.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@extend_schema(
    tags=['Authentication'],
    request=TokenValidationSerializer,
    responses={
        200: OpenApiResponse(description='Token is valid'),
        400: OpenApiResponse(description='Token is invalid or expired'),
    }
)
class TokenValidationView(APIView):
    """
    Validate password reset token before showing password form.
    Improves UX by checking token validity upfront.
    """
    permission_classes = [AllowAny]
    serializer_class = TokenValidationSerializer

    def post(self, request):
        """Validate reset token"""
        serializer = TokenValidationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token_string = serializer.validated_data['token']

        try:
            # Check if token exists in database
            reset_token = PasswordResetToken.objects.get(token=token_string)

            if not reset_token.is_valid():
                return Response({
                    'valid': False,
                    'detail': 'This password reset link has expired. Please request a new one.',
                    'expired': True
                }, status=status.HTTP_400_BAD_REQUEST)

            # Parse token
            if '-' not in token_string:
                raise ValueError("Invalid token format")

            uid, token = token_string.split('-', 1)
            user_id = force_str(urlsafe_base64_decode(uid))
            user = CustomUser.objects.get(pk=user_id)

            # Validate with Django's token generator
            if not default_token_generator.check_token(user, token):
                return Response({
                    'valid': False,
                    'detail': 'Invalid password reset token. Please request a new one.',
                    'expired': False
                }, status=status.HTTP_400_BAD_REQUEST)

            return Response({
                'valid': True,
                'detail': 'Token is valid',
                'user_email': user.email,
                'expires_in_minutes': int((reset_token.expires_at - timezone.now()).total_seconds() / 60)
            }, status=status.HTTP_200_OK)

        except (PasswordResetToken.DoesNotExist, TypeError, ValueError, OverflowError, CustomUser.DoesNotExist):
            return Response({
                'valid': False,
                'detail': 'Invalid password reset token. Please request a new one.',
                'expired': False
            }, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    tags=['Authentication'],
    request=PasswordResetConfirmSerializer,
    responses={
        200: OpenApiResponse(description='Password reset successful'),
        400: OpenApiResponse(description='Invalid token or password reuse'),
    }
)
class EnterprisePasswordResetConfirmView(APIView):
    """
    Enterprise Password Reset Confirmation with password history checking.
    """
    permission_classes = [AllowAny]
    serializer_class = PasswordResetConfirmSerializer

    def post(self, request):
        """Reset password with token and password history validation"""
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token_string = serializer.validated_data['token']
        new_password = serializer.validated_data['password']
        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        try:
            # Validate token
            reset_token = PasswordResetToken.objects.get(token=token_string)

            if not reset_token.is_valid():
                return Response({
                    'detail': 'This password reset link has expired. Please request a new password reset.'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Parse token
            if '-' not in token_string:
                raise ValueError("Invalid token format")

            uid, token = token_string.split('-', 1)
            user_id = force_str(urlsafe_base64_decode(uid))
            user = CustomUser.objects.get(pk=user_id)

            # Validate token with Django
            if not default_token_generator.check_token(user, token):
                return Response({
                    'detail': 'Invalid password reset token. Please request a new password reset.'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Check password history
            is_valid, history_message = check_password_history(user, new_password)
            if not is_valid:
                # TODO: RESTORE AUDIT LOGGING - Temporarily disabled for testing
                AuditLog.log_action(
                    user=user,
                    action='PASSWORD_RESET_REUSE_ATTEMPT',
                    resource_type='USER',
                    resource_id=str(user.id),
                    resource_name=user.get_full_name() if hasattr(user, 'get_full_name') else user.email,
                    outcome='BLOCKED',
                    ip_address=ip_address,
                    user_agent=user_agent,
                    metadata={}
                )

                return Response({
                    'detail': history_message
                }, status=status.HTTP_400_BAD_REQUEST)

            # Check if account is locked
            was_locked = user.is_account_locked
            locked_message = ""

            # Save old password to history before changing
            save_password_to_history(user, user.password)

            # Set new password
            user.set_password(new_password)

            # If account was locked, unlock it
            if was_locked:
                user.unlock_account()
                locked_message = " Your account has been unlocked."

                # Send account unlocked email notification
                try:
                    from apps.users.emails import send_account_unlocked_email
                    send_account_unlocked_email(user)
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Failed to send account unlocked email: {str(e)}")
            else:
                user.save()

            # Mark token as used
            reset_token.mark_as_used()

            # Log audit event
            audit_action = 'PASSWORD_RESET_UNLOCKED_ACCOUNT' if was_locked else 'PASSWORD_RESET_COMPLETED'
            # TODO: RESTORE AUDIT LOGGING - Temporarily disabled for testing
            AuditLog.log_action(
                user=user,
                action=audit_action,
                resource_type='USER',
                resource_id=str(user.id),
                resource_name=user.get_full_name() if hasattr(user, 'get_full_name') else user.email,
                outcome='SUCCESS',
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={'was_locked': was_locked}
            )

            # Send confirmation email
            send_password_changed_notification(user, request)

            return Response({
                'detail': f'Password has been reset successfully.{locked_message} You can now sign in with your new password.'
            }, status=status.HTTP_200_OK)

        except (PasswordResetToken.DoesNotExist, TypeError, ValueError, OverflowError, CustomUser.DoesNotExist):
            return Response({
                'detail': 'Invalid password reset token. Please request a new password reset.'
            }, status=status.HTTP_400_BAD_REQUEST)
