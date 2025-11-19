"""
API views for classification system.
"""
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.shortcuts import get_object_or_404

from apps.classification.models import ClassificationRule, ClassificationLog
from apps.classification.serializers import (
    ClassificationRuleSerializer,
    ClassificationRuleListSerializer,
    ClassificationLogSerializer
)
from apps.classification.engine import ClassificationEngine
from apps.documents.models import Document
from apps.documents.serializers import DocumentListSerializer
from apps.workflows.tasks import apply_classification_rules, batch_classify_documents

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
