"""
Event consumers for the event-driven architecture.

This module provides consumer classes that process events from RabbitMQ queues,
handling document, workflow, retention, and other domain events.
"""

import json
import logging
import signal
import threading
import time
from abc import ABC, abstractmethod
from typing import Any, Callable, Dict, List, Optional, Type

import pika
from pika.adapters.blocking_connection import BlockingChannel
from pika.exceptions import AMQPError, ConnectionClosedByBroker

from django.conf import settings

from .connection import get_connection_manager, QueueConfig
from .types import (
    BaseEvent,
    create_event_from_dict,
    EventCategory,
    DocumentEventType,
    WorkflowEventType,
    RetentionEventType,
    ClassificationEventType,
    IntelligenceEventType,
    UserEventType,
    SystemEventType,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Base Consumer
# =============================================================================

class BaseEventConsumer(ABC):
    """
    Base class for event consumers.

    Provides common functionality for consuming events from RabbitMQ queues,
    including message acknowledgement, error handling, and retry logic.
    """

    def __init__(
        self,
        queue_name: str,
        prefetch_count: int = 10,
        auto_ack: bool = False,
    ):
        """
        Initialize the consumer.

        Args:
            queue_name: The queue to consume from
            prefetch_count: Number of messages to prefetch
            auto_ack: Whether to automatically acknowledge messages
        """
        self.queue_name = queue_name
        self.prefetch_count = prefetch_count
        self.auto_ack = auto_ack
        self._connection_manager = get_connection_manager()
        self._running = False
        self._consumer_tag = None
        self._channel: Optional[BlockingChannel] = None
        self._handlers: Dict[str, List[Callable]] = {}

        logger.info(f"Initialized consumer for queue: {queue_name}")

    def register_handler(
        self,
        event_type: str,
        handler: Callable[[BaseEvent], None],
    ):
        """Register a handler for a specific event type."""
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)
        logger.debug(f"Registered handler for event type: {event_type}")

    def _deserialize_message(self, body: bytes) -> BaseEvent:
        """Deserialize a message body into an event."""
        data = json.loads(body.decode('utf-8'))
        return create_event_from_dict(data)

    def _process_message(
        self,
        channel: BlockingChannel,
        method: pika.spec.Basic.Deliver,
        properties: pika.BasicProperties,
        body: bytes,
    ):
        """Process a single message from the queue."""
        event = None
        try:
            event = self._deserialize_message(body)
            logger.debug(
                f"Processing event {event.event_type} "
                f"(id={event.metadata.event_id})"
            )

            # Call registered handlers
            handlers = self._handlers.get(event.event_type, [])
            if not handlers:
                # Try category-level handlers
                handlers = self._handlers.get(f"{event.category}.*", [])
            if not handlers:
                # Try catch-all handlers
                handlers = self._handlers.get("*", [])

            for handler in handlers:
                try:
                    handler(event)
                except Exception as e:
                    logger.error(
                        f"Handler error for event {event.event_type}: {e}",
                        exc_info=True
                    )
                    # Don't re-raise - let other handlers process

            # Call the abstract handle method for subclass processing
            self.handle_event(event)

            # Acknowledge the message
            if not self.auto_ack:
                channel.basic_ack(delivery_tag=method.delivery_tag)

            logger.debug(f"Successfully processed event {event.event_type}")

        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode message: {e}")
            # Reject without requeue - message is malformed
            if not self.auto_ack:
                channel.basic_nack(
                    delivery_tag=method.delivery_tag,
                    requeue=False
                )

        except Exception as e:
            logger.exception(f"Error processing message: {e}")
            if event and event.retry_count < event.max_retries:
                # Requeue for retry
                if not self.auto_ack:
                    channel.basic_nack(
                        delivery_tag=method.delivery_tag,
                        requeue=True
                    )
            else:
                # Max retries exceeded - send to DLQ
                if not self.auto_ack:
                    channel.basic_nack(
                        delivery_tag=method.delivery_tag,
                        requeue=False
                    )

    @abstractmethod
    def handle_event(self, event: BaseEvent):
        """
        Handle an event. Must be implemented by subclasses.

        Args:
            event: The event to handle
        """
        pass

    def start(self):
        """Start consuming messages from the queue."""
        self._running = True
        logger.info(f"Starting consumer for queue: {self.queue_name}")

        while self._running:
            try:
                with self._connection_manager.connection() as connection:
                    self._channel = connection.channel()
                    self._channel.basic_qos(prefetch_count=self.prefetch_count)

                    self._consumer_tag = self._channel.basic_consume(
                        queue=self.queue_name,
                        on_message_callback=self._process_message,
                        auto_ack=self.auto_ack,
                    )

                    logger.info(f"Consumer started for queue: {self.queue_name}")

                    while self._running:
                        try:
                            connection.process_data_events(time_limit=1)
                        except Exception as e:
                            if self._running:
                                logger.error(f"Error processing events: {e}")
                                break

            except (AMQPError, ConnectionClosedByBroker) as e:
                if self._running:
                    logger.error(f"Connection error, reconnecting in 5s: {e}")
                    time.sleep(5)
            except Exception as e:
                if self._running:
                    logger.exception(f"Unexpected error in consumer: {e}")
                    time.sleep(5)

        logger.info(f"Consumer stopped for queue: {self.queue_name}")

    def stop(self):
        """Stop consuming messages."""
        self._running = False
        if self._channel and self._consumer_tag:
            try:
                self._channel.basic_cancel(self._consumer_tag)
            except Exception as e:
                logger.warning(f"Error canceling consumer: {e}")
        logger.info(f"Consumer stopping for queue: {self.queue_name}")


