"""
Compliance Management Serializers

Serializers for the Compliance Center API endpoints.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
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

User = get_user_model()


class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal user serializer for nested representations"""
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'full_name']

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.email


# ============================================================================
# Regulation Serializers
# ============================================================================

class RegulationListSerializer(serializers.ModelSerializer):
    """Serializer for regulation list view"""
    control_count = serializers.SerializerMethodField()
    compliant_control_count = serializers.SerializerMethodField()
    finding_count = serializers.SerializerMethodField()

    class Meta:
        model = Regulation
        fields = [
            'id', 'name', 'short_name', 'description', 'jurisdiction',
            'effective_date', 'status', 'compliance_score',
            'last_assessment_date', 'next_assessment_date',
            'control_count', 'compliant_control_count', 'finding_count',
            'created_at', 'updated_at'
        ]

    def get_control_count(self, obj):
        return obj.controls.count()

    def get_compliant_control_count(self, obj):
        return obj.controls.filter(status=Control.COMPLIANT).count()

    def get_finding_count(self, obj):
        return obj.findings.filter(status__in=[Finding.OPEN, Finding.IN_PROGRESS]).count()


class RegulationDetailSerializer(serializers.ModelSerializer):
    """Serializer for regulation detail view"""
    created_by = UserMinimalSerializer(read_only=True)
    control_count = serializers.SerializerMethodField()
    compliant_control_count = serializers.SerializerMethodField()
    finding_count = serializers.SerializerMethodField()
    assessment_count = serializers.SerializerMethodField()

    class Meta:
        model = Regulation
        fields = [
            'id', 'name', 'short_name', 'description', 'jurisdiction',
            'effective_date', 'status', 'compliance_score',
            'last_assessment_date', 'next_assessment_date',
            'control_count', 'compliant_control_count', 'finding_count',
            'assessment_count', 'created_by', 'created_at', 'updated_at'
        ]

    def get_control_count(self, obj):
        return obj.controls.count()

    def get_compliant_control_count(self, obj):
        return obj.controls.filter(status=Control.COMPLIANT).count()

    def get_finding_count(self, obj):
        return obj.findings.filter(status__in=[Finding.OPEN, Finding.IN_PROGRESS]).count()

    def get_assessment_count(self, obj):
        return obj.assessments.count()


class RegulationCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating regulations"""

    class Meta:
        model = Regulation
        fields = [
            'name', 'short_name', 'description', 'jurisdiction',
            'effective_date', 'status', 'next_assessment_date'
        ]


# ============================================================================
# Control Serializers
# ============================================================================

class ControlListSerializer(serializers.ModelSerializer):
    """Serializer for control list view"""
    regulation_name = serializers.CharField(source='regulation.short_name', read_only=True)
    owner_name = serializers.SerializerMethodField()
    evidence_count = serializers.SerializerMethodField()

    class Meta:
        model = Control
        fields = [
            'id', 'control_id', 'name', 'description', 'control_type',
            'status', 'regulation', 'regulation_name', 'owner', 'owner_name',
            'department', 'test_frequency', 'last_tested_date', 'next_test_date',
            'priority', 'evidence_count', 'evidence_required'
        ]

    def get_owner_name(self, obj):
        if obj.owner:
            return f"{obj.owner.first_name} {obj.owner.last_name}".strip() or obj.owner.email
        return None

    def get_evidence_count(self, obj):
        return obj.evidence_items.count()


class ControlDetailSerializer(serializers.ModelSerializer):
    """Serializer for control detail view"""
    regulation = RegulationListSerializer(read_only=True)
    owner = UserMinimalSerializer(read_only=True)
    evidence_count = serializers.SerializerMethodField()
    finding_count = serializers.SerializerMethodField()

    class Meta:
        model = Control
        fields = [
            'id', 'control_id', 'name', 'description', 'control_type',
            'status', 'regulation', 'owner', 'department',
            'evidence_required', 'test_frequency', 'last_tested_date',
            'next_test_date', 'implementation_notes', 'remediation_plan',
            'priority', 'evidence_count', 'finding_count',
            'created_at', 'updated_at'
        ]

    def get_evidence_count(self, obj):
        return obj.evidence_items.count()

    def get_finding_count(self, obj):
        return obj.findings.filter(status__in=[Finding.OPEN, Finding.IN_PROGRESS]).count()


class ControlCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating controls"""

    class Meta:
        model = Control
        fields = [
            'regulation', 'control_id', 'name', 'description', 'control_type',
            'status', 'owner', 'department', 'evidence_required',
            'test_frequency', 'next_test_date', 'implementation_notes',
            'remediation_plan', 'priority'
        ]


