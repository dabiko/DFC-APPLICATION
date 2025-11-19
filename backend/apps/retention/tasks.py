"""
Celery tasks for retention policy enforcement and legal hold management.

Tasks:
- apply_retention_policies: Apply retention policies to documents without schedules
- send_retention_notifications: Send notifications before deletion
- execute_retention_deletions: Delete documents past retention period
- check_legal_holds: Check for expired legal holds
"""

from celery import shared_task
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.db import transaction
from datetime import timedelta
import logging

from apps.retention.models import RetentionPolicy, RetentionSchedule, LegalHold
from apps.documents.models import Document
from apps.audit.models import AuditLog

logger = logging.getLogger(__name__)


@shared_task(name='apply_retention_policies')
def apply_retention_policies():
    """
    Apply retention policies to documents without schedules.
    Runs daily.

    Returns:
        dict: Statistics about applied policies
    """
    logger.info('Starting retention policy application...')

    policies = RetentionPolicy.objects.filter(is_active=True).order_by('-priority')

    # Get documents without retention schedules
    documents = Document.objects.filter(
        retention_schedule__isnull=True,
        is_deleted=False
    ).select_related('folder', 'uploaded_by').prefetch_related('tags')

    scheduled_count = 0
    skipped_count = 0

    for document in documents:
        # Find highest priority matching policy
        matching_policy = None
        for policy in policies:
            if policy.matches_document(document):
                matching_policy = policy
                break  # Use first (highest priority) match

        if matching_policy:
            try:
                with transaction.atomic():
                    # Create retention schedule
                    retention_end_date = matching_policy.get_retention_end_date(document)
                    notification_date = matching_policy.get_notification_date(document)
                    deletion_date = matching_policy.get_deletion_date(document)

                    RetentionSchedule.objects.create(
                        document=document,
                        policy=matching_policy,
                        retention_end_date=retention_end_date,
                        notification_date=notification_date,
                        deletion_date=deletion_date
                    )
                    scheduled_count += 1

                    # Log audit event
                    AuditLog.log_action(
                        user=None,  # System action
                        action='RETENTION_APPLY',
                        resource_type='Document',
                        resource_id=str(document.id),
                        resource_name=document.title,
                        details={
                            'policy': matching_policy.name,
                            'retention_days': matching_policy.retention_days,
                            'deletion_date': deletion_date.isoformat(),
                            'notification_date': notification_date.isoformat()
                        }
                    )
            except Exception as e:
                logger.error(f'Error applying retention policy to document {document.id}: {str(e)}')
                skipped_count += 1
        else:
            skipped_count += 1

    result = {
        'scheduled': scheduled_count,
        'skipped': skipped_count,
        'total_policies': policies.count(),
        'timestamp': timezone.now().isoformat()
    }

    logger.info(f'Retention policy application complete: {result}')
    return result


@shared_task(name='send_retention_notifications')
def send_retention_notifications():
    """
    Send notifications for documents approaching deletion.
    Runs daily.

    Returns:
        dict: Statistics about sent notifications
    """
    logger.info('Starting retention notifications...')

    now = timezone.now()

    # Get schedules that need notification
    schedules = RetentionSchedule.objects.filter(
        status=RetentionSchedule.PENDING,
        notification_sent=False,
        notification_date__lte=now
    ).select_related('document', 'document__uploaded_by', 'policy')

    notified_count = 0
    failed_count = 0

    for schedule in schedules:
        if not schedule.can_delete():
            # Document is under legal hold, skip notification
            schedule.status = RetentionSchedule.CANCELLED
            schedule.save()
            logger.info(f'Document {schedule.document.id} under legal hold, cancelling retention')
            continue

        document = schedule.document
        owner = document.uploaded_by

        if owner and owner.email:
            try:
                days_until_deletion = (schedule.deletion_date - now).days

                send_mail(
                    subject=f'DFC: Document "{document.title}" scheduled for deletion',
                    message=f'''
Dear {owner.first_name or owner.username},

This is a notification that your document "{document.title}" is scheduled for deletion in {days_until_deletion} days.

Document Details:
- Title: {document.title}
- Type: {document.document_type or 'N/A'}
- Uploaded: {document.uploaded_at.strftime("%Y-%m-%d")}
- Deletion Date: {schedule.deletion_date.strftime("%Y-%m-%d")}
- Retention Policy: {schedule.policy.name if schedule.policy else "N/A"}

If this document is still needed, please take action:
1. Download a copy for your records
2. Contact your administrator if the retention policy is incorrect
3. If subject to legal proceedings, request a legal hold

Note: Documents under legal hold cannot be deleted.

Best regards,
Digital Filing Cabinet System
                    ''',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[owner.email],
                    fail_silently=False,
                )

                # Mark as notified
                schedule.notification_sent = True
                schedule.status = RetentionSchedule.NOTIFIED
                schedule.save()

                notified_count += 1

                # Log audit event
                AuditLog.log_action(
                    user=None,
                    action='RETENTION_NOTIFICATION',
                    resource_type='Document',
                    resource_id=str(document.id),
                    resource_name=document.title,
                    details={
                        'recipient': owner.email,
                        'days_until_deletion': days_until_deletion,
                        'deletion_date': schedule.deletion_date.isoformat()
                    }
                )

            except Exception as e:
                logger.error(f'Failed to send notification for document {document.id}: {str(e)}')
                failed_count += 1

                # Log error in audit
                AuditLog.log_action(
                    user=None,
                    action='RETENTION_NOTIFICATION',
                    resource_type='Document',
                    resource_id=str(document.id),
                    resource_name=document.title,
                    outcome='FAILURE',
                    error_message=str(e),
                    details={'recipient': owner.email}
                )

    result = {
        'notified': notified_count,
        'failed': failed_count,
        'timestamp': timezone.now().isoformat()
    }

    logger.info(f'Retention notifications complete: {result}')
    return result


