"""
Workflow Engine Service

Enterprise-grade state machine for workflow execution with support for:
- Sequential workflow execution
- Conditional routing
- Parallel step execution
- User and role-based task assignment
- SLA management and escalation
"""

import logging
from datetime import timedelta
from typing import List, Optional, Dict, Any, Tuple
from dataclasses import dataclass
from enum import Enum

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.contrib.auth import get_user_model

from apps.workflows.models import (
    WorkflowTemplate,
    WorkflowStep,
    WorkflowInstance,
    WorkflowTask,
    WorkflowAuditLog,
    WorkflowInstanceStatus,
    WorkflowTaskStatus,
    WorkflowStepType,
    WorkflowApprovalType,
    WorkflowPriority,
)

User = get_user_model()
logger = logging.getLogger(__name__)


# =============================================================================
# Exceptions
# =============================================================================

class WorkflowEngineError(Exception):
    """Base exception for workflow engine errors."""
    pass


class WorkflowValidationError(WorkflowEngineError):
    """Raised when workflow validation fails."""
    pass


class WorkflowTransitionError(WorkflowEngineError):
    """Raised when a state transition is invalid."""
    pass


class TaskAssignmentError(WorkflowEngineError):
    """Raised when task assignment fails."""
    pass


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class ConditionContext:
    """Context for evaluating workflow conditions."""
    target: Any  # The target object (Document, Procedure, etc.)
    workflow: WorkflowInstance
    current_step: WorkflowStep
    previous_tasks: List[WorkflowTask]
    user: Any
    metadata: Dict[str, Any]

    @property
    def document(self):
        """Backward-compatible alias — returns target if it's a Document."""
        return self.target


@dataclass
class AssignmentResult:
    """Result of task assignment."""
    users: List[Any]
    assignment_type: str  # 'user', 'role', 'department'
    reason: str


@dataclass
class TransitionResult:
    """Result of a workflow transition."""
    success: bool
    new_status: WorkflowInstanceStatus
    tasks_created: List[WorkflowTask]
    message: str
    next_step: Optional[WorkflowStep] = None


# =============================================================================
# Condition Evaluator
# =============================================================================

class ConditionEvaluator:
    """
    Evaluates workflow conditions for routing decisions.

    Supports conditions like:
    - Document metadata checks
    - Previous step outcomes
    - User/role checks
    - Custom expressions
    """

    OPERATORS = {
        'eq': lambda a, b: a == b,
        'ne': lambda a, b: a != b,
        'gt': lambda a, b: a > b,
        'gte': lambda a, b: a >= b,
        'lt': lambda a, b: a < b,
        'lte': lambda a, b: a <= b,
        'in': lambda a, b: a in b,
        'not_in': lambda a, b: a not in b,
        'contains': lambda a, b: b in a if isinstance(a, (str, list)) else False,
        'starts_with': lambda a, b: a.startswith(b) if isinstance(a, str) else False,
        'ends_with': lambda a, b: a.endswith(b) if isinstance(a, str) else False,
        'is_null': lambda a, b: a is None,
        'is_not_null': lambda a, b: a is not None,
    }

    def evaluate(self, conditions: Dict[str, Any], context: ConditionContext) -> bool:
        """
        Evaluate conditions against the given context.

        Conditions format:
        {
            "type": "all" | "any",  # all = AND, any = OR
            "rules": [
                {"field": "document.confidentiality", "operator": "eq", "value": "HIGHLY_CONFIDENTIAL"},
                {"field": "previous_step.outcome", "operator": "eq", "value": "approved"},
            ]
        }
        """
        if not conditions:
            return True

        condition_type = conditions.get('type', 'all')
        rules = conditions.get('rules', [])

        if not rules:
            return True

        results = [self._evaluate_rule(rule, context) for rule in rules]

        if condition_type == 'all':
            return all(results)
        elif condition_type == 'any':
            return any(results)
        else:
            return all(results)

    def _evaluate_rule(self, rule: Dict[str, Any], context: ConditionContext) -> bool:
        """Evaluate a single rule."""
        field = rule.get('field', '')
        operator = rule.get('operator', 'eq')
        expected_value = rule.get('value')

        try:
            actual_value = self._get_field_value(field, context)
            op_func = self.OPERATORS.get(operator, lambda a, b: False)
            return op_func(actual_value, expected_value)
        except Exception as e:
            logger.warning(f"Error evaluating condition rule {rule}: {e}")
            return False

    def _get_field_value(self, field: str, context: ConditionContext) -> Any:
        """Get a value from the context using dot notation."""
        parts = field.split('.')

        if parts[0] in ('document', 'target'):
            obj = context.target
        elif parts[0] == 'workflow':
            obj = context.workflow
        elif parts[0] == 'step':
            obj = context.current_step
        elif parts[0] == 'user':
            obj = context.user
        elif parts[0] == 'metadata':
            obj = context.metadata
        elif parts[0] == 'previous_step':
            # Get the last completed task outcome
            if context.previous_tasks:
                last_task = context.previous_tasks[-1]
                if len(parts) > 1 and parts[1] == 'outcome':
                    return last_task.status.lower()
                obj = last_task
            else:
                return None
        else:
            return None

        # Navigate nested attributes
        for part in parts[1:]:
            if obj is None:
                return None
            if hasattr(obj, part):
                obj = getattr(obj, part)
            elif isinstance(obj, dict):
                obj = obj.get(part)
            else:
                return None

        return obj


