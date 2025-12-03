"""
Data Migration for Department-as-Root Architecture - Phase 3

This migration:
1. Creates DepartmentSettings for all existing departments
2. Ensures all folders have valid department assignments
3. Assigns folders without departments to their owner's department
4. Updates folder paths to include department code prefix
5. Creates default roles if they don't exist
6. Logs migration statistics

This is a reversible migration for safety.
"""

from django.db import migrations
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


def create_department_settings(apps, schema_editor):
    """Create DepartmentSettings for all departments that don't have them."""
    Department = apps.get_model('users', 'Department')
    DepartmentSettings = apps.get_model('users', 'DepartmentSettings')

    departments_without_settings = Department.objects.exclude(
        pk__in=DepartmentSettings.objects.values_list('department_id', flat=True)
    )

    created_count = 0
    for dept in departments_without_settings:
        DepartmentSettings.objects.create(
            department=dept,
            auto_create_structure=False,
            default_retention_days=2555,
            enforce_retention=True,
            notify_on_upload=False,
            notify_managers_on_delete=True,
            notify_on_access_request=True,
            allow_external_sharing=False,
            require_approval_for_sharing=True,
            allow_cross_department_access=True,
            default_share_expiry_days=30,
            require_classification=True,
            auto_index_documents=True,
            require_metadata=True,
            enhanced_audit_logging=False,
        )
        created_count += 1

    logger.info(f"Created DepartmentSettings for {created_count} departments")
    print(f"✓ Created DepartmentSettings for {created_count} departments")


def assign_folders_to_departments(apps, schema_editor):
    """
    Ensure all folders have a department assignment.
    Folders without departments are assigned to their owner's department.
    """
    Folder = apps.get_model('folders', 'Folder')

    # Find folders without department assignment
    folders_without_dept = Folder.objects.filter(department__isnull=True)

    updated_count = 0
    skipped_count = 0

    for folder in folders_without_dept:
        if folder.owner and folder.owner.department:
            folder.department = folder.owner.department
            folder.save(update_fields=['department'])
            updated_count += 1
        elif folder.created_by and folder.created_by.department:
            folder.department = folder.created_by.department
            folder.save(update_fields=['department'])
            updated_count += 1
        else:
            skipped_count += 1
            logger.warning(f"Folder {folder.id} ({folder.name}) has no owner/creator with department")

    logger.info(f"Assigned departments to {updated_count} folders, skipped {skipped_count}")
    print(f"✓ Assigned departments to {updated_count} folders")
    if skipped_count > 0:
        print(f"⚠ Skipped {skipped_count} folders (no owner with department)")


def update_folder_paths_with_department_prefix(apps, schema_editor):
    """
    Update folder paths to include department code prefix.
    Only updates folders that don't already have the department prefix.
    """
    Folder = apps.get_model('folders', 'Folder')

    # Get all folders with departments that need path updates
    folders_to_update = []

    for folder in Folder.objects.filter(department__isnull=False).select_related('department'):
        if folder.department and folder.department.code:
            expected_prefix = f"/{folder.department.code}/"
            if folder.path and not folder.path.startswith(expected_prefix):
                folders_to_update.append(folder)

    updated_count = 0
    for folder in folders_to_update:
        old_path = folder.path
        # Build new path with department prefix
        dept_prefix = f"/{folder.department.code}"
        if old_path and old_path.startswith('/'):
            new_path = dept_prefix + old_path
        else:
            new_path = f"{dept_prefix}/{folder.name}/"

        folder.path = new_path
        folder.save(update_fields=['path'])
        updated_count += 1
        logger.debug(f"Updated folder path: {old_path} -> {new_path}")

    logger.info(f"Updated paths for {updated_count} folders")
    print(f"✓ Updated paths for {updated_count} folders with department prefix")


def create_default_roles(apps, schema_editor):
    """Create default roles if they don't exist."""
    Role = apps.get_model('permissions', 'Role')

    roles_config = [
        {
            'name': 'VIEWER',
            'description': 'Can view and download documents',
            'can_view': True,
            'can_download': True,
            'can_upload': False,
            'can_edit': False,
            'can_delete': False,
            'can_share': False,
            'can_manage_permissions': False,
            'can_view_audit_log': False,
            'can_manage_retention': False,
            'can_manage_classification': False,
        },
        {
            'name': 'EDITOR',
            'description': 'Can view, download, upload, and edit documents',
            'can_view': True,
            'can_download': True,
            'can_upload': True,
            'can_edit': True,
            'can_delete': False,
            'can_share': False,
            'can_manage_permissions': False,
            'can_view_audit_log': False,
            'can_manage_retention': False,
            'can_manage_classification': False,
        },
        {
            'name': 'MANAGER',
            'description': 'Can manage documents, share, and control folder permissions',
            'can_view': True,
            'can_download': True,
            'can_upload': True,
            'can_edit': True,
            'can_delete': True,
            'can_share': True,
            'can_manage_permissions': True,
            'can_view_audit_log': True,
            'can_manage_retention': False,
            'can_manage_classification': False,
        },
        {
            'name': 'ADMIN',
            'description': 'Full system access including retention and classification management',
            'can_view': True,
            'can_download': True,
            'can_upload': True,
            'can_edit': True,
            'can_delete': True,
            'can_share': True,
            'can_manage_permissions': True,
            'can_view_audit_log': True,
            'can_manage_retention': True,
            'can_manage_classification': True,
        },
    ]

    created_count = 0
    for config in roles_config:
        role, created = Role.objects.get_or_create(
            name=config['name'],
            defaults=config
        )
        if created:
            created_count += 1

    logger.info(f"Created {created_count} default roles")
    print(f"✓ Created {created_count} default roles")


