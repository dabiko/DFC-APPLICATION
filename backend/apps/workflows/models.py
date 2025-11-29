"""
Workflow Models for Document Approval/Review Processes

This module defines the core data models for the workflow management system.
It handles human-centric document routing through approval chains, reviews,
and sign-off processes.

Key Concepts:
- WorkflowTemplate: Reusable workflow definitions (e.g., "Contract Approval")
- WorkflowStep: Individual steps within a template (e.g., "Legal Review")
- WorkflowInstance: A running instance of a workflow for a specific document
- WorkflowTask: Individual tasks assigned to users for action
- WorkflowComment: Comments/notes on workflow tasks
- WorkflowAuditLog: Immutable audit trail for workflow actions
"""

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
import uuid


class WorkflowPriority(models.TextChoices):
    """Priority levels for workflow tasks."""
    LOW = 'LOW', 'Low'
    MEDIUM = 'MEDIUM', 'Medium'
    HIGH = 'HIGH', 'High'
    URGENT = 'URGENT', 'Urgent'


class WorkflowStepType(models.TextChoices):
    """Types of workflow steps."""
    APPROVAL = 'APPROVAL', 'Approval'  # Approve/Reject decision
    REVIEW = 'REVIEW', 'Review'  # Review without explicit approval
    SIGN_OFF = 'SIGN_OFF', 'Sign-off'  # Final sign-off
    NOTIFICATION = 'NOTIFICATION', 'Notification'  # FYI notification only
    PARALLEL = 'PARALLEL', 'Parallel Approval'  # Multiple approvers simultaneously


class WorkflowApprovalType(models.TextChoices):
    """How approval is determined for parallel steps."""
    ALL = 'ALL', 'All must approve'  # Unanimous
    ANY = 'ANY', 'Any one can approve'  # First approval wins
    MAJORITY = 'MAJORITY', 'Majority must approve'  # >50%
    PERCENTAGE = 'PERCENTAGE', 'Percentage threshold'  # Custom %


class WorkflowInstanceStatus(models.TextChoices):
    """Status of a workflow instance."""
    DRAFT = 'DRAFT', 'Draft'  # Not yet started
    ACTIVE = 'ACTIVE', 'Active'  # In progress
    PENDING = 'PENDING', 'Pending'  # Awaiting action
    APPROVED = 'APPROVED', 'Approved'  # Successfully completed
    REJECTED = 'REJECTED', 'Rejected'  # Rejected at some step
    CANCELLED = 'CANCELLED', 'Cancelled'  # Manually cancelled
    EXPIRED = 'EXPIRED', 'Expired'  # Timed out


class WorkflowTaskStatus(models.TextChoices):
    """Status of an individual task."""
    PENDING = 'PENDING', 'Pending'  # Awaiting action
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'  # Being worked on
    APPROVED = 'APPROVED', 'Approved'
    REJECTED = 'REJECTED', 'Rejected'
    SKIPPED = 'SKIPPED', 'Skipped'  # Auto-skipped (e.g., parallel approval met)
    DELEGATED = 'DELEGATED', 'Delegated'  # Reassigned to another user
    EXPIRED = 'EXPIRED', 'Expired'  # SLA breached


