"""
Signals for the Procedures app.
Syncs procedure state when workflow tasks are approved/rejected.
Matches PROCEDURE_DEVELOPMENT_GUIDE.md B.9.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.contenttypes.models import ContentType

from apps.workflows.models import WorkflowTask, WorkflowTaskStatus, WorkflowInstance, WorkflowInstanceStatus
from .models import Procedure


@receiver(post_save, sender=WorkflowTask)
def sync_procedure_state_on_task_update(sender, instance, **kwargs):
    """
    When a WorkflowTask is approved/rejected, check if the parent
    WorkflowInstance targets a Procedure and update its state accordingly.

    Important: step-level "request changes" sets the task back to PENDING
    (action_taken='CHANGES_REQUESTED'), NOT to REJECTED.  Only procedure-level
    rejections (via the workflow take-action endpoint) use REJECTED status.
    This prevents a single step revision request from killing the entire workflow.
    """
    workflow = instance.workflow

    # Only handle procedure workflows
    if not hasattr(workflow, 'target_content_type'):
        return

    procedure_ct = ContentType.objects.get_for_model(Procedure)
    if workflow.target_content_type != procedure_ct:
        return

    # Only process if the task was just completed (approved or rejected)
    if instance.status not in [WorkflowTaskStatus.APPROVED, WorkflowTaskStatus.REJECTED]:
        return

    # Only act when the workflow is still active
    if workflow.status not in [WorkflowInstanceStatus.ACTIVE, WorkflowInstanceStatus.PENDING]:
        return

    tasks = workflow.tasks.all()

    # A REJECTED task from a procedure-level reviewer (step_order=2 or
    # step_name='Procedure Review') means the overall review is rejected.
    # Step-level "request changes" should NOT use REJECTED status; instead
    # the step_review_action sets them to PENDING with action_taken=CHANGES_REQUESTED.
    rejected_tasks = tasks.filter(status=WorkflowTaskStatus.REJECTED)
    if rejected_tasks.exists():
        workflow.complete(approved=False, reason='Rejected by reviewer')
        try:
            procedure = Procedure.objects.get(id=workflow.target_object_id)
            procedure.state = Procedure.State.DRAFT
            procedure.save(update_fields=['state', 'updated_at'])
        except Procedure.DoesNotExist:
            pass
        return

    # All tasks resolved and none rejected -> approved
    pending = tasks.filter(
        status__in=[WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS]
    ).exists()

    if not pending:
        workflow.complete(approved=True)
        try:
            procedure = Procedure.objects.get(id=workflow.target_object_id)
            procedure.state = Procedure.State.APPROVED
            procedure.save(update_fields=['state', 'updated_at'])
        except Procedure.DoesNotExist:
            pass
