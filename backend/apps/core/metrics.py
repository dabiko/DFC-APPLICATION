"""
Encryption and security metrics collection for monitoring and alerting.

Tracks encryption operations, key usage, certificate status, and security events.
Integrates with Prometheus for metrics export and Grafana for visualization.
"""

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from datetime import datetime, timedelta
import logging
import ssl
import socket
from typing import Dict, Optional
from cryptography import x509
from cryptography.hazmat.backends import default_backend
import os

logger = logging.getLogger(__name__)


class EncryptionMetrics:
    """
    Collect and track encryption-related metrics.

    Metrics tracked:
    - Encryption operations (count, duration)
    - Decryption operations (count, duration, failures)
    - Key rotation events
    - Certificate expiration status
    - Security header compliance
    - Vault connectivity
    """

    # Cache keys
    ENCRYPTION_COUNT_KEY = 'metrics:encryption:count'
    DECRYPTION_COUNT_KEY = 'metrics:decryption:count'
    DECRYPTION_FAILURE_KEY = 'metrics:decryption:failures'
    KEY_ROTATION_KEY = 'metrics:key:rotation:last'
    CERT_CHECK_KEY = 'metrics:cert:last_check'

    @classmethod
    def increment_encryption_count(cls, field_name: str = None):
        """
        Increment encryption operation counter.

        Args:
            field_name: Optional field name for granular tracking
        """
        # Overall counter
        cache.incr(cls.ENCRYPTION_COUNT_KEY, 1)

        # Per-field counter
        if field_name:
            field_key = f'{cls.ENCRYPTION_COUNT_KEY}:{field_name}'
            cache.incr(field_key, 1)

        logger.debug(f'Encryption operation performed on field: {field_name}')

    @classmethod
    def increment_decryption_count(cls, field_name: str = None):
        """
        Increment decryption operation counter.

        Args:
            field_name: Optional field name for granular tracking
        """
        # Overall counter
        cache.incr(cls.DECRYPTION_COUNT_KEY, 1)

        # Per-field counter
        if field_name:
            field_key = f'{cls.DECRYPTION_COUNT_KEY}:{field_name}'
            cache.incr(field_key, 1)

        logger.debug(f'Decryption operation performed on field: {field_name}')

    @classmethod
    def increment_decryption_failure(cls, field_name: str = None, error: str = None):
        """
        Track decryption failures for alerting.

        Args:
            field_name: Field that failed decryption
            error: Error message
        """
        # Overall failure counter
        cache.incr(cls.DECRYPTION_FAILURE_KEY, 1)

        # Per-field failure counter
        if field_name:
            field_key = f'{cls.DECRYPTION_FAILURE_KEY}:{field_name}'
            cache.incr(field_key, 1)

        logger.error(f'Decryption failed on field {field_name}: {error}')

    @classmethod
    def record_key_rotation(cls):
        """Record timestamp of key rotation event."""
        timestamp = timezone.now().isoformat()
        cache.set(cls.KEY_ROTATION_KEY, timestamp, timeout=None)
        logger.info(f'Key rotation recorded at {timestamp}')

    @classmethod
    def get_metrics_summary(cls) -> Dict:
        """
        Get summary of all encryption metrics.

        Returns:
            Dictionary with all metric values
        """
        return {
            'encryption_operations': cache.get(cls.ENCRYPTION_COUNT_KEY, 0),
            'decryption_operations': cache.get(cls.DECRYPTION_COUNT_KEY, 0),
            'decryption_failures': cache.get(cls.DECRYPTION_FAILURE_KEY, 0),
            'last_key_rotation': cache.get(cls.KEY_ROTATION_KEY),
            'last_cert_check': cache.get(cls.CERT_CHECK_KEY),
        }

    @classmethod
    def reset_counters(cls):
        """Reset all metric counters (e.g., daily reset)."""
        cache.delete(cls.ENCRYPTION_COUNT_KEY)
        cache.delete(cls.DECRYPTION_COUNT_KEY)
        cache.delete(cls.DECRYPTION_FAILURE_KEY)
        logger.info('Encryption metrics counters reset')


