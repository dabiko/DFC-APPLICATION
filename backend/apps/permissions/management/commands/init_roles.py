"""
Management command to initialize default roles.
"""

from django.core.management.base import BaseCommand
from apps.permissions.utils import initialize_default_roles


class Command(BaseCommand):
    help = 'Initialize default roles (VIEWER, EDITOR, MANAGER, ADMIN)'

    def handle(self, *args, **options):
        self.stdout.write('Initializing default roles...')

        created_roles = initialize_default_roles()

        if created_roles:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully created {len(created_roles)} roles: {", ".join(created_roles)}'
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING('All default roles already exist')
            )
