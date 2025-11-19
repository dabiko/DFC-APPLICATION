"""
Alerting system for encryption and security events.

Provides notification mechanisms for:
- Certificate expiration warnings
- Encryption failures
- Security breaches
- Vault connectivity issues
"""

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)


class AlertManager:
    """
    Centralized alert management for security and encryption events.
    """

    # Alert severity levels
    INFO = 'INFO'
    WARNING = 'WARNING'
    CRITICAL = 'CRITICAL'
    EMERGENCY = 'EMERGENCY'

    @classmethod
    def send_alert(
        cls,
        subject: str,
        message: str,
        severity: str = WARNING,
        recipients: Optional[List[str]] = None,
        alert_type: str = 'general'
    ):
        """
        Send alert via configured channels.

        Args:
            subject: Alert subject line
            message: Detailed alert message
            severity: Alert severity (INFO, WARNING, CRITICAL, EMERGENCY)
            recipients: List of email recipients (uses default if None)
            alert_type: Type of alert for routing
        """
        # Use default recipients if none provided
        if not recipients:
            recipients = cls._get_default_recipients(severity, alert_type)

        # Log the alert
        log_message = f'[{severity}] {subject}: {message}'
        if severity == cls.CRITICAL or severity == cls.EMERGENCY:
            logger.critical(log_message)
        elif severity == cls.WARNING:
            logger.warning(log_message)
        else:
            logger.info(log_message)

        # Send email notification
        if recipients and getattr(settings, 'ENABLE_EMAIL_ALERTS', False):
            cls._send_email_alert(subject, message, severity, recipients)

        # Send Slack notification (if configured)
        if getattr(settings, 'ENABLE_SLACK_ALERTS', False):
            cls._send_slack_alert(subject, message, severity)

        # Send SMS for CRITICAL/EMERGENCY (if configured)
        if severity in [cls.CRITICAL, cls.EMERGENCY]:
            if getattr(settings, 'ENABLE_SMS_ALERTS', False):
                cls._send_sms_alert(subject, message, recipients)

    @classmethod
    def _get_default_recipients(cls, severity: str, alert_type: str) -> List[str]:
        """
        Get default recipients based on severity and alert type.

        Args:
            severity: Alert severity level
            alert_type: Type of alert

        Returns:
            List of email addresses
        """
        # Get recipients from settings
        if severity == cls.EMERGENCY:
            return getattr(settings, 'EMERGENCY_ALERT_RECIPIENTS', [])
        elif severity == cls.CRITICAL:
            return getattr(settings, 'CRITICAL_ALERT_RECIPIENTS', [])
        elif alert_type == 'certificate':
            return getattr(settings, 'CERTIFICATE_ALERT_RECIPIENTS', [])
        elif alert_type == 'encryption':
            return getattr(settings, 'ENCRYPTION_ALERT_RECIPIENTS', [])
        else:
            return getattr(settings, 'DEFAULT_ALERT_RECIPIENTS', [])

    @classmethod
    def _send_email_alert(
        cls,
        subject: str,
        message: str,
        severity: str,
        recipients: List[str]
    ):
        """Send email alert."""
        try:
            # Add severity prefix
            subject_with_severity = f'[{severity}] {subject}'

            # Add footer
            full_message = f"{message}\n\n" \
                          f"---\n" \
                          f"Timestamp: {timezone.now().isoformat()}\n" \
                          f"Environment: {getattr(settings, 'ENVIRONMENT', 'unknown')}\n" \
                          f"System: Digital Filing Cabinet (DFC)"

            send_mail(
                subject=subject_with_severity,
                message=full_message,
                from_email=getattr(settings, 'ALERT_FROM_EMAIL', 'alerts@dfc.cccplc.com'),
                recipient_list=recipients,
                fail_silently=False,
            )

            logger.info(f'Email alert sent to {len(recipients)} recipients')
        except Exception as e:
            logger.error(f'Failed to send email alert: {str(e)}')

    @classmethod
    def _send_slack_alert(cls, subject: str, message: str, severity: str):
        """Send Slack notification."""
        try:
            import requests

            webhook_url = getattr(settings, 'SLACK_WEBHOOK_URL', None)
            if not webhook_url:
                return

            # Color-code based on severity
            color_map = {
                cls.INFO: '#36a64f',  # Green
                cls.WARNING: '#ff9900',  # Orange
                cls.CRITICAL: '#ff0000',  # Red
                cls.EMERGENCY: '#8b0000',  # Dark Red
            }

            payload = {
                'attachments': [
                    {
                        'color': color_map.get(severity, '#808080'),
                        'title': f'[{severity}] {subject}',
                        'text': message,
                        'footer': 'DFC Alert System',
                        'ts': int(timezone.now().timestamp()),
                    }
                ]
            }

            response = requests.post(webhook_url, json=payload, timeout=10)
            response.raise_for_status()

            logger.info('Slack alert sent successfully')
        except Exception as e:
            logger.error(f'Failed to send Slack alert: {str(e)}')

    @classmethod
    def _send_sms_alert(cls, subject: str, message: str, recipients: List[str]):
        """Send SMS alert for critical events."""
        try:
            # This is a placeholder for SMS integration
            # Integrate with Twilio, AWS SNS, or other SMS providers

            sms_numbers = getattr(settings, 'EMERGENCY_SMS_NUMBERS', [])
            if not sms_numbers:
                return

            # Example Twilio integration (commented out)
            """
            from twilio.rest import Client

            client = Client(
                settings.TWILIO_ACCOUNT_SID,
                settings.TWILIO_AUTH_TOKEN
            )

            for number in sms_numbers:
                client.messages.create(
                    body=f'{subject}: {message[:140]}',
                    from_=settings.TWILIO_FROM_NUMBER,
                    to=number
                )
            """

            logger.info(f'SMS alerts would be sent to {len(sms_numbers)} numbers')
        except Exception as e:
            logger.error(f'Failed to send SMS alert: {str(e)}')


