"""
Comprehensive multi-tenant tests for organization isolation.

Tests cover:
1. Organization model functionality
2. User registration with auto-create/join organization
3. Data isolation between organizations
4. Invitation system
5. Organization membership and roles
6. API endpoint security
7. JWT token organization claims
"""
from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from datetime import timedelta
import uuid

from apps.organizations.models import Organization, OrganizationMember, OrganizationInvitation
from apps.users.models import Department
from apps.folders.models import Folder
from apps.documents.models import Document

User = get_user_model()


class OrganizationModelTest(TestCase):
    """Test Organization model functionality"""

    def setUp(self):
        self.org = Organization.objects.create(
            name="Test Company",
            domain="testcompany.com",
            subscription_plan="professional",
            subscription_status="active"
        )

    def test_organization_creation(self):
        """Test organization is created with correct attributes"""
        self.assertEqual(self.org.name, "Test Company")
        self.assertEqual(self.org.domain, "testcompany.com")
        self.assertEqual(self.org.subscription_plan, "professional")
        self.assertTrue(self.org.is_active)

    def test_organization_slug_generation(self):
        """Test slug is auto-generated from name"""
        self.assertEqual(self.org.slug, "test-company")

    def test_subscription_display(self):
        """Test subscription display property"""
        self.assertIn("Professional", self.org.subscription_display)

    def test_current_user_count(self):
        """Test user count is calculated correctly"""
        # Create users in this organization
        dept = Department.objects.create(
            name="IT", code="IT", organization=self.org
        )
        user1 = User.objects.create_user(
            username="user1",
            email="user1@testcompany.com",
            password="TestPass123!",
            organization=self.org,
            department=dept
        )
        user2 = User.objects.create_user(
            username="user2",
            email="user2@testcompany.com",
            password="TestPass123!",
            organization=self.org,
            department=dept
        )

        self.assertEqual(self.org.current_user_count, 2)

    def test_can_add_users(self):
        """Test max user limit check"""
        self.org.max_users = 2
        self.org.save()

        dept = Department.objects.create(
            name="IT", code="IT", organization=self.org
        )

        # Add 2 users
        User.objects.create_user(
            username="user1",
            email="user1@testcompany.com",
            password="TestPass123!",
            organization=self.org,
            department=dept
        )
        User.objects.create_user(
            username="user2",
            email="user2@testcompany.com",
            password="TestPass123!",
            organization=self.org,
            department=dept
        )

        # Should not be able to add more
        self.assertFalse(self.org.can_add_users)

    def test_trial_expiration(self):
        """Test trial expiration logic"""
        self.org.subscription_status = "trial"
        self.org.trial_ends_at = timezone.now() - timedelta(days=1)
        self.org.save()

        self.assertTrue(self.org.is_trial_expired)


class OrganizationMemberTest(TestCase):
    """Test OrganizationMember model and permissions"""

    def setUp(self):
        self.org = Organization.objects.create(
            name="Test Company",
            domain="testcompany.com"
        )
        self.dept = Department.objects.create(
            name="IT", code="IT", organization=self.org
        )
        self.user = User.objects.create_user(
            username="testuser",
            email="testuser@testcompany.com",
            password="TestPass123!",
            organization=self.org,
            department=self.dept
        )

    def test_owner_permissions(self):
        """Test owner role has all permissions"""
        member = OrganizationMember.objects.create(
            user=self.user,
            organization=self.org,
            role="owner"
        )

        self.assertTrue(member.is_owner)
        self.assertTrue(member.is_admin_or_owner)
        self.assertTrue(member.can_invite_users)
        self.assertTrue(member.can_manage_members)

    def test_admin_permissions(self):
        """Test admin role permissions"""
        member = OrganizationMember.objects.create(
            user=self.user,
            organization=self.org,
            role="admin"
        )

        self.assertFalse(member.is_owner)
        self.assertTrue(member.is_admin_or_owner)
        self.assertTrue(member.can_invite_users)
        self.assertTrue(member.can_manage_members)

    def test_member_permissions(self):
        """Test member role has limited permissions"""
        member = OrganizationMember.objects.create(
            user=self.user,
            organization=self.org,
            role="member"
        )

        self.assertFalse(member.is_owner)
        self.assertFalse(member.is_admin_or_owner)
        self.assertFalse(member.can_invite_users)
        self.assertFalse(member.can_manage_members)

    def test_viewer_permissions(self):
        """Test viewer role has minimal permissions"""
        member = OrganizationMember.objects.create(
            user=self.user,
            organization=self.org,
            role="viewer"
        )

        self.assertFalse(member.can_invite_users)
        self.assertFalse(member.can_manage_members)


