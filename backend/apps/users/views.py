"""
Views for user authentication and management.
"""
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse

from apps.users.models import CustomUser, Department
from apps.users.serializers import (
    UserSerializer,
    UserRegistrationSerializer,
    CustomTokenObtainPairSerializer,
    PasswordChangeSerializer,
    DepartmentSerializer
)


@extend_schema(
    tags=['Authentication'],
    request=CustomTokenObtainPairSerializer,
    responses={
        200: OpenApiResponse(description='Login successful'),
        400: OpenApiResponse(description='Invalid credentials or account locked'),
    }
)
class LoginView(TokenObtainPairView):
    """
    User login endpoint that returns JWT tokens.

    Handles:
    - JWT token generation
    - Failed login attempt tracking
    - Account lockout after 5 failed attempts
    - Returns user information with tokens
    """
    serializer_class = CustomTokenObtainPairSerializer


@extend_schema(
    tags=['Authentication'],
    responses={
        200: OpenApiResponse(description='Logout successful'),
        400: OpenApiResponse(description='Invalid token'),
    }
)
class LogoutView(APIView):
    """
    User logout endpoint that blacklists the refresh token.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """
        Blacklist the provided refresh token
        """
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response(
                    {'detail': 'Refresh token is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            token = RefreshToken(refresh_token)
            token.blacklist()

            return Response(
                {'detail': 'Logout successful'},
                status=status.HTTP_200_OK
            )
        except TokenError as e:
            return Response(
                {'detail': 'Invalid or expired token'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'detail': 'An error occurred during logout'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@extend_schema(
    tags=['Authentication'],
    request=UserRegistrationSerializer,
    responses={
        201: OpenApiResponse(description='User registered successfully'),
        400: OpenApiResponse(description='Validation error'),
    }
)
class RegisterView(generics.CreateAPIView):
    """
    User registration endpoint.

    Validates:
    - Email must end with @cccplc.net
    - Password strength requirements
    - Password confirmation match
    - Unique username and email
    """
    queryset = CustomUser.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        """
        Create a new user and return user data with tokens
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Generate tokens for the new user
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                'user': UserSerializer(user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            },
            status=status.HTTP_201_CREATED
        )


@extend_schema(
    tags=['Users'],
    responses={
        200: UserSerializer,
    }
)
class CurrentUserView(generics.RetrieveUpdateAPIView):
    """
    Get or update the current authenticated user's profile.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        """
        Return the current authenticated user
        """
        return self.request.user


@extend_schema(
    tags=['Users'],
    request=PasswordChangeSerializer,
    responses={
        200: OpenApiResponse(description='Password changed successfully'),
        400: OpenApiResponse(description='Validation error'),
    }
)
class PasswordChangeView(APIView):
    """
    Endpoint for changing user password.
    Requires current password for verification.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """
        Change the current user's password
        """
        serializer = PasswordChangeSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {'detail': 'Password changed successfully'},
            status=status.HTTP_200_OK
        )


@extend_schema(
    tags=['Users'],
    responses={
        200: UserSerializer(many=True),
    }
)
class UserListView(generics.ListAPIView):
    """
    List all users in the system.
    Requires authentication.
    """
    queryset = CustomUser.objects.select_related('department').all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Optionally filter users by department
        """
        queryset = super().get_queryset()
        department_id = self.request.query_params.get('department', None)

        if department_id is not None:
            queryset = queryset.filter(department_id=department_id)

        return queryset


@extend_schema(
    tags=['Users'],
    responses={
        200: UserSerializer,
    }
)
class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a specific user.
    Requires admin permissions for update/delete.
    """
    queryset = CustomUser.objects.select_related('department').all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        """
        Allow read for any authenticated user,
        but require staff status for update/delete
        """
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [permissions.IsAdminUser()]
        return super().get_permissions()


@extend_schema(
    tags=['Departments'],
    responses={
        200: DepartmentSerializer(many=True),
    }
)
class DepartmentListView(generics.ListCreateAPIView):
    """
    List all departments or create a new one.
    """
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        """
        Allow read for any authenticated user,
        but require staff status for create
        """
        if self.request.method == 'POST':
            return [permissions.IsAdminUser()]
        return super().get_permissions()


@extend_schema(
    tags=['Departments'],
    responses={
        200: DepartmentSerializer,
    }
)
class DepartmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a specific department.
    """
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        """
        Allow read for any authenticated user,
        but require staff status for update/delete
        """
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [permissions.IsAdminUser()]
        return super().get_permissions()
