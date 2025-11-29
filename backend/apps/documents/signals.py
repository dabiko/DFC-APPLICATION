"""
Signal handlers for Document model.

Handles automatic Elasticsearch indexing when documents are created,
updated, or deleted. Also handles audit logging and other post-save actions.
"""

from django.db.models.signals import post_save, post_delete, pre_delete
from django.dispatch import receiver
from django.db import transaction
import logging

from apps.documents.models import Document, DocumentTag, DocumentShortcut, RecentActivity
from apps.audit.models import AuditLog

logger = logging.getLogger(__name__)


# ========================================
# Elasticsearch Indexing Signals
# ========================================

@receiver(post_save, sender=Document)
def update_document_index(sender, instance, created, **kwargs):
    """
    Update Elasticsearch index when document is created or updated.

    This signal automatically keeps the search index in sync with the database.
    Runs after every Document save operation.

    Args:
        sender: The Document model class
        instance: The Document instance being saved
        created: Boolean indicating if this is a new document
        **kwargs: Additional signal arguments
    """
    # Skip indexing if document is deleted (soft delete)
    if instance.is_deleted:
        delete_document_from_index(instance)
        return

    # Skip indexing for newly created documents that haven't been fully saved yet
    # (they will be indexed after MinIO upload completes)
    if created and not instance.minio_object_key:
        logger.debug(f"Skipping ES indexing for new document {instance.id} - waiting for file upload")
        return

    try:
        # Import here to avoid circular dependency
        from apps.search.documents import DocumentDocument

        # Try to get existing document from index
        try:
            es_doc = DocumentDocument.get(id=str(instance.id), ignore=404)
            if es_doc:
                # Update existing index entry
                es_doc.update(instance)
                logger.info(f"Updated Elasticsearch index for document {instance.id}")
            else:
                # Create new index entry
                doc_to_index = DocumentDocument()
                doc_to_index.update(instance)
                logger.info(f"Created Elasticsearch index for document {instance.id}")

        except Exception as inner_e:
            # If get fails, try to index anyway
            logger.warning(f"Could not get ES document, creating new: {inner_e}")
            doc_to_index = DocumentDocument()
            doc_to_index.update(instance)

        # Mark document as indexed
        if not instance.is_indexed:
            # Update without triggering signals again
            Document.objects.filter(pk=instance.pk).update(is_indexed=True)

    except TypeError as te:
        # Handle serialization errors (like FieldFile not JSON serializable)
        # This can happen if the document has a file field that's not fully saved
        logger.warning(
            f"TypeError during ES indexing for document {instance.id}: {te}. "
            f"Document will be indexed later."
        )
    except Exception as e:
        # Log error but don't fail the save operation
        logger.error(
            f"Failed to update Elasticsearch index for document {instance.id}: {e}",
            exc_info=True
        )


@receiver(post_delete, sender=Document)
def delete_document_index(sender, instance, **kwargs):
    """
    Remove document from Elasticsearch index when deleted.

    Args:
        sender: The Document model class
        instance: The Document instance being deleted
        **kwargs: Additional signal arguments
    """
    delete_document_from_index(instance)


def delete_document_from_index(instance):
    """
    Helper function to remove document from Elasticsearch.

    Args:
        instance: Document instance to remove from index
    """
    try:
        from apps.search.documents import DocumentDocument

        # Try to get and delete the document from index
        es_doc = DocumentDocument.get(id=str(instance.id), ignore=404)
        if es_doc:
            es_doc.delete()
            logger.info(f"Deleted document {instance.id} from Elasticsearch index")
    except Exception as e:
        logger.error(
            f"Failed to delete document {instance.id} from Elasticsearch index: {e}",
            exc_info=True
        )


# ========================================
# Tag Indexing Signals
# ========================================

