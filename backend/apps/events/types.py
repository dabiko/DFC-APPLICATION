"""
Event type definitions and schemas for the event-driven architecture.

This module defines all event types used in the DFC application,
along with their schemas and validation.
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4
import json


# =============================================================================
# Event Categories
# =============================================================================

class EventCategory(str, Enum):
    """Categories of events in the system."""
    DOCUMENT = 'document'
    FOLDER = 'folder'
    WORKFLOW = 'workflow'
    RETENTION = 'retention'
    USER = 'user'
    CLASSIFICATION = 'classification'
    INTELLIGENCE = 'intelligence'
    NOTIFICATION = 'notification'
    AUDIT = 'audit'
    SYSTEM = 'system'


# =============================================================================
# Event Types
# =============================================================================

class DocumentEventType(str, Enum):
    """Document-related event types."""
    CREATED = 'document.created'
    UPDATED = 'document.updated'
    DELETED = 'document.deleted'
    MOVED = 'document.moved'
    COPIED = 'document.copied'
    VERSION_CREATED = 'document.version_created'
    DOWNLOADED = 'document.downloaded'
    PREVIEWED = 'document.previewed'
    SHARED = 'document.shared'
    UNSHARED = 'document.unshared'
    METADATA_UPDATED = 'document.metadata_updated'
    CLASSIFICATION_CHANGED = 'document.classification_changed'
    LOCKED = 'document.locked'
    UNLOCKED = 'document.unlocked'


class FolderEventType(str, Enum):
    """Folder-related event types."""
    CREATED = 'folder.created'
    UPDATED = 'folder.updated'
    DELETED = 'folder.deleted'
    MOVED = 'folder.moved'
    PERMISSIONS_CHANGED = 'folder.permissions_changed'


class WorkflowEventType(str, Enum):
    """Workflow-related event types."""
    STARTED = 'workflow.started'
    COMPLETED = 'workflow.completed'
    CANCELLED = 'workflow.cancelled'
    TASK_ASSIGNED = 'workflow.task_assigned'
    TASK_COMPLETED = 'workflow.task_completed'
    TASK_REJECTED = 'workflow.task_rejected'
    TASK_OVERDUE = 'workflow.task_overdue'
    SLA_WARNING = 'workflow.sla_warning'
    SLA_BREACHED = 'workflow.sla_breached'
    ESCALATED = 'workflow.escalated'


class RetentionEventType(str, Enum):
    """Retention-related event types."""
    POLICY_APPLIED = 'retention.policy_applied'
    POLICY_REMOVED = 'retention.policy_removed'
    DISPOSITION_DUE = 'retention.disposition_due'
    DISPOSITION_REMINDER = 'retention.disposition_reminder'
    DISPOSITION_EXECUTED = 'retention.disposition_executed'
    LEGAL_HOLD_APPLIED = 'retention.legal_hold_applied'
    LEGAL_HOLD_RELEASED = 'retention.legal_hold_released'
    ARCHIVED = 'retention.archived'
    DELETED_PERMANENT = 'retention.deleted_permanent'


class UserEventType(str, Enum):
    """User-related event types."""
    LOGGED_IN = 'user.logged_in'
    LOGGED_OUT = 'user.logged_out'
    LOGIN_FAILED = 'user.login_failed'
    PASSWORD_CHANGED = 'user.password_changed'
    MFA_ENABLED = 'user.mfa_enabled'
    MFA_DISABLED = 'user.mfa_disabled'
    ROLE_CHANGED = 'user.role_changed'
    PERMISSIONS_CHANGED = 'user.permissions_changed'
    DEACTIVATED = 'user.deactivated'
    REACTIVATED = 'user.reactivated'


class ClassificationEventType(str, Enum):
    """Classification-related event types."""
    PREDICTED = 'classification.predicted'
    CONFIRMED = 'classification.confirmed'
    CORRECTED = 'classification.corrected'
    REJECTED = 'classification.rejected'
    MODEL_TRAINED = 'classification.model_trained'
    MODEL_ACTIVATED = 'classification.model_activated'


class IntelligenceEventType(str, Enum):
    """Intelligence/NLP-related event types."""
    PROCESSING_STARTED = 'intelligence.processing_started'
    PROCESSING_COMPLETED = 'intelligence.processing_completed'
    PROCESSING_FAILED = 'intelligence.processing_failed'
    ENTITIES_EXTRACTED = 'intelligence.entities_extracted'
    TABLES_EXTRACTED = 'intelligence.tables_extracted'
    SUMMARY_GENERATED = 'intelligence.summary_generated'


class SystemEventType(str, Enum):
    """System-level event types."""
    STARTED = 'system.started'
    SHUTDOWN = 'system.shutdown'
    ERROR = 'system.error'
    WARNING = 'system.warning'
    MAINTENANCE_MODE = 'system.maintenance_mode'
    QUOTA_WARNING = 'system.quota_warning'
    QUOTA_EXCEEDED = 'system.quota_exceeded'


# =============================================================================
# Event Priority
# =============================================================================

class EventPriority(int, Enum):
    """Priority levels for event processing."""
    LOW = 1
    NORMAL = 5
    HIGH = 8
    CRITICAL = 10


# =============================================================================
# Base Event Schema
# =============================================================================

@dataclass
class EventMetadata:
    """Metadata attached to every event."""
    event_id: str = field(default_factory=lambda: str(uuid4()))
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    version: str = '1.0'
    source: str = 'dfc-backend'
    correlation_id: Optional[str] = None
    causation_id: Optional[str] = None
    user_id: Optional[str] = None
    organization_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


@dataclass
class BaseEvent:
    """Base class for all events."""
    event_type: str
    category: str
    priority: int = EventPriority.NORMAL.value
    metadata: EventMetadata = field(default_factory=EventMetadata)
    payload: Dict[str, Any] = field(default_factory=dict)
    retry_count: int = 0
    max_retries: int = 3

    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary."""
        return asdict(self)

    def to_json(self) -> str:
        """Convert event to JSON string."""
        return json.dumps(self.to_dict(), default=str)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'BaseEvent':
        """Create event from dictionary."""
        metadata = EventMetadata(**data.get('metadata', {}))
        return cls(
            event_type=data['event_type'],
            category=data['category'],
            priority=data.get('priority', EventPriority.NORMAL.value),
            metadata=metadata,
            payload=data.get('payload', {}),
            retry_count=data.get('retry_count', 0),
            max_retries=data.get('max_retries', 3),
        )

    @classmethod
    def from_json(cls, json_str: str) -> 'BaseEvent':
        """Create event from JSON string."""
        return cls.from_dict(json.loads(json_str))


