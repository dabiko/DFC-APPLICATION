from django.apps import AppConfig
import logging

logger = logging.getLogger(__name__)


class DocumentsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.documents"

    def ready(self):
        """
        Initialize MinIO bucket on application startup.
        """
        # Import here to avoid circular imports
        from apps.documents.storage import initialize_minio_bucket

        try:
            initialize_minio_bucket()
            logger.info("MinIO bucket initialized successfully")
        except Exception as e:
            logger.warning(f"MinIO bucket initialization failed: {e}. Will retry on first upload.")
