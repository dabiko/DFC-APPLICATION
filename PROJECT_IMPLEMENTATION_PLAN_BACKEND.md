# Digital Filing Cabinet (DFC) - BACKEND Implementation Plan
## Complete Backend Development Roadmap with UAT Gates

---

## Overview

**Project Duration**: 28 weeks (parallel with frontend development)
**Primary Reference**: PROJECT_IMPLEMENTATION_PLAN.md
**Secondary References**: CLAUDE.md, Technical Requirements Document, Technical Stack Document
**Technology Stack**: Django + Django REST Framework, PostgreSQL, MinIO, Elasticsearch, Celery, Redis
**UAT Policy**: No phase advancement without complete UAT sign-off

This document outlines all backend development tasks extracted from the main implementation plan, organized by phase with detailed specifications and acceptance criteria.

---

## BACKEND TECHNOLOGY STACK

### Core Framework
- **Framework**: Django 4.2+ (Python 3.11+)
- **API**: Django REST Framework (DRF)
- **Authentication**: djangorestframework-simplejwt (JWT tokens)
- **API Documentation**: drf-spectacular (OpenAPI/Swagger)

### Database & Storage
- **Database**: PostgreSQL 14+ (with pgbouncer for connection pooling)
- **Object Storage**: MinIO (S3-compatible, self-hosted)
- **Search Engine**: Elasticsearch 8.x / OpenSearch 2.x
- **Cache**: Redis 7.x

### Background Processing
- **Task Queue**: Celery 5.x
- **Message Broker**: RabbitMQ 3.x or Redis
- **Task Monitoring**: Flower

### Key Python Libraries
- **Storage**: `django-storages` (MinIO/S3 integration)
- **Search**: `django-elasticsearch-dsl` (Elasticsearch integration)
- **OCR**: `pytesseract` (Tesseract wrapper)
- **Document Processing**:
  - `pypdf2` / `PyPDF2` (PDF text extraction)
  - `python-docx` (Word document processing)
  - `openpyxl` (Excel processing)
  - `Pillow` (Image processing)
  - `pdf2image` (Convert PDF to images for OCR)
- **Encryption**: `django-fernet-fields` (field-level encryption)
- **Security**: `django-ratelimit` (rate limiting)
- **Monitoring**: `django-prometheus` (metrics)

### Infrastructure
- **Containerization**: Docker, Docker Compose
- **Orchestration**: Kubernetes (production)
- **Web Server**: Gunicorn + Nginx
- **Load Balancer**: Nginx / HAProxy
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Error Tracking**: Sentry

---

## PROJECT STRUCTURE

```
dfc_backend/
├── manage.py                    # Django management script
├── config/                      # Project settings
│   ├── __init__.py
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py              # Base settings
│   │   ├── development.py       # Dev settings
│   │   ├── production.py        # Production settings
│   │   └── testing.py           # Test settings
│   ├── urls.py                  # Root URL configuration
│   ├── wsgi.py                  # WSGI application
│   └── celery.py                # Celery configuration
│
├── apps/                        # Django applications
│   ├── __init__.py
│   │
│   ├── users/                   # User management & authentication
│   │   ├── __init__.py
│   │   ├── models.py            # CustomUser, Profile
│   │   ├── serializers.py       # User serializers
│   │   ├── views.py             # User API views
│   │   ├── permissions.py       # Custom permissions
│   │   ├── admin.py             # Admin configuration
│   │   └── tests/               # User tests
│   │
│   ├── documents/               # Core document management
│   │   ├── __init__.py
│   │   ├── models.py            # Document, Folder, Tag, Metadata, Version
│   │   ├── serializers.py       # Document serializers
│   │   ├── views.py             # Document CRUD API
│   │   ├── signals.py           # Post-save signals (audit, indexing)
│   │   ├── validators.py        # File validation
│   │   ├── utils.py             # Helper functions
│   │   ├── admin.py             # Admin configuration
│   │   └── tests/               # Document tests
│   │
│   ├── folders/                 # Folder hierarchy management
│   │   ├── __init__.py
│   │   ├── models.py            # Folder, FolderTemplate
│   │   ├── serializers.py       # Folder serializers
│   │   ├── views.py             # Folder CRUD API
│   │   ├── utils.py             # Tree traversal utilities
│   │   ├── admin.py
│   │   └── tests/
│   │
│   ├── search/                  # Elasticsearch integration
│   │   ├── __init__.py
│   │   ├── documents.py         # ES document definitions
│   │   ├── views.py             # Search API endpoints
│   │   ├── serializers.py       # Search serializers
│   │   ├── indexers.py          # Indexing logic
│   │   └── tests/
│   │
│   ├── audit/                   # Audit trail
│   │   ├── __init__.py
│   │   ├── models.py            # AuditLog
│   │   ├── serializers.py       # Audit serializers
│   │   ├── views.py             # Audit log API
│   │   ├── middleware.py        # Audit middleware
│   │   ├── utils.py             # Logging utilities
│   │   └── tests/
│   │
│   ├── permissions/             # RBAC & permissions
│   │   ├── __init__.py
│   │   ├── models.py            # Role, Permission, FolderPermission
│   │   ├── serializers.py       # Permission serializers
│   │   ├── views.py             # Permission API
│   │   ├── decorators.py        # Permission decorators
│   │   ├── utils.py             # Permission checking
│   │   └── tests/
│   │
│   ├── sharing/                 # Document sharing
│   │   ├── __init__.py
│   │   ├── models.py            # Share, ShareLink
│   │   ├── serializers.py       # Sharing serializers
│   │   ├── views.py             # Sharing API
│   │   ├── tokens.py            # Token generation
│   │   └── tests/
│   │
│   ├── classification/          # Auto-classification
│   │   ├── __init__.py
│   │   ├── models.py            # ClassificationRule
│   │   ├── serializers.py       # Classification serializers
│   │   ├── views.py             # Classification API
│   │   ├── engine.py            # Rule matching engine
│   │   └── tests/
│   │
│   ├── retention/               # Retention policies & legal hold
│   │   ├── __init__.py
│   │   ├── models.py            # RetentionPolicy, LegalHold
│   │   ├── serializers.py       # Retention serializers
│   │   ├── views.py             # Retention API
│   │   ├── tasks.py             # Celery tasks for retention
│   │   └── tests/
│   │
│   └── workflows/               # Background tasks
│       ├── __init__.py
│       ├── tasks.py             # Celery tasks (OCR, indexing, etc.)
│       ├── utils.py             # Task utilities
│       └── tests/
│
├── requirements/                # Python dependencies
│   ├── base.txt                 # Base requirements
│   ├── development.txt          # Dev requirements
│   ├── production.txt           # Production requirements
│   └── testing.txt              # Test requirements
│
├── docker/                      # Docker configuration
│   ├── Dockerfile               # App Dockerfile
│   ├── docker-compose.yml       # Dev environment
│   └── docker-compose.prod.yml  # Production environment
│
├── scripts/                     # Utility scripts
│   ├── init_db.py               # Database initialization
│   ├── seed_data.py             # Seed development data
│   └── backup.sh                # Backup script
│
└── tests/                       # Integration tests
    ├── __init__.py
    ├── conftest.py              # Pytest configuration
    └── integration/             # Integration test suites
```

---

## PHASE 0: FOUNDATIONS & INFRASTRUCTURE (Weeks 1-4)

### Backend Tasks

#### Week 1: Environment Setup & Configuration

**Tasks:**

**1.1 Development Environment Setup**

1. **Install Core Dependencies**
   - Python 3.11+ (using pyenv for version management)
   - PostgreSQL 14+ (local instance + Docker)
   - MinIO server (Docker)
   - Elasticsearch 8.x (Docker)
   - Redis 7.x (Docker)
   - RabbitMQ 3.x (Docker)

2. **Create Docker Compose Development Environment**
   ```yaml
   services:
     db:
       image: postgres:14-alpine
       environment:
         POSTGRES_DB: dfc_dev
         POSTGRES_USER: dfc_user
         POSTGRES_PASSWORD: dev_password
       ports:
         - "5432:5432"
       volumes:
         - postgres_data:/var/lib/postgresql/data

     minio:
       image: minio/minio:latest
       command: server /data --console-address ":9001"
       environment:
         MINIO_ROOT_USER: minioadmin
         MINIO_ROOT_PASSWORD: minioadmin
       ports:
         - "9000:9000"
         - "9001:9001"
       volumes:
         - minio_data:/data

     elasticsearch:
       image: elasticsearch:8.8.0
       environment:
         - discovery.type=single-node
         - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
       ports:
         - "9200:9200"
       volumes:
         - es_data:/usr/share/elasticsearch/data

     redis:
       image: redis:7-alpine
       ports:
         - "6379:6379"

     rabbitmq:
       image: rabbitmq:3-management-alpine
       ports:
         - "5672:5672"
         - "15672:15672"
   ```

**1.2 Django Project Initialization**

1. **Create Django Project**
   ```bash
   pip install django djangorestframework
   django-admin startproject config .
   ```

2. **Configure Project Settings**
   - Split settings into base, development, production
   - Set up environment variables (`.env` file)
   - Configure `SECRET_KEY` management
   - Set up `ALLOWED_HOSTS`
   - Configure database connection (using `dj-database-url`)
   - Configure static files and media files

3. **Install Core Dependencies**
   ```
   # requirements/base.txt
   Django==4.2.7
   djangorestframework==3.14.0
   djangorestframework-simplejwt==5.3.0
   django-cors-headers==4.3.0
   django-environ==0.11.2
   psycopg2-binary==2.9.9
   drf-spectacular==0.26.5
   django-storages==1.14.2
   boto3==1.29.7  # For S3-compatible storage
   celery==5.3.4
   redis==5.0.1
   ```

4. **Create Initial Django Apps**
   ```bash
   python manage.py startapp users
   python manage.py startapp documents
   python manage.py startapp folders
   python manage.py startapp search
   python manage.py startapp audit
   python manage.py startapp permissions
   python manage.py startapp workflows
   ```

**1.3 Version Control & Documentation**

1. **Initialize Git Repository**
   - Create `.gitignore` (Python, Django, environment files)
   - Initialize git: `git init`
   - Create branches: `main`, `develop`
   - Set up branch protection rules

2. **Create Initial Documentation**
   - `README.md` (project overview, setup instructions)
   - `CONTRIBUTING.md` (contribution guidelines)
   - `CHANGELOG.md` (version history)
   - `API_DOCUMENTATION.md` (API overview)

3. **Coding Standards**
   - Configure Black (code formatting)
   - Configure isort (import sorting)
   - Configure Flake8 (linting)
   - Configure mypy (type checking)
   - Create `pyproject.toml` and `.flake8` config files

4. **Pre-commit Hooks**
   ```yaml
   # .pre-commit-config.yaml
   repos:
     - repo: https://github.com/psf/black
       hooks:
         - id: black
     - repo: https://github.com/pycqa/isort
       hooks:
         - id: isort
     - repo: https://github.com/pycqa/flake8
       hooks:
         - id: flake8
   ```

**Deliverables:**
- Running Django development server
- All services running via Docker Compose
- PostgreSQL database connected
- MinIO storage accessible
- Elasticsearch cluster responding
- Project documentation structure
- Git repository initialized

**Estimated Effort:** 3-4 days

---

#### Week 2: Database Schema Design & Migration System

**Tasks:**

**2.1 Design Core Models**

