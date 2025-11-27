"""
Django app configuration for sharing.
"""

from django.apps import AppConfig


class SharingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.sharing'
    verbose_name = 'Document Sharing'

    def ready(self):
        """Import signals when app is ready"""
        import apps.sharing.signals  # noqa: F401
