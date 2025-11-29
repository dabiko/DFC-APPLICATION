"""
Organization Settings Views.

API endpoints for organization-level settings:
- GET/PUT /org-settings/general/ - General organization settings
- GET/PUT /org-settings/security/ - Security policy settings
- GET /org-settings/features/ - Feature flags (read-only based on plan)
- GET /org-settings/usage/ - Usage statistics
- POST /org-settings/logo/ - Upload organization logo
- DELETE /org-settings/logo/ - Delete organization logo
- GET /org-settings/all/ - All settings combined
"""

from rest_framework import status, permissions, parsers
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiResponse

from apps.organizations.models import Organization, OrganizationMember
from apps.organizations.settings_models import (
    OrganizationSettings,
    OrganizationSecurityPolicy,
    OrganizationFeatureFlags,
)
from apps.organizations.settings_serializers import (
    OrganizationSettingsSerializer,
    OrganizationSecurityPolicySerializer,
    OrganizationFeatureFlagsSerializer,
    OrganizationGeneralSettingsSerializer,
    OrganizationUsageSerializer,
    AllOrganizationSettingsSerializer,
    LogoUploadSerializer,
)
from apps.documents.models import Document


class IsOrganizationAdmin(permissions.BasePermission):
    """
    Permission check for organization admin/owner.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        org = request.user.organization
        if not org:
            return False

        # Check if user is admin or owner
        try:
            membership = OrganizationMember.objects.get(
                organization=org,
                user=request.user,
                is_active=True
            )
            return membership.is_admin_or_owner
        except OrganizationMember.DoesNotExist:
            return False


def get_or_create_settings(organization):
    """Get or create all settings objects for an organization."""
    settings, _ = OrganizationSettings.objects.get_or_create(
        organization=organization
    )
    security_policy, _ = OrganizationSecurityPolicy.objects.get_or_create(
        organization=organization
    )
    feature_flags, _ = OrganizationFeatureFlags.objects.get_or_create(
        organization=organization,
        defaults=OrganizationFeatureFlags.get_plan_features(organization.subscription_plan)
    )
    return settings, security_policy, feature_flags


def calculate_usage(organization):
    """Calculate organization usage statistics."""
    # User count
    current_users = organization.members.filter(is_active=True).count()
    max_users = organization.max_users
    users_percentage = (current_users / max_users * 100) if max_users > 0 else 0

    # Storage usage (in GB)
    total_storage_bytes = Document.objects.filter(
        owner__organization=organization
    ).aggregate(total=models.Sum('file_size'))['total'] or 0
    current_storage_gb = total_storage_bytes / (1024 ** 3)
    max_storage_gb = organization.max_storage_gb
    storage_percentage = (current_storage_gb / max_storage_gb * 100) if max_storage_gb > 0 else 0

    # Document count
    current_documents = Document.objects.filter(
        owner__organization=organization,
        is_deleted=False
    ).count()
    max_documents = organization.max_documents
    documents_percentage = (current_documents / max_documents * 100) if max_documents > 0 else 0

    return {
        'current_users': current_users,
        'max_users': max_users,
        'users_percentage': round(users_percentage, 1),
        'current_storage_gb': round(current_storage_gb, 2),
        'max_storage_gb': max_storage_gb,
        'storage_percentage': round(storage_percentage, 1),
        'current_documents': current_documents,
        'max_documents': max_documents,
        'documents_percentage': round(documents_percentage, 1),
        'users_limit_reached': current_users >= max_users,
        'storage_limit_reached': current_storage_gb >= max_storage_gb,
        'documents_limit_reached': current_documents >= max_documents,
    }


# Import models for Sum aggregation
from django.db import models


class OrganizationGeneralSettingsView(APIView):
    """
    View for organization general settings.

    GET: Returns organization info and general settings.
    PUT: Updates organization name and settings.
    """

    permission_classes = [permissions.IsAuthenticated, IsOrganizationAdmin]

    @extend_schema(
        tags=['Organization Settings'],
        responses={200: OrganizationGeneralSettingsSerializer},
        description='Get organization general settings'
    )
    def get(self, request):
        org = request.user.organization
        if not org:
            return Response(
                {'detail': 'User is not associated with an organization'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Ensure settings exist
        get_or_create_settings(org)

        serializer = OrganizationGeneralSettingsSerializer(org, context={'request': request})
        return Response(serializer.data)

    @extend_schema(
        tags=['Organization Settings'],
        request=OrganizationGeneralSettingsSerializer,
        responses={200: OrganizationGeneralSettingsSerializer},
        description='Update organization general settings'
    )
    def put(self, request):
        org = request.user.organization
        if not org:
            return Response(
                {'detail': 'User is not associated with an organization'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Update organization fields
        org_data = {
            k: v for k, v in request.data.items()
            if k in ['name', 'registration_number', 'tax_id', 'industry', 'country']
        }
        for key, value in org_data.items():
            setattr(org, key, value)
        org.save()

        # Update settings if provided
        settings_data = request.data.get('settings', {})
        if settings_data:
            settings, _, _ = get_or_create_settings(org)
            settings_serializer = OrganizationSettingsSerializer(
                settings,
                data=settings_data,
                partial=True,
                context={'request': request}
            )
            if settings_serializer.is_valid():
                settings_serializer.save()

        serializer = OrganizationGeneralSettingsSerializer(org, context={'request': request})
        return Response(serializer.data)


class OrganizationSecurityPolicyView(APIView):
    """
    View for organization security policy.

    GET: Returns security policy settings.
    PUT: Updates security policy settings.
    """

    permission_classes = [permissions.IsAuthenticated, IsOrganizationAdmin]

    @extend_schema(
        tags=['Organization Settings'],
        responses={200: OrganizationSecurityPolicySerializer},
        description='Get organization security policy'
    )
    def get(self, request):
        org = request.user.organization
        if not org:
            return Response(
                {'detail': 'User is not associated with an organization'},
                status=status.HTTP_404_NOT_FOUND
            )

        _, security_policy, _ = get_or_create_settings(org)
        serializer = OrganizationSecurityPolicySerializer(security_policy)
        return Response(serializer.data)

    @extend_schema(
        tags=['Organization Settings'],
        request=OrganizationSecurityPolicySerializer,
        responses={200: OrganizationSecurityPolicySerializer},
        description='Update organization security policy'
    )
    def put(self, request):
        org = request.user.organization
        if not org:
            return Response(
                {'detail': 'User is not associated with an organization'},
                status=status.HTTP_404_NOT_FOUND
            )

        _, security_policy, _ = get_or_create_settings(org)
        serializer = OrganizationSecurityPolicySerializer(
            security_policy,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class OrganizationFeatureFlagsView(APIView):
    """
    View for organization feature flags.

    GET: Returns feature flags (based on subscription plan).
    Features are read-only and determined by subscription.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=['Organization Settings'],
        responses={200: OrganizationFeatureFlagsSerializer},
        description='Get organization feature flags'
    )
    def get(self, request):
        org = request.user.organization
        if not org:
            return Response(
                {'detail': 'User is not associated with an organization'},
                status=status.HTTP_404_NOT_FOUND
            )

        _, _, feature_flags = get_or_create_settings(org)
        serializer = OrganizationFeatureFlagsSerializer(feature_flags)
        return Response(serializer.data)


