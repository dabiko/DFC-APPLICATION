"""
Views for Department-as-Root Architecture APIs.

This module provides comprehensive API endpoints for:
- Department management with enhanced features
- Cross-department access management
- Department access request workflow
- Department navigation for sidebar
"""
from rest_framework import viewsets, status, generics, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count, Sum
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse

from apps.users.models import CustomUser, Department
from apps.users.models_department import (
    DepartmentSettings,
    CrossDepartmentAccess,
    DepartmentAccessRequest
)
from apps.users.serializers_department import (
    DepartmentDetailSerializer,
    DepartmentListSerializer,
    DepartmentCreateSerializer,
    DepartmentUpdateSerializer,
    DepartmentNavigationSerializer,
    DepartmentSettingsSerializer,
    CrossDepartmentAccessSerializer,
    CrossDepartmentAccessCreateSerializer,
    CrossDepartmentAccessRevokeSerializer,
    DepartmentAccessRequestSerializer,
    DepartmentAccessRequestCreateSerializer,
    DepartmentAccessRequestActionSerializer,
)
from apps.permissions.department_resolver import DepartmentPermissionResolver
from apps.permissions.models import Role


class IsDepartmentAdmin(permissions.BasePermission):
    """
    Permission check for department administrators.
    Allows access if user is:
    - A global admin (superuser)
    - Has ADMIN role in the target department
    - Has MANAGER role with manage_access permission
    """

    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True

        # For list views, filter in queryset instead
        if view.action == 'list':
            return True

        return True  # Will check in has_object_permission

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True

        # Get the department from the object
        if isinstance(obj, Department):
            department = obj
        elif hasattr(obj, 'department'):
            department = obj.department
        else:
            return False

        # Check if user has admin role in department
        resolver = DepartmentPermissionResolver(request.user)
        role = resolver.get_department_role(department)

        if role and role.name in ['ADMIN', 'MANAGER']:
            return True

        return False


