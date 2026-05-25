from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("documents", "0017_add_deleted_by_field"),
    ]

    operations = [
        migrations.AddField(
            model_name="document",
            name="compression_status",
            field=models.CharField(
                choices=[
                    ("PENDING", "Pending"),
                    ("COMPRESSING", "Compressing"),
                    ("COMPRESSED", "Compressed"),
                    ("SKIPPED", "Skipped"),
                    ("FAILED", "Failed"),
                ],
                db_index=True,
                default="PENDING",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="document",
            name="original_size",
            field=models.BigIntegerField(
                blank=True,
                help_text="File size in bytes before compression",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="document",
            name="compression_algorithm",
            field=models.CharField(
                blank=True,
                help_text="Algorithm used: pikepdf, pillow, zip-repack",
                max_length=50,
            ),
        ),
        migrations.AddField(
            model_name="document",
            name="compression_ratio",
            field=models.FloatField(
                blank=True,
                help_text="Compressed / original size ratio (lower is better)",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="document",
            name="compressed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
