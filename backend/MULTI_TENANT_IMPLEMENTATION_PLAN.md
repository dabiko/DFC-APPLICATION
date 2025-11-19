# Multi-Tenant SaaS Implementation Plan
## Full Multi-Tenancy with Organization Invitations

**Document Version**: 1.0
**Created**: November 19, 2025
**Target**: Transform DFC into Multi-Tenant SaaS Application
**Approach**: Option B - Full Multi-Tenant with Invitations

---

## Executive Summary

Transform the Digital Filing Cabinet (DFC) from a single-tenant application (CCC PLC only) into a full multi-tenant SaaS platform where:

- Multiple companies/organizations can use the same DFC instance
- Each organization has complete data isolation
- Organization admins can invite users via email
- Users can only access their organization's data
- First user from a domain becomes the organization admin

**Estimated Effort**: 16-20 hours
**Complexity**: High
**Impact**: Architecture-level changes

---

## Table of Contents

1. [Tech Stack Analysis for SaaS Multi-Tenancy](#tech-stack-analysis)
2. [Architecture Overview](#architecture-overview)
3. [Phase 1: Organization Model & Infrastructure](#phase-1)
4. [Phase 2: Invitation System](#phase-2)
5. [Phase 3: Data Isolation & Tenant Filtering](#phase-3)
6. [Phase 4: Authentication & Authorization](#phase-4)
7. [Phase 5: Admin Interface & Management](#phase-5)
8. [Phase 6: Testing & Validation](#phase-6)
9. [Migration Strategy](#migration-strategy)
10. [Security Considerations](#security-considerations)
11. [Scalability Roadmap](#scalability-roadmap)

---

## Tech Stack Analysis for SaaS Multi-Tenancy

### Current Stack Assessment

| Component | Current | Multi-Tenant Ready? | Recommendation |
|-----------|---------|---------------------|----------------|
| **Backend Framework** | Django 5.2.8 | ✅ Excellent | Keep - Django is perfect for multi-tenancy |
| **Database** | PostgreSQL 16 | ✅ Excellent | Keep - Best for multi-tenant with row-level security |
| **Storage** | MinIO (S3) | ✅ Good | Keep - Use bucket-per-tenant or prefix isolation |
| **Authentication** | JWT + django-otp | ✅ Good | Keep - Add organization context to tokens |
| **API** | Django REST Framework | ✅ Excellent | Keep - Perfect for multi-tenant APIs |
| **Search** | Elasticsearch | ✅ Good | Keep - Add tenant filtering to queries |
| **Cache** | Redis | ✅ Excellent | Keep - Use tenant-prefixed keys |
| **Task Queue** | Celery + RabbitMQ | ✅ Good | Keep - Pass tenant context to tasks |
| **File Processing** | Tesseract OCR | ✅ Good | Keep - No changes needed |

### Recommended Additions for Multi-Tenancy

| Component | Purpose | Priority | Library/Tool |
|-----------|---------|----------|--------------|
| **Tenant Middleware** | Auto-filter queries by tenant | High | Custom or `django-tenant-schemas` |
| **Subdomain Routing** | `acme.dfc.com` style URLs | Medium | Django sites framework |
| **Billing Integration** | Subscription management | High | Stripe API |
| **Usage Tracking** | Monitor per-tenant usage | Medium | Custom middleware |
| **Tenant Migrations** | Safe schema changes | High | Custom migration system |

### ✅ **VERDICT: Your Stack is EXCELLENT for Multi-Tenant SaaS**

**Strengths**:
- Django + PostgreSQL = Industry standard for multi-tenant SaaS
- JWT tokens can easily include tenant context
- MinIO supports tenant isolation via buckets/prefixes
- Celery can pass tenant context between tasks
- Elasticsearch supports tenant filtering

**Minor Adjustments Needed**:
- Add tenant middleware for automatic query filtering
- Implement tenant-aware caching
- Add subdomain support (optional but recommended)
- Integrate billing system (Stripe recommended)

---

## Architecture Overview

### Multi-Tenancy Pattern: Shared Database with Row-Level Isolation

```
┌─────────────────────────────────────────────────────────┐
│                  DFC SaaS Platform                      │
│                  dfc.yourdomain.com                     │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ Organization 1│   │ Organization 2│   │ Organization 3│
│  acme.com     │   │  techcorp.com │   │  finance.co   │
├───────────────┤   ├───────────────┤   ├───────────────┤
│ 50 Users      │   │ 20 Users      │   │ 100 Users     │
│ 5,000 Docs    │   │ 1,200 Docs    │   │ 15,000 Docs   │
└───────────────┘   └───────────────┘   └───────────────┘
        │                   │                   │
        └───────────────────┴───────────────────┘
                            │
                ┌───────────▼────────────┐
                │   Shared PostgreSQL    │
                │   + Organization FK    │
                │   (Row-Level Isolation)│
                └────────────────────────┘
```

### Why This Pattern?

**Pros**:
- ✅ Easy to manage (one database)
- ✅ Cost-effective for small-medium tenants
- ✅ Simpler backups and maintenance
- ✅ Easy cross-tenant analytics (if needed)

**Cons**:
- ⚠️ Requires careful query filtering (security risk if done wrong)
- ⚠️ All tenants share database resources
- ⚠️ Scaling requires sharding eventually

**Alternative**: Schema-per-tenant (more isolation, more complex) - not recommended at this stage.

---

## Phase 1: Organization Model & Infrastructure

**Duration**: 3-4 hours
**Priority**: Critical

### 1.1 Create Organization Model

```python
# apps/organizations/__init__.py
# New app for multi-tenancy

# apps/organizations/models.py

from django.db import models
from django.core.validators import validate_email
from django.utils import timezone
from datetime import timedelta
import secrets

class Organization(models.Model):
    """
    Multi-tenant organization model.
    Represents a company/business using the DFC platform.
    """

    # Basic Info
    name = models.CharField(
        max_length=200,
        help_text="Organization/Company name"
    )
    domain = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text="Email domain (e.g., acmecorp.com)"
    )
    slug = models.SlugField(
        max_length=100,
        unique=True,
        help_text="URL-friendly identifier"
    )

    # Subscription & Billing
    subscription_plan = models.CharField(
        max_length=50,
        choices=[
            ('free', 'Free Trial'),
            ('starter', 'Starter'),
            ('professional', 'Professional'),
            ('enterprise', 'Enterprise'),
        ],
        default='free'
    )
    subscription_status = models.CharField(
        max_length=20,
        choices=[
            ('trial', 'Trial'),
            ('active', 'Active'),
            ('past_due', 'Past Due'),
            ('cancelled', 'Cancelled'),
            ('suspended', 'Suspended'),
        ],
        default='trial'
    )
    trial_ends_at = models.DateTimeField(null=True, blank=True)

    # Limits
    max_users = models.IntegerField(default=5)
    max_storage_gb = models.IntegerField(default=10)
    max_documents = models.IntegerField(default=1000)

    # Settings
    is_active = models.BooleanField(default=True)
    allowed_domains = models.JSONField(
        default=list,
        help_text="Additional allowed email domains for this org"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'users.CustomUser',
        null=True,
        on_delete=models.SET_NULL,
        related_name='created_organizations'
    )

    class Meta:
        db_table = 'organizations'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['domain']),
            models.Index(fields=['slug']),
            models.Index(fields=['subscription_status']),
        ]

    def __str__(self):
        return f"{self.name} ({self.domain})"

    @property
    def is_trial(self):
        """Check if organization is in trial period."""
        if self.trial_ends_at and timezone.now() < self.trial_ends_at:
            return True
        return False

    @property
    def trial_days_remaining(self):
        """Get remaining trial days."""
        if self.trial_ends_at:
            delta = self.trial_ends_at - timezone.now()
            return max(0, delta.days)
        return 0

    def is_within_limits(self):
        """Check if organization is within subscription limits."""
        from apps.users.models import CustomUser
        from apps.documents.models import Document

        user_count = CustomUser.objects.filter(organization=self).count()
        doc_count = Document.objects.filter(organization=self).count()
        # Storage check would go here

        return {
            'users': user_count <= self.max_users,
            'documents': doc_count <= self.max_documents,
            'within_limits': (user_count <= self.max_users and
                            doc_count <= self.max_documents)
        }


class OrganizationInvitation(models.Model):
    """
    Invitation system for users to join organizations.
    Organization admins send invitations, users accept to join.
    """

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='invitations'
    )
    email = models.EmailField(validators=[validate_email])

    # Invitation Details
    invited_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.CASCADE,
        related_name='sent_invitations'
    )
    role = models.CharField(
        max_length=50,
        choices=[
            ('admin', 'Organization Admin'),
            ('manager', 'Manager'),
            ('member', 'Member'),
            ('viewer', 'Viewer'),
        ],
        default='member'
    )

    # Token & Status
    token = models.CharField(max_length=64, unique=True, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('accepted', 'Accepted'),
            ('declined', 'Declined'),
            ('expired', 'Expired'),
            ('revoked', 'Revoked'),
        ],
        default='pending'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'organization_invitations'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['email', 'status']),
            models.Index(fields=['organization', 'status']),
        ]
        unique_together = [['organization', 'email', 'status']]

    def __str__(self):
        return f"Invitation for {self.email} to {self.organization.name}"

    @classmethod
    def create_invitation(cls, organization, email, invited_by, role='member'):
        """Create a new invitation with secure token."""
        token = secrets.token_urlsafe(48)
        expires_at = timezone.now() + timedelta(days=7)

        # Revoke any pending invitations for same email
        cls.objects.filter(
            organization=organization,
            email=email,
            status='pending'
        ).update(status='revoked')

        return cls.objects.create(
            organization=organization,
            email=email,
            invited_by=invited_by,
            role=role,
            token=token,
            expires_at=expires_at
        )

    @property
    def is_valid(self):
        """Check if invitation is still valid."""
        return (
            self.status == 'pending' and
            timezone.now() < self.expires_at
        )

    def accept(self, user):
        """Accept invitation and add user to organization."""
        if not self.is_valid:
            raise ValueError("Invitation is not valid")

        self.status = 'accepted'
        self.accepted_at = timezone.now()
        self.save()

        # Update user's organization
        user.organization = self.organization
        user.save()

        return user


class OrganizationMember(models.Model):
    """
    Tracks organization membership and roles.
    Links users to organizations with specific roles.
    """

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='members'
    )
    user = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.CASCADE,
        related_name='organization_memberships'
    )

    role = models.CharField(
        max_length=50,
        choices=[
            ('owner', 'Owner'),           # First user, full control
            ('admin', 'Administrator'),    # Can manage users and settings
            ('manager', 'Manager'),        # Can manage content
            ('member', 'Member'),          # Standard user
            ('viewer', 'Viewer'),          # Read-only
        ],
        default='member'
    )

    # Permissions
    can_invite_users = models.BooleanField(default=False)
    can_manage_billing = models.BooleanField(default=False)
    can_manage_settings = models.BooleanField(default=False)

    # Status
    is_active = models.BooleanField(default=True)
    joined_at = models.DateTimeField(auto_now_add=True)
    last_active_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'organization_members'
        unique_together = [['organization', 'user']]
        indexes = [
            models.Index(fields=['organization', 'role']),
            models.Index(fields=['user', 'is_active']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.role} at {self.organization.name}"
```

### 1.2 Update CustomUser Model

```python
# apps/users/models.py

class CustomUser(AbstractUser):
    """Extended user model with multi-tenant organization support."""

    # REMOVE: Hard-coded domain validation
    # OLD: validators=[EmailValidator(), validate_company_email]

    # ADD: Organization relationship
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.PROTECT,  # Don't allow deleting org with users
        related_name='users',
        help_text='Organization this user belongs to'
    )

    employee_id = models.CharField(max_length=50)  # Remove unique=True
    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name='employees'
    )

    # Contact Information
    email = models.EmailField(
        unique=True,  # Still globally unique
        validators=[EmailValidator(), validate_business_email],  # NEW validator
        help_text='Business email address'
    )

    # ... rest of fields remain the same ...

    class Meta:
        db_table = 'users'
        # ADD: Unique together for employee_id per organization
        unique_together = [['organization', 'employee_id']]
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['organization', 'is_active']),  # NEW
            models.Index(fields=['employee_id']),
        ]

    @property
    def is_organization_admin(self):
        """Check if user has admin role in their organization."""
        try:
            membership = self.organization_memberships.get(organization=self.organization)
            return membership.role in ['owner', 'admin']
        except:
            return False
```

### 1.3 New Email Validator

```python
# apps/users/validators.py

from django.core.exceptions import ValidationError

BLOCKED_EMAIL_DOMAINS = [
    # Free email providers
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
    'aol.com', 'mail.com', 'protonmail.com', 'icloud.com',
    # Temporary email services
    'tempmail.com', '10minutemail.com', 'guerrillamail.com',
]

def validate_business_email(value):
    """
    Validate that email is a business email (not personal/free provider).
    Also checks if domain is allowed for an existing organization.
    """
    from apps.organizations.models import Organization

    email_lower = value.lower()
    domain = email_lower.split('@')[1]

    # Block free email providers
    if domain in BLOCKED_EMAIL_DOMAINS:
        raise ValidationError(
            'Please use your business or company email address. '
            'Free email providers (Gmail, Yahoo, etc.) are not allowed.'
        )

    # Check if domain belongs to an existing organization
    org = Organization.objects.filter(domain=domain, is_active=True).first()
    if org:
        # Domain is registered - this is allowed
        return

    # Check if email domain is in allowed_domains of any org
    orgs_with_domain = Organization.objects.filter(
        allowed_domains__contains=[domain],
        is_active=True
    )
    if orgs_with_domain.exists():
        return

    # New domain - will create new organization during registration
    # Validate domain format (basic check)
    if len(domain.split('.')) < 2:
        raise ValidationError('Invalid email domain')

    return
```

### 1.4 Create Organizations App

```bash
# Create new Django app
python manage.py startapp organizations
```

```python
# apps/organizations/apps.py

from django.apps import AppConfig

class OrganizationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.organizations'
    verbose_name = 'Organizations'

    def ready(self):
        import apps.organizations.signals
```

### 1.5 Update Settings

```python
# config/settings/base.py

INSTALLED_APPS = [
    # ... existing apps ...
    'apps.organizations',  # ADD THIS - before 'apps.users'
    'apps.users',
    # ...
]

# Multi-tenancy settings
MULTI_TENANT_ENABLED = True
DEFAULT_TRIAL_DAYS = 14
DEFAULT_FREE_PLAN_LIMITS = {
    'max_users': 5,
    'max_storage_gb': 10,
    'max_documents': 1000,
}
```

---

## Phase 2: Invitation System

**Duration**: 3-4 hours
**Priority**: High

### 2.1 Invitation Serializers

```python
# apps/organizations/serializers.py

from rest_framework import serializers
from apps.organizations.models import Organization, OrganizationInvitation, OrganizationMember
from apps.users.serializers import UserListSerializer

class OrganizationSerializer(serializers.ModelSerializer):
    """Full organization serializer."""

    member_count = serializers.SerializerMethodField()
    document_count = serializers.SerializerMethodField()
    storage_used_gb = serializers.SerializerMethodField()
    is_within_limits = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'domain', 'slug',
            'subscription_plan', 'subscription_status',
            'trial_ends_at', 'is_trial', 'trial_days_remaining',
            'max_users', 'max_storage_gb', 'max_documents',
            'member_count', 'document_count', 'storage_used_gb',
            'is_active', 'is_within_limits',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['slug', 'created_at', 'updated_at']

    def get_member_count(self, obj):
        return obj.users.filter(is_active=True).count()

    def get_document_count(self, obj):
        from apps.documents.models import Document
        return Document.objects.filter(organization=obj).count()

    def get_storage_used_gb(self, obj):
        # Calculate actual storage used
        from apps.documents.models import Document
        from django.db.models import Sum
        total_bytes = Document.objects.filter(organization=obj).aggregate(
            total=Sum('file_size')
        )['total'] or 0
        return round(total_bytes / (1024**3), 2)  # Convert to GB

    def get_is_within_limits(self, obj):
        return obj.is_within_limits()


class InvitationSerializer(serializers.ModelSerializer):
    """Serializer for sending invitations."""

    invited_by_name = serializers.CharField(source='invited_by.full_name', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)

    class Meta:
        model = OrganizationInvitation
        fields = [
            'id', 'email', 'role', 'status',
            'invited_by_name', 'organization_name',
            'created_at', 'expires_at', 'is_valid'
        ]
        read_only_fields = ['status', 'created_at', 'expires_at']

    def validate_email(self, value):
        """Validate invitation email."""
        organization = self.context.get('organization')

        # Check if user already exists in organization
        from apps.users.models import CustomUser
        if CustomUser.objects.filter(
            email=value,
            organization=organization
        ).exists():
            raise serializers.ValidationError(
                "User with this email is already in the organization"
            )

        # Check if there's already a pending invitation
        if OrganizationInvitation.objects.filter(
            organization=organization,
            email=value,
            status='pending'
        ).exists():
            raise serializers.ValidationError(
                "An invitation has already been sent to this email"
            )

        return value

    def create(self, validated_data):
        """Create invitation with token."""
        organization = self.context['organization']
        invited_by = self.context['request'].user

        return OrganizationInvitation.create_invitation(
            organization=organization,
            email=validated_data['email'],
            invited_by=invited_by,
            role=validated_data.get('role', 'member')
        )


class AcceptInvitationSerializer(serializers.Serializer):
    """Serializer for accepting invitations."""

    token = serializers.CharField(required=True)
    password = serializers.CharField(write_only=True, required=True)
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)

    def validate_token(self, value):
        """Validate invitation token."""
        try:
            invitation = OrganizationInvitation.objects.get(token=value)
            if not invitation.is_valid:
                raise serializers.ValidationError("Invitation has expired or is invalid")
            self.context['invitation'] = invitation
            return value
        except OrganizationInvitation.DoesNotExist:
            raise serializers.ValidationError("Invalid invitation token")

    def create(self, validated_data):
        """Create user and accept invitation."""
        from apps.users.models import CustomUser

        invitation = self.context['invitation']

        # Extract domain from email
        domain = invitation.email.split('@')[1]

        # Create user
        user = CustomUser.objects.create_user(
            username=invitation.email.split('@')[0],
            email=invitation.email,
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            organization=invitation.organization,
            employee_id=f"EMP{CustomUser.objects.filter(organization=invitation.organization).count() + 1:04d}",
            # You'll need to handle department assignment
        )

        # Accept invitation
        invitation.accept(user)

        # Create organization membership
        OrganizationMember.objects.create(
            organization=invitation.organization,
            user=user,
            role=invitation.role,
            can_invite_users=(invitation.role in ['owner', 'admin']),
            can_manage_billing=(invitation.role == 'owner'),
            can_manage_settings=(invitation.role in ['owner', 'admin'])
        )

        return user


class OrganizationMemberSerializer(serializers.ModelSerializer):
    """Serializer for organization members."""

    user = UserListSerializer(read_only=True)

    class Meta:
        model = OrganizationMember
        fields = [
            'id', 'user', 'role',
            'can_invite_users', 'can_manage_billing', 'can_manage_settings',
            'is_active', 'joined_at', 'last_active_at'
        ]
```

### 2.2 Invitation Views

```python
# apps/organizations/views.py

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string

from apps.organizations.models import Organization, OrganizationInvitation, OrganizationMember
from apps.organizations.serializers import (
    OrganizationSerializer,
    InvitationSerializer,
    AcceptInvitationSerializer,
    OrganizationMemberSerializer
)
from apps.organizations.permissions import IsOrganizationAdmin


class OrganizationDetailView(RetrieveAPIView):
    """Get current user's organization details."""

    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user.organization


class SendInvitationView(APIView):
    """
    POST /api/v1/organizations/invitations/send/

    Send invitation to join organization.
    Only organization admins can send invitations.
    """

    permission_classes = [IsAuthenticated, IsOrganizationAdmin]

    def post(self, request):
        organization = request.user.organization

        # Check organization limits
        limits = organization.is_within_limits()
        if not limits['users']:
            return Response({
                'success': False,
                'message': f'Organization has reached maximum user limit ({organization.max_users}). Please upgrade your plan.'
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer = InvitationSerializer(
            data=request.data,
            context={'organization': organization, 'request': request}
        )

        if not serializer.is_valid():
            return Response({
                'success': False,
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        invitation = serializer.save()

        # Send invitation email
        self.send_invitation_email(invitation)

        # Log audit event
        from apps.audit.utils import log_audit_event
        log_audit_event(
            user=request.user,
            action='invitation_sent',
            resource_type='organization_invitation',
            resource_id=str(invitation.id),
            outcome='success',
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT'),
            details={
                'email': invitation.email,
                'role': invitation.role,
                'organization': organization.name
            }
        )

        return Response({
            'success': True,
            'message': f'Invitation sent to {invitation.email}',
            'data': InvitationSerializer(invitation).data
        }, status=status.HTTP_201_CREATED)

    def send_invitation_email(self, invitation):
        """Send invitation email to user."""

        # Build invitation URL
        invitation_url = f"{settings.FRONTEND_URL}/accept-invitation?token={invitation.token}"

        # Render email template
        html_message = render_to_string('emails/organization_invitation.html', {
            'invitation': invitation,
            'invitation_url': invitation_url,
            'organization': invitation.organization,
            'invited_by': invitation.invited_by,
        })

        # Send email
        send_mail(
            subject=f'Invitation to join {invitation.organization.name} on DFC',
            message=f'''
You've been invited to join {invitation.organization.name} on the Digital Filing Cabinet platform.

Click the link below to accept the invitation:
{invitation_url}

This invitation expires in 7 days.
            ''',
            html_message=html_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[invitation.email],
            fail_silently=False,
        )


class AcceptInvitationView(APIView):
    """
    POST /api/v1/organizations/invitations/accept/

    Accept invitation and create user account.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = AcceptInvitationSerializer(data=request.data)

        if not serializer.is_valid():
            return Response({
                'success': False,
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.save()

        # Generate JWT tokens
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)

        return Response({
            'success': True,
            'message': 'Invitation accepted successfully',
            'data': {
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'full_name': user.full_name,
                    'organization': user.organization.name
                },
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }
        }, status=status.HTTP_201_CREATED)


class ListInvitationsView(ListAPIView):
    """
    GET /api/v1/organizations/invitations/

    List all invitations for current organization.
    """

    serializer_class = InvitationSerializer
    permission_classes = [IsAuthenticated, IsOrganizationAdmin]

    def get_queryset(self):
        return OrganizationInvitation.objects.filter(
            organization=self.request.user.organization
        ).select_related('invited_by', 'organization')


class RevokeInvitationView(APIView):
    """
    POST /api/v1/organizations/invitations/{id}/revoke/

    Revoke a pending invitation.
    """

    permission_classes = [IsAuthenticated, IsOrganizationAdmin]

    def post(self, request, invitation_id):
        try:
            invitation = OrganizationInvitation.objects.get(
                id=invitation_id,
                organization=request.user.organization
            )

            if invitation.status != 'pending':
                return Response({
                    'success': False,
                    'message': 'Can only revoke pending invitations'
                }, status=status.HTTP_400_BAD_REQUEST)

            invitation.status = 'revoked'
            invitation.save()

            return Response({
                'success': True,
                'message': 'Invitation revoked successfully'
            })

        except OrganizationInvitation.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Invitation not found'
            }, status=status.HTTP_404_NOT_FOUND)


class ListOrganizationMembersView(ListAPIView):
    """
    GET /api/v1/organizations/members/

    List all members in current organization.
    """

    serializer_class = OrganizationMemberSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return OrganizationMember.objects.filter(
            organization=self.request.user.organization,
            is_active=True
        ).select_related('user', 'organization')
```

### 2.3 Permissions

```python
# apps/organizations/permissions.py

from rest_framework.permissions import BasePermission

class IsOrganizationAdmin(BasePermission):
    """
    Permission class to check if user is organization admin.
    """

    message = "You must be an organization administrator to perform this action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        return request.user.is_organization_admin


class IsOrganizationOwner(BasePermission):
    """
    Permission class to check if user is organization owner.
    """

    message = "You must be the organization owner to perform this action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        try:
            membership = request.user.organization_memberships.get(
                organization=request.user.organization
            )
            return membership.role == 'owner'
        except:
            return False
```

### 2.4 Email Templates

```html
<!-- apps/organizations/templates/emails/organization_invitation.html -->

<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invitation to {{ organization.name }}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>You're Invited!</h2>

        <p>Hello,</p>

        <p>
            <strong>{{ invited_by.full_name }}</strong> has invited you to join
            <strong>{{ organization.name }}</strong> on the Digital Filing Cabinet platform.
        </p>

        <p>
            As a <strong>{{ invitation.get_role_display }}</strong>, you'll be able to:
        </p>

        <ul>
            {% if invitation.role == 'admin' %}
            <li>Manage organization settings</li>
            <li>Invite and manage users</li>
            <li>Access all documents and folders</li>
            {% elif invitation.role == 'manager' %}
            <li>Create and manage documents</li>
            <li>Create and organize folders</li>
            <li>Collaborate with team members</li>
            {% else %}
            <li>Access assigned documents</li>
            <li>Collaborate with your team</li>
            {% endif %}
        </ul>

        <div style="text-align: center; margin: 30px 0;">
            <a href="{{ invitation_url }}"
               style="background-color: #007bff; color: white; padding: 12px 30px;
                      text-decoration: none; border-radius: 5px; display: inline-block;">
                Accept Invitation
            </a>
        </div>

        <p style="color: #666; font-size: 14px;">
            This invitation expires on {{ invitation.expires_at|date:"F d, Y" }}.
        </p>

        <p style="color: #666; font-size: 14px;">
            If you didn't expect this invitation, you can safely ignore this email.
        </p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

        <p style="color: #999; font-size: 12px;">
            Digital Filing Cabinet - Secure Document Management
        </p>
    </div>
</body>
</html>
```

---

## Phase 3: Data Isolation & Tenant Filtering

**Duration**: 5-6 hours
**Priority**: Critical

### 3.1 Add Organization FK to All Models

This is the most critical and time-consuming phase. Every model that stores tenant-specific data needs an organization foreign key.

#### Documents Model

```python
# apps/documents/models.py

class Document(models.Model):
    """Document model with multi-tenant support."""

    # ADD THIS - CRITICAL
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='documents',
        help_text='Organization this document belongs to'
    )

    # ... rest of fields ...

    class Meta:
        db_table = 'documents'
        indexes = [
            # ADD organization to all indexes
            models.Index(fields=['organization', '-uploaded_at']),
            models.Index(fields=['organization', 'folder']),
            models.Index(fields=['organization', 'uploaded_by']),
            # ... other indexes ...
        ]
```

#### Folders Model

```python
# apps/folders/models.py

class Folder(models.Model):
    """Folder model with multi-tenant support."""

    # ADD THIS
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='folders'
    )

    # ... rest of fields ...

    class Meta:
        db_table = 'folders'
        # IMPORTANT: Path is only unique within organization
        unique_together = [['organization', 'path']]
        indexes = [
            models.Index(fields=['organization', 'parent']),
            models.Index(fields=['organization', 'department']),
        ]
```

#### Audit Log Model

```python
# apps/audit/models.py

class AuditLog(models.Model):
    """Audit log with multi-tenant support."""

    # ADD THIS
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='audit_logs',
        null=True  # Nullable for system-level logs
    )

    # ... rest of fields ...

    class Meta:
        db_table = 'audit_logs'
        indexes = [
            models.Index(fields=['organization', '-timestamp']),
            models.Index(fields=['organization', 'user']),
        ]
```

### 3.2 Tenant-Aware Middleware

```python
# apps/organizations/middleware.py

from django.utils.deprecation import MiddlewareMixin
from apps.organizations.models import Organization

class TenantMiddleware(MiddlewareMixin):
    """
    Middleware to set current organization in thread-local storage.
    Enables automatic tenant filtering in models.
    """

    def process_request(self, request):
        """Set current organization from authenticated user."""

        if request.user.is_authenticated:
            # Set organization in thread-local
            from apps.organizations.utils import set_current_organization
            set_current_organization(request.user.organization)

        return None

    def process_response(self, request, response):
        """Clear organization from thread-local."""

        from apps.organizations.utils import clear_current_organization
        clear_current_organization()

        return response
```

```python
# apps/organizations/utils.py

import threading

_thread_locals = threading.local()

def set_current_organization(organization):
    """Set current organization in thread-local storage."""
    _thread_locals.organization = organization

def get_current_organization():
    """Get current organization from thread-local storage."""
    return getattr(_thread_locals, 'organization', None)

def clear_current_organization():
    """Clear current organization from thread-local storage."""
    if hasattr(_thread_locals, 'organization'):
        delattr(_thread_locals, 'organization')
```

### 3.3 Tenant-Aware Model Manager

```python
# apps/core/managers.py

from django.db import models
from apps.organizations.utils import get_current_organization

class TenantManager(models.Manager):
    """
    Custom manager that automatically filters by current organization.

    Usage:
        class Document(models.Model):
            objects = TenantManager()
            all_objects = models.Manager()  # Unfiltered access
    """

    def get_queryset(self):
        """Filter queryset by current organization."""
        queryset = super().get_queryset()

        organization = get_current_organization()
        if organization:
            return queryset.filter(organization=organization)

        return queryset


class TenantAwareModel(models.Model):
    """
    Abstract base model for all tenant-aware models.
    """

    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        editable=False
    )

    objects = TenantManager()
    all_objects = models.Manager()  # Unfiltered access (use carefully!)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        """Auto-set organization from thread-local if not set."""
        if not self.organization_id:
            organization = get_current_organization()
            if organization:
                self.organization = organization
            else:
                raise ValueError("No organization set. Cannot save tenant-aware model.")

        super().save(*args, **kwargs)
```

### 3.4 Update All ViewSets

```python
# apps/documents/views.py

class DocumentViewSet(ModelViewSet):
    """Document CRUD with automatic tenant filtering."""

    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter documents by user's organization."""
        # TenantManager handles this automatically!
        return Document.objects.select_related(
            'uploaded_by',
            'folder',
            'organization'
        ).prefetch_related('tags')

    def perform_create(self, serializer):
        """Set organization on create."""
        serializer.save(
            uploaded_by=self.request.user,
            organization=self.request.user.organization
        )
```

---

## Phase 4: Authentication & Authorization

**Duration**: 2-3 hours
**Priority**: High

### 4.1 Update Registration Flow

```python
# apps/users/views.py

class RegisterView(APIView):
    """
    POST /api/v1/auth/register/

    Register new user - creates organization if first user from domain.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').lower()
        domain = email.split('@')[1]

        # Check if organization exists
        organization = Organization.objects.filter(domain=domain).first()

        if not organization:
            # First user from this domain - create organization
            organization = Organization.objects.create(
                name=f"{domain.split('.')[0].title()} Organization",
                domain=domain,
                slug=domain.replace('.', '-'),
                subscription_plan='free',
                subscription_status='trial',
                trial_ends_at=timezone.now() + timedelta(days=14)
            )
            is_first_user = True
        else:
            # Organization exists - check if user was invited
            invitation = OrganizationInvitation.objects.filter(
                organization=organization,
                email=email,
                status='pending'
            ).first()

            if not invitation:
                return Response({
                    'success': False,
                    'message': 'You must be invited to join this organization. '
                              'Please contact your administrator.'
                }, status=status.HTTP_403_FORBIDDEN)

            is_first_user = False

        # Create user
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'success': False,
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.save(organization=organization)

        # Create organization membership
        OrganizationMember.objects.create(
            organization=organization,
            user=user,
            role='owner' if is_first_user else 'member',
            can_invite_users=is_first_user,
            can_manage_billing=is_first_user,
            can_manage_settings=is_first_user
        )

        # If first user, update organization.created_by
        if is_first_user:
            organization.created_by = user
            organization.save()

        # Generate JWT tokens
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)

        return Response({
            'success': True,
            'message': 'Registration successful',
            'data': {
                'user': UserSerializer(user).data,
                'organization': OrganizationSerializer(organization).data,
                'is_first_user': is_first_user,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }
        }, status=status.HTTP_201_CREATED)
```

### 4.2 Update JWT Claims

```python
# apps/users/serializers.py

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT serializer with organization data."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims
        token['organization_id'] = user.organization.id
        token['organization_name'] = user.organization.name
        token['organization_domain'] = user.organization.domain
        token['is_org_admin'] = user.is_organization_admin

        return token
```

---

**(Continued in next response due to length...)**

Would you like me to continue with:
- Phase 5: Admin Interface & Management
- Phase 6: Testing & Validation
- Migration Strategy
- Security Considerations
- Scalability Roadmap

Or would you prefer me to create this as a complete file you can review?