1. **User Model (`apps/users/models.py`)**
   ```python
   from django.contrib.auth.models.AbstractUser import AbstractUser
   from django.db import models

   class CustomUser(AbstractUser):
       """Extended user model with additional fields"""
       employee_id = models.CharField(max_length=50, unique=True)
       department = models.ForeignKey('Department', on_delete=models.PROTECT)
       phone_number = models.CharField(max_length=20, blank=True)
       avatar = models.ImageField(upload_to='avatars/', blank=True)
       mfa_enabled = models.BooleanField(default=False)
       mfa_secret = models.CharField(max_length=32, blank=True)
       created_at = models.DateTimeField(auto_now_add=True)
       updated_at = models.DateTimeField(auto_now=True)

       class Meta:
           db_table = 'users'
           indexes = [
               models.Index(fields=['email']),
               models.Index(fields=['employee_id']),
           ]

   class Department(models.Model):
       """Organization departments"""
       name = models.CharField(max_length=100)
       code = models.CharField(max_length=20, unique=True)
       parent = models.ForeignKey('self', null=True, blank=True,
                                  on_delete=models.CASCADE)
       created_at = models.DateTimeField(auto_now_add=True)

       class Meta:
           db_table = 'departments'
   ```

2. **Folder Model (`apps/folders/models.py`)**
   ```python
   from django.db import models
   from django.contrib.postgres.fields import ArrayField
   import uuid

   class Folder(models.Model):
       """Hierarchical folder structure"""
       id = models.UUIDField(primary_key=True, default=uuid.uuid4)
       name = models.CharField(max_length=255)
       parent = models.ForeignKey('self', null=True, blank=True,
                                  on_delete=models.CASCADE,
                                  related_name='children')
       path = models.TextField()  # Materialized path: /folder1/folder2/
       depth = models.IntegerField(default=0)
       owner = models.ForeignKey('users.CustomUser', on_delete=models.PROTECT)
       department = models.ForeignKey('users.Department', on_delete=models.PROTECT)
       confidentiality_level = models.CharField(max_length=20, choices=[
           ('PUBLIC', 'Public'),
           ('INTERNAL', 'Internal'),
           ('CONFIDENTIAL', 'Confidential'),
           ('HIGHLY_CONFIDENTIAL', 'Highly Confidential'),
       ])
       created_at = models.DateTimeField(auto_now_add=True)
       updated_at = models.DateTimeField(auto_now=True)
       created_by = models.ForeignKey('users.CustomUser',
                                      on_delete=models.PROTECT,
                                      related_name='folders_created')

       class Meta:
           db_table = 'folders'
           indexes = [
               models.Index(fields=['parent']),
               models.Index(fields=['path']),
               models.Index(fields=['owner']),
           ]
           unique_together = ['parent', 'name']
   ```

3. **Document Model (`apps/documents/models.py`)**
   ```python
   from django.db import models
   import uuid

   class Document(models.Model):
       """Core document model"""
       id = models.UUIDField(primary_key=True, default=uuid.uuid4)
       title = models.CharField(max_length=500)
       file = models.FileField(upload_to='documents/%Y/%m/%d/')
       file_name = models.CharField(max_length=255)
       file_size = models.BigIntegerField()  # in bytes
       file_type = models.CharField(max_length=50)  # MIME type
       checksum = models.CharField(max_length=64)  # SHA-256

       # Metadata
       document_type = models.CharField(max_length=100)  # Invoice, Contract, etc.
       identifier = models.CharField(max_length=255)  # Customer ID, Contract Number
       document_date = models.DateField()
       creator_source = models.CharField(max_length=255)
       confidentiality_level = models.CharField(max_length=20, choices=[...])
       retention_period_years = models.IntegerField()

       # Relationships
       folder = models.ForeignKey('folders.Folder', on_delete=models.PROTECT)
       owner = models.ForeignKey('users.CustomUser', on_delete=models.PROTECT)
       department = models.ForeignKey('users.Department', on_delete=models.PROTECT)

       # Versioning
       version_number = models.IntegerField(default=1)
       parent_version = models.ForeignKey('self', null=True, blank=True,
                                          on_delete=models.SET_NULL)

       # Timestamps
       created_at = models.DateTimeField(auto_now_add=True)
       updated_at = models.DateTimeField(auto_now=True)
       created_by = models.ForeignKey('users.CustomUser',
                                      on_delete=models.PROTECT,
                                      related_name='documents_created')

       # Full-text content (extracted)
       extracted_text = models.TextField(blank=True)
       ocr_confidence = models.FloatField(null=True, blank=True)

       class Meta:
           db_table = 'documents'
           indexes = [
               models.Index(fields=['folder']),
               models.Index(fields=['owner']),
               models.Index(fields=['document_type']),
               models.Index(fields=['document_date']),
               models.Index(fields=['checksum']),
           ]

   class Tag(models.Model):
       """Document tags"""
       name = models.CharField(max_length=100, unique=True)
       color = models.CharField(max_length=7, default='#808080')  # Hex color
       category = models.CharField(max_length=100, blank=True)
       created_at = models.DateTimeField(auto_now_add=True)

       class Meta:
           db_table = 'tags'

   class DocumentTag(models.Model):
       """Many-to-many relationship for document tags"""
       document = models.ForeignKey(Document, on_delete=models.CASCADE)
       tag = models.ForeignKey(Tag, on_delete=models.CASCADE)
       created_at = models.DateTimeField(auto_now_add=True)
       created_by = models.ForeignKey('users.CustomUser', on_delete=models.PROTECT)

       class Meta:
           db_table = 'document_tags'
           unique_together = ['document', 'tag']
   ```

4. **Audit Log Model (`apps/audit/models.py`)**
   ```python
   from django.db import models
   import uuid

   class AuditLog(models.Model):
       """Immutable audit trail"""
       id = models.UUIDField(primary_key=True, default=uuid.uuid4)
       user = models.ForeignKey('users.CustomUser', on_delete=models.PROTECT)
       action = models.CharField(max_length=50, choices=[
           ('CREATE', 'Create'),
           ('VIEW', 'View'),
           ('EDIT', 'Edit'),
           ('DELETE', 'Delete'),
           ('DOWNLOAD', 'Download'),
           ('SHARE', 'Share'),
           ('MOVE', 'Move'),
           ('COPY', 'Copy'),
           ('LOGIN', 'Login'),
           ('LOGOUT', 'Logout'),
           ('FAILED_LOGIN', 'Failed Login'),
       ])
       resource_type = models.CharField(max_length=50)  # Document, Folder, User
       resource_id = models.UUIDField(null=True)
       resource_name = models.CharField(max_length=500)
       timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
       ip_address = models.GenericIPAddressField()
       user_agent = models.TextField()
       outcome = models.CharField(max_length=20, choices=[
           ('SUCCESS', 'Success'),
           ('FAILURE', 'Failure'),
       ])
       error_message = models.TextField(blank=True)
       metadata = models.JSONField(default=dict)  # Additional context

       class Meta:
           db_table = 'audit_logs'
           indexes = [
               models.Index(fields=['user', 'timestamp']),
               models.Index(fields=['resource_type', 'resource_id']),
               models.Index(fields=['timestamp']),
           ]
           # Prevent updates and deletes
           permissions = []
   ```

5. **Retention Policy Model (`apps/retention/models.py`)**
   ```python
   from django.db import models

   class RetentionPolicy(models.Model):
       """Document retention policies"""
       name = models.CharField(max_length=200)
       description = models.TextField()
       retention_period_years = models.IntegerField()
       applies_to_document_type = models.CharField(max_length=100, blank=True)
       applies_to_folder = models.ForeignKey('folders.Folder', null=True,
                                             on_delete=models.CASCADE)
       auto_delete = models.BooleanField(default=False)
       notification_days_before = models.IntegerField(default=30)
       created_at = models.DateTimeField(auto_now_add=True)
       created_by = models.ForeignKey('users.CustomUser', on_delete=models.PROTECT)

       class Meta:
           db_table = 'retention_policies'

   class LegalHold(models.Model):
       """Legal hold on documents"""
       case_number = models.CharField(max_length=100, unique=True)
       reason = models.TextField()
       start_date = models.DateField()
       end_date = models.DateField(null=True, blank=True)
       documents = models.ManyToManyField(Document, through='LegalHoldDocument')
       created_at = models.DateTimeField(auto_now_add=True)
       created_by = models.ForeignKey('users.CustomUser', on_delete=models.PROTECT)

       class Meta:
           db_table = 'legal_holds'

   class LegalHoldDocument(models.Model):
       """Documents under legal hold"""
       legal_hold = models.ForeignKey(LegalHold, on_delete=models.CASCADE)
       document = models.ForeignKey(Document, on_delete=models.CASCADE)
       placed_at = models.DateTimeField(auto_now_add=True)
       placed_by = models.ForeignKey('users.CustomUser', on_delete=models.PROTECT)

       class Meta:
           db_table = 'legal_hold_documents'
           unique_together = ['legal_hold', 'document']
   ```

**2.2 Create Initial Migrations**

1. **Generate Migration Files**
   ```bash
   python manage.py makemigrations users
   python manage.py makemigrations folders
   python manage.py makemigrations documents
   python manage.py makemigrations audit
   python manage.py makemigrations retention
   ```

2. **Review and Optimize Migrations**
   - Add database indexes for performance
   - Add database constraints (UNIQUE, CHECK)
   - Set up CASCADE rules properly
   - Add comments to complex migrations

3. **Apply Migrations**
   ```bash
   python manage.py migrate
   ```

**2.3 Seed Data Scripts**

1. **Create Management Command (`apps/users/management/commands/seed_data.py`)**
   ```python
   from django.core.management.base import BaseCommand
   from apps.users.models import CustomUser, Department
   from apps.documents.models import Tag

   class Command(BaseCommand):
       help = 'Seed development data'

       def handle(self, *args, **options):
           # Create departments
           departments = [
               {'name': 'Engagements', 'code': 'ENG'},
               {'name': 'Accounting', 'code': 'ACC'},
               {'name': 'IT', 'code': 'IT'},
               {'name': 'Compliance', 'code': 'COMP'},
               {'name': 'Risk', 'code': 'RISK'},
               {'name': 'Audit', 'code': 'AUD'},
           ]
           for dept_data in departments:
               Department.objects.get_or_create(**dept_data)

           # Create users
           # Create tags
           # ... (implementation)

           self.stdout.write(self.style.SUCCESS('Successfully seeded data'))
   ```

**Deliverables:**
- Complete ERD (Entity Relationship Diagram)
- All core models implemented
- Database migrations applied successfully
- Seed data scripts for development
- Database indexes optimized

**Estimated Effort:** Full week (5 days)

---

#### Week 3: (Frontend-focused week)

**Backend Tasks:**
- Code reviews
- Documentation
- Technical spike on complex features

**Estimated Effort:** 1-2 days

---

#### Week 4: Authentication System & API Foundation

**Tasks:**

**4.1 Django REST Framework Setup**

1. **Configure DRF Settings**
   ```python
   # config/settings/base.py
   INSTALLED_APPS = [
       ...
       'rest_framework',
       'rest_framework_simplejwt',
       'drf_spectacular',
       'corsheaders',
   ]

   REST_FRAMEWORK = {
       'DEFAULT_AUTHENTICATION_CLASSES': [
           'rest_framework_simplejwt.authentication.JWTAuthentication',
       ],
       'DEFAULT_PERMISSION_CLASSES': [
           'rest_framework.permissions.IsAuthenticated',
       ],
       'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
       'PAGE_SIZE': 20,
       'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
   }
   ```

2. **Set Up API Routing**
   ```python
   # config/urls.py
   from django.urls import path, include
   from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

   urlpatterns = [
       path('admin/', admin.site.urls),
       path('api/v1/auth/', include('apps.users.urls')),
       path('api/v1/documents/', include('apps.documents.urls')),
       path('api/v1/folders/', include('apps.folders.urls')),
       path('api/v1/search/', include('apps.search.urls')),
       # API Documentation
       path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
       path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema')),
   ]
   ```

