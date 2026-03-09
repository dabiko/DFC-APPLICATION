"""
Admin configuration for Procedure Management models.
"""

from django.contrib import admin
from apps.procedures.models import (
    Procedure,
    ProcedureStep,
    StepAttachment,
    ProcedureVersion,
    ProcedureVersionStep,
    VersionStepAttachment,
    Quiz,
    Question,
    AnswerOption,
    VersionQuiz,
    VersionQuestion,
    VersionAnswerOption,
    ProcedureStepComment,
    ProcedureAssignment,
    TrainingAttempt,
    StepCompletion,
    QuizAttempt,
    QuestionResponse,
    ProcedureAuditLog,
)


# ---------- Inlines ----------

class ProcedureStepInline(admin.TabularInline):
    model = ProcedureStep
    extra = 1
    fields = ['order', 'title', 'estimated_duration_minutes', 'require_manual_open',
              'require_media_completion', 'require_quiz_pass']
    ordering = ['order']


class StepAttachmentInline(admin.TabularInline):
    model = StepAttachment
    extra = 0
    fields = ['title', 'attachment_type', 'file', 'file_name', 'file_size']
    readonly_fields = ['file_name', 'file_size']


class QuestionInline(admin.TabularInline):
    model = Question
    extra = 1
    fields = ['order', 'question_type', 'text', 'points', 'is_mandatory']
    ordering = ['order']


class AnswerOptionInline(admin.TabularInline):
    model = AnswerOption
    extra = 2
    fields = ['order', 'text', 'is_correct', 'correct_order']
    ordering = ['order']


class ProcedureVersionStepInline(admin.TabularInline):
    model = ProcedureVersionStep
    extra = 0
    fields = ['order', 'title', 'estimated_duration_minutes']
    readonly_fields = ['order', 'title', 'estimated_duration_minutes']
    ordering = ['order']
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


# ---------- Core ----------

