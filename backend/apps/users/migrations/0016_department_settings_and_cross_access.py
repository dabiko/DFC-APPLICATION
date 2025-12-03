"""
Migration for Department-as-Root Architecture - Phase 1 (continued)

Creates new models:
- DepartmentSettings: Department-specific configuration
- CrossDepartmentAccess: Cross-department access grants
- DepartmentAccessRequest: Access request workflow
"""

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0015_department_as_root_fields'),
        ('permissions', '0001_initial'),
        ('folders', '0008_update_smart_folder_icon_color_choices'),
    ]

    operations = [
        # Create DepartmentSettings model
        migrations.CreateModel(
            name='DepartmentSettings',
            fields=[
                ('department', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    primary_key=True,
                    related_name='settings',
                    serialize=False,
                    to='users.department'
                )),
                ('auto_create_structure', models.BooleanField(
                    default=False,
                    help_text='Automatically create default folder structure for new department members'
                )),
                ('default_folder_template', models.ForeignKey(
                    blank=True,
                    help_text='Default folder template to use when creating structures',
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='default_for_departments',
                    to='folders.foldertemplate'
                )),
                ('default_retention_days', models.IntegerField(
                    default=2555,
                    help_text='Default retention period in days for documents in this department'
                )),
                ('enforce_retention', models.BooleanField(
                    default=True,
                    help_text='Whether to enforce retention policies automatically'
                )),
                ('notify_on_upload', models.BooleanField(
                    default=False,
                    help_text='Notify department managers when new documents are uploaded'
                )),
                ('notify_managers_on_delete', models.BooleanField(
                    default=True,
                    help_text='Notify department managers when documents are deleted'
                )),
                ('notify_on_access_request', models.BooleanField(
                    default=True,
                    help_text='Notify department managers when cross-department access is requested'
                )),
                ('allow_external_sharing', models.BooleanField(
                    default=False,
                    help_text='Allow sharing documents outside the organization'
                )),
                ('require_approval_for_sharing', models.BooleanField(
                    default=True,
                    help_text='Require manager approval for sharing documents'
                )),
                ('allow_cross_department_access', models.BooleanField(
                    default=True,
                    help_text='Allow granting access to users from other departments'
                )),
                ('default_share_expiry_days', models.IntegerField(
                    default=30,
                    help_text='Default expiration period for shared document links'
                )),
                ('require_classification', models.BooleanField(
                    default=True,
                    help_text='Require documents to be classified before upload'
                )),
                ('auto_index_documents', models.BooleanField(
                    default=True,
                    help_text='Automatically index documents for full-text search'
                )),
                ('require_metadata', models.BooleanField(
                    default=True,
                    help_text='Require mandatory metadata fields to be filled'
                )),
                ('enhanced_audit_logging', models.BooleanField(
                    default=False,
                    help_text='Enable enhanced audit logging for compliance-sensitive departments'
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Department Settings',
                'verbose_name_plural': 'Department Settings',
                'db_table': 'department_settings',
            },
        ),

        # Create CrossDepartmentAccess model
        migrations.CreateModel(
            name='CrossDepartmentAccess',
            fields=[
                ('id', models.UUIDField(
                    default=uuid.uuid4,
                    editable=False,
                    primary_key=True,
                    serialize=False
                )),
                ('granted_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField(
                    blank=True,
                    help_text='When this access grant expires (null = no expiration)',
                    null=True
                )),
                ('reason', models.TextField(
                    help_text='Justification for granting cross-department access'
                )),
                ('is_active', models.BooleanField(
                    default=True,
                    help_text='Whether this access grant is currently active'
                )),
                ('requires_approval', models.BooleanField(
                    default=False,
                    help_text='Whether this grant requires additional approval'
                )),
                ('approved_at', models.DateTimeField(blank=True, null=True)),
                ('revoked_at', models.DateTimeField(blank=True, null=True)),
                ('revocation_reason', models.TextField(blank=True)),
                ('approved_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='cross_department_access_approved',
                    to=settings.AUTH_USER_MODEL
                )),
                ('department', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='external_access_grants',
                    to='users.department'
                )),
                ('granted_by', models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='cross_department_access_granted',
                    to=settings.AUTH_USER_MODEL
                )),
                ('revoked_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='cross_department_access_revoked',
                    to=settings.AUTH_USER_MODEL
                )),
                ('role', models.ForeignKey(
                    help_text='Role determining permission level in the target department',
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='cross_department_grants',
                    to='permissions.role'
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='cross_department_access_grants',
                    to=settings.AUTH_USER_MODEL
                )),
            ],
            options={
                'verbose_name': 'Cross-Department Access',
                'verbose_name_plural': 'Cross-Department Access Grants',
                'db_table': 'cross_department_access',
                'unique_together': {('user', 'department')},
            },
        ),

        # Add indexes for CrossDepartmentAccess
        migrations.AddIndex(
            model_name='crossdepartmentaccess',
            index=models.Index(
                fields=['user', 'is_active'],
                name='cda_user_active_idx'
            ),
        ),
        migrations.AddIndex(
            model_name='crossdepartmentaccess',
            index=models.Index(
                fields=['department', 'is_active'],
                name='cda_dept_active_idx'
            ),
        ),
        migrations.AddIndex(
            model_name='crossdepartmentaccess',
            index=models.Index(
                fields=['expires_at'],
                name='cda_expires_idx'
            ),
        ),
        migrations.AddIndex(
            model_name='crossdepartmentaccess',
            index=models.Index(
                fields=['granted_at'],
                name='cda_granted_idx'
            ),
        ),

        # Create DepartmentAccessRequest model
        migrations.CreateModel(
            name='DepartmentAccessRequest',
            fields=[
                ('id', models.UUIDField(
                    default=uuid.uuid4,
                    editable=False,
                    primary_key=True,
                    serialize=False
                )),
                ('reason', models.TextField(
                    help_text='Justification for requesting access'
                )),
                ('requested_duration_days', models.IntegerField(
                    blank=True,
                    help_text='Requested access duration in days (null = permanent)',
                    null=True
                )),
                ('status', models.CharField(
                    choices=[
                        ('PENDING', 'Pending'),
                        ('APPROVED', 'Approved'),
                        ('REJECTED', 'Rejected'),
                        ('CANCELLED', 'Cancelled'),
                    ],
                    default='PENDING',
                    max_length=20
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('reviewed_at', models.DateTimeField(blank=True, null=True)),
                ('review_notes', models.TextField(blank=True)),
                ('department', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='access_requests',
                    to='users.department'
                )),
                ('requested_role', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='access_requests',
                    to='permissions.role'
                )),
                ('requester', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='department_access_requests',
                    to=settings.AUTH_USER_MODEL
                )),
                ('resulting_grant', models.OneToOneField(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='source_request',
                    to='users.crossdepartmentaccess'
                )),
                ('reviewed_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='department_access_requests_reviewed',
                    to=settings.AUTH_USER_MODEL
                )),
            ],
            options={
                'verbose_name': 'Department Access Request',
                'verbose_name_plural': 'Department Access Requests',
                'db_table': 'department_access_requests',
                'ordering': ['-created_at'],
            },
        ),

        # Add indexes for DepartmentAccessRequest
        migrations.AddIndex(
            model_name='departmentaccessrequest',
            index=models.Index(
                fields=['requester', 'status'],
                name='dar_requester_status_idx'
            ),
        ),
        migrations.AddIndex(
            model_name='departmentaccessrequest',
            index=models.Index(
                fields=['department', 'status'],
                name='dar_dept_status_idx'
            ),
        ),
        migrations.AddIndex(
            model_name='departmentaccessrequest',
            index=models.Index(
                fields=['status', 'created_at'],
                name='dar_status_created_idx'
            ),
        ),
    ]
