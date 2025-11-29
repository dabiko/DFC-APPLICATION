"""
Event-Driven Architecture for DFC Application.

This app provides:
- RabbitMQ connection management
- Event definitions and schemas
- Event publishers and consumers
- Dead letter queue handling

Usage:
    from apps.events import (
        publish_event,
        publish_document_event,
        publish_workflow_event,
        publish_retention_event,
        DocumentEventType,
        WorkflowEventType,
        RetentionEventType,
        EventPriority,
    )

    # Publish a document event
    publish_document_event(
        event_type=DocumentEventType.CREATED,
        document_id='123',
        document_title='My Document',
        user_id='user-456',
    )
"""

default_app_config = 'apps.events.apps.EventsConfig'

# Re-export commonly used items for convenience
from .types import (
    EventCategory,
    EventPriority,
    DocumentEventType,
    FolderEventType,
    WorkflowEventType,
    RetentionEventType,
    ClassificationEventType,
    IntelligenceEventType,
    UserEventType,
    SystemEventType,
    BaseEvent,
    DocumentEvent,
    WorkflowEvent,
    RetentionEvent,
)

from .publisher import (
    publish_event,
    publish_events,
    publish_document_event,
    publish_workflow_event,
    publish_retention_event,
    publish_classification_event,
    publish_intelligence_event,
    publish_user_event,
    publish_system_event,
    get_publisher,
)

from .connection import (
    check_rabbitmq_health,
    setup_rabbitmq,
    get_channel,
)

__all__ = [
    # Event types
    'EventCategory',
    'EventPriority',
    'DocumentEventType',
    'FolderEventType',
    'WorkflowEventType',
    'RetentionEventType',
    'ClassificationEventType',
    'IntelligenceEventType',
    'UserEventType',
    'SystemEventType',
    # Event classes
    'BaseEvent',
    'DocumentEvent',
    'WorkflowEvent',
    'RetentionEvent',
    # Publishers
    'publish_event',
    'publish_events',
    'publish_document_event',
    'publish_workflow_event',
    'publish_retention_event',
    'publish_classification_event',
    'publish_intelligence_event',
    'publish_user_event',
    'publish_system_event',
    'get_publisher',
    # Connection
    'check_rabbitmq_health',
    'setup_rabbitmq',
    'get_channel',
]
