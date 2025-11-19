"""
API views for organization management.

Endpoints:
- GET /organizations/me/ - User's organization details
- GET /organizations/members/ - Organization members
- POST /organizations/invitations/create/ - Invite user
- POST /organizations/invitations/accept/ - Accept invitation
- GET /organizations/invitations/ - List invitations
- GET /organizations/stats/ - Organization statistics
"""
from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction, models
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model

from .models import Organization, OrganizationMember, OrganizationInvitation
from .serializers import (
    OrganizationSerializer,
    OrganizationMemberSerializer,
    OrganizationInvitationSerializer,
    InvitationCreateSerializer,
    InvitationAcceptSerializer,
    OrganizationStatsSerializer
)

User = get_user_model()


class OrganizationDetailView(generics.RetrieveAPIView):
    """GET /api/v1/organizations/me/ - Current user's organization"""
    serializer_class = OrganizationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        if not self.request.user.organization:
            return Response(
                {'error': 'Not associated with any organization'},
                status=status.HTTP_404_NOT_FOUND
            )
        return self.request.user.organization


class OrganizationMembersView(generics.ListAPIView):
    """GET /api/v1/organizations/members/ - List organization members"""
    serializer_class = OrganizationMemberSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if not self.request.user.organization:
            return OrganizationMember.objects.none()
        return OrganizationMember.objects.filter(
            organization=self.request.user.organization
        ).select_related('user', 'organization').order_by('-joined_at')


