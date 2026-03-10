"""
Models for Procedure Management & Training system.

19 models matching PROCEDURE_IMPLEMENTATION_SPEC.md:
- Core: Procedure, ProcedureStep, StepAttachment
- Versioning: ProcedureVersion, ProcedureVersionStep, VersionStepAttachment
- Quiz (Draft): Quiz, Question, AnswerOption
- Quiz (Versioned): VersionQuiz, VersionQuestion, VersionAnswerOption
- Review: ProcedureStepComment
- Training: ProcedureAssignment, TrainingAttempt, StepCompletion, QuizAttempt, QuestionResponse
- Audit: ProcedureAuditLog
"""

import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone


# ---------------------------------------------------------------------------
# CORE MODELS (Spec 2.1 - 2.3)
# ---------------------------------------------------------------------------

class Procedure(models.Model):
    """
    Top-level procedure entity. Contains metadata and tracks
    the current lifecycle state of the working draft.
    """

    class State(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        IN_REVIEW = 'in_review', 'In Review'
        APPROVED = 'approved', 'Approved'
        PUBLISHED = 'published', 'Published'
        RETIRED = 'retired', 'Retired'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='procedures',
    )
    title = models.CharField(max_length=500)
    description = models.TextField()
    parent_procedure = models.ForeignKey(
        'self', null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='children',
    )
    state = models.CharField(max_length=20, choices=State.choices, default=State.DRAFT)
    current_version = models.PositiveIntegerField(default=0)  # 0 = never published

    # Ownership
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='created_procedures',
    )
    department = models.ForeignKey(
        'users.Department',
        on_delete=models.CASCADE,
        related_name='procedures',
    )

    # Tags
    tags = models.JSONField(default=list, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Soft delete
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
    )

    class Meta:
        db_table = 'procedures'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['organization', 'state']),
            models.Index(fields=['department']),
            models.Index(fields=['created_by']),
        ]

    def __str__(self):
        return f'{self.title} (v{self.current_version})'


class ProcedureStep(models.Model):
    """
    A single step in a procedure. Steps belong to the working draft
    and are snapshotted into ProcedureVersionStep on publish.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    procedure = models.ForeignKey(
        Procedure,
        on_delete=models.CASCADE,
        related_name='steps',
    )
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField()
    estimated_duration_minutes = models.PositiveIntegerField(null=True, blank=True)

    # Conditional branching (null = always shown)
    branch_condition = models.JSONField(null=True, blank=True)

    # Progression gates
    require_manual_open = models.BooleanField(default=False)
    require_media_completion = models.BooleanField(default=False)
    require_quiz_pass = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'procedure_steps'
        ordering = ['order']
        unique_together = [['procedure', 'order']]

    def __str__(self):
        return f'Step {self.order}: {self.title}'


class StepAttachment(models.Model):
    """
    A file (manual, video, document) attached to a procedure step.
    Linked to the step in the working draft. Snapshotted on publish.
    """

    class AttachmentType(models.TextChoices):
        MANUAL = 'manual', 'Manual'
        VIDEO = 'video', 'Video'
        IMAGE = 'image', 'Image'
        TEMPLATE = 'template', 'Template'
        REFERENCE = 'reference', 'Reference Document'

    ALLOWED_EXTENSIONS = [
        'pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt',
        'png', 'jpg', 'jpeg', 'gif', 'svg',
        'mp4', 'webm', 'ogg', 'mp3',
        'txt', 'csv', 'json',
    ]

    MAX_FILE_SIZE_MB = 100

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    step = models.ForeignKey(
        ProcedureStep,
        on_delete=models.CASCADE,
        related_name='attachments',
    )
    attachment_type = models.CharField(max_length=20, choices=AttachmentType.choices)
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='procedures/attachments/%Y/%m/', blank=True)
    file_name = models.CharField(max_length=255, blank=True)
    file_size = models.PositiveBigIntegerField(default=0)  # bytes
    file_extension = models.CharField(max_length=10, blank=True)
    mime_type = models.CharField(max_length=100, blank=True)
    checksum_sha256 = models.CharField(max_length=64, blank=True)
    order = models.PositiveIntegerField(default=0)

    # Link to an existing DFC document instead of uploading a new file
    document_reference = models.ForeignKey(
        'documents.Document',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='step_attachment_links',
        help_text='If set, this attachment links to an existing document (file field will be blank).',
    )

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='+',
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'procedure_step_attachments'
        ordering = ['order']

    def clean(self):
        from django.core.exceptions import ValidationError
        if not self.file and not self.document_reference_id:
            raise ValidationError('Either a file or a document reference must be provided.')
        if self.file and self.document_reference_id:
            raise ValidationError('Cannot have both a file and a document reference.')

    @property
    def is_linked(self):
        return self.document_reference_id is not None

    def __str__(self):
        return self.title


# ---------------------------------------------------------------------------
# VERSIONING MODELS (Spec 2.4 - 2.6)
# ---------------------------------------------------------------------------

class ProcedureVersion(models.Model):
    """
    Immutable snapshot created when a procedure is published.
    Once created, no field may be modified except 'is_active'.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    procedure = models.ForeignKey(
        Procedure,
        on_delete=models.CASCADE,
        related_name='versions',
    )
    version_number = models.PositiveIntegerField()
    title = models.CharField(max_length=500)
    description = models.TextField()
    tags = models.JSONField(default=list)

    # Publication control
    published_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='+',
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='+',
    )
    published_at = models.DateTimeField(auto_now_add=True)
    effective_from = models.DateField()
    expires_on = models.DateField()

    # Approval metadata
    approval_comment = models.TextField(blank=True)

    # Changelog from previous version
    changelog = models.TextField(blank=True)

    # State
    is_active = models.BooleanField(default=True)  # False when retired
    retired_at = models.DateTimeField(null=True, blank=True)
    retired_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
    )
    retirement_reason = models.TextField(blank=True)

    class Meta:
        db_table = 'procedure_versions'
        ordering = ['-version_number']
        unique_together = [['procedure', 'version_number']]

    def __str__(self):
        return f'{self.title} v{self.version_number}'


