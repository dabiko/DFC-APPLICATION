from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('system', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='systemsettings',
            name='maintenance_started_at',
            field=models.DateTimeField(
                blank=True,
                null=True,
                help_text='Timestamp when maintenance mode was last activated',
            ),
        ),
        migrations.AddField(
            model_name='systemsettings',
            name='maintenance_started_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='maintenance_activations',
                to=settings.AUTH_USER_MODEL,
                help_text='User who activated maintenance mode',
            ),
        ),
        migrations.AddField(
            model_name='systemsettings',
            name='maintenance_estimated_end',
            field=models.DateTimeField(
                blank=True,
                null=True,
                help_text='Estimated end time for the maintenance window (shown to users)',
            ),
        ),
    ]
