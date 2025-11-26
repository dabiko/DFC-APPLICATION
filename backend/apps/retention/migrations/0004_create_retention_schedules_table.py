# Generated manually to create missing retention_schedules table

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("retention", "0003_sync_legalhold_with_db"),
        ("documents", "0006_document_account_number_document_customer_id_and_more"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                CREATE TABLE IF NOT EXISTS retention_schedules (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    document_id UUID NOT NULL UNIQUE REFERENCES documents(id) ON DELETE CASCADE,
                    policy_id BIGINT REFERENCES retention_policies(id) ON DELETE SET NULL,
                    retention_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
                    notification_date TIMESTAMP WITH TIME ZONE NOT NULL,
                    deletion_date TIMESTAMP WITH TIME ZONE NOT NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                    notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                    deleted_at TIMESTAMP WITH TIME ZONE
                );

                CREATE INDEX IF NOT EXISTS retention_schedules_status_deletion_idx
                    ON retention_schedules(status, deletion_date);
                CREATE INDEX IF NOT EXISTS retention_schedules_status_notification_idx
                    ON retention_schedules(status, notification_date);
                CREATE INDEX IF NOT EXISTS retention_schedules_notification_sent_idx
                    ON retention_schedules(notification_sent, notification_date);
                CREATE INDEX IF NOT EXISTS retention_schedules_document_id_idx
                    ON retention_schedules(document_id);
                CREATE INDEX IF NOT EXISTS retention_schedules_policy_id_idx
                    ON retention_schedules(policy_id);
            """,
            reverse_sql="DROP TABLE IF EXISTS retention_schedules CASCADE;",
        ),
    ]