# ============================================================================
# Control Evidence Serializers
# ============================================================================

class ControlEvidenceSerializer(serializers.ModelSerializer):
    """Serializer for control evidence"""
    uploaded_by = UserMinimalSerializer(read_only=True)

    class Meta:
        model = ControlEvidence
        fields = [
            'id', 'control', 'title', 'description', 'evidence_type',
            'document_id', 'file_path', 'external_url',
            'collected_date', 'valid_until', 'uploaded_by', 'created_at'
        ]
        read_only_fields = ['uploaded_by', 'created_at']


# ============================================================================
# Finding Serializers
# ============================================================================

class FindingListSerializer(serializers.ModelSerializer):
    """Serializer for finding list view"""
    regulation_name = serializers.CharField(source='regulation.short_name', read_only=True)
    control_name = serializers.CharField(source='control.name', read_only=True, allow_null=True)
    owner_name = serializers.SerializerMethodField()
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Finding
        fields = [
            'id', 'finding_id', 'title', 'severity', 'status',
            'regulation', 'regulation_name', 'control', 'control_name',
            'owner', 'owner_name', 'department',
            'remediation_due_date', 'identified_date', 'is_overdue'
        ]

    def get_owner_name(self, obj):
        if obj.owner:
            return f"{obj.owner.first_name} {obj.owner.last_name}".strip() or obj.owner.email
        return None


