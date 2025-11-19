"""
Test cases for sharing models.

Tests:
- Share model methods and properties
- ShareAccess model
- Token generation and uniqueness
- Password protection
- Expiration logic
- Permission checks
"""

from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from datetime import timedelta
from apps.sharing.models import Share, ShareAccess
from apps.documents.models import Document
from apps.folders.models import Folder
from apps.users.models import Department

User = get_user_model()


class ShareModelTest(TestCase):
    """Test cases for Share model"""

    def setUp(self):
        """Set up test fixtures"""
        # Create test department
        self.department = Department.objects.create(
            name='Test Department',
            code='TEST'
        )

        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            email='testuser@cccplc.net',
            password='testpass123',
            employee_id='EMP001',
            first_name='Test',
            last_name='User',
            department=self.department
        )

        # Create test folder
        self.folder = Folder.objects.create(
            name='Test Folder',
            created_by=self.user
        )

        # Create test document
        self.document = Document.objects.create(
            title='Test Document',
            folder=self.folder,
            uploaded_by=self.user,
            file_size=1024,
            mime_type='application/pdf',
            checksum='test123'
        )

    def test_share_creation(self):
        """Test share creation with default values"""
        share = Share.objects.create(
            document=self.document,
            created_by=self.user,
            permission=Share.VIEW_ONLY
        )

        self.assertIsNotNone(share.id)
        self.assertIsNotNone(share.token)
        self.assertTrue(share.is_active)
        self.assertEqual(share.permission, Share.VIEW_ONLY)
        self.assertEqual(share.access_count, 0)
        self.assertEqual(share.download_count, 0)
        self.assertEqual(share.view_count, 0)

    def test_token_generation(self):
        """Test that tokens are unique and properly generated"""
        share1 = Share.objects.create(
            document=self.document,
            created_by=self.user
        )
        share2 = Share.objects.create(
            document=self.document,
            created_by=self.user
        )

        self.assertIsNotNone(share1.token)
        self.assertIsNotNone(share2.token)
        self.assertNotEqual(share1.token, share2.token)
        self.assertTrue(len(share1.token) > 0)

    def test_password_protection(self):
        """Test password setting and checking"""
        share = Share.objects.create(
            document=self.document,
            created_by=self.user
        )

        # Set password
        share.set_password('secret123')
        share.save()

        self.assertTrue(share.is_password_protected)
        self.assertIsNotNone(share.password_hash)

        # Check correct password
        self.assertTrue(share.check_password('secret123'))

        # Check incorrect password
        self.assertFalse(share.check_password('wrong'))

    def test_no_password_protection(self):
        """Test share without password"""
        share = Share.objects.create(
            document=self.document,
            created_by=self.user
        )

        self.assertFalse(share.is_password_protected)
        # Should return True for any password when not protected
        self.assertTrue(share.check_password('anything'))

    def test_is_expired(self):
        """Test expiration logic"""
        # Share with future expiration
        future_share = Share.objects.create(
            document=self.document,
            created_by=self.user,
            expires_at=timezone.now() + timedelta(days=7)
        )
        self.assertFalse(future_share.is_expired())

        # Share with past expiration
        past_share = Share.objects.create(
            document=self.document,
            created_by=self.user,
            expires_at=timezone.now() - timedelta(days=1)
        )
        self.assertTrue(past_share.is_expired())

        # Share with no expiration
        no_expire_share = Share.objects.create(
            document=self.document,
            created_by=self.user
        )
        self.assertFalse(no_expire_share.is_expired())

    def test_is_accessible(self):
        """Test accessibility logic"""
        # Active, not expired share
        share = Share.objects.create(
            document=self.document,
            created_by=self.user,
            expires_at=timezone.now() + timedelta(days=7)
        )
        self.assertTrue(share.is_accessible())

        # Inactive share
        share.is_active = False
        share.save()
        self.assertFalse(share.is_accessible())

        # Expired share
        share.is_active = True
        share.expires_at = timezone.now() - timedelta(days=1)
        share.save()
        self.assertFalse(share.is_accessible())

        # Max access count reached
        share.expires_at = timezone.now() + timedelta(days=7)
        share.max_access_count = 5
        share.access_count = 5
        share.save()
        self.assertFalse(share.is_accessible())

    def test_permission_checks(self):
        """Test permission-based capability checks"""
        # VIEW_ONLY
        view_only = Share.objects.create(
            document=self.document,
            created_by=self.user,
            permission=Share.VIEW_ONLY
        )
        self.assertFalse(view_only.can_download())
        self.assertFalse(view_only.can_comment())

        # VIEW_DOWNLOAD
        view_download = Share.objects.create(
            document=self.document,
            created_by=self.user,
            permission=Share.VIEW_DOWNLOAD
        )
        self.assertTrue(view_download.can_download())
        self.assertFalse(view_download.can_comment())

        # VIEW_DOWNLOAD_COMMENT
        full_access = Share.objects.create(
            document=self.document,
            created_by=self.user,
            permission=Share.VIEW_DOWNLOAD_COMMENT
        )
        self.assertTrue(full_access.can_download())
        self.assertTrue(full_access.can_comment())

    def test_record_access(self):
        """Test access recording"""
        share = Share.objects.create(
            document=self.document,
            created_by=self.user
        )

        initial_access = share.access_count
        initial_view = share.view_count

        # Record a view
        share.record_access(
            access_type='view',
            ip_address='127.0.0.1',
            user_agent='Test Browser'
        )

        share.refresh_from_db()
        self.assertEqual(share.access_count, initial_access + 1)
        self.assertEqual(share.view_count, initial_view + 1)
        self.assertIsNotNone(share.last_accessed_at)

        # Verify ShareAccess object created
        access_log = ShareAccess.objects.filter(share=share).first()
        self.assertIsNotNone(access_log)
        self.assertEqual(access_log.access_type, 'view')
        self.assertEqual(access_log.ip_address, '127.0.0.1')

    def test_record_download(self):
        """Test download recording"""
        share = Share.objects.create(
            document=self.document,
            created_by=self.user,
            permission=Share.VIEW_DOWNLOAD
        )

        initial_download = share.download_count

        # Record a download
        share.record_access(
            access_type='download',
            ip_address='127.0.0.1',
            user_agent='Test Browser',
            user=self.user
        )

        share.refresh_from_db()
        self.assertEqual(share.download_count, initial_download + 1)

    def test_revoke(self):
        """Test share revocation"""
        share = Share.objects.create(
            document=self.document,
            created_by=self.user
        )

        self.assertTrue(share.is_active)
        self.assertIsNone(share.revoked_at)
        self.assertIsNone(share.revoked_by)

        # Revoke the share
        share.revoke(revoked_by=self.user)

        self.assertFalse(share.is_active)
        self.assertIsNotNone(share.revoked_at)
        self.assertEqual(share.revoked_by, self.user)

    def test_get_share_url(self):
        """Test share URL generation"""
        share = Share.objects.create(
            document=self.document,
            created_by=self.user
        )

        url = share.get_share_url()
        self.assertIn(share.token, url)
        self.assertIn('/api/v1/shares/public/', url)

    def test_str_representation(self):
        """Test string representation"""
        share = Share.objects.create(
            document=self.document,
            created_by=self.user
        )

        str_repr = str(share)
        self.assertIn(self.document.title, str_repr)


