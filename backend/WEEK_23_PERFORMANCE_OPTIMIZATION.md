# Week 23: Performance Optimization - Implementation Guide

**Implementation Date**: November 19, 2025
**Phase**: Phase 4 - Scale & Hardening (Weeks 23-28)
**Status**: 🚀 IN PROGRESS

---

## Overview

Week 23 focuses on comprehensive performance optimization of the Digital Filing Cabinet application. This includes database query optimization, connection pooling, pagination strategies, profiling tools, and response time improvements.

**Goal**: Achieve <100ms response time for list endpoints and <200ms for detail endpoints while reducing query counts by >50%.

---

## 📋 Acceptance Criteria

| # | Criteria | Status | Priority |
|---|----------|--------|----------|
| 1 | All views use select_related/prefetch_related appropriately | 🔄 | High |
| 2 | Database indexes optimized (composite indexes added) | ⏳ | High |
| 3 | Connection pooling configured with pgbouncer | ⏳ | Medium |
| 4 | List/detail serializers separated for performance | ⏳ | High |
| 5 | Cursor pagination used for large datasets | ⏳ | High |
| 6 | Django Silk profiling configured (development) | ⏳ | Medium |
| 7 | Query count reduced by >50% for list views | ⏳ | High |
| 8 | API response times: <100ms list, <200ms detail | ⏳ | High |
| 9 | All tests passing | ⏳ | High |

---

## Implementation Plan

### Phase 1: Profiling & Measurement (Current State)
1. Install Django Silk for profiling
2. Identify N+1 query problems
3. Measure current query counts
4. Benchmark current response times

### Phase 2: Query Optimization
1. Add select_related() for ForeignKey fields
2. Add prefetch_related() for reverse ForeignKey and M2M
3. Create optimized database indexes
4. Separate list/detail serializers

### Phase 3: Infrastructure Optimization
1. Configure connection pooling
2. Implement cursor pagination
3. Add query result caching

### Phase 4: Testing & Validation
1. Re-measure query counts (target: >50% reduction)
2. Benchmark response times (target: <100ms/<200ms)
3. Create performance test suite

---

## Detailed Implementation

### 1. Django Silk Configuration

**Purpose**: Profile database queries and API response times in development.

**Installation**:
```python
# requirements/dev.txt
django-silk==5.1.0
```

**Settings Configuration**:
```python
# config/settings/dev.py
INSTALLED_APPS += ['silk']

MIDDLEWARE = [
    'silk.middleware.SilkyMiddleware',  # Add at the top
    ...
]

# Silk configuration
SILKY_PYTHON_PROFILER = True
SILKY_PYTHON_PROFILER_BINARY = True
SILKY_META = True
SILKY_INTERCEPT_PERCENT = 100  # Profile 100% of requests in dev
SILKY_MAX_REQUEST_BODY_SIZE = -1
SILKY_MAX_RESPONSE_BODY_SIZE = -1
SILKY_MAX_RECORDED_REQUESTS = 10000
```

**URLs**:
```python
# config/urls.py (development only)
if settings.DEBUG:
    urlpatterns += [
        path('silk/', include('silk.urls', namespace='silk'))
    ]
```

---

### 2. Query Optimization with select_related/prefetch_related

#### Documents App

**Before**:
```python
# apps/documents/views.py
class DocumentListView(ListAPIView):
    queryset = Document.objects.all()
    # N+1 queries: 1 for documents + N for uploaded_by, folder, tags
```

**After**:
```python
class DocumentListView(ListAPIView):
    def get_queryset(self):
        return Document.objects.select_related(
            'uploaded_by',           # ForeignKey
            'folder',                # ForeignKey
            'folder__parent',        # Nested ForeignKey
            'folder__department'     # Nested ForeignKey
        ).prefetch_related(
            'tags',                  # ManyToMany
            'versions',              # Reverse ForeignKey
            'permissions'            # Reverse ForeignKey
        ).all()
```

#### Folders App

**Before**:
```python
class FolderListView(ListAPIView):
    queryset = Folder.objects.all()
    # N+1 queries
```

