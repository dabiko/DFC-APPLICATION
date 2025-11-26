# Generated manually to sync LegalHold model with existing database schema
# The database was created with a different schema than the initial migration defined.
# This migration updates Django's state to match the actual database structure.

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("retention", "0002_fix_legal_hold_documents_schema"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # This migration doesn't change the database - it only syncs Django's model state
        # with the existing DB schema. The actual table already has these columns.
        migrations.SeparateDatabaseAndState(
            state_operations=[
                # Remove old fields from state
                migrations.RemoveField(
                    model_name='legalhold',
                    name='case_name',
                ),
                migrations.RemoveField(
                    model_name='legalhold',
                    name='description',
                ),
                migrations.RemoveField(
                    model_name='legalhold',
                    name='placed_by',
                ),
                migrations.RemoveField(
                    model_name='legalhold',
                    name='placed_at',
                ),
                migrations.RemoveField(
                    model_name='legalhold',
                    name='notes',
                ),
                # Change id from UUID to BigAutoField
                migrations.AlterField(
                    model_name='legalhold',
                    name='id',
                    field=models.BigAutoField(primary_key=True, serialize=False),
                ),
                # Add new fields to state
                migrations.AddField(
                    model_name='legalhold',
                    name='title',
                    field=models.CharField(max_length=500),
                ),
                migrations.AddField(
                    model_name='legalhold',
                    name='reason',
                    field=models.TextField(),
                ),
                migrations.AddField(
                    model_name='legalhold',
                    name='start_date',
                    field=models.DateField(),
                ),
                migrations.AddField(
                    model_name='legalhold',
                    name='end_date',
                    field=models.DateField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name='legalhold',
                    name='created_by',
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='created_legal_holds',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                migrations.AddField(
                    model_name='legalhold',
                    name='created_at',
                    field=models.DateTimeField(auto_now_add=True),
                ),
                migrations.AddField(
                    model_name='legalhold',
                    name='updated_at',
                    field=models.DateTimeField(auto_now=True),
                ),
                # Update ordering
                migrations.AlterModelOptions(
                    name='legalhold',
                    options={
                        'ordering': ['-created_at'],
                        'verbose_name': 'Legal Hold',
                        'verbose_name_plural': 'Legal Holds',
                    },
                ),
            ],
            database_operations=[
                # No database operations - table already has correct schema
            ],
        ),
    ]
