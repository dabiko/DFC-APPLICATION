# Generated migration for favorite collections

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0010_add_favorites_models'),
    ]

    operations = [
        # Create FavoriteCollection table
        migrations.CreateModel(
            name='FavoriteCollection',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True, default='')),
                ('color', models.CharField(default='blue', max_length=20)),
                ('icon', models.CharField(default='folder', max_length=50)),
                ('is_shared', models.BooleanField(default=False)),
                ('position', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('owner', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='owned_collections',
                    to=settings.AUTH_USER_MODEL
                )),
                ('shared_with', models.ManyToManyField(
                    blank=True,
                    related_name='shared_collections',
                    to=settings.AUTH_USER_MODEL
                )),
            ],
            options={
                'verbose_name': 'Favorite Collection',
                'verbose_name_plural': 'Favorite Collections',
                'db_table': 'user_favorite_collections',
                'ordering': ['position', 'name'],
            },
        ),
        # Add collection and position fields to FavoriteFolder
        migrations.AddField(
            model_name='favoritefolder',
            name='collection',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='folder_favorites',
                to='users.favoritecollection'
            ),
        ),
        migrations.AddField(
            model_name='favoritefolder',
            name='position',
            field=models.IntegerField(default=0),
        ),
        # Add collection and position fields to FavoriteDocument
        migrations.AddField(
            model_name='favoritedocument',
            name='collection',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='document_favorites',
                to='users.favoritecollection'
            ),
        ),
        migrations.AddField(
            model_name='favoritedocument',
            name='position',
            field=models.IntegerField(default=0),
        ),
        # Update ordering for FavoriteFolder
        migrations.AlterModelOptions(
            name='favoritefolder',
            options={
                'ordering': ['collection', 'position', '-created_at'],
                'verbose_name': 'Favorite Folder',
                'verbose_name_plural': 'Favorite Folders'
            },
        ),
        # Update ordering for FavoriteDocument
        migrations.AlterModelOptions(
            name='favoritedocument',
            options={
                'ordering': ['collection', 'position', '-created_at'],
                'verbose_name': 'Favorite Document',
                'verbose_name_plural': 'Favorite Documents'
            },
        ),
    ]