3. **Configure CORS**
   ```python
   # config/settings/development.py
   CORS_ALLOWED_ORIGINS = [
       "http://localhost:3000",  # React dev server
       "http://localhost:5173",  # Vite dev server
   ]
   ```

4. **Implement API Versioning**
   - Use URL path versioning (`/api/v1/`, `/api/v2/`)
   - Document versioning strategy
   - Plan for backward compatibility

**4.2 JWT Authentication Implementation**

1. **Configure JWT Settings**
   ```python
   # config/settings/base.py
   from datetime import timedelta

   SIMPLE_JWT = {
       'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
       'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
       'ROTATE_REFRESH_TOKENS': True,
       'BLACKLIST_AFTER_ROTATION': True,
       'ALGORITHM': 'HS256',
       'SIGNING_KEY': SECRET_KEY,
       'AUTH_HEADER_TYPES': ('Bearer',),
   }
   ```

2. **Create Authentication Endpoints**
   ```python
   # apps/users/views.py
   from rest_framework_simplejwt.views import (
       TokenObtainPairView,
       TokenRefreshView,
   )
   from rest_framework import generics, status
   from rest_framework.response import Response
   from rest_framework.permissions import AllowAny

   class CustomTokenObtainPairView(TokenObtainPairView):
       """Custom login endpoint"""
       pass  # Can customize token claims

   class RegisterView(generics.CreateAPIView):
       """User registration endpoint"""
       permission_classes = [AllowAny]
       serializer_class = UserRegisterSerializer

   class LogoutView(generics.GenericAPIView):
       """Logout endpoint (blacklist refresh token)"""
       def post(self, request):
           # Blacklist refresh token
           return Response(status=status.HTTP_205_RESET_CONTENT)
   ```

3. **Implement Password Reset Flow**
   ```python
   from django.contrib.auth.tokens import default_token_generator
   from django.core.mail import send_mail

   class PasswordResetRequestView(generics.GenericAPIView):
       """Request password reset"""
       permission_classes = [AllowAny]

       def post(self, request):
           email = request.data.get('email')
           # Generate token, send email
           return Response({'message': 'Reset email sent'})

   class PasswordResetConfirmView(generics.GenericAPIView):
       """Confirm password reset with token"""
       permission_classes = [AllowAny]

       def post(self, request):
           # Validate token, update password
           return Response({'message': 'Password reset successful'})
   ```

**4.3 User Management API**

1. **User Serializers**
   ```python
   # apps/users/serializers.py
   from rest_framework import serializers
   from .models import CustomUser

   class UserSerializer(serializers.ModelSerializer):
       class Meta:
           model = CustomUser
           fields = ['id', 'username', 'email', 'first_name', 'last_name',
                     'employee_id', 'department', 'avatar', 'created_at']
           read_only_fields = ['id', 'created_at']

   class UserProfileSerializer(serializers.ModelSerializer):
       class Meta:
           model = CustomUser
           fields = ['id', 'username', 'email', 'first_name', 'last_name',
                     'phone_number', 'avatar', 'department']

   class UserRegisterSerializer(serializers.ModelSerializer):
       password = serializers.CharField(write_only=True, min_length=8)

       class Meta:
           model = CustomUser
           fields = ['username', 'email', 'password', 'first_name',
                     'last_name', 'employee_id', 'department']

       def create(self, validated_data):
           user = CustomUser.objects.create_user(**validated_data)
           return user
   ```

2. **User API Views**
   ```python
   # apps/users/views.py
   from rest_framework import generics, permissions
   from .serializers import UserProfileSerializer

   class UserProfileView(generics.RetrieveUpdateAPIView):
       """Get and update user profile"""
       serializer_class = UserProfileSerializer
       permission_classes = [permissions.IsAuthenticated]

       def get_object(self):
           return self.request.user

   class UserListView(generics.ListAPIView):
       """List all users (admin only)"""
       queryset = CustomUser.objects.all()
       serializer_class = UserSerializer
       permission_classes = [permissions.IsAdminUser]
   ```

**4.4 API Documentation**

1. **Configure drf-spectacular**
   ```python
   # config/settings/base.py
   SPECTACULAR_SETTINGS = {
       'TITLE': 'Digital Filing Cabinet API',
       'DESCRIPTION': 'API for DFC document management system',
       'VERSION': '1.0.0',
       'SERVE_INCLUDE_SCHEMA': False,
   }
   ```

2. **Add Schema Annotations**
   ```python
   from drf_spectacular.utils import extend_schema, OpenApiParameter

   @extend_schema(
       summary="User Login",
       description="Obtain JWT tokens by providing username and password",
       responses={200: TokenObtainPairSerializer}
   )
   class CustomTokenObtainPairView(TokenObtainPairView):
       pass
   ```

3. **Generate API Documentation**
   - Access Swagger UI at `/api/docs/`
   - Generate OpenAPI schema file
   - Create Postman/Insomnia collection

**Deliverables:**
- Functional JWT authentication system
- User registration, login, logout endpoints
- Password reset flow
- User profile management API
- API documentation (Swagger UI)
- Postman collection for testing

**Estimated Effort:** 5-6 days

---

### PHASE 0 - BACKEND UAT TEST CASES

**UAT-0.1: Development Environment**
- [ ] Django server starts without errors
- [ ] PostgreSQL connection successful
- [ ] MinIO accessible and can create buckets
- [ ] Elasticsearch cluster responding
- [ ] Redis connection working
- [ ] Celery worker starts without errors
- [ ] All Docker services running

**UAT-0.2: Database & Migrations**
- [ ] All migrations apply without errors
- [ ] Database schema matches ERD
- [ ] Seed data command populates data correctly
- [ ] Foreign key constraints working
- [ ] Database indexes created
- [ ] Can perform CRUD operations on all models

**UAT-0.3: API Foundation**
- [ ] DRF configured correctly
- [ ] API endpoints accessible
- [ ] CORS configured for frontend
- [ ] Pagination working
- [ ] API versioning implemented
- [ ] Error handling returns proper status codes

**UAT-0.4: Authentication System**
- [ ] User can register new account
- [ ] User can login and receive JWT tokens
- [ ] Access token authenticates requests
- [ ] Refresh token generates new access token
- [ ] Token expiration works correctly
- [ ] User can logout
- [ ] Protected endpoints reject unauthenticated requests
- [ ] Password reset flow completes successfully
- [ ] API documentation accessible at `/api/docs/`

**Success Metrics:**
- ✅ All tests pass with 100% success rate
- ✅ No migrations conflicts
- ✅ API response time <200ms for simple queries
- ✅ Code coverage >80%

**Exit Criteria:**
- [ ] All UAT test cases pass
- [ ] Security review completed
- [ ] Performance baseline established
- [ ] API documentation complete
- [ ] Code review approved by 2+ developers

**⚠️ GATE: Cannot proceed to Phase 1 without complete Phase 0 UAT approval**

---

## PHASE 1: INGESTION & STORAGE (Weeks 5-10)

### Backend Tasks

#### Week 5: MinIO Integration & Storage Layer

**Tasks:**

**5.1 Django-Storages Configuration**

1. **Install and Configure django-storages**
   ```python
   # requirements/base.txt
   django-storages==1.14.2
   boto3==1.29.7
   ```

   ```python
   # config/settings/base.py
   INSTALLED_APPS += ['storages']

   # MinIO/S3 Storage Settings
   AWS_ACCESS_KEY_ID = env('MINIO_ACCESS_KEY')
   AWS_SECRET_ACCESS_KEY = env('MINIO_SECRET_KEY')
   AWS_STORAGE_BUCKET_NAME = env('MINIO_BUCKET_NAME', default='dfc-documents')
   AWS_S3_ENDPOINT_URL = env('MINIO_ENDPOINT', default='http://localhost:9000')
   AWS_S3_REGION_NAME = env('MINIO_REGION', default='us-east-1')
   AWS_S3_USE_SSL = env.bool('MINIO_USE_SSL', default=False)
   AWS_DEFAULT_ACL = None
   AWS_S3_FILE_OVERWRITE = False

   # Use MinIO for media files
   DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
   ```

2. **Create MinIO Bucket on Startup**
   ```python
   # apps/documents/apps.py
   from django.apps import AppConfig
   import boto3
   from django.conf import settings

   class DocumentsConfig(AppConfig):
       name = 'apps.documents'

       def ready(self):
           # Create bucket if doesn't exist
           try:
               s3 = boto3.client(
                   's3',
                   endpoint_url=settings.AWS_S3_ENDPOINT_URL,
                   aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                   aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
               )
               if not s3.head_bucket(Bucket=settings.AWS_STORAGE_BUCKET_NAME):
                   s3.create_bucket(Bucket=settings.AWS_STORAGE_BUCKET_NAME)
           except:
               pass
   ```

3. **Configure Bucket Policies**
   - Set up access control policies
   - Configure lifecycle policies (if needed)
   - Set up versioning (optional)

**5.2 File Upload Service**

1. **File Upload Endpoint**
   ```python
   # apps/documents/views.py
   from rest_framework import generics, status
   from rest_framework.parsers import MultiPartParser, FormParser
   from rest_framework.response import Response
   import hashlib

   class DocumentUploadView(generics.CreateAPIView):
       """Upload document endpoint"""
       parser_classes = (MultiPartParser, FormParser)
       serializer_class = DocumentUploadSerializer

       def create(self, request, *args, **kwargs):
           file_obj = request.FILES.get('file')

           # Calculate checksum
           checksum = self._calculate_checksum(file_obj)

           # Validate file
           self._validate_file(file_obj)

           # Create document record
           serializer = self.get_serializer(data=request.data)
           serializer.is_valid(raise_exception=True)
           document = serializer.save(
               file=file_obj,
               checksum=checksum,
               file_size=file_obj.size,
               file_type=file_obj.content_type,
               created_by=request.user,
           )

           # Trigger background tasks (text extraction, indexing)
           from apps.workflows.tasks import extract_text_and_index
           extract_text_and_index.delay(document.id)

           return Response(
               DocumentSerializer(document).data,
               status=status.HTTP_201_CREATED
           )

       def _calculate_checksum(self, file_obj):
           """Calculate SHA-256 checksum"""
           sha256 = hashlib.sha256()
           for chunk in file_obj.chunks():
               sha256.update(chunk)
           return sha256.hexdigest()

       def _validate_file(self, file_obj):
           """Validate file type and size"""
           max_size = 1024 * 1024 * 500  # 500 MB
           if file_obj.size > max_size:
               raise ValidationError('File too large')

           allowed_types = ['application/pdf', 'image/jpeg', ...]
           if file_obj.content_type not in allowed_types:
               raise ValidationError('File type not allowed')
   ```

2. **Support Multiple File Types**
   ```python
   # apps/documents/validators.py
   from django.core.exceptions import ValidationError

   ALLOWED_FILE_TYPES = {
       'application/pdf': ['.pdf'],
       'application/msword': ['.doc'],
       'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
       'application/vnd.ms-excel': ['.xls'],
       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
       'image/jpeg': ['.jpg', '.jpeg'],
       'image/png': ['.png'],
       'text/plain': ['.txt'],
   }

   def validate_file_type(file):
       """Validate file type"""
       if file.content_type not in ALLOWED_FILE_TYPES:
           raise ValidationError(f'File type {file.content_type} not allowed')
   ```

3. **Multipart Upload for Large Files**
   ```python
   # apps/documents/views.py
   from rest_framework.views import APIView

   class ChunkedUploadView(APIView):
       """Handle chunked file uploads for large files"""

       def post(self, request):
           chunk = request.FILES['chunk']
           chunk_number = int(request.data['chunkNumber'])
           total_chunks = int(request.data['totalChunks'])
           upload_id = request.data['uploadId']

           # Store chunk temporarily
           self._store_chunk(upload_id, chunk_number, chunk)

           if chunk_number == total_chunks:
               # All chunks received, assemble file
               file_path = self._assemble_chunks(upload_id, total_chunks)
               # Create document record
               # ... (create document)
               return Response({'status': 'complete'})

           return Response({'status': 'chunk received'})
   ```

