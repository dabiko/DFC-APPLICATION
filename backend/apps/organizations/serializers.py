"""
Serializers for organization management.

Provides JSON serialization for:
- Organizations (with subscription details)
- Organization members (with role management)
- Invitations (with validation)
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Organization, OrganizationMember, OrganizationInvitation
from .validators import validate_business_email, extract_domain_from_email

User = get_user_model()


class OrganizationSerializer(serializers.ModelSerializer):
    """
    Serializer for Organization model.
    Displays subscription info and current usage stats.
    """
    subscription_display = serializers.ReadOnlyField()
    current_user_count = serializers.ReadOnlyField()
    can_add_users = serializers.ReadOnlyField()
    is_trial_expired = serializers.ReadOnlyField()
    days_until_trial_expires = serializers.ReadOnlyField()

    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'domain', 'slug',
            'subscription_plan', 'subscription_status', 'subscription_display',
            'max_users', 'max_storage_gb', 'max_documents',
            'current_user_count', 'can_add_users',
            'trial_ends_at', 'is_trial_expired', 'days_until_trial_expires',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'slug', 'subscription_display', 'current_user_count',
            'can_add_users', 'is_trial_expired', 'days_until_trial_expires',
            'created_at', 'updated_at'
        ]


class OrganizationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for organization lists."""
    user_count = serializers.IntegerField(source='current_user_count', read_only=True)

    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'domain', 'subscription_plan',
            'subscription_status', 'user_count', 'is_active'
        ]


class OrganizationMemberUserSerializer(serializers.ModelSerializer):
    """Nested serializer for user info in membership."""
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'is_active']


class OrganizationMemberSerializer(serializers.ModelSerializer):
    """
    Serializer for OrganizationMember model.
    Shows user info and role within organization.
    """
    user = OrganizationMemberUserSerializer(read_only=True)
    user_email = serializers.EmailField(write_only=True, required=False)
    is_owner = serializers.ReadOnlyField()
    is_admin_or_owner = serializers.ReadOnlyField()
    can_invite_users = serializers.ReadOnlyField()
    can_manage_members = serializers.ReadOnlyField()

    class Meta:
        model = OrganizationMember
        fields = [
            'id', 'user', 'user_email', 'organization', 'role',
            'is_active', 'joined_at', 'updated_at',
            'is_owner', 'is_admin_or_owner',
            'can_invite_users', 'can_manage_members'
        ]
        read_only_fields = [
            'id', 'user', 'organization', 'joined_at', 'updated_at',
            'is_owner', 'is_admin_or_owner', 'can_invite_users', 'can_manage_members'
        ]

    def validate_user_email(self, value):
        """Validate user email exists and belongs to organization."""
        try:
            user = User.objects.get(email=value)
        except User.DoesNotExist:
            raise serializers.ValidationError(
                f"No user found with email {value}"
            )
        return value


class OrganizationInvitationSerializer(serializers.ModelSerializer):
    """
    Serializer for OrganizationInvitation model.
    Handles invitation creation with domain validation.
    """
    invited_by_email = serializers.EmailField(source='invited_by.email', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    is_valid = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    invited_domain = serializers.ReadOnlyField()
    matches_organization_domain = serializers.ReadOnlyField()

    class Meta:
        model = OrganizationInvitation
        fields = [
            'id', 'organization', 'organization_name',
            'email', 'invited_by', 'invited_by_email',
            'role', 'status', 'token',
            'created_at', 'expires_at',
            'accepted_at', 'declined_at', 'revoked_at',
            'is_valid', 'is_expired',
            'invited_domain', 'matches_organization_domain'
        ]
        read_only_fields = [
            'id', 'organization_name', 'invited_by', 'invited_by_email',
            'token', 'status', 'created_at', 'expires_at',
            'accepted_at', 'declined_at', 'revoked_at',
            'is_valid', 'is_expired', 'invited_domain', 'matches_organization_domain'
        ]

    def validate_email(self, value):
        """Validate email is a business email and matches organization domain."""
        # Validate it's a business email (not Gmail, etc.)
        validate_business_email(value)

        # If organization is provided in context, verify domain matches
        organization = self.context.get('organization')
        if organization:
            invited_domain = extract_domain_from_email(value)
            if invited_domain != organization.domain:
                raise serializers.ValidationError(
                    f"Email domain '{invited_domain}' does not match organization domain "
                    f"'{organization.domain}'. Only users with @{organization.domain} "
                    "emails can be invited to this organization."
                )

        return value.lower()


class InvitationCreateSerializer(serializers.Serializer):
    """
    Serializer for creating invitations.
    Simplified for invitation creation endpoint.
    """
    email = serializers.EmailField(validators=[validate_business_email])
    role = serializers.ChoiceField(
        choices=OrganizationMember.ROLE_CHOICES,
        default='member'
    )

    def validate_email(self, value):
        """Validate email domain matches organization."""
        organization = self.context.get('organization')
        if not organization:
            raise serializers.ValidationError("Organization context required")

        invited_domain = extract_domain_from_email(value)
        if invited_domain != organization.domain:
            raise serializers.ValidationError(
                f"Email domain must be @{organization.domain}"
            )

        # Check if user already exists in organization
        if User.objects.filter(
            email__iexact=value,
            organization=organization
        ).exists():
            raise serializers.ValidationError(
                f"User with email {value} is already a member of {organization.name}"
            )

        # Check for existing pending invitation
        existing = OrganizationInvitation.objects.filter(
            organization=organization,
            email__iexact=value,
            status='pending'
        ).first()

        if existing and existing.is_valid:
            raise serializers.ValidationError(
                f"An active invitation has already been sent to {value}"
            )

        return value.lower()


class InvitationAcceptSerializer(serializers.Serializer):
    """Serializer for accepting invitations."""
    token = serializers.CharField(max_length=64)

    def validate_token(self, value):
        """Validate token exists and invitation is valid."""
        try:
            invitation = OrganizationInvitation.objects.get(token=value)
        except OrganizationInvitation.DoesNotExist:
            raise serializers.ValidationError("Invalid invitation token")

        if not invitation.is_valid:
            if invitation.is_expired:
                raise serializers.ValidationError("This invitation has expired")
            else:
                raise serializers.ValidationError(
                    f"This invitation is no longer valid (status: {invitation.status})"
                )

        # Store invitation in context for later use
        self.context['invitation'] = invitation
        return value


class OrganizationStatsSerializer(serializers.Serializer):
    """Serializer for organization statistics."""
    total_users = serializers.IntegerField()
    total_documents = serializers.IntegerField()
    total_folders = serializers.IntegerField()
    total_departments = serializers.IntegerField()
    storage_used_gb = serializers.DecimalField(max_digits=10, decimal_places=2)
    storage_limit_gb = serializers.IntegerField()
    storage_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)
    user_limit = serializers.IntegerField()
    user_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)
    subscription_plan = serializers.CharField()
    subscription_status = serializers.CharField()
    trial_days_remaining = serializers.IntegerField(allow_null=True)
