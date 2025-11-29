"""
Workflow Notification Service

Handles all workflow-related notifications including:
- Task assignment notifications
- Reminder notifications
- Escalation notifications
- Workflow completion notifications
- SLA breach alerts

Supports multiple channels:
- In-app notifications
- Email notifications
"""

import logging
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from enum import Enum
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.utils import timezone
from django.contrib.auth import get_user_model

from apps.workflows.models import (
    WorkflowTask,
    WorkflowInstance,
    WorkflowAuditLog,
)

User = get_user_model()
logger = logging.getLogger(__name__)


# =============================================================================
# Enums and Data Classes
# =============================================================================

class NotificationType(str, Enum):
    """Types of workflow notifications."""
    TASK_ASSIGNED = 'task_assigned'
    TASK_REMINDER = 'task_reminder'
    TASK_OVERDUE = 'task_overdue'
    TASK_ESCALATED = 'task_escalated'
    TASK_COMPLETED = 'task_completed'
    TASK_DELEGATED = 'task_delegated'
    WORKFLOW_STARTED = 'workflow_started'
    WORKFLOW_APPROVED = 'workflow_approved'
    WORKFLOW_REJECTED = 'workflow_rejected'
    WORKFLOW_CANCELLED = 'workflow_cancelled'
    SLA_WARNING = 'sla_warning'
    SLA_BREACH = 'sla_breach'
    COMMENT_ADDED = 'comment_added'
    MENTION = 'mention'


@dataclass
class NotificationContext:
    """Context data for notification templates."""
    notification_type: NotificationType
    recipient: Any  # User
    task: Optional[WorkflowTask] = None
    workflow: Optional[WorkflowInstance] = None
    actor: Optional[Any] = None  # User who triggered the action
    message: str = ''
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


# =============================================================================
# Email Templates
# =============================================================================

EMAIL_TEMPLATES = {
    NotificationType.TASK_ASSIGNED: {
        'subject': 'New Task Assigned: {task_name}',
        'template': 'workflows/email/task_assigned.html',
    },
    NotificationType.TASK_REMINDER: {
        'subject': 'Reminder: Task "{task_name}" is pending',
        'template': 'workflows/email/task_reminder.html',
    },
    NotificationType.TASK_OVERDUE: {
        'subject': 'OVERDUE: Task "{task_name}" requires immediate action',
        'template': 'workflows/email/task_overdue.html',
    },
    NotificationType.TASK_ESCALATED: {
        'subject': 'Task Escalated: {task_name}',
        'template': 'workflows/email/task_escalated.html',
    },
    NotificationType.WORKFLOW_APPROVED: {
        'subject': 'Workflow Approved: {workflow_name}',
        'template': 'workflows/email/workflow_approved.html',
    },
    NotificationType.WORKFLOW_REJECTED: {
        'subject': 'Workflow Rejected: {workflow_name}',
        'template': 'workflows/email/workflow_rejected.html',
    },
    NotificationType.SLA_WARNING: {
        'subject': 'SLA Warning: Task "{task_name}" approaching deadline',
        'template': 'workflows/email/sla_warning.html',
    },
    NotificationType.SLA_BREACH: {
        'subject': 'SLA BREACH: Task "{task_name}" has exceeded deadline',
        'template': 'workflows/email/sla_breach.html',
    },
}


# =============================================================================
# In-App Notification Model
# =============================================================================

def create_in_app_notification(
    recipient,
    notification_type: NotificationType,
    title: str,
    message: str,
    workflow: Optional[WorkflowInstance] = None,
    task: Optional[WorkflowTask] = None,
    metadata: Optional[Dict] = None
) -> None:
    """
    Create an in-app notification for a user.

    This integrates with whatever notification system is in place.
    For now, we'll log and store in audit trail.
    """
    try:
        # Log the notification
        logger.info(
            f"In-app notification: {notification_type.value} for user {recipient.id} - {title}"
        )

        # Store in workflow audit log if workflow exists
        if workflow:
            WorkflowAuditLog.objects.create(
                workflow=workflow,
                task=task,
                action=f'notification_{notification_type.value}',
                actor=None,
                details=f"Notification sent to {recipient.get_full_name()}: {title}",
                metadata={
                    'notification_type': notification_type.value,
                    'recipient_id': recipient.id,
                    'title': title,
                    'message': message,
                    **(metadata or {})
                }
            )

    except Exception as e:
        logger.error(f"Failed to create in-app notification: {e}")


# =============================================================================
# Email Service
# =============================================================================

