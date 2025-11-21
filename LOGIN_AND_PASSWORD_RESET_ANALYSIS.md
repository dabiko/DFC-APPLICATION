# Login Page & Password Reset Analysis

## Date: November 21, 2025

---

## Executive Summary

After thorough analysis of both frontend and backend code:

### ✅ Login Page - PARTIALLY FUNCTIONAL
- Login form fields **MATCH** backend API requirements
- "Remember Me" checkbox is **NOT IMPLEMENTED** on backend
- Login API endpoint exists and is functional

### ❌ Forgot Password - NOT IMPLEMENTED
- Frontend has a link to `/forgot-password` but **NO PAGE EXISTS**
- Backend has **NO PASSWORD RESET ENDPOINTS**
- Complete password reset flow needs to be built

---

## 1. Login Page Analysis

### Frontend Login Form (`frontend/src/pages/Login.tsx`)

**Form Fields:**
```typescript
interface LoginFormData {
  email: string
  password: string
  rememberMe: boolean  // ⚠️ NOT USED BY BACKEND
}
```

**Current Implementation:**
- ✅ Email field (validated)
- ✅ Password field (validated, with show/hide toggle)
- ⚠️ **Remember Me checkbox** (collected but NOT sent to backend)
- ✅ Forgot Password link (points to `/forgot-password` which **DOESN'T EXIST**)
- ❌ **TODO comment on line 241**: "TODO: Replace with actual API call"
- ❌ Currently uses **SIMULATED** login (2-second delay, no real API call)

**Code Evidence (Lines 237-249):**
```typescript
try {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // TODO: Replace with actual API call
  console.log('Login attempt:', {
    email: formData.email,
    password: '***',
    rememberMe: formData.rememberMe,
  })

  // Simulate successful login
  navigate('/dashboard')
} catch (error) {
  // ...
}
```

**Issues:**
1. ❌ No actual API call to backend
2. ❌ `rememberMe` value is collected but never sent to backend
3. ❌ No JWT token storage
4. ❌ No authentication state management

---

### Backend Login API (`backend/apps/users/views.py`)

**Endpoint:** `POST /api/v1/auth/login/`

**View:** `LoginView` (extends `TokenObtainPairView`)

**Serializer:** `CustomTokenObtainPairSerializer`

**Expected Request Body:**
```json
{
  "username": "john.doe@company.com",  // or actual username
  "password": "SecurePassword123!"
}
```

**Note:** Django REST Framework SimpleJWT uses `username` field, but it can accept email if `USERNAME_FIELD = 'email'` is set in the User model.

**Response (Success - HTTP 200):**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "username": "john.doe",
    "email": "john.doe@company.com",
    "first_name": "John",
    "last_name": "Doe",
    "employee_id": "EMP-A7B3C9D1",
    "department": "General",
    "is_staff": false,
    "is_superuser": false,
    "mfa_enabled": false,
    "organization_id": "uuid-here",
    "organization_name": "Acme Financial",
    "organization_domain": "acmefinancial.com"
  }
}
```

**Backend Features:**
- ✅ JWT token generation (access + refresh)
- ✅ Failed login attempt tracking
- ✅ Account lockout after 5 failed attempts (24-hour lockout)
- ✅ Returns comprehensive user information
- ✅ Multi-tenant organization context included
- ❌ **NO "Remember Me" functionality**

---

## 2. "Remember Me" Functionality Analysis

### Frontend
- ✅ Checkbox is rendered in UI
- ✅ State is managed (`formData.rememberMe`)
- ✅ Value is logged to console
- ❌ **Value is NOT sent to backend**

### Backend
- ❌ **NO support for "Remember Me" functionality**
- ❌ NO database field to store remember me preference
- ❌ NO logic to extend token expiration based on remember me

### How "Remember Me" Should Work:

**Standard Implementation:**
1. **Short-lived tokens (default):**
   - Access token: 5-15 minutes
   - Refresh token: 24 hours

2. **Long-lived tokens (remember me = true):**
   - Access token: 5-15 minutes (same)
   - Refresh token: 7-30 days

**Implementation Options:**

**Option 1: Frontend-Only (Recommended for MVP)**
```typescript
// Store refresh token in localStorage if rememberMe = true
// Otherwise store in sessionStorage (cleared when browser closes)