**5.3 Storage Optimization**

1. **File Compression**
   - Compress archives before storage (optional)
   - Use MinIO's built-in compression (if available)

2. **Storage Quotas**
   ```python
   # apps/documents/middleware.py
   class StorageQuotaMiddleware:
       """Check storage quota before upload"""

       def __call__(self, request):
           if request.method == 'POST' and '/upload/' in request.path:
               user_usage = self._get_user_storage_usage(request.user)
               quota = request.user.department.storage_quota

               if user_usage >= quota:
                   return Response({'error': 'Storage quota exceeded'},
                                   status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)

           return self.get_response(request)
   ```

3. **Storage Monitoring**
   ```python
   # apps/documents/utils.py
   def get_storage_usage(department=None):
       """Get storage usage statistics"""
       from django.db.models import Sum

       queryset = Document.objects.all()
       if department:
           queryset = queryset.filter(department=department)

       total_size = queryset.aggregate(Sum('file_size'))['file_size__sum'] or 0
       total_docs = queryset.count()

       return {
           'total_size_bytes': total_size,
           'total_size_gb': total_size / (1024 ** 3),
           'total_documents': total_docs,
       }
   ```

**Deliverables:**
- Functional file upload API
- Files stored in MinIO with proper organization
- File validation (type, size)
- Checksum calculation and verification
- Upload progress tracking (via chunked upload)
- Storage quota enforcement
- Storage monitoring utilities

**Estimated Effort:** 4-5 days

---

#### Week 6: Folder Hierarchy System

**Tasks:**

**6.1 Folder CRUD Operations**

1. **Folder Serializers**
   ```python
   # apps/folders/serializers.py
   from rest_framework import serializers
   from .models import Folder

   class FolderSerializer(serializers.ModelSerializer):
       children_count = serializers.SerializerMethodField()
       documents_count = serializers.SerializerMethodField()

       class Meta:
           model = Folder
           fields = ['id', 'name', 'parent', 'path', 'depth',
                     'confidentiality_level', 'children_count',
                     'documents_count', 'created_at', 'updated_at']
           read_only_fields = ['id', 'path', 'depth', 'created_at', 'updated_at']

       def get_children_count(self, obj):
           return obj.children.count()

       def get_documents_count(self, obj):
           return obj.document_set.count()
   ```

2. **Folder API Views**
   ```python
   # apps/folders/views.py
   from rest_framework import generics, status
   from rest_framework.decorators import action
   from rest_framework.response import Response
   from .models import Folder
   from .serializers import FolderSerializer

   class FolderListCreateView(generics.ListCreateAPIView):
       """List folders and create new folder"""
       serializer_class = FolderSerializer

       def get_queryset(self):
           # Filter by parent (for specific folder's children)
           parent_id = self.request.query_params.get('parent')
           if parent_id:
               return Folder.objects.filter(parent_id=parent_id)
           # Root folders (no parent)
           return Folder.objects.filter(parent__isnull=True)

       def perform_create(self, serializer):
           folder = serializer.save(
               owner=self.request.user,
               created_by=self.request.user,
               department=self.request.user.department,
           )
           # Update path and depth
           folder.update_path()

   class FolderDetailView(generics.RetrieveUpdateDestroyAPIView):
       """Get, update, delete folder"""
       queryset = Folder.objects.all()
       serializer_class = FolderSerializer

       def perform_update(self, serializer):
           folder = serializer.save()
           # If parent changed, update path
           if 'parent' in serializer.validated_data:
               folder.update_path()
               # Update all children paths
               folder.update_children_paths()

       def perform_destroy(self, instance):
           # Check if folder is empty or has retention policy
           if instance.document_set.exists():
               raise ValidationError('Cannot delete folder with documents')
           instance.delete()

   class FolderMoveView(generics.GenericAPIView):
       """Move folder to different location"""

       def post(self, request, pk):
           folder = Folder.objects.get(pk=pk)
           new_parent_id = request.data.get('new_parent')
           new_parent = Folder.objects.get(pk=new_parent_id) if new_parent_id else None

           # Prevent circular reference
           if new_parent and folder.is_ancestor_of(new_parent):
               return Response({'error': 'Cannot move folder to its descendant'},
                               status=status.HTTP_400_BAD_REQUEST)

           folder.parent = new_parent
           folder.update_path()
           folder.update_children_paths()
           folder.save()

           return Response(FolderSerializer(folder).data)
   ```

**6.2 Nested Folder Structure**

1. **Tree Traversal Utilities**
   ```python
   # apps/folders/models.py (additional methods)
   class Folder(models.Model):
       # ... (existing fields)

       def update_path(self):
           """Update materialized path"""
           if self.parent:
               self.path = f"{self.parent.path}{self.id}/"
               self.depth = self.parent.depth + 1
           else:
               self.path = f"/{self.id}/"
               self.depth = 0
           self.save(update_fields=['path', 'depth'])

       def update_children_paths(self):
           """Recursively update all children paths"""
           for child in self.children.all():
               child.update_path()
               child.update_children_paths()

       def get_ancestors(self):
           """Get all ancestor folders"""
           if not self.parent:
               return []
           ancestors = [self.parent]
           ancestors.extend(self.parent.get_ancestors())
           return ancestors

       def get_descendants(self):
           """Get all descendant folders"""
           descendants = list(self.children.all())
           for child in self.children.all():
               descendants.extend(child.get_descendants())
           return descendants

       def is_ancestor_of(self, folder):
           """Check if this folder is ancestor of given folder"""
           return self.id in [f.id for f in folder.get_ancestors()]
   ```

2. **Breadcrumb Navigation Data**
   ```python
   # apps/folders/views.py
   class FolderBreadcrumbView(generics.RetrieveAPIView):
       """Get breadcrumb path for folder"""

       def retrieve(self, request, pk):
           folder = Folder.objects.get(pk=pk)
           breadcrumbs = []

           # Build breadcrumb list
           ancestors = folder.get_ancestors()
           for ancestor in reversed(ancestors):
               breadcrumbs.append({
                   'id': ancestor.id,
                   'name': ancestor.name,
               })
           breadcrumbs.append({
               'id': folder.id,
               'name': folder.name,
           })

           return Response({'breadcrumbs': breadcrumbs})
   ```

**6.3 Folder Templates**

1. **Template Model**
   ```python
   # apps/folders/models.py
   class FolderTemplate(models.Model):
       """Predefined folder structures"""
       name = models.CharField(max_length=200)
       description = models.TextField()
       structure = models.JSONField()  # JSON representation of folder tree
       created_by = models.ForeignKey('users.CustomUser', on_delete=models.PROTECT)
       created_at = models.DateTimeField(auto_now_add=True)

       class Meta:
           db_table = 'folder_templates'
   ```

2. **Template Instantiation**
   ```python
   # apps/folders/utils.py
   def instantiate_template(template, parent_folder=None, owner=None):
       """Create folders from template"""
       def create_folder_tree(structure, parent=None):
           for folder_data in structure:
               folder = Folder.objects.create(
                   name=folder_data['name'],
                   parent=parent,
                   owner=owner,
                   confidentiality_level=folder_data.get('confidentiality', 'INTERNAL'),
               )
               folder.update_path()

               # Create children recursively
               if 'children' in folder_data:
                   create_folder_tree(folder_data['children'], parent=folder)

           return folder

       root_folder = create_folder_tree(template.structure, parent=parent_folder)
       return root_folder
   ```

**Deliverables:**
- Complete folder management API
- Tree traversal working correctly
- Breadcrumb navigation data
- Folder depth validation
- Circular reference prevention
- Folder templates system
- Move folder functionality

**Estimated Effort:** 5-6 days

---

#### Week 7: Metadata Management System

**Tasks:**

**7.1 Metadata Schema Implementation**

1. **Controlled Vocabularies**
   ```python
   # apps/documents/constants.py
   DOCUMENT_TYPES = [
       ('INVOICE', 'Invoice'),
       ('CONTRACT', 'Contract'),
       ('REPORT', 'Report'),
       ('KYC_RECORD', 'KYC Record'),
       ('STATEMENT', 'Statement'),
       ('LOAN_APPLICATION', 'Loan Application'),
       ('CORRESPONDENCE', 'Correspondence'),
       # ... more types
   ]

   CONFIDENTIALITY_LEVELS = [
       ('PUBLIC', 'Public'),
       ('INTERNAL', 'Internal'),
       ('CONFIDENTIAL', 'Confidential'),
       ('HIGHLY_CONFIDENTIAL', 'Highly Confidential'),
   ]

   RETENTION_PERIODS = [
       (1, '1 year'),
       (3, '3 years'),
       (5, '5 years'),
       (7, '7 years'),
       (10, '10 years'),
       (25, '25 years'),
       (-1, 'Permanent'),
   ]
   ```

2. **Metadata Validation**
   ```python
   # apps/documents/serializers.py
   class DocumentMetadataSerializer(serializers.Serializer):
       """Validate document metadata"""
       title = serializers.CharField(max_length=500, required=True)
       document_type = serializers.ChoiceField(choices=DOCUMENT_TYPES, required=True)
       identifier = serializers.CharField(max_length=255, required=True)
       document_date = serializers.DateField(required=True)
       creator_source = serializers.CharField(max_length=255, required=True)
       department = serializers.PrimaryKeyRelatedField(
           queryset=Department.objects.all(),
           required=True
       )
       confidentiality_level = serializers.ChoiceField(
           choices=CONFIDENTIALITY_LEVELS,
           required=True
       )
       retention_period_years = serializers.IntegerField(required=True)
       keywords = serializers.ListField(
           child=serializers.CharField(max_length=100),
           required=False,
           allow_empty=True
       )

       def validate_document_date(self, value):
           """Ensure date is not in future"""
           from datetime.date import today
           if value > today():
               raise serializers.ValidationError('Date cannot be in the future')
           return value
   ```

**7.2 Metadata API Endpoints**

1. **Get Metadata Schema**
   ```python
   # apps/documents/views.py
   from rest_framework.views import APIView

   class MetadataSchemaView(APIView):
       """Return metadata schema definition"""

       def get(self, request):
           schema = {
               'fields': [
                   {
                       'name': 'title',
                       'type': 'string',
                       'required': True,
                       'max_length': 500,
                   },
                   {
                       'name': 'document_type',
                       'type': 'choice',
                       'required': True,
                       'choices': DOCUMENT_TYPES,
                   },
                   # ... (all other fields)
               ]
           }
           return Response(schema)
   ```

2. **Update Document Metadata**
   ```python
   class DocumentMetadataUpdateView(generics.UpdateAPIView):
       """Update document metadata"""
       queryset = Document.objects.all()
       serializer_class = DocumentMetadataSerializer

       def perform_update(self, serializer):
           document = serializer.save()

           # Update tags
           if 'keywords' in serializer.validated_data:
               self._update_tags(document, serializer.validated_data['keywords'])

           # Log the metadata change
           from apps.audit.utils import log_action
           log_action(
               user=self.request.user,
               action='EDIT',
               resource_type='Document',
               resource_id=document.id,
               resource_name=document.title,
               metadata={'changed_fields': serializer.validated_data.keys()}
           )

       def _update_tags(self, document, keywords):
           """Create/associate tags"""
           from apps.documents.models import Tag, DocumentTag

           # Remove existing tags
           DocumentTag.objects.filter(document=document).delete()

           # Add new tags
           for keyword in keywords:
               tag, created = Tag.objects.get_or_create(name=keyword.lower())
               DocumentTag.objects.create(
                   document=document,
                   tag=tag,
                   created_by=self.request.user
               )
   ```