@shared_task(name='execute_retention_deletions')
def execute_retention_deletions():
    """
    Delete documents that have passed their retention period and grace period.
    Runs daily.

    Returns:
        dict: Statistics about deleted documents
    """
    logger.info('Starting retention deletions...')

    now = timezone.now()

    # Get schedules ready for deletion
    schedules = RetentionSchedule.objects.filter(
        status__in=[RetentionSchedule.PENDING, RetentionSchedule.NOTIFIED],
        deletion_date__lte=now
    ).select_related('document', 'policy')

    deleted_count = 0
    skipped_count = 0

    for schedule in schedules:
        # Double-check legal hold status
        if not schedule.can_delete():
            schedule.status = RetentionSchedule.CANCELLED
            schedule.save()
            skipped_count += 1
            logger.warning(f'Skipping document {schedule.document.id} - under legal hold')
            continue

        document = schedule.document

        try:
            with transaction.atomic():
                # Soft delete the document
                document.is_deleted = True
                document.deleted_at = timezone.now()
                document.save()

                # Update schedule status
                schedule.status = RetentionSchedule.DELETED
                schedule.deleted_at = timezone.now()
                schedule.save()

                deleted_count += 1

                # Log audit event
                AuditLog.log_action(
                    user=None,  # System action
                    action='DELETE',
                    resource_type='Document',
                    resource_id=str(document.id),
                    resource_name=document.title,
                    details={
                        'deletion_reason': 'Retention policy enforcement',
                        'policy': schedule.policy.name if schedule.policy else 'N/A',
                        'retention_days': schedule.policy.retention_days if schedule.policy else 0,
                        'grace_period_days': schedule.policy.grace_period_days if schedule.policy else 0
                    }
                )

                logger.info(f'Deleted document {document.id} via retention policy')

        except Exception as e:
            logger.error(f'Failed to delete document {document.id}: {str(e)}')
            skipped_count += 1

            # Log error in audit
            AuditLog.log_action(
                user=None,
                action='DELETE',
                resource_type='Document',
                resource_id=str(document.id),
                resource_name=document.title,
                outcome='FAILURE',
                error_message=str(e),
                details={'deletion_reason': 'Retention policy enforcement'}
            )

    result = {
        'deleted': deleted_count,
        'skipped': skipped_count,
        'timestamp': timezone.now().isoformat()
    }

    logger.info(f'Retention deletions complete: {result}')
    return result


@shared_task(name='check_legal_holds')
def check_legal_holds():
    """
    Check for legal holds that should be automatically released.
    Runs daily.

    Returns:
        dict: Statistics about checked legal holds
    """
    logger.info('Checking legal holds...')

    now = timezone.now().date()

    # Get active legal holds with end dates that have passed
    holds = LegalHold.objects.filter(
        is_active=True,
        end_date__isnull=False,
        end_date__lt=now
    )

    released_count = 0

    for hold in holds:
        try:
            # Auto-release expired legal hold
            hold.is_active = False
            hold.released_at = timezone.now()
            hold.save()

            released_count += 1

            # Log audit event
            AuditLog.log_action(
                user=None,  # System action
                action='LEGAL_RELEASE',
                resource_type='LegalHold',
                resource_id=str(hold.id),
                resource_name=hold.case_number,
                details={
                    'case_number': hold.case_number,
                    'end_date': hold.end_date.isoformat(),
                    'document_count': hold.documents.count(),
                    'auto_released': True
                }
            )

            logger.info(f'Auto-released legal hold {hold.case_number}')

        except Exception as e:
            logger.error(f'Failed to release legal hold {hold.id}: {str(e)}')

    result = {
        'released': released_count,
        'timestamp': timezone.now().isoformat()
    }

    logger.info(f'Legal hold check complete: {result}')
    return result


# Celery Beat Schedule Configuration
"""
Add to config/settings/base.py or config/celery.py:

from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    # Apply retention policies daily at 2 AM
    'apply-retention-policies': {
        'task': 'apply_retention_policies',
        'schedule': crontab(hour=2, minute=0),
    },

    # Send notifications daily at 3 AM
    'send-retention-notifications': {
        'task': 'send_retention_notifications',
        'schedule': crontab(hour=3, minute=0),
    },

    # Execute deletions daily at 4 AM
    'execute-retention-deletions': {
        'task': 'execute_retention_deletions',
        'schedule': crontab(hour=4, minute=0),
    },

    # Check legal holds daily at 1 AM
    'check-legal-holds': {
        'task': 'check_legal_holds',
        'schedule': crontab(hour=1, minute=0),
    },
}
"""
