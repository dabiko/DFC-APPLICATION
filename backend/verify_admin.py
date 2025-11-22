"""
Script to verify admin user status and test password authentication
"""
import os
import sys
from pathlib import Path

# Add the backend directory to the Python path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

# Load .env file
try:
    from dotenv import load_dotenv
    env_path = BASE_DIR / '.env'
    load_dotenv(dotenv_path=env_path)
    print(f"Loaded .env from: {env_path}")
except ImportError:
    print("WARNING: python-dotenv not installed, .env file may not be loaded")

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.users.models import CustomUser
from django.contrib.auth.hashers import check_password

print("=" * 60)
print("ADMIN USER VERIFICATION")
print("=" * 60)

# Check if admin user exists
try:
    admin = CustomUser.objects.get(email='admin@cccplc.net')
    print(f"\n✓ User found: {admin.email}")
    print(f"  - Username: {admin.username}")
    print(f"  - First Name: {admin.first_name}")
    print(f"  - Last Name: {admin.last_name}")
    print(f"  - Employee ID: {admin.employee_id}")
    print(f"  - Is Active: {admin.is_active}")
    print(f"  - Is Staff: {admin.is_staff}")
    print(f"  - Is Superuser: {admin.is_superuser}")
    print(f"  - Department: {admin.department.name if admin.department else 'None'}")
    print(f"  - Organization: {admin.organization.name if admin.organization else 'None'}")
    print(f"  - Password Hash: {admin.password[:50]}...")

    # Test password verification
    print("\n" + "=" * 60)
    print("PASSWORD VERIFICATION TEST")
    print("=" * 60)

    test_password = 'admin123'
    is_valid = check_password(test_password, admin.password)

    if is_valid:
        print(f"\n✓ Password '{test_password}' is CORRECT for {admin.email}")
    else:
        print(f"\n✗ Password '{test_password}' is INCORRECT for {admin.email}")
        print("\nAttempting to reset password...")
        admin.set_password('admin123')
        admin.save()
        print("✓ Password has been reset to 'admin123'")

        # Verify again
        admin.refresh_from_db()
        is_valid_after = check_password('admin123', admin.password)
        if is_valid_after:
            print("✓ Password verification successful after reset")
        else:
            print("✗ Password verification still failing after reset")

    print("\n" + "=" * 60)
    print("ACCOUNT STATUS")
    print("=" * 60)

    if not admin.is_active:
        print("\n✗ ISSUE FOUND: User account is NOT active")
        print("  Activating account...")
        admin.is_active = True
        admin.save()
        print("✓ Account has been activated")
    else:
        print("\n✓ User account is active")

    # Check all users count
    print("\n" + "=" * 60)
    print("ALL USERS IN DATABASE")
    print("=" * 60)
    all_users = CustomUser.objects.all()
    print(f"\nTotal users: {all_users.count()}\n")
    for user in all_users:
        status = "✓" if user.is_active else "✗"
        print(f"{status} {user.email:30} | Active: {user.is_active} | Staff: {user.is_staff}")

except CustomUser.DoesNotExist:
    print("\n✗ ERROR: No user found with email 'admin@cccplc.net'")
    print("\nCreating admin user...")

    from apps.organizations.models import Organization
    from apps.users.models import Department

    try:
        org = Organization.objects.get(domain='cccplc.net')
        dept = Department.objects.filter(organization=org).first()

        admin = CustomUser.objects.create_user(
            username='admin',
            email='admin@cccplc.net',
            password='admin123',
            employee_id='EMP001',
            first_name='Admin',
            last_name='User',
            department=dept,
            organization=org,
            is_staff=True,
            is_superuser=True,
            is_active=True,
            phone_number='+1234567890',
        )
        print(f"✓ Admin user created: {admin.email}")

    except Organization.DoesNotExist:
        print("✗ Organization 'cccplc.net' not found. Run seed_data command first.")
    except Exception as e:
        print(f"✗ Error creating admin user: {e}")

except Exception as e:
    print(f"\n✗ ERROR: {e}")

print("\n" + "=" * 60)
