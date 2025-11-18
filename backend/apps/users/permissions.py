"""
Custom permissions for Role-Based Access Control (RBAC).
"""
from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    Read permissions are allowed to any authenticated user.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any authenticated request
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions are only allowed to the owner
        return obj == request.user or request.user.is_staff


class IsDepartmentMember(permissions.BasePermission):
    """
    Permission to check if user belongs to the same department as the resource.
    """

    def has_object_permission(self, request, view, obj):
        # Staff can access all departments
        if request.user.is_staff:
            return True

        # Check if user belongs to the same department
        if hasattr(obj, 'department'):
            return obj.department == request.user.department

        return False


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow admins to edit.
    Read permissions are allowed to any authenticated user.
    """

    def has_permission(self, request, view):
        # Read permissions are allowed to any authenticated request
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated

        # Write permissions are only allowed to staff
        return request.user and request.user.is_staff


class CanManageUsers(permissions.BasePermission):
    """
    Permission for user management operations.
    Only staff members can create, update, or delete users.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated

        return request.user and request.user.is_staff

    def has_object_permission(self, request, view, obj):
        # Staff can manage all users
        if request.user.is_staff:
            return True

        # Users can only view/edit their own profile
        if request.method in permissions.SAFE_METHODS:
            return True

        return obj == request.user
