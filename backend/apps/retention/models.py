from django.conf import settings
from django.db import models


class RetentionPolicy(models.Model):
    """
    Document retention policies defining how long documents should be retained.

    Features:
    - Configurable retention periods
    - Document type or folder-based application
    - Auto-delete capability with notifications
    - Grace period before deletion
    """
    name = models.CharField(max_length=200)
    description = models.TextField()
    retention_period_years = models.IntegerField(
        help_text='Number of years to retain documents'
    )

    # Policy application rules
    applies_to_document_type = models.CharField(
        max_length=100,
        blank=True,
        help_text='Document type this policy applies to (empty = all types)'
    )
    applies_to_folder = models.ForeignKey(
        'folders.Folder',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='retention_policies'
    )

    # Deletion behavior
    auto_delete = models.BooleanField(
        default=False,
        help_text='Automatically delete documents after retention period'
    )
    notification_days_before = models.IntegerField(
        default=30,
        help_text='Days before deletion to notify document owner'
    )

    # Status
    is_active = models.BooleanField(default=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='retention_policies_created'
    )

    class Meta:
        db_table = 'retention_policies'
        verbose_name = 'Retention Policy'
        verbose_name_plural = 'Retention Policies'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.retention_period_years} years)"


class LegalHold(models.Model):
    """
    Legal hold on documents preventing deletion or modification.

    Features:
    - Case number tracking
    - Start/end date management
    - Multiple documents per hold
    - Prevents all deletion/modification
    - Audit trail of hold actions
    """
    case_number = models.CharField(max_length=100, unique=True)
    title = models.CharField(max_length=500)
    reason = models.TextField(
        help_text='Legal reason for placing documents on hold'
    )

    # Duration
    start_date = models.DateField()
    end_date = models.DateField(
        null=True,
        blank=True,
        help_text='NULL = indefinite hold'
    )

    # Status
    is_active = models.BooleanField(default=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='legal_holds_created'
    )
    released_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name='legal_holds_released'
    )
    released_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'legal_holds'
        verbose_name = 'Legal Hold'
        verbose_name_plural = 'Legal Holds'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.case_number} - {self.title}"


class LegalHoldDocument(models.Model):
    """
    Many-to-many relationship tracking documents under legal hold.

    Features:
    - Tracks when hold was placed
    - Tracks who placed the hold
    - Prevents document deletion
    """
    legal_hold = models.ForeignKey(
        LegalHold,
        on_delete=models.CASCADE,
        related_name='held_documents'
    )
    document = models.ForeignKey(
        'documents.Document',
        on_delete=models.CASCADE,
        related_name='legal_holds'
    )

    # Metadata
    placed_at = models.DateTimeField(auto_now_add=True)
    placed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='legal_hold_documents_placed'
    )

    class Meta:
        db_table = 'legal_hold_documents'
        verbose_name = 'Legal Hold Document'
        verbose_name_plural = 'Legal Hold Documents'
        unique_together = ['legal_hold', 'document']
        ordering = ['placed_at']

    def __str__(self):
        return f"{self.legal_hold.case_number} - {self.document.title}"
