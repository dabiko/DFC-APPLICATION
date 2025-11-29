"""
Django management command to make a user a superuser
Usage: python manage.py make_superuser <email>
"""

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Make an existing user a superuser (staff + superuser flags)'

    def add_arguments(self, parser):
        parser.add_argument(
            'email',
            type=str,
            help='Email of the user to make a superuser'
        )

    def handle(self, *args, **options):
        email = options['email']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise CommandError(f'User with email "{email}" not found')

        if user.is_superuser and user.is_staff:
            self.stdout.write(
                self.style.WARNING(f'User "{email}" is already a superuser')
            )
            return

        user.is_staff = True
        user.is_superuser = True
        user.save()

        self.stdout.write(
            self.style.SUCCESS(f'Successfully made "{email}" a superuser')
        )
        self.stdout.write(
            f'  is_staff: {user.is_staff}'
        )
        self.stdout.write(
            f'  is_superuser: {user.is_superuser}'
        )
