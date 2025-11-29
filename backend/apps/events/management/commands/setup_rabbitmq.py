"""
Management command to setup RabbitMQ infrastructure.

Usage:
    python manage.py setup_rabbitmq
    python manage.py setup_rabbitmq --check-health
    python manage.py setup_rabbitmq --reset
"""

import logging
import time
from django.core.management.base import BaseCommand, CommandError

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Setup RabbitMQ infrastructure for the event-driven architecture'

    def add_arguments(self, parser):
        parser.add_argument(
            '--check-health',
            action='store_true',
            help='Only check RabbitMQ health without setting up infrastructure',
        )
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Reset (delete and recreate) all queues and exchanges',
        )
        parser.add_argument(
            '--wait',
            action='store_true',
            help='Wait for RabbitMQ to be available before proceeding',
        )
        parser.add_argument(
            '--wait-timeout',
            type=int,
            default=60,
            help='Timeout in seconds when waiting for RabbitMQ (default: 60)',
        )

    def handle(self, *args, **options):
        from apps.events.connection import (
            get_connection_manager,
            check_rabbitmq_health,
            setup_rabbitmq,
            get_channel,
            QueueConfig,
        )

        # Wait for RabbitMQ if requested
        if options['wait']:
            self.stdout.write('Waiting for RabbitMQ to be available...')
            start_time = time.time()
            timeout = options['wait_timeout']

            while time.time() - start_time < timeout:
                if check_rabbitmq_health():
                    self.stdout.write(self.style.SUCCESS('RabbitMQ is available'))
                    break
                self.stdout.write('.')
                time.sleep(2)
            else:
                raise CommandError(
                    f'RabbitMQ not available after {timeout} seconds'
                )

        # Check health only
        if options['check_health']:
            self.stdout.write('Checking RabbitMQ health...')
            if check_rabbitmq_health():
                self.stdout.write(self.style.SUCCESS('RabbitMQ is healthy'))

                # Get connection stats
                manager = get_connection_manager()
                self.stdout.write(f'  Host: {manager._config.host}:{manager._config.port}')
                self.stdout.write(f'  Virtual Host: {manager._config.virtual_host}')
                self.stdout.write(f'  Pool Size: {manager._config.pool_size}')

                # Check queue stats
                try:
                    with get_channel() as channel:
                        self._print_queue_stats(channel)
                except Exception as e:
                    self.stdout.write(
                        self.style.WARNING(f'Could not get queue stats: {e}')
                    )

            else:
                raise CommandError('RabbitMQ health check failed')
            return

        # Reset infrastructure if requested
        if options['reset']:
            self.stdout.write(
                self.style.WARNING('Resetting RabbitMQ infrastructure...')
            )
            self._reset_infrastructure()
            self.stdout.write(self.style.SUCCESS('Infrastructure reset complete'))

        # Setup infrastructure
        self.stdout.write('Setting up RabbitMQ infrastructure...')

        try:
            success = setup_rabbitmq()
            if success:
                self.stdout.write(
                    self.style.SUCCESS('RabbitMQ infrastructure setup complete')
                )

                # Print summary
                self.stdout.write('\nCreated exchanges:')
                self.stdout.write(f'  - {QueueConfig.EVENTS_EXCHANGE} (topic)')
                self.stdout.write(f'  - {QueueConfig.DLX_EXCHANGE} (topic)')

                self.stdout.write('\nCreated queues:')
                queues = [
                    QueueConfig.DOCUMENT_QUEUE,
                    QueueConfig.WORKFLOW_QUEUE,
                    QueueConfig.RETENTION_QUEUE,
                    QueueConfig.CLASSIFICATION_QUEUE,
                    QueueConfig.INTELLIGENCE_QUEUE,
                    QueueConfig.NOTIFICATION_QUEUE,
                    QueueConfig.AUDIT_QUEUE,
                ]
                for queue in queues:
                    self.stdout.write(f'  - {queue}')

                self.stdout.write('\nCreated dead letter queues:')
                dlqs = [
                    QueueConfig.DLQ_DOCUMENT,
                    QueueConfig.DLQ_WORKFLOW,
                    QueueConfig.DLQ_RETENTION,
                    QueueConfig.DLQ_CLASSIFICATION,
                    QueueConfig.DLQ_INTELLIGENCE,
                    QueueConfig.DLQ_NOTIFICATION,
                    QueueConfig.DLQ_AUDIT,
                ]
                for dlq in dlqs:
                    self.stdout.write(f'  - {dlq}')

            else:
                raise CommandError('Failed to setup RabbitMQ infrastructure')

        except Exception as e:
            raise CommandError(f'Error setting up RabbitMQ: {e}')

    def _print_queue_stats(self, channel):
        """Print statistics for all queues."""
        from apps.events.connection import QueueConfig

        queues = [
            QueueConfig.DOCUMENT_QUEUE,
            QueueConfig.WORKFLOW_QUEUE,
            QueueConfig.RETENTION_QUEUE,
            QueueConfig.CLASSIFICATION_QUEUE,
            QueueConfig.INTELLIGENCE_QUEUE,
            QueueConfig.NOTIFICATION_QUEUE,
            QueueConfig.AUDIT_QUEUE,
        ]

        self.stdout.write('\nQueue Statistics:')
        for queue_name in queues:
            try:
                result = channel.queue_declare(queue=queue_name, passive=True)
                self.stdout.write(
                    f'  {queue_name}: '
                    f'{result.method.message_count} messages, '
                    f'{result.method.consumer_count} consumers'
                )
            except Exception:
                self.stdout.write(f'  {queue_name}: Not found')

    def _reset_infrastructure(self):
        """Delete and recreate all queues and exchanges."""
        from apps.events.connection import get_channel, QueueConfig

        with get_channel() as channel:
            # Delete queues
            queues_to_delete = [
                QueueConfig.DOCUMENT_QUEUE,
                QueueConfig.WORKFLOW_QUEUE,
                QueueConfig.RETENTION_QUEUE,
                QueueConfig.CLASSIFICATION_QUEUE,
                QueueConfig.INTELLIGENCE_QUEUE,
                QueueConfig.NOTIFICATION_QUEUE,
                QueueConfig.AUDIT_QUEUE,
                QueueConfig.DLQ_DOCUMENT,
                QueueConfig.DLQ_WORKFLOW,
                QueueConfig.DLQ_RETENTION,
                QueueConfig.DLQ_CLASSIFICATION,
                QueueConfig.DLQ_INTELLIGENCE,
                QueueConfig.DLQ_NOTIFICATION,
                QueueConfig.DLQ_AUDIT,
            ]

            for queue in queues_to_delete:
                try:
                    channel.queue_delete(queue=queue)
                    self.stdout.write(f'  Deleted queue: {queue}')
                except Exception:
                    pass

            # Delete exchanges
            try:
                channel.exchange_delete(exchange=QueueConfig.EVENTS_EXCHANGE)
                self.stdout.write(
                    f'  Deleted exchange: {QueueConfig.EVENTS_EXCHANGE}'
                )
            except Exception:
                pass

            try:
                channel.exchange_delete(exchange=QueueConfig.DLX_EXCHANGE)
                self.stdout.write(
                    f'  Deleted exchange: {QueueConfig.DLX_EXCHANGE}'
                )
            except Exception:
                pass