class CertificateAlerts:
    """
    Certificate-specific alerting.
    """

    @classmethod
    def check_and_alert_expiration(cls, cert_status: Dict):
        """
        Check certificate status and send alerts if needed.

        Args:
            cert_status: Certificate status dictionary from CertificateMonitor
        """
        for cert_name, info in cert_status.items():
            if not info.get('valid'):
                cls._alert_invalid_certificate(cert_name, info)
                continue

            status = info.get('status')
            days_remaining = info.get('days_remaining', 0)

            if status == 'EXPIRED':
                cls._alert_expired_certificate(cert_name, info)
            elif status == 'CRITICAL':
                cls._alert_critical_expiration(cert_name, info)
            elif status == 'WARNING':
                cls._alert_warning_expiration(cert_name, info)

    @classmethod
    def _alert_invalid_certificate(cls, cert_name: str, info: Dict):
        """Alert for invalid/unreadable certificate."""
        subject = f'Certificate Invalid: {cert_name}'
        message = f'Certificate "{cert_name}" is invalid or unreadable.\n\n' \
                 f'Error: {info.get("error", "Unknown error")}\n\n' \
                 f'Action Required: Investigate certificate file and configuration.'

        AlertManager.send_alert(
            subject=subject,
            message=message,
            severity=AlertManager.CRITICAL,
            alert_type='certificate'
        )

    @classmethod
    def _alert_expired_certificate(cls, cert_name: str, info: Dict):
        """Alert for expired certificate."""
        subject = f'Certificate EXPIRED: {cert_name}'
        message = f'CRITICAL: Certificate "{cert_name}" has EXPIRED!\n\n' \
                 f'Expired On: {info.get("not_valid_after")}\n' \
                 f'Days Overdue: {abs(info.get("days_remaining", 0))}\n\n' \
                 f'IMMEDIATE ACTION REQUIRED:\n' \
                 f'1. Renew certificate immediately\n' \
                 f'2. Service may be experiencing SSL errors\n' \
                 f'3. Users may be unable to access the system'

        AlertManager.send_alert(
            subject=subject,
            message=message,
            severity=AlertManager.EMERGENCY,
            alert_type='certificate'
        )

    @classmethod
    def _alert_critical_expiration(cls, cert_name: str, info: Dict):
        """Alert for certificate expiring within 7 days."""
        subject = f'Certificate Expiring Soon: {cert_name}'
        message = f'WARNING: Certificate "{cert_name}" expires in {info.get("days_remaining")} days!\n\n' \
                 f'Expires On: {info.get("not_valid_after")}\n' \
                 f'Days Remaining: {info.get("days_remaining")}\n\n' \
                 f'URGENT ACTION REQUIRED:\n' \
                 f'1. Renew certificate before expiration\n' \
                 f'2. Verify auto-renewal is functioning\n' \
                 f'3. Test new certificate before expiration'

        AlertManager.send_alert(
            subject=subject,
            message=message,
            severity=AlertManager.CRITICAL,
            alert_type='certificate'
        )

    @classmethod
    def _alert_warning_expiration(cls, cert_name: str, info: Dict):
        """Alert for certificate expiring within 30 days."""
        subject = f'Certificate Renewal Reminder: {cert_name}'
        message = f'Certificate "{cert_name}" expires in {info.get("days_remaining")} days.\n\n' \
                 f'Expires On: {info.get("not_valid_after")}\n' \
                 f'Days Remaining: {info.get("days_remaining")}\n\n' \
                 f'Action Required:\n' \
                 f'1. Schedule certificate renewal\n' \
                 f'2. Verify auto-renewal configuration\n' \
                 f'3. Plan for certificate update'

        AlertManager.send_alert(
            subject=subject,
            message=message,
            severity=AlertManager.WARNING,
            alert_type='certificate'
        )


