# Generated manually to fix incorrect schema

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("retention", "0001_initial"),
        ("documents", "0006_document_account_number_document_customer_id_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Drop the incorrectly structured table
        migrations.RunSQL(
            sql="DROP TABLE IF EXISTS legal_hold_documents CASCADE;",
            reverse_sql="",  # No reverse, will be handled by recreate
        ),
        # Recreate with correct schema (legal_holds uses UUID, documents uses UUID)
        migrations.RunSQL(
            sql="""
                CREATE TABLE legal_hold_documents (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    legal_hold_id UUID NOT NULL REFERENCES legal_holds(id) ON DELETE CASCADE,
                    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
                    added_by_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
                    added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    reason TEXT DEFAULT '',
                    UNIQUE (legal_hold_id, document_id)
                );
                CREATE INDEX legal_hold_documents_legal_hold_id_idx ON legal_hold_documents(legal_hold_id);
                CREATE INDEX legal_hold_documents_document_id_idx ON legal_hold_documents(document_id);
                CREATE INDEX legal_hold_documents_added_by_id_idx ON legal_hold_documents(added_by_id);
            """,
            reverse_sql="DROP TABLE IF EXISTS legal_hold_documents;",
        ),
    ]
