"""
Django app configuration for storage app.
"""
from django.apps import AppConfig


class StorageConfig(AppConfig):
    """Configuration for storage app."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.storage'
    verbose_name = 'Storage Management'
