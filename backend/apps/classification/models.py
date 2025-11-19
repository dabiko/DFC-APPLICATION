"""
Classification models for automatic document classification.

This module provides models for defining and managing classification rules
that automatically categorize, tag, and organize documents based on their
content, metadata, and file properties.
"""
from django.db import models
from django.core.exceptions import ValidationError
import logging

logger = logging.getLogger(__name__)


class ClassificationRule(models.Model):
    """
    Auto-classification rules for documents.

    Rules consist of conditions that must be met and actions to apply
    when conditions match. Rules are executed in priority order.

    Conditions can match on:
    - Filename patterns
    - Content keywords
    - File type (MIME type)
    - Current document type
    - File size
    - Department

    Actions can:
    - Move document to specific folder
    - Set/change document type
    - Add tags
    - Set confidentiality level
    - Assign to department

    Example Rule:
        name: "Auto-classify Invoices"
        conditions: {
            'filename_contains': ['invoice', 'inv-'],
            'content_contains': ['total', 'amount', 'payment'],
            'file_type': 'application/pdf'
        }
        actions: {
            'set_document_type': 'INVOICE',
            'add_tags': ['finance', 'billing'],
            'move_to_folder': '<folder_uuid>'
        }
    """

    name = models.CharField(
        max_length=200,
        help_text="Descriptive name for the classification rule"
    )

    description = models.TextField(
        blank=True,
        help_text="Detailed description of what this rule does and when it applies"
    )

    priority = models.IntegerField(
        default=0,
        help_text="Execution priority (higher values execute first). Use to control rule order."
    )

    is_active = models.BooleanField(
        default=True,
        help_text="Whether this rule is currently active and should be applied"
    )

    # Conditions (JSON structure)
    conditions = models.JSONField(
        default=dict,
        help_text="""
        Conditions that must be met for rule to apply. Structure:
        {
            'filename_contains': ['keyword1', 'keyword2'],  # Any keyword in filename
            'content_contains': ['text1', 'text2'],  # Any keyword in extracted text
            'file_type': 'application/pdf',  # Exact MIME type match
            'document_type': 'UNCLASSIFIED',  # Current document type
            'min_file_size_mb': 5.0,  # Minimum file size in MB
            'max_file_size_mb': 100.0,  # Maximum file size in MB
            'department_id': 5  # Specific department
        }
        All specified conditions must match (AND logic).
        """
    )

    # Actions (JSON structure)
    actions = models.JSONField(
        default=dict,
        help_text="""
        Actions to apply when conditions match. Structure:
        {
            'move_to_folder': '<folder_uuid>',  # Move to specific folder
            'set_document_type': 'INVOICE',  # Set document type
            'add_tags': ['finance', 'urgent'],  # Add these tags
            'set_confidentiality': 'CONFIDENTIAL',  # Set confidentiality level
            'assign_to_department': 5  # Assign to department ID
        }
        """
    )

    # Statistics
    applied_count = models.IntegerField(
        default=0,
        help_text="Number of times this rule has been applied"
    )

    last_applied_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last time this rule was successfully applied"
    )

    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.PROTECT,
        related_name='created_classification_rules'
    )

    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_classification_rules'
    )

    class Meta:
        db_table = 'classification_rules'
        ordering = ['-priority', 'name']
        indexes = [
            models.Index(fields=['is_active', '-priority']),
            models.Index(fields=['created_at']),
        ]
        verbose_name = 'Classification Rule'
        verbose_name_plural = 'Classification Rules'

    def __str__(self):
        status = "Active" if self.is_active else "Inactive"
        return f"{self.name} [{status}] (Priority: {self.priority})"

    def clean(self):
        """
        Validate rule conditions and actions.
        """
        # Validate conditions structure
        if not isinstance(self.conditions, dict):
            raise ValidationError("Conditions must be a dictionary")

        valid_condition_keys = {
            'filename_contains', 'content_contains', 'file_type',
            'document_type', 'min_file_size_mb', 'max_file_size_mb',
            'department_id'
        }

        invalid_conditions = set(self.conditions.keys()) - valid_condition_keys
        if invalid_conditions:
            raise ValidationError(
                f"Invalid condition keys: {invalid_conditions}. "
                f"Valid keys are: {valid_condition_keys}"
            )

        # Validate actions structure
        if not isinstance(self.actions, dict):
            raise ValidationError("Actions must be a dictionary")

        valid_action_keys = {
            'move_to_folder', 'set_document_type', 'add_tags',
            'set_confidentiality', 'assign_to_department'
        }

        invalid_actions = set(self.actions.keys()) - valid_action_keys
        if invalid_actions:
            raise ValidationError(
                f"Invalid action keys: {invalid_actions}. "
                f"Valid keys are: {valid_action_keys}"
            )

        # Validate at least one action is specified
        if not self.actions:
            raise ValidationError("At least one action must be specified")

    def increment_applied_count(self):
        """
        Increment the counter tracking how many times this rule was applied.
        """
        from django.utils import timezone
        self.applied_count += 1
        self.last_applied_at = timezone.now()
        self.save(update_fields=['applied_count', 'last_applied_at'])


class ClassificationLog(models.Model):
    """
    Audit log for classification rule applications.

    Tracks when and how classification rules are applied to documents,
    providing an audit trail for automatic document organization.
    """

    rule = models.ForeignKey(
        ClassificationRule,
        on_delete=models.CASCADE,
        related_name='application_logs'
    )

    document = models.ForeignKey(
        'documents.Document',
        on_delete=models.CASCADE,
        related_name='classification_logs'
    )

    applied_at = models.DateTimeField(auto_now_add=True)

    conditions_matched = models.JSONField(
        help_text="Which conditions were matched for this application"
    )

    actions_applied = models.JSONField(
        help_text="Which actions were successfully applied"
    )

    success = models.BooleanField(
        default=True,
        help_text="Whether the rule application was successful"
    )

    error_message = models.TextField(
        blank=True,
        help_text="Error message if application failed"
    )

    triggered_by = models.CharField(
        max_length=50,
        default='auto',
        help_text="How this classification was triggered (auto, manual, bulk)"
    )

    class Meta:
        db_table = 'classification_logs'
        ordering = ['-applied_at']
        indexes = [
            models.Index(fields=['document', '-applied_at']),
            models.Index(fields=['rule', '-applied_at']),
            models.Index(fields=['applied_at']),
        ]
        verbose_name = 'Classification Log'
        verbose_name_plural = 'Classification Logs'

    def __str__(self):
        status = "Success" if self.success else "Failed"
        return f"{self.rule.name} -> {self.document.title} [{status}]"
