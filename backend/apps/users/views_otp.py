"""
API views for OTP verification during registration.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiResponse
from rest_framework import serializers
import logging

from apps.users.models_otp import EmailOTP, PhoneOTP
from apps.users.models import CustomUser
from apps.users.serializers_otp import (
    SendEmailOTPSerializer,
    VerifyEmailOTPSerializer,
    SendPhoneOTPSerializer,
    VerifyPhoneOTPSerializer
)
from apps.users.emails import send_email_otp

logger = logging.getLogger(__name__)


def get_client_ip(request):
    """Get client IP address from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


@extend_schema(
    tags=['Authentication - OTP'],
    request=SendEmailOTPSerializer,
    responses={
        200: OpenApiResponse(description='OTP sent successfully'),
        400: OpenApiResponse(description='Invalid request or rate limited'),
    },
    description='Send OTP code to email address for verification during registration'
)
@api_view(['POST'])
@permission_classes([AllowAny])
def send_email_otp_view(request):
    """
    Send OTP verification code to email address.

    This endpoint is called during registration (Step 2) when the user
    clicks "Next" to proceed to Step 3. It validates that the email is
    a business email (not personal) and sends a 6-digit OTP code.

    Rate limiting: 1 OTP per minute per email address.
    """
    serializer = SendEmailOTPSerializer(data=request.data)

    if not serializer.is_valid():
        return Response({
            'detail': 'Validation error',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data['email']
    first_name = serializer.validated_data.get('first_name', '')
    last_name = serializer.validated_data.get('last_name', '')
    user_name = f"{first_name} {last_name}".strip() or 'there'

    # Check if email already exists
    if CustomUser.objects.filter(email=email).exists():
        return Response({
            'detail': 'An account with this email address already exists. Please use a different email or login.',
            'email_exists': True
        }, status=status.HTTP_400_BAD_REQUEST)

    # Get client IP
    ip_address = get_client_ip(request)

    # Check if we can send a new OTP (rate limiting)
    can_resend, seconds_remaining = EmailOTP.can_resend(email)

    if not can_resend:
        return Response({
            'detail': f'Please wait {seconds_remaining} seconds before requesting a new code.',
            'seconds_remaining': seconds_remaining,
            'can_resend': False
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)

    try:
        # Create new OTP
        otp = EmailOTP.create_otp(email=email, ip_address=ip_address)

        # Send email
        email_sent = send_email_otp(
            email=email,
            otp_code=otp.code,
            user_name=user_name,
            expiry_minutes=EmailOTP.EXPIRY_MINUTES
        )

        if not email_sent:
            logger.error(f"Failed to send OTP email to {email}")
            return Response({
                'detail': 'Failed to send verification email. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        logger.info(f"OTP sent to {email} (IP: {ip_address})")

        return Response({
            'detail': 'Verification code sent successfully to your email.',
            'email': email,
            'expires_in_seconds': otp.seconds_until_expiry,
            'can_resend_in_seconds': EmailOTP.RESEND_COOLDOWN_SECONDS
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error sending OTP to {email}: {str(e)}")
        return Response({
            'detail': 'An error occurred while sending the verification code. Please try again.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@extend_schema(
    tags=['Authentication - OTP'],
    request=VerifyEmailOTPSerializer,
    responses={
        200: OpenApiResponse(description='Email verified successfully'),
        400: OpenApiResponse(description='Invalid or expired code'),
    },
    description='Verify email OTP code'
)
@api_view(['POST'])
@permission_classes([AllowAny])
def verify_email_otp_view(request):
    """
    Verify email OTP code.

    Validates the 6-digit OTP code sent to the user's email.
    Handles expired codes, invalid codes, and used codes with
    appropriate error messages.
    """
    serializer = VerifyEmailOTPSerializer(data=request.data)

    if not serializer.is_valid():
        return Response({
            'detail': 'Validation error',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data['email']
    code = serializer.validated_data['code']

    # Get the most recent OTP for this email
    otp = EmailOTP.objects.filter(email=email).order_by('-created_at').first()

    if not otp:
        return Response({
            'detail': 'No verification code found for this email. Please request a new code.',
            'verified': False
        }, status=status.HTTP_400_BAD_REQUEST)

    # Verify the code
    result = otp.verify(code)

    if result['success']:
        logger.info(f"Email {email} verified successfully")
        return Response({
            'detail': result['message'],
            'verified': True,
            'email': email
        }, status=status.HTTP_200_OK)
    else:
        logger.warning(f"Failed OTP verification for {email}: {result['error']}")
        return Response({
            'detail': result['error'],
            'verified': False
        }, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    tags=['Authentication - OTP'],
    request=SendPhoneOTPSerializer,
    responses={
        200: OpenApiResponse(description='OTP sent successfully'),
        400: OpenApiResponse(description='Invalid request or rate limited'),
    },
    description='Send OTP code to phone number for verification'
)
@api_view(['POST'])
@permission_classes([AllowAny])
def send_phone_otp_view(request):
    """
    Send OTP verification code to phone number.

    Note: SMS sending functionality needs to be implemented.
    This is a placeholder for future SMS integration (Twilio, AWS SNS, etc.)
    """
    serializer = SendPhoneOTPSerializer(data=request.data)

    if not serializer.is_valid():
        return Response({
            'detail': 'Validation error',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    phone_number = serializer.validated_data['phone_number']
    ip_address = get_client_ip(request)

    # Check rate limiting
    can_resend, seconds_remaining = PhoneOTP.can_resend(phone_number)

    if not can_resend:
        return Response({
            'detail': f'Please wait {seconds_remaining} seconds before requesting a new code.',
            'seconds_remaining': seconds_remaining,
            'can_resend': False
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)

    try:
        # Create new OTP
        otp = PhoneOTP.create_otp(phone_number=phone_number, ip_address=ip_address)

        # TODO: Implement SMS sending (Twilio, AWS SNS, etc.)
        # For now, log the code (REMOVE IN PRODUCTION)
        logger.info(f"Phone OTP for {phone_number}: {otp.code}")

        return Response({
            'detail': 'Verification code sent successfully to your phone.',
            'phone_number': phone_number,
            'expires_in_seconds': otp.seconds_until_expiry,
            'can_resend_in_seconds': PhoneOTP.RESEND_COOLDOWN_SECONDS
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error sending phone OTP to {phone_number}: {str(e)}")
        return Response({
            'detail': 'An error occurred while sending the verification code. Please try again.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@extend_schema(
    tags=['Authentication - OTP'],
    request=VerifyPhoneOTPSerializer,
    responses={
        200: OpenApiResponse(description='Phone verified successfully'),
        400: OpenApiResponse(description='Invalid or expired code'),
    },
    description='Verify phone OTP code'
)
@api_view(['POST'])
@permission_classes([AllowAny])
def verify_phone_otp_view(request):
    """
    Verify phone OTP code.

    Validates the 6-digit OTP code sent to the user's phone.
    """
    serializer = VerifyPhoneOTPSerializer(data=request.data)

    if not serializer.is_valid():
        return Response({
            'detail': 'Validation error',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    phone_number = serializer.validated_data['phone_number']
    code = serializer.validated_data['code']

    # Get the most recent OTP
    otp = PhoneOTP.objects.filter(phone_number=phone_number).order_by('-created_at').first()

    if not otp:
        return Response({
            'detail': 'No verification code found for this phone number. Please request a new code.',
            'verified': False
        }, status=status.HTTP_400_BAD_REQUEST)

    # Verify the code
    result = otp.verify(code)

    if result['success']:
        logger.info(f"Phone {phone_number} verified successfully")
        return Response({
            'detail': result['message'],
            'verified': True,
            'phone_number': phone_number
        }, status=status.HTTP_200_OK)
    else:
        logger.warning(f"Failed phone OTP verification for {phone_number}: {result['error']}")
        return Response({
            'detail': result['error'],
            'verified': False
        }, status=status.HTTP_400_BAD_REQUEST)
