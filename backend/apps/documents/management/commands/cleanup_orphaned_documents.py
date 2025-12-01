"""
Management command to find and clean up orphaned documents.

Orphaned documents are records in the database that don't have an associated file
in storage (MinIO/S3).

Usage:
    # List orphaned documents (dry run - no changes)
    python manage.py cleanup_orphaned_documents

    # Delete orphaned documents
    python manage.py cleanup_orphaned_documents --delete

    # Delete without confirmation prompt
    python manage.py cleanup_orphaned_documents --delete --no-input
"""

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q
from apps.documents.models import Document


class Command(BaseCommand):
    help = 'Find and optionally delete documents without associated files'

    def add_arguments(self, parser):
        parser.add_argument(
            '--delete',
            action='store_true',
            help='Delete orphaned documents (default is dry-run/list only)',
        )
        parser.add_argument(
            '--no-input',
            action='store_true',
            help='Skip confirmation prompt when deleting',
        )
        parser.add_argument(
            '--include-deleted',
            action='store_true',
            help='Include soft-deleted documents in the search',
        )

    def handle(self, *args, **options):
        delete = options['delete']
        no_input = options['no_input']
        include_deleted = options['include_deleted']

        self.stdout.write(self.style.NOTICE('Searching for orphaned documents...'))

        # Build query for documents without files
        queryset = Document.objects.filter(
            Q(file='') | Q(file__isnull=True)
        )

        if not include_deleted:
            queryset = queryset.filter(is_deleted=False)

        orphaned_docs = queryset.select_related('owner', 'department', 'folder')
        count = orphaned_docs.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS('No orphaned documents found.'))
            return

        # Display orphaned documents
        self.stdout.write(self.style.WARNING(f'\nFound {count} orphaned document(s):\n'))
        self.stdout.write('-' * 100)
        self.stdout.write(
            f'{"ID":<40} {"Title":<30} {"Owner":<15} {"Created":<20}'
        )
        self.stdout.write('-' * 100)

        for doc in orphaned_docs:
            owner_name = doc.owner.get_full_name() if doc.owner else 'Unknown'
            created = doc.created_at.strftime('%Y-%m-%d %H:%M') if doc.created_at else 'Unknown'
            title = (doc.title[:27] + '...') if len(doc.title) > 30 else doc.title

            self.stdout.write(
                f'{str(doc.id):<40} {title:<30} {owner_name[:15]:<15} {created:<20}'
            )

        self.stdout.write('-' * 100)
        self.stdout.write('')

        if not delete:
            self.stdout.write(self.style.NOTICE(
                'This was a dry run. To delete these documents, run with --delete flag:'
            ))
            self.stdout.write(self.style.NOTICE(
                '  python manage.py cleanup_orphaned_documents --delete'
            ))
            return

        # Confirm deletion
        if not no_input:
            self.stdout.write(self.style.WARNING(
                f'\nYou are about to permanently delete {count} document(s).'
            ))
            self.stdout.write(self.style.WARNING(
                'This action cannot be undone!'
            ))
            confirm = input('\nType "yes" to confirm deletion: ')
            if confirm.lower() != 'yes':
                self.stdout.write(self.style.NOTICE('Operation cancelled.'))
                return

        # Delete orphaned documents
        self.stdout.write(self.style.NOTICE(f'\nDeleting {count} orphaned document(s)...'))

        deleted_count = 0
        errors = []

        for doc in orphaned_docs:
            try:
                doc_id = str(doc.id)
                doc_title = doc.title
                doc.delete()  # Hard delete since there's no file anyway
                deleted_count += 1
                self.stdout.write(f'  Deleted: {doc_id} - {doc_title}')
            except Exception as e:
                errors.append((doc.id, str(e)))
                self.stdout.write(self.style.ERROR(f'  Failed to delete {doc.id}: {e}'))

        self.stdout.write('')

        if errors:
            self.stdout.write(self.style.WARNING(
                f'Completed with {len(errors)} error(s). '
                f'Deleted {deleted_count} of {count} documents.'
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f'Successfully deleted {deleted_count} orphaned document(s).'
            ))
