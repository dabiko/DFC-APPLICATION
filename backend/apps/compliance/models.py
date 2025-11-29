"""
Compliance Management Models

This module contains all models for the Compliance Center:
- Regulation: Regulatory frameworks (KYC, AML, GDPR, SOX, etc.)
- Control: Compliance controls mapped to regulations
- ControlEvidence: Evidence items for control testing
- Finding: Audit findings and compliance gaps
- Assessment: Compliance assessments/audits
- DocumentComplianceCheck: Document compliance status tracking
- ComplianceScore: Historical compliance scores
"""

import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator


class Regulation(models.Model):
    """
    Regulatory framework tracking (KYC, AML, GDPR, SOX, etc.)

    Tracks compliance status, controls, and assessments for each regulation.
    """

    # Status choices
    ACTIVE = 'active'
    PENDING = 'pending'
    ARCHIVED = 'archived'

    STATUS_CHOICES = [
        (ACTIVE, 'Active'),
        (PENDING, 'Pending'),
        (ARCHIVED, 'Archived'),
    ]

    # Jurisdiction choices
    JURISDICTION_CHOICES = [
        ('global', 'Global'),
        ('eu', 'European Union'),
        ('us', 'United States'),
        ('uk', 'United Kingdom'),
        ('international', 'International'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, help_text='Full name of the regulation')
    short_name = models.CharField(max_length=50, help_text='Abbreviation (e.g., GDPR, KYC)')
    description = models.TextField(blank=True)
    jurisdiction = models.CharField(max_length=50, choices=JURISDICTION_CHOICES, default='global')
    effective_date = models.DateField(help_text='Date when regulation became effective')

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=ACTIVE)
    compliance_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text='Current compliance score (0-100%)'
    )

    # Tracking
    last_assessment_date = models.DateTimeField(null=True, blank=True)
    next_assessment_date = models.DateField(null=True, blank=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_regulations'
    )

    class Meta:
        db_table = 'compliance_regulations'
        ordering = ['short_name']
        verbose_name = 'Regulation'
        verbose_name_plural = 'Regulations'

    def __str__(self):
        return f"{self.short_name} - {self.name}"

    def calculate_compliance_score(self):
        """Calculate compliance score based on control status"""
        controls = self.controls.all()
        if not controls.exists():
            return 0

        compliant_controls = controls.filter(status=Control.COMPLIANT).count()
        total_applicable = controls.exclude(status=Control.NOT_APPLICABLE).count()

        if total_applicable == 0:
            return 100

        return round((compliant_controls / total_applicable) * 100, 2)

    def update_compliance_score(self):
        """Update and save the compliance score"""
        self.compliance_score = self.calculate_compliance_score()
        self.save(update_fields=['compliance_score', 'updated_at'])


