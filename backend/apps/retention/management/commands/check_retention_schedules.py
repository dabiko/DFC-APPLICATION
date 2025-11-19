"""
Management command to check and report on retention schedules.

Usage:
    python manage.py check_retention_schedules
    python manage.py check_retention_schedules --days 7  # Check next 7 days
    python manage.py check_retention_schedules --export report.csv
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import csv
from apps.retention.models import RetentionSchedule


class Command(BaseCommand):
    help = 'Check and report on upcoming retention deletions'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Number of days to look ahead (default: 30)',
        )
        parser.add_argument(
            '--status',
            type=str,
            choices=['PENDING', 'NOTIFIED', 'DELETED', 'CANCELLED'],
            help='Filter by status',
        )
        parser.add_argument(
            '--export',
            type=str,
            help='Export report to CSV file',
        )
        parser.add_argument(
            '--overdue',
            action='store_true',
            help='Show only overdue deletions',
        )

    def handle(self, *args, **options):
        days = options['days']
        status = options.get('status')
        export_path = options.get('export')
        overdue = options['overdue']

        now = timezone.now()

        # Build queryset
        schedules = RetentionSchedule.objects.select_related(
            'document',
            'policy'
        ).all()

        if status:
            schedules = schedules.filter(status=status)

        if overdue:
            schedules = schedules.filter(
                deletion_date__lt=now,
                status__in=[RetentionSchedule.PENDING, RetentionSchedule.NOTIFIED]
            )
        else:
            # Upcoming deletions
            end_date = now + timedelta(days=days)
            schedules = schedules.filter(
                deletion_date__range=(now, end_date),
                status__in=[RetentionSchedule.PENDING, RetentionSchedule.NOTIFIED]
            )

        schedules = schedules.order_by('deletion_date')

        if not schedules.exists():
            self.stdout.write(self.style.WARNING('No schedules found matching criteria'))
            return

        # Display summary
        total = schedules.count()
        can_delete = sum(1 for s in schedules if s.can_delete())
        blocked = total - can_delete

        self.stdout.write(self.style.SUCCESS(
            f'\n{"=" * 80}'
            f'\nRetention Schedule Report'
            f'\n{"=" * 80}'
        ))

        if overdue:
            self.stdout.write(f'Showing OVERDUE deletions')
        else:
            self.stdout.write(f'Showing upcoming deletions ({days} days)')

        self.stdout.write(
            f'\nTotal schedules: {total}'
            f'\nCan delete: {can_delete}'
            f'\nBlocked by legal hold: {blocked}'
            f'\n{"=" * 80}\n'
        )

        # Export to CSV if requested
        if export_path:
            self._export_csv(schedules, export_path)
            self.stdout.write(self.style.SUCCESS(f'Report exported to: {export_path}'))

        # Display details
        for schedule in schedules:
            days_remaining = (schedule.deletion_date - now).days
            can_delete_status = '✓ CAN DELETE' if schedule.can_delete() else '✗ LEGAL HOLD'

            # Color code based on urgency
            if days_remaining < 0:
                style = self.style.ERROR
                urgency = f'OVERDUE by {abs(days_remaining)} days'
            elif days_remaining <= 7:
                style = self.style.WARNING
                urgency = f'{days_remaining} days'
            else:
                style = self.style.NOTICE
                urgency = f'{days_remaining} days'

            self.stdout.write(style(
                f'\n[{schedule.status}] {can_delete_status}'
                f'\n  Document: {schedule.document.title}'
                f'\n  Document ID: {schedule.document.id}'
                f'\n  Policy: {schedule.policy.name if schedule.policy else "N/A"}'
                f'\n  Deletion Date: {schedule.deletion_date.strftime("%Y-%m-%d %H:%M")}'
                f'\n  Time Remaining: {urgency}'
                f'\n  Notified: {"Yes" if schedule.notification_sent else "No"}'
            ))

        self.stdout.write(f'\n{"=" * 80}\n')

    def _export_csv(self, schedules, path):
        """Export schedules to CSV file"""
        now = timezone.now()

        with open(path, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)

            # Write header
            writer.writerow([
                'Document ID',
                'Document Title',
                'Policy',
                'Status',
                'Deletion Date',
                'Days Remaining',
                'Notified',
                'Can Delete',
                'Legal Holds'
            ])

            # Write data
            for schedule in schedules:
                days_remaining = (schedule.deletion_date - now).days
                legal_holds = ', '.join([
                    h.case_number
                    for h in schedule.document.legal_holds.filter(is_active=True)
                ])

                writer.writerow([
                    str(schedule.document.id),
                    schedule.document.title,
                    schedule.policy.name if schedule.policy else 'N/A',
                    schedule.status,
                    schedule.deletion_date.strftime('%Y-%m-%d %H:%M'),
                    days_remaining,
                    'Yes' if schedule.notification_sent else 'No',
                    'Yes' if schedule.can_delete() else 'No',
                    legal_holds or 'None'
                ])