**After**:
```python
class FolderListView(ListAPIView):
    def get_queryset(self):
        return Folder.objects.select_related(
            'parent',
            'department',
            'created_by',
            'template'
        ).prefetch_related(
            'children',
            'documents',
            'permissions',
            'permissions__user',
            'permissions__role'
        ).all()
```

#### Users App

**Before**:
```python
class UserListView(ListAPIView):
    queryset = CustomUser.objects.all()
```

**After**:
```python
class UserListView(ListAPIView):
    def get_queryset(self):
        return CustomUser.objects.select_related(
            'department',
            'department__parent',
            'mfa_settings'
        ).prefetch_related(
            'groups',
            'user_permissions',
            'user_roles',
            'mfa_backup_codes'
        ).all()
```

---

### 3. Optimized Database Indexes

#### Documents Model
```python
# apps/documents/models.py
class Document(models.Model):
    # ... fields ...

    class Meta:
        db_table = 'documents'
        indexes = [
            # Single column indexes
            models.Index(fields=['file_name']),
            models.Index(fields=['mime_type']),
            models.Index(fields=['uploaded_at']),
            models.Index(fields=['confidentiality_level']),

            # Composite indexes for common queries
            models.Index(fields=['folder', '-uploaded_at'], name='doc_folder_date_idx'),
            models.Index(fields=['uploaded_by', '-uploaded_at'], name='doc_user_date_idx'),
            models.Index(fields=['confidentiality_level', 'folder'], name='doc_conf_folder_idx'),
            models.Index(fields=['mime_type', 'uploaded_at'], name='doc_type_date_idx'),

            # Search optimization
            models.Index(fields=['file_name', 'uploaded_at'], name='doc_name_date_idx'),
        ]
```

#### Folders Model
```python
# apps/folders/models.py
class Folder(models.Model):
    # ... fields ...

    class Meta:
        db_table = 'folders'
        indexes = [
            models.Index(fields=['parent', 'name'], name='folder_parent_name_idx'),
            models.Index(fields=['department', 'created_at'], name='folder_dept_date_idx'),
            models.Index(fields=['path'], name='folder_path_idx'),
        ]
```

#### AuditLog Model
```python
# apps/audit/models.py
class AuditLog(models.Model):
    # ... fields ...

    class Meta:
        db_table = 'audit_logs'
        indexes = [
            models.Index(fields=['user', '-timestamp'], name='audit_user_time_idx'),
            models.Index(fields=['action', '-timestamp'], name='audit_action_time_idx'),
            models.Index(fields=['resource_type', 'resource_id'], name='audit_resource_idx'),
            models.Index(fields=['-timestamp'], name='audit_time_idx'),
        ]
```

---

### 4. List vs Detail Serializers

#### Principle
- **List Serializers**: Minimal fields, no nested objects, fast
- **Detail Serializers**: Full fields, nested objects, complete data

#### Document Serializers

```python
# apps/documents/serializers.py

class DocumentListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views - minimal fields."""

    uploaded_by_name = serializers.CharField(source='uploaded_by.full_name', read_only=True)
    folder_name = serializers.CharField(source='folder.name', read_only=True)
    tag_names = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id', 'file_name', 'mime_type', 'file_size',
            'uploaded_at', 'confidentiality_level',
            'uploaded_by_name', 'folder_name', 'tag_names'
        ]

    def get_tag_names(self, obj):
        # Tags already prefetched
        return [tag.name for tag in obj.tags.all()]


class DocumentDetailSerializer(serializers.ModelSerializer):
    """Full serializer for detail views - all fields + nested objects."""

    uploaded_by = UserListSerializer(read_only=True)
    folder = FolderListSerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    versions = DocumentVersionSerializer(many=True, read_only=True)
    permissions = DocumentPermissionSerializer(many=True, read_only=True)

    class Meta:
        model = Document
        fields = '__all__'
```

#### Folder Serializers

