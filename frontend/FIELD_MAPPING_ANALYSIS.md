# Database Field Mapping Analysis - Sign Up Form

## Overview

This document analyzes the alignment between the **frontend signup form fields** and the **backend database schema** to identify matches, gaps, and required adjustments.

---

## Current Signup Form Fields

### Step 1: Company Information

| Field                       | Type   | Required | Frontend Property           |
| --------------------------- | ------ | -------- | --------------------------- |
| Company Name                | string | Yes      | `companyName`               |
| Company Registration Number | string | Yes      | `companyRegistrationNumber` |
| Tax ID                      | string | Yes      | `companyTaxId`              |
| Industry                    | string | Yes      | `industry`                  |

### Step 2: Personal Information & KYC

| Field          | Type   | Required | Frontend Property |
| -------------- | ------ | -------- | ----------------- |
| First Name     | string | Yes      | `firstName`       |
| Last Name      | string | Yes      | `lastName`        |
| Email          | string | Yes      | `email`           |
| Phone          | string | Yes      | `phone`           |
| Country        | string | Yes      | `country`         |
| Job Title      | string | Yes      | `jobTitle`        |
| Address Line 1 | string | Yes      | `addressLine1`    |
| Address Line 2 | string | No       | `addressLine2`    |
| City           | string | Yes      | `city`            |
| State/Province | string | Yes      | `state`           |
| Postal Code    | string | Yes      | `postalCode`      |

### Step 3: Security

| Field              | Type    | Required | Frontend Property   |
| ------------------ | ------- | -------- | ------------------- |
| Password           | string  | Yes      | `password`          |
| Confirm Password   | string  | Yes      | `confirmPassword`   |
| Terms Accepted     | boolean | Yes      | `termsAccepted`     |
| Privacy Accepted   | boolean | Yes      | `privacyAccepted`   |
| Marketing Accepted | boolean | No       | `marketingAccepted` |

---

## Backend Database Schema

### 1. Organization Model (`organizations.Organization`)

```python
# Required Fields
name                    # CharField(max_length=200)
domain                  # CharField(max_length=100, unique=True) - extracted from email
slug                    # SlugField (auto-generated from name)

# Subscription Fields (with defaults)
subscription_plan       # CharField (default='free')
subscription_status     # CharField (default='trial')
max_users              # IntegerField (default=5)
max_storage_gb         # IntegerField (default=10)
max_documents          # IntegerField (default=1000)
trial_ends_at          # DateTimeField (auto-set to now + 14 days)
is_active              # BooleanField (default=True)

# Timestamps (auto-managed)
created_at             # DateTimeField (auto_now_add=True)
updated_at             # DateTimeField (auto_now=True)
```

### 2. CustomUser Model (`users.CustomUser`)

```python
# Django AbstractUser Fields (inherited)
username               # CharField (unique=True)
first_name             # CharField
last_name              # CharField
email                  # EmailField (unique=True, validated)
password               # CharField (hashed)
is_active              # BooleanField (default=True)
is_staff               # BooleanField (default=False)
is_superuser           # BooleanField (default=False)
date_joined            # DateTimeField (auto)
last_login             # DateTimeField (nullable)

# Custom Fields - REQUIRED
employee_id            # CharField(max_length=50, unique=True) ⚠️ MISSING
organization           # ForeignKey to Organization
department             # ForeignKey to Department ⚠️ MISSING

# Custom Fields - Optional
phone_number           # CharField(max_length=20, blank=True)
avatar                 # ImageField (nullable)

# MFA Fields (with defaults)
mfa_enabled            # BooleanField (default=False)
mfa_secret             # CharField (blank=True)

# Security Fields (auto-managed)
failed_login_attempts  # IntegerField (default=0)
last_failed_login      # DateTimeField (nullable)
account_locked_until   # DateTimeField (nullable)
locked_by_failed_attempts  # BooleanField (default=False)

# Timestamps
created_at             # DateTimeField (auto_now_add=True)
updated_at             # DateTimeField (auto_now=True)
last_login_ip          # GenericIPAddressField (nullable)
```

### 3. Department Model (`users.Department`)

```python
organization           # ForeignKey to Organization
name                   # CharField(max_length=100)
code                   # CharField(max_length=20, unique=True) ⚠️ REQUIRED
parent                 # ForeignKey to self (nullable)
storage_quota_gb       # IntegerField (default=100)
created_at             # DateTimeField
updated_at             # DateTimeField
```

---

## Field Mapping Analysis

### ✅ MATCHING FIELDS (Direct Mapping)

