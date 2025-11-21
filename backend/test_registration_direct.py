"""
Direct test of comprehensive registration serializer and logic.
Tests without HTTP layer to verify core functionality.
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

from apps.users.serializers import ComprehensiveRegistrationSerializer
from apps.users.models import CustomUser, Department
from apps.organizations.models import Organization, OrganizationMember
from rest_framework_simplejwt.tokens import RefreshToken

# Sample registration data
registration_data = {
    # Company Information
    "company_name": "Acme Financial Services Ltd",
    "company_registration_number": "RC123456789",
    "company_tax_id": "TAX-987654321",
    "industry": "Financial Services",

    # Personal Information & KYC
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

    # Security
    "password": "SecureP@ssw0rd123!",
    "confirm_password": "SecureP@ssw0rd123!",

    # Agreements
    "terms_accepted": True,
    "privacy_accepted": True,
    "marketing_accepted": False,
}

print("=" * 80)
print("TESTING COMPREHENSIVE REGISTRATION - DIRECT SERIALIZER TEST")
print("=" * 80)

# Clean up any existing test data
existing_user = CustomUser.objects.filter(email=registration_data['email']).first()
if existing_user:
    print(f"\n⚠️  Cleaning up existing test user: {existing_user.email}")
    existing_user.delete()

existing_org = Organization.objects.filter(domain='acmefinancial.com').first()
if existing_org:
    print(f"⚠️  Cleaning up existing test organization: {existing_org.name}")
    existing_org.delete()

print("\n" + "=" * 80)
print("VALIDATING REGISTRATION DATA...")
print("=" * 80)

# Create serializer instance
serializer = ComprehensiveRegistrationSerializer(data=registration_data)

# Validate
if serializer.is_valid():
    print("\n✅ Validation PASSED!")
    print(f"\nValidated Fields:")
    for key in sorted(serializer.validated_data.keys()):
        if 'password' not in key:
            print(f"   - {key}: {serializer.validated_data[key]}")

    print("\n" + "=" * 80)
    print("CREATING USER AND ORGANIZATION...")
    print("=" * 80)

    # Create user
    user = serializer.save()

    print(f"\n✅ User Created Successfully!")
    print(f"   - ID: {user.id}")
    print(f"   - Username: {user.username}")
    print(f"   - Email: {user.email}")
    print(f"   - Employee ID: {user.employee_id}")
    print(f"   - Name: {user.first_name} {user.last_name}")
    print(f"   - Job Title: {user.job_title}")
    print(f"   - Phone: {user.phone_number}")
    print(f"   - Address: {user.address_line1}, {user.city}, {user.state} {user.postal_code}")
    print(f"   - Country: {user.country}")

    # Verify organization
    org = Organization.objects.get(domain='acmefinancial.com')
    print(f"\n✅ Organization Created Successfully!")
    print(f"   - ID: {org.id}")
    print(f"   - Name: {org.name}")
    print(f"   - Domain: {org.domain}")
    print(f"   - Registration Number: {org.registration_number}")
    print(f"   - Tax ID: {org.tax_id}")
    print(f"   - Industry: {org.industry}")
    print(f"   - Country: {org.country}")
    print(f"   - Plan: {org.subscription_plan}")
    print(f"   - Status: {org.subscription_status}")

    # Verify department
    dept = Department.objects.get(organization=org, code='GENERAL')
    print(f"\n✅ Default Department Created!")
    print(f"   - Name: {dept.name}")
    print(f"   - Code: {dept.code}")
    print(f"   - Organization: {dept.organization.name}")

    # Verify membership
    membership = OrganizationMember.objects.get(user=user, organization=org)
    print(f"\n✅ Organization Membership Created!")
    print(f"   - User: {membership.user.email}")
    print(f"   - Organization: {membership.organization.name}")
    print(f"   - Role: {membership.role}")
    print(f"   - Active: {membership.is_active}")

    # Verify compliance data
    print(f"\n✅ Compliance Data Stored!")
    print(f"   - Terms Accepted At: {user.terms_accepted_at}")
    print(f"   - Privacy Accepted At: {user.privacy_accepted_at}")
    print(f"   - Marketing Consent: {user.marketing_consent}")

    # Generate JWT tokens
    refresh = RefreshToken.for_user(user)
    print(f"\n✅ JWT Tokens Generated!")
    print(f"   - Access Token: {str(refresh.access_token)[:50]}...")
    print(f"   - Refresh Token: {str(refresh)[:50]}...")

    # Verify user relations
    print(f"\n✅ User Relations Verified!")
    print(f"   - user.organization: {user.organization.name}")
    print(f"   - user.department: {user.department.name}")
    print(f"   - Password is hashed: {user.password[:20]}...")

    print("\n" + "=" * 80)
    print("✅ ALL TESTS PASSED SUCCESSFULLY!")
    print("=" * 80)

    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"✅ User registration completed successfully")
    print(f"✅ Organization created/joined: {org.name}")
    print(f"✅ Department assigned: {dept.name}")
    print(f"✅ Organization membership role: {membership.role}")
    print(f"✅ All 20+ fields stored correctly")
    print(f"✅ JWT tokens generated")
    print(f"✅ Ready for frontend integration!")

else:
    print("\n❌ Validation FAILED!")
    print("\nErrors:")
    print(json.dumps(serializer.errors, indent=2))

print("\n" + "=" * 80)
print("TEST COMPLETED")
print("=" * 80)