@receiver(post_save, sender=DocumentTag)
def update_document_index_on_tag_change(sender, instance, **kwargs):
    """
    Re-index document when tags are added or removed.

    Args:
        sender: The DocumentTag model class
        instance: The DocumentTag instance
        **kwargs: Additional signal arguments
    """
    try:
        from apps.search.documents import DocumentDocument

        # Re-index the document to update tags
        document = instance.document
        if document and not document.is_deleted:
            es_doc = DocumentDocument.get(id=str(document.id), ignore=404)
            if es_doc:
                es_doc.update(document)
                logger.info(f"Updated document {document.id} index after tag change")
    except Exception as e:
        logger.error(
            f"Failed to update document index after tag change: {e}",
            exc_info=True
        )


@receiver(post_delete, sender=DocumentTag)
def update_document_index_on_tag_removal(sender, instance, **kwargs):
    """
    Re-index document when tag is removed.

    Args:
        sender: The DocumentTag model class
        instance: The DocumentTag instance being deleted
        **kwargs: Additional signal arguments
    """
    update_document_index_on_tag_change(sender, instance, **kwargs)


# ========================================
# Audit Logging Signals
# ========================================

@receiver(post_save, sender=Document)
def log_document_save(sender, instance, created, **kwargs):
    """
    Create audit log entry when document is created or updated.

    Args:
        sender: The Document model class
        instance: The Document instance
        created: Boolean indicating if this is a new document
        **kwargs: Additional signal arguments
    """
    # Skip audit logging if we're in a migration or fixture loading
    if kwargs.get('raw', False):
        return

    try:
        # Determine action type
        if created:
            action = 'CREATE'
            message = f"Document created: {instance.title}"
        else:
            action = 'UPDATE'
            message = f"Document updated: {instance.title}"

        # Get the user who made the change (if available in thread-local storage)
        user = getattr(instance, '_current_user', instance.created_by if created else instance.owner)

        # Create audit log entry
        AuditLog.objects.create(
            user=user,
            action=action,
            resource_type='DOCUMENT',
            resource_id=str(instance.id),
            message=message,
            metadata={
                'document_id': str(instance.id),
                'document_title': instance.title,
                'document_type': instance.document_type,
                'folder_id': str(instance.folder.id) if instance.folder else None,
                'department_id': instance.department.id if instance.department else None,
            }
        )

        logger.debug(f"Created audit log for document {action}: {instance.id}")

    except Exception as e:
        # Don't fail the save if audit logging fails
        logger.error(f"Failed to create audit log for document: {e}", exc_info=True)


@receiver(pre_delete, sender=Document)
def log_document_delete(sender, instance, **kwargs):
    """
    Create audit log entry before document is deleted.

    Args:
        sender: The Document model class
        instance: The Document instance being deleted
        **kwargs: Additional signal arguments
    """
    try:
        # Get the user who is deleting (if available)
        user = getattr(instance, '_current_user', instance.owner)

        # Create audit log entry
        AuditLog.objects.create(
            user=user,
            action='DELETE',
            resource_type='DOCUMENT',
            resource_id=str(instance.id),
            message=f"Document deleted: {instance.title}",
            metadata={
                'document_id': str(instance.id),
                'document_title': instance.title,
                'document_type': instance.document_type,
                'file_name': instance.file_name,
            }
        )

        logger.debug(f"Created audit log for document deletion: {instance.id}")

    except Exception as e:
        logger.error(f"Failed to create audit log for document deletion: {e}", exc_info=True)


# ========================================
# Document Shortcut Audit Logging Signals
# ========================================

@receiver(post_save, sender=DocumentShortcut)
def log_shortcut_created(sender, instance, created, **kwargs):
    """
    Create audit log entry when a document shortcut is created.

    Args:
        sender: The DocumentShortcut model class
        instance: The DocumentShortcut instance
        created: Boolean indicating if this is a new shortcut
        **kwargs: Additional signal arguments
    """
    # Only log creations (shortcuts cannot be updated)
    if not created:
        return

    # Skip audit logging if we're in a migration or fixture loading
    if kwargs.get('raw', False):
        return

    try:
        # Get the user who created the shortcut
        user = instance.created_by

        # Create audit log entry
        AuditLog.objects.create(
            user=user,
            action='SHORTCUT_CREATED',
            resource_type='DOCUMENT_SHORTCUT',
            resource_id=str(instance.id),
            message=f"Document shortcut created: {instance.original_document.title} -> {instance.folder.name}",
            metadata={
                'shortcut_id': str(instance.id),
                'original_document_id': str(instance.original_document_id),
                'original_document_title': instance.original_document.title,
                'original_folder_id': str(instance.original_document.folder_id) if instance.original_document.folder else None,
                'target_folder_id': str(instance.folder_id),
                'target_folder_name': instance.folder.name,
                'target_folder_path': instance.folder.path,
            }
        )

        logger.debug(f"Created audit log for shortcut creation: {instance.id}")

    except Exception as e:
        # Don't fail the save if audit logging fails
        logger.error(f"Failed to create audit log for shortcut creation: {e}", exc_info=True)


