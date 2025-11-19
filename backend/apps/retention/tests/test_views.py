"""
Tests for retention API views.

Tests:
- RetentionPolicy API endpoints
- LegalHold API endpoints
- RetentionSchedule API endpoints
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from datetime import timedelta
from apps.retention.models import (
    RetentionPolicy,
    LegalHold,
    RetentionSchedule,
    LegalHoldDocument
)
from apps.documents.models import Document
from apps.folders.models import Folder
from apps.users.models import Department

User = get_user_model()


class RetentionPolicyAPITest(TestCase):
    """Test Retention Policy API endpoints"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='adminuser',
            email='admin@cccplc.net',
            password='TestPass123!',
            first_name='Admin',
            last_name='User',
            is_staff=True
        )
        self.client.force_authenticate(user=self.user)

    def test_create_retention_policy(self):
        """Test creating a retention policy via API"""
        data = {
            'name': 'Invoice Retention Policy',
            'description': 'Retain invoices for 7 years',
            'policy_type': 'DOCUMENT_TYPE',
            'retention_days': 2555,
            'grace_period_days': 30,
            'notify_before_days': 30,
            'criteria': {'document_type': 'Invoice'},
            'is_active': True,
            'priority': 10
        }

        response = self.client.post('/api/v1/retention/policies/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(RetentionPolicy.objects.count(), 1)
        self.assertEqual(RetentionPolicy.objects.first().name, 'Invoice Retention Policy')

    def test_list_retention_policies(self):
        """Test listing retention policies"""
        RetentionPolicy.objects.create(
            name='Policy 1',
            policy_type='DOCUMENT_TYPE',
            retention_days=365,
            created_by=self.user
        )
        RetentionPolicy.objects.create(
            name='Policy 2',
            policy_type='DEPARTMENT',
            retention_days=730,
            created_by=self.user
        )

        response = self.client.get('/api/v1/retention/policies/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_activate_policy(self):
        """Test activating a policy"""
        policy = RetentionPolicy.objects.create(
            name='Test Policy',
            policy_type='DOCUMENT_TYPE',
            retention_days=365,
            is_active=False,
            created_by=self.user
        )

        response = self.client.post(f'/api/v1/retention/policies/{policy.id}/activate/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        policy.refresh_from_db()
        self.assertTrue(policy.is_active)

    def test_deactivate_policy(self):
        """Test deactivating a policy"""
        policy = RetentionPolicy.objects.create(
            name='Test Policy',
            policy_type='DOCUMENT_TYPE',
            retention_days=365,
            is_active=True,
            created_by=self.user
        )

        response = self.client.post(f'/api/v1/retention/policies/{policy.id}/deactivate/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        policy.refresh_from_db()
        self.assertFalse(policy.is_active)


class LegalHoldAPITest(TestCase):
    """Test Legal Hold API endpoints"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='legaluser',
            email='legal@cccplc.net',
            password='TestPass123!',
            first_name='Legal',
            last_name='User',
            is_staff=True
        )
        self.client.force_authenticate(user=self.user)

        self.department = Department.objects.create(
            name='Test Department',
            code='TEST'
        )

        self.folder = Folder.objects.create(
            name='Test Folder',
            created_by=self.user,
            department=self.department
        )

        self.document = Document.objects.create(
            title='Evidence Document',
            document_type='Contract',
            folder=self.folder,
            uploaded_by=self.user,
            file_path='evidence.pdf',
            file_size=1000
        )

    def test_create_legal_hold(self):
        """Test creating a legal hold via API"""
        data = {
            'case_number': 'CASE-2025-001',
            'case_name': 'Smith vs. Company',
            'description': 'Contract dispute',
            'is_active': True
        }

        response = self.client.post('/api/v1/retention/legal-holds/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(LegalHold.objects.count(), 1)
        self.assertEqual(LegalHold.objects.first().case_number, 'CASE-2025-001')

    def test_add_documents_to_hold(self):
        """Test adding documents to legal hold"""
        hold = LegalHold.objects.create(
            case_number='CASE-2025-001',
            case_name='Test Case',
            description='Test',
            placed_by=self.user
        )

        data = {
            'document_ids': [str(self.document.id)],
            'reason': 'Evidence for case'
        }

        response = self.client.post(
            f'/api/v1/retention/legal-holds/{hold.id}/add_documents/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(hold.documents.count(), 1)

    def test_remove_documents_from_hold(self):
        """Test removing documents from legal hold"""
        hold = LegalHold.objects.create(
            case_number='CASE-2025-001',
            case_name='Test Case',
            description='Test',
            placed_by=self.user
        )

        LegalHoldDocument.objects.create(
            legal_hold=hold,
            document=self.document,
            added_by=self.user
        )

        data = {
            'document_ids': [str(self.document.id)]
        }

        response = self.client.post(
            f'/api/v1/retention/legal-holds/{hold.id}/remove_documents/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(hold.documents.count(), 0)

    def test_release_legal_hold(self):
        """Test releasing a legal hold"""
        hold = LegalHold.objects.create(
            case_number='CASE-2025-001',
            case_name='Test Case',
            description='Test',
            placed_by=self.user
        )

        data = {
            'notes': 'Settlement reached'
        }

        response = self.client.post(
            f'/api/v1/retention/legal-holds/{hold.id}/release/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        hold.refresh_from_db()
        self.assertFalse(hold.is_active)
        self.assertEqual(hold.notes, 'Settlement reached')

    def test_cannot_delete_document_with_active_hold(self):
        """Test that documents under legal hold cannot be deleted"""
        hold = LegalHold.objects.create(
            case_number='CASE-2025-001',
            case_name='Test Case',
            description='Test',
            placed_by=self.user
        )

        LegalHoldDocument.objects.create(
            legal_hold=hold,
            document=self.document,
            added_by=self.user
        )

        response = self.client.delete(f'/api/v1/documents/{self.document.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Document should still exist
        self.assertTrue(Document.objects.filter(id=self.document.id).exists())


class RetentionScheduleAPITest(TestCase):
    """Test Retention Schedule API endpoints"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='adminuser',
            email='admin@cccplc.net',
            password='TestPass123!',
            first_name='Admin',
            last_name='User',
            is_staff=True
        )
        self.client.force_authenticate(user=self.user)

        self.department = Department.objects.create(
            name='Test Department',
            code='TEST'
        )

        self.folder = Folder.objects.create(
            name='Test Folder',
            created_by=self.user,
            department=self.department
        )

        self.document = Document.objects.create(
            title='Test Document',
            document_type='Invoice',
            folder=self.folder,
            uploaded_by=self.user,
            file_path='test.pdf',
            file_size=1000
        )

        self.policy = RetentionPolicy.objects.create(
            name='Test Policy',
            policy_type='DOCUMENT_TYPE',
            retention_days=365,
            created_by=self.user
        )

        now = timezone.now()
        self.schedule = RetentionSchedule.objects.create(
            document=self.document,
            policy=self.policy,
            retention_end_date=now + timedelta(days=365),
            notification_date=now + timedelta(days=365),
            deletion_date=now + timedelta(days=395)
        )

    def test_list_retention_schedules(self):
        """Test listing retention schedules"""
        response = self.client.get('/api/v1/retention/schedules/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_upcoming_deletions(self):
        """Test upcoming deletions endpoint"""
        response = self.client.get('/api/v1/retention/schedules/upcoming_deletions/?days=30')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should have schedules data
        self.assertIn('results', response.data)

    def test_cannot_create_schedule_manually(self):
        """Test that schedules cannot be created manually"""
        data = {
            'document': str(self.document.id),
            'policy': str(self.policy.id),
            'retention_end_date': timezone.now(),
            'notification_date': timezone.now(),
            'deletion_date': timezone.now()
        }

        response = self.client.post('/api/v1/retention/schedules/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
