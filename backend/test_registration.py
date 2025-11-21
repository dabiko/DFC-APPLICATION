"""
Test script for comprehensive registration endpoint.
Tests the complete registration flow with all required fields.
"""
import os
import django
import json

# Setup Django environment
os.environ['DB_NAME'] = 'dfc_database'
os.environ['DB_USER'] = 'postgres'
os.environ['DB_PASSWORD'] = 'dabiko'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.test import Client
from apps.users.models import CustomUser
from apps.organizations.models import Organization, OrganizationMember
from apps.users.models import Department

# Create test client
client = Client()

# Sample registration data matching frontend signup form
registration_data = {
    # Step 1: Company Information
    "company_name": "Acme Financial Services Ltd",
    "company_registration_number": "RC123456789",
    "company_tax_id": "TAX-987654321",
    "industry": "Financial Services",

    # Step 2: Personal Information & KYC
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@acmefinancial.com",
    "phone": "+1234567890",
    "country": "United States",
    "job_title": "Chief Financial Officer",

    # Address Information
    "address_line1": "123 Wall Street",
    "address_line2": "Suite 456",
    "city": "New York",
    "state": "NY",
    "postal_code": "10005",

    # Step 3: Security
    "password": "SecureP@ssw0rd123!",
    "confirm_password": "SecureP@ssw0rd123!",

    # Agreements
    "terms_accepted": True,
    "privacy_accepted": True,
    "marketing_accepted": False,
}

print("=" * 80)
print("TESTING COMPREHENSIVE REGISTRATION ENDPOINT")
print("=" * 80)
print("\nTest Data:")
print(json.dumps({k: v for k, v in registration_data.items() if 'password' not in k}, indent=2))
print("\n" + "=" * 80)

# Clean up any existing test user
existing_user = CustomUser.objects.filter(email=registration_data['email']).first()
if existing_user:
    print(f"\n⚠️  Cleaning up existing test user: {existing_user.email}")
    existing_user.delete()

# Clean up any existing test organization
existing_org = Organization.objects.filter(domain='acmefinancial.com').first()
if existing_org:
    print(f"⚠️  Cleaning up existing test organization: {existing_org.name}")
    existing_org.delete()

print("\n" + "=" * 80)
print("SENDING REGISTRATION REQUEST...")
print("=" * 80)

# Make registration request
response = client.post(
    '/api/v1/auth/register/comprehensive/',
    data=json.dumps(registration_data),
    content_type='application/json'
)

print(f"\nResponse Status Code: {response.status_code}")
print(f"\nResponse Data:")
print(json.dumps(response.json(), indent=2))

# Verify results
if response.status_code == 201:
    print("\n" + "=" * 80)
    print("✅ REGISTRATION SUCCESSFUL!")
    print("=" * 80)

    response_data = response.json()

    # Verify user created
    user = CustomUser.objects.get(email=registration_data['email'])
    print(f"\n✅ User Created:")
    print(f"   - ID: {user.id}")
    print(f"   - Username: {user.username}")
    print(f"   - Email: {user.email}")
    print(f"   - Employee ID: {user.employee_id}")
    print(f"   - Name: {user.first_name} {user.last_name}")
    print(f"   - Job Title: {user.job_title}")
    print(f"   - Phone: {user.phone_number}")
    print(f"   - Address: {user.address_line1}, {user.city}, {user.state} {user.postal_code}, {user.country}")

    # Verify organization created
    org = Organization.objects.get(domain='acmefinancial.com')
    print(f"\n✅ Organization Created:")
    print(f"   - ID: {org.id}")
    print(f"   - Name: {org.name}")
    print(f"   - Domain: {org.domain}")
    print(f"   - Registration Number: {org.registration_number}")
    print(f"   - Tax ID: {org.tax_id}")
    print(f"   - Industry: {org.industry}")
    print(f"   - Country: {org.country}")
    print(f"   - Subscription Plan: {org.subscription_plan}")
    print(f"   - Subscription Status: {org.subscription_status}")

    # Verify department created
    dept = Department.objects.get(organization=org, code='GENERAL')
    print(f"\n✅ Department Created:")
    print(f"   - ID: {dept.id}")
    print(f"   - Name: {dept.name}")
    print(f"   - Code: {dept.code}")
    print(f"   - Organization: {dept.organization.name}")

    # Verify organization membership
    membership = OrganizationMember.objects.get(user=user, organization=org)
    print(f"\n✅ Organization Membership Created:")
    print(f"   - User: {membership.user.email}")
    print(f"   - Organization: {membership.organization.name}")
    print(f"   - Role: {membership.role}")
    print(f"   - Is Active: {membership.is_active}")

    # Verify JWT tokens returned
    if 'tokens' in response_data:
        print(f"\n✅ JWT Tokens Returned:")
        print(f"   - Access Token: {response_data['tokens']['access'][:50]}...")
        print(f"   - Refresh Token: {response_data['tokens']['refresh'][:50]}...")

    # Verify compliance timestamps
    print(f"\n✅ Compliance Data:")
    print(f"   - Terms Accepted: {user.terms_accepted_at}")
    print(f"   - Privacy Accepted: {user.privacy_accepted_at}")
    print(f"   - Marketing Consent: {user.marketing_consent}")

    print("\n" + "=" * 80)
    print("ALL VALIDATIONS PASSED! ✅")
    print("=" * 80)

else:
    print("\n" + "=" * 80)
    print("❌ REGISTRATION FAILED!")
    print("=" * 80)
    print("\nErrors:")
    if 'errors' in response.json():
        print(json.dumps(response.json()['errors'], indent=2))

print("\n" + "=" * 80)
print("TEST COMPLETED")
print("=" * 80)
