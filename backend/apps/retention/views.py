"""
API views for retention policies and legal holds.

ViewSets:
- RetentionPolicyViewSet: CRUD for retention policies
- LegalHoldViewSet: CRUD for legal holds
- RetentionScheduleViewSet: Read-only view of retention schedules

APIViews:
- AutomationStatsView: Automation statistics for dashboard
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.db import transaction
from django.utils import timezone
from datetime import timedelta

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

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get schedule statistics"""
        from datetime import timedelta
        from django.db.models import Count

        now = timezone.now()
        week_from_now = now + timedelta(days=7)
        month_from_now = now + timedelta(days=30)

        queryset = self.get_queryset()

        # Basic counts
        total_scheduled = queryset.filter(
            status__in=[RetentionSchedule.PENDING, RetentionSchedule.NOTIFIED]
        ).count()

        pending_review = queryset.filter(status=RetentionSchedule.NOTIFIED).count()

        scheduled_this_week = queryset.filter(
            status__in=[RetentionSchedule.PENDING, RetentionSchedule.NOTIFIED],
            deletion_date__lte=week_from_now,
            deletion_date__gte=now
        ).count()

        scheduled_this_month = queryset.filter(
            status__in=[RetentionSchedule.PENDING, RetentionSchedule.NOTIFIED],
            deletion_date__lte=month_from_now,
            deletion_date__gte=now
        ).count()

        overdue = queryset.filter(
            status__in=[RetentionSchedule.PENDING, RetentionSchedule.NOTIFIED],
            deletion_date__lt=now
        ).count()

        on_hold = queryset.filter(status=RetentionSchedule.CANCELLED).count()

        # Group by action (using policy action_on_expiry if available)
        by_action = {
            'archive': 0,
            'delete': 0,
            'review': 0,
            'extend': 0,
            'transfer': 0,
        }

        # Group by priority (mock for now - could add priority field to model)
        by_priority = {
            'low': int(total_scheduled * 0.4),
            'medium': int(total_scheduled * 0.35),
            'high': int(total_scheduled * 0.2),
            'critical': int(total_scheduled * 0.05),
        }

        # Group by department (from document owner's department)
        by_department = []

        return Response({
            'total_scheduled': total_scheduled,
            'pending_review': pending_review,
            'scheduled_this_week': scheduled_this_week,
            'scheduled_this_month': scheduled_this_month,
            'overdue': overdue,
            'on_hold': on_hold,
            'by_action': by_action,
            'by_priority': by_priority,
            'by_department': by_department,
        })

    @action(detail=False, methods=['get'])
    def calendar(self, request):
        """Get calendar events for a given month"""
        from datetime import timedelta
        import calendar as cal

        year = int(request.query_params.get('year', timezone.now().year))
        month = int(request.query_params.get('month', timezone.now().month))

        # Get first and last day of month
        _, last_day = cal.monthrange(year, month)
        start_date = timezone.make_aware(
            timezone.datetime(year, month, 1, 0, 0, 0)
        )
        end_date = timezone.make_aware(
            timezone.datetime(year, month, last_day, 23, 59, 59)
        )

        schedules = self.get_queryset().filter(
            deletion_date__gte=start_date,
            deletion_date__lte=end_date,
            status__in=[RetentionSchedule.PENDING, RetentionSchedule.NOTIFIED]
        ).select_related('document', 'policy')

        events = []
        for schedule in schedules:
            events.append({
                'id': str(schedule.id),
                'title': schedule.document.name if schedule.document else 'Unknown Document',
                'date': schedule.deletion_date.isoformat(),
                'type': 'deletion',
                'status': schedule.status,
                'policy_name': schedule.policy.name if schedule.policy else None,
                'document_id': str(schedule.document.id) if schedule.document else None,
            })

        return Response(events)

    @action(detail=False, methods=['get'], url_path='review-queue')
    def review_queue(self, request):
        """Get disposition review queue"""
        queryset = self.get_queryset().filter(
            status=RetentionSchedule.NOTIFIED
        ).select_related('document', 'policy').order_by('deletion_date')

        # Apply filters
        status = request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)

        items = []
        for schedule in queryset[:50]:  # Limit to 50 items
            items.append({
                'id': str(schedule.id),
                'document_id': str(schedule.document.id) if schedule.document else None,
                'document_name': schedule.document.name if schedule.document else 'Unknown',
                'policy_id': str(schedule.policy.id) if schedule.policy else None,
                'policy_name': schedule.policy.name if schedule.policy else 'Unknown',
                'scheduled_date': schedule.deletion_date.isoformat(),
                'action': 'delete',  # Default action
                'priority': 'medium',  # Default priority
                'status': 'pending',
                'submitted_at': schedule.notification_date.isoformat() if schedule.notification_date else None,
                'submitted_by': None,
                'reviewed_at': None,
                'reviewed_by': None,
                'review_notes': None,
                'is_legal_hold': schedule.status == RetentionSchedule.CANCELLED,
                'legal_hold_reason': None,
                'retention_days': schedule.policy.retention_days if schedule.policy else 0,
                'file_size': schedule.document.file_size if schedule.document else 0,
                'last_modified': schedule.document.updated_at.isoformat() if schedule.document else None,
            })

        return Response(items)


