# Backend Integration Guide
**Date**: November 23, 2025
**Status**: Ready for Integration

---

## ✅ Current Status

### Backend (Django) - **COMPLETE**
- ✅ Folder models implemented (Folder, FolderTemplate, SmartFolder)
- ✅ API views with full CRUD operations
- ✅ URL routing configured
- ✅ Serializers for data transformation
- ✅ RBAC permissions integrated
- ✅ PostgreSQL database configured

### Frontend (React) - **COMPLETE**
- ✅ Folder service with axios interceptors
- ✅ Redux slice with async thunks
- ✅ UI components (FolderTree, FolderSidebar, Modals)
- ✅ Smart folders support
- ✅ Template system support

---

## 🔗 API Endpoints Mapping

### Available Backend Endpoints

| Frontend Service Method | Backend Endpoint | HTTP Method | Description |
|------------------------|------------------|-------------|-------------|
| `getFolders()` | `/api/v1/folders/` | GET | List all accessible folders |
| `getFolderById(id)` | `/api/v1/folders/{id}/` | GET | Get folder details |
| `createFolder(data)` | `/api/v1/folders/` | POST | Create new folder |
| `renameFolder(id, name)` | `/api/v1/folders/{id}/update/` | PUT | Rename folder |
| `moveFolder(id, parentId)` | `/api/v1/folders/{id}/move/` | POST | Move folder |
| `deleteFolder(id, force)` | `/api/v1/folders/{id}/delete/` | DELETE | Delete folder |
| `getFolderPath(id)` | `/api/v1/folders/{id}/breadcrumb/` | GET | Get breadcrumb path |
| `getFolderChildren(id)` | `/api/v1/folders/?parent={id}` | GET | Get folder children |

### Frontend ↔ Backend Data Mapping

**Frontend expects:**
```typescript
interface Folder {
  id: string                    // UUID
  name: string
  parentId: string | null
  path: string
  confidentiality: string       // 'public' | 'internal' | 'confidential' | 'highly_confidential'
  isLocked: boolean
  documentCount: number
  createdAt: string
  modifiedAt: string
  owner: string
  department: string
  permissions: {
    canView: boolean
    canEdit: boolean
    canDelete: boolean
    canManage: boolean
  }
  children?: Folder[]
}
```

**Backend returns:**
```json
{
  "id": "uuid",
  "name": "string",
  "parent": "uuid or null",
  "path": "string",
  "confidentiality_level": "PUBLIC|INTERNAL|CONFIDENTIAL|HIGHLY_CONFIDENTIAL",
  "depth": 0,
  "owner": { "id": 1, "username": "user" },
  "department": { "id": 1, "name": "Finance" },
  "created_at": "2025-11-23T10:00:00Z",
  "updated_at": "2025-11-23T10:00:00Z",
  "created_by": { "id": 1, "username": "user" }
}
```

---

## 🔧 Setup Steps

### Step 1: Configure Frontend Environment

Create or update `frontend/.env`:

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:8000
VITE_API_URL=http://localhost:8000/api/v1

# Application Configuration
VITE_APP_NAME=Digital Filing Cabinet
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_MFA=true
VITE_ENABLE_BILLING=true

# Development Settings
VITE_LOG_LEVEL=debug
```

**Note:** The frontend service is already configured to use `VITE_API_BASE_URL` from environment variables.

### Step 2: Update Backend CORS Settings

Ensure your Django backend allows the frontend origin. Check `backend/config/settings.py`:

```python
# CORS Configuration
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Vite default dev server
    "http://127.0.0.1:5173",
]

CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
```

### Step 3: Run Database Migrations

```bash
cd backend
python manage.py makemigrations folders
python manage.py migrate
```

### Step 4: Create Test Data (Optional)

Create a few test folders to verify integration:

```python
# backend/apps/folders/management/commands/create_test_folders.py
from django.core.management.base import BaseCommand
from apps.folders.models import Folder
from apps.users.models import User, Department