class EmailNotificationService:
    """
    Service for sending email notifications.
    """

    @staticmethod
    def send_notification(context: NotificationContext) -> bool:
        """
        Send an email notification based on context.

        Returns True if email was sent successfully.
        """
        if not context.recipient or not context.recipient.email:
            logger.warning("Cannot send email: recipient has no email address")
            return False

        template_config = EMAIL_TEMPLATES.get(context.notification_type)
        if not template_config:
            logger.warning(f"No email template for notification type: {context.notification_type}")
            return False

        try:
            # Build template context
            email_context = EmailNotificationService._build_email_context(context)

            # Format subject
            subject = template_config['subject'].format(**email_context)

            # Try to render HTML template, fall back to plain text
            try:
                html_content = render_to_string(template_config['template'], email_context)
                text_content = strip_tags(html_content)
            except Exception:
                # Template doesn't exist, use plain text
                html_content = None
                text_content = EmailNotificationService._build_plain_text(context, email_context)

            # Send email
            if html_content:
                email = EmailMultiAlternatives(
                    subject=subject,
                    body=text_content,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[context.recipient.email]
                )
                email.attach_alternative(html_content, "text/html")
                email.send()
            else:
                send_mail(
                    subject=subject,
                    message=text_content,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[context.recipient.email],
                    fail_silently=False
                )

            logger.info(
                f"Email sent: {context.notification_type.value} to {context.recipient.email}"
            )
            return True

        except Exception as e:
            logger.error(f"Failed to send email notification: {e}")
            return False

    @staticmethod
    def _build_email_context(context: NotificationContext) -> Dict[str, Any]:
        """Build context dictionary for email templates."""
        email_context = {
            'recipient_name': context.recipient.get_full_name() or context.recipient.username,
            'recipient_email': context.recipient.email,
            'notification_type': context.notification_type.value,
            'message': context.message,
            'app_url': getattr(settings, 'FRONTEND_URL', 'http://localhost:3000'),
            'current_year': timezone.now().year,
        }

        if context.task:
            email_context.update({
                'task_id': str(context.task.id),
                'task_name': context.task.step_name,
                'task_status': context.task.status,
                'task_due_date': context.task.due_date,
                'task_url': f"{email_context['app_url']}/workflows?task={context.task.id}",
            })

        if context.workflow:
            email_context.update({
                'workflow_id': str(context.workflow.id),
                'workflow_name': context.workflow.template_name,
                'workflow_status': context.workflow.status,
                'document_title': context.workflow.document.title if context.workflow.document else 'Unknown',
                'workflow_url': f"{email_context['app_url']}/workflows?workflow={context.workflow.id}",
            })

        if context.actor:
            email_context.update({
                'actor_name': context.actor.get_full_name() or context.actor.username,
            })

        email_context.update(context.metadata or {})

        return email_context

    @staticmethod
    def _build_plain_text(context: NotificationContext, email_context: Dict) -> str:
        """Build plain text email content when template is not available."""
        lines = [
            f"Hello {email_context['recipient_name']},",
            "",
        ]

        if context.notification_type == NotificationType.TASK_ASSIGNED:
            lines.extend([
                f"A new task has been assigned to you:",
                f"",
                f"Task: {email_context.get('task_name', 'N/A')}",
                f"Workflow: {email_context.get('workflow_name', 'N/A')}",
                f"Document: {email_context.get('document_title', 'N/A')}",
                f"Due Date: {email_context.get('task_due_date', 'Not set')}",
            ])
        elif context.notification_type == NotificationType.TASK_REMINDER:
            lines.extend([
                f"This is a reminder that you have a pending task:",
                f"",
                f"Task: {email_context.get('task_name', 'N/A')}",
                f"Due Date: {email_context.get('task_due_date', 'Not set')}",
            ])
        elif context.notification_type == NotificationType.TASK_OVERDUE:
            lines.extend([
                f"URGENT: The following task is now OVERDUE:",
                f"",
                f"Task: {email_context.get('task_name', 'N/A')}",
                f"Due Date: {email_context.get('task_due_date', 'Not set')}",
                f"",
                f"Please take immediate action.",
            ])
        elif context.notification_type == NotificationType.WORKFLOW_APPROVED:
            lines.extend([
                f"Good news! A workflow you initiated has been approved:",
                f"",
                f"Workflow: {email_context.get('workflow_name', 'N/A')}",
                f"Document: {email_context.get('document_title', 'N/A')}",
            ])
        elif context.notification_type == NotificationType.WORKFLOW_REJECTED:
            lines.extend([
                f"A workflow you initiated has been rejected:",
                f"",
                f"Workflow: {email_context.get('workflow_name', 'N/A')}",
                f"Document: {email_context.get('document_title', 'N/A')}",
            ])
        else:
            lines.append(context.message or "You have a new notification.")

        lines.extend([
            "",
            f"View in app: {email_context.get('workflow_url', email_context['app_url'])}",
            "",
            "Best regards,",
            "The DFC Team",
        ])

        return "\n".join(lines)


