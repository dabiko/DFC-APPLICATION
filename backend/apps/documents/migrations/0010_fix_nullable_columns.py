# Generated manually to fix NOT NULL constraints on documents table
# These columns need to be nullable because document is created first, then file is uploaded to MinIO

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("documents", "0009_update_document_type_choices"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE documents ALTER COLUMN file DROP NOT NULL;
                ALTER TABLE documents ALTER COLUMN minio_bucket DROP NOT NULL;
                ALTER TABLE documents ALTER COLUMN minio_object_key DROP NOT NULL;
                ALTER TABLE documents ALTER COLUMN minio_etag DROP NOT NULL;
                ALTER TABLE documents ALTER COLUMN extracted_text DROP NOT NULL;
                ALTER TABLE documents ALTER COLUMN extracted_text SET DEFAULT '';
            """,
            reverse_sql="""
                UPDATE documents SET file = '' WHERE file IS NULL;
                UPDATE documents SET minio_bucket = '' WHERE minio_bucket IS NULL;
                UPDATE documents SET minio_object_key = '' WHERE minio_object_key IS NULL;
                UPDATE documents SET minio_etag = '' WHERE minio_etag IS NULL;
                UPDATE documents SET extracted_text = '' WHERE extracted_text IS NULL;
                ALTER TABLE documents ALTER COLUMN file SET NOT NULL;
                ALTER TABLE documents ALTER COLUMN minio_bucket SET NOT NULL;
                ALTER TABLE documents ALTER COLUMN minio_object_key SET NOT NULL;
                ALTER TABLE documents ALTER COLUMN minio_etag SET NOT NULL;
                ALTER TABLE documents ALTER COLUMN extracted_text SET NOT NULL;
            """,
        ),
    ]
