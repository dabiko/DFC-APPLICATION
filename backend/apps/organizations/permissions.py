"""
Permission classes for organization-based access control.

Provides role-based permissions for multi-tenant operations.
"""
from rest_framework.permissions import BasePermission


class IsOrganizationAdmin(BasePermission):
    """
    Permission class to check if user is organization admin.

    Allows access to users with 'owner' or 'admin' role in their organization.
    Used for operations like inviting users, managing settings, etc.
    """

    message = "You must be an organization administrator to perform this action."

    def has_permission(self, request, view):
        """Check if user is authenticated and has admin privileges."""
        if not request.user or not request.user.is_authenticated:
            return False

        if not hasattr(request.user, 'organization') or not request.user.organization:
            return False

        # Check if user has admin role in their organization
        try:
            from apps.organizations.models import OrganizationMember
            membership = OrganizationMember.objects.get(
                user=request.user,
                organization=request.user.organization
            )
            return membership.role in ['owner', 'admin', 'manager']
        except OrganizationMember.DoesNotExist:
            return False


class IsOrganizationOwner(BasePermission):
    """
    Permission class to check if user is organization owner.

    Allows access only to the organization owner.
    Used for critical operations like billing, deleting organization, etc.
    """

    message = "You must be the organization owner to perform this action."

    def has_permission(self, request, view):
        """Check if user is authenticated and is organization owner."""
        if not request.user or not request.user.is_authenticated:
            return False

        if not hasattr(request.user, 'organization') or not request.user.organization:
            return False

        try:
            from apps.organizations.models import OrganizationMember
            membership = OrganizationMember.objects.get(
                user=request.user,
                organization=request.user.organization
            )
            return membership.role == 'owner'
        except OrganizationMember.DoesNotExist:
            return False


class IsOrganizationMember(BasePermission):
    """
    Permission class to check if user is a member of an organization.

    Allows access to any active member of the organization.
    Used for basic organization resources.
    """

    message = "You must be a member of this organization to perform this action."

    def has_permission(self, request, view):
        """Check if user is authenticated and is organization member."""
        if not request.user or not request.user.is_authenticated:
            return False

        if not hasattr(request.user, 'organization') or not request.user.organization:
            return False

        try:
            from apps.organizations.models import OrganizationMember
            membership = OrganizationMember.objects.get(
                user=request.user,
                organization=request.user.organization,
                is_active=True
            )
            return True
        except OrganizationMember.DoesNotExist:
            return False


class CanInviteUsers(BasePermission):
    """
    Permission class to check if user can invite other users.

    Checks the can_invite_users flag on OrganizationMember.
    """

    message = "You don't have permission to invite users to this organization."

    def has_permission(self, request, view):
        """Check if user has invitation permissions."""
        if not request.user or not request.user.is_authenticated:
            return False

        if not hasattr(request.user, 'organization') or not request.user.organization:
            return False

        try:
            from apps.organizations.models import OrganizationMember
            membership = OrganizationMember.objects.get(
                user=request.user,
                organization=request.user.organization,
                is_active=True
            )
            return membership.can_invite_users
        except OrganizationMember.DoesNotExist:
            return False


class CanManageSettings(BasePermission):
    """
    Permission class to check if user can manage organization settings.

    Checks the can_manage_settings flag on OrganizationMember.
    """

    message = "You don't have permission to manage organization settings."

    def has_permission(self, request, view):
        """Check if user has settings management permissions."""
        if not request.user or not request.user.is_authenticated:
            return False

        if not hasattr(request.user, 'organization') or not request.user.organization:
            return False

        try:
            from apps.organizations.models import OrganizationMember
            membership = OrganizationMember.objects.get(
                user=request.user,
                organization=request.user.organization,
                is_active=True
            )
            return membership.can_manage_settings
        except OrganizationMember.DoesNotExist:
            return False
