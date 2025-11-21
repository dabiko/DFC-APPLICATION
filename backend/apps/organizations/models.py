"""
Organization models for multi-tenant SaaS architecture.

Implements:
- Organization (tenant entity with subscription management)
- OrganizationMember (user-organization relationship with roles)
- OrganizationInvitation (invitation system for user onboarding)
"""
import secrets
from datetime import timedelta
from django.db import models
from django.utils import timezone
from django.utils.text import slugify
from django.core.validators import MinValueValidator
from .validators import validate_business_email, extract_domain_from_email


class Organization(models.Model):
    """
    Multi-tenant organization model.
    Represents a company/business using the DFC system.
    """

    SUBSCRIPTION_PLANS = [
        ('free', 'Free Trial'),
        ('starter', 'Starter'),
        ('professional', 'Professional'),
        ('enterprise', 'Enterprise'),
    ]

    SUBSCRIPTION_STATUS_CHOICES = [
        ('trial', 'Trial'),
        ('active', 'Active'),
        ('past_due', 'Past Due'),
        ('cancelled', 'Cancelled'),
        ('suspended', 'Suspended'),
    ]

    # Organization Identity
    name = models.CharField(
        max_length=200,
        help_text="Organization/company name"
    )
    domain = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text="Email domain (e.g., cccplc.net)"
    )
    slug = models.SlugField(
        max_length=100,
        unique=True,
        blank=True,
        help_text="URL-friendly organization identifier"
    )

    # Company Details (from registration)
    registration_number = models.CharField(
        max_length=100,
        blank=True,
        help_text="Company registration number"
    )
    tax_id = models.CharField(
        max_length=100,
        blank=True,
        help_text="Tax identification number"
    )
    industry = models.CharField(
        max_length=100,
        blank=True,
        help_text="Industry/business sector"
    )
    country = models.CharField(
        max_length=100,
        blank=True,
        help_text="Country where organization is located"
    )

    # Subscription Management
    subscription_plan = models.CharField(
        max_length=50,
        choices=SUBSCRIPTION_PLANS,
        default='free',
        help_text="Current subscription plan"
    )
    subscription_status = models.CharField(
        max_length=20,
        choices=SUBSCRIPTION_STATUS_CHOICES,
        default='trial',
        help_text="Current subscription status"
    )

    # Resource Limits (based on subscription plan)
    max_users = models.IntegerField(
        default=5,
        validators=[MinValueValidator(1)],
        help_text="Maximum number of users allowed"
    )
    max_storage_gb = models.IntegerField(
        default=10,
        validators=[MinValueValidator(1)],
        help_text="Maximum storage in GB"
    )
    max_documents = models.IntegerField(
        default=1000,
        validators=[MinValueValidator(1)],
        help_text="Maximum number of documents allowed"
    )

    # Trial Management
    trial_ends_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the trial period ends"
    )

    # Status
    is_active = models.BooleanField(
        default=True,
        help_text="Whether organization is active"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'organizations'
        ordering = ['name']
        indexes = [
            models.Index(fields=['domain'], name='org_domain_idx'),
            models.Index(fields=['slug'], name='org_slug_idx'),
            models.Index(fields=['subscription_status'], name='org_sub_status_idx'),
            models.Index(fields=['created_at'], name='org_created_idx'),
        ]

    def __str__(self):
        return f"{self.name} ({self.domain})"

    def save(self, *args, **kwargs):
        """Auto-generate slug from name if not provided."""
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while Organization.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug

        # Set trial end date if not set and status is trial
        if self.subscription_status == 'trial' and not self.trial_ends_at:
            self.trial_ends_at = timezone.now() + timedelta(days=14)

        super().save(*args, **kwargs)

    @property
    def is_trial_expired(self):
        """Check if trial period has expired."""
        if self.subscription_status != 'trial':
            return False
        if not self.trial_ends_at:
            return False
        return timezone.now() > self.trial_ends_at

    @property
    def days_until_trial_expires(self):
        """Calculate days remaining in trial."""
        if not self.trial_ends_at:
            return None
        delta = self.trial_ends_at - timezone.now()
        return max(0, delta.days)

    @property
    def current_user_count(self):
        """Get current number of users in organization."""
        return self.members.filter(is_active=True).count()

    @property
    def can_add_users(self):
        """Check if organization can add more users."""
        return self.current_user_count < self.max_users

    @property
    def subscription_display(self):
        """Human-readable subscription info."""
        plan = dict(self.SUBSCRIPTION_PLANS).get(self.subscription_plan, 'Unknown')
        status = dict(self.SUBSCRIPTION_STATUS_CHOICES).get(self.subscription_status, 'Unknown')
        return f"{plan} ({status})"


class OrganizationMember(models.Model):
    """
    Junction table for User-Organization relationship with roles.
    Defines user's role and permissions within an organization.
    """

    ROLE_CHOICES = [
        ('owner', 'Owner'),
        ('admin', 'Admin'),
        ('manager', 'Manager'),
        ('member', 'Member'),
        ('viewer', 'Viewer'),
    ]

    organization = models.ForeignKey(
        'Organization',
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
        choices=ROLE_CHOICES,
        default='member',
        help_text="User's role within the organization"
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Whether membership is active"
    )

    # Timestamps
    joined_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'organization_members'
        unique_together = [['organization', 'user']]
        ordering = ['-joined_at']
        indexes = [
            models.Index(fields=['organization', 'user'], name='org_member_idx'),
            models.Index(fields=['role'], name='member_role_idx'),
            models.Index(fields=['is_active'], name='member_active_idx'),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.organization.name} ({self.role})"

    @property
    def is_owner(self):
        """Check if user is organization owner."""
        return self.role == 'owner'

    @property
    def is_admin_or_owner(self):
        """Check if user has admin privileges."""
        return self.role in ['owner', 'admin']

    @property
    def can_invite_users(self):
        """Check if user can invite others to organization."""
        return self.role in ['owner', 'admin', 'manager']

    @property
    def can_manage_members(self):
        """Check if user can manage organization members."""
        return self.role in ['owner', 'admin']


class OrganizationInvitation(models.Model):
    """
    Invitation system for users to join organizations.
    Ensures only users with matching domain can join.
    """

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
        ('expired', 'Expired'),
        ('revoked', 'Revoked'),
    ]

    organization = models.ForeignKey(
        'Organization',
        on_delete=models.CASCADE,
        related_name='invitations'
    )
    email = models.EmailField(
        validators=[validate_business_email],
        help_text="Email address to invite (must match organization domain)"
    )
    invited_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.CASCADE,
        related_name='sent_invitations'
    )
    role = models.CharField(
        max_length=50,
        choices=OrganizationMember.ROLE_CHOICES,
        default='member',
        help_text="Role to assign when invitation is accepted"
    )
    token = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        help_text="Secure invitation token"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(
        help_text="When the invitation expires (default: 7 days)"
    )
    accepted_at = models.DateTimeField(null=True, blank=True)
    declined_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'organization_invitations'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'email'], name='invite_org_email_idx'),
            models.Index(fields=['token'], name='invite_token_idx'),
            models.Index(fields=['status'], name='invite_status_idx'),
            models.Index(fields=['expires_at'], name='invite_expires_idx'),
        ]

    def __str__(self):
        return f"Invitation to {self.email} for {self.organization.name} ({self.status})"

    def save(self, *args, **kwargs):
        """Auto-generate token and set expiry if not provided."""
        if not self.token:
            self.token = secrets.token_urlsafe(48)

        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=7)

        super().save(*args, **kwargs)

    @property
    def is_expired(self):
        """Check if invitation has expired."""
        if self.status != 'pending':
            return False
        return timezone.now() > self.expires_at

    @property
    def is_valid(self):
        """Check if invitation is valid and can be accepted."""
        return self.status == 'pending' and not self.is_expired

    @property
    def invited_domain(self):
        """Extract domain from invited email."""
        return extract_domain_from_email(self.email)

    @property
    def matches_organization_domain(self):
        """Check if invited email matches organization domain."""
        return self.invited_domain == self.organization.domain

    def accept(self, user):
        """
        Accept the invitation and create organization membership.

        Args:
            user: CustomUser instance accepting the invitation

        Returns:
            OrganizationMember instance if successful, None otherwise
        """
        if not self.is_valid:
            return None

        # Verify email matches
        if user.email.lower() != self.email.lower():
            return None

        # Verify domain matches organization
        if not self.matches_organization_domain:
            return None

        # Create membership
        from apps.users.models import CustomUser
        membership, created = OrganizationMember.objects.get_or_create(
            organization=self.organization,
            user=user,
            defaults={'role': self.role}
        )

        # Update invitation status
        self.status = 'accepted'
        self.accepted_at = timezone.now()
        self.save()

        # Update user's organization
        user.organization = self.organization
        user.save()

        return membership

    def decline(self):
        """Decline the invitation."""
        if self.status == 'pending':
            self.status = 'declined'
            self.declined_at = timezone.now()
            self.save()

    def revoke(self):
        """Revoke the invitation (admin action)."""
        if self.status == 'pending':
            self.status = 'revoked'
            self.revoked_at = timezone.now()
            self.save()

    @classmethod
    def create_invitation(cls, organization, email, invited_by, role='member'):
        """
        Create a new invitation.

        Args:
            organization: Organization instance
            email: Email address to invite
            invited_by: CustomUser who is sending the invitation
            role: Role to assign (default: 'member')

        Returns:
            OrganizationInvitation instance

        Raises:
            ValidationError: If email domain doesn't match organization
        """
        from django.core.exceptions import ValidationError

        # Validate business email
        validate_business_email(email)

        # Verify domain matches organization
        invited_domain = extract_domain_from_email(email)
        if invited_domain != organization.domain:
            raise ValidationError(
                f"Email domain '{invited_domain}' does not match organization domain '{organization.domain}'. "
                f"Only users with @{organization.domain} emails can be invited."
            )

        # Check if user already exists in organization
        from apps.users.models import CustomUser
        existing_user = CustomUser.objects.filter(email__iexact=email).first()
        if existing_user and existing_user.organization == organization:
            raise ValidationError(
                f"User {email} is already a member of {organization.name}."
            )

        # Check for existing pending invitation
        existing_invitation = cls.objects.filter(
            organization=organization,
            email__iexact=email,
            status='pending'
        ).first()

        if existing_invitation and existing_invitation.is_valid:
            raise ValidationError(
                f"An active invitation has already been sent to {email}."
            )

        # Create invitation
        invitation = cls.objects.create(
            organization=organization,
            email=email.lower(),
            invited_by=invited_by,
            role=role
        )

        return invitation
