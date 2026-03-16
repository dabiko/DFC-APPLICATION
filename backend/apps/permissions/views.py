"""
API views for RBAC system.

Provides endpoints for:
- Role management
- User role assignments
- Folder permissions
- Permission checking
- Bulk operations
"""

from rest_framework import viewsets, status, permissions as drf_permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.db.models import Q, Count
from django.utils import timezone

from apps.permissions.models import Role, UserRole, FolderPermission, DocumentPermission, PermissionAuditLog
from apps.permissions.serializers import (
    RoleSerializer,
    RoleListSerializer,
    RoleCreateSerializer,
    UserRoleSerializer,
    UserRoleCreateSerializer,
    FolderPermissionSerializer,
    FolderPermissionCreateSerializer,
    FolderPermissionListSerializer,
    UserPermissionSummarySerializer,
    FolderPermissionCheckSerializer,
    BulkPermissionAssignSerializer,
    PermissionInheritanceTreeSerializer,
    DocumentPermissionSerializer,
    DocumentPermissionCreateSerializer,
    DocumentPermissionListSerializer,
    DocumentPermissionCheckSerializer,
    BulkDocumentPermissionSerializer,
    PermissionAuditLogSerializer,
    PermissionAuditLogListSerializer,
)
from apps.permissions.decorators import (
    CanManagePermissions,
    HasPermission,
)
from apps.permissions.utils import PermissionChecker, check_permission, clear_permission_cache
from apps.users.models import Department
from apps.folders.models import Folder
from apps.audit.utils import log_audit_event

User = get_user_model()


class RoleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Role management.

    System roles (VIEWER, EDITOR, MANAGER, ADMIN) are read-only.
    Custom roles can be created, updated, and deleted by users
    with can_manage_permissions.
    """
    queryset = Role.objects.all()
    permission_classes = [drf_permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [drf_permissions.IsAuthenticated(), CanManagePermissions()]
        return [drf_permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'list':
            return RoleListSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return RoleCreateSerializer
        return RoleSerializer

    def get_queryset(self):
        """Filter roles based on user permissions"""
        queryset = Role.objects.all().order_by('is_system', 'name')

        # Filter by role name if provided
        role_name = self.request.query_params.get('name')
        if role_name:
            queryset = queryset.filter(name=role_name)

        # Filter system vs custom
        is_system = self.request.query_params.get('is_system')
        if is_system is not None:
            queryset = queryset.filter(is_system=is_system.lower() == 'true')

        return queryset

    def destroy(self, request, *args, **kwargs):
        """Prevent deletion of system roles."""
        instance = self.get_object()
        if instance.is_system:
            return Response(
                {'error': 'System roles cannot be deleted.'},
                status=status.HTTP_403_FORBIDDEN
            )
        # Check no users are assigned
        from apps.permissions.models import UserRole as UserRoleModel
        user_count = UserRoleModel.objects.filter(role=instance, is_active=True).count()
        if user_count > 0:
            return Response(
                {'error': f'Cannot delete role with {user_count} active user assignment(s). Reassign them first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['get'])
    def users(self, request, pk=None):
        """Get all users assigned to this role"""
        role = self.get_object()
        user_roles = UserRole.objects.filter(
            role=role,
            is_active=True
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
        ).select_related('user', 'department', 'granted_by')

        serializer = UserRoleSerializer(user_roles, many=True)
        return Response(serializer.data)


class UserRoleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for UserRole management.

    Allows assigning roles to users at different scopes.
    Requires can_manage_permissions permission.
    """
    queryset = UserRole.objects.all()
    permission_classes = [drf_permissions.IsAuthenticated, CanManagePermissions]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return UserRoleCreateSerializer
        return UserRoleSerializer

    def get_queryset(self):
        """Filter user roles based on query parameters"""
        queryset = UserRole.objects.select_related(
            'user', 'role', 'department', 'granted_by'
        ).order_by('-granted_at')

        # Filter by user
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        # Filter by role
        role_id = self.request.query_params.get('role_id')
        if role_id:
            queryset = queryset.filter(role_id=role_id)

        # Filter by scope
        scope = self.request.query_params.get('scope')
        if scope:
            queryset = queryset.filter(scope=scope)

        # Filter by department
        department_id = self.request.query_params.get('department_id')
        if department_id:
            queryset = queryset.filter(department_id=department_id)

        # Filter active/inactive
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        # Filter expired/non-expired
        include_expired = self.request.query_params.get('include_expired', 'false')
        if include_expired.lower() != 'true':
            queryset = queryset.filter(
                Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
            )

        return queryset

    def perform_create(self, serializer):
        """Create user role and log audit event"""
        user_role = serializer.save()

        # Clear permission cache for affected user
        clear_permission_cache(user=user_role.user)

        # Log audit event
        log_audit_event(
            user=self.request.user,
            action='ASSIGN_ROLE',
            resource_type='UserRole',
            resource_id=str(user_role.id),
            details={
                'user': user_role.user.username,
                'role': user_role.role.name,
                'scope': user_role.scope,
                'department': user_role.department.name if user_role.department else None,
            }
        )

    def perform_update(self, serializer):
        """Update user role and clear cache"""
        user_role = serializer.save()
        clear_permission_cache(user=user_role.user)

        log_audit_event(
            user=self.request.user,
            action='UPDATE_ROLE',
            resource_type='UserRole',
            resource_id=str(user_role.id),
            details={'role': user_role.role.name}
        )

    def perform_destroy(self, instance):
        """Delete user role and clear cache"""
        user = instance.user
        instance.delete()
        clear_permission_cache(user=user)

        log_audit_event(
            user=self.request.user,
            action='REVOKE_ROLE',
            resource_type='UserRole',
            resource_id=str(instance.id),
            details={
                'user': instance.user.username,
                'role': instance.role.name,
            }
        )

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate a user role without deleting it"""
        user_role = self.get_object()
        user_role.is_active = False
        user_role.save()

        clear_permission_cache(user=user_role.user)

        log_audit_event(
            user=request.user,
            action='DEACTIVATE_ROLE',
            resource_type='UserRole',
            resource_id=str(user_role.id),
            details={'user': user_role.user.username, 'role': user_role.role.name}
        )

        serializer = self.get_serializer(user_role)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a deactivated user role"""
        user_role = self.get_object()
        user_role.is_active = True
        user_role.save()

        clear_permission_cache(user=user_role.user)

        log_audit_event(
            user=request.user,
            action='ACTIVATE_ROLE',
            resource_type='UserRole',
            resource_id=str(user_role.id),
            details={'user': user_role.user.username, 'role': user_role.role.name}
        )

        serializer = self.get_serializer(user_role)
        return Response(serializer.data)


class FolderPermissionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for FolderPermission management.

    Allows managing folder-level permissions for users and departments.
    """
    queryset = FolderPermission.objects.all()
    permission_classes = [drf_permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return FolderPermissionCreateSerializer
        elif self.action == 'list':
            return FolderPermissionListSerializer
        return FolderPermissionSerializer

    def get_queryset(self):
        """Filter folder permissions based on query parameters"""
        queryset = FolderPermission.objects.select_related(
            'folder', 'user', 'department', 'granted_by'
        ).order_by('-granted_at')

        # Filter by folder
        folder_id = self.request.query_params.get('folder_id')
        if folder_id:
            queryset = queryset.filter(folder_id=folder_id)

        # Filter by user
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        # Filter by department
        department_id = self.request.query_params.get('department_id')
        if department_id:
            queryset = queryset.filter(department_id=department_id)

        # Filter by permission level
        permission_level = self.request.query_params.get('permission_level')
        if permission_level:
            queryset = queryset.filter(permission_level=permission_level)

        return queryset

    def check_object_permissions(self, request, obj):
        """Check if user can manage permissions for this folder"""
        super().check_object_permissions(request, obj)

        # User must have can_manage_permissions on the folder
        if not check_permission(request.user, 'can_manage_permissions', obj.folder):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have permission to manage permissions for this folder")

    def perform_create(self, serializer):
        """Create folder permission and clear cache"""
        # Check if user can manage permissions for this folder
        folder = serializer.validated_data['folder']
        if not check_permission(self.request.user, 'can_manage_permissions', folder):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have permission to manage permissions for this folder")

        folder_permission = serializer.save()

        # Clear cache for affected folder
        clear_permission_cache(folder=folder_permission.folder)

        # Clear cache for affected user if user-specific
        if folder_permission.user:
            clear_permission_cache(user=folder_permission.user)

        # Log audit event
        log_audit_event(
            user=self.request.user,
            action='GRANT_FOLDER_PERMISSION',
            resource_type='FolderPermission',
            resource_id=str(folder_permission.id),
            details={
                'folder': folder_permission.folder.name,
                'target': folder_permission.user.username if folder_permission.user else folder_permission.department.name,
                'permission_level': folder_permission.permission_level,
            }
        )

    def perform_update(self, serializer):
        """Update folder permission and clear cache"""
        folder_permission = serializer.save()

        clear_permission_cache(folder=folder_permission.folder)
        if folder_permission.user:
            clear_permission_cache(user=folder_permission.user)

        log_audit_event(
            user=self.request.user,
            action='UPDATE_FOLDER_PERMISSION',
            resource_type='FolderPermission',
            resource_id=str(folder_permission.id),
            details={'permission_level': folder_permission.permission_level}
        )

    def perform_destroy(self, instance):
        """Delete folder permission and clear cache"""
        folder = instance.folder
        user = instance.user

        instance.delete()

        clear_permission_cache(folder=folder)
        if user:
            clear_permission_cache(user=user)

        log_audit_event(
            user=self.request.user,
            action='REVOKE_FOLDER_PERMISSION',
            resource_type='FolderPermission',
            resource_id=str(instance.id),
            details={'folder': instance.folder.name}
        )

    @action(detail=False, methods=['post'])
    def bulk_assign(self, request):
        """Bulk assign permissions to multiple users/departments"""
        serializer = BulkPermissionAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        folder_id = serializer.validated_data['folder_id']
        assignments = serializer.validated_data['assignments']

        folder = get_object_or_404(Folder, id=folder_id)

        # Check permission
        if not check_permission(request.user, 'can_manage_permissions', folder):
            return Response(
                {'error': 'You do not have permission to manage permissions for this folder'},
                status=status.HTTP_403_FORBIDDEN
            )

        created_permissions = []
        for assignment in assignments:
            user_id = assignment.get('user_id')
            department_id = assignment.get('department_id')
            permission_level = assignment['permission_level']
            inherit_from_parent = assignment.get('inherit_from_parent', True)

            # Create or update permission
            if user_id:
                perm, created = FolderPermission.objects.update_or_create(
                    folder=folder,
                    user_id=user_id,
                    defaults={
                        'permission_level': permission_level,
                        'inherit_from_parent': inherit_from_parent,
                        'granted_by': request.user,
                    }
                )
            else:
                perm, created = FolderPermission.objects.update_or_create(
                    folder=folder,
                    department_id=department_id,
                    defaults={
                        'permission_level': permission_level,
                        'inherit_from_parent': inherit_from_parent,
                        'granted_by': request.user,
                    }
                )

            created_permissions.append(perm)

        # Clear cache
        clear_permission_cache(folder=folder)

        # Log audit event
        log_audit_event(
            user=request.user,
            action='BULK_ASSIGN_PERMISSIONS',
            resource_type='FolderPermission',
            resource_id=str(folder.id),
            details={'count': len(created_permissions)}
        )

        serializer = FolderPermissionListSerializer(created_permissions, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PermissionCheckView(APIView):
    """
    View for checking if a user has a specific permission.
    """
    permission_classes = [drf_permissions.IsAuthenticated]

    def post(self, request):
        """Check permission for user on folder"""
        from apps.permissions.utils import check_permission_with_reason

        serializer = FolderPermissionCheckSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        folder_id = serializer.validated_data['folder_id']
        user_id = serializer.validated_data['user_id']
        permission = serializer.validated_data['permission']

        folder = get_object_or_404(Folder, id=folder_id)
        user = get_object_or_404(User, id=user_id)

        # Check permission with reason and source
        has_perm, reason, source = check_permission_with_reason(user, permission, folder)

        return Response({
            'has_permission': has_perm,
            'reason': reason,
            'source': source,
            'folder': folder.name,
            'user': user.username,
            'permission': permission,
        })


class UserPermissionSummaryView(APIView):
    """
    View for getting a complete permission summary for a user.
    """
    permission_classes = [drf_permissions.IsAuthenticated, CanManagePermissions]

    def get(self, request, user_id):
        """Get permission summary for user"""
        user = get_object_or_404(User, id=user_id)
        checker = PermissionChecker(user)

        # Get all roles
        global_roles = UserRole.objects.filter(
            user=user,
            scope=UserRole.GLOBAL,
            is_active=True
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
        ).select_related('role', 'granted_by')

        department_roles = UserRole.objects.filter(
            user=user,
            scope=UserRole.DEPARTMENT,
            is_active=True
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
        ).select_related('role', 'department', 'granted_by')

        # Get folder permissions
        folder_permissions = FolderPermission.objects.filter(
            user=user
        ).select_related('folder', 'granted_by')

        # Get accessible folders and documents
        accessible_folders = checker.get_accessible_folders()
        accessible_documents = checker.get_accessible_documents()

        # Aggregate all permissions
        all_permissions = set()
        for role in global_roles:
            all_permissions.update(role.role.get_permissions_list())
        for role in department_roles:
            all_permissions.update(role.role.get_permissions_list())

        data = {
            'user_id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': user.get_full_name(),
            'is_superuser': user.is_superuser,
            'global_roles': UserRoleSerializer(global_roles, many=True).data,
            'department_roles': UserRoleSerializer(department_roles, many=True).data,
            'folder_permissions': FolderPermissionListSerializer(folder_permissions, many=True).data,
            'all_permissions': list(all_permissions),
            'accessible_folder_count': accessible_folders.count(),
            'accessible_document_count': accessible_documents.count(),
        }

        return Response(data)


class ClearPermissionCacheView(APIView):
    """
    View for manually clearing permission cache.
    Only accessible by admins.
    """
    permission_classes = [drf_permissions.IsAuthenticated, CanManagePermissions]

    def post(self, request):
        """Clear permission cache"""
        user_id = request.data.get('user_id')
        folder_id = request.data.get('folder_id')

        if user_id:
            user = get_object_or_404(User, id=user_id)
            clear_permission_cache(user=user)
            message = f"Cleared cache for user {user.username}"
        elif folder_id:
            folder = get_object_or_404(Folder, id=folder_id)
            clear_permission_cache(folder=folder)
            message = f"Cleared cache for folder {folder.name}"
        else:
            clear_permission_cache()
            message = "Cleared expired cache entries"

        log_audit_event(
            user=request.user,
            action='CLEAR_PERMISSION_CACHE',
            resource_type='PermissionCache',
            resource_id=None,
            details={'user_id': user_id, 'folder_id': folder_id}
        )

        return Response({'message': message})


class DocumentPermissionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for DocumentPermission management.

    Allows managing document-level permissions for users and departments.
    Document permissions can override folder-level permissions.
    """
    queryset = DocumentPermission.objects.all()
    permission_classes = [drf_permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return DocumentPermissionCreateSerializer
        elif self.action == 'list':
            return DocumentPermissionListSerializer
        return DocumentPermissionSerializer

    def get_queryset(self):
        """Filter document permissions based on query parameters"""
        queryset = DocumentPermission.objects.select_related(
            'document', 'user', 'department', 'granted_by'
        ).order_by('-granted_at')

        # Filter by document
        document_id = self.request.query_params.get('document_id')
        if document_id:
            queryset = queryset.filter(document_id=document_id)

        # Filter by user
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        # Filter by department
        department_id = self.request.query_params.get('department_id')
        if department_id:
            queryset = queryset.filter(department_id=department_id)

        # Filter by permission level
        permission_level = self.request.query_params.get('permission_level')
        if permission_level:
            queryset = queryset.filter(permission_level=permission_level)

        # Filter expired/non-expired
        include_expired = self.request.query_params.get('include_expired', 'false')
        if include_expired.lower() != 'true':
            queryset = queryset.filter(
                Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
            )

        return queryset

    def check_object_permissions(self, request, obj):
        """Check if user can manage permissions for this document"""
        super().check_object_permissions(request, obj)

        # User must have can_manage_permissions on the document
        if not check_permission(request.user, 'can_manage_permissions', obj.document):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have permission to manage permissions for this document")

    def perform_create(self, serializer):
        """Create document permission"""
        from apps.documents.models import Document

        # Check if user can manage permissions for this document
        document = serializer.validated_data['document']
        if not check_permission(self.request.user, 'can_manage_permissions', document):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have permission to manage permissions for this document")

        doc_permission = serializer.save()

        # Log permission audit
        self._log_permission_audit(
            action='GRANT',
            resource_type='DOCUMENT',
            resource_id=doc_permission.document_id,
            target_user=doc_permission.user,
            target_department=doc_permission.department,
            new_permission_level=doc_permission.permission_level,
            reason=doc_permission.reason
        )

        # Log general audit event
        log_audit_event(
            user=self.request.user,
            action='GRANT_DOCUMENT_PERMISSION',
            resource_type='DocumentPermission',
            resource_id=str(doc_permission.id),
            details={
                'document': doc_permission.document.title,
                'target': doc_permission.user.username if doc_permission.user else doc_permission.department.name,
                'permission_level': doc_permission.permission_level,
            }
        )

    def perform_update(self, serializer):
        """Update document permission"""
        old_level = serializer.instance.permission_level
        doc_permission = serializer.save()

        self._log_permission_audit(
            action='MODIFY',
            resource_type='DOCUMENT',
            resource_id=doc_permission.document_id,
            target_user=doc_permission.user,
            target_department=doc_permission.department,
            old_permission_level=old_level,
            new_permission_level=doc_permission.permission_level,
            reason=doc_permission.reason
        )

        log_audit_event(
            user=self.request.user,
            action='UPDATE_DOCUMENT_PERMISSION',
            resource_type='DocumentPermission',
            resource_id=str(doc_permission.id),
            details={'permission_level': doc_permission.permission_level}
        )

    def perform_destroy(self, instance):
        """Delete document permission"""
        self._log_permission_audit(
            action='REVOKE',
            resource_type='DOCUMENT',
            resource_id=instance.document_id,
            target_user=instance.user,
            target_department=instance.department,
            old_permission_level=instance.permission_level,
            reason='Permission revoked'
        )

        log_audit_event(
            user=self.request.user,
            action='REVOKE_DOCUMENT_PERMISSION',
            resource_type='DocumentPermission',
            resource_id=str(instance.id),
            details={'document': instance.document.title}
        )

        instance.delete()

    def _log_permission_audit(self, action, resource_type, resource_id, target_user=None,
                               target_department=None, old_permission_level='',
                               new_permission_level='', reason=''):
        """Log permission change to audit log"""
        PermissionAuditLog.objects.create(
            actor=self.request.user,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            target_user=target_user,
            target_department=target_department,
            old_permission_level=old_permission_level,
            new_permission_level=new_permission_level,
            reason=reason,
            ip_address=self._get_client_ip(),
            user_agent=self.request.META.get('HTTP_USER_AGENT', '')[:500]
        )

    def _get_client_ip(self):
        """Get client IP address from request"""
        x_forwarded_for = self.request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return self.request.META.get('REMOTE_ADDR')

    @action(detail=False, methods=['post'])
    def bulk_assign(self, request):
        """Bulk assign permissions to multiple users/departments"""
        from apps.documents.models import Document

        serializer = BulkDocumentPermissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        document_id = serializer.validated_data['document_id']
        assignments = serializer.validated_data['assignments']

        document = get_object_or_404(Document, id=document_id)

        # Check permission
        if not check_permission(request.user, 'can_manage_permissions', document):
            return Response(
                {'error': 'You do not have permission to manage permissions for this document'},
                status=status.HTTP_403_FORBIDDEN
            )

        created_permissions = []
        for assignment in assignments:
            user_id = assignment.get('user_id')
            department_id = assignment.get('department_id')
            permission_level = assignment['permission_level']
            override_folder = assignment.get('override_folder_permissions', True)
            expires_at = assignment.get('expires_at')
            reason = assignment.get('reason', '')

            # Create or update permission
            if user_id:
                perm, created = DocumentPermission.objects.update_or_create(
                    document=document,
                    user_id=user_id,
                    defaults={
                        'permission_level': permission_level,
                        'override_folder_permissions': override_folder,
                        'expires_at': expires_at,
                        'reason': reason,
                        'granted_by': request.user,
                    }
                )
            else:
                perm, created = DocumentPermission.objects.update_or_create(
                    document=document,
                    department_id=department_id,
                    defaults={
                        'permission_level': permission_level,
                        'override_folder_permissions': override_folder,
                        'expires_at': expires_at,
                        'reason': reason,
                        'granted_by': request.user,
                    }
                )

            created_permissions.append(perm)

        # Log audit event
        log_audit_event(
            user=request.user,
            action='BULK_ASSIGN_DOCUMENT_PERMISSIONS',
            resource_type='DocumentPermission',
            resource_id=str(document.id),
            details={'count': len(created_permissions)}
        )

        serializer = DocumentPermissionListSerializer(created_permissions, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class DocumentPermissionCheckView(APIView):
    """
    View for checking if a user has a specific permission on a document.
    """
    permission_classes = [drf_permissions.IsAuthenticated]

    def post(self, request):
        """Check permission for user on document"""
        from apps.documents.models import Document
        from apps.permissions.utils import check_permission_with_reason

        serializer = DocumentPermissionCheckSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        document_id = serializer.validated_data['document_id']
        user_id = serializer.validated_data['user_id']
        permission = serializer.validated_data['permission']

        document = get_object_or_404(Document, id=document_id)
        user = get_object_or_404(User, id=user_id)

        # Check permission with reason
        has_perm, reason, source = check_permission_with_reason(user, permission, document)

        return Response({
            'has_permission': has_perm,
            'reason': reason,
            'source': source,
            'document': document.title,
            'user': user.username,
            'permission': permission,
        })


class PermissionAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing permission audit logs.
    Read-only as audit logs are immutable.
    """
    queryset = PermissionAuditLog.objects.all()
    permission_classes = [drf_permissions.IsAuthenticated, CanManagePermissions]

    def get_serializer_class(self):
        if self.action == 'list':
            return PermissionAuditLogListSerializer
        return PermissionAuditLogSerializer

    def get_queryset(self):
        """Filter audit logs based on query parameters"""
        queryset = PermissionAuditLog.objects.select_related(
            'actor', 'target_user', 'target_department'
        ).order_by('-timestamp')

        # Filter by actor
        actor_id = self.request.query_params.get('actor_id')
        if actor_id:
            queryset = queryset.filter(actor_id=actor_id)

        # Filter by target user
        target_user_id = self.request.query_params.get('target_user_id')
        if target_user_id:
            queryset = queryset.filter(target_user_id=target_user_id)

        # Filter by target department
        target_department_id = self.request.query_params.get('target_department_id')
        if target_department_id:
            queryset = queryset.filter(target_department_id=target_department_id)

        # Filter by action
        action = self.request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)

        # Filter by resource type
        resource_type = self.request.query_params.get('resource_type')
        if resource_type:
            queryset = queryset.filter(resource_type=resource_type)

        # Filter by resource ID
        resource_id = self.request.query_params.get('resource_id')
        if resource_id:
            queryset = queryset.filter(resource_id=resource_id)

        # Filter by date range
        from_date = self.request.query_params.get('from_date')
        if from_date:
            queryset = queryset.filter(timestamp__gte=from_date)

        to_date = self.request.query_params.get('to_date')
        if to_date:
            queryset = queryset.filter(timestamp__lte=to_date)

        return queryset

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get summary of permission activities"""
        from django.db.models.functions import TruncDate
        from datetime import timedelta

        # Get date range (default last 30 days)
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)

        queryset = self.get_queryset().filter(timestamp__gte=start_date)

        # Action counts
        action_counts = queryset.values('action').annotate(
            count=Count('id')
        ).order_by('-count')

        # Resource type counts
        resource_counts = queryset.values('resource_type').annotate(
            count=Count('id')
        ).order_by('-count')

        # Daily activity
        daily_activity = queryset.annotate(
            date=TruncDate('timestamp')
        ).values('date').annotate(
            count=Count('id')
        ).order_by('date')

        # Top actors
        top_actors = queryset.values(
            'actor__id', 'actor__username'
        ).annotate(
            count=Count('id')
        ).order_by('-count')[:10]

        return Response({
            'period_days': days,
            'total_events': queryset.count(),
            'action_counts': list(action_counts),
            'resource_counts': list(resource_counts),
            'daily_activity': list(daily_activity),
            'top_actors': list(top_actors),
        })
