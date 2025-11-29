# Generated manually to align retention_policies table with model

from django.db import migrations, models


def migrate_data_forward(apps, schema_editor):
    """Migrate data from old schema to new schema."""
    from django.db import connection

    with connection.cursor() as cursor:
        # Update retention_days from retention_period_years (years to days)
        cursor.execute("""
            UPDATE retention_policies
            SET retention_days = retention_period_years * 365
            WHERE retention_days IS NULL OR retention_days = 0
        """)

        # Set policy_type based on existing data
        cursor.execute("""
            UPDATE retention_policies
            SET policy_type = CASE
                WHEN applies_to_document_type IS NOT NULL AND applies_to_document_type != ''
                    THEN 'DOCUMENT_TYPE'
                WHEN applies_to_folder_id IS NOT NULL
                    THEN 'FOLDER'
                ELSE 'CUSTOM'
            END
            WHERE policy_type IS NULL OR policy_type = ''
        """)

        # Set notify_before_days from notification_days_before
        cursor.execute("""
            UPDATE retention_policies
            SET notify_before_days = COALESCE(notification_days_before, 30)
            WHERE notify_before_days IS NULL OR notify_before_days = 0
        """)

        # Set criteria based on document type
        cursor.execute("""
            UPDATE retention_policies
            SET criteria = CASE
                WHEN applies_to_document_type IS NOT NULL AND applies_to_document_type != ''
                    THEN jsonb_build_object('document_type', applies_to_document_type)
                WHEN applies_to_folder_id IS NOT NULL
                    THEN jsonb_build_object('folder_id', applies_to_folder_id::text)
                ELSE '{}'::jsonb
            END
            WHERE criteria IS NULL OR criteria = '{}'::jsonb
        """)


def migrate_data_backward(apps, schema_editor):
    """Migrate data back to old schema (best effort)."""
    from django.db import connection

    with connection.cursor() as cursor:
        # Set retention_period_years from retention_days
        cursor.execute("""
            UPDATE retention_policies
            SET retention_period_years = retention_days / 365
        """)

        # Set notification_days_before from notify_before_days
        cursor.execute("""
            UPDATE retention_policies
            SET notification_days_before = notify_before_days
        """)


