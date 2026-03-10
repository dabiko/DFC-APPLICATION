"""
Views for the Procedures app.
Covers Phases B-G.
"""

import csv
import hashlib
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.db.models import Count, Avg, Q, F
from django.http import HttpResponse
from django.utils import timezone
from datetime import timedelta, date

from .models import (
    Procedure, ProcedureStep, StepAttachment,
    ProcedureVersion, ProcedureVersionStep, VersionStepAttachment,
    ProcedureStepComment, ProcedureAuditLog,
    Quiz, Question,
    VersionQuiz, VersionQuestion, VersionAnswerOption,
    ProcedureAssignment, TrainingAttempt, StepCompletion,
    QuizAttempt, QuestionResponse,
)
from .serializers import (
    ProcedureListSerializer, ProcedureDetailSerializer, ProcedureCreateSerializer,
    ProcedureStepSerializer, StepAttachmentSerializer,
    StepReorderSerializer, SubmitForReviewSerializer,
    ProcedureStepCommentSerializer,
    ProcedureVersionSerializer, ProcedureVersionListSerializer,
    PublishSerializer, RetireSerializer,
    QuizSerializer, QuizCreateSerializer, QuestionSerializer,
    ProcedureAssignmentSerializer, CreateAssignmentSerializer,
    WaiveAssignmentSerializer, TrainingAttemptSerializer,
    StepCompletionSerializer, QuizAttemptSerializer, QuizSubmitSerializer,
    ProcedureAuditLogSerializer,
)
from .permissions import (
    IsProcedureCreator, IsProcedureAdmin, IsProcedureManager,
    CanCreateProcedure, IsAssignedReviewer, IsComplianceAuditor,
)
from apps.workflows.models import (
    WorkflowInstance, WorkflowTask, WorkflowTemplate,
    WorkflowInstanceStatus, WorkflowTaskStatus, WorkflowStepType, WorkflowAuditLog,
)
from .utils import compute_version_diff, evaluate_branch_condition, can_advance_to_next_step, create_assignments, grade_quiz_attempt


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
            return [permissions.IsAuthenticated(), (IsProcedureCreator | IsProcedureAdmin)()]
        if self.action in ['destroy']:
            return [permissions.IsAuthenticated(), (IsProcedureCreator | IsProcedureAdmin)()]
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

    # --- Phase D: Publish ---
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

    # --- Phase D: Retire a version ---
    @action(detail=True, methods=['post'], url_path=r'versions/(?P<version_number>\d+)/retire')
    def retire_version(self, request, pk=None, version_number=None):
        procedure = self.get_object()

        version = procedure.versions.filter(version_number=version_number).first()
        if not version:
            return Response({'error': 'Version not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not version.is_active:
            return Response(
                {'error': 'This version is already retired.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = RetireSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        version.is_active = False
        version.retired_at = timezone.now()
        version.retired_by = request.user
        version.retirement_reason = serializer.validated_data['reason']
        version.save(update_fields=['is_active', 'retired_at', 'retired_by', 'retirement_reason'])

        # If this was the latest active version, retire the procedure too
        has_active_versions = procedure.versions.filter(is_active=True).exists()
        if not has_active_versions:
            procedure.state = Procedure.State.RETIRED
            procedure.save(update_fields=['state', 'updated_at'])

        ProcedureAuditLog.objects.create(
            organization=procedure.organization,
            action=ProcedureAuditLog.Action.RETIRED,
            actor=request.user,
            procedure=procedure,
            version=version,
            ip_address=request.META.get('REMOTE_ADDR'),
            detail={'reason': serializer.validated_data['reason']},
        )

        return Response({'message': f'Version {version_number} retired.'})

    # --- Phase D: Version diff ---
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

    # --- Phase D: Snapshot helpers ---
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
                    file=att.file if att.file else '',
                    document_reference=att.document_reference,
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


class ProcedureVersionViewSet(viewsets.ReadOnlyModelViewSet):
    """List and retrieve published versions of a procedure."""

    def get_queryset(self):
        return ProcedureVersion.objects.filter(
            procedure_id=self.kwargs['procedure_pk'],
            procedure__organization=self.request.user.organization,
        ).select_related('published_by', 'approved_by').prefetch_related(
            'steps__attachments', 'quizzes__questions__options',
        )

    def get_serializer_class(self):
        if self.action == 'list':
            return ProcedureVersionListSerializer
        return ProcedureVersionSerializer

    # Allow lookup by version_number instead of pk
    lookup_field = 'version_number'


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
    """CRUD for step attachments. Supports file upload and linking existing documents."""
    serializer_class = StepAttachmentSerializer

    def get_queryset(self):
        return StepAttachment.objects.filter(
            step_id=self.kwargs['step_pk'],
            step__procedure_id=self.kwargs['procedure_pk'],
        ).select_related('document_reference', 'document_reference__folder')

    def _get_step(self):
        return ProcedureStep.objects.get(
            id=self.kwargs['step_pk'],
            procedure_id=self.kwargs['procedure_pk'],
        )

    def perform_create(self, serializer):
        from rest_framework.exceptions import ValidationError

        step = self._get_step()
        document_id = self.request.data.get('document_id')
        file = self.request.FILES.get('file')

        # --- Link mode: attach an existing DFC document ---
        if document_id:
            from apps.documents.models import Document
            try:
                doc = Document.objects.select_related('folder').get(
                    id=document_id, is_deleted=False,
                )
            except Document.DoesNotExist:
                raise ValidationError({'document_id': 'Document not found.'})

            ext = doc.file_name.rsplit('.', 1)[-1].lower() if '.' in doc.file_name else ''
            serializer.save(
                step=step,
                document_reference=doc,
                file_name=doc.file_name,
                file_size=doc.file_size,
                file_extension=ext,
                mime_type=doc.file_type or 'application/octet-stream',
                checksum_sha256=doc.checksum or '',
                uploaded_by=self.request.user,
            )
            return

        # --- Upload mode: upload a new file ---
        if not file:
            raise ValidationError('Provide either a file or a document_id.')

        ext = file.name.rsplit('.', 1)[-1].lower() if '.' in file.name else ''
        if ext not in StepAttachment.ALLOWED_EXTENSIONS:
            raise ValidationError(f'File type .{ext} not allowed.')

        if file.size > StepAttachment.MAX_FILE_SIZE_MB * 1024 * 1024:
            raise ValidationError(f'File exceeds {StepAttachment.MAX_FILE_SIZE_MB}MB limit.')

        # Compute checksum
        sha256 = hashlib.sha256()
        for chunk in file.chunks():
            sha256.update(chunk)
        checksum = sha256.hexdigest()
        file.seek(0)  # Reset after reading

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

    @action(detail=False, methods=['post'], url_path='check-duplicate')
    def check_duplicate(self, request, procedure_pk=None, step_pk=None):
        """
        Upload a file to check for duplicates without saving.
        Returns matching documents/attachments with their paths.
        """
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        sha256 = hashlib.sha256()
        for chunk in file.chunks():
            sha256.update(chunk)
        checksum = sha256.hexdigest()

        from apps.documents.models import Document

        matches = []

        # Check existing DFC documents
        for doc in Document.objects.filter(
            checksum=checksum, is_deleted=False,
        ).select_related('folder')[:5]:
            matches.append({
                'source': 'document',
                'id': str(doc.id),
                'title': doc.title,
                'file_name': doc.file_name,
                'folder_path': doc.folder.path if doc.folder_id else None,
                'confidentiality_level': doc.confidentiality_level,
                'document_url': f'/documents/{doc.id}',
            })

        # Check existing step attachments
        for att in StepAttachment.objects.filter(
            checksum_sha256=checksum,
        ).select_related('step__procedure')[:5]:
            matches.append({
                'source': 'step_attachment',
                'id': str(att.id),
                'title': att.title,
                'procedure_title': att.step.procedure.title,
                'step_title': att.step.title,
            })

        return Response({
            'checksum': checksum,
            'has_duplicates': len(matches) > 0,
            'matches': matches,
        })

    @action(detail=False, methods=['get'], url_path='search-documents')
    def search_documents(self, request, procedure_pk=None, step_pk=None):
        """Search existing DFC documents for linking to a step."""
        from apps.documents.models import Document
        from django.db.models import Q

        q = request.query_params.get('q', '').strip()
        qs = Document.objects.filter(
            is_deleted=False,
            organization=request.user.organization,
        )
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(file_name__icontains=q))

        qs = qs.select_related('folder', 'department').order_by('-created_at')[:20]
        results = [{
            'id': str(d.id),
            'title': d.title,
            'file_name': d.file_name,
            'file_size': d.file_size,
            'file_type': d.file_type,
            'confidentiality_level': d.confidentiality_level,
            'folder_path': d.folder.path if d.folder_id else None,
            'department_name': d.department.name if d.department_id else None,
            'document_url': f'/documents/{d.id}',
        } for d in qs]
        return Response(results)


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


# ---------------------------------------------------------------------------
# Phase C: Quiz Views
# ---------------------------------------------------------------------------

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

    def perform_create(self, serializer):
        quiz = Quiz.objects.get(id=self.kwargs['quiz_pk'])
        serializer.save(quiz=quiz)


# ---------------------------------------------------------------------------
# Phase F: Assignment & Training Views
# ---------------------------------------------------------------------------

class ProcedureAssignmentViewSet(viewsets.ModelViewSet):
    """CRUD for procedure assignments + waive + dashboard."""
    serializer_class = ProcedureAssignmentSerializer
    http_method_names = ['get', 'post', 'put', 'patch', 'head', 'options']

    def get_queryset(self):
        qs = ProcedureAssignment.objects.filter(
            organization=self.request.user.organization,
        ).select_related('assignee', 'procedure_version', 'assigned_by')

        # Non-admins see only their own assignments
        from apps.permissions.models import UserRole
        is_admin = self.request.user.is_superuser or UserRole.objects.filter(
            user=self.request.user, role__name__iregex=r'^(admin|manager)$', is_active=True
        ).exists()
        if not is_admin:
            qs = qs.filter(assignee=self.request.user)

        # Filters
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        procedure_version = self.request.query_params.get('procedure_version')
        if procedure_version:
            qs = qs.filter(procedure_version_id=procedure_version)

        assignee = self.request.query_params.get('assignee')
        if assignee:
            qs = qs.filter(assignee_id=assignee)

        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateAssignmentSerializer
        return ProcedureAssignmentSerializer

    def get_permissions(self):
        if self.action in ['create']:
            return [permissions.IsAuthenticated(), (IsProcedureAdmin | IsProcedureManager)()]
        if self.action in ['waive', 'dashboard']:
            return [permissions.IsAuthenticated(), (IsProcedureAdmin | IsProcedureManager)()]
        return [permissions.IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = CreateAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        assignments = create_assignments(
            data=serializer.validated_data,
            assigned_by=request.user,
            org=request.user.organization,
        )

        # Audit log for each assignment
        for assignment in assignments:
            ProcedureAuditLog.objects.create(
                organization=request.user.organization,
                action=ProcedureAuditLog.Action.ASSIGNED,
                actor=request.user,
                procedure=assignment.procedure_version.procedure,
                version=assignment.procedure_version,
                assignment=assignment,
                ip_address=request.META.get('REMOTE_ADDR'),
                detail={
                    'assignee_id': str(assignment.assignee_id),
                    'due_date': str(assignment.due_date),
                    'source': assignment.assignment_source,
                },
            )

        return Response({
            'created': len(assignments),
            'assignments': ProcedureAssignmentSerializer(assignments, many=True).data,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='waive')
    def waive(self, request, pk=None):
        assignment = self.get_object()

        if assignment.status in ['completed', 'waived']:
            return Response(
                {'error': 'Cannot waive a completed or already-waived assignment.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = WaiveAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        assignment.status = 'waived'
        assignment.waived_by = request.user
        assignment.waiver_reason = serializer.validated_data['reason']
        assignment.waived_at = timezone.now()
        assignment.save(update_fields=['status', 'waived_by', 'waiver_reason', 'waived_at'])

        ProcedureAuditLog.objects.create(
            organization=assignment.organization,
            action=ProcedureAuditLog.Action.ASSIGNMENT_WAIVED,
            actor=request.user,
            procedure=assignment.procedure_version.procedure,
            version=assignment.procedure_version,
            assignment=assignment,
            ip_address=request.META.get('REMOTE_ADDR'),
            detail={'reason': serializer.validated_data['reason']},
        )

        return Response({'message': 'Assignment waived.'})

    @action(detail=False, methods=['get'], url_path='dashboard')
    def dashboard(self, request):
        org = request.user.organization
        qs = ProcedureAssignment.objects.filter(organization=org)

        # Apply optional filters
        department = request.query_params.get('department')
        if department:
            qs = qs.filter(procedure_version__procedure__department_id=department)

        procedure = request.query_params.get('procedure')
        if procedure:
            qs = qs.filter(procedure_version__procedure_id=procedure)

        date_from = request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(assigned_at__date__gte=date_from)

        date_to = request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(assigned_at__date__lte=date_to)

        total = qs.count()
        if total == 0:
            return Response({'summary': {
                'total_assignments': 0, 'completed': 0, 'in_progress': 0,
                'overdue': 0, 'not_started': 0, 'waived': 0,
                'completion_rate': 0, 'overdue_rate': 0,
                'average_completion_days': 0, 'average_score': 0, 'pass_rate': 0,
            }})

        status_counts = qs.values('status').annotate(count=Count('id'))
        counts = {item['status']: item['count'] for item in status_counts}

        completed = counts.get('completed', 0)
        completed_qs = qs.filter(status='completed')
        avg_score = completed_qs.aggregate(avg=Avg('completion_score'))['avg'] or 0

        # Average completion days
        avg_days = 0
        if completed > 0:
            from django.db.models.functions import Extract
            completed_with_time = completed_qs.filter(completed_at__isnull=False)
            if completed_with_time.exists():
                total_days = sum(
                    (a.completed_at.date() - a.assigned_at.date()).days
                    for a in completed_with_time
                )
                avg_days = round(total_days / completed_with_time.count(), 1)

        # Pass rate from training attempts
        total_attempts = TrainingAttempt.objects.filter(
            assignment__in=qs,
            status__in=['passed', 'failed']
        ).count()
        passed_attempts = TrainingAttempt.objects.filter(
            assignment__in=qs,
            status='passed'
        ).count()
        pass_rate = round(passed_attempts / total_attempts * 100, 1) if total_attempts > 0 else 0

        summary = {
            'total_assignments': total,
            'completed': completed,
            'in_progress': counts.get('in_progress', 0),
            'overdue': counts.get('overdue', 0),
            'not_started': counts.get('assigned', 0),
            'waived': counts.get('waived', 0),
            'completion_rate': round(completed / total * 100, 1) if total > 0 else 0,
            'overdue_rate': round(counts.get('overdue', 0) / total * 100, 1) if total > 0 else 0,
            'average_completion_days': avg_days,
            'average_score': round(float(avg_score), 1),
            'pass_rate': pass_rate,
        }

        # Overdue assignments list
        overdue_list = []
        for a in qs.filter(status='overdue').select_related('assignee', 'procedure_version')[:20]:
            overdue_list.append({
                'assignee': a.assignee.get_full_name(),
                'procedure': a.procedure_version.title,
                'due_date': str(a.due_date),
                'days_overdue': (date.today() - a.due_date).days,
            })

        return Response({
            'summary': summary,
            'overdue_assignments': overdue_list,
        })


class TrainingViewSet(viewsets.GenericViewSet):
    """Training delivery — start, progress, complete."""
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return TrainingAttempt.objects.filter(
            assignment__assignee=self.request.user,
        ).select_related(
            'assignment', 'assignment__procedure_version',
        ).prefetch_related('step_completions__version_step', 'quiz_attempts')

    def get_serializer_class(self):
        return TrainingAttemptSerializer

    def retrieve(self, request, pk=None):
        """GET /training/{attempt_id}/ — Get attempt state (resume point)."""
        qs = TrainingAttempt.objects.select_related(
            'assignment__procedure_version',
        ).prefetch_related(
            'step_completions__version_step',
            'quiz_attempts__responses',
        ).filter(id=pk)
        if not request.user.is_superuser:
            qs = qs.filter(assignment__assignee=request.user)
        attempt = qs.first()
        if not attempt:
            return Response({'error': 'Training attempt not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(TrainingAttemptSerializer(attempt).data)

    @action(detail=True, methods=['post'], url_path='start_training')
    def start_training(self, request, pk=None):
        """POST /training/{assignment_id}/start_training/ — Start new attempt for an assignment."""
        assignment_id = pk

        try:
            qs = ProcedureAssignment.objects.filter(
                id=assignment_id,
                status__in=['assigned', 'in_progress'],
            )
            if not request.user.is_superuser:
                qs = qs.filter(assignee=request.user)
            assignment = qs.get()
        except ProcedureAssignment.DoesNotExist:
            return Response(
                {'error': 'Assignment not found or not available.'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check for existing in-progress attempt
        existing = assignment.attempts.filter(status='in_progress').first()
        if existing:
            return Response(TrainingAttemptSerializer(existing).data)

        # Build trainee context for branching
        trainee_context = {
            'role': [str(r) for r in request.user.user_roles.values_list('role', flat=True)],
            'department': getattr(request.user.department, 'slug', '') if hasattr(request.user, 'department') and request.user.department else '',
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

        # Create StepCompletion for each version step
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

        # Transition assignment to in_progress
        assignment.status = 'in_progress'
        assignment.save(update_fields=['status'])

        # Audit
        ProcedureAuditLog.objects.create(
            organization=assignment.organization,
            action=ProcedureAuditLog.Action.TRAINING_STARTED,
            actor=request.user,
            procedure=version.procedure,
            version=version,
            assignment=assignment,
            ip_address=request.META.get('REMOTE_ADDR'),
            detail={'attempt_number': attempt_number},
        )

        return Response(TrainingAttemptSerializer(attempt).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='start_step')
    def start_step(self, request, pk=None):
        """Mark step as started."""
        step_id = request.data.get('version_step_id')
        _qs = TrainingAttempt.objects.filter(id=pk)
        if not request.user.is_superuser:
            _qs = _qs.filter(assignment__assignee=request.user)
        attempt = _qs.get()
        step_completion = StepCompletion.objects.get(attempt=attempt, version_step_id=step_id)

        if step_completion.status == 'skipped':
            return Response({'error': 'This step is skipped (branch condition).'}, status=400)

        if step_completion.status == 'not_started':
            step_completion.status = 'started'
            step_completion.started_at = timezone.now()
            step_completion.save(update_fields=['status', 'started_at'])

        # Update current step on attempt
        attempt.current_step_id = step_id
        attempt.save(update_fields=['current_step'])

        return Response(StepCompletionSerializer(step_completion).data)

    @action(detail=True, methods=['get', 'post'], url_path='view_step')
    def view_step(self, request, pk=None):
        """Mark step as viewed."""
        step_id = request.query_params.get('version_step_id') or request.data.get('version_step_id')
        _qs = TrainingAttempt.objects.filter(id=pk)
        if not request.user.is_superuser:
            _qs = _qs.filter(assignment__assignee=request.user)
        attempt = _qs.get()
        step_completion = StepCompletion.objects.get(attempt=attempt, version_step_id=step_id)

        if step_completion.status in ('not_started', 'started'):
            if step_completion.status == 'not_started':
                step_completion.started_at = timezone.now()
            step_completion.status = 'viewed'
            step_completion.save(update_fields=['status', 'started_at'])

        return Response(StepCompletionSerializer(step_completion).data)

    @action(detail=True, methods=['post'], url_path='manual_opened')
    def manual_opened(self, request, pk=None):
        """Record manual open event."""
        step_id = request.data.get('step_completion_id') or request.data.get('version_step_id')
        _qs = TrainingAttempt.objects.filter(id=pk)
        if not request.user.is_superuser:
            _qs = _qs.filter(assignment__assignee=request.user)
        attempt = _qs.get()
        step_completion = StepCompletion.objects.get(attempt=attempt, version_step_id=step_id)

        step_completion.manual_opened_at = timezone.now()
        if step_completion.status in ('not_started', 'started', 'viewed'):
            step_completion.status = 'manual_opened'
        step_completion.save(update_fields=['status', 'manual_opened_at'])

        return Response(StepCompletionSerializer(step_completion).data)

    @action(detail=True, methods=['post'], url_path='media_completed')
    def media_completed(self, request, pk=None):
        """Record media completion event."""
        step_id = request.data.get('step_completion_id') or request.data.get('version_step_id')
        _qs = TrainingAttempt.objects.filter(id=pk)
        if not request.user.is_superuser:
            _qs = _qs.filter(assignment__assignee=request.user)
        attempt = _qs.get()
        step_completion = StepCompletion.objects.get(attempt=attempt, version_step_id=step_id)

        step_completion.media_completed_at = timezone.now()
        if step_completion.status in ('not_started', 'started', 'viewed', 'manual_opened'):
            step_completion.status = 'media_completed'
        step_completion.save(update_fields=['status', 'media_completed_at'])

        return Response(StepCompletionSerializer(step_completion).data)

    @action(detail=True, methods=['post'], url_path='complete_step')
    def complete_step(self, request, pk=None):
        """Complete step (validates all gates)."""
        step_id = request.data.get('step_completion_id') or request.data.get('version_step_id')
        _qs = TrainingAttempt.objects.filter(id=pk)
        if not request.user.is_superuser:
            _qs = _qs.filter(assignment__assignee=request.user)
        attempt = _qs.get()
        step_completion = StepCompletion.objects.get(attempt=attempt, version_step_id=step_id)

        # Validate gates
        can_advance, reasons = can_advance_to_next_step(step_completion)
        if not can_advance:
            return Response({'errors': reasons}, status=status.HTTP_400_BAD_REQUEST)

        step_completion.status = 'completed'
        step_completion.completed_at = timezone.now()
        if step_completion.started_at:
            step_completion.time_spent_seconds = int(
                (timezone.now() - step_completion.started_at).total_seconds()
            )
        step_completion.save()

        # Update attempt progress
        attempt.steps_completed = attempt.step_completions.filter(status='completed').count()
        attempt.save(update_fields=['steps_completed'])

        # Update trainee context with step result
        attempt.trainee_context.setdefault('step_results', {})
        attempt.trainee_context['step_results'][str(step_id)] = 'passed'
        attempt.save(update_fields=['trainee_context'])

        # Audit
        ProcedureAuditLog.objects.create(
            organization=attempt.assignment.organization,
            action=ProcedureAuditLog.Action.STEP_COMPLETED,
            actor=request.user,
            procedure=attempt.assignment.procedure_version.procedure,
            version=attempt.assignment.procedure_version,
            assignment=attempt.assignment,
            step_id=step_id,
            ip_address=request.META.get('REMOTE_ADDR'),
            detail={'steps_completed': attempt.steps_completed, 'total_steps': attempt.total_steps},
        )

        return Response({
            'message': 'Step completed.',
            'steps_completed': attempt.steps_completed,
            'total_steps': attempt.total_steps,
        })

    @action(detail=True, methods=['post'], url_path='start_quiz')
    def start_quiz(self, request, pk=None):
        """Start a quiz attempt within a training attempt."""
        quiz_id = request.data.get('version_quiz_id')
        _qs = TrainingAttempt.objects.filter(id=pk)
        if not request.user.is_superuser:
            _qs = _qs.filter(assignment__assignee=request.user)
        attempt = _qs.get()
        version_quiz = VersionQuiz.objects.get(id=quiz_id)

        # Check max attempts
        existing_count = attempt.quiz_attempts.filter(version_quiz=version_quiz).count()
        if version_quiz.max_attempts > 0 and existing_count >= version_quiz.max_attempts:
            return Response(
                {'error': f'Maximum attempts ({version_quiz.max_attempts}) reached.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check for existing in-progress quiz attempt
        in_progress = attempt.quiz_attempts.filter(
            version_quiz=version_quiz, completed_at__isnull=True
        ).first()
        if in_progress:
            return Response(QuizAttemptSerializer(in_progress).data)

        quiz_attempt = QuizAttempt.objects.create(
            training_attempt=attempt,
            version_quiz=version_quiz,
            attempt_number=existing_count + 1,
        )

        return Response(QuizAttemptSerializer(quiz_attempt).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='submit_quiz')
    def submit_quiz(self, request, pk=None):
        """Submit quiz answers and grade."""
        quiz_id = request.data.get('quiz_attempt_id') or request.data.get('version_quiz_id')
        _qs = TrainingAttempt.objects.filter(id=pk)
        if not request.user.is_superuser:
            _qs = _qs.filter(assignment__assignee=request.user)
        attempt = _qs.get()
        version_quiz = VersionQuiz.objects.get(id=quiz_id)

        # Find in-progress quiz attempt
        quiz_attempt = attempt.quiz_attempts.filter(
            version_quiz=version_quiz, completed_at__isnull=True
        ).first()

        if not quiz_attempt:
            return Response(
                {'error': 'No in-progress quiz attempt found. Start a quiz first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = QuizSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Create QuestionResponse records
        for resp_data in serializer.validated_data['responses']:
            question_id = resp_data.get('question_id')
            version_question = VersionQuestion.objects.get(
                id=question_id, version_quiz=version_quiz
            )

            response = QuestionResponse.objects.create(
                quiz_attempt=quiz_attempt,
                version_question=version_question,
                text_response=resp_data.get('text_response', ''),
                submitted_order=resp_data.get('submitted_order'),
            )

            # Set selected_options (M2M)
            selected_option_ids = resp_data.get('selected_options', [])
            if selected_option_ids:
                response.selected_options.set(
                    VersionAnswerOption.objects.filter(id__in=selected_option_ids)
                )

        # Grade the quiz attempt
        result = grade_quiz_attempt(quiz_attempt)

        quiz_attempt.score_earned = result['score_earned']
        quiz_attempt.score_possible = result['score_possible']
        quiz_attempt.score_percent = result['score_percent']
        quiz_attempt.passed = result['passed']
        quiz_attempt.passed_all_mandatory = result['passed_all_mandatory']
        quiz_attempt.completed_at = timezone.now()
        if quiz_attempt.started_at:
            quiz_attempt.time_spent_seconds = int(
                (timezone.now() - quiz_attempt.started_at).total_seconds()
            )
        quiz_attempt.save()

        # Update trainee context with quiz score
        attempt.trainee_context.setdefault('quiz_scores', {})
        attempt.trainee_context['quiz_scores'][str(quiz_id)] = float(result['score_percent'])
        attempt.save(update_fields=['trainee_context'])

        # Update step completion status if quiz is step-level
        if version_quiz.version_step:
            step_completion = attempt.step_completions.filter(
                version_step=version_quiz.version_step
            ).first()
            if step_completion:
                if result['passed']:
                    step_completion.status = 'quiz_passed'
                else:
                    step_completion.status = 'quiz_failed'
                step_completion.save(update_fields=['status'])

        # Audit
        audit_action = (ProcedureAuditLog.Action.QUIZ_PASSED if result['passed']
                        else ProcedureAuditLog.Action.QUIZ_FAILED)
        ProcedureAuditLog.objects.create(
            organization=attempt.assignment.organization,
            action=audit_action,
            actor=request.user,
            procedure=attempt.assignment.procedure_version.procedure,
            version=attempt.assignment.procedure_version,
            assignment=attempt.assignment,
            ip_address=request.META.get('REMOTE_ADDR'),
            detail={
                'quiz_title': version_quiz.title,
                'score_percent': float(result['score_percent']),
                'passed': result['passed'],
                'attempt_number': quiz_attempt.attempt_number,
            },
        )

        return Response({
            'quiz_attempt': QuizAttemptSerializer(quiz_attempt).data,
            'result': result,
        })

    @action(detail=True, methods=['post'], url_path='complete_training')
    def complete_training(self, request, pk=None):
        """Finalize a training attempt."""
        qs = TrainingAttempt.objects.filter(id=pk)
        if not request.user.is_superuser:
            qs = qs.filter(assignment__assignee=request.user)
        attempt = qs.get()

        if attempt.status != 'in_progress':
            return Response(
                {'error': 'Only in-progress attempts can be completed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check all applicable steps are completed or skipped
        incomplete_steps = attempt.step_completions.exclude(
            status__in=['completed', 'skipped', 'quiz_passed']
        ).count()
        if incomplete_steps > 0:
            return Response(
                {'error': f'{incomplete_steps} step(s) are not yet completed.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check end-of-procedure quiz if any
        version = attempt.assignment.procedure_version
        end_quiz = version.quizzes.filter(quiz_type='end_of_procedure').first()
        if end_quiz:
            passed_end_quiz = attempt.quiz_attempts.filter(
                version_quiz=end_quiz, passed=True
            ).exists()
            if not passed_end_quiz:
                return Response(
                    {'error': 'You must pass the end-of-procedure quiz.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Calculate final results
        attempt.completed_at = timezone.now()
        attempt.total_time_seconds = sum(
            sc.time_spent_seconds for sc in attempt.step_completions.all()
        )

        # Calculate total score from all quiz attempts
        quiz_results = attempt.quiz_attempts.filter(completed_at__isnull=False)
        if quiz_results.exists():
            total_earned = sum(qa.score_earned for qa in quiz_results)
            total_possible = sum(qa.score_possible for qa in quiz_results)
            attempt.total_score = round(total_earned / total_possible * 100, 2) if total_possible > 0 else 0
            attempt.passed_all_mandatory = all(qa.passed_all_mandatory for qa in quiz_results)
        else:
            attempt.total_score = 100  # No quizzes means automatic pass
            attempt.passed_all_mandatory = True

        # Determine pass/fail
        all_quizzes_passed = not quiz_results.filter(passed=False).exists() if quiz_results.exists() else True
        if all_quizzes_passed and attempt.passed_all_mandatory:
            attempt.status = 'passed'
        else:
            attempt.status = 'failed'
        attempt.save()

        # Update assignment
        assignment = attempt.assignment
        if attempt.status == 'passed':
            assignment.status = 'completed'
            assignment.completed_at = timezone.now()
            assignment.completion_score = attempt.total_score
            assignment.save(update_fields=['status', 'completed_at', 'completion_score'])
        else:
            # Check if more attempts are possible (no global max on assignment — handled per quiz)
            assignment.save()  # stays in_progress

        # Audit
        audit_action = (ProcedureAuditLog.Action.TRAINING_COMPLETED if attempt.status == 'passed'
                        else ProcedureAuditLog.Action.TRAINING_FAILED)
        ProcedureAuditLog.objects.create(
            organization=assignment.organization,
            action=audit_action,
            actor=request.user,
            procedure=assignment.procedure_version.procedure,
            version=assignment.procedure_version,
            assignment=assignment,
            ip_address=request.META.get('REMOTE_ADDR'),
            detail={
                'attempt_number': attempt.attempt_number,
                'total_score': float(attempt.total_score) if attempt.total_score else 0,
                'status': attempt.status,
            },
        )

        return Response(TrainingAttemptSerializer(attempt).data)


# ---------------------------------------------------------------------------
# Phase G: Evidence & Export Views
# ---------------------------------------------------------------------------

class EvidenceViewSet(viewsets.ReadOnlyModelViewSet):
    """Training evidence for compliance auditing and export."""
    serializer_class = ProcedureAssignmentSerializer

    def get_permissions(self):
        return [permissions.IsAuthenticated(), (IsProcedureAdmin | IsComplianceAuditor)()]

    def get_queryset(self):
        qs = ProcedureAssignment.objects.filter(
            organization=self.request.user.organization,
        ).select_related(
            'procedure_version__procedure', 'assignee', 'assigned_by',
        ).prefetch_related(
            'attempts__step_completions__version_step',
            'attempts__quiz_attempts__responses__version_question',
        )

        # Filters
        user = self.request.query_params.get('user')
        if user:
            qs = qs.filter(assignee_id=user)

        procedure = self.request.query_params.get('procedure')
        if procedure:
            qs = qs.filter(procedure_version__procedure_id=procedure)

        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(assigned_at__date__gte=date_from)

        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(assigned_at__date__lte=date_to)

        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        return qs

    def retrieve(self, request, pk=None):
        """Full evidence record for one assignment."""
        assignment = self.get_object()
        evidence = self._build_evidence_record(assignment)
        return Response(evidence)

    @action(detail=False, methods=['get'], url_path='export')
    def export(self, request):
        """Export evidence as CSV or PDF."""
        fmt = request.query_params.get('format', 'csv')
        if fmt == 'csv':
            return self._export_csv(request)
        elif fmt == 'pdf':
            from .tasks import export_evidence_pdf
            export_evidence_pdf.delay(
                filter_params=dict(request.query_params),
                requested_by_id=str(request.user.id),
            )
            return Response({'message': 'PDF export started. You will be notified when ready.'})
        else:
            return Response(
                {'error': 'Invalid format. Use csv or pdf.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def _export_csv(self, request):
        """Generate synchronous CSV export of training evidence."""
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
            total_time = sum(
                a.total_time_seconds for a in assignment.attempts.all()
            )
            writer.writerow([
                str(assignment.id),
                assignment.procedure_version.title,
                assignment.procedure_version.version_number,
                assignment.assignee.get_full_name(),
                assignment.assignee.email,
                getattr(assignment.assignee, 'department', None) and assignment.assignee.department.name or '',
                assignment.assigned_by.get_full_name(),
                assignment.assigned_at.isoformat(),
                str(assignment.due_date),
                assignment.assignment_source,
                assignment.status,
                assignment.completed_at.isoformat() if assignment.completed_at else '',
                str(assignment.completion_score or ''),
                assignment.attempts.count(),
                total_time,
            ])

        return response

    def _build_evidence_record(self, assignment):
        """Build the complete evidence record structure for one assignment."""
        version = assignment.procedure_version

        evidence = {
            'assignment_id': str(assignment.id),
            'procedure': {
                'title': version.title,
                'version': version.version_number,
                'published_at': version.published_at.isoformat() if version.published_at else None,
                'effective_from': str(version.effective_from),
                'expires_on': str(version.expires_on),
            },
            'assignee': {
                'name': assignment.assignee.get_full_name(),
                'email': assignment.assignee.email,
                'department': getattr(assignment.assignee, 'department', None) and assignment.assignee.department.name or '',
            },
            'assignment': {
                'assigned_by': assignment.assigned_by.get_full_name(),
                'assigned_at': assignment.assigned_at.isoformat(),
                'due_date': str(assignment.due_date),
                'source': assignment.assignment_source,
                'status': assignment.status,
                'completed_at': assignment.completed_at.isoformat() if assignment.completed_at else None,
                'completion_score': float(assignment.completion_score) if assignment.completion_score else None,
            },
            'attempts': [],
        }

        for attempt in assignment.attempts.all().order_by('attempt_number'):
            attempt_data = {
                'attempt_number': attempt.attempt_number,
                'status': attempt.status,
                'started_at': attempt.started_at.isoformat() if attempt.started_at else None,
                'completed_at': attempt.completed_at.isoformat() if attempt.completed_at else None,
                'total_time_seconds': attempt.total_time_seconds,
                'total_score': float(attempt.total_score) if attempt.total_score else None,
                'step_completions': [],
                'quiz_results': [],
            }

            # Step completions
            for sc in attempt.step_completions.all().order_by('version_step__order'):
                step_data = {
                    'step': sc.version_step.title,
                    'order': sc.version_step.order,
                    'status': sc.status,
                    'started_at': sc.started_at.isoformat() if sc.started_at else None,
                    'completed_at': sc.completed_at.isoformat() if sc.completed_at else None,
                    'time_spent_seconds': sc.time_spent_seconds,
                    'manual_opened': sc.manual_opened_at is not None,
                    'manual_opened_at': sc.manual_opened_at.isoformat() if sc.manual_opened_at else None,
                    'media_completed': sc.media_completed_at is not None,
                    'media_completed_at': sc.media_completed_at.isoformat() if sc.media_completed_at else None,
                }
                attempt_data['step_completions'].append(step_data)

            # Quiz results
            for qa in attempt.quiz_attempts.all().order_by('attempt_number'):
                quiz_data = {
                    'quiz': qa.version_quiz.title,
                    'attempt_number': qa.attempt_number,
                    'score_earned': qa.score_earned,
                    'score_possible': qa.score_possible,
                    'score_percent': float(qa.score_percent) if qa.score_percent else None,
                    'passed': qa.passed,
                    'started_at': qa.started_at.isoformat() if qa.started_at else None,
                    'completed_at': qa.completed_at.isoformat() if qa.completed_at else None,
                    'time_spent_seconds': qa.time_spent_seconds,
                    'questions': [],
                }

                for resp in qa.responses.all().select_related('version_question'):
                    q = resp.version_question
                    selected_texts = list(
                        resp.selected_options.values_list('text', flat=True)
                    )
                    correct_texts = list(
                        q.options.filter(is_correct=True).values_list('text', flat=True)
                    )
                    question_data = {
                        'question': q.text,
                        'type': q.question_type,
                        'answer_given': selected_texts or resp.text_response or resp.submitted_order,
                        'correct_answer': correct_texts,
                        'is_correct': resp.is_correct,
                        'is_mandatory': q.is_mandatory,
                        'points': q.points,
                        'points_earned': resp.points_earned,
                    }
                    quiz_data['questions'].append(question_data)

                attempt_data['quiz_results'].append(quiz_data)

            evidence['attempts'].append(attempt_data)

        return evidence


class ProcedureAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Procedure-specific audit log for compliance."""
    serializer_class = ProcedureAuditLogSerializer

    def get_permissions(self):
        return [permissions.IsAuthenticated(), (IsProcedureAdmin | IsComplianceAuditor)()]

    def get_queryset(self):
        qs = ProcedureAuditLog.objects.filter(
            organization=self.request.user.organization,
        ).select_related('actor', 'procedure', 'version', 'assignment')

        # Filters
        procedure = self.request.query_params.get('procedure')
        if procedure:
            qs = qs.filter(procedure_id=procedure)

        action_filter = self.request.query_params.get('action')
        if action_filter:
            qs = qs.filter(action=action_filter)

        actor = self.request.query_params.get('actor')
        if actor:
            qs = qs.filter(actor_id=actor)

        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(timestamp__date__gte=date_from)

        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(timestamp__date__lte=date_to)

        return qs
