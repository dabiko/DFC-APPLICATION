# Procedure Management & Training — Development Guide

**Version**: 1.0
**Date**: 2026-03-09
**Companion to**: `PROCEDURE_IMPLEMENTATION_SPEC.md` (data models & API spec)
**Purpose**: Step-by-step implementation guide with actual code, file locations, and build order

---

## Table of Contents

1. [Navigation & Access Strategy](#1-navigation--access-strategy)
2. [Implementation Phases](#2-implementation-phases)
3. [Phase A: Workflow GenericForeignKey Refactor](#3-phase-a-workflow-genericforeignkey-refactor)
4. [Phase B: Procedures App Foundation](#4-phase-b-procedures-app-foundation)
5. [Phase C: Quiz System](#5-phase-c-quiz-system)
6. [Phase D: Publishing & Versioning](#6-phase-d-publishing--versioning)
7. [Phase E: Branching Engine](#7-phase-e-branching-engine)
8. [Phase F: Assignment & Training Delivery](#8-phase-f-assignment--training-delivery)
9. [Phase G: Evidence & Export](#9-phase-g-evidence--export)
10. [Phase H: Celery Tasks & Notifications](#10-phase-h-celery-tasks--notifications)
11. [Phase I: Frontend — Procedure Management](#11-phase-i-frontend--procedure-management)
12. [Phase J: Frontend — Training Player](#12-phase-j-frontend--training-player)
13. [Phase K: Frontend — Admin Dashboard & Evidence](#13-phase-k-frontend--admin-dashboard--evidence)
14. [Phase L: Storybook Component Documentation](#14-phase-l-storybook-component-documentation)
15. [Phase M: Seed Data & Testing](#15-phase-m-seed-data--testing)
16. [Phase N: Integration Testing & Polish](#16-phase-n-integration-testing--polish)

---

## 1. Navigation & Access Strategy

### Recommendation: Hybrid Placement

Procedures serve two distinct user groups with different needs:

| User | Need | Where they look |
|------|------|----------------|
| Creators, Reviewers, Admins | Author, review, publish, assign procedures | Admin area (alongside workflows) |
| Trainees | Take assigned training | Main sidebar (quick daily access) |

Putting everything under the Workflow admin menu would hide training from trainees (who don't have admin/manager roles). Putting everything in the sidebar would clutter it for users who don't author procedures.

### Solution: Two entry points

```
┌─ Header (DashboardHeader)
│  └─ Admin Menu (Shield icon, admin/manager only)
│     ├─ Users & Roles
│     ├─ Audit Logs
│     ├─ Retention Policies
│     ├─ Compliance
│     ├─ Workflows (/workflows)           ← existing
│     │  └─ Now has "Procedures" tab      ← NEW TAB in WorkflowCenterPage
│     ├─ Automation
│     └─ ...
│
├─ Left Sidebar (DashboardSidebar, ALL users)
│  ├─ Dashboard
│  ├─ Smart Folders
│  ├─ Smart System Folders [COLLAPSIBLE]
│  │  ├─ My Documents
│  │  ├─ Shared with Me
│  │  ├─ Recent
│  │  ├─ Favorites
│  │  └─ Trash
│  ├─ Training [COLLAPSIBLE]              ← NEW SECTION
│  │  ├─ My Training (/my-training)       ← all users with assignments
│  │  └─ Browse Procedures (/procedures)  ← view published procedures
│  └─ Departments [COLLAPSIBLE]
```

### Why this works

1. **WorkflowCenterPage gets a "Procedures" tab** — Creators/Admins manage procedures in the same hub where they manage document workflows. Consistent admin experience.

2. **Sidebar gets a "Training" section** — Trainees see their assignments without needing admin access. The section only appears if the user has training assignments or the `take_training` permission.

3. **Full-page routes for focused tasks** — Training player, procedure builder, and quiz taking are full-page experiences (no sidebar distraction).

### Route Map

```
# Admin/Creator routes (require admin, manager, or editor role)
/workflows                              → WorkflowCenterPage (existing, add "Procedures" tab)
/procedures/new                         → ProcedureBuilderPage (full-page)
/procedures/:id/edit                    → ProcedureBuilderPage (full-page)
/procedures/:id                         → ProcedureDetailPage
/procedures/:id/versions/:versionNum    → ProcedureVersionPage (read-only)
/procedures/:id/versions/diff           → ProcedureVersionDiffPage
/procedures/assignments                 → TrainingAssignmentsPage (admin dashboard)
/procedures/evidence                    → TrainingEvidencePage (admin/auditor)

# Trainee routes (all authenticated users with assignments)
/my-training                            → MyTrainingPage
/training/:attemptId                    → TrainingPlayerPage (full-page, no sidebar)
/training/:attemptId/quiz/:quizId       → QuizTakingPage (full-page, no sidebar)

# Shared routes (view-only, authenticated users)
/procedures                             → ProceduresListPage (browse published procedures)
```

### Role-Based Visibility

| Route/Nav Item | Viewer | Editor | Manager | Admin | Compliance Auditor |
|----------------|--------|--------|---------|-------|--------------------|
| Sidebar: My Training | If assigned | If assigned | If assigned | If assigned | No |
| Sidebar: Browse Procedures | Yes | Yes | Yes | Yes | Yes |
| Admin Menu → Workflows → Procedures tab | No | Yes | Yes | Yes | No |
| Procedure Builder (create/edit) | No | Yes | Yes | Yes | No |
| Assignments Dashboard | No | No | Yes | Yes | No |
| Evidence & Export | No | No | No | Yes | Yes |
| Training Player | If assigned | If assigned | If assigned | If assigned | No |

---

## 2. Implementation Phases

### Build Order & Dependencies

```
Phase A: Workflow GFK Refactor          [Backend]  ← Must be first (modifies existing app)
    │
Phase B: Procedures App Foundation      [Backend]  ← Core models + CRUD + review integration
    │
    ├── Phase C: Quiz System            [Backend]  ← Independent of D, E
    ├── Phase D: Publishing & Versioning [Backend]  ← Needs B
    └── Phase E: Branching Engine       [Backend]  ← Independent of C, D
         │
Phase F: Assignment & Training          [Backend]  ← Needs C, D, E
    │
Phase G: Evidence & Export              [Backend]  ← Needs F
    │
Phase H: Celery Tasks & Notifications   [Backend]  ← Needs F, G
    │
Phase I: Frontend — Procedure Mgmt      [Frontend] ← Needs B, C, D, E APIs
    │
Phase J: Frontend — Training Player     [Frontend] ← Needs F APIs
    │
Phase K: Frontend — Admin & Evidence    [Frontend] ← Needs F, G APIs
    │
Phase L: Storybook                      [Frontend] ← Parallel with I, J, K
    │
Phase M: Seed Data & Testing            [Both]     ← Needs all above
    │
Phase N: Integration Testing & Polish   [Both]     ← Final phase
```

**Parallelization opportunities:**
- Phases C, D, E can run in parallel (independent backend features)
- Phase L (Storybook) can run alongside I, J, K
- Frontend phases can start once their corresponding backend APIs are ready

---

## 3. Phase A: Workflow GenericForeignKey Refactor

**Goal**: Make `WorkflowInstance` target-agnostic so it can point to Documents, Procedures, or any future model.

### A.1 Create migration: Add new GFK fields

```bash
# File: backend/apps/workflows/migrations/XXXX_add_generic_target.py
```

```python
# backend/apps/workflows/migrations/XXXX_add_generic_target.py

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('contenttypes', '0002_remove_content_type_name'),
        ('workflows', '<previous_migration>'),  # Replace with actual
    ]

    operations = [
        # Step 1: Add nullable GFK fields
        migrations.AddField(
            model_name='workflowinstance',
            name='target_content_type',
            field=models.ForeignKey(
                to='contenttypes.ContentType',
                on_delete=django.db.models.deletion.CASCADE,
                null=True,  # Temporarily nullable for data migration
                blank=True,
                help_text='Type of the target object (Document, Procedure, etc.)',
            ),
        ),
        migrations.AddField(
            model_name='workflowinstance',
            name='target_object_id',
            field=models.UUIDField(null=True, blank=True, help_text='UUID of the target object'),
        ),
        migrations.AddField(
            model_name='workflowinstance',
            name='target_title',
            field=models.CharField(max_length=500, blank=True),
        ),
    ]
```

### A.2 Create data migration: Populate GFK from existing document FK

```python
# backend/apps/workflows/migrations/XXXX_populate_generic_target.py

from django.db import migrations


def populate_target_fields(apps, schema_editor):
    WorkflowInstance = apps.get_model('workflows', 'WorkflowInstance')
    ContentType = apps.get_model('contenttypes', 'ContentType')
    Document = apps.get_model('documents', 'Document')

    # Get the ContentType for Document
    doc_ct = ContentType.objects.get_for_model(Document)

    for instance in WorkflowInstance.objects.select_related('document').all():
        if instance.document:
            instance.target_content_type = doc_ct
            instance.target_object_id = instance.document.id
            instance.target_title = instance.document.title or ''
            instance.save(update_fields=['target_content_type', 'target_object_id', 'target_title'])


def reverse_populate(apps, schema_editor):
    # No reverse needed — the old document FK still exists at this point
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('workflows', '<previous_migration>'),
    ]

    operations = [
        migrations.RunPython(populate_target_fields, reverse_populate),
    ]
```

### A.3 Create migration: Make GFK non-nullable, remove old document FK

```python
# backend/apps/workflows/migrations/XXXX_finalize_generic_target.py

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('workflows', '<previous_migration>'),
    ]

    operations = [
        # Make GFK fields required
        migrations.AlterField(
            model_name='workflowinstance',
            name='target_content_type',
            field=models.ForeignKey(
                to='contenttypes.ContentType',
                on_delete=django.db.models.deletion.CASCADE,
                help_text='Type of the target object (Document, Procedure, etc.)',
            ),
        ),
        migrations.AlterField(
            model_name='workflowinstance',
            name='target_object_id',
            field=models.UUIDField(help_text='UUID of the target object'),
        ),

        # Remove old document FK
        migrations.RemoveField(
            model_name='workflowinstance',
            name='document',
        ),

        # Add index for GFK lookups
        migrations.AddIndex(
            model_name='workflowinstance',
            index=models.Index(
                fields=['target_content_type', 'target_object_id'],
                name='wf_instance_target_idx',
            ),
        ),
    ]
```

### A.4 Update WorkflowInstance model

```python
# backend/apps/workflows/models.py — UPDATE WorkflowInstance class

from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType

class WorkflowInstance(models.Model):
    # ... keep all existing fields ...

    # REPLACE document FK with generic target:
    target_content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        help_text='Type of the target object (Document, Procedure, etc.)'
    )
    target_object_id = models.UUIDField(
        help_text='UUID of the target object'
    )
    target = GenericForeignKey('target_content_type', 'target_object_id')
    target_title = models.CharField(max_length=500, blank=True)

    # ... keep all existing methods ...

    # ADD helper properties:
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

    class Meta:
        db_table = 'workflow_instances'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'due_date']),
            models.Index(fields=['target_content_type', 'target_object_id']),
            models.Index(fields=['initiated_by']),
        ]
```

### A.5 Update all code that references instance.document

Search and replace across the codebase:

```bash
# Find all references to .document on workflow instances
grep -rn "\.document" backend/apps/workflows/
grep -rn "instance\.document" backend/
grep -rn "workflow\.document" backend/
```

**Common patterns to update:**

```python
# BEFORE:
instance.document
instance.document.title
WorkflowInstance.objects.filter(document=some_doc)

# AFTER:
instance.target                    # GenericForeignKey (resolves to actual object)
instance.target_title              # Denormalized title (no extra query)
WorkflowInstance.objects.filter(   # Filter by GFK
    target_content_type=ContentType.objects.get_for_model(Document),
    target_object_id=some_doc.id
)
```

### A.6 Update workflow serializers

```python
# backend/apps/workflows/serializers.py — UPDATE

class WorkflowInstanceSerializer(serializers.ModelSerializer):
    # REMOVE: document = DocumentSerializer(read_only=True)

    # ADD:
    target_type = serializers.CharField(source='target_type', read_only=True)
    target_title = serializers.CharField(read_only=True)
    target_id = serializers.UUIDField(source='target_object_id', read_only=True)

    class Meta:
        model = WorkflowInstance
        fields = [
            'id', 'template', 'template_name',
            'target_type', 'target_id', 'target_title',  # NEW
            'status', 'current_step', 'priority',
            'due_date', 'started_at', 'completed_at',
            'initiated_by', 'notes', 'outcome_reason',
            'created_at', 'updated_at',
        ]
```

### A.7 Update frontend workflowService.ts

```typescript
// frontend/src/services/workflowService.ts — UPDATE

// Update WorkflowInstance interface:
interface WorkflowInstance {
    id: string;
    template: string;
    template_name: string;
    // REMOVE: document: Document;
    // ADD:
    target_type: 'document' | 'procedure';
    target_id: string;
    target_title: string;
    status: string;
    current_step: number;
    priority: string;
    due_date: string | null;
    // ... rest stays the same
}
```

### A.8 Update WorkflowCenterPage to handle generic targets

```typescript
// In workflow task list / active workflows table:
// BEFORE: showed document title directly
// AFTER: show target_title with a type indicator

// Example in task list item:
<div className="flex items-center gap-2">
    {task.workflow.target_type === 'document' && <FileText className="h-4 w-4" />}
    {task.workflow.target_type === 'procedure' && <ClipboardList className="h-4 w-4" />}
    <span>{task.workflow.target_title}</span>
</div>
```

### A.9 Verify existing document workflows still work

```bash
python manage.py test apps.workflows
```

All existing workflow tests must pass unchanged (except for the `document` FK → GFK change in test setup).

---

## 4. Phase B: Procedures App Foundation

### B.1 Create app skeleton

```bash
cd backend
python manage.py startapp procedures
mv procedures apps/procedures
```

```python
# backend/apps/procedures/apps.py
from django.apps import AppConfig

class ProceduresConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.procedures'
    verbose_name = 'Procedures'

    def ready(self):
        import apps.procedures.signals  # noqa
```

```python
# config/settings.py — ADD to INSTALLED_APPS
INSTALLED_APPS = [
    # ... existing ...
    'apps.procedures',
]
```

### B.2 Implement models

Create all models from PROCEDURE_IMPLEMENTATION_SPEC.md Section 2:

```python
# backend/apps/procedures/models.py

import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone


class Procedure(models.Model):
    """Top-level procedure entity."""
    # ... (copy from spec Section 2.1)


class ProcedureStep(models.Model):
    """A single step in a procedure."""
    # ... (copy from spec Section 2.2)


class StepAttachment(models.Model):
    """File attached to a procedure step."""
    # ... (copy from spec Section 2.3)


class ProcedureVersion(models.Model):
    """Immutable snapshot of a published procedure."""
    # ... (copy from spec Section 2.4)


class ProcedureVersionStep(models.Model):
    """Immutable snapshot of a step within a published version."""
    # ... (copy from spec Section 2.5)


class VersionStepAttachment(models.Model):
    """Immutable snapshot of an attachment."""
    # ... (copy from spec Section 2.6)


class ProcedureStepComment(models.Model):
    """Per-step comment thread during review."""
    # ... (copy from spec Section 2.9.4)


class ProcedureAuditLog(models.Model):
    """Immutable audit log for procedure events."""
    # ... (copy from spec Section 2.11)
```

### B.3 Run migrations

```bash
python manage.py makemigrations procedures
python manage.py migrate
```

### B.4 Implement constants

```python
# backend/apps/procedures/constants.py

# File validation
ALLOWED_EXTENSIONS = [
    'pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt',
    'png', 'jpg', 'jpeg', 'gif', 'svg',
    'mp4', 'webm', 'ogg', 'mp3',
    'txt', 'csv', 'json',
]

MAX_FILE_SIZE_MB = 100
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

# Lifecycle
EDITABLE_STATES = ['draft']
SUBMITTABLE_STATES = ['draft']
PUBLISHABLE_STATES = ['approved']
RETIRABLE_STATES = ['published']
```

### B.5 Implement serializers

```python
# backend/apps/procedures/serializers.py

from rest_framework import serializers
from .models import (
    Procedure, ProcedureStep, StepAttachment,
    ProcedureVersion, ProcedureVersionStep, VersionStepAttachment,
    ProcedureStepComment, ProcedureAuditLog,
)


class StepAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = StepAttachment
        fields = '__all__'
        read_only_fields = ['id', 'uploaded_by', 'uploaded_at', 'file_size',
                            'file_extension', 'mime_type', 'checksum_sha256']


class ProcedureStepSerializer(serializers.ModelSerializer):
    attachments = StepAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = ProcedureStep
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProcedureListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    step_count = serializers.IntegerField(source='steps.count', read_only=True)

    class Meta:
        model = Procedure
        fields = [
            'id', 'title', 'description', 'state', 'current_version',
            'tags', 'created_by', 'created_by_name', 'department',
            'department_name', 'step_count', 'created_at', 'updated_at',
        ]


class ProcedureDetailSerializer(serializers.ModelSerializer):
    """Full serializer for detail views."""
    steps = ProcedureStepSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = Procedure
        fields = '__all__'
        read_only_fields = ['id', 'state', 'current_version', 'created_by',
                            'created_at', 'updated_at', 'is_deleted',
                            'deleted_at', 'deleted_by']


class ProcedureCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Procedure
        fields = ['title', 'description', 'department', 'parent_procedure', 'tags']


class StepReorderSerializer(serializers.Serializer):
    steps = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField()),
        help_text='List of {id, order} objects'
    )


class SubmitForReviewSerializer(serializers.Serializer):
    reviewers = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        help_text='List of reviewer user IDs'
    )
    priority = serializers.ChoiceField(
        choices=['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
        default='MEDIUM'
    )
    due_days = serializers.IntegerField(default=5, min_value=1)


class ProcedureStepCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    replies = serializers.SerializerMethodField()

    class Meta:
        model = ProcedureStepComment
        fields = '__all__'
        read_only_fields = ['id', 'author', 'workflow_instance', 'created_at', 'updated_at',
                            'is_resolved', 'resolved_by']

    def get_replies(self, obj):
        if obj.parent_comment is None:
            replies = obj.replies.select_related('author').all()
            return ProcedureStepCommentSerializer(replies, many=True).data
        return []


# Version serializers
class VersionStepAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = VersionStepAttachment
        fields = '__all__'


class ProcedureVersionStepSerializer(serializers.ModelSerializer):
    attachments = VersionStepAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = ProcedureVersionStep
        fields = '__all__'


class ProcedureVersionSerializer(serializers.ModelSerializer):
    steps = ProcedureVersionStepSerializer(many=True, read_only=True)
    published_by_name = serializers.CharField(source='published_by.get_full_name', read_only=True)

    class Meta:
        model = ProcedureVersion
        fields = '__all__'


class ProcedureVersionListSerializer(serializers.ModelSerializer):
    """Lightweight for version list."""
    published_by_name = serializers.CharField(source='published_by.get_full_name', read_only=True)
    step_count = serializers.IntegerField(source='steps.count', read_only=True)

    class Meta:
        model = ProcedureVersion
        fields = [
            'id', 'version_number', 'title', 'published_by_name',
            'published_at', 'effective_from', 'expires_on',
            'is_active', 'step_count', 'changelog',
        ]


class PublishSerializer(serializers.Serializer):
    effective_from = serializers.DateField()
    expires_on = serializers.DateField()
    changelog = serializers.CharField(required=False, default='')

    def validate(self, data):
        if data['expires_on'] <= data['effective_from']:
            raise serializers.ValidationError('expires_on must be after effective_from')
        return data


class RetireSerializer(serializers.Serializer):
    reason = serializers.CharField(min_length=1)
```

### B.6 Implement permission classes

```python
# backend/apps/procedures/permissions.py

from rest_framework.permissions import BasePermission, SAFE_METHODS
from django.contrib.contenttypes.models import ContentType
from apps.workflows.models import WorkflowTask


class IsProcedureCreator(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.created_by == request.user


class IsAssignedReviewer(BasePermission):
    def has_object_permission(self, request, view, obj):
        from .models import Procedure
        ct = ContentType.objects.get_for_model(Procedure)
        return WorkflowTask.objects.filter(
            workflow__target_content_type=ct,
            workflow__target_object_id=obj.id,
            workflow__status__in=['ACTIVE', 'PENDING'],
            assigned_to=request.user,
            status__in=['PENDING', 'IN_PROGRESS'],
        ).exists()


class IsProcedureAdmin(BasePermission):
    def has_permission(self, request, view):
        from apps.permissions.models import UserRole
        return UserRole.objects.filter(
            user=request.user, role__in=['admin', 'ADMIN']
        ).exists()


class IsProcedureManager(BasePermission):
    def has_permission(self, request, view):
        from apps.permissions.models import UserRole
        return UserRole.objects.filter(
            user=request.user, role__in=['admin', 'ADMIN', 'manager', 'MANAGER']
        ).exists()


class CanCreateProcedure(BasePermission):
    def has_permission(self, request, view):
        from apps.permissions.models import UserRole
        return UserRole.objects.filter(
            user=request.user,
            role__in=['admin', 'ADMIN', 'manager', 'MANAGER', 'editor', 'EDITOR']
        ).exists()


class IsComplianceAuditor(BasePermission):
    def has_permission(self, request, view):
        if request.method not in SAFE_METHODS:
            return False
        from apps.permissions.models import UserRole
        return UserRole.objects.filter(
            user=request.user, role__in=['compliance_auditor', 'COMPLIANCE_AUDITOR']
        ).exists()


class IsAssignedTrainee(BasePermission):
    def has_object_permission(self, request, view, obj):
        from .models import ProcedureAssignment
        return ProcedureAssignment.objects.filter(
            procedure_version=obj,
            assignee=request.user,
            status__in=['assigned', 'in_progress']
        ).exists()
```

### B.7 Implement views

```python
# backend/apps/procedures/views.py

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from datetime import timedelta

from .models import (
    Procedure, ProcedureStep, StepAttachment,
    ProcedureVersion, ProcedureStepComment, ProcedureAuditLog,
)
from .serializers import (
    ProcedureListSerializer, ProcedureDetailSerializer, ProcedureCreateSerializer,
    ProcedureStepSerializer, StepAttachmentSerializer,
    StepReorderSerializer, SubmitForReviewSerializer,
    ProcedureStepCommentSerializer,
    ProcedureVersionSerializer, ProcedureVersionListSerializer,
    PublishSerializer, RetireSerializer,
)
from .permissions import (
    IsProcedureCreator, IsProcedureAdmin, IsProcedureManager,
    CanCreateProcedure, IsAssignedReviewer,
)
from apps.workflows.models import (
    WorkflowInstance, WorkflowTask, WorkflowTemplate,
    WorkflowInstanceStatus, WorkflowStepType, WorkflowAuditLog,
)


class ProcedureViewSet(viewsets.ModelViewSet):
    """CRUD for procedures."""

    def get_queryset(self):
        qs = Procedure.objects.filter(
            organization=self.request.user.organization,
            is_deleted=False,
        ).select_related('created_by', 'department')

        # Filters
        state = self.request.query_params.get('state')
        if state:
            qs = qs.filter(state=state)

        department = self.request.query_params.get('department')
        if department:
            qs = qs.filter(department_id=department)

        tag = self.request.query_params.getlist('tag')
        if tag:
            qs = qs.filter(tags__contains=tag)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                models.Q(title__icontains=search) |
                models.Q(description__icontains=search)
            )

        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return ProcedureListSerializer
        if self.action == 'create':
            return ProcedureCreateSerializer
        return ProcedureDetailSerializer

    def get_permissions(self):
        if self.action in ['create']:
            return [permissions.IsAuthenticated(), CanCreateProcedure()]
        if self.action in ['update', 'partial_update']:
            return [permissions.IsAuthenticated(), IsProcedureCreator() | IsProcedureAdmin()]
        if self.action in ['destroy']:
            return [permissions.IsAuthenticated(), IsProcedureCreator() | IsProcedureAdmin()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        procedure = serializer.save(
            created_by=self.request.user,
            organization=self.request.user.organization,
            state=Procedure.State.DRAFT,
        )
        ProcedureAuditLog.objects.create(
            organization=procedure.organization,
            action=ProcedureAuditLog.Action.CREATED,
            actor=self.request.user,
            procedure=procedure,
            ip_address=self.request.META.get('REMOTE_ADDR'),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
        )

    def perform_destroy(self, instance):
        # Soft delete
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.deleted_by = self.request.user
        instance.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])

    # --- Submit for Review ---
    @action(detail=True, methods=['post'], url_path='submit-for-review')
    def submit_for_review(self, request, pk=None):
        procedure = self.get_object()

        if procedure.state != Procedure.State.DRAFT:
            return Response(
                {'error': 'Only draft procedures can be submitted for review.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if procedure.steps.count() == 0:
            return Response(
                {'error': 'Procedure must have at least one step.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = SubmitForReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reviewers = serializer.validated_data['reviewers']
        priority = serializer.validated_data['priority']
        due_days = serializer.validated_data['due_days']

        # Check no active review exists
        ct = ContentType.objects.get_for_model(Procedure)
        active_review = WorkflowInstance.objects.filter(
            target_content_type=ct,
            target_object_id=procedure.id,
            status__in=[WorkflowInstanceStatus.ACTIVE, WorkflowInstanceStatus.PENDING],
        ).exists()

        if active_review:
            return Response(
                {'error': 'An active review already exists for this procedure.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get or create Procedure Review template
        template, _ = WorkflowTemplate.objects.get_or_create(
            organization=procedure.organization,
            name='Procedure Review',
            defaults={
                'description': 'Review and approval workflow for procedures',
                'category': 'Procedures',
                'is_system': True,
                'default_priority': priority,
                'default_due_days': due_days,
                'created_by': request.user,
            }
        )

        # Create WorkflowInstance
        due_date = timezone.now() + timedelta(days=due_days)
        instance = WorkflowInstance.objects.create(
            organization=procedure.organization,
            template=template,
            template_name=template.name,
            target_content_type=ct,
            target_object_id=procedure.id,
            target_title=procedure.title,
            status=WorkflowInstanceStatus.ACTIVE,
            priority=priority,
            due_date=due_date,
            initiated_by=request.user,
            started_at=timezone.now(),
        )

        # Create WorkflowTask per reviewer
        from apps.users.models import CustomUser
        reviewer_users = CustomUser.objects.filter(id__in=reviewers)

        for reviewer in reviewer_users:
            WorkflowTask.objects.create(
                workflow=instance,
                step_order=1,
                step_name='Procedure Review',
                step_type=WorkflowStepType.APPROVAL,
                assigned_to=reviewer,
                due_date=due_date,
            )

        # Transition procedure state
        procedure.state = Procedure.State.IN_REVIEW
        procedure.save(update_fields=['state', 'updated_at'])

        # Audit
        WorkflowAuditLog.log(
            workflow=instance,
            action='CREATED',
            actor=request.user,
            details=f'Procedure "{procedure.title}" submitted for review',
            metadata={
                'procedure_id': str(procedure.id),
                'reviewers': [str(r) for r in reviewers],
            },
            ip_address=request.META.get('REMOTE_ADDR'),
        )

        ProcedureAuditLog.objects.create(
            organization=procedure.organization,
            action=ProcedureAuditLog.Action.SUBMITTED_FOR_REVIEW,
            actor=request.user,
            procedure=procedure,
            ip_address=request.META.get('REMOTE_ADDR'),
            detail={'workflow_instance_id': str(instance.id)},
        )

        return Response({
            'workflow_instance_id': str(instance.id),
            'message': 'Procedure submitted for review.',
        }, status=status.HTTP_200_OK)


class ProcedureStepViewSet(viewsets.ModelViewSet):
    """CRUD for procedure steps."""
    serializer_class = ProcedureStepSerializer

    def get_queryset(self):
        return ProcedureStep.objects.filter(
            procedure_id=self.kwargs['procedure_pk'],
            procedure__organization=self.request.user.organization,
        ).prefetch_related('attachments')

    def perform_create(self, serializer):
        procedure = Procedure.objects.get(
            id=self.kwargs['procedure_pk'],
            organization=self.request.user.organization,
        )
        if procedure.state not in ['draft']:
            from rest_framework.exceptions import ValidationError
            raise ValidationError('Can only add steps to draft procedures.')
        serializer.save(procedure=procedure)

    @action(detail=False, methods=['post'], url_path='reorder')
    def reorder(self, request, procedure_pk=None):
        serializer = StepReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        for item in serializer.validated_data['steps']:
            ProcedureStep.objects.filter(
                id=item['id'],
                procedure_id=procedure_pk,
            ).update(order=int(item['order']))

        return Response({'message': 'Steps reordered.'})


class StepAttachmentViewSet(viewsets.ModelViewSet):
    """CRUD for step attachments."""
    serializer_class = StepAttachmentSerializer

    def get_queryset(self):
        return StepAttachment.objects.filter(
            step_id=self.kwargs['step_pk'],
            step__procedure_id=self.kwargs['procedure_pk'],
        )

    def perform_create(self, serializer):
        import hashlib
        file = self.request.FILES.get('file')

        if not file:
            from rest_framework.exceptions import ValidationError
            raise ValidationError('No file provided.')

        ext = file.name.rsplit('.', 1)[-1].lower() if '.' in file.name else ''
        if ext not in StepAttachment.ALLOWED_EXTENSIONS:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(f'File type .{ext} not allowed.')

        if file.size > StepAttachment.MAX_FILE_SIZE_MB * 1024 * 1024:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(f'File exceeds {StepAttachment.MAX_FILE_SIZE_MB}MB limit.')

        # Compute checksum
        sha256 = hashlib.sha256()
        for chunk in file.chunks():
            sha256.update(chunk)
        checksum = sha256.hexdigest()
        file.seek(0)  # Reset after reading

        step = ProcedureStep.objects.get(
            id=self.kwargs['step_pk'],
            procedure_id=self.kwargs['procedure_pk'],
        )

        serializer.save(
            step=step,
            file=file,
            file_name=file.name,
            file_size=file.size,
            file_extension=ext,
            mime_type=file.content_type or 'application/octet-stream',
            checksum_sha256=checksum,
            uploaded_by=self.request.user,
        )


class ProcedureStepCommentViewSet(viewsets.ModelViewSet):
    """Per-step comments during review."""
    serializer_class = ProcedureStepCommentSerializer

    def get_queryset(self):
        procedure_id = self.kwargs['procedure_pk']
        ct = ContentType.objects.get_for_model(Procedure)

        # Get active workflow instance for this procedure
        active_instance = WorkflowInstance.objects.filter(
            target_content_type=ct,
            target_object_id=procedure_id,
            status__in=[WorkflowInstanceStatus.ACTIVE, WorkflowInstanceStatus.PENDING],
        ).first()

        if not active_instance:
            return ProcedureStepComment.objects.none()

        return ProcedureStepComment.objects.filter(
            workflow_instance=active_instance,
        ).select_related('author', 'step').order_by('step__order', 'created_at')

    def perform_create(self, serializer):
        procedure_id = self.kwargs['procedure_pk']
        ct = ContentType.objects.get_for_model(Procedure)

        active_instance = WorkflowInstance.objects.filter(
            target_content_type=ct,
            target_object_id=procedure_id,
            status__in=[WorkflowInstanceStatus.ACTIVE, WorkflowInstanceStatus.PENDING],
        ).first()

        if not active_instance:
            from rest_framework.exceptions import ValidationError
            raise ValidationError('No active review for this procedure.')

        serializer.save(
            workflow_instance=active_instance,
            author=self.request.user,
        )

    @action(detail=True, methods=['post'], url_path='resolve')
    def resolve(self, request, procedure_pk=None, pk=None):
        comment = self.get_object()
        comment.is_resolved = True
        comment.resolved_by = request.user
        comment.save(update_fields=['is_resolved', 'resolved_by', 'updated_at'])
        return Response({'message': 'Comment resolved.'})
```

### B.8 Implement URL routing

```python
# backend/apps/procedures/urls.py

from django.urls import path, include
from rest_framework_nested import routers
from . import views

# Main router
router = routers.DefaultRouter()
router.register(r'procedures', views.ProcedureViewSet, basename='procedure')

# Nested routers
procedures_router = routers.NestedDefaultRouter(router, r'procedures', lookup='procedure')
procedures_router.register(r'steps', views.ProcedureStepViewSet, basename='procedure-steps')
procedures_router.register(r'step-comments', views.ProcedureStepCommentViewSet, basename='procedure-step-comments')

steps_router = routers.NestedDefaultRouter(procedures_router, r'steps', lookup='step')
steps_router.register(r'attachments', views.StepAttachmentViewSet, basename='step-attachments')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(procedures_router.urls)),
    path('', include(steps_router.urls)),
]
```

```python
# config/urls.py — ADD
urlpatterns = [
    # ... existing ...
    path('api/v1/', include('apps.procedures.urls')),
]
```

### B.9 Implement signals (workflow → procedure state sync)

```python
# backend/apps/procedures/signals.py

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
    """
    workflow = instance.workflow

    # Only handle procedure workflows
    if not hasattr(workflow, 'target_content_type'):
        return

    procedure_ct = ContentType.objects.get_for_model(Procedure)
    if workflow.target_content_type != procedure_ct:
        return

    # Only process if the task was just completed
    if instance.status not in [WorkflowTaskStatus.APPROVED, WorkflowTaskStatus.REJECTED]:
        return

    tasks = workflow.tasks.all()

    # Any rejection → procedure returns to Draft
    if tasks.filter(status=WorkflowTaskStatus.REJECTED).exists():
        workflow.complete(approved=False, reason='Rejected by reviewer')
        try:
            procedure = Procedure.objects.get(id=workflow.target_object_id)
            procedure.state = Procedure.State.DRAFT
            procedure.save(update_fields=['state', 'updated_at'])
        except Procedure.DoesNotExist:
            pass
        return

    # All tasks resolved and none rejected → approved
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
```

### B.10 Verify Phase B

```bash
python manage.py makemigrations procedures
python manage.py migrate
python manage.py test apps.procedures
```

---

## 5. Phase C: Quiz System

### C.1 Add quiz models to procedures/models.py

Add `Quiz`, `Question`, `AnswerOption` from spec Section 2.7.

### C.2 Add versioned quiz models

Add `VersionQuiz`, `VersionQuestion`, `VersionAnswerOption` from spec Section 2.8.

### C.3 Quiz serializers

```python
# Add to backend/apps/procedures/serializers.py

class AnswerOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnswerOption
        fields = '__all__'
        read_only_fields = ['id']


class QuestionSerializer(serializers.ModelSerializer):
    options = AnswerOptionSerializer(many=True)

    class Meta:
        model = Question
        fields = '__all__'
        read_only_fields = ['id']

    def create(self, validated_data):
        options_data = validated_data.pop('options', [])
        question = Question.objects.create(**validated_data)
        for option_data in options_data:
            AnswerOption.objects.create(question=question, **option_data)
        return question

    def update(self, instance, validated_data):
        options_data = validated_data.pop('options', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if options_data is not None:
            instance.options.all().delete()
            for option_data in options_data:
                AnswerOption.objects.create(question=instance, **option_data)

        return instance


class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class QuizCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quiz
        fields = ['quiz_type', 'step', 'title', 'description',
                  'passing_score_percent', 'max_attempts', 'time_limit_minutes',
                  'shuffle_questions', 'shuffle_answers', 'show_correct_answers_after']
```

### C.4 Implement grading engine

```python
# backend/apps/procedures/utils.py

def grade_quiz_attempt(quiz_attempt):
    """Grade all responses in a quiz attempt. Returns result dict."""
    # ... (copy from spec Section 9.2)

def grade_question(response, question):
    """Grade a single question response."""
    # ... (copy from spec Section 9.2)
```

### C.5 Quiz views

```python
# Add to backend/apps/procedures/views.py

class QuizViewSet(viewsets.ModelViewSet):
    """CRUD for quizzes within a procedure."""
    serializer_class = QuizSerializer

    def get_queryset(self):
        return Quiz.objects.filter(
            procedure_id=self.kwargs['procedure_pk'],
        ).prefetch_related('questions__options')

    def get_serializer_class(self):
        if self.action == 'create':
            return QuizCreateSerializer
        return QuizSerializer

    def perform_create(self, serializer):
        procedure = Procedure.objects.get(id=self.kwargs['procedure_pk'])
        serializer.save(procedure=procedure)


class QuestionViewSet(viewsets.ModelViewSet):
    """CRUD for questions within a quiz."""
    serializer_class = QuestionSerializer

    def get_queryset(self):
        return Question.objects.filter(
            quiz_id=self.kwargs['quiz_pk'],
        ).prefetch_related('options')
```

### C.6 Register quiz routes

```python
# Update backend/apps/procedures/urls.py

procedures_router.register(r'quizzes', views.QuizViewSet, basename='procedure-quizzes')

quizzes_router = routers.NestedDefaultRouter(procedures_router, r'quizzes', lookup='quiz')
quizzes_router.register(r'questions', views.QuestionViewSet, basename='quiz-questions')

urlpatterns = [
    # ... existing ...
    path('', include(quizzes_router.urls)),
]
```

---

## 6. Phase D: Publishing & Versioning

### D.1 Publish action

```python
# Add to ProcedureViewSet in views.py

@action(detail=True, methods=['post'], url_path='publish')
def publish(self, request, pk=None):
    procedure = self.get_object()

    if procedure.state != Procedure.State.APPROVED:
        return Response(
            {'error': 'Only approved procedures can be published.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    serializer = PublishSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    procedure.current_version += 1
    version = self._create_version_snapshot(
        procedure=procedure,
        version_number=procedure.current_version,
        published_by=request.user,
        **serializer.validated_data,
    )

    procedure.state = Procedure.State.PUBLISHED
    procedure.save(update_fields=['state', 'current_version', 'updated_at'])

    ProcedureAuditLog.objects.create(
        organization=procedure.organization,
        action=ProcedureAuditLog.Action.PUBLISHED,
        actor=request.user,
        procedure=procedure,
        version=version,
        ip_address=request.META.get('REMOTE_ADDR'),
    )

    return Response(ProcedureVersionSerializer(version).data, status=status.HTTP_201_CREATED)

def _create_version_snapshot(self, procedure, version_number, published_by,
                              effective_from, expires_on, changelog=''):
    """Create immutable snapshot of procedure at current state."""

    # Find the approver (from the workflow)
    ct = ContentType.objects.get_for_model(Procedure)
    last_workflow = WorkflowInstance.objects.filter(
        target_content_type=ct,
        target_object_id=procedure.id,
        status=WorkflowInstanceStatus.APPROVED,
    ).order_by('-completed_at').first()

    approved_by = published_by  # fallback
    if last_workflow:
        last_approver_task = last_workflow.tasks.filter(
            status=WorkflowTaskStatus.APPROVED
        ).order_by('-completed_at').first()
        if last_approver_task:
            approved_by = last_approver_task.assigned_to

    version = ProcedureVersion.objects.create(
        procedure=procedure,
        version_number=version_number,
        title=procedure.title,
        description=procedure.description,
        tags=procedure.tags,
        published_by=published_by,
        approved_by=approved_by,
        effective_from=effective_from,
        expires_on=expires_on,
        changelog=changelog,
    )

    # Snapshot steps
    for step in procedure.steps.order_by('order'):
        version_step = ProcedureVersionStep.objects.create(
            version=version,
            original_step_id=step.id,
            title=step.title,
            description=step.description,
            order=step.order,
            estimated_duration_minutes=step.estimated_duration_minutes,
            branch_condition=step.branch_condition,
            require_manual_open=step.require_manual_open,
            require_media_completion=step.require_media_completion,
            require_quiz_pass=step.require_quiz_pass,
        )

        # Snapshot attachments
        for att in step.attachments.order_by('order'):
            VersionStepAttachment.objects.create(
                version_step=version_step,
                original_attachment_id=att.id,
                attachment_type=att.attachment_type,
                title=att.title,
                file=att.file,  # Points to same MinIO object
                file_name=att.file_name,
                file_size=att.file_size,
                file_extension=att.file_extension,
                mime_type=att.mime_type,
                checksum_sha256=att.checksum_sha256,
                order=att.order,
            )

        # Snapshot step-level quizzes
        for quiz in step.quizzes.all():
            self._snapshot_quiz(quiz, version, version_step)

    # Snapshot end-of-procedure quizzes
    for quiz in procedure.quizzes.filter(quiz_type='end_of_procedure'):
        self._snapshot_quiz(quiz, version, None)

    return version

def _snapshot_quiz(self, quiz, version, version_step):
    """Create immutable snapshot of a quiz and its questions."""
    version_quiz = VersionQuiz.objects.create(
        version=version,
        version_step=version_step,
        original_quiz_id=quiz.id,
        quiz_type=quiz.quiz_type,
        title=quiz.title,
        description=quiz.description,
        passing_score_percent=quiz.passing_score_percent,
        max_attempts=quiz.max_attempts,
        time_limit_minutes=quiz.time_limit_minutes,
        shuffle_questions=quiz.shuffle_questions,
        shuffle_answers=quiz.shuffle_answers,
        show_correct_answers_after=quiz.show_correct_answers_after,
    )

    for question in quiz.questions.order_by('order'):
        version_question = VersionQuestion.objects.create(
            version_quiz=version_quiz,
            original_question_id=question.id,
            question_type=question.question_type,
            text=question.text,
            explanation=question.explanation,
            order=question.order,
            points=question.points,
            is_mandatory=question.is_mandatory,
            auto_grade_keywords=question.auto_grade_keywords,
        )

        for option in question.options.order_by('order'):
            VersionAnswerOption.objects.create(
                version_question=version_question,
                original_option_id=option.id,
                text=option.text,
                is_correct=option.is_correct,
                correct_order=option.correct_order,
                order=option.order,
            )
```

### D.2 Version diff engine

```python
# Add to backend/apps/procedures/utils.py

def compute_version_diff(from_version, to_version):
    """Compare two published versions and return structured diff."""

    diff = {
        'from_version': from_version.version_number,
        'to_version': to_version.version_number,
        'metadata_changes': {},
        'step_changes': [],
        'attachment_changes': [],
        'quiz_changes': [],
    }

    # Metadata diff
    for field in ['title', 'description']:
        from_val = getattr(from_version, field)
        to_val = getattr(to_version, field)
        if from_val != to_val:
            diff['metadata_changes'][field] = {'from': from_val, 'to': to_val}

    # Tags diff
    from_tags = set(from_version.tags or [])
    to_tags = set(to_version.tags or [])
    if from_tags != to_tags:
        diff['metadata_changes']['tags'] = {
            'added': list(to_tags - from_tags),
            'removed': list(from_tags - to_tags),
        }

    # Step diff — match by original_step_id
    from_steps = {s.original_step_id: s for s in from_version.steps.all()}
    to_steps = {s.original_step_id: s for s in to_version.steps.all()}

    all_step_ids = set(from_steps.keys()) | set(to_steps.keys())

    for step_id in all_step_ids:
        from_step = from_steps.get(step_id)
        to_step = to_steps.get(step_id)

        if from_step and not to_step:
            diff['step_changes'].append({
                'type': 'removed',
                'step_order': from_step.order,
                'from_step_id': str(from_step.id),
                'step_data': {'title': from_step.title},
            })
        elif to_step and not from_step:
            diff['step_changes'].append({
                'type': 'added',
                'step_order': to_step.order,
                'to_step_id': str(to_step.id),
                'step_data': {'title': to_step.title},
            })
        else:
            changes = {}
            for field in ['title', 'description', 'order', 'branch_condition',
                          'require_manual_open', 'require_media_completion', 'require_quiz_pass']:
                from_val = getattr(from_step, field)
                to_val = getattr(to_step, field)
                if from_val != to_val:
                    changes[field] = {'from': from_val, 'to': to_val}

            if changes:
                diff['step_changes'].append({
                    'type': 'modified',
                    'step_order': to_step.order,
                    'from_step_id': str(from_step.id),
                    'to_step_id': str(to_step.id),
                    'changes': changes,
                })

    return diff
```

### D.3 Version diff endpoint

```python
# Add to ProcedureViewSet

@action(detail=True, methods=['get'], url_path='versions/diff')
def version_diff(self, request, pk=None):
    procedure = self.get_object()
    from_num = request.query_params.get('from_version')
    to_num = request.query_params.get('to_version')

    if not from_num or not to_num:
        return Response({'error': 'from_version and to_version required.'}, status=400)

    from_version = procedure.versions.filter(version_number=from_num).first()
    to_version = procedure.versions.filter(version_number=to_num).first()

    if not from_version or not to_version:
        return Response({'error': 'Version not found.'}, status=404)

    diff = compute_version_diff(from_version, to_version)
    return Response(diff)
```

---

## 7. Phase E: Branching Engine

### E.1 Implement condition evaluator

```python
# Add to backend/apps/procedures/utils.py

def evaluate_branch_condition(condition, context):
    """Evaluate a branch condition against trainee context."""
    # ... (copy from spec Section 6.4)

def apply_operator(operator, actual, expected):
    """Apply a comparison operator."""
    if actual is None:
        return False

    ops = {
        'eq': lambda a, e: a == e,
        'neq': lambda a, e: a != e,
        'in': lambda a, e: a in e if isinstance(e, list) else False,
        'not_in': lambda a, e: a not in e if isinstance(e, list) else True,
        'gt': lambda a, e: float(a) > float(e),
        'gte': lambda a, e: float(a) >= float(e),
        'lt': lambda a, e: float(a) < float(e),
        'lte': lambda a, e: float(a) <= float(e),
        'contains': lambda a, e: str(e).lower() in str(a).lower(),
    }

    op_func = ops.get(operator)
    if not op_func:
        return False

    try:
        return op_func(actual, expected)
    except (ValueError, TypeError):
        return False


def validate_branch_condition(condition):
    """Validate a branch condition JSON structure. Returns (is_valid, errors)."""
    if condition is None:
        return True, []

    errors = []

    if isinstance(condition, dict):
        if 'all' in condition:
            if not isinstance(condition['all'], list):
                errors.append('"all" must be a list')
            else:
                for sub in condition['all']:
                    valid, sub_errors = validate_branch_condition(sub)
                    errors.extend(sub_errors)

        elif 'any' in condition:
            if not isinstance(condition['any'], list):
                errors.append('"any" must be a list')
            else:
                for sub in condition['any']:
                    valid, sub_errors = validate_branch_condition(sub)
                    errors.extend(sub_errors)

        elif 'field' in condition:
            required = ['field', 'operator', 'value']
            for key in required:
                if key not in condition:
                    errors.append(f'Missing required key: {key}')

            valid_fields = ['role', 'department', 'job_title', 'step_result', 'quiz_score', 'custom_field']
            if condition.get('field') not in valid_fields:
                errors.append(f'Invalid field: {condition.get("field")}')

            valid_operators = ['eq', 'neq', 'in', 'not_in', 'gt', 'gte', 'lt', 'lte', 'contains']
            if condition.get('operator') not in valid_operators:
                errors.append(f'Invalid operator: {condition.get("operator")}')
        else:
            errors.append('Condition must have "all", "any", or "field" key')
    else:
        errors.append('Condition must be a dict')

    return len(errors) == 0, errors
```

---

## 8. Phase F: Assignment & Training Delivery

### F.1 Add assignment and training models

Add to `procedures/models.py`:
- `ProcedureAssignment` (spec Section 2.10)
- `TrainingAttempt` (spec Section 2.10)
- `StepCompletion` (spec Section 2.10)
- `QuizAttempt` (spec Section 2.10)
- `QuestionResponse` (spec Section 2.10)

### F.2 Assignment serializers and views

```python
# Add to serializers.py

class ProcedureAssignmentSerializer(serializers.ModelSerializer):
    assignee_name = serializers.CharField(source='assignee.get_full_name', read_only=True)
    procedure_title = serializers.CharField(source='procedure_version.title', read_only=True)
    version_number = serializers.IntegerField(source='procedure_version.version_number', read_only=True)

    class Meta:
        model = ProcedureAssignment
        fields = '__all__'
        read_only_fields = ['id', 'assigned_at', 'completed_at', 'completion_score',
                            'last_reminder_sent', 'reminder_count']


class CreateAssignmentSerializer(serializers.Serializer):
    procedure_version_id = serializers.UUIDField()
    assignees = serializers.ListField(child=serializers.UUIDField(), required=False, default=[])
    departments = serializers.ListField(child=serializers.UUIDField(), required=False, default=[])
    roles = serializers.ListField(child=serializers.CharField(), required=False, default=[])
    due_date = serializers.DateField()
```

### F.3 Training delivery views

```python
# Add to views.py

class TrainingViewSet(viewsets.GenericViewSet):
    """Training delivery — start, progress, complete."""

    @action(detail=False, methods=['post'], url_path='start')
    def start_training(self, request):
        assignment_id = request.data.get('assignment_id')
        assignment = ProcedureAssignment.objects.get(
            id=assignment_id,
            assignee=request.user,
            status__in=['assigned', 'in_progress'],
        )

        # Check for existing in-progress attempt
        existing = assignment.attempts.filter(status='in_progress').first()
        if existing:
            return Response(TrainingAttemptSerializer(existing).data)

        # Build trainee context for branching
        trainee_context = {
            'role': list(request.user.user_roles.values_list('role', flat=True)),
            'department': getattr(request.user.department, 'slug', ''),
            'job_title': getattr(request.user, 'job_title', ''),
            'step_results': {},
            'quiz_scores': {},
        }

        version = assignment.procedure_version
        total_steps = version.steps.count()
        attempt_number = assignment.attempts.count() + 1

        attempt = TrainingAttempt.objects.create(
            assignment=assignment,
            attempt_number=attempt_number,
            total_steps=total_steps,
            trainee_context=trainee_context,
        )

        # Create StepCompletion for each step
        for version_step in version.steps.order_by('order'):
            should_show = evaluate_branch_condition(
                version_step.branch_condition,
                trainee_context,
            )
            StepCompletion.objects.create(
                attempt=attempt,
                version_step=version_step,
                status='not_started' if should_show else 'skipped',
            )

        assignment.status = 'in_progress'
        assignment.save(update_fields=['status'])

        return Response(TrainingAttemptSerializer(attempt).data, status=201)

    @action(detail=True, methods=['post'], url_path=r'steps/(?P<step_id>[^/.]+)/complete')
    def complete_step(self, request, pk=None, step_id=None):
        attempt = TrainingAttempt.objects.get(id=pk, assignment__assignee=request.user)
        step_completion = StepCompletion.objects.get(attempt=attempt, version_step_id=step_id)

        # Validate gates
        can_advance, reasons = can_advance_to_next_step(step_completion)
        if not can_advance:
            return Response({'errors': reasons}, status=400)

        step_completion.status = 'completed'
        step_completion.completed_at = timezone.now()
        if step_completion.started_at:
            step_completion.time_spent_seconds = int(
                (timezone.now() - step_completion.started_at).total_seconds()
            )
        step_completion.save()

        attempt.steps_completed = attempt.step_completions.filter(status='completed').count()
        attempt.save(update_fields=['steps_completed'])

        return Response({'message': 'Step completed.', 'steps_completed': attempt.steps_completed})
```

---

## 9. Phase G: Evidence & Export

### G.1 Evidence views

```python
# Add to views.py

class EvidenceViewSet(viewsets.ReadOnlyModelViewSet):
    """Training evidence for compliance."""
    permission_classes = [permissions.IsAuthenticated, IsProcedureAdmin | IsComplianceAuditor]

    def get_queryset(self):
        return ProcedureAssignment.objects.filter(
            organization=self.request.user.organization,
        ).select_related(
            'procedure_version', 'assignee', 'assigned_by',
        ).prefetch_related('attempts__step_completions', 'attempts__quiz_attempts')

    @action(detail=False, methods=['get'], url_path='export')
    def export(self, request):
        format = request.query_params.get('format', 'csv')
        if format == 'csv':
            return self._export_csv(request)
        elif format == 'pdf':
            # Trigger async PDF generation
            from .tasks import export_evidence_pdf
            export_evidence_pdf.delay(
                filter_params=dict(request.query_params),
                requested_by_id=str(request.user.id),
            )
            return Response({'message': 'PDF export started. You will be notified when ready.'})

    def _export_csv(self, request):
        import csv
        from django.http import HttpResponse

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="training_evidence.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'assignment_id', 'procedure_title', 'version_number',
            'assignee_name', 'assignee_email', 'department',
            'assigned_by', 'assigned_at', 'due_date', 'source',
            'status', 'completed_at', 'completion_score',
            'total_attempts', 'total_time_seconds',
        ])

        for assignment in self.get_queryset():
            writer.writerow([
                str(assignment.id),
                assignment.procedure_version.title,
                assignment.procedure_version.version_number,
                assignment.assignee.get_full_name(),
                assignment.assignee.email,
                getattr(assignment.assignee.department, 'name', ''),
                assignment.assigned_by.get_full_name(),
                assignment.assigned_at.isoformat(),
                str(assignment.due_date),
                assignment.assignment_source,
                assignment.status,
                assignment.completed_at.isoformat() if assignment.completed_at else '',
                str(assignment.completion_score or ''),
                assignment.attempts.count(),
                sum(a.total_time_seconds for a in assignment.attempts.all()),
            ])

        return response
```

---

## 10. Phase H: Celery Tasks & Notifications

### H.1 Implement tasks

```python
# backend/apps/procedures/tasks.py
# ... (copy all tasks from spec Section 15.1)
```

### H.2 Register beat schedule

```python
# config/celery.py — add to beat_schedule
# ... (copy from spec Section 15.2)
```

### H.3 Add notification types

```python
# backend/apps/sharing/models.py — extend Notification.NotificationType choices
# ... (copy from spec Section 13.2)
```

---

## 11. Phase I: Frontend — Procedure Management

### I.1 Add Procedures tab to WorkflowCenterPage

```typescript
// frontend/src/pages/WorkflowCenterPage.tsx — MODIFY

// Add new tab to the existing 5 tabs:
const TABS = [
    { id: 'tasks', label: 'My Tasks', icon: Inbox },
    { id: 'active', label: 'Active Workflows', icon: Play },
    { id: 'procedures', label: 'Procedures', icon: ClipboardList },  // NEW
    { id: 'templates', label: 'Templates', icon: LayoutTemplate },
    { id: 'completed', label: 'Completed', icon: CheckCircle },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

// In the tab content render:
{activeTab === 'procedures' && <ProceduresTab />}
```

### I.2 Create ProceduresTab component

```
frontend/src/components/procedures/
├── ProceduresTab.tsx                  # Embedded in WorkflowCenterPage
├── ProcedureCard.tsx
├── ProcedureFilters.tsx
├── ProcedureStatusBadge.tsx
├── ProcedureMetadataForm.tsx
└── ProcedureHierarchyTree.tsx
```

```typescript
// frontend/src/components/procedures/ProceduresTab.tsx

import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { procedureService } from '../../services/procedureService';
import ProcedureCard from './ProcedureCard';
import ProcedureFilters from './ProcedureFilters';

interface ProceduresTabProps {}

const ProceduresTab: React.FC<ProceduresTabProps> = () => {
    const navigate = useNavigate();
    const [procedures, setProcedures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ state: '', department: '', search: '' });

    useEffect(() => {
        loadProcedures();
    }, [filters]);

    const loadProcedures = async () => {
        setLoading(true);
        try {
            const data = await procedureService.list(filters);
            setProcedures(data.results);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Procedures</h2>
                <button
                    onClick={() => navigate('/procedures/new')}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                    <Plus className="h-4 w-4" />
                    New Procedure
                </button>
            </div>

            {/* Filters */}
            <ProcedureFilters filters={filters} onChange={setFilters} />

            {/* List */}
            <div className="grid gap-4">
                {procedures.map((proc) => (
                    <ProcedureCard
                        key={proc.id}
                        procedure={proc}
                        onClick={() => navigate(`/procedures/${proc.id}`)}
                    />
                ))}
            </div>
        </div>
    );
};

export default ProceduresTab;
```

### I.3 Create procedure service

```typescript
// frontend/src/services/procedureService.ts

import api from './api';  // Your axios instance

export const procedureService = {
    // Procedures
    list: (params?: any) => api.get('/api/v1/procedures/', { params }),
    get: (id: string) => api.get(`/api/v1/procedures/${id}/`),
    create: (data: any) => api.post('/api/v1/procedures/', data),
    update: (id: string, data: any) => api.put(`/api/v1/procedures/${id}/`, data),
    delete: (id: string) => api.delete(`/api/v1/procedures/${id}/`),

    // Steps
    listSteps: (procedureId: string) => api.get(`/api/v1/procedures/${procedureId}/steps/`),
    createStep: (procedureId: string, data: any) => api.post(`/api/v1/procedures/${procedureId}/steps/`, data),
    updateStep: (procedureId: string, stepId: string, data: any) =>
        api.put(`/api/v1/procedures/${procedureId}/steps/${stepId}/`, data),
    deleteStep: (procedureId: string, stepId: string) =>
        api.delete(`/api/v1/procedures/${procedureId}/steps/${stepId}/`),
    reorderSteps: (procedureId: string, steps: { id: string; order: number }[]) =>
        api.post(`/api/v1/procedures/${procedureId}/steps/reorder/`, { steps }),

    // Attachments
    uploadAttachment: (procedureId: string, stepId: string, formData: FormData) =>
        api.post(`/api/v1/procedures/${procedureId}/steps/${stepId}/attachments/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    deleteAttachment: (procedureId: string, stepId: string, attId: string) =>
        api.delete(`/api/v1/procedures/${procedureId}/steps/${stepId}/attachments/${attId}/`),

    // Quizzes
    listQuizzes: (procedureId: string) => api.get(`/api/v1/procedures/${procedureId}/quizzes/`),
    createQuiz: (procedureId: string, data: any) => api.post(`/api/v1/procedures/${procedureId}/quizzes/`, data),
    updateQuiz: (procedureId: string, quizId: string, data: any) =>
        api.put(`/api/v1/procedures/${procedureId}/quizzes/${quizId}/`, data),
    deleteQuiz: (procedureId: string, quizId: string) =>
        api.delete(`/api/v1/procedures/${procedureId}/quizzes/${quizId}/`),

    // Questions
    createQuestion: (procedureId: string, quizId: string, data: any) =>
        api.post(`/api/v1/procedures/${procedureId}/quizzes/${quizId}/questions/`, data),
    updateQuestion: (procedureId: string, quizId: string, questionId: string, data: any) =>
        api.put(`/api/v1/procedures/${procedureId}/quizzes/${quizId}/questions/${questionId}/`, data),
    deleteQuestion: (procedureId: string, quizId: string, questionId: string) =>
        api.delete(`/api/v1/procedures/${procedureId}/quizzes/${quizId}/questions/${questionId}/`),

    // Review
    submitForReview: (procedureId: string, data: { reviewers: string[]; priority?: string; due_days?: number }) =>
        api.post(`/api/v1/procedures/${procedureId}/submit-for-review/`, data),

    // Step comments
    listStepComments: (procedureId: string) => api.get(`/api/v1/procedures/${procedureId}/step-comments/`),
    createStepComment: (procedureId: string, data: any) =>
        api.post(`/api/v1/procedures/${procedureId}/step-comments/`, data),
    resolveStepComment: (procedureId: string, commentId: string) =>
        api.post(`/api/v1/procedures/${procedureId}/step-comments/${commentId}/resolve/`),

    // Publishing
    publish: (procedureId: string, data: { effective_from: string; expires_on: string; changelog?: string }) =>
        api.post(`/api/v1/procedures/${procedureId}/publish/`, data),
    retire: (procedureId: string, data: { reason: string }) =>
        api.post(`/api/v1/procedures/${procedureId}/versions/${procedureId}/retire/`, data),

    // Versions
    listVersions: (procedureId: string) => api.get(`/api/v1/procedures/${procedureId}/versions/`),
    getVersion: (procedureId: string, versionNumber: number) =>
        api.get(`/api/v1/procedures/${procedureId}/versions/${versionNumber}/`),
    diffVersions: (procedureId: string, fromVersion: number, toVersion: number) =>
        api.get(`/api/v1/procedures/${procedureId}/versions/diff/`, {
            params: { from_version: fromVersion, to_version: toVersion },
        }),
};
```

### I.4 Create ProcedureBuilderPage

```typescript
// frontend/src/pages/ProcedureBuilderPage.tsx
// Full-page authoring interface — no sidebar, focused experience

// Key components used:
// - ProcedureMetadataForm (title, description, dept, parent, tags)
// - StepList (drag-and-drop sortable)
// - StepCard (collapsible, inline editing)
// - StepAttachmentZone (dropzone per step)
// - StepGateToggles (require manual open, media, quiz)
// - BranchConditionEditor (visual condition builder)
// - QuizBuilder (inline quiz authoring)
// - Autosave (debounced 500ms)
```

### I.5 Add routes

```typescript
// frontend/src/App.tsx — ADD routes

import ProcedureBuilderPage from './pages/ProcedureBuilderPage';
import ProcedureDetailPage from './pages/ProcedureDetailPage';
import ProcedureVersionPage from './pages/ProcedureVersionPage';
import ProcedureVersionDiffPage from './pages/ProcedureVersionDiffPage';
import ProceduresListPage from './pages/ProceduresListPage';
import MyTrainingPage from './pages/MyTrainingPage';
import TrainingPlayerPage from './pages/TrainingPlayerPage';
import QuizTakingPage from './pages/QuizTakingPage';
import TrainingAssignmentsPage from './pages/TrainingAssignmentsPage';
import TrainingEvidencePage from './pages/TrainingEvidencePage';

// Admin/Creator routes
<ProtectedRoute path="/procedures/new" element={<ProcedureBuilderPage />} roles={['admin', 'manager', 'editor']} />
<ProtectedRoute path="/procedures/:id/edit" element={<ProcedureBuilderPage />} roles={['admin', 'manager', 'editor']} />
<ProtectedRoute path="/procedures/:id" element={<ProcedureDetailPage />} />
<ProtectedRoute path="/procedures/:id/versions/:versionNum" element={<ProcedureVersionPage />} />
<ProtectedRoute path="/procedures/:id/versions/diff" element={<ProcedureVersionDiffPage />} />
<ProtectedRoute path="/procedures/assignments" element={<TrainingAssignmentsPage />} roles={['admin', 'manager']} />
<ProtectedRoute path="/procedures/evidence" element={<TrainingEvidencePage />} roles={['admin', 'compliance_auditor']} />

// Trainee routes
<ProtectedRoute path="/procedures" element={<ProceduresListPage />} />
<ProtectedRoute path="/my-training" element={<MyTrainingPage />} />
<ProtectedRoute path="/training/:attemptId" element={<TrainingPlayerPage />} />
<ProtectedRoute path="/training/:attemptId/quiz/:quizId" element={<QuizTakingPage />} />
```

### I.6 Add Training section to sidebar

```typescript
// frontend/src/components/Dashboard/DashboardSidebar.tsx — MODIFY

// Add after Smart System Folders section, before Departments:

{/* Training Section */}
<SidebarSection title="TRAINING" defaultExpanded={true}>
    <SidebarLink
        icon={BookOpen}
        label="My Training"
        to="/my-training"
        badge={myTrainingCount}  // Number of active assignments
    />
    <SidebarLink
        icon={ClipboardList}
        label="Browse Procedures"
        to="/procedures"
    />
</SidebarSection>
```

---

## 12. Phase J: Frontend — Training Player

### J.1 TrainingPlayerPage (full-page, no sidebar)

```
frontend/src/components/training/
├── TrainingPlayer.tsx             # Main container
├── StepSidebar.tsx                # Left: step list with status icons
├── StepContent.tsx                # Center: rich content display
├── StepProgressBar.tsx            # Bottom: progress bar
├── StepNavigationButtons.tsx      # Previous/Next
├── StepGateBlocker.tsx            # Gate requirements overlay
├── AttachmentViewer.tsx           # PDF/image/video preview
├── MediaPlayer.tsx                # Video with completion tracking
├── TrainingCompletionModal.tsx    # Pass/fail modal
└── ResumeTrainingBanner.tsx       # Resume prompt
```

### J.2 Quiz components

```
frontend/src/components/training/quiz/
├── QuizPlayer.tsx                 # Main quiz interface
├── QuizTimer.tsx                  # Countdown
├── QuizProgress.tsx               # Question X of Y
├── QuestionDisplay.tsx            # Route to correct type component
├── MultipleChoiceQuestion.tsx     # Radio buttons
├── MultiSelectQuestion.tsx        # Checkboxes
├── TrueFalseQuestion.tsx          # True/False
├── ShortAnswerQuestion.tsx        # Text input
├── OrderingQuestion.tsx           # Drag-and-drop
├── QuizResultsPanel.tsx           # Score display
└── QuizRetryPrompt.tsx            # Retry prompt
```

### J.3 Training service

```typescript
// frontend/src/services/trainingService.ts

import api from './api';

export const trainingService = {
    startTraining: (assignmentId: string) =>
        api.post('/api/v1/procedures/training/start/', { assignment_id: assignmentId }),
    getAttempt: (attemptId: string) =>
        api.get(`/api/v1/procedures/training/${attemptId}/`),
    startStep: (attemptId: string, stepId: string) =>
        api.post(`/api/v1/procedures/training/${attemptId}/steps/${stepId}/start/`),
    viewStep: (attemptId: string, stepId: string) =>
        api.post(`/api/v1/procedures/training/${attemptId}/steps/${stepId}/view/`),
    openManual: (attemptId: string, stepId: string) =>
        api.post(`/api/v1/procedures/training/${attemptId}/steps/${stepId}/manual-opened/`),
    completeMedia: (attemptId: string, stepId: string) =>
        api.post(`/api/v1/procedures/training/${attemptId}/steps/${stepId}/media-completed/`),
    completeStep: (attemptId: string, stepId: string) =>
        api.post(`/api/v1/procedures/training/${attemptId}/steps/${stepId}/complete/`),
    startQuiz: (attemptId: string, quizId: string) =>
        api.post(`/api/v1/procedures/training/${attemptId}/quizzes/${quizId}/start/`),
    submitQuiz: (attemptId: string, quizId: string, responses: any[]) =>
        api.post(`/api/v1/procedures/training/${attemptId}/quizzes/${quizId}/submit/`, { responses }),
    completeTraining: (attemptId: string) =>
        api.post(`/api/v1/procedures/training/${attemptId}/complete/`),
};
```

---

## 13. Phase K: Frontend — Admin Dashboard & Evidence

### K.1 TrainingAssignmentsPage

```
frontend/src/components/procedures/assignments/
├── AssignmentForm.tsx             # User/dept/role picker + due date
├── AssignmentList.tsx             # Filterable list
├── AssignmentCard.tsx             # Individual card
├── AssignmentStatusBadge.tsx      # Color-coded badge
├── AssignmentDashboard.tsx        # Summary metrics
├── DepartmentBreakdownChart.tsx   # Chart by dept
├── ProcedureBreakdownChart.tsx    # Chart by procedure
├── OverdueAlertList.tsx           # Overdue list
└── ExpirationWarningList.tsx      # Expiring versions
```

### K.2 TrainingEvidencePage

```
frontend/src/components/procedures/evidence/
├── EvidenceTable.tsx              # Filterable table
├── EvidenceDetailModal.tsx        # Full record modal
├── EvidenceExportButton.tsx       # CSV/PDF export
├── AttemptTimeline.tsx            # Visual timeline
├── StepEvidenceRow.tsx            # Per-step detail
├── QuizEvidenceRow.tsx            # Per-quiz detail
└── ComplianceReportCard.tsx       # Summary metrics
```

---

## 14. Phase L: Storybook Component Documentation

### Which components need Storybook stories

Focus on **reusable, complex, or stateful** components. Skip simple wrappers.

```
stories/
├── procedures/
│   ├── ProcedureCard.stories.tsx         # States: draft, in_review, approved, published, retired
│   ├── ProcedureStatusBadge.stories.tsx  # All 5 states
│   ├── StepCard.stories.tsx              # Expanded, collapsed, with/without attachments
│   ├── StepGateToggles.stories.tsx       # Toggle combinations
│   ├── BranchConditionEditor.stories.tsx # Simple, compound, nested conditions
│   ├── QuizBuilder.stories.tsx           # All question types
│   ├── QuestionPreview.stories.tsx       # Each question type rendered
│   ├── ReviewerSelector.stories.tsx      # User picker
│   ├── VersionDiffViewer.stories.tsx     # Added, removed, modified steps
│   └── AssignmentStatusBadge.stories.tsx # All status states
│
├── training/
│   ├── StepSidebar.stories.tsx           # With progress states
│   ├── StepProgressBar.stories.tsx       # Various percentages
│   ├── StepGateBlocker.stories.tsx       # Different gate types
│   ├── QuizPlayer.stories.tsx            # Taking a quiz
│   ├── MultipleChoiceQuestion.stories.tsx
│   ├── MultiSelectQuestion.stories.tsx
│   ├── TrueFalseQuestion.stories.tsx
│   ├── ShortAnswerQuestion.stories.tsx
│   ├── OrderingQuestion.stories.tsx
│   ├── QuizResultsPanel.stories.tsx      # Pass and fail states
│   └── TrainingCompletionModal.stories.tsx # Success and failure
│
├── assignments/
│   ├── AssignmentCard.stories.tsx         # All statuses
│   ├── AssignmentDashboard.stories.tsx    # With sample metrics
│   └── OverdueAlertList.stories.tsx      # With overdue items
│
└── evidence/
    ├── EvidenceTable.stories.tsx          # With sample data
    └── AttemptTimeline.stories.tsx        # Multi-attempt timeline
```

### Storybook story pattern

```typescript
// frontend/src/stories/procedures/ProcedureStatusBadge.stories.tsx

import type { Meta, StoryObj } from '@storybook/react';
import ProcedureStatusBadge from '../../components/procedures/ProcedureStatusBadge';

const meta: Meta<typeof ProcedureStatusBadge> = {
    title: 'Procedures/ProcedureStatusBadge',
    component: ProcedureStatusBadge,
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ProcedureStatusBadge>;

export const Draft: Story = { args: { state: 'draft' } };
export const InReview: Story = { args: { state: 'in_review' } };
export const Approved: Story = { args: { state: 'approved' } };
export const Published: Story = { args: { state: 'published' } };
export const Retired: Story = { args: { state: 'retired' } };
```

### Run Storybook

```bash
cd frontend
npm run storybook
```

---

## 15. Phase M: Seed Data & Testing

### M.1 Create management command

```bash
# File: backend/apps/procedures/management/commands/generate_procedure_seed_data.py
```

```python
from django.core.management.base import BaseCommand
from django.contrib.contenttypes.models import ContentType
from apps.procedures.models import *
from apps.users.models import CustomUser, Department
from apps.organizations.models import Organization
from apps.workflows.models import *
from datetime import date, timedelta
from django.utils import timezone
import uuid


class Command(BaseCommand):
    help = 'Generate seed data for procedures and training'

    def handle(self, *args, **options):
        org = Organization.objects.first()
        if not org:
            self.stderr.write('No organization found. Run generate_seed_data first.')
            return

        admin = CustomUser.objects.filter(is_staff=True).first()
        departments = Department.objects.all()

        self.stdout.write('Creating procedures...')

        # 1. New Employee Onboarding (Published, v2)
        proc1 = Procedure.objects.create(
            organization=org,
            title='New Employee Onboarding',
            description='Complete onboarding procedure for new hires at CCC PLC.',
            state=Procedure.State.PUBLISHED,
            current_version=2,
            created_by=admin,
            department=departments.filter(name__icontains='HR').first() or departments.first(),
            tags=['onboarding', 'hr', 'mandatory'],
        )
        self._create_onboarding_steps(proc1)
        self._publish_procedure(proc1, admin, version=1)
        self._publish_procedure(proc1, admin, version=2)

        # 2. AML Compliance Training (Published, v1)
        proc2 = Procedure.objects.create(
            organization=org,
            title='AML Compliance Training',
            description='Anti-money laundering awareness and procedures.',
            state=Procedure.State.PUBLISHED,
            current_version=1,
            created_by=admin,
            department=departments.filter(name__icontains='Compliance').first() or departments.first(),
            tags=['compliance', 'aml', 'mandatory'],
        )
        self._create_aml_steps(proc2)
        self._publish_procedure(proc2, admin, version=1)

        # ... create remaining procedures ...

        # Create assignments
        self._create_assignments(org, admin)

        self.stdout.write(self.style.SUCCESS('Seed data created successfully.'))

    def _create_onboarding_steps(self, procedure):
        steps = [
            ('Welcome and Orientation', 'Welcome to CCC PLC. This step covers our mission and values.', 15),
            ('IT Equipment Setup', 'Setting up your workstation, email, and security credentials.', 30),
            ('HR Policies', 'Review of employee handbook, leave policies, and code of conduct.', 45),
            ('Loan Application Procedure', 'Only for roles involved in loan processing.', 60),
            ('Account Opening Procedure', 'Standard account opening workflow and compliance checks.', 30),
        ]

        for i, (title, desc, duration) in enumerate(steps, 1):
            step = ProcedureStep.objects.create(
                procedure=procedure,
                title=title,
                description=desc,
                order=i,
                estimated_duration_minutes=duration,
                branch_condition=(
                    {'field': 'role', 'operator': 'in', 'value': ['loan_officer', 'credit_analyst']}
                    if i == 4 else None
                ),
            )

    # ... additional helper methods ...
```

### M.2 Run seed data

```bash
python manage.py generate_procedure_seed_data
```

### M.3 Backend test structure

```
backend/apps/procedures/tests/
├── test_models.py                 # Model creation, validation, constraints
├── test_views.py                  # API CRUD, permissions, error cases
├── test_serializers.py            # Serialization/deserialization
├── test_branching.py              # All operator types, nested conditions
├── test_quiz.py                   # Grading engine, all question types
├── test_lifecycle.py              # State transitions, publish, retire
├── test_workflow_integration.py   # Submit for review, approve/reject → state sync
├── test_training.py               # Start, progress, gates, complete, resume
├── test_evidence.py               # Evidence export, CSV, filters
└── test_tasks.py                  # Celery tasks (reminders, overdue, recertification)
```

---

## 16. Phase N: Integration Testing & Polish

### N.1 End-to-end test scenarios

```
1. Full lifecycle:
   Create → Add Steps → Add Quiz → Submit for Review → Approve → Publish → Assign → Train → Complete

2. Review rejection:
   Submit → Reject → Edit → Re-submit → Approve

3. Training with branching:
   Start training → Step 1 shown → Step 2 shown → Step 3 skipped (branch=false) → Step 4 shown

4. Quiz failure and retry:
   Take quiz → Fail → Retry → Pass → Advance

5. Overdue assignment:
   Assign → Wait past due → Celery marks overdue → Reminder sent

6. Version diff:
   Publish v1 → Edit → Publish v2 → Diff v1 vs v2

7. Re-certification:
   Complete v1 → v1 expires → System creates re-certification assignment for v2

8. Document workflow (regression):
   Existing document workflow still works after GFK migration
```

### N.2 Accessibility audit

```bash
# Run axe-core on all new pages
npm run test:a11y

# Manual checklist:
# - Keyboard navigation through step builder (Tab, Enter, Escape)
# - Screen reader announces step status in training player
# - Color contrast on all status badges
# - Focus management in quiz player
# - ARIA labels on drag-and-drop handles
```

### N.3 Performance testing

```
# Backend:
- Create 100 procedures × 10 steps × 5 attachments → measure list API response
- Create 1000 assignments → measure dashboard metrics API
- Concurrent quiz submissions (10 users) → verify scoring consistency

# Frontend:
- Procedure builder with 50 steps → measure render time
- Training player with 20 steps → measure step transition time
- Lighthouse audit on all new pages → target score >90
```

---

## Summary: Files to Create/Modify

### Backend — New Files (procedures app)

| File | Purpose |
|------|---------|
| `backend/apps/procedures/__init__.py` | App init |
| `backend/apps/procedures/apps.py` | AppConfig |
| `backend/apps/procedures/models.py` | 19 models |
| `backend/apps/procedures/serializers.py` | All serializers |
| `backend/apps/procedures/views.py` | All viewsets |
| `backend/apps/procedures/urls.py` | URL routing |
| `backend/apps/procedures/signals.py` | Workflow → procedure state sync |
| `backend/apps/procedures/tasks.py` | 8 Celery tasks |
| `backend/apps/procedures/permissions.py` | 6 permission classes |
| `backend/apps/procedures/filters.py` | Django-filter filtersets |
| `backend/apps/procedures/utils.py` | Branching, diff, grading |
| `backend/apps/procedures/constants.py` | Constants and enums |
| `backend/apps/procedures/admin.py` | Admin registration |
| `backend/apps/procedures/tests/*.py` | 10 test files |
| `backend/apps/procedures/management/commands/generate_procedure_seed_data.py` | Seed data |

### Backend — Modified Files

| File | Change |
|------|--------|
| `backend/apps/workflows/models.py` | WorkflowInstance GFK refactor |
| `backend/apps/workflows/serializers.py` | Update for GFK |
| `backend/apps/workflows/migrations/` | 3 new migrations |
| `config/settings.py` | Add `apps.procedures` to INSTALLED_APPS |
| `config/urls.py` | Include procedures URLs |
| `config/celery.py` | Add beat schedule entries |

### Frontend — New Files

| File | Purpose |
|------|---------|
| `frontend/src/services/procedureService.ts` | Procedure API client |
| `frontend/src/services/trainingService.ts` | Training API client |
| `frontend/src/services/assignmentService.ts` | Assignment API client |
| `frontend/src/services/evidenceService.ts` | Evidence API client |
| `frontend/src/pages/ProcedureBuilderPage.tsx` | Authoring page |
| `frontend/src/pages/ProcedureDetailPage.tsx` | Detail page |
| `frontend/src/pages/ProceduresListPage.tsx` | Browse published |
| `frontend/src/pages/ProcedureVersionPage.tsx` | Version view |
| `frontend/src/pages/ProcedureVersionDiffPage.tsx` | Diff view |
| `frontend/src/pages/MyTrainingPage.tsx` | Trainee dashboard |
| `frontend/src/pages/TrainingPlayerPage.tsx` | Training player |
| `frontend/src/pages/QuizTakingPage.tsx` | Quiz interface |
| `frontend/src/pages/TrainingAssignmentsPage.tsx` | Admin assignments |
| `frontend/src/pages/TrainingEvidencePage.tsx` | Evidence export |
| `frontend/src/components/procedures/**/*.tsx` | ~30 components |
| `frontend/src/components/training/**/*.tsx` | ~25 components |
| `frontend/src/store/slices/procedureSlice.ts` | Redux state |
| `frontend/src/store/slices/trainingSlice.ts` | Redux state |
| `frontend/src/stories/**/*.stories.tsx` | ~25 Storybook stories |

### Frontend — Modified Files

| File | Change |
|------|--------|
| `frontend/src/App.tsx` | Add 10 new routes |
| `frontend/src/pages/WorkflowCenterPage.tsx` | Add "Procedures" tab |
| `frontend/src/components/Dashboard/DashboardSidebar.tsx` | Add "Training" section |
| `frontend/src/components/Dashboard/DashboardHeader.tsx` | No change (Workflows already in admin menu) |
| `frontend/src/services/workflowService.ts` | Update WorkflowInstance interface for GFK |
| `frontend/src/store/index.ts` | Register new slices |

---

**End of Development Guide**