if (formData.rememberMe) {
  localStorage.setItem('refresh_token', data.refresh)
  localStorage.setItem('access_token', data.access)
} else {
  sessionStorage.setItem('refresh_token', data.refresh)
  sessionStorage.setItem('access_token', data.access)
}
```

**Option 2: Backend Support (More Secure)**
- Modify backend to accept `remember_me` field in login request
- Adjust refresh token expiration based on `remember_me` value
- Requires changes to JWT settings and CustomTokenObtainPairSerializer

---

## 3. Forgot Password Analysis

### Frontend
- ❌ **NO forgot password page exists**
- ✅ Link exists in Login.tsx (line 339-344)
- ✅ Link points to `/forgot-password` route

**Code Evidence (Lines 339-344):**
```tsx
<Link
  to="/forgot-password"
  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer"
>
  Forgot password?
</Link>
```

**What's Missing:**
1. ❌ No `ForgotPassword.tsx` page component
2. ❌ No route defined in router configuration
3. ❌ No password reset request form
4. ❌ No password reset confirmation page

### Backend
- ❌ **NO password reset endpoints exist**
- ❌ NO password reset token generation
- ❌ NO password reset email functionality
- ❌ NO password reset confirmation endpoint

**What's Missing:**
1. ❌ `POST /api/v1/auth/password/reset/` - Request password reset
2. ❌ `POST /api/v1/auth/password/reset/confirm/` - Confirm password reset with token
3. ❌ Password reset token model or storage
4. ❌ Email sending functionality for reset links
5. ❌ Password reset email templates

---

## 4. Field Mapping: Login Form ↔ Backend API

| Frontend Field | Backend Field | Status | Notes |
|---|---|---|---|
| email | username (or email) | ✅ Compatible | Backend accepts email if `USERNAME_FIELD='email'` |
| password | password | ✅ Match | Standard password field |
| rememberMe | *(not supported)* | ❌ **NOT IMPLEMENTED** | Collected but not used |

**Result:** Login form fields match backend requirements, but **rememberMe is not functional**.

---

## 5. Current JWT Token Configuration

**File:** `backend/config/settings/base.py` (assumed)

**Typical SimpleJWT Settings:**
```python
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),   # Short-lived
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),      # 24 hours
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
}
```

**Current Behavior:**
- Access tokens expire after 15 minutes (likely)
- Refresh tokens expire after 24 hours (likely)
- No "remember me" functionality to extend refresh token lifetime

---

## 6. Required Implementations

### High Priority (Broken Links)

#### A. Connect Frontend Login to Backend API ⚠️ **CRITICAL**

**Current State:** Frontend uses simulated login
**Required:** Actual API integration

**Implementation Steps:**
1. Update `Login.tsx` handleSubmit function
2. Make POST request to `http://localhost:8000/api/v1/auth/login/`
3. Send `{ username: email, password: password }` (note: username field, not email)
4. Store JWT tokens (access + refresh)
5. Store user data
6. Redirect to dashboard on success
7. Handle errors (invalid credentials, account locked)

**Example Code:**
```typescript
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault()

  if (!validateForm()) return

  setLoading(true)
  setErrors({})

  try {
    const response = await fetch('http://localhost:8000/api/v1/auth/login/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: formData.email,  // Backend expects 'username' field
        password: formData.password,
      }),
    })

    const data = await response.json()

    if (response.ok) {
      // Store tokens based on Remember Me
      const storage = formData.rememberMe ? localStorage : sessionStorage
      storage.setItem('access_token', data.access)
      storage.setItem('refresh_token', data.refresh)
      storage.setItem('user', JSON.stringify(data.user))

      // Redirect to dashboard
      navigate('/dashboard')
    } else {
      setErrors({ submit: data.detail || 'Invalid credentials' })
    }
  } catch (error) {
    setErrors({ submit: 'Network error. Please try again.' })
  } finally {
    setLoading(false)
  }
}
```

#### B. Implement "Remember Me" Functionality ⚠️ **IMPORTANT**

**Option 1: Frontend-Only (Quick Fix)**
- Use localStorage for remember me = true
- Use sessionStorage for remember me = false
- No backend changes required

**Option 2: Backend Support (Proper Solution)**
1. Add `remember_me` field to login serializer
2. Adjust refresh token lifetime based on remember_me value
3. Update JWT settings to support variable token lifetimes

**Recommended:** Start with Option 1, upgrade to Option 2 later.

#### C. Implement Complete Password Reset Flow ❌ **MISSING ENTIRELY**

**Frontend Components Needed:**
1. `ForgotPassword.tsx` - Request password reset form
2. `ResetPassword.tsx` - Reset password with token form
3. Router routes for both pages