class Command(BaseCommand):
    def handle(self, *args, **options):
        user = User.objects.first()
        dept = Department.objects.first()

        if not user or not dept:
            self.stdout.write("Create user and department first")
            return

        # Create root folders
        finance = Folder.objects.create(
            name="Finance",
            parent=None,
            owner=user,
            created_by=user,
            department=dept,
            confidentiality_level="INTERNAL"
        )

        # Create children
        Folder.objects.create(
            name="Invoices",
            parent=finance,
            owner=user,
            created_by=user,
            department=dept,
            confidentiality_level="CONFIDENTIAL"
        )

        self.stdout.write("Test folders created!")
```

Run: `python manage.py create_test_folders`

### Step 5: Start Backend Server

```bash
cd backend
python manage.py runserver
```

Backend will be available at: `http://localhost:8000`

### Step 6: Start Frontend Development Server

```bash
cd frontend
npm run dev
```

Frontend will be available at: `http://localhost:5173`

---

## 🔄 Data Transformation Needed

The backend returns snake_case with nested objects, but the frontend expects camelCase with flat IDs. You need to add serializer transformations.

### Option 1: Update Backend Serializers (Recommended)

Modify `backend/apps/folders/serializers.py` to match frontend expectations:

```python
class FolderListSerializer(serializers.ModelSerializer):
    parentId = serializers.UUIDField(source='parent_id', allow_null=True)
    confidentiality = serializers.CharField(source='confidentiality_level')
    isLocked = serializers.SerializerMethodField()
    documentCount = serializers.IntegerField(source='documents.count', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    modifiedAt = serializers.DateTimeField(source='updated_at', read_only=True)
    hasChildren = serializers.SerializerMethodField()
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = Folder
        fields = [
            'id', 'name', 'parentId', 'path', 'confidentiality',
            'isLocked', 'documentCount', 'createdAt', 'modifiedAt',
            'hasChildren', 'permissions', 'depth'
        ]

    def get_isLocked(self, obj):
        return False  # Add is_locked field to model if needed

    def get_hasChildren(self, obj):
        return obj.children.exists()

    def get_permissions(self, obj):
        user = self.context.get('request').user
        from apps.permissions.utils import check_permission
        return {
            'canView': check_permission(user, 'can_view', obj),
            'canEdit': check_permission(user, 'can_edit', obj),
            'canDelete': check_permission(user, 'can_delete', obj),
            'canManage': check_permission(user, 'can_manage', obj),
        }
```

### Option 2: Transform in Frontend Service

Alternatively, add transformation functions in `frontend/src/services/folderService.ts`:

```typescript
// Transform backend response to frontend format
function transformFolder(backendFolder: any): Folder {
  return {
    id: backendFolder.id,
    name: backendFolder.name,
    parentId: backendFolder.parent || null,
    path: backendFolder.path,
    confidentiality: backendFolder.confidentiality_level?.toLowerCase() || 'internal',
    isLocked: backendFolder.is_locked || false,
    documentCount: backendFolder.document_count || 0,
    createdAt: backendFolder.created_at,
    modifiedAt: backendFolder.updated_at,
    owner: backendFolder.owner?.username || '',
    department: backendFolder.department?.name || '',
    hasChildren: backendFolder.children_count > 0,
    permissions: {
      canView: true,  // These should come from backend
      canEdit: true,
      canDelete: true,
      canManage: true,
    },
    children: [],
  }
}

// Update getFolders method
getFolders: async (filters?, sort?) => {
  const response = await api.get<any[]>('/folders/', { params })
  return response.data.map(transformFolder)
}
```

---

## 🧪 Testing the Integration

### 1. Test API Connection

Create a simple test in browser console:

```javascript
// Test 1: Check API is reachable
fetch('http://localhost:8000/api/v1/folders/', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
})
.then(res => res.json())
.then(data => console.log('Folders:', data))
.catch(err => console.error('Error:', err))
```

### 2. Test Redux Integration

In your React component or browser console:

```javascript
// Dispatch fetchFolders action
import { store } from '@/store'
import { fetchFolders } from '@/store/slices/folderSlice'

store.dispatch(fetchFolders())
  .then(result => console.log('Folders loaded:', result))
  .catch(err => console.error('Error:', err))
```

### 3. Test Folder Creation

```javascript
import { createFolder } from '@/store/slices/folderSlice'

store.dispatch(createFolder({
  name: 'Test Folder',
  parentId: null,
  confidentiality: 'internal'
}))
```

### 4. Check Network Tab