class WorkflowTemplate(models.Model):
    """
    Reusable workflow template that defines the structure of an approval process.

    Examples:
    - Contract Approval (Legal -> Finance -> Executive)
    - Document Review (Single reviewer)
    - Compliance Sign-off (Multiple departments)
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Multi-tenant organization
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.PROTECT,
        related_name='workflow_templates',
        null=True,
        blank=True,
        help_text='Organization this template belongs to'
    )

    # Template details
    name = models.CharField(max_length=255, help_text='Template name')
    description = models.TextField(blank=True, help_text='Template description')
    category = models.CharField(
        max_length=100,
        blank=True,
        help_text='Category for grouping (e.g., Contracts, Compliance, Finance)'
    )

    # Configuration
    is_active = models.BooleanField(default=True, help_text='Whether this template can be used')
    is_system = models.BooleanField(
        default=False,
        help_text='System templates cannot be deleted by users'
    )

    # Default settings
    default_priority = models.CharField(
        max_length=20,
        choices=WorkflowPriority.choices,
        default=WorkflowPriority.MEDIUM
    )
    default_due_days = models.PositiveIntegerField(
        default=5,
        validators=[MinValueValidator(1)],
        help_text='Default number of days to complete the workflow'
    )

    # Applicable document types (JSON array of document type codes)
    applicable_document_types = models.JSONField(
        default=list,
        blank=True,
        help_text='List of document types this workflow applies to (empty = all)'
    )

    # Tracking
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='created_workflow_templates'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Stats (denormalized for performance)
    times_used = models.PositiveIntegerField(default=0, help_text='Number of times this template was used')
    avg_completion_days = models.FloatField(
        null=True,
        blank=True,
        help_text='Average days to complete workflows using this template'
    )

    class Meta:
        db_table = 'workflow_templates'
        verbose_name = 'Workflow Template'
        verbose_name_plural = 'Workflow Templates'
        ordering = ['-created_at']
        unique_together = [['organization', 'name']]

    def __str__(self):
        return self.name

    @property
    def step_count(self):
        return self.steps.count()


class WorkflowStep(models.Model):
    """
    A single step within a workflow template.

    Steps are executed in order based on their `order` field.
    Each step can have conditions for when it should be executed.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Parent template
    template = models.ForeignKey(
        WorkflowTemplate,
        on_delete=models.CASCADE,
        related_name='steps'
    )

    # Step details
    name = models.CharField(max_length=255, help_text='Step name (e.g., "Legal Review")')
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(help_text='Execution order (1-based)')

    # Step type and approval configuration
    step_type = models.CharField(
        max_length=20,
        choices=WorkflowStepType.choices,
        default=WorkflowStepType.APPROVAL
    )
    approval_type = models.CharField(
        max_length=20,
        choices=WorkflowApprovalType.choices,
        default=WorkflowApprovalType.ALL,
        help_text='For parallel steps, how approval is determined'
    )
    approval_percentage = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Required approval percentage (if approval_type is PERCENTAGE)'
    )

    # Assignees - who should handle this step
    # Can assign to specific users, roles, or departments
    assigned_users = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name='assigned_workflow_steps',
        help_text='Specific users assigned to this step'
    )
    assigned_role = models.CharField(
        max_length=100,
        blank=True,
        help_text='Role that can handle this step (e.g., "MANAGER", "LEGAL_COUNSEL")'
    )
    assigned_department = models.ForeignKey(
        'users.Department',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='assigned_workflow_steps',
        help_text='Department that can handle this step'
    )

    # SLA settings
    sla_hours = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Hours to complete this step (for SLA tracking)'
    )
    escalation_hours = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Hours after which to escalate (must be less than sla_hours)'
    )
    escalate_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='escalation_target_steps',
        help_text='User to escalate to if SLA is at risk'
    )

    # Conditions (JSON) - when should this step be executed?
    # Example: {"document_type": "CONTRACT", "amount_greater_than": 10000}
    conditions = models.JSONField(
        default=dict,
        blank=True,
        help_text='Conditions that must be met for this step to execute'
    )

    # Actions on completion
    auto_approve_if_same_user = models.BooleanField(
        default=False,
        help_text='Auto-approve if the same user approved the previous step'
    )
    require_comment = models.BooleanField(
        default=False,
        help_text='Require a comment when approving/rejecting'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'workflow_steps'
        verbose_name = 'Workflow Step'
        verbose_name_plural = 'Workflow Steps'
        ordering = ['template', 'order']
        unique_together = [['template', 'order']]

    def __str__(self):
        return f"{self.template.name} - Step {self.order}: {self.name}"


class WorkflowInstance(models.Model):
    """
    A running instance of a workflow, associated with a specific document.

    When a user initiates a workflow on a document, a WorkflowInstance is created
    from a WorkflowTemplate. Tasks are then created for each step.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Multi-tenant organization
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.PROTECT,
        related_name='workflow_instances',
        null=True,
        blank=True
    )

    # Source template (optional - in case template is deleted)
    template = models.ForeignKey(
        WorkflowTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='instances'
    )
    template_name = models.CharField(
        max_length=255,
        help_text='Snapshot of template name at time of creation'
    )

    # Associated document
    document = models.ForeignKey(
        'documents.Document',
        on_delete=models.CASCADE,
        related_name='workflow_instances'
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=WorkflowInstanceStatus.choices,
        default=WorkflowInstanceStatus.DRAFT
    )
    current_step = models.PositiveIntegerField(
        default=1,
        help_text='Current step number (1-based)'
    )

    # Priority and timing
    priority = models.CharField(
        max_length=20,
        choices=WorkflowPriority.choices,
        default=WorkflowPriority.MEDIUM
    )
    due_date = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    # Initiator
    initiated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='initiated_workflows'
    )

    # Notes
    notes = models.TextField(blank=True, help_text='Notes from the initiator')

    # Outcome details
    outcome_reason = models.TextField(
        blank=True,
        help_text='Reason for rejection/cancellation'
    )

    # Tracking
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'workflow_instances'
        verbose_name = 'Workflow Instance'
        verbose_name_plural = 'Workflow Instances'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'due_date']),
            models.Index(fields=['document']),
            models.Index(fields=['initiated_by']),
        ]

    def __str__(self):
        return f"{self.template_name} - {self.document.title}"

    def start(self):
        """Start the workflow instance."""
        if self.status != WorkflowInstanceStatus.DRAFT:
            raise ValueError("Can only start workflows in DRAFT status")
        self.status = WorkflowInstanceStatus.ACTIVE
        self.started_at = timezone.now()
        self.save(update_fields=['status', 'started_at', 'updated_at'])

    def complete(self, approved=True, reason=''):
        """Complete the workflow instance."""
        self.status = WorkflowInstanceStatus.APPROVED if approved else WorkflowInstanceStatus.REJECTED
        self.completed_at = timezone.now()
        self.outcome_reason = reason
        self.save(update_fields=['status', 'completed_at', 'outcome_reason', 'updated_at'])

    def cancel(self, reason=''):
        """Cancel the workflow instance."""
        self.status = WorkflowInstanceStatus.CANCELLED
        self.completed_at = timezone.now()
        self.outcome_reason = reason
        self.save(update_fields=['status', 'completed_at', 'outcome_reason', 'updated_at'])

    @property
    def is_overdue(self):
        """Check if the workflow is overdue."""
        if self.due_date and self.status in [
            WorkflowInstanceStatus.ACTIVE,
            WorkflowInstanceStatus.PENDING
        ]:
            return timezone.now() > self.due_date
        return False

    @property
    def days_remaining(self):
        """Get days remaining until due date."""
        if self.due_date and self.status in [
            WorkflowInstanceStatus.ACTIVE,
            WorkflowInstanceStatus.PENDING
        ]:
            delta = self.due_date - timezone.now()
            return max(0, delta.days)
        return None


class WorkflowTask(models.Model):
    """
    An individual task within a workflow instance, assigned to a user.

    Tasks are created when a workflow step needs action from a specific user.
    For parallel approval steps, multiple tasks may exist for the same step.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Parent workflow instance
    workflow = models.ForeignKey(
        WorkflowInstance,
        on_delete=models.CASCADE,
        related_name='tasks'
    )

    # Step information (denormalized for performance)
    step_order = models.PositiveIntegerField()
    step_name = models.CharField(max_length=255)
    step_type = models.CharField(
        max_length=20,
        choices=WorkflowStepType.choices,
        default=WorkflowStepType.APPROVAL
    )

    # Assignment
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='workflow_tasks'
    )
    delegated_from = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='delegated_tasks',
        help_text='Original assignee if this task was delegated'
    )

    # Status and action
    status = models.CharField(
        max_length=20,
        choices=WorkflowTaskStatus.choices,
        default=WorkflowTaskStatus.PENDING
    )
    action_taken = models.CharField(
        max_length=20,
        blank=True,
        help_text='The action taken (APPROVE, REJECT, etc.)'
    )

    # Timing
    due_date = models.DateTimeField(null=True, blank=True)
    assigned_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    # Escalation
    is_escalated = models.BooleanField(default=False)
    escalated_at = models.DateTimeField(null=True, blank=True)

    # Comments (required or optional based on step config)
    comment = models.TextField(blank=True, help_text='Comment provided with the action')

    # Read tracking
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'workflow_tasks'
        verbose_name = 'Workflow Task'
        verbose_name_plural = 'Workflow Tasks'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['assigned_to', 'status']),
            models.Index(fields=['workflow', 'step_order']),
            models.Index(fields=['due_date']),
            models.Index(fields=['status', 'is_read']),
        ]

    def __str__(self):
        return f"Task for {self.assigned_to.username}: {self.step_name}"

    def approve(self, comment=''):
        """Approve this task."""
        if self.status not in [WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS]:
            raise ValueError(f"Cannot approve task in {self.status} status")
        self.status = WorkflowTaskStatus.APPROVED
        self.action_taken = 'APPROVE'
        self.comment = comment
        self.completed_at = timezone.now()
        self.save(update_fields=['status', 'action_taken', 'comment', 'completed_at', 'updated_at'])

    def reject(self, comment=''):
        """Reject this task."""
        if self.status not in [WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS]:
            raise ValueError(f"Cannot reject task in {self.status} status")
        self.status = WorkflowTaskStatus.REJECTED
        self.action_taken = 'REJECT'
        self.comment = comment
        self.completed_at = timezone.now()
        self.save(update_fields=['status', 'action_taken', 'comment', 'completed_at', 'updated_at'])

    def delegate(self, to_user, comment=''):
        """Delegate this task to another user."""
        if self.status not in [WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS]:
            raise ValueError(f"Cannot delegate task in {self.status} status")

        # Create a new task for the delegatee
        new_task = WorkflowTask.objects.create(
            workflow=self.workflow,
            step_order=self.step_order,
            step_name=self.step_name,
            step_type=self.step_type,
            assigned_to=to_user,
            delegated_from=self.assigned_to,
            due_date=self.due_date,
            comment=comment
        )

        # Mark this task as delegated
        self.status = WorkflowTaskStatus.DELEGATED
        self.action_taken = 'DELEGATE'
        self.comment = comment
        self.completed_at = timezone.now()
        self.save(update_fields=['status', 'action_taken', 'comment', 'completed_at', 'updated_at'])

        return new_task

    def mark_as_read(self):
        """Mark the task as read."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at', 'updated_at'])

    @property
    def is_overdue(self):
        """Check if the task is overdue."""
        if self.due_date and self.status in [
            WorkflowTaskStatus.PENDING,
            WorkflowTaskStatus.IN_PROGRESS
        ]:
            return timezone.now() > self.due_date
        return False


class WorkflowComment(models.Model):
    """
    Comments on workflow instances or tasks.

    Allows users to discuss workflow progress without taking formal action.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Can be attached to instance or specific task
    workflow = models.ForeignKey(
        WorkflowInstance,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    task = models.ForeignKey(
        WorkflowTask,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='comments'
    )

    # Comment content
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='workflow_comments'
    )
    content = models.TextField()

    # Mentions (JSON array of user IDs)
    mentions = models.JSONField(
        default=list,
        blank=True,
        help_text='User IDs mentioned in this comment'
    )

    # Tracking
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_edited = models.BooleanField(default=False)

    class Meta:
        db_table = 'workflow_comments'
        verbose_name = 'Workflow Comment'
        verbose_name_plural = 'Workflow Comments'
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.author.username} on {self.workflow}"