class ShareAccessModelTest(TestCase):
    """Test cases for ShareAccess model"""

    def setUp(self):
        """Set up test fixtures"""
        # Create test department
        self.department = Department.objects.create(
            name='Test Department',
            code='TEST'
        )

        self.user = User.objects.create_user(
            username='testuser',
            email='testuser@cccplc.net',
            password='testpass123',
            employee_id='EMP001',
            first_name='Test',
            last_name='User',
            department=self.department
        )

        self.folder = Folder.objects.create(
            name='Test Folder',
            created_by=self.user
        )

        self.document = Document.objects.create(
            title='Test Document',
            folder=self.folder,
            uploaded_by=self.user,
            file_size=1024,
            mime_type='application/pdf',
            checksum='test123'
        )

        self.share = Share.objects.create(
            document=self.document,
            created_by=self.user
        )

    def test_access_creation(self):
        """Test ShareAccess creation"""
        access = ShareAccess.objects.create(
            share=self.share,
            access_type='view',
            ip_address='127.0.0.1',
            user_agent='Test Browser'
        )

        self.assertIsNotNone(access.id)
        self.assertEqual(access.access_type, 'view')
        self.assertEqual(access.ip_address, '127.0.0.1')
        self.assertIsNotNone(access.accessed_at)

    def test_access_with_user(self):
        """Test access with authenticated user"""
        access = ShareAccess.objects.create(
            share=self.share,
            access_type='download',
            ip_address='127.0.0.1',
            user_agent='Test Browser',
            user=self.user
        )

        self.assertEqual(access.user, self.user)

    def test_access_ordering(self):
        """Test that accesses are ordered by most recent first"""
        # Create multiple access records
        access1 = ShareAccess.objects.create(
            share=self.share,
            access_type='view',
            ip_address='127.0.0.1'
        )

        access2 = ShareAccess.objects.create(
            share=self.share,
            access_type='download',
            ip_address='127.0.0.1'
        )

        accesses = ShareAccess.objects.filter(share=self.share)
        # Most recent should be first
        self.assertEqual(accesses.first(), access2)
        self.assertEqual(accesses.last(), access1)

    def test_str_representation(self):
        """Test string representation"""
        access = ShareAccess.objects.create(
            share=self.share,
            access_type='view',
            ip_address='127.0.0.1'
        )

        str_repr = str(access)
        self.assertIn('view', str_repr.lower())
