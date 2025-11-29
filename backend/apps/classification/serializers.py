"""
Serializers for classification models.
"""
from rest_framework import serializers
from apps.classification.models import (
    ClassificationRule,
    ClassificationLog,
    MLClassificationModel,
    ClassificationPrediction,
    TrainingFeedback,
    ClassificationSettings
)
from apps.users.serializers import UserBasicSerializer


class ClassificationRuleSerializer(serializers.ModelSerializer):
    """
    Serializer for ClassificationRule model.
    """
    created_by_details = UserBasicSerializer(source='created_by', read_only=True)
    updated_by_details = UserBasicSerializer(source='updated_by', read_only=True)

    class Meta:
        model = ClassificationRule
        fields = [
            'id',
            'name',
            'description',
            'priority',
            'is_active',
            'conditions',
            'actions',
            'applied_count',
            'last_applied_at',
            'created_at',
            'created_by',
            'created_by_details',
            'updated_at',
            'updated_by',
            'updated_by_details',
        ]
        read_only_fields = ['id', 'applied_count', 'last_applied_at', 'created_at', 'updated_at']

    def validate_conditions(self, value):
        """Validate conditions structure."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Conditions must be a dictionary")

        valid_keys = {
            'filename_contains', 'content_contains', 'file_type',
            'document_type', 'min_file_size_mb', 'max_file_size_mb',
            'department_id'
        }

        invalid_keys = set(value.keys()) - valid_keys
        if invalid_keys:
            raise serializers.ValidationError(
                f"Invalid condition keys: {invalid_keys}. Valid keys: {valid_keys}"
            )

        return value

    def validate_actions(self, value):
        """Validate actions structure."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Actions must be a dictionary")

        valid_keys = {
            'move_to_folder', 'set_document_type', 'add_tags',
            'set_confidentiality', 'assign_to_department'
        }

        invalid_keys = set(value.keys()) - valid_keys
        if invalid_keys:
            raise serializers.ValidationError(
                f"Invalid action keys: {invalid_keys}. Valid keys: {valid_keys}"
            )

        if not value:
            raise serializers.ValidationError("At least one action must be specified")

        return value

    def create(self, validated_data):
        """Set created_by from request user."""
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """Set updated_by from request user."""
        validated_data['updated_by'] = self.context['request'].user
        return super().update(instance, validated_data)


class ClassificationRuleListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing classification rules.
    """
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = ClassificationRule
        fields = [
            'id',
            'name',
            'description',
            'priority',
            'is_active',
            'applied_count',
            'last_applied_at',
            'created_at',
            'created_by_name',
        ]


class ClassificationLogSerializer(serializers.ModelSerializer):
    """
    Serializer for ClassificationLog model.
    """
    rule_name = serializers.CharField(source='rule.name', read_only=True)
    document_title = serializers.CharField(source='document.title', read_only=True)
    document_file_name = serializers.CharField(source='document.file_name', read_only=True)

    class Meta:
        model = ClassificationLog
        fields = [
            'id',
            'rule',
            'rule_name',
            'document',
            'document_title',
            'document_file_name',
            'applied_at',
            'conditions_matched',
            'actions_applied',
            'success',
            'error_message',
            'triggered_by',
        ]
        read_only_fields = ['id', 'applied_at']


# =============================================================================
# ML Classification Serializers
# =============================================================================

class MLClassificationModelSerializer(serializers.ModelSerializer):
    """
    Serializer for ML Classification Model.
    """
    created_by_details = UserBasicSerializer(source='created_by', read_only=True)
    production_accuracy = serializers.FloatField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    model_type_display = serializers.CharField(source='get_model_type_display', read_only=True)

    class Meta:
        model = MLClassificationModel
        fields = [
            'id',
            'name',
            'model_type',
            'model_type_display',
            'version',
            'status',
            'status_display',
            'algorithm',
            'hyperparameters',
            'feature_config',
            'training_samples',
            'training_classes',
            'training_started_at',
            'training_completed_at',
            'training_duration_seconds',
            'accuracy',
            'precision',
            'recall',
            'f1_score',
            'confusion_matrix',
            'classification_report',
            'predictions_count',
            'correct_predictions',
            'production_accuracy',
            'last_used_at',
            'created_at',
            'created_by',
            'created_by_details',
            'updated_at',
        ]
        read_only_fields = [
            'id', 'version', 'model_file_path', 'vectorizer_file_path',
            'training_samples', 'training_classes', 'training_started_at',
            'training_completed_at', 'training_duration_seconds',
            'accuracy', 'precision', 'recall', 'f1_score',
            'confusion_matrix', 'classification_report',
            'predictions_count', 'correct_predictions', 'last_used_at',
            'created_at', 'updated_at'
        ]


class MLClassificationModelListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing ML models.
    """
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    model_type_display = serializers.CharField(source='get_model_type_display', read_only=True)
    production_accuracy = serializers.FloatField(read_only=True)

    class Meta:
        model = MLClassificationModel
        fields = [
            'id',
            'name',
            'model_type',
            'model_type_display',
            'version',
            'status',
            'status_display',
            'algorithm',
            'accuracy',
            'f1_score',
            'predictions_count',
            'production_accuracy',
            'training_samples',
            'created_at',
        ]


