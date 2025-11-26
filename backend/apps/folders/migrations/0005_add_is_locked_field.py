# Generated migration for adding is_locked field to Folder model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('folders', '0004_add_organization_to_folder'),
    ]

    operations = [
        migrations.AddField(
            model_name='folder',
            name='is_locked',
            field=models.BooleanField(
                default=False,
                help_text='If True, folder and its contents cannot be modified or deleted'
            ),
        ),
    ]
