"""
Django app configuration for classification app.
"""
from django.apps import AppConfig


class ClassificationConfig(AppConfig):
    """Configuration for classification app."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.classification'
    verbose_name = 'Document Classification'

    def ready(self):
        """Import signal handlers when app is ready."""
        # Import signals if any
        pass