# =============================================================================
# Domain-Specific Consumers
# =============================================================================

class DocumentEventConsumer(BaseEventConsumer):
    """Consumer for document-related events."""

    def __init__(self, prefetch_count: int = 10):
        super().__init__(
            queue_name=QueueConfig.DOCUMENT_QUEUE,
            prefetch_count=prefetch_count,
        )

    def handle_event(self, event: BaseEvent):
        """Handle document events."""
        event_type = event.event_type
        payload = event.payload

        if event_type == DocumentEventType.CREATED.value:
            self._handle_document_created(event)
        elif event_type == DocumentEventType.UPDATED.value:
            self._handle_document_updated(event)
        elif event_type == DocumentEventType.DELETED.value:
            self._handle_document_deleted(event)
        elif event_type == DocumentEventType.MOVED.value:
            self._handle_document_moved(event)
        elif event_type == DocumentEventType.CLASSIFICATION_CHANGED.value:
            self._handle_classification_changed(event)
        else:
            logger.debug(f"No specific handler for event type: {event_type}")

    def _handle_document_created(self, event: BaseEvent):
        """Handle document created event."""
        document_id = event.payload.get('document_id')
        logger.info(f"Document created: {document_id}")
        # Trigger indexing, classification, etc.

    def _handle_document_updated(self, event: BaseEvent):
        """Handle document updated event."""
        document_id = event.payload.get('document_id')
        logger.info(f"Document updated: {document_id}")
        # Update search index, etc.

    def _handle_document_deleted(self, event: BaseEvent):
        """Handle document deleted event."""
        document_id = event.payload.get('document_id')
        logger.info(f"Document deleted: {document_id}")
        # Remove from search index, etc.

    def _handle_document_moved(self, event: BaseEvent):
        """Handle document moved event."""
        document_id = event.payload.get('document_id')
        logger.info(f"Document moved: {document_id}")

    def _handle_classification_changed(self, event: BaseEvent):
        """Handle classification changed event."""
        document_id = event.payload.get('document_id')
        logger.info(f"Document classification changed: {document_id}")


