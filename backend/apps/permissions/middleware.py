"""
Universal Permission Middleware for RBAC enforcement.

This middleware provides comprehensive permission checking at the request level,
ensuring all API endpoints are protected by RBAC.

Features:
- Automatic permission enforcement based on URL patterns
- Support for resource-level permissions (folders, documents)
- Permission caching for performance
- Detailed access denied responses with reasons
- Audit logging for denied requests
"""

import re
from django.http import JsonResponse
from django.utils import timezone
from rest_framework import status
from apps.permissions.utils import PermissionChecker, check_permission_with_reason
from apps.permissions.models import PermissionAuditLog
import logging

logger = logging.getLogger(__name__)


# URL patterns that require specific permissions
PERMISSION_RULES = [
    # Document operations
    {
        'pattern': r'^/api/v1/documents/(?P<id>[a-f0-9-]+)/$',
        'methods': {
            'GET': 'can_view',
            'PUT': 'can_edit',
            'PATCH': 'can_edit',
            'DELETE': 'can_delete',
        },
        'resource_type': 'document',
        'id_param': 'id'
    },
    {
        'pattern': r'^/api/v1/documents/(?P<id>[a-f0-9-]+)/download/$',
        'methods': {'GET': 'can_download'},
        'resource_type': 'document',
        'id_param': 'id'
    },
    {
        'pattern': r'^/api/v1/documents/(?P<id>[a-f0-9-]+)/preview/$',
        'methods': {'GET': 'can_view'},
        'resource_type': 'document',
        'id_param': 'id'
    },
    {
        'pattern': r'^/api/v1/documents/(?P<id>[a-f0-9-]+)/share/$',
        'methods': {'POST': 'can_share'},
        'resource_type': 'document',
        'id_param': 'id'
    },
    {
        'pattern': r'^/api/v1/documents/(?P<id>[a-f0-9-]+)/permissions/$',
        'methods': {'GET': 'can_view', 'POST': 'can_manage_permissions', 'PUT': 'can_manage_permissions'},
        'resource_type': 'document',
        'id_param': 'id'
    },

    # Folder operations
    {
        'pattern': r'^/api/v1/folders/(?P<id>[a-f0-9-]+)/$',
        'methods': {
            'GET': 'can_view',
            'PUT': 'can_edit',
            'PATCH': 'can_edit',
            'DELETE': 'can_delete',
        },
        'resource_type': 'folder',
        'id_param': 'id'
    },
    {
        'pattern': r'^/api/v1/folders/(?P<id>[a-f0-9-]+)/permissions/$',
        'methods': {'GET': 'can_view', 'POST': 'can_manage_permissions', 'PUT': 'can_manage_permissions'},
        'resource_type': 'folder',
        'id_param': 'id'
    },

    # Admin-only endpoints
    {
        'pattern': r'^/api/v1/audit/',
        'methods': {'GET': 'can_view_audit_log'},
        'global_permission': True
    },
    {
        'pattern': r'^/api/v1/retention/',
        'methods': {'GET': 'can_view', 'POST': 'can_manage_retention', 'PUT': 'can_manage_retention', 'DELETE': 'can_manage_retention'},
        'global_permission': True
    },
    {
        'pattern': r'^/api/v1/users/',
        'methods': {'POST': 'can_manage_permissions', 'PUT': 'can_manage_permissions', 'DELETE': 'can_manage_permissions'},
        'global_permission': True,
        'admin_only': True
    },

    # -----------------------------------------------------------------------
    # Procedure endpoints
    # -----------------------------------------------------------------------
    {
        'pattern': r'^/api/v1/procedures/$',
        'methods': {'POST': 'can_create_procedure'},
        'resource_type': 'PROCEDURE',
        'global_permission': True,
    },
    {
        'pattern': r'^/api/v1/procedures/(?P<id>[a-f0-9-]+)/$',
        'methods': {
            'PUT': 'can_edit_procedure',
            'PATCH': 'can_edit_procedure',
            'DELETE': 'can_delete_procedure',
        },
        'resource_type': 'PROCEDURE',
        'global_permission': True,
    },
    {
        'pattern': r'^/api/v1/procedures/(?P<id>[a-f0-9-]+)/publish/$',
        'methods': {'POST': 'can_publish_procedure'},
        'resource_type': 'PROCEDURE',
        'global_permission': True,
    },
    {
        'pattern': r'^/api/v1/procedures/(?P<id>[a-f0-9-]+)/versions/\d+/retire/$',
        'methods': {'POST': 'can_publish_procedure'},
        'resource_type': 'PROCEDURE',
        'global_permission': True,
    },
    # Procedure evidence & audit log
    {
        'pattern': r'^/api/v1/procedures/evidence/',
        'methods': {'GET': 'can_view_training_evidence'},
        'resource_type': 'TRAINING',
        'global_permission': True,
    },
    {
        'pattern': r'^/api/v1/procedures/audit-log/',
        'methods': {'GET': 'can_view_training_evidence'},
        'resource_type': 'TRAINING',
        'global_permission': True,
    },
    # Training assignments (management actions)
    {
        'pattern': r'^/api/v1/procedures/assignments/$',
        'methods': {'POST': 'can_manage_assignments'},
        'resource_type': 'TRAINING',
        'global_permission': True,
    },
    {
        'pattern': r'^/api/v1/procedures/assignments/dashboard/$',
        'methods': {'GET': 'can_view_training_dashboard'},
        'resource_type': 'TRAINING',
        'global_permission': True,
    },
    {
        'pattern': r'^/api/v1/procedures/assignments/analytics/$',
        'methods': {'GET': 'can_view_training_dashboard'},
        'resource_type': 'TRAINING',
        'global_permission': True,
    },
    {
        'pattern': r'^/api/v1/procedures/assignments/trainee/',
        'methods': {'GET': 'can_view_trainee_details'},
        'resource_type': 'TRAINING',
        'global_permission': True,
    },
    {
        'pattern': r'^/api/v1/procedures/assignments/(?P<id>[a-f0-9-]+)/waive/$',
        'methods': {'POST': 'can_manage_assignments'},
        'resource_type': 'TRAINING',
        'global_permission': True,
    },

    # -----------------------------------------------------------------------
    # Workflow endpoints
    # -----------------------------------------------------------------------
    {
        'pattern': r'^/api/v1/workflows/templates/$',
        'methods': {'POST': 'can_create_workflow_template'},
        'resource_type': 'WORKFLOW',
        'global_permission': True,
    },
    {
        'pattern': r'^/api/v1/workflows/templates/(?P<id>[a-f0-9-]+)/$',
        'methods': {
            'PUT': 'can_create_workflow_template',
            'PATCH': 'can_create_workflow_template',
            'DELETE': 'can_delete_workflow_template',
        },
        'resource_type': 'WORKFLOW',
        'global_permission': True,
    },
    {
        'pattern': r'^/api/v1/workflows/instances/$',
        'methods': {'POST': 'can_start_workflow'},
        'resource_type': 'WORKFLOW',
        'global_permission': True,
    },
    {
        'pattern': r'^/api/v1/workflows/instances/start-from-document/$',
        'methods': {'POST': 'can_start_workflow'},
        'resource_type': 'WORKFLOW',
        'global_permission': True,
    },
    {
        'pattern': r'^/api/v1/workflows/instances/(?P<id>[a-f0-9-]+)/cancel/$',
        'methods': {'POST': 'can_cancel_workflow'},
        'resource_type': 'WORKFLOW',
        'global_permission': True,
    },
    {
        'pattern': r'^/api/v1/workflows/auto-trigger-rules/',
        'methods': {
            'GET': 'can_manage_auto_triggers',
            'POST': 'can_manage_auto_triggers',
            'PUT': 'can_manage_auto_triggers',
            'PATCH': 'can_manage_auto_triggers',
            'DELETE': 'can_manage_auto_triggers',
        },
        'resource_type': 'WORKFLOW',
        'global_permission': True,
    },
    {
        'pattern': r'^/api/v1/workflows/stats/$',
        'methods': {'GET': 'can_view_workflow_analytics'},
        'resource_type': 'WORKFLOW',
        'global_permission': True,
    },
]