3. **Bulk Metadata Update**
   ```python
   class BulkMetadataUpdateView(APIView):
       """Update metadata for multiple documents"""

       def post(self, request):
           document_ids = request.data.get('document_ids', [])
           metadata_updates = request.data.get('metadata', {})

           # Validate permissions for each document
           documents = Document.objects.filter(id__in=document_ids)
           for doc in documents:
               if not request.user.has_perm('documents.change_document', doc):
                   return Response({'error': 'Permission denied'},
                                   status=status.HTTP_403_FORBIDDEN)

           # Update metadata
           for doc in documents:
               for field, value in metadata_updates.items():
                   setattr(doc, field, value)
               doc.save()

           return Response({'updated': len(documents)})
   ```

**7.3 File Naming Convention Enforcement**

1. **Auto-generate Filename**
   ```python
   # apps/documents/utils.py
   def generate_filename(document):
       """Generate standardized filename: YYYY-MM-DD_CustomerID_DocType_ShortDesc_V{n}"""
       date_str = document.document_date.strftime('%Y-%m-%d')
       customer_id = document.identifier
       doc_type = document.get_document_type_display()
       short_desc = document.title[:50].replace(' ', '_')
       version = document.version_number

       # Sanitize components
       safe_customer_id = sanitize_filename_component(customer_id)
       safe_doc_type = sanitize_filename_component(doc_type)
       safe_desc = sanitize_filename_component(short_desc)

       filename = f"{date_str}_{safe_customer_id}_{safe_doc_type}_{safe_desc}_V{version}"

       # Add original extension
       original_extension = os.path.splitext(document.file_name)[1]
       filename += original_extension

       return filename

   def sanitize_filename_component(text):
       """Remove/replace invalid characters"""
       import re
       # Remove invalid characters
       text = re.sub(r'[^\w\s-]', '', text)
       # Replace spaces with underscores
       text = re.sub(r'[\s]+', '_', text)
       return text
   ```

**Deliverables:**
- Metadata validation system
- Controlled vocabulary management
- Metadata schema API
- Bulk metadata update
- Standardized file naming
- Tag management

**Estimated Effort:** 5-6 days

---

#### Week 8: Document Versioning System

**Tasks:**

**8.1 Version Control Implementation**

1. **Version Model** (already in Document model, enhance logic)
   ```python
   # apps/documents/models.py
   class DocumentVersion(models.Model):
       """Explicit version tracking (optional, alternative to parent_version FK)"""
       id = models.UUIDField(primary_key=True, default=uuid.uuid4)
       document = models.ForeignKey(Document, on_delete=models.CASCADE,
                                    related_name='versions')
       version_number = models.IntegerField()
       file = models.FileField(upload_to='versions/%Y/%m/%d/')
       file_size = models.BigIntegerField()
       checksum = models.CharField(max_length=64)
       change_description = models.TextField(blank=True)
       created_at = models.DateTimeField(auto_now_add=True)
       created_by = models.ForeignKey('users.CustomUser', on_delete=models.PROTECT)

       class Meta:
           db_table = 'document_versions'
           unique_together = ['document', 'version_number']
           ordering = ['-version_number']
   ```

2. **Version Creation Logic**
   ```python
   # apps/documents/utils.py
   def create_new_version(original_document, new_file, change_description, user):
       """Create new version of document"""
       from apps.documents.models import DocumentVersion

       # Get next version number
       latest_version = DocumentVersion.objects.filter(
           document=original_document
       ).order_by('-version_number').first()

       next_version = (latest_version.version_number + 1) if latest_version else 1

       # Create version record
       version = DocumentVersion.objects.create(
           document=original_document,
           version_number=next_version,
           file=new_file,
           file_size=new_file.size,
           checksum=calculate_checksum(new_file),
           change_description=change_description,
           created_by=user,
       )

       # Update main document to point to latest version
       original_document.version_number = next_version
       original_document.file = new_file
       original_document.file_size = new_file.size
       original_document.save()

       return version
   ```

**8.2 Version API Endpoints**

1. **Upload New Version**
   ```python
   # apps/documents/views.py
   class DocumentVersionUploadView(APIView):
       """Upload new version of document"""
       parser_classes = (MultiPartParser, FormParser)

       def post(self, request, pk):
           document = Document.objects.get(pk=pk)

           # Check permission
           if not request.user.has_perm('documents.change_document', document):
               return Response({'error': 'Permission denied'},
                               status=status.HTTP_403_FORBIDDEN)

           file_obj = request.FILES.get('file')
           change_description = request.data.get('change_description', '')

           # Create new version
           version = create_new_version(
               original_document=document,
               new_file=file_obj,
               change_description=change_description,
               user=request.user,
           )

           # Trigger text extraction for new version
           from apps.workflows.tasks import extract_text_and_index
           extract_text_and_index.delay(document.id)

           return Response(DocumentVersionSerializer(version).data,
                           status=status.HTTP_201_CREATED)
   ```

2. **List All Versions**
   ```python
   class DocumentVersionListView(generics.ListAPIView):
       """List all versions of a document"""
       serializer_class = DocumentVersionSerializer

       def get_queryset(self):
           document_id = self.kwargs['pk']
           return DocumentVersion.objects.filter(document_id=document_id)
   ```

3. **Retrieve Specific Version**
   ```python
   class DocumentVersionDetailView(generics.RetrieveAPIView):
       """Get specific version details"""
       serializer_class = DocumentVersionSerializer

       def get_queryset(self):
           document_id = self.kwargs['pk']
           return DocumentVersion.objects.filter(document_id=document_id)
   ```

4. **Restore Previous Version**
   ```python
   class DocumentVersionRestoreView(APIView):
       """Restore document to previous version"""

       def post(self, request, pk, version_number):
           document = Document.objects.get(pk=pk)
           version_to_restore = DocumentVersion.objects.get(
               document=document,
               version_number=version_number
           )

           # Create new version from old version (not actually reverting)
           new_version = create_new_version(
               original_document=document,
               new_file=version_to_restore.file,
               change_description=f"Restored from version {version_number}",
               user=request.user,
           )

           return Response(DocumentVersionSerializer(new_version).data)
   ```

5. **Compare Versions**
   ```python
   class DocumentVersionCompareView(APIView):
       """Compare two versions (metadata only)"""

       def get(self, request, pk):
           version1_num = request.query_params.get('version1')
           version2_num = request.query_params.get('version2')

           version1 = DocumentVersion.objects.get(
               document_id=pk,
               version_number=version1_num
           )
           version2 = DocumentVersion.objects.get(
               document_id=pk,
               version_number=version2_num
           )

           comparison = {
               'version1': DocumentVersionSerializer(version1).data,
               'version2': DocumentVersionSerializer(version2).data,
               'differences': {
                   'file_size': version2.file_size - version1.file_size,
                   'time_between': (version2.created_at - version1.created_at).days,
               }
           }

           return Response(comparison)
   ```

**8.3 Version Storage Strategy**

- Store all versions in MinIO (no deletion)
- Use different folder structure: `versions/YYYY/MM/DD/`
- Keep all versions indefinitely (or based on retention policy)
- Implement deduplication based on checksum (future enhancement)

**Deliverables:**
- Complete version control system
- Version upload API
- Version history retrieval
- Version restore functionality
- Version comparison API
- All versions stored permanently

**Estimated Effort:** 4-5 days

---

#### Week 9-10: Bulk Operations & File Operations API

**Tasks:**

**10.1 Bulk Operations API**

1. **Bulk Move Documents**
   ```python
   # apps/documents/views.py
   class BulkMoveDocumentsView(APIView):
       """Move multiple documents to different folder"""

       def post(self, request):
           document_ids = request.data.get('document_ids', [])
           target_folder_id = request.data.get('target_folder')

           target_folder = Folder.objects.get(pk=target_folder_id)
           documents = Document.objects.filter(id__in=document_ids)

           # Check permissions for all documents
           for doc in documents:
               if not request.user.has_perm('documents.change_document', doc):
                   return Response({'error': f'Permission denied for {doc.title}'},
                                   status=status.HTTP_403_FORBIDDEN)

           # Move documents
           moved_count = 0
           for doc in documents:
               doc.folder = target_folder
               doc.save()
               moved_count += 1

               # Log action
               log_action(request.user, 'MOVE', 'Document', doc.id, doc.title,
                          metadata={'from': doc.folder.id, 'to': target_folder.id})

           return Response({'moved': moved_count})
   ```

2. **Bulk Copy Documents**
   ```python
   class BulkCopyDocumentsView(APIView):
       """Copy multiple documents to different folder"""

       def post(self, request):
           document_ids = request.data.get('document_ids', [])
           target_folder_id = request.data.get('target_folder')

           target_folder = Folder.objects.get(pk=target_folder_id)
           documents = Document.objects.filter(id__in=document_ids)

           copied_count = 0
           for doc in documents:
               # Create copy (new UUID, same file)
               copy = Document.objects.create(
                   title=f"{doc.title} (Copy)",
                   file=doc.file,  # Same file in MinIO
                   folder=target_folder,
                   document_type=doc.document_type,
                   # ... (copy all metadata)
                   created_by=request.user,
               )
               copied_count += 1

           return Response({'copied': copied_count})
   ```

3. **Bulk Delete Documents**
   ```python
   class BulkDeleteDocumentsView(APIView):
       """Delete multiple documents"""

       def post(self, request):
           document_ids = request.data.get('document_ids', [])
           documents = Document.objects.filter(id__in=document_ids)

           # Check for legal hold
           for doc in documents:
               if doc.legalholddocument_set.exists():
                   return Response({'error': f'Document {doc.title} is on legal hold'},
                                   status=status.HTTP_400_BAD_REQUEST)

           # Soft delete (mark as deleted, don't actually delete file)
           deleted_count = 0
           for doc in documents:
               doc.is_deleted = True
               doc.deleted_at = timezone.now()
               doc.deleted_by = request.user
               doc.save()
               deleted_count += 1

               log_action(request.user, 'DELETE', 'Document', doc.id, doc.title)

           return Response({'deleted': deleted_count})
   ```

4. **Export Selected Documents (ZIP)**
   ```python
   from django.http import HttpResponse
   import zipfile
   import io

   class BulkExportDocumentsView(APIView):
       """Download multiple documents as ZIP"""

       def post(self, request):
           document_ids = request.data.get('document_ids', [])
           documents = Document.objects.filter(id__in=document_ids)

           # Create ZIP file in memory
           zip_buffer = io.BytesIO()
           with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
               for doc in documents:
                   # Read file from MinIO
                   file_content = doc.file.read()

                   # Add to ZIP with safe filename
                   zip_file.writestr(doc.file_name, file_content)

           # Return ZIP file
           response = HttpResponse(zip_buffer.getvalue(),
                                   content_type='application/zip')
           response['Content-Disposition'] = 'attachment; filename="documents.zip"'
           return response
   ```

**10.2 File Operations**

1. **Download Single File**
   ```python
   class DocumentDownloadView(APIView):
       """Download document file"""

       def get(self, request, pk):
           document = Document.objects.get(pk=pk)

           # Check permission
           if not request.user.has_perm('documents.view_document', document):
               return Response({'error': 'Permission denied'},
                               status=status.HTTP_403_FORBIDDEN)

           # Log download
           log_action(request.user, 'DOWNLOAD', 'Document', document.id, document.title)

           # Generate pre-signed URL from MinIO (direct download)
           url = document.file.url
           return Response({'download_url': url})
   ```

