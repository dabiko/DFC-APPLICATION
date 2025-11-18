"""
Signal handlers for Document model.

Handles automatic Elasticsearch indexing when documents are created,
updated, or deleted. Also handles audit logging and other post-save actions.
"""

from django.db.models.signals import post_save, post_delete, pre_delete
from django.dispatch import receiver
from django.db import transaction
import logging

from apps.documents.models import Document, DocumentTag
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
