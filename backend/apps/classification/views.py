"""
API views for classification system.

Includes:
- Rule-based classification endpoints
- ML classification endpoints (Phase 1)
- Review queue management
- Model training and management
"""
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.shortcuts import get_object_or_404

from apps.classification.models import (
    ClassificationRule,
    ClassificationLog,
    MLClassificationModel,
    ClassificationPrediction,
    TrainingFeedback,
    ClassificationSettings
)
from apps.classification.serializers import (
    ClassificationRuleSerializer,
    ClassificationRuleListSerializer,
    ClassificationLogSerializer,
    MLClassificationModelSerializer,
    MLClassificationModelListSerializer,
    ClassificationPredictionSerializer,
    ClassificationPredictionReviewSerializer,
    TrainingFeedbackSerializer,
    ClassificationSettingsSerializer,
    TrainModelRequestSerializer,
    MLClassificationStatsSerializer
)
from apps.classification.engine import ClassificationEngine
from apps.documents.models import Document
from apps.documents.serializers import DocumentListSerializer

import logging

logger = logging.getLogger(__name__)


class ClassificationRuleListCreateView(generics.ListCreateAPIView):
    """
    List all classification rules or create a new one.

    GET: List all classification rules (admin only)
    POST: Create a new classification rule (admin only)
    """
    permission_classes = [IsAdminUser]
    queryset = ClassificationRule.objects.all()

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return ClassificationRuleListSerializer
        return ClassificationRuleSerializer


class ClassificationRuleDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a classification rule.

    GET: Get rule details (admin only)
    PUT/PATCH: Update rule (admin only)
    DELETE: Delete rule (admin only)
    """
    permission_classes = [IsAdminUser]
    queryset = ClassificationRule.objects.all()
    serializer_class = ClassificationRuleSerializer


class TestClassificationRuleView(APIView):
    """
    Test a classification rule against existing documents.

    POST /api/v1/classification/rules/{id}/test/

    Tests which documents would match the rule without applying actions.
    Useful for validating rules before activation.

    Query Parameters:
        limit (int): Max documents to test (default: 100)

    Returns:
        {
            "rule": {...},
            "documents_tested": 100,
            "matching_documents": 15,
            "matches": [...]
        }
    """
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        rule = get_object_or_404(ClassificationRule, pk=pk)
        limit = int(request.query_params.get('limit', 100))

        # Test rule against documents
        result = ClassificationEngine.test_rule_against_documents(rule, limit=limit)

        return Response({
            'rule': ClassificationRuleSerializer(rule).data,
            'documents_tested': result['documents_tested'],
            'matching_documents': result['matching_documents'],
            'matches': result['matches']
        })


class ApplyClassificationManuallyView(APIView):
    """
    Manually trigger classification for a document.

    POST /api/v1/documents/{id}/classify/

    Applies all matching classification rules to the specified document.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        document = get_object_or_404(Document, pk=pk, is_deleted=False)

        # Check permissions
        if not request.user.is_staff:
            if document.owner != request.user:
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Trigger classification task
        task = apply_classification_rules.delay(str(document.id), triggered_by='manual')

        return Response({
            'message': 'Classification started',
            'task_id': task.id,
            'document_id': str(document.id)
        }, status=status.HTTP_202_ACCEPTED)


