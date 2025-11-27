"""
Celery tasks for document sharing.

Tasks:
- deactivate_expired_shares: Deactivate shares past their expiration date
- send_share_notifications: Send email notifications to share recipients
- cleanup_old_share_accesses: Clean up old analytics records
- send_share_email_notification: Send email notification for new shares
- send_weekly_sharing_digest: Send weekly digest of sharing activity
- notify_expiring_shares: Notify users about shares that are about to expire
"""

from celery import shared_task
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Count, Q
from datetime import timedelta
from apps.sharing.models import (
    Share, ShareAccess, SharedItemAccess, ShareInvitation,
    Notification, NotificationPreferences
)
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


@shared_task(name='send_share_email_notification')
def send_share_email_notification(
    recipient_id,
    shared_by_id,
    resource_type,
    resource_id,
    resource_name,
    permission_level,
    notification_type='SHARE_RECEIVED',
    action_url='/shared-with-me'
):
    """
    Send email notification for a new share.

    Args:
        recipient_id: UUID of the recipient user
        shared_by_id: UUID of the user who shared
        resource_type: 'DOCUMENT' or 'FOLDER'
        resource_id: UUID of the shared resource
        resource_name: Name of the shared resource
        permission_level: Permission level granted
        notification_type: Type of notification
        action_url: URL for the action button

    Returns:
        dict: Result of the email send operation
    """
    from django.contrib.auth import get_user_model
    from apps.users.services.email_service import EmailService

    User = get_user_model()

    try:
        recipient = User.objects.get(id=recipient_id)
        shared_by = User.objects.get(id=shared_by_id)
    except User.DoesNotExist as e:
        logger.error(f'User not found for share notification: {e}')
        return {'error': str(e), 'sent': False}

    # Check user preferences
    try:
        preferences = NotificationPreferences.get_or_create_for_user(recipient)
        notification_type_enum = Notification.NotificationType(notification_type)

        if not preferences.should_send_email(notification_type_enum):
            logger.info(f'Email notification disabled for user {recipient.email} for type {notification_type}')
            return {'sent': False, 'reason': 'User disabled email notifications'}
    except Exception as e:
        logger.warning(f'Could not check notification preferences: {e}')
        # Continue with default behavior (send email)

    # Build the document URL
    document_url = f"{settings.FRONTEND_URL}{action_url}"

    # Permission description
    permission_descriptions = {
        'VIEW': 'view',
        'COMMENT': 'view and comment',
        'EDIT': 'view and edit',
        'FULL': 'full access',
    }
    permission_desc = permission_descriptions.get(permission_level, 'view')

    try:
        success = EmailService.send_document_shared_notification(
            recipient_email=recipient.email,
            recipient_name=recipient.get_full_name() or recipient.username,
            document_name=resource_name,
            shared_by=shared_by.get_full_name() or shared_by.username,
            document_url=document_url,
            expires_at=None  # Can be enhanced to pass expiration
        )

        # Update notification email_sent status if notification exists
        if success:
            Notification.objects.filter(
                recipient=recipient,
                resource_id=resource_id,
                email_sent=False
            ).update(email_sent=True, email_sent_at=timezone.now())

        return {'sent': success, 'recipient': recipient.email}

    except Exception as e:
        logger.error(f'Failed to send share email notification: {e}')
        return {'error': str(e), 'sent': False}


