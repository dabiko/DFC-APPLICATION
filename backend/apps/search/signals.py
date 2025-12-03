"""
Elasticsearch Auto-Indexing Signals
Automatically update search index when documents change
"""

from django.db.models.signals import post_save, post_delete, pre_delete
from django.dispatch import receiver
from apps.documents.models import Document
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Document)
def document_saved(sender, instance, created, **kwargs):
    """
    Index document when created or updated

    For production: Use Celery for async processing to avoid blocking requests
    For development: Can use sync indexing for immediate results

    Args:
        sender: Document model class
        instance: Document instance
        created: Boolean indicating if this is a new document
        **kwargs: Additional arguments
    """
    try:
        # Skip indexing if document is deleted
        if instance.is_deleted:
            logger.debug(f"Skipping indexing for deleted document {instance.id}")
            return

        # Check if Celery is available for async indexing
        try:
            from .tasks import index_document
            # Async indexing (recommended for production)
            index_document.delay(str(instance.id))
            logger.info(f"Queued document {instance.id} for async indexing")
        except ImportError:
            # Celery not available, use sync indexing
            logger.warning("Celery not available, using sync indexing")
            _sync_index_document(instance)

    except Exception as e:
        logger.error(f"Error in document_saved signal for {instance.id}: {e}", exc_info=True)


@receiver(pre_delete, sender=Document)
def document_pre_delete(sender, instance, **kwargs):
    """
    Remove document from index before deletion

    Using pre_delete instead of post_delete ensures we have access to
    the document data before it's removed from the database

    Args:
        sender: Document model class
        instance: Document instance
        **kwargs: Additional arguments
    """
    try:
        # Check if Celery is available for async deletion
        try:
            from .tasks import delete_document_from_index
            # Async deletion (recommended for production)
            delete_document_from_index.delay(str(instance.id))
            logger.info(f"Queued document {instance.id} for async deletion from index")
        except ImportError:
            # Celery not available, use sync deletion
            logger.warning("Celery not available, using sync index deletion")
            _sync_delete_document(instance)

    except Exception as e:
        logger.error(f"Error in document_pre_delete signal for {instance.id}: {e}", exc_info=True)


def _sync_index_document(document):
    """
    Synchronously index a document

    Used when Celery is not available or for testing

    Args:
        document: Document instance
    """
    try:
        from apps.search.documents import DocumentDocument

        doc_instance = DocumentDocument()
        doc_instance.update(document)

        logger.info(f"Synchronously indexed document {document.id}: {document.file_name}")

    except Exception as e:
        logger.error(f"Error synchronously indexing document {document.id}: {e}", exc_info=True)


def _sync_delete_document(document):
    """
    Synchronously delete a document from index

    Used when Celery is not available or for testing

    Args:
        document: Document instance
    """
    try:
        from apps.search.documents import DocumentDocument
        from elasticsearch.exceptions import NotFoundError

        try:
            doc = DocumentDocument.get(id=str(document.id))
            doc.delete()
            logger.info(f"Synchronously deleted document {document.id} from index")
        except NotFoundError:
            logger.debug(f"Document {document.id} not found in index (already deleted)")

    except Exception as e:
        logger.error(f"Error synchronously deleting document {document.id}: {e}", exc_info=True)


# Optional: Signal for related model updates
# Uncomment and modify if you want to re-index documents when related models change

# from apps.users.models import CustomUser, Department
# from apps.folders.models import Folder

# @receiver(post_save, sender=CustomUser)
# def user_updated(sender, instance, **kwargs):
#     """Re-index all documents owned by this user"""
#     try:
#         documents = Document.objects.filter(owner=instance, is_deleted=False)
#         for document in documents:
#             document_saved(Document, document, created=False)
#         logger.info(f"Re-indexed {documents.count()} documents for user {instance.id}")
#     except Exception as e:
#         logger.error(f"Error re-indexing documents for user {instance.id}: {e}")


# @receiver(post_save, sender=Department)
# def department_updated(sender, instance, **kwargs):
#     """Re-index all documents in this department"""
#     try:
#         documents = Document.objects.filter(department=instance, is_deleted=False)
#         for document in documents:
#             document_saved(Document, document, created=False)
#         logger.info(f"Re-indexed {documents.count()} documents for department {instance.id}")
#     except Exception as e:
#         logger.error(f"Error re-indexing documents for department {instance.id}: {e}")


# @receiver(post_save, sender=Folder)
# def folder_updated(sender, instance, **kwargs):
#     """Re-index all documents in this folder"""
#     try:
#         documents = Document.objects.filter(folder=instance, is_deleted=False)
#         for document in documents:
#             document_saved(Document, document, created=False)
#         logger.info(f"Re-indexed {documents.count()} documents for folder {instance.id}")
#     except Exception as e:
#         logger.error(f"Error re-indexing documents for folder {instance.id}: {e}")