# URLs that should be excluded from permission checks
EXCLUDED_URLS = [
    r'^/api/v1/auth/',  # Authentication endpoints
    r'^/api/v1/health/',  # Health check
    r'^/api/schema/',  # API schema
    r'^/api/docs/',  # API documentation
    r'^/admin/',  # Django admin
    r'^/static/',  # Static files
    r'^/media/',  # Media files
]


class UniversalPermissionMiddleware:
    """
    Middleware that enforces RBAC on all API requests.

    This middleware checks:
    1. If the URL requires authentication
    2. If the user has the required global permission
    3. If the user has the required resource-level permission

    If permission is denied, it logs the attempt and returns a detailed error response.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.compiled_rules = self._compile_rules()
        self.compiled_exclusions = [re.compile(pattern) for pattern in EXCLUDED_URLS]

    def _compile_rules(self):
        """Compile URL patterns for efficient matching"""
        compiled = []
        for rule in PERMISSION_RULES:
            compiled.append({
                **rule,
                'compiled_pattern': re.compile(rule['pattern'])
            })
        return compiled

    def __call__(self, request):
        # Skip permission check for excluded URLs
        if self._is_excluded(request.path):
            return self.get_response(request)

        # Skip for non-authenticated requests (let view handle 401)
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return self.get_response(request)

        # Find matching rule
        rule, match = self._find_matching_rule(request.path, request.method)

        if rule:
            # Check permission
            permission_result = self._check_permission(request, rule, match)

            if not permission_result['allowed']:
                # Log the denied access
                self._log_access_denied(request, rule, permission_result)

                # Return detailed error response
                return JsonResponse({
                    'error': 'Permission Denied',
                    'detail': permission_result['reason'],
                    'required_permission': permission_result.get('required_permission'),
                    'source': permission_result.get('source', 'RBAC'),
                    'resource_type': rule.get('resource_type'),
                    'resource_id': permission_result.get('resource_id'),
                }, status=status.HTTP_403_FORBIDDEN)

        return self.get_response(request)

    def _is_excluded(self, path):
        """Check if URL is excluded from permission checks"""
        for pattern in self.compiled_exclusions:
            if pattern.match(path):
                return True
        return False

    def _find_matching_rule(self, path, method):
        """Find a matching permission rule for the request"""
        for rule in self.compiled_rules:
            match = rule['compiled_pattern'].match(path)
            if match:
                if method in rule.get('methods', {}):
                    return rule, match
        return None, None

    def _check_permission(self, request, rule, match):
        """Check if the user has the required permission"""
        user = request.user
        method = request.method
        required_permission = rule['methods'].get(method)

        if not required_permission:
            return {'allowed': True}

        # Admin-only check
        if rule.get('admin_only'):
            if not (user.is_superuser or user.is_staff):
                return {
                    'allowed': False,
                    'reason': 'This action requires administrator privileges',
                    'required_permission': required_permission,
                    'source': 'ADMIN_REQUIRED'
                }

        # Global permission check
        if rule.get('global_permission'):
            # Use request-attached checker if available (from PermissionContextMiddleware)
            # to benefit from in-memory request-level caching
            checker = getattr(request, 'permission_checker', None) or PermissionChecker(user)
            has_perm = checker.has_global_permission(required_permission)
            if not has_perm:
                return {
                    'allowed': False,
                    'reason': f'You do not have the required global permission: {required_permission}',
                    'required_permission': required_permission,
                    'source': 'GLOBAL_PERMISSION'
                }
            return {'allowed': True}

        # Resource-level permission check
        resource_type = rule.get('resource_type')
        id_param = rule.get('id_param')

        if resource_type and id_param and match:
            resource_id = match.group(id_param)

            # Get the resource
            obj = self._get_resource(resource_type, resource_id)
            if not obj:
                # Let the view handle 404
                return {'allowed': True}

            # Check permission with reason
            has_perm, reason, source = check_permission_with_reason(user, required_permission, obj)

            if not has_perm:
                return {
                    'allowed': False,
                    'reason': reason,
                    'required_permission': required_permission,
                    'source': source,
                    'resource_id': resource_id
                }

            return {'allowed': True}

        return {'allowed': True}

    def _get_resource(self, resource_type, resource_id):
        """Get a resource by type and ID"""
        try:
            if resource_type == 'document':
                from apps.documents.models import Document
                return Document.objects.select_related('folder', 'owner', 'department').get(id=resource_id)
            elif resource_type == 'folder':
                from apps.folders.models import Folder
                return Folder.objects.select_related('owner', 'department', 'parent').get(id=resource_id)
        except Exception:
            return None
        return None

    def _log_access_denied(self, request, rule, permission_result):
        """Log denied access attempt to permission audit log"""
        try:
            PermissionAuditLog.objects.create(
                actor=request.user,
                action='DENY',
                resource_type=rule.get('resource_type', 'UNKNOWN').upper(),
                resource_id=permission_result.get('resource_id') or '00000000-0000-0000-0000-000000000000',
                reason=f"Access denied: {permission_result['reason']}",
                ip_address=self._get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:500]
            )
        except Exception as e:
            logger.error(f"Failed to log access denied: {e}")

    def _get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')


class PermissionContextMiddleware:
    """
    Middleware that adds permission context to requests.

    This middleware attaches a PermissionChecker instance to the request,
    making it easy to check permissions in views without creating new instances.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Add permission checker to request if user is authenticated
        if hasattr(request, 'user') and request.user.is_authenticated:
            request.permission_checker = PermissionChecker(request.user)
        else:
            request.permission_checker = None

        return self.get_response(request)


