"""
Management command to manually apply retention policies to documents.

Usage:
    python manage.py apply_retention_policies
    python manage.py apply_retention_policies --force  # Reapply to all documents
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.retention.models import RetentionPolicy, RetentionSchedule
from apps.documents.models import Document


class Command(BaseCommand):
    help = 'Apply retention policies to documents without schedules'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Reapply policies to all documents (delete and recreate schedules)',
        )
        parser.add_argument(
            '--policy-id',
            type=str,
            help='Apply only a specific policy (by UUID)',
        )
        parser.add_argument(
            '--document-id',
            type=str,
            help='Apply policy to a specific document (by UUID)',
        )

    def handle(self, *args, **options):
        force = options['force']
        policy_id = options.get('policy_id')
        document_id = options.get('document_id')

        # Get active policies
        policies = RetentionPolicy.objects.filter(is_active=True).order_by('-priority')

        if policy_id:
            policies = policies.filter(id=policy_id)
            if not policies.exists():
                self.stdout.write(self.style.ERROR(f'Policy with ID {policy_id} not found'))
                return

        # Get documents
        if force:
            # Delete existing schedules if forcing
            if document_id:
                documents = Document.objects.filter(id=document_id, is_deleted=False)
                RetentionSchedule.objects.filter(document__id=document_id).delete()
            else:
                documents = Document.objects.filter(is_deleted=False)
                RetentionSchedule.objects.all().delete()
            self.stdout.write(self.style.WARNING('Deleted existing schedules'))
        else:
            # Only documents without schedules
            if document_id:
                documents = Document.objects.filter(
                    id=document_id,
                    retention_schedule__isnull=True,
                    is_deleted=False
                )
            else:
                documents = Document.objects.filter(
                    retention_schedule__isnull=True,
                    is_deleted=False
                )

        if not documents.exists():
            self.stdout.write(self.style.WARNING('No documents found to process'))
            return

        self.stdout.write(f'Processing {documents.count()} documents...')

        applied_count = 0
        skipped_count = 0

        for document in documents.iterator():
            # Find matching policy (highest priority wins)
            matched_policy = None
            for policy in policies:
                if policy.matches_document(document):
                    matched_policy = policy
                    break

            if matched_policy:
                # Create retention schedule
                RetentionSchedule.objects.create(
                    document=document,
                    policy=matched_policy,
                    retention_end_date=matched_policy.get_retention_end_date(document),
                    notification_date=matched_policy.get_notification_date(document),
                    deletion_date=matched_policy.get_deletion_date(document),
                )
                applied_count += 1

                if applied_count % 100 == 0:
                    self.stdout.write(f'  Processed {applied_count} documents...')
            else:
                skipped_count += 1

        self.stdout.write(self.style.SUCCESS(
            f'\nCompleted!'
            f'\n  Applied policies: {applied_count}'
            f'\n  Skipped (no matching policy): {skipped_count}'
        ))
