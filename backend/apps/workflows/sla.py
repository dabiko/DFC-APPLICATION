"""
SLA (Service Level Agreement) Management Service

Handles SLA configuration, monitoring, and escalation for workflow tasks.

Features:
- SLA configuration at template and step level
- SLA monitoring with warning and breach detection
- Automatic escalation when SLA is breached
- Reminder scheduling
"""

import logging
from typing import List, Optional, Dict, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum

from django.db import transaction
from django.db.models import Q, F
from django.utils import timezone
from django.contrib.auth import get_user_model

from apps.workflows.models import (
    WorkflowTemplate,
    WorkflowStep,
    WorkflowTask,
    WorkflowInstance,
    WorkflowAuditLog,
    WorkflowTaskStatus,
    WorkflowInstanceStatus,
)
from apps.workflows.notifications import WorkflowNotificationService

User = get_user_model()
logger = logging.getLogger(__name__)


# =============================================================================
# Configuration
# =============================================================================

class SLAConfig:
    """SLA configuration constants."""

    # Default SLA hours if not specified
    DEFAULT_SLA_HOURS = 24

    # Warning threshold (percentage of SLA time remaining)
    WARNING_THRESHOLD_PERCENT = 25  # Warn when 25% time remaining

    # Reminder intervals (hours before due)
    REMINDER_INTERVALS = [24, 8, 2]  # 24 hours, 8 hours, 2 hours before

    # Escalation delay after SLA breach (hours)
    ESCALATION_DELAY_HOURS = 2

    # Maximum escalation levels
    MAX_ESCALATION_LEVELS = 3


class SLAStatus(str, Enum):
    """SLA status for a task."""
    ON_TRACK = 'on_track'
    WARNING = 'warning'
    BREACHED = 'breached'
    NOT_APPLICABLE = 'not_applicable'


@dataclass
class SLAResult:
    """Result of SLA check."""
    status: SLAStatus
    task_id: str
    due_date: Optional[datetime]
    hours_remaining: Optional[float]
    hours_overdue: Optional[float] = None
    warning_threshold: float = SLAConfig.WARNING_THRESHOLD_PERCENT


# =============================================================================
# SLA Service
# =============================================================================

class SLAService:
    """
    Service for managing SLA on workflow tasks.
    """

    @staticmethod
    def check_task_sla(task: WorkflowTask) -> SLAResult:
        """
        Check SLA status for a single task.

        Returns SLAResult with current status.
        """
        if not task.due_date:
            return SLAResult(
                status=SLAStatus.NOT_APPLICABLE,
                task_id=str(task.id),
                due_date=None,
                hours_remaining=None
            )

        now = timezone.now()
        due_date = task.due_date

        if now > due_date:
            # SLA breached
            hours_overdue = (now - due_date).total_seconds() / 3600
            return SLAResult(
                status=SLAStatus.BREACHED,
                task_id=str(task.id),
                due_date=due_date,
                hours_remaining=0,
                hours_overdue=hours_overdue
            )

        # Calculate time remaining
        time_remaining = due_date - now
        hours_remaining = time_remaining.total_seconds() / 3600

        # Calculate total SLA time (from assignment to due)
        if task.assigned_at:
            total_sla_time = (due_date - task.assigned_at).total_seconds() / 3600
        else:
            total_sla_time = SLAConfig.DEFAULT_SLA_HOURS

        # Calculate percentage remaining
        if total_sla_time > 0:
            percent_remaining = (hours_remaining / total_sla_time) * 100
        else:
            percent_remaining = 100

        # Determine status
        if percent_remaining <= SLAConfig.WARNING_THRESHOLD_PERCENT:
            status = SLAStatus.WARNING
        else:
            status = SLAStatus.ON_TRACK

        return SLAResult(
            status=status,
            task_id=str(task.id),
            due_date=due_date,
            hours_remaining=hours_remaining,
            warning_threshold=SLAConfig.WARNING_THRESHOLD_PERCENT
        )

    @staticmethod
    def get_tasks_approaching_deadline(hours_threshold: int = 24) -> List[WorkflowTask]:
        """
        Get tasks that are approaching their SLA deadline.

        Args:
            hours_threshold: Hours before due date to consider

        Returns:
            List of tasks approaching deadline
        """
        now = timezone.now()
        threshold_time = now + timedelta(hours=hours_threshold)

        return list(WorkflowTask.objects.filter(
            status__in=[WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS],
            due_date__isnull=False,
            due_date__lte=threshold_time,
            due_date__gt=now
        ).select_related('workflow', 'workflow__document', 'assigned_to'))

    @staticmethod
    def get_overdue_tasks() -> List[WorkflowTask]:
        """
        Get all tasks that have exceeded their SLA.

        Returns:
            List of overdue tasks
        """
        now = timezone.now()

        return list(WorkflowTask.objects.filter(
            status__in=[WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS],
            due_date__isnull=False,
            due_date__lt=now
        ).select_related('workflow', 'workflow__document', 'assigned_to'))

    @staticmethod
    def get_tasks_needing_reminder(reminder_hours: List[int] = None) -> List[Tuple[WorkflowTask, int]]:
        """
        Get tasks that need reminder notifications.

        Args:
            reminder_hours: List of hours before due to send reminders

        Returns:
            List of (task, hours_remaining) tuples
        """
        if reminder_hours is None:
            reminder_hours = SLAConfig.REMINDER_INTERVALS

        now = timezone.now()
        tasks_needing_reminder = []

        for hours in reminder_hours:
            # Window: tasks due in `hours` hours (within 30 min window)
            window_start = now + timedelta(hours=hours - 0.5)
            window_end = now + timedelta(hours=hours + 0.5)

            tasks = WorkflowTask.objects.filter(
                status__in=[WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS],
                due_date__isnull=False,
                due_date__gte=window_start,
                due_date__lte=window_end
            ).select_related('workflow', 'workflow__document', 'assigned_to')

            for task in tasks:
                tasks_needing_reminder.append((task, hours))

        return tasks_needing_reminder