def get_user_permissions_summary(user):
    """
    Get a complete summary of user's permissions.

    Returns:
        dict: Permission summary including roles, folder permissions, and effective permissions
    """
    from apps.permissions.models import UserRole, FolderPermission, DocumentPermission
    from django.db.models import Q

    checker = PermissionChecker(user)

    # Get all roles
    global_roles = UserRole.objects.filter(
        user=user,
        scope=UserRole.GLOBAL,
        is_active=True
    ).filter(
        Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
    ).select_related('role')

    department_roles = UserRole.objects.filter(
        user=user,
        scope=UserRole.DEPARTMENT,
        is_active=True
    ).filter(
        Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
    ).select_related('role', 'department')

    # Get folder permissions
    folder_permissions = FolderPermission.objects.filter(
        user=user
    ).select_related('folder')

    # Get document permissions
    document_permissions = DocumentPermission.objects.filter(
        user=user
    ).filter(
        Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
    ).select_related('document')

    # Aggregate all permissions
    all_permissions = set()
    for role in global_roles:
        all_permissions.update(role.role.get_permissions_list())
    for role in department_roles:
        all_permissions.update(role.role.get_permissions_list())

    return {
        'user_id': str(user.id),
        'username': user.username,
        'is_superuser': user.is_superuser,
        'is_staff': user.is_staff,
        'global_roles': [
            {
                'id': str(role.id),
                'role': role.role.name,
                'role_display': role.role.get_name_display(),
                'expires_at': role.expires_at.isoformat() if role.expires_at else None
            }
            for role in global_roles
        ],
        'department_roles': [
            {
                'id': str(role.id),
                'role': role.role.name,
                'role_display': role.role.get_name_display(),
                'department': role.department.name,
                'expires_at': role.expires_at.isoformat() if role.expires_at else None
            }
            for role in department_roles
        ],
        'folder_permissions_count': folder_permissions.count(),
        'document_permissions_count': document_permissions.count(),
        'all_permissions': list(all_permissions),
        'accessible_folders_count': checker.get_accessible_folders().count(),
        'accessible_documents_count': checker.get_accessible_documents().count(),
    }
