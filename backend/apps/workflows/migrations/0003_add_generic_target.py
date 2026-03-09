"""
Migration 1 of 3: Add nullable GenericForeignKey fields to WorkflowInstance.

This adds target_content_type, target_object_id, and target_title as nullable
fields. The next migration will populate them from the existing document FK.
"""

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('contenttypes', '0002_remove_content_type_name'),
        ('workflows', '0002_add_auto_trigger_rules_and_api_keys'),
    ]

    operations = [
        migrations.AddField(
            model_name='workflowinstance',
            name='target_content_type',
            field=models.ForeignKey(
                to='contenttypes.ContentType',
                on_delete=django.db.models.deletion.CASCADE,
                null=True,
                blank=True,
                related_name='workflow_instances',
                help_text='Type of the target object (Document, Procedure, etc.)',
            ),
        ),
        migrations.AddField(
            model_name='workflowinstance',
            name='target_object_id',
            field=models.UUIDField(
                null=True,
                blank=True,
                help_text='UUID of the target object',
            ),
        ),
        migrations.AddField(
            model_name='workflowinstance',
            name='target_title',
            field=models.CharField(
                max_length=500,
                blank=True,
                default='',
                help_text='Snapshot of target title for display without joins',
            ),
        ),
    ]