# =============================================================================
# Escalation Service
# =============================================================================

class EscalationService:
    """
    Service for handling task escalation.
    """

    @staticmethod
    def get_escalation_target(task: WorkflowTask, level: int = 1) -> Optional[User]:
        """
        Determine who to escalate the task to.

        Escalation hierarchy:
        1. Step's designated escalation user
        2. Workflow initiator (if not same as assignee)
        3. Department manager
        4. Organization admin

        Args:
            task: The task to escalate
            level: Escalation level (1, 2, 3, etc.)

        Returns:
            User to escalate to, or None if no target found
        """
        # Get step configuration if available
        step = None
        if task.workflow.template:
            step = task.workflow.template.steps.filter(order=task.step_order).first()

        # Level 1: Check step's designated escalation user
        if level == 1 and step and step.escalate_to:
            return step.escalate_to

        # Level 2: Escalate to workflow initiator (if not same as current assignee)
        if level <= 2:
            initiator = task.workflow.initiated_by
            if initiator and initiator.id != task.assigned_to_id:
                return initiator

        # Level 3: Escalate to department manager or admin
        if level <= 3:
            # Try to get department head
            if hasattr(task.assigned_to, 'department') and task.assigned_to.department:
                dept = task.assigned_to.department
                # Look for department head or manager
                manager = User.objects.filter(
                    department=dept,
                    is_active=True
                ).filter(
                    Q(role__iexact='manager') | Q(role__iexact='head')
                ).first()

                if manager and manager.id != task.assigned_to_id:
                    return manager

        # Fallback: Get organization admin
        org = task.workflow.organization
        if org:
            admin = User.objects.filter(
                organization=org,
                is_active=True,
                is_staff=True
            ).exclude(id=task.assigned_to_id).first()

            if admin:
                return admin

        return None

    @staticmethod
    @transaction.atomic
    def escalate_task(
        task: WorkflowTask,
        reason: str = 'SLA breach',
        escalate_to: Optional[User] = None
    ) -> Optional[WorkflowTask]:
        """
        Escalate a task to another user.

        Args:
            task: Task to escalate
            reason: Reason for escalation
            escalate_to: User to escalate to (auto-determined if not provided)

        Returns:
            New escalated task, or None if escalation failed
        """
        if not escalate_to:
            # Get current escalation level
            current_level = 1
            if task.is_escalated:
                # Count how many times this task has been escalated
                escalation_count = WorkflowAuditLog.objects.filter(
                    workflow=task.workflow,
                    task=task,
                    action='task_escalated'
                ).count()
                current_level = min(escalation_count + 1, SLAConfig.MAX_ESCALATION_LEVELS)

            escalate_to = EscalationService.get_escalation_target(task, current_level)

        if not escalate_to:
            logger.warning(
                f"No escalation target found for task {task.id} at level {current_level}"
            )
            return None

        original_assignee = task.assigned_to

        # Create new task for escalation target
        new_task = WorkflowTask.objects.create(
            workflow=task.workflow,
            step_order=task.step_order,
            step_name=task.step_name,
            step_type=task.step_type,
            assigned_to=escalate_to,
            delegated_from=original_assignee,
            status=WorkflowTaskStatus.PENDING,
            due_date=task.due_date,  # Keep original due date
            assigned_at=timezone.now(),
            is_escalated=True,
            escalated_at=timezone.now()
        )

        # Mark original task as escalated (skipped)
        task.status = WorkflowTaskStatus.SKIPPED
        task.is_escalated = True
        task.escalated_at = timezone.now()
        task.action_taken = 'ESCALATED'
        task.comment = f"Escalated to {escalate_to.get_full_name()}: {reason}"
        task.completed_at = timezone.now()
        task.save()

        # Log escalation
        WorkflowAuditLog.objects.create(
            workflow=task.workflow,
            task=task,
            action='task_escalated',
            actor=None,  # System action
            details=f"Task escalated from {original_assignee.get_full_name()} "
                    f"to {escalate_to.get_full_name()}. Reason: {reason}",
            metadata={
                'original_assignee': original_assignee.id,
                'escalated_to': escalate_to.id,
                'reason': reason,
                'new_task_id': str(new_task.id)
            }
        )

        # Send notifications
        WorkflowNotificationService.notify_task_escalated(
            task=new_task,
            escalated_to=escalate_to,
            original_assignee=original_assignee
        )

        logger.info(
            f"Task {task.id} escalated from {original_assignee.id} "
            f"to {escalate_to.id}. New task: {new_task.id}"
        )

        return new_task

    @staticmethod
    def should_escalate(task: WorkflowTask) -> bool:
        """
        Determine if a task should be escalated.

        Criteria:
        - Task is overdue
        - Task has not already been escalated to max level
        - Escalation delay has passed since due date

        Returns:
            True if task should be escalated
        """
        if task.status not in [WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS]:
            return False

        if not task.due_date:
            return False

        now = timezone.now()

        # Check if overdue
        if task.due_date >= now:
            return False

        # Check escalation delay
        escalation_threshold = task.due_date + timedelta(hours=SLAConfig.ESCALATION_DELAY_HOURS)
        if now < escalation_threshold:
            return False

        # Check max escalation level not reached
        if task.is_escalated:
            escalation_count = WorkflowAuditLog.objects.filter(
                workflow=task.workflow,
                task=task,
                action='task_escalated'
            ).count()

            if escalation_count >= SLAConfig.MAX_ESCALATION_LEVELS:
                return False

        return True