@receiver(pre_delete, sender=DocumentShortcut)
def log_shortcut_deleted(sender, instance, **kwargs):
    """
    Create audit log entry before a document shortcut is deleted.

    Args:
        sender: The DocumentShortcut model class
        instance: The DocumentShortcut instance being deleted
        **kwargs: Additional signal arguments
    """
    try:
        # Get the user who is deleting (if available)
        user = getattr(instance, '_current_user', instance.created_by)

        # Create audit log entry
        AuditLog.objects.create(
            user=user,
            action='SHORTCUT_DELETED',
            resource_type='DOCUMENT_SHORTCUT',
            resource_id=str(instance.id),
            message=f"Document shortcut deleted: {instance.original_document.title} from {instance.folder.name}",
            metadata={
                'shortcut_id': str(instance.id),
                'original_document_id': str(instance.original_document_id),
                'original_document_title': instance.original_document.title,
                'folder_id': str(instance.folder_id),
                'folder_name': instance.folder.name,
                'folder_path': instance.folder.path,
            }
        )

        logger.debug(f"Created audit log for shortcut deletion: {instance.id}")

    except Exception as e:
        logger.error(f"Failed to create audit log for shortcut deletion: {e}", exc_info=True)


# ========================================
# Recent Activity Logging Signals
# ========================================

@receiver(post_save, sender=Document)
def log_document_activity(sender, instance, created, **kwargs):
    """
    Log recent activity when a document is created (uploaded) or updated (edited).

    This enables the "Recent Files" feature by tracking user activities
    on documents.

    Args:
        sender: The Document model class
        instance: The Document instance
        created: Boolean indicating if this is a new document
        **kwargs: Additional signal arguments
    """
    # Skip during migrations or fixture loading
    if kwargs.get('raw', False):
        return

    # Skip if deleted
    if instance.is_deleted:
        return

    try:
        # Get the user who performed the action
        user = getattr(instance, '_current_user', None)
        if not user:
            user = instance.created_by if created else instance.owner

        if not user:
            logger.debug(f"Skipping recent activity for document {instance.id} - no user")
            return

        # Determine activity type
        if created:
            activity_type = RecentActivity.ActivityType.UPLOADED
        else:
            activity_type = RecentActivity.ActivityType.EDITED

        # Get folder information
        folder_id = None
        folder_name = ''
        folder_path = ''
        if instance.folder:
            folder_id = instance.folder.id
            folder_name = instance.folder.name
            folder_path = instance.folder.path

        # Log the activity
        RecentActivity.log_activity(
            user=user,
            resource_type=RecentActivity.ResourceType.DOCUMENT,
            resource_id=str(instance.id),
            activity_type=activity_type,
            resource_name=instance.title,
            file_type=instance.file_type or '',
            file_size=instance.file_size or 0,
            folder_id=folder_id,
            folder_name=folder_name,
            folder_path=folder_path,
            confidentiality_level=instance.confidentiality_level or ''
        )

        logger.debug(
            f"Logged recent activity: {user.username} {activity_type} document {instance.id}"
        )

    except Exception as e:
        # Don't fail the save if activity logging fails
        logger.error(f"Failed to log recent activity for document: {e}", exc_info=True)