2. **Generate Thumbnails**
   ```python
   # apps/workflows/tasks.py
   from celery import shared_task
   from PIL import Image
   import os

   @shared_task
   def generate_thumbnail(document_id):
       """Generate thumbnail for image or PDF"""
       document = Document.objects.get(id=document_id)

       if document.file_type.startswith('image/'):
           # Generate image thumbnail
           image = Image.open(document.file)
           image.thumbnail((200, 200))

           # Save thumbnail
           thumb_path = f"thumbnails/{document.id}.jpg"
           # ... (save to MinIO)

       elif document.file_type == 'application/pdf':
           # Generate PDF thumbnail (first page)
           from pdf2image import convert_from_path
           images = convert_from_path(document.file.path, first_page=1, last_page=1)
           images[0].thumbnail((200, 200))
           # ... (save to MinIO)
   ```

3. **Convert to PDF** (Optional, for Office documents)
   ```python
   @shared_task
   def convert_to_pdf(document_id):
       """Convert Office document to PDF"""
       # Use LibreOffice or similar tool
       # This is complex and may not be needed initially
       pass
   ```

**10.3 Smart Folders**

1. **Smart Folder Model**
   ```python
   # apps/folders/models.py
   class SmartFolder(models.Model):
       """Dynamic folder based on search criteria"""
       name = models.CharField(max_length=255)
       search_criteria = models.JSONField()  # Store search filters
       owner = models.ForeignKey('users.CustomUser', on_delete=models.CASCADE)
       created_at = models.DateTimeField(auto_now_add=True)

       class Meta:
           db_table = 'smart_folders'
   ```

2. **Smart Folder API**
   ```python
   class SmartFolderListView(generics.ListCreateAPIView):
       """List and create smart folders"""
       serializer_class = SmartFolderSerializer

       def get_queryset(self):
           return SmartFolder.objects.filter(owner=self.request.user)

   class SmartFolderDocumentsView(generics.ListAPIView):
       """Get documents matching smart folder criteria"""
       serializer_class = DocumentSerializer

       def get_queryset(self):
           smart_folder = SmartFolder.objects.get(pk=self.kwargs['pk'])

           # Apply search criteria
           queryset = Document.objects.all()
           criteria = smart_folder.search_criteria

           if 'document_type' in criteria:
               queryset = queryset.filter(document_type=criteria['document_type'])
           if 'tags' in criteria:
               queryset = queryset.filter(documenttag__tag__name__in=criteria['tags'])
           # ... (apply other filters)

           return queryset
   ```

**Deliverables:**
- Bulk move, copy, delete APIs
- Bulk export as ZIP
- Document download with permission check
- Thumbnail generation (Celery task)
- Smart folders functionality
- File preview API

**Estimated Effort:** 6-7 days

---

### PHASE 1 - BACKEND UAT TEST CASES

**UAT-1.1: File Upload**
- [ ] Single file uploads to MinIO successfully
- [ ] File metadata stored in database
- [ ] Checksum calculated correctly
- [ ] Large files (>500MB) upload without errors
- [ ] Unsupported file types rejected
- [ ] File size limits enforced
- [ ] Upload triggers background tasks (text extraction)

**UAT-1.2: Folder Management**
- [ ] Can create root-level folder
- [ ] Can create nested folders (5+ levels)
- [ ] Folder path updates correctly
- [ ] Rename folder updates path and children paths
- [ ] Move folder updates all descendants
- [ ] Cannot delete folder with documents
- [ ] Circular folder moves prevented
- [ ] Folder templates instantiate correctly

**UAT-1.3: Metadata Validation**
- [ ] API rejects upload without mandatory metadata
- [ ] Date validation works (YYYY-MM-DD, not future)
- [ ] Document type must be from controlled list
- [ ] Auto-generated filenames follow convention
- [ ] Tags created and associated correctly
- [ ] Bulk metadata update works

**UAT-1.4: Document Versioning**
- [ ] New version increments version number
- [ ] All versions stored in MinIO
- [ ] Version history API returns all versions
- [ ] Download specific version works
- [ ] Restore version creates new version
- [ ] Version metadata accurate

**UAT-1.5: Bulk Operations**
- [ ] Bulk move updates all documents
- [ ] Bulk copy creates duplicates correctly
- [ ] Bulk delete respects legal hold
- [ ] Export as ZIP downloads all files
- [ ] Smart folder returns matching documents

**Performance Testing:**
- [ ] Upload 100 files (50MB each) completes successfully
- [ ] Folder tree API responds in <2s (10,000 folders)
- [ ] Bulk move 1,000 documents completes in <30s
- [ ] MinIO storage usage accurate

**Security Testing:**
- [ ] File checksums verified
- [ ] Path traversal attacks prevented
- [ ] Permission checks on all operations
- [ ] Audit log captures all actions

**Success Metrics:**
- ✅ Upload success rate >99.5%
- ✅ Zero data corruption incidents
- ✅ API response time <300ms
- ✅ All operations logged in audit trail

**Exit Criteria:**
- [ ] All UAT test cases pass
- [ ] Load testing completed
- [ ] Security scan passed
- [ ] API documentation updated
- [ ] Integration with frontend verified
- [ ] Stakeholder demo approved

**⚠️ GATE: Cannot proceed to Phase 2 without complete Phase 1 UAT approval**

---

## PHASE 2: SEARCH & CLASSIFICATION (Weeks 11-16)

### Backend Tasks

#### Week 11: Elasticsearch Integration

**Tasks:**

**11.1 Elasticsearch Setup**

1. **Install django-elasticsearch-dsl**
   ```bash
   pip install django-elasticsearch-dsl
   ```

   ```python
   # config/settings/base.py
   INSTALLED_APPS += ['django_elasticsearch_dsl']

   ELASTICSEARCH_DSL = {
       'default': {
           'hosts': env('ELASTICSEARCH_HOST', default='localhost:9200'),
           'http_auth': (
               env('ELASTICSEARCH_USER', default=''),
               env('ELASTICSEARCH_PASSWORD', default=''),
           ),
       },
   }
   ```

2. **Create Index Mappings**
   ```python
   # apps/search/documents.py
   from django_elasticsearch_dsl import Document, Index, fields
   from apps.documents.models import Document as DocModel

   # Create index
   documents_index = Index('documents')
   documents_index.settings(
       number_of_shards=1,
       number_of_replicas=0
   )

   @documents_index.doc_type
   class DocumentDocument(Document):
       """Elasticsearch document for Document model"""

       # Define searchable fields
       id = fields.KeywordField()
       title = fields.TextField(
           analyzer='standard',
           fields={'raw': fields.KeywordField()}
       )
       extracted_text = fields.TextField(analyzer='standard')
       file_name = fields.TextField()

       # Metadata fields
       document_type = fields.KeywordField()
       identifier = fields.KeywordField()
       confidentiality_level = fields.KeywordField()
       document_date = fields.DateField()

       # Relationships
       owner = fields.ObjectField(properties={
           'id': fields.KeywordField(),
           'username': fields.KeywordField(),
           'email': fields.KeywordField(),
       })
       department = fields.ObjectField(properties={
           'id': fields.KeywordField(),
           'name': fields.KeywordField(),
       })
       folder = fields.ObjectField(properties={
           'id': fields.KeywordField(),
           'name': fields.KeywordField(),
           'path': fields.KeywordField(),
       })

       # Tags
       tags = fields.KeywordField(multi=True)

       class Django:
           model = DocModel
           fields = [
               'file_type',
               'file_size',
               'created_at',
               'updated_at',
           ]
           related_models = ['owner', 'department', 'folder']

       def get_instances_from_related(self, related_instance):
           """Update document index when related models change"""
           if isinstance(related_instance, CustomUser):
               return related_instance.document_set.all()
           # ... (other related models)
   ```

3. **Define Analyzers**
   ```python
   # Custom analyzer for better search
   documents_index.settings(
       analysis={
           'analyzer': {
               'custom_analyzer': {
                   'type': 'custom',
                   'tokenizer': 'standard',
                   'filter': ['lowercase', 'stop', 'snowball']
               }
           }
       }
   )
   ```

**11.2 Document Indexing**

1. **Implement Incremental Indexing (Signals)**
   ```python
   # apps/documents/signals.py
   from django.db.models.signals import post_save, post_delete
   from django.dispatch import receiver
   from .models import Document

   @receiver(post_save, sender=Document)
   def update_document_index(sender, instance, **kwargs):
       """Update Elasticsearch index when document is saved"""
       from apps.search.documents import DocumentDocument

       doc = DocumentDocument.get(id=instance.id, ignore=404)
       if doc:
           doc.update(instance)
       else:
           DocumentDocument().update(instance)

   @receiver(post_delete, sender=Document)
   def delete_document_index(sender, instance, **kwargs):
       """Remove from index when document deleted"""
       from apps.search.documents import DocumentDocument

       doc = DocumentDocument.get(id=instance.id, ignore=404)
       if doc:
           doc.delete()
   ```

2. **Bulk Re-indexing**
   ```python
   # apps/search/management/commands/rebuild_index.py
   from django.core.management.base import BaseCommand
   from django_elasticsearch_dsl.registries import registry

   class Command(BaseCommand):
       help = 'Rebuild Elasticsearch indices'

       def handle(self, *args, **options):
           self.stdout.write('Rebuilding indices...')

           # Delete existing indices
           registry.get_indices().delete(ignore=404)

           # Create indices
           registry.get_indices().create()

           # Populate indices
           models = registry.get_models()
           for model in models:
               self.stdout.write(f'Indexing {model.__name__}...')
               registry.update(model)

           self.stdout.write(self.style.SUCCESS('Successfully rebuilt indices'))
   ```

**11.3 Index Management**

1. **Index Health Monitoring**
   ```python
   # apps/search/utils.py
   from elasticsearch import Elasticsearch
   from django.conf import settings

   def get_index_health():
       """Get Elasticsearch cluster health"""
       es = Elasticsearch(hosts=settings.ELASTICSEARCH_DSL['default']['hosts'])
       health = es.cluster.health()
       return health

   def get_index_stats():
       """Get index statistics"""
       es = Elasticsearch(hosts=settings.ELASTICSEARCH_DSL['default']['hosts'])
       stats = es.indices.stats(index='documents')
       return stats
   ```

**Deliverables:**
- Elasticsearch configured and running
- Document index created with proper mappings
- Incremental indexing working (via signals)
- Bulk re-indexing command
- Index health monitoring utilities

**Estimated Effort:** 3-4 days

---

#### Week 12: Text Extraction Pipeline

**Tasks:**

**12.1 Text Extraction Libraries**

1. **Install Libraries**
   ```bash
   pip install PyPDF2 python-docx openpyxl
   ```

2. **Create Extraction Service**
   ```python
   # apps/workflows/extractors.py
   import PyPDF2
   from docx import Document as DocxDocument
   import openpyxl

   class TextExtractor:
       """Extract text from various document formats"""

       @staticmethod
       def extract_from_pdf(file_path):
           """Extract text from PDF"""
           text = ""
           try:
               with open(file_path, 'rb') as file:
                   pdf_reader = PyPDF2.PdfReader(file)
                   for page in pdf_reader.pages:
                       text += page.extract_text() + "\n"
           except Exception as e:
               raise Exception(f"PDF extraction failed: {str(e)}")
           return text

       @staticmethod
       def extract_from_docx(file_path):
           """Extract text from Word document"""
           try:
               doc = DocxDocument(file_path)
               text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
           except Exception as e:
               raise Exception(f"DOCX extraction failed: {str(e)}")
           return text

       @staticmethod
       def extract_from_xlsx(file_path):
           """Extract text from Excel"""
           try:
               wb = openpyxl.load_workbook(file_path, data_only=True)
               text = ""
               for sheet in wb.worksheets:
                   for row in sheet.iter_rows(values_only=True):
                       text += " ".join([str(cell) for cell in row if cell]) + "\n"
           except Exception as e:
               raise Exception(f"XLSX extraction failed: {str(e)}")
           return text

       @staticmethod
       def extract_text(file_path, file_type):
           """Extract text based on file type"""
           extractors = {
               'application/pdf': TextExtractor.extract_from_pdf,
               'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                   TextExtractor.extract_from_docx,
               'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                   TextExtractor.extract_from_xlsx,
               'text/plain': lambda path: open(path, 'r').read(),
           }

           extractor = extractors.get(file_type)
           if not extractor:
               return ""

           return extractor(file_path)
   ```

