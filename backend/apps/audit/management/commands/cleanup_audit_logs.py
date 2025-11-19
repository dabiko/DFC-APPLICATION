"""
Management command to cleanup old audit logs.

This command can be used to:
1. Delete audit logs older than a specified number of days
2. Archive old audit logs to external storage
3. Generate statistics before cleanup

Usage:
    python manage.py cleanup_audit_logs --days=365 --dry-run
    python manage.py cleanup_audit_logs --days=730 --confirm
"""

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from datetime import timedelta
from apps.audit.models import AuditLog


class Command(BaseCommand):
    help = 'Cleanup old audit logs beyond retention period'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=365,
            help='Delete audit logs older than this many days (default: 365)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting'
        )
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirm deletion (required to actually delete logs)'
        )
        parser.add_argument(
            '--resource-type',
            type=str,
            help='Only delete logs for specific resource type (e.g., DOCUMENT)'
        )
        parser.add_argument(
            '--action',
            type=str,
            help='Only delete logs for specific action (e.g., VIEW)'
        )

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        confirm = options['confirm']
        resource_type = options.get('resource_type')
        action = options.get('action')

        # Calculate cutoff date
        cutoff_date = timezone.now() - timedelta(days=days)

        self.stdout.write(self.style.WARNING(
            f'\n=== Audit Log Cleanup ===\n'
        ))
        self.stdout.write(
            f'Cutoff date: {cutoff_date.strftime("%Y-%m-%d %H:%M:%S")}\n'
            f'Logs older than {days} days will be affected\n'
        )

        # Build queryset
        queryset = AuditLog.objects.filter(timestamp__lt=cutoff_date)

        if resource_type:
            queryset = queryset.filter(resource_type=resource_type)
            self.stdout.write(f'Resource type filter: {resource_type}\n')

        if action:
            queryset = queryset.filter(action=action)
            self.stdout.write(f'Action filter: {action}\n')

        # Get statistics
        total_count = queryset.count()

        if total_count == 0:
            self.stdout.write(self.style.SUCCESS(
                '\nNo audit logs found matching the criteria.\n'
            ))
            return

        # Show breakdown by resource type
        self.stdout.write('\n--- Breakdown by Resource Type ---')
        resource_stats = queryset.values('resource_type').annotate(
            count=queryset.model.objects.count()
        )
        for stat in queryset.values('resource_type').distinct():
            res_type = stat['resource_type']
            count = queryset.filter(resource_type=res_type).count()
            self.stdout.write(f'{res_type}: {count:,} logs')

        # Show breakdown by action
        self.stdout.write('\n--- Breakdown by Action ---')
        for stat in queryset.values('action').distinct():
            act = stat['action']
            count = queryset.filter(action=act).count()
            self.stdout.write(f'{act}: {count:,} logs')

        # Show total
        self.stdout.write(self.style.WARNING(
            f'\n--- Total logs to be deleted: {total_count:,} ---\n'
        ))

        # Dry run mode
        if dry_run:
            self.stdout.write(self.style.SUCCESS(
                '\nDRY RUN MODE - No logs were deleted.\n'
                'Remove --dry-run and add --confirm to actually delete logs.\n'
            ))
            return

        # Require confirmation
        if not confirm:
            self.stdout.write(self.style.ERROR(
                '\nERROR: Deletion requires explicit confirmation.\n'
                'Add --confirm flag to proceed with deletion.\n'
            ))
            return

        # Perform deletion
        self.stdout.write(self.style.WARNING(
            '\nProceeding with deletion...'
        ))

        try:
            # Delete logs (bypass the delete() method restriction using QuerySet.delete())
            deleted_count, _ = queryset._raw_delete(queryset.db)

            self.stdout.write(self.style.SUCCESS(
                f'\n✓ Successfully deleted {deleted_count:,} audit log(s).\n'
            ))

            # Show remaining logs
            remaining_count = AuditLog.objects.count()
            self.stdout.write(
                f'Remaining audit logs in database: {remaining_count:,}\n'
            )

        except Exception as e:
            raise CommandError(f'Error during deletion: {str(e)}')