class ProcedureVersionStep(models.Model):
    """
    Immutable snapshot of a step at the time of publication.
    All training progress and evidence references point here.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    version = models.ForeignKey(
        ProcedureVersion,
        on_delete=models.CASCADE,
        related_name='steps',
    )
    original_step_id = models.UUIDField()  # Reference to source ProcedureStep
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField()
    estimated_duration_minutes = models.PositiveIntegerField(null=True, blank=True)

    # Branching snapshot
    branch_condition = models.JSONField(null=True, blank=True)

    # Gate requirements snapshot
    require_manual_open = models.BooleanField(default=False)
    require_media_completion = models.BooleanField(default=False)
    require_quiz_pass = models.BooleanField(default=False)

    class Meta:
        db_table = 'procedure_version_steps'
        ordering = ['order']

    def __str__(self):
        return f'v{self.version.version_number} Step {self.order}: {self.title}'


class VersionStepAttachment(models.Model):
    """
    Immutable copy of a step attachment at publish time.
    The file reference points to the exact file stored in MinIO.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    version_step = models.ForeignKey(
        ProcedureVersionStep,
        on_delete=models.CASCADE,
        related_name='attachments',
    )
    original_attachment_id = models.UUIDField()
    attachment_type = models.CharField(max_length=20)
    title = models.CharField(max_length=255)
    file = models.FileField(blank=True)  # Points to same MinIO object — immutable reference
    file_name = models.CharField(max_length=255, blank=True)
    file_size = models.PositiveBigIntegerField(default=0)
    file_extension = models.CharField(max_length=10, blank=True)
    mime_type = models.CharField(max_length=100, blank=True)
    checksum_sha256 = models.CharField(max_length=64, blank=True)
    order = models.PositiveIntegerField(default=0)

    # Preserved link to an existing DFC document
    document_reference = models.ForeignKey(
        'documents.Document',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
    )

    class Meta:
        db_table = 'version_step_attachments'
        ordering = ['order']

    @property
    def is_linked(self):
        return self.document_reference_id is not None

    def __str__(self):
        return self.title


# ---------------------------------------------------------------------------
# QUIZ MODELS — DRAFT (Spec 2.7)
# ---------------------------------------------------------------------------