**12.2 Celery Task for Extraction**

1. **Create Async Task**
   ```python
   # apps/workflows/tasks.py
   from celery import shared_task
   from apps.documents.models import Document
   from .extractors import TextExtractor
   import logging

   logger = logging.getLogger(__name__)

   @shared_task(bind=True, max_retries=3)
   def extract_document_text(self, document_id):
       """Extract text from document asynchronously"""
       try:
           document = Document.objects.get(id=document_id)

           # Download file from MinIO to temp location
           temp_path = f"/tmp/{document.id}"
           with open(temp_path, 'wb') as f:
               f.write(document.file.read())

           # Extract text
           extracted_text = TextExtractor.extract_text(
               temp_path,
               document.file_type
           )

           # Save extracted text to document
           document.extracted_text = extracted_text
           document.save(update_fields=['extracted_text'])

           # Update Elasticsearch index
           from apps.search.documents import DocumentDocument
           DocumentDocument().update(document)

           logger.info(f"Extracted text from document {document_id}")

       except Exception as exc:
           logger.error(f"Text extraction failed: {exc}")
           raise self.retry(exc=exc, countdown=60)
   ```

**12.3 Error Handling & Notifications**

1. **Handle Extraction Errors**
   ```python
   @shared_task
   def handle_extraction_failure(document_id, error_message):
       """Handle extraction failures"""
       document = Document.objects.get(id=document_id)
       document.extraction_status = 'FAILED'
       document.extraction_error = error_message
       document.save()

       # Notify document owner
       send_notification(
           user=document.owner,
           title="Document Processing Failed",
           message=f"Could not extract text from {document.title}"
       )
   ```

**Deliverables:**
- Text extraction working for PDF, DOCX, XLSX, TXT
- Celery task for async extraction
- Extracted text stored in database
- Extracted text indexed in Elasticsearch
- Error handling and logging

**Estimated Effort:** 3-4 days

---

#### Week 13: OCR Implementation

**Tasks:**

**13.1 Tesseract OCR Setup**

1. **Install Tesseract**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install tesseract-ocr tesseract-ocr-eng

   # Install Python wrapper
   pip install pytesseract pdf2image Pillow
   ```

   ```python
   # config/settings/base.py
   TESSERACT_CMD = env('TESSERACT_CMD', default='/usr/bin/tesseract')
   ```

2. **Configure Language Packs**
   ```bash
   # Install additional languages
   sudo apt-get install tesseract-ocr-fra tesseract-ocr-spa
   ```

**13.2 OCR Pipeline**

1. **Detect Scanned Documents**
   ```python
   # apps/workflows/utils.py
   def is_scanned_document(file_path, file_type):
       """Detect if PDF is scanned (no selectable text)"""
       if file_type != 'application/pdf':
           return False

       try:
           import PyPDF2
           with open(file_path, 'rb') as file:
               pdf_reader = PyPDF2.PdfReader(file)
               # Check if first page has extractable text
               first_page = pdf_reader.pages[0]
               text = first_page.extract_text().strip()

               # If very little text, likely scanned
               return len(text) < 50
       except:
           return True
   ```

2. **Create OCR Task**
   ```python
   # apps/workflows/tasks.py
   from pdf2image import convert_from_path
   import pytesseract
   from PIL import Image

   @shared_task(bind=True, max_retries=2)
   def ocr_document(self, document_id):
       """Perform OCR on scanned document"""
       try:
           document = Document.objects.get(id=document_id)

           # Download file
           temp_path = f"/tmp/{document.id}.pdf"
           with open(temp_path, 'wb') as f:
               f.write(document.file.read())

           # Check if scanned
           if not is_scanned_document(temp_path, document.file_type):
               logger.info(f"Document {document_id} is not scanned, skipping OCR")
               return

           # Convert PDF to images
           images = convert_from_path(temp_path, dpi=300)

           # Perform OCR on each page
           ocr_text = ""
           confidences = []

           for i, image in enumerate(images):
               # Preprocess image
               processed_image = preprocess_image(image)

               # Perform OCR
               page_data = pytesseract.image_to_data(
                   processed_image,
                   output_type=pytesseract.Output.DICT
               )

               # Extract text and confidence
               page_text = pytesseract.image_to_string(processed_image)
               ocr_text += f"\n--- Page {i+1} ---\n{page_text}"

               # Calculate average confidence for page
               page_confidences = [int(conf) for conf in page_data['conf'] if conf != '-1']
               if page_confidences:
                   confidences.extend(page_confidences)

           # Calculate overall confidence
           avg_confidence = sum(confidences) / len(confidences) if confidences else 0

           # Save OCR results
           document.extracted_text = ocr_text
           document.ocr_confidence = avg_confidence
           document.save(update_fields=['extracted_text', 'ocr_confidence'])

           # Update search index
           from apps.search.documents import DocumentDocument
           DocumentDocument().update(document)

           logger.info(f"OCR completed for document {document_id}, confidence: {avg_confidence}%")

       except Exception as exc:
           logger.error(f"OCR failed: {exc}")
           raise self.retry(exc=exc, countdown=120)

   def preprocess_image(image):
       """Preprocess image for better OCR accuracy"""
       from PIL import ImageEnhance, ImageFilter

       # Convert to grayscale
       image = image.convert('L')

       # Increase contrast
       enhancer = ImageEnhance.Contrast(image)
       image = enhancer.enhance(2.0)

       # Denoise
       image = image.filter(ImageFilter.MedianFilter(size=3))

       return image
   ```

**13.3 Combined Extraction + OCR Task**

```python
@shared_task(bind=True)
def extract_text_and_index(self, document_id):
    """Combined task: extract text or OCR, then index"""
    document = Document.objects.get(id=document_id)

    # Try standard text extraction first
    extract_document_text.delay(document_id)

    # If PDF, check if OCR needed
    if document.file_type == 'application/pdf':
        # Wait for extraction to complete, then check
        time.sleep(5)
        document.refresh_from_db()

        if not document.extracted_text or len(document.extracted_text) < 50:
            # Likely scanned, perform OCR
            ocr_document.delay(document_id)
```

**Deliverables:**
- Tesseract OCR integrated
- OCR working for scanned PDFs and images
- Image preprocessing for better accuracy
- OCR confidence scores logged
- Searchable text from scanned documents

**Estimated Effort:** 4-5 days

---

#### Week 14: Search API & Advanced Filtering

**Tasks:**

**14.1 Search Endpoint**

```python
# apps/search/views.py
from elasticsearch_dsl import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

class DocumentSearchView(APIView):
    """Search documents endpoint"""

    def get(self, request):
        # Get search parameters
        query_string = request.query_params.get('q', '')
        document_type = request.query_params.get('document_type')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        confidentiality = request.query_params.get('confidentiality')
        department = request.query_params.get('department')
        tags = request.query_params.getlist('tags')
        folder_id = request.query_params.get('folder_id')

        # Build Elasticsearch query
        from apps.search.documents import DocumentDocument
        search = DocumentDocument.search()

        # Full-text search
        if query_string:
            search = search.query(
                "multi_match",
                query=query_string,
                fields=['title^3', 'extracted_text', 'file_name^2'],
                fuzziness='AUTO'
            )

        # Apply filters
        if document_type:
            search = search.filter('term', document_type=document_type)

        if date_from or date_to:
            date_range = {}
            if date_from:
                date_range['gte'] = date_from
            if date_to:
                date_range['lte'] = date_to
            search = search.filter('range', document_date=date_range)

        if confidentiality:
            search = search.filter('term', confidentiality_level=confidentiality)

        if department:
            search = search.filter('term', department__id=department)

        if tags:
            search = search.filter('terms', tags=tags)

        if folder_id:
            search = search.filter('term', folder__id=folder_id)

        # Permission filtering (only show docs user can access)
        accessible_doc_ids = self._get_accessible_documents(request.user)
        search = search.filter('ids', values=accessible_doc_ids)

        # Execute search
        response = search.execute()

        # Serialize results
        results = []
        for hit in response.hits:
            results.append({
                'id': hit.id,
                'title': hit.title,
                'snippet': self._generate_snippet(hit, query_string),
                'document_type': hit.document_type,
                'confidentiality_level': hit.confidentiality_level,
                'document_date': hit.document_date,
                'folder': {
                    'id': hit.folder.id,
                    'name': hit.folder.name,
                    'path': hit.folder.path,
                },
                'score': hit.meta.score,
            })

        return Response({
            'total': response.hits.total.value,
            'results': results,
            'took': response.took,
        })

    def _get_accessible_documents(self, user):
        """Get list of document IDs user can access"""
        # Implement permission checking
        # For now, return all (will be enhanced in Phase 3)
        from apps.documents.models import Document
        return Document.objects.values_list('id', flat=True)

    def _generate_snippet(self, hit, query):
        """Generate search result snippet with highlights"""
        if hasattr(hit.meta, 'highlight'):
            if hasattr(hit.meta.highlight, 'extracted_text'):
                return hit.meta.highlight.extracted_text[0]
            if hasattr(hit.meta.highlight, 'title'):
                return hit.meta.highlight.title[0]

        # Fallback: first 200 chars
        return hit.extracted_text[:200] + '...' if hit.extracted_text else ''
```

**14.2 Faceted Search**

```python
class FacetedSearchView(APIView):
    """Search with facets (aggregations)"""

    def get(self, request):
        # ... (same search building as above)

        # Add aggregations
        search = search.extra(
            aggs={
                'document_types': {
                    'terms': {'field': 'document_type', 'size': 20}
                },
                'departments': {
                    'terms': {'field': 'department.name.keyword', 'size': 20}
                },
                'confidentiality_levels': {
                    'terms': {'field': 'confidentiality_level', 'size': 10}
                },
                'tags': {
                    'terms': {'field': 'tags', 'size': 20}
                },
                'date_histogram': {
                    'date_histogram': {
                        'field': 'document_date',
                        'calendar_interval': 'month'
                    }
                }
            }
        )

        response = search.execute()

        # Format facets
        facets = {
            'document_types': [
                {'key': bucket.key, 'count': bucket.doc_count}
                for bucket in response.aggregations.document_types.buckets
            ],
            'departments': [
                {'key': bucket.key, 'count': bucket.doc_count}
                for bucket in response.aggregations.departments.buckets
            ],
            # ... (other facets)
        }

        return Response({
            'results': # ... (search results),
            'facets': facets,
        })