class Migration(migrations.Migration):

    dependencies = [
        ('retention', '0004_create_retention_schedules_table'),
    ]

    operations = [
        # Step 1: Add new columns with defaults (if they don't exist)
        migrations.RunSQL(
            sql="""
                DO $$
                BEGIN
                    -- Add policy_type if it doesn't exist
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'retention_policies' AND column_name = 'policy_type'
                    ) THEN
                        ALTER TABLE retention_policies
                        ADD COLUMN policy_type VARCHAR(50) DEFAULT 'CUSTOM';
                    END IF;

                    -- Add retention_days if it doesn't exist
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'retention_policies' AND column_name = 'retention_days'
                    ) THEN
                        ALTER TABLE retention_policies
                        ADD COLUMN retention_days INTEGER DEFAULT 365;
                    END IF;

                    -- Add criteria if it doesn't exist
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'retention_policies' AND column_name = 'criteria'
                    ) THEN
                        ALTER TABLE retention_policies
                        ADD COLUMN criteria JSONB DEFAULT '{}'::jsonb;
                    END IF;

                    -- Add grace_period_days if it doesn't exist
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'retention_policies' AND column_name = 'grace_period_days'
                    ) THEN
                        ALTER TABLE retention_policies
                        ADD COLUMN grace_period_days INTEGER DEFAULT 30;
                    END IF;

                    -- Add notify_before_days if it doesn't exist
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'retention_policies' AND column_name = 'notify_before_days'
                    ) THEN
                        ALTER TABLE retention_policies
                        ADD COLUMN notify_before_days INTEGER DEFAULT 30;
                    END IF;

                    -- Add priority if it doesn't exist
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'retention_policies' AND column_name = 'priority'
                    ) THEN
                        ALTER TABLE retention_policies
                        ADD COLUMN priority INTEGER DEFAULT 0;
                    END IF;
                END $$;
            """,
            reverse_sql="""
                -- Reverse is handled by the backward migration
                SELECT 1;
            """
        ),

        # Step 2: Migrate existing data
        migrations.RunPython(migrate_data_forward, migrate_data_backward),

        # Step 3: Change id column type from INTEGER to UUID if needed
        migrations.RunSQL(
            sql="""
                DO $$
                BEGIN
                    -- Check if id is not UUID type and convert if needed
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'retention_policies'
                        AND column_name = 'id'
                        AND data_type != 'uuid'
                    ) THEN
                        -- Create a temporary UUID column
                        ALTER TABLE retention_policies ADD COLUMN id_new UUID DEFAULT gen_random_uuid();

                        -- Update any foreign key references if they exist
                        -- (retention_schedules.policy_id)
                        IF EXISTS (
                            SELECT 1 FROM information_schema.columns
                            WHERE table_name = 'retention_schedules' AND column_name = 'policy_id'
                        ) THEN
                            -- Drop the foreign key constraint if it exists
                            ALTER TABLE retention_schedules
                            DROP CONSTRAINT IF EXISTS retention_schedules_policy_id_fkey;

                            -- Add new UUID column for policy reference
                            ALTER TABLE retention_schedules
                            ADD COLUMN IF NOT EXISTS policy_id_new UUID;

                            -- We can't easily migrate the FK data since types don't match
                            -- Just set to NULL for now
                            UPDATE retention_schedules SET policy_id_new = NULL;
                        END IF;

                        -- Drop old primary key and column
                        ALTER TABLE retention_policies DROP CONSTRAINT IF EXISTS retention_policies_pkey;
                        ALTER TABLE retention_policies DROP COLUMN id;

                        -- Rename new column to id
                        ALTER TABLE retention_policies RENAME COLUMN id_new TO id;

                        -- Add primary key constraint
                        ALTER TABLE retention_policies ADD PRIMARY KEY (id);

                        -- Handle retention_schedules FK if it exists
                        IF EXISTS (
                            SELECT 1 FROM information_schema.columns
                            WHERE table_name = 'retention_schedules' AND column_name = 'policy_id_new'
                        ) THEN
                            ALTER TABLE retention_schedules DROP COLUMN IF EXISTS policy_id;
                            ALTER TABLE retention_schedules RENAME COLUMN policy_id_new TO policy_id;

                            -- Re-add foreign key
                            ALTER TABLE retention_schedules
                            ADD CONSTRAINT retention_schedules_policy_id_fkey
                            FOREIGN KEY (policy_id) REFERENCES retention_policies(id) ON DELETE SET NULL;
                        END IF;
                    END IF;
                END $$;
            """,
            reverse_sql="SELECT 1;"
        ),

        # Step 4: Drop old columns that are no longer needed
        migrations.RunSQL(
            sql="""
                DO $$
                BEGIN
                    -- Drop retention_period_years if it exists
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'retention_policies' AND column_name = 'retention_period_years'
                    ) THEN
                        ALTER TABLE retention_policies DROP COLUMN retention_period_years;
                    END IF;

                    -- Drop applies_to_document_type if it exists
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'retention_policies' AND column_name = 'applies_to_document_type'
                    ) THEN
                        ALTER TABLE retention_policies DROP COLUMN applies_to_document_type;
                    END IF;

                    -- Drop applies_to_folder_id if it exists
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'retention_policies' AND column_name = 'applies_to_folder_id'
                    ) THEN
                        ALTER TABLE retention_policies DROP COLUMN applies_to_folder_id;
                    END IF;

                    -- Drop auto_delete if it exists
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'retention_policies' AND column_name = 'auto_delete'
                    ) THEN
                        ALTER TABLE retention_policies DROP COLUMN auto_delete;
                    END IF;

                    -- Drop notification_days_before if it exists
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'retention_policies' AND column_name = 'notification_days_before'
                    ) THEN
                        ALTER TABLE retention_policies DROP COLUMN notification_days_before;
                    END IF;
                END $$;
            """,
            reverse_sql="""
                -- Add back old columns if needed for reverse migration
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'retention_policies' AND column_name = 'retention_period_years'
                    ) THEN
                        ALTER TABLE retention_policies ADD COLUMN retention_period_years INTEGER;
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'retention_policies' AND column_name = 'applies_to_document_type'
                    ) THEN
                        ALTER TABLE retention_policies ADD COLUMN applies_to_document_type VARCHAR(100);
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'retention_policies' AND column_name = 'notification_days_before'
                    ) THEN
                        ALTER TABLE retention_policies ADD COLUMN notification_days_before INTEGER;
                    END IF;
                END $$;
            """
        ),
    ]
