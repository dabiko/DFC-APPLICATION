"""
Management command to verify encryption status and integrity.

This command checks:
1. All encrypted fields are properly encrypted
2. Encrypted data can be decrypted successfully
3. No plain text data in encrypted fields
4. Encryption key configuration is correct

Usage:
    python manage.py verify_encryption [options]

Options:
    --verbose: Show detailed output for each record
    --fix: Attempt to fix unencrypted data
    --sample-size: Number of records to check (0 for all)
"""

from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from cryptography.fernet import Fernet, MultiFernet, InvalidToken
from apps.documents.models import Document
import re


class Command(BaseCommand):
    help = 'Verify encryption status and integrity'

    def add_arguments(self, parser):
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed output',
        )
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Attempt to fix unencrypted data',
        )
        parser.add_argument(
            '--sample-size',
            type=int,
            default=0,
            help='Number of records to check (0 for all)',
        )

    def handle(self, *args, **options):
        verbose = options['verbose']
        fix = options['fix']
        sample_size = options['sample_size']

        self.stdout.write(self.style.SUCCESS('=' * 80))
        self.stdout.write(self.style.SUCCESS('ENCRYPTION VERIFICATION'))
        self.stdout.write(self.style.SUCCESS('=' * 80))
        self.stdout.write('')

        # Step 1: Verify encryption keys are configured
        self.stdout.write(self.style.HTTP_INFO('Step 1: Verifying encryption key configuration...'))
        keys_ok = self._verify_keys()
        if keys_ok:
            self.stdout.write(self.style.SUCCESS('✓ Encryption keys properly configured'))
        else:
            self.stdout.write(self.style.ERROR('✗ Encryption keys NOT configured'))
            return
        self.stdout.write('')

        # Step 2: Check encrypted field patterns
        self.stdout.write(self.style.HTTP_INFO('Step 2: Analyzing encrypted field patterns...'))
        stats = self._analyze_field_patterns(sample_size, verbose)
        self._print_stats(stats)
        self.stdout.write('')

        # Step 3: Verify decryption
        self.stdout.write(self.style.HTTP_INFO('Step 3: Testing decryption...'))
        decrypt_stats = self._verify_decryption(sample_size, verbose)
        self._print_decrypt_stats(decrypt_stats)
        self.stdout.write('')

        # Step 4: Check for unencrypted data
        self.stdout.write(self.style.HTTP_INFO('Step 4: Checking for unencrypted data...'))
        unencrypted = self._find_unencrypted(sample_size, verbose)
        if unencrypted['total'] == 0:
            self.stdout.write(self.style.SUCCESS('✓ No unencrypted data found'))
        else:
            self.stdout.write(self.style.WARNING(f'⚠ Found {unencrypted["total"]} records with potential unencrypted data'))
            if fix:
                self._fix_unencrypted(unencrypted)
        self.stdout.write('')

        # Summary
        self.stdout.write(self.style.SUCCESS('=' * 80))
        self.stdout.write(self.style.SUCCESS('VERIFICATION COMPLETE'))
        self.stdout.write(self.style.SUCCESS('=' * 80))
        self.stdout.write('')

        # Overall status
        if decrypt_stats['failures'] == 0 and unencrypted['total'] == 0:
            self.stdout.write(self.style.SUCCESS('✓ All encryption checks passed'))
        elif decrypt_stats['failures'] > 0:
            self.stdout.write(self.style.ERROR('✗ Decryption failures detected - immediate attention required'))
        else:
            self.stdout.write(self.style.WARNING('⚠ Some issues detected - review recommended'))

    def _verify_keys(self):
        """Verify encryption keys are configured."""
        keys = getattr(settings, 'FERNET_KEYS', [])

        if not keys:
            self.stdout.write(self.style.ERROR('  No FERNET_KEYS configured in settings'))
            return False

        self.stdout.write(f'  Found {len(keys)} encryption key(s)')

        # Verify each key is valid
        for i, key in enumerate(keys):
            try:
                Fernet(key.encode() if isinstance(key, str) else key)
                self.stdout.write(f'  Key {i+1}: Valid')
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  Key {i+1}: Invalid - {str(e)}'))
                return False

        return True

    def _analyze_field_patterns(self, sample_size, verbose):
        """Analyze pattern of encrypted fields."""
        queryset = Document.objects.all()
        if sample_size > 0:
            queryset = queryset[:sample_size]

        stats = {
            'total': queryset.count(),
            'customer_id_encrypted': 0,
            'account_number_encrypted': 0,
            'tax_id_encrypted': 0,
            'notes_encrypted': 0,
            'customer_id_null': 0,
            'account_number_null': 0,
            'tax_id_null': 0,
            'notes_null': 0,
        }

        # Fernet encrypted data starts with 'gAAAAA'
        encrypted_pattern = re.compile(r'^gAAAAA')

        for doc in queryset:
            # customer_id
            if not doc.customer_id:
                stats['customer_id_null'] += 1
            elif encrypted_pattern.match(doc.customer_id):
                stats['customer_id_encrypted'] += 1

            # account_number
            if not doc.account_number:
                stats['account_number_null'] += 1
            elif encrypted_pattern.match(doc.account_number):
                stats['account_number_encrypted'] += 1

            # tax_id
            if not doc.tax_id:
                stats['tax_id_null'] += 1
            elif encrypted_pattern.match(doc.tax_id):
                stats['tax_id_encrypted'] += 1

            # notes
            if not doc.notes:
                stats['notes_null'] += 1
            elif encrypted_pattern.match(doc.notes):
                stats['notes_encrypted'] += 1

        return stats

    def _print_stats(self, stats):
        """Print statistics."""
        self.stdout.write(f'  Total documents: {stats["total"]}')
        self.stdout.write('')
        self.stdout.write('  Field: customer_id')
        self.stdout.write(f'    Encrypted: {stats["customer_id_encrypted"]}')
        self.stdout.write(f'    Null/Empty: {stats["customer_id_null"]}')
        self.stdout.write('')
        self.stdout.write('  Field: account_number')
        self.stdout.write(f'    Encrypted: {stats["account_number_encrypted"]}')
        self.stdout.write(f'    Null/Empty: {stats["account_number_null"]}')
        self.stdout.write('')
        self.stdout.write('  Field: tax_id')
        self.stdout.write(f'    Encrypted: {stats["tax_id_encrypted"]}')
        self.stdout.write(f'    Null/Empty: {stats["tax_id_null"]}')
        self.stdout.write('')
        self.stdout.write('  Field: notes')
        self.stdout.write(f'    Encrypted: {stats["notes_encrypted"]}')
        self.stdout.write(f'    Null/Empty: {stats["notes_null"]}')

    def _verify_decryption(self, sample_size, verbose):
        """Verify encrypted data can be decrypted."""
        keys = getattr(settings, 'FERNET_KEYS', [])
        if not keys:
            return {'tested': 0, 'successes': 0, 'failures': 0}

        fernet_keys = [Fernet(k.encode() if isinstance(k, str) else k) for k in keys]
        multi_fernet = MultiFernet(fernet_keys) if len(fernet_keys) > 1 else fernet_keys[0]

        queryset = Document.objects.exclude(
            customer_id__isnull=True, customer_id=''
        ) | Document.objects.exclude(
            account_number__isnull=True, account_number=''
        ) | Document.objects.exclude(
            tax_id__isnull=True, tax_id=''
        ) | Document.objects.exclude(
            notes__isnull=True, notes=''
        )

        if sample_size > 0:
            queryset = queryset[:sample_size]

        stats = {'tested': 0, 'successes': 0, 'failures': 0, 'errors': []}

        for doc in queryset:
            # Test customer_id
            if doc.customer_id:
                stats['tested'] += 1
                try:
                    multi_fernet.decrypt(doc.customer_id.encode())
                    stats['successes'] += 1
                except InvalidToken:
                    stats['failures'] += 1
                    stats['errors'].append(f'Document {doc.id}: customer_id decryption failed')
                except Exception as e:
                    stats['failures'] += 1
                    stats['errors'].append(f'Document {doc.id}: customer_id error - {str(e)}')

            # Test account_number
            if doc.account_number:
                stats['tested'] += 1
                try:
                    multi_fernet.decrypt(doc.account_number.encode())
                    stats['successes'] += 1
                except InvalidToken:
                    stats['failures'] += 1
                    stats['errors'].append(f'Document {doc.id}: account_number decryption failed')
                except Exception as e:
                    stats['failures'] += 1
                    stats['errors'].append(f'Document {doc.id}: account_number error - {str(e)}')

            # Test tax_id
            if doc.tax_id:
                stats['tested'] += 1
                try:
                    multi_fernet.decrypt(doc.tax_id.encode())
                    stats['successes'] += 1
                except InvalidToken:
                    stats['failures'] += 1
                    stats['errors'].append(f'Document {doc.id}: tax_id decryption failed')
                except Exception as e:
                    stats['failures'] += 1
                    stats['errors'].append(f'Document {doc.id}: tax_id error - {str(e)}')

            # Test notes
            if doc.notes:
                stats['tested'] += 1
                try:
                    multi_fernet.decrypt(doc.notes.encode())
                    stats['successes'] += 1
                except InvalidToken:
                    stats['failures'] += 1
                    stats['errors'].append(f'Document {doc.id}: notes decryption failed')
                except Exception as e:
                    stats['failures'] += 1
                    stats['errors'].append(f'Document {doc.id}: notes error - {str(e)}')

        return stats

    def _print_decrypt_stats(self, stats):
        """Print decryption statistics."""
        if stats['tested'] == 0:
            self.stdout.write('  No encrypted fields to test')
            return

        self.stdout.write(f'  Total fields tested: {stats["tested"]}')
        self.stdout.write(f'  Successful decryptions: {stats["successes"]}')
        self.stdout.write(f'  Failed decryptions: {stats["failures"]}')

        if stats['failures'] > 0:
            self.stdout.write('')
            self.stdout.write(self.style.ERROR('  Decryption errors:'))
            for error in stats['errors'][:10]:  # Show first 10 errors
                self.stdout.write(f'    {error}')
            if len(stats['errors']) > 10:
                self.stdout.write(f'    ... and {len(stats["errors"]) - 10} more')

    def _find_unencrypted(self, sample_size, verbose):
        """Find potentially unencrypted data in encrypted fields."""
        queryset = Document.objects.all()
        if sample_size > 0:
            queryset = queryset[:sample_size]

        encrypted_pattern = re.compile(r'^gAAAAA')
        unencrypted = {'total': 0, 'records': []}

        for doc in queryset:
            unencrypted_fields = []

            # Check each encrypted field
            if doc.customer_id and not encrypted_pattern.match(doc.customer_id):
                unencrypted_fields.append('customer_id')

            if doc.account_number and not encrypted_pattern.match(doc.account_number):
                unencrypted_fields.append('account_number')

            if doc.tax_id and not encrypted_pattern.match(doc.tax_id):
                unencrypted_fields.append('tax_id')

            if doc.notes and not encrypted_pattern.match(doc.notes):
                unencrypted_fields.append('notes')

            if unencrypted_fields:
                unencrypted['total'] += 1
                unencrypted['records'].append({
                    'id': doc.id,
                    'fields': unencrypted_fields
                })

                if verbose:
                    self.stdout.write(f'  Document {doc.id}: {", ".join(unencrypted_fields)}')

        return unencrypted

    def _fix_unencrypted(self, unencrypted):
        """Attempt to encrypt unencrypted data."""
        self.stdout.write(self.style.WARNING(f'Attempting to fix {unencrypted["total"]} records...'))

        # This would require re-saving the records to trigger encryption
        # For safety, this is not implemented automatically
        self.stdout.write(self.style.ERROR('Automatic fix not implemented for safety'))
        self.stdout.write('Please investigate and manually fix unencrypted data')
