"""
Serializers for the Procedures app.
Covers Phase B (core), Phase C (quiz), and Phase F (assignment & training) serializers.
"""

from rest_framework import serializers
from .models import (
    Procedure, ProcedureStep, StepAttachment,
    ProcedureVersion, ProcedureVersionStep, VersionStepAttachment,
    ProcedureStepComment, ProcedureAuditLog,
    Quiz, Question, AnswerOption,
    ProcedureAssignment, TrainingAttempt, StepCompletion,
    QuizAttempt, QuestionResponse,
    VersionQuiz,
)


class StepAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = StepAttachment
        fields = '__all__'
        read_only_fields = ['id', 'step', 'uploaded_by', 'uploaded_at', 'file_size',
                            'file_extension', 'mime_type', 'checksum_sha256']


class ProcedureStepSerializer(serializers.ModelSerializer):
    attachments = StepAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = ProcedureStep
        fields = '__all__'
        read_only_fields = ['id', 'procedure', 'created_at', 'updated_at']


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
        fields = ['id', 'title', 'description', 'department', 'parent_procedure', 'tags']
        read_only_fields = ['id']


class StepReorderSerializer(serializers.Serializer):
    steps = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField()),
        help_text='List of {id, order} objects'
    )


class SubmitForReviewSerializer(serializers.Serializer):
    reviewers = serializers.ListField(
        child=serializers.IntegerField(),
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


class ProcedureAuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.get_full_name', read_only=True)

    class Meta:
        model = ProcedureAuditLog
        fields = '__all__'
        read_only_fields = ['id', 'organization', 'action', 'actor', 'timestamp',
                            'procedure', 'version', 'step_id', 'assignment',
                            'ip_address', 'user_agent', 'detail']


# ---------------------------------------------------------------------------
# Quiz Serializers (Phase C)
# ---------------------------------------------------------------------------

class AnswerOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnswerOption
        fields = '__all__'
        read_only_fields = ['id', 'question']


class QuestionSerializer(serializers.ModelSerializer):
    options = AnswerOptionSerializer(many=True)

    class Meta:
        model = Question
        fields = '__all__'
        read_only_fields = ['id', 'quiz']

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
        fields = ['id', 'quiz_type', 'step', 'title', 'description',
                  'passing_score_percent', 'max_attempts', 'time_limit_minutes',
                  'shuffle_questions', 'shuffle_answers', 'show_correct_answers_after']
        read_only_fields = ['id']


# ---------------------------------------------------------------------------
# Phase F: Assignment & Training Serializers
# ---------------------------------------------------------------------------

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
    assignees = serializers.ListField(child=serializers.IntegerField(), required=False, default=[])
    departments = serializers.ListField(child=serializers.IntegerField(), required=False, default=[])
    roles = serializers.ListField(child=serializers.CharField(), required=False, default=[])
    due_date = serializers.DateField()


class WaiveAssignmentSerializer(serializers.Serializer):
    reason = serializers.CharField(min_length=1)


class StepCompletionSerializer(serializers.ModelSerializer):
    step_title = serializers.CharField(source='version_step.title', read_only=True)
    step_order = serializers.IntegerField(source='version_step.order', read_only=True)

    class Meta:
        model = StepCompletion
        fields = '__all__'
        read_only_fields = ['id', 'attempt', 'version_step', 'started_at',
                            'completed_at', 'time_spent_seconds',
                            'manual_opened_at', 'media_completed_at']


class QuestionResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionResponse
        fields = '__all__'
        read_only_fields = ['id', 'quiz_attempt', 'is_correct', 'points_earned',
                            'graded_by', 'graded_at', 'answered_at']


class QuizAttemptSerializer(serializers.ModelSerializer):
    responses = QuestionResponseSerializer(many=True, read_only=True)
    quiz_title = serializers.CharField(source='version_quiz.title', read_only=True)

    class Meta:
        model = QuizAttempt
        fields = '__all__'
        read_only_fields = ['id', 'training_attempt', 'version_quiz', 'attempt_number',
                            'started_at', 'completed_at', 'time_spent_seconds',
                            'score_earned', 'score_possible', 'score_percent',
                            'passed', 'passed_all_mandatory']


class TrainingAttemptSerializer(serializers.ModelSerializer):
    step_completions = StepCompletionSerializer(many=True, read_only=True)
    quiz_attempts = QuizAttemptSerializer(many=True, read_only=True)

    class Meta:
        model = TrainingAttempt
        fields = '__all__'
        read_only_fields = ['id', 'assignment', 'attempt_number', 'status',
                            'current_step', 'steps_completed', 'total_steps',
                            'started_at', 'completed_at', 'total_time_seconds',
                            'total_score', 'passed_all_mandatory', 'trainee_context']


class QuizSubmitSerializer(serializers.Serializer):
    responses = serializers.ListField(
        child=serializers.DictField(),
        help_text='List of {question_id, selected_options?, text_response?, submitted_order?}'
    )


class VersionQuizSerializer(serializers.ModelSerializer):
    """Read-only serializer for versioned quizzes (used in training delivery)."""

    class Meta:
        model = VersionQuiz
        fields = ['id', 'quiz_type', 'title', 'description',
                  'passing_score_percent', 'max_attempts', 'time_limit_minutes',
                  'shuffle_questions', 'shuffle_answers', 'show_correct_answers_after']
