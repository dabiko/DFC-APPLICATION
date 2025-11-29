"""Events app configuration."""

import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class EventsConfig(AppConfig):
    """Configuration for Events app."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.events'
    verbose_name = 'Event-Driven Architecture'

    def ready(self):
        """Initialize event system when app is ready."""
        # Import and connect signal handlers
        from .handlers import connect_all_signals

        try:
            connect_all_signals()
            logger.info("Event-driven architecture initialized")
        except Exception as e:
            logger.warning(f"Could not fully initialize event system: {e}")