class Quiz(models.Model):
    """
    A quiz attached to a step or to the end of a procedure.
    When attached to a step, the step's require_quiz_pass gate
    enforces passing before the trainee can advance.
    """

    class QuizType(models.TextChoices):
        STEP_LEVEL = 'step_level', 'Step Level'
        END_OF_PROCEDURE = 'end_of_procedure', 'End of Procedure'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    procedure = models.ForeignKey(
        Procedure,
        on_delete=models.CASCADE,
        related_name='quizzes',
    )
    step = models.ForeignKey(
        ProcedureStep,
        null=True, blank=True,
        on_delete=models.CASCADE,
        related_name='quizzes',
    )
    quiz_type = models.CharField(max_length=20, choices=QuizType.choices)
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)

    # Pass criteria
    passing_score_percent = models.PositiveIntegerField(default=80)
    max_attempts = models.PositiveIntegerField(default=3)  # 0 = unlimited
    time_limit_minutes = models.PositiveIntegerField(null=True, blank=True)
    shuffle_questions = models.BooleanField(default=False)
    shuffle_answers = models.BooleanField(default=False)
    show_correct_answers_after = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'procedure_quizzes'
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(quiz_type='step_level', step__isnull=False)
                    | models.Q(quiz_type='end_of_procedure', step__isnull=True)
                ),
                name='quiz_step_consistency',
            ),
        ]

    def __str__(self):
        return self.title


class Question(models.Model):
    """A single question in a quiz."""

    class QuestionType(models.TextChoices):
        MULTIPLE_CHOICE = 'multiple_choice', 'Multiple Choice'
        MULTI_SELECT = 'multi_select', 'Multi Select'
        TRUE_FALSE = 'true_false', 'True/False'
        SHORT_ANSWER = 'short_answer', 'Short Answer'
        ORDERING = 'ordering', 'Ordering'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name='questions',
    )
    question_type = models.CharField(max_length=20, choices=QuestionType.choices)
    text = models.TextField()
    explanation = models.TextField(blank=True)
    order = models.PositiveIntegerField()
    points = models.PositiveIntegerField(default=1)
    is_mandatory = models.BooleanField(default=False)

    # For short_answer: keywords for auto-grading (null = manual grade)
    auto_grade_keywords = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = 'procedure_quiz_questions'
        ordering = ['order']

    def __str__(self):
        return f'Q{self.order}: {self.text[:60]}'


class AnswerOption(models.Model):
    """An answer option for multiple_choice, multi_select, true_false, or ordering questions."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name='options',
    )
    text = models.TextField()
    is_correct = models.BooleanField(default=False)
    correct_order = models.PositiveIntegerField(null=True, blank=True)  # For ordering questions
    order = models.PositiveIntegerField()  # Display order

    class Meta:
        db_table = 'procedure_answer_options'
        ordering = ['order']

    def __str__(self):
        return f'{"+" if self.is_correct else "-"} {self.text[:60]}'


# ---------------------------------------------------------------------------
# QUIZ MODELS — VERSIONED / IMMUTABLE (Spec 2.8)
# ---------------------------------------------------------------------------

class VersionQuiz(models.Model):
    """Immutable quiz snapshot for a published version."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    version = models.ForeignKey(
        ProcedureVersion,
        on_delete=models.CASCADE,
        related_name='quizzes',
    )
    version_step = models.ForeignKey(
        ProcedureVersionStep,
        null=True, blank=True,
        on_delete=models.CASCADE,
        related_name='quizzes',
    )
    original_quiz_id = models.UUIDField()
    quiz_type = models.CharField(max_length=20)
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    passing_score_percent = models.PositiveIntegerField()
    max_attempts = models.PositiveIntegerField()
    time_limit_minutes = models.PositiveIntegerField(null=True, blank=True)
    shuffle_questions = models.BooleanField()
    shuffle_answers = models.BooleanField()
    show_correct_answers_after = models.BooleanField()

    class Meta:
        db_table = 'version_quizzes'

    def __str__(self):
        return f'v{self.version.version_number} {self.title}'


