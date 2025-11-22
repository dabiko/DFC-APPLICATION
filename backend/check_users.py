import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.users.models import CustomUser
from apps.organizations.models import Organization

try:
    org = Organization.objects.first()
    users = CustomUser.objects.all()

    print(f'\nOrganization: {org.name} ({org.domain})')
    print(f'\nTotal Users: {users.count()}\n')
    print('Test Users Available:')
    for user in users:
        dept_name = user.department.name if user.department else "None"
        print(f'  - {user.email:30} | {user.first_name} {user.last_name:15} | Dept: {dept_name}')

    print('\n\nYou can login with any of the following accounts:')
    print('  Email: admin@cccplc.net | Password: admin123')
    print('  Email: john.doe@cccplc.net | Password: manager123')
    print('  Email: jane.smith@cccplc.net | Password: staff123')
    print('  Email: mike.tech@cccplc.net | Password: it123')
    print('  Email: sarah.comply@cccplc.net | Password: comply123')

except Exception as e:
    print(f'Error: {e}')
