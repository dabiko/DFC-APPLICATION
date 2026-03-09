from django.apps import AppConfig


class ProceduresConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.procedures'
    verbose_name = 'Procedures'

    def ready(self):
        import apps.procedures.signals  # noqa