| Frontend Field | Backend Model.Field       | Status                            |
| -------------- | ------------------------- | --------------------------------- |
| `companyName`  | `Organization.name`       | ✅ Perfect Match                  |
| `email`        | `CustomUser.email`        | ✅ Perfect Match                  |
| `firstName`    | `CustomUser.first_name`   | ✅ Perfect Match                  |
| `lastName`     | `CustomUser.last_name`    | ✅ Perfect Match                  |
| `phone`        | `CustomUser.phone_number` | ✅ Perfect Match                  |
| `password`     | `CustomUser.password`     | ✅ Perfect Match (will be hashed) |

---

### ⚠️ MISSING REQUIRED FIELDS (Backend Requires, Frontend Missing)

#### **Critical - Must Add to Form:**

1. **`employee_id`** (CustomUser)
   - **Status**: ❌ **NOT COLLECTED**
   - **Required**: Yes (unique=True)
   - **Type**: CharField(max_length=50)
   - **Purpose**: Unique employee identifier
   - **Recommendation**:
     - **Option 1**: Auto-generate from email (e.g., `john.smith` from `john.smith@company.com`)
     - **Option 2**: Add input field in Step 2 (Personal Information)
     - **Option 3**: Generate UUID and assign automatically

2. **`department`** (CustomUser.department_id)
   - **Status**: ❌ **NOT COLLECTED**
   - **Required**: Yes (ForeignKey, cannot be null)
   - **Type**: ForeignKey to Department
   - **Purpose**: User's department within organization
   - **Recommendation**:
     - **Option 1**: Add department selection dropdown in Step 2
     - **Option 2**: Create default "General" department and assign all new users
     - **Option 3**: Assign based on job title mapping

3. **`department.code`** (Department)
   - **Status**: ❌ **NOT COLLECTED**
   - **Required**: Yes (unique=True)
   - **Type**: CharField(max_length=20)
   - **Purpose**: Department code (e.g., "FIN", "IT", "HR")
   - **Recommendation**: Auto-generate from department name or use predefined codes

4. **`username`** (CustomUser - inherited from AbstractUser)
   - **Status**: ❌ **NOT COLLECTED**
   - **Required**: Yes (unique=True)
   - **Type**: CharField
   - **Purpose**: Login username
   - **Recommendation**: Auto-generate from email (e.g., use email prefix or full email)

---

### 📋 COLLECTED BUT NOT STORED (Frontend Collects, Backend Doesn't Store)

#### **Company Information:**

1. **`companyRegistrationNumber`**
   - **Status**: ⚠️ **Collected but not stored**
   - **Backend**: No matching field in any model
   - **Recommendation**:
     - Add to Organization model as `registration_number` field
     - Or store in organization metadata (JSON field)

2. **`companyTaxId`**
   - **Status**: ⚠️ **Collected but not stored**
   - **Backend**: No matching field in any model
   - **Recommendation**:
     - Add to Organization model as `tax_id` field
     - Or store in organization metadata

3. **`industry`**
   - **Status**: ⚠️ **Collected but not stored**
   - **Backend**: No matching field in any model
   - **Recommendation**:
     - Add to Organization model as `industry` field (CharField with choices)
     - Useful for analytics and industry-specific features

#### **Personal Information:**

4. **`jobTitle`**
   - **Status**: ⚠️ **Collected but not stored**
   - **Backend**: No matching field in CustomUser
   - **Recommendation**:
     - Add to CustomUser model as `job_title` field
     - Or use it to auto-map to department

5. **`addressLine1`**
   - **Status**: ⚠️ **Collected but not stored**
   - **Backend**: No address fields in CustomUser
   - **Recommendation**:
     - Add address fields to CustomUser or Organization
     - Create separate Address model

6. **`addressLine2`**
   - **Status**: ⚠️ **Collected but not stored**
   - **Backend**: No address fields
   - **Recommendation**: Same as addressLine1

7. **`city`**
   - **Status**: ⚠️ **Collected but not stored**
   - **Recommendation**: Add to address fields

8. **`state`**
   - **Status**: ⚠️ **Collected but not stored**
   - **Recommendation**: Add to address fields

9. **`postalCode`**
   - **Status**: ⚠️ **Collected but not stored**
   - **Recommendation**: Add to address fields

10. **`country`**
    - **Status**: ⚠️ **Collected but not stored**
    - **Backend**: No country field
    - **Recommendation**:
      - Add to CustomUser or Organization
      - Important for compliance, timezone, phone validation

#### **Agreements:**