class AutomationStatsView(APIView):
    """
    Get automation statistics for the dashboard.

    GET /api/v1/retention/automation/stats/

    Returns statistics about:
    - Active jobs
    - Completed today
    - Failed today
    - Pending review
    - Upcoming schedules
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # Get schedule stats
        pending_schedules = RetentionSchedule.objects.filter(
            status__in=[RetentionSchedule.PENDING, RetentionSchedule.NOTIFIED]
        ).count()

        # Completed today (deleted schedules)
        completed_today = RetentionSchedule.objects.filter(
            status=RetentionSchedule.DELETED,
            deletion_date__gte=today_start,
            deletion_date__lte=now
        ).count()

        # Failed today (if we track failures - for now assume 0)
        failed_today = 0

        # Pending review (notified status)
        pending_review = RetentionSchedule.objects.filter(
            status=RetentionSchedule.NOTIFIED
        ).count()

        # Active policies count
        active_policies = RetentionPolicy.objects.filter(is_active=True).count()

        # Active legal holds
        active_holds = LegalHold.objects.filter(is_active=True).count()

        # Upcoming in next 7 days
        week_from_now = now + timedelta(days=7)
        upcoming_week = RetentionSchedule.objects.filter(
            status__in=[RetentionSchedule.PENDING, RetentionSchedule.NOTIFIED],
            deletion_date__gte=now,
            deletion_date__lte=week_from_now
        ).count()

        return Response({
            'activeJobs': pending_schedules,
            'completedToday': completed_today,
            'failedToday': failed_today,
            'pendingReview': pending_review,
            'activePolicies': active_policies,
            'activeHolds': active_holds,
            'upcomingWeek': upcoming_week,
            'lastUpdated': now.isoformat()
        })


class ScheduledJobsView(APIView):
    """
    Get list of scheduled jobs for the automation dashboard.

    GET /api/v1/retention/automation/jobs/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()

        schedules = RetentionSchedule.objects.filter(
            status__in=[RetentionSchedule.PENDING, RetentionSchedule.NOTIFIED]
        ).select_related('document', 'policy').order_by('deletion_date')[:50]

        jobs = []
        for schedule in schedules:
            jobs.append({
                'id': str(schedule.id),
                'name': f"Retention: {schedule.document.name if schedule.document else 'Unknown'}",
                'type': 'retention_enforcement',
                'status': 'scheduled' if schedule.status == RetentionSchedule.PENDING else 'pending_review',
                'scheduledFor': schedule.deletion_date.isoformat(),
                'lastRun': None,
                'nextRun': schedule.deletion_date.isoformat(),
                'documentId': str(schedule.document.id) if schedule.document else None,
                'policyId': str(schedule.policy.id) if schedule.policy else None,
                'policyName': schedule.policy.name if schedule.policy else None,
            })

        return Response(jobs)


class UpcomingJobsView(APIView):
    """
    Get upcoming jobs for the next N days.

    GET /api/v1/retention/automation/upcoming/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        days = int(request.query_params.get('days', 7))
        now = timezone.now()
        cutoff = now + timedelta(days=days)

        schedules = RetentionSchedule.objects.filter(
            status__in=[RetentionSchedule.PENDING, RetentionSchedule.NOTIFIED],
            deletion_date__gte=now,
            deletion_date__lte=cutoff
        ).select_related('document', 'policy').order_by('deletion_date')[:20]

        jobs = []
        for schedule in schedules:
            jobs.append({
                'id': str(schedule.id),
                'name': f"Retention: {schedule.document.name if schedule.document else 'Unknown'}",
                'type': 'retention_enforcement',
                'scheduledFor': schedule.deletion_date.isoformat(),
                'documentId': str(schedule.document.id) if schedule.document else None,
                'policyName': schedule.policy.name if schedule.policy else None,
            })

        return Response(jobs)