@shared_task(name='send_weekly_sharing_digest')
def send_weekly_sharing_digest():
    """
    Send weekly digest of sharing activity to users who have it enabled.
    Should run weekly (e.g., Monday morning).

    Returns:
        dict: Statistics about sent digests
    """
    from django.contrib.auth import get_user_model
    from django.template.loader import render_to_string
    from apps.users.services.email_service import EmailService

    User = get_user_model()
    logger.info('Starting weekly sharing digest...')

    # Get current day of week (0=Monday, 6=Sunday)
    today = timezone.now().weekday()

    # Get users who want digest on this day
    preferences_for_today = NotificationPreferences.objects.filter(
        weekly_digest_enabled=True,
        weekly_digest_day=today
    ).select_related('user')

    sent_count = 0
    failed_count = 0
    skipped_count = 0

    week_ago = timezone.now() - timedelta(days=7)

    for pref in preferences_for_today.iterator():
        user = pref.user

        try:
            # Get sharing activity for this user in the past week
            shares_received = SharedItemAccess.objects.filter(
                recipient=user,
                shared_at__gte=week_ago,
                is_active=True
            ).count()

            invitations_received = ShareInvitation.objects.filter(
                invited_user=user,
                invited_at__gte=week_ago
            ).count()

            pending_invitations = ShareInvitation.objects.filter(
                invited_user=user,
                status=ShareInvitation.Status.PENDING
            ).count()

            # Skip if no activity
            if shares_received == 0 and invitations_received == 0 and pending_invitations == 0:
                skipped_count += 1
                continue

            # Get top sharers this week
            top_sharers = SharedItemAccess.objects.filter(
                recipient=user,
                shared_at__gte=week_ago,
                is_active=True
            ).values('shared_by__first_name', 'shared_by__last_name').annotate(
                count=Count('id')
            ).order_by('-count')[:5]

            # Build digest content
            context = {
                'user_name': user.get_full_name() or user.username,
                'shares_received': shares_received,
                'invitations_received': invitations_received,
                'pending_invitations': pending_invitations,
                'top_sharers': list(top_sharers),
                'week_start': week_ago.strftime('%B %d'),
                'week_end': timezone.now().strftime('%B %d, %Y'),
                'dashboard_url': f"{settings.FRONTEND_URL}/shared-with-me",
                'company_name': 'DFC - Digital Filing Cabinet',
                'support_email': getattr(settings, 'SUPPORT_EMAIL', 'support@dfc.com'),
            }

            try:
                html_content = render_to_string('emails/weekly_digest.html', context)
            except Exception as template_error:
                # Fallback to plain text if template doesn't exist
                logger.warning(f'Weekly digest template not found, using plain text: {template_error}')
                html_content = f"""
                <html>
                <body style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Weekly Sharing Summary</h2>
                    <p>Hi {context['user_name']},</p>
                    <p>Here's your sharing activity for {context['week_start']} - {context['week_end']}:</p>
                    <ul>
                        <li><strong>{shares_received}</strong> new items shared with you</li>
                        <li><strong>{invitations_received}</strong> new share invitations</li>
                        <li><strong>{pending_invitations}</strong> pending invitations</li>
                    </ul>
                    <p><a href="{context['dashboard_url']}">View your shared items</a></p>
                    <hr>
                    <p style="color: #666; font-size: 12px;">
                        This is an automated weekly digest from Digital Filing Cabinet.
                        You can disable this in your notification preferences.
                    </p>
                </body>
                </html>
                """

            # Send email using EmailService
            success = EmailService._send_email(
                to_email=user.email,
                subject=f'Your Weekly Sharing Summary - {context["week_start"]} to {context["week_end"]}',
                html_content=html_content,
                tags={'type': 'weekly_digest', 'category': 'digest'}
            )

            if success:
                sent_count += 1

                # Create a notification record for the digest
                Notification.objects.create(
                    recipient=user,
                    notification_type=Notification.NotificationType.WEEKLY_DIGEST,
                    title='Weekly Sharing Summary',
                    message=f'You received {shares_received} new shares and have {pending_invitations} pending invitations this week.',
                    action_url='/shared-with-me',
                    email_sent=True,
                    email_sent_at=timezone.now(),
                )
            else:
                failed_count += 1

        except Exception as e:
            logger.error(f'Failed to send weekly digest to {user.email}: {e}')
            failed_count += 1

    result = {
        'sent': sent_count,
        'failed': failed_count,
        'skipped': skipped_count,
        'timestamp': timezone.now().isoformat()
    }

    logger.info(f'Weekly sharing digest complete: {result}')
    return result