class Control(models.Model):
    """
    Compliance control mapped to a regulation.

    Controls are specific requirements or measures that must be implemented
    to comply with a regulation.
    """

    # Control type choices
    PREVENTIVE = 'preventive'
    DETECTIVE = 'detective'
    CORRECTIVE = 'corrective'

    CONTROL_TYPE_CHOICES = [
        (PREVENTIVE, 'Preventive'),
        (DETECTIVE, 'Detective'),
        (CORRECTIVE, 'Corrective'),
    ]

    # Status choices
    COMPLIANT = 'compliant'
    NON_COMPLIANT = 'non_compliant'
    PARTIALLY_COMPLIANT = 'partially_compliant'
    NOT_TESTED = 'not_tested'
    NOT_APPLICABLE = 'not_applicable'

    STATUS_CHOICES = [
        (COMPLIANT, 'Compliant'),
        (NON_COMPLIANT, 'Non-Compliant'),
        (PARTIALLY_COMPLIANT, 'Partially Compliant'),
        (NOT_TESTED, 'Not Tested'),
        (NOT_APPLICABLE, 'Not Applicable'),
    ]

    # Test frequency choices
    DAILY = 'daily'
    WEEKLY = 'weekly'
    MONTHLY = 'monthly'
    QUARTERLY = 'quarterly'
    ANNUALLY = 'annually'

    TEST_FREQUENCY_CHOICES = [
        (DAILY, 'Daily'),
        (WEEKLY, 'Weekly'),
        (MONTHLY, 'Monthly'),
        (QUARTERLY, 'Quarterly'),
        (ANNUALLY, 'Annually'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    regulation = models.ForeignKey(
        Regulation,
        on_delete=models.CASCADE,
        related_name='controls'
    )

    control_id = models.CharField(max_length=50, help_text='Control identifier (e.g., GDPR-Art17)')
    name = models.CharField(max_length=200)
    description = models.TextField()

    control_type = models.CharField(max_length=20, choices=CONTROL_TYPE_CHOICES, default=PREVENTIVE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=NOT_TESTED)

    # Ownership
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='owned_controls'
    )
    department = models.CharField(max_length=100, blank=True)

    # Testing
    evidence_required = models.BooleanField(default=True)
    test_frequency = models.CharField(max_length=20, choices=TEST_FREQUENCY_CHOICES, default=QUARTERLY)
    last_tested_date = models.DateTimeField(null=True, blank=True)
    next_test_date = models.DateField(null=True, blank=True)

    # Implementation
    implementation_notes = models.TextField(blank=True)
    remediation_plan = models.TextField(blank=True)

    # Priority/Risk
    priority = models.IntegerField(
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text='1=Critical, 5=Low'
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'compliance_controls'
        ordering = ['regulation', 'control_id']
        unique_together = ['regulation', 'control_id']
        verbose_name = 'Control'
        verbose_name_plural = 'Controls'

    def __str__(self):
        return f"{self.control_id}: {self.name}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Update regulation compliance score when control status changes
        self.regulation.update_compliance_score()


class ControlEvidence(models.Model):
    """
    Evidence items for control testing.

    Stores documents, screenshots, or other evidence that proves
    control compliance.
    """

    EVIDENCE_TYPE_CHOICES = [
        ('document', 'Document'),
        ('screenshot', 'Screenshot'),
        ('log', 'System Log'),
        ('report', 'Report'),
        ('attestation', 'Attestation'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    control = models.ForeignKey(
        Control,
        on_delete=models.CASCADE,
        related_name='evidence_items'
    )

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    evidence_type = models.CharField(max_length=20, choices=EVIDENCE_TYPE_CHOICES, default='document')

    # File reference (can link to document in DFC)
    document_id = models.UUIDField(null=True, blank=True, help_text='Reference to document in DFC')
    file_path = models.CharField(max_length=500, blank=True)
    external_url = models.URLField(blank=True)

    # Validity
    collected_date = models.DateTimeField(default=timezone.now)
    valid_until = models.DateField(null=True, blank=True)

    # Metadata
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'compliance_control_evidence'
        ordering = ['-collected_date']
        verbose_name = 'Control Evidence'
        verbose_name_plural = 'Control Evidence'

    def __str__(self):
        return f"{self.title} ({self.control.control_id})"


class Finding(models.Model):
    """
    Audit findings and compliance gaps.

    Tracks issues discovered during assessments and their remediation.
    """

    # Severity choices
    CRITICAL = 'critical'
    HIGH = 'high'
    MEDIUM = 'medium'
    LOW = 'low'

    SEVERITY_CHOICES = [
        (CRITICAL, 'Critical'),
        (HIGH, 'High'),
        (MEDIUM, 'Medium'),
        (LOW, 'Low'),
    ]

    # Status choices
    OPEN = 'open'
    IN_PROGRESS = 'in_progress'
    REMEDIATED = 'remediated'
    ACCEPTED = 'accepted'  # Risk accepted
    CLOSED = 'closed'

    STATUS_CHOICES = [
        (OPEN, 'Open'),
        (IN_PROGRESS, 'In Progress'),
        (REMEDIATED, 'Remediated'),
        (ACCEPTED, 'Risk Accepted'),
        (CLOSED, 'Closed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # References
    regulation = models.ForeignKey(
        Regulation,
        on_delete=models.CASCADE,
        related_name='findings'
    )
    control = models.ForeignKey(
        Control,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='findings'
    )
    assessment = models.ForeignKey(
        'Assessment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='findings'
    )

    # Finding details
    finding_id = models.CharField(max_length=50, unique=True, help_text='Finding reference number')
    title = models.CharField(max_length=200)
    description = models.TextField()
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default=MEDIUM)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=OPEN)

    # Impact and risk
    impact_description = models.TextField(blank=True)
    risk_rating = models.IntegerField(
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )

    # Remediation
    remediation_plan = models.TextField(blank=True)
    remediation_due_date = models.DateField(null=True, blank=True)
    remediation_completed_date = models.DateField(null=True, blank=True)

    # Ownership
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='owned_findings'
    )
    department = models.CharField(max_length=100, blank=True)

    # Tracking
    identified_date = models.DateField(default=timezone.now)
    identified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='identified_findings'
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'compliance_findings'
        ordering = ['-identified_date', 'severity']
        verbose_name = 'Finding'
        verbose_name_plural = 'Findings'

    def __str__(self):
        return f"{self.finding_id}: {self.title}"

    @property
    def is_overdue(self):
        if self.remediation_due_date and self.status in [self.OPEN, self.IN_PROGRESS]:
            return timezone.now().date() > self.remediation_due_date
        return False


class Assessment(models.Model):
    """
    Compliance assessment/audit record.

    Tracks formal assessments of compliance with regulations.
    """

    # Type choices
    INTERNAL = 'internal'
    EXTERNAL = 'external'
    SELF_ASSESSMENT = 'self_assessment'
    REGULATORY = 'regulatory'

    TYPE_CHOICES = [
        (INTERNAL, 'Internal Audit'),
        (EXTERNAL, 'External Audit'),
        (SELF_ASSESSMENT, 'Self Assessment'),
        (REGULATORY, 'Regulatory Examination'),
    ]

    # Status choices
    PLANNED = 'planned'
    IN_PROGRESS = 'in_progress'
    COMPLETED = 'completed'
    CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (PLANNED, 'Planned'),
        (IN_PROGRESS, 'In Progress'),
        (COMPLETED, 'Completed'),
        (CANCELLED, 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    regulation = models.ForeignKey(
        Regulation,
        on_delete=models.CASCADE,
        related_name='assessments'
    )

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    assessment_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=INTERNAL)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=PLANNED)

    # Dates
    scheduled_date = models.DateField()
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    # Results
    overall_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    summary = models.TextField(blank=True)

    # Assessor
    lead_assessor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='led_assessments'
    )
    assessor_organization = models.CharField(max_length=200, blank=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'compliance_assessments'
        ordering = ['-scheduled_date']
        verbose_name = 'Assessment'
        verbose_name_plural = 'Assessments'

    def __str__(self):
        return f"{self.name} ({self.regulation.short_name})"


class DocumentComplianceCheck(models.Model):
    """
    Tracks compliance status of individual documents.

    Used for monitoring document metadata, naming convention,
    classification, and retention compliance.
    """

    # Check type choices
    METADATA = 'metadata'
    NAMING = 'naming'
    CLASSIFICATION = 'classification'
    RETENTION = 'retention'
    ACCESS = 'access'

    CHECK_TYPE_CHOICES = [
        (METADATA, 'Metadata Compliance'),
        (NAMING, 'Naming Convention'),
        (CLASSIFICATION, 'Classification'),
        (RETENTION, 'Retention Policy'),
        (ACCESS, 'Access Control'),
    ]

    # Status choices
    COMPLIANT = 'compliant'
    NON_COMPLIANT = 'non_compliant'
    NEEDS_REVIEW = 'needs_review'
    EXEMPT = 'exempt'

    STATUS_CHOICES = [
        (COMPLIANT, 'Compliant'),
        (NON_COMPLIANT, 'Non-Compliant'),
        (NEEDS_REVIEW, 'Needs Review'),
        (EXEMPT, 'Exempt'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Document reference
    document_id = models.UUIDField(help_text='Reference to document in DFC')
    document_name = models.CharField(max_length=255)
    folder_path = models.CharField(max_length=500, blank=True)

    # Check details
    check_type = models.CharField(max_length=20, choices=CHECK_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=NEEDS_REVIEW)

    # Issues found
    issues = models.JSONField(default=list, help_text='List of compliance issues found')
    issue_count = models.IntegerField(default=0)

    # Auto-fix capability
    can_auto_fix = models.BooleanField(default=False)
    auto_fix_applied = models.BooleanField(default=False)

    # Tracking
    last_checked = models.DateTimeField(auto_now=True)
    checked_by = models.CharField(max_length=50, default='system')  # 'system' or user ID

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'compliance_document_checks'
        ordering = ['-last_checked']
        indexes = [
            models.Index(fields=['document_id']),
            models.Index(fields=['check_type', 'status']),
        ]
        verbose_name = 'Document Compliance Check'
        verbose_name_plural = 'Document Compliance Checks'

    def __str__(self):
        return f"{self.document_name} - {self.get_check_type_display()}"


class ComplianceScore(models.Model):
    """
    Historical compliance score tracking.

    Stores daily/weekly snapshots of compliance scores for trend analysis.
    """

    SCOPE_CHOICES = [
        ('overall', 'Overall'),
        ('regulation', 'Regulation'),
        ('department', 'Department'),
        ('document_type', 'Document Type'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Scope
    scope = models.CharField(max_length=20, choices=SCOPE_CHOICES, default='overall')
    scope_identifier = models.CharField(
        max_length=100,
        blank=True,
        help_text='Regulation ID, department name, etc.'
    )

    # Score
    score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )

    # Breakdown
    breakdown = models.JSONField(
        default=dict,
        help_text='Detailed score breakdown by category'
    )

    # Metrics at time of snapshot
    total_controls = models.IntegerField(default=0)
    compliant_controls = models.IntegerField(default=0)
    open_findings = models.IntegerField(default=0)
    documents_at_risk = models.IntegerField(default=0)

    # Timestamp
    recorded_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'compliance_scores'
        ordering = ['-recorded_at']
        indexes = [
            models.Index(fields=['scope', 'recorded_at']),
            models.Index(fields=['scope_identifier', 'recorded_at']),
        ]
        verbose_name = 'Compliance Score'
        verbose_name_plural = 'Compliance Scores'

    def __str__(self):
        return f"{self.scope}: {self.score}% ({self.recorded_at.date()})"


class ComplianceAlert(models.Model):
    """
    Compliance alerts and notifications.

    Tracks alerts for upcoming deadlines, compliance issues, etc.
    """

    # Alert type choices
    DEADLINE = 'deadline'
    SCORE_DROP = 'score_drop'
    NEW_FINDING = 'new_finding'
    OVERDUE = 'overdue'
    ASSESSMENT_DUE = 'assessment_due'
    POLICY_EXPIRY = 'policy_expiry'

    ALERT_TYPE_CHOICES = [
        (DEADLINE, 'Upcoming Deadline'),
        (SCORE_DROP, 'Score Drop'),
        (NEW_FINDING, 'New Finding'),
        (OVERDUE, 'Overdue Item'),
        (ASSESSMENT_DUE, 'Assessment Due'),
        (POLICY_EXPIRY, 'Policy Expiry'),
    ]

    # Severity choices
    INFO = 'info'
    WARNING = 'warning'
    CRITICAL = 'critical'

    SEVERITY_CHOICES = [
        (INFO, 'Information'),
        (WARNING, 'Warning'),
        (CRITICAL, 'Critical'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    alert_type = models.CharField(max_length=20, choices=ALERT_TYPE_CHOICES)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default=WARNING)

    title = models.CharField(max_length=200)
    message = models.TextField()

    # Reference to related object
    related_object_type = models.CharField(max_length=50, blank=True)
    related_object_id = models.UUIDField(null=True, blank=True)

    # Status
    is_read = models.BooleanField(default=False)
    is_dismissed = models.BooleanField(default=False)

    # Target user (null = all compliance officers)
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='compliance_alerts'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    dismissed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'compliance_alerts'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['target_user', 'is_read', 'is_dismissed']),
            models.Index(fields=['alert_type', 'severity']),
        ]
        verbose_name = 'Compliance Alert'
        verbose_name_plural = 'Compliance Alerts'

    def __str__(self):
        return f"{self.get_alert_type_display()}: {self.title}"

    def mark_as_read(self):
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])

    def dismiss(self):
        if not self.is_dismissed:
            self.is_dismissed = True
            self.dismissed_at = timezone.now()
            self.save(update_fields=['is_dismissed', 'dismissed_at'])