class OrganizationInvitationTest(TestCase):
    """Test invitation system"""

    def setUp(self):
        self.org = Organization.objects.create(
            name="Test Company",
            domain="testcompany.com"
        )
        self.dept = Department.objects.create(
            name="IT", code="IT", organization=self.org
        )
        self.inviter = User.objects.create_user(
            username="inviter",
            email="inviter@testcompany.com",
            password="TestPass123!",
            organization=self.org,
            department=self.dept
        )

    def test_invitation_creation(self):
        """Test invitation is created with valid token"""
        invitation = OrganizationInvitation.create_invitation(
            organization=self.org,
            email="newuser@testcompany.com",
            invited_by=self.inviter,
            role="member"
        )

        self.assertEqual(invitation.email, "newuser@testcompany.com")
        self.assertEqual(invitation.status, "pending")
        self.assertTrue(invitation.is_valid)
        self.assertIsNotNone(invitation.token)
        self.assertEqual(len(invitation.token), 64)

    def test_invitation_domain_validation(self):
        """Test invitation validates email domain"""
        self.assertEqual(
            OrganizationInvitation.create_invitation(
                organization=self.org,
                email="newuser@testcompany.com",
                invited_by=self.inviter
            ).invited_domain,
            "testcompany.com"
        )

    def test_invitation_expiration(self):
        """Test invitation expires after 7 days"""
        invitation = OrganizationInvitation.create_invitation(
            organization=self.org,
            email="newuser@testcompany.com",
            invited_by=self.inviter
        )

        # Fast-forward time
        invitation.expires_at = timezone.now() - timedelta(hours=1)
        invitation.save()

        self.assertTrue(invitation.is_expired)
        self.assertFalse(invitation.is_valid)

    def test_invitation_acceptance(self):
        """Test invitation can be accepted"""
        invitation = OrganizationInvitation.create_invitation(
            organization=self.org,
            email="newuser@testcompany.com",
            invited_by=self.inviter,
            role="member"
        )

        new_user = User.objects.create_user(
            username="newuser",
            email="newuser@testcompany.com",
            password="TestPass123!",
            organization=self.org,
            department=self.dept
        )

        membership = invitation.accept(new_user)

        self.assertIsNotNone(membership)
        self.assertEqual(membership.user, new_user)
        self.assertEqual(membership.role, "member")
        self.assertEqual(invitation.status, "accepted")


