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
    BackupCodeRegenerateSerializer,
    TrustedDeviceSerializer,
    TrustDeviceSerializer,
    RevokeDeviceSerializer,
    MFAEnforcementPolicySerializer,
    MFAEnforcementPolicyCreateSerializer,
    LoginRiskAssessmentSerializer,
    AssessLoginRiskSerializer,
    MFAComplianceStatsSerializer,
    UserMFAStatusSerializer,
    EnforceMFASerializer,
)
from apps.users.mfa_models import (
    MFASettings,
    MFABackupCode,
    TrustedDevice,
    MFAEnforcementPolicy,
    LoginRiskAssessment,
)
from apps.audit.utils import log_audit_event


class MFASetupView(APIView):
    """
    POST /api/v1/auth/mfa/setup/

    Initiate MFA setup for authenticated user.
    Returns TOTP secret and QR code for authenticator app.
    Requires password verification with account lockout protection.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = MFASetupSerializer(
            data=request.data,
            context={'request': request}
        )

        if not serializer.is_valid():
            # Log failed password verification attempt
            log_audit_event(
                user=request.user,
                action='mfa_setup_password_failed',
                resource_type='mfa_settings',
                resource_id=str(request.user.id),
                outcome='failure',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT'),
                details={
                    'errors': serializer.errors,
                    'failed_attempts': request.user.failed_login_attempts,
                    'account_locked': request.user.is_account_locked
                }
            )
            return Response({
                'success': False,
                'message': 'Password verification failed',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        result = serializer.save()

        # Log successful audit event
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

        ip_address = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        # Log successful confirmation
        log_audit_event(
            user=request.user,
            action='mfa_enabled',
            resource_type='mfa_settings',
            resource_id=str(request.user.id),
            outcome='success',
            ip_address=ip_address,
            user_agent=user_agent,
            details={'message': 'MFA successfully enabled', 'backup_codes_generated': 10}
        )

        # Send email notification
        self._send_mfa_enabled_notification(request.user, ip_address, user_agent)

        return Response({
            'success': True,
            'message': 'MFA enabled successfully. Save your backup codes in a secure location.',
            'data': result
        }, status=status.HTTP_200_OK)

    def _send_mfa_enabled_notification(self, user, ip_address, user_agent):
        """Send email notification when MFA is enabled."""
        from django.core.mail import send_mail
        from django.template.loader import render_to_string
        from django.conf import settings as django_settings
        import logging

        logger = logging.getLogger(__name__)

        try:
            context = {
                'user_name': user.get_full_name() or user.username,
                'user_email': user.email,
                'enabled_time': timezone.now().strftime('%B %d, %Y at %I:%M %p %Z'),
                'ip_address': ip_address,
                'user_agent': user_agent,
                'support_email': getattr(django_settings, 'SUPPORT_EMAIL', 'support@cccplc.net'),
                'company_name': getattr(django_settings, 'COMPANY_NAME', 'CCC PLC'),
            }

            logger.info(f"Attempting to send MFA enabled email to {user.email}")

            html_message = render_to_string('emails/mfa_enabled.html', context)

            result = send_mail(
                subject='Two-Factor Authentication Enabled - Digital Filing Cabinet',
                message=f'Two-factor authentication has been enabled on your account on {context["enabled_time"]}.',
                from_email=getattr(django_settings, 'DEFAULT_FROM_EMAIL', 'noreply@cccplc.net'),
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,  # Don't fail silently so we can see errors
            )

            logger.info(f"MFA enabled email sent to {user.email}, result: {result}")

        except Exception as e:
            # Log email failure but don't fail the operation
            import traceback
            logger.error(f"Failed to send MFA enabled email to {user.email}: {str(e)}")
            logger.error(traceback.format_exc())

            log_audit_event(
                user=user,
                action='mfa_enabled_email_failed',
                resource_type='email',
                resource_id=str(user.id),
                outcome='failure',
                details={'error': str(e), 'traceback': traceback.format_exc()}
            )


class MFAVerifyView(APIView):
    """
    POST /api/v1/auth/mfa/verify/

    Verify MFA code during login (called after username/password authentication).
    Accepts both TOTP codes and backup codes.
    Returns full JWT tokens upon successful MFA verification.

    Request body:
    {
        "token": "123456",     // 6-digit TOTP code
        "user_id": 123,        // User ID from initial login
        "mfa_token": "...",    // MFA token from login response
        "trust_device": false, // Optional: trust this device
        "device_fingerprint": "..." // Optional: device fingerprint for trust
    }

    OR

    {
        "token": "ABCD-EFGH",  // Backup code
        "user_id": 123,
        "mfa_token": "..."
    }
    """
    permission_classes = [AllowAny]  # No authentication required (called during login)

    def post(self, request):
        import jwt
        from datetime import timedelta
        from django.conf import settings
        from django.contrib.auth import get_user_model
        from rest_framework_simplejwt.tokens import RefreshToken

        User = get_user_model()

        user_id = request.data.get('user_id')
        mfa_token = request.data.get('mfa_token')
        trust_device = request.data.get('trust_device', False)
        device_fingerprint = request.data.get('device_fingerprint')
        remember_me = request.data.get('remember_me', False)

        if not user_id:
            return Response({
                'success': False,
                'message': 'user_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Verify MFA token if provided
        if mfa_token:
            try:
                payload = jwt.decode(mfa_token, settings.SECRET_KEY, algorithms=['HS256'])
                if payload.get('type') != 'mfa_pending':
                    return Response({
                        'success': False,
                        'message': 'Invalid MFA token type'
                    }, status=status.HTTP_400_BAD_REQUEST)
                if payload.get('user_id') != int(user_id):
                    return Response({
                        'success': False,
                        'message': 'MFA token user mismatch'
                    }, status=status.HTTP_400_BAD_REQUEST)
            except jwt.ExpiredSignatureError:
                return Response({
                    'success': False,
                    'message': 'MFA session expired. Please login again.'
                }, status=status.HTTP_400_BAD_REQUEST)
            except jwt.InvalidTokenError:
                return Response({
                    'success': False,
                    'message': 'Invalid MFA token'
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

        # Record successful login after MFA
        user.record_successful_login(ip_address=request.META.get('REMOTE_ADDR'))

        # Generate full JWT tokens with MFA verified claim
        refresh = RefreshToken.for_user(user)

        # Add mfa_verified claim to the token - this is checked by MFAJWTAuthentication
        refresh['mfa_verified'] = True

        # If remember_me was set during initial login, extend token lifetime
        if remember_me:
            refresh.set_exp(lifetime=timedelta(days=30))

        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        # Handle trusted device if requested
        if trust_device and device_fingerprint:
            try:
                TrustedDevice.create_trusted_device(
                    user=user,
                    device_fingerprint=device_fingerprint,
                    device_name=request.data.get('device_name', ''),
                    device_type=request.data.get('device_type', 'other'),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    ip_address=request.META.get('REMOTE_ADDR'),
                    trust_days=30
                )
            except Exception as e:
                # Don't fail the MFA verification if trust device fails
                pass

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
            details={
                'message': 'MFA verification successful',
                'token_type': token_type,
                'device_trusted': trust_device
            }
        )

        # Get backup codes remaining
        backup_codes_remaining = MFABackupCode.get_unused_count(user)

        return Response({
            'success': True,
            'message': 'MFA verification successful',
            'data': {
                'verified': True,
                'access': access_token,
                'refresh': refresh_token,
                'token_type': token_type,
                'backup_codes_remaining': backup_codes_remaining,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'employee_id': user.employee_id,
                    'department': user.department.name if user.department else None,
                    'department_id': str(user.department.id) if user.department else None,
                    'is_staff': user.is_staff,
                    'is_superuser': user.is_superuser,
                    'mfa_enabled': user.mfa_enabled,
                    'organization_id': str(user.organization.id) if user.organization else None,
                    'organization_name': user.organization.name if user.organization else None,
                    'organization_domain': user.organization.domain if user.organization else None,
                }
            }
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

            ip_address = request.META.get('REMOTE_ADDR')
            user_agent = request.META.get('HTTP_USER_AGENT', '')

            # Log successful disable
            log_audit_event(
                user=request.user,
                action='mfa_disabled',
                resource_type='mfa_settings',
                resource_id=str(request.user.id),
                outcome='success',
                ip_address=ip_address,
                user_agent=user_agent,
                details={'message': 'MFA disabled successfully'}
            )

            # Send email notification
            self._send_mfa_disabled_notification(request.user, ip_address, user_agent)

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

    def _send_mfa_disabled_notification(self, user, ip_address, user_agent):
        """Send email notification when MFA is disabled."""
        from django.core.mail import send_mail
        from django.template.loader import render_to_string
        from django.conf import settings as django_settings
        import logging

        logger = logging.getLogger(__name__)

        try:
            # Build the settings URL for re-enabling MFA
            frontend_url = getattr(django_settings, 'FRONTEND_URL', 'https://dfc.cccplc.net')
            settings_url = f"{frontend_url}/settings/security"

            context = {
                'user_name': user.get_full_name() or user.username,
                'user_email': user.email,
                'disabled_time': timezone.now().strftime('%B %d, %Y at %I:%M %p %Z'),
                'ip_address': ip_address,
                'user_agent': user_agent,
                'settings_url': settings_url,
                'support_email': getattr(django_settings, 'SUPPORT_EMAIL', 'support@cccplc.net'),
                'company_name': getattr(django_settings, 'COMPANY_NAME', 'CCC PLC'),
            }

            logger.info(f"Attempting to send MFA disabled email to {user.email}")

            html_message = render_to_string('emails/mfa_disabled.html', context)

            result = send_mail(
                subject='Security Alert: Two-Factor Authentication Disabled - Digital Filing Cabinet',
                message=f'Two-factor authentication has been disabled on your account on {context["disabled_time"]}. If you did not make this change, please secure your account immediately.',
                from_email=getattr(django_settings, 'DEFAULT_FROM_EMAIL', 'noreply@cccplc.net'),
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,  # Don't fail silently so we can see errors
            )

            logger.info(f"MFA disabled email sent to {user.email}, result: {result}")

        except Exception as e:
            # Log email failure but don't fail the operation
            import traceback
            logger.error(f"Failed to send MFA disabled email to {user.email}: {str(e)}")
            logger.error(traceback.format_exc())

            log_audit_event(
                user=user,
                action='mfa_disabled_email_failed',
                resource_type='email',
                resource_id=str(user.id),
                outcome='failure',
                details={'error': str(e), 'traceback': traceback.format_exc()}
            )


class BackupCodeRegenerateView(APIView):
    """
    POST /api/v1/auth/mfa/backup-codes/regenerate/

    Regenerate backup codes (requires TOTP verification).
    Invalidates all existing backup codes.

    Rate limiting: Max 3 regenerations per 24 hours, 5 minute cooldown between regenerations.

    Request body:
    {
        "token": "123456"  // 6-digit TOTP code
    }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ip_address = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        serializer = BackupCodeRegenerateSerializer(
            data=request.data,
            context={'request': request}
        )

        if not serializer.is_valid():
            # Check if it's a rate limit error
            if 'rate_limit' in serializer.errors:
                error_detail = serializer.errors.get('rate_limit', ['Rate limit exceeded'])[0]
                wait_seconds = serializer.errors.get('wait_seconds', [0])[0]

                # Log rate limit hit
                log_audit_event(
                    user=request.user,
                    action='mfa_backup_codes_regenerate_rate_limited',
                    resource_type='mfa_settings',
                    resource_id=str(request.user.id),
                    outcome='failure',
                    ip_address=ip_address,
                    user_agent=user_agent,
                    details={
                        'reason': 'rate_limit',
                        'message': error_detail,
                        'wait_seconds': wait_seconds
                    }
                )

                return Response({
                    'success': False,
                    'message': error_detail,
                    'errors': {'rate_limit': [error_detail]},
                    'wait_seconds': wait_seconds
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)

            # Log failed regeneration (invalid token)
            log_audit_event(
                user=request.user,
                action='mfa_backup_codes_regenerate_failed',
                resource_type='mfa_settings',
                resource_id=str(request.user.id),
                outcome='failure',
                ip_address=ip_address,
                user_agent=user_agent,
                details={'errors': serializer.errors}
            )

            return Response({
                'success': False,
                'message': 'Invalid verification code',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        result = serializer.save()

        # Get MFA settings for stats
        mfa_settings = MFASettings.objects.get(user=request.user)
        stats = mfa_settings.get_regeneration_stats()

        # Log successful regeneration with detailed info
        log_audit_event(
            user=request.user,
            action='mfa_backup_codes_regenerated',
            resource_type='mfa_settings',
            resource_id=str(request.user.id),
            outcome='success',
            ip_address=ip_address,
            user_agent=user_agent,
            details={
                'message': 'Backup codes regenerated',
                'codes_generated': 10,
                'regenerations_today': stats['regenerations_today'],
                'regenerations_remaining': stats['regenerations_remaining'],
            }
        )

        # Send email notification
        self._send_regeneration_notification(request.user, ip_address, user_agent)

        return Response({
            'success': True,
            'message': 'Backup codes regenerated successfully. Save them in a secure location.',
            'data': result
        }, status=status.HTTP_200_OK)

    def _send_regeneration_notification(self, user, ip_address, user_agent):
        """Send email notification about backup code regeneration."""
        from django.core.mail import send_mail
        from django.template.loader import render_to_string
        from django.conf import settings as django_settings

        try:
            context = {
                'user_name': user.get_full_name() or user.username,
                'user_email': user.email,
                'regeneration_time': timezone.now().strftime('%B %d, %Y at %I:%M %p %Z'),
                'ip_address': ip_address,
                'user_agent': user_agent,
                'support_email': getattr(django_settings, 'SUPPORT_EMAIL', 'support@cccplc.net'),
                'company_name': getattr(django_settings, 'COMPANY_NAME', 'CCC PLC'),
            }

            html_message = render_to_string('emails/backup_codes_regenerated.html', context)

            send_mail(
                subject='Security Alert: Backup Codes Regenerated - Digital Filing Cabinet',
                message=f'Your backup codes were regenerated on {context["regeneration_time"]} from IP {ip_address}.',
                from_email=getattr(django_settings, 'DEFAULT_FROM_EMAIL', 'noreply@cccplc.net'),
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=True,
            )
        except Exception as e:
            # Log email failure but don't fail the regeneration
            log_audit_event(
                user=user,
                action='mfa_backup_codes_email_failed',
                resource_type='email',
                resource_id=str(user.id),
                outcome='failure',
                details={'error': str(e)}
            )


# ============================================================================
# Trusted Device Views
# ============================================================================

class TrustedDeviceListView(APIView):
    """
    GET /api/v1/auth/mfa/trusted-devices/

    List all trusted devices for the authenticated user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        devices = TrustedDevice.objects.filter(
            user=request.user,
            is_revoked=False
        ).order_by('-last_used_at')

        serializer = TrustedDeviceSerializer(
            devices,
            many=True,
            context={'request': request}
        )

        return Response({
            'success': True,
            'data': {
                'devices': serializer.data,
                'count': devices.count()
            }
        }, status=status.HTTP_200_OK)


class TrustedDeviceDetailView(APIView):
    """
    GET /api/v1/auth/mfa/trusted-devices/{id}/
    DELETE /api/v1/auth/mfa/trusted-devices/{id}/

    Get details or revoke a specific trusted device.
    """
    permission_classes = [IsAuthenticated]

    def get_device(self, request, device_id):
        try:
            return TrustedDevice.objects.get(
                id=device_id,
                user=request.user
            )
        except TrustedDevice.DoesNotExist:
            return None

    def get(self, request, device_id):
        device = self.get_device(request, device_id)
        if not device:
            return Response({
                'success': False,
                'message': 'Device not found'
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = TrustedDeviceSerializer(device, context={'request': request})
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)

    def delete(self, request, device_id):
        device = self.get_device(request, device_id)
        if not device:
            return Response({
                'success': False,
                'message': 'Device not found'
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = RevokeDeviceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        device.revoke(reason=serializer.validated_data.get('reason', ''))

        # Log audit event
        log_audit_event(
            user=request.user,
            action='trusted_device_revoked',
            resource_type='trusted_device',
            resource_id=str(device.id),
            outcome='success',
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT'),
            details={
                'device_name': device.device_name,
                'reason': serializer.validated_data.get('reason', '')
            }
        )

        return Response({
            'success': True,
            'message': 'Device trust revoked successfully'
        }, status=status.HTTP_200_OK)


class TrustDeviceView(APIView):
    """
    POST /api/v1/auth/mfa/trusted-devices/trust/

    Trust a new device.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TrustDeviceSerializer(
            data=request.data,
            context={'request': request}
        )

        if not serializer.is_valid():
            return Response({
                'success': False,
                'message': 'Invalid request',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        result = serializer.save()

        # Log audit event
        log_audit_event(
            user=request.user,
            action='trusted_device_added',
            resource_type='trusted_device',
            resource_id=str(result.get('id', '')),
            outcome='success',
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT'),
            details={
                'device_name': result.get('device_name', ''),
                'device_type': result.get('device_type', '')
            }
        )

        return Response({
            'success': True,
            'message': 'Device trusted successfully',
            'data': result
        }, status=status.HTTP_201_CREATED)


class CheckTrustedDeviceView(APIView):
    """
    POST /api/v1/auth/mfa/trusted-devices/check/

    Check if a device is trusted for the current user.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from django.contrib.auth import get_user_model
        User = get_user_model()

        user_id = request.data.get('user_id')
        device_fingerprint = request.data.get('device_fingerprint')

        if not user_id or not device_fingerprint:
            return Response({
                'success': False,
                'message': 'user_id and device_fingerprint are required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({
                'success': False,
                'message': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)

        is_trusted = TrustedDevice.is_device_trusted(user, device_fingerprint)

        return Response({
            'success': True,
            'data': {
                'is_trusted': is_trusted
            }
        }, status=status.HTTP_200_OK)


class RevokeAllDevicesView(APIView):
    """
    POST /api/v1/auth/mfa/trusted-devices/revoke-all/

    Revoke all trusted devices for the current user.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        devices = TrustedDevice.objects.filter(
            user=request.user,
            is_revoked=False
        )

        count = devices.count()

        for device in devices:
            device.revoke(reason='User revoked all devices')

        # Log audit event
        log_audit_event(
            user=request.user,
            action='all_trusted_devices_revoked',
            resource_type='trusted_device',
            resource_id='all',
            outcome='success',
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT'),
            details={'devices_revoked': count}
        )

        return Response({
            'success': True,
            'message': f'{count} device(s) trust revoked successfully',
            'data': {'devices_revoked': count}
        }, status=status.HTTP_200_OK)


# ============================================================================
# MFA Admin / Compliance Views
# ============================================================================

class IsAdminUser:
    """Permission class for admin-only views"""
    def has_permission(self, request, view):
        return request.user and (request.user.is_staff or request.user.is_superuser)


class MFAComplianceStatsView(APIView):
    """
    GET /api/v1/auth/mfa/admin/compliance/stats/

    Get MFA compliance statistics for the organization.
    Admin only.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({
                'success': False,
                'message': 'Admin access required'
            }, status=status.HTTP_403_FORBIDDEN)

        from django.contrib.auth import get_user_model
        from datetime import timedelta
        User = get_user_model()

        total_users = User.objects.filter(is_active=True).count()
        mfa_enabled_count = MFASettings.objects.filter(mfa_enabled=True).count()
        mfa_enforced_count = MFASettings.objects.filter(mfa_enforced=True).count()
        totp_enabled_count = MFASettings.objects.filter(totp_confirmed=True).count()

        # Users with enforced MFA but not enabled
        users_needing_setup = MFASettings.objects.filter(
            mfa_enforced=True,
            mfa_enabled=False
        ).count()

        # Recent verifications
        recent_verifications = MFASettings.objects.filter(
            last_verified_at__gte=timezone.now() - timedelta(hours=24)
        ).count()

        failed_verifications = MFASettings.objects.filter(
            last_failure_at__gte=timezone.now() - timedelta(hours=24),
            verification_failures__gt=0
        ).count()

        active_trusted_devices = TrustedDevice.objects.filter(
            is_revoked=False,
            expires_at__gt=timezone.now()
        ).count()

        stats = {
            'total_users': total_users,
            'mfa_enabled_count': mfa_enabled_count,
            'mfa_enabled_percentage': round((mfa_enabled_count / total_users * 100), 2) if total_users > 0 else 0,
            'mfa_enforced_count': mfa_enforced_count,
            'totp_enabled_count': totp_enabled_count,
            'users_needing_setup': users_needing_setup,
            'recent_verifications_24h': recent_verifications,
            'failed_verifications_24h': failed_verifications,
            'active_trusted_devices': active_trusted_devices,
        }

        serializer = MFAComplianceStatsSerializer(stats)

        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)


class AllUsersMFAStatusView(APIView):
    """
    GET /api/v1/auth/mfa/admin/users/

    Get MFA status for all users. Admin only.
    Supports pagination and filtering.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({
                'success': False,
                'message': 'Admin access required'
            }, status=status.HTTP_403_FORBIDDEN)

        from django.contrib.auth import get_user_model
        User = get_user_model()

        # Get query params
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        filter_mfa = request.query_params.get('mfa_status')  # 'enabled', 'disabled', 'enforced'
        search = request.query_params.get('search', '')

        users = User.objects.filter(is_active=True).order_by('email')

        if search:
            users = users.filter(email__icontains=search)

        user_data = []
        for user in users:
            mfa_settings = MFASettings.objects.filter(user=user).first()
            backup_codes = MFABackupCode.get_unused_count(user) if mfa_settings else 0
            trusted_devices = TrustedDevice.objects.filter(
                user=user,
                is_revoked=False,
                expires_at__gt=timezone.now()
            ).count()

            status_data = {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_active': user.is_active,
                'mfa_enabled': mfa_settings.mfa_enabled if mfa_settings else False,
                'mfa_enforced': mfa_settings.mfa_enforced if mfa_settings else False,
                'totp_confirmed': mfa_settings.totp_confirmed if mfa_settings else False,
                'backup_codes_remaining': backup_codes,
                'last_verified_at': mfa_settings.last_verified_at if mfa_settings else None,
                'trusted_devices_count': trusted_devices,
            }

            # Apply filter
            if filter_mfa == 'enabled' and not status_data['mfa_enabled']:
                continue
            if filter_mfa == 'disabled' and status_data['mfa_enabled']:
                continue
            if filter_mfa == 'enforced' and not status_data['mfa_enforced']:
                continue

            user_data.append(status_data)

        # Pagination
        total = len(user_data)
        start = (page - 1) * page_size
        end = start + page_size
        paginated_data = user_data[start:end]

        serializer = UserMFAStatusSerializer(paginated_data, many=True)

        return Response({
            'success': True,
            'data': {
                'users': serializer.data,
                'total': total,
                'page': page,
                'page_size': page_size,
                'total_pages': (total + page_size - 1) // page_size
            }
        }, status=status.HTTP_200_OK)


class EnforceMFAForUserView(APIView):
    """
    POST /api/v1/auth/mfa/admin/users/{user_id}/enforce/

    Enforce or un-enforce MFA for a specific user. Admin only.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({
                'success': False,
                'message': 'Admin access required'
            }, status=status.HTTP_403_FORBIDDEN)

        from django.contrib.auth import get_user_model
        User = get_user_model()

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({
                'success': False,
                'message': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = EnforceMFASerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        mfa_settings, _ = MFASettings.objects.get_or_create(user=user)
        mfa_settings.mfa_enforced = serializer.validated_data['enforce']
        mfa_settings.save(update_fields=['mfa_enforced'])

        # Log audit event
        action = 'mfa_enforced' if serializer.validated_data['enforce'] else 'mfa_enforcement_removed'
        log_audit_event(
            user=request.user,
            action=action,
            resource_type='user',
            resource_id=str(user.id),
            outcome='success',
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT'),
            details={
                'target_user': user.email,
                'enforce': serializer.validated_data['enforce']
            }
        )

        # TODO: Send notification email if notify_user is True

        return Response({
            'success': True,
            'message': f"MFA {'enforced' if serializer.validated_data['enforce'] else 'enforcement removed'} for {user.email}"
        }, status=status.HTTP_200_OK)


# ============================================================================
# MFA Enforcement Policy Views
# ============================================================================

class MFAEnforcementPolicyListView(APIView):
    """
    GET /api/v1/auth/mfa/admin/policies/
    POST /api/v1/auth/mfa/admin/policies/

    List or create MFA enforcement policies. Admin only.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({
                'success': False,
                'message': 'Admin access required'
            }, status=status.HTTP_403_FORBIDDEN)

        policies = MFAEnforcementPolicy.objects.all().order_by('-created_at')
        serializer = MFAEnforcementPolicySerializer(policies, many=True)

        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)

    def post(self, request):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({
                'success': False,
                'message': 'Admin access required'
            }, status=status.HTTP_403_FORBIDDEN)

        serializer = MFAEnforcementPolicyCreateSerializer(
            data=request.data,
            context={'request': request}
        )

        if not serializer.is_valid():
            return Response({
                'success': False,
                'message': 'Invalid policy data',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        policy = serializer.save()

        # Log audit event
        log_audit_event(
            user=request.user,
            action='mfa_policy_created',
            resource_type='mfa_policy',
            resource_id=str(policy.id),
            outcome='success',
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT'),
            details={'policy_name': policy.name}
        )

        return Response({
            'success': True,
            'message': 'Policy created successfully',
            'data': MFAEnforcementPolicySerializer(policy).data
        }, status=status.HTTP_201_CREATED)


class MFAEnforcementPolicyDetailView(APIView):
    """
    GET /api/v1/auth/mfa/admin/policies/{id}/
    PUT /api/v1/auth/mfa/admin/policies/{id}/
    DELETE /api/v1/auth/mfa/admin/policies/{id}/

    Get, update, or delete an MFA enforcement policy. Admin only.
    """
    permission_classes = [IsAuthenticated]

    def get_policy(self, policy_id):
        try:
            return MFAEnforcementPolicy.objects.get(id=policy_id)
        except MFAEnforcementPolicy.DoesNotExist:
            return None

    def get(self, request, policy_id):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({
                'success': False,
                'message': 'Admin access required'
            }, status=status.HTTP_403_FORBIDDEN)

        policy = self.get_policy(policy_id)
        if not policy:
            return Response({
                'success': False,
                'message': 'Policy not found'
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = MFAEnforcementPolicySerializer(policy)
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)

    def put(self, request, policy_id):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({
                'success': False,
                'message': 'Admin access required'
            }, status=status.HTTP_403_FORBIDDEN)

        policy = self.get_policy(policy_id)
        if not policy:
            return Response({
                'success': False,
                'message': 'Policy not found'
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = MFAEnforcementPolicyCreateSerializer(
            policy,
            data=request.data,
            partial=True,
            context={'request': request}
        )

        if not serializer.is_valid():
            return Response({
                'success': False,
                'message': 'Invalid policy data',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        policy = serializer.save()

        # Log audit event
        log_audit_event(
            user=request.user,
            action='mfa_policy_updated',
            resource_type='mfa_policy',
            resource_id=str(policy.id),
            outcome='success',
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT'),
            details={'policy_name': policy.name}
        )

        return Response({
            'success': True,
            'message': 'Policy updated successfully',
            'data': MFAEnforcementPolicySerializer(policy).data
        }, status=status.HTTP_200_OK)

    def delete(self, request, policy_id):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({
                'success': False,
                'message': 'Admin access required'
            }, status=status.HTTP_403_FORBIDDEN)

        policy = self.get_policy(policy_id)
        if not policy:
            return Response({
                'success': False,
                'message': 'Policy not found'
            }, status=status.HTTP_404_NOT_FOUND)

        policy_name = policy.name
        policy.delete()

        # Log audit event
        log_audit_event(
            user=request.user,
            action='mfa_policy_deleted',
            resource_type='mfa_policy',
            resource_id=str(policy_id),
            outcome='success',
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT'),
            details={'policy_name': policy_name}
        )

        return Response({
            'success': True,
            'message': 'Policy deleted successfully'
        }, status=status.HTTP_200_OK)


# ============================================================================
# Risk Assessment View
# ============================================================================

class AssessLoginRiskView(APIView):
    """
    POST /api/v1/auth/mfa/risk/assess/

    Assess login risk for a user. Called during login process.
    """
    permission_classes = [AllowAny]

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
                'message': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = AssessLoginRiskSerializer(
            data=request.data,
            context={'request': request, 'user': user}
        )
        serializer.is_valid(raise_exception=True)
        result = serializer.save()

        return Response({
            'success': True,
            'data': result
        }, status=status.HTTP_200_OK)


# ============================================================================
# SMS/Email OTP Views for MFA
# ============================================================================

class MFASendOTPView(APIView):
    """
    POST /api/v1/auth/mfa/otp/send/

    Send OTP via SMS or Email for MFA verification.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from django.contrib.auth import get_user_model
        from apps.users.models_otp import EmailOTP, PhoneOTP
        from apps.users.emails import send_email_otp

        User = get_user_model()

        method = request.data.get('method')  # 'sms' or 'email'
        user_id = request.data.get('user_id')

        if not method or method not in ['sms', 'email']:
            return Response({
                'success': False,
                'message': 'method must be either "sms" or "email"'
            }, status=status.HTTP_400_BAD_REQUEST)

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
                'message': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)

        ip_address = request.META.get('REMOTE_ADDR')

        if method == 'email':
            # Check rate limiting
            can_resend, seconds_remaining = EmailOTP.can_resend(user.email)
            if not can_resend:
                return Response({
                    'success': False,
                    'message': f'Please wait {seconds_remaining} seconds before requesting a new code.',
                    'data': {
                        'can_resend': False,
                        'seconds_remaining': seconds_remaining
                    }
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)

            # Create and send OTP
            otp = EmailOTP.create_otp(email=user.email, ip_address=ip_address)
            email_sent = send_email_otp(
                email=user.email,
                otp_code=otp.code,
                user_name=user.get_full_name() or user.email,
                expiry_minutes=EmailOTP.EXPIRY_MINUTES
            )

            if not email_sent:
                return Response({
                    'success': False,
                    'message': 'Failed to send verification email. Please try again.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Mask email for display
            email_parts = user.email.split('@')
            masked = email_parts[0][:2] + '***' + '@' + email_parts[1] if len(email_parts) == 2 else '***'

            # Log audit event
            log_audit_event(
                user=user,
                action='mfa_otp_sent',
                resource_type='mfa_settings',
                resource_id=str(user.id),
                outcome='success',
                ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT'),
                details={'method': 'email'}
            )

            return Response({
                'success': True,
                'message': 'Verification code sent to your email.',
                'data': {
                    'expires_in': otp.seconds_until_expiry,
                    'masked_destination': masked
                }
            }, status=status.HTTP_200_OK)

        elif method == 'sms':
            phone = getattr(user, 'phone_number', None)
            if not phone:
                return Response({
                    'success': False,
                    'message': 'No phone number on file. Please update your profile.'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Check rate limiting
            can_resend, seconds_remaining = PhoneOTP.can_resend(phone)
            if not can_resend:
                return Response({
                    'success': False,
                    'message': f'Please wait {seconds_remaining} seconds before requesting a new code.',
                    'data': {
                        'can_resend': False,
                        'seconds_remaining': seconds_remaining
                    }
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)

            # Create OTP
            otp = PhoneOTP.create_otp(phone_number=phone, ip_address=ip_address)

            # TODO: Implement actual SMS sending
            # For now, just log (remove in production)
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"MFA SMS OTP for {phone}: {otp.code}")

            # Mask phone for display
            masked = '+***' + phone[-4:] if len(phone) >= 4 else '***'

            # Log audit event
            log_audit_event(
                user=user,
                action='mfa_otp_sent',
                resource_type='mfa_settings',
                resource_id=str(user.id),
                outcome='success',
                ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT'),
                details={'method': 'sms'}
            )

            return Response({
                'success': True,
                'message': 'Verification code sent to your phone.',
                'data': {
                    'expires_in': otp.seconds_until_expiry,
                    'masked_destination': masked
                }
            }, status=status.HTTP_200_OK)


class MFAVerifyOTPView(APIView):
    """
    POST /api/v1/auth/mfa/otp/verify/

    Verify OTP code sent via SMS or Email for MFA.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from django.contrib.auth import get_user_model
        from apps.users.models_otp import EmailOTP, PhoneOTP

        User = get_user_model()

        method = request.data.get('method')  # 'sms' or 'email'
        user_id = request.data.get('user_id')
        code = request.data.get('code')

        if not method or method not in ['sms', 'email']:
            return Response({
                'success': False,
                'message': 'method must be either "sms" or "email"'
            }, status=status.HTTP_400_BAD_REQUEST)

        if not user_id or not code:
            return Response({
                'success': False,
                'message': 'user_id and code are required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({
                'success': False,
                'message': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)

        ip_address = request.META.get('REMOTE_ADDR')

        if method == 'email':
            otp = EmailOTP.objects.filter(email=user.email).order_by('-created_at').first()
            if not otp:
                return Response({
                    'success': False,
                    'message': 'No verification code found. Please request a new code.'
                }, status=status.HTTP_400_BAD_REQUEST)

            result = otp.verify(code)

        elif method == 'sms':
            phone = getattr(user, 'phone_number', None)
            if not phone:
                return Response({
                    'success': False,
                    'message': 'No phone number on file.'
                }, status=status.HTTP_400_BAD_REQUEST)

            otp = PhoneOTP.objects.filter(phone_number=phone).order_by('-created_at').first()
            if not otp:
                return Response({
                    'success': False,
                    'message': 'No verification code found. Please request a new code.'
                }, status=status.HTTP_400_BAD_REQUEST)

            result = otp.verify(code)

        if result['success']:
            # Update MFA settings
            mfa_settings, _ = MFASettings.objects.get_or_create(user=user)
            mfa_settings.record_verification_success()

            # Mark session as MFA verified
            request.session['mfa_verified'] = True
            request.session['mfa_verified_at'] = str(timezone.now())

            # Log audit event
            log_audit_event(
                user=user,
                action='mfa_otp_verification_success',
                resource_type='mfa_settings',
                resource_id=str(user.id),
                outcome='success',
                ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT'),
                details={'method': method}
            )

            return Response({
                'success': True,
                'message': 'Verification successful',
                'data': {'verified': True}
            }, status=status.HTTP_200_OK)
        else:
            # Record failure
            mfa_settings, _ = MFASettings.objects.get_or_create(user=user)
            mfa_settings.record_verification_failure()

            # Log audit event
            log_audit_event(
                user=user,
                action='mfa_otp_verification_failed',
                resource_type='mfa_settings',
                resource_id=str(user.id),
                outcome='failure',
                ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT'),
                details={'method': method, 'error': result.get('error', 'Unknown error')}
            )

            return Response({
                'success': False,
                'message': result.get('error', 'Invalid verification code')
            }, status=status.HTTP_400_BAD_REQUEST)