class WorkflowEventConsumer(BaseEventConsumer):
    """Consumer for workflow-related events."""

    def __init__(self, prefetch_count: int = 10):
        super().__init__(
            queue_name=QueueConfig.WORKFLOW_QUEUE,
            prefetch_count=prefetch_count,
        )

    def handle_event(self, event: BaseEvent):
        """Handle workflow events."""
        event_type = event.event_type
        payload = event.payload

        if event_type == WorkflowEventType.STARTED.value:
            self._handle_workflow_started(event)
        elif event_type == WorkflowEventType.COMPLETED.value:
            self._handle_workflow_completed(event)
        elif event_type == WorkflowEventType.TASK_ASSIGNED.value:
            self._handle_task_assigned(event)
        elif event_type == WorkflowEventType.TASK_COMPLETED.value:
            self._handle_task_completed(event)
        elif event_type == WorkflowEventType.SLA_WARNING.value:
            self._handle_sla_warning(event)
        elif event_type == WorkflowEventType.SLA_BREACHED.value:
            self._handle_sla_breached(event)
        else:
            logger.debug(f"No specific handler for event type: {event_type}")

    def _handle_workflow_started(self, event: BaseEvent):
        """Handle workflow started event."""
        workflow_id = event.payload.get('workflow_id')
        logger.info(f"Workflow started: {workflow_id}")

    def _handle_workflow_completed(self, event: BaseEvent):
        """Handle workflow completed event."""
        workflow_id = event.payload.get('workflow_id')
        logger.info(f"Workflow completed: {workflow_id}")

    def _handle_task_assigned(self, event: BaseEvent):
        """Handle task assigned event."""
        task_id = event.payload.get('task_id')
        logger.info(f"Task assigned: {task_id}")
        # Send notification to assignee

    def _handle_task_completed(self, event: BaseEvent):
        """Handle task completed event."""
        task_id = event.payload.get('task_id')
        logger.info(f"Task completed: {task_id}")

    def _handle_sla_warning(self, event: BaseEvent):
        """Handle SLA warning event."""
        workflow_id = event.payload.get('workflow_id')
        logger.warning(f"SLA warning for workflow: {workflow_id}")
        # Send urgent notification

    def _handle_sla_breached(self, event: BaseEvent):
        """Handle SLA breached event."""
        workflow_id = event.payload.get('workflow_id')
        logger.error(f"SLA breached for workflow: {workflow_id}")
        # Trigger escalation


class RetentionEventConsumer(BaseEventConsumer):
    """Consumer for retention-related events."""

    def __init__(self, prefetch_count: int = 10):
        super().__init__(
            queue_name=QueueConfig.RETENTION_QUEUE,
            prefetch_count=prefetch_count,
        )

    def handle_event(self, event: BaseEvent):
        """Handle retention events."""
        event_type = event.event_type

        if event_type == RetentionEventType.POLICY_APPLIED.value:
            self._handle_policy_applied(event)
        elif event_type == RetentionEventType.DISPOSITION_DUE.value:
            self._handle_disposition_due(event)
        elif event_type == RetentionEventType.DISPOSITION_EXECUTED.value:
            self._handle_disposition_executed(event)
        elif event_type == RetentionEventType.LEGAL_HOLD_APPLIED.value:
            self._handle_legal_hold_applied(event)
        elif event_type == RetentionEventType.LEGAL_HOLD_RELEASED.value:
            self._handle_legal_hold_released(event)
        else:
            logger.debug(f"No specific handler for event type: {event_type}")

    def _handle_policy_applied(self, event: BaseEvent):
        """Handle retention policy applied event."""
        document_id = event.payload.get('document_id')
        policy_name = event.payload.get('policy_name')
        logger.info(f"Retention policy '{policy_name}' applied to: {document_id}")

    def _handle_disposition_due(self, event: BaseEvent):
        """Handle disposition due event."""
        document_id = event.payload.get('document_id')
        logger.info(f"Disposition due for document: {document_id}")
        # Send notification to document owner

    def _handle_disposition_executed(self, event: BaseEvent):
        """Handle disposition executed event."""
        document_id = event.payload.get('document_id')
        logger.info(f"Disposition executed for document: {document_id}")

    def _handle_legal_hold_applied(self, event: BaseEvent):
        """Handle legal hold applied event."""
        document_id = event.payload.get('document_id')
        logger.info(f"Legal hold applied to document: {document_id}")

    def _handle_legal_hold_released(self, event: BaseEvent):
        """Handle legal hold released event."""
        document_id = event.payload.get('document_id')
        logger.info(f"Legal hold released for document: {document_id}")