class WorkflowAuditLog(models.Model):
    """
    Immutable audit trail for workflow actions.

    Captures all significant events in the workflow lifecycle.
    """

    ACTION_CHOICES = [
        ('CREATED', 'Workflow Created'),
        ('STARTED', 'Workflow Started'),
        ('TASK_ASSIGNED', 'Task Assigned'),
        ('TASK_APPROVED', 'Task Approved'),
        ('TASK_REJECTED', 'Task Rejected'),
        ('TASK_DELEGATED', 'Task Delegated'),
        ('TASK_ESCALATED', 'Task Escalated'),
        ('TASK_EXPIRED', 'Task Expired'),
        ('STEP_COMPLETED', 'Step Completed'),
        ('WORKFLOW_APPROVED', 'Workflow Approved'),
        ('WORKFLOW_REJECTED', 'Workflow Rejected'),
        ('WORKFLOW_CANCELLED', 'Workflow Cancelled'),
        ('WORKFLOW_EXPIRED', 'Workflow Expired'),
        ('COMMENT_ADDED', 'Comment Added'),
        ('REMINDER_SENT', 'Reminder Sent'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Workflow reference
    workflow = models.ForeignKey(
        WorkflowInstance,
        on_delete=models.CASCADE,
        related_name='audit_logs'
    )
    task = models.ForeignKey(
        WorkflowTask,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='audit_logs'
    )

    # Action details
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='workflow_audit_actions'
    )

    # Context
    details = models.TextField(blank=True, help_text='Human-readable description')
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional context (previous assignee, etc.)'
    )

    # Request info
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    # Timestamp
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'workflow_audit_logs'
        verbose_name = 'Workflow Audit Log'
        verbose_name_plural = 'Workflow Audit Logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['workflow', 'timestamp']),
            models.Index(fields=['actor', 'timestamp']),
            models.Index(fields=['action']),
        ]

    def __str__(self):
        actor_name = self.actor.username if self.actor else 'System'
        return f"{actor_name} - {self.action} - {self.timestamp}"

    def save(self, *args, **kwargs):
        """Only allow creation, not updates (immutable audit log)."""
        if not self._state.adding and self.pk is not None:
            raise ValueError("Workflow audit logs cannot be modified after creation")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """Prevent deletion of audit logs."""
        raise ValueError("Workflow audit logs cannot be deleted")

    @classmethod
    def log(cls, workflow, action, actor=None, task=None, details='',
            metadata=None, ip_address=None, user_agent=''):
        """Create an audit log entry."""
        return cls.objects.create(
            workflow=workflow,
            task=task,
            action=action,
            actor=actor,
            details=details,
            metadata=metadata or {},
            ip_address=ip_address,
            user_agent=user_agent
        )


