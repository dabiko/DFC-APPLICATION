# Authentication Loop - Fixes Applied

**Date:** November 23, 2025
**Issue:** "Authentication credentials were not provided" error causing infinite login/dashboard redirect loop

---

## Root Causes Identified

1. **Token Storage Mismatch**
   - folderService only checked `localStorage`
   - Tokens might be stored in `sessionStorage` (if "Remember Me" unchecked)
   - Requests were sent without Authorization header

2. **Immediate 401 Redirect**
   - Any 401 response immediately redirected to `/login`
   - No check if already on login page → infinite loop

3. **API Calls Before Auth Check**
   - `FolderSidebar` and `Documents` components called `fetchFolders()` on mount
   - If user not authenticated or token missing → 401 → redirect loop

---

## Fixes Applied

### Fix 1: Check Both Storage Locations for Token

**File:** `frontend/src/services/folderService.ts`

**Before:**
```typescript
const token = localStorage.getItem('access_token')
```

**After:**
```typescript
const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
```

**Impact:** Requests will now include Authorization header regardless of where token is stored

---

### Fix 2: Prevent Redirect Loop

**File:** `frontend/src/services/folderService.ts`

**Before:**
```typescript
if (error.response?.status === 401) {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  window.location.href = '/login'
}
```

**After:**
```typescript
if (error.response?.status === 401) {
  // Only redirect if not already on login page
  if (!window.location.pathname.includes('/login')) {
    // Clear tokens from both storage locations
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('refresh_token')
    window.location.href = '/login'
  }
}
```

**Impact:** Prevents infinite redirect loop when already on login page

---

### Fix 3: Conditional API Calls

**Files:**
- `frontend/src/components/Folder/FolderSidebar.tsx`
- `frontend/src/pages/Documents.tsx`

**Before:**
```typescript
useEffect(() => {
  dispatch(fetchFolders())
}, [dispatch])
```

**After:**
```typescript
useEffect(() => {
  // Only fetch if user is authenticated
  const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
  if (token) {
    dispatch(fetchFolders()).catch((error) => {
      console.error('Failed to fetch folders:', error)
    })
  }
}, [dispatch])
```

**Impact:** No API calls if user not authenticated, preventing 401 errors on mount

---

## How to Test

### 1. Clear Everything
```javascript
// In browser console
localStorage.clear()
sessionStorage.clear()
```

### 2. Hard Refresh
Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)

### 3. Login Again
- Try with "Remember Me" checked → should store in `localStorage`
- Try with "Remember Me" unchecked → should store in `sessionStorage`

### 4. Check Dashboard Loads
- Should not redirect back to login
- Should see folder sidebar
- Should not see authentication errors

### 5. Verify Token is Sent
Open DevTools (F12) → Network tab → Look for `/api/v1/folders/` request:
- **Request Headers** should show: `Authorization: Bearer <token>`
- **Response Status** should be: `200 OK` (not 401)

---

## Troubleshooting

### If loop still occurs:

1. **Check browser console** (F12 → Console):
   ```javascript
   // Run this after login
   console.log('Token:', localStorage.getItem('access_token') || sessionStorage.getItem('access_token'))
   ```
   - If null → login isn't storing token properly

2. **Check Network tab** (F12 → Network):
   - Filter by "folders"
   - Check if `Authorization` header is present
   - Check response status (should be 200, not 401)

3. **Check Django backend logs**:
   ```
   "GET /api/v1/folders/ HTTP/1.1" 401  ← Token not recognized
   "GET /api/v1/folders/ HTTP/1.1" 200  ← Working correctly
   ```

### If token is sent but still getting 401:

**Backend Configuration Issue** - Check `backend/config/settings.py`:

```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
}

CORS_ALLOW_HEADERS = list(default_headers) + [
    'authorization',
]
```

---

## Expected Behavior After Fixes

✅ **Login with Remember Me = ON**
- Tokens stored in `localStorage`
- Persists across browser sessions
- Dashboard loads without redirect
- Folders load successfully

✅ **Login with Remember Me = OFF**
- Tokens stored in `sessionStorage`
- Cleared when browser closes
- Dashboard loads without redirect
- Folders load successfully

✅ **401 Response Handling**
- Only redirects to login if not already there
- Clears tokens from both storage locations
- No infinite redirect loop

✅ **Component Mounting**
- Checks for token before making API calls
- Gracefully handles missing authentication
- No 401 errors on initial render

---

## Files Modified

1. ✅ `frontend/src/services/folderService.ts`
   - Request interceptor checks both storage locations
   - Response interceptor prevents redirect loop

2. ✅ `frontend/src/components/Folder/FolderSidebar.tsx`
   - Conditional folder fetching on mount

3. ✅ `frontend/src/pages/Documents.tsx`
   - Conditional folder fetching on mount

---

**Status:** All fixes applied and ready for testing