# =============================================================================
# Specific Event Classes
# =============================================================================

@dataclass
class DocumentEvent(BaseEvent):
    """Document-related event."""
    category: str = EventCategory.DOCUMENT.value

    @classmethod
    def create(
        cls,
        event_type: DocumentEventType,
        document_id: str,
        document_title: str,
        folder_id: Optional[str] = None,
        user_id: Optional[str] = None,
        organization_id: Optional[str] = None,
        additional_data: Optional[Dict[str, Any]] = None,
        priority: EventPriority = EventPriority.NORMAL,
        correlation_id: Optional[str] = None,
    ) -> 'DocumentEvent':
        """Create a document event."""
        payload = {
            'document_id': document_id,
            'document_title': document_title,
            'folder_id': folder_id,
            **(additional_data or {}),
        }
        metadata = EventMetadata(
            user_id=user_id,
            organization_id=organization_id,
            correlation_id=correlation_id,
        )
        return cls(
            event_type=event_type.value,
            priority=priority.value,
            metadata=metadata,
            payload=payload,
        )


@dataclass
class WorkflowEvent(BaseEvent):
    """Workflow-related event."""
    category: str = EventCategory.WORKFLOW.value

    @classmethod
    def create(
        cls,
        event_type: WorkflowEventType,
        workflow_id: str,
        workflow_name: str,
        instance_id: Optional[str] = None,
        task_id: Optional[str] = None,
        user_id: Optional[str] = None,
        organization_id: Optional[str] = None,
        additional_data: Optional[Dict[str, Any]] = None,
        priority: EventPriority = EventPriority.NORMAL,
    ) -> 'WorkflowEvent':
        """Create a workflow event."""
        payload = {
            'workflow_id': workflow_id,
            'workflow_name': workflow_name,
            'instance_id': instance_id,
            'task_id': task_id,
            **(additional_data or {}),
        }
        metadata = EventMetadata(
            user_id=user_id,
            organization_id=organization_id,
        )
        return cls(
            event_type=event_type.value,
            priority=priority.value,
            metadata=metadata,
            payload=payload,
        )


