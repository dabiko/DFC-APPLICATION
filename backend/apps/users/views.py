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
    ComprehensiveRegistrationSerializer,
    CustomTokenObtainPairSerializer,
    PasswordChangeSerializer,
    DepartmentSerializer
)
from apps.users.views_management import UserManagementSerializer
from apps.users.emails import send_welcome_email


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
    - MFA verification flow (returns mfa_required if user has MFA enabled)
    """
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        """
        Override post to handle MFA response properly.
        The serializer returns different data based on whether MFA is required.
        """
        serializer = self.get_serializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            # Re-raise to let DRF handle the error response
            raise

        # Get the validated data from serializer
        validated_data = serializer.validated_data

        # Check if this is an MFA required response
        if validated_data.get('mfa_required'):
            # Return MFA required response without tokens
            return Response({
                'mfa_required': True,
                'mfa_token': validated_data.get('mfa_token'),
                'user': validated_data.get('user'),
                'remember_me': validated_data.get('remember_me', False),
            }, status=status.HTTP_200_OK)

        # Normal login response with tokens
        return Response(validated_data, status=status.HTTP_200_OK)


@extend_schema(
    tags=['Authentication'],
    responses={
        200: OpenApiResponse(description='Token refreshed'),
        401: OpenApiResponse(description='Account deactivated or invalid token'),
    }
)
class SafeTokenRefreshView(TokenRefreshView):
    """
    Custom token refresh that checks if the user is still active.
    Prevents deactivated users from refreshing their tokens.
    """

    def post(self, request, *args, **kwargs):
        from rest_framework_simplejwt.tokens import UntypedToken
        from rest_framework_simplejwt.settings import api_settings

        try:
            refresh_token = request.data.get('refresh', '')
            token = UntypedToken(refresh_token)
            user_id = token.get(api_settings.USER_ID_CLAIM)
            user = CustomUser.objects.get(**{api_settings.USER_ID_FIELD: user_id})

            if not user.is_active:
                return Response(
                    {
                        'detail': 'Your account has been deactivated. Please contact your administrator.',
                        'code': 'account_deactivated',
                    },
                    status=status.HTTP_401_UNAUTHORIZED,
                )
        except (TokenError, CustomUser.DoesNotExist):
            pass  # Let the parent handle invalid tokens

        return super().post(request, *args, **kwargs)


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
        Blacklist the provided refresh token.

        Accepts optional 'reason' in request body:
        - 'user_initiated' (default) — user clicked logout
        - 'session_expired' — token refresh failed
        - 'account_deactivated' — account was deactivated while logged in
        """
        logout_reason = request.data.get('reason', 'user_initiated')

        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response(
                    {'detail': 'Refresh token is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            token = RefreshToken(refresh_token)
            token.blacklist()

            # Audit log: logout with reason
            try:
                from apps.audit.utils import log_user_action, get_client_ip, get_user_agent, set_audit_context
                set_audit_context(
                    user=request.user,
                    ip_address=get_client_ip(request),
                    user_agent=get_user_agent(request),
                )
                log_user_action(
                    action='LOGOUT',
                    target_user=request.user,
                    user=request.user,
                    metadata={'reason': logout_reason},
                )
            except Exception:
                pass

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
    tags=['Authentication'],
    request=ComprehensiveRegistrationSerializer,
    responses={
        201: OpenApiResponse(description='User registered successfully with complete profile'),
        400: OpenApiResponse(description='Validation error'),
    }
)
class ComprehensiveRegisterView(APIView):
    """
    Comprehensive user registration endpoint matching frontend signup form.

    Collects and stores:
    - Company information (name, registration number, tax ID, industry)
    - Personal information (name, email, phone, job title)
    - Address information (full address with country)
    - Security (password with validation)
    - Compliance (terms, privacy, marketing consent)

    Process:
    1. Validates business email domain
    2. Creates or updates Organization
    3. Creates default Department
    4. Auto-generates username and employee_id
    5. Creates CustomUser with all profile data
    6. Creates OrganizationMember (owner for new org, member for existing)
    7. Sends welcome email
    8. Returns JWT tokens for immediate login
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        """Handle comprehensive registration"""
        serializer = ComprehensiveRegistrationSerializer(data=request.data)

        if serializer.is_valid():
            # Create user with all data
            user = serializer.save()

            # Send welcome email (non-blocking, failure won't prevent registration)
            try:
                company_name = request.data.get('company_name')
                send_welcome_email(user, company_name=company_name)
            except Exception as e:
                # Log the error but don't fail the registration
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to send welcome email to {user.email}: {str(e)}")

            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)

            return Response(
                {
                    'success': True,
                    'message': 'Registration successful',
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'employee_id': user.employee_id,
                        'organization': {
                            'id': str(user.organization.id) if user.organization else None,
                            'name': user.organization.name if user.organization else None,
                            'domain': user.organization.domain if user.organization else None,
                        },
                        'department': user.department.name if user.department else None,
                    },
                    'tokens': {
                        'refresh': str(refresh),
                        'access': str(refresh.access_token),
                    }
                },
                status=status.HTTP_201_CREATED
            )

        return Response(
            {
                'success': False,
                'errors': serializer.errors
            },
            status=status.HTTP_400_BAD_REQUEST
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
    parameters=[
        OpenApiParameter(name='search', description='Search by name or email', type=str),
        OpenApiParameter(name='status', description='Filter by status (active, inactive, locked)', type=str),
        OpenApiParameter(name='department', description='Filter by department ID', type=int),
        OpenApiParameter(name='mfa_status', description='Filter by MFA status (enabled, disabled)', type=str),
        OpenApiParameter(name='page', description='Page number', type=int),
        OpenApiParameter(name='page_size', description='Items per page', type=int),
    ],
    responses={
        200: UserManagementSerializer(many=True),
    }
)
class UserListView(generics.ListAPIView):
    """
    List all users in the system with filtering and search.
    Requires authentication.
    """
    queryset = CustomUser.objects.select_related('department', 'organization').all()
    serializer_class = UserManagementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Filter users by various criteria
        """
        from django.db.models import Q
        from django.utils import timezone

        queryset = super().get_queryset()

        # Search filter
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search) |
                Q(username__icontains=search)
            )

        # Department filter
        department_id = self.request.query_params.get('department')
        if department_id:
            queryset = queryset.filter(department_id=department_id)

        # Status filter
        status_filter = self.request.query_params.get('status')
        if status_filter:
            now = timezone.now()
            if status_filter == 'active':
                queryset = queryset.filter(is_active=True).exclude(
                    account_locked_until__gt=now
                )
            elif status_filter == 'inactive':
                queryset = queryset.filter(is_active=False)
            elif status_filter == 'locked':
                queryset = queryset.filter(account_locked_until__gt=now)

        # MFA filter
        mfa_status = self.request.query_params.get('mfa_status')
        if mfa_status:
            if mfa_status == 'enabled':
                queryset = queryset.filter(mfa_enabled=True)
            elif mfa_status == 'disabled':
                queryset = queryset.filter(mfa_enabled=False)

        return queryset.order_by('-created_at')


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
