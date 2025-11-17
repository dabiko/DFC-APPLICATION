from django.core.management.base import BaseCommand
from users.models import CustomUser


class Command(BaseCommand):
    help = 'Create test users for development'

    def handle(self, *args, **kwargs):
        # Delete old test users with @example.com domain
        CustomUser.objects.filter(email__endswith='@example.com').delete()
        self.stdout.write(self.style.WARNING('Deleted old test users with @example.com domain'))

        # Create admin user
        if not CustomUser.objects.filter(email='admin@cccplc.net').exists():
            admin = CustomUser.objects.create_user(
                username='admin',
                email='admin@cccplc.net',
                password='password',
                first_name='Admin',
                last_name='User',
                role=CustomUser.Role.ADMIN,
                department=CustomUser.Department.IT,
                mfa_enabled=False,
                is_staff=True,
                is_superuser=True
            )
            self.stdout.write(self.style.SUCCESS(f'✓ Created admin user: {admin.email}'))
        else:
            self.stdout.write(self.style.WARNING('Admin user already exists'))

        # Create editor user
        if not CustomUser.objects.filter(email='editor@cccplc.net').exists():
            editor = CustomUser.objects.create_user(
                username='editor',
                email='editor@cccplc.net',
                password='password',
                first_name='John',
                last_name='Editor',
                role=CustomUser.Role.EDITOR,
                department=CustomUser.Department.ACCOUNTING,
                mfa_enabled=True
            )
            self.stdout.write(self.style.SUCCESS(f'✓ Created editor user: {editor.email}'))
        else:
            self.stdout.write(self.style.WARNING('Editor user already exists'))

        # Create viewer user
        if not CustomUser.objects.filter(email='viewer@cccplc.net').exists():
            viewer = CustomUser.objects.create_user(
                username='viewer',
                email='viewer@cccplc.net',
                password='password',
                first_name='Jane',
                last_name='Viewer',
                role=CustomUser.Role.VIEWER,
                department=CustomUser.Department.COMPLIANCE,
                mfa_enabled=False
            )
            self.stdout.write(self.style.SUCCESS(f'✓ Created viewer user: {viewer.email}'))
        else:
            self.stdout.write(self.style.WARNING('Viewer user already exists'))

        self.stdout.write(self.style.SUCCESS('\n=== Test Users Created ==='))
        self.stdout.write('Email: admin@cccplc.net | Password: password | Role: Admin')
        self.stdout.write('Email: editor@cccplc.net | Password: password | Role: Editor')
        self.stdout.write('Email: viewer@cccplc.net | Password: password | Role: Viewer')
        self.stdout.write(self.style.WARNING('\nNote: Only users with @cccplc.net email domain can access the platform.'))