class FindingDetailSerializer(serializers.ModelSerializer):
    """Serializer for finding detail view"""
    regulation = RegulationListSerializer(read_only=True)
    control = ControlListSerializer(read_only=True)
    owner = UserMinimalSerializer(read_only=True)
    identified_by = UserMinimalSerializer(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Finding
        fields = [
            'id', 'finding_id', 'title', 'description', 'severity', 'status',
            'regulation', 'control', 'assessment',
            'impact_description', 'risk_rating',
            'remediation_plan', 'remediation_due_date', 'remediation_completed_date',
            'owner', 'department', 'identified_date', 'identified_by',
            'is_overdue', 'created_at', 'updated_at'
        ]


class FindingCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating findings"""

    class Meta:
        model = Finding
        fields = [
            'finding_id', 'title', 'description', 'severity', 'status',
            'regulation', 'control', 'assessment',
            'impact_description', 'risk_rating',
            'remediation_plan', 'remediation_due_date', 'remediation_completed_date',
            'owner', 'department'
        ]


# ============================================================================
# Assessment Serializers
# ============================================================================

class AssessmentListSerializer(serializers.ModelSerializer):
    """Serializer for assessment list view"""
    regulation_name = serializers.CharField(source='regulation.short_name', read_only=True)
    lead_assessor_name = serializers.SerializerMethodField()
    finding_count = serializers.SerializerMethodField()

    class Meta:
        model = Assessment
        fields = [
            'id', 'name', 'regulation', 'regulation_name',
            'assessment_type', 'status', 'scheduled_date',
            'start_date', 'end_date', 'overall_score',
            'lead_assessor', 'lead_assessor_name', 'finding_count'
        ]

    def get_lead_assessor_name(self, obj):
        if obj.lead_assessor:
            return f"{obj.lead_assessor.first_name} {obj.lead_assessor.last_name}".strip() or obj.lead_assessor.email
        return None

    def get_finding_count(self, obj):
        return obj.findings.count()


class AssessmentDetailSerializer(serializers.ModelSerializer):
    """Serializer for assessment detail view"""
    regulation = RegulationListSerializer(read_only=True)
    lead_assessor = UserMinimalSerializer(read_only=True)
    finding_count = serializers.SerializerMethodField()

    class Meta:
        model = Assessment
        fields = [
            'id', 'name', 'description', 'regulation',
            'assessment_type', 'status', 'scheduled_date',
            'start_date', 'end_date', 'overall_score', 'summary',
            'lead_assessor', 'assessor_organization', 'finding_count',
            'created_at', 'updated_at'
        ]

    def get_finding_count(self, obj):
        return obj.findings.count()


class AssessmentCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating assessments"""

    class Meta:
        model = Assessment
        fields = [
            'name', 'description', 'regulation', 'assessment_type',
            'status', 'scheduled_date', 'start_date', 'end_date',
            'overall_score', 'summary', 'lead_assessor', 'assessor_organization'
        ]


# ============================================================================
# Document Compliance Serializers
# ============================================================================

class DocumentComplianceCheckSerializer(serializers.ModelSerializer):
    """Serializer for document compliance checks"""
    check_type_display = serializers.CharField(source='get_check_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = DocumentComplianceCheck
        fields = [
            'id', 'document_id', 'document_name', 'folder_path',
            'check_type', 'check_type_display', 'status', 'status_display',
            'issues', 'issue_count', 'can_auto_fix', 'auto_fix_applied',
            'last_checked', 'checked_by', 'created_at'
        ]


class DocumentComplianceStatsSerializer(serializers.Serializer):
    """Serializer for document compliance statistics"""
    total_documents = serializers.IntegerField()
    compliant_documents = serializers.IntegerField()
    non_compliant_documents = serializers.IntegerField()
    compliance_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    issues_by_type = serializers.DictField()
    auto_fixable_count = serializers.IntegerField()


# ============================================================================
# Compliance Score Serializers
# ============================================================================

class ComplianceScoreSerializer(serializers.ModelSerializer):
    """Serializer for compliance scores"""

    class Meta:
        model = ComplianceScore
        fields = [
            'id', 'scope', 'scope_identifier', 'score', 'breakdown',
            'total_controls', 'compliant_controls', 'open_findings',
            'documents_at_risk', 'recorded_at'
        ]


# ============================================================================
# Compliance Alert Serializers
# ============================================================================

class ComplianceAlertSerializer(serializers.ModelSerializer):
    """Serializer for compliance alerts"""
    alert_type_display = serializers.CharField(source='get_alert_type_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)

    class Meta:
        model = ComplianceAlert
        fields = [
            'id', 'alert_type', 'alert_type_display', 'severity', 'severity_display',
            'title', 'message', 'related_object_type', 'related_object_id',
            'is_read', 'is_dismissed', 'created_at', 'read_at', 'dismissed_at'
        ]


# ============================================================================
# Dashboard Serializers
# ============================================================================

class ComplianceDashboardSerializer(serializers.Serializer):
    """Serializer for the compliance dashboard overview"""
    overall_score = serializers.DecimalField(max_digits=5, decimal_places=2)
    score_trend = serializers.DecimalField(max_digits=5, decimal_places=2)

    # Framework breakdown
    framework_scores = serializers.ListField(child=serializers.DictField())

    # Key metrics
    total_regulations = serializers.IntegerField()
    active_regulations = serializers.IntegerField()
    total_controls = serializers.IntegerField()
    compliant_controls = serializers.IntegerField()
    non_compliant_controls = serializers.IntegerField()

    # Findings
    open_findings = serializers.IntegerField()
    critical_findings = serializers.IntegerField()
    overdue_findings = serializers.IntegerField()

    # Documents
    total_documents = serializers.IntegerField()
    compliant_documents = serializers.IntegerField()
    documents_at_risk = serializers.IntegerField()

    # Assessments
    upcoming_assessments = serializers.IntegerField()
    overdue_assessments = serializers.IntegerField()

    # Alerts
    unread_alerts = serializers.IntegerField()
    critical_alerts = serializers.IntegerField()

    # Recent activity
    recent_activity = serializers.ListField(child=serializers.DictField())


class RiskMatrixSerializer(serializers.Serializer):
    """Serializer for risk matrix data"""
    matrix = serializers.ListField(
        child=serializers.ListField(child=serializers.DictField())
    )
    total_risks = serializers.IntegerField()
    critical_risks = serializers.IntegerField()
    high_risks = serializers.IntegerField()
