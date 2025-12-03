"""
Migration for Department-as-Root Architecture - Folder Constraints

Updates:
- Changes unique_together from ['parent', 'name'] to ['parent', 'name', 'department']
- Adds new composite indexes for department-based queries
- Updates folder paths to include department code prefix

Note: This migration includes a data migration to update existing folder paths.
"""

from django.db import migrations, models


def update_folder_paths(apps, schema_editor):
    """
    Update all folder paths to include department code prefix.

    Old format: /{FolderName}/{SubFolder}/
    New format: /{DEPT_CODE}/{FolderName}/{SubFolder}/
    """
    Folder = apps.get_model('folders', 'Folder')

    # Process root folders first (parent is null)
    root_folders = Folder.objects.filter(parent__isnull=True)

    for folder in root_folders:
        if folder.department:
            old_path = folder.path
            # Skip if already has department prefix
            if old_path.startswith(f'/{folder.department.code}/'):
                continue

            # Create new path with department prefix
            # Remove leading slash, add department code
            folder_name = old_path.strip('/').split('/')[0] if old_path else folder.name
            new_path = f'/{folder.department.code}/{folder_name}/'
            folder.path = new_path
            folder.save(update_fields=['path'])

            # Update all descendant folders
            # Find folders whose paths start with the old path
            descendants = Folder.objects.filter(
                path__startswith=old_path
            ).exclude(id=folder.id)

            for desc in descendants:
                # Replace old root with new root
                desc.path = desc.path.replace(old_path, new_path, 1)
                desc.save(update_fields=['path'])


def reverse_folder_paths(apps, schema_editor):
    """
    Reverse migration: Remove department code prefix from paths.

    This is a best-effort reversal - may not perfectly restore original paths
    if they were complex.
    """
    Folder = apps.get_model('folders', 'Folder')

    # Process root folders
    root_folders = Folder.objects.filter(parent__isnull=True)

    for folder in root_folders:
        if folder.department and folder.path.startswith(f'/{folder.department.code}/'):
            # Remove department code from path
            path_parts = folder.path.strip('/').split('/')
            if len(path_parts) > 1:
                # Remove first part (department code)
                new_path = '/' + '/'.join(path_parts[1:]) + '/'
                old_path = folder.path
                folder.path = new_path
                folder.save(update_fields=['path'])

                # Update descendants
                descendants = Folder.objects.filter(
                    path__startswith=old_path
                ).exclude(id=folder.id)

                for desc in descendants:
                    desc.path = desc.path.replace(old_path, new_path, 1)
                    desc.save(update_fields=['path'])


class Migration(migrations.Migration):

    dependencies = [
        ('folders', '0008_update_smart_folder_icon_color_choices'),
        ('users', '0015_department_as_root_fields'),
    ]

    operations = [
        # First, remove the old unique_together constraint
        migrations.AlterUniqueTogether(
            name='folder',
            unique_together=set(),
        ),

        # Add the new unique_together constraint with department
        migrations.AlterUniqueTogether(
            name='folder',
            unique_together={('parent', 'name', 'department')},
        ),

        # Add new composite indexes for department-based queries
        migrations.AddIndex(
            model_name='folder',
            index=models.Index(
                fields=['department', 'parent'],
                name='folder_dept_parent_idx'
            ),
        ),
        migrations.AddIndex(
            model_name='folder',
            index=models.Index(
                fields=['department', 'is_deleted'],
                name='folder_dept_deleted_idx'
            ),
        ),

        # Update existing folder paths to include department prefix
        migrations.RunPython(
            update_folder_paths,
            reverse_code=reverse_folder_paths
        ),
    ]
