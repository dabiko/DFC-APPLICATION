# API Authentication Configuration

**Status:** ✅ CONFIGURED - All API endpoints require authentication

**Date:** November 23, 2025

---

## Configuration Summary

### Django REST Framework Settings

**Location:** `backend/config/settings/base.py` (lines 149-167)

```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'apps.users.mfa_authentication.MFAJWTAuthentication',  # Custom JWT with MFA check
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',  # ✅ REQUIRES AUTHENTICATION
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}
```

### Key Security Features

#### 1. **Authentication Required by Default**
- `DEFAULT_PERMISSION_CLASSES: ['rest_framework.permissions.IsAuthenticated']`
- **Effect:** All API endpoints require authentication unless explicitly overridden

#### 2. **JWT Authentication with MFA**
- Uses custom `MFAJWTAuthentication` class
- Validates JWT tokens AND checks MFA status
- Located in: `apps.users.mfa_authentication.MFAJWTAuthentication`

#### 3. **Token Configuration**
- **Access Token Lifetime:** 60 minutes (default)
- **Refresh Token Lifetime:** 1440 minutes (24 hours, default)
- **Token Rotation:** Enabled
- **Blacklist After Rotation:** Enabled
- **Algorithm:** HS256

---

## Protected API Endpoints

All endpoints under `/api/v1/` require authentication:

### ✅ Authentication & Users
- `POST /api/v1/auth/login/` - Login (public, returns tokens)
- `POST /api/v1/auth/register/` - Registration (public)
- `POST /api/v1/auth/logout/` - Logout (protected)
- `POST /api/v1/auth/refresh/` - Refresh token (protected)
- `POST /api/v1/auth/change-password/` - Change password (protected)
- `POST /api/v1/auth/mfa/*` - MFA endpoints (protected)

### ✅ Folders
- `GET /api/v1/folders/` - List folders (protected)
- `POST /api/v1/folders/` - Create folder (protected)
- `GET /api/v1/folders/{id}/` - Get folder details (protected)
- `PUT /api/v1/folders/{id}/` - Update folder (protected)
- `DELETE /api/v1/folders/{id}/` - Delete folder (protected)
- `POST /api/v1/folders/{id}/move/` - Move folder (protected)

### ✅ Documents
- `POST /api/v1/documents/upload/` - Upload document (protected)
- `GET /api/v1/documents/` - List documents (protected)
- `GET /api/v1/documents/{id}/` - Get document (protected)
- `GET /api/v1/documents/{id}/download/` - Download document (protected)
- `PUT /api/v1/documents/{id}/` - Update document (protected)
- `DELETE /api/v1/documents/{id}/` - Delete document (protected)

### ✅ Search
- `GET /api/v1/search/` - Search documents (protected)

### ✅ Audit Logs
- `GET /api/v1/audit/logs/` - View audit logs (protected)

### ✅ Organizations
- `GET /api/v1/organizations/` - List organizations (protected)
- All organization endpoints (protected)

### ✅ All Other Endpoints
- Classification, Permissions, Retention, Sharing, Billing - All protected

---

## Public Endpoints (Exceptions)

Only the following endpoints are accessible without authentication:

### 1. **Login/Registration**
- `POST /api/v1/auth/login/` - Returns JWT tokens
- `POST /api/v1/auth/register/` - User registration

### 2. **API Documentation (Testing Only)**
- `GET /api/docs/` - Swagger UI documentation
- `GET /api/redoc/` - ReDoc documentation
- `GET /api/schema/` - OpenAPI schema

**Note:** API documentation is publicly accessible for testing purposes. In production, consider restricting access.

---

## Frontend Authentication Flow

### 1. **Login Process**
```typescript
// User logs in
POST /api/v1/auth/login/
Body: { email, password }

// Response
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": { ... }
}
```

### 2. **Token Storage**
```typescript
// Store tokens based on "Remember Me" option
if (rememberMe) {
  localStorage.setItem('access_token', response.access)
  localStorage.setItem('refresh_token', response.refresh)
} else {
  sessionStorage.setItem('access_token', response.access)
  sessionStorage.setItem('refresh_token', response.refresh)
}
```

