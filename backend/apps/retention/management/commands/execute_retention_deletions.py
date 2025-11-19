"""
Management command to manually execute retention deletions.

Usage:
    python manage.py execute_retention_deletions --dry-run  # Preview only
    python manage.py execute_retention_deletions  # Execute deletions
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.retention.models import RetentionSchedule
from apps.audit.models import AuditLog


class Command(BaseCommand):
    help = 'Execute retention deletions for documents past their retention period'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview deletions without executing them',
        )
        parser.add_argument(
            '--document-id',
            type=str,
            help='Delete a specific document by UUID',
        )
        parser.add_argument(
            '--force-overdue',
            action='store_true',
            help='Only process overdue deletions',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        document_id = options.get('document_id')
        force_overdue = options['force_overdue']

        now = timezone.now()

        # Build queryset
        schedules = RetentionSchedule.objects.select_related(
            'document',
            'policy'
        ).filter(
            status__in=[RetentionSchedule.PENDING, RetentionSchedule.NOTIFIED],
            deletion_date__lte=now
        )

        if document_id:
            schedules = schedules.filter(document__id=document_id)

        if not schedules.exists():
            self.stdout.write(self.style.WARNING('No documents found ready for deletion'))
            return

        # Separate deletable and blocked
        deletable = []
        blocked = []

        for schedule in schedules:
            if schedule.can_delete():
                deletable.append(schedule)
            else:
                blocked.append(schedule)

        # Display summary
        self.stdout.write(self.style.SUCCESS(
            f'\n{"=" * 80}'
            f'\nRetention Deletion {'Preview' if dry_run else 'Execution'}'
            f'\n{"=" * 80}'
            f'\nTotal schedules ready: {schedules.count()}'
            f'\nCan delete: {len(deletable)}'
            f'\nBlocked by legal hold: {len(blocked)}'
            f'\n{"=" * 80}\n'
        ))

        # Display blocked documents
        if blocked:
            self.stdout.write(self.style.WARNING('\nBlocked by Legal Hold:'))
            for schedule in blocked:
                holds = schedule.document.legal_holds.filter(is_active=True)
                hold_cases = ', '.join([h.case_number for h in holds])
                self.stdout.write(
                    f'  ✗ {schedule.document.title}'
                    f'\n    Cases: {hold_cases}'
                )

        # Display deletable documents
        if deletable:
            self.stdout.write(
                self.style.NOTICE(
                    f'\n\n{'Would delete' if dry_run else 'Deleting'} {len(deletable)} documents:'
                )
            )

            deleted_count = 0
            error_count = 0

            for schedule in deletable:
                document = schedule.document
                policy_name = schedule.policy.name if schedule.policy else 'N/A'
                days_overdue = (now - schedule.deletion_date).days

                self.stdout.write(
                    f'\n  Document: {document.title}'
                    f'\n    ID: {document.id}'
                    f'\n    Policy: {policy_name}'
                    f'\n    Deletion Date: {schedule.deletion_date.strftime("%Y-%m-%d")}'
                    f'\n    Days Overdue: {days_overdue}'
                )

                if not dry_run:
                    try:
                        # Soft delete the document
                        document.is_deleted = True
                        document.deleted_at = now
                        document.save()

                        # Update schedule
                        schedule.status = RetentionSchedule.DELETED
                        schedule.deleted_at = now
                        schedule.save()

                        # Log audit event
                        AuditLog.log_action(
                            user=None,  # System action
                            action='RETENTION_DELETE',
                            resource_type='Document',
                            resource_id=str(document.id),
                            resource_name=document.title,
                            details={
                                'policy_id': str(schedule.policy.id) if schedule.policy else None,
                                'policy_name': policy_name,
                                'deletion_date': schedule.deletion_date.isoformat(),
                                'days_overdue': days_overdue
                            },
                            ip_address='127.0.0.1',  # System
                            user_agent='Management Command'
                        )

                        deleted_count += 1
                        self.stdout.write(self.style.SUCCESS('    ✓ Deleted'))

                    except Exception as e:
                        error_count += 1
                        self.stdout.write(self.style.ERROR(f'    ✗ Error: {str(e)}'))

            # Final summary
            if dry_run:
                self.stdout.write(self.style.NOTICE(
                    f'\n{"=" * 80}'
                    f'\nDRY RUN - No changes made'
                    f'\nWould delete: {len(deletable)} documents'
                    f'\nRun without --dry-run to execute deletions'
                    f'\n{"=" * 80}\n'
                ))
            else:
                self.stdout.write(self.style.SUCCESS(
                    f'\n{"=" * 80}'
                    f'\nDeletion Complete'
                    f'\n  Successfully deleted: {deleted_count}'
                    f'\n  Errors: {error_count}'
                    f'\n  Blocked by legal hold: {len(blocked)}'
                    f'\n{"=" * 80}\n'
                ))
        else:
            self.stdout.write(self.style.WARNING('\nNo documents ready for deletion'))
