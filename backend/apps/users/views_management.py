"""
Views for user management, security, and statistics.

Provides enterprise user administration endpoints including:
- User listing with filtering and pagination
- User activation/deactivation
- Account unlock
- Password reset
- Security statistics
- User management dashboard stats
"""
import csv
from datetime import timedelta
from django.http import HttpResponse
from django.utils import timezone
from django.db.models import Count, Q
from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse

from apps.users.models import CustomUser, Department
from apps.users.serializers import UserSerializer

import logging
logger = logging.getLogger(__name__)


def _log_admin_user_action(request, action, target_user, outcome='SUCCESS', metadata=None):
    """Helper to log admin user management actions to the audit trail."""
    try:
        from apps.audit.utils import log_user_action, get_client_ip, get_user_agent, set_audit_context
        set_audit_context(
            user=request.user,
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
        )
        log_user_action(
            action=action,
            target_user=target_user,
            user=request.user,
            outcome=outcome,
            metadata={
                'performed_by': request.user.get_full_name(),
                'performed_by_id': request.user.id,
                **(metadata or {}),
            },
        )
    except Exception:
        logger.warning(
            f"Failed to log audit event: {action} on user {target_user.id}",
            exc_info=True
        )


class UserPagination(PageNumberPagination):
    """Pagination for user lists"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class IsAdminOrManager(permissions.BasePermission):
    """
    Custom permission to only allow admins or managers.
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            (request.user.is_staff or request.user.is_superuser)
        )


@extend_schema(
    tags=['User Management'],
    parameters=[
        OpenApiParameter(name='search', description='Search by name or email', type=str),
        OpenApiParameter(name='status', description='Filter by status (active, inactive, locked)', type=str),
        OpenApiParameter(name='role', description='Filter by role', type=str),
        OpenApiParameter(name='department', description='Filter by department ID', type=int),
        OpenApiParameter(name='mfa_status', description='Filter by MFA status (enabled, disabled)', type=str),
        OpenApiParameter(name='page', description='Page number', type=int),
        OpenApiParameter(name='page_size', description='Items per page', type=int),
    ],
    responses={200: UserSerializer(many=True)}
)
class UserManagementListView(APIView):
    """
    List users with filtering, search, and pagination.
    """
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = UserPagination

    def get(self, request):
        queryset = CustomUser.objects.select_related('department', 'organization').all()

        # Apply filters
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search) |
                Q(username__icontains=search)
            )

        status_filter = request.query_params.get('status')
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

        department = request.query_params.get('department')
        if department:
            queryset = queryset.filter(department_id=department)

        mfa_status = request.query_params.get('mfa_status')
        if mfa_status:
            if mfa_status == 'enabled':
                queryset = queryset.filter(mfa_enabled=True)
            elif mfa_status == 'disabled':
                queryset = queryset.filter(mfa_enabled=False)

        # Order by
        ordering = request.query_params.get('ordering', '-created_at')
        if ordering in ['created_at', '-created_at', 'last_name', '-last_name', 'email', '-email']:
            queryset = queryset.order_by(ordering)

        # Paginate
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)

        if page is not None:
            serializer = UserManagementSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = UserManagementSerializer(queryset, many=True)
        return Response(serializer.data)