class ClassificationPredictionSerializer(serializers.ModelSerializer):
    """
    Serializer for Classification Prediction.
    """
    document_title = serializers.CharField(source='document.title', read_only=True)
    document_file_name = serializers.CharField(source='document.file_name', read_only=True)
    document_id = serializers.UUIDField(source='document.id', read_only=True)
    model_name = serializers.CharField(source='model.name', read_only=True)
    model_version = serializers.CharField(source='model.version', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True)
    confidence_level_display = serializers.CharField(source='get_confidence_level_display', read_only=True)
    review_status_display = serializers.CharField(source='get_review_status_display', read_only=True)

    class Meta:
        model = ClassificationPrediction
        fields = [
            'id',
            'document',
            'document_id',
            'document_title',
            'document_file_name',
            'model',
            'model_name',
            'model_version',
            'predicted_class',
            'confidence_score',
            'confidence_level',
            'confidence_level_display',
            'class_probabilities',
            'review_status',
            'review_status_display',
            'user_correction',
            'reviewed_by',
            'reviewed_by_name',
            'reviewed_at',
            'actions_applied',
            'created_at',
        ]
        read_only_fields = [
            'id', 'document', 'model', 'predicted_class', 'confidence_score',
            'confidence_level', 'class_probabilities', 'actions_applied',
            'created_at'
        ]


class ClassificationPredictionReviewSerializer(serializers.Serializer):
    """
    Serializer for reviewing/correcting predictions.
    """
    action = serializers.ChoiceField(
        choices=['confirm', 'correct', 'reject'],
        help_text="Action to take: confirm, correct, or reject the prediction"
    )
    correction = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Required if action is 'correct'. The correct classification value."
    )

    def validate(self, data):
        if data['action'] == 'correct' and not data.get('correction'):
            raise serializers.ValidationError({
                'correction': 'Correction value is required when action is "correct"'
            })
        return data


class TrainingFeedbackSerializer(serializers.ModelSerializer):
    """
    Serializer for Training Feedback.
    """
    document_title = serializers.CharField(source='document.title', read_only=True)
    provided_by_name = serializers.CharField(source='provided_by.get_full_name', read_only=True)
    feedback_source_display = serializers.CharField(source='get_feedback_source_display', read_only=True)

    class Meta:
        model = TrainingFeedback
        fields = [
            'id',
            'document',
            'document_title',
            'prediction',
            'classification_target',
            'original_prediction',
            'corrected_class',
            'feedback_source',
            'feedback_source_display',
            'provided_by',
            'provided_by_name',
            'used_in_training',
            'trained_model',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'used_in_training', 'trained_model']


class ClassificationSettingsSerializer(serializers.ModelSerializer):
    """
    Serializer for Classification Settings.
    """
    updated_by_name = serializers.CharField(source='updated_by.get_full_name', read_only=True)

    class Meta:
        model = ClassificationSettings
        fields = [
            'high_confidence_threshold',
            'medium_confidence_threshold',
            'auto_apply_enabled',
            'auto_apply_document_type',
            'auto_apply_confidentiality',
            'auto_apply_department',
            'auto_retrain_enabled',
            'retrain_threshold',
            'retrain_schedule',
            'min_training_samples',
            'notify_on_low_confidence',
            'notify_on_model_retrain',
            'max_text_length',
            'include_filename',
            'include_file_type',
            'updated_at',
            'updated_by',
            'updated_by_name',
        ]
        read_only_fields = ['updated_at']

    def validate_high_confidence_threshold(self, value):
        if not 0 <= value <= 1:
            raise serializers.ValidationError("Threshold must be between 0 and 1")
        return value

    def validate_medium_confidence_threshold(self, value):
        if not 0 <= value <= 1:
            raise serializers.ValidationError("Threshold must be between 0 and 1")
        return value

    def validate(self, data):
        high = data.get('high_confidence_threshold')
        medium = data.get('medium_confidence_threshold')

        if high and medium and high <= medium:
            raise serializers.ValidationError({
                'high_confidence_threshold': 'High threshold must be greater than medium threshold'
            })

        return data

    def update(self, instance, validated_data):
        validated_data['updated_by'] = self.context['request'].user
        return super().update(instance, validated_data)


class TrainModelRequestSerializer(serializers.Serializer):
    """
    Serializer for model training request.
    """
    classification_target = serializers.ChoiceField(
        choices=['document_type', 'confidentiality', 'department'],
        default='document_type'
    )
    algorithm = serializers.ChoiceField(
        choices=['multinomial_nb', 'random_forest', 'svm'],
        default='multinomial_nb'
    )
    max_features = serializers.IntegerField(
        min_value=100,
        max_value=50000,
        default=5000,
        required=False
    )
    ngram_range = serializers.ListField(
        child=serializers.IntegerField(min_value=1, max_value=3),
        min_length=2,
        max_length=2,
        default=[1, 2],
        required=False
    )


class MLClassificationStatsSerializer(serializers.Serializer):
    """
    Serializer for ML classification statistics.
    """
    active_models = serializers.IntegerField()
    total_models = serializers.IntegerField()
    total_predictions = serializers.IntegerField()
    predictions_by_status = serializers.DictField()
    predictions_by_confidence = serializers.DictField()
    production_accuracy = serializers.FloatField(allow_null=True)
    confirmed_predictions = serializers.IntegerField()
    corrected_predictions = serializers.IntegerField()
    pending_review = serializers.IntegerField()
    unused_feedback = serializers.IntegerField()
