"""
Celery tasks for user and MFA management.

Scheduled tasks:
- Cleanup old used backup codes (90 days retention)
- Cleanup expired trusted devices
"""

from celery import shared_task
from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.audit.utils import log_audit_event
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


@shared_task(name='cleanup_old_backup_codes')
def cleanup_old_backup_codes(days=90):
    """
    Delete used backup codes older than specified days.

    This task runs daily to clean up old used backup codes for security
    and database maintenance purposes. Used codes older than 90 days
    serve no purpose as they cannot be reused.

    Args:
        days: Number of days to retain used backup codes (default: 90)

    Returns:
        dict: Summary of cleanup operation
    """
    from apps.users.mfa_models import MFABackupCode

    logger.info(f'Starting cleanup of used backup codes older than {days} days...')

    try:
        # Get count and user IDs before deletion for audit
        cutoff_date = timezone.now() - timezone.timedelta(days=days)
        old_codes = MFABackupCode.objects.filter(
            used=True,
            used_at__lt=cutoff_date
        )

        # Group by user for audit logging
        user_code_counts = {}
        for code in old_codes.select_related('user'):
            user_id = code.user_id
            if user_id not in user_code_counts:
                user_code_counts[user_id] = {
                    'count': 0,
                    'user_email': code.user.email if code.user else 'Unknown'
                }
            user_code_counts[user_id]['count'] += 1

        total_deleted = old_codes.count()
        affected_users = len(user_code_counts)

        if total_deleted == 0:
            logger.info('No old backup codes to clean up')
            return {
                'success': True,
                'deleted_count': 0,
                'affected_users': 0,
                'message': 'No old backup codes to clean up'
            }

        # Delete the old codes
        old_codes.delete()

        # Log audit event for system action
        log_audit_event(
            user=None,  # System action
            action='mfa_backup_codes_cleanup',
            resource_type='mfa_backup_codes',
            resource_id='system',
            outcome='success',
            details={
                'message': f'Cleaned up {total_deleted} used backup codes older than {days} days',
                'deleted_count': total_deleted,
                'affected_users': affected_users,
                'retention_days': days,
                'cutoff_date': cutoff_date.isoformat(),
                'user_breakdown': [
                    {'user_id': uid, 'email': info['user_email'], 'codes_deleted': info['count']}
                    for uid, info in user_code_counts.items()
                ]
            }
        )

        # Log individual audit events per user for compliance
        for user_id, info in user_code_counts.items():
            try:
                user = User.objects.get(id=user_id)
                log_audit_event(
                    user=user,
                    action='mfa_backup_codes_auto_deleted',
                    resource_type='mfa_backup_codes',
                    resource_id=str(user_id),
                    outcome='success',
                    details={
                        'message': f'{info["count"]} used backup codes automatically deleted (retention policy: {days} days)',
                        'codes_deleted': info['count'],
                        'retention_days': days,
                        'reason': 'Automatic cleanup of used backup codes exceeding retention period'
                    }
                )
            except User.DoesNotExist:
                pass

        logger.info(f'Successfully cleaned up {total_deleted} old backup codes affecting {affected_users} users')

        return {
            'success': True,
            'deleted_count': total_deleted,
            'affected_users': affected_users,
            'retention_days': days,
            'message': f'Cleaned up {total_deleted} used backup codes older than {days} days'
        }

    except Exception as e:
        logger.error(f'Error cleaning up old backup codes: {str(e)}')

        # Log failure audit event
        log_audit_event(
            user=None,
            action='mfa_backup_codes_cleanup',
            resource_type='mfa_backup_codes',
            resource_id='system',
            outcome='failure',
            details={
                'error': str(e),
                'retention_days': days
            }
        )

        return {
            'success': False,
            'error': str(e),
            'message': f'Failed to clean up old backup codes: {str(e)}'
        }