class VersionQuestion(models.Model):
    """Immutable question snapshot."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    version_quiz = models.ForeignKey(
        VersionQuiz,
        on_delete=models.CASCADE,
        related_name='questions',
    )
    original_question_id = models.UUIDField()
    question_type = models.CharField(max_length=20)
    text = models.TextField()
    explanation = models.TextField(blank=True)
    order = models.PositiveIntegerField()
    points = models.PositiveIntegerField()
    is_mandatory = models.BooleanField()
    auto_grade_keywords = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = 'version_quiz_questions'
        ordering = ['order']

    def __str__(self):
        return f'Q{self.order}: {self.text[:60]}'


class VersionAnswerOption(models.Model):
    """Immutable answer option snapshot."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    version_question = models.ForeignKey(
        VersionQuestion,
        on_delete=models.CASCADE,
        related_name='options',
    )
    original_option_id = models.UUIDField()
    text = models.TextField()
    is_correct = models.BooleanField()
    correct_order = models.PositiveIntegerField(null=True, blank=True)
    order = models.PositiveIntegerField()

    class Meta:
        db_table = 'version_answer_options'
        ordering = ['order']

    def __str__(self):
        return f'{"+" if self.is_correct else "-"} {self.text[:60]}'


# ---------------------------------------------------------------------------
# REVIEW MODEL (Spec 2.9.4)
# ---------------------------------------------------------------------------