@admin.register(Procedure)
class ProcedureAdmin(admin.ModelAdmin):
    list_display = ['title', 'department', 'state', 'current_version',
                    'created_by', 'is_deleted', 'updated_at']
    list_filter = ['state', 'department', 'is_deleted', 'organization']
    search_fields = ['title', 'description']
    readonly_fields = ['id', 'current_version', 'created_at', 'updated_at']
    inlines = [ProcedureStepInline]
    date_hierarchy = 'created_at'

    fieldsets = (
        (None, {
            'fields': ('id', 'title', 'description', 'organization')
        }),
        ('Classification', {
            'fields': ('department', 'parent_procedure', 'tags')
        }),
        ('Status', {
            'fields': ('state', 'current_version')
        }),
        ('Soft Delete', {
            'fields': ('is_deleted', 'deleted_at', 'deleted_by'),
            'classes': ('collapse',)
        }),
        ('Tracking', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ProcedureStep)
class ProcedureStepAdmin(admin.ModelAdmin):
    list_display = ['procedure', 'order', 'title', 'estimated_duration_minutes',
                    'require_manual_open', 'require_media_completion', 'require_quiz_pass']
    list_filter = ['require_manual_open', 'require_media_completion', 'require_quiz_pass']
    search_fields = ['title', 'procedure__title']
    readonly_fields = ['id', 'created_at', 'updated_at']
    inlines = [StepAttachmentInline]
    ordering = ['procedure', 'order']


@admin.register(StepAttachment)
class StepAttachmentAdmin(admin.ModelAdmin):
    list_display = ['title', 'step', 'attachment_type', 'file_name', 'file_size',
                    'uploaded_by', 'uploaded_at']
    list_filter = ['attachment_type']
    search_fields = ['title', 'file_name']
    readonly_fields = ['id', 'uploaded_at', 'checksum_sha256']


# ---------- Versioning ----------

@admin.register(ProcedureVersion)
class ProcedureVersionAdmin(admin.ModelAdmin):
    list_display = ['procedure', 'version_number', 'title', 'is_active',
                    'published_by', 'published_at', 'effective_from', 'expires_on']
    list_filter = ['is_active', 'procedure']
    search_fields = ['title', 'procedure__title']
    readonly_fields = ['id', 'published_at']
    inlines = [ProcedureVersionStepInline]


@admin.register(ProcedureVersionStep)
class ProcedureVersionStepAdmin(admin.ModelAdmin):
    list_display = ['version', 'order', 'title', 'estimated_duration_minutes']
    search_fields = ['title']
    readonly_fields = ['id']
    ordering = ['version', 'order']


@admin.register(VersionStepAttachment)
class VersionStepAttachmentAdmin(admin.ModelAdmin):
    list_display = ['title', 'version_step', 'attachment_type', 'file_name', 'file_size']
    readonly_fields = ['id']


# ---------- Quiz (Draft) ----------

@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ['title', 'procedure', 'quiz_type', 'step',
                    'passing_score_percent', 'max_attempts', 'time_limit_minutes']
    list_filter = ['quiz_type']
    search_fields = ['title', 'procedure__title']
    readonly_fields = ['id', 'created_at', 'updated_at']
    inlines = [QuestionInline]


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ['quiz', 'order', 'question_type', 'text', 'points', 'is_mandatory']
    list_filter = ['question_type', 'is_mandatory']
    search_fields = ['text']
    readonly_fields = ['id']
    inlines = [AnswerOptionInline]
    ordering = ['quiz', 'order']


@admin.register(AnswerOption)
class AnswerOptionAdmin(admin.ModelAdmin):
    list_display = ['question', 'order', 'text', 'is_correct', 'correct_order']
    readonly_fields = ['id']


# ---------- Quiz (Versioned) ----------

@admin.register(VersionQuiz)
class VersionQuizAdmin(admin.ModelAdmin):
    list_display = ['title', 'version', 'quiz_type', 'version_step',
                    'passing_score_percent', 'max_attempts']
    search_fields = ['title']
    readonly_fields = ['id']


@admin.register(VersionQuestion)
class VersionQuestionAdmin(admin.ModelAdmin):
    list_display = ['version_quiz', 'order', 'question_type', 'text', 'points', 'is_mandatory']
    readonly_fields = ['id']


@admin.register(VersionAnswerOption)
class VersionAnswerOptionAdmin(admin.ModelAdmin):
    list_display = ['version_question', 'order', 'text', 'is_correct', 'correct_order']
    readonly_fields = ['id']


# ---------- Review ----------

@admin.register(ProcedureStepComment)
class ProcedureStepCommentAdmin(admin.ModelAdmin):
    list_display = ['step', 'author', 'workflow_instance', 'is_resolved', 'created_at']
    list_filter = ['is_resolved']
    search_fields = ['body', 'author__username']
    readonly_fields = ['id', 'created_at', 'updated_at']


# ---------- Training ----------

@admin.register(ProcedureAssignment)
class ProcedureAssignmentAdmin(admin.ModelAdmin):
    list_display = ['procedure_version', 'assignee', 'assigned_by', 'status',
                    'assignment_source', 'due_date', 'completed_at']
    list_filter = ['status', 'assignment_source']
    search_fields = ['procedure_version__title', 'assignee__username']
    readonly_fields = ['id', 'assigned_at']
    date_hierarchy = 'assigned_at'


@admin.register(TrainingAttempt)
class TrainingAttemptAdmin(admin.ModelAdmin):
    list_display = ['assignment', 'attempt_number', 'status', 'total_score',
                    'steps_completed', 'total_steps', 'started_at', 'completed_at']
    list_filter = ['status']
    readonly_fields = ['id']


@admin.register(StepCompletion)
class StepCompletionAdmin(admin.ModelAdmin):
    list_display = ['attempt', 'version_step', 'status', 'started_at',
                    'completed_at', 'time_spent_seconds']
    list_filter = ['status']
    readonly_fields = ['id']


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ['training_attempt', 'version_quiz', 'attempt_number',
                    'score_percent', 'passed', 'started_at', 'completed_at']
    list_filter = ['passed']
    readonly_fields = ['id']


@admin.register(QuestionResponse)
class QuestionResponseAdmin(admin.ModelAdmin):
    list_display = ['quiz_attempt', 'version_question', 'is_correct',
                    'points_earned', 'answered_at']
    list_filter = ['is_correct']
    readonly_fields = ['id']


# ---------- Audit ----------

@admin.register(ProcedureAuditLog)
class ProcedureAuditLogAdmin(admin.ModelAdmin):
    list_display = ['action', 'actor', 'procedure', 'timestamp']
    list_filter = ['action']
    search_fields = ['detail', 'actor__username', 'procedure__title']
    readonly_fields = ['id', 'organization', 'action', 'actor', 'timestamp',
                       'procedure', 'version', 'step_id', 'assignment',
                       'ip_address', 'user_agent', 'detail']
    date_hierarchy = 'timestamp'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