class ClassificationEventConsumer(BaseEventConsumer):
    """Consumer for classification-related events."""

    def __init__(self, prefetch_count: int = 10):
        super().__init__(
            queue_name=QueueConfig.CLASSIFICATION_QUEUE,
            prefetch_count=prefetch_count,
        )

    def handle_event(self, event: BaseEvent):
        """Handle classification events."""
        event_type = event.event_type

        if event_type == ClassificationEventType.PREDICTED.value:
            self._handle_prediction(event)
        elif event_type == ClassificationEventType.CONFIRMED.value:
            self._handle_confirmed(event)
        elif event_type == ClassificationEventType.CORRECTED.value:
            self._handle_corrected(event)
        else:
            logger.debug(f"No specific handler for event type: {event_type}")

    def _handle_prediction(self, event: BaseEvent):
        """Handle classification prediction event."""
        document_id = event.payload.get('document_id')
        predicted_class = event.payload.get('predicted_class')
        confidence = event.payload.get('confidence')
        logger.info(
            f"Classification predicted for {document_id}: "
            f"{predicted_class} ({confidence:.2%})"
        )

    def _handle_confirmed(self, event: BaseEvent):
        """Handle classification confirmed event."""
        document_id = event.payload.get('document_id')
        logger.info(f"Classification confirmed for document: {document_id}")

    def _handle_corrected(self, event: BaseEvent):
        """Handle classification corrected event."""
        document_id = event.payload.get('document_id')
        logger.info(f"Classification corrected for document: {document_id}")
        # May trigger model retraining


class IntelligenceEventConsumer(BaseEventConsumer):
    """Consumer for intelligence/NLP-related events."""

    def __init__(self, prefetch_count: int = 10):
        super().__init__(
            queue_name=QueueConfig.INTELLIGENCE_QUEUE,
            prefetch_count=prefetch_count,
        )

    def handle_event(self, event: BaseEvent):
        """Handle intelligence events."""
        event_type = event.event_type

        if event_type == IntelligenceEventType.PROCESSING_STARTED.value:
            logger.info(f"Intelligence processing started: {event.payload}")
        elif event_type == IntelligenceEventType.PROCESSING_COMPLETED.value:
            self._handle_processing_completed(event)
        elif event_type == IntelligenceEventType.PROCESSING_FAILED.value:
            self._handle_processing_failed(event)
        elif event_type == IntelligenceEventType.ENTITIES_EXTRACTED.value:
            self._handle_entities_extracted(event)
        else:
            logger.debug(f"No specific handler for event type: {event_type}")

    def _handle_processing_completed(self, event: BaseEvent):
        """Handle processing completed event."""
        document_id = event.payload.get('document_id')
        logger.info(f"Intelligence processing completed: {document_id}")

    def _handle_processing_failed(self, event: BaseEvent):
        """Handle processing failed event."""
        document_id = event.payload.get('document_id')
        logger.error(f"Intelligence processing failed: {document_id}")

    def _handle_entities_extracted(self, event: BaseEvent):
        """Handle entities extracted event."""
        document_id = event.payload.get('document_id')
        results = event.payload.get('results', {})
        logger.info(
            f"Entities extracted from {document_id}: "
            f"{len(results.get('entities', []))} entities"
        )


