"""
Tests for retention Celery tasks.

Tests:
- apply_retention_policies task
- send_retention_notifications task
- execute_retention_deletions task
- check_legal_holds task
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core import mail
from datetime import timedelta
from apps.retention.models import (
    RetentionPolicy,
    LegalHold,
    RetentionSchedule,
    LegalHoldDocument
)
from apps.retention.tasks import (
    apply_retention_policies,
    send_retention_notifications,
    execute_retention_deletions,
    check_legal_holds
)
from apps.documents.models import Document
from apps.folders.models import Folder
from apps.users.models import Department

User = get_user_model()


class ApplyRetentionPoliciesTaskTest(TestCase):
    """Test apply_retention_policies Celery task"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@cccplc.net',
            password='TestPass123!',
            first_name='Test',
            last_name='User'
        )

        self.department = Department.objects.create(
            name='Test Department',
            code='TEST'
        )

        self.folder = Folder.objects.create(
            name='Test Folder',
            created_by=self.user,
            department=self.department
        )

        self.policy = RetentionPolicy.objects.create(
            name='Invoice Policy',
            policy_type=RetentionPolicy.DOCUMENT_TYPE_BASED,
            retention_days=365,
            criteria={'document_type': 'Invoice'},
            created_by=self.user,
            is_active=True
        )

    def test_apply_policy_to_new_documents(self):
        """Test applying policies to documents without schedules"""
        # Create document without schedule
        document = Document.objects.create(
            title='Test Invoice',
            document_type='Invoice',
            folder=self.folder,
            uploaded_by=self.user,
            file_path='invoice.pdf',
            file_size=1000
        )

        # No schedule yet
        self.assertFalse(hasattr(document, 'retention_schedule'))

        # Run task
        result = apply_retention_policies()

        # Should have created schedule
        document.refresh_from_db()
        self.assertTrue(hasattr(document, 'retention_schedule'))
        self.assertEqual(document.retention_schedule.policy, self.policy)

    def test_skip_documents_with_existing_schedules(self):
        """Test task skips documents that already have schedules"""
        document = Document.objects.create(
            title='Test Invoice',
            document_type='Invoice',
            folder=self.folder,
            uploaded_by=self.user,
            file_path='invoice.pdf',
            file_size=1000
        )

        # Create schedule manually
        now = timezone.now()
        schedule = RetentionSchedule.objects.create(
            document=document,
            policy=self.policy,
            retention_end_date=now + timedelta(days=365),
            notification_date=now + timedelta(days=335),
            deletion_date=now + timedelta(days=395)
        )

        # Run task
        apply_retention_policies()

        # Should still have same schedule
        document.refresh_from_db()
        self.assertEqual(document.retention_schedule.id, schedule.id)

    def test_priority_based_matching(self):
        """Test higher priority policy wins"""
        # Create high priority policy
        high_priority_policy = RetentionPolicy.objects.create(
            name='High Priority Policy',
            policy_type=RetentionPolicy.DOCUMENT_TYPE_BASED,
            retention_days=730,
            criteria={'document_type': 'Invoice'},
            created_by=self.user,
            is_active=True,
            priority=100
        )

        # Lower priority policy
        self.policy.priority = 10
        self.policy.save()

        document = Document.objects.create(
            title='Test Invoice',
            document_type='Invoice',
            folder=self.folder,
            uploaded_by=self.user,
            file_path='invoice.pdf',
            file_size=1000
        )

        # Run task
        apply_retention_policies()

        # Should use high priority policy
        document.refresh_from_db()
        self.assertEqual(document.retention_schedule.policy, high_priority_policy)