class ProcedureStepComment(models.Model):
    """
    Per-step comment thread during procedure review.
    References the WorkflowInstance (review) and a specific ProcedureStep.
    General (non-step-specific) comments go through WorkflowComment.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow_instance = models.ForeignKey(
        'workflows.WorkflowInstance',
        on_delete=models.CASCADE,
        related_name='procedure_step_comments',
    )
    step = models.ForeignKey(
        ProcedureStep,
        on_delete=models.CASCADE,
        related_name='review_comments',
    )
    parent_comment = models.ForeignKey(
        'self', null=True, blank=True,
        on_delete=models.CASCADE,
        related_name='replies',
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='+',
    )
    body = models.TextField()
    is_resolved = models.BooleanField(default=False)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'procedure_step_comments'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['workflow_instance', 'step']),
        ]

    def __str__(self):
        return f'Comment by {self.author} on {self.step}'


# ---------------------------------------------------------------------------
# TRAINING MODELS (Spec 2.10)
# ---------------------------------------------------------------------------

class ProcedureAssignment(models.Model):
    """
    Assigns a published procedure version to a user.
    Each assignment tracks one user's obligation.
    """

    class AssignmentStatus(models.TextChoices):
        ASSIGNED = 'assigned', 'Assigned'
        IN_PROGRESS = 'in_progress', 'In Progress'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'
        OVERDUE = 'overdue', 'Overdue'
        WAIVED = 'waived', 'Waived'

    class AssignmentSource(models.TextChoices):
        DIRECT = 'direct', 'Direct Assignment'
        DEPARTMENT = 'department', 'Department Assignment'
        ROLE = 'role', 'Role Assignment'
        RECERTIFICATION = 'recertification', 'Auto Re-certification'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='procedure_assignments',
    )
    procedure_version = models.ForeignKey(
        ProcedureVersion,
        on_delete=models.CASCADE,
        related_name='assignments',
    )
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='procedure_assignments',
    )

    # Assignment metadata
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='+',
    )
    assignment_source = models.CharField(
        max_length=20,
        choices=AssignmentSource.choices,
        default=AssignmentSource.DIRECT,
    )
    status = models.CharField(
        max_length=20,
        choices=AssignmentStatus.choices,
        default=AssignmentStatus.ASSIGNED,
    )
    due_date = models.DateField()
    assigned_at = models.DateTimeField(auto_now_add=True)

    # Completion
    completed_at = models.DateTimeField(null=True, blank=True)
    completion_score = models.DecimalField(
        max_digits=5, decimal_places=2,
        null=True, blank=True,
    )

    # Reminder tracking
    last_reminder_sent = models.DateTimeField(null=True, blank=True)
    reminder_count = models.PositiveIntegerField(default=0)

    # Waiver
    waived_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
    )
    waiver_reason = models.TextField(blank=True)
    waived_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'procedure_assignments'
        ordering = ['-assigned_at']
        indexes = [
            models.Index(fields=['assignee', 'status']),
            models.Index(fields=['due_date']),
            models.Index(fields=['organization', 'status']),
        ]

    def __str__(self):
        return f'{self.assignee} -> {self.procedure_version}'


class TrainingAttempt(models.Model):
    """
    One complete attempt at a procedure assignment.
    A user may have multiple attempts if they fail and retry.
    """

    class AttemptStatus(models.TextChoices):
        IN_PROGRESS = 'in_progress', 'In Progress'
        COMPLETED = 'completed', 'Completed'
        PASSED = 'passed', 'Passed'
        FAILED = 'failed', 'Failed'
        ABANDONED = 'abandoned', 'Abandoned'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assignment = models.ForeignKey(
        ProcedureAssignment,
        on_delete=models.CASCADE,
        related_name='attempts',
    )
    attempt_number = models.PositiveIntegerField()
    status = models.CharField(
        max_length=20,
        choices=AttemptStatus.choices,
        default=AttemptStatus.IN_PROGRESS,
    )

    # Progress
    current_step = models.ForeignKey(
        ProcedureVersionStep,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
    )
    steps_completed = models.PositiveIntegerField(default=0)
    total_steps = models.PositiveIntegerField()

    # Timing
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    total_time_seconds = models.PositiveIntegerField(default=0)

    # Scoring
    total_score = models.DecimalField(
        max_digits=5, decimal_places=2,
        null=True, blank=True,
    )
    passed_all_mandatory = models.BooleanField(default=False)

    # Context for branching evaluation
    trainee_context = models.JSONField(default=dict)

    class Meta:
        db_table = 'training_attempts'
        ordering = ['attempt_number']
        unique_together = [['assignment', 'attempt_number']]

    def __str__(self):
        return f'Attempt #{self.attempt_number} ({self.status})'


class StepCompletion(models.Model):
    """
    Tracks a trainee's interaction with a single step within an attempt.
    Granular evidence for compliance auditing.
    """

    class StepEvent(models.TextChoices):
        NOT_STARTED = 'not_started', 'Not Started'
        STARTED = 'started', 'Started'
        VIEWED = 'viewed', 'Viewed'
        MANUAL_OPENED = 'manual_opened', 'Manual Opened'
        MEDIA_COMPLETED = 'media_completed', 'Media Completed'
        QUIZ_PASSED = 'quiz_passed', 'Quiz Passed'
        QUIZ_FAILED = 'quiz_failed', 'Quiz Failed'
        COMPLETED = 'completed', 'Completed'
        SKIPPED = 'skipped', 'Skipped'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attempt = models.ForeignKey(
        TrainingAttempt,
        on_delete=models.CASCADE,
        related_name='step_completions',
    )
    version_step = models.ForeignKey(
        ProcedureVersionStep,
        on_delete=models.CASCADE,
        related_name='completions',
    )
    status = models.CharField(
        max_length=20,
        choices=StepEvent.choices,
        default=StepEvent.NOT_STARTED,
    )

    # Timing
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    time_spent_seconds = models.PositiveIntegerField(default=0)

    # Manual interaction tracking
    manual_opened_at = models.DateTimeField(null=True, blank=True)
    media_completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'step_completions'
        unique_together = [['attempt', 'version_step']]
        ordering = ['version_step__order']

    def __str__(self):
        return f'{self.status} - {self.version_step.title}'


class QuizAttempt(models.Model):
    """A trainee's attempt at a specific quiz within a training attempt."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    training_attempt = models.ForeignKey(
        TrainingAttempt,
        on_delete=models.CASCADE,
        related_name='quiz_attempts',
    )
    version_quiz = models.ForeignKey(
        VersionQuiz,
        on_delete=models.CASCADE,
        related_name='attempts',
    )
    attempt_number = models.PositiveIntegerField()

    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    time_spent_seconds = models.PositiveIntegerField(default=0)

    score_earned = models.PositiveIntegerField(default=0)
    score_possible = models.PositiveIntegerField(default=0)
    score_percent = models.DecimalField(
        max_digits=5, decimal_places=2,
        null=True, blank=True,
    )
    passed = models.BooleanField(default=False)
    passed_all_mandatory = models.BooleanField(default=False)

    class Meta:
        db_table = 'quiz_attempts'
        ordering = ['attempt_number']

    def __str__(self):
        return f'Quiz: {self.version_quiz.title} - {"Pass" if self.passed else "Fail"}'