```

**14.3 Search Features**

1. **Autocomplete**
   ```python
   class SearchAutocompleteView(APIView):
       """Autocomplete suggestions"""

       def get(self, request):
           query = request.query_params.get('q', '')

           from apps.search.documents import DocumentDocument
           search = DocumentDocument.search()
           search = search.query(
               'match_phrase_prefix',
               title={'query': query, 'max_expansions': 10}
           )

           response = search[:10].execute()

           suggestions = [hit.title for hit in response.hits]
           return Response({'suggestions': suggestions})
   ```

2. **Spell Checking**
   ```python
   # In main search view, add suggest
   search = search.suggest(
       'suggestions',
       query_string,
       term={'field': 'title'}
   )
   ```

**Deliverables:**
- Advanced search API with all filters
- Faceted search (aggregations)
- Autocomplete endpoint
- Spell checking
- Fuzzy matching
- Keyword highlighting
- Permission-filtered results

**Estimated Effort:** 5-6 days

---

#### Week 15: Automated Classification System

**Tasks:**

**15.1 Classification Rules Engine**

1. **Rule Model** (already created in Week 2, enhance)
   ```python
   # apps/classification/models.py
   class ClassificationRule(models.Model):
       """Auto-classification rules"""
       name = models.CharField(max_length=200)
       description = models.TextField()
       priority = models.IntegerField(default=0)  # Higher = executed first
       is_active = models.BooleanField(default=True)

       # Conditions (JSON structure)
       conditions = models.JSONField(default=dict)
       # Example: {
       #   'filename_contains': ['invoice'],
       #   'content_contains': ['payment', 'receipt'],
       #   'file_type': 'application/pdf'
       # }

       # Actions (JSON structure)
       actions = models.JSONField(default=dict)
       # Example: {
       #   'move_to_folder': 'uuid-of-folder',
       #   'set_document_type': 'INVOICE',
       #   'add_tags': ['finance', 'payment']
       # }

       created_at = models.DateTimeField(auto_now_add=True)
       created_by = models.ForeignKey('users.CustomUser', on_delete=models.PROTECT)

       class Meta:
           db_table = 'classification_rules'
           ordering = ['-priority', 'name']
   ```

**15.2 Rule Execution**

1. **Rule Matching Algorithm**
   ```python
   # apps/classification/engine.py
   class ClassificationEngine:
       """Match and apply classification rules"""

       @staticmethod
       def matches_conditions(document, conditions):
           """Check if document matches rule conditions"""
           # Filename contains
           if 'filename_contains' in conditions:
               keywords = conditions['filename_contains']
               if not any(kw.lower() in document.file_name.lower() for kw in keywords):
                   return False

           # Content contains
           if 'content_contains' in conditions:
               keywords = conditions['content_contains']
               if not document.extracted_text:
                   return False
               if not any(kw.lower() in document.extracted_text.lower() for kw in keywords):
                   return False

           # File type
           if 'file_type' in conditions:
               if document.file_type != conditions['file_type']:
                   return False

           # Document type
           if 'document_type' in conditions:
               if document.document_type != conditions['document_type']:
                   return False

           return True

       @staticmethod
       def apply_actions(document, actions):
           """Apply rule actions to document"""
           from apps.folders.models import Folder
           from apps.documents.models import Tag, DocumentTag

           changed = False

           # Move to folder
           if 'move_to_folder' in actions:
               folder = Folder.objects.get(id=actions['move_to_folder'])
               document.folder = folder
               changed = True

           # Set document type
           if 'set_document_type' in actions:
               document.document_type = actions['set_document_type']
               changed = True

           # Add tags
           if 'add_tags' in actions:
               for tag_name in actions['add_tags']:
                   tag, created = Tag.objects.get_or_create(name=tag_name.lower())
                   DocumentTag.objects.get_or_create(
                       document=document,
                       tag=tag,
                       defaults={'created_by': document.owner}
                   )

           if changed:
               document.save()

           return True

       @staticmethod
       def classify_document(document):
           """Apply all matching rules to document"""
           rules = ClassificationRule.objects.filter(is_active=True)

           applied_rules = []
           for rule in rules:
               if ClassificationEngine.matches_conditions(document, rule.conditions):
                   ClassificationEngine.apply_actions(document, rule.actions)
                   applied_rules.append(rule.id)

           return applied_rules
   ```

2. **Auto-classify on Upload (Celery Task)**
   ```python
   # apps/workflows/tasks.py
   @shared_task
   def apply_classification_rules(document_id):
       """Apply classification rules to document"""
       from apps.documents.models import Document
       from apps.classification.engine import ClassificationEngine

       document = Document.objects.get(id=document_id)
       applied_rules = ClassificationEngine.classify_document(document)

       if applied_rules:
           logger.info(f"Applied {len(applied_rules)} rules to document {document_id}")
   ```

**15.3 Classification API**

```python
# apps/classification/views.py
from rest_framework import generics

class ClassificationRuleListCreateView(generics.ListCreateAPIView):
    """List and create classification rules"""
    queryset = ClassificationRule.objects.all()
    serializer_class = ClassificationRuleSerializer
    permission_classes = [IsAdminUser]

class ClassificationRuleDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, delete classification rule"""
    queryset = ClassificationRule.objects.all()
    serializer_class = ClassificationRuleSerializer
    permission_classes = [IsAdminUser]

class TestClassificationRuleView(APIView):
    """Test rule against existing documents"""

    def post(self, request, pk):
        rule = ClassificationRule.objects.get(pk=pk)

        # Get all documents
        from apps.documents.models import Document
        documents = Document.objects.all()[:100]  # Test on first 100

        # Check which would match
        matches = []
        from apps.classification.engine import ClassificationEngine
        for doc in documents:
            if ClassificationEngine.matches_conditions(doc, rule.conditions):
                matches.append({
                    'id': doc.id,
                    'title': doc.title,
                })

        return Response({
            'rule': ClassificationRuleSerializer(rule).data,
            'matching_documents': matches,
            'total_matches': len(matches),
        })

class ApplyClassificationManuallyView(APIView):
    """Manually trigger classification for document"""

    def post(self, request, pk):
        from apps.classification.engine import ClassificationEngine
        from apps.documents.models import Document

        document = Document.objects.get(pk=pk)
        applied_rules = ClassificationEngine.classify_document(document)

        return Response({
            'applied_rules': applied_rules,
            'document': DocumentSerializer(document).data,
        })
```

**Deliverables:**
- Rules-based auto-classification system
- Classification rule CRUD API
- Rule testing endpoint
- Manual classification trigger
- Auto-classification on upload
- Audit trail for classification actions

**Estimated Effort:** 4-5 days

---

#### Week 16: Search Performance Optimization & Integration

**Tasks:**

1. **Search Query Optimization**
   - Optimize Elasticsearch queries
   - Add query caching
   - Implement result pagination
   - Profile slow queries

2. **Index Optimization**
   - Tune index settings (shards, replicas)
   - Optimize field mappings
   - Implement index aliases for zero-downtime reindexing

3. **API Response Optimization**
   - Implement ETag caching
   - Add response compression
   - Optimize serializers (only return needed fields)

4. **Integration Testing**
   - Test search with 10,000+ documents
   - Test all filter combinations
   - Test faceted search performance
   - Load testing search endpoints

**Deliverables:**
- Optimized search performance (<1 second)
- Caching implemented
- Integration tests passing
- Load test results documented

**Estimated Effort:** 3-4 days

---

### PHASE 2 - BACKEND UAT TEST CASES

(Content similar to frontend Phase 2 UAT, but focused on API functionality)

**UAT-2.1: Text Extraction**
- [ ] PDF text extracted accurately
- [ ] Word document text extracted
- [ ] Excel data extracted
- [ ] Extraction task completes in <30s for standard docs
- [ ] Errors logged and handled gracefully

**UAT-2.2: OCR Functionality**
- [ ] Scanned documents detected correctly
- [ ] OCR extracts text with >85% confidence
- [ ] OCR confidence scores stored
- [ ] Low-quality scans flagged
- [ ] OCR completes in <2 min per page

**UAT-2.3: Search API**
- [ ] Full-text search returns correct results
- [ ] Fuzzy search finds misspelled terms
- [ ] Autocomplete returns relevant suggestions
- [ ] Search highlights keywords
- [ ] Boolean operators work correctly
- [ ] Empty query handled gracefully

**UAT-2.4: Advanced Filtering**
- [ ] Date range filter returns docs within range
- [ ] Document type filter works
- [ ] Department filter works
- [ ] Confidentiality filter works
- [ ] Multiple filters combine correctly (AND logic)
- [ ] Facet counts accurate

**UAT-2.5: Permission-Filtered Search**
- [ ] Search results filtered by user permissions
- [ ] User sees only accessible documents
- [ ] Facet counts reflect accessible docs only
- [ ] Admin sees all results (when appropriate)

**UAT-2.6: Auto-Classification**
- [ ] Rules match documents correctly
- [ ] Actions applied automatically on upload
- [ ] Rule priority respected
- [ ] Manual classification works
- [ ] Classification logged in audit trail

**UAT-2.7: Search Performance**
- [ ] Search responds in <1s (10,000 docs)
- [ ] Search responds in <2s (100,000 docs)
- [ ] Facet aggregation fast
- [ ] Concurrent searches don't degrade performance
- [ ] Index updates don't block searches

**Performance Testing:**
- [ ] Index 10,000 documents in <30 min
- [ ] OCR processes 100 scanned docs without memory issues
- [ ] Search index stays in sync with database

**Security Testing:**
- [ ] Search cannot bypass permissions
- [ ] Query injection prevented
- [ ] Sensitive data not exposed in snippets (unless authorized)

**Success Metrics:**
- ✅ Search accuracy >95%
- ✅ OCR accuracy >85%
- ✅ Search response time <1s
- ✅ Zero permission bypass incidents

**Exit Criteria:**
- [ ] All UAT test cases pass
- [ ] Search accuracy validated
- [ ] Performance benchmarks met
- [ ] Classification tested with real documents
- [ ] API documentation updated
- [ ] Stakeholder demo approved

**⚠️ GATE: Cannot proceed to Phase 3 without complete Phase 2 UAT approval**

---

## PHASE 3: SECURITY & COMPLIANCE (Weeks 17-22)

[Continue with Phases 3 and 4 in similar detail...]

Due to length constraints, I'll provide a summary structure for the remaining phases:

### Week 17: Role-Based Access Control (RBAC)
- Permission framework implementation
- Department-based access
- Folder-level permissions
- Permission API endpoints

### Week 18: Audit Trail & Logging
- Enhance audit log model
- Immutable logging implementation
- Audit API & reporting
- Compliance reports

### Week 19: Encryption Implementation
- MinIO server-side encryption
- Database field encryption (django-fernet-fields)
- TLS configuration
- Security headers

### Week 20: Retention Policies & Legal Hold
- Retention policy enforcement (Celery tasks)
- Legal hold placement/release
- Auto-deletion with grace period
- Retention API endpoints

### Week 21: Secure Sharing & Collaboration
- Share model and API
- Share link token generation
- Share permissions
- Share notifications

### Week 22: Multi-Factor Authentication (MFA)
- TOTP implementation (django-otp)
- MFA setup/disable endpoints
- Backup codes generation
- MFA enforcement for admins

---

## PHASE 4: SCALE & HARDENING (Weeks 23-28)

### Week 23: Performance Optimization
- Database query optimization
- API optimization (select_related, prefetch_related)
- Connection pooling (pgbouncer)
- Serializer optimization

### Week 24: Caching Implementation
- Redis cache setup
- View-level caching
- Model-level caching (cache_page)
- Cache invalidation strategies

### Week 25: Load Balancing & High Availability
- Docker containerization
- Kubernetes deployment manifests
- PostgreSQL replication
- MinIO distributed mode
- Elasticsearch cluster setup
- Prometheus + Grafana monitoring

### Week 26: Load Testing & Performance Tuning
- Locust/JMeter test scripts
- Load testing scenarios
- Performance profiling (Django Debug Toolbar, django-silk)
- Bottleneck identification and tuning

### Week 27: Security Hardening & Compliance
- Rate limiting (django-ratelimit)
- Input validation
- Secrets management (HashiCorp Vault)
- Database backups (automated)
- Penetration testing
- Security audit

### Week 28: Final UAT, Training & Deployment
- End-to-end testing
- API documentation finalization
- Deployment procedures
- Production environment setup
- Monitoring and alerting
- Handover documentation

---

**Document Version**: 1.0
**Last Updated**: 2025-11-16
**Primary Reference**: PROJECT_IMPLEMENTATION_PLAN.md
**Owner**: Backend Lead / Technical Lead
**Status**: Ready for Implementation