class DataIsolationTest(TransactionTestCase):
    """Test data isolation between organizations"""

    def setUp(self):
        # Create two separate organizations
        self.org1 = Organization.objects.create(
            name="Company A",
            domain="companya.com"
        )
        self.org2 = Organization.objects.create(
            name="Company B",
            domain="companyb.com"
        )

        # Create departments for each organization
        self.dept1 = Department.objects.create(
            name="IT", code="IT", organization=self.org1
        )
        self.dept2 = Department.objects.create(
            name="IT", code="IT", organization=self.org2
        )

        # Create users for each organization
        self.user1 = User.objects.create_user(
            username="user1",
            email="user1@companya.com",
            password="TestPass123!",
            organization=self.org1,
            department=self.dept1
        )
        self.user2 = User.objects.create_user(
            username="user2",
            email="user2@companyb.com",
            password="TestPass123!",
            organization=self.org2,
            department=self.dept2
        )

    def test_department_isolation(self):
        """Test departments are isolated by organization"""
        org1_depts = Department.objects.filter(organization=self.org1)
        org2_depts = Department.objects.filter(organization=self.org2)

        self.assertEqual(org1_depts.count(), 1)
        self.assertEqual(org2_depts.count(), 1)
        self.assertNotEqual(org1_depts.first(), org2_depts.first())

    def test_folder_isolation(self):
        """Test folders are isolated by organization"""
        folder1 = Folder.objects.create(
            name="Org1 Folder",
            organization=self.org1,
            created_by=self.user1
        )
        folder2 = Folder.objects.create(
            name="Org2 Folder",
            organization=self.org2,
            created_by=self.user2
        )

        org1_folders = Folder.objects.filter(organization=self.org1)
        org2_folders = Folder.objects.filter(organization=self.org2)

        self.assertEqual(org1_folders.count(), 1)
        self.assertEqual(org2_folders.count(), 1)
        self.assertIn(folder1, org1_folders)
        self.assertNotIn(folder1, org2_folders)

    def test_user_isolation(self):
        """Test users are isolated by organization"""
        org1_users = User.objects.filter(organization=self.org1)
        org2_users = User.objects.filter(organization=self.org2)

        self.assertEqual(org1_users.count(), 1)
        self.assertEqual(org2_users.count(), 1)
        self.assertIn(self.user1, org1_users)
        self.assertNotIn(self.user1, org2_users)