class SendRetentionNotificationsTaskTest(TestCase):
    """Test send_retention_notifications Celery task"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='owneruser',
            email='owner@cccplc.net',
            password='TestPass123!',
            first_name='Document',
            last_name='Owner'
        )

        self.department = Department.objects.create(
            name='Test Department',
            code='TEST'
        )

        self.folder = Folder.objects.create(
            name='Test Folder',
            created_by=self.user,
            department=self.department
        )

        self.policy = RetentionPolicy.objects.create(
            name='Test Policy',
            policy_type=RetentionPolicy.DOCUMENT_TYPE_BASED,
            retention_days=365,
            created_by=self.user
        )

    def test_send_notification_when_due(self):
        """Test sending notification when notification date has passed"""
        document = Document.objects.create(
            title='Document to Delete',
            document_type='Invoice',
            folder=self.folder,
            uploaded_by=self.user,
            file_path='invoice.pdf',
            file_size=1000
        )

        now = timezone.now()
        schedule = RetentionSchedule.objects.create(
            document=document,
            policy=self.policy,
            retention_end_date=now - timedelta(days=1),
            notification_date=now - timedelta(days=1),  # Notification due
            deletion_date=now + timedelta(days=29),
            status=RetentionSchedule.PENDING,
            notification_sent=False
        )

        # Run task
        send_retention_notifications()

        # Check notification was sent
        schedule.refresh_from_db()
        self.assertTrue(schedule.notification_sent)
        self.assertEqual(schedule.status, RetentionSchedule.NOTIFIED)
        self.assertEqual(len(mail.outbox), 1)


class ExecuteRetentionDeletionsTaskTest(TestCase):
    """Test execute_retention_deletions Celery task"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@cccplc.net',
            password='TestPass123!',
            first_name='Test',
            last_name='User'
        )

        self.department = Department.objects.create(
            name='Test Department',
            code='TEST'
        )

        self.folder = Folder.objects.create(
            name='Test Folder',
            created_by=self.user,
            department=self.department
        )

        self.policy = RetentionPolicy.objects.create(
            name='Test Policy',
            policy_type=RetentionPolicy.DOCUMENT_TYPE_BASED,
            retention_days=365,
            created_by=self.user
        )

    def test_delete_expired_documents(self):
        """Test deleting documents past their deletion date"""
        document = Document.objects.create(
            title='Expired Document',
            document_type='Invoice',
            folder=self.folder,
            uploaded_by=self.user,
            file_path='expired.pdf',
            file_size=1000
        )

        now = timezone.now()
        schedule = RetentionSchedule.objects.create(
            document=document,
            policy=self.policy,
            retention_end_date=now - timedelta(days=31),
            notification_date=now - timedelta(days=61),
            deletion_date=now - timedelta(days=1),  # Expired
            status=RetentionSchedule.NOTIFIED
        )

        # Run task
        execute_retention_deletions()

        # Check document was soft deleted
        document.refresh_from_db()
        self.assertTrue(document.is_deleted)
        self.assertIsNotNone(document.deleted_at)

        # Check schedule status
        schedule.refresh_from_db()
        self.assertEqual(schedule.status, RetentionSchedule.DELETED)

    def test_skip_documents_with_legal_hold(self):
        """Test documents under legal hold are not deleted"""
        document = Document.objects.create(
            title='Protected Document',
            document_type='Contract',
            folder=self.folder,
            uploaded_by=self.user,
            file_path='protected.pdf',
            file_size=1000
        )

        # Place on legal hold
        hold = LegalHold.objects.create(
            case_number='CASE-2025-001',
            case_name='Test Case',
            description='Test',
            placed_by=self.user,
            is_active=True
        )

        LegalHoldDocument.objects.create(
            legal_hold=hold,
            document=document,
            added_by=self.user
        )

        now = timezone.now()
        schedule = RetentionSchedule.objects.create(
            document=document,
            policy=self.policy,
            retention_end_date=now - timedelta(days=31),
            notification_date=now - timedelta(days=61),
            deletion_date=now - timedelta(days=1),  # Expired
            status=RetentionSchedule.NOTIFIED
        )

        # Run task
        execute_retention_deletions()

        # Document should NOT be deleted
        document.refresh_from_db()
        self.assertFalse(document.is_deleted)

        # Schedule should be cancelled
        schedule.refresh_from_db()
        self.assertEqual(schedule.status, RetentionSchedule.CANCELLED)


class CheckLegalHoldsTaskTest(TestCase):
    """Test check_legal_holds Celery task"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='legaluser',
            email='legal@cccplc.net',
            password='TestPass123!',
            first_name='Legal',
            last_name='User'
        )

    def test_report_active_holds(self):
        """Test reporting on active legal holds"""
        hold1 = LegalHold.objects.create(
            case_number='CASE-2025-001',
            case_name='Case 1',
            description='Test',
            placed_by=self.user,
            is_active=True
        )

        hold2 = LegalHold.objects.create(
            case_number='CASE-2025-002',
            case_name='Case 2',
            description='Test',
            placed_by=self.user,
            is_active=False
        )

        # Run task
        result = check_legal_holds()

        # Should report 1 active hold
        self.assertIn('active_count', result)
        self.assertEqual(result['active_count'], 1)
