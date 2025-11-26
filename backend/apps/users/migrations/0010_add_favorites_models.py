# Generated migration for Favorites models

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0009_emailotp_phoneotp'),
        ('folders', '0005_add_is_locked_field'),
        ('documents', '0010_fix_nullable_columns'),
    ]

    operations = [
        migrations.CreateModel(
            name='FavoriteFolder',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('folder', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='favorited_by', to='folders.folder')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='favorite_folders', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Favorite Folder',
                'verbose_name_plural': 'Favorite Folders',
                'db_table': 'user_favorite_folders',
                'ordering': ['-created_at'],
                'unique_together': {('user', 'folder')},
            },
        ),
        migrations.CreateModel(
            name='FavoriteDocument',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('document', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='favorited_by', to='documents.document')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='favorite_documents', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Favorite Document',
                'verbose_name_plural': 'Favorite Documents',
                'db_table': 'user_favorite_documents',
                'ordering': ['-created_at'],
                'unique_together': {('user', 'document')},
            },
        ),
    ]