class CertificateMonitor:
    """
    Monitor SSL/TLS certificate status and expiration.

    Features:
    - Check certificate expiration dates
    - Alert on approaching expiration
    - Verify certificate chain
    - Check certificate revocation status
    """

    @classmethod
    def check_certificate_file(cls, cert_path: str) -> Dict:
        """
        Check certificate file expiration.

        Args:
            cert_path: Path to certificate file

        Returns:
            Dictionary with certificate information
        """
        try:
            with open(cert_path, 'rb') as f:
                cert_data = f.read()

            cert = x509.load_pem_x509_certificate(cert_data, default_backend())

            not_valid_after = cert.not_valid_after
            days_remaining = (not_valid_after - datetime.utcnow()).days

            status = cls._get_certificate_status(days_remaining)

            result = {
                'valid': True,
                'not_valid_before': cert.not_valid_before.isoformat(),
                'not_valid_after': not_valid_after.isoformat(),
                'days_remaining': days_remaining,
                'status': status,
                'subject': cert.subject.rfc4514_string(),
                'issuer': cert.issuer.rfc4514_string(),
            }

            # Cache result
            cache.set(EncryptionMetrics.CERT_CHECK_KEY, timezone.now().isoformat(), timeout=3600)

            return result

        except FileNotFoundError:
            logger.error(f'Certificate file not found: {cert_path}')
            return {'valid': False, 'error': 'Certificate file not found'}
        except Exception as e:
            logger.error(f'Error checking certificate: {str(e)}')
            return {'valid': False, 'error': str(e)}

    @classmethod
    def check_certificate_remote(cls, hostname: str, port: int = 443) -> Dict:
        """
        Check remote server certificate.

        Args:
            hostname: Server hostname
            port: SSL/TLS port (default 443)

        Returns:
            Dictionary with certificate information
        """
        try:
            context = ssl.create_default_context()

            with socket.create_connection((hostname, port), timeout=10) as sock:
                with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                    cert_der = ssock.getpeercert(binary_form=True)
                    cert = x509.load_der_x509_certificate(cert_der, default_backend())

                    not_valid_after = cert.not_valid_after
                    days_remaining = (not_valid_after - datetime.utcnow()).days

                    status = cls._get_certificate_status(days_remaining)

                    return {
                        'valid': True,
                        'hostname': hostname,
                        'port': port,
                        'not_valid_before': cert.not_valid_before.isoformat(),
                        'not_valid_after': not_valid_after.isoformat(),
                        'days_remaining': days_remaining,
                        'status': status,
                        'subject': cert.subject.rfc4514_string(),
                        'issuer': cert.issuer.rfc4514_string(),
                    }
        except Exception as e:
            logger.error(f'Error checking remote certificate for {hostname}:{port} - {str(e)}')
            return {'valid': False, 'hostname': hostname, 'port': port, 'error': str(e)}

    @classmethod
    def _get_certificate_status(cls, days_remaining: int) -> str:
        """
        Determine certificate status based on days remaining.

        Args:
            days_remaining: Days until expiration

        Returns:
            Status string: OK, WARNING, CRITICAL, EXPIRED
        """
        if days_remaining < 0:
            return 'EXPIRED'
        elif days_remaining <= 7:
            return 'CRITICAL'
        elif days_remaining <= 30:
            return 'WARNING'
        else:
            return 'OK'

    @classmethod
    def get_all_certificate_status(cls) -> Dict:
        """
        Check all configured certificates.

        Returns:
            Dictionary with status of all certificates
        """
        results = {}

        # Check local certificate files
        cert_paths = getattr(settings, 'SSL_CERTIFICATE_PATHS', {})
        for name, path in cert_paths.items():
            if os.path.exists(path):
                results[name] = cls.check_certificate_file(path)

        # Check remote certificates
        remote_hosts = getattr(settings, 'REMOTE_CERTIFICATE_CHECKS', {})
        for name, config in remote_hosts.items():
            hostname = config.get('hostname')
            port = config.get('port', 443)
            results[f'remote_{name}'] = cls.check_certificate_remote(hostname, port)

        return results