**Backend Endpoints Needed:**
1. `POST /api/v1/auth/password/reset/request/` - Send reset email
2. `POST /api/v1/auth/password/reset/confirm/` - Reset password with token
3. `GET /api/v1/auth/password/reset/validate-token/` - Validate reset token

**Backend Models/Features Needed:**
1. Password reset token storage (or use Django's built-in)
2. Email sending configuration (SMTP)
3. Password reset email template
4. Token generation and validation logic
5. Token expiration (typically 1 hour)

---

## 7. Security Considerations

### Current Security Features ✅
- ✅ Password hashing (Django PBKDF2)
- ✅ JWT token authentication
- ✅ Failed login attempt tracking
- ✅ Account lockout after 5 failed attempts (24 hours)
- ✅ Refresh token blacklisting on logout
- ✅ Password validation on registration

### Security Gaps ⚠️
- ⚠️ No rate limiting on login endpoint
- ⚠️ No CAPTCHA on login form
- ⚠️ No email verification before login
- ⚠️ No MFA enforcement (MFA exists but not enforced)
- ❌ No password reset functionality (security risk - users can't recover accounts)

---

## 8. Recommended Implementation Order

### Phase 1: Fix Critical Issues (Week 1)
1. ✅ Connect Login page to backend API
2. ✅ Implement Remember Me (frontend-only solution)
3. ✅ Add proper error handling for account lockouts

### Phase 2: Password Reset (Week 2)
1. ❌ Create ForgotPassword.tsx page
2. ❌ Create ResetPassword.tsx page
3. ❌ Implement backend password reset endpoints
4. ❌ Configure email sending (SMTP)
5. ❌ Create password reset email template
6. ❌ Add router routes

### Phase 3: Security Enhancements (Week 3)
1. ⚠️ Add rate limiting to login endpoint
2. ⚠️ Implement CAPTCHA on login form
3. ⚠️ Add email verification requirement
4. ⚠️ Implement backend Remember Me support

---

## 9. Django Built-in Password Reset

Django provides built-in password reset views that can be used:

**Django URLs (if using Django templates):**
```python
from django.contrib.auth import views as auth_views

urlpatterns = [
    path('password_reset/', auth_views.PasswordResetView.as_view(), name='password_reset'),
    path('password_reset/done/', auth_views.PasswordResetDoneView.as_view(), name='password_reset_done'),
    path('reset/<uidb64>/<token>/', auth_views.PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('reset/done/', auth_views.PasswordResetCompleteView.as_view(), name='password_reset_complete'),
]
```

**For API (DRF):**
Use `django-rest-passwordreset` package or implement custom views.

---

## 10. Summary & Action Items

### Current Status

| Feature | Frontend | Backend | Status |
|---|---|---|---|
| Login Form | ✅ Exists | ✅ Exists | ⚠️ NOT CONNECTED |
| Email Field | ✅ Collected | ✅ Accepted | ✅ Compatible |
| Password Field | ✅ Collected | ✅ Accepted | ✅ Compatible |
| Remember Me Checkbox | ✅ Rendered | ❌ Not Supported | ❌ NOT FUNCTIONAL |
| Forgot Password Link | ✅ Exists | ❌ No Endpoint | ❌ BROKEN LINK |
| Forgot Password Page | ❌ Missing | ❌ Missing | ❌ NOT IMPLEMENTED |
| Password Reset Backend | N/A | ❌ Missing | ❌ NOT IMPLEMENTED |

### Critical Action Items

1. **URGENT:** Connect Login.tsx to backend `/api/v1/auth/login/` endpoint
2. **URGENT:** Implement Remember Me (localStorage vs sessionStorage)
3. **HIGH:** Create ForgotPassword.tsx page
4. **HIGH:** Implement password reset backend endpoints
5. **MEDIUM:** Configure email sending for password resets
6. **LOW:** Add backend support for Remember Me token expiration

---

## Conclusion

**Login Page:** Fields match, but implementation is incomplete. The login form collects the right data, but:
- ❌ Doesn't actually connect to the backend
- ❌ Remember Me checkbox does nothing
- ⚠️ Currently uses simulated 2-second delay

**Forgot Password:** Completely missing on both frontend and backend. The link exists but goes nowhere.

**Priority:** Fix login API integration first, then implement password reset flow.

---

**Analysis Date:** November 21, 2025
**Analyst:** Claude Code
**Status:** Comprehensive analysis complete, implementation required
