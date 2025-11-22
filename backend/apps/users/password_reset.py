"""
Password Reset functionality for user authentication.
Implements secure token-based password reset via email.
"""
from datetime import timedelta
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.conf import settings
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from drf_spectacular.utils import extend_schema, OpenApiResponse

from apps.users.models import CustomUser


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for password reset request"""
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        """Validate that email exists in system"""
        try:
            user = CustomUser.objects.get(email=value.lower())
        except CustomUser.DoesNotExist:
            # Don't reveal whether email exists (security best practice)
            # Still return success to prevent email enumeration
            pass
        return value.lower()


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
        400: OpenApiResponse(description='Invalid request'),
    }
)
class PasswordResetRequestView(APIView):
    """
    Request password reset email.

    Sends an email with a secure token link to reset password.
    Token is valid for 1 hour.

    Security notes:
    - Always returns success to prevent email enumeration
    - Uses Django's secure token generator
    - Token expires after 1 hour
    """
    permission_classes = [AllowAny]
    serializer_class = PasswordResetRequestSerializer

    def post(self, request):
        """Send password reset email"""
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']

        try:
            user = CustomUser.objects.get(email=email)

            # Generate password reset token
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))

            # Build reset URL
            # In production, use settings.FRONTEND_URL
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
            reset_url = f"{frontend_url}/reset-password?token={uid}-{token}"

            # Prepare email context
            base_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
            email_context = {
                'user': user,
                'reset_url': reset_url,
                'expiry_hours': 1,
                'base_url': base_url,
            }

            # Render both HTML and plain text versions
            html_message = render_to_string('users/password_reset_email_enterprise.html', email_context)
            text_message = render_to_string('users/password_reset_email.txt', email_context)

            subject = 'Password Reset Request - Digital Filing Cabinet'

            # For development, print to console
            if settings.DEBUG:
                print("=" * 80)
                print("PASSWORD RESET EMAIL")
                print("=" * 80)
                print(f"To: {user.email}")
                print(f"Reset URL: {reset_url}")
                print("=" * 80)

            try:
                from django.core.mail import EmailMultiAlternatives

                # Create email with both text and HTML versions
                email = EmailMultiAlternatives(
                    subject=subject,
                    body=text_message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[user.email],
                )
                email.attach_alternative(html_message, "text/html")
                email.send(fail_silently=False)
            except Exception as e:
                # Log error but don't reveal to user
                print(f"Failed to send email: {e}")

        except CustomUser.DoesNotExist:
            # Don't reveal that email doesn't exist
            pass

        # Always return success (security best practice)
        return Response({
            'detail': 'If an account exists with this email, password reset instructions have been sent.'
        }, status=status.HTTP_200_OK)


@extend_schema(
    tags=['Authentication'],
    request=PasswordResetConfirmSerializer,
    responses={
        200: OpenApiResponse(description='Password reset successful'),
        400: OpenApiResponse(description='Invalid or expired token'),
    }
)
class PasswordResetConfirmView(APIView):
    """
    Confirm password reset with token.

    Validates the token and sets new password.
    """
    permission_classes = [AllowAny]
    serializer_class = PasswordResetConfirmSerializer

    def post(self, request):
        """Reset password with token"""
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token_string = serializer.validated_data['token']
        new_password = serializer.validated_data['password']

        try:
            # Parse token (format: uid-token)
            if '-' not in token_string:
                raise ValueError("Invalid token format")

            uid, token = token_string.split('-', 1)

            # Decode user ID
            user_id = force_str(urlsafe_base64_decode(uid))
            user = CustomUser.objects.get(pk=user_id)

            # Validate token
            if not default_token_generator.check_token(user, token):
                return Response({
                    'detail': 'Invalid or expired password reset token. Please request a new password reset.'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Set new password
            user.set_password(new_password)
            user.save()

            return Response({
                'detail': 'Password has been reset successfully. You can now sign in with your new password.'
            }, status=status.HTTP_200_OK)

        except (TypeError, ValueError, OverflowError, CustomUser.DoesNotExist):
            return Response({
                'detail': 'Invalid or expired password reset token. Please request a new password reset.'
            }, status=status.HTTP_400_BAD_REQUEST)