11. **`termsAccepted`**
    - **Status**: ⚠️ **Collected but not stored**
    - **Backend**: No field to track acceptance
    - **Recommendation**:
      - Add `terms_accepted_at` (DateTimeField) to CustomUser
      - Important for legal compliance

12. **`privacyAccepted`**
    - **Status**: ⚠️ **Collected but not stored**
    - **Backend**: No field to track acceptance
    - **Recommendation**:
      - Add `privacy_accepted_at` (DateTimeField) to CustomUser
      - Required for GDPR compliance

13. **`marketingAccepted`**
    - **Status**: ⚠️ **Collected but not stored**
    - **Backend**: No field to track preference
    - **Recommendation**:
      - Add `marketing_consent` (BooleanField) to CustomUser
      - Important for marketing communications

---

### 🔍 DERIVED/AUTO-GENERATED FIELDS

These are extracted or generated from form data:

1. **`Organization.domain`**
   - **Source**: Extracted from `email` (e.g., `company.com` from `user@company.com`)
   - **Status**: ✅ Auto-generated from email
   - **Validation**: Must be business email (not personal)

2. **`Organization.slug`**
   - **Source**: Auto-generated from `companyName`
   - **Status**: ✅ Auto-generated in `save()` method

3. **`CustomUser.username`**
   - **Source**: Should be derived from `email`
   - **Status**: ⚠️ **Needs implementation**
   - **Recommendation**: Use email or email prefix

4. **`CustomUser.employee_id`**
   - **Source**: Should be auto-generated or derived
   - **Status**: ⚠️ **Needs implementation**
   - **Recommendation**: Generate from email or UUID

---

## Recommendations

### **Priority 1: Critical Missing Fields (Block Registration)**

These MUST be addressed before registration can work:

1. ✅ **Add `username` generation logic**

   ```python
   username = email.split('@')[0]  # or use full email
   ```

2. ✅ **Add `employee_id` generation logic**

   ```python
   employee_id = f"EMP-{uuid.uuid4().hex[:8].upper()}"
   # or: employee_id = email.split('@')[0]
   ```

3. ✅ **Handle `department` requirement**
   - **Option A**: Create default "General" department for organization
   - **Option B**: Add department selection to form (Step 2)
   - **Recommended**: Option A (simpler UX)

### **Priority 2: Data Loss (Data Collected but Not Saved)**

Add these fields to models to prevent data loss:

**Extend Organization Model:**

```python
class Organization(models.Model):
    # ... existing fields ...
    registration_number = models.CharField(max_length=100, blank=True)
    tax_id = models.CharField(max_length=100, blank=True)
    industry = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
```

**Extend CustomUser Model:**

```python
class CustomUser(AbstractUser):
    # ... existing fields ...
    job_title = models.CharField(max_length=100, blank=True)

    # Address fields
    address_line1 = models.CharField(max_length=255, blank=True)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, blank=True)

    # Compliance fields
    terms_accepted_at = models.DateTimeField(null=True, blank=True)
    privacy_accepted_at = models.DateTimeField(null=True, blank=True)
    marketing_consent = models.BooleanField(default=False)
```

### **Priority 3: Registration API Endpoint**

Create registration endpoint that handles:

```python
# POST /api/v1/auth/register/
{
    # Step 1: Company Information
    "company_name": "Acme Financial Solutions",
    "company_registration_number": "REG-2024-001234",
    "company_tax_id": "12-3456789",
    "industry": "Financial Services",

    # Step 2: Personal Information
    "first_name": "John",
    "last_name": "Smith",
    "email": "john.smith@acmefinancial.com",
    "phone": "+12125551234",
    "country": "United States",
    "job_title": "Chief Financial Officer",
    "address_line1": "123 Wall Street, Suite 500",
    "address_line2": "",
    "city": "New York",
    "state": "NY",
    "postal_code": "10005",

    # Step 3: Security
    "password": "SecurePass123!",
    "terms_accepted": true,
    "privacy_accepted": true,
    "marketing_accepted": false
}
```

**Backend Processing:**

1. Extract domain from email → Create/Get Organization
2. Add company fields to Organization
3. Create default Department (if not exists)
4. Generate username and employee_id
5. Create CustomUser with all fields
6. Create OrganizationMember with role='owner'
7. Send verification emails (optional)
8. Return success + JWT tokens

---

## Migration Plan

### Step 1: Add Missing Fields to Models

```bash
# Create migration for Organization
python manage.py makemigrations organizations --name add_company_details

# Create migration for CustomUser
python manage.py makemigrations users --name add_user_profile_fields

# Apply migrations
python manage.py migrate
```

### Step 2: Update Serializers