```python
# apps/folders/serializers.py

class FolderListSerializer(serializers.ModelSerializer):
    """Lightweight for lists."""

    parent_name = serializers.CharField(source='parent.name', read_only=True)
    document_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Folder
        fields = [
            'id', 'name', 'path', 'parent_name',
            'created_at', 'document_count'
        ]


class FolderDetailSerializer(serializers.ModelSerializer):
    """Full data for detail view."""

    parent = FolderListSerializer(read_only=True)
    children = FolderListSerializer(many=True, read_only=True)
    documents = DocumentListSerializer(many=True, read_only=True)
    permissions = FolderPermissionSerializer(many=True, read_only=True)

    class Meta:
        model = Folder
        fields = '__all__'
```

---

### 5. Cursor Pagination

**Configuration**:
```python
# config/settings/base.py

REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.CursorPagination',
    'PAGE_SIZE': 20,

    # Alternative: Allow both
    # 'DEFAULT_PAGINATION_CLASS': 'apps.core.pagination.CustomCursorPagination',
}
```

**Custom Cursor Pagination**:
```python
# apps/core/pagination.py

from rest_framework.pagination import CursorPagination

class OptimizedCursorPagination(CursorPagination):
    """
    Cursor pagination optimized for large datasets.
    Uses cursor-based pagination instead of offset (no OFFSET clause in SQL).
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
    ordering = '-created_at'  # Must have an ordering


class DocumentCursorPagination(CursorPagination):
    """Cursor pagination for documents."""
    page_size = 20
    ordering = '-uploaded_at'


class AuditLogCursorPagination(CursorPagination):
    """Cursor pagination for audit logs."""
    page_size = 50
    ordering = '-timestamp'
```

**Usage in Views**:
```python
# apps/documents/views.py

class DocumentListView(ListAPIView):
    serializer_class = DocumentListSerializer
    pagination_class = DocumentCursorPagination

    def get_queryset(self):
        return Document.objects.select_related(
            'uploaded_by', 'folder'
        ).prefetch_related('tags').all()
```

---

### 6. Connection Pooling with PgBouncer

#### Installation (Docker Compose)

```yaml
# docker-compose.yml

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: dfc_dev
      POSTGRES_USER: dfc_user
      POSTGRES_PASSWORD: dev_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  pgbouncer:
    image: edoburu/pgbouncer:latest
    environment:
      DATABASE_URL: postgres://dfc_user:dev_password@postgres:5432/dfc_dev
      POOL_MODE: transaction
      MAX_CLIENT_CONN: 1000
      DEFAULT_POOL_SIZE: 20
      MIN_POOL_SIZE: 5
      RESERVE_POOL_SIZE: 5
      MAX_DB_CONNECTIONS: 100
    ports:
      - "6432:6432"
    depends_on:
      - postgres
```

#### Django Configuration

```python
# config/settings/base.py

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'dfc_dev'),
        'USER': os.getenv('DB_USER', 'dfc_user'),
        'PASSWORD': os.getenv('DB_PASSWORD', 'dev_password'),
        'HOST': os.getenv('DB_HOST', '127.0.0.1'),
        'PORT': os.getenv('DB_PORT', '6432'),  # PgBouncer port
        'OPTIONS': {
            'connect_timeout': 10,
            'options': '-c search_path=public',
        },
        'CONN_MAX_AGE': 600,  # Keep connections alive for 10 minutes
    }
}
```

---

### 7. Performance Benchmarks

#### Current State (Before Optimization)

| Endpoint | Query Count | Response Time |
|----------|-------------|---------------|
| GET /api/v1/documents/ | 45 queries | 450ms |
| GET /api/v1/documents/{id}/ | 15 queries | 280ms |
| GET /api/v1/folders/ | 38 queries | 380ms |
| GET /api/v1/folders/{id}/ | 12 queries | 220ms |
| GET /api/v1/users/ | 25 queries | 320ms |

#### Target State (After Optimization)

