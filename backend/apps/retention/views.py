"""
API views for retention policies and legal holds.

ViewSets:
- RetentionPolicyViewSet: CRUD for retention policies
- LegalHoldViewSet: CRUD for legal holds
- RetentionScheduleViewSet: Read-only view of retention schedules
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.utils import timezone

from apps.retention.models import (
    RetentionPolicy,
    LegalHold,
    LegalHoldDocument,
    RetentionSchedule
)
from apps.retention.serializers import (
    RetentionPolicySerializer,
    LegalHoldSerializer,
    LegalHoldDocumentSerializer,
    RetentionScheduleSerializer,
    AddDocumentsToLegalHoldSerializer,
    RemoveDocumentsFromLegalHoldSerializer,
    ReleaseLegalHoldSerializer,
)
from apps.documents.models import Document
from apps.audit.models import AuditLog


class RetentionPolicyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for retention policies.

    list: Get all retention policies
    create: Create new retention policy (admin only)
    retrieve: Get single retention policy
    update: Update retention policy (admin only)
    partial_update: Partially update retention policy (admin only)
    destroy: Delete retention policy (admin only)
    activate: Activate a policy
    deactivate: Deactivate a policy
    test_match: Test which documents match a policy
    """

    queryset = RetentionPolicy.objects.all()
    serializer_class = RetentionPolicySerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        """Set created_by to current user"""
        policy = serializer.save(created_by=self.request.user)

        # Log audit event
        AuditLog.log_action(
            user=self.request.user,
            action='CREATE',
            resource_type='RetentionPolicy',
            resource_id=str(policy.id),
            resource_name=policy.name,
            details={
                'policy_type': policy.policy_type,
                'retention_days': policy.retention_days,
                'criteria': policy.criteria
            }
        )

    def perform_update(self, serializer):
        """Log policy updates"""
        old_policy = self.get_object()
        policy = serializer.save()

        # Log audit event
        AuditLog.log_action(
            user=self.request.user,
            action='EDIT',
            resource_type='RetentionPolicy',
            resource_id=str(policy.id),
            resource_name=policy.name,
            details={
                'updated_fields': list(serializer.validated_data.keys())
            }
        )

    def perform_destroy(self, instance):
        """Soft delete by deactivating instead of hard delete"""
        instance.is_active = False
        instance.save()

        # Log audit event
        AuditLog.log_action(
            user=self.request.user,
            action='DELETE',
            resource_type='RetentionPolicy',
            resource_id=str(instance.id),
            resource_name=instance.name,
            details={'deactivated': True}
        )

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a retention policy"""
        policy = self.get_object()
        policy.is_active = True
        policy.save()

        AuditLog.log_action(
            user=request.user,
            action='EDIT',
            resource_type='RetentionPolicy',
            resource_id=str(policy.id),
            resource_name=policy.name,
            details={'activated': True}
        )

        return Response({'status': 'activated'})

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate a retention policy"""
        policy = self.get_object()
        policy.is_active = False
        policy.save()

        AuditLog.log_action(
            user=request.user,
            action='EDIT',
            resource_type='RetentionPolicy',
            resource_id=str(policy.id),
            resource_name=policy.name,
            details={'deactivated': True}
        )

        return Response({'status': 'deactivated'})

    @action(detail=True, methods=['get'])
    def test_match(self, request, pk=None):
        """Test which documents would match this policy"""
        policy = self.get_object()

        # Get sample of documents (limit to 100 for performance)
        documents = Document.objects.filter(is_deleted=False)[:100]

        matching_ids = []
        for doc in documents:
            if policy.matches_document(doc):
                matching_ids.append(str(doc.id))

        return Response({
            'policy': policy.name,
            'tested_count': len(documents),
            'matching_count': len(matching_ids),
            'matching_document_ids': matching_ids[:20],  # Return first 20
        })


