# SignUp Test Data

## Valid Test Account Data

Use this data to create a test account on the SignUp page (`/register` or `/signup`).

### Step 1: Company Information

```
Company Name: Acme Financial Solutions
Company Registration Number: REG-2024-001234
Tax ID: 12-3456789
Industry: Financial Services
```

### Step 2: Personal Information & KYC

```
First Name: John
Last Name: Smith
Email: john.smith@acmefinancial.com
        (Must be a business email - NOT Gmail, Yahoo, Hotmail, etc.)
Country: United States (US)
Phone Number: 2125551234
             (Enter digits only, country code will be added automatically)
Job Title: Chief Financial Officer

Address Line 1: 123 Wall Street
Address Line 2: Suite 500 (optional)
City: New York
State/Province: NY
Postal Code: 10005
```

### Step 3: Security

```
Password: SecurePass123!
         (Must meet requirements: 8+ chars, uppercase, lowercase, number, special char)
Confirm Password: SecurePass123!

☑ I agree to the Terms of Service
☑ I agree to the Privacy Policy
☐ I want to receive product updates (optional)
```

### OTP Verification

When testing OTP verification (if implemented):

- **Demo OTP Code**: `123456`
- Use this code for both email and phone verification

---

## Alternative Test Accounts

### Test Account 2 - Tech Company

```
**Company:**
- Name: TechCorp Industries
- Registration: TC-UK-987654
- Tax ID: GB-123456789
- Industry: Technology

**Personal:**
- Name: Jane Doe
- Email: jane.doe@techcorp.io
- Country: United Kingdom (GB)
- Phone: 2079461234
- Job Title: IT Director
- Address: 10 Downing Street, London, SW1A 2AA

**Security:**
- Password: Tech@2024Secure
```

### Test Account 3 - Healthcare

```
**Company:**
- Name: HealthCare Plus LLC
- Registration: HC-CA-456789
- Tax ID: CA-987654321
- Industry: Healthcare

**Personal:**
- Name: Dr. Sarah Johnson
- Email: s.johnson@healthcareplus.org
- Country: Canada (CA)
- Phone: 4165551234
- Job Title: Medical Director
- Address: 100 Queen Street, Toronto, ON M5H 2N2

**Security:**
- Password: Health#2024Strong
```

---

## Password Requirements

Your password must meet ALL of these requirements:

- ✓ At least 8 characters
- ✓ At least one uppercase letter (A-Z)
- ✓ At least one lowercase letter (a-z)
- ✓ At least one number (0-9)
- ✓ At least one special character (!@#$%^&\*...)
- ✓ No repeating characters (e.g., aaa, 111)

---

## Email Validation Rules

**Accepted**: Business/company email addresses

- Examples: name@company.com, user@business.co.uk, admin@org.io

**Rejected**: Personal email providers

- Gmail (gmail.com, googlemail.com)
- Yahoo (yahoo.com, ymail.com)
- Hotmail/Outlook (hotmail.com, outlook.com, live.com)
- AOL (aol.com)
- iCloud (icloud.com, me.com)
- And 10+ other personal email providers

**Error Message**: "Please use your company email address. Personal email providers (Gmail, Yahoo, etc.) are not allowed."

---

## Country Selection

The system supports **135 countries** across three regions:

- **46 European countries** (e.g., UK, France, Germany, Spain)
- **35 American countries** (e.g., USA, Canada, Brazil, Mexico)
- **54 African countries** (e.g., Nigeria, South Africa, Kenya, Egypt)

The country dropdown is **searchable** - you can type to filter countries.

---

## Field Validation Summary

| Field               | Required | Validation Rule     | Error Message                                                             |
| ------------------- | -------- | ------------------- | ------------------------------------------------------------------------- |
| Company Name        | Yes      | Min 2 chars         | "Company name is required" / "Company name must be at least 2 characters" |
| Registration Number | Yes      | Any value           | "Company registration number is required"                                 |
| Tax ID              | Yes      | Any value           | "Tax ID is required"                                                      |
| Industry            | Yes      | Select from list    | "Industry is required"                                                    |
| First Name          | Yes      | Min 2 chars         | "First name is required" / "Must be at least 2 characters"                |
| Last Name           | Yes      | Min 2 chars         | "Last name is required" / "Must be at least 2 characters"                 |
| Email               | Yes      | Business email only | Custom validation message                                                 |
| Country             | Yes      | Select from list    | "Country is required"                                                     |
| Phone               | Yes      | Min 6 digits        | "Phone number is required" / "Please enter a valid phone number"          |
| Job Title           | Yes      | Any value           | "Job title is required"                                                   |
| Address Line 1      | Yes      | Any value           | "Address is required"                                                     |
| Address Line 2      | No       | Any value           | -                                                                         |
| City                | Yes      | Any value           | "City is required"                                                        |
| State/Province      | Yes      | Any value           | "State/Province is required"                                              |
| Postal Code         | Yes      | Any value           | "Postal code is required"                                                 |
| Password            | Yes      | See password rules  | Custom validation message                                                 |
| Confirm Password    | Yes      | Must match password | "Please confirm your password" / "Passwords do not match"                 |
| Terms Accepted      | Yes      | Must check          | "You must accept to continue"                                             |
| Privacy Accepted    | Yes      | Must check          | "You must accept to continue"                                             |
| Marketing Accepted  | No       | Optional            | -                                                                         |

---

## Quick Copy-Paste Data

For quick testing, copy and paste this data step-by-step:

### Step 1:

```
Acme Financial Solutions
REG-2024-001234
12-3456789
Financial Services
```

### Step 2:

```
John
Smith
john.smith@acmefinancial.com
United States
2125551234
Chief Financial Officer
123 Wall Street
Suite 500
New York
NY
10005
```

### Step 3:

```
SecurePass123!
SecurePass123!
```

---

## Notes

- All required fields are marked with an asterisk (\*) in the UI
- Real-time validation occurs as you type
- Errors are displayed inline below each field
- The "Next" button is disabled until all required fields in the current step are valid
- Navigation buttons have appropriate cursor pointers
- The form supports both light and dark modes
- Background animation provides visual appeal without affecting usability
