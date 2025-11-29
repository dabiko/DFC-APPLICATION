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


# =============================================================================
# ML Classification Models (Phase 1: ML-Powered Classification)
# =============================================================================

class MLClassificationModel(models.Model):
    """
    Stores trained ML classification models.

    Supports multiple model types for different classification targets
    (document_type, confidentiality, department, etc.).

    Model versioning allows rollback and A/B testing of models.
    """

    class ModelType(models.TextChoices):
        DOCUMENT_TYPE = 'document_type', 'Document Type'
        CONFIDENTIALITY = 'confidentiality', 'Confidentiality Level'
        DEPARTMENT = 'department', 'Department'
        CUSTOM = 'custom', 'Custom Classification'

    class ModelStatus(models.TextChoices):
        TRAINING = 'training', 'Training'
        READY = 'ready', 'Ready'
        ACTIVE = 'active', 'Active'
        DEPRECATED = 'deprecated', 'Deprecated'
        FAILED = 'failed', 'Failed'

    name = models.CharField(
        max_length=200,
        help_text="Descriptive name for the model"
    )

    model_type = models.CharField(
        max_length=50,
        choices=ModelType.choices,
        default=ModelType.DOCUMENT_TYPE,
        help_text="What this model classifies"
    )

    version = models.CharField(
        max_length=50,
        help_text="Model version (e.g., 1.0.0, 2024-11-29)"
    )

    status = models.CharField(
        max_length=20,
        choices=ModelStatus.choices,
        default=ModelStatus.TRAINING,
        help_text="Current status of the model"
    )

    # Model storage - pickled model binary stored in file system
    model_file_path = models.CharField(
        max_length=500,
        blank=True,
        help_text="Path to the serialized model file (.pkl)"
    )

    # Vectorizer storage for text feature extraction
    vectorizer_file_path = models.CharField(
        max_length=500,
        blank=True,
        help_text="Path to the serialized vectorizer file (.pkl)"
    )

    # Model configuration
    algorithm = models.CharField(
        max_length=100,
        default='multinomial_nb',
        help_text="ML algorithm used (e.g., multinomial_nb, random_forest, svm)"
    )

    hyperparameters = models.JSONField(
        default=dict,
        blank=True,
        help_text="Model hyperparameters used during training"
    )

    # Feature configuration
    feature_config = models.JSONField(
        default=dict,
        blank=True,
        help_text="""
        Feature extraction configuration:
        {
            'use_filename': True,
            'use_content': True,
            'use_file_type': True,
            'max_features': 5000,
            'ngram_range': [1, 2]
        }
        """
    )

    # Training metadata
    training_samples = models.IntegerField(
        default=0,
        help_text="Number of samples used for training"
    )

    training_classes = models.JSONField(
        default=list,
        help_text="List of classes the model can predict"
    )

    training_started_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When training started"
    )

    training_completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When training completed"
    )

    training_duration_seconds = models.FloatField(
        null=True,
        blank=True,
        help_text="Training duration in seconds"
    )

    # Performance metrics
    accuracy = models.FloatField(
        null=True,
        blank=True,
        help_text="Model accuracy on test set (0.0 - 1.0)"
    )

    precision = models.FloatField(
        null=True,
        blank=True,
        help_text="Model precision (weighted average)"
    )

    recall = models.FloatField(
        null=True,
        blank=True,
        help_text="Model recall (weighted average)"
    )

    f1_score = models.FloatField(
        null=True,
        blank=True,
        help_text="Model F1 score (weighted average)"
    )

    confusion_matrix = models.JSONField(
        default=dict,
        blank=True,
        help_text="Confusion matrix as JSON"
    )

    classification_report = models.JSONField(
        default=dict,
        blank=True,
        help_text="Detailed classification report per class"
    )

    # Usage statistics
    predictions_count = models.IntegerField(
        default=0,
        help_text="Total predictions made with this model"
    )

    correct_predictions = models.IntegerField(
        default=0,
        help_text="Predictions confirmed as correct by users"
    )

    last_used_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last time this model made a prediction"
    )

    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.PROTECT,
        related_name='created_ml_models'
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ml_classification_models'
        ordering = ['-created_at']
        unique_together = ['model_type', 'version']
        indexes = [
            models.Index(fields=['model_type', 'status']),
            models.Index(fields=['status', '-created_at']),
        ]
        verbose_name = 'ML Classification Model'
        verbose_name_plural = 'ML Classification Models'

    def __str__(self):
        return f"{self.name} v{self.version} ({self.get_status_display()})"

    @classmethod
    def get_active_model(cls, model_type):
        """Get the currently active model for a given type."""
        return cls.objects.filter(
            model_type=model_type,
            status=cls.ModelStatus.ACTIVE
        ).first()

    def activate(self):
        """Activate this model and deactivate others of the same type."""
        # Deactivate other models of the same type
        MLClassificationModel.objects.filter(
            model_type=self.model_type,
            status=self.ModelStatus.ACTIVE
        ).update(status=self.ModelStatus.READY)

        # Activate this model
        self.status = self.ModelStatus.ACTIVE
        self.save(update_fields=['status', 'updated_at'])

    def increment_predictions(self, correct=None):
        """Increment prediction counters."""
        from django.utils import timezone
        self.predictions_count += 1
        self.last_used_at = timezone.now()

        if correct is True:
            self.correct_predictions += 1

        self.save(update_fields=['predictions_count', 'correct_predictions', 'last_used_at'])

    @property
    def production_accuracy(self):
        """Calculate accuracy based on user feedback in production."""
        if self.predictions_count == 0:
            return None
        return self.correct_predictions / self.predictions_count


