"""
MFA (Multi-Factor Authentication) views.

Handles all MFA operations:
- Setup (TOTP device creation with QR code)
- Confirmation (verify TOTP and enable MFA)
- Verification (during login)
- Status check
- Disable
- Backup code regeneration
"""

from rest_framework import status, serializers
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from django_otp.plugins.otp_totp.models import TOTPDevice
from apps.users.mfa_serializers import (
    MFASetupSerializer,
    MFAConfirmSerializer,
    MFAVerifySerializer,
    MFAStatusSerializer,
    MFADisableSerializer,
    BackupCodeRegenerateSerializer
)
from apps.users.mfa_models import MFASettings
from apps.audit.utils import log_audit_event


class MFASetupView(APIView):
    """
    POST /api/v1/auth/mfa/setup/

    Initiate MFA setup for authenticated user.
    Returns TOTP secret and QR code for authenticator app.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = MFASetupSerializer(
            data={},
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        result = serializer.save()

        # Log audit event
        log_audit_event(
            user=request.user,
            action='mfa_setup_initiated',
            resource_type='mfa_settings',
            resource_id=str(request.user.id),
            outcome='success',
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT'),
            details={'message': 'MFA setup initiated, QR code generated'}
        )

        return Response({
            'success': True,
            'message': 'MFA setup initiated. Scan the QR code with your authenticator app.',
            'data': result
        }, status=status.HTTP_200_OK)


class MFAConfirmView(APIView):
    """
    POST /api/v1/auth/mfa/confirm/

    Confirm MFA setup by verifying TOTP code.
    Enables MFA and generates backup codes.

    Request body:
    {
        "token": "123456"  // 6-digit TOTP code from authenticator app
    }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = MFAConfirmSerializer(
            data=request.data,
            context={'request': request}
        )

        if not serializer.is_valid():
            # Log failed confirmation
            log_audit_event(
                user=request.user,
                action='mfa_confirm_failed',
                resource_type='mfa_settings',
                resource_id=str(request.user.id),
                outcome='failure',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT'),
                details={'errors': serializer.errors}
            )
            return Response({
                'success': False,
                'message': 'Invalid verification code',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        result = serializer.save()

        # Log successful confirmation
        log_audit_event(
            user=request.user,
            action='mfa_enabled',
            resource_type='mfa_settings',
            resource_id=str(request.user.id),
            outcome='success',
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT'),
            details={'message': 'MFA successfully enabled', 'backup_codes_generated': 10}
        )

        return Response({
            'success': True,
            'message': 'MFA enabled successfully. Save your backup codes in a secure location.',
            'data': result
        }, status=status.HTTP_200_OK)


class MFAVerifyView(APIView):
    """
    POST /api/v1/auth/mfa/verify/

    Verify MFA code during login (called after username/password authentication).
    Accepts both TOTP codes and backup codes.

    Request body:
    {
        "token": "123456",     // 6-digit TOTP code
        "user_id": 123         // User ID from initial login
    }

    OR

    {
        "token": "ABCD-EFGH",  // Backup code
        "user_id": 123
    }
    """
    permission_classes = [AllowAny]  # No authentication required (called during login)

    def post(self, request):
        from django.contrib.auth import get_user_model
        User = get_user_model()

        user_id = request.data.get('user_id')
        if not user_id:
            return Response({
                'success': False,
                'message': 'user_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Invalid user'
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer = MFAVerifySerializer(
            data=request.data,
            context={
                'user': user,
                'ip_address': request.META.get('REMOTE_ADDR')
            }
        )

        if not serializer.is_valid():
            # Log failed verification
            log_audit_event(
                user=user,
                action='mfa_verification_failed',
                resource_type='mfa_settings',
                resource_id=str(user.id),
                outcome='failure',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT'),
                details={'errors': serializer.errors}
            )

            # Update MFA settings failure count
            mfa_settings, _ = MFASettings.objects.get_or_create(user=user)
            mfa_settings.record_verification_failure()

            return Response({
                'success': False,
                'message': 'Invalid verification code',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        result = serializer.save()

        # Mark session as MFA verified
        request.session['mfa_verified'] = True
        request.session['mfa_verified_at'] = str(timezone.now())

        # Log successful verification
        token_type = 'backup_code' if '-' in request.data.get('token', '') else 'totp'
        log_audit_event(
            user=user,
            action='mfa_verification_success',
            resource_type='mfa_settings',
            resource_id=str(user.id),
            outcome='success',
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT'),
            details={'message': 'MFA verification successful', 'token_type': token_type}
        )

        return Response({
            'success': True,
            'message': 'MFA verification successful',
            'data': result
        }, status=status.HTTP_200_OK)


class MFAStatusView(APIView):
    """
    GET /api/v1/auth/mfa/status/

    Get current MFA status for authenticated user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        mfa_settings, _ = MFASettings.objects.get_or_create(user=request.user)
        serializer = MFAStatusSerializer(mfa_settings)

        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)


class MFADisableView(APIView):
    """
    POST /api/v1/auth/mfa/disable/

    Disable MFA for authenticated user (requires TOTP verification).
    Cannot disable if MFA is enforced.

    Request body:
    {
        "token": "123456"  // 6-digit TOTP code
    }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = MFADisableSerializer(
            data=request.data,
            context={'request': request}
        )

        if not serializer.is_valid():
            # Log failed disable attempt
            log_audit_event(
                user=request.user,
                action='mfa_disable_failed',
                resource_type='mfa_settings',
                resource_id=str(request.user.id),
                outcome='failure',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT'),
                details={'errors': serializer.errors}
            )
            return Response({
                'success': False,
                'message': 'Failed to disable MFA',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = serializer.save()

            # Log successful disable
            log_audit_event(
                user=request.user,
                action='mfa_disabled',
                resource_type='mfa_settings',
                resource_id=str(request.user.id),
                outcome='success',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT'),
                details={'message': 'MFA disabled successfully'}
            )

            return Response({
                'success': True,
                'message': 'MFA disabled successfully',
                'data': result
            }, status=status.HTTP_200_OK)

        except serializers.ValidationError as e:
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class BackupCodeRegenerateView(APIView):
    """
    POST /api/v1/auth/mfa/backup-codes/regenerate/

    Regenerate backup codes (requires TOTP verification).
    Invalidates all existing backup codes.

    Request body:
    {
        "token": "123456"  // 6-digit TOTP code
    }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = BackupCodeRegenerateSerializer(
            data=request.data,
            context={'request': request}
        )

        if not serializer.is_valid():
            # Log failed regeneration
            log_audit_event(
                user=request.user,
                action='mfa_backup_codes_regenerate_failed',
                resource_type='mfa_settings',
                resource_id=str(request.user.id),
                outcome='failure',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT'),
                details={'errors': serializer.errors}
            )
            return Response({
                'success': False,
                'message': 'Invalid verification code',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        result = serializer.save()

        # Log successful regeneration
        log_audit_event(
            user=request.user,
            action='mfa_backup_codes_regenerated',
            resource_type='mfa_settings',
            resource_id=str(request.user.id),
            outcome='success',
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT'),
            details={'message': 'Backup codes regenerated', 'codes_generated': 10}
        )

        return Response({
            'success': True,
            'message': 'Backup codes regenerated successfully. Save them in a secure location.',
            'data': result
        }, status=status.HTTP_200_OK)
