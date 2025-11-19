"""
Django signals for automatic audit logging.
"""

from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from apps.documents.models import Document, Tag, DocumentTag
from apps.folders.models import Folder, SmartFolder
from apps.audit.models import AuditLog
from apps.audit.utils import (
    get_audit_context,
    model_to_dict,
    log_document_action,
    log_folder_action
)


# ============================================================================
# Document Signals
# ============================================================================

@receiver(pre_save, sender=Document)
def document_pre_save(sender, instance, **kwargs):
    """
    Capture the before state of a document before saving.

    This stores the current state in a temporary attribute for comparison
    in the post_save signal.
    """
    if instance.pk:  # Only for updates, not creates
        try:
            old_instance = Document.objects.get(pk=instance.pk)
            instance._pre_save_state = model_to_dict(
                old_instance,
                exclude_fields=['updated_at', 'created_at']
            )
        except Document.DoesNotExist:
            instance._pre_save_state = None
    else:
        instance._pre_save_state = None


@receiver(post_save, sender=Document)
def document_post_save(sender, instance, created, **kwargs):
    """
    Log document creation or updates.

    For creates: Log CREATE action with full document data
    For updates: Log EDIT action with before/after changes
    """
    context = get_audit_context()

    if created:
        # Document was created
        after_value = model_to_dict(
            instance,
            exclude_fields=['updated_at', 'created_at', 'file']
        )

        log_document_action(
            action='CREATE',
            document=instance,
            after_value=after_value,
            metadata={
                'folder_path': instance.folder.path if instance.folder else None,
                'department': instance.department.name if instance.department else None,
                'file_size_mb': instance.file_size_mb,
            }
        )
    else:
        # Document was updated
        if hasattr(instance, '_pre_save_state') and instance._pre_save_state:
            before_state = instance._pre_save_state
            after_state = model_to_dict(
                instance,
                exclude_fields=['updated_at', 'created_at', 'file']
            )

            # Detect changes
            changed_fields, before_values, after_values = AuditLog.detect_changes(
                before_state,
                after_state
            )

            if changed_fields:  # Only log if there were actual changes
                log_document_action(
                    action='EDIT',
                    document=instance,
                    before_value=before_values,
                    after_value=after_values,
                    changed_fields=changed_fields,
                    metadata={
                        'folder_path': instance.folder.path if instance.folder else None,
                        'department': instance.department.name if instance.department else None,
                    }
                )

        # Clean up temporary attribute
        if hasattr(instance, '_pre_save_state'):
            delattr(instance, '_pre_save_state')


@receiver(post_delete, sender=Document)
def document_post_delete(sender, instance, **kwargs):
    """
    Log document deletion.
    """
    context = get_audit_context()

    before_value = model_to_dict(
        instance,
        exclude_fields=['updated_at', 'created_at', 'file']
    )

    log_document_action(
        action='DELETE',
        document=instance,
        before_value=before_value,
        metadata={
            'folder_path': instance.folder.path if instance.folder else None,
            'department': instance.department.name if instance.department else None,
            'file_size_mb': instance.file_size_mb,
            'was_deleted': instance.is_deleted,
        }
    )


# ============================================================================
# Folder Signals
# ============================================================================

@receiver(pre_save, sender=Folder)
def folder_pre_save(sender, instance, **kwargs):
    """
    Capture the before state of a folder before saving.
    """
    if instance.pk:  # Only for updates, not creates
        try:
            old_instance = Folder.objects.get(pk=instance.pk)
            instance._pre_save_state = model_to_dict(
                old_instance,
                exclude_fields=['updated_at', 'created_at']
            )
        except Folder.DoesNotExist:
            instance._pre_save_state = None
    else:
        instance._pre_save_state = None


@receiver(post_save, sender=Folder)
def folder_post_save(sender, instance, created, **kwargs):
    """
    Log folder creation or updates.

    For creates: Log CREATE action with full folder data
    For updates: Log EDIT action with before/after changes (especially for MOVE operations)
    """
    context = get_audit_context()

    if created:
        # Folder was created
        after_value = model_to_dict(
            instance,
            exclude_fields=['updated_at', 'created_at']
        )

        log_folder_action(
            action='CREATE',
            folder=instance,
            after_value=after_value,
            metadata={
                'path': instance.path,
                'depth': instance.depth,
                'parent_name': instance.parent.name if instance.parent else None,
                'department': instance.department.name if instance.department else None,
            }
        )
    else:
        # Folder was updated
        if hasattr(instance, '_pre_save_state') and instance._pre_save_state:
            before_state = instance._pre_save_state
            after_state = model_to_dict(
                instance,
                exclude_fields=['updated_at', 'created_at']
            )

            # Detect changes
            changed_fields, before_values, after_values = AuditLog.detect_changes(
                before_state,
                after_state
            )

            if changed_fields:  # Only log if there were actual changes
                # Check if this was a move operation (parent changed)
                action = 'MOVE' if 'parent' in changed_fields else 'EDIT'

                log_folder_action(
                    action=action,
                    folder=instance,
                    before_value=before_values,
                    after_value=after_values,
                    changed_fields=changed_fields,
                    metadata={
                        'old_path': before_values.get('path'),
                        'new_path': after_values.get('path'),
                        'department': instance.department.name if instance.department else None,
                    }
                )

        # Clean up temporary attribute
        if hasattr(instance, '_pre_save_state'):
            delattr(instance, '_pre_save_state')


@receiver(post_delete, sender=Folder)
def folder_post_delete(sender, instance, **kwargs):
    """
    Log folder deletion.
    """
    context = get_audit_context()

    before_value = model_to_dict(
        instance,
        exclude_fields=['updated_at', 'created_at']
    )

    log_folder_action(
        action='DELETE',
        folder=instance,
        before_value=before_value,
        metadata={
            'path': instance.path,
            'depth': instance.depth,
            'parent_name': instance.parent.name if instance.parent else None,
            'department': instance.department.name if instance.department else None,
            'had_children': instance.children.exists() if hasattr(instance, 'children') else False,
        }
    )


# ============================================================================
# Tag Signals
# ============================================================================

@receiver(post_save, sender=DocumentTag)
def document_tag_post_save(sender, instance, created, **kwargs):
    """
    Log when tags are added to documents.
    """
    if created:
        context = get_audit_context()

        AuditLog.log_action(
            user=context['user'],
            action='EDIT',
            resource_type='DOCUMENT',
            resource_id=str(instance.document.id),
            resource_name=instance.document.title,
            outcome='SUCCESS',
            ip_address=context['ip_address'],
            user_agent=context['user_agent'],
            metadata={
                'tag_added': instance.tag.name,
                'tag_color': instance.tag.color,
            }
        )


@receiver(post_delete, sender=DocumentTag)
def document_tag_post_delete(sender, instance, **kwargs):
    """
    Log when tags are removed from documents.
    """
    context = get_audit_context()

    AuditLog.log_action(
        user=context['user'],
        action='EDIT',
        resource_type='DOCUMENT',
        resource_id=str(instance.document.id),
        resource_name=instance.document.title,
        outcome='SUCCESS',
        ip_address=context['ip_address'],
        user_agent=context['user_agent'],
        metadata={
            'tag_removed': instance.tag.name,
            'tag_color': instance.tag.color,
        }
    )