# =============================================================================
# Workflow Notification Service
# =============================================================================

class WorkflowNotificationService:
    """
    Main service for sending workflow notifications.

    Coordinates between in-app and email notifications based on
    user preferences and notification type.
    """

    @staticmethod
    def notify_task_assigned(task: WorkflowTask) -> None:
        """Notify user when a task is assigned to them."""
        context = NotificationContext(
            notification_type=NotificationType.TASK_ASSIGNED,
            recipient=task.assigned_to,
            task=task,
            workflow=task.workflow,
            actor=task.workflow.initiated_by,
            message=f"New task '{task.step_name}' assigned to you"
        )

        # Create in-app notification
        create_in_app_notification(
            recipient=task.assigned_to,
            notification_type=NotificationType.TASK_ASSIGNED,
            title=f"New Task: {task.step_name}",
            message=f"You have been assigned a new task for document '{task.workflow.document.title}'",
            workflow=task.workflow,
            task=task
        )

        # Send email
        EmailNotificationService.send_notification(context)

    @staticmethod
    def notify_task_reminder(task: WorkflowTask, hours_remaining: int) -> None:
        """Send reminder notification for pending task."""
        context = NotificationContext(
            notification_type=NotificationType.TASK_REMINDER,
            recipient=task.assigned_to,
            task=task,
            workflow=task.workflow,
            message=f"Task '{task.step_name}' is due in {hours_remaining} hours",
            metadata={'hours_remaining': hours_remaining}
        )

        create_in_app_notification(
            recipient=task.assigned_to,
            notification_type=NotificationType.TASK_REMINDER,
            title=f"Reminder: {task.step_name}",
            message=f"Your task is due in {hours_remaining} hours",
            workflow=task.workflow,
            task=task,
            metadata={'hours_remaining': hours_remaining}
        )

        EmailNotificationService.send_notification(context)

    @staticmethod
    def notify_task_overdue(task: WorkflowTask) -> None:
        """Notify user when their task becomes overdue."""
        context = NotificationContext(
            notification_type=NotificationType.TASK_OVERDUE,
            recipient=task.assigned_to,
            task=task,
            workflow=task.workflow,
            message=f"Task '{task.step_name}' is OVERDUE"
        )

        create_in_app_notification(
            recipient=task.assigned_to,
            notification_type=NotificationType.TASK_OVERDUE,
            title=f"OVERDUE: {task.step_name}",
            message=f"Your task is overdue. Please take immediate action.",
            workflow=task.workflow,
            task=task
        )

        EmailNotificationService.send_notification(context)

    @staticmethod
    def notify_task_escalated(
        task: WorkflowTask,
        escalated_to: Any,
        original_assignee: Any
    ) -> None:
        """Notify when a task is escalated."""
        # Notify the person task is escalated to
        context = NotificationContext(
            notification_type=NotificationType.TASK_ESCALATED,
            recipient=escalated_to,
            task=task,
            workflow=task.workflow,
            message=f"Task '{task.step_name}' has been escalated to you",
            metadata={
                'original_assignee': original_assignee.get_full_name(),
                'escalation_reason': 'SLA breach'
            }
        )

        create_in_app_notification(
            recipient=escalated_to,
            notification_type=NotificationType.TASK_ESCALATED,
            title=f"Escalated Task: {task.step_name}",
            message=f"Task escalated from {original_assignee.get_full_name()}",
            workflow=task.workflow,
            task=task
        )

        EmailNotificationService.send_notification(context)

        # Also notify original assignee that their task was escalated
        original_context = NotificationContext(
            notification_type=NotificationType.TASK_ESCALATED,
            recipient=original_assignee,
            task=task,
            workflow=task.workflow,
            message=f"Your task '{task.step_name}' has been escalated to {escalated_to.get_full_name()}"
        )

        create_in_app_notification(
            recipient=original_assignee,
            notification_type=NotificationType.TASK_ESCALATED,
            title=f"Task Escalated: {task.step_name}",
            message=f"Your overdue task has been escalated to {escalated_to.get_full_name()}",
            workflow=task.workflow,
            task=task
        )

        EmailNotificationService.send_notification(original_context)

    @staticmethod
    def notify_task_delegated(
        task: WorkflowTask,
        delegated_to: Any,
        delegated_from: Any
    ) -> None:
        """Notify when a task is delegated."""
        context = NotificationContext(
            notification_type=NotificationType.TASK_DELEGATED,
            recipient=delegated_to,
            task=task,
            workflow=task.workflow,
            actor=delegated_from,
            message=f"Task '{task.step_name}' has been delegated to you by {delegated_from.get_full_name()}"
        )

        create_in_app_notification(
            recipient=delegated_to,
            notification_type=NotificationType.TASK_DELEGATED,
            title=f"Task Delegated: {task.step_name}",
            message=f"Delegated from {delegated_from.get_full_name()}",
            workflow=task.workflow,
            task=task
        )

        EmailNotificationService.send_notification(context)

    @staticmethod
    def notify_workflow_completed(
        workflow: WorkflowInstance,
        approved: bool
    ) -> None:
        """Notify initiator when workflow is completed."""
        notification_type = (
            NotificationType.WORKFLOW_APPROVED if approved
            else NotificationType.WORKFLOW_REJECTED
        )

        status_text = "approved" if approved else "rejected"

        context = NotificationContext(
            notification_type=notification_type,
            recipient=workflow.initiated_by,
            workflow=workflow,
            message=f"Workflow '{workflow.template_name}' has been {status_text}"
        )

        create_in_app_notification(
            recipient=workflow.initiated_by,
            notification_type=notification_type,
            title=f"Workflow {status_text.capitalize()}: {workflow.template_name}",
            message=f"Your workflow for '{workflow.document.title}' has been {status_text}",
            workflow=workflow
        )

        EmailNotificationService.send_notification(context)

    @staticmethod
    def notify_sla_warning(task: WorkflowTask, hours_remaining: int) -> None:
        """Notify user about approaching SLA deadline."""
        context = NotificationContext(
            notification_type=NotificationType.SLA_WARNING,
            recipient=task.assigned_to,
            task=task,
            workflow=task.workflow,
            message=f"SLA warning: Task '{task.step_name}' deadline in {hours_remaining} hours",
            metadata={'hours_remaining': hours_remaining}
        )

        create_in_app_notification(
            recipient=task.assigned_to,
            notification_type=NotificationType.SLA_WARNING,
            title=f"SLA Warning: {task.step_name}",
            message=f"Deadline approaching - {hours_remaining} hours remaining",
            workflow=task.workflow,
            task=task
        )

        EmailNotificationService.send_notification(context)

    @staticmethod
    def notify_sla_breach(task: WorkflowTask) -> None:
        """Notify about SLA breach."""
        # Notify task assignee
        context = NotificationContext(
            notification_type=NotificationType.SLA_BREACH,
            recipient=task.assigned_to,
            task=task,
            workflow=task.workflow,
            message=f"SLA BREACH: Task '{task.step_name}' has exceeded its deadline"
        )

        create_in_app_notification(
            recipient=task.assigned_to,
            notification_type=NotificationType.SLA_BREACH,
            title=f"SLA BREACH: {task.step_name}",
            message="Task has exceeded its deadline. Please take immediate action.",
            workflow=task.workflow,
            task=task
        )

        EmailNotificationService.send_notification(context)

    @staticmethod
    def notify_comment_mention(
        workflow: WorkflowInstance,
        mentioned_user: Any,
        commenter: Any,
        comment_text: str
    ) -> None:
        """Notify user when they are mentioned in a comment."""
        context = NotificationContext(
            notification_type=NotificationType.MENTION,
            recipient=mentioned_user,
            workflow=workflow,
            actor=commenter,
            message=f"{commenter.get_full_name()} mentioned you in a comment",
            metadata={'comment_preview': comment_text[:200]}
        )

        create_in_app_notification(
            recipient=mentioned_user,
            notification_type=NotificationType.MENTION,
            title=f"Mentioned by {commenter.get_full_name()}",
            message=comment_text[:200],
            workflow=workflow
        )

        EmailNotificationService.send_notification(context)


# =============================================================================
# Batch Notification Helper
# =============================================================================

def send_bulk_notifications(
    recipients: List,
    notification_type: NotificationType,
    title: str,
    message: str,
    workflow: Optional[WorkflowInstance] = None,
    task: Optional[WorkflowTask] = None
) -> Dict[str, int]:
    """
    Send notifications to multiple recipients.

    Returns dict with success/failure counts.
    """
    results = {'sent': 0, 'failed': 0}

    for recipient in recipients:
        try:
            create_in_app_notification(
                recipient=recipient,
                notification_type=notification_type,
                title=title,
                message=message,
                workflow=workflow,
                task=task
            )

            context = NotificationContext(
                notification_type=notification_type,
                recipient=recipient,
                task=task,
                workflow=workflow,
                message=message
            )

            if EmailNotificationService.send_notification(context):
                results['sent'] += 1
            else:
                results['failed'] += 1

        except Exception as e:
            logger.error(f"Failed to send notification to {recipient.id}: {e}")
            results['failed'] += 1

    return results
