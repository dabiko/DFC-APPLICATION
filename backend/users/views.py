from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import (
    UserSerializer,
    LoginSerializer,
    ChangePasswordSerializer,
)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    User login endpoint
    Returns JWT tokens and user data on successful authentication
    Tracks failed login attempts and locks account after 5 failed attempts
    """
    serializer = LoginSerializer(data=request.data, context={'request': request})

    if serializer.is_valid():
        user = serializer.validated_data['user']

        # Reset failed login attempts on successful login
        user.reset_failed_login_attempts()

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)

        return Response({
            'success': True,
            'data': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data
            }
        }, status=status.HTTP_200_OK)

    # Handle different error types
    errors = serializer.errors
    error_response = {
        'success': False,
        'message': 'Invalid credentials'
    }

    # Check for email validation error (domain restriction)
    if 'email' in errors:
        error_response['message'] = errors['email'][0] if isinstance(errors['email'], list) else str(errors['email'])
    # Check for non-field errors (login attempts, account locked, invalid credentials)
    elif 'non_field_errors' in errors:
        error_response['message'] = errors['non_field_errors'][0] if isinstance(errors['non_field_errors'], list) else str(errors['non_field_errors'])

    # Add metadata fields for remaining attempts and lock status
    if 'remaining_attempts' in errors:
        error_response['remaining_attempts'] = errors['remaining_attempts']
    if 'is_locked' in errors:
        error_response['is_locked'] = errors['is_locked']

    return Response(error_response, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    User logout endpoint
    Blacklists the refresh token
    """
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()

        return Response({
            'success': True,
            'message': 'Logged out successfully'
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'success': False,
            'message': 'Invalid token'
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    """
    Get current user profile
    """
    serializer = UserSerializer(request.user)
    return Response({
        'success': True,
        'data': serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_profile_view(request):
    """
    Update current user profile
    """
    serializer = UserSerializer(request.user, data=request.data, partial=True)

    if serializer.is_valid():
        serializer.save()
        return Response({
            'success': True,
            'data': serializer.data,
            'message': 'Profile updated successfully'
        }, status=status.HTTP_200_OK)

    return Response({
        'success': False,
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    """
    Change user password
    """
    serializer = ChangePasswordSerializer(data=request.data, context={'request': request})

    if serializer.is_valid():
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()

        return Response({
            'success': True,
            'message': 'Password changed successfully'
        }, status=status.HTTP_200_OK)

    return Response({
        'success': False,
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def unlock_account_view(request, user_id):
    """
    Unlock a locked user account (Admin only)
    """
    from .models import CustomUser

    # Check if user is admin
    if not request.user.is_admin and not request.user.is_staff:
        return Response({
            'success': False,
            'message': 'Only administrators can unlock accounts'
        }, status=status.HTTP_403_FORBIDDEN)

    try:
        user = CustomUser.objects.get(id=user_id)

        if not user.is_locked:
            return Response({
                'success': False,
                'message': 'Account is not locked'
            }, status=status.HTTP_400_BAD_REQUEST)

        user.unlock_account()

        return Response({
            'success': True,
            'message': f'Account {user.email} has been unlocked successfully'
        }, status=status.HTTP_200_OK)

    except CustomUser.DoesNotExist:
        return Response({
            'success': False,
            'message': 'User not found'
        }, status=status.HTTP_404_NOT_FOUND)