class UserRegistrationMultiTenantTest(APITestCase):
    """Test user registration with multi-tenant logic"""

    def setUp(self):
        self.client = APIClient()
        self.register_url = reverse('users:register')

        # Create a department for the default organization
        self.org = Organization.objects.create(
            name="CCC PLC",
            domain="cccplc.net"
        )
        self.dept = Department.objects.create(
            name="IT", code="IT", organization=self.org
        )

    def test_first_user_creates_organization(self):
        """Test first user from new domain creates organization as owner"""
        # Count organizations before
        org_count_before = Organization.objects.count()

        # Register first user with new domain
        response = self.client.post(self.register_url, {
            'username': 'firstuser',
            'email': 'firstuser@newcompany.com',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'first_name': 'First',
            'last_name': 'User',
            'department': self.dept.id
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify organization was created
        self.assertEqual(Organization.objects.count(), org_count_before + 1)

        # Verify organization details
        new_org = Organization.objects.get(domain="newcompany.com")
        self.assertEqual(new_org.name, "NEWCOMPANY")
        self.assertEqual(new_org.subscription_plan, "free")
        self.assertEqual(new_org.subscription_status, "trial")

        # Verify user is owner
        user = User.objects.get(username='firstuser')
        membership = OrganizationMember.objects.get(user=user)
        self.assertEqual(membership.role, "owner")
        self.assertTrue(membership.is_owner)

    def test_second_user_joins_existing_organization(self):
        """Test second user from same domain joins as member"""
        # Create organization and first user
        org = Organization.objects.create(
            name="Existing Company",
            domain="existingcompany.com"
        )
        dept = Department.objects.create(
            name="IT", code="IT", organization=org
        )
        first_user = User.objects.create_user(
            username='firstuser',
            email='firstuser@existingcompany.com',
            password='TestPass123!',
            organization=org,
            department=dept
        )
        OrganizationMember.objects.create(
            user=first_user,
            organization=org,
            role="owner"
        )

        org_count_before = Organization.objects.count()

        # Register second user with same domain
        response = self.client.post(self.register_url, {
            'username': 'seconduser',
            'email': 'seconduser@existingcompany.com',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'first_name': 'Second',
            'last_name': 'User',
            'department': dept.id
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify no new organization was created
        self.assertEqual(Organization.objects.count(), org_count_before)

        # Verify user joined existing organization as member
        user = User.objects.get(username='seconduser')
        self.assertEqual(user.organization, org)
        membership = OrganizationMember.objects.get(user=user)
        self.assertEqual(membership.role, "member")
        self.assertFalse(membership.is_owner)

    def test_free_email_rejected(self):
        """Test registration rejects free email providers"""
        response = self.client.post(self.register_url, {
            'username': 'testuser',
            'email': 'testuser@gmail.com',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
            'first_name': 'Test',
            'last_name': 'User',
            'department': self.dept.id
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)


class JWTOrganizationClaimsTest(APITestCase):
    """Test JWT tokens include organization claims"""

    def setUp(self):
        self.client = APIClient()
        self.login_url = reverse('users:login')

        # Create organization and user
        self.org = Organization.objects.create(
            name="Test Company",
            domain="testcompany.com",
            subscription_plan="professional",
            subscription_status="active"
        )
        self.dept = Department.objects.create(
            name="IT", code="IT", organization=self.org
        )
        self.user = User.objects.create_user(
            username="testuser",
            email="testuser@testcompany.com",
            password="TestPass123!",
            organization=self.org,
            department=self.dept
        )

    def test_jwt_contains_organization_claims(self):
        """Test JWT token contains organization information"""
        response = self.client.post(self.login_url, {
            'username': 'testuser',
            'password': 'TestPass123!'
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('user', response.data)

        # Verify organization claims in response
        user_data = response.data['user']
        self.assertEqual(user_data['organization_id'], str(self.org.id))
        self.assertEqual(user_data['organization_name'], "Test Company")
        self.assertEqual(user_data['organization_domain'], "testcompany.com")


class OrganizationAPITest(APITestCase):
    """Test organization API endpoints"""

    def setUp(self):
        self.client = APIClient()

        # Create organization
        self.org = Organization.objects.create(
            name="Test Company",
            domain="testcompany.com"
        )
        self.dept = Department.objects.create(
            name="IT", code="IT", organization=self.org
        )

        # Create owner user
        self.owner = User.objects.create_user(
            username="owner",
            email="owner@testcompany.com",
            password="TestPass123!",
            organization=self.org,
            department=self.dept
        )
        self.owner_membership = OrganizationMember.objects.create(
            user=self.owner,
            organization=self.org,
            role="owner"
        )

        # Create regular member
        self.member = User.objects.create_user(
            username="member",
            email="member@testcompany.com",
            password="TestPass123!",
            organization=self.org,
            department=self.dept
        )
        self.member_membership = OrganizationMember.objects.create(
            user=self.member,
            organization=self.org,
            role="member"
        )

    def test_organization_detail(self):
        """Test getting organization details"""
        self.client.force_authenticate(user=self.owner)
        url = reverse('organizations:organization-detail')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], "Test Company")
        self.assertEqual(response.data['domain'], "testcompany.com")

    def test_organization_members_list(self):
        """Test listing organization members"""
        self.client.force_authenticate(user=self.owner)
        url = reverse('organizations:organization-members')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_invitation_create_as_owner(self):
        """Test owner can create invitations"""
        self.client.force_authenticate(user=self.owner)
        url = reverse('organizations:invitation-create')

        response = self.client.post(url, {
            'email': 'newuser@testcompany.com',
            'role': 'member'
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertIn('invitation', response.data)

    def test_invitation_create_as_member_fails(self):
        """Test regular member cannot create invitations"""
        self.client.force_authenticate(user=self.member)
        url = reverse('organizations:invitation-create')

        response = self.client.post(url, {
            'email': 'newuser@testcompany.com',
            'role': 'member'
        })

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_organization_stats(self):
        """Test organization statistics endpoint"""
        self.client.force_authenticate(user=self.owner)
        url = reverse('organizations:organization-stats')

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_users', response.data)
        self.assertIn('total_documents', response.data)
        self.assertIn('total_folders', response.data)
        self.assertIn('storage_used_gb', response.data)
        self.assertEqual(response.data['total_users'], 2)