class ClassificationPrediction(models.Model):
    """
    Stores ML classification predictions for documents.

    Records predictions with confidence scores for the three-tier system:
    - High confidence (>95%): Auto-apply
    - Medium confidence (85-95%): Suggest, user confirms
    - Low confidence (<85%): Require manual classification

    Tracks user feedback for self-learning capability.
    """

    class ConfidenceLevel(models.TextChoices):
        HIGH = 'high', 'High (Auto-apply)'
        MEDIUM = 'medium', 'Medium (Suggest)'
        LOW = 'low', 'Low (Manual required)'

    class ReviewStatus(models.TextChoices):
        PENDING = 'pending', 'Pending Review'
        AUTO_APPLIED = 'auto_applied', 'Auto Applied'
        CONFIRMED = 'confirmed', 'User Confirmed'
        CORRECTED = 'corrected', 'User Corrected'
        REJECTED = 'rejected', 'User Rejected'

    document = models.ForeignKey(
        'documents.Document',
        on_delete=models.CASCADE,
        related_name='ml_predictions'
    )

    model = models.ForeignKey(
        MLClassificationModel,
        on_delete=models.SET_NULL,
        null=True,
        related_name='predictions'
    )

    # Prediction details
    predicted_class = models.CharField(
        max_length=100,
        help_text="The predicted classification"
    )

    confidence_score = models.FloatField(
        help_text="Confidence score (0.0 - 1.0)"
    )

    confidence_level = models.CharField(
        max_length=20,
        choices=ConfidenceLevel.choices,
        help_text="Confidence tier for routing"
    )

    # All class probabilities for transparency
    class_probabilities = models.JSONField(
        default=dict,
        help_text="Probability distribution across all classes"
    )

    # Review status
    review_status = models.CharField(
        max_length=20,
        choices=ReviewStatus.choices,
        default=ReviewStatus.PENDING,
        help_text="Current review status"
    )

    # User feedback
    user_correction = models.CharField(
        max_length=100,
        blank=True,
        help_text="The correct class if user corrected the prediction"
    )

    reviewed_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_predictions'
    )

    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the prediction was reviewed"
    )

    # Actions taken
    actions_applied = models.JSONField(
        default=dict,
        blank=True,
        help_text="Actions that were applied based on this prediction"
    )

    # Feature data (for debugging and retraining)
    feature_snapshot = models.JSONField(
        default=dict,
        blank=True,
        help_text="Snapshot of features used for this prediction"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'classification_predictions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['review_status', '-created_at']),
            models.Index(fields=['confidence_level', '-created_at']),
            models.Index(fields=['document', '-created_at']),
            models.Index(fields=['model', '-created_at']),
        ]
        verbose_name = 'Classification Prediction'
        verbose_name_plural = 'Classification Predictions'

    def __str__(self):
        return f"{self.document.title} -> {self.predicted_class} ({self.confidence_score:.1%})"

    def save(self, *args, **kwargs):
        # Auto-calculate confidence level based on score
        if self.confidence_score >= 0.95:
            self.confidence_level = self.ConfidenceLevel.HIGH
        elif self.confidence_score >= 0.85:
            self.confidence_level = self.ConfidenceLevel.MEDIUM
        else:
            self.confidence_level = self.ConfidenceLevel.LOW
        super().save(*args, **kwargs)

    def confirm(self, user):
        """User confirms the prediction was correct."""
        from django.utils import timezone
        self.review_status = self.ReviewStatus.CONFIRMED
        self.reviewed_by = user
        self.reviewed_at = timezone.now()
        self.save()

        # Update model accuracy tracking
        if self.model:
            self.model.increment_predictions(correct=True)

    def correct(self, user, correct_class):
        """User provides the correct classification."""
        from django.utils import timezone
        self.review_status = self.ReviewStatus.CORRECTED
        self.user_correction = correct_class
        self.reviewed_by = user
        self.reviewed_at = timezone.now()
        self.save()

        # Create training feedback for self-learning
        TrainingFeedback.objects.create(
            document=self.document,
            prediction=self,
            original_prediction=self.predicted_class,
            corrected_class=correct_class,
            feedback_source='user_correction',
            provided_by=user
        )

    def reject(self, user):
        """User rejects the prediction entirely."""
        from django.utils import timezone
        self.review_status = self.ReviewStatus.REJECTED
        self.reviewed_by = user
        self.reviewed_at = timezone.now()
        self.save()


