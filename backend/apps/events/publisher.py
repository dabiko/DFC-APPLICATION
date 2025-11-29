"""
Event publisher for the event-driven architecture.

This module provides a centralized event publishing service that handles
serialization, routing, and delivery of events to RabbitMQ.
"""

import json
import logging
import threading
from datetime import datetime
from typing import Any, Dict, List, Optional, Union

import pika
from pika.exceptions import AMQPError

from django.conf import settings

from .connection import get_channel, QueueConfig, get_connection_manager
from .types import (
    BaseEvent,
    DocumentEvent,
    WorkflowEvent,
    RetentionEvent,
    ClassificationEvent,
    IntelligenceEvent,
    UserEvent,
    SystemEvent,
    EventCategory,
    EventPriority,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Event Publisher
# =============================================================================

class EventPublisher:
    """
    Centralized event publisher for RabbitMQ.

    Features:
    - Automatic event routing based on category
    - Priority-based message delivery
    - Batch publishing support
    - Async publishing with confirmation
    - Automatic retry on failure
    """

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        """Singleton pattern for event publisher."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        """Initialize the event publisher."""
        if self._initialized:
            return

        self._connection_manager = get_connection_manager()
        self._exchange = QueueConfig.EVENTS_EXCHANGE
        self._published_count = 0
        self._failed_count = 0
        self._initialized = True

        logger.info("EventPublisher initialized")

    def _get_routing_key(self, event: BaseEvent) -> str:
        """Generate routing key for an event."""
        # Format: event.{category}.{event_type_suffix}
        # e.g., event.document.created, event.workflow.task_assigned
        event_type = event.event_type
        parts = event_type.split('.')
        if len(parts) >= 2:
            return f"event.{parts[0]}.{'.'.join(parts[1:])}"
        return f"event.{event.category}.{event_type}"

    def _serialize_event(self, event: BaseEvent) -> bytes:
        """Serialize event to bytes for publishing."""
        return event.to_json().encode('utf-8')

    def _get_message_properties(
        self,
        event: BaseEvent,
        content_type: str = 'application/json',
    ) -> pika.BasicProperties:
        """Build message properties for an event."""
        return pika.BasicProperties(
            content_type=content_type,
            delivery_mode=2,  # Persistent
            priority=event.priority,
            timestamp=int(datetime.utcnow().timestamp()),
            message_id=event.metadata.event_id,
            correlation_id=event.metadata.correlation_id,
            headers={
                'event_type': event.event_type,
                'category': event.category,
                'version': event.metadata.version,
                'source': event.metadata.source,
                'retry_count': event.retry_count,
            }
        )

    def publish(
        self,
        event: BaseEvent,
        mandatory: bool = True,
    ) -> bool:
        """
        Publish a single event to RabbitMQ.

        Args:
            event: The event to publish
            mandatory: If True, message must be routed to a queue

        Returns:
            True if published successfully, False otherwise
        """
        try:
            routing_key = self._get_routing_key(event)
            message_body = self._serialize_event(event)
            properties = self._get_message_properties(event)

            with get_channel() as channel:
                channel.basic_publish(
                    exchange=self._exchange,
                    routing_key=routing_key,
                    body=message_body,
                    properties=properties,
                    mandatory=mandatory,
                )

            self._published_count += 1
            logger.debug(
                f"Published event {event.event_type} "
                f"(id={event.metadata.event_id}) "
                f"to {self._exchange}/{routing_key}"
            )
            return True

        except AMQPError as e:
            self._failed_count += 1
            logger.error(f"Failed to publish event {event.event_type}: {e}")
            return False
        except Exception as e:
            self._failed_count += 1
            logger.exception(f"Unexpected error publishing event: {e}")
            return False

    def publish_batch(
        self,
        events: List[BaseEvent],
        mandatory: bool = True,
    ) -> Dict[str, int]:
        """
        Publish multiple events in a batch.

        Args:
            events: List of events to publish
            mandatory: If True, messages must be routed to queues

        Returns:
            Dictionary with 'success' and 'failed' counts
        """
        success = 0
        failed = 0

        try:
            with get_channel() as channel:
                for event in events:
                    try:
                        routing_key = self._get_routing_key(event)
                        message_body = self._serialize_event(event)
                        properties = self._get_message_properties(event)

                        channel.basic_publish(
                            exchange=self._exchange,
                            routing_key=routing_key,
                            body=message_body,
                            properties=properties,
                            mandatory=mandatory,
                        )
                        success += 1
                        self._published_count += 1

                    except Exception as e:
                        failed += 1
                        self._failed_count += 1
                        logger.error(f"Failed to publish event in batch: {e}")

        except AMQPError as e:
            # Connection-level error - count all remaining as failed
            failed += len(events) - success
            self._failed_count += len(events) - success
            logger.error(f"Batch publishing connection error: {e}")

        logger.info(f"Batch publish complete: {success} success, {failed} failed")
        return {'success': success, 'failed': failed}

    def publish_async(
        self,
        event: BaseEvent,
        callback: Optional[callable] = None,
    ):
        """
        Publish event asynchronously using Celery.

        Args:
            event: The event to publish
            callback: Optional callback function on completion
        """
        from .tasks import publish_event_task
        result = publish_event_task.delay(event.to_dict())
        if callback:
            result.then(callback)
        return result

    def get_stats(self) -> Dict[str, int]:
        """Get publisher statistics."""
        return {
            'published': self._published_count,
            'failed': self._failed_count,
        }

    def reset_stats(self):
        """Reset publisher statistics."""
        self._published_count = 0
        self._failed_count = 0


# =============================================================================
# Convenience Functions
# =============================================================================

_publisher: Optional[EventPublisher] = None


def get_publisher() -> EventPublisher:
    """Get the global event publisher instance."""
    global _publisher
    if _publisher is None:
        _publisher = EventPublisher()
    return _publisher


def publish_event(event: BaseEvent) -> bool:
    """Convenience function to publish an event."""
    return get_publisher().publish(event)


def publish_events(events: List[BaseEvent]) -> Dict[str, int]:
    """Convenience function to publish multiple events."""
    return get_publisher().publish_batch(events)


# =============================================================================
# Domain-Specific Publishers
# =============================================================================

def publish_document_event(
    event_type,
    document_id: str,
    document_title: str,
    folder_id: Optional[str] = None,
    user_id: Optional[str] = None,
    organization_id: Optional[str] = None,
    additional_data: Optional[Dict[str, Any]] = None,
    priority: EventPriority = EventPriority.NORMAL,
    correlation_id: Optional[str] = None,
) -> bool:
    """Publish a document event."""
    event = DocumentEvent.create(
        event_type=event_type,
        document_id=document_id,
        document_title=document_title,
        folder_id=folder_id,
        user_id=user_id,
        organization_id=organization_id,
        additional_data=additional_data,
        priority=priority,
        correlation_id=correlation_id,
    )
    return publish_event(event)


def publish_workflow_event(
    event_type,
    workflow_id: str,
    workflow_name: str,
    instance_id: Optional[str] = None,
    task_id: Optional[str] = None,
    user_id: Optional[str] = None,
    organization_id: Optional[str] = None,
    additional_data: Optional[Dict[str, Any]] = None,
    priority: EventPriority = EventPriority.NORMAL,
) -> bool:
    """Publish a workflow event."""
    event = WorkflowEvent.create(
        event_type=event_type,
        workflow_id=workflow_id,
        workflow_name=workflow_name,
        instance_id=instance_id,
        task_id=task_id,
        user_id=user_id,
        organization_id=organization_id,
        additional_data=additional_data,
        priority=priority,
    )
    return publish_event(event)


def publish_retention_event(
    event_type,
    document_id: str,
    policy_id: Optional[str] = None,
    policy_name: Optional[str] = None,
    user_id: Optional[str] = None,
    organization_id: Optional[str] = None,
    additional_data: Optional[Dict[str, Any]] = None,
    priority: EventPriority = EventPriority.NORMAL,
) -> bool:
    """Publish a retention event."""
    event = RetentionEvent.create(
        event_type=event_type,
        document_id=document_id,
        policy_id=policy_id,
        policy_name=policy_name,
        user_id=user_id,
        organization_id=organization_id,
        additional_data=additional_data,
        priority=priority,
    )
    return publish_event(event)


def publish_classification_event(
    event_type,
    document_id: str,
    model_id: Optional[str] = None,
    predicted_class: Optional[str] = None,
    confidence: Optional[float] = None,
    user_id: Optional[str] = None,
    organization_id: Optional[str] = None,
    additional_data: Optional[Dict[str, Any]] = None,
    priority: EventPriority = EventPriority.NORMAL,
) -> bool:
    """Publish a classification event."""
    event = ClassificationEvent.create(
        event_type=event_type,
        document_id=document_id,
        model_id=model_id,
        predicted_class=predicted_class,
        confidence=confidence,
        user_id=user_id,
        organization_id=organization_id,
        additional_data=additional_data,
        priority=priority,
    )
    return publish_event(event)


def publish_intelligence_event(
    event_type,
    document_id: str,
    job_id: Optional[str] = None,
    results: Optional[Dict[str, Any]] = None,
    user_id: Optional[str] = None,
    organization_id: Optional[str] = None,
    priority: EventPriority = EventPriority.NORMAL,
) -> bool:
    """Publish an intelligence event."""
    event = IntelligenceEvent.create(
        event_type=event_type,
        document_id=document_id,
        job_id=job_id,
        results=results,
        user_id=user_id,
        organization_id=organization_id,
        priority=priority,
    )
    return publish_event(event)


def publish_user_event(
    event_type,
    target_user_id: str,
    actor_user_id: Optional[str] = None,
    organization_id: Optional[str] = None,
    additional_data: Optional[Dict[str, Any]] = None,
    priority: EventPriority = EventPriority.NORMAL,
) -> bool:
    """Publish a user event."""
    event = UserEvent.create(
        event_type=event_type,
        target_user_id=target_user_id,
        actor_user_id=actor_user_id,
        organization_id=organization_id,
        additional_data=additional_data,
        priority=priority,
    )
    return publish_event(event)


def publish_system_event(
    event_type,
    message: str,
    details: Optional[Dict[str, Any]] = None,
    priority: EventPriority = EventPriority.NORMAL,
) -> bool:
    """Publish a system event."""
    event = SystemEvent.create(
        event_type=event_type,
        message=message,
        details=details,
        priority=priority,
    )
    return publish_event(event)
