"""
Management command to check encryption and security metrics.

Displays current metrics for:
- Encryption/decryption operations
- Certificate status and expiration
- Security events
- Vault connectivity

Usage:
    python manage.py check_encryption_metrics [--certificates] [--reset]
"""

from django.core.management.base import BaseCommand
from django.conf import settings
from apps.core.metrics import (
    EncryptionMetrics,
    CertificateMonitor,
    SecurityMetrics
)
from datetime import datetime


class Command(BaseCommand):
    help = 'Check encryption and security metrics'

    def add_arguments(self, parser):
        parser.add_argument(
            '--certificates',
            action='store_true',
            help='Check SSL/TLS certificates',
        )
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Reset metric counters',
        )
        parser.add_argument(
            '--json',
            action='store_true',
            help='Output in JSON format',
        )

    def handle(self, *args, **options):
        check_certs = options['certificates']
        reset = options['reset']
        json_output = options['json']

        if reset:
            self._reset_metrics()
            return

        if json_output:
            self._output_json()
            return

        self.stdout.write(self.style.SUCCESS('=' * 80))
        self.stdout.write(self.style.SUCCESS('ENCRYPTION & SECURITY METRICS'))
        self.stdout.write(self.style.SUCCESS('=' * 80))
        self.stdout.write('')

        # Encryption metrics
        self._display_encryption_metrics()

        # Security metrics
        self._display_security_metrics()

        # Certificate status
        if check_certs:
            self._display_certificate_status()

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 80))

    def _display_encryption_metrics(self):
        """Display encryption operation metrics."""
        self.stdout.write(self.style.HTTP_INFO('Encryption Operations:'))

        metrics = EncryptionMetrics.get_metrics_summary()

        self.stdout.write(f'  Total Encryptions: {metrics["encryption_operations"]}')
        self.stdout.write(f'  Total Decryptions: {metrics["decryption_operations"]}')
        self.stdout.write(f'  Decryption Failures: {metrics["decryption_failures"]}')

        # Calculate failure rate
        if metrics['decryption_operations'] > 0:
            failure_rate = (
                metrics['decryption_failures'] / metrics['decryption_operations'] * 100
            )
            if failure_rate > 1.0:
                self.stdout.write(
                    self.style.ERROR(f'  Failure Rate: {failure_rate:.2f}% ⚠')
                )
            else:
                self.stdout.write(f'  Failure Rate: {failure_rate:.2f}%')

        # Last key rotation
        if metrics['last_key_rotation']:
            self.stdout.write(f'  Last Key Rotation: {metrics["last_key_rotation"]}')
        else:
            self.stdout.write(
                self.style.WARNING('  Last Key Rotation: Never (consider rotating)')
            )

        self.stdout.write('')

    def _display_security_metrics(self):
        """Display security event metrics."""
        self.stdout.write(self.style.HTTP_INFO('Security Events:'))

        metrics = SecurityMetrics.get_security_metrics()

        self.stdout.write(
            f'  Failed Authentication Attempts: {metrics["failed_auth_attempts"]}'
        )
        self.stdout.write(
            f'  Unauthorized Access Attempts: {metrics["unauthorized_access_attempts"]}'
        )

        # Vault status
        vault_status = metrics['vault_status']
        if vault_status == 'OK':
            self.stdout.write(
                self.style.SUCCESS(f'  Vault Status: {vault_status} ✓')
            )
        elif vault_status == 'UNKNOWN':
            self.stdout.write(
                self.style.WARNING(f'  Vault Status: {vault_status}')
            )
        else:
            self.stdout.write(
                self.style.ERROR(f'  Vault Status: {vault_status} ✗')
            )

        self.stdout.write('')

    def _display_certificate_status(self):
        """Display SSL/TLS certificate status."""
        self.stdout.write(self.style.HTTP_INFO('Certificate Status:'))
        self.stdout.write('')

        cert_status = CertificateMonitor.get_all_certificate_status()

        if not cert_status:
            self.stdout.write(
                self.style.WARNING('  No certificates configured for monitoring')
            )
            return

        for name, info in cert_status.items():
            if not info.get('valid'):
                self.stdout.write(
                    self.style.ERROR(f'  {name}: INVALID - {info.get("error")}')
                )
                continue

            days_remaining = info['days_remaining']
            status = info['status']
            not_after = info['not_valid_after']

            # Color-code based on status
            if status == 'OK':
                status_display = self.style.SUCCESS(f'{status} ✓')
            elif status == 'WARNING':
                status_display = self.style.WARNING(f'{status} ⚠')
            elif status == 'CRITICAL':
                status_display = self.style.ERROR(f'{status} ⚠⚠')
            else:  # EXPIRED
                status_display = self.style.ERROR(f'{status} ✗')

            self.stdout.write(f'  {name}:')
            self.stdout.write(f'    Status: {status_display}')
            self.stdout.write(f'    Days Remaining: {days_remaining}')
            self.stdout.write(f'    Expires: {not_after}')
            self.stdout.write(f'    Subject: {info.get("subject", "N/A")}')
            self.stdout.write('')

    def _reset_metrics(self):
        """Reset all metric counters."""
        self.stdout.write(
            self.style.WARNING('Resetting all encryption metric counters...')
        )

        EncryptionMetrics.reset_counters()

        self.stdout.write(self.style.SUCCESS('✓ Metrics reset complete'))

    def _output_json(self):
        """Output metrics in JSON format."""
        import json

        data = {
            'timestamp': datetime.utcnow().isoformat(),
            'encryption': EncryptionMetrics.get_metrics_summary(),
            'security': SecurityMetrics.get_security_metrics(),
        }

        self.stdout.write(json.dumps(data, indent=2))