@extend_schema(tags=['Departments'])
class DepartmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Department management with Department-as-Root features.

    Provides:
    - List departments (filtered by access)
    - Create department (admin only)
    - Retrieve department details
    - Update department
    - Delete department (admin only)
    - Get department statistics
    - Get department navigation tree
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return DepartmentListSerializer
        elif self.action == 'create':
            return DepartmentCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return DepartmentUpdateSerializer
        elif self.action == 'navigation':
            return DepartmentNavigationSerializer
        return DepartmentDetailSerializer

    def get_queryset(self):
        """
        Filter departments based on user's access.
        - Global admins see all departments
        - Regular users see their department + any with cross-department access
        """
        user = self.request.user

        if user.is_superuser:
            return Department.objects.filter(
                is_active=True,
                organization=user.organization
            ).select_related('parent', 'organization')

        # Get accessible departments using resolver
        resolver = DepartmentPermissionResolver(user)
        accessible_depts = resolver.get_accessible_departments()

        return Department.objects.filter(
            id__in=[d.id for d in accessible_depts],
            is_active=True
        ).select_related('parent', 'organization')

    def get_permissions(self):
        """Custom permissions based on action."""
        if self.action in ['create', 'destroy']:
            return [permissions.IsAdminUser()]
        elif self.action in ['update', 'partial_update']:
            return [permissions.IsAuthenticated(), IsDepartmentAdmin()]
        return [permissions.IsAuthenticated()]

    @extend_schema(
        summary="List accessible departments",
        description="Returns departments the user can access (own + cross-department grants)"
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Create new department",
        description="Create a new department (admin only)"
    )
    def create(self, request, *args, **kwargs):
        # Validate user has an organization
        if not request.user.organization:
            return Response(
                {'detail': 'User must belong to an organization to create departments'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            # Check for duplicate name within organization
            name = serializer.validated_data.get('name', '')
            code = serializer.validated_data.get('code', '')

            if Department.objects.filter(
                organization=request.user.organization,
                name__iexact=name
            ).exists():
                return Response(
                    {'name': ['A department with this name already exists in your organization']},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if Department.objects.filter(
                organization=request.user.organization,
                code__iexact=code
            ).exists():
                return Response(
                    {'code': ['A department with this code already exists in your organization']},
                    status=status.HTTP_400_BAD_REQUEST
                )

            department = serializer.save(organization=request.user.organization)

            # Create default settings
            DepartmentSettings.objects.create(department=department)

            return Response(
                DepartmentDetailSerializer(department).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.exception('Error creating department')
            return Response(
                {'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @extend_schema(
        summary="Get department navigation",
        description="Get departments formatted for sidebar navigation"
    )
    @action(detail=False, methods=['get'])
    def navigation(self, request):
        """
        Returns departments formatted for sidebar navigation.
        Includes folder counts and recent activity indicators.
        """
        queryset = self.get_queryset().annotate(
            folder_count=Count('folders', filter=Q(folders__is_deleted=False)),
            document_count=Count('folders__documents', filter=Q(folders__documents__is_deleted=False))
        ).order_by('display_order', 'name')

        # Pass request context so serializer can determine access type
        serializer = DepartmentNavigationSerializer(
            queryset,
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)

    @extend_schema(
        summary="Get department statistics",
        description="Get storage and document statistics for a department"
    )
    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """
        Returns detailed statistics for a department.
        """
        department = self.get_object()

        # Calculate statistics
        from apps.folders.models import Folder
        from apps.documents.models import Document

        folder_count = Folder.objects.filter(
            department=department,
            is_deleted=False
        ).count()

        document_count = Document.objects.filter(
            folder__department=department,
            is_deleted=False
        ).count()

        # Get storage usage
        storage_stats = Document.objects.filter(
            folder__department=department,
            is_deleted=False
        ).aggregate(
            total_size=Sum('file_size')
        )

        # Get user count
        user_count = CustomUser.objects.filter(
            department=department,
            is_active=True
        ).count()

        # Get cross-department access count
        cross_access_count = CrossDepartmentAccess.objects.filter(
            department=department,
            is_active=True
        ).count()

        return Response({
            'department_id': str(department.id),
            'department_name': department.name,
            'folder_count': folder_count,
            'document_count': document_count,
            'storage_used_bytes': storage_stats['total_size'] or 0,
            'storage_used_gb': (storage_stats['total_size'] or 0) / (1024 ** 3),
            'storage_quota_gb': department.storage_quota_gb,
            'storage_percentage': department.storage_percentage,
            'user_count': user_count,
            'cross_access_count': cross_access_count,
        })

    @extend_schema(
        summary="Get department settings",
        description="Get settings for a department"
    )
    @action(detail=True, methods=['get', 'patch'], url_path='department-settings', url_name='department-settings')
    def department_settings(self, request, pk=None):
        """
        Get or update department settings.
        """
        department = self.get_object()

        # Get or create settings
        settings, created = DepartmentSettings.objects.get_or_create(
            department=department
        )

        if request.method == 'GET':
            serializer = DepartmentSettingsSerializer(settings)
            return Response(serializer.data)

        elif request.method == 'PATCH':
            serializer = DepartmentSettingsSerializer(
                settings,
                data=request.data,
                partial=True
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

    @extend_schema(
        summary="Get department members",
        description="Get all users belonging to this department"
    )
    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """
        Get all members of a department.
        """
        department = self.get_object()

        # Get primary members
        primary_members = CustomUser.objects.filter(
            department=department,
            is_active=True
        ).values('id', 'username', 'email', 'first_name', 'last_name')

        # Get cross-department access users
        cross_access_users = CrossDepartmentAccess.objects.filter(
            department=department,
            is_active=True
        ).select_related('user', 'role').values(
            'user__id', 'user__username', 'user__email',
            'user__first_name', 'user__last_name',
            'role__name', 'expires_at'
        )

        return Response({
            'primary_members': list(primary_members),
            'cross_department_access': list(cross_access_users),
        })


@extend_schema(tags=['Cross-Department Access'])
class CrossDepartmentAccessViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing cross-department access grants.

    Allows department managers to grant access to users from other departments.
    """
    permission_classes = [permissions.IsAuthenticated, IsDepartmentAdmin]

    def get_serializer_class(self):
        if self.action == 'create':
            return CrossDepartmentAccessCreateSerializer
        elif self.action == 'revoke':
            return CrossDepartmentAccessRevokeSerializer
        return CrossDepartmentAccessSerializer

    def get_queryset(self):
        """
        Filter grants based on user's admin access.
        """
        user = self.request.user

        if user.is_superuser:
            return CrossDepartmentAccess.objects.filter(
                department__organization=user.organization
            ).select_related('user', 'department', 'role', 'granted_by')

        # Get departments user can manage
        resolver = DepartmentPermissionResolver(user)
        manageable_depts = [
            d for d in resolver.get_accessible_departments()
            if resolver.get_department_role(d) and
            resolver.get_department_role(d).name in ['ADMIN', 'MANAGER']
        ]

        return CrossDepartmentAccess.objects.filter(
            department__in=manageable_depts
        ).select_related('user', 'department', 'role', 'granted_by')

    @extend_schema(
        summary="Grant cross-department access",
        description="Grant a user access to a department they don't belong to"
    )
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Check permission for target department
        department_id = serializer.validated_data['department_id']
        department = get_object_or_404(Department, id=department_id)
        self.check_object_permissions(request, department)

        # Create the grant
        grant = serializer.save(granted_by=request.user)

        return Response(
            CrossDepartmentAccessSerializer(grant).data,
            status=status.HTTP_201_CREATED
        )

    @extend_schema(
        summary="Revoke cross-department access",
        description="Revoke a user's cross-department access"
    )
    @action(detail=True, methods=['post'])
    def revoke(self, request, pk=None):
        """
        Revoke a cross-department access grant.
        """
        grant = self.get_object()
        serializer = CrossDepartmentAccessRevokeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        grant.revoke(
            user=request.user,
            reason=serializer.validated_data.get('reason', '')
        )

        return Response({'status': 'revoked'})

    @extend_schema(
        summary="List grants for a user",
        description="Get all cross-department access grants for a specific user"
    )
    @action(detail=False, methods=['get'])
    def by_user(self, request):
        """
        Get grants for a specific user.
        """
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response(
                {'error': 'user_id parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        grants = CrossDepartmentAccess.objects.filter(
            user_id=user_id,
            is_active=True
        ).select_related('department', 'role')

        serializer = CrossDepartmentAccessSerializer(grants, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="List grants for current user",
        description="Get all cross-department access grants for the current user"
    )
    @action(detail=False, methods=['get'])
    def my_grants(self, request):
        """
        Get grants for the current user.
        """
        grants = CrossDepartmentAccess.objects.filter(
            user=request.user,
            is_active=True
        ).select_related('department', 'role')

        serializer = CrossDepartmentAccessSerializer(grants, many=True)
        return Response(serializer.data)


@extend_schema(tags=['Department Access Requests'])
class DepartmentAccessRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for department access request workflow.

    Allows users to request access to other departments,
    and managers to approve/reject requests.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return DepartmentAccessRequestCreateSerializer
        elif self.action in ['approve', 'reject']:
            return DepartmentAccessRequestActionSerializer
        return DepartmentAccessRequestSerializer

    def get_queryset(self):
        """
        Filter requests based on user role:
        - Regular users see their own requests
        - Managers see requests for their departments
        - Admins see all requests
        """
        user = self.request.user

        if user.is_superuser:
            return DepartmentAccessRequest.objects.filter(
                department__organization=user.organization
            ).select_related('requester', 'department', 'requested_role', 'reviewed_by')

        # Build query
        q = Q(requester=user)  # Own requests

        # Add requests for departments user can manage
        resolver = DepartmentPermissionResolver(user)
        for dept in resolver.get_accessible_departments():
            role = resolver.get_department_role(dept)
            if role and role.name in ['ADMIN', 'MANAGER']:
                q |= Q(department=dept)

        return DepartmentAccessRequest.objects.filter(q).select_related(
            'requester', 'department', 'requested_role', 'reviewed_by'
        )

    @extend_schema(
        summary="Create access request",
        description="Request access to a department"
    )
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Create request with current user as requester
        access_request = serializer.save(requester=request.user)

        return Response(
            DepartmentAccessRequestSerializer(access_request).data,
            status=status.HTTP_201_CREATED
        )

    @extend_schema(
        summary="Approve access request",
        description="Approve a pending access request"
    )
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Approve an access request.
        """
        access_request = self.get_object()

        # Check if user can manage the target department
        resolver = DepartmentPermissionResolver(request.user)
        role = resolver.get_department_role(access_request.department)

        if not request.user.is_superuser and (not role or role.name not in ['ADMIN', 'MANAGER']):
            return Response(
                {'error': 'You do not have permission to approve requests for this department'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = DepartmentAccessRequestActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            access_request.approve(
                reviewer=request.user,
                notes=serializer.validated_data.get('notes', '')
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            DepartmentAccessRequestSerializer(access_request).data
        )

    @extend_schema(
        summary="Reject access request",
        description="Reject a pending access request"
    )
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Reject an access request.
        """
        access_request = self.get_object()

        # Check if user can manage the target department
        resolver = DepartmentPermissionResolver(request.user)
        role = resolver.get_department_role(access_request.department)

        if not request.user.is_superuser and (not role or role.name not in ['ADMIN', 'MANAGER']):
            return Response(
                {'error': 'You do not have permission to reject requests for this department'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = DepartmentAccessRequestActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            access_request.reject(
                reviewer=request.user,
                notes=serializer.validated_data.get('notes', '')
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            DepartmentAccessRequestSerializer(access_request).data
        )

    @extend_schema(
        summary="Cancel access request",
        description="Cancel your own pending access request"
    )
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """
        Cancel an access request (requester only).
        """
        access_request = self.get_object()

        if access_request.requester != request.user:
            return Response(
                {'error': 'You can only cancel your own requests'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            access_request.cancel()
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            DepartmentAccessRequestSerializer(access_request).data
        )

    @extend_schema(
        summary="List pending requests",
        description="Get all pending requests for departments you manage"
    )
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """
        Get pending requests for departments the user manages.
        """
        queryset = self.get_queryset().filter(status='PENDING')
        serializer = DepartmentAccessRequestSerializer(queryset, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="List my requests",
        description="Get all access requests made by the current user"
    )
    @action(detail=False, methods=['get'])
    def my_requests(self, request):
        """
        Get requests made by the current user.
        """
        queryset = DepartmentAccessRequest.objects.filter(
            requester=request.user
        ).select_related('department', 'requested_role', 'reviewed_by')

        serializer = DepartmentAccessRequestSerializer(queryset, many=True)
        return Response(serializer.data)


class UserAccessibleDepartmentsView(APIView):
    """
    API endpoint to get all departments accessible to the current user.
    Used for sidebar navigation and department selection dropdowns.
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=['Departments'],
        summary="Get accessible departments",
        description="Returns all departments the current user can access"
    )
    def get(self, request):
        resolver = DepartmentPermissionResolver(request.user)
        departments = resolver.get_accessible_departments()

        # Format for navigation
        result = []
        for dept in departments:
            role = resolver.get_department_role(dept)
            result.append({
                'id': dept.id,
                'name': dept.name,
                'code': dept.code,
                'icon': dept.icon,
                'color': dept.color,
                'is_primary': dept.id == request.user.department_id,
                'role': role.name if role else None,
                'storage_percentage': dept.storage_percentage,
            })

        return Response(result)
