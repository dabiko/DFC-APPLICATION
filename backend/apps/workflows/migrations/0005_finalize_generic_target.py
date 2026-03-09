"""
Migration 3 of 3: Make GFK fields non-nullable, remove old document FK, add index.

After data migration has populated all GFK fields, this migration:
1. Makes target_content_type and target_object_id required
2. Removes the old document ForeignKey
3. Adds a composite index for GFK lookups
"""

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('workflows', '0004_populate_generic_target'),
    ]

    operations = [
        # Make GFK fields required
        migrations.AlterField(
            model_name='workflowinstance',
            name='target_content_type',
            field=models.ForeignKey(
                to='contenttypes.ContentType',
                on_delete=django.db.models.deletion.CASCADE,
                related_name='workflow_instances',
                help_text='Type of the target object (Document, Procedure, etc.)',
            ),
        ),
        migrations.AlterField(
            model_name='workflowinstance',
            name='target_object_id',
            field=models.UUIDField(
                help_text='UUID of the target object',
            ),
        ),

        # Remove old document FK
        migrations.RemoveField(
            model_name='workflowinstance',
            name='document',
        ),

        # Add composite index for GFK lookups
        migrations.AddIndex(
            model_name='workflowinstance',
            index=models.Index(
                fields=['target_content_type', 'target_object_id'],
                name='wf_instance_target_idx',
            ),
        ),
    ]