def calculate_department_storage(apps, schema_editor):
    """Calculate and update storage usage for each department."""
    Department = apps.get_model('users', 'Department')
    Document = apps.get_model('documents', 'Document')

    from django.db.models import Sum

    updated_count = 0
    for dept in Department.objects.all():
        # Calculate total storage used by documents in this department's folders
        total_storage = Document.objects.filter(
            folder__department=dept,
            is_deleted=False
        ).aggregate(total=Sum('file_size'))['total'] or 0

        if dept.storage_used_bytes != total_storage:
            dept.storage_used_bytes = total_storage
            dept.save(update_fields=['storage_used_bytes'])
            updated_count += 1

    logger.info(f"Updated storage calculations for {updated_count} departments")
    print(f"✓ Updated storage calculations for {updated_count} departments")


def run_data_integrity_checks(apps, schema_editor):
    """Run data integrity checks and log any issues."""
    Folder = apps.get_model('folders', 'Folder')
    Document = apps.get_model('documents', 'Document')
    Department = apps.get_model('users', 'Department')
    DepartmentSettings = apps.get_model('users', 'DepartmentSettings')

    issues = []

    # Check 1: Folders without departments
    folders_no_dept = Folder.objects.filter(department__isnull=True).count()
    if folders_no_dept > 0:
        issues.append(f"Found {folders_no_dept} folders without department assignment")

    # Check 2: Departments without settings
    depts_no_settings = Department.objects.exclude(
        pk__in=DepartmentSettings.objects.values_list('department_id', flat=True)
    ).count()
    if depts_no_settings > 0:
        issues.append(f"Found {depts_no_settings} departments without settings")

    # Check 3: Orphaned documents (in folders without departments)
    orphan_docs = Document.objects.filter(folder__department__isnull=True).count()
    if orphan_docs > 0:
        issues.append(f"Found {orphan_docs} documents in folders without departments")

    # Check 4: Active users without departments
    CustomUser = apps.get_model('users', 'CustomUser')
    users_no_dept = CustomUser.objects.filter(department__isnull=True, is_active=True).count()
    if users_no_dept > 0:
        issues.append(f"Found {users_no_dept} active users without department assignment")

    # Log results
    if issues:
        logger.warning("Data integrity issues found:")
        print("\n⚠ Data integrity issues found:")
        for issue in issues:
            logger.warning(f"  - {issue}")
            print(f"  - {issue}")
    else:
        logger.info("All data integrity checks passed")
        print("\n✓ All data integrity checks passed")

    # Print statistics
    stats = {
        'Total Departments': Department.objects.count(),
        'Active Departments': Department.objects.filter(is_active=True).count(),
        'Total Folders': Folder.objects.count(),
        'Total Documents': Document.objects.count(),
        'Departments with Settings': DepartmentSettings.objects.count(),
    }

    print("\n📊 Migration Statistics:")
    for key, value in stats.items():
        print(f"  {key}: {value}")


def forward_migration(apps, schema_editor):
    """Execute all forward migration steps."""
    print("\n" + "=" * 60)
    print("Department-as-Root Data Migration")
    print("=" * 60 + "\n")

    # Step 1: Create department settings
    print("Step 1: Creating department settings...")
    create_department_settings(apps, schema_editor)

    # Step 2: Assign folders to departments
    print("\nStep 2: Assigning folders to departments...")
    assign_folders_to_departments(apps, schema_editor)

    # Step 3: Update folder paths
    print("\nStep 3: Updating folder paths with department prefix...")
    update_folder_paths_with_department_prefix(apps, schema_editor)

    # Step 4: Create default roles
    print("\nStep 4: Creating default roles...")
    create_default_roles(apps, schema_editor)

    # Step 5: Calculate department storage
    print("\nStep 5: Calculating department storage usage...")
    calculate_department_storage(apps, schema_editor)

    # Step 6: Run integrity checks
    print("\nStep 6: Running data integrity checks...")
    run_data_integrity_checks(apps, schema_editor)

    print("\n" + "=" * 60)
    print("Migration Complete!")
    print("=" * 60 + "\n")


def reverse_migration(apps, schema_editor):
    """
    Reverse the data migration.
    Note: This removes department prefixes from paths but does not
    delete DepartmentSettings (they can be manually removed if needed).
    """
    Folder = apps.get_model('folders', 'Folder')

    print("\n⚠ Reversing Department-as-Root Data Migration...")

    # Remove department prefix from folder paths
    updated_count = 0
    for folder in Folder.objects.filter(department__isnull=False).select_related('department'):
        if folder.department and folder.department.code:
            prefix = f"/{folder.department.code}"
            if folder.path and folder.path.startswith(prefix):
                # Remove the department prefix
                new_path = folder.path[len(prefix):]
                if not new_path.startswith('/'):
                    new_path = '/' + new_path
                folder.path = new_path
                folder.save(update_fields=['path'])
                updated_count += 1

    print(f"✓ Removed department prefix from {updated_count} folder paths")
    print("Note: DepartmentSettings records were not deleted. Remove manually if needed.")


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0017_alter_department_options_and_more'),
        ('folders', '0008_update_smart_folder_icon_color_choices'),
        ('documents', '0017_add_deleted_by_field'),
        ('permissions', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(forward_migration, reverse_migration),
    ]
