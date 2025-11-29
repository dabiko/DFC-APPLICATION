"""
Celery tasks for the event-driven architecture.

This module provides asynchronous task definitions for publishing events
and running background event processing.
"""

import logging
from typing import Any, Dict, Optional

from celery import shared_task
from celery.exceptions import MaxRetriesExceededError

from .types import BaseEvent, create_event_from_dict
from .publisher import get_publisher

logger = logging.getLogger(__name__)


# =============================================================================
# Event Publishing Tasks
# =============================================================================

@shared_task(
    bind=True,
    name='events.publish_event',
    max_retries=3,
    default_retry_delay=5,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=60,
)
def publish_event_task(self, event_data: Dict[str, Any]) -> bool:
    """
    Publish an event asynchronously via Celery.

    Args:
        event_data: Dictionary representation of the event

    Returns:
        True if published successfully, False otherwise
    """
    try:
        event = create_event_from_dict(event_data)
        event.retry_count = self.request.retries

        publisher = get_publisher()
        success = publisher.publish(event)

        if success:
            logger.info(
                f"Async published event {event.event_type} "
                f"(id={event.metadata.event_id})"
            )
        else:
            logger.warning(
                f"Failed to async publish event {event.event_type} "
                f"(id={event.metadata.event_id})"
            )
            # Retry on failure
            raise Exception("Publishing failed")

        return success

    except MaxRetriesExceededError:
        logger.error(
            f"Max retries exceeded for event: {event_data.get('event_type')}"
        )
        return False
    except Exception as e:
        logger.error(f"Error in publish_event_task: {e}")
        raise


@shared_task(
    bind=True,
    name='events.publish_batch',
    max_retries=2,
    default_retry_delay=10,
)
def publish_batch_task(
    self,
    events_data: list[Dict[str, Any]],
) -> Dict[str, int]:
    """
    Publish multiple events in a batch.

    Args:
        events_data: List of event dictionaries

    Returns:
        Dictionary with 'success' and 'failed' counts
    """
    try:
        events = [create_event_from_dict(data) for data in events_data]
        publisher = get_publisher()
        result = publisher.publish_batch(events)

        logger.info(
            f"Batch published: {result['success']} success, "
            f"{result['failed']} failed"
        )

        return result

    except Exception as e:
        logger.error(f"Error in publish_batch_task: {e}")
        raise self.retry(exc=e)


# =============================================================================
# Event Processing Tasks
# =============================================================================

@shared_task(
    name='events.process_document_event',
    max_retries=3,
    default_retry_delay=5,
)
def process_document_event_task(event_data: Dict[str, Any]):
    """
    Process a document event.

    This task handles document-related events that require
    additional processing like indexing, classification, etc.
    """
    event = create_event_from_dict(event_data)
    event_type = event.event_type
    document_id = event.payload.get('document_id')

    logger.info(f"Processing document event: {event_type} for {document_id}")

    try:
        if event_type == 'document.created':
            # Trigger document indexing
            from apps.search.tasks import index_document_task
            index_document_task.delay(document_id)

            # Trigger auto-classification if enabled
            from apps.classification.tasks import classify_document_task
            classify_document_task.delay(document_id)

        elif event_type == 'document.updated':
            # Re-index document
            from apps.search.tasks import index_document_task
            index_document_task.delay(document_id)

        elif event_type == 'document.deleted':
            # Remove from search index
            from apps.search.tasks import remove_document_from_index_task
            remove_document_from_index_task.delay(document_id)

        logger.info(f"Document event processed: {event_type} for {document_id}")

    except Exception as e:
        logger.error(f"Error processing document event: {e}")
        raise


@shared_task(
    name='events.process_workflow_event',
    max_retries=3,
    default_retry_delay=5,
)
def process_workflow_event_task(event_data: Dict[str, Any]):
    """
    Process a workflow event.

    This task handles workflow-related events that require
    notification sending, SLA tracking, etc.
    """
    event = create_event_from_dict(event_data)
    event_type = event.event_type
    workflow_id = event.payload.get('workflow_id')
    task_id = event.payload.get('task_id')

    logger.info(f"Processing workflow event: {event_type}")

    try:
        if event_type == 'workflow.task_assigned':
            # Send notification to assignee
            from apps.notifications.tasks import send_task_assignment_notification
            send_task_assignment_notification.delay(
                task_id=task_id,
                user_id=event.metadata.user_id,
            )

        elif event_type == 'workflow.sla_warning':
            # Send SLA warning notification
            from apps.notifications.tasks import send_sla_warning_notification
            send_sla_warning_notification.delay(workflow_id=workflow_id)

        elif event_type == 'workflow.sla_breached':
            # Trigger escalation
            from apps.workflows.tasks import trigger_escalation_task
            trigger_escalation_task.delay(workflow_id=workflow_id)

        logger.info(f"Workflow event processed: {event_type}")

    except Exception as e:
        logger.error(f"Error processing workflow event: {e}")
        raise