class TrainingFeedback(models.Model):
    """
    Collects user feedback for model retraining (self-learning).

    Feedback sources:
    - User corrections to predictions
    - Manual classifications
    - Batch labeling by admins

    Used by the retraining pipeline to improve model accuracy.
    """

    class FeedbackSource(models.TextChoices):
        USER_CORRECTION = 'user_correction', 'User Correction'
        MANUAL_CLASSIFICATION = 'manual_classification', 'Manual Classification'
        BATCH_LABELING = 'batch_labeling', 'Batch Labeling'
        RULE_BASED = 'rule_based', 'From Rule-Based System'

    document = models.ForeignKey(
        'documents.Document',
        on_delete=models.CASCADE,
        related_name='training_feedback'
    )

    prediction = models.ForeignKey(
        ClassificationPrediction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='feedback',
        help_text="The prediction that was corrected (if applicable)"
    )

    # Classification target (what are we training for)
    classification_target = models.CharField(
        max_length=50,
        default='document_type',
        help_text="Which field this feedback is for (document_type, confidentiality, etc.)"
    )

    # The correct classification
    original_prediction = models.CharField(
        max_length=100,
        blank=True,
        help_text="What the model predicted (if applicable)"
    )

    corrected_class = models.CharField(
        max_length=100,
        help_text="The correct classification"
    )

    # Source and metadata
    feedback_source = models.CharField(
        max_length=30,
        choices=FeedbackSource.choices,
        default=FeedbackSource.USER_CORRECTION
    )

    provided_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        related_name='provided_feedback'
    )

    # Feature snapshot for training
    feature_text = models.TextField(
        blank=True,
        help_text="Combined text features used for training"
    )

    # Processing status
    used_in_training = models.BooleanField(
        default=False,
        help_text="Whether this feedback has been used in model retraining"
    )

    trained_model = models.ForeignKey(
        MLClassificationModel,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='training_feedback_used',
        help_text="The model that was trained with this feedback"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'training_feedback'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['used_in_training', '-created_at']),
            models.Index(fields=['classification_target', '-created_at']),
            models.Index(fields=['corrected_class']),
        ]
        verbose_name = 'Training Feedback'
        verbose_name_plural = 'Training Feedback'

    def __str__(self):
        if self.original_prediction:
            return f"{self.original_prediction} -> {self.corrected_class}"
        return f"Label: {self.corrected_class}"


class ClassificationSettings(models.Model):
    """
    Global settings for the ML classification system.

    Singleton model - only one instance should exist.
    Controls thresholds, auto-apply behavior, and retraining schedule.
    """

    # Confidence thresholds (three-tier system)
    high_confidence_threshold = models.FloatField(
        default=0.95,
        help_text="Threshold for auto-apply (default: 0.95 = 95%)"
    )

    medium_confidence_threshold = models.FloatField(
        default=0.85,
        help_text="Threshold for suggestion (default: 0.85 = 85%)"
    )

    # Auto-apply settings
    auto_apply_enabled = models.BooleanField(
        default=True,
        help_text="Whether to auto-apply high confidence predictions"
    )

    auto_apply_document_type = models.BooleanField(
        default=True,
        help_text="Auto-apply document type classification"
    )

    auto_apply_confidentiality = models.BooleanField(
        default=False,
        help_text="Auto-apply confidentiality classification (more sensitive)"
    )

    auto_apply_department = models.BooleanField(
        default=False,
        help_text="Auto-apply department assignment"
    )

    # Retraining settings
    auto_retrain_enabled = models.BooleanField(
        default=True,
        help_text="Whether to automatically retrain models"
    )

    retrain_threshold = models.IntegerField(
        default=100,
        help_text="Minimum new feedback items before triggering retrain"
    )

    retrain_schedule = models.CharField(
        max_length=50,
        default='weekly',
        help_text="Retraining schedule (daily, weekly, monthly)"
    )

    min_training_samples = models.IntegerField(
        default=50,
        help_text="Minimum samples required to train a model"
    )

    # Notification settings
    notify_on_low_confidence = models.BooleanField(
        default=True,
        help_text="Send notifications for low confidence predictions"
    )

    notify_on_model_retrain = models.BooleanField(
        default=True,
        help_text="Send notifications when models are retrained"
    )

    # Feature extraction settings
    max_text_length = models.IntegerField(
        default=10000,
        help_text="Maximum characters of text to use for classification"
    )

    include_filename = models.BooleanField(
        default=True,
        help_text="Include filename in features"
    )

    include_file_type = models.BooleanField(
        default=True,
        help_text="Include file type in features"
    )

    # Audit
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_classification_settings'
    )

    class Meta:
        db_table = 'classification_settings'
        verbose_name = 'Classification Settings'
        verbose_name_plural = 'Classification Settings'

    def __str__(self):
        return "ML Classification Settings"

    def save(self, *args, **kwargs):
        # Ensure only one instance exists (singleton)
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        """Get or create the singleton settings instance."""
        settings, _ = cls.objects.get_or_create(pk=1)
        return settings
