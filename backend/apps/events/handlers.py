"""
Django signal handlers for the event-driven architecture.

This module connects Django signals to the event publishing system,
automatically emitting events when model changes occur.
"""

import logging
from typing import Any, Optional

from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

from .types import (
    DocumentEventType,
    WorkflowEventType,
    RetentionEventType,
    UserEventType,
    EventPriority,
)
from .publisher import (
    publish_document_event,
    publish_workflow_event,
    publish_retention_event,
    publish_user_event,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Thread-local storage for request context
# =============================================================================

import threading

_context = threading.local()


def set_event_context(
    user_id: Optional[str] = None,
    organization_id: Optional[str] = None,
    correlation_id: Optional[str] = None,
    ip_address: Optional[str] = None,
):
    """Set context for event publishing (called from middleware)."""
    _context.user_id = user_id
    _context.organization_id = organization_id
    _context.correlation_id = correlation_id
    _context.ip_address = ip_address


def get_event_context():
    """Get current event context."""
    return {
        'user_id': getattr(_context, 'user_id', None),
        'organization_id': getattr(_context, 'organization_id', None),
        'correlation_id': getattr(_context, 'correlation_id', None),
        'ip_address': getattr(_context, 'ip_address', None),
    }


def clear_event_context():
    """Clear event context (called from middleware)."""
    _context.user_id = None
    _context.organization_id = None
    _context.correlation_id = None
    _context.ip_address = None


# =============================================================================
# Document Signal Handlers
# =============================================================================

def connect_document_signals():
    """Connect document model signals."""
    try:
        from apps.documents.models import Document, DocumentVersion

        @receiver(post_save, sender=Document)
        def document_saved_handler(sender, instance, created, **kwargs):
            """Handle document save events."""
            context = get_event_context()

            try:
                if created:
                    publish_document_event(
                        event_type=DocumentEventType.CREATED,
                        document_id=str(instance.id),
                        document_title=instance.title,
                        folder_id=str(instance.folder_id) if instance.folder_id else None,
                        user_id=context.get('user_id'),
                        organization_id=context.get('organization_id'),
                        additional_data={
                            'file_type': instance.file_type,
                            'file_size': instance.file_size,
                            'confidentiality': instance.confidentiality,
                        },
                        correlation_id=context.get('correlation_id'),
                    )
                    logger.debug(f"Published document.created event for {instance.id}")
                else:
                    publish_document_event(
                        event_type=DocumentEventType.UPDATED,
                        document_id=str(instance.id),
                        document_title=instance.title,
                        folder_id=str(instance.folder_id) if instance.folder_id else None,
                        user_id=context.get('user_id'),
                        organization_id=context.get('organization_id'),
                        correlation_id=context.get('correlation_id'),
                    )
                    logger.debug(f"Published document.updated event for {instance.id}")
            except Exception as e:
                logger.error(f"Error publishing document event: {e}")

        @receiver(post_delete, sender=Document)
        def document_deleted_handler(sender, instance, **kwargs):
            """Handle document delete events."""
            context = get_event_context()

            try:
                publish_document_event(
                    event_type=DocumentEventType.DELETED,
                    document_id=str(instance.id),
                    document_title=instance.title,
                    folder_id=str(instance.folder_id) if instance.folder_id else None,
                    user_id=context.get('user_id'),
                    organization_id=context.get('organization_id'),
                    priority=EventPriority.HIGH,
                    correlation_id=context.get('correlation_id'),
                )
                logger.debug(f"Published document.deleted event for {instance.id}")
            except Exception as e:
                logger.error(f"Error publishing document delete event: {e}")

        @receiver(post_save, sender=DocumentVersion)
        def document_version_created_handler(sender, instance, created, **kwargs):
            """Handle document version creation events."""
            if not created:
                return

            context = get_event_context()

            try:
                publish_document_event(
                    event_type=DocumentEventType.VERSION_CREATED,
                    document_id=str(instance.document_id),
                    document_title=instance.document.title if instance.document else '',
                    user_id=context.get('user_id'),
                    organization_id=context.get('organization_id'),
                    additional_data={
                        'version_number': instance.version_number,
                        'version_id': str(instance.id),
                    },
                    correlation_id=context.get('correlation_id'),
                )
                logger.debug(
                    f"Published document.version_created event for "
                    f"{instance.document_id} v{instance.version_number}"
                )
            except Exception as e:
                logger.error(f"Error publishing version created event: {e}")

        logger.info("Document signal handlers connected")

    except ImportError as e:
        logger.warning(f"Could not connect document signals: {e}")


# =============================================================================
# Workflow Signal Handlers
# =============================================================================

def connect_workflow_signals():
    """Connect workflow model signals."""
    try:
        from apps.workflows.models import WorkflowInstance, WorkflowTask

        @receiver(post_save, sender=WorkflowInstance)
        def workflow_instance_saved_handler(sender, instance, created, **kwargs):
            """Handle workflow instance save events."""
            context = get_event_context()

            try:
                if created:
                    publish_workflow_event(
                        event_type=WorkflowEventType.STARTED,
                        workflow_id=str(instance.workflow_id),
                        workflow_name=instance.workflow.name if instance.workflow else '',
                        instance_id=str(instance.id),
                        user_id=context.get('user_id'),
                        organization_id=context.get('organization_id'),
                    )
                    logger.debug(f"Published workflow.started event for {instance.id}")
                elif instance.status == 'completed':
                    publish_workflow_event(
                        event_type=WorkflowEventType.COMPLETED,
                        workflow_id=str(instance.workflow_id),
                        workflow_name=instance.workflow.name if instance.workflow else '',
                        instance_id=str(instance.id),
                        user_id=context.get('user_id'),
                        organization_id=context.get('organization_id'),
                    )
                    logger.debug(f"Published workflow.completed event for {instance.id}")
                elif instance.status == 'cancelled':
                    publish_workflow_event(
                        event_type=WorkflowEventType.CANCELLED,
                        workflow_id=str(instance.workflow_id),
                        workflow_name=instance.workflow.name if instance.workflow else '',
                        instance_id=str(instance.id),
                        user_id=context.get('user_id'),
                        organization_id=context.get('organization_id'),
                    )
                    logger.debug(f"Published workflow.cancelled event for {instance.id}")
            except Exception as e:
                logger.error(f"Error publishing workflow event: {e}")

        @receiver(post_save, sender=WorkflowTask)
        def workflow_task_saved_handler(sender, instance, created, **kwargs):
            """Handle workflow task save events."""
            context = get_event_context()

            try:
                if created and instance.assignee_id:
                    publish_workflow_event(
                        event_type=WorkflowEventType.TASK_ASSIGNED,
                        workflow_id=str(instance.workflow_instance.workflow_id),
                        workflow_name=instance.workflow_instance.workflow.name,
                        instance_id=str(instance.workflow_instance_id),
                        task_id=str(instance.id),
                        user_id=context.get('user_id'),
                        organization_id=context.get('organization_id'),
                        additional_data={
                            'assignee_id': str(instance.assignee_id),
                            'task_name': instance.name,
                            'due_date': instance.due_date.isoformat() if instance.due_date else None,
                        },
                    )
                    logger.debug(f"Published workflow.task_assigned event for {instance.id}")
                elif instance.status == 'completed':
                    publish_workflow_event(
                        event_type=WorkflowEventType.TASK_COMPLETED,
                        workflow_id=str(instance.workflow_instance.workflow_id),
                        workflow_name=instance.workflow_instance.workflow.name,
                        instance_id=str(instance.workflow_instance_id),
                        task_id=str(instance.id),
                        user_id=context.get('user_id'),
                        organization_id=context.get('organization_id'),
                    )
                    logger.debug(f"Published workflow.task_completed event for {instance.id}")
                elif instance.status == 'rejected':
                    publish_workflow_event(
                        event_type=WorkflowEventType.TASK_REJECTED,
                        workflow_id=str(instance.workflow_instance.workflow_id),
                        workflow_name=instance.workflow_instance.workflow.name,
                        instance_id=str(instance.workflow_instance_id),
                        task_id=str(instance.id),
                        user_id=context.get('user_id'),
                        organization_id=context.get('organization_id'),
                    )
                    logger.debug(f"Published workflow.task_rejected event for {instance.id}")
            except Exception as e:
                logger.error(f"Error publishing workflow task event: {e}")

        logger.info("Workflow signal handlers connected")

    except ImportError as e:
        logger.warning(f"Could not connect workflow signals: {e}")


# =============================================================================
# Retention Signal Handlers
# =============================================================================

def connect_retention_signals():
    """Connect retention model signals."""
    try:
        from apps.retention.models import RetentionSchedule, LegalHold, LegalHoldDocument

        @receiver(post_save, sender=RetentionSchedule)
        def retention_schedule_saved_handler(sender, instance, created, **kwargs):
            """Handle retention schedule events."""
            if not created:
                return

            context = get_event_context()

            try:
                publish_retention_event(
                    event_type=RetentionEventType.POLICY_APPLIED,
                    document_id=str(instance.document_id) if hasattr(instance, 'document_id') else '',
                    policy_id=str(instance.policy_id) if hasattr(instance, 'policy_id') else str(instance.id),
                    policy_name=instance.policy.name if hasattr(instance, 'policy') and instance.policy else '',
                    user_id=context.get('user_id'),
                    organization_id=context.get('organization_id'),
                )
                logger.debug(f"Published retention.policy_applied event")
            except Exception as e:
                logger.error(f"Error publishing retention schedule event: {e}")

        @receiver(post_save, sender=LegalHold)
        def legal_hold_saved_handler(sender, instance, created, **kwargs):
            """Handle legal hold events."""
            context = get_event_context()

            try:
                if created:
                    # Legal hold created - documents will be added via LegalHoldDocument
                    logger.debug(f"Legal hold created: {instance.id}")
            except Exception as e:
                logger.error(f"Error publishing legal hold event: {e}")

        @receiver(post_save, sender=LegalHoldDocument)
        def legal_hold_document_saved_handler(sender, instance, created, **kwargs):
            """Handle legal hold document association events."""
            if not created:
                return

            context = get_event_context()

            try:
                publish_retention_event(
                    event_type=RetentionEventType.LEGAL_HOLD_APPLIED,
                    document_id=str(instance.document_id),
                    user_id=context.get('user_id'),
                    organization_id=context.get('organization_id'),
                    additional_data={
                        'legal_hold_id': str(instance.legal_hold_id),
                        'case_number': instance.legal_hold.case_number if instance.legal_hold else None,
                    },
                    priority=EventPriority.HIGH,
                )
                logger.debug(
                    f"Published retention.legal_hold_applied event for "
                    f"document {instance.document_id}"
                )
            except Exception as e:
                logger.error(f"Error publishing legal hold document event: {e}")

        @receiver(post_delete, sender=LegalHoldDocument)
        def legal_hold_document_removed_handler(sender, instance, **kwargs):
            """Handle legal hold document removal events."""
            context = get_event_context()

            try:
                publish_retention_event(
                    event_type=RetentionEventType.LEGAL_HOLD_RELEASED,
                    document_id=str(instance.document_id),
                    user_id=context.get('user_id'),
                    organization_id=context.get('organization_id'),
                    additional_data={
                        'legal_hold_id': str(instance.legal_hold_id),
                    },
                )
                logger.debug(
                    f"Published retention.legal_hold_released event for "
                    f"document {instance.document_id}"
                )
            except Exception as e:
                logger.error(f"Error publishing legal hold released event: {e}")

        logger.info("Retention signal handlers connected")

    except ImportError as e:
        logger.warning(f"Could not connect retention signals: {e}")


# =============================================================================
# User Signal Handlers
# =============================================================================

def connect_user_signals():
    """Connect user model signals."""
    try:
        User = get_user_model()

        @receiver(post_save, sender=User)
        def user_saved_handler(sender, instance, created, **kwargs):
            """Handle user save events."""
            context = get_event_context()

            # Skip if this is just a login timestamp update
            if not created and hasattr(instance, '_skip_event'):
                return

            try:
                if instance.is_active is False:
                    # User was deactivated
                    publish_user_event(
                        event_type=UserEventType.DEACTIVATED,
                        target_user_id=str(instance.id),
                        actor_user_id=context.get('user_id'),
                        organization_id=context.get('organization_id'),
                        priority=EventPriority.HIGH,
                    )
                    logger.debug(f"Published user.deactivated event for {instance.id}")
            except Exception as e:
                logger.error(f"Error publishing user event: {e}")

        logger.info("User signal handlers connected")

    except Exception as e:
        logger.warning(f"Could not connect user signals: {e}")


# =============================================================================
# Signal Connection Entry Point
# =============================================================================

def connect_all_signals():
    """Connect all signal handlers."""
    connect_document_signals()
    connect_workflow_signals()
    connect_retention_signals()
    connect_user_signals()
    logger.info("All event signal handlers connected")


# Auto-connect signals when module is imported
# This is called from apps.py ready() method
