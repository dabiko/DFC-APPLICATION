"""
Management command to run event consumers.

Usage:
    python manage.py run_consumers
    python manage.py run_consumers --consumer document
    python manage.py run_consumers --consumer document workflow
"""

import logging
import signal
import sys

from django.core.management.base import BaseCommand, CommandError

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Run event consumers to process messages from RabbitMQ'

    def __init__(self):
        super().__init__()
        self.manager = None

    def add_arguments(self, parser):
        parser.add_argument(
            '--consumer',
            nargs='+',
            choices=[
                'document', 'workflow', 'retention',
                'classification', 'intelligence',
                'notification', 'audit', 'all'
            ],
            default=['all'],
            help='Consumers to run (default: all)',
        )
        parser.add_argument(
            '--prefetch',
            type=int,
            default=10,
            help='Number of messages to prefetch (default: 10)',
        )

    def handle(self, *args, **options):
        from apps.events.consumers import (
            ConsumerManager,
            DocumentEventConsumer,
            WorkflowEventConsumer,
            RetentionEventConsumer,
            ClassificationEventConsumer,
            IntelligenceEventConsumer,
            NotificationEventConsumer,
            AuditEventConsumer,
        )
        from apps.events.connection import check_rabbitmq_health

        # Check RabbitMQ health first
        if not check_rabbitmq_health():
            raise CommandError(
                'RabbitMQ is not available. '
                'Run `python manage.py setup_rabbitmq --wait` first.'
            )

        consumers_to_run = options['consumer']
        prefetch = options['prefetch']

        # Map of consumer names to classes
        consumer_map = {
            'document': ('document', DocumentEventConsumer),
            'workflow': ('workflow', WorkflowEventConsumer),
            'retention': ('retention', RetentionEventConsumer),
            'classification': ('classification', ClassificationEventConsumer),
            'intelligence': ('intelligence', IntelligenceEventConsumer),
            'notification': ('notification', NotificationEventConsumer),
            'audit': ('audit', AuditEventConsumer),
        }

        # Create manager
        self.manager = ConsumerManager()

        # Register requested consumers
        if 'all' in consumers_to_run:
            consumers_to_run = list(consumer_map.keys())

        for consumer_name in consumers_to_run:
            name, consumer_class = consumer_map[consumer_name]
            consumer = consumer_class(prefetch_count=prefetch)
            self.manager.register_consumer(name, consumer)
            self.stdout.write(f'Registered consumer: {name}')

        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

        # Start consumers
        self.stdout.write(
            self.style.SUCCESS(f'Starting {len(consumers_to_run)} consumer(s)...')
        )
        self.manager.start_all()

        # Wait for shutdown signal
        self.stdout.write('Press Ctrl+C to stop consumers')
        try:
            signal.pause()
        except AttributeError:
            # signal.pause() not available on Windows
            import time
            while True:
                time.sleep(1)
                status = self.manager.get_status()
                if not any(status.values()):
                    break

    def _signal_handler(self, signum, frame):
        """Handle shutdown signals."""
        self.stdout.write('\nShutting down consumers...')
        if self.manager:
            self.manager.stop_all()
        self.stdout.write(self.style.SUCCESS('Consumers stopped'))
        sys.exit(0)
