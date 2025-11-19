"""
Management command to release a legal hold.

Usage:
    python manage.py release_legal_hold CASE-2025-001 --username admin@cccplc.com
    python manage.py release_legal_hold CASE-2025-001 --username admin@cccplc.com --notes "Settlement reached"
"""

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from apps.retention.models import LegalHold

User = get_user_model()


class Command(BaseCommand):
    help = 'Release a legal hold by case number'

    def add_arguments(self, parser):
        parser.add_argument(
            'case_number',
            type=str,
            help='Case number of the legal hold to release',
        )
        parser.add_argument(
            '--username',
            type=str,
            required=True,
            help='Username of the person releasing the hold',
        )
        parser.add_argument(
            '--notes',
            type=str,
            default='',
            help='Optional notes about the release',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force release even if already released',
        )

    def handle(self, *args, **options):
        case_number = options['case_number']
        username = options['username']
        notes = options['notes']
        force = options['force']

        # Get the user
        try:
            user = User.objects.get(email=username)
        except User.DoesNotExist:
            raise CommandError(f'User "{username}" not found')

        # Get the legal hold
        try:
            legal_hold = LegalHold.objects.get(case_number=case_number)
        except LegalHold.DoesNotExist:
            raise CommandError(f'Legal hold with case number "{case_number}" not found')

        # Check if already released
        if not legal_hold.is_active and not force:
            self.stdout.write(self.style.WARNING(
                f'Legal hold "{case_number}" is already released'
                f'\n  Released by: {legal_hold.released_by}'
                f'\n  Released at: {legal_hold.released_at}'
                f'\n  Use --force to update the release information'
            ))
            return

        # Get document count before release
        document_count = legal_hold.documents.count()

        # Display hold information
        self.stdout.write(
            f'\n{"=" * 80}'
            f'\nLegal Hold Release'
            f'\n{"=" * 80}'
            f'\nCase Number: {legal_hold.case_number}'
            f'\nCase Name: {legal_hold.case_name}'
            f'\nDocuments Held: {document_count}'
            f'\nPlaced By: {legal_hold.placed_by}'
            f'\nPlaced At: {legal_hold.placed_at}'
        )

        if notes:
            self.stdout.write(f'\nRelease Notes: {notes}')

        # Update notes if provided
        if notes:
            legal_hold.notes = notes

        # Release the hold
        legal_hold.release(user)

        self.stdout.write(self.style.SUCCESS(
            f'\n{"=" * 80}'
            f'\n✓ Legal hold "{case_number}" has been released'
            f'\n  Released by: {user.email}'
            f'\n  Documents affected: {document_count}'
            f'\n{"=" * 80}\n'
        ))

        # List affected documents
        self.stdout.write('\nPreviously held documents:')
        for doc in legal_hold.documents.all()[:10]:
            self.stdout.write(f'  - {doc.title} ({doc.id})')

        if document_count > 10:
            self.stdout.write(f'  ... and {document_count - 10} more documents')

        self.stdout.write(
            self.style.NOTICE(
                f'\n\nNote: Documents may now be subject to retention policies.'
                f'\nRun "python manage.py apply_retention_policies" to update schedules.'
            )
        )