1. Open browser DevTools (F12)
2. Go to Network tab
3. Perform folder operations in the UI
4. Verify:
   - Request URL is `http://localhost:8000/api/v1/folders/`
   - Authorization header is present
   - Response status is 200
   - Response data structure matches expectations

---

## 🐛 Common Issues & Solutions

### Issue 1: CORS Errors

**Error:** `Access to fetch at 'http://localhost:8000' from origin 'http://localhost:5173' has been blocked by CORS policy`

**Solution:**
1. Install django-cors-headers: `pip install django-cors-headers`
2. Add to `INSTALLED_APPS` in settings.py: `'corsheaders'`
3. Add to `MIDDLEWARE`: `'corsheaders.middleware.CorsMiddleware'` (before CommonMiddleware)
4. Configure CORS settings (see Step 2 above)

### Issue 2: 401 Unauthorized

**Error:** `401 Unauthorized` responses

**Solution:**
1. Ensure user is logged in: `localStorage.getItem('access_token')`
2. Check token is being sent in headers (Network tab → Request Headers)
3. Verify token is valid: `http://localhost:8000/api/v1/auth/verify-token/`
4. If expired, refresh token or re-login

### Issue 3: 404 Not Found

**Error:** `404 Not Found` for `/api/v1/folders/`

**Solution:**
1. Check main `urls.py` includes folders URLs:
   ```python
   path('api/v1/folders/', include('apps.folders.urls')),
   ```
2. Verify backend server is running
3. Check URL matches exactly (trailing slash matters)

### Issue 4: Data Format Mismatch

**Error:** Frontend expects `parentId` but gets `parent`

**Solution:** Implement data transformation (see "Data Transformation Needed" section above)

### Issue 5: Empty Folders List

**Error:** API returns empty array even though folders exist

**Solution:**
1. Check user has permission to view folders
2. Verify folders belong to user's organization/department
3. Check database has folders: `python manage.py shell`
   ```python
   from apps.folders.models import Folder
   print(Folder.objects.count())
   ```

---

## 📊 API Response Examples

### GET /api/v1/folders/ - List Folders

**Response:**
```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Finance",
    "parent": null,
    "path": "/Finance/",
    "depth": 0,
    "confidentiality_level": "INTERNAL",
    "owner": {
      "id": 1,
      "username": "john.doe",
      "email": "john@example.com"
    },
    "department": {
      "id": 2,
      "name": "Finance Department"
    },
    "created_at": "2025-11-20T10:30:00Z",
    "updated_at": "2025-11-20T10:30:00Z",
    "children_count": 3
  }
]
```

### POST /api/v1/folders/ - Create Folder

**Request:**
```json
{
  "name": "Invoices 2025",
  "parent_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "confidentiality": "CONFIDENTIAL",
  "template_id": null
}
```

**Response:**
```json
{
  "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "name": "Invoices 2025",
  "parent": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "path": "/Finance/Invoices 2025/",
  "depth": 1,
  "confidentiality_level": "CONFIDENTIAL",
  ...
}
```

---

## 🚀 Next Steps

1. **Configure Environment** - Create `.env` file in frontend
2. **Update Serializers** - Add camelCase field names in backend
3. **Test Authentication** - Ensure JWT tokens work
4. **Test CRUD Operations** - Create, read, update, delete folders
5. **Test Permissions** - Verify RBAC filtering works
6. **Add Error Handling** - Display user-friendly error messages
7. **Implement Loading States** - Show spinners during API calls
8. **Add Optimistic Updates** - Update UI before API response (optional)

---

## 📝 Checklist

- [ ] Frontend `.env` file created with correct API URL
- [ ] Backend CORS configured to allow frontend origin
- [ ] Database migrations applied
- [ ] Backend server running on port 8000
- [ ] Frontend server running on port 5173
- [ ] Test user created and authenticated
- [ ] API requests include JWT token in headers
- [ ] Data transformation implemented (backend or frontend)
- [ ] Folder list displays correctly
- [ ] Create folder works
- [ ] Rename folder works
- [ ] Move folder works
- [ ] Delete folder works
- [ ] Permissions enforced correctly

---

**Document Version**: 1.0
**Last Updated**: November 23, 2025
**Status**: Ready for Integration
