"""
Celery tasks for document sharing.

Tasks:
- deactivate_expired_shares: Deactivate shares past their expiration date
- send_share_notifications: Send email notifications to share recipients
- cleanup_old_share_accesses: Clean up old analytics records
"""

from celery import shared_task
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from apps.sharing.models import Share, ShareAccess
from apps.audit.models import AuditLog
import logging

logger = logging.getLogger(__name__)


@shared_task(name='deactivate_expired_shares')
def deactivate_expired_shares():
    """
    Deactivate shares that have passed their expiration date.
    Runs daily.

    Returns:
        dict: Statistics about deactivated shares
    """
    logger.info('Starting expired shares deactivation...')

    now = timezone.now()

    # Find expired shares that are still active
    expired_shares = Share.objects.filter(
        is_active=True,
        expires_at__isnull=False,
        expires_at__lte=now
    )

    deactivated_count = 0

    for share in expired_shares.iterator():
        share.is_active = False
        share.save(update_fields=['is_active'])

        # Log audit event
        AuditLog.log_action(
            user=None,  # System action
            action='SHARE_EXPIRED',
            resource_type='Share',
            resource_id=str(share.id),
            resource_name=share.document.title,
            details={
                'share_token': share.token[:8] + '...',
                'expired_at': share.expires_at.isoformat(),
                'access_count': share.access_count,
                'download_count': share.download_count,
            },
            ip_address='127.0.0.1',  # System
            user_agent='Celery Task'
        )

        deactivated_count += 1

        logger.info(f'Deactivated expired share: {share.id}')

    result = {
        'deactivated': deactivated_count,
        'timestamp': timezone.now().isoformat()
    }

    logger.info(f'Expired shares deactivation complete: {result}')
    return result


@shared_task(name='send_share_notifications')
def send_share_notifications(share_id, custom_message=''):
    """
    Send email notifications to share recipients.

    Args:
        share_id: UUID of the share
        custom_message: Optional custom message to include

    Returns:
        dict: Statistics about sent notifications
    """
    logger.info(f'Sending share notifications for share: {share_id}')

    try:
        share = Share.objects.select_related('document', 'created_by').get(id=share_id)
    except Share.DoesNotExist:
        logger.error(f'Share not found: {share_id}')
        return {'error': 'Share not found', 'sent': 0}

    if not share.recipient_emails:
        logger.warning(f'No recipients for share: {share_id}')
        return {'sent': 0, 'reason': 'No recipients'}

    sent_count = 0
    failed_count = 0

    # Generate share URL (without request object, so relative)
    share_url = f"{settings.FRONTEND_URL}/shares/{share.token}"

    # Permission description
    permission_desc = {
        Share.VIEW_ONLY: 'View only (no download)',
        Share.VIEW_DOWNLOAD: 'View and download',
        Share.VIEW_DOWNLOAD_COMMENT: 'View, download, and comment',
    }.get(share.permission, 'View only')

    for recipient_email in share.recipient_emails:
        try:
            # Build email content
            subject = f'{share.created_by.get_full_name()} shared a document with you'

            message = f'''Hello,

{share.created_by.get_full_name()} ({share.created_by.email}) has shared a document with you:

Document: {share.document.title}
Type: {share.document.document_type or "N/A"}
Permission: {permission_desc}

{custom_message}

Access the document here:
{share_url}

'''

            if share.is_password_protected:
                message += '\nNote: This share is password-protected. You will need to enter the password to access it.\n'

            if share.expires_at:
                message += f'\nThis share will expire on: {share.expires_at.strftime("%Y-%m-%d %H:%M")} UTC\n'

            if share.max_access_count:
                remaining = share.max_access_count - share.access_count
                message += f'\nRemaining access count: {remaining} of {share.max_access_count}\n'

            message += '''
Best regards,
Digital Filing Cabinet System
            '''

            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient_email],
                fail_silently=False,
            )

            sent_count += 1

            logger.info(f'Sent notification to: {recipient_email}')

        except Exception as e:
            logger.error(f'Failed to send notification to {recipient_email}: {str(e)}')
            failed_count += 1

    # Log audit event for notifications
    AuditLog.log_action(
        user=share.created_by,
        action='SHARE_NOTIFY',
        resource_type='Share',
        resource_id=str(share.id),
        resource_name=share.document.title,
        details={
            'recipients_count': len(share.recipient_emails),
            'sent': sent_count,
            'failed': failed_count,
        }
    )

    result = {
        'share_id': str(share_id),
        'sent': sent_count,
        'failed': failed_count,
        'timestamp': timezone.now().isoformat()
    }

    logger.info(f'Share notifications complete: {result}')
    return result


@shared_task(name='cleanup_old_share_accesses')
def cleanup_old_share_accesses(days=90):
    """
    Clean up old share access records to manage database size.
    Runs weekly.

    Args:
        days: Number of days to keep (default: 90)

    Returns:
        dict: Statistics about deleted records
    """
    logger.info(f'Cleaning up share access records older than {days} days...')

    cutoff_date = timezone.now() - timezone.timedelta(days=days)

    # Delete old access records
    deleted_count, _ = ShareAccess.objects.filter(
        accessed_at__lt=cutoff_date
    ).delete()

    result = {
        'deleted': deleted_count,
        'cutoff_date': cutoff_date.isoformat(),
        'timestamp': timezone.now().isoformat()
    }

    logger.info(f'Share access cleanup complete: {result}')
    return result


# Celery Beat schedule configuration
"""
Add to config/settings/base.py CELERY_BEAT_SCHEDULE:

CELERY_BEAT_SCHEDULE = {
    ...

    # Deactivate expired shares daily at 6 AM
    'deactivate-expired-shares': {
        'task': 'deactivate_expired_shares',
        'schedule': crontab(hour=6, minute=0),
    },

    # Clean up old access records weekly (Sunday at 3 AM)
    'cleanup-old-share-accesses': {
        'task': 'cleanup_old_share_accesses',
        'schedule': crontab(hour=3, minute=0, day_of_week=0),
    },
}
"""