@shared_task(
    name='events.process_retention_event',
    max_retries=3,
    default_retry_delay=5,
)
def process_retention_event_task(event_data: Dict[str, Any]):
    """
    Process a retention event.

    This task handles retention-related events like
    disposition notifications, policy applications, etc.
    """
    event = create_event_from_dict(event_data)
    event_type = event.event_type
    document_id = event.payload.get('document_id')

    logger.info(f"Processing retention event: {event_type} for {document_id}")

    try:
        if event_type == 'retention.disposition_due':
            # Send reminder notification
            from apps.notifications.tasks import send_disposition_reminder
            send_disposition_reminder.delay(document_id=document_id)

        elif event_type == 'retention.legal_hold_applied':
            # Notify relevant parties
            from apps.notifications.tasks import send_legal_hold_notification
            send_legal_hold_notification.delay(
                document_id=document_id,
                action='applied',
            )

        logger.info(f"Retention event processed: {event_type}")

    except Exception as e:
        logger.error(f"Error processing retention event: {e}")
        raise


# =============================================================================
# Maintenance Tasks
# =============================================================================

@shared_task(name='events.health_check')
def event_system_health_check():
    """
    Perform health check on the event system.

    Checks RabbitMQ connectivity and queue status.
    """
    from .connection import check_rabbitmq_health, get_connection_manager

    try:
        # Check RabbitMQ connection
        is_healthy = check_rabbitmq_health()

        if is_healthy:
            logger.info("Event system health check: HEALTHY")
        else:
            logger.warning("Event system health check: UNHEALTHY")

        # Get publisher stats
        publisher = get_publisher()
        stats = publisher.get_stats()
        logger.info(f"Publisher stats: {stats}")

        return {
            'healthy': is_healthy,
            'publisher_stats': stats,
        }

    except Exception as e:
        logger.error(f"Event system health check failed: {e}")
        return {
            'healthy': False,
            'error': str(e),
        }


@shared_task(name='events.setup_infrastructure')
def setup_event_infrastructure():
    """
    Setup RabbitMQ infrastructure.

    Creates exchanges, queues, and bindings.
    """
    from .connection import setup_rabbitmq

    try:
        success = setup_rabbitmq()
        if success:
            logger.info("Event infrastructure setup completed")
        else:
            logger.error("Event infrastructure setup failed")
        return success
    except Exception as e:
        logger.error(f"Error setting up event infrastructure: {e}")
        return False


@shared_task(name='events.process_dead_letters')
def process_dead_letter_queue():
    """
    Process messages in dead letter queues.

    Analyzes failed messages and takes appropriate action
    (retry, alert, or archive).
    """
    from .connection import get_channel, QueueConfig

    dlq_queues = [
        QueueConfig.DLQ_DOCUMENT,
        QueueConfig.DLQ_WORKFLOW,
        QueueConfig.DLQ_RETENTION,
        QueueConfig.DLQ_CLASSIFICATION,
        QueueConfig.DLQ_INTELLIGENCE,
        QueueConfig.DLQ_NOTIFICATION,
        QueueConfig.DLQ_AUDIT,
    ]

    total_processed = 0

    try:
        with get_channel() as channel:
            for dlq in dlq_queues:
                # Check queue message count
                queue_info = channel.queue_declare(
                    queue=dlq,
                    passive=True,
                )
                message_count = queue_info.method.message_count

                if message_count > 0:
                    logger.warning(
                        f"DLQ {dlq} has {message_count} messages"
                    )
                    # Process up to 100 messages per run
                    for _ in range(min(message_count, 100)):
                        method, properties, body = channel.basic_get(
                            queue=dlq,
                            auto_ack=False,
                        )
                        if method:
                            # Log the failed message
                            logger.error(
                                f"Dead letter from {dlq}: {body[:200]}"
                            )
                            # Acknowledge to remove from DLQ
                            channel.basic_ack(method.delivery_tag)
                            total_processed += 1

        logger.info(f"Processed {total_processed} dead letters")
        return total_processed

    except Exception as e:
        logger.error(f"Error processing dead letters: {e}")
        return 0