@shared_task(name='notify_expiring_shares')
def notify_expiring_shares(days_until_expiry=3):
    """
    Notify users about shares that are about to expire.

    Args:
        days_until_expiry: Number of days before expiry to notify

    Returns:
        dict: Statistics about sent notifications
    """
    logger.info(f'Checking for shares expiring in {days_until_expiry} days...')

    now = timezone.now()
    expiry_threshold = now + timedelta(days=days_until_expiry)

    # Find shares expiring soon that haven't been notified
    expiring_shares = SharedItemAccess.objects.filter(
        is_active=True,
        expires_at__isnull=False,
        expires_at__lte=expiry_threshold,
        expires_at__gt=now,
        is_notified=False  # Not yet notified about expiry
    ).select_related('recipient', 'shared_by')

    notified_count = 0

    for share in expiring_shares.iterator():
        try:
            # Check user preferences
            preferences = NotificationPreferences.get_or_create_for_user(share.recipient)

            if preferences.should_send_in_app(Notification.NotificationType.SHARE_EXPIRING):
                # Create in-app notification
                Notification.create_share_notification(
                    recipient=share.recipient,
                    shared_by=share.shared_by,
                    resource_type=share.resource_type,
                    resource_id=share.resource_id,
                    resource_name=share.resource_name,
                    permission_level=share.permission_level,
                    notification_type=Notification.NotificationType.SHARE_EXPIRING,
                )

            # Queue email if enabled
            if preferences.should_send_email(Notification.NotificationType.SHARE_EXPIRING):
                send_share_email_notification.delay(
                    recipient_id=str(share.recipient.id),
                    shared_by_id=str(share.shared_by.id),
                    resource_type=share.resource_type,
                    resource_id=str(share.resource_id),
                    resource_name=share.resource_name,
                    permission_level=share.permission_level,
                    notification_type='SHARE_EXPIRING',
                )

            # Mark as notified
            share.is_notified = True
            share.notification_sent_at = now
            share.save(update_fields=['is_notified', 'notification_sent_at'])

            notified_count += 1

        except Exception as e:
            logger.error(f'Failed to notify about expiring share {share.id}: {e}')

    result = {
        'notified': notified_count,
        'timestamp': timezone.now().isoformat()
    }

    logger.info(f'Expiring shares notification complete: {result}')
    return result


@shared_task(name='create_share_notification')
def create_share_notification(
    recipient_id,
    shared_by_id,
    resource_type,
    resource_id,
    resource_name,
    permission_level,
    notification_type='SHARE_RECEIVED',
    send_email=True
):
    """
    Create an in-app notification and optionally send email for a new share.

    This is the main entry point for share notifications.
    """
    from django.contrib.auth import get_user_model

    User = get_user_model()

    try:
        recipient = User.objects.get(id=recipient_id)
        shared_by = User.objects.get(id=shared_by_id)
    except User.DoesNotExist as e:
        logger.error(f'User not found for share notification: {e}')
        return {'error': str(e), 'created': False}

    try:
        # Check user preferences
        preferences = NotificationPreferences.get_or_create_for_user(recipient)
        notification_type_enum = Notification.NotificationType(notification_type)

        # Create in-app notification if enabled
        notification = None
        if preferences.should_send_in_app(notification_type_enum):
            notification = Notification.create_share_notification(
                recipient=recipient,
                shared_by=shared_by,
                resource_type=resource_type,
                resource_id=resource_id,
                resource_name=resource_name,
                permission_level=permission_level,
                notification_type=notification_type_enum,
            )

        # Send email if enabled
        if send_email and preferences.should_send_email(notification_type_enum):
            send_share_email_notification.delay(
                recipient_id=str(recipient_id),
                shared_by_id=str(shared_by_id),
                resource_type=resource_type,
                resource_id=str(resource_id),
                resource_name=resource_name,
                permission_level=permission_level,
                notification_type=notification_type,
            )

        return {
            'created': True,
            'notification_id': str(notification.id) if notification else None,
            'email_queued': send_email and preferences.should_send_email(notification_type_enum),
        }

    except Exception as e:
        logger.error(f'Failed to create share notification: {e}')
        return {'error': str(e), 'created': False}


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

    # Send weekly sharing digest (Monday at 9 AM)
    'send-weekly-sharing-digest': {
        'task': 'send_weekly_sharing_digest',
        'schedule': crontab(hour=9, minute=0, day_of_week=1),
    },

    # Notify about expiring shares daily at 8 AM
    'notify-expiring-shares': {
        'task': 'notify_expiring_shares',
        'schedule': crontab(hour=8, minute=0),
    },
}
"""