# =============================================================================
# SLA Monitoring Service
# =============================================================================

class SLAMonitoringService:
    """
    Main service for monitoring SLA across all workflows.

    Called periodically by Celery beat to:
    - Check for approaching deadlines
    - Send reminders
    - Handle SLA breaches
    - Trigger escalations
    """

    @staticmethod
    def run_monitoring_cycle() -> Dict:
        """
        Run a complete SLA monitoring cycle.

        Returns summary of actions taken.
        """
        results = {
            'reminders_sent': 0,
            'warnings_sent': 0,
            'overdue_notifications': 0,
            'escalations': 0,
            'errors': []
        }

        try:
            # 1. Send reminders for approaching deadlines
            reminder_results = SLAMonitoringService._process_reminders()
            results['reminders_sent'] = reminder_results['sent']

            # 2. Send SLA warnings
            warning_results = SLAMonitoringService._process_warnings()
            results['warnings_sent'] = warning_results['sent']

            # 3. Process overdue tasks
            overdue_results = SLAMonitoringService._process_overdue_tasks()
            results['overdue_notifications'] = overdue_results['notifications']
            results['escalations'] = overdue_results['escalations']

            logger.info(f"SLA monitoring cycle completed: {results}")

        except Exception as e:
            logger.error(f"Error in SLA monitoring cycle: {e}")
            results['errors'].append(str(e))

        return results

    @staticmethod
    def _process_reminders() -> Dict:
        """Send reminder notifications."""
        results = {'sent': 0, 'failed': 0}

        tasks_needing_reminder = SLAService.get_tasks_needing_reminder()

        for task, hours_remaining in tasks_needing_reminder:
            try:
                # Check if we've already sent a reminder for this window
                recent_reminder = WorkflowAuditLog.objects.filter(
                    task=task,
                    action='notification_task_reminder',
                    timestamp__gte=timezone.now() - timedelta(hours=1)
                ).exists()

                if not recent_reminder:
                    WorkflowNotificationService.notify_task_reminder(task, hours_remaining)
                    results['sent'] += 1

            except Exception as e:
                logger.error(f"Failed to send reminder for task {task.id}: {e}")
                results['failed'] += 1

        return results

    @staticmethod
    def _process_warnings() -> Dict:
        """Send SLA warning notifications."""
        results = {'sent': 0, 'failed': 0}

        # Get tasks in warning zone (within warning threshold but not yet overdue)
        warning_hours = SLAConfig.DEFAULT_SLA_HOURS * (SLAConfig.WARNING_THRESHOLD_PERCENT / 100)
        tasks = SLAService.get_tasks_approaching_deadline(int(warning_hours))

        for task in tasks:
            try:
                sla_result = SLAService.check_task_sla(task)

                if sla_result.status == SLAStatus.WARNING:
                    # Check if we've already sent a warning
                    recent_warning = WorkflowAuditLog.objects.filter(
                        task=task,
                        action='notification_sla_warning',
                        timestamp__gte=timezone.now() - timedelta(hours=4)
                    ).exists()

                    if not recent_warning:
                        hours_remaining = int(sla_result.hours_remaining or 0)
                        WorkflowNotificationService.notify_sla_warning(task, hours_remaining)
                        results['sent'] += 1

            except Exception as e:
                logger.error(f"Failed to process SLA warning for task {task.id}: {e}")
                results['failed'] += 1

        return results

    @staticmethod
    def _process_overdue_tasks() -> Dict:
        """Process overdue tasks - send notifications and escalate."""
        results = {'notifications': 0, 'escalations': 0, 'failed': 0}

        overdue_tasks = SLAService.get_overdue_tasks()

        for task in overdue_tasks:
            try:
                # Check if we've already notified about this being overdue
                already_notified = WorkflowAuditLog.objects.filter(
                    task=task,
                    action='notification_task_overdue',
                    timestamp__gte=timezone.now() - timedelta(hours=12)
                ).exists()

                if not already_notified:
                    WorkflowNotificationService.notify_task_overdue(task)
                    results['notifications'] += 1

                # Check if should escalate
                if EscalationService.should_escalate(task):
                    new_task = EscalationService.escalate_task(task, reason='SLA breach')
                    if new_task:
                        results['escalations'] += 1

            except Exception as e:
                logger.error(f"Failed to process overdue task {task.id}: {e}")
                results['failed'] += 1

        return results