class QuestionResponse(models.Model):
    """A trainee's answer to a single question."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz_attempt = models.ForeignKey(
        QuizAttempt,
        on_delete=models.CASCADE,
        related_name='responses',
    )
    version_question = models.ForeignKey(
        VersionQuestion,
        on_delete=models.CASCADE,
        related_name='responses',
    )

    # For multiple_choice / multi_select / true_false
    selected_options = models.ManyToManyField(
        VersionAnswerOption,
        blank=True,
        related_name='+',
    )

    # For short_answer
    text_response = models.TextField(blank=True)

    # For ordering
    submitted_order = models.JSONField(null=True, blank=True)

    # Grading
    is_correct = models.BooleanField(null=True)  # null = pending manual grade
    points_earned = models.PositiveIntegerField(default=0)
    graded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
    )
    graded_at = models.DateTimeField(null=True, blank=True)

    answered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'question_responses'

    def __str__(self):
        mark = '+' if self.is_correct else ('-' if self.is_correct is False else '?')
        return f'{mark} Q{self.version_question.order}'


# ---------------------------------------------------------------------------
# AUDIT MODEL (Spec 2.11)
# ---------------------------------------------------------------------------

class ProcedureAuditLog(models.Model):
    """
    Immutable, append-only audit log for all procedure-related events.
    """

    class Action(models.TextChoices):
        # Lifecycle
        CREATED = 'created', 'Created'
        UPDATED = 'updated', 'Updated'
        SUBMITTED_FOR_REVIEW = 'submitted_for_review', 'Submitted for Review'
        REVIEW_APPROVED = 'review_approved', 'Review Approved'
        REVIEW_REJECTED = 'review_rejected', 'Review Rejected'
        PUBLISHED = 'published', 'Published'
        RETIRED = 'retired', 'Retired'
        DELETED = 'deleted', 'Deleted'

        # Steps
        STEP_ADDED = 'step_added', 'Step Added'
        STEP_UPDATED = 'step_updated', 'Step Updated'
        STEP_DELETED = 'step_deleted', 'Step Deleted'
        STEP_REORDERED = 'step_reordered', 'Steps Reordered'

        # Attachments
        ATTACHMENT_UPLOADED = 'attachment_uploaded', 'Attachment Uploaded'
        ATTACHMENT_DELETED = 'attachment_deleted', 'Attachment Deleted'

        # Quiz
        QUIZ_CREATED = 'quiz_created', 'Quiz Created'
        QUIZ_UPDATED = 'quiz_updated', 'Quiz Updated'
        QUIZ_DELETED = 'quiz_deleted', 'Quiz Deleted'

        # Review
        REVIEW_COMMENT_ADDED = 'review_comment_added', 'Review Comment Added'
        REVIEW_COMMENT_RESOLVED = 'review_comment_resolved', 'Review Comment Resolved'

        # Assignment
        ASSIGNED = 'assigned', 'Assigned'
        ASSIGNMENT_WAIVED = 'assignment_waived', 'Assignment Waived'

        # Training
        TRAINING_STARTED = 'training_started', 'Training Started'
        TRAINING_COMPLETED = 'training_completed', 'Training Completed'
        TRAINING_FAILED = 'training_failed', 'Training Failed'
        STEP_COMPLETED = 'step_completed', 'Step Completed'
        QUIZ_ATTEMPTED = 'quiz_attempted', 'Quiz Attempted'
        QUIZ_PASSED = 'quiz_passed', 'Quiz Passed'
        QUIZ_FAILED = 'quiz_failed', 'Quiz Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='+',
    )
    action = models.CharField(max_length=30, choices=Action.choices)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='+',
    )
    timestamp = models.DateTimeField(auto_now_add=True)

    # Target references (nullable — not all actions apply to all)
    procedure = models.ForeignKey(
        Procedure,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
    )
    version = models.ForeignKey(
        ProcedureVersion,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
    )
    step_id = models.UUIDField(null=True, blank=True)
    assignment = models.ForeignKey(
        ProcedureAssignment,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
    )

    # Context
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    detail = models.JSONField(default=dict)

    class Meta:
        db_table = 'procedure_audit_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['organization', 'action']),
            models.Index(fields=['procedure', '-timestamp']),
            models.Index(fields=['actor', '-timestamp']),
        ]

    def __str__(self):
        return f'{self.action} by {self.actor} at {self.timestamp}'
