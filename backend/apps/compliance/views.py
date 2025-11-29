"""
Compliance Management Views

API views for the Compliance Center.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q, Avg
from django.utils import timezone
from datetime import timedelta

from .models import (
    Regulation,
    Control,
    ControlEvidence,
    Finding,
    Assessment,
    DocumentComplianceCheck,
    ComplianceScore,
    ComplianceAlert,
)
from .serializers import (
    RegulationListSerializer,
    RegulationDetailSerializer,
    RegulationCreateUpdateSerializer,
    ControlListSerializer,
    ControlDetailSerializer,
    ControlCreateUpdateSerializer,
    ControlEvidenceSerializer,
    FindingListSerializer,
    FindingDetailSerializer,
    FindingCreateUpdateSerializer,
    AssessmentListSerializer,
    AssessmentDetailSerializer,
    AssessmentCreateUpdateSerializer,
    DocumentComplianceCheckSerializer,
    ComplianceScoreSerializer,
    ComplianceAlertSerializer,
    ComplianceDashboardSerializer,
)


class RegulationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing regulatory frameworks.

    Provides CRUD operations for regulations and their compliance status.
    """
    queryset = Regulation.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return RegulationListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return RegulationCreateUpdateSerializer
        return RegulationDetailSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        # Filter by jurisdiction
        jurisdiction = self.request.query_params.get('jurisdiction')
        if jurisdiction:
            queryset = queryset.filter(jurisdiction=jurisdiction)

        return queryset.prefetch_related('controls', 'findings')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['get'])
    def controls(self, request, pk=None):
        """Get all controls for a regulation"""
        regulation = self.get_object()
        controls = regulation.controls.all()
        serializer = ControlListSerializer(controls, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def findings(self, request, pk=None):
        """Get all findings for a regulation"""
        regulation = self.get_object()
        findings = regulation.findings.all()

        # Filter by status
        status_param = request.query_params.get('status')
        if status_param:
            findings = findings.filter(status=status_param)

        serializer = FindingListSerializer(findings, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def assessments(self, request, pk=None):
        """Get all assessments for a regulation"""
        regulation = self.get_object()
        assessments = regulation.assessments.all()
        serializer = AssessmentListSerializer(assessments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def recalculate_score(self, request, pk=None):
        """Recalculate compliance score for a regulation"""
        regulation = self.get_object()
        regulation.update_compliance_score()
        return Response({
            'compliance_score': regulation.compliance_score,
            'message': 'Compliance score recalculated successfully'
        })


class ControlViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing compliance controls.

    Provides CRUD operations for controls and evidence management.
    """
    queryset = Control.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return ControlListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ControlCreateUpdateSerializer
        return ControlDetailSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by regulation
        regulation_id = self.request.query_params.get('regulation')
        if regulation_id:
            queryset = queryset.filter(regulation_id=regulation_id)

        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        # Filter by control type
        control_type = self.request.query_params.get('control_type')
        if control_type:
            queryset = queryset.filter(control_type=control_type)

        # Filter by department
        department = self.request.query_params.get('department')
        if department:
            queryset = queryset.filter(department__icontains=department)

        return queryset.select_related('regulation', 'owner')

    @action(detail=True, methods=['get'])
    def evidence(self, request, pk=None):
        """Get all evidence for a control"""
        control = self.get_object()
        evidence = control.evidence_items.all()
        serializer = ControlEvidenceSerializer(evidence, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_evidence(self, request, pk=None):
        """Add evidence to a control"""
        control = self.get_object()
        serializer = ControlEvidenceSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(control=control, uploaded_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def record_test(self, request, pk=None):
        """Record a control test result"""
        control = self.get_object()
        test_status = request.data.get('status')
        notes = request.data.get('notes', '')

        if test_status not in [Control.COMPLIANT, Control.NON_COMPLIANT, Control.PARTIALLY_COMPLIANT]:
            return Response(
                {'error': 'Invalid status. Must be compliant, non_compliant, or partially_compliant'},
                status=status.HTTP_400_BAD_REQUEST
            )

        control.status = test_status
        control.last_tested_date = timezone.now()
        control.implementation_notes = notes
        control.save()

        return Response({
            'message': 'Control test recorded successfully',
            'status': control.status,
            'last_tested_date': control.last_tested_date
        })


class ControlEvidenceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing control evidence.
    """
    queryset = ControlEvidence.objects.all()
    serializer_class = ControlEvidenceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by control
        control_id = self.request.query_params.get('control')
        if control_id:
            queryset = queryset.filter(control_id=control_id)

        return queryset.select_related('control', 'uploaded_by')

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class FindingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing compliance findings.
    """
    queryset = Finding.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return FindingListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return FindingCreateUpdateSerializer
        return FindingDetailSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by regulation
        regulation_id = self.request.query_params.get('regulation')
        if regulation_id:
            queryset = queryset.filter(regulation_id=regulation_id)

        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        # Filter by severity
        severity = self.request.query_params.get('severity')
        if severity:
            queryset = queryset.filter(severity=severity)

        # Filter overdue
        overdue = self.request.query_params.get('overdue')
        if overdue and overdue.lower() == 'true':
            queryset = queryset.filter(
                remediation_due_date__lt=timezone.now().date(),
                status__in=[Finding.OPEN, Finding.IN_PROGRESS]
            )

        return queryset.select_related('regulation', 'control', 'owner', 'identified_by')

    def perform_create(self, serializer):
        serializer.save(identified_by=self.request.user)

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update finding status"""
        finding = self.get_object()
        new_status = request.data.get('status')

        if new_status not in dict(Finding.STATUS_CHOICES):
            return Response(
                {'error': 'Invalid status'},
                status=status.HTTP_400_BAD_REQUEST
            )

        finding.status = new_status
        if new_status == Finding.REMEDIATED:
            finding.remediation_completed_date = timezone.now().date()
        finding.save()

        return Response({
            'message': 'Finding status updated successfully',
            'status': finding.status
        })


class AssessmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing compliance assessments.
    """
    queryset = Assessment.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return AssessmentListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return AssessmentCreateUpdateSerializer
        return AssessmentDetailSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by regulation
        regulation_id = self.request.query_params.get('regulation')
        if regulation_id:
            queryset = queryset.filter(regulation_id=regulation_id)

        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        # Filter by type
        assessment_type = self.request.query_params.get('type')
        if assessment_type:
            queryset = queryset.filter(assessment_type=assessment_type)

        return queryset.select_related('regulation', 'lead_assessor')

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Start an assessment"""
        assessment = self.get_object()
        if assessment.status != Assessment.PLANNED:
            return Response(
                {'error': 'Assessment must be in planned status to start'},
                status=status.HTTP_400_BAD_REQUEST
            )

        assessment.status = Assessment.IN_PROGRESS
        assessment.start_date = timezone.now().date()
        assessment.save()

        return Response({
            'message': 'Assessment started successfully',
            'status': assessment.status
        })

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Complete an assessment"""
        assessment = self.get_object()
        if assessment.status != Assessment.IN_PROGRESS:
            return Response(
                {'error': 'Assessment must be in progress to complete'},
                status=status.HTTP_400_BAD_REQUEST
            )

        assessment.status = Assessment.COMPLETED
        assessment.end_date = timezone.now().date()
        assessment.overall_score = request.data.get('score')
        assessment.summary = request.data.get('summary', '')
        assessment.save()

        # Update regulation's last assessment date
        assessment.regulation.last_assessment_date = timezone.now()
        assessment.regulation.save()

        return Response({
            'message': 'Assessment completed successfully',
            'status': assessment.status
        })


class DocumentComplianceCheckViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing document compliance checks.
    """
    queryset = DocumentComplianceCheck.objects.all()
    serializer_class = DocumentComplianceCheckSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by check type
        check_type = self.request.query_params.get('check_type')
        if check_type:
            queryset = queryset.filter(check_type=check_type)

        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        # Filter by document ID
        document_id = self.request.query_params.get('document_id')
        if document_id:
            queryset = queryset.filter(document_id=document_id)

        return queryset

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get document compliance statistics"""
        queryset = self.get_queryset()

        total = queryset.count()
        compliant = queryset.filter(status=DocumentComplianceCheck.COMPLIANT).count()
        non_compliant = queryset.filter(status=DocumentComplianceCheck.NON_COMPLIANT).count()

        # Issues by type
        issues_by_type = {}
        for check_type in DocumentComplianceCheck.CHECK_TYPE_CHOICES:
            count = queryset.filter(
                check_type=check_type[0],
                status=DocumentComplianceCheck.NON_COMPLIANT
            ).count()
            issues_by_type[check_type[0]] = count

        return Response({
            'total_documents': total,
            'compliant_documents': compliant,
            'non_compliant_documents': non_compliant,
            'compliance_rate': round((compliant / total * 100) if total > 0 else 100, 2),
            'issues_by_type': issues_by_type,
            'auto_fixable_count': queryset.filter(can_auto_fix=True, auto_fix_applied=False).count()
        })

    @action(detail=False, methods=['get'])
    def issues(self, request):
        """Get all non-compliant documents"""
        queryset = self.get_queryset().filter(
            status=DocumentComplianceCheck.NON_COMPLIANT
        ).order_by('-issue_count', '-last_checked')

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class ComplianceScoreViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for compliance score history (read-only).
    """
    queryset = ComplianceScore.objects.all()
    serializer_class = ComplianceScoreSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by scope
        scope = self.request.query_params.get('scope')
        if scope:
            queryset = queryset.filter(scope=scope)

        # Filter by scope identifier
        scope_identifier = self.request.query_params.get('scope_identifier')
        if scope_identifier:
            queryset = queryset.filter(scope_identifier=scope_identifier)

        # Filter by date range
        from_date = self.request.query_params.get('from_date')
        to_date = self.request.query_params.get('to_date')
        if from_date:
            queryset = queryset.filter(recorded_at__gte=from_date)
        if to_date:
            queryset = queryset.filter(recorded_at__lte=to_date)

        return queryset

    @action(detail=False, methods=['get'])
    def trend(self, request):
        """Get compliance score trend over time"""
        days = int(request.query_params.get('days', 30))
        scope = request.query_params.get('scope', 'overall')

        start_date = timezone.now() - timedelta(days=days)
        scores = self.get_queryset().filter(
            scope=scope,
            recorded_at__gte=start_date
        ).order_by('recorded_at')

        return Response({
            'scope': scope,
            'days': days,
            'scores': ComplianceScoreSerializer(scores, many=True).data
        })


class ComplianceAlertViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing compliance alerts.
    """
    queryset = ComplianceAlert.objects.all()
    serializer_class = ComplianceAlertSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter to user's alerts or global alerts
        queryset = queryset.filter(
            Q(target_user=self.request.user) | Q(target_user__isnull=True)
        )

        # Filter by read status
        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == 'true')

        # Filter by dismissed status
        is_dismissed = self.request.query_params.get('is_dismissed')
        if is_dismissed is not None:
            queryset = queryset.filter(is_dismissed=is_dismissed.lower() == 'true')

        # Filter by severity
        severity = self.request.query_params.get('severity')
        if severity:
            queryset = queryset.filter(severity=severity)

        return queryset

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark an alert as read"""
        alert = self.get_object()
        alert.mark_as_read()
        return Response({'message': 'Alert marked as read'})

    @action(detail=True, methods=['post'])
    def dismiss(self, request, pk=None):
        """Dismiss an alert"""
        alert = self.get_object()
        alert.dismiss()
        return Response({'message': 'Alert dismissed'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all alerts as read"""
        self.get_queryset().filter(is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )
        return Response({'message': 'All alerts marked as read'})


class ComplianceDashboardViewSet(viewsets.ViewSet):
    """
    ViewSet for the compliance dashboard overview.
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def overview(self, request):
        """Get compliance dashboard overview data"""
        now = timezone.now()

        # Regulation stats
        total_regulations = Regulation.objects.count()
        active_regulations = Regulation.objects.filter(status=Regulation.ACTIVE).count()

        # Control stats
        total_controls = Control.objects.count()
        compliant_controls = Control.objects.filter(status=Control.COMPLIANT).count()
        non_compliant_controls = Control.objects.filter(
            status__in=[Control.NON_COMPLIANT, Control.PARTIALLY_COMPLIANT]
        ).count()

        # Calculate overall score
        if total_controls > 0:
            applicable_controls = Control.objects.exclude(status=Control.NOT_APPLICABLE).count()
            overall_score = round((compliant_controls / applicable_controls * 100) if applicable_controls > 0 else 0, 2)
        else:
            overall_score = 0

        # Get previous score for trend
        last_score = ComplianceScore.objects.filter(scope='overall').order_by('-recorded_at').first()
        score_trend = round(overall_score - float(last_score.score) if last_score else 0, 2)

        # Framework scores
        framework_scores = []
        for reg in Regulation.objects.filter(status=Regulation.ACTIVE):
            status_label = 'compliant' if reg.compliance_score >= 80 else 'at_risk' if reg.compliance_score >= 60 else 'non_compliant'
            framework_scores.append({
                'id': str(reg.id),
                'name': reg.short_name,
                'full_name': reg.name,
                'score': float(reg.compliance_score),
                'status': status_label
            })

        # Finding stats
        open_findings = Finding.objects.filter(status__in=[Finding.OPEN, Finding.IN_PROGRESS]).count()
        critical_findings = Finding.objects.filter(
            status__in=[Finding.OPEN, Finding.IN_PROGRESS],
            severity=Finding.CRITICAL
        ).count()
        overdue_findings = Finding.objects.filter(
            status__in=[Finding.OPEN, Finding.IN_PROGRESS],
            remediation_due_date__lt=now.date()
        ).count()

        # Document compliance stats
        total_doc_checks = DocumentComplianceCheck.objects.count()
        compliant_docs = DocumentComplianceCheck.objects.filter(
            status=DocumentComplianceCheck.COMPLIANT
        ).count()
        docs_at_risk = DocumentComplianceCheck.objects.filter(
            status=DocumentComplianceCheck.NON_COMPLIANT
        ).count()

        # Assessment stats
        upcoming_assessments = Assessment.objects.filter(
            status=Assessment.PLANNED,
            scheduled_date__gte=now.date(),
            scheduled_date__lte=now.date() + timedelta(days=30)
        ).count()
        overdue_assessments = Assessment.objects.filter(
            status__in=[Assessment.PLANNED, Assessment.IN_PROGRESS],
            scheduled_date__lt=now.date()
        ).count()

        # Alert stats
        unread_alerts = ComplianceAlert.objects.filter(
            Q(target_user=request.user) | Q(target_user__isnull=True),
            is_read=False,
            is_dismissed=False
        ).count()
        critical_alerts = ComplianceAlert.objects.filter(
            Q(target_user=request.user) | Q(target_user__isnull=True),
            severity=ComplianceAlert.CRITICAL,
            is_dismissed=False
        ).count()

        # Recent activity (last 10 items)
        recent_activity = []

        # Add recent findings
        for finding in Finding.objects.order_by('-created_at')[:5]:
            recent_activity.append({
                'type': 'finding',
                'action': 'created',
                'title': f"Finding: {finding.title}",
                'severity': finding.severity,
                'timestamp': finding.created_at.isoformat()
            })

        # Add recent assessments
        for assessment in Assessment.objects.order_by('-created_at')[:3]:
            recent_activity.append({
                'type': 'assessment',
                'action': assessment.status,
                'title': f"Assessment: {assessment.name}",
                'timestamp': assessment.created_at.isoformat()
            })

        # Sort by timestamp
        recent_activity.sort(key=lambda x: x['timestamp'], reverse=True)
        recent_activity = recent_activity[:10]

        return Response({
            'overall_score': overall_score,
            'score_trend': score_trend,
            'framework_scores': framework_scores,
            'total_regulations': total_regulations,
            'active_regulations': active_regulations,
            'total_controls': total_controls,
            'compliant_controls': compliant_controls,
            'non_compliant_controls': non_compliant_controls,
            'open_findings': open_findings,
            'critical_findings': critical_findings,
            'overdue_findings': overdue_findings,
            'total_documents': total_doc_checks,
            'compliant_documents': compliant_docs,
            'documents_at_risk': docs_at_risk,
            'upcoming_assessments': upcoming_assessments,
            'overdue_assessments': overdue_assessments,
            'unread_alerts': unread_alerts,
            'critical_alerts': critical_alerts,
            'recent_activity': recent_activity
        })

    @action(detail=False, methods=['get'])
    def risk_matrix(self, request):
        """Get risk matrix data"""
        # Build risk matrix based on findings
        matrix = []
        levels = ['low', 'medium', 'high', 'critical']

        for likelihood in levels:
            row = []
            for impact in levels:
                # Map severity to impact and risk_rating to likelihood
                findings = Finding.objects.filter(
                    status__in=[Finding.OPEN, Finding.IN_PROGRESS]
                )

                # Simple mapping for demo
                count = findings.filter(severity=impact).count() if likelihood == 'medium' else 0

                row.append({
                    'likelihood': likelihood,
                    'impact': impact,
                    'count': count,
                    'items': []
                })
            matrix.append(row)

        total_risks = Finding.objects.filter(
            status__in=[Finding.OPEN, Finding.IN_PROGRESS]
        ).count()

        critical_risks = Finding.objects.filter(
            status__in=[Finding.OPEN, Finding.IN_PROGRESS],
            severity=Finding.CRITICAL
        ).count()

        high_risks = Finding.objects.filter(
            status__in=[Finding.OPEN, Finding.IN_PROGRESS],
            severity=Finding.HIGH
        ).count()

        return Response({
            'matrix': matrix,
            'total_risks': total_risks,
            'critical_risks': critical_risks,
            'high_risks': high_risks
        })

    @action(detail=False, methods=['get'])
    def quick_stats(self, request):
        """Get quick compliance statistics for KPI cards"""
        now = timezone.now()

        # Calculate stats
        total_controls = Control.objects.exclude(status=Control.NOT_APPLICABLE).count()
        compliant_controls = Control.objects.filter(status=Control.COMPLIANT).count()

        overall_score = round((compliant_controls / total_controls * 100) if total_controls > 0 else 0, 2)

        open_findings = Finding.objects.filter(
            status__in=[Finding.OPEN, Finding.IN_PROGRESS]
        ).count()

        overdue_actions = Finding.objects.filter(
            status__in=[Finding.OPEN, Finding.IN_PROGRESS],
            remediation_due_date__lt=now.date()
        ).count()

        docs_at_risk = DocumentComplianceCheck.objects.filter(
            status=DocumentComplianceCheck.NON_COMPLIANT
        ).count()

        return Response({
            'overall_score': overall_score,
            'open_findings': open_findings,
            'overdue_actions': overdue_actions,
            'documents_at_risk': docs_at_risk,
            'compliant_controls': compliant_controls,
            'total_controls': total_controls
        })