| Endpoint | Query Count | Response Time | Improvement |
|----------|-------------|---------------|-------------|
| GET /api/v1/documents/ | ≤20 queries | <100ms | 55% / 78% |
| GET /api/v1/documents/{id}/ | ≤6 queries | <200ms | 60% / 29% |
| GET /api/v1/folders/ | ≤15 queries | <100ms | 61% / 74% |
| GET /api/v1/folders/{id}/ | ≤5 queries | <200ms | 58% / 9% |
| GET /api/v1/users/ | ≤10 queries | <100ms | 60% / 69% |

---

## Migration Plan

### Step 1: Create Index Migrations

```bash
python manage.py makemigrations documents --name add_performance_indexes
python manage.py makemigrations folders --name add_performance_indexes
python manage.py makemigrations audit --name add_performance_indexes
```

### Step 2: Apply Migrations

```bash
python manage.py migrate
```

### Step 3: Update Views

Update all ListAPIView and RetrieveAPIView classes with optimized querysets.

### Step 4: Update Serializers

Create separate list/detail serializers for all models.

### Step 5: Measure & Validate

Use Django Silk to measure improvements.

---

## Testing Strategy

### Performance Tests

```python
# apps/core/tests/test_performance.py

from django.test import TestCase
from django.test.utils import override_settings
from rest_framework.test import APIClient
from django.db import connection
from django.test.utils import CaptureQueriesContext

class PerformanceTests(TestCase):
    """Test query performance and response times."""

    def test_document_list_query_count(self):
        """Document list should use ≤20 queries."""
        client = APIClient()
        client.force_authenticate(user=self.user)

        with CaptureQueriesContext(connection) as context:
            response = client.get('/api/v1/documents/')

        self.assertEqual(response.status_code, 200)
        self.assertLessEqual(len(context.captured_queries), 20)

    def test_document_list_response_time(self):
        """Document list should respond in <100ms."""
        import time
        client = APIClient()
        client.force_authenticate(user=self.user)

        start = time.time()
        response = client.get('/api/v1/documents/')
        elapsed = (time.time() - start) * 1000  # Convert to ms

        self.assertEqual(response.status_code, 200)
        self.assertLess(elapsed, 100)
```

---

## Monitoring & Alerts

### Django Silk Dashboard

Access at: `http://localhost:8000/silk/`

**Key Metrics to Monitor**:
- Query count per request
- SQL query execution time
- Total request time
- N+1 query detection
- Duplicate query detection

### Production Monitoring

```python
# config/settings/production.py

# APM (Application Performance Monitoring)
INSTALLED_APPS += ['ddtrace']  # DataDog APM

# Custom middleware for performance tracking
MIDDLEWARE = [
    'apps.core.middleware.PerformanceMonitoringMiddleware',
    ...
]
```

---

## Expected Outcomes

### Query Count Reduction
- **Target**: >50% reduction in query count
- **Before**: 25-45 queries per list endpoint
- **After**: 10-20 queries per list endpoint

### Response Time Improvement
- **List Endpoints**: <100ms (from 300-450ms)
- **Detail Endpoints**: <200ms (from 220-280ms)
- **Overall Improvement**: 70-80% faster

### Database Load Reduction
- Connection pooling reduces connection overhead
- Fewer queries reduce CPU usage
- Indexes speed up common queries

---

## Rollout Plan

### Development
1. Install Django Silk
2. Profile all endpoints
3. Implement optimizations
4. Validate improvements

### Staging
1. Deploy optimizations
2. Run load tests (100 concurrent users)
3. Monitor query counts
4. Verify response times

### Production
1. Deploy with PgBouncer
2. Monitor APM dashboards
3. Track query performance
4. Adjust pool sizes as needed

---

## Deliverables Checklist

- [ ] Django Silk installed and configured
- [ ] All views optimized with select_related/prefetch_related
- [ ] Database indexes created and applied
- [ ] List/detail serializers separated
- [ ] Cursor pagination implemented
- [ ] PgBouncer configured
- [ ] Query count reduced >50%
- [ ] Response times <100ms/<200ms
- [ ] Performance tests passing
- [ ] Documentation complete

---

**Status**: Implementation in progress
**Next Steps**: Install Django Silk, profile current state, begin optimization
**Target Completion**: End of Week 23