def log_document_download_activity(user, document):
    """
    Helper function to log a document download activity.

    This should be called from the DocumentDownloadView when a document is downloaded.

    Args:
        user: The user who downloaded the document
        document: The Document instance that was downloaded
    """
    try:
        # Get folder information
        folder_id = None
        folder_name = ''
        folder_path = ''
        if document.folder:
            folder_id = document.folder.id
            folder_name = document.folder.name
            folder_path = document.folder.path

        # Log the activity
        RecentActivity.log_activity(
            user=user,
            resource_type=RecentActivity.ResourceType.DOCUMENT,
            resource_id=str(document.id),
            activity_type=RecentActivity.ActivityType.DOWNLOADED,
            resource_name=document.title,
            file_type=document.file_type or '',
            file_size=document.file_size or 0,
            folder_id=folder_id,
            folder_name=folder_name,
            folder_path=folder_path,
            confidentiality_level=document.confidentiality_level or ''
        )

        logger.debug(f"Logged recent activity: {user.username} DOWNLOADED document {document.id}")

    except Exception as e:
        logger.error(f"Failed to log download activity: {e}", exc_info=True)


def log_document_view_activity(user, document):
    """
    Helper function to log a document view activity.

    This should be called from views that display document details.

    Args:
        user: The user who viewed the document
        document: The Document instance that was viewed
    """
    try:
        # Get folder information
        folder_id = None
        folder_name = ''
        folder_path = ''
        if document.folder:
            folder_id = document.folder.id
            folder_name = document.folder.name
            folder_path = document.folder.path

        # Log the activity
        RecentActivity.log_activity(
            user=user,
            resource_type=RecentActivity.ResourceType.DOCUMENT,
            resource_id=str(document.id),
            activity_type=RecentActivity.ActivityType.VIEWED,
            resource_name=document.title,
            file_type=document.file_type or '',
            file_size=document.file_size or 0,
            folder_id=folder_id,
            folder_name=folder_name,
            folder_path=folder_path,
            confidentiality_level=document.confidentiality_level or ''
        )

        logger.debug(f"Logged recent activity: {user.username} VIEWED document {document.id}")

    except Exception as e:
        logger.error(f"Failed to log view activity: {e}", exc_info=True)


def log_folder_activity(user, folder, activity_type):
    """
    Helper function to log a folder activity.

    This can be called from folder views to track folder access.

    Args:
        user: The user who performed the action
        folder: The Folder instance
        activity_type: One of RecentActivity.ActivityType choices
    """
    try:
        # Get parent folder information
        parent_folder_id = None
        parent_folder_name = ''
        folder_path = folder.path if hasattr(folder, 'path') else ''

        if hasattr(folder, 'parent') and folder.parent:
            parent_folder_id = folder.parent.id
            parent_folder_name = folder.parent.name

        # Log the activity
        RecentActivity.log_activity(
            user=user,
            resource_type=RecentActivity.ResourceType.FOLDER,
            resource_id=str(folder.id),
            activity_type=activity_type,
            resource_name=folder.name,
            file_type='',  # Folders don't have file type
            file_size=0,
            folder_id=parent_folder_id,
            folder_name=parent_folder_name,
            folder_path=folder_path,
            confidentiality_level=getattr(folder, 'confidentiality_level', '') or ''
        )

        logger.debug(f"Logged recent activity: {user.username} {activity_type} folder {folder.id}")

    except Exception as e:
        logger.error(f"Failed to log folder activity: {e}", exc_info=True)


# ========================================
# Workflow Auto-Trigger Signals
# ========================================

