"""
Migration for Department-as-Root Architecture - Phase 1

Adds new fields to Department model:
- description: Text field for department purpose
- icon: Choice field for sidebar icon
- color: Hex color for visual identification
- display_order: Integer for sidebar ordering
- is_active: Boolean for soft-disable
- storage_used_bytes: BigInteger for storage tracking
- default_confidentiality: Choice field for default doc confidentiality

Also adds new indexes for efficient queries.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0014_add_mfa_trusted_devices_and_policies'),
    ]

    operations = [
        # Add description field
        migrations.AddField(
            model_name='department',
            name='description',
            field=models.TextField(
                blank=True,
                help_text='Description of the department purpose and scope'
            ),
        ),

        # Add icon field
        migrations.AddField(
            model_name='department',
            name='icon',
            field=models.CharField(
                choices=[
                    ('folder', 'Folder'),
                    ('briefcase', 'Briefcase'),
                    ('calculator', 'Calculator'),
                    ('shield', 'Shield'),
                    ('alert-triangle', 'Alert Triangle'),
                    ('clipboard-check', 'Clipboard Check'),
                    ('server', 'Server'),
                    ('users', 'Users'),
                    ('file-text', 'File Text'),
                    ('archive', 'Archive'),
                    ('database', 'Database'),
                    ('lock', 'Lock'),
                ],
                default='folder',
                help_text='Icon to display in sidebar navigation',
                max_length=50,
            ),
        ),

        # Add color field
        migrations.AddField(
            model_name='department',
            name='color',
            field=models.CharField(
                default='#3B82F6',
                help_text='Hex color code for department visual identification',
                max_length=7,
            ),
        ),

        # Add display_order field
        migrations.AddField(
            model_name='department',
            name='display_order',
            field=models.IntegerField(
                db_index=True,
                default=0,
                help_text='Order in which departments appear in sidebar',
            ),
        ),

        # Add is_active field
        migrations.AddField(
            model_name='department',
            name='is_active',
            field=models.BooleanField(
                default=True,
                help_text='Whether this department is active and accessible',
            ),
        ),

        # Add storage_used_bytes field
        migrations.AddField(
            model_name='department',
            name='storage_used_bytes',
            field=models.BigIntegerField(
                default=0,
                help_text='Current storage usage in bytes (updated by document operations)',
            ),
        ),

        # Add default_confidentiality field
        migrations.AddField(
            model_name='department',
            name='default_confidentiality',
            field=models.CharField(
                choices=[
                    ('PUBLIC', 'Public'),
                    ('INTERNAL', 'Internal'),
                    ('CONFIDENTIAL', 'Confidential'),
                    ('HIGHLY_CONFIDENTIAL', 'Highly Confidential'),
                ],
                default='INTERNAL',
                help_text='Default confidentiality level for new documents in this department',
                max_length=20,
            ),
        ),

        # Add composite index for organization + is_active
        migrations.AddIndex(
            model_name='department',
            index=models.Index(
                fields=['organization', 'is_active'],
                name='dept_org_active_idx'
            ),
        ),
    ]
