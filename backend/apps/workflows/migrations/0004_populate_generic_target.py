"""
Migration 2 of 3: Populate GenericForeignKey fields from existing document FK.

Copies document FK data into the new GFK fields for all existing WorkflowInstance rows.
"""

from django.db import migrations


def populate_target_fields(apps, schema_editor):
    WorkflowInstance = apps.get_model('workflows', 'WorkflowInstance')
    ContentType = apps.get_model('contenttypes', 'ContentType')

    # Get the ContentType for Document
    try:
        doc_ct = ContentType.objects.get(app_label='documents', model='document')
    except ContentType.DoesNotExist:
        # No Document content type means no data to migrate
        return

    instances = WorkflowInstance.objects.select_related('document').all()
    for instance in instances:
        if instance.document_id:
            instance.target_content_type = doc_ct
            instance.target_object_id = instance.document_id
            instance.target_title = getattr(instance.document, 'title', '') or ''
            instance.save(update_fields=[
                'target_content_type',
                'target_object_id',
                'target_title',
            ])


def reverse_populate(apps, schema_editor):
    """No reverse needed - the old document FK still exists at this point."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '0001_initial'),
        ('workflows', '0003_add_generic_target'),
    ]

    operations = [
        migrations.RunPython(populate_target_fields, reverse_populate),
    ]