class WorkflowAutoTriggerRule(models.Model):
    """
    Rules for automatically triggering workflows when documents are uploaded.

    This enables automatic workflow initiation based on document properties
    like type, folder location, department, or confidentiality level.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Multi-tenant organization
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='workflow_auto_trigger_rules',
        null=True,
        blank=True
    )

    # Rule details
    name = models.CharField(max_length=255, help_text='Rule name for identification')
    description = models.TextField(blank=True, help_text='Rule description')
    is_active = models.BooleanField(default=True, help_text='Whether this rule is active')

    # Workflow to trigger
    workflow_template = models.ForeignKey(
        WorkflowTemplate,
        on_delete=models.CASCADE,
        related_name='auto_trigger_rules',
        help_text='Workflow template to trigger when conditions are met'
    )

    # Trigger conditions (all must match for rule to apply)
    # Document types that trigger this rule (empty = all types)
    document_types = models.JSONField(
        default=list,
        blank=True,
        help_text='List of document types that trigger this rule (empty = all)'
    )

    # Folders that trigger this rule (empty = all folders)
    trigger_folders = models.ManyToManyField(
        'folders.Folder',
        blank=True,
        related_name='auto_trigger_rules',
        help_text='Folders where uploaded documents trigger this rule (empty = all)'
    )

    # Include subfolders when checking folder condition
    include_subfolders = models.BooleanField(
        default=True,
        help_text='Whether to include subfolders when checking folder condition'
    )

    # Departments that trigger this rule
    trigger_departments = models.ManyToManyField(
        'users.Department',
        blank=True,
        related_name='workflow_auto_trigger_rules',
        help_text='Departments whose documents trigger this rule (empty = all)'
    )

    # Confidentiality levels that trigger this rule (empty = all levels)
    confidentiality_levels = models.JSONField(
        default=list,
        blank=True,
        help_text='Confidentiality levels that trigger this rule (empty = all)'
    )

    # File size thresholds (optional)
    min_file_size = models.BigIntegerField(
        null=True,
        blank=True,
        help_text='Minimum file size in bytes to trigger (null = no minimum)'
    )
    max_file_size = models.BigIntegerField(
        null=True,
        blank=True,
        help_text='Maximum file size in bytes to trigger (null = no maximum)'
    )

    # Additional conditions (JSON for flexible conditions)
    # Example: {"keywords": ["contract", "agreement"], "metadata_field": "value"}
    additional_conditions = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional JSON conditions for complex matching'
    )

    # Workflow settings when triggered
    default_priority = models.CharField(
        max_length=20,
        choices=WorkflowPriority.choices,
        default=WorkflowPriority.MEDIUM,
        help_text='Priority for auto-triggered workflows'
    )
    due_days_override = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Override default due days from template (null = use template default)'
    )
    auto_start = models.BooleanField(
        default=True,
        help_text='Automatically start the workflow (vs create in DRAFT status)'
    )

    # Processing order (lower = higher priority)
    priority = models.PositiveIntegerField(
        default=100,
        help_text='Rule priority (lower numbers are evaluated first)'
    )

    # Stop processing after this rule matches
    stop_processing = models.BooleanField(
        default=True,
        help_text='Stop evaluating other rules if this rule matches'
    )

    # Stats
    times_triggered = models.PositiveIntegerField(
        default=0,
        help_text='Number of times this rule has triggered'
    )
    last_triggered_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When this rule was last triggered'
    )

    # Tracking
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='created_auto_trigger_rules'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'workflow_auto_trigger_rules'
        verbose_name = 'Workflow Auto-Trigger Rule'
        verbose_name_plural = 'Workflow Auto-Trigger Rules'
        ordering = ['priority', '-created_at']
        indexes = [
            models.Index(fields=['is_active', 'priority']),
            models.Index(fields=['organization', 'is_active']),
        ]

    def __str__(self):
        return f"{self.name} -> {self.workflow_template.name}"

    def matches_document(self, document):
        """
        Check if this rule matches a given document.

        Args:
            document: The Document instance to check

        Returns:
            bool: True if the document matches all rule conditions
        """
        if not self.is_active:
            return False

        # Check document type
        if self.document_types:
            if document.document_type not in self.document_types:
                return False

        # Check folder
        trigger_folder_ids = list(self.trigger_folders.values_list('id', flat=True))
        if trigger_folder_ids and document.folder:
            if self.include_subfolders:
                # Check if document folder is in or under any trigger folder
                folder_path = document.folder.path or ''
                trigger_folder_paths = list(
                    self.trigger_folders.values_list('path', flat=True)
                )
                if not any(
                    folder_path.startswith(tf_path) for tf_path in trigger_folder_paths
                ):
                    return False
            else:
                # Exact folder match
                if document.folder_id not in trigger_folder_ids:
                    return False
        elif trigger_folder_ids and not document.folder:
            return False

        # Check department
        trigger_dept_ids = list(self.trigger_departments.values_list('id', flat=True))
        if trigger_dept_ids:
            if not document.department or document.department_id not in trigger_dept_ids:
                return False

        # Check confidentiality level
        if self.confidentiality_levels:
            if document.confidentiality_level not in self.confidentiality_levels:
                return False

        # Check file size
        if self.min_file_size is not None:
            if not document.file_size or document.file_size < self.min_file_size:
                return False
        if self.max_file_size is not None:
            if document.file_size and document.file_size > self.max_file_size:
                return False

        # Check additional conditions
        if self.additional_conditions:
            # Check keywords in title
            keywords = self.additional_conditions.get('keywords', [])
            if keywords:
                title_lower = (document.title or '').lower()
                if not any(kw.lower() in title_lower for kw in keywords):
                    return False

            # Check metadata fields
            metadata_conditions = self.additional_conditions.get('metadata', {})
            doc_metadata = document.metadata or {}
            for key, expected_value in metadata_conditions.items():
                if doc_metadata.get(key) != expected_value:
                    return False

        return True

    def trigger_workflow(self, document, user=None):
        """
        Create and optionally start a workflow instance for the document.

        Args:
            document: The Document instance to create a workflow for
            user: The user who triggered this (defaults to document owner)

        Returns:
            WorkflowInstance: The created workflow instance
        """
        from django.utils import timezone

        initiator = user or document.owner or document.created_by

        # Calculate due date
        due_days = self.due_days_override or self.workflow_template.default_due_days
        due_date = timezone.now() + timezone.timedelta(days=due_days)

        # Create workflow instance
        instance = WorkflowInstance.objects.create(
            organization=self.organization,
            template=self.workflow_template,
            template_name=self.workflow_template.name,
            document=document,
            status=WorkflowInstanceStatus.DRAFT,
            priority=self.default_priority,
            due_date=due_date,
            initiated_by=initiator,
            notes=f"Auto-triggered by rule: {self.name}"
        )

        # Create tasks for the first step
        first_step = self.workflow_template.steps.filter(order=1).first()
        if first_step:
            # Get assignees for the step
            assignees = list(first_step.assigned_users.all())

            # If no specific users, try to get from department
            if not assignees and first_step.assigned_department:
                from apps.users.models import User
                assignees = list(
                    User.objects.filter(
                        department=first_step.assigned_department,
                        is_active=True
                    )[:5]  # Limit to prevent too many tasks
                )

            # Create tasks for each assignee
            for assignee in assignees:
                WorkflowTask.objects.create(
                    workflow=instance,
                    step_order=first_step.order,
                    step_name=first_step.name,
                    step_type=first_step.step_type,
                    assigned_to=assignee,
                    due_date=timezone.now() + timezone.timedelta(
                        hours=first_step.sla_hours or 24
                    )
                )

        # Auto-start if configured
        if self.auto_start:
            instance.start()

        # Create audit log
        WorkflowAuditLog.log(
            workflow=instance,
            action='CREATED',
            actor=initiator,
            details=f"Workflow auto-triggered by rule: {self.name}",
            metadata={
                'trigger_rule_id': str(self.id),
                'trigger_rule_name': self.name,
                'auto_started': self.auto_start
            }
        )

        # Update stats
        self.times_triggered += 1
        self.last_triggered_at = timezone.now()
        self.save(update_fields=['times_triggered', 'last_triggered_at'])

        # Update template usage stats
        self.workflow_template.times_used += 1
        self.workflow_template.save(update_fields=['times_used'])

        return instance


class ExternalAPIKey(models.Model):
    """
    API keys for external system integrations.

    Each key has a name, permissions scope, and optional rate limiting.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Organization (multi-tenant)
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='external_api_keys',
        null=True,
        blank=True
    )

    # Key identification
    name = models.CharField(max_length=255, help_text='Name for this API key')
    description = models.TextField(blank=True, help_text='Description of the integration')

    # The actual key (hashed for security)
    key_prefix = models.CharField(max_length=8, help_text='First 8 chars of key (for identification)')
    key_hash = models.CharField(max_length=64, help_text='SHA-256 hash of full key')

    # Permissions
    permissions = models.JSONField(
        default=list,
        help_text='List of allowed operations: read_workflows, write_workflows, trigger_workflows, etc.'
    )

    # Status
    is_active = models.BooleanField(default=True)

    # Rate limiting
    rate_limit_per_minute = models.PositiveIntegerField(
        default=60,
        help_text='Maximum requests per minute (0 = unlimited)'
    )

    # Tracking
    last_used_at = models.DateTimeField(null=True, blank=True)
    request_count = models.PositiveIntegerField(default=0)

    # IP whitelist (optional)
    allowed_ips = models.JSONField(
        default=list,
        blank=True,
        help_text='List of allowed IP addresses (empty = all allowed)'
    )

    # Webhook configuration
    webhook_url = models.URLField(
        blank=True,
        help_text='URL to receive webhook notifications'
    )
    webhook_secret = models.CharField(
        max_length=64,
        blank=True,
        help_text='Secret for webhook signature verification'
    )
    webhook_events = models.JSONField(
        default=list,
        help_text='Events to send to webhook: workflow.created, task.completed, etc.'
    )

    # Audit
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='created_api_keys'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'workflow_external_api_keys'
        verbose_name = 'External API Key'
        verbose_name_plural = 'External API Keys'
        indexes = [
            models.Index(fields=['key_prefix', 'is_active']),
            models.Index(fields=['organization', 'is_active']),
        ]

    def __str__(self):
        return f"{self.name} ({self.key_prefix}...)"

    @classmethod
    def generate_key(cls):
        """Generate a new API key."""
        key = f"dfc_{uuid.uuid4().hex}"
        return key

    @classmethod
    def hash_key(cls, key: str) -> str:
        """Hash an API key for storage."""
        import hashlib
        return hashlib.sha256(key.encode()).hexdigest()

    def verify_key(self, provided_key: str) -> bool:
        """Verify a provided key matches this record."""
        import hmac
        return hmac.compare_digest(
            self.key_hash,
            self.hash_key(provided_key)
        )

    def has_permission(self, permission: str) -> bool:
        """Check if this key has a specific permission."""
        if '*' in self.permissions:
            return True
        return permission in self.permissions

    def record_usage(self, ip_address: str = None):
        """Record API key usage."""
        self.last_used_at = timezone.now()
        self.request_count += 1
        self.save(update_fields=['last_used_at', 'request_count', 'updated_at'])

    def send_webhook(self, event: str, payload: dict):
        """Send a webhook notification for an event."""
        if not self.webhook_url or event not in self.webhook_events:
            return

        import requests
        import hmac
        import hashlib
        import json

        # Build webhook payload
        webhook_data = {
            'event': event,
            'timestamp': timezone.now().isoformat(),
            'api_key_id': str(self.id),
            'payload': payload
        }

        # Generate signature
        signature = hmac.new(
            self.webhook_secret.encode(),
            json.dumps(webhook_data, sort_keys=True).encode(),
            hashlib.sha256
        ).hexdigest()

        headers = {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': event,
        }

        try:
            response = requests.post(
                self.webhook_url,
                json=webhook_data,
                headers=headers,
                timeout=10
            )
            response.raise_for_status()
        except Exception as e:
            # Log webhook failure but don't raise
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Webhook delivery failed for {self.name}: {e}")
