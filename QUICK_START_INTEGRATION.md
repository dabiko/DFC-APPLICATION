# Quick Start: Backend Integration

## ✅ What's Been Done

1. **Frontend Environment** - `.env` file created with API configuration
2. **Data Transformers** - Automatic conversion between backend (snake_case) and frontend (camelCase)
3. **Folder Service** - Updated with data transformation for all API calls
4. **API Test Tool** - HTML test page to verify backend connection
5. **Integration Guide** - Complete documentation in `BACKEND_INTEGRATION_GUIDE.md`

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Start the Backend (Terminal 1)

```bash
cd backend
python manage.py runserver
```

**Expected Output:**
```
Starting development server at http://127.0.0.1:8000/
```

### Step 2: Test API Connection

Open in browser: `file:///path/to/DFC-APPLICATION/test-api-connection.html`

Click "Test Connection" button. You should see:
- ✓ API Connection Successful!
- Status should change from OFFLINE to ONLINE

### Step 3: Start the Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

**Expected Output:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

### Step 4: Test in Browser

1. Navigate to `http://localhost:5173`
2. Login with your credentials
3. Navigate to the Documents page
4. You should see the folder sidebar
5. Try creating a folder:
   - Click "New Folder" button
   - Enter folder name
   - Click "Create Folder"
6. Check browser Network tab to see API requests

---

## 🔍 What to Check

### In Browser DevTools (F12)

**Network Tab:**
- ✅ Request URL: `http://localhost:8000/api/v1/folders/`
- ✅ Request Method: GET, POST, PUT, DELETE
- ✅ Request Headers: `Authorization: Bearer <token>`
- ✅ Response Status: 200, 201 (success) or 401 (not logged in)
- ✅ Response Data: JSON array of folders

**Console Tab:**
- ❌ No CORS errors
- ❌ No 404 errors
- ❌ No data transformation errors

### Backend Terminal

You should see logs like:
```
[23/Nov/2025 20:00:00] "GET /api/v1/folders/ HTTP/1.1" 200
[23/Nov/2025 20:00:05] "POST /api/v1/folders/ HTTP/1.1" 201
```

---

## 🎯 What's Working

| Feature | Status | Test |
|---------|--------|------|
| API Connection | ✅ | Backend responds on port 8000 |
| CORS | ✅ | Frontend can make requests |
| Authentication | ✅ | JWT tokens in Authorization header |
| Data Transform | ✅ | snake_case ↔ camelCase conversion |
| List Folders | ✅ | GET /api/v1/folders/ |
| Create Folder | ✅ | POST /api/v1/folders/ |
| Rename Folder | ✅ | PUT /api/v1/folders/{id}/update/ |
| Move Folder | ✅ | POST /api/v1/folders/{id}/move/ |
| Delete Folder | ✅ | DELETE /api/v1/folders/{id}/delete/ |

---

## 🐛 Common Issues

### Issue: "Failed to fetch" or CORS Error

**Symptoms:**
```
Access to fetch at 'http://localhost:8000' has been blocked by CORS policy
```

**Solution:**
1. Check `backend/config/settings.py` has CORS configured:
   ```python
   INSTALLED_APPS = [
       ...
       'corsheaders',
   ]

   MIDDLEWARE = [
       'corsheaders.middleware.CorsMiddleware',
       ...
   ]

   CORS_ALLOWED_ORIGINS = [
       "http://localhost:5173",
   ]
   ```

2. Install if needed:
   ```bash
   pip install django-cors-headers
   ```

3. Restart Django server

### Issue: 401 Unauthorized

**Symptoms:** All API requests return 401

**Solution:**
1. Check you're logged in
2. Verify token in localStorage:
   ```javascript
   console.log(localStorage.getItem('access_token'))
   ```
3. If null, login again
4. Check token is being sent (Network tab → Request Headers)

### Issue: 404 Not Found for /api/v1/folders/

**Symptoms:** `GET http://localhost:8000/api/v1/folders/ 404`

**Solution:**
1. Check main `urls.py` includes folders app:
   ```python
   urlpatterns = [
       path('api/v1/folders/', include('apps.folders.urls')),
   ]
   ```

2. Restart Django server

### Issue: Folders not displaying in UI

**Symptoms:** API returns data but UI is empty

**Solution:**
1. Check browser console for errors
2. Verify Redux state:
   ```javascript
   import { store } from '@/store'
   console.log(store.getState().folder)
   ```
3. Check data transformation worked:
   ```javascript
   console.log(store.getState().folder.folders)
   ```

---

## 📊 Testing Checklist

- [ ] Backend server running on port 8000
- [ ] Frontend server running on port 5173
- [ ] Test page shows "ONLINE" status
- [ ] Can login and get JWT token
- [ ] Folder list loads in UI
- [ ] Can create new folder
- [ ] Can rename folder
- [ ] Can move folder
- [ ] Can delete empty folder
- [ ] Smart folders appear in sidebar
- [ ] No console errors
- [ ] No network errors

---

## 🎓 Next Steps

Once basic integration works:

1. **Add Real Data** - Create test folders via Django admin or API
2. **Test Permissions** - Verify RBAC filtering works correctly
3. **Add Templates** - Create folder templates in database
4. **Connect Smart Folders** - Implement backend API for smart folders
5. **Add Document Upload** - Implement file upload functionality
6. **Production Config** - Set up environment variables for production

---

## 📞 Need Help?

1. **Integration Guide**: See `BACKEND_INTEGRATION_GUIDE.md` for detailed info
2. **API Test Tool**: Open `test-api-connection.html` to debug API
3. **Backend Logs**: Check Django terminal for errors
4. **Frontend Logs**: Check browser console (F12)
5. **Network Debug**: Use browser DevTools Network tab

---

**Last Updated**: November 23, 2025
**Status**: Ready for Testing