class EncryptionAlerts:
    """
    Encryption-specific alerting.
    """

    @classmethod
    def alert_high_failure_rate(cls, failure_rate: float, failure_count: int):
        """Alert on high decryption failure rate."""
        subject = 'High Encryption Failure Rate Detected'
        message = f'Decryption failure rate has exceeded threshold.\n\n' \
                 f'Current Failure Rate: {failure_rate:.2f}%\n' \
                 f'Total Failures: {failure_count}\n\n' \
                 f'Possible Causes:\n' \
                 f'1. Encryption key mismatch\n' \
                 f'2. Corrupted encrypted data\n' \
                 f'3. Key rotation not completed properly\n\n' \
                 f'Action Required:\n' \
                 f'1. Verify FERNET_KEYS configuration\n' \
                 f'2. Check recent key rotation logs\n' \
                 f'3. Run: python manage.py verify_encryption'

        AlertManager.send_alert(
            subject=subject,
            message=message,
            severity=AlertManager.CRITICAL,
            alert_type='encryption'
        )

    @classmethod
    def alert_key_rotation_overdue(cls, days_since_rotation: int):
        """Alert when key rotation is overdue."""
        subject = 'Encryption Key Rotation Overdue'
        message = f'Encryption keys have not been rotated recently.\n\n' \
                 f'Days Since Last Rotation: {days_since_rotation}\n' \
                 f'Recommended Rotation Interval: 90 days\n\n' \
                 f'Action Required:\n' \
                 f'1. Schedule key rotation maintenance window\n' \
                 f'2. Backup current database\n' \
                 f'3. Run: python manage.py rotate_encryption_keys --dry-run\n' \
                 f'4. Execute rotation during low-traffic period\n\n' \
                 f'See: docs/operations/KEY_ROTATION_PROCEDURES.md'

        AlertManager.send_alert(
            subject=subject,
            message=message,
            severity=AlertManager.WARNING,
            alert_type='encryption'
        )


class SecurityAlerts:
    """
    Security event alerting.
    """

    @classmethod
    def alert_vault_connectivity_failure(cls, error: str):
        """Alert on Vault connectivity issues."""
        subject = 'Vault Connectivity Failure'
        message = f'Unable to connect to HashiCorp Vault.\n\n' \
                 f'Error: {error}\n\n' \
                 f'Impact:\n' \
                 f'- Cannot retrieve encryption keys\n' \
                 f'- Cannot access stored secrets\n' \
                 f'- Application may fail to start\n\n' \
                 f'Action Required:\n' \
                 f'1. Verify Vault server status\n' \
                 f'2. Check VAULT_ADDR and VAULT_TOKEN\n' \
                 f'3. Check network connectivity\n' \
                 f'4. Review Vault logs'

        AlertManager.send_alert(
            subject=subject,
            message=message,
            severity=AlertManager.CRITICAL,
            alert_type='security'
        )

    @classmethod
    def alert_suspicious_activity(cls, event_type: str, details: Dict):
        """Alert on suspicious security events."""
        subject = f'Suspicious Activity Detected: {event_type}'
        message = f'Suspicious security event detected.\n\n' \
                 f'Event Type: {event_type}\n' \
                 f'Details: {details}\n\n' \
                 f'Action Required:\n' \
                 f'1. Review audit logs\n' \
                 f'2. Investigate user activity\n' \
                 f'3. Consider blocking suspicious IPs\n' \
                 f'4. Reset compromised credentials if necessary'

        AlertManager.send_alert(
            subject=subject,
            message=message,
            severity=AlertManager.CRITICAL,
            alert_type='security'
        )
