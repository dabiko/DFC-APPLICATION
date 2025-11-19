"""
Tests for retention models.

Tests:
- RetentionPolicy model
- LegalHold model
- LegalHoldDocument model
- RetentionSchedule model
"""

from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from datetime import timedelta
from apps.retention.models import (
    RetentionPolicy,
    LegalHold,
    LegalHoldDocument,
    RetentionSchedule
)
from apps.documents.models import Document, Tag
from apps.folders.models import Folder
from apps.users.models import Department

User = get_user_model()


class RetentionPolicyModelTest(TestCase):
    """Test RetentionPolicy model"""

    def setUp(self):
        self.department = Department.objects.create(
            name='Test Department',
            code='TEST'
        )

        self.user = User.objects.create_user(
            username='testuser',
            email='test@cccplc.net',
            password='TestPass123!',
            first_name='Test',
            last_name='User',
            employee_id='EMP001',
            department=self.department
        )

        self.folder = Folder.objects.create(
            name='Test Folder',
            created_by=self.user,
            department=self.department
        )

        self.policy = RetentionPolicy.objects.create(
            name='7-Year Invoice Policy',
            description='Retain invoices for 7 years',
            policy_type=RetentionPolicy.DOCUMENT_TYPE_BASED,
            retention_days=2555,  # 7 years
            grace_period_days=30,
            notify_before_days=30,
            criteria={'document_type': 'Invoice'},
            created_by=self.user
        )

    def test_policy_creation(self):
        """Test policy is created correctly"""
        self.assertEqual(self.policy.name, '7-Year Invoice Policy')
        self.assertEqual(self.policy.retention_days, 2555)
        self.assertTrue(self.policy.is_active)

    def test_policy_string_representation(self):
        """Test __str__ method"""
        expected = '7-Year Invoice Policy (2555 days)'
        self.assertEqual(str(self.policy), expected)

    def test_get_deletion_date(self):
        """Test deletion date calculation"""
        document = Document.objects.create(
            title='Test Invoice',
            document_type='Invoice',
            folder=self.folder,
            uploaded_by=self.user,
            file_path='test.pdf',
            file_size=1000
        )

        deletion_date = self.policy.get_deletion_date(document)
        expected = document.uploaded_at + timedelta(days=2555 + 30)  # retention + grace

        # Compare dates (ignoring microseconds)
        self.assertEqual(deletion_date.date(), expected.date())

    def test_matches_document_type(self):
        """Test document type matching"""
        invoice = Document.objects.create(
            title='Test Invoice',
            document_type='Invoice',
            folder=self.folder,
            uploaded_by=self.user,
            file_path='invoice.pdf',
            file_size=1000
        )

        contract = Document.objects.create(
            title='Test Contract',
            document_type='Contract',
            folder=self.folder,
            uploaded_by=self.user,
            file_path='contract.pdf',
            file_size=1000
        )

        self.assertTrue(self.policy.matches_document(invoice))
        self.assertFalse(self.policy.matches_document(contract))


class LegalHoldModelTest(TestCase):
    """Test LegalHold model"""

    def setUp(self):
        self.department = Department.objects.create(
            name='Legal Department',
            code='LEGAL'
        )

        self.user = User.objects.create_user(
            username='legaluser',
            email='legal@cccplc.net',
            password='TestPass123!',
            first_name='Legal',
            last_name='User',
            employee_id='EMP002',
            department=self.department
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

        self.hold = LegalHold.objects.create(
            case_number='CASE-2025-001',
            case_name='Smith vs. Company',
            description='Contract dispute',
            placed_by=self.user
        )

    def test_hold_creation(self):
        """Test legal hold is created correctly"""
        self.assertEqual(self.hold.case_number, 'CASE-2025-001')
        self.assertTrue(self.hold.is_active)
        self.assertEqual(self.hold.placed_by, self.user)

    def test_hold_string_representation(self):
        """Test __str__ method"""
        expected = 'CASE-2025-001 - Active'
        self.assertEqual(str(self.hold), expected)

    def test_release_hold(self):
        """Test releasing a legal hold"""
        self.assertTrue(self.hold.is_active)
        self.hold.release(self.user)
        self.assertFalse(self.hold.is_active)
        self.assertIsNotNone(self.hold.released_at)


class RetentionScheduleModelTest(TestCase):
    """Test RetentionSchedule model"""

    def setUp(self):
        self.department = Department.objects.create(
            name='Test Department',
            code='TEST'
        )

        self.user = User.objects.create_user(
            username='testuser',
            email='test@cccplc.net',
            password='TestPass123!',
            first_name='Test',
            last_name='User',
            employee_id='EMP001',
            department=self.department
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
            policy_type=RetentionPolicy.DOCUMENT_TYPE_BASED,
            retention_days=365,
            grace_period_days=30,
            notify_before_days=30,
            criteria={'document_type': 'Invoice'},
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

    def test_schedule_creation(self):
        """Test schedule is created correctly"""
        self.assertEqual(self.schedule.document, self.document)
        self.assertEqual(self.schedule.policy, self.policy)
        self.assertEqual(self.schedule.status, RetentionSchedule.PENDING)

    def test_can_delete_without_hold(self):
        """Test can_delete returns True when no legal holds"""
        self.assertTrue(self.schedule.can_delete())

    def test_can_delete_with_active_hold(self):
        """Test can_delete returns False with active legal hold"""
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

        self.assertFalse(self.schedule.can_delete())