Create registration serializer that handles all fields:

```python
# apps/users/serializers.py
class RegistrationSerializer(serializers.Serializer):
    # Company fields
    company_name = serializers.CharField(max_length=200)
    company_registration_number = serializers.CharField(max_length=100)
    company_tax_id = serializers.CharField(max_length=100)
    industry = serializers.CharField(max_length=100)

    # Personal fields
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField(validators=[validate_business_email])
    phone = serializers.CharField(max_length=20)
    country = serializers.CharField(max_length=100)
    job_title = serializers.CharField(max_length=100)

    # Address fields
    address_line1 = serializers.CharField(max_length=255)
    address_line2 = serializers.CharField(max_length=255, allow_blank=True)
    city = serializers.CharField(max_length=100)
    state = serializers.CharField(max_length=100)
    postal_code = serializers.CharField(max_length=20)

    # Security
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    # Agreements
    terms_accepted = serializers.BooleanField()
    privacy_accepted = serializers.BooleanField()
    marketing_accepted = serializers.BooleanField(default=False)
```

### Step 3: Create Registration View

```python
# apps/users/views.py
class RegistrationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegistrationSerializer(data=request.data)
        if serializer.is_valid():
            # Extract domain from email
            domain = extract_domain_from_email(serializer.validated_data['email'])

            # Create or get organization
            organization, created = Organization.objects.get_or_create(
                domain=domain,
                defaults={
                    'name': serializer.validated_data['company_name'],
                    'registration_number': serializer.validated_data['company_registration_number'],
                    'tax_id': serializer.validated_data['company_tax_id'],
                    'industry': serializer.validated_data['industry'],
                    'country': serializer.validated_data['country'],
                }
            )

            # Create default department if needed
            department, _ = Department.objects.get_or_create(
                organization=organization,
                code='GENERAL',
                defaults={'name': 'General'}
            )

            # Generate username and employee_id
            username = serializer.validated_data['email'].split('@')[0]
            employee_id = f"EMP-{uuid.uuid4().hex[:8].upper()}"

            # Create user
            user = CustomUser.objects.create_user(
                username=username,
                email=serializer.validated_data['email'],
                password=serializer.validated_data['password'],
                first_name=serializer.validated_data['first_name'],
                last_name=serializer.validated_data['last_name'],
                employee_id=employee_id,
                organization=organization,
                department=department,
                phone_number=serializer.validated_data['phone'],
                job_title=serializer.validated_data['job_title'],
                address_line1=serializer.validated_data['address_line1'],
                address_line2=serializer.validated_data['address_line2'],
                city=serializer.validated_data['city'],
                state=serializer.validated_data['state'],
                postal_code=serializer.validated_data['postal_code'],
                country=serializer.validated_data['country'],
                terms_accepted_at=timezone.now() if serializer.validated_data['terms_accepted'] else None,
                privacy_accepted_at=timezone.now() if serializer.validated_data['privacy_accepted'] else None,
                marketing_consent=serializer.validated_data['marketing_accepted'],
            )

            # Create organization membership with owner role
            OrganizationMember.objects.create(
                organization=organization,
                user=user,
                role='owner'
            )

            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)

            return Response({
                'success': True,
                'message': 'Registration successful',
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                },
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'full_name': user.full_name,
                    'organization': organization.name,
                }
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

---

## Summary

### Current Status:

- **Matching Fields**: 6/20 fields (30%)
- **Missing Required Backend Fields**: 4 critical
- **Collected but Not Stored**: 13 fields (65% data loss!)
- **Registration Will Fail**: Yes (missing required FK fields)

### Action Items:

**Immediate (Blocking):**

1. ❌ Add `username` generation logic
2. ❌ Add `employee_id` generation logic
3. ❌ Handle `department` requirement (create default)
4. ❌ Create registration API endpoint

**Important (Data Loss):** 5. ⚠️ Add company fields to Organization model 6. ⚠️ Add profile fields to CustomUser model 7. ⚠️ Add address fields to CustomUser model 8. ⚠️ Add compliance fields to CustomUser model

**Nice to Have:** 9. 📋 Add email verification flow 10. 📋 Add phone verification (OTP) 11. 📋 Add avatar upload during registration 12. 📋 Create organization onboarding flow

---

**Conclusion**: The signup form collects excellent data, but **65% of it is being lost** because the backend models don't have fields to store it. Additionally, there are **4 critical required fields** that aren't being collected/generated, which will cause registration to fail.

**Recommendation**: Extend the models first (Priority 2), then implement the auto-generation logic (Priority 1), then create the registration endpoint (Priority 3).