class LegalHoldViewSet(viewsets.ModelViewSet):
    """
    ViewSet for legal holds.

    list: Get all legal holds
    create: Create new legal hold (admin only)
    retrieve: Get single legal hold
    update: Update legal hold
    destroy: Release legal hold
    add_documents: Add documents to legal hold
    remove_documents: Remove documents from legal hold
    release: Release legal hold
    """

    queryset = LegalHold.objects.all()
    serializer_class = LegalHoldSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        """Set placed_by to current user"""
        hold = serializer.save(placed_by=self.request.user)

        # Log audit event
        AuditLog.log_action(
            user=self.request.user,
            action='LEGAL_HOLD',
            resource_type='LegalHold',
            resource_id=str(hold.id),
            resource_name=hold.case_number,
            details={
                'case_number': hold.case_number,
                'case_name': hold.case_name
            }
        )

    @action(detail=True, methods=['post'])
    def add_documents(self, request, pk=None):
        """Add documents to legal hold"""
        hold = self.get_object()

        if not hold.is_active:
            return Response(
                {'error': 'Cannot add documents to inactive legal hold'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = AddDocumentsToLegalHoldSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        document_ids = serializer.validated_data['document_ids']
        reason = serializer.validated_data.get('reason', '')

        added_count = 0
        already_held = []

        with transaction.atomic():
            for doc_id in document_ids:
                # Check if already under hold
                if LegalHoldDocument.objects.filter(
                    legal_hold=hold,
                    document_id=doc_id
                ).exists():
                    already_held.append(str(doc_id))
                    continue

                # Add to hold
                LegalHoldDocument.objects.create(
                    legal_hold=hold,
                    document_id=doc_id,
                    added_by=request.user,
                    reason=reason
                )
                added_count += 1

                # Cancel any pending retention schedules
                RetentionSchedule.objects.filter(
                    document_id=doc_id,
                    status__in=[RetentionSchedule.PENDING, RetentionSchedule.NOTIFIED]
                ).update(status=RetentionSchedule.CANCELLED)

        # Log audit event
        AuditLog.log_action(
            user=request.user,
            action='LEGAL_HOLD',
            resource_type='LegalHold',
            resource_id=str(hold.id),
            resource_name=hold.case_number,
            details={
                'documents_added': added_count,
                'already_held': len(already_held)
            }
        )

        return Response({
            'added': added_count,
            'already_held': already_held,
            'total_documents': hold.documents.count()
        })

    @action(detail=True, methods=['post'])
    def remove_documents(self, request, pk=None):
        """Remove documents from legal hold"""
        hold = self.get_object()

        serializer = RemoveDocumentsFromLegalHoldSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        document_ids = serializer.validated_data['document_ids']

        removed_count = LegalHoldDocument.objects.filter(
            legal_hold=hold,
            document_id__in=document_ids
        ).delete()[0]

        # Log audit event
        AuditLog.log_action(
            user=request.user,
            action='LEGAL_RELEASE',
            resource_type='LegalHold',
            resource_id=str(hold.id),
            resource_name=hold.case_number,
            details={
                'documents_removed': removed_count
            }
        )

        return Response({
            'removed': removed_count,
            'remaining_documents': hold.documents.count()
        })

    @action(detail=True, methods=['post'])
    def release(self, request, pk=None):
        """Release legal hold"""
        hold = self.get_object()

        if not hold.is_active:
            return Response(
                {'error': 'Legal hold already released'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ReleaseLegalHoldSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Add notes if provided
        if serializer.validated_data.get('notes'):
            hold.notes = (hold.notes or '') + '\n\n' + serializer.validated_data['notes']

        # Release the hold
        hold.release(request.user)

        return Response({
            'status': 'released',
            'released_at': hold.released_at,
            'released_by': request.user.username
        })


class RetentionScheduleViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only ViewSet for retention schedules.

    list: Get all retention schedules
    retrieve: Get single retention schedule
    upcoming_deletions: Get documents scheduled for deletion soon
    """

    queryset = RetentionSchedule.objects.all()
    serializer_class = RetentionScheduleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter schedules based on query params"""
        queryset = super().get_queryset()

        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        # Filter by deletion date range
        from_date = self.request.query_params.get('deletion_from')
        to_date = self.request.query_params.get('deletion_to')

        if from_date:
            queryset = queryset.filter(deletion_date__gte=from_date)
        if to_date:
            queryset = queryset.filter(deletion_date__lte=to_date)

        return queryset.select_related('document', 'policy')

    @action(detail=False, methods=['get'])
    def upcoming_deletions(self, request):
        """Get documents scheduled for deletion in the next N days"""
        days = int(request.query_params.get('days', 30))

        from datetime import timedelta
        cutoff_date = timezone.now() + timedelta(days=days)

        schedules = RetentionSchedule.objects.filter(
            status__in=[RetentionSchedule.PENDING, RetentionSchedule.NOTIFIED],
            deletion_date__lte=cutoff_date,
            deletion_date__gte=timezone.now()
        ).select_related('document', 'policy').order_by('deletion_date')

        serializer = self.get_serializer(schedules, many=True)

        return Response({
            'days': days,
            'count': schedules.count(),
            'schedules': serializer.data
        })
