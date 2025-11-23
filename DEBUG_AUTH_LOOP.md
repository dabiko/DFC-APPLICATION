# Debug Authentication Loop Issue

## Problem
- Login succeeds but then gets "Authentication credentials were not provided"
- Page keeps refreshing between login and dashboard

## Quick Fix Steps

### Step 1: Check if tokens are being stored

Open browser console (F12) and run:

```javascript
// After logging in, check if tokens exist
console.log('Access Token:', localStorage.getItem('access_token') || sessionStorage.getItem('access_token'))
console.log('Refresh Token:', localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token'))
console.log('User:', localStorage.getItem('user') || sessionStorage.getItem('user'))
```

**Expected:** Should see tokens and user data
**If null:** Login isn't storing tokens properly

### Step 2: Check network requests

1. Open DevTools (F12) → Network tab
2. Clear network log
3. Try to login
4. Look for the request to `/api/v1/folders/` or similar

**Check:**
- Request Headers should have: `Authorization: Bearer <token>`
- If missing → Token not being sent
- Response status 401 → Token invalid or not recognized by backend

### Step 3: Verify backend is receiving token

Check Django terminal for logs like:
```
"GET /api/v1/folders/ HTTP/1.1" 401
```

If you see 401, the backend is rejecting the token.

## Common Causes & Fixes

### Cause 1: Token not being sent in requests

**Fix:** Already applied - updated folderService.ts to check both storage locations

### Cause 2: Backend not configured for JWT authentication

**Check:** `backend/config/settings.py` should have:

```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}
```

### Cause 3: CORS issues preventing Authorization header

**Check:** `backend/config/settings.py` should have:

```python
CORS_ALLOW_HEADERS = list(default_headers) + [
    'authorization',
    'Authorization',
]
```

### Cause 4: Dashboard page making API call before checking auth

The Dashboard might be trying to fetch folders before verifying user is logged in.

## Immediate Test

Try this in browser console after login:

```javascript
// Test API call manually
fetch('http://localhost:8000/api/v1/folders/', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token') || sessionStorage.getItem('access_token')}`
  }
})
.then(res => {
  console.log('Status:', res.status)
  return res.json()
})
.then(data => console.log('Data:', data))
.catch(err => console.error('Error:', err))
```

**Expected:** Status 200 with folder data
**If 401:** Backend issue - token not accepted
**If CORS error:** Backend CORS configuration issue

## Solution Applied

Updated `folderService.ts`:
1. Check both localStorage and sessionStorage for tokens
2. Only redirect to login if not already on login page (prevents loop)
3. Clear tokens from both storage locations on 401

## Next Steps

1. Clear browser storage completely:
   ```javascript
   localStorage.clear()
   sessionStorage.clear()
   ```

2. Hard refresh (Ctrl+Shift+R)

3. Login again

4. Check if the loop still occurs

5. If it does, check the browser console and network tab for specific error messages