class SecurityMetrics:
    """
    Track security-related metrics and events.

    Metrics:
    - Failed authentication attempts
    - Unauthorized access attempts
    - Security header compliance
    - Vault connectivity status
    """

    FAILED_AUTH_KEY = 'metrics:security:failed_auth'
    UNAUTHORIZED_ACCESS_KEY = 'metrics:security:unauthorized_access'
    VAULT_STATUS_KEY = 'metrics:security:vault_status'

    @classmethod
    def increment_failed_auth(cls, username: str = None, ip_address: str = None):
        """
        Track failed authentication attempts.

        Args:
            username: Username that failed authentication
            ip_address: IP address of failed attempt
        """
        cache.incr(cls.FAILED_AUTH_KEY, 1)

        logger.warning(
            f'Failed authentication attempt - '
            f'Username: {username}, IP: {ip_address}'
        )

    @classmethod
    def increment_unauthorized_access(cls, user_id: int = None, resource: str = None):
        """
        Track unauthorized access attempts.

        Args:
            user_id: User attempting unauthorized access
            resource: Resource that was accessed
        """
        cache.incr(cls.UNAUTHORIZED_ACCESS_KEY, 1)

        logger.warning(
            f'Unauthorized access attempt - '
            f'User ID: {user_id}, Resource: {resource}'
        )

    @classmethod
    def check_vault_connectivity(cls) -> bool:
        """
        Check HashiCorp Vault connectivity.

        Returns:
            True if Vault is accessible, False otherwise
        """
        try:
            from apps.core.vault_client import get_vault_client
            vault = get_vault_client()

            # Simple health check
            if vault and vault.client.is_authenticated():
                cache.set(cls.VAULT_STATUS_KEY, 'OK', timeout=300)
                return True
            else:
                cache.set(cls.VAULT_STATUS_KEY, 'FAILED', timeout=300)
                return False
        except Exception as e:
            logger.error(f'Vault connectivity check failed: {str(e)}')
            cache.set(cls.VAULT_STATUS_KEY, f'ERROR: {str(e)}', timeout=300)
            return False

    @classmethod
    def get_security_metrics(cls) -> Dict:
        """
        Get summary of security metrics.

        Returns:
            Dictionary with security metric values
        """
        return {
            'failed_auth_attempts': cache.get(cls.FAILED_AUTH_KEY, 0),
            'unauthorized_access_attempts': cache.get(cls.UNAUTHORIZED_ACCESS_KEY, 0),
            'vault_status': cache.get(cls.VAULT_STATUS_KEY, 'UNKNOWN'),
        }


# Prometheus metrics export (if prometheus_client is available)
try:
    from prometheus_client import Counter, Gauge, Histogram

    # Encryption operation counters
    encryption_operations = Counter(
        'dfc_encryption_operations_total',
        'Total number of encryption operations',
        ['field_name']
    )

    decryption_operations = Counter(
        'dfc_decryption_operations_total',
        'Total number of decryption operations',
        ['field_name']
    )

    decryption_failures = Counter(
        'dfc_decryption_failures_total',
        'Total number of decryption failures',
        ['field_name']
    )

    # Certificate metrics
    certificate_expiry_days = Gauge(
        'dfc_certificate_expiry_days',
        'Days until certificate expiration',
        ['certificate_name']
    )

    # Security metrics
    failed_auth_attempts = Counter(
        'dfc_failed_auth_attempts_total',
        'Total number of failed authentication attempts'
    )

    unauthorized_access_attempts = Counter(
        'dfc_unauthorized_access_attempts_total',
        'Total number of unauthorized access attempts'
    )

    vault_status = Gauge(
        'dfc_vault_status',
        'Vault connectivity status (1=OK, 0=FAILED)'
    )

    PROMETHEUS_AVAILABLE = True

except ImportError:
    PROMETHEUS_AVAILABLE = False
    logger.info('prometheus_client not available - metrics export disabled')