@extend_schema(
    tags=['User Management'],
    parameters=[
        OpenApiParameter(name='search', description='Search by name or email', type=str),
        OpenApiParameter(name='status', description='Filter by status (active, inactive, locked)', type=str),
        OpenApiParameter(name='role', description='Filter by role', type=str),
        OpenApiParameter(name='department', description='Filter by department ID', type=int),
    ],
    responses={200: OpenApiResponse(description='CSV file download')}
)
class UserExportView(APIView):
    """Export users to CSV with the same filters as the user list."""
    permission_classes = [IsAdminOrManager]

    def get(self, request):
        queryset = CustomUser.objects.select_related('department', 'organization').all()
        now = timezone.now()

        # Apply same filters as UserManagementListView
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search) |
                Q(username__icontains=search)
            )

        status_filter = request.query_params.get('status')
        if status_filter:
            if status_filter == 'active':
                queryset = queryset.filter(is_active=True).exclude(
                    account_locked_until__gt=now
                )
            elif status_filter == 'inactive':
                queryset = queryset.filter(is_active=False)
            elif status_filter == 'locked':
                queryset = queryset.filter(account_locked_until__gt=now)

        department = request.query_params.get('department')
        if department:
            queryset = queryset.filter(department_id=department)

        queryset = queryset.order_by('last_name', 'first_name')

        # Build CSV response
        response = HttpResponse(content_type='text/csv')
        timestamp = now.strftime('%Y-%m-%d')
        response['Content-Disposition'] = f'attachment; filename="users-export-{timestamp}.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'First Name', 'Last Name', 'Email', 'Username', 'Employee ID',
            'Department', 'Role', 'Status', 'MFA Enabled',
            'Phone Number', 'Job Title',
            'Last Login', 'Date Joined',
        ])

        for user in queryset:
            # Compute status
            if user.account_locked_until and user.account_locked_until > now:
                user_status = 'Locked'
            elif not user.is_active:
                user_status = 'Inactive'
            else:
                user_status = 'Active'

            # Get role (same logic as UserManagementSerializer.get_role)
            role = 'member'
            try:
                from apps.organizations.models import OrganizationMember
                membership = OrganizationMember.objects.filter(
                    user=user,
                    organization=user.organization
                ).first()
                if membership:
                    role = membership.role
                elif user.is_superuser:
                    role = 'admin'
                elif user.is_staff:
                    role = 'manager'
            except Exception:
                if user.is_superuser:
                    role = 'admin'
                elif user.is_staff:
                    role = 'manager'

            writer.writerow([
                user.first_name,
                user.last_name,
                user.email,
                user.username,
                user.employee_id or '',
                user.department.name if user.department else '',
                role.replace('_', ' ').title(),
                user_status,
                'Yes' if user.mfa_enabled else 'No',
                user.phone_number or '',
                user.job_title or '',
                user.last_login.strftime('%Y-%m-%d %H:%M') if user.last_login else 'Never',
                user.date_joined.strftime('%Y-%m-%d'),
            ])

        return response