class InvitationCreateView(APIView):
    """POST /api/v1/organizations/invitations/create/ - Invite user"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not request.user.organization:
            return Response({'error': 'Not associated with any organization'},
                          status=status.HTTP_400_BAD_REQUEST)

        try:
            membership = OrganizationMember.objects.get(
                user=request.user, organization=request.user.organization)
        except OrganizationMember.DoesNotExist:
            return Response({'error': 'Not a member'}, status=status.HTTP_403_FORBIDDEN)

        if not membership.can_invite_users:
            return Response({'error': 'No permission to invite'},
                          status=status.HTTP_403_FORBIDDEN)

        if not request.user.organization.can_add_users:
            return Response({'error': 'Max user limit reached'},
                          status=status.HTTP_400_BAD_REQUEST)

        serializer = InvitationCreateSerializer(
            data=request.data, context={'organization': request.user.organization})

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            invitation = OrganizationInvitation.create_invitation(
                organization=request.user.organization,
                email=serializer.validated_data['email'],
                invited_by=request.user,
                role=serializer.validated_data.get('role', 'member'))
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'success': True,
            'message': f'Invitation sent to {invitation.email}',
            'invitation': OrganizationInvitationSerializer(invitation).data
        }, status=status.HTTP_201_CREATED)


class InvitationAcceptView(APIView):
    """POST /api/v1/organizations/invitations/accept/ - Accept invitation"""
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = InvitationAcceptSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        invitation = serializer.context['invitation']
        if request.user.email.lower() != invitation.email.lower():
            return Response({'error': 'Invitation for different email'},
                          status=status.HTTP_403_FORBIDDEN)

        membership = invitation.accept(request.user)
        if not membership:
            return Response({'error': 'Failed to accept'},
                          status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'success': True,
            'message': f'Joined {invitation.organization.name}',
            'membership': OrganizationMemberSerializer(membership).data,
            'organization': OrganizationSerializer(invitation.organization).data
        })


class InvitationListView(generics.ListAPIView):
    """GET /api/v1/organizations/invitations/ - List invitations"""
    serializer_class = OrganizationInvitationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if not self.request.user.organization:
            return OrganizationInvitation.objects.none()
        try:
            membership = OrganizationMember.objects.get(
                user=self.request.user, organization=self.request.user.organization)
            if not membership.can_invite_users:
                return OrganizationInvitation.objects.none()
        except OrganizationMember.DoesNotExist:
            return OrganizationInvitation.objects.none()

        return OrganizationInvitation.objects.filter(
            organization=self.request.user.organization, status='pending'
        ).select_related('organization', 'invited_by').order_by('-created_at')


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def organization_stats(request):
    """GET /api/v1/organizations/stats/ - Organization statistics"""
    if not request.user.organization:
        return Response({'error': 'Not associated with organization'},
                       status=status.HTTP_404_NOT_FOUND)

    org = request.user.organization
    from apps.documents.models import Document
    from apps.folders.models import Folder
    from apps.users.models import Department

    total_storage_bytes = Document.objects.filter(organization=org).aggregate(
        total=models.Sum('file_size'))['total'] or 0
    storage_used_gb = total_storage_bytes / (1024 ** 3)

    stats = {
        'total_users': org.current_user_count,
        'total_documents': Document.objects.filter(organization=org).count(),
        'total_folders': Folder.objects.filter(organization=org).count(),
        'total_departments': Department.objects.filter(organization=org).count(),
        'storage_used_gb': round(storage_used_gb, 2),
        'storage_limit_gb': org.max_storage_gb,
        'storage_percentage': round((storage_used_gb / org.max_storage_gb * 100), 2) if org.max_storage_gb > 0 else 0,
        'user_limit': org.max_users,
        'user_percentage': round((org.current_user_count / org.max_users * 100), 2) if org.max_users > 0 else 0,
        'subscription_plan': org.subscription_plan,
        'subscription_status': org.subscription_status,
        'trial_days_remaining': org.days_until_trial_expires if org.subscription_status == 'trial' else None
    }

    return Response(OrganizationStatsSerializer(stats).data)


class OrganizationSettingsView(APIView):
    """
    GET/PUT /api/v1/organizations/settings/

    Get or update organization settings.
    Only admins/owners can modify settings.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get organization settings."""
        if not request.user.organization:
            return Response(
                {'error': 'Not associated with any organization'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = OrganizationSerializer(request.user.organization)
        return Response({
            'success': True,
            'data': serializer.data
        })

    def put(self, request):
        """Update organization settings (admin only)."""
        if not request.user.organization:
            return Response(
                {'error': 'Not associated with any organization'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if user is admin/owner
        try:
            membership = OrganizationMember.objects.get(
                user=request.user,
                organization=request.user.organization
            )
            if membership.role not in ['owner', 'admin']:
                return Response(
                    {'error': 'Only admins can update organization settings'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except OrganizationMember.DoesNotExist:
            return Response(
                {'error': 'Not a member of organization'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = OrganizationSerializer(
            request.user.organization,
            data=request.data,
            partial=True
        )

        if not serializer.is_valid():
            return Response({
                'success': False,
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer.save()

        return Response({
            'success': True,
            'message': 'Organization settings updated successfully',
            'data': serializer.data
        })


class OrganizationUsageView(APIView):
    """
    GET /api/v1/organizations/usage/

    Get detailed organization usage statistics including
    percentage usage of limits.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get detailed usage statistics."""
        if not request.user.organization:
            return Response(
                {'error': 'Not associated with any organization'},
                status=status.HTTP_404_NOT_FOUND
            )

        org = request.user.organization

        from apps.documents.models import Document
        from apps.users.models import CustomUser

        # Calculate usage
        user_count = CustomUser.objects.filter(
            organization=org,
            is_active=True
        ).count()

        document_stats = Document.objects.filter(
            organization=org
        ).aggregate(
            total_documents=models.Count('id'),
            total_storage_bytes=models.Sum('file_size')
        )

        storage_bytes = document_stats['total_storage_bytes'] or 0
        storage_gb = storage_bytes / (1024 ** 3)

        # Calculate percentages
        users_percentage = round((user_count / org.max_users * 100), 2) if org.max_users > 0 else 0
        documents_percentage = round(((document_stats['total_documents'] or 0) / org.max_documents * 100), 2) if org.max_documents > 0 else 0
        storage_percentage = round((storage_gb / org.max_storage_gb * 100), 2) if org.max_storage_gb > 0 else 0

        # Check limits
        limits = org.is_within_limits()

        return Response({
            'success': True,
            'data': {
                'usage': {
                    'users': {
                        'current': user_count,
                        'max': org.max_users,
                        'percentage': users_percentage,
                        'within_limit': limits['users']
                    },
                    'documents': {
                        'current': document_stats['total_documents'] or 0,
                        'max': org.max_documents,
                        'percentage': documents_percentage,
                        'within_limit': limits['documents']
                    },
                    'storage': {
                        'current_gb': round(storage_gb, 2),
                        'max_gb': org.max_storage_gb,
                        'percentage': storage_percentage,
                        'within_limit': storage_gb <= org.max_storage_gb
                    }
                },
                'subscription': {
                    'plan': org.subscription_plan,
                    'plan_display': org.get_subscription_plan_display(),
                    'status': org.subscription_status,
                    'status_display': org.get_subscription_status_display(),
                    'is_trial': org.subscription_status == 'trial',
                    'trial_days_remaining': org.days_until_trial_expires if org.subscription_status == 'trial' else None,
                    'is_trial_expired': org.is_trial_expired if org.subscription_status == 'trial' else False
                },
                'limits_exceeded': not limits['within_limits']
            }
        })


class RemoveOrganizationMemberView(APIView):
    """
    DELETE /api/v1/organizations/members/<member_id>/remove/

    Remove a member from the organization.
    Only admins/owners can remove members.
    Cannot remove the organization owner.
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, member_id):
        """Remove member from organization."""
        if not request.user.organization:
            return Response(
                {'error': 'Not associated with any organization'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if user is admin/owner
        try:
            requester_membership = OrganizationMember.objects.get(
                user=request.user,
                organization=request.user.organization
            )
            if requester_membership.role not in ['owner', 'admin']:
                return Response(
                    {'error': 'Only admins can remove members'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except OrganizationMember.DoesNotExist:
            return Response(
                {'error': 'Not a member of organization'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get the member to remove
        try:
            member = OrganizationMember.objects.get(
                id=member_id,
                organization=request.user.organization
            )
        except OrganizationMember.DoesNotExist:
            return Response(
                {'error': 'Member not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Cannot remove owner
        if member.role == 'owner':
            return Response({
                'success': False,
                'error': 'Cannot remove organization owner. Transfer ownership first.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Cannot remove yourself
        if member.user == request.user:
            return Response({
                'success': False,
                'error': 'Cannot remove yourself. Ask another admin to remove you.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Deactivate user
        member.user.is_active = False
        member.user.save()

        # Deactivate membership
        member.is_active = False
        member.save()

        return Response({
            'success': True,
            'message': f'{member.user.email} has been removed from the organization'
        })


class UpdateMemberRoleView(APIView):
    """
    PUT /api/v1/organizations/members/<member_id>/role/

    Update a member's role in the organization.
    Only admins/owners can update roles.
    Cannot change the owner's role.
    """
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, member_id):
        """Update member's role."""
        if not request.user.organization:
            return Response(
                {'error': 'Not associated with any organization'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if user is admin/owner
        try:
            requester_membership = OrganizationMember.objects.get(
                user=request.user,
                organization=request.user.organization
            )
            if requester_membership.role not in ['owner', 'admin']:
                return Response(
                    {'error': 'Only admins can update member roles'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except OrganizationMember.DoesNotExist:
            return Response(
                {'error': 'Not a member of organization'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get the new role
        new_role = request.data.get('role')
        if not new_role:
            return Response({
                'success': False,
                'error': 'Role is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate role
        valid_roles = dict(OrganizationMember.ROLE_CHOICES).keys()
        if new_role not in valid_roles:
            return Response({
                'success': False,
                'error': f'Invalid role. Must be one of: {", ".join(valid_roles)}'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Get the member to update
        try:
            member = OrganizationMember.objects.get(
                id=member_id,
                organization=request.user.organization
            )
        except OrganizationMember.DoesNotExist:
            return Response(
                {'error': 'Member not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Cannot change owner role
        if member.role == 'owner':
            return Response({
                'success': False,
                'error': 'Cannot change owner role. Transfer ownership instead.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Cannot promote to owner (use transfer ownership instead)
        if new_role == 'owner':
            return Response({
                'success': False,
                'error': 'Cannot promote to owner. Use transfer ownership instead.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Update role and permissions
        old_role = member.role
        member.role = new_role

        # Update permissions based on role
        if new_role in ['owner', 'admin', 'manager']:
            member.can_invite_users = True
        else:
            member.can_invite_users = False

        if new_role in ['owner', 'admin']:
            member.can_manage_settings = True
        else:
            member.can_manage_settings = False

        member.save()

        return Response({
            'success': True,
            'message': f'Role updated from {old_role} to {new_role}',
            'data': OrganizationMemberSerializer(member).data
        })
