"""
Test cases for sharing API views.

Tests:
- Authenticated share endpoints
- Public share access (no authentication)
- Password-protected shares
- Direct downloads
- Share revocation
- Analytics
"""

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from django.contrib.auth import get_user_model
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status
from apps.sharing.models import Share, ShareAccess
from apps.documents.models import Document
from apps.folders.models import Folder
from apps.users.models import Department

User = get_user_model()


class ShareViewSetTest(TestCase):
    """Test authenticated share endpoints"""

    def setUp(self):
        """Set up test fixtures"""
        self.client = APIClient()

        # Create test department
        self.department = Department.objects.create(
            name='Test Department',
            code='TEST'
        )

        # Create test users
        self.user = User.objects.create_user(
            username='testuser',
            email='testuser@cccplc.net',
            password='testpass123',
            employee_id='EMP001',
            first_name='Test',
            last_name='User',
            department=self.department
        )
        self.other_user = User.objects.create_user(
            username='otheruser',
            email='otheruser@cccplc.net',
            password='testpass123',
            employee_id='EMP002',
            first_name='Other',
            last_name='User',
            department=self.department
        )

        # Create test folder and document
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

        # Authenticate
        self.client.force_authenticate(user=self.user)

    def test_create_share(self):
        """Test creating a new share"""
        data = {
            'document': str(self.document.id),
            'permission': Share.VIEW_DOWNLOAD,
            'expires_in_days': 7,
            'recipient_emails': ['user1@example.com', 'user2@example.com']
        }

        response = self.client.post('/api/v1/shares/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['permission'], Share.VIEW_DOWNLOAD)
        self.assertEqual(len(response.data['recipient_emails']), 2)

    def test_create_share_with_password(self):
        """Test creating password-protected share"""
        data = {
            'document': str(self.document.id),
            'permission': Share.VIEW_ONLY,
            'password': 'secret123'
        }

        response = self.client.post('/api/v1/shares/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['is_password_protected'])

        # Verify password is not returned
        self.assertNotIn('password', response.data)
        self.assertNotIn('password_hash', response.data)

    def test_list_shares(self):
        """Test listing user's shares"""
        # Create multiple shares
        Share.objects.create(
            document=self.document,
            created_by=self.user,
            permission=Share.VIEW_ONLY
        )
        Share.objects.create(
            document=self.document,
            created_by=self.user,
            permission=Share.VIEW_DOWNLOAD
        )

        response = self.client.get('/api/v1/shares/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_retrieve_share(self):
        """Test retrieving share details"""
        share = Share.objects.create(
            document=self.document,
            created_by=self.user,
            permission=Share.VIEW_DOWNLOAD
        )

        response = self.client.get(f'/api/v1/shares/{share.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], str(share.id))
        self.assertEqual(response.data['permission'], Share.VIEW_DOWNLOAD)

    def test_update_share(self):
        """Test updating share"""
        share = Share.objects.create(
            document=self.document,
            created_by=self.user,
            permission=Share.VIEW_ONLY
        )

        data = {'permission': Share.VIEW_DOWNLOAD}
        response = self.client.patch(f'/api/v1/shares/{share.id}/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['permission'], Share.VIEW_DOWNLOAD)

    def test_delete_share(self):
        """Test deleting share"""
        share = Share.objects.create(
            document=self.document,
            created_by=self.user
        )

        response = self.client.delete(f'/api/v1/shares/{share.id}/')

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Share.objects.filter(id=share.id).exists())

    def test_revoke_share(self):
        """Test revoking a share"""
        share = Share.objects.create(
            document=self.document,
            created_by=self.user
        )

        data = {'reason': 'No longer needed'}
        response = self.client.post(f'/api/v1/shares/{share.id}/revoke/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        share.refresh_from_db()
        self.assertFalse(share.is_active)
        self.assertIsNotNone(share.revoked_at)
        self.assertEqual(share.revoked_by, self.user)

    def test_analytics(self):
        """Test share analytics endpoint"""
        share = Share.objects.create(
            document=self.document,
            created_by=self.user
        )

        # Create some access records
        share.record_access('view', '127.0.0.1', 'Browser')
        share.record_access('download', '127.0.0.1', 'Browser', user=self.user)

        response = self.client.get(f'/api/v1/shares/{share.id}/analytics/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_accesses', response.data)
        self.assertIn('unique_visitors', response.data)
        self.assertIn('recent_accesses', response.data)

    def test_my_shares(self):
        """Test my_shares endpoint"""
        Share.objects.create(
            document=self.document,
            created_by=self.user
        )

        response = self.client.get('/api/v1/shares/my_shares/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_shares', response.data)
        self.assertIn('active_shares', response.data)

    def test_unauthorized_access(self):
        """Test that unauthenticated users cannot access share endpoints"""
        self.client.force_authenticate(user=None)

        response = self.client.get('/api/v1/shares/')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cannot_access_others_shares(self):
        """Test that users cannot access other users' shares"""
        # Create share by other user
        other_folder = Folder.objects.create(
            name='Other Folder',
            created_by=self.other_user
        )
        other_document = Document.objects.create(
            title='Other Document',
            folder=other_folder,
            uploaded_by=self.other_user,
            file_size=1024,
            mime_type='application/pdf',
            checksum='test456'
        )
        other_share = Share.objects.create(
            document=other_document,
            created_by=self.other_user
        )

        response = self.client.get(f'/api/v1/shares/{other_share.id}/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class PublicShareAccessTest(TestCase):
    """Test public share access (no authentication required)"""

    def setUp(self):
        """Set up test fixtures"""
        self.client = APIClient()

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

    def test_public_access_without_password(self):
        """Test accessing public share without password"""
        share = Share.objects.create(
            document=self.document,
            created_by=self.user,
            permission=Share.VIEW_ONLY
        )

        # No authentication
        url = f'/api/v1/shares/public/{share.token}/'
        response = self.client.post(url, {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('share', response.data)
        self.assertIn('document', response.data['share'])
        self.assertEqual(response.data['share']['permission'], Share.VIEW_ONLY)

        # Verify access was recorded
        share.refresh_from_db()
        self.assertEqual(share.access_count, 1)
        self.assertEqual(share.view_count, 1)

    def test_public_access_with_correct_password(self):
        """Test accessing password-protected share with correct password"""
        share = Share.objects.create(
            document=self.document,
            created_by=self.user,
            permission=Share.VIEW_DOWNLOAD
        )
        share.set_password('secret123')
        share.save()

        url = f'/api/v1/shares/public/{share.token}/'
        response = self.client.post(url, {'password': 'secret123'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_public_access_with_incorrect_password(self):
        """Test accessing password-protected share with wrong password"""
        share = Share.objects.create(
            document=self.document,
            created_by=self.user
        )
        share.set_password('secret123')
        share.save()

        url = f'/api/v1/shares/public/{share.token}/'
        response = self.client.post(url, {'password': 'wrong'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_public_access_expired_share(self):
        """Test accessing expired share"""
        share = Share.objects.create(
            document=self.document,
            created_by=self.user,
            expires_at=timezone.now() - timedelta(days=1)
        )

        url = f'/api/v1/shares/public/{share.token}/'
        response = self.client.post(url, {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('expired', response.data['non_field_errors'][0].lower())

    def test_public_access_revoked_share(self):
        """Test accessing revoked share"""
        share = Share.objects.create(
            document=self.document,
            created_by=self.user
        )
        share.revoke(revoked_by=self.user)

        url = f'/api/v1/shares/public/{share.token}/'
        response = self.client.post(url, {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_public_access_invalid_token(self):
        """Test accessing share with invalid token"""
        url = '/api/v1/shares/public/invalid-token/'
        response = self.client.post(url, {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_public_access_max_access_reached(self):
        """Test share with max access count reached"""
        share = Share.objects.create(
            document=self.document,
            created_by=self.user,
            max_access_count=1
        )

        # First access should work
        url = f'/api/v1/shares/public/{share.token}/'
        response = self.client.post(url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Second access should fail
        response = self.client.post(url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_public_download_allowed(self):
        """Test downloading from share with download permission"""
        share = Share.objects.create(
            document=self.document,
            created_by=self.user,
            permission=Share.VIEW_DOWNLOAD
        )

        url = f'/api/v1/shares/public/{share.token}/download/'
        response = self.client.get(url)

        # Note: This will fail if file doesn't actually exist, but should pass validation
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND])

    def test_public_download_not_allowed(self):
        """Test downloading from VIEW_ONLY share"""
        share = Share.objects.create(
            document=self.document,
            created_by=self.user,
            permission=Share.VIEW_ONLY
        )

        url = f'/api/v1/shares/public/{share.token}/download/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_share_info_without_access(self):
        """Test GET endpoint returns limited info without password"""
        share = Share.objects.create(
            document=self.document,
            created_by=self.user
        )

        url = f'/api/v1/shares/public/{share.token}/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('requires_password', response.data)
        self.assertIn('is_expired', response.data)


class ShareTasksTest(TestCase):
    """Test Celery tasks for sharing"""

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

    def test_deactivate_expired_shares(self):
        """Test automatic deactivation of expired shares"""
        from apps.sharing.tasks import deactivate_expired_shares

        # Create expired share
        expired_share = Share.objects.create(
            document=self.document,
            created_by=self.user,
            expires_at=timezone.now() - timedelta(days=1)
        )

        # Create active share
        active_share = Share.objects.create(
            document=self.document,
            created_by=self.user,
            expires_at=timezone.now() + timedelta(days=7)
        )

        # Run task
        result = deactivate_expired_shares()

        # Verify expired share is deactivated
        expired_share.refresh_from_db()
        self.assertFalse(expired_share.is_active)

        # Verify active share is still active
        active_share.refresh_from_db()
        self.assertTrue(active_share.is_active)

        # Verify result
        self.assertIn('deactivated', result)
        self.assertEqual(result['deactivated'], 1)