@shared_task(name='cleanup_expired_trusted_devices')
def cleanup_expired_trusted_devices():
    """
    Delete expired trusted devices.

    This task runs daily to remove trusted devices that have expired.
    This helps maintain database hygiene and ensures expired trust
    relationships don't persist.

    Returns:
        dict: Summary of cleanup operation
    """
    from apps.users.mfa_models import TrustedDevice

    logger.info('Starting cleanup of expired trusted devices...')

    try:
        # Get expired devices
        expired_devices = TrustedDevice.objects.filter(
            expires_at__lt=timezone.now()
        )

        # Group by user for audit logging
        user_device_counts = {}
        for device in expired_devices.select_related('user'):
            user_id = device.user_id
            if user_id not in user_device_counts:
                user_device_counts[user_id] = {
                    'count': 0,
                    'user_email': device.user.email if device.user else 'Unknown'
                }
            user_device_counts[user_id]['count'] += 1

        total_deleted = expired_devices.count()
        affected_users = len(user_device_counts)

        if total_deleted == 0:
            logger.info('No expired trusted devices to clean up')
            return {
                'success': True,
                'deleted_count': 0,
                'affected_users': 0,
                'message': 'No expired trusted devices to clean up'
            }

        # Delete expired devices
        expired_devices.delete()

        # Log system audit event
        log_audit_event(
            user=None,
            action='trusted_devices_cleanup',
            resource_type='trusted_devices',
            resource_id='system',
            outcome='success',
            details={
                'message': f'Cleaned up {total_deleted} expired trusted devices',
                'deleted_count': total_deleted,
                'affected_users': affected_users,
            }
        )

        logger.info(f'Successfully cleaned up {total_deleted} expired trusted devices affecting {affected_users} users')

        return {
            'success': True,
            'deleted_count': total_deleted,
            'affected_users': affected_users,
            'message': f'Cleaned up {total_deleted} expired trusted devices'
        }

    except Exception as e:
        logger.error(f'Error cleaning up expired trusted devices: {str(e)}')

        log_audit_event(
            user=None,
            action='trusted_devices_cleanup',
            resource_type='trusted_devices',
            resource_id='system',
            outcome='failure',
            details={'error': str(e)}
        )

        return {
            'success': False,
            'error': str(e),
            'message': f'Failed to clean up expired trusted devices: {str(e)}'
        }


@shared_task(name='reset_mfa_regeneration_counters')
def reset_mfa_regeneration_counters():
    """
    Reset MFA regeneration counters for users where 24 hours have passed.

    This is a maintenance task to ensure counters are properly reset
    even if users don't trigger the reset through normal API usage.

    Returns:
        dict: Summary of reset operation
    """
    from apps.users.mfa_models import MFASettings
    from datetime import timedelta

    logger.info('Starting reset of MFA regeneration counters...')

    try:
        cutoff_time = timezone.now() - timedelta(hours=24)

        # Find settings where counter should be reset
        settings_to_reset = MFASettings.objects.filter(
            backup_codes_regeneration_reset_at__lt=cutoff_time,
            backup_codes_regenerated_count__gt=0
        )

        reset_count = settings_to_reset.count()

        if reset_count == 0:
            logger.info('No MFA regeneration counters need resetting')
            return {
                'success': True,
                'reset_count': 0,
                'message': 'No counters need resetting'
            }

        # Reset the counters
        settings_to_reset.update(
            backup_codes_regenerated_count=0,
            backup_codes_regeneration_reset_at=timezone.now()
        )

        logger.info(f'Successfully reset {reset_count} MFA regeneration counters')

        return {
            'success': True,
            'reset_count': reset_count,
            'message': f'Reset {reset_count} MFA regeneration counters'
        }

    except Exception as e:
        logger.error(f'Error resetting MFA regeneration counters: {str(e)}')
        return {
            'success': False,
            'error': str(e),
            'message': f'Failed to reset counters: {str(e)}'
        }
