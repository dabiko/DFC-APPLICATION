"""
Celery tasks for encryption and security monitoring.

Scheduled tasks:
- Certificate expiration monitoring
- Encryption metrics collection
- Key rotation reminders
- Vault connectivity checks
"""

from celery import shared_task
from django.conf import settings
from apps.core.metrics import EncryptionMetrics, CertificateMonitor, SecurityMetrics
from apps.core.alerts import CertificateAlerts, EncryptionAlerts, SecurityAlerts
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


@shared_task(name='check_certificate_expiration')
def check_certificate_expiration():
    """
    Check all configured certificates and send alerts if needed.

    Runs daily to monitor certificate status.
    """
    logger.info('Running certificate expiration check...')

    try:
        # Get status of all certificates
        cert_status = CertificateMonitor.get_all_certificate_status()

        if not cert_status:
            logger.warning('No certificates configured for monitoring')
            return

        # Check each certificate and send alerts
        CertificateAlerts.check_and_alert_expiration(cert_status)

        # Count certificates by status
        status_counts = {
            'OK': 0,
            'WARNING': 0,
            'CRITICAL': 0,
            'EXPIRED': 0,
            'INVALID': 0,
        }

        for info in cert_status.values():
            if not info.get('valid'):
                status_counts['INVALID'] += 1
            else:
                status = info.get('status', 'UNKNOWN')
                status_counts[status] = status_counts.get(status, 0) + 1

        logger.info(f'Certificate check complete: {status_counts}')

        return {
            'timestamp': datetime.utcnow().isoformat(),
            'certificates_checked': len(cert_status),
            'status_counts': status_counts,
        }

    except Exception as e:
        logger.error(f'Certificate expiration check failed: {str(e)}')
        raise


@shared_task(name='check_encryption_metrics')
def check_encryption_metrics():
    """
    Check encryption metrics and alert on anomalies.

    Monitors:
    - Decryption failure rates
    - Key rotation status
    """
    logger.info('Checking encryption metrics...')

    try:
        metrics = EncryptionMetrics.get_metrics_summary()

        # Calculate failure rate
        decryption_ops = metrics.get('decryption_operations', 0)
        decryption_failures = metrics.get('decryption_failures', 0)

        if decryption_ops > 0:
            failure_rate = (decryption_failures / decryption_ops) * 100

            # Alert if failure rate exceeds threshold
            threshold = getattr(settings, 'ENCRYPTION_FAILURE_THRESHOLD', 1.0)
            if failure_rate > threshold:
                EncryptionAlerts.alert_high_failure_rate(
                    failure_rate=failure_rate,
                    failure_count=decryption_failures
                )

        # Check key rotation status
        last_rotation = metrics.get('last_key_rotation')
        if last_rotation:
            last_rotation_date = datetime.fromisoformat(last_rotation)
            days_since_rotation = (datetime.now() - last_rotation_date).days

            # Alert if key rotation is overdue (default: 90 days)
            rotation_interval = getattr(settings, 'KEY_ROTATION_INTERVAL_DAYS', 90)
            if days_since_rotation > rotation_interval:
                EncryptionAlerts.alert_key_rotation_overdue(days_since_rotation)

        logger.info('Encryption metrics check complete')

        return {
            'timestamp': datetime.utcnow().isoformat(),
            'metrics': metrics,
        }

    except Exception as e:
        logger.error(f'Encryption metrics check failed: {str(e)}')
        raise


@shared_task(name='check_vault_connectivity')
def check_vault_connectivity():
    """
    Check HashiCorp Vault connectivity and alert on failures.

    Runs periodically to ensure Vault is accessible.
    """
    logger.info('Checking Vault connectivity...')

    try:
        is_connected = SecurityMetrics.check_vault_connectivity()

        if not is_connected:
            SecurityAlerts.alert_vault_connectivity_failure(
                error='Vault is not accessible or authentication failed'
            )
            logger.error('Vault connectivity check failed')
            return {
                'timestamp': datetime.utcnow().isoformat(),
                'status': 'FAILED',
            }

        logger.info('Vault connectivity check passed')

        return {
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'OK',
        }

    except Exception as e:
        logger.error(f'Vault connectivity check failed: {str(e)}')
        SecurityAlerts.alert_vault_connectivity_failure(error=str(e))
        raise


@shared_task(name='collect_security_metrics')
def collect_security_metrics():
    """
    Collect and log security metrics for analysis.

    Runs hourly to track security events.
    """
    logger.info('Collecting security metrics...')

    try:
        metrics = SecurityMetrics.get_security_metrics()

        # Log metrics for analysis
        logger.info(f'Security metrics: {metrics}')

        # Check for suspicious activity patterns
        failed_auth = metrics.get('failed_auth_attempts', 0)
        unauthorized_access = metrics.get('unauthorized_access_attempts', 0)

        # Alert if thresholds exceeded
        if failed_auth > getattr(settings, 'FAILED_AUTH_THRESHOLD', 100):
            SecurityAlerts.alert_suspicious_activity(
                event_type='Excessive Failed Authentication',
                details={
                    'failed_attempts': failed_auth,
                    'period': '1 hour',
                }
            )

        if unauthorized_access > getattr(settings, 'UNAUTHORIZED_ACCESS_THRESHOLD', 50):
            SecurityAlerts.alert_suspicious_activity(
                event_type='Excessive Unauthorized Access Attempts',
                details={
                    'attempts': unauthorized_access,
                    'period': '1 hour',
                }
            )

        return {
            'timestamp': datetime.utcnow().isoformat(),
            'metrics': metrics,
        }

    except Exception as e:
        logger.error(f'Security metrics collection failed: {str(e)}')
        raise


@shared_task(name='reset_daily_metrics')
def reset_daily_metrics():
    """
    Reset daily metric counters.

    Runs at midnight to reset counters for daily tracking.
    """
    logger.info('Resetting daily metrics...')

    try:
        EncryptionMetrics.reset_counters()

        logger.info('Daily metrics reset complete')

        return {
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'reset',
        }

    except Exception as e:
        logger.error(f'Daily metrics reset failed: {str(e)}')
        raise


# Celery Beat Schedule Configuration
"""
Add to config/settings/base.py or config/celery.py:

from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    # Check certificates daily at 3 AM
    'check-certificate-expiration': {
        'task': 'check_certificate_expiration',
        'schedule': crontab(hour=3, minute=0),
    },

    # Check encryption metrics every 6 hours
    'check-encryption-metrics': {
        'task': 'check_encryption_metrics',
        'schedule': crontab(hour='*/6', minute=0),
    },

    # Check Vault connectivity every 15 minutes
    'check-vault-connectivity': {
        'task': 'check_vault_connectivity',
        'schedule': crontab(minute='*/15'),
    },

    # Collect security metrics hourly
    'collect-security-metrics': {
        'task': 'collect_security_metrics',
        'schedule': crontab(minute=0),
    },

    # Reset daily metrics at midnight
    'reset-daily-metrics': {
        'task': 'reset_daily_metrics',
        'schedule': crontab(hour=0, minute=0),
    },
}
"""
