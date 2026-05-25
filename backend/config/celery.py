"""
Celery configuration for DFC Application.

This file contains the Celery application instance and configuration.
Uses RabbitMQ as the message broker for the event-driven architecture.
"""
import os
from celery import Celery
from celery.schedules import crontab
from kombu import Exchange, Queue

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Create Celery app instance
app = Celery('dfc')

# Load configuration from Django settings with a namespace of 'CELERY'
# This means all celery-related settings should have a `CELERY_` prefix
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks in all installed apps
app.autodiscover_tasks()

# =============================================================================
# RabbitMQ / Event Queue Configuration
# =============================================================================
# RabbitMQ 4.x removed support for transient non-exclusive queues.
# All queues must be declared durable and messages persistent.

_default_exchange = Exchange('default', type='direct', durable=True)
_events_exchange = Exchange('dfc.events', type='topic', durable=True)

app.conf.task_queues = [
    Queue('default',          _default_exchange, routing_key='default',            durable=True),
    Queue('events',           _events_exchange,  routing_key='event.#',             durable=True),
    Queue('events.document',  _events_exchange,  routing_key='event.document.#',    durable=True),
    Queue('events.workflow',  _events_exchange,  routing_key='event.workflow.#',    durable=True),
    Queue('events.retention', _events_exchange,  routing_key='event.retention.#',   durable=True),
]

app.conf.task_default_queue = 'default'
app.conf.task_default_exchange = 'default'
app.conf.task_default_routing_key = 'default'
app.conf.task_default_delivery_mode = 'persistent'

# Task routing - direct event tasks to appropriate queues
app.conf.task_routes = {
    'events.publish_event': {'queue': 'events'},
    'events.publish_batch': {'queue': 'events'},
    'events.process_document_event': {'queue': 'events.document'},
    'events.process_workflow_event': {'queue': 'events.workflow'},
    'events.process_retention_event': {'queue': 'events.retention'},
}


# =============================================================================
# Celery Beat Schedule - Periodic Tasks
# =============================================================================

app.conf.beat_schedule = {
    # SLA Monitoring - Run every 15 minutes
    'sla-monitoring-cycle': {
        'task': 'apps.workflows.tasks.run_sla_monitoring',
        'schedule': crontab(minute='*/15'),
        'options': {'queue': 'default'},
    },

    # Task Reminders - Run every 30 minutes
    'send-task-reminders': {
        'task': 'apps.workflows.tasks.send_task_reminders',
        'schedule': crontab(minute='*/30'),
        'options': {'queue': 'default'},
    },

    # Process Overdue Tasks - Run every hour
    'process-overdue-tasks': {
        'task': 'apps.workflows.tasks.process_overdue_tasks',
        'schedule': crontab(minute=0),  # Every hour at :00
        'options': {'queue': 'default'},
    },

    # Daily Digest - Run every weekday at 8:00 AM
    'workflow-daily-digest': {
        'task': 'apps.workflows.tasks.send_workflow_daily_digest',
        'schedule': crontab(hour=8, minute=0, day_of_week='1-5'),
        'options': {'queue': 'default'},
    },

    # SLA Compliance Report - Run weekly on Monday at 9:00 AM
    'weekly-sla-compliance-report': {
        'task': 'apps.workflows.tasks.generate_sla_compliance_report',
        'schedule': crontab(hour=9, minute=0, day_of_week='1'),
        'options': {'queue': 'default'},
        'kwargs': {'period_days': 7},
    },

    # =============================================================================
    # ML Classification Tasks
    # =============================================================================

    # Check if model retraining is needed - Run daily at 2:00 AM
    'check-ml-retrain-needed': {
        'task': 'apps.classification.tasks.check_retrain_needed',
        'schedule': crontab(hour=2, minute=0),
        'options': {'queue': 'default'},
    },

    # Generate classification statistics report - Run daily at 7:00 AM
    'classification-daily-report': {
        'task': 'apps.classification.tasks.generate_classification_report',
        'schedule': crontab(hour=7, minute=0),
        'options': {'queue': 'default'},
    },

    # Cleanup old predictions - Run weekly on Sunday at 3:00 AM
    'cleanup-old-predictions': {
        'task': 'apps.classification.tasks.cleanup_old_predictions',
        'schedule': crontab(hour=3, minute=0, day_of_week='0'),
        'options': {'queue': 'default'},
        'kwargs': {'days': 90},
    },

    # =============================================================================
    # Event System Tasks
    # =============================================================================

    # Event system health check - Run every 5 minutes
    'event-system-health-check': {
        'task': 'events.health_check',
        'schedule': crontab(minute='*/5'),
        'options': {'queue': 'events'},
    },

    # Process dead letter queue - Run every hour
    'process-dead-letters': {
        'task': 'events.process_dead_letters',
        'schedule': crontab(minute=15),  # Every hour at :15
        'options': {'queue': 'events'},
    },

    # =============================================================================
    # MFA & Security Tasks
    # =============================================================================

    # Cleanup old used backup codes - Run daily at 3:30 AM
    'cleanup-old-backup-codes': {
        'task': 'cleanup_old_backup_codes',
        'schedule': crontab(hour=3, minute=30),
        'options': {'queue': 'default'},
        'kwargs': {'days': 90},
    },

    # Cleanup expired trusted devices - Run daily at 4:00 AM
    'cleanup-expired-trusted-devices': {
        'task': 'cleanup_expired_trusted_devices',
        'schedule': crontab(hour=4, minute=0),
        'options': {'queue': 'default'},
    },

    # Reset MFA regeneration counters - Run daily at 1:00 AM
    'reset-mfa-regeneration-counters': {
        'task': 'reset_mfa_regeneration_counters',
        'schedule': crontab(hour=1, minute=0),
        'options': {'queue': 'default'},
    },
}


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Debug task for testing Celery."""
    print(f'Request: {self.request!r}')