# =============================================================================
# Task Assignment Engine
# =============================================================================

class TaskAssignmentEngine:
    """
    Handles task assignment based on workflow step configuration.

    Supports:
    - Direct user assignment
    - Role-based assignment
    - Department-based assignment
    - Round-robin within group
    - Load-balanced assignment
    """

    def assign_task(
        self,
        step: WorkflowStep,
        workflow: WorkflowInstance,
        context: Optional[ConditionContext] = None
    ) -> AssignmentResult:
        """
        Determine who should be assigned to a task based on step configuration.
        """
        users = []
        assignment_type = 'user'
        reason = ''

        # Priority 1: Direct user assignment
        if step.assigned_users.exists():
            users = list(step.assigned_users.all())
            assignment_type = 'user'
            reason = 'Directly assigned users'

        # Priority 2: Role-based assignment
        elif step.assigned_role:
            users = self._get_users_by_role(step.assigned_role, workflow.organization)
            assignment_type = 'role'
            reason = f'Users with role: {step.assigned_role}'

        # Priority 3: Department-based assignment
        elif step.assigned_department:
            users = self._get_users_by_department(step.assigned_department)
            assignment_type = 'department'
            reason = f'Users in department: {step.department_name}'

        # Priority 4: Target owner (e.g. document uploader, procedure creator)
        elif step.step_type == WorkflowStepType.NOTIFICATION:
            target = workflow.target
            if target:
                owner = (
                    getattr(target, 'uploaded_by', None)
                    or getattr(target, 'created_by', None)
                )
                if owner:
                    users = [owner]
                    assignment_type = 'owner'
                    reason = 'Target owner'

        if not users:
            raise TaskAssignmentError(
                f"No users found for assignment in step '{step.name}'. "
                f"Check role, department, or user assignments."
            )

        return AssignmentResult(users=users, assignment_type=assignment_type, reason=reason)

    def _get_users_by_role(self, role: str, organization) -> List:
        """Get users with a specific role in the organization."""
        # Check for role field or group membership
        users = User.objects.filter(
            organization=organization,
            is_active=True
        ).filter(
            Q(role__iexact=role) | Q(groups__name__iexact=role)
        ).distinct()
        return list(users)

    def _get_users_by_department(self, department_id: int) -> List:
        """Get users in a specific department."""
        users = User.objects.filter(
            department_id=department_id,
            is_active=True
        )
        return list(users)

    def should_auto_approve(
        self,
        step: WorkflowStep,
        workflow: WorkflowInstance,
        assigned_users: List
    ) -> bool:
        """
        Check if auto-approval should be applied.

        Auto-approve if:
        - Step allows it AND
        - The only assigned user is the workflow initiator
        """
        if not step.auto_approve_if_same_user:
            return False

        if len(assigned_users) == 1 and assigned_users[0].id == workflow.initiated_by_id:
            return True

        return False


# =============================================================================
# Workflow Engine
# =============================================================================

