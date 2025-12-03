"""
Signals for the sharing app.

Automatically creates SharedItemAccess records when documents/folders
are shared through various mechanisms:
- Direct document shares (Share model)
- Folder permission grants
- Department-based access
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone


@receiver(post_save, sender='sharing.Share')
def create_shared_item_access_from_share(sender, instance, created, **kwargs):
    """
    When a Share (external link share) is created with recipient emails,
    we can optionally create SharedItemAccess for internal users.

    This signal handles the case where internal users are among the recipients.
    """
    from django.contrib.auth import get_user_model
    from apps.sharing.models import SharedItemAccess

    User = get_user_model()

    if not created:
        return

    # Check if any recipient emails belong to internal users
    if not instance.recipient_emails:
        return

    # Find internal users by email
    internal_users = User.objects.filter(
        email__in=instance.recipient_emails,
        is_active=True
    )

    # Permission mapping from Share to SharedItemAccess
    permission_map = {
        'VIEW_ONLY': SharedItemAccess.PermissionLevel.VIEW,
        'VIEW_DOWNLOAD': SharedItemAccess.PermissionLevel.VIEW,
        'VIEW_DOWNLOAD_COMMENT': SharedItemAccess.PermissionLevel.COMMENT,
    }

    permission_level = permission_map.get(
        instance.permission,
        SharedItemAccess.PermissionLevel.VIEW
    )

    # Create SharedItemAccess for each internal user
    for user in internal_users:
        if user.id == instance.created_by_id:
            continue  # Don't share with self

        SharedItemAccess.create_share(
            document=instance.document,
            recipient=user,
            shared_by=instance.created_by,
            permission_level=permission_level,
            expires_at=instance.expires_at,
            share_source=SharedItemAccess.ShareSource.DIRECT,
        )


@receiver(post_save, sender='permissions.FolderPermission')
def create_shared_item_access_from_folder_permission(sender, instance, created, **kwargs):
    """
    When a FolderPermission is granted, create a SharedItemAccess record.

    This ensures that users can see shared folders in their "Shared with Me" view.
    """
    from apps.sharing.models import SharedItemAccess

    if not created:
        return

    # Skip if this is the owner's own permission
    if hasattr(instance, 'folder') and instance.folder:
        if instance.folder.created_by_id == instance.user_id:
            return

    # Determine permission level from FolderPermission.permission_level
    # FolderPermission has permission levels: NO_ACCESS, VIEW_ONLY, VIEW_DOWNLOAD, CONTRIBUTE, EDIT, FULL_CONTROL
    from apps.permissions.models import FolderPermission

    if instance.permission_level == FolderPermission.FULL_CONTROL:
        permission_level = SharedItemAccess.PermissionLevel.FULL
    elif instance.permission_level in [FolderPermission.EDIT, FolderPermission.CONTRIBUTE]:
        permission_level = SharedItemAccess.PermissionLevel.EDIT
    else:
        permission_level = SharedItemAccess.PermissionLevel.VIEW

    # Get the folder owner as the "shared_by" user
    shared_by = instance.folder.created_by if hasattr(instance, 'folder') else None

    if shared_by and instance.user:
        SharedItemAccess.create_share(
            folder=instance.folder,
            recipient=instance.user,
            shared_by=shared_by,
            permission_level=permission_level,
            share_source=SharedItemAccess.ShareSource.FOLDER_INHERITED,
        )


@receiver(post_delete, sender='permissions.FolderPermission')
def revoke_shared_item_access_on_permission_delete(sender, instance, **kwargs):
    """
    When a FolderPermission is deleted, revoke the SharedItemAccess.
    """
    from apps.sharing.models import SharedItemAccess

    if not hasattr(instance, 'folder') or not instance.folder:
        return

    # Find and deactivate the corresponding SharedItemAccess
    SharedItemAccess.objects.filter(
        recipient=instance.user,
        resource_type=SharedItemAccess.ResourceType.FOLDER,
        resource_id=instance.folder.id,
        share_source=SharedItemAccess.ShareSource.FOLDER_INHERITED,
    ).update(
        is_active=False,
        revoked_at=timezone.now()
    )


def sync_shared_item_access_for_document(document, action='create'):
    """
    Utility function to sync SharedItemAccess when document permissions change.

    This can be called from document views or other places where
    document access is modified.

    Args:
        document: The Document instance
        action: 'create' or 'revoke'
    """
    from apps.sharing.models import SharedItemAccess

    if action == 'revoke':
        # Revoke all SharedItemAccess for this document
        SharedItemAccess.objects.filter(
            resource_type=SharedItemAccess.ResourceType.DOCUMENT,
            resource_id=document.id,
        ).update(
            is_active=False,
            revoked_at=timezone.now()
        )


def update_shared_item_metadata(resource_type, resource_id, **updates):
    """
    Update denormalized metadata in SharedItemAccess records.

    Call this when a document or folder is renamed, moved, or
    has its confidentiality level changed.

    Args:
        resource_type: 'DOCUMENT' or 'FOLDER'
        resource_id: UUID of the resource
        **updates: Fields to update (resource_name, folder_path, confidentiality_level, etc.)
    """
    from apps.sharing.models import SharedItemAccess

    allowed_fields = [
        'resource_name', 'folder_path', 'confidentiality_level',
        'file_type', 'file_size', 'thumbnail_url'
    ]

    update_dict = {k: v for k, v in updates.items() if k in allowed_fields}

    if update_dict:
        SharedItemAccess.objects.filter(
            resource_type=resource_type,
            resource_id=resource_id,
        ).update(**update_dict)