class OrganizationUsageView(APIView):
    """
    View for organization usage statistics.

    GET: Returns usage statistics (users, storage, documents).
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=['Organization Settings'],
        responses={200: OrganizationUsageSerializer},
        description='Get organization usage statistics'
    )
    def get(self, request):
        org = request.user.organization
        if not org:
            return Response(
                {'detail': 'User is not associated with an organization'},
                status=status.HTTP_404_NOT_FOUND
            )

        usage = calculate_usage(org)
        serializer = OrganizationUsageSerializer(data=usage)
        serializer.is_valid()
        return Response(serializer.data)


class OrganizationLogoView(APIView):
    """
    View for organization logo management.

    POST: Upload new logo.
    DELETE: Remove current logo.
    """

    permission_classes = [permissions.IsAuthenticated, IsOrganizationAdmin]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    @extend_schema(
        tags=['Organization Settings'],
        request={'multipart/form-data': LogoUploadSerializer},
        responses={200: OrganizationSettingsSerializer},
        description='Upload organization logo'
    )
    def post(self, request):
        org = request.user.organization
        if not org:
            return Response(
                {'detail': 'User is not associated with an organization'},
                status=status.HTTP_404_NOT_FOUND
            )

        settings, _, _ = get_or_create_settings(org)

        serializer = LogoUploadSerializer(data=request.data)
        if serializer.is_valid():
            # Delete old logo if exists
            if settings.logo:
                settings.logo.delete(save=False)

            settings.logo = serializer.validated_data['logo']
            settings.save()

            response_serializer = OrganizationSettingsSerializer(
                settings,
                context={'request': request}
            )
            return Response(response_serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        tags=['Organization Settings'],
        responses={204: None},
        description='Delete organization logo'
    )
    def delete(self, request):
        org = request.user.organization
        if not org:
            return Response(
                {'detail': 'User is not associated with an organization'},
                status=status.HTTP_404_NOT_FOUND
            )

        settings, _, _ = get_or_create_settings(org)

        if settings.logo:
            settings.logo.delete(save=False)
            settings.logo = None
            settings.save()

        return Response(status=status.HTTP_204_NO_CONTENT)


class AllOrganizationSettingsView(APIView):
    """
    View for all organization settings combined.

    GET: Returns all settings in a single response.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=['Organization Settings'],
        responses={200: AllOrganizationSettingsSerializer},
        description='Get all organization settings'
    )
    def get(self, request):
        org = request.user.organization
        if not org:
            return Response(
                {'detail': 'User is not associated with an organization'},
                status=status.HTTP_404_NOT_FOUND
            )

        settings, security_policy, feature_flags = get_or_create_settings(org)
        usage = calculate_usage(org)

        return Response({
            'organization': OrganizationGeneralSettingsSerializer(
                org, context={'request': request}
            ).data,
            'settings': OrganizationSettingsSerializer(
                settings, context={'request': request}
            ).data,
            'security_policy': OrganizationSecurityPolicySerializer(security_policy).data,
            'feature_flags': OrganizationFeatureFlagsSerializer(feature_flags).data,
            'usage': usage,
        })