# =============================================================================
# SLA Statistics
# =============================================================================

class SLAStatistics:
    """
    Generate SLA compliance statistics.
    """

    @staticmethod
    def get_sla_compliance_rate(
        organization=None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict:
        """
        Calculate SLA compliance rate.

        Returns:
            Dict with compliance statistics
        """
        query = WorkflowTask.objects.filter(
            status__in=[
                WorkflowTaskStatus.APPROVED,
                WorkflowTaskStatus.REJECTED,
                WorkflowTaskStatus.SKIPPED
            ]
        )

        if organization:
            query = query.filter(workflow__organization=organization)

        if start_date:
            query = query.filter(completed_at__gte=start_date)

        if end_date:
            query = query.filter(completed_at__lte=end_date)

        total_tasks = query.count()

        # Tasks completed on time (completed_at <= due_date)
        on_time_tasks = query.filter(
            due_date__isnull=False,
            completed_at__isnull=False,
            completed_at__lte=F('due_date')
        ).count()

        # Tasks completed late
        late_tasks = query.filter(
            due_date__isnull=False,
            completed_at__isnull=False,
            completed_at__gt=F('due_date')
        ).count()

        # Tasks without SLA
        no_sla_tasks = query.filter(due_date__isnull=True).count()

        compliance_rate = 0
        if (on_time_tasks + late_tasks) > 0:
            compliance_rate = (on_time_tasks / (on_time_tasks + late_tasks)) * 100

        return {
            'total_tasks': total_tasks,
            'on_time': on_time_tasks,
            'late': late_tasks,
            'no_sla': no_sla_tasks,
            'compliance_rate': round(compliance_rate, 1)
        }

    @staticmethod
    def get_current_sla_status(organization=None) -> Dict:
        """
        Get current SLA status for active tasks.

        Returns:
            Dict with current SLA breakdown
        """
        query = WorkflowTask.objects.filter(
            status__in=[WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS]
        )

        if organization:
            query = query.filter(workflow__organization=organization)

        now = timezone.now()

        total_active = query.count()
        overdue = query.filter(due_date__lt=now, due_date__isnull=False).count()
        no_sla = query.filter(due_date__isnull=True).count()
        on_track = total_active - overdue - no_sla

        return {
            'total_active': total_active,
            'on_track': on_track,
            'overdue': overdue,
            'no_sla': no_sla
        }
