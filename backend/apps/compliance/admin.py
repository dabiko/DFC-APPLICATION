from django.contrib import admin
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


@admin.register(Regulation)
class RegulationAdmin(admin.ModelAdmin):
    list_display = ['short_name', 'name', 'jurisdiction', 'status', 'compliance_score', 'last_assessment_date']
    list_filter = ['status', 'jurisdiction']
    search_fields = ['name', 'short_name', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at', 'compliance_score']


@admin.register(Control)
class ControlAdmin(admin.ModelAdmin):
    list_display = ['control_id', 'name', 'regulation', 'control_type', 'status', 'priority', 'last_tested_date']
    list_filter = ['status', 'control_type', 'regulation', 'test_frequency']
    search_fields = ['control_id', 'name', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(ControlEvidence)
class ControlEvidenceAdmin(admin.ModelAdmin):
    list_display = ['title', 'control', 'evidence_type', 'collected_date', 'valid_until']
    list_filter = ['evidence_type']
    search_fields = ['title', 'description']
    readonly_fields = ['id', 'created_at']


@admin.register(Finding)
class FindingAdmin(admin.ModelAdmin):
    list_display = ['finding_id', 'title', 'regulation', 'severity', 'status', 'remediation_due_date', 'is_overdue']
    list_filter = ['status', 'severity', 'regulation']
    search_fields = ['finding_id', 'title', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'regulation', 'assessment_type', 'status', 'scheduled_date', 'overall_score']
    list_filter = ['status', 'assessment_type', 'regulation']
    search_fields = ['name', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(DocumentComplianceCheck)
class DocumentComplianceCheckAdmin(admin.ModelAdmin):
    list_display = ['document_name', 'check_type', 'status', 'issue_count', 'can_auto_fix', 'last_checked']
    list_filter = ['check_type', 'status', 'can_auto_fix']
    search_fields = ['document_name', 'folder_path']
    readonly_fields = ['id', 'created_at']


@admin.register(ComplianceScore)
class ComplianceScoreAdmin(admin.ModelAdmin):
    list_display = ['scope', 'scope_identifier', 'score', 'total_controls', 'compliant_controls', 'open_findings', 'recorded_at']
    list_filter = ['scope']
    readonly_fields = ['id']


@admin.register(ComplianceAlert)
class ComplianceAlertAdmin(admin.ModelAdmin):
    list_display = ['title', 'alert_type', 'severity', 'target_user', 'is_read', 'is_dismissed', 'created_at']
    list_filter = ['alert_type', 'severity', 'is_read', 'is_dismissed']
    search_fields = ['title', 'message']
    readonly_fields = ['id', 'created_at', 'read_at', 'dismissed_at']
