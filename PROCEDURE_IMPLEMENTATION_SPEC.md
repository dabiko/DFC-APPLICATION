# Procedure Management & Training — Complete Implementation Specification

**Version**: 2.0
**Date**: 2026-03-09
**Status**: Ready for Development
**Scope**: Full implementation — nothing deferred
**v2 Change**: Integrated procedure review with existing Workflows app via GenericForeignKey refactor

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Data Models](#2-data-models)
3. [API Endpoints](#3-api-endpoints)
4. [Lifecycle & State Machine](#4-lifecycle--state-machine)
5. [Authoring Module](#5-authoring-module)
6. [Conditional Branching Engine](#6-conditional-branching-engine)
7. [Review & Publish Module](#7-review--publish-module)
8. [Version Diffing](#8-version-diffing)
9. [Quiz & Knowledge Check Module](#9-quiz--knowledge-check-module)
10. [Training Delivery Module](#10-training-delivery-module)
11. [Assignment & Tracking Module](#11-assignment--tracking-module)
12. [Evidence & Compliance Module](#12-evidence--compliance-module)
13. [Notifications & Reminders](#13-notifications--reminders)
14. [Security & Multi-Tenant Isolation](#14-security--multi-tenant-isolation)
15. [Celery Tasks](#15-celery-tasks)
16. [Frontend Pages & Components](#16-frontend-pages--components)
17. [Roles & Permissions](#17-roles--permissions)
18. [Seed Data & Testing](#18-seed-data--testing)
19. [Migration Strategy](#19-migration-strategy)

---

## 1. Architecture Overview

### Two-App Architecture: procedures (new) + workflows (modified)

This implementation touches **two** Django apps:

```
backend/apps/workflows/     ← EXISTING app, MODIFIED
  └── models.py             ← WorkflowInstance gets GenericForeignKey refactor
                               (replaces document FK with generic target)
                               All other workflow models remain unchanged.

backend/apps/procedures/    ← NEW app
  └── models.py             ← All procedure-specific models (steps, quizzes,
                               training, assignments, evidence, step comments)
                               Does NOT contain any review/approval models —
                               those live in the workflows app.
```

**How they interact:**

```
┌─────────────────────────────┐         ┌──────────────────────────────────┐
│  procedures app (NEW)       │         │  workflows app (EXISTING)        │
│                             │         │                                  │
│  Procedure                  │ ──────► │  WorkflowInstance                │
│  ProcedureStep              │ creates │    target = Procedure (GFK)      │
│  StepAttachment             │         │  WorkflowTask (per reviewer)     │
│  Quiz, Question, Answer     │         │  WorkflowComment (general)       │
│  ProcedureStepComment ◄─────│─────────│  WorkflowAuditLog (review trail) │
│    (per-step comments,      │  refs   │                                  │
│     workflow has no concept  │         │  Also still serves:              │
│     of procedure steps)     │         │    Document workflows (existing) │
│                             │         │    Any future target types        │
│  ProcedureVersion           │         └──────────────────────────────────┘
│  ProcedureVersionStep       │
│  VersionStepAttachment      │
│  VersionQuiz/Question/Ans   │
│  ProcedureAssignment        │
│  TrainingAttempt             │
│  StepCompletion             │
│  QuizAttempt                │
│  QuestionResponse           │
│  ProcedureAuditLog          │
└─────────────────────────────┘
```

**Key principle**: The procedures app **imports from and creates objects in** the workflows app.
It never duplicates workflow models. When a Creator submits a procedure for review, the
procedures app calls `WorkflowInstance.objects.create(target=procedure)` and
`WorkflowTask.objects.create(workflow=instance, assigned_to=reviewer)`. Reviewers then
use the existing workflow UI (WorkflowCenterPage) to approve/reject. The only review-related
model in the procedures app is `ProcedureStepComment`, because per-step feedback is a
procedure-specific concept that the generic workflow engine doesn't handle.

### New App: `procedures`

Location: `backend/apps/procedures/`

```
backend/apps/procedures/
├── __init__.py
├── admin.py
├── apps.py
├── models.py              # All procedure-specific models (NO review/approval models)
├── serializers.py         # DRF serializers
├── views.py               # API viewsets (includes submit_for_review which creates workflow objects)
├── urls.py                # URL routing
├── signals.py             # Audit logging + workflow completion → procedure state sync
├── tasks.py               # Celery async tasks
├── permissions.py         # Custom DRF permission classes
├── filters.py             # Django-filter filtersets
├── utils.py               # Branching evaluator, diff engine, scoring
├── constants.py           # Enums, choices, defaults
├── tests/
│   ├── __init__.py
│   ├── test_models.py
│   ├── test_views.py
│   ├── test_serializers.py
│   ├── test_branching.py
│   ├── test_quiz.py
│   ├── test_lifecycle.py
│   ├── test_workflow_integration.py   # Tests for workflow ↔ procedure state sync
│   └── test_tasks.py
└── migrations/
    └── __init__.py
```

### Modified App: `workflows`

Location: `backend/apps/workflows/` (already exists)

Changes:
- `WorkflowInstance.document` FK → replaced with `target_content_type` + `target_object_id` (GenericForeignKey)
- Added `target_title` (denormalized for display)
- Added helper properties: `target_type`, `is_document_workflow`, `is_procedure_workflow`
- All existing code referencing `instance.document` updated to use the GFK
- **No new models added** to the workflows app
- 3-step data migration (see Section 2.9.2)

### Integration Points

| System | Integration |
|--------|------------|
| **Workflows app** | `WorkflowInstance` (target=Procedure via GFK), `WorkflowTask`, `WorkflowComment`, `WorkflowAuditLog` — procedures app **imports from and creates objects in** the workflows app for review/approval. No duplication. |
| **Users app** | `CustomUser`, `Department` for assignments and ownership |
| **Documents app** | `Document` model for manual/file attachments |
| **Permissions app** | `Role`, `UserRole` for RBAC enforcement |
| **Audit app** | `AuditLog` for immutable event logging |
| **Sharing app** | `Notification` model for in-app notifications |
| **Organizations app** | `Organization` for multi-tenant isolation |
| **Celery** | Reminder cadence, expiry checks, re-certification generation |
| **MinIO** | File storage for step attachments via django-storages |

---

## 2. Data Models

### 2.1 Procedure

The top-level container for a procedure.

```python
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
    organization = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE, related_name='procedures')
    title = models.CharField(max_length=500)
    description = models.TextField()
    parent_procedure = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='children')
    state = models.CharField(max_length=20, choices=State.choices, default=State.DRAFT)
    current_version = models.PositiveIntegerField(default=0)  # 0 = never published

    # Ownership
    created_by = models.ForeignKey('users.CustomUser', on_delete=models.PROTECT, related_name='created_procedures')
    department = models.ForeignKey('users.Department', on_delete=models.CASCADE, related_name='procedures')

    # Tags
    tags = models.JSONField(default=list, blank=True)  # ["onboarding", "compliance"]

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Soft delete
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey('users.CustomUser', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')

    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['organization', 'state']),
            models.Index(fields=['department']),
            models.Index(fields=['created_by']),
        ]
```

### 2.2 ProcedureStep

Individual steps within a procedure's working draft.

```python
class ProcedureStep(models.Model):
    """
    A single step in a procedure. Steps belong to the working draft
    and are snapshotted into ProcedureVersionStep on publish.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    procedure = models.ForeignKey(Procedure, on_delete=models.CASCADE, related_name='steps')
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField()
    estimated_duration_minutes = models.PositiveIntegerField(null=True, blank=True)

    # Conditional branching (null = always shown)
    branch_condition = models.JSONField(null=True, blank=True)
    # Example: {"field": "role", "operator": "in", "value": ["loan_officer", "credit_analyst"]}
    # Example: {"field": "step_result", "step_id": "<uuid>", "operator": "eq", "value": "passed"}

    # Progression gate
    require_manual_open = models.BooleanField(default=False)
    require_media_completion = models.BooleanField(default=False)
    require_quiz_pass = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order']
        unique_together = [['procedure', 'order']]
```

### 2.3 StepAttachment

Files/manuals bound to a step.

```python
class StepAttachment(models.Model):
    """
    A file (manual, video, document) attached to a procedure step.
    Linked to the step in the working draft. Snapshotted on publish
    so published versions always reference the exact file.
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
    step = models.ForeignKey(ProcedureStep, on_delete=models.CASCADE, related_name='attachments')
    attachment_type = models.CharField(max_length=20, choices=AttachmentType.choices)
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='procedures/attachments/%Y/%m/')
    file_name = models.CharField(max_length=255)
    file_size = models.PositiveBigIntegerField()  # bytes
    file_extension = models.CharField(max_length=10)
    mime_type = models.CharField(max_length=100)
    checksum_sha256 = models.CharField(max_length=64)
    order = models.PositiveIntegerField(default=0)

    uploaded_by = models.ForeignKey('users.CustomUser', on_delete=models.PROTECT, related_name='+')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order']
```

### 2.4 ProcedureVersion

Immutable snapshot of a published procedure.

```python
class ProcedureVersion(models.Model):
    """
    Immutable snapshot created when a procedure is published.
    Contains complete metadata at the time of publication.
    Once created, no field on this model may be modified
    except 'is_active' (for retirement).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    procedure = models.ForeignKey(Procedure, on_delete=models.CASCADE, related_name='versions')
    version_number = models.PositiveIntegerField()
    title = models.CharField(max_length=500)
    description = models.TextField()
    tags = models.JSONField(default=list)

    # Publication control
    published_by = models.ForeignKey('users.CustomUser', on_delete=models.PROTECT, related_name='+')
    approved_by = models.ForeignKey('users.CustomUser', on_delete=models.PROTECT, related_name='+')
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
    retired_by = models.ForeignKey('users.CustomUser', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    retirement_reason = models.TextField(blank=True)

    class Meta:
        ordering = ['-version_number']
        unique_together = [['procedure', 'version_number']]
```

### 2.5 ProcedureVersionStep

Immutable snapshot of a step within a published version.

```python
class ProcedureVersionStep(models.Model):
    """
    Immutable snapshot of a step at the time of publication.
    All training progress and evidence references point here,
    never to the mutable ProcedureStep.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    version = models.ForeignKey(ProcedureVersion, on_delete=models.CASCADE, related_name='steps')
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
        ordering = ['order']
```

### 2.6 VersionStepAttachment

Immutable snapshot of an attachment within a published step.

```python
class VersionStepAttachment(models.Model):
    """
    Immutable copy of a step attachment at publish time.
    The file reference (file field) points to the exact file
    stored in MinIO — it is never overwritten or replaced.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    version_step = models.ForeignKey(ProcedureVersionStep, on_delete=models.CASCADE, related_name='attachments')
    original_attachment_id = models.UUIDField()
    attachment_type = models.CharField(max_length=20)
    title = models.CharField(max_length=255)
    file = models.FileField()  # Points to same MinIO object — immutable reference
    file_name = models.CharField(max_length=255)
    file_size = models.PositiveBigIntegerField()
    file_extension = models.CharField(max_length=10)
    mime_type = models.CharField(max_length=100)
    checksum_sha256 = models.CharField(max_length=64)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']
```

### 2.7 Quiz & Knowledge Checks

```python
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
    procedure = models.ForeignKey(Procedure, on_delete=models.CASCADE, related_name='quizzes')
    step = models.ForeignKey(ProcedureStep, null=True, blank=True, on_delete=models.CASCADE, related_name='quizzes')
    quiz_type = models.CharField(max_length=20, choices=QuizType.choices)
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)

    # Pass criteria
    passing_score_percent = models.PositiveIntegerField(default=80)  # 0-100
    max_attempts = models.PositiveIntegerField(default=3)  # 0 = unlimited
    time_limit_minutes = models.PositiveIntegerField(null=True, blank=True)  # null = no limit
    shuffle_questions = models.BooleanField(default=False)
    shuffle_answers = models.BooleanField(default=False)
    show_correct_answers_after = models.BooleanField(default=True)

    # Mandatory questions (must all be answered correctly regardless of score)
    # Tracked via Question.is_mandatory field

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            # step_level quizzes must have a step; end_of_procedure must not
            models.CheckConstraint(
                check=(
                    models.Q(quiz_type='step_level', step__isnull=False) |
                    models.Q(quiz_type='end_of_procedure', step__isnull=True)
                ),
                name='quiz_step_consistency'
            )
        ]


class Question(models.Model):
    """
    A single question in a quiz.
    """

    class QuestionType(models.TextChoices):
        MULTIPLE_CHOICE = 'multiple_choice', 'Multiple Choice'        # Single correct answer
        MULTI_SELECT = 'multi_select', 'Multi Select'                 # Multiple correct answers
        TRUE_FALSE = 'true_false', 'True/False'
        SHORT_ANSWER = 'short_answer', 'Short Answer'                 # Free text, manual or keyword grading
        ORDERING = 'ordering', 'Ordering'                             # Arrange items in correct order

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    question_type = models.CharField(max_length=20, choices=QuestionType.choices)
    text = models.TextField()
    explanation = models.TextField(blank=True)  # Shown after answering (if show_correct_answers_after)
    order = models.PositiveIntegerField()
    points = models.PositiveIntegerField(default=1)
    is_mandatory = models.BooleanField(default=False)  # Must be correct regardless of overall score

    # For short_answer: keywords that must appear for auto-grading (null = manual grade)
    auto_grade_keywords = models.JSONField(null=True, blank=True)
    # Example: ["AML", "anti-money laundering"]  — any match = correct

    class Meta:
        ordering = ['order']


class AnswerOption(models.Model):
    """
    An answer option for multiple_choice, multi_select, true_false, or ordering questions.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='options')
    text = models.TextField()
    is_correct = models.BooleanField(default=False)
    correct_order = models.PositiveIntegerField(null=True, blank=True)  # For ordering questions
    order = models.PositiveIntegerField()  # Display order

    class Meta:
        ordering = ['order']
```

### 2.8 Versioned Quiz Snapshots

Quizzes are also snapshotted on publish so published training always references the exact questions.

```python
class VersionQuiz(models.Model):
    """Immutable quiz snapshot for a published version."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    version = models.ForeignKey(ProcedureVersion, on_delete=models.CASCADE, related_name='quizzes')
    version_step = models.ForeignKey(ProcedureVersionStep, null=True, blank=True, on_delete=models.CASCADE, related_name='quizzes')
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


class VersionQuestion(models.Model):
    """Immutable question snapshot."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    version_quiz = models.ForeignKey(VersionQuiz, on_delete=models.CASCADE, related_name='questions')
    original_question_id = models.UUIDField()
    question_type = models.CharField(max_length=20)
    text = models.TextField()
    explanation = models.TextField(blank=True)
    order = models.PositiveIntegerField()
    points = models.PositiveIntegerField()
    is_mandatory = models.BooleanField()
    auto_grade_keywords = models.JSONField(null=True, blank=True)


class VersionAnswerOption(models.Model):
    """Immutable answer option snapshot."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    version_question = models.ForeignKey(VersionQuestion, on_delete=models.CASCADE, related_name='options')
    original_option_id = models.UUIDField()
    text = models.TextField()
    is_correct = models.BooleanField()
    correct_order = models.PositiveIntegerField(null=True, blank=True)
    order = models.PositiveIntegerField()
```

### 2.9 Review System — Integrated with Existing Workflows App

Instead of building a separate review system, procedure reviews are powered by the
existing `WorkflowInstance` / `WorkflowTask` / `WorkflowComment` / `WorkflowAuditLog`
models. This requires a one-time refactor of `WorkflowInstance` to support generic
targets (not just documents).

#### 2.9.1 WorkflowInstance Refactor (existing model change)

```python
# backend/apps/workflows/models.py — MODIFY WorkflowInstance

from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType

class WorkflowInstance(models.Model):
    # ... keep all existing fields EXCEPT replace `document` with generic target ...

    # REMOVE this:
    # document = models.ForeignKey('documents.Document', on_delete=models.CASCADE, related_name='workflow_instances')

    # ADD these (generic target — supports Document, Procedure, or any future model):
    target_content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        help_text='Type of the target object (Document, Procedure, etc.)'
    )
    target_object_id = models.UUIDField(
        help_text='UUID of the target object'
    )
    target = GenericForeignKey('target_content_type', 'target_object_id')

    # Denormalized for display (avoids resolving GFK in list queries)
    target_title = models.CharField(max_length=500, blank=True)

    # ... all other existing fields remain unchanged ...

    class Meta:
        # UPDATE indexes:
        indexes = [
            models.Index(fields=['status', 'due_date']),
            models.Index(fields=['target_content_type', 'target_object_id']),
            models.Index(fields=['initiated_by']),
        ]
```

#### 2.9.2 Migration Strategy for WorkflowInstance

This is a two-step migration to avoid data loss:

```
Migration 1 (add new fields):
  - Add target_content_type (nullable initially)
  - Add target_object_id (nullable initially)
  - Add target_title (blank)

Migration 2 (data migration):
  - For every existing WorkflowInstance:
      instance.target_content_type = ContentType.objects.get_for_model(Document)
      instance.target_object_id = instance.document_id
      instance.target_title = instance.document.title
  - Make target_content_type and target_object_id NOT NULL
  - Remove the old `document` FK column

Migration 3 (cleanup):
  - Drop old `document` column
  - Add new indexes
```

#### 2.9.3 Backward Compatibility

All existing workflow code that references `instance.document` must be updated to:

```python
# Before:
instance.document
instance.document.title

# After (for type-safe access):
if instance.target_content_type.model == 'document':
    document = instance.target  # GenericForeignKey resolves to Document
elif instance.target_content_type.model == 'procedure':
    procedure = instance.target  # GenericForeignKey resolves to Procedure

# Or use the denormalized title for display:
instance.target_title  # Always available, no extra query
```

Helper method to add to `WorkflowInstance`:

```python
@property
def target_type(self) -> str:
    """Return the model name of the target (e.g., 'document', 'procedure')."""
    return self.target_content_type.model

@property
def is_document_workflow(self) -> bool:
    return self.target_content_type.model == 'document'

@property
def is_procedure_workflow(self) -> bool:
    return self.target_content_type.model == 'procedure'
```

#### 2.9.4 ProcedureStepComment (procedure-specific — stays in procedures app)

Per-step comment threads are unique to procedures (the workflow engine has no concept
of procedure steps). This model stays in the procedures app and references the
WorkflowInstance for context.

```python
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
        related_name='procedure_step_comments'
    )
    step = models.ForeignKey(ProcedureStep, on_delete=models.CASCADE, related_name='review_comments')
    parent_comment = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='replies')
    author = models.ForeignKey('users.CustomUser', on_delete=models.PROTECT, related_name='+')
    body = models.TextField()
    is_resolved = models.BooleanField(default=False)
    resolved_by = models.ForeignKey('users.CustomUser', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['workflow_instance', 'step']),
        ]
```

#### 2.9.5 What Gets Reused vs What's New

| Concern | Source | Model |
|---------|--------|-------|
| Review instance (overall state) | **Reuse** workflows app | `WorkflowInstance` (target=Procedure) |
| Reviewer task (per-reviewer decision) | **Reuse** workflows app | `WorkflowTask` (approve/reject/delegate) |
| General comments | **Reuse** workflows app | `WorkflowComment` |
| Review audit trail | **Reuse** workflows app | `WorkflowAuditLog` |
| SLA tracking & escalation | **Reuse** workflows app | `WorkflowStep.sla_hours`, `escalation_hours` |
| Task delegation | **Reuse** workflows app | `WorkflowTask.delegate()` |
| Per-step comments | **New** procedures app | `ProcedureStepComment` |
| Step comment resolution | **New** procedures app | `ProcedureStepComment.is_resolved` |

### 2.10 Assignment & Training Progress

```python
class ProcedureAssignment(models.Model):
    """
    Assigns a published procedure version to a user (directly or
    via department/role). Each assignment tracks one user's obligation.
    """

    class AssignmentStatus(models.TextChoices):
        ASSIGNED = 'assigned', 'Assigned'
        IN_PROGRESS = 'in_progress', 'In Progress'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'           # Exhausted all attempts
        OVERDUE = 'overdue', 'Overdue'
        WAIVED = 'waived', 'Waived'           # Manually waived by admin

    class AssignmentSource(models.TextChoices):
        DIRECT = 'direct', 'Direct Assignment'
        DEPARTMENT = 'department', 'Department Assignment'
        ROLE = 'role', 'Role Assignment'
        RECERTIFICATION = 'recertification', 'Auto Re-certification'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE, related_name='procedure_assignments')
    procedure_version = models.ForeignKey(ProcedureVersion, on_delete=models.CASCADE, related_name='assignments')
    assignee = models.ForeignKey('users.CustomUser', on_delete=models.CASCADE, related_name='procedure_assignments')

    # Assignment metadata
    assigned_by = models.ForeignKey('users.CustomUser', on_delete=models.PROTECT, related_name='+')
    assignment_source = models.CharField(max_length=20, choices=AssignmentSource.choices, default=AssignmentSource.DIRECT)
    status = models.CharField(max_length=20, choices=AssignmentStatus.choices, default=AssignmentStatus.ASSIGNED)
    due_date = models.DateField()
    assigned_at = models.DateTimeField(auto_now_add=True)

    # Completion
    completed_at = models.DateTimeField(null=True, blank=True)
    completion_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)  # Overall score %

    # Reminder tracking
    last_reminder_sent = models.DateTimeField(null=True, blank=True)
    reminder_count = models.PositiveIntegerField(default=0)

    # Waiver
    waived_by = models.ForeignKey('users.CustomUser', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    waiver_reason = models.TextField(blank=True)
    waived_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-assigned_at']
        indexes = [
            models.Index(fields=['assignee', 'status']),
            models.Index(fields=['due_date']),
            models.Index(fields=['organization', 'status']),
        ]


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
    assignment = models.ForeignKey(ProcedureAssignment, on_delete=models.CASCADE, related_name='attempts')
    attempt_number = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=AttemptStatus.choices, default=AttemptStatus.IN_PROGRESS)

    # Progress
    current_step = models.ForeignKey(ProcedureVersionStep, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    steps_completed = models.PositiveIntegerField(default=0)
    total_steps = models.PositiveIntegerField()

    # Timing
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    total_time_seconds = models.PositiveIntegerField(default=0)

    # Scoring
    total_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)  # Percentage
    passed_all_mandatory = models.BooleanField(default=False)

    # Context for branching evaluation
    trainee_context = models.JSONField(default=dict)
    # Example: {"role": "loan_officer", "department": "credit"}
    # Populated from user profile at attempt creation

    class Meta:
        ordering = ['attempt_number']
        unique_together = [['assignment', 'attempt_number']]


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
        SKIPPED = 'skipped', 'Skipped'  # Branch condition was false

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attempt = models.ForeignKey(TrainingAttempt, on_delete=models.CASCADE, related_name='step_completions')
    version_step = models.ForeignKey(ProcedureVersionStep, on_delete=models.CASCADE, related_name='completions')
    status = models.CharField(max_length=20, choices=StepEvent.choices, default=StepEvent.NOT_STARTED)

    # Timing
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    time_spent_seconds = models.PositiveIntegerField(default=0)

    # Manual interaction tracking
    manual_opened_at = models.DateTimeField(null=True, blank=True)
    media_completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [['attempt', 'version_step']]
        ordering = ['version_step__order']


class QuizAttempt(models.Model):
    """
    A trainee's attempt at a specific quiz within a training attempt.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    training_attempt = models.ForeignKey(TrainingAttempt, on_delete=models.CASCADE, related_name='quiz_attempts')
    version_quiz = models.ForeignKey(VersionQuiz, on_delete=models.CASCADE, related_name='attempts')
    attempt_number = models.PositiveIntegerField()

    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    time_spent_seconds = models.PositiveIntegerField(default=0)

    score_earned = models.PositiveIntegerField(default=0)
    score_possible = models.PositiveIntegerField(default=0)
    score_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    passed = models.BooleanField(default=False)
    passed_all_mandatory = models.BooleanField(default=False)

    class Meta:
        ordering = ['attempt_number']


class QuestionResponse(models.Model):
    """
    A trainee's answer to a single question.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz_attempt = models.ForeignKey(QuizAttempt, on_delete=models.CASCADE, related_name='responses')
    version_question = models.ForeignKey(VersionQuestion, on_delete=models.CASCADE, related_name='responses')

    # For multiple_choice / multi_select / true_false
    selected_options = models.ManyToManyField(VersionAnswerOption, blank=True, related_name='+')

    # For short_answer
    text_response = models.TextField(blank=True)

    # For ordering
    submitted_order = models.JSONField(null=True, blank=True)  # [option_id, option_id, ...]

    # Grading
    is_correct = models.BooleanField(null=True)  # null = pending manual grade
    points_earned = models.PositiveIntegerField(default=0)
    graded_by = models.ForeignKey('users.CustomUser', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    graded_at = models.DateTimeField(null=True, blank=True)

    answered_at = models.DateTimeField(auto_now_add=True)
```

### 2.11 Procedure Audit Log

```python
class ProcedureAuditLog(models.Model):
    """
    Immutable, append-only audit log for all procedure-related events.
    Extends the system AuditLog with procedure-specific detail.
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
    organization = models.ForeignKey('organizations.Organization', on_delete=models.CASCADE, related_name='+')
    action = models.CharField(max_length=30, choices=Action.choices)
    actor = models.ForeignKey('users.CustomUser', on_delete=models.PROTECT, related_name='+')
    timestamp = models.DateTimeField(auto_now_add=True)

    # Target references (nullable — not all actions apply to all)
    procedure = models.ForeignKey(Procedure, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    version = models.ForeignKey(ProcedureVersion, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    step_id = models.UUIDField(null=True, blank=True)
    assignment = models.ForeignKey(ProcedureAssignment, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')

    # Context
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    detail = models.JSONField(default=dict)
    # Example detail: {"before": {...}, "after": {...}, "changed_fields": [...]}

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['organization', 'action']),
            models.Index(fields=['procedure', '-timestamp']),
            models.Index(fields=['actor', '-timestamp']),
        ]
```

### Model Count Summary

| Category | Models | Count |
|----------|--------|-------|
| Core | Procedure, ProcedureStep, StepAttachment | 3 |
| Versioning | ProcedureVersion, ProcedureVersionStep, VersionStepAttachment | 3 |
| Quiz (Draft) | Quiz, Question, AnswerOption | 3 |
| Quiz (Versioned) | VersionQuiz, VersionQuestion, VersionAnswerOption | 3 |
| Review | ProcedureStepComment *(per-step only; review instance/tasks/general comments reuse workflows app)* | 1 |
| Training | ProcedureAssignment, TrainingAttempt, StepCompletion, QuizAttempt, QuestionResponse | 5 |
| Audit | ProcedureAuditLog | 1 |
| **New procedures app models** | | **19** |
| **Modified existing model** | WorkflowInstance (GenericForeignKey refactor) | 1 |

---

## 3. API Endpoints

All endpoints prefixed with `/api/v1/procedures/`.

### 3.1 Procedure CRUD

```
GET    /api/v1/procedures/                         # List procedures (filtered by org, dept, state, tags)
POST   /api/v1/procedures/                         # Create procedure (returns Draft)
GET    /api/v1/procedures/{id}/                     # Get procedure detail (includes steps, quizzes)
PUT    /api/v1/procedures/{id}/                     # Update procedure metadata
DELETE /api/v1/procedures/{id}/                     # Soft delete procedure
```

**Query Parameters for List:**
- `state` — filter by lifecycle state
- `department` — filter by department UUID
- `tag` — filter by tag (repeatable)
- `parent` — filter by parent procedure UUID
- `search` — full-text search on title/description
- `created_by` — filter by creator UUID
- `ordering` — `title`, `created_at`, `updated_at`, `state`
- `page`, `page_size` — pagination

### 3.2 Step Management

```
GET    /api/v1/procedures/{id}/steps/               # List steps for procedure
POST   /api/v1/procedures/{id}/steps/               # Add step
GET    /api/v1/procedures/{id}/steps/{step_id}/     # Get step detail
PUT    /api/v1/procedures/{id}/steps/{step_id}/     # Update step
DELETE /api/v1/procedures/{id}/steps/{step_id}/     # Delete step
POST   /api/v1/procedures/{id}/steps/reorder/       # Reorder steps (accepts [{id, order}, ...])
```

### 3.3 Step Attachments

```
GET    /api/v1/procedures/{id}/steps/{step_id}/attachments/                    # List attachments
POST   /api/v1/procedures/{id}/steps/{step_id}/attachments/                    # Upload attachment
GET    /api/v1/procedures/{id}/steps/{step_id}/attachments/{att_id}/           # Get attachment detail
DELETE /api/v1/procedures/{id}/steps/{step_id}/attachments/{att_id}/           # Delete attachment
GET    /api/v1/procedures/{id}/steps/{step_id}/attachments/{att_id}/download/  # Download file
GET    /api/v1/procedures/{id}/steps/{step_id}/attachments/{att_id}/preview/   # Preview (signed URL)
```

### 3.4 Quiz Management

```
GET    /api/v1/procedures/{id}/quizzes/                                    # List quizzes
POST   /api/v1/procedures/{id}/quizzes/                                    # Create quiz
GET    /api/v1/procedures/{id}/quizzes/{quiz_id}/                          # Get quiz detail
PUT    /api/v1/procedures/{id}/quizzes/{quiz_id}/                          # Update quiz settings
DELETE /api/v1/procedures/{id}/quizzes/{quiz_id}/                          # Delete quiz

# Questions
GET    /api/v1/procedures/{id}/quizzes/{quiz_id}/questions/                # List questions
POST   /api/v1/procedures/{id}/quizzes/{quiz_id}/questions/                # Add question with options
PUT    /api/v1/procedures/{id}/quizzes/{quiz_id}/questions/{q_id}/         # Update question
DELETE /api/v1/procedures/{id}/quizzes/{quiz_id}/questions/{q_id}/         # Delete question
POST   /api/v1/procedures/{id}/quizzes/{quiz_id}/questions/reorder/        # Reorder questions
```

### 3.5 Review & Approval (via Workflows Integration)

The procedure review flow uses the existing workflow API endpoints plus
a few procedure-specific endpoints for step comments.

#### Procedure-specific endpoints (new):

```
POST   /api/v1/procedures/{id}/submit-for-review/         # Submit draft for review
        # Body: { "reviewers": ["<user_id>", ...], "priority": "MEDIUM", "due_days": 5 }
        # Creates WorkflowInstance (target=Procedure) + WorkflowTask per reviewer
        # Transitions procedure state to IN_REVIEW

# Per-step comments (procedure-specific — not in workflow engine)
GET    /api/v1/procedures/{id}/step-comments/                          # List all step comments for active review
POST   /api/v1/procedures/{id}/step-comments/                          # Add per-step comment
        # Body: { "step_id": "<uuid>", "body": "...", "parent_comment_id": null }
PUT    /api/v1/procedures/{id}/step-comments/{c_id}/                   # Edit comment
POST   /api/v1/procedures/{id}/step-comments/{c_id}/resolve/           # Resolve comment thread
```

#### Existing workflow endpoints (reused — no new code needed):

```
# These already exist in the workflows app and work with any target type:
GET    /api/v1/workflows/instances/{instance_id}/          # Get review detail (status, tasks, comments)
POST   /api/v1/workflows/tasks/{task_id}/approve/          # Reviewer approves (requires comment)
POST   /api/v1/workflows/tasks/{task_id}/reject/           # Reviewer rejects (requires comment)
POST   /api/v1/workflows/tasks/{task_id}/delegate/         # Reviewer delegates to another user
GET    /api/v1/workflows/instances/{instance_id}/comments/  # List general comments
POST   /api/v1/workflows/instances/{instance_id}/comments/  # Add general comment
POST   /api/v1/workflows/instances/{instance_id}/cancel/    # Cancel review (return to Draft)
```

#### How submit-for-review works internally:

```python
def submit_for_review(procedure, reviewers, user, priority='MEDIUM', due_days=5):
    """
    Creates a WorkflowInstance targeting the Procedure,
    with one WorkflowTask per reviewer.
    """
    from django.contrib.contenttypes.models import ContentType

    # 1. Get or create a "Procedure Review" workflow template
    template, _ = WorkflowTemplate.objects.get_or_create(
        organization=procedure.organization,
        name='Procedure Review',
        defaults={
            'description': 'Review and approval workflow for procedures',
            'category': 'Procedures',
            'is_system': True,
            'default_priority': priority,
            'default_due_days': due_days,
            'created_by': user,
        }
    )

    # 2. Create WorkflowInstance with Procedure as target
    ct = ContentType.objects.get_for_model(Procedure)
    instance = WorkflowInstance.objects.create(
        organization=procedure.organization,
        template=template,
        template_name=template.name,
        target_content_type=ct,
        target_object_id=procedure.id,
        target_title=procedure.title,
        status=WorkflowInstanceStatus.ACTIVE,
        priority=priority,
        due_date=timezone.now() + timedelta(days=due_days),
        initiated_by=user,
        started_at=timezone.now(),
    )

    # 3. Create WorkflowTask per reviewer
    for i, reviewer in enumerate(reviewers):
        WorkflowTask.objects.create(
            workflow=instance,
            step_order=1,
            step_name='Procedure Review',
            step_type=WorkflowStepType.APPROVAL,
            assigned_to=reviewer,
            due_date=instance.due_date,
        )

    # 4. Transition procedure state
    procedure.state = Procedure.State.IN_REVIEW
    procedure.save(update_fields=['state', 'updated_at'])

    # 5. Audit log
    WorkflowAuditLog.log(
        workflow=instance,
        action='CREATED',
        actor=user,
        details=f'Procedure "{procedure.title}" submitted for review',
        metadata={'procedure_id': str(procedure.id), 'reviewers': [str(r.id) for r in reviewers]}
    )

    return instance
```

#### How approval/rejection flows back to procedure state:

```python
# Django signal or override in WorkflowTask.approve() / .reject()

def on_workflow_task_completed(instance: WorkflowInstance):
    """
    Called after a WorkflowTask is approved/rejected.
    Checks if all tasks are done and updates the procedure state.
    """
    if not instance.is_procedure_workflow:
        return  # Only handle procedure workflows

    tasks = instance.tasks.all()
    if tasks.filter(status=WorkflowTaskStatus.REJECTED).exists():
        # Any rejection → procedure returns to Draft
        instance.complete(approved=False, reason='Rejected by reviewer')
        procedure = instance.target
        procedure.state = Procedure.State.DRAFT
        procedure.save(update_fields=['state', 'updated_at'])

    elif not tasks.filter(status__in=[WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS]).exists():
        # All tasks resolved and none rejected → approved
        instance.complete(approved=True)
        procedure = instance.target
        procedure.state = Procedure.State.APPROVED
        procedure.save(update_fields=['state', 'updated_at'])
```

### 3.6 Publishing & Versioning

```
POST   /api/v1/procedures/{id}/publish/                    # Publish approved procedure (creates ProcedureVersion)
        # Body: { "effective_from": "2026-04-01", "expires_on": "2027-04-01", "changelog": "..." }

GET    /api/v1/procedures/{id}/versions/                   # List all published versions
GET    /api/v1/procedures/{id}/versions/{version_number}/  # Get specific version (full snapshot)
POST   /api/v1/procedures/{id}/versions/{version_number}/retire/  # Retire a published version
        # Body: { "reason": "Superseded by v3" }

GET    /api/v1/procedures/{id}/versions/diff/              # Diff two versions
        # Query: ?from_version=2&to_version=3
```

### 3.7 Assignments

```
GET    /api/v1/procedures/assignments/                     # List assignments (my assignments or all for admins)
POST   /api/v1/procedures/assignments/                     # Create assignment(s)
        # Body: {
        #   "procedure_version_id": "<uuid>",
        #   "assignees": ["<user_id>", ...],               // Direct
        #   "departments": ["<dept_id>", ...],              // All users in dept
        #   "roles": ["editor", "viewer"],                  // All users with role
        #   "due_date": "2026-04-15"
        # }
GET    /api/v1/procedures/assignments/{id}/                # Get assignment detail
PUT    /api/v1/procedures/assignments/{id}/                # Update due date
POST   /api/v1/procedures/assignments/{id}/waive/          # Waive assignment (admin only)
        # Body: { "reason": "Employee transferred to different department" }

# Dashboard / Metrics
GET    /api/v1/procedures/assignments/dashboard/           # Assignment metrics
        # Returns: completion %, overdue %, avg completion time, pass rate
        # Query: ?department=<id>&procedure=<id>&date_from=&date_to=
```

### 3.8 Training Delivery

```
# Start / Resume training
POST   /api/v1/procedures/training/start/                  # Start new attempt for an assignment
        # Body: { "assignment_id": "<uuid>" }
        # Returns: attempt object with all steps + current position

GET    /api/v1/procedures/training/{attempt_id}/           # Get attempt state (resume point)

# Step progression
POST   /api/v1/procedures/training/{attempt_id}/steps/{step_id}/start/      # Mark step started
POST   /api/v1/procedures/training/{attempt_id}/steps/{step_id}/view/       # Mark step viewed
POST   /api/v1/procedures/training/{attempt_id}/steps/{step_id}/manual-opened/  # Record manual open
POST   /api/v1/procedures/training/{attempt_id}/steps/{step_id}/media-completed/ # Record media completion
POST   /api/v1/procedures/training/{attempt_id}/steps/{step_id}/complete/   # Complete step (validates gates)

# Quiz taking
POST   /api/v1/procedures/training/{attempt_id}/quizzes/{quiz_id}/start/    # Start quiz attempt
POST   /api/v1/procedures/training/{attempt_id}/quizzes/{quiz_id}/submit/   # Submit quiz answers
        # Body: {
        #   "responses": [
        #     { "question_id": "<uuid>", "selected_options": ["<uuid>"], "text_response": "", "submitted_order": [] },
        #     ...
        #   ]
        # }
        # Returns: graded result with score, pass/fail, per-question feedback

# Complete training
POST   /api/v1/procedures/training/{attempt_id}/complete/  # Finalize attempt
```

### 3.9 Evidence & Compliance Export

```
GET    /api/v1/procedures/evidence/                        # List training evidence (admin/auditor)
        # Query: ?user=<id>&procedure=<id>&date_from=&date_to=&status=passed

GET    /api/v1/procedures/evidence/{assignment_id}/        # Full evidence for one assignment
        # Returns: all attempts, step completions, quiz responses, timestamps

GET    /api/v1/procedures/evidence/export/                 # Export evidence as CSV/PDF
        # Query: ?format=csv|pdf&user=<id>&procedure=<id>&date_from=&date_to=

GET    /api/v1/procedures/audit-log/                       # Procedure-specific audit log
        # Query: ?procedure=<id>&action=<type>&actor=<id>&date_from=&date_to=
```

### Endpoint Count Summary

| Category | Endpoints | Notes |
|----------|-----------|-------|
| Procedure CRUD | 5 | New |
| Steps | 6 | New |
| Attachments | 5 | New |
| Quizzes & Questions | 8 | New |
| Review (procedure-specific) | 5 | New (submit + step comments) |
| Review (reused from workflows) | 7 | Existing — no new code |
| Publishing & Versioning | 5 | New |
| Assignments | 6 | New |
| Training Delivery | 9 | New |
| Evidence & Audit | 4 | New |
| **New endpoints to build** | **48** | |
| **Reused from workflows** | **7** | |

---

## 4. Lifecycle & State Machine

### 4.1 Procedure State Transitions

```
                    ┌─────────────────────────────────────┐
                    │                                     │
                    ▼                                     │
  ┌─────────┐  submit   ┌───────────┐  approve  ┌──────────┐  publish  ┌───────────┐  retire  ┌─────────┐
  │  DRAFT  │ ────────► │ IN_REVIEW │ ────────► │ APPROVED │ ───────► │ PUBLISHED │ ──────► │ RETIRED │
  └─────────┘           └───────────┘           └──────────┘          └───────────┘         └─────────┘
       ▲                     │                       │
       │        reject       │                       │
       └─────────────────────┘                       │
       │                                             │
       └─────────────────────────────────────────────┘
                    edit (creates new draft cycle)
```

### 4.2 Transition Rules

| From | To | Action | Who | Requirements |
|------|----|--------|-----|--------------|
| DRAFT | IN_REVIEW | `submit_for_review` | Creator | At least 1 step, all required fields filled, at least 1 reviewer assigned. Creates `WorkflowInstance` + `WorkflowTask` per reviewer. |
| IN_REVIEW | APPROVED | *(auto via workflow)* | System | All `WorkflowTask`s APPROVED → `WorkflowInstance` completed → procedure state updated via signal |
| IN_REVIEW | DRAFT | *(auto via workflow)* | System | Any `WorkflowTask` REJECTED → `WorkflowInstance` rejected → procedure returns to DRAFT via signal |
| APPROVED | PUBLISHED | `publish` | Admin | `effective_from` and `expires_on` set, creates immutable ProcedureVersion |
| PUBLISHED | RETIRED | `retire` | Admin | Mandatory retirement reason, does NOT delete — remains readable |
| PUBLISHED | DRAFT | `edit` | Creator | Starts new draft cycle (copies current published content for editing) |

### 4.3 Constraints

- A procedure can only have ONE active `WorkflowInstance` (review) at a time.
- Only `Approved` procedures can be published.
- Publishing increments `current_version` and creates a `ProcedureVersion` snapshot.
- Published versions are **immutable** — no field except `is_active` can change.
- Retiring a version does NOT affect ongoing training (assignments already in progress continue against the version snapshot).
- When a published version expires, active assignments remain valid until completion but no new assignments can be created against it.

---

## 5. Authoring Module

### 5.1 Procedure Creation Flow

1. Creator calls `POST /api/v1/procedures/` with title, description, department, optional parent, optional tags.
2. Procedure created in `DRAFT` state with `current_version=0`.
3. Creator adds steps via `POST /api/v1/procedures/{id}/steps/`.
4. Steps are ordered by `order` field (integer). Reordering via `POST .../steps/reorder/`.
5. Attachments uploaded to steps via `POST .../steps/{step_id}/attachments/`.
6. Quizzes created and linked to steps or procedure-level.
7. When ready, Creator submits for review.

### 5.2 Step Builder Requirements

The step builder UI must support:

- **Drag-and-drop reordering** of steps
- **Inline editing** of step title and description (rich text)
- **Attachment upload** with drag-and-drop zone per step
- **Attachment preview** for supported formats (PDF, images, video)
- **Branch condition editor** (visual UI, see Section 6)
- **Gate toggles** (require manual open, require media completion, require quiz pass)
- **Quiz builder** inline within step or at procedure level (see Section 9)
- **Duration estimation** input per step
- **Step deletion** with confirmation prompt
- **Autosave** — debounced save on field changes (500ms debounce)

### 5.3 Validation Rules (enforced on submit)

| Field | Rule |
|-------|------|
| `title` | Required, 1-500 characters |
| `description` | Required, minimum 10 characters |
| `steps` | At least 1 step required |
| `step.title` | Required per step |
| `step.order` | Unique within procedure, sequential |
| `quiz.passing_score_percent` | 1-100 |
| `quiz.questions` | At least 1 question per quiz |
| `question.options` | At least 2 options for multiple_choice/multi_select/true_false |
| `question.options.is_correct` | At least 1 correct option per question |
| `branch_condition` | Valid JSON matching schema (see Section 6) |
| `attachment.file_extension` | Must be in ALLOWED_EXTENSIONS list |
| `attachment.file_size` | Must be <= MAX_FILE_SIZE_MB |

---

## 6. Conditional Branching Engine

### 6.1 Condition Schema

Branch conditions are stored as JSON on `ProcedureStep.branch_condition`. A `null` value means the step is always shown.

```json
// Single condition
{
    "field": "role",
    "operator": "in",
    "value": ["loan_officer", "credit_analyst"]
}

// Compound condition (AND)
{
    "all": [
        { "field": "department", "operator": "eq", "value": "credit" },
        { "field": "role", "operator": "in", "value": ["loan_officer"] }
    ]
}

// Compound condition (OR)
{
    "any": [
        { "field": "role", "operator": "eq", "value": "loan_officer" },
        { "field": "step_result", "step_id": "<uuid>", "operator": "eq", "value": "passed" }
    ]
}

// Nested compound
{
    "all": [
        { "field": "department", "operator": "eq", "value": "compliance" },
        {
            "any": [
                { "field": "role", "operator": "in", "value": ["manager", "admin"] },
                { "field": "step_result", "step_id": "<uuid>", "operator": "eq", "value": "passed" }
            ]
        }
    ]
}
```

### 6.2 Supported Fields

| Field | Source | Description |
|-------|--------|-------------|
| `role` | User's assigned role(s) | Matches against UserRole.role values |
| `department` | User's department slug | Matches against Department.slug |
| `job_title` | User's profile job title | Free text match |
| `step_result` | Previous step outcome | `passed`, `failed`, `completed`, `skipped` |
| `quiz_score` | Previous quiz score | Numeric comparison |
| `custom_field` | Trainee context JSON | Arbitrary key-value from `TrainingAttempt.trainee_context` |

### 6.3 Supported Operators

| Operator | Types | Description |
|----------|-------|-------------|
| `eq` | string, number | Equals |
| `neq` | string, number | Not equals |
| `in` | array | Value is in array |
| `not_in` | array | Value is not in array |
| `gt` | number | Greater than |
| `gte` | number | Greater than or equal |
| `lt` | number | Less than |
| `lte` | number | Less than or equal |
| `contains` | string | String contains substring |

### 6.4 Evaluation Logic

```python
# backend/apps/procedures/utils.py

def evaluate_branch_condition(condition: dict, context: dict) -> bool:
    """
    Evaluate a branch condition against a trainee context.

    context = {
        "role": ["editor"],
        "department": "credit",
        "job_title": "Loan Officer",
        "step_results": {
            "<step_uuid>": "passed"
        },
        "quiz_scores": {
            "<quiz_uuid>": 85.0
        },
        "custom_fields": {
            "region": "east"
        }
    }
    """
    if condition is None:
        return True

    if 'all' in condition:
        return all(evaluate_branch_condition(c, context) for c in condition['all'])

    if 'any' in condition:
        return any(evaluate_branch_condition(c, context) for c in condition['any'])

    field = condition['field']
    operator = condition['operator']
    expected = condition['value']

    # Resolve actual value from context
    if field == 'step_result':
        actual = context.get('step_results', {}).get(condition['step_id'])
    elif field == 'quiz_score':
        actual = context.get('quiz_scores', {}).get(condition.get('quiz_id'))
    elif field == 'custom_field':
        actual = context.get('custom_fields', {}).get(condition.get('key'))
    else:
        actual = context.get(field)

    return apply_operator(operator, actual, expected)
```

### 6.5 Frontend Branch Condition Editor

Visual editor with:
- **Condition type selector**: Simple (single condition) or Compound (ALL/ANY group)
- **Field dropdown**: role, department, job_title, step_result, quiz_score, custom_field
- **Operator dropdown**: filtered by field type (string fields get eq/neq/in/contains, number fields get eq/gt/lt/etc.)
- **Value input**: text field, multi-select (for `in`), or step/quiz picker (for step_result/quiz_score)
- **Nesting**: "Add group" button to create nested ALL/ANY blocks
- **Preview**: "Test condition" button that evaluates against a sample context
- **Validation**: Real-time feedback if condition references non-existent steps

---

## 7. Review & Publish Module (Workflow-Integrated)

### 7.1 Review Flow

1. Creator clicks "Submit for Review" — selects reviewer(s) from user list (filtered by Reviewer role).
2. System calls `submit_for_review()` which creates:
   - `WorkflowInstance` with `target=Procedure` (via GenericForeignKey)
   - `WorkflowTask` per reviewer (step_type=APPROVAL, approval_type=ALL)
3. Procedure transitions to `IN_REVIEW`.
4. Reviewers receive notifications (via existing workflow notification system).
5. Each reviewer:
   - Views all steps, attachments, quizzes (procedure-specific UI)
   - Adds per-step comments via `ProcedureStepComment` (procedure-specific)
   - Adds general comments via `WorkflowComment` (existing workflow feature)
   - Makes decision via `WorkflowTask.approve()` / `.reject()` (existing workflow feature)
   - Can delegate via `WorkflowTask.delegate()` (existing workflow feature)
6. When ALL tasks APPROVED → `WorkflowInstance.status = APPROVED` → `Procedure.state = APPROVED`.
7. If ANY task REJECTED → `WorkflowInstance.status = REJECTED` → `Procedure.state = DRAFT`.
8. Creator addresses feedback, re-submits for review.

### 7.1.1 What reviewers gain from workflow integration (for free)

- **SLA tracking**: Each reviewer task has `due_date` and `sla_hours`
- **Escalation**: Auto-escalate to manager if reviewer doesn't act in time
- **Delegation**: Reviewer can delegate their task to a colleague
- **Unified task inbox**: Procedure review tasks appear alongside document review tasks in `WorkflowCenterPage`
- **Read tracking**: `WorkflowTask.is_read` / `read_at` — know who has seen the review request
- **Audit trail**: All actions logged in `WorkflowAuditLog` (immutable)

### 7.2 Comment Threading

Two comment systems work together:

**General comments** (via `WorkflowComment` — existing):
- Attached to the `WorkflowInstance` or a specific `WorkflowTask`
- Support @mentions (JSON array of user IDs)
- No step reference — used for high-level feedback

**Per-step comments** (via `ProcedureStepComment` — new):
- Reference a specific `ProcedureStep` for contextual feedback
- Reply threading via `parent_comment` self-FK
- Can be marked as "resolved" by the Creator or Reviewer
- Unresolved step comments block approval (reviewer cannot approve while their own step comments are unresolved)

### 7.3 Publishing

1. Admin navigates to an `APPROVED` procedure.
2. Clicks "Publish" — provides:
   - `effective_from` (date, required)
   - `expires_on` (date, required, must be after effective_from)
   - `changelog` (text, describing changes from previous version)
3. System:
   - Increments `procedure.current_version`
   - Creates `ProcedureVersion` snapshot
   - Creates `ProcedureVersionStep` for each step
   - Creates `VersionStepAttachment` for each attachment
   - Creates `VersionQuiz` / `VersionQuestion` / `VersionAnswerOption` snapshots
   - Transitions procedure state to `PUBLISHED`
   - Logs `PUBLISHED` audit event

---

## 8. Version Diffing

### 8.1 Diff API

```
GET /api/v1/procedures/{id}/versions/diff/?from_version=2&to_version=3
```

### 8.2 Diff Response Format

```json
{
    "from_version": 2,
    "to_version": 3,
    "metadata_changes": {
        "title": { "from": "Old Title", "to": "New Title" },
        "description": { "from": "Old desc", "to": "New desc" },
        "tags": { "added": ["compliance"], "removed": ["draft"] }
    },
    "step_changes": [
        {
            "type": "modified",
            "step_order": 2,
            "from_step_id": "<uuid>",
            "to_step_id": "<uuid>",
            "changes": {
                "title": { "from": "Setup IT", "to": "IT Equipment Setup" },
                "description": { "from": "...", "to": "..." },
                "branch_condition": { "from": null, "to": { "field": "role", "operator": "eq", "value": "it_admin" } }
            }
        },
        {
            "type": "added",
            "step_order": 4,
            "to_step_id": "<uuid>",
            "step_data": { "title": "Security Training", "description": "..." }
        },
        {
            "type": "removed",
            "step_order": 5,
            "from_step_id": "<uuid>",
            "step_data": { "title": "Deprecated Step", "description": "..." }
        },
        {
            "type": "reordered",
            "from_order": 3,
            "to_order": 5,
            "step_id": "<uuid>"
        }
    ],
    "attachment_changes": [
        {
            "step_order": 2,
            "type": "replaced",
            "from": { "title": "setup_v1.docx", "checksum": "abc123" },
            "to": { "title": "setup_v2.docx", "checksum": "def456" }
        },
        {
            "step_order": 4,
            "type": "added",
            "to": { "title": "security_guide.pdf" }
        }
    ],
    "quiz_changes": [
        {
            "type": "modified",
            "quiz_title": "IT Knowledge Check",
            "questions_added": 2,
            "questions_removed": 0,
            "questions_modified": 1,
            "passing_score_changed": { "from": 70, "to": 80 }
        }
    ]
}
```

### 8.3 Diff Engine Implementation

```python
# backend/apps/procedures/utils.py

def compute_version_diff(from_version: ProcedureVersion, to_version: ProcedureVersion) -> dict:
    """
    Compare two published versions and return a structured diff.
    Steps are matched by original_step_id for tracking renames/moves.
    """
    # 1. Compare metadata fields (title, description, tags)
    # 2. Match steps by original_step_id
    #    - Present in both → check for field changes → "modified"
    #    - Present only in from → "removed"
    #    - Present only in to → "added"
    #    - Same step, different order → "reordered"
    # 3. For each matched step, compare attachments by original_attachment_id
    # 4. For each matched step, compare quizzes by original_quiz_id
    #    - Within quizzes, compare questions by original_question_id
    ...
```

### 8.4 Frontend Diff Viewer

- Side-by-side display of two versions
- Color-coded changes: green (added), red (removed), yellow (modified)
- Expandable step cards showing inline field diffs
- Attachment change indicators (new file icon, replaced file icon, removed file icon)
- Quiz change summary with expandable question-level detail
- Version selector dropdowns (from/to)

---

## 9. Quiz & Knowledge Check Module

### 9.1 Question Types

| Type | UI | Grading |
|------|-----|---------|
| `multiple_choice` | Radio buttons — select one | Auto: selected option `is_correct` |
| `multi_select` | Checkboxes — select multiple | Auto: all correct options selected, no incorrect selected |
| `true_false` | Two radio buttons (True/False) | Auto: selected option `is_correct` |
| `short_answer` | Text input/textarea | Auto (keyword match) or Manual (grader reviews) |
| `ordering` | Drag-and-drop list | Auto: `submitted_order` matches `correct_order` sequence |

### 9.2 Scoring Algorithm

```python
def grade_quiz_attempt(quiz_attempt: QuizAttempt) -> dict:
    """
    Grade all responses in a quiz attempt.
    Returns: { score_earned, score_possible, score_percent, passed, passed_all_mandatory }
    """
    score_earned = 0
    score_possible = 0
    all_mandatory_correct = True

    for response in quiz_attempt.responses.select_related('version_question'):
        question = response.version_question
        score_possible += question.points

        is_correct = grade_question(response, question)
        response.is_correct = is_correct

        if is_correct:
            response.points_earned = question.points
            score_earned += question.points
        else:
            response.points_earned = 0
            if question.is_mandatory:
                all_mandatory_correct = False

        response.save()

    score_percent = (score_earned / score_possible * 100) if score_possible > 0 else 0
    passed = (
        score_percent >= quiz_attempt.version_quiz.passing_score_percent
        and all_mandatory_correct
    )

    return {
        'score_earned': score_earned,
        'score_possible': score_possible,
        'score_percent': round(score_percent, 2),
        'passed': passed,
        'passed_all_mandatory': all_mandatory_correct,
    }


def grade_question(response: QuestionResponse, question: VersionQuestion) -> bool:
    """Grade a single question response."""

    if question.question_type == 'multiple_choice':
        selected = set(response.selected_options.values_list('id', flat=True))
        correct = set(question.options.filter(is_correct=True).values_list('id', flat=True))
        return selected == correct

    elif question.question_type == 'multi_select':
        selected = set(response.selected_options.values_list('id', flat=True))
        correct = set(question.options.filter(is_correct=True).values_list('id', flat=True))
        return selected == correct

    elif question.question_type == 'true_false':
        selected = set(response.selected_options.values_list('id', flat=True))
        correct = set(question.options.filter(is_correct=True).values_list('id', flat=True))
        return selected == correct

    elif question.question_type == 'short_answer':
        if question.auto_grade_keywords:
            text = response.text_response.lower()
            return any(kw.lower() in text for kw in question.auto_grade_keywords)
        return None  # Requires manual grading

    elif question.question_type == 'ordering':
        if response.submitted_order is None:
            return False
        correct_order = list(
            question.options.order_by('correct_order').values_list('id', flat=True)
        )
        return [str(x) for x in response.submitted_order] == [str(x) for x in correct_order]

    return False
```

### 9.3 Quiz Builder UI

- **Quiz settings panel**: title, description, passing score slider, max attempts, time limit, shuffle toggles
- **Question list**: drag-and-drop reorderable
- **Question editor** per type:
  - Multiple choice: question text + N options with radio for correct
  - Multi-select: question text + N options with checkboxes for correct
  - True/False: question text + auto-generated True/False options
  - Short answer: question text + keyword list for auto-grading (or "manual grade" toggle)
  - Ordering: question text + drag-and-drop items to set correct order
- **Mandatory flag** toggle per question
- **Points** input per question
- **Explanation** field per question (shown after grading)
- **Preview mode**: take the quiz as a trainee would see it

---

## 10. Training Delivery Module

### 10.1 Training Player Architecture

The training player is a full-page, step-by-step interface.

```
┌─────────────────────────────────────────────────────────────┐
│  Procedure Title                                    X Close │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│  Step List   │         Step Content Area                    │
│  ─────────   │                                              │
│  ✓ Step 1    │   Step Title                                 │
│  ✓ Step 2    │   ─────────                                  │
│  ► Step 3    │   Step description with rich text...         │
│  ○ Step 4    │                                              │
│  ○ Step 5    │   ┌─────────────────────────┐                │
│  ⊘ Step 6    │   │  Attachment: manual.pdf  │                │
│    (skipped) │   │  [Open] [Download]       │                │
│              │   └─────────────────────────┘                │
│              │                                              │
│              │   ┌─────────────────────────┐                │
│              │   │  Quiz: Knowledge Check   │                │
│              │   │  [Start Quiz]            │                │
│              │   └─────────────────────────┘                │
│              │                                              │
├──────────────┴──────────────────────────────────────────────┤
│  ◄ Previous                     Progress: 40%    Next ►     │
│  ████████░░░░░░░░░░░░                                       │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 Step Status Icons

| Icon | Status | Meaning |
|------|--------|---------|
| `○` | not_started | Step not yet visited |
| `►` | started/viewed | Currently active or viewed |
| `✓` | completed | All gates passed, step done |
| `⊘` | skipped | Branch condition was false |
| `✗` | quiz_failed | Quiz gate failed (retryable) |

### 10.3 Progression Logic

```python
def can_advance_to_next_step(step_completion: StepCompletion) -> tuple[bool, list[str]]:
    """
    Check if a trainee can advance past a step.
    Returns (can_advance, blocking_reasons).
    """
    version_step = step_completion.version_step
    reasons = []

    if version_step.require_manual_open and not step_completion.manual_opened_at:
        reasons.append("You must open the attached manual before continuing.")

    if version_step.require_media_completion and not step_completion.media_completed_at:
        reasons.append("You must complete the media content before continuing.")

    if version_step.require_quiz_pass:
        quiz = version_step.quizzes.first()
        if quiz:
            passed_attempt = step_completion.attempt.quiz_attempts.filter(
                version_quiz=quiz, passed=True
            ).exists()
            if not passed_attempt:
                reasons.append("You must pass the quiz before continuing.")

    return (len(reasons) == 0, reasons)
```

### 10.4 Resume Logic

When a trainee returns to an in-progress training:

1. Load `TrainingAttempt` with status=`in_progress` for the assignment.
2. Find the last `StepCompletion` with status in (`started`, `viewed`).
3. Navigate directly to that step.
4. All previous completed steps show as `✓`.
5. All skipped steps (branch=false) show as `⊘`.

### 10.5 Step Navigation Rules

- **Forward**: Only if current step is completed (all gates passed) OR skipped (branch=false).
- **Backward**: Always allowed (to review completed steps). Does not reset completion.
- **Jump**: Allowed only to completed or current step. Cannot jump ahead.
- **End-of-procedure quiz**: Only accessible after all applicable steps are completed.

### 10.6 Training Completion

When the last applicable step is completed (and end-of-procedure quiz is passed, if any):

1. `TrainingAttempt.status` → `passed` or `failed`
2. `TrainingAttempt.completed_at` → now
3. `TrainingAttempt.total_time_seconds` → sum of all step times
4. `TrainingAttempt.total_score` → weighted average of all quiz scores
5. If passed:
   - `ProcedureAssignment.status` → `completed`
   - `ProcedureAssignment.completed_at` → now
   - `ProcedureAssignment.completion_score` → attempt score
6. If failed and attempts remaining:
   - Assignment stays `in_progress`
   - Trainee can start a new attempt
7. If failed and no attempts remaining:
   - `ProcedureAssignment.status` → `failed`
   - Notification sent to Admin

---

## 11. Assignment & Tracking Module

### 11.1 Assignment Creation

When creating assignments, the system expands group targets into individual assignments:

```python
def create_assignments(data: dict, assigned_by: CustomUser, org: Organization) -> list:
    """
    Create individual ProcedureAssignment records from a bulk request.
    Deduplicates users who appear in multiple targets.
    """
    version = ProcedureVersion.objects.get(id=data['procedure_version_id'])
    due_date = data['due_date']
    assignee_ids = set()

    # Direct user assignments
    for user_id in data.get('assignees', []):
        assignee_ids.add(user_id)

    # Department-based: all active users in department
    for dept_id in data.get('departments', []):
        dept_users = CustomUser.objects.filter(
            department_id=dept_id, is_active=True, organization=org
        ).values_list('id', flat=True)
        assignee_ids.update(dept_users)

    # Role-based: all users with specified roles
    for role_name in data.get('roles', []):
        role_users = UserRole.objects.filter(
            role=role_name, user__organization=org, user__is_active=True
        ).values_list('user_id', flat=True)
        assignee_ids.update(role_users)

    # Deduplicate: skip users already assigned to this version
    existing = ProcedureAssignment.objects.filter(
        procedure_version=version,
        assignee_id__in=assignee_ids,
        status__in=['assigned', 'in_progress']
    ).values_list('assignee_id', flat=True)
    assignee_ids -= set(existing)

    assignments = []
    for user_id in assignee_ids:
        assignment = ProcedureAssignment.objects.create(
            organization=org,
            procedure_version=version,
            assignee_id=user_id,
            assigned_by=assigned_by,
            assignment_source=determine_source(data, user_id),
            due_date=due_date,
        )
        assignments.append(assignment)

    return assignments
```

### 11.2 Overdue Detection

Assignments transition to `overdue` via a Celery beat task that runs daily:

```python
# Check at midnight: any assignment past due_date that isn't completed/waived/failed
ProcedureAssignment.objects.filter(
    status__in=['assigned', 'in_progress'],
    due_date__lt=date.today()
).update(status='overdue')
```

### 11.3 Re-certification

When a `ProcedureVersion` approaches its `expires_on` date:

1. Celery beat task checks daily for versions expiring within 30 days.
2. For each expiring version:
   - Find all users who completed the version.
   - Check if a newer published version exists.
   - If newer version exists: create new assignments (source=`recertification`).
   - If no newer version: notify Admin to update the procedure.

### 11.4 Dashboard Metrics

```
GET /api/v1/procedures/assignments/dashboard/
```

Response:

```json
{
    "summary": {
        "total_assignments": 450,
        "completed": 320,
        "in_progress": 50,
        "overdue": 30,
        "not_started": 40,
        "waived": 10,
        "completion_rate": 71.1,
        "overdue_rate": 6.7,
        "average_completion_days": 4.2,
        "average_score": 87.5,
        "pass_rate": 92.3
    },
    "by_department": [
        { "department": "Compliance", "total": 100, "completed": 85, "overdue": 5, "completion_rate": 85.0 },
        { "department": "Credit", "total": 80, "completed": 60, "overdue": 10, "completion_rate": 75.0 }
    ],
    "by_procedure": [
        { "procedure": "New Employee Onboarding", "version": 3, "total": 50, "completed": 45, "pass_rate": 95.0 },
        { "procedure": "AML Compliance", "version": 2, "total": 120, "completed": 90, "pass_rate": 88.0 }
    ],
    "overdue_assignments": [
        { "assignee": "John Doe", "procedure": "KYC Procedures", "due_date": "2026-03-01", "days_overdue": 8 }
    ],
    "upcoming_expirations": [
        { "procedure": "AML Compliance", "version": 2, "expires_on": "2026-04-15", "affected_users": 120 }
    ]
}
```

---

## 12. Evidence & Compliance Module

### 12.1 Evidence Record Structure

For each completed assignment, the system can export a complete evidence record:

```json
{
    "assignment_id": "<uuid>",
    "procedure": {
        "title": "New Employee Onboarding",
        "version": 3,
        "published_at": "2026-02-01T10:00:00Z",
        "effective_from": "2026-02-15",
        "expires_on": "2027-02-15"
    },
    "assignee": {
        "name": "Jane Smith",
        "email": "jane.smith@ccc.com",
        "department": "Compliance",
        "role": "Editor"
    },
    "assignment": {
        "assigned_by": "Admin User",
        "assigned_at": "2026-02-20T09:00:00Z",
        "due_date": "2026-03-20",
        "source": "department",
        "status": "completed",
        "completed_at": "2026-03-05T14:30:00Z",
        "completion_score": 92.5
    },
    "attempts": [
        {
            "attempt_number": 1,
            "status": "failed",
            "started_at": "2026-02-25T10:00:00Z",
            "completed_at": "2026-02-25T11:30:00Z",
            "total_time_seconds": 5400,
            "total_score": 65.0,
            "step_completions": [
                {
                    "step": "Welcome and Orientation",
                    "order": 1,
                    "status": "completed",
                    "started_at": "2026-02-25T10:00:00Z",
                    "completed_at": "2026-02-25T10:15:00Z",
                    "time_spent_seconds": 900,
                    "manual_opened": true,
                    "manual_opened_at": "2026-02-25T10:02:00Z"
                }
            ],
            "quiz_results": [
                {
                    "quiz": "Compliance Knowledge Check",
                    "attempt_number": 1,
                    "score_percent": 60.0,
                    "passed": false,
                    "questions": [
                        {
                            "question": "What does KYC stand for?",
                            "type": "multiple_choice",
                            "answer_given": "Know Your Client",
                            "correct_answer": "Know Your Customer",
                            "is_correct": false,
                            "is_mandatory": true,
                            "points": 1
                        }
                    ]
                }
            ]
        },
        {
            "attempt_number": 2,
            "status": "passed",
            "started_at": "2026-03-01T09:00:00Z",
            "completed_at": "2026-03-05T14:30:00Z",
            "total_time_seconds": 7200,
            "total_score": 92.5,
            "step_completions": ["..."],
            "quiz_results": ["..."]
        }
    ]
}
```

### 12.2 Export Formats

| Format | Use Case |
|--------|----------|
| **CSV** | Bulk data analysis, spreadsheet import |
| **PDF** | Formal compliance reports, individual certificates |

### 12.3 CSV Export Columns

```
assignment_id, procedure_title, version_number, assignee_name, assignee_email,
department, assigned_by, assigned_at, due_date, source, status, completed_at,
completion_score, total_attempts, total_time_seconds, passed_all_quizzes,
final_quiz_score
```

### 12.4 PDF Export

Single-assignment PDF report containing:
- Header: Organization name, report date, procedure title + version
- Assignee details: name, department, role
- Assignment summary: dates, status, score
- Attempt timeline: each attempt with step-by-step evidence
- Quiz results: per-question breakdown
- Digital signature placeholder (for compliance officer sign-off)
- Footer: "Generated by DFC — Digital Filing Cabinet"

---

## 13. Notifications & Reminders

### 13.1 Notification Events

| Event | Recipients | Channel | Source |
|-------|-----------|---------|--------|
| Review requested | Assigned reviewers | In-app + Email | *Handled by workflows app (TASK_ASSIGNED)* |
| Review approved | Creator | In-app + Email | *Handled by workflows app (WORKFLOW_APPROVED)* |
| Review rejected | Creator | In-app + Email | *Handled by workflows app (WORKFLOW_REJECTED)* |
| Review comment added | Review participants | In-app | *Handled by workflows app (COMMENT_ADDED)* |
| Step comment added | Review participants | In-app | Procedures app (new) |
| Procedure published | Department members | In-app | Procedures app (new) |
| Training assigned | Assignee | In-app + Email |
| Reminder: 7 days before due | Assignee | In-app + Email |
| Reminder: 3 days before due | Assignee | In-app + Email |
| Reminder: 1 day before due | Assignee | In-app + Email |
| Assignment overdue | Assignee + Admin | In-app + Email |
| Training completed | Admin | In-app |
| Training failed (all attempts) | Admin | In-app + Email |
| Version expiring (30 days) | Admin | In-app + Email |
| Re-certification assigned | Assignee | In-app + Email |
| Quiz requires manual grading | Creator/Admin | In-app |

### 13.2 Notification Data Model

Reuse existing `sharing.Notification` model with new notification types:

```python
# Add to existing Notification.NotificationType choices:
# NOTE: Review notifications (requested, approved, rejected, general comment)
# are handled by the workflows app — no new types needed for those.

PROCEDURE_STEP_COMMENT = 'procedure_step_comment'           # Per-step comment during review
PROCEDURE_PUBLISHED = 'procedure_published'
PROCEDURE_ASSIGNED = 'procedure_assigned'
PROCEDURE_REMINDER = 'procedure_reminder'
PROCEDURE_OVERDUE = 'procedure_overdue'
PROCEDURE_COMPLETED = 'procedure_completed'
PROCEDURE_FAILED = 'procedure_failed'
PROCEDURE_EXPIRING = 'procedure_expiring'
PROCEDURE_RECERTIFICATION = 'procedure_recertification'
PROCEDURE_MANUAL_GRADE_NEEDED = 'procedure_manual_grade_needed'
```

### 13.3 Reminder Cadence

Reminders are sent via Celery beat task running daily:

```python
@shared_task
def send_assignment_reminders():
    today = date.today()

    cadences = [
        (7, 'procedure_reminder'),   # 7 days before
        (3, 'procedure_reminder'),   # 3 days before
        (1, 'procedure_reminder'),   # 1 day before
    ]

    for days_before, notif_type in cadences:
        target_date = today + timedelta(days=days_before)
        assignments = ProcedureAssignment.objects.filter(
            due_date=target_date,
            status__in=['assigned', 'in_progress'],
        )
        for assignment in assignments:
            send_notification(
                user=assignment.assignee,
                notification_type=notif_type,
                context={
                    'procedure_title': assignment.procedure_version.title,
                    'due_date': str(assignment.due_date),
                    'days_remaining': days_before,
                }
            )
            assignment.last_reminder_sent = now()
            assignment.reminder_count += 1
            assignment.save(update_fields=['last_reminder_sent', 'reminder_count'])
```

---

## 14. Security & Multi-Tenant Isolation

### 14.1 Tenant Isolation

Every query in the procedures app MUST be scoped by organization:

```python
class ProcedureViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return Procedure.objects.filter(
            organization=self.request.user.organization,
            is_deleted=False
        )
```

### 14.2 Department Visibility

- Procedures are owned by a department.
- By default, only users in that department (or with cross-department access) can view/manage.
- Published procedures assigned to a user are visible regardless of department.
- Admins can see all procedures within the organization.

### 14.3 Permission Matrix

| Action | Creator | Reviewer | Admin | Trainee | Compliance Auditor |
|--------|---------|----------|-------|---------|-------------------|
| Create procedure | Yes | No | Yes | No | No |
| Edit draft | Own only | No | Yes | No | No |
| Delete draft | Own only | No | Yes | No | No |
| Submit for review | Own only | No | Yes | No | No |
| View in review | Own only | Assigned | Yes | No | No |
| Add review comments | No | Assigned | Yes | No | No |
| Approve/reject | No | Assigned | Yes | No | No |
| Publish | No | No | Yes | No | No |
| Retire | No | No | Yes | No | No |
| Assign training | No | No | Yes | No | No |
| Waive assignment | No | No | Yes | No | No |
| View published version | Yes | Yes | Yes | Assigned | Yes |
| Take training | No | No | No | Assigned | No |
| View evidence | No | No | Yes | Own only | Yes |
| Export evidence | No | No | Yes | No | Yes |
| View audit log | No | No | Yes | No | Yes |
| Manage quizzes | Own draft | No | Yes | No | No |
| Grade short answers | Own procedure | No | Yes | No | No |

### 14.4 Custom Permission Classes

```python
# backend/apps/procedures/permissions.py

class IsProcedureCreator(BasePermission):
    """User is the creator of the procedure."""
    def has_object_permission(self, request, view, obj):
        return obj.created_by == request.user

class IsAssignedReviewer(BasePermission):
    """User is an assigned reviewer for the active review (via WorkflowTask)."""
    def has_object_permission(self, request, view, obj):
        from django.contrib.contenttypes.models import ContentType
        ct = ContentType.objects.get_for_model(Procedure)
        return WorkflowTask.objects.filter(
            workflow__target_content_type=ct,
            workflow__target_object_id=obj.id,
            workflow__status__in=['ACTIVE', 'PENDING'],
            assigned_to=request.user,
            status__in=['PENDING', 'IN_PROGRESS'],
        ).exists()

class IsAssignedTrainee(BasePermission):
    """User has an active assignment for this procedure version."""
    def has_object_permission(self, request, view, obj):
        return ProcedureAssignment.objects.filter(
            procedure_version=obj,
            assignee=request.user,
            status__in=['assigned', 'in_progress']
        ).exists()

class IsProcedureAdmin(BasePermission):
    """User has Admin role in the organization."""
    def has_permission(self, request, view):
        return UserRole.objects.filter(
            user=request.user, role='admin'
        ).exists()

class IsComplianceAuditor(BasePermission):
    """User has read-only compliance auditor access."""
    def has_permission(self, request, view):
        # Compliance auditors get read-only access
        if request.method not in SAFE_METHODS:
            return False
        return UserRole.objects.filter(
            user=request.user, role='compliance_auditor'
        ).exists()
```

### 14.5 File Upload Security

- File extension validated against `StepAttachment.ALLOWED_EXTENSIONS`
- File size validated against `StepAttachment.MAX_FILE_SIZE_MB`
- MIME type validated (must match extension)
- SHA-256 checksum computed and stored
- Files stored in MinIO with organization-scoped bucket paths:
  `procedures/{org_id}/attachments/{year}/{month}/{uuid}.{ext}`
- Signed URLs for preview/download (15-minute expiry)
- No direct file access — all through API with permission checks

---

## 15. Celery Tasks

### 15.1 Task Registry

```python
# backend/apps/procedures/tasks.py

@shared_task
def send_assignment_reminders():
    """Daily: Send reminder notifications for upcoming due dates."""
    ...

@shared_task
def check_overdue_assignments():
    """Daily: Mark overdue assignments and notify admins."""
    ...

@shared_task
def check_expiring_versions():
    """Daily: Check for versions expiring within 30 days."""
    ...

@shared_task
def auto_generate_recertifications():
    """Daily: Create re-certification assignments for expired versions."""
    ...

@shared_task
def compute_assignment_dashboard_cache(org_id: str):
    """Periodic (every 15 min): Pre-compute dashboard metrics for caching."""
    ...

@shared_task
def export_evidence_pdf(assignment_id: str, requested_by_id: str):
    """On-demand: Generate PDF evidence report asynchronously."""
    ...

@shared_task
def export_evidence_csv(filter_params: dict, requested_by_id: str):
    """On-demand: Generate CSV evidence export asynchronously."""
    ...

@shared_task
def cleanup_abandoned_attempts():
    """Weekly: Mark stale in-progress attempts as abandoned (>30 days inactive)."""
    ...
```

### 15.2 Celery Beat Schedule

```python
# config/celery.py — add to beat_schedule

CELERY_BEAT_SCHEDULE = {
    # ... existing tasks ...

    'procedure-reminders': {
        'task': 'apps.procedures.tasks.send_assignment_reminders',
        'schedule': crontab(hour=8, minute=0),  # 8:00 AM daily
    },
    'procedure-overdue-check': {
        'task': 'apps.procedures.tasks.check_overdue_assignments',
        'schedule': crontab(hour=0, minute=15),  # 12:15 AM daily
    },
    'procedure-expiry-check': {
        'task': 'apps.procedures.tasks.check_expiring_versions',
        'schedule': crontab(hour=7, minute=0),  # 7:00 AM daily
    },
    'procedure-recertification': {
        'task': 'apps.procedures.tasks.auto_generate_recertifications',
        'schedule': crontab(hour=1, minute=0),  # 1:00 AM daily
    },
    'procedure-dashboard-cache': {
        'task': 'apps.procedures.tasks.compute_assignment_dashboard_cache',
        'schedule': crontab(minute='*/15'),  # Every 15 minutes
    },
    'procedure-cleanup-abandoned': {
        'task': 'apps.procedures.tasks.cleanup_abandoned_attempts',
        'schedule': crontab(hour=3, minute=0, day_of_week='sunday'),  # Weekly Sunday 3 AM
    },
}
```

---

## 16. Frontend Pages & Components

### 16.1 New Pages

| Page | Route | Description |
|------|-------|-------------|
| `ProceduresPage` | `/procedures` | List all procedures with filters (state, dept, tags) |
| `ProcedureBuilderPage` | `/procedures/new` and `/procedures/{id}/edit` | Full authoring interface with step builder, quiz builder, attachment management |
| `ProcedureDetailPage` | `/procedures/{id}` | View procedure details, versions, assignment history |
| *(No separate page)* | `/workflows/{instanceId}` | Procedure reviews open in the existing `WorkflowCenterPage` — a `ProcedureReviewPanel` component renders when the workflow target is a Procedure |
| `ProcedureVersionPage` | `/procedures/{id}/versions/{versionNumber}` | Read-only view of a published version |
| `ProcedureVersionDiffPage` | `/procedures/{id}/versions/diff` | Side-by-side version comparison |
| `TrainingPlayerPage` | `/training/{attemptId}` | Full-page training delivery player |
| `MyTrainingPage` | `/my-training` | Trainee's assigned procedures, progress, deadlines |
| `TrainingAssignmentsPage` | `/procedures/assignments` | Admin: manage assignments, view metrics dashboard |
| `TrainingEvidencePage` | `/procedures/evidence` | Compliance: view/export training evidence |
| `QuizTakingPage` | `/training/{attemptId}/quiz/{quizId}` | Quiz interface during training |

### 16.2 New Components

#### Procedure Management
```
components/procedures/
├── ProcedureCard.tsx              # Card display in list view
├── ProcedureFilters.tsx           # State, department, tag filters
├── ProcedureStatusBadge.tsx       # Color-coded lifecycle state badge
├── ProcedureMetadataForm.tsx      # Title, description, parent, tags form
├── ProcedureHierarchyTree.tsx     # Parent-child procedure tree view
```

#### Step Builder
```
components/procedures/steps/
├── StepList.tsx                   # Sortable step list (drag-and-drop)
├── StepCard.tsx                   # Collapsible step card with inline editing
├── StepEditor.tsx                 # Rich text editor for step content
├── StepAttachmentZone.tsx         # Drag-and-drop file upload area per step
├── StepAttachmentList.tsx         # List of attachments with preview/delete
├── StepGateToggles.tsx            # Toggle switches for progression gates
├── StepReorderHandle.tsx          # Drag handle for reordering
├── StepDurationInput.tsx          # Estimated duration input
```

#### Branching
```
components/procedures/branching/
├── BranchConditionEditor.tsx      # Visual condition builder
├── ConditionRow.tsx               # Single condition (field, operator, value)
├── ConditionGroup.tsx             # ALL/ANY group with nested conditions
├── FieldSelector.tsx              # Dropdown for condition field
├── OperatorSelector.tsx           # Dropdown filtered by field type
├── ValueInput.tsx                 # Dynamic input based on field/operator
├── BranchPreview.tsx              # Test condition against sample context
```

#### Quiz Builder
```
components/procedures/quiz/
├── QuizBuilder.tsx                # Full quiz authoring interface
├── QuizSettingsPanel.tsx          # Passing score, attempts, time limit, shuffles
├── QuestionList.tsx               # Sortable question list
├── QuestionEditor.tsx             # Per-type question editor
├── MultipleChoiceEditor.tsx       # Radio-style option editor
├── MultiSelectEditor.tsx          # Checkbox-style option editor
├── TrueFalseEditor.tsx            # Auto-generated True/False editor
├── ShortAnswerEditor.tsx          # Text input + keyword auto-grade config
├── OrderingEditor.tsx             # Drag-and-drop correct order editor
├── QuestionPreview.tsx            # Preview single question as trainee sees it
├── QuizPreviewModal.tsx           # Preview entire quiz
```

#### Review (extends existing WorkflowCenterPage)
```
components/procedures/review/
├── ProcedureReviewPanel.tsx       # Main review interface — embeds within WorkflowCenterPage
├── ReviewStepViewer.tsx           # Read-only step view with comment sidebar
├── StepCommentThread.tsx          # Per-step comment thread (ProcedureStepComment)
├── StepCommentForm.tsx            # Add/reply to step comment
├── ReviewerSelector.tsx           # Pick reviewers when submitting for review
├── ProcedureTargetCard.tsx        # Card shown in WorkflowCenterPage when target is a Procedure
│                                  # (replaces the default document preview card)
```
Note: Approve/reject buttons, reviewer list, general comments, delegation,
and SLA indicators are provided by existing workflow components — no duplication.

#### Version Diff
```
components/procedures/versioning/
├── VersionList.tsx                # List of published versions
├── VersionCard.tsx                # Version metadata card
├── VersionDiffViewer.tsx          # Side-by-side diff display
├── DiffStepCard.tsx               # Step-level diff (added/removed/modified)
├── DiffFieldHighlight.tsx         # Inline text diff highlighting
├── DiffAttachmentIndicator.tsx    # File change indicators
├── VersionSelector.tsx            # Dropdowns for from/to version
```

#### Training Player
```
components/training/
├── TrainingPlayer.tsx             # Main player container
├── StepSidebar.tsx                # Left panel: step list with status icons
├── StepContent.tsx                # Center panel: step content display
├── StepProgressBar.tsx            # Bottom progress bar
├── StepNavigationButtons.tsx      # Previous/Next buttons
├── StepGateBlocker.tsx            # UI blocker showing unmet gate requirements
├── AttachmentViewer.tsx           # Inline preview for PDFs, images, video
├── AttachmentDownloadButton.tsx   # Download button with tracking
├── MediaPlayer.tsx                # Video/audio player with completion tracking
├── TrainingCompletionModal.tsx    # Success/failure modal at end
├── ResumeTrainingBanner.tsx       # "Continue where you left off" banner
```

#### Quiz Taking
```
components/training/quiz/
├── QuizPlayer.tsx                 # Full quiz taking interface
├── QuizTimer.tsx                  # Countdown timer (if time limit)
├── QuizProgress.tsx               # Question X of Y indicator
├── QuestionDisplay.tsx            # Renders question by type
├── MultipleChoiceQuestion.tsx     # Radio button question
├── MultiSelectQuestion.tsx        # Checkbox question
├── TrueFalseQuestion.tsx          # True/False question
├── ShortAnswerQuestion.tsx        # Text input question
├── OrderingQuestion.tsx           # Drag-and-drop ordering
├── QuizResultsPanel.tsx           # Score, pass/fail, per-question feedback
├── QuizRetryPrompt.tsx            # "You have X attempts remaining"
```

#### Assignments & Dashboard
```
components/procedures/assignments/
├── AssignmentForm.tsx             # Create assignments (user/dept/role picker)
├── AssignmentList.tsx             # List with status, due date, progress
├── AssignmentCard.tsx             # Individual assignment card
├── AssignmentStatusBadge.tsx      # Color-coded status badge
├── AssignmentDashboard.tsx        # Metrics: completion %, overdue %, avg time
├── DepartmentBreakdownChart.tsx   # Bar chart by department
├── ProcedureBreakdownChart.tsx    # Bar chart by procedure
├── OverdueAlertList.tsx           # List of overdue assignments
├── ExpirationWarningList.tsx      # Upcoming version expirations
├── UserAssignmentSummary.tsx      # User picker to see one user's assignments
```

#### Evidence & Compliance
```
components/procedures/evidence/
├── EvidenceTable.tsx              # Filterable table of training evidence
├── EvidenceDetailModal.tsx        # Full evidence record for one assignment
├── EvidenceExportButton.tsx       # CSV/PDF export trigger
├── AttemptTimeline.tsx            # Visual timeline of attempts
├── StepEvidenceRow.tsx            # Per-step evidence detail
├── QuizEvidenceRow.tsx            # Per-quiz evidence detail
├── ComplianceReportCard.tsx       # Summary compliance metrics
```

### 16.3 State Management

Add new Redux slices:

```typescript
// store/slices/procedureSlice.ts
interface ProcedureState {
    procedures: Procedure[];
    currentProcedure: Procedure | null;
    loading: boolean;
    error: string | null;
    filters: ProcedureFilters;
    pagination: PaginationState;
}

// store/slices/trainingSlice.ts
interface TrainingState {
    myAssignments: ProcedureAssignment[];
    currentAttempt: TrainingAttempt | null;
    currentStep: StepCompletion | null;
    quizState: QuizState | null;
    loading: boolean;
    error: string | null;
}

// store/slices/procedureReviewSlice.ts
// NOTE: General review state (workflow instance, tasks, general comments)
// is managed by the existing workflow state. This slice is only for
// procedure-specific review data (step comments).
interface ProcedureReviewState {
    stepComments: ProcedureStepComment[];
    unresolvedCount: number;
    loading: boolean;
}
```

### 16.4 New Services

```typescript
// services/procedureService.ts
// All API calls for procedure CRUD, steps, attachments, quizzes,
// submit-for-review, step comments, publishing, versioning, diff
// NOTE: General review actions (approve/reject/delegate/general comments)
// are handled by the existing workflowService.ts — no duplication.

// services/trainingService.ts
// All API calls for training delivery: start, step progression,
// quiz submission, completion

// services/assignmentService.ts
// All API calls for assignments: create, list, waive, dashboard metrics

// services/evidenceService.ts
// All API calls for evidence: list, detail, export
```

### 16.5 Navigation Integration

Add to existing left panel navigation:

```
Procedures            (icon: ClipboardList)
├── All Procedures    /procedures
├── My Training       /my-training
├── Assignments       /procedures/assignments    (Admin only)
└── Evidence          /procedures/evidence        (Admin/Auditor only)
```

---

## 17. Roles & Permissions

### 17.1 New Role: Compliance Auditor

Add to existing `Role.RoleType` choices:

```python
COMPLIANCE_AUDITOR = 'compliance_auditor', 'Compliance Auditor'
```

### 17.2 New Permissions

Add to existing permission system:

```python
# Procedure permissions
'create_procedure'
'edit_procedure'
'delete_procedure'
'submit_procedure_review'
'review_procedure'
'approve_procedure'
'publish_procedure'
'retire_procedure'

# Quiz permissions
'create_quiz'
'edit_quiz'
'grade_quiz'

# Assignment permissions
'assign_training'
'waive_assignment'

# Training permissions
'take_training'

# Evidence permissions
'view_evidence'
'export_evidence'
'view_procedure_audit_log'
```

### 17.3 Role-Permission Mapping

```python
PROCEDURE_ROLE_PERMISSIONS = {
    'viewer': ['take_training'],
    'editor': ['take_training', 'create_procedure', 'edit_procedure', 'submit_procedure_review', 'create_quiz', 'edit_quiz'],
    'manager': ['take_training', 'create_procedure', 'edit_procedure', 'delete_procedure', 'submit_procedure_review', 'review_procedure', 'approve_procedure', 'create_quiz', 'edit_quiz', 'grade_quiz', 'assign_training'],
    'admin': ['*'],  # All permissions
    'compliance_auditor': ['view_evidence', 'export_evidence', 'view_procedure_audit_log'],
}
```

---

## 18. Seed Data & Testing

### 18.1 Management Command

```bash
python manage.py generate_procedure_seed_data
```

Creates:
- 5 procedures across departments (Compliance, HR, IT, Credit, Audit)
- 3-7 steps per procedure with attachments
- 1-2 quizzes per procedure with 5-10 questions each
- 2 procedures in Published state (versions 1 and 2)
- 1 procedure in Review state
- 2 procedures in Draft state
- 50 assignments across users
- 20 completed training attempts with evidence
- 10 in-progress attempts
- 5 overdue assignments
- Audit log entries for all actions

### 18.2 Sample Procedures

1. **New Employee Onboarding** (HR)
   - 5 steps: Welcome, IT Setup, HR Policies, Loan Application (conditional), Account Opening
   - End-of-procedure quiz (10 questions)
   - Version 2 published

2. **AML Compliance Training** (Compliance)
   - 7 steps with step-level quizzes
   - Conditional step for managers
   - Version 1 published

3. **IT Security Awareness** (IT)
   - 4 steps with media completion gates
   - End-of-procedure quiz
   - In Review state

4. **Loan Processing Procedures** (Credit)
   - 6 steps with attachment-heavy content
   - Conditional branching based on loan type
   - Draft state

5. **Internal Audit Procedures** (Audit)
   - 5 steps
   - Draft state

### 18.3 Test Coverage Requirements

| Area | Minimum Coverage |
|------|-----------------|
| Models | 95% |
| Views/Serializers | 90% |
| Branching engine | 100% |
| Quiz grading | 100% |
| Lifecycle transitions | 100% |
| Permission checks | 100% |
| Celery tasks | 85% |
| Frontend components | 80% |

### 18.4 Key Test Cases

**Lifecycle & Workflow Integration:**
- Cannot publish a non-approved procedure
- Cannot approve without all WorkflowTasks decided
- WorkflowTask rejection auto-transitions procedure to DRAFT
- All WorkflowTasks approved auto-transitions procedure to APPROVED
- Cannot assign retired version
- Cannot create new assignment for expired version
- Published version is truly immutable (no field changes possible)
- Existing document workflows still work correctly after GFK migration
- WorkflowInstance.target correctly resolves to Document or Procedure
- Procedure can only have one active WorkflowInstance at a time

**Branching:**
- Step with null condition always shown
- AND conditions require all true
- OR conditions require any true
- Nested conditions evaluate correctly
- Step result conditions work with actual training data
- Invalid condition JSON rejected at save time

**Quiz:**
- Multiple choice: exactly one correct option graded correctly
- Multi-select: partial selection fails
- True/False: graded correctly
- Short answer: keyword matching works (case-insensitive)
- Short answer: manual grading returns null is_correct
- Ordering: correct order passes, any deviation fails
- Mandatory questions: correct score but failed mandatory = overall fail
- Max attempts enforced
- Time limit enforced (submit auto-triggered)

**Training:**
- Resume from last step works
- Cannot advance without meeting gates
- Skipped steps (branch=false) don't block progress
- Time tracking per step is accurate
- Completing all steps + end quiz = attempt complete
- Failed attempt allows retry up to max
- Completed assignment prevents further attempts

**Security:**
- Tenant isolation: user in org A cannot see org B procedures
- Department visibility: restricted to own department unless admin
- Trainee can only access assigned procedures
- Auditor has read-only access
- File upload rejects disallowed extensions
- File upload rejects oversized files

---

## 19. Migration Strategy

### 19.1 Implementation Order

```
Phase A — Foundation (Backend Models + Basic API)
├── 1. Refactor WorkflowInstance: add GenericForeignKey (target_content_type, target_object_id, target_title)
├── 2. Data migration: populate new GFK fields from existing document FK
├── 3. Remove old document FK from WorkflowInstance, update all workflow code referencing instance.document
├── 4. Create procedures app skeleton
├── 5. Implement core models (Procedure, ProcedureStep, StepAttachment)
├── 6. Implement version models (ProcedureVersion, ProcedureVersionStep, VersionStepAttachment)
├── 7. Implement ProcedureStepComment (per-step review comments)
├── 8. Implement ProcedureAuditLog
├── 9. Run makemigrations + migrate
├── 10. Implement serializers for all models
├── 11. Implement CRUD viewsets with permission classes
├── 12. Implement lifecycle state machine (transition validation)
├── 13. Implement submit_for_review (creates WorkflowInstance + WorkflowTasks)
├── 14. Implement workflow completion signal → procedure state update
├── 15. Wire up URLs and test basic CRUD + review flow
│
Phase B — Quiz System
├── 11. Implement quiz models (Quiz, Question, AnswerOption)
├── 12. Implement versioned quiz models (VersionQuiz, VersionQuestion, VersionAnswerOption)
├── 13. Implement quiz serializers and viewsets
├── 14. Implement grading engine (all question types)
├── 15. Write comprehensive quiz grading tests
│
Phase C — Publishing & Versioning
├── 16. Implement publish action (snapshot creation logic)
├── 17. Implement version diff engine
├── 18. Implement retire action
├── 19. Write publishing + diff tests
│
Phase D — Branching Engine
├── 20. Implement branch condition evaluator
├── 21. Implement condition validation (JSON schema)
├── 22. Write branching tests (all operators, nested conditions)
│
Phase E — Assignment & Training
├── 23. Implement assignment models (ProcedureAssignment, TrainingAttempt, StepCompletion)
├── 24. Implement quiz attempt models (QuizAttempt, QuestionResponse)
├── 25. Implement assignment creation (with group expansion)
├── 26. Implement training delivery API (start, step progression, quiz submission, complete)
├── 27. Implement progression gate validation
├── 28. Write training flow tests
│
Phase F — Celery Tasks & Notifications
├── 29. Implement reminder tasks
├── 30. Implement overdue detection task
├── 31. Implement expiry check + re-certification task
├── 32. Implement dashboard cache task
├── 33. Add notification types to existing Notification model
├── 34. Wire up Django signals for audit logging
│
Phase G — Evidence & Export
├── 35. Implement evidence API (list, detail)
├── 36. Implement CSV export
├── 37. Implement PDF export (using reportlab or weasyprint)
│
Phase H — Seed Data & Testing
├── 38. Create seed data management command
├── 39. Complete test suite for all backend
│
Phase I — Frontend: Procedure Management
├── 44. ProceduresPage (list, filters)
├── 45. ProcedureBuilderPage (step builder, attachments)
├── 46. Branch condition editor components
├── 47. Quiz builder components
├── 48. ProcedureReviewPanel + StepCommentThread (integrates into existing WorkflowCenterPage)
├── 49. ProcedureTargetCard (renders procedure info when workflow target is a procedure)
├── 50. ProcedureVersionPage + VersionDiffPage
│
Phase J — Frontend: Training Delivery
├── 51. TrainingPlayerPage (step-by-step player)
├── 52. QuizTakingPage (all question types)
├── 53. MyTrainingPage (trainee dashboard)
├── 54. Resume training logic
│
Phase K — Frontend: Admin & Compliance
├── 55. TrainingAssignmentsPage (create, manage, dashboard metrics)
├── 56. TrainingEvidencePage (view, export)
├── 57. Navigation integration
├── 58. State management (Redux slices + services)
│
Phase L — Integration Testing & Polish
├── 59. End-to-end flow testing (including workflow integration)
├── 60. Verify existing document workflows still work after GFK migration
├── 61. Accessibility audit (WCAG 2.1 AA)
├── 62. Performance testing (large procedures, many assignments)
├── 63. Security testing (tenant isolation, permission edge cases)
```

### 19.2 Database Migration Notes

**Workflows app migration (run FIRST):**
- 3-step migration for WorkflowInstance GenericForeignKey refactor (see Section 2.9.2)
- Must run and verify before creating the procedures app
- All existing document workflows must be tested after migration
- Run `python manage.py makemigrations workflows` then `python manage.py migrate`

**Procedures app migration (run SECOND):**
- All new models go in a single initial migration: `0001_initial.py`
- Add GIN index on `Procedure.tags` for JSON array queries
- Add composite indexes for common query patterns (org+state, assignee+status, due_date)
- Add new notification type choices to `sharing.Notification`
- Run `python manage.py makemigrations procedures` then `python manage.py migrate`

### 19.3 Settings Update

```python
# config/settings.py

INSTALLED_APPS = [
    # ... existing apps ...
    'apps.procedures',
]
```

---

## Model Relationship Diagram

```
Procedure (Draft Entity)
├── ProcedureStep (1:N)
│   ├── StepAttachment (1:N)
│   ├── Quiz (1:N, step_level)
│   │   └── Question (1:N)
│   │       └── AnswerOption (1:N)
│   └── ProcedureStepComment (1:N, per review)
├── Quiz (1:N, end_of_procedure)
│   └── Question → AnswerOption
│
├── WorkflowInstance (1:N, via GenericForeignKey — from workflows app)
│   ├── WorkflowTask (1:N — one per reviewer)
│   ├── WorkflowComment (1:N — general review comments)
│   └── WorkflowAuditLog (1:N — review action audit trail)
│
├── ProcedureVersion (1:N, immutable snapshots)
│   ├── ProcedureVersionStep (1:N)
│   │   ├── VersionStepAttachment (1:N)
│   │   └── VersionQuiz (1:N)
│   │       └── VersionQuestion (1:N)
│   │           └── VersionAnswerOption (1:N)
│   └── VersionQuiz (1:N, end_of_procedure)
│       └── VersionQuestion → VersionAnswerOption
└── ProcedureAuditLog (1:N)

ProcedureAssignment
├── → ProcedureVersion
├── → CustomUser (assignee)
└── TrainingAttempt (1:N)
    ├── StepCompletion (1:N) → ProcedureVersionStep
    └── QuizAttempt (1:N) → VersionQuiz
        └── QuestionResponse (1:N) → VersionQuestion
            └── selected_options (M2M) → VersionAnswerOption

WorkflowInstance (refactored — from workflows app)
├── target_content_type → ContentType (Document | Procedure | ...)
├── target_object_id → UUID of target
└── target = GenericForeignKey (resolves to Document or Procedure)
```

---

**End of Specification**

This document covers the complete implementation of the Procedure Management & Training system — 19 new models + 1 refactored model, 48 new API endpoints + 7 reused from workflows, conditional branching engine, 5 quiz question types, training delivery player, assignment management, evidence compliance exports, Celery tasks, 10 frontend pages, and 60+ frontend components. Review and approval integrated with existing workflows app via GenericForeignKey. Nothing deferred.