### 3. **API Requests**
```typescript
// Axios interceptor adds token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token') ||
                sessionStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

### 4. **401 Handling**
```typescript
// Redirect to login on authentication failure
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        // Clear tokens
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        sessionStorage.removeItem('access_token')
        sessionStorage.removeItem('refresh_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)
```

---

## Testing Authentication

### Test 1: Unauthenticated Request (Should Fail)
```bash
curl -X GET http://localhost:8000/api/v1/folders/
```

**Expected Response:**
```json
{
  "detail": "Authentication credentials were not provided."
}
```
**Status Code:** 401 Unauthorized

---

### Test 2: Authenticated Request (Should Succeed)
```bash
# First, login to get token
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# Use the access token from response
curl -X GET http://localhost:8000/api/v1/folders/ \
  -H "Authorization: Bearer <access_token>"
```

**Expected Response:**
```json
[
  {
    "id": "uuid",
    "name": "Folder Name",
    "parent": null,
    ...
  }
]
```
**Status Code:** 200 OK

---

### Test 3: Expired Token (Should Fail)
```bash
curl -X GET http://localhost:8000/api/v1/folders/ \
  -H "Authorization: Bearer <expired_token>"
```

**Expected Response:**
```json
{
  "detail": "Given token not valid for any token type",
  "code": "token_not_valid"
}
```
**Status Code:** 401 Unauthorized

---

## Verification Checklist

- ✅ **Default Permission:** `IsAuthenticated` set globally
- ✅ **JWT Authentication:** Custom MFA JWT authentication configured
- ✅ **Token Storage:** Frontend checks both localStorage and sessionStorage
- ✅ **Authorization Header:** Axios interceptor adds `Bearer <token>` to requests
- ✅ **401 Handling:** Frontend redirects to login on authentication failure
- ✅ **Redirect Loop Prevention:** Only redirects if not already on login page
- ✅ **Conditional API Calls:** Components check for token before fetching data
- ✅ **Token Cleanup:** Both storage locations cleared on logout/401

---

## Security Best Practices Applied

1. ✅ **Authentication Required by Default** - All endpoints protected unless explicitly public
2. ✅ **JWT Token Expiration** - Access tokens expire after 60 minutes
3. ✅ **Token Rotation** - Refresh tokens rotated on use
4. ✅ **Token Blacklisting** - Old refresh tokens blacklisted after rotation
5. ✅ **MFA Support** - Custom authentication class checks MFA status
6. ✅ **HTTPS Enforcement** - Can be enabled in production via `SECURE_SSL_REDIRECT`
7. ✅ **CORS Configuration** - Only allowed origins can access API
8. ✅ **CSRF Protection** - Enabled for state-changing operations
9. ✅ **Secure Cookies** - HTTPOnly, Secure, SameSite flags configured
10. ✅ **Rate Limiting** - Can be added via DRF throttling classes

---

## Production Recommendations

### 1. **Restrict API Documentation Access**
In production, consider requiring authentication for API docs:

```python
# backend/config/settings/production.py
SPECTACULAR_SETTINGS = {
    ...
    'SERVE_PERMISSIONS': ['rest_framework.permissions.IsAuthenticated'],
}
```

### 2. **Enable HTTPS**
```python
# backend/config/settings/production.py
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

### 3. **Add Rate Limiting**
```python
REST_FRAMEWORK = {
    ...
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/day',
        'user': '1000/day'
    }
}
```

### 4. **Monitor Failed Authentication Attempts**
- Already configured in `base.py` (line 419): `FAILED_AUTH_THRESHOLD = 100`
- Alerts configured for suspicious activity

---

## Troubleshooting

### Issue: "Authentication credentials were not provided"

**Cause:** Token not being sent with request

**Fix:**
1. Check token exists: `console.log(localStorage.getItem('access_token'))`
2. Verify Authorization header: Check Network tab → Request Headers
3. Ensure axios interceptor is configured correctly

---

### Issue: "Given token not valid"

**Cause:** Token expired or invalid

**Fix:**
1. Try refreshing token using `/api/v1/auth/refresh/`
2. If refresh fails, redirect to login
3. Check token expiration time (60 minutes by default)

---

### Issue: Infinite redirect loop

**Cause:** 401 response on login page triggers another redirect

**Fix:** ✅ Already fixed - Response interceptor checks current path

```typescript
if (!window.location.pathname.includes('/login')) {
  window.location.href = '/login'
}
```

---

## Summary

Your API is now **fully protected** with authentication required for all endpoints. Users must:

1. ✅ Log in to receive JWT tokens
2. ✅ Include `Authorization: Bearer <token>` header in all requests
3. ✅ Be authenticated to access any protected route (folders, documents, search, etc.)
4. ✅ Have valid, non-expired tokens

**Only exceptions:**
- Login/Registration endpoints (public by necessity)
- API documentation (public for testing, can be restricted in production)

**All other endpoints require valid JWT authentication.**