@receiver(post_save, sender=Document)
def auto_trigger_workflow_on_upload(sender, instance, created, **kwargs):
    """
    Automatically trigger workflows when a document is uploaded.

    Evaluates all active WorkflowAutoTriggerRule entries to determine
    if any workflows should be automatically started for the new document.

    Args:
        sender: The Document model class
        instance: The Document instance
        created: Boolean indicating if this is a new document
        **kwargs: Additional signal arguments
    """
    # Only trigger on new document uploads
    if not created:
        return

    # Skip during migrations or fixture loading
    if kwargs.get('raw', False):
        return

    # Skip if document is deleted
    if instance.is_deleted:
        return

    # Skip if document doesn't have a file yet (waiting for upload)
    if not instance.minio_object_key:
        return

    try:
        from apps.workflows.models import WorkflowAutoTriggerRule

        # Get organization from document
        organization = getattr(instance, 'organization', None)
        if not organization and instance.folder:
            organization = getattr(instance.folder, 'organization', None)

        # Get all active rules, ordered by priority
        rules = WorkflowAutoTriggerRule.objects.filter(
            is_active=True
        ).select_related(
            'workflow_template'
        ).order_by('priority')

        # Filter by organization if applicable
        if organization:
            rules = rules.filter(
                models.Q(organization=organization) |
                models.Q(organization__isnull=True)
            )

        # Evaluate each rule
        triggered_workflows = []
        for rule in rules:
            if rule.matches_document(instance):
                logger.info(
                    f"Document {instance.id} matches auto-trigger rule '{rule.name}'"
                )

                # Get the user who uploaded the document
                user = getattr(instance, '_current_user', None)
                if not user:
                    user = instance.created_by or instance.owner

                # Trigger the workflow
                try:
                    workflow_instance = rule.trigger_workflow(instance, user)
                    triggered_workflows.append({
                        'rule': rule.name,
                        'workflow': str(workflow_instance.id),
                        'template': rule.workflow_template.name
                    })
                    logger.info(
                        f"Auto-triggered workflow '{rule.workflow_template.name}' "
                        f"for document {instance.id} (rule: {rule.name})"
                    )
                except Exception as trigger_error:
                    logger.error(
                        f"Failed to trigger workflow for rule '{rule.name}': {trigger_error}",
                        exc_info=True
                    )

                # Stop processing if rule says so
                if rule.stop_processing:
                    logger.debug(
                        f"Stopping rule evaluation after rule '{rule.name}' "
                        f"(stop_processing=True)"
                    )
                    break

        if triggered_workflows:
            logger.info(
                f"Auto-triggered {len(triggered_workflows)} workflow(s) "
                f"for document {instance.id}: {triggered_workflows}"
            )

    except ImportError:
        # Workflows app may not be installed
        logger.debug("Workflows app not available, skipping auto-trigger check")
    except Exception as e:
        # Don't fail the document save if auto-trigger fails
        logger.error(
            f"Failed to evaluate auto-trigger rules for document {instance.id}: {e}",
            exc_info=True
        )


def check_auto_trigger_rules_for_document(document, user=None):
    """
    Helper function to manually check and trigger workflow rules for a document.

    This can be called from views or tasks to re-evaluate rules for an existing
    document (e.g., after metadata update).

    Args:
        document: The Document instance to check
        user: The user initiating the check (defaults to document owner)

    Returns:
        list: List of triggered workflow instances
    """
    try:
        from apps.workflows.models import WorkflowAutoTriggerRule

        # Get organization from document
        organization = getattr(document, 'organization', None)
        if not organization and document.folder:
            organization = getattr(document.folder, 'organization', None)

        # Get all active rules, ordered by priority
        rules = WorkflowAutoTriggerRule.objects.filter(
            is_active=True
        ).select_related(
            'workflow_template'
        ).order_by('priority')

        # Filter by organization if applicable
        if organization:
            from django.db import models as db_models
            rules = rules.filter(
                db_models.Q(organization=organization) |
                db_models.Q(organization__isnull=True)
            )

        triggered_workflows = []
        for rule in rules:
            if rule.matches_document(document):
                try:
                    workflow_instance = rule.trigger_workflow(document, user)
                    triggered_workflows.append(workflow_instance)
                    logger.info(
                        f"Manually triggered workflow '{rule.workflow_template.name}' "
                        f"for document {document.id}"
                    )
                except Exception as e:
                    logger.error(f"Failed to trigger workflow: {e}", exc_info=True)

                if rule.stop_processing:
                    break

        return triggered_workflows

    except ImportError:
        logger.debug("Workflows app not available")
        return []
    except Exception as e:
        logger.error(f"Failed to check auto-trigger rules: {e}", exc_info=True)
        return []
