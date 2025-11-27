# Generated manually for SharedItemAccess and ShareInvitation models

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("sharing", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Create SharedItemAccess model
        migrations.CreateModel(
            name="SharedItemAccess",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "resource_type",
                    models.CharField(
                        choices=[("DOCUMENT", "Document"), ("FOLDER", "Folder")],
                        max_length=20,
                    ),
                ),
                ("resource_id", models.UUIDField()),
                ("resource_name", models.CharField(max_length=500)),
                ("file_type", models.CharField(blank=True, max_length=50)),
                ("file_size", models.BigIntegerField(default=0)),
                ("folder_path", models.CharField(blank=True, max_length=1000)),
                ("confidentiality_level", models.CharField(blank=True, max_length=20)),
                ("thumbnail_url", models.URLField(blank=True, max_length=500)),
                (
                    "permission_level",
                    models.CharField(
                        choices=[
                            ("VIEW", "View Only"),
                            ("COMMENT", "View and Comment"),
                            ("EDIT", "View and Edit"),
                            ("FULL", "Full Access (including delete)"),
                        ],
                        default="VIEW",
                        max_length=20,
                    ),
                ),
                (
                    "share_source",
                    models.CharField(
                        choices=[
                            ("DIRECT", "Directly shared with user"),
                            ("FOLDER_INHERITED", "Inherited from parent folder"),
                            ("DEPARTMENT", "Department-based access"),
                            ("TEAM", "Team membership"),
                        ],
                        default="DIRECT",
                        max_length=30,
                    ),
                ),
                ("shared_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("expires_at", models.DateTimeField(blank=True, null=True)),
                (
                    "message",
                    models.TextField(blank=True, help_text="Optional message from sharer"),
                ),
                ("is_shortcut", models.BooleanField(db_index=True, default=False)),
                ("shortcut_order", models.IntegerField(default=0)),
                ("first_viewed_at", models.DateTimeField(blank=True, null=True)),
                ("last_accessed_at", models.DateTimeField(blank=True, null=True)),
                ("access_count", models.IntegerField(default=0)),
                ("is_hidden", models.BooleanField(default=False)),
                ("is_notified", models.BooleanField(default=False)),
                ("notification_sent_at", models.DateTimeField(blank=True, null=True)),
                ("is_acknowledged", models.BooleanField(default=False)),
                ("acknowledged_at", models.DateTimeField(blank=True, null=True)),
                ("is_external_share", models.BooleanField(default=False)),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                ("revoked_at", models.DateTimeField(blank=True, null=True)),
                (
                    "recipient",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="shared_with_me",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "shared_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="shared_by_me",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "revoked_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="revoked_shared_access",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Shared Item Access",
                "verbose_name_plural": "Shared Item Accesses",
                "db_table": "shared_item_access",
                "ordering": ["-shared_at"],
            },
        ),
        # Create ShareInvitation model
        migrations.CreateModel(
            name="ShareInvitation",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "resource_type",
                    models.CharField(
                        choices=[("DOCUMENT", "Document"), ("FOLDER", "Folder")],
                        max_length=20,
                    ),
                ),
                ("resource_id", models.UUIDField()),
                ("resource_name", models.CharField(max_length=500)),
                (
                    "permission_level",
                    models.CharField(
                        choices=[
                            ("VIEW", "View Only"),
                            ("COMMENT", "View and Comment"),
                            ("EDIT", "View and Edit"),
                            ("FULL", "Full Access (including delete)"),
                        ],
                        default="VIEW",
                        max_length=20,
                    ),
                ),
                (
                    "message",
                    models.TextField(blank=True, help_text="Message from inviter"),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("PENDING", "Pending"),
                            ("ACCEPTED", "Accepted"),
                            ("DECLINED", "Declined"),
                            ("EXPIRED", "Expired"),
                        ],
                        db_index=True,
                        default="PENDING",
                        max_length=20,
                    ),
                ),
                ("invited_at", models.DateTimeField(auto_now_add=True)),
                ("expires_at", models.DateTimeField(blank=True, null=True)),
                ("responded_at", models.DateTimeField(blank=True, null=True)),
                ("requires_acknowledgement", models.BooleanField(default=False)),
                (
                    "acknowledgement_text",
                    models.TextField(
                        blank=True,
                        help_text="Text user must acknowledge before accepting",
                    ),
                ),
                ("decline_reason", models.TextField(blank=True)),
                (
                    "invited_user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="share_invitations",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "invited_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="sent_share_invitations",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Share Invitation",
                "verbose_name_plural": "Share Invitations",
                "db_table": "share_invitations",
                "ordering": ["-invited_at"],
            },
        ),
        # Add indexes for SharedItemAccess
        migrations.AddIndex(
            model_name="shareditemaccess",
            index=models.Index(
                fields=["recipient", "-shared_at"],
                name="shared_item_recipie_a1b2c3_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="shareditemaccess",
            index=models.Index(
                fields=["recipient", "resource_type", "-shared_at"],
                name="shared_item_recipie_d4e5f6_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="shareditemaccess",
            index=models.Index(
                fields=["recipient", "is_shortcut", "-shared_at"],
                name="shared_item_recipie_g7h8i9_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="shareditemaccess",
            index=models.Index(
                fields=["recipient", "shared_by", "-shared_at"],
                name="shared_item_recipie_j1k2l3_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="shareditemaccess",
            index=models.Index(
                fields=["recipient", "is_active", "-shared_at"],
                name="shared_item_recipie_m4n5o6_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="shareditemaccess",
            index=models.Index(
                fields=["resource_type", "resource_id"],
                name="shared_item_resourc_p7q8r9_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="shareditemaccess",
            index=models.Index(
                fields=["recipient", "is_hidden", "-shared_at"],
                name="shared_item_recipie_s1t2u3_idx",
            ),
        ),
        # Add unique constraint for SharedItemAccess
        migrations.AddConstraint(
            model_name="shareditemaccess",
            constraint=models.UniqueConstraint(
                fields=["recipient", "resource_type", "resource_id"],
                name="unique_recipient_resource",
            ),
        ),
        # Add indexes for ShareInvitation
        migrations.AddIndex(
            model_name="shareinvitation",
            index=models.Index(
                fields=["invited_user", "status", "-invited_at"],
                name="share_invit_invited_v4w5x6_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="shareinvitation",
            index=models.Index(
                fields=["invited_by", "-invited_at"],
                name="share_invit_invited_y7z8a9_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="shareinvitation",
            index=models.Index(
                fields=["resource_type", "resource_id"],
                name="share_invit_resourc_b1c2d3_idx",
            ),
        ),
    ]