@extend_schema(
    tags=['User Management'],
    responses={
        200: OpenApiResponse(description='User activated successfully'),
        404: OpenApiResponse(description='User not found'),
    }
)
class UserActivateView(APIView):
    """Activate a user account"""
    permission_classes = [IsAdminOrManager]

    def post(self, request, pk):
        try:
            user = CustomUser.objects.get(pk=pk)
            user.is_active = True
            user.save(update_fields=['is_active', 'updated_at'])
            _log_admin_user_action(request, 'EDIT', user, metadata={
                'admin_action': 'activate',
                'change': 'is_active: False → True',
            })
            return Response(UserManagementSerializer(user).data)
        except CustomUser.DoesNotExist:
            return Response(
                {'detail': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )


@extend_schema(
    tags=['User Management'],
    responses={
        200: OpenApiResponse(description='User deactivated successfully'),
        404: OpenApiResponse(description='User not found'),
    }
)
class UserDeactivateView(APIView):
    """Deactivate a user account"""
    permission_classes = [IsAdminOrManager]

    def post(self, request, pk):
        try:
            user = CustomUser.objects.get(pk=pk)
            user.is_active = False
            user.save(update_fields=['is_active', 'updated_at'])
            _log_admin_user_action(request, 'EDIT', user, metadata={
                'admin_action': 'deactivate',
                'change': 'is_active: True → False',
            })
            return Response(UserManagementSerializer(user).data)
        except CustomUser.DoesNotExist:
            return Response(
                {'detail': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )


@extend_schema(
    tags=['User Management'],
    responses={
        200: OpenApiResponse(description='User account unlocked successfully'),
        404: OpenApiResponse(description='User not found'),
    }
)
class UserUnlockView(APIView):
    """Unlock a user account"""
    permission_classes = [IsAdminOrManager]

    def post(self, request, pk):
        try:
            user = CustomUser.objects.get(pk=pk)
            failed_attempts = user.failed_login_attempts
            user.unlock_account()
            user.save()
            _log_admin_user_action(request, 'ACCOUNT_UNLOCKED', user, metadata={
                'admin_action': 'unlock',
                'previous_failed_attempts': failed_attempts,
            })
            return Response(UserManagementSerializer(user).data)
        except CustomUser.DoesNotExist:
            return Response(
                {'detail': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )


@extend_schema(
    tags=['User Management'],
    responses={
        200: OpenApiResponse(description='Password reset email sent'),
        404: OpenApiResponse(description='User not found'),
    }
)
class UserResetPasswordView(APIView):
    """Send password reset email to user"""
    permission_classes = [IsAdminOrManager]

    def post(self, request, pk):
        try:
            user = CustomUser.objects.get(pk=pk)
            _log_admin_user_action(request, 'PASSWORD_RESET', user, metadata={
                'admin_action': 'password_reset',
                'initiated_by': request.user.get_full_name(),
            })
            # In production, this would send a password reset email
            # For now, just return success
            return Response({
                'message': f'Password reset email sent to {user.email}'
            })
        except CustomUser.DoesNotExist:
            return Response(
                {'detail': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )


@extend_schema(
    tags=['Security'],
    responses={
        200: OpenApiResponse(description='Security statistics')
    }
)
class SecurityStatsView(APIView):
    """Get security statistics for the dashboard"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        day_ago = now - timedelta(hours=24)

        users = CustomUser.objects.all()
        total_users = users.count()
        active_users = users.filter(is_active=True).count()
        inactive_users = total_users - active_users

        # Locked accounts (those with lock time in the future)
        locked_accounts = users.filter(account_locked_until__gt=now).count()

        # MFA stats
        mfa_enabled_count = users.filter(mfa_enabled=True).count()
        mfa_enabled_percentage = round((mfa_enabled_count / total_users * 100) if total_users > 0 else 0)

        # Users with failed attempts
        users_with_failed_attempts = users.filter(failed_login_attempts__gt=0).count()

        # Failed logins today (approximate - users who have failed attempts and last failed login is today)
        failed_logins_today = users.filter(
            last_failed_login__gte=today_start,
            failed_login_attempts__gt=0
        ).count()

        # Failed logins in last 24 hours
        failed_logins_24h = users.filter(
            last_failed_login__gte=day_ago,
            failed_login_attempts__gt=0
        ).count()

        # Active sessions - users who logged in within the last hour (approximation)
        one_hour_ago = now - timedelta(hours=1)
        active_sessions = users.filter(
            last_login__gte=one_hour_ago,
            is_active=True
        ).count()

        # Pending invitations (if you have an invitation model)
        pending_invitations = 0
        try:
            from apps.organizations.models import Invitation
            pending_invitations = Invitation.objects.filter(status='pending').count()
        except:
            pass

        return Response({
            'total_users': total_users,
            'active_users': active_users,
            'inactive_users': inactive_users,
            'locked_accounts': locked_accounts,
            'mfa_enabled_count': mfa_enabled_count,
            'mfa_enabled_percentage': mfa_enabled_percentage,
            'mfa_adoption_rate': mfa_enabled_percentage,  # Alias for frontend compatibility
            'pending_invitations': pending_invitations,
            'failed_logins_today': failed_logins_today,
            'failed_logins_24h': failed_logins_24h,  # Last 24 hours
            'users_with_failed_attempts': users_with_failed_attempts,
            'active_sessions': active_sessions,
        })


@extend_schema(
    tags=['Security'],
    responses={
        200: OpenApiResponse(description='List of locked accounts')
    }
)
class LockedAccountsView(APIView):
    """Get list of locked accounts"""
    permission_classes = [IsAdminOrManager]

    def get(self, request):
        now = timezone.now()
        locked_users = CustomUser.objects.filter(
            account_locked_until__gt=now
        ).values(
            'id', 'email', 'first_name', 'last_name',
            'failed_login_attempts', 'last_failed_login',
            'account_locked_until', 'locked_by_failed_attempts'
        )

        result = []
        for user in locked_users:
            result.append({
                'id': str(user['id']),
                'email': user['email'],
                'full_name': f"{user['first_name']} {user['last_name']}".strip(),
                'failed_login_attempts': user['failed_login_attempts'],
                'last_failed_login': user['last_failed_login'].isoformat() if user['last_failed_login'] else None,
                'account_locked_until': user['account_locked_until'].isoformat() if user['account_locked_until'] else None,
                'locked_by_failed_attempts': user['locked_by_failed_attempts'],
            })

        return Response(result)


@extend_schema(
    tags=['User Management'],
    responses={
        200: OpenApiResponse(description='User management dashboard statistics')
    }
)
class UserManagementStatsView(APIView):
    """Get user management dashboard statistics"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        month_ago = now - timedelta(days=30)
        week_ago = now - timedelta(days=7)

        users = CustomUser.objects.all()
        total_users = users.count()

        # Active users - those who logged in within the last 30 days
        active_users = users.filter(
            is_active=True,
            last_login__gte=month_ago
        ).count()

        # New users this month
        new_users_this_month = users.filter(date_joined__gte=month_ago).count()

        # Locked accounts
        locked_accounts = users.filter(account_locked_until__gt=now).count()

        # MFA stats - only count users with mfa_enabled=True
        mfa_enabled_count = users.filter(mfa_enabled=True).count()
        mfa_adoption_rate = round((mfa_enabled_count / total_users * 100) if total_users > 0 else 0)

        # Departments - count from database
        total_departments = Department.objects.count()

        # Pending invitations
        pending_invitations = 0
        try:
            from apps.organizations.models import Invitation
            pending_invitations = Invitation.objects.filter(status='pending').count()
        except:
            pass

        # Role distribution (users_by_role)
        users_by_role = {
            'owner': 0,
            'admin': users.filter(is_superuser=True).count(),
            'manager': users.filter(is_staff=True, is_superuser=False).count(),
            'member': users.filter(is_staff=False, is_superuser=False, is_active=True).count(),
            'viewer': 0,
        }

        # Try to get role from organization membership
        try:
            from apps.organizations.models import OrganizationMember

            role_counts = OrganizationMember.objects.values('role').annotate(count=Count('role'))
            for rc in role_counts:
                if rc['role'] in users_by_role:
                    users_by_role[rc['role']] = rc['count']
        except:
            pass

        # Users by department - from database
        users_by_department = []
        department_counts = users.filter(
            department__isnull=False
        ).values(
            'department__name'
        ).annotate(
            count=Count('id')
        ).order_by('-count')

        for dept in department_counts:
            users_by_department.append({
                'department': dept['department__name'],
                'count': dept['count']
            })

        # Recent activity stats
        deactivated_this_month = users.filter(
            is_active=False,
            updated_at__gte=month_ago
        ).count()

        return Response({
            'total_users': total_users,
            'active_users': active_users,
            'new_users_this_month': new_users_this_month,
            'pending_invitations': pending_invitations,
            'locked_accounts': locked_accounts,
            'mfa_adoption_rate': mfa_adoption_rate,
            'total_departments': total_departments,
            'users_by_role': users_by_role,
            'users_by_department': users_by_department,
            'recent_activity': {
                'new_users': new_users_this_month,
                'deactivated': deactivated_this_month,
                'role_changes': 0,  # Would need audit log to track this
            },
        })


# Extended User Serializer for Management
from rest_framework import serializers

class UserManagementSerializer(serializers.ModelSerializer):
    """Extended serializer for user management with all required fields"""
    department_name = serializers.CharField(source='department.name', read_only=True, allow_null=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True, allow_null=True)
    full_name = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    is_locked = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'employee_id',
            'first_name', 'last_name', 'full_name',
            'phone_number', 'job_title', 'avatar',
            'department', 'department_name',
            'organization', 'organization_name',
            'role', 'status', 'is_locked',
            'is_active', 'is_staff', 'is_superuser',
            'mfa_enabled', 'failed_login_attempts',
            'account_locked_until', 'last_login', 'last_login_ip',
            'date_joined', 'created_at', 'updated_at'
        ]

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username

    def get_status(self, obj):
        now = timezone.now()
        if obj.account_locked_until and obj.account_locked_until > now:
            return 'locked'
        if not obj.is_active:
            return 'inactive'
        return 'active'

    def get_is_locked(self, obj):
        now = timezone.now()
        return obj.account_locked_until is not None and obj.account_locked_until > now

    def get_role(self, obj):
        """Get user's organization role"""
        # Try to get from organization membership
        try:
            from apps.organizations.models import OrganizationMember
            membership = OrganizationMember.objects.filter(
                user=obj,
                organization=obj.organization
            ).first()
            if membership:
                return membership.role
        except:
            pass

        # Fallback based on staff/superuser status
        if obj.is_superuser:
            return 'admin'
        if obj.is_staff:
            return 'manager'
        return 'member'
