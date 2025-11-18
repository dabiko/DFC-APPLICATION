"""
Utility functions for folder management.
"""
from apps.folders.models import Folder, FolderTemplate
import logging

logger = logging.getLogger(__name__)


def instantiate_template(template, parent_folder=None, owner=None, department=None):
    """
    Create folders from a template.

    Args:
        template: FolderTemplate instance
        parent_folder: Parent folder to create structure under (optional)
        owner: User who owns the created folders
        department: Department for the created folders

    Returns:
        Root folder of the created structure

    Template structure format:
    {
        "folders": [
            {
                "name": "Projects",
                "confidentiality": "INTERNAL",
                "description": "Project files",
                "children": [
                    {
                        "name": "Active",
                        "confidentiality": "CONFIDENTIAL"
                    },
                    {
                        "name": "Archive",
                        "confidentiality": "INTERNAL"
                    }
                ]
            }
        ]
    }
    """

    def create_folder_tree(folder_data_list, parent=None):
        """
        Recursively create folder tree from structure data.

        Args:
            folder_data_list: List of folder dictionaries
            parent: Parent Folder instance

        Returns:
            List of created Folder instances
        """
        created_folders = []

        for folder_data in folder_data_list:
            # Create folder
            folder = Folder.objects.create(
                name=folder_data['name'],
                parent=parent,
                owner=owner,
                department=department,
                created_by=owner,
                confidentiality_level=folder_data.get('confidentiality_level', 'INTERNAL'),
                description=folder_data.get('description', '')
            )

            logger.info(f"Created folder from template: {folder.id} ({folder.path})")
            created_folders.append(folder)

            # Create children recursively
            if 'children' in folder_data and folder_data['children']:
                create_folder_tree(folder_data['children'], parent=folder)

        return created_folders

    # Extract folder structure from template
    structure = template.structure

    if 'folders' not in structure:
        raise ValueError("Template structure must contain 'folders' key")

    # Create root folder(s)
    created_folders = create_folder_tree(structure['folders'], parent=parent_folder)

    # Return first created folder as root
    if created_folders:
        return created_folders[0]

    return None


def get_folder_size(folder):
    """
    Calculate total size of all documents in a folder and its subfolders.

    Args:
        folder: Folder instance

    Returns:
        Dictionary with size information
    """
    from apps.documents.models import Document
    from django.db.models import Sum

    # Get all documents in this folder and descendants
    descendants = folder.get_descendants(include_self=True)
    folder_ids = [f.id for f in descendants]

    stats = Document.objects.filter(
        folder_id__in=folder_ids,
        is_deleted=False
    ).aggregate(
        total_size=Sum('file_size'),
        total_documents=models.Count('id')
    )

    total_size = stats['total_size'] or 0
    total_docs = stats['total_documents'] or 0

    return {
        'total_size_bytes': total_size,
        'total_size_mb': round(total_size / (1024 * 1024), 2),
        'total_size_gb': round(total_size / (1024 ** 3), 2),
        'total_documents': total_docs,
    }


def validate_folder_move(folder, new_parent):
    """
    Validate if a folder can be moved to a new parent.

    Args:
        folder: Folder to move
        new_parent: New parent folder (can be None for root)

    Returns:
        Tuple (is_valid: bool, error_message: str)
    """
    # Cannot move to itself
    if new_parent and folder.id == new_parent.id:
        return False, "Cannot move folder to itself"

    # Cannot move to descendant
    if new_parent and folder.is_ancestor_of(new_parent):
        return False, "Cannot move folder to its own descendant"

    # Check for duplicate name in new location
    if Folder.objects.filter(parent=new_parent, name=folder.name).exclude(id=folder.id).exists():
        return False, f"A folder named '{folder.name}' already exists in the destination"

    return True, ""


def copy_folder_structure(source_folder, dest_parent, owner, department):
    """
    Copy a folder and all its contents to a new location.

    Args:
        source_folder: Folder to copy
        dest_parent: Parent folder for the copy
        owner: Owner of the copied folders
        department: Department for the copied folders

    Returns:
        The copied root folder
    """

    def copy_folder_recursive(folder, parent):
        """Recursively copy folder and children"""
        # Create copy of current folder
        folder_copy = Folder.objects.create(
            name=folder.name,
            parent=parent,
            owner=owner,
            department=department,
            created_by=owner,
            confidentiality_level=folder.confidentiality_level,
            description=folder.description
        )

        # Copy children recursively
        for child in folder.children.all():
            copy_folder_recursive(child, folder_copy)

        return folder_copy

    copied_folder = copy_folder_recursive(source_folder, dest_parent)

    logger.info(
        f"Folder structure copied: {source_folder.id} -> {copied_folder.id}"
    )

    return copied_folder


def get_folder_permissions_summary(folder, user):
    """
    Get a summary of user's permissions for a folder.

    Args:
        folder: Folder instance
        user: User instance

    Returns:
        Dictionary with permission information
    """
    can_view = (
        user.is_staff or
        folder.department == user.department
    )

    can_edit = (
        user.is_staff or
        folder.owner == user
    )

    can_delete = (
        user.is_staff or
        folder.owner == user
    )

    can_add_documents = (
        user.is_staff or
        folder.department == user.department
    )

    return {
        'can_view': can_view,
        'can_edit': can_edit,
        'can_delete': can_delete,
        'can_add_documents': can_add_documents,
        'is_owner': folder.owner == user,
        'is_staff': user.is_staff,
    }
