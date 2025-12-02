"""
Management command to verify document storage integrity.

Checks that all documents in the database have corresponding files in MinIO storage.
This finds "ghost" documents - records with file paths that don't actually exist in storage.

Usage:
    # List documents with missing files (dry run)
    python manage.py verify_storage_integrity

    # Delete database records for missing files
    python manage.py verify_storage_integrity --delete

    # Check specific document by ID
    python manage.py verify_storage_integrity --document-id <uuid>

    # Include soft-deleted documents
    python manage.py verify_storage_integrity --include-deleted

    # Export report to CSV
    python manage.py verify_storage_integrity --export missing_files.csv
"""

from django.core.management.base import BaseCommand
from django.core.files.storage import default_storage
from apps.documents.models import Document
import csv
from datetime import datetime


class Command(BaseCommand):
    help = 'Verify that all documents have corresponding files in storage'

    def add_arguments(self, parser):
        parser.add_argument(
            '--delete',
            action='store_true',
            help='Delete database records for documents with missing files',
        )
        parser.add_argument(
            '--soft-delete',
            action='store_true',
            help='Soft-delete instead of hard delete (sets is_deleted=True)',
        )
        parser.add_argument(
            '--no-input',
            action='store_true',
            help='Skip confirmation prompt when deleting',
        )
        parser.add_argument(
            '--include-deleted',
            action='store_true',
            help='Include soft-deleted documents in the verification',
        )
        parser.add_argument(
            '--document-id',
            type=str,
            help='Check a specific document by UUID',
        )
        parser.add_argument(
            '--export',
            type=str,
            help='Export results to CSV file',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=0,
            help='Limit the number of documents to check (0 = no limit)',
        )

    def handle(self, *args, **options):
        delete = options['delete']
        soft_delete = options['soft_delete']
        no_input = options['no_input']
        include_deleted = options['include_deleted']
        document_id = options['document_id']
        export_file = options['export']
        limit = options['limit']

        self.stdout.write(self.style.NOTICE('Verifying document storage integrity...\n'))

        # Build query
        if document_id:
            queryset = Document.objects.filter(id=document_id)
        else:
            queryset = Document.objects.exclude(file='').exclude(file__isnull=True)
            if not include_deleted:
                queryset = queryset.filter(is_deleted=False)

        queryset = queryset.select_related('owner', 'department', 'folder')

        if limit > 0:
            queryset = queryset[:limit]

        total_count = queryset.count()
        self.stdout.write(f'Checking {total_count} document(s)...\n')

        missing_files = []
        checked = 0

        for doc in queryset:
            checked += 1
            if checked % 100 == 0:
                self.stdout.write(f'  Checked {checked}/{total_count}...')

            try:
                # Check if file exists in storage
                file_path = str(doc.file) if doc.file else None
                if file_path and not default_storage.exists(file_path):
                    missing_files.append({
                        'id': str(doc.id),
                        'title': doc.title,
                        'file_path': file_path,
                        'owner': doc.owner.get_full_name() if doc.owner else 'Unknown',
                        'owner_email': doc.owner.email if doc.owner else '',
                        'folder': doc.folder.name if doc.folder else 'No folder',
                        'created_at': doc.created_at.isoformat() if doc.created_at else '',
                        'file_size': doc.file_size or 0,
                        'document': doc,  # Keep reference for deletion
                    })
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  Error checking {doc.id}: {e}'))

        self.stdout.write('')

        if not missing_files:
            self.stdout.write(self.style.SUCCESS(
                f'All {total_count} documents have valid files in storage.'
            ))
            return

        # Display results
        self.stdout.write(self.style.WARNING(
            f'\nFound {len(missing_files)} document(s) with missing files:\n'
        ))
        self.stdout.write('-' * 120)
        self.stdout.write(
            f'{"ID":<38} {"Title":<25} {"Owner":<20} {"File Path":<35}'
        )
        self.stdout.write('-' * 120)

        for item in missing_files:
            title = (item['title'][:22] + '...') if len(item['title']) > 25 else item['title']
            owner = (item['owner'][:17] + '...') if len(item['owner']) > 20 else item['owner']
            path = (item['file_path'][:32] + '...') if len(item['file_path']) > 35 else item['file_path']

            self.stdout.write(f'{item["id"]:<38} {title:<25} {owner:<20} {path:<35}')

        self.stdout.write('-' * 120)
        self.stdout.write('')

        # Export to CSV if requested
        if export_file:
            self._export_csv(export_file, missing_files)

        # Delete if requested
        if not delete:
            self.stdout.write(self.style.NOTICE(
                'This was a dry run. To delete these records, run with --delete flag:'
            ))
            self.stdout.write(self.style.NOTICE(
                '  python manage.py verify_storage_integrity --delete'
            ))
            self.stdout.write(self.style.NOTICE(
                '  python manage.py verify_storage_integrity --delete --soft-delete  (to soft-delete)'
            ))
            return

        # Confirm deletion
        if not no_input:
            action = 'soft-delete' if soft_delete else 'permanently delete'
            self.stdout.write(self.style.WARNING(
                f'\nYou are about to {action} {len(missing_files)} document record(s).'
            ))
            if not soft_delete:
                self.stdout.write(self.style.WARNING(
                    'This action cannot be undone!'
                ))
            confirm = input('\nType "yes" to confirm: ')
            if confirm.lower() != 'yes':
                self.stdout.write(self.style.NOTICE('Operation cancelled.'))
                return

        # Perform deletion
        deleted_count = 0
        errors = []

        for item in missing_files:
            try:
                doc = item['document']
                if soft_delete:
                    doc.is_deleted = True
                    doc.deleted_at = datetime.now()
                    doc.save(update_fields=['is_deleted', 'deleted_at'])
                    self.stdout.write(f'  Soft-deleted: {item["id"]} - {item["title"]}')
                else:
                    doc.delete()
                    self.stdout.write(f'  Deleted: {item["id"]} - {item["title"]}')
                deleted_count += 1
            except Exception as e:
                errors.append((item['id'], str(e)))
                self.stdout.write(self.style.ERROR(f'  Failed: {item["id"]}: {e}'))

        self.stdout.write('')

        if errors:
            self.stdout.write(self.style.WARNING(
                f'Completed with {len(errors)} error(s). '
                f'Processed {deleted_count} of {len(missing_files)} documents.'
            ))
        else:
            action = 'soft-deleted' if soft_delete else 'deleted'
            self.stdout.write(self.style.SUCCESS(
                f'Successfully {action} {deleted_count} document record(s).'
            ))

    def _export_csv(self, filename, missing_files):
        """Export missing files report to CSV"""
        try:
            with open(filename, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow([
                    'Document ID', 'Title', 'File Path', 'Owner',
                    'Owner Email', 'Folder', 'Created At', 'File Size (bytes)'
                ])
                for item in missing_files:
                    writer.writerow([
                        item['id'],
                        item['title'],
                        item['file_path'],
                        item['owner'],
                        item['owner_email'],
                        item['folder'],
                        item['created_at'],
                        item['file_size'],
                    ])
            self.stdout.write(self.style.SUCCESS(f'\nExported report to: {filename}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\nFailed to export CSV: {e}'))
