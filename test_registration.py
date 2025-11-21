#!/usr/bin/env python
"""Test registration endpoint after migration fix"""
import requests
import json

url = "http://localhost:8000/api/v1/auth/register/comprehensive/"
data = {
    "company_name": "TestCompany Ltd",
    "company_registration_number": "REG12345",
    "company_tax_id": "TAX98765",
    "industry": "Technology",
    "first_name": "Test",
    "last_name": "User",
    "email": "testuser@testcompany.com",
    "phone": "+1234567890",
    "country": "US",
    "job_title": "Manager",
    "address_line1": "123 Test St",
    "city": "TestCity",
    "state": "CA",
    "postal_code": "12345",
    "password": "SecurePass123!",
    "confirm_password": "SecurePass123!",
    "terms_accepted": True,
    "privacy_accepted": True
}

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")
    print(f"Response text: {response.text if 'response' in locals() else 'No response'}")