class WorkflowEngine:
    """
    Core workflow engine implementing a state machine for document workflows.

    Features:
    - Sequential step execution
    - Parallel step support
    - Conditional routing
    - Task assignment
    - SLA management
    - Audit logging
    """

    def __init__(self):
        self.condition_evaluator = ConditionEvaluator()
        self.assignment_engine = TaskAssignmentEngine()

    # =========================================================================
    # Workflow Lifecycle
    # =========================================================================

    @transaction.atomic
    def start_workflow(
        self,
        template: WorkflowTemplate,
        target,
        initiated_by,
        priority: Optional[WorkflowPriority] = None,
        due_date=None,
        notes: str = '',
        # Backward-compatible alias
        document=None,
    ) -> WorkflowInstance:
        """
        Start a new workflow instance from a template.

        Args:
            template: The workflow template to instantiate
            target: The target object (Document, Procedure, etc.)
            initiated_by: User who initiated the workflow
            priority: Override priority (uses template default if not provided)
            due_date: Override due date
            notes: Optional notes for the workflow
            document: Deprecated alias for target (backward compatibility)

        Returns:
            The created WorkflowInstance
        """
        from django.contrib.contenttypes.models import ContentType

        # Support the old `document=` kwarg for backward compatibility
        if target is None and document is not None:
            target = document

        if target is None:
            raise WorkflowValidationError("A target object is required")

        # Validate template is active
        if not template.is_active:
            raise WorkflowValidationError(f"Template '{template.name}' is not active")

        # Resolve ContentType
        target_ct = ContentType.objects.get_for_model(target)

        # Check for existing active workflow on this target
        existing = WorkflowInstance.objects.filter(
            target_content_type=target_ct,
            target_object_id=target.pk,
            status__in=[WorkflowInstanceStatus.ACTIVE, WorkflowInstanceStatus.PENDING]
        ).first()

        if existing:
            raise WorkflowValidationError(
                f"Target already has an active workflow: {existing.template_name}"
            )

        # Calculate due date if not provided
        if not due_date and template.default_due_days:
            due_date = timezone.now() + timedelta(days=template.default_due_days)

        # Derive a title from the target for snapshot storage
        target_title = (
            getattr(target, 'title', '')
            or getattr(target, 'name', '')
            or str(target)
        )

        # Create workflow instance
        workflow = WorkflowInstance.objects.create(
            template=template,
            template_name=template.name,
            target_content_type=target_ct,
            target_object_id=target.pk,
            target_title=target_title,
            organization=initiated_by.organization,
            status=WorkflowInstanceStatus.ACTIVE,
            priority=priority or template.default_priority,
            current_step=1,
            due_date=due_date,
            started_at=timezone.now(),
            initiated_by=initiated_by,
            notes=notes
        )

        # Update template usage count
        template.times_used += 1
        template.save(update_fields=['times_used'])

        # Log workflow start
        self._log_action(
            workflow=workflow,
            action='workflow_started',
            actor=initiated_by,
            details=f"Started workflow '{template.name}' on '{target_title}'"
        )

        # Create tasks for first step(s)
        self._execute_current_step(workflow, initiated_by)

        return workflow

    @transaction.atomic
    def cancel_workflow(
        self,
        workflow: WorkflowInstance,
        cancelled_by,
        reason: str = ''
    ) -> WorkflowInstance:
        """Cancel an active workflow."""
        if workflow.status not in [WorkflowInstanceStatus.ACTIVE, WorkflowInstanceStatus.PENDING]:
            raise WorkflowTransitionError(
                f"Cannot cancel workflow in status: {workflow.status}"
            )

        # Cancel all pending tasks
        pending_tasks = workflow.tasks.filter(
            status__in=[WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS]
        )
        pending_tasks.update(
            status=WorkflowTaskStatus.SKIPPED,
            completed_at=timezone.now()
        )

        # Update workflow
        workflow.status = WorkflowInstanceStatus.CANCELLED
        workflow.completed_at = timezone.now()
        workflow.outcome_reason = reason
        workflow.save()

        # Log cancellation
        self._log_action(
            workflow=workflow,
            action='workflow_cancelled',
            actor=cancelled_by,
            details=f"Workflow cancelled. Reason: {reason}"
        )

        return workflow

    # =========================================================================
    # Task Actions
    # =========================================================================

    @transaction.atomic
    def complete_task(
        self,
        task: WorkflowTask,
        action: str,  # 'approve', 'reject', 'delegate'
        actor,
        comment: str = '',
        delegate_to=None
    ) -> TransitionResult:
        """
        Complete a task with the specified action.

        Args:
            task: The task to complete
            action: 'approve', 'reject', or 'delegate'
            actor: User performing the action
            comment: Optional comment
            delegate_to: User to delegate to (if action is 'delegate')

        Returns:
            TransitionResult with outcome details
        """
        workflow = task.workflow

        # Validate task can be actioned
        if task.status not in [WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS]:
            raise WorkflowTransitionError(
                f"Task is not actionable. Current status: {task.status}"
            )

        # Validate actor is assigned
        if task.assigned_to_id != actor.id:
            raise WorkflowTransitionError(
                f"User is not assigned to this task"
            )

        # Handle delegation
        if action == 'delegate':
            return self._delegate_task(task, actor, delegate_to, comment)

        # Update task
        if action == 'approve':
            task.status = WorkflowTaskStatus.APPROVED
            task.action_taken = 'APPROVED'
        elif action == 'reject':
            task.status = WorkflowTaskStatus.REJECTED
            task.action_taken = 'REJECTED'
        else:
            raise WorkflowTransitionError(f"Invalid action: {action}")

        task.comment = comment
        task.completed_at = timezone.now()
        task.save()

        # Log task completion
        self._log_action(
            workflow=workflow,
            task=task,
            action=f'task_{action}d',
            actor=actor,
            details=f"Task '{task.step_name}' {action}d. Comment: {comment}"
        )

        # Process step completion
        return self._process_step_completion(workflow, task, actor)

    def _delegate_task(
        self,
        task: WorkflowTask,
        delegator,
        delegate_to,
        comment: str
    ) -> TransitionResult:
        """Delegate a task to another user."""
        if not delegate_to:
            raise TaskAssignmentError("Delegate target user is required")

        # Create new task for delegate
        new_task = WorkflowTask.objects.create(
            workflow=task.workflow,
            step_order=task.step_order,
            step_name=task.step_name,
            step_type=task.step_type,
            assigned_to=delegate_to,
            delegated_from=delegator,
            status=WorkflowTaskStatus.PENDING,
            due_date=task.due_date,
            assigned_at=timezone.now()
        )

        # Mark original task as delegated
        task.status = WorkflowTaskStatus.DELEGATED
        task.action_taken = 'DELEGATED'
        task.comment = comment
        task.completed_at = timezone.now()
        task.save()

        # Log delegation
        self._log_action(
            workflow=task.workflow,
            task=task,
            action='task_delegated',
            actor=delegator,
            details=f"Task delegated to {delegate_to.get_full_name()}"
        )

        return TransitionResult(
            success=True,
            new_status=task.workflow.status,
            tasks_created=[new_task],
            message=f"Task delegated to {delegate_to.get_full_name()}"
        )

    # =========================================================================
    # Step Execution
    # =========================================================================

    def _execute_current_step(self, workflow: WorkflowInstance, actor) -> List[WorkflowTask]:
        """Execute the current step(s) of the workflow."""
        steps = self._get_steps_to_execute(workflow)

        if not steps:
            # No more steps - complete the workflow
            self._complete_workflow(workflow, WorkflowInstanceStatus.APPROVED, actor)
            return []

        tasks_created = []

        for step in steps:
            # Check conditions
            context = self._build_context(workflow, step)

            if step.conditions and not self.condition_evaluator.evaluate(step.conditions, context):
                # Condition not met - skip this step
                self._log_action(
                    workflow=workflow,
                    action='step_skipped',
                    actor=actor,
                    details=f"Step '{step.name}' skipped due to unmet conditions"
                )
                continue

            # Get assignees
            try:
                assignment = self.assignment_engine.assign_task(step, workflow, context)
            except TaskAssignmentError as e:
                logger.error(f"Task assignment failed for step {step.name}: {e}")
                raise

            # Check for auto-approval
            if self.assignment_engine.should_auto_approve(step, workflow, assignment.users):
                self._log_action(
                    workflow=workflow,
                    action='step_auto_approved',
                    actor=actor,
                    details=f"Step '{step.name}' auto-approved (same user as initiator)"
                )
                continue

            # Create tasks for each assignee
            for user in assignment.users:
                task = self._create_task(workflow, step, user)
                tasks_created.append(task)

        # If no tasks were created (all skipped/auto-approved), advance to next step
        if not tasks_created and steps:
            workflow.current_step += 1
            workflow.save(update_fields=['current_step'])
            return self._execute_current_step(workflow, actor)

        return tasks_created

    def _get_steps_to_execute(self, workflow: WorkflowInstance) -> List[WorkflowStep]:
        """Get the step(s) that should be executed for the current position."""
        if not workflow.template:
            return []

        current_order = workflow.current_step

        # Get step at current order
        steps = list(workflow.template.steps.filter(order=current_order))

        if not steps:
            return []

        # Check if this is a parallel step
        first_step = steps[0]
        if first_step.step_type == WorkflowStepType.PARALLEL:
            # For parallel, return all steps at this order
            return steps

        # For sequential, return just the first step
        return [first_step]

    def _create_task(
        self,
        workflow: WorkflowInstance,
        step: WorkflowStep,
        assigned_to
    ) -> WorkflowTask:
        """Create a task for a workflow step."""
        # Calculate due date based on SLA
        due_date = None
        if step.sla_hours:
            due_date = timezone.now() + timedelta(hours=step.sla_hours)
        elif workflow.due_date:
            due_date = workflow.due_date

        task = WorkflowTask.objects.create(
            workflow=workflow,
            step_order=step.order,
            step_name=step.name,
            step_type=step.step_type,
            assigned_to=assigned_to,
            status=WorkflowTaskStatus.PENDING,
            due_date=due_date,
            assigned_at=timezone.now()
        )

        # Log task creation
        self._log_action(
            workflow=workflow,
            task=task,
            action='task_created',
            actor=workflow.initiated_by,
            details=f"Task '{step.name}' assigned to {assigned_to.get_full_name()}"
        )

        return task

    # =========================================================================
    # Step Completion Processing
    # =========================================================================

    def _process_step_completion(
        self,
        workflow: WorkflowInstance,
        completed_task: WorkflowTask,
        actor
    ) -> TransitionResult:
        """Process the completion of a task and determine next steps."""
        step_order = completed_task.step_order

        # Get all tasks for this step
        step_tasks = list(workflow.tasks.filter(step_order=step_order))

        # Get the step configuration
        step = None
        if workflow.template:
            step = workflow.template.steps.filter(order=step_order).first()

        # Check if step is complete based on approval type
        step_complete, step_approved = self._check_step_completion(step_tasks, step)

        if not step_complete:
            # Step still has pending tasks
            return TransitionResult(
                success=True,
                new_status=workflow.status,
                tasks_created=[],
                message="Task completed. Waiting for other approvers."
            )

        # Step is complete - determine outcome
        if step_approved:
            # Move to next step
            workflow.current_step += 1
            workflow.save(update_fields=['current_step'])

            # Execute next step
            new_tasks = self._execute_current_step(workflow, actor)

            if workflow.status == WorkflowInstanceStatus.APPROVED:
                return TransitionResult(
                    success=True,
                    new_status=WorkflowInstanceStatus.APPROVED,
                    tasks_created=[],
                    message="Workflow completed successfully"
                )

            return TransitionResult(
                success=True,
                new_status=workflow.status,
                tasks_created=new_tasks,
                message=f"Step complete. {len(new_tasks)} new task(s) created."
            )
        else:
            # Step rejected - complete workflow as rejected
            self._complete_workflow(
                workflow,
                WorkflowInstanceStatus.REJECTED,
                actor,
                f"Rejected at step: {completed_task.step_name}"
            )

            return TransitionResult(
                success=True,
                new_status=WorkflowInstanceStatus.REJECTED,
                tasks_created=[],
                message="Workflow rejected"
            )

    def _check_step_completion(
        self,
        tasks: List[WorkflowTask],
        step: Optional[WorkflowStep]
    ) -> Tuple[bool, bool]:
        """
        Check if a step is complete and approved.

        Returns:
            Tuple of (is_complete, is_approved)
        """
        if not tasks:
            return True, True

        # Get completion status for all tasks
        completed_tasks = [t for t in tasks if t.status in [
            WorkflowTaskStatus.APPROVED,
            WorkflowTaskStatus.REJECTED,
            WorkflowTaskStatus.SKIPPED
        ]]

        approved_tasks = [t for t in tasks if t.status == WorkflowTaskStatus.APPROVED]
        rejected_tasks = [t for t in tasks if t.status == WorkflowTaskStatus.REJECTED]
        pending_tasks = [t for t in tasks if t.status in [
            WorkflowTaskStatus.PENDING,
            WorkflowTaskStatus.IN_PROGRESS,
            WorkflowTaskStatus.DELEGATED
        ]]

        # Determine approval type
        approval_type = WorkflowApprovalType.ALL
        approval_percentage = 100

        if step:
            approval_type = step.approval_type
            approval_percentage = step.approval_percentage or 100

        # Check based on approval type
        if approval_type == WorkflowApprovalType.ALL:
            # All must approve
            if rejected_tasks:
                return True, False
            if pending_tasks:
                return False, False
            return True, True

        elif approval_type == WorkflowApprovalType.ANY:
            # Any one approval is enough
            if approved_tasks:
                # Cancel remaining pending tasks
                for task in pending_tasks:
                    task.status = WorkflowTaskStatus.SKIPPED
                    task.completed_at = timezone.now()
                    task.save()
                return True, True
            if not pending_tasks:
                return True, False
            return False, False

        elif approval_type == WorkflowApprovalType.MAJORITY:
            # More than 50% must approve
            total = len(tasks)
            if len(approved_tasks) > total / 2:
                for task in pending_tasks:
                    task.status = WorkflowTaskStatus.SKIPPED
                    task.completed_at = timezone.now()
                    task.save()
                return True, True
            if len(rejected_tasks) >= total / 2:
                return True, False
            if not pending_tasks:
                return True, len(approved_tasks) > len(rejected_tasks)
            return False, False

        elif approval_type == WorkflowApprovalType.PERCENTAGE:
            # Specific percentage must approve
            total = len(tasks)
            required = (total * approval_percentage) / 100
            if len(approved_tasks) >= required:
                for task in pending_tasks:
                    task.status = WorkflowTaskStatus.SKIPPED
                    task.completed_at = timezone.now()
                    task.save()
                return True, True
            if len(rejected_tasks) > total - required:
                return True, False
            if not pending_tasks:
                return True, len(approved_tasks) >= required
            return False, False

        return True, True

    # =========================================================================
    # Workflow Completion
    # =========================================================================

    def _complete_workflow(
        self,
        workflow: WorkflowInstance,
        status: WorkflowInstanceStatus,
        actor,
        reason: str = ''
    ):
        """Complete a workflow with the given status."""
        workflow.status = status
        workflow.completed_at = timezone.now()
        workflow.outcome_reason = reason
        workflow.save()

        # Cancel any remaining pending tasks
        pending_tasks = workflow.tasks.filter(
            status__in=[WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS]
        )
        pending_tasks.update(
            status=WorkflowTaskStatus.SKIPPED,
            completed_at=timezone.now()
        )

        # Update template statistics
        if workflow.template:
            self._update_template_stats(workflow.template)

        # Log completion
        self._log_action(
            workflow=workflow,
            action=f'workflow_{status.lower()}',
            actor=actor,
            details=f"Workflow completed with status: {status}. {reason}"
        )

    def _update_template_stats(self, template: WorkflowTemplate):
        """Update template average completion time."""
        from django.db.models import Avg, F

        completed = WorkflowInstance.objects.filter(
            template=template,
            status=WorkflowInstanceStatus.APPROVED,
            completed_at__isnull=False,
            started_at__isnull=False
        ).annotate(
            duration=F('completed_at') - F('started_at')
        ).aggregate(avg_duration=Avg('duration'))

        if completed['avg_duration']:
            template.avg_completion_days = completed['avg_duration'].days
            template.save(update_fields=['avg_completion_days'])

    # =========================================================================
    # Helper Methods
    # =========================================================================

    def _build_context(
        self,
        workflow: WorkflowInstance,
        step: WorkflowStep
    ) -> ConditionContext:
        """Build context for condition evaluation."""
        previous_tasks = list(workflow.tasks.filter(
            step_order__lt=step.order,
            status__in=[WorkflowTaskStatus.APPROVED, WorkflowTaskStatus.REJECTED]
        ).order_by('step_order', 'completed_at'))

        return ConditionContext(
            target=workflow.target,
            workflow=workflow,
            current_step=step,
            previous_tasks=previous_tasks,
            user=workflow.initiated_by,
            metadata={}
        )

    def _log_action(
        self,
        workflow: WorkflowInstance,
        action: str,
        actor,
        details: str = '',
        task: WorkflowTask = None
    ):
        """Log an action to the audit trail."""
        WorkflowAuditLog.objects.create(
            workflow=workflow,
            task=task,
            action=action,
            actor=actor,
            details=details
        )


# =============================================================================
# Singleton Instance
# =============================================================================

workflow_engine = WorkflowEngine()
