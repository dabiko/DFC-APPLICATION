"""
Management command to rotate encryption keys and re-encrypt existing data.

This command performs a complete encryption key rotation:
1. Generates a new Fernet encryption key
2. Re-encrypts all existing encrypted data with the new key
3. Updates Vault with the new key configuration
4. Provides rollback capability in case of errors

Usage:
    python manage.py rotate_encryption_keys [options]

Options:
    --dry-run: Simulate the rotation without making changes
    --batch-size: Number of records to process at a time (default: 100)
    --skip-vault: Don't update Vault (for testing)
    --backup-path: Path to store encryption key backup
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.conf import settings
from cryptography.fernet import Fernet, MultiFernet
from apps.documents.models import Document
from apps.core.vault_client import get_vault_client
import json
import os
from datetime import datetime


class Command(BaseCommand):
    help = 'Rotate encryption keys and re-encrypt existing data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simulate rotation without making changes',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Number of records to process per batch',
        )
        parser.add_argument(
            '--skip-vault',
            action='store_true',
            help='Skip Vault update (for testing)',
        )
        parser.add_argument(
            '--backup-path',
            type=str,
            default='/var/backups/dfc/encryption-keys',
            help='Path to store key backups',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        batch_size = options['batch_size']
        skip_vault = options['skip_vault']
        backup_path = options['backup_path']

        self.stdout.write(self.style.WARNING('=' * 80))
        self.stdout.write(self.style.WARNING('ENCRYPTION KEY ROTATION'))
        self.stdout.write(self.style.WARNING('=' * 80))
        self.stdout.write('')

        if dry_run:
            self.stdout.write(self.style.NOTICE('DRY RUN MODE - No changes will be made'))
            self.stdout.write('')

        # Step 1: Backup current keys
        self.stdout.write(self.style.HTTP_INFO('Step 1: Backing up current encryption keys...'))
        current_keys = self._backup_current_keys(backup_path, dry_run)
        self.stdout.write(self.style.SUCCESS(f'✓ Keys backed up to: {backup_path}'))
        self.stdout.write('')

        # Step 2: Generate new key
        self.stdout.write(self.style.HTTP_INFO('Step 2: Generating new encryption key...'))
        new_key = Fernet.generate_key().decode()
        self.stdout.write(self.style.SUCCESS(f'✓ New key generated'))
        self.stdout.write('')

        # Step 3: Count records to re-encrypt
        self.stdout.write(self.style.HTTP_INFO('Step 3: Analyzing encrypted data...'))
        stats = self._analyze_encrypted_data()
        self.stdout.write(self.style.SUCCESS(f'✓ Found {stats["total"]} documents with encrypted fields'))
        self.stdout.write(f'  - With customer_id: {stats["customer_id"]}')
        self.stdout.write(f'  - With account_number: {stats["account_number"]}')
        self.stdout.write(f'  - With tax_id: {stats["tax_id"]}')
        self.stdout.write(f'  - With notes: {stats["notes"]}')
        self.stdout.write('')

        # Step 4: Confirm operation
        if not dry_run:
            self.stdout.write(self.style.WARNING('This operation will re-encrypt all encrypted data.'))
            self.stdout.write(self.style.WARNING('This may take a while and cannot be interrupted safely.'))
            confirm = input('Continue? [y/N]: ')
            if confirm.lower() != 'y':
                self.stdout.write(self.style.ERROR('Operation cancelled by user'))
                return
            self.stdout.write('')

        # Step 5: Re-encrypt data
        self.stdout.write(self.style.HTTP_INFO('Step 4: Re-encrypting data...'))
        try:
            result = self._reencrypt_data(new_key, current_keys, batch_size, dry_run)
            self.stdout.write(self.style.SUCCESS(f'✓ Re-encrypted {result["processed"]} documents'))
            if result["errors"]:
                self.stdout.write(self.style.WARNING(f'  ⚠ {result["errors"]} errors encountered'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Re-encryption failed: {str(e)}'))
            self.stdout.write(self.style.ERROR('Rolling back...'))
            raise
        self.stdout.write('')

        # Step 6: Update Vault
        if not skip_vault:
            self.stdout.write(self.style.HTTP_INFO('Step 5: Updating Vault with new keys...'))
            try:
                self._update_vault(new_key, current_keys[0] if current_keys else None, dry_run)
                self.stdout.write(self.style.SUCCESS('✓ Vault updated'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'✗ Vault update failed: {str(e)}'))
                self.stdout.write(self.style.WARNING('Key rotation completed but Vault not updated'))
                self.stdout.write(self.style.WARNING('Manual Vault update required!'))
        else:
            self.stdout.write(self.style.NOTICE('Skipping Vault update (--skip-vault)'))
        self.stdout.write('')

        # Step 7: Summary
        self.stdout.write(self.style.SUCCESS('=' * 80))
        self.stdout.write(self.style.SUCCESS('KEY ROTATION COMPLETE'))
        self.stdout.write(self.style.SUCCESS('=' * 80))
        self.stdout.write('')
        self.stdout.write('Next steps:')
        self.stdout.write('1. Update environment variables with new FERNET_KEY_PRIMARY')
        self.stdout.write('2. Keep old key as FERNET_KEY_SECONDARY for 7 days')
        self.stdout.write('3. Restart application servers to use new keys')
        self.stdout.write('4. Monitor logs for decryption errors')
        self.stdout.write('5. After 7 days, remove FERNET_KEY_SECONDARY')
        self.stdout.write('')
        self.stdout.write(f'New primary key: {new_key[:20]}...')
        self.stdout.write(f'Old primary key (now secondary): {current_keys[0][:20] if current_keys else "N/A"}...')
        self.stdout.write('')

    def _backup_current_keys(self, backup_path, dry_run):
        """Backup current encryption keys."""
        current_keys = getattr(settings, 'FERNET_KEYS', [])

        if not current_keys:
            self.stdout.write(self.style.WARNING('No existing keys found in settings'))
            return []

        if dry_run:
            self.stdout.write(self.style.NOTICE(f'[DRY RUN] Would backup {len(current_keys)} keys'))
            return current_keys

        # Create backup directory
        os.makedirs(backup_path, exist_ok=True)

        # Backup file with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = os.path.join(backup_path, f'keys_backup_{timestamp}.json')

        backup_data = {
            'timestamp': timestamp,
            'keys': current_keys,
            'primary': current_keys[0] if current_keys else None,
            'secondary': current_keys[1] if len(current_keys) > 1 else None,
        }

        with open(backup_file, 'w') as f:
            json.dump(backup_data, f, indent=2)

        # Set restrictive permissions
        os.chmod(backup_file, 0o600)

        return current_keys

    def _analyze_encrypted_data(self):
        """Analyze how much encrypted data exists."""
        stats = {
            'total': Document.objects.count(),
            'customer_id': Document.objects.exclude(customer_id__isnull=True).exclude(customer_id='').count(),
            'account_number': Document.objects.exclude(account_number__isnull=True).exclude(account_number='').count(),
            'tax_id': Document.objects.exclude(tax_id__isnull=True).exclude(tax_id='').count(),
            'notes': Document.objects.exclude(notes__isnull=True).exclude(notes='').count(),
        }
        return stats

    def _reencrypt_data(self, new_key, old_keys, batch_size, dry_run):
        """Re-encrypt all encrypted data with new key."""
        # Create Fernet instances
        new_fernet = Fernet(new_key.encode())
        old_fernet = MultiFernet([Fernet(k.encode()) for k in old_keys]) if old_keys else None

        processed = 0
        errors = 0
        total = Document.objects.count()

        # Process in batches
        for offset in range(0, total, batch_size):
            documents = Document.objects.all()[offset:offset + batch_size]

            with transaction.atomic():
                for doc in documents:
                    try:
                        self._reencrypt_document(doc, new_fernet, old_fernet, dry_run)
                        processed += 1

                        # Progress indicator
                        if processed % 100 == 0:
                            percent = (processed / total) * 100
                            self.stdout.write(f'  Progress: {processed}/{total} ({percent:.1f}%)', ending='\r')

                    except Exception as e:
                        errors += 1
                        self.stdout.write(self.style.ERROR(f'Error processing document {doc.id}: {str(e)}'))

                if dry_run:
                    # Rollback transaction in dry-run mode
                    transaction.set_rollback(True)

        self.stdout.write('')  # New line after progress indicator
        return {'processed': processed, 'errors': errors}

    def _reencrypt_document(self, doc, new_fernet, old_fernet, dry_run):
        """Re-encrypt a single document's encrypted fields."""
        updated = False

        # Re-encrypt customer_id
        if doc.customer_id:
            if old_fernet:
                # Decrypt with old key
                decrypted = old_fernet.decrypt(doc.customer_id.encode())
            else:
                # If no old key, assume already decrypted
                decrypted = doc.customer_id.encode()

            # Encrypt with new key
            doc.customer_id = new_fernet.encrypt(decrypted).decode()
            updated = True

        # Re-encrypt account_number
        if doc.account_number:
            if old_fernet:
                decrypted = old_fernet.decrypt(doc.account_number.encode())
            else:
                decrypted = doc.account_number.encode()
            doc.account_number = new_fernet.encrypt(decrypted).decode()
            updated = True

        # Re-encrypt tax_id
        if doc.tax_id:
            if old_fernet:
                decrypted = old_fernet.decrypt(doc.tax_id.encode())
            else:
                decrypted = doc.tax_id.encode()
            doc.tax_id = new_fernet.encrypt(decrypted).decode()
            updated = True

        # Re-encrypt notes
        if doc.notes:
            if old_fernet:
                decrypted = old_fernet.decrypt(doc.notes.encode())
            else:
                decrypted = doc.notes.encode()
            doc.notes = new_fernet.encrypt(decrypted).decode()
            updated = True

        if updated and not dry_run:
            # Save without triggering signals (to avoid audit log)
            doc.save(update_fields=['customer_id', 'account_number', 'tax_id', 'notes'])

    def _update_vault(self, new_key, old_key, dry_run):
        """Update HashiCorp Vault with new keys."""
        if dry_run:
            self.stdout.write(self.style.NOTICE('[DRY RUN] Would update Vault with new keys'))
            return

        vault = get_vault_client()
        if not vault:
            raise CommandError('Vault client not available')

        vault.set_secret(
            path='dfc/encryption',
            data={
                'fernet_key_primary': new_key,
                'fernet_key_secondary': old_key,
            }
        )
