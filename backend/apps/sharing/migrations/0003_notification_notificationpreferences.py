# Generated migration for Notification and NotificationPreferences models

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('sharing', '0002_shareditemaccess_shareinvitation'),
    ]

    operations = [
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('notification_type', models.CharField(choices=[
                    ('SHARE_RECEIVED', 'Document/Folder shared with you'),
                    ('SHARE_INVITATION', 'Share invitation received'),
                    ('ACCESS_REQUEST', 'Access request submitted'),
                    ('ACCESS_GRANTED', 'Access request approved'),
                    ('ACCESS_DENIED', 'Access request denied'),
                    ('SHARE_REVOKED', 'Share access revoked'),
                    ('SHARE_EXPIRING', 'Share about to expire'),
                    ('INVITATION_ACCEPTED', 'Share invitation accepted'),
                    ('INVITATION_DECLINED', 'Share invitation declined'),
                    ('WEEKLY_DIGEST', 'Weekly sharing digest'),
                ], max_length=30)),
                ('title', models.CharField(max_length=255)),
                ('message', models.TextField()),
                ('resource_type', models.CharField(blank=True, max_length=20)),
                ('resource_id', models.UUIDField(blank=True, null=True)),
                ('resource_name', models.CharField(blank=True, max_length=500)),
                ('action_url', models.CharField(blank=True, max_length=500)),
                ('is_read', models.BooleanField(db_index=True, default=False)),
                ('read_at', models.DateTimeField(blank=True, null=True)),
                ('email_sent', models.BooleanField(default=False)),
                ('email_sent_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('actor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='triggered_notifications', to=settings.AUTH_USER_MODEL)),
                ('recipient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Notification',
                'verbose_name_plural': 'Notifications',
                'db_table': 'notifications',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='NotificationPreferences',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('in_app_share_received', models.BooleanField(default=True, help_text='Notify when someone shares a document/folder with me')),
                ('in_app_share_invitation', models.BooleanField(default=True, help_text='Notify when I receive a share invitation')),
                ('in_app_access_request', models.BooleanField(default=True, help_text='Notify when someone requests access to my shared items')),
                ('in_app_share_expiring', models.BooleanField(default=True, help_text='Notify when shared access is about to expire')),
                ('email_share_received', models.BooleanField(default=True, help_text='Send email when someone shares a document/folder with me')),
                ('email_share_invitation', models.BooleanField(default=True, help_text='Send email when I receive a share invitation')),
                ('email_access_request', models.BooleanField(default=True, help_text='Send email when someone requests access to my shared items')),
                ('email_share_expiring', models.BooleanField(default=False, help_text='Send email when shared access is about to expire')),
                ('weekly_digest_enabled', models.BooleanField(default=True, help_text='Receive weekly email summary of sharing activity')),
                ('weekly_digest_day', models.IntegerField(default=1, help_text='Day of week for weekly digest (0=Sunday, 1=Monday, etc.)')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='notification_preferences', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Notification Preferences',
                'verbose_name_plural': 'Notification Preferences',
                'db_table': 'notification_preferences',
            },
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['recipient', '-created_at'], name='notificatio_recipie_a52b88_idx'),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['recipient', 'is_read', '-created_at'], name='notificatio_recipie_e3f95b_idx'),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['notification_type', '-created_at'], name='notificatio_notific_4c79e6_idx'),
        ),
    ]