@dataclass
class RetentionEvent(BaseEvent):
    """Retention-related event."""
    category: str = EventCategory.RETENTION.value

    @classmethod
    def create(
        cls,
        event_type: RetentionEventType,
        document_id: str,
        policy_id: Optional[str] = None,
        policy_name: Optional[str] = None,
        user_id: Optional[str] = None,
        organization_id: Optional[str] = None,
        additional_data: Optional[Dict[str, Any]] = None,
        priority: EventPriority = EventPriority.NORMAL,
    ) -> 'RetentionEvent':
        """Create a retention event."""
        payload = {
            'document_id': document_id,
            'policy_id': policy_id,
            'policy_name': policy_name,
            **(additional_data or {}),
        }
        metadata = EventMetadata(
            user_id=user_id,
            organization_id=organization_id,
        )
        return cls(
            event_type=event_type.value,
            priority=priority.value,
            metadata=metadata,
            payload=payload,
        )


@dataclass
class ClassificationEvent(BaseEvent):
    """Classification-related event."""
    category: str = EventCategory.CLASSIFICATION.value

    @classmethod
    def create(
        cls,
        event_type: ClassificationEventType,
        document_id: str,
        model_id: Optional[str] = None,
        predicted_class: Optional[str] = None,
        confidence: Optional[float] = None,
        user_id: Optional[str] = None,
        organization_id: Optional[str] = None,
        additional_data: Optional[Dict[str, Any]] = None,
        priority: EventPriority = EventPriority.NORMAL,
    ) -> 'ClassificationEvent':
        """Create a classification event."""
        payload = {
            'document_id': document_id,
            'model_id': model_id,
            'predicted_class': predicted_class,
            'confidence': confidence,
            **(additional_data or {}),
        }
        metadata = EventMetadata(
            user_id=user_id,
            organization_id=organization_id,
        )
        return cls(
            event_type=event_type.value,
            priority=priority.value,
            metadata=metadata,
            payload=payload,
        )


@dataclass
class IntelligenceEvent(BaseEvent):
    """Intelligence/NLP-related event."""
    category: str = EventCategory.INTELLIGENCE.value

    @classmethod
    def create(
        cls,
        event_type: IntelligenceEventType,
        document_id: str,
        job_id: Optional[str] = None,
        results: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        organization_id: Optional[str] = None,
        priority: EventPriority = EventPriority.NORMAL,
    ) -> 'IntelligenceEvent':
        """Create an intelligence event."""
        payload = {
            'document_id': document_id,
            'job_id': job_id,
            'results': results or {},
        }
        metadata = EventMetadata(
            user_id=user_id,
            organization_id=organization_id,
        )
        return cls(
            event_type=event_type.value,
            priority=priority.value,
            metadata=metadata,
            payload=payload,
        )


@dataclass
class UserEvent(BaseEvent):
    """User-related event."""
    category: str = EventCategory.USER.value

    @classmethod
    def create(
        cls,
        event_type: UserEventType,
        target_user_id: str,
        actor_user_id: Optional[str] = None,
        organization_id: Optional[str] = None,
        additional_data: Optional[Dict[str, Any]] = None,
        priority: EventPriority = EventPriority.NORMAL,
    ) -> 'UserEvent':
        """Create a user event."""
        payload = {
            'target_user_id': target_user_id,
            **(additional_data or {}),
        }
        metadata = EventMetadata(
            user_id=actor_user_id,
            organization_id=organization_id,
        )
        return cls(
            event_type=event_type.value,
            priority=priority.value,
            metadata=metadata,
            payload=payload,
        )


@dataclass
class SystemEvent(BaseEvent):
    """System-level event."""
    category: str = EventCategory.SYSTEM.value

    @classmethod
    def create(
        cls,
        event_type: SystemEventType,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        priority: EventPriority = EventPriority.NORMAL,
    ) -> 'SystemEvent':
        """Create a system event."""
        payload = {
            'message': message,
            'details': details or {},
        }
        return cls(
            event_type=event_type.value,
            priority=priority.value,
            payload=payload,
        )


# =============================================================================
# Event Registry
# =============================================================================

EVENT_TYPE_MAP = {
    **{e.value: DocumentEvent for e in DocumentEventType},
    **{e.value: WorkflowEvent for e in WorkflowEventType},
    **{e.value: RetentionEvent for e in RetentionEventType},
    **{e.value: ClassificationEvent for e in ClassificationEventType},
    **{e.value: IntelligenceEvent for e in IntelligenceEventType},
    **{e.value: UserEvent for e in UserEventType},
    **{e.value: SystemEvent for e in SystemEventType},
}


def create_event_from_dict(data: Dict[str, Any]) -> BaseEvent:
    """Create the appropriate event type from a dictionary."""
    event_type = data.get('event_type')
    event_class = EVENT_TYPE_MAP.get(event_type, BaseEvent)
    return event_class.from_dict(data)
