# Generated migration for compliance app

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.core.validators
import django.utils.timezone
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Regulation model
        migrations.CreateModel(
            name='Regulation',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(help_text='Full name of the regulation', max_length=200)),
                ('short_name', models.CharField(help_text='Abbreviation (e.g., GDPR, KYC)', max_length=50)),
                ('description', models.TextField(blank=True)),
                ('jurisdiction', models.CharField(choices=[('global', 'Global'), ('eu', 'European Union'), ('us', 'United States'), ('uk', 'United Kingdom'), ('international', 'International')], default='global', max_length=50)),
                ('effective_date', models.DateField(help_text='Date when regulation became effective')),
                ('status', models.CharField(choices=[('active', 'Active'), ('pending', 'Pending'), ('archived', 'Archived')], default='active', max_length=20)),
                ('compliance_score', models.DecimalField(decimal_places=2, default=0, help_text='Current compliance score (0-100%)', max_digits=5, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(100)])),
                ('last_assessment_date', models.DateTimeField(blank=True, null=True)),
                ('next_assessment_date', models.DateField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_regulations', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Regulation',
                'verbose_name_plural': 'Regulations',
                'db_table': 'compliance_regulations',
                'ordering': ['short_name'],
            },
        ),

        # Control model
        migrations.CreateModel(
            name='Control',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('control_id', models.CharField(help_text='Control identifier (e.g., GDPR-Art17)', max_length=50)),
                ('name', models.CharField(max_length=200)),
                ('description', models.TextField()),
                ('control_type', models.CharField(choices=[('preventive', 'Preventive'), ('detective', 'Detective'), ('corrective', 'Corrective')], default='preventive', max_length=20)),
                ('status', models.CharField(choices=[('compliant', 'Compliant'), ('non_compliant', 'Non-Compliant'), ('partially_compliant', 'Partially Compliant'), ('not_tested', 'Not Tested'), ('not_applicable', 'Not Applicable')], default='not_tested', max_length=20)),
                ('department', models.CharField(blank=True, max_length=100)),
                ('evidence_required', models.BooleanField(default=True)),
                ('test_frequency', models.CharField(choices=[('daily', 'Daily'), ('weekly', 'Weekly'), ('monthly', 'Monthly'), ('quarterly', 'Quarterly'), ('annually', 'Annually')], default='quarterly', max_length=20)),
                ('last_tested_date', models.DateTimeField(blank=True, null=True)),
                ('next_test_date', models.DateField(blank=True, null=True)),
                ('implementation_notes', models.TextField(blank=True)),
                ('remediation_plan', models.TextField(blank=True)),
                ('priority', models.IntegerField(default=3, help_text='1=Critical, 5=Low', validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('owner', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='owned_controls', to=settings.AUTH_USER_MODEL)),
                ('regulation', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='controls', to='compliance.regulation')),
            ],
            options={
                'verbose_name': 'Control',
                'verbose_name_plural': 'Controls',
                'db_table': 'compliance_controls',
                'ordering': ['regulation', 'control_id'],
                'unique_together': {('regulation', 'control_id')},
            },
        ),

        # Assessment model
        migrations.CreateModel(
            name='Assessment',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True)),
                ('assessment_type', models.CharField(choices=[('internal', 'Internal Audit'), ('external', 'External Audit'), ('self_assessment', 'Self Assessment'), ('regulatory', 'Regulatory Examination')], default='internal', max_length=20)),
                ('status', models.CharField(choices=[('planned', 'Planned'), ('in_progress', 'In Progress'), ('completed', 'Completed'), ('cancelled', 'Cancelled')], default='planned', max_length=20)),
                ('scheduled_date', models.DateField()),
                ('start_date', models.DateField(blank=True, null=True)),
                ('end_date', models.DateField(blank=True, null=True)),
                ('overall_score', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(100)])),
                ('summary', models.TextField(blank=True)),
                ('assessor_organization', models.CharField(blank=True, max_length=200)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('lead_assessor', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='led_assessments', to=settings.AUTH_USER_MODEL)),
                ('regulation', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='assessments', to='compliance.regulation')),
            ],
            options={
                'verbose_name': 'Assessment',
                'verbose_name_plural': 'Assessments',
                'db_table': 'compliance_assessments',
                'ordering': ['-scheduled_date'],
            },
        ),

        # Finding model
        migrations.CreateModel(
            name='Finding',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('finding_id', models.CharField(help_text='Finding reference number', max_length=50, unique=True)),
                ('title', models.CharField(max_length=200)),
                ('description', models.TextField()),
                ('severity', models.CharField(choices=[('critical', 'Critical'), ('high', 'High'), ('medium', 'Medium'), ('low', 'Low')], default='medium', max_length=20)),
                ('status', models.CharField(choices=[('open', 'Open'), ('in_progress', 'In Progress'), ('remediated', 'Remediated'), ('accepted', 'Risk Accepted'), ('closed', 'Closed')], default='open', max_length=20)),
                ('impact_description', models.TextField(blank=True)),
                ('risk_rating', models.IntegerField(default=3, validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ('remediation_plan', models.TextField(blank=True)),
                ('remediation_due_date', models.DateField(blank=True, null=True)),
                ('remediation_completed_date', models.DateField(blank=True, null=True)),
                ('department', models.CharField(blank=True, max_length=100)),
                ('identified_date', models.DateField(default=django.utils.timezone.now)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('assessment', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='findings', to='compliance.assessment')),
                ('control', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='findings', to='compliance.control')),
                ('identified_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='identified_findings', to=settings.AUTH_USER_MODEL)),
                ('owner', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='owned_findings', to=settings.AUTH_USER_MODEL)),
                ('regulation', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='findings', to='compliance.regulation')),
            ],
            options={
                'verbose_name': 'Finding',
                'verbose_name_plural': 'Findings',
                'db_table': 'compliance_findings',
                'ordering': ['-identified_date', 'severity'],
            },
        ),

        # ControlEvidence model
        migrations.CreateModel(
            name='ControlEvidence',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True)),
                ('evidence_type', models.CharField(choices=[('document', 'Document'), ('screenshot', 'Screenshot'), ('log', 'System Log'), ('report', 'Report'), ('attestation', 'Attestation'), ('other', 'Other')], default='document', max_length=20)),
                ('document_id', models.UUIDField(blank=True, help_text='Reference to document in DFC', null=True)),
                ('file_path', models.CharField(blank=True, max_length=500)),
                ('external_url', models.URLField(blank=True)),
                ('collected_date', models.DateTimeField(default=django.utils.timezone.now)),
                ('valid_until', models.DateField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('control', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='evidence_items', to='compliance.control')),
                ('uploaded_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Control Evidence',
                'verbose_name_plural': 'Control Evidence',
                'db_table': 'compliance_control_evidence',
                'ordering': ['-collected_date'],
            },
        ),

        # DocumentComplianceCheck model
        migrations.CreateModel(
            name='DocumentComplianceCheck',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('document_id', models.UUIDField(help_text='Reference to document in DFC')),
                ('document_name', models.CharField(max_length=255)),
                ('folder_path', models.CharField(blank=True, max_length=500)),
                ('check_type', models.CharField(choices=[('metadata', 'Metadata Compliance'), ('naming', 'Naming Convention'), ('classification', 'Classification'), ('retention', 'Retention Policy'), ('access', 'Access Control')], max_length=20)),
                ('status', models.CharField(choices=[('compliant', 'Compliant'), ('non_compliant', 'Non-Compliant'), ('needs_review', 'Needs Review'), ('exempt', 'Exempt')], default='needs_review', max_length=20)),
                ('issues', models.JSONField(default=list, help_text='List of compliance issues found')),
                ('issue_count', models.IntegerField(default=0)),
                ('can_auto_fix', models.BooleanField(default=False)),
                ('auto_fix_applied', models.BooleanField(default=False)),
                ('last_checked', models.DateTimeField(auto_now=True)),
                ('checked_by', models.CharField(default='system', max_length=50)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Document Compliance Check',
                'verbose_name_plural': 'Document Compliance Checks',
                'db_table': 'compliance_document_checks',
                'ordering': ['-last_checked'],
            },
        ),
        migrations.AddIndex(
            model_name='documentcompliancecheck',
            index=models.Index(fields=['document_id'], name='compliance__documen_e4c0c9_idx'),
        ),
        migrations.AddIndex(
            model_name='documentcompliancecheck',
            index=models.Index(fields=['check_type', 'status'], name='compliance__check_t_f4b0c8_idx'),
        ),

        # ComplianceScore model
        migrations.CreateModel(
            name='ComplianceScore',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('scope', models.CharField(choices=[('overall', 'Overall'), ('regulation', 'Regulation'), ('department', 'Department'), ('document_type', 'Document Type')], default='overall', max_length=20)),
                ('scope_identifier', models.CharField(blank=True, help_text='Regulation ID, department name, etc.', max_length=100)),
                ('score', models.DecimalField(decimal_places=2, max_digits=5, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(100)])),
                ('breakdown', models.JSONField(default=dict, help_text='Detailed score breakdown by category')),
                ('total_controls', models.IntegerField(default=0)),
                ('compliant_controls', models.IntegerField(default=0)),
                ('open_findings', models.IntegerField(default=0)),
                ('documents_at_risk', models.IntegerField(default=0)),
                ('recorded_at', models.DateTimeField(default=django.utils.timezone.now)),
            ],
            options={
                'verbose_name': 'Compliance Score',
                'verbose_name_plural': 'Compliance Scores',
                'db_table': 'compliance_scores',
                'ordering': ['-recorded_at'],
            },
        ),
        migrations.AddIndex(
            model_name='compliancescore',
            index=models.Index(fields=['scope', 'recorded_at'], name='compliance__scope_c4c0c9_idx'),
        ),
        migrations.AddIndex(
            model_name='compliancescore',
            index=models.Index(fields=['scope_identifier', 'recorded_at'], name='compliance__scope_i_f4b0c8_idx'),
        ),

        # ComplianceAlert model
        migrations.CreateModel(
            name='ComplianceAlert',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('alert_type', models.CharField(choices=[('deadline', 'Upcoming Deadline'), ('score_drop', 'Score Drop'), ('new_finding', 'New Finding'), ('overdue', 'Overdue Item'), ('assessment_due', 'Assessment Due'), ('policy_expiry', 'Policy Expiry')], max_length=20)),
                ('severity', models.CharField(choices=[('info', 'Information'), ('warning', 'Warning'), ('critical', 'Critical')], default='warning', max_length=20)),
                ('title', models.CharField(max_length=200)),
                ('message', models.TextField()),
                ('related_object_type', models.CharField(blank=True, max_length=50)),
                ('related_object_id', models.UUIDField(blank=True, null=True)),
                ('is_read', models.BooleanField(default=False)),
                ('is_dismissed', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('read_at', models.DateTimeField(blank=True, null=True)),
                ('dismissed_at', models.DateTimeField(blank=True, null=True)),
                ('target_user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='compliance_alerts', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Compliance Alert',
                'verbose_name_plural': 'Compliance Alerts',
                'db_table': 'compliance_alerts',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='compliancealert',
            index=models.Index(fields=['target_user', 'is_read', 'is_dismissed'], name='compliance__target__a1b2c3_idx'),
        ),
        migrations.AddIndex(
            model_name='compliancealert',
            index=models.Index(fields=['alert_type', 'severity'], name='compliance__alert_t_d4e5f6_idx'),
        ),
    ]