class NotificationEventConsumer(BaseEventConsumer):
    """Consumer for notification events."""

    def __init__(self, prefetch_count: int = 10):
        super().__init__(
            queue_name=QueueConfig.NOTIFICATION_QUEUE,
            prefetch_count=prefetch_count,
        )

    def handle_event(self, event: BaseEvent):
        """Handle notification events."""
        # Process notifications - send emails, in-app notifications, etc.
        notification_type = event.payload.get('notification_type')
        recipient = event.payload.get('recipient')
        message = event.payload.get('message')

        logger.info(
            f"Sending {notification_type} notification to {recipient}: {message}"
        )
        # Actual notification sending logic would go here


class AuditEventConsumer(BaseEventConsumer):
    """Consumer for audit events."""

    def __init__(self, prefetch_count: int = 10):
        super().__init__(
            queue_name=QueueConfig.AUDIT_QUEUE,
            prefetch_count=prefetch_count,
        )

    def handle_event(self, event: BaseEvent):
        """Handle audit events - store in audit log."""
        # Import here to avoid circular imports
        from apps.audit.models import AuditLog

        try:
            AuditLog.objects.create(
                user_id=event.metadata.user_id,
                action=event.event_type,
                resource_type=event.category,
                resource_id=event.payload.get('document_id') or event.payload.get('id'),
                ip_address=event.metadata.ip_address,
                user_agent=event.metadata.user_agent,
                details=event.payload,
                organization_id=event.metadata.organization_id,
            )
            logger.debug(f"Audit log created for event: {event.event_type}")
        except Exception as e:
            logger.error(f"Failed to create audit log: {e}")


# =============================================================================
# Consumer Manager
# =============================================================================

class ConsumerManager:
    """
    Manages multiple event consumers.

    Provides functionality to start, stop, and monitor all consumers.
    """

    def __init__(self):
        self._consumers: Dict[str, BaseEventConsumer] = {}
        self._threads: Dict[str, threading.Thread] = {}
        self._running = False

    def register_consumer(self, name: str, consumer: BaseEventConsumer):
        """Register a consumer."""
        self._consumers[name] = consumer
        logger.info(f"Registered consumer: {name}")

    def start_all(self):
        """Start all registered consumers in separate threads."""
        self._running = True
        for name, consumer in self._consumers.items():
            thread = threading.Thread(
                target=consumer.start,
                name=f"consumer-{name}",
                daemon=True,
            )
            thread.start()
            self._threads[name] = thread
            logger.info(f"Started consumer thread: {name}")

    def stop_all(self):
        """Stop all consumers."""
        self._running = False
        for name, consumer in self._consumers.items():
            consumer.stop()
            logger.info(f"Stopped consumer: {name}")

        # Wait for threads to finish
        for name, thread in self._threads.items():
            thread.join(timeout=5)
            if thread.is_alive():
                logger.warning(f"Consumer thread {name} did not stop cleanly")

    def get_status(self) -> Dict[str, bool]:
        """Get status of all consumers."""
        return {
            name: thread.is_alive()
            for name, thread in self._threads.items()
        }


# =============================================================================
# Default Consumer Setup
# =============================================================================

def create_default_consumers() -> ConsumerManager:
    """Create and configure default consumers."""
    manager = ConsumerManager()

    # Register all domain consumers
    manager.register_consumer('document', DocumentEventConsumer())
    manager.register_consumer('workflow', WorkflowEventConsumer())
    manager.register_consumer('retention', RetentionEventConsumer())
    manager.register_consumer('classification', ClassificationEventConsumer())
    manager.register_consumer('intelligence', IntelligenceEventConsumer())
    manager.register_consumer('notification', NotificationEventConsumer())
    manager.register_consumer('audit', AuditEventConsumer())

    return manager