class BulkClassifyDocumentsView(APIView):
    """
    Apply classification rules to multiple documents.

    POST /api/v1/classification/bulk-classify/

    Body:
        {
            "document_ids": ["uuid1", "uuid2", ...]
        }

    Applies classification rules to all specified documents.
    """
    permission_classes = [IsAdminUser]

    def post(self, request):
        document_ids = request.data.get('document_ids', [])

        if not document_ids:
            return Response(
                {'error': 'document_ids is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not isinstance(document_ids, list):
            return Response(
                {'error': 'document_ids must be a list'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate documents exist
        existing_count = Document.objects.filter(
            id__in=document_ids,
            is_deleted=False
        ).count()

        if existing_count == 0:
            return Response(
                {'error': 'No valid documents found'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Trigger bulk classification
        task = batch_classify_documents.delay(document_ids, triggered_by='bulk')

        return Response({
            'message': 'Bulk classification started',
            'task_id': task.id,
            'total_documents': len(document_ids),
            'valid_documents': existing_count
        }, status=status.HTTP_202_ACCEPTED)


class ReclassifyForRuleView(APIView):
    """
    Reclassify all matching documents for a specific rule.

    POST /api/v1/classification/rules/{id}/reclassify/

    Useful after updating a rule to reapply it to all matching documents.
    """
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        rule = get_object_or_404(ClassificationRule, pk=pk)

        from apps.workflows.tasks import reclassify_documents_for_rule
        task = reclassify_documents_for_rule.delay(rule.id)

        return Response({
            'message': f'Reclassification started for rule: {rule.name}',
            'task_id': task.id,
            'rule_id': rule.id
        }, status=status.HTTP_202_ACCEPTED)


class ClassificationLogListView(generics.ListAPIView):
    """
    List classification logs.

    GET /api/v1/classification/logs/

    Query Parameters:
        document_id (uuid): Filter by document
        rule_id (int): Filter by rule
        success (bool): Filter by success status
        triggered_by (str): Filter by trigger type
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ClassificationLogSerializer

    def get_queryset(self):
        queryset = ClassificationLog.objects.all()

        # Admin sees all logs, users see only their documents' logs
        if not self.request.user.is_staff:
            queryset = queryset.filter(document__owner=self.request.user)

        # Apply filters
        document_id = self.request.query_params.get('document_id')
        if document_id:
            queryset = queryset.filter(document_id=document_id)

        rule_id = self.request.query_params.get('rule_id')
        if rule_id:
            queryset = queryset.filter(rule_id=rule_id)

        success = self.request.query_params.get('success')
        if success is not None:
            queryset = queryset.filter(success=success.lower() == 'true')

        triggered_by = self.request.query_params.get('triggered_by')
        if triggered_by:
            queryset = queryset.filter(triggered_by=triggered_by)

        return queryset


class ClassificationStatsView(APIView):
    """
    Get classification statistics.

    GET /api/v1/classification/stats/

    Returns overview of classification system usage.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        from django.db.models import Count, Sum

        # Rule statistics
        total_rules = ClassificationRule.objects.count()
        active_rules = ClassificationRule.objects.filter(is_active=True).count()
        inactive_rules = total_rules - active_rules

        # Get top rules by application count
        top_rules = ClassificationRule.objects.filter(
            is_active=True
        ).order_by('-applied_count')[:10]

        # Log statistics
        total_applications = ClassificationLog.objects.count()
        successful_applications = ClassificationLog.objects.filter(success=True).count()
        failed_applications = total_applications - successful_applications

        # Applications by trigger type
        trigger_stats = ClassificationLog.objects.values('triggered_by').annotate(
            count=Count('id')
        )

        return Response({
            'rules': {
                'total': total_rules,
                'active': active_rules,
                'inactive': inactive_rules,
                'top_rules': ClassificationRuleListSerializer(top_rules, many=True).data
            },
            'applications': {
                'total': total_applications,
                'successful': successful_applications,
                'failed': failed_applications,
                'success_rate': (successful_applications / total_applications * 100)
                               if total_applications > 0 else 0
            },
            'by_trigger': {item['triggered_by']: item['count'] for item in trigger_stats}
        })


# =============================================================================
# ML Classification Views (Phase 1)
# =============================================================================

class MLModelListView(generics.ListAPIView):
    """
    List all ML classification models.

    GET /api/v1/classification/ml/models/

    Query Parameters:
        model_type (str): Filter by model type (document_type, confidentiality, department)
        status (str): Filter by status (training, ready, active, deprecated, failed)
    """
    permission_classes = [IsAuthenticated]
    serializer_class = MLClassificationModelListSerializer

    def get_queryset(self):
        queryset = MLClassificationModel.objects.all()

        model_type = self.request.query_params.get('model_type')
        if model_type:
            queryset = queryset.filter(model_type=model_type)

        model_status = self.request.query_params.get('status')
        if model_status:
            queryset = queryset.filter(status=model_status)

        return queryset


class MLModelDetailView(generics.RetrieveAPIView):
    """
    Get ML model details.

    GET /api/v1/classification/ml/models/{id}/
    """
    permission_classes = [IsAuthenticated]
    queryset = MLClassificationModel.objects.all()
    serializer_class = MLClassificationModelSerializer


class MLModelActivateView(APIView):
    """
    Activate an ML model for production use.

    POST /api/v1/classification/ml/models/{id}/activate/

    Makes this model the active model for its type,
    deactivating any previously active model.
    """
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        model = get_object_or_404(MLClassificationModel, pk=pk)

        if model.status == MLClassificationModel.ModelStatus.TRAINING:
            return Response(
                {'error': 'Cannot activate a model that is still training'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if model.status == MLClassificationModel.ModelStatus.FAILED:
            return Response(
                {'error': 'Cannot activate a failed model'},
                status=status.HTTP_400_BAD_REQUEST
            )

        model.activate()

        return Response({
            'message': f'Model {model.name} v{model.version} is now active',
            'model': MLClassificationModelSerializer(model).data
        })


class TrainModelView(APIView):
    """
    Train a new ML classification model.

    POST /api/v1/classification/ml/train/

    Body:
        {
            "classification_target": "document_type",
            "algorithm": "multinomial_nb",
            "max_features": 5000,
            "ngram_range": [1, 2]
        }

    Returns task ID for tracking training progress.
    """
    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = TrainModelRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from apps.classification.tasks import train_model_task

        # Trigger training task
        task = train_model_task.delay(
            classification_target=serializer.validated_data['classification_target'],
            algorithm=serializer.validated_data['algorithm'],
            user_id=request.user.id,
            max_features=serializer.validated_data.get('max_features', 5000),
            ngram_range=serializer.validated_data.get('ngram_range', [1, 2])
        )

        return Response({
            'message': 'Model training started',
            'task_id': task.id,
            'classification_target': serializer.validated_data['classification_target'],
            'algorithm': serializer.validated_data['algorithm']
        }, status=status.HTTP_202_ACCEPTED)


class ReviewQueueView(generics.ListAPIView):
    """
    Get predictions pending review.

    GET /api/v1/classification/ml/review-queue/

    Query Parameters:
        confidence_level (str): Filter by confidence (high, medium, low)
        model_type (str): Filter by model type
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ClassificationPredictionSerializer

    def get_queryset(self):
        queryset = ClassificationPrediction.objects.filter(
            review_status=ClassificationPrediction.ReviewStatus.PENDING
        ).select_related('document', 'model')

        # Non-admin users only see their own documents
        if not self.request.user.is_staff:
            queryset = queryset.filter(document__owner=self.request.user)

        confidence_level = self.request.query_params.get('confidence_level')
        if confidence_level:
            queryset = queryset.filter(confidence_level=confidence_level)

        model_type = self.request.query_params.get('model_type')
        if model_type:
            queryset = queryset.filter(model__model_type=model_type)

        return queryset.order_by('-created_at')


class ReviewPredictionView(APIView):
    """
    Review a classification prediction.

    POST /api/v1/classification/ml/predictions/{id}/review/

    Body:
        {
            "action": "confirm" | "correct" | "reject",
            "correction": "INVOICE"  // required if action is "correct"
        }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        prediction = get_object_or_404(
            ClassificationPrediction.objects.select_related('document'),
            pk=pk
        )

        # Check permissions
        if not request.user.is_staff:
            if prediction.document.owner != request.user:
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

        serializer = ClassificationPredictionReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action = serializer.validated_data['action']

        if action == 'confirm':
            prediction.confirm(request.user)
            message = 'Prediction confirmed'
        elif action == 'correct':
            correction = serializer.validated_data['correction']
            prediction.correct(request.user, correction)
            message = f'Prediction corrected to: {correction}'
        elif action == 'reject':
            prediction.reject(request.user)
            message = 'Prediction rejected'

        return Response({
            'message': message,
            'prediction': ClassificationPredictionSerializer(prediction).data
        })


class ClassifyDocumentMLView(APIView):
    """
    Classify a document using ML.

    POST /api/v1/documents/{id}/classify-ml/

    Body (optional):
        {
            "classification_target": "document_type",
            "auto_apply": true
        }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        document = get_object_or_404(Document, pk=pk, is_deleted=False)

        # Check permissions
        if not request.user.is_staff:
            if document.owner != request.user:
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

        classification_target = request.data.get('classification_target', 'document_type')
        auto_apply = request.data.get('auto_apply', True)

        from apps.classification.tasks import classify_document_task

        # Trigger classification task
        task = classify_document_task.delay(
            document_id=str(document.id),
            classification_target=classification_target,
            auto_apply=auto_apply
        )

        return Response({
            'message': 'ML classification started',
            'task_id': task.id,
            'document_id': str(document.id),
            'classification_target': classification_target
        }, status=status.HTTP_202_ACCEPTED)


class BatchClassifyMLView(APIView):
    """
    Classify multiple documents using ML.

    POST /api/v1/classification/ml/batch-classify/

    Body:
        {
            "document_ids": ["uuid1", "uuid2", ...],
            "classification_target": "document_type",
            "auto_apply": true
        }
    """
    permission_classes = [IsAdminUser]

    def post(self, request):
        document_ids = request.data.get('document_ids', [])
        classification_target = request.data.get('classification_target', 'document_type')
        auto_apply = request.data.get('auto_apply', True)

        if not document_ids:
            return Response(
                {'error': 'document_ids is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate documents exist
        existing_count = Document.objects.filter(
            id__in=document_ids,
            is_deleted=False
        ).count()

        if existing_count == 0:
            return Response(
                {'error': 'No valid documents found'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from apps.classification.tasks import batch_classify_documents

        task = batch_classify_documents.delay(
            document_ids=document_ids,
            classification_target=classification_target,
            auto_apply=auto_apply
        )

        return Response({
            'message': 'Batch ML classification started',
            'task_id': task.id,
            'total_documents': len(document_ids),
            'valid_documents': existing_count,
            'classification_target': classification_target
        }, status=status.HTTP_202_ACCEPTED)


class MLClassificationStatsView(APIView):
    """
    Get ML classification statistics.

    GET /api/v1/classification/ml/stats/

    Returns comprehensive statistics about:
    - Models (active, total)
    - Predictions (by status, by confidence)
    - Accuracy metrics
    - Pending review counts
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            from apps.classification.ml_engine import get_ml_engine
            engine = get_ml_engine()
            stats = engine.get_classification_stats()

            return Response(stats)

        except RuntimeError as e:
            # ML not available (scikit-learn not installed)
            return Response({
                'error': str(e),
                'ml_available': False
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)


class ClassificationSettingsView(APIView):
    """
    Get or update classification settings.

    GET /api/v1/classification/settings/
    PUT /api/v1/classification/settings/
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        settings = ClassificationSettings.get_settings()
        serializer = ClassificationSettingsSerializer(settings)
        return Response(serializer.data)

    def put(self, request):
        settings = ClassificationSettings.get_settings()
        serializer = ClassificationSettingsSerializer(
            settings,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({
            'message': 'Settings updated',
            'settings': serializer.data
        })


class TrainingFeedbackListView(generics.ListAPIView):
    """
    List training feedback entries.

    GET /api/v1/classification/ml/feedback/

    Query Parameters:
        used_in_training (bool): Filter by training status
        classification_target (str): Filter by target type
    """
    permission_classes = [IsAdminUser]
    serializer_class = TrainingFeedbackSerializer

    def get_queryset(self):
        queryset = TrainingFeedback.objects.select_related(
            'document', 'provided_by', 'trained_model'
        )

        used = self.request.query_params.get('used_in_training')
        if used is not None:
            queryset = queryset.filter(used_in_training=used.lower() == 'true')

        target = self.request.query_params.get('classification_target')
        if target:
            queryset = queryset.filter(classification_target=target)

        return queryset.order_by('-created_at')


class PredictionHistoryView(generics.ListAPIView):
    """
    Get prediction history for a document.

    GET /api/v1/documents/{id}/predictions/

    Returns all ML predictions made for this document.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ClassificationPredictionSerializer

    def get_queryset(self):
        document_id = self.kwargs['pk']
        document = get_object_or_404(Document, pk=document_id, is_deleted=False)

        # Check permissions
        if not self.request.user.is_staff:
            if document.owner != self.request.user:
                return ClassificationPrediction.objects.none()

        return ClassificationPrediction.objects.filter(
            document=document
        ).select_related('model').order_by('-created_at')
