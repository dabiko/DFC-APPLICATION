# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Digital Filing Cabinet (DFC)** - A secure, scalable, and compliant document management system designed for CCC PLC, a financial institution. The system enables efficient storage, retrieval, classification, and sharing of sensitive financial documents across departments (Engagements, Accounting, IT, Compliance, Risk, Audit) while ensuring regulatory compliance and data security.

### Purpose
The DFC serves as a digital transformation solution for managing vast volumes of sensitive and regulatory documents with core purposes:
- **Document Organization**: Systematically store financial records, client files, compliance documents
- **Regulatory Compliance**: Ensure adherence to financial regulations (KYC, AML, GDPR)
- **Data Security**: Protect confidential information with encryption, access controls, and secure authentication
- **Operational Efficiency**: Enable quick retrieval, sharing, and processing across departments
- **Disaster Recovery**: Safeguard critical data through automated backups
- **Paperless Transformation**: Reduce reliance on physical storage

## Technology Stack

### Backend
- **Framework**: Django 4.2+ (Python web framework)
- **Python Version**: 3.13.5 (3.13+ required)
- **API**: Django Rest Framework (DRF) for RESTful APIs
- **Database**: PostgreSQL (for metadata, user accounts, folder hierarchy, audit logs)
- **File Storage**: MinIO (S3-compatible object storage for elastic scalability within intranet)
- **Search Engine**: Elasticsearch/OpenSearch (for full-text search and advanced filtering)
- **Task Queue**: Celery with RabbitMQ/Redis (for async tasks like OCR, indexing, retention policies)
- **Authentication**: JWT (JSON Web Tokens) via djangorestframework-simplejwt
- **Caching**: Redis
- **Containerization**: Docker + Kubernetes
- **Load Balancing**: Nginx/HAProxy
- **Monitoring**: Prometheus + Grafana

### Frontend
- **Framework**: React with TypeScript (recommended)
- **Build Tool**: Vite or Webpack
- **State Management**: Zustand or Redux Toolkit
- **Styling**: Tailwind CSS or Material-UI (MUI)
- **Component Library**: Custom components with Storybook documentation
- **Icons**: Material Icons or Heroicons
- **Drag & Drop**: react-dropzone
- **File Upload**: uppy or fine-uploader
- **Form Handling**: React Hook Form
- **PDF Preview**: react-pdf or pdfjs-dist
- **API Client**: Axios
- **Testing**: Jest, React Testing Library, Cypress
- **Accessibility**: axe-core, WAVE tools

### Key Python Libraries
- `django-storages` - Integration with MinIO/S3-compatible storage
- `django-elasticsearch-dsl` - Elasticsearch integration
- `pytesseract` - OCR for scanned documents
- `pypdf2` / `python-docx` / `openpyxl` - Document text extraction
- `celery` - Asynchronous task processing
- `django-otp` - Multi-factor authentication
- `django-fernet-fields` - Field-level encryption
- `pdf2image` - Convert PDF to images for OCR

## Project Structure

### Backend Structure
```
dfc_backend/
├── manage.py                # Django's management script
├── config/                  # Project settings, URLs, WSGI
│   ├── settings.py         # Environment-specific settings (dev, staging, prod)
│   ├── urls.py
│   └── wsgi.py
├── apps/
│   ├── users/              # User accounts, profiles, auth, RBAC
│   │   ├── models.py       # CustomUser, Profile
│   │   ├── serializers.py
│   │   └── views.py        # Login, Logout, User/Role management API
│   │
│   ├── documents/          # Core app for files, folders, metadata
│   │   ├── models.py       # Folder, Document, Tag, Metadata, DocumentVersion
│   │   ├── serializers.py
│   │   ├── views.py        # File/Folder CRUD, upload API
│   │   └── signals.py      # Triggers audit logs, search indexing
│   │
│   ├── search/             # Elasticsearch indexing and queries
│   │   ├── documents.py    # Elasticsearch index structure
│   │   └── views.py        # Search API endpoint
│   │
│   ├── audit/              # Immutable audit trail
│   │   ├── models.py       # AuditLog model
│   │   └── serializers.py
│   │
│   └── workflows/          # Automation and retention policies
│       └── tasks.py        # Celery tasks (OCR, indexing, retention)
│
└── requirements.txt         # Python dependencies
```

### Frontend Structure
```
frontend/
├── src/
│   ├── components/         # Reusable UI components
│   ├── pages/              # Page-level components
│   ├── layouts/            # Layout components (3-panel)
│   ├── services/           # API service layer
│   ├── store/              # State management
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript type definitions
│   ├── assets/             # Images, icons, fonts
│   └── styles/             # Global styles
├── public/
└── tests/
```

## Development Phases (28-week roadmap)

### Phase 0 - Foundations (Weeks 1-4)
**Objectives**: Establish development environment and core UI/UX design system
- Week 1: Environment setup & configuration
- Week 2: Database schema design & migration system
- Week 3: UI/UX design system implementation
- Week 4: Authentication system & API foundation

**Key Deliverables**:
- Running Django development server
- PostgreSQL, MinIO, Elasticsearch operational
- Component library in Storybook
- JWT authentication working
- API documentation (OpenAPI/Swagger)

### Phase 1 - Ingestion & Storage (Weeks 5-10)
**Objectives**: Implement file upload and storage system
- Week 5: MinIO integration & storage layer
- Week 6: Folder hierarchy system
- Week 7: Metadata management system
- Week 8: Document versioning system
- Week 9: Drag-and-drop upload interface
- Week 10: Bulk operations & file management

**Key Deliverables**:
- Functional file upload to MinIO
- Complete folder management (CRUD operations)
- Metadata validation and enforcement
- Version control system
- Smart folders feature

### Phase 2 - Search & Classification (Weeks 11-16)
**Objectives**: Implement full-text search and automated classification
- Week 11: Elasticsearch integration
- Week 12: Text extraction pipeline
- Week 13: OCR implementation
- Week 14: Search API & advanced filtering
- Week 15: Automated classification system
- Week 16: Search UI & user experience

**Key Deliverables**:
- Full-text search with <1 second response time
- OCR for scanned documents
- Faceted search interface
- Automated categorization rules
- Permission-filtered search results

### Phase 3 - Security & Compliance (Weeks 17-22)
**Objectives**: Implement comprehensive RBAC, audit trail, and compliance features
- Week 17: Role-Based Access Control (RBAC)
- Week 18: Audit trail & logging
- Week 19: Encryption implementation
- Week 20: Retention policies & legal hold
- Week 21: Secure sharing & collaboration
- Week 22: Multi-Factor Authentication (MFA)

**Key Deliverables**:
- Complete RBAC system
- Immutable audit trail
- AES-256 encryption at rest, TLS 1.3 in transit
- Automated retention policies
- Secure document sharing with expiry
- TOTP-based MFA

### Phase 4 - Scale & Hardening (Weeks 23-28)
**Objectives**: Optimize performance and prepare for production
- Week 23: Performance optimization
- Week 24: Caching implementation
- Week 25: Load balancing & high availability
- Week 26: Load testing & performance tuning
- Week 27: Security hardening & compliance
- Week 28: Final UAT, training & deployment

**Key Deliverables**:
- Containerized application (Docker/Kubernetes)
- 70% cache hit rate
- HA configuration for all components
- Load testing validated (1000+ concurrent users)
- Penetration test completed
- Production deployment successful

## Core Domain Concepts

### Document Organization

#### Folder Hierarchy
- Unlimited nested folder structure with parent-child relationships
- Support for 10,000+ folders per tenant without performance degradation
- Dynamic folder path updates when folders are renamed or moved
- Drag-and-drop reorganization support
- Folder templates for recurring use cases

#### Standard Folder Patterns
```
Customer Records / [CustomerID] / Profile / Identification
Accounts and Transactions / [AccountNumber] / Statements / YYYY
Loans and Credit / [LoanID] / Application / IncomeProof
```

#### File Naming Convention
Format: `YYYY-MM-DD_CustomerID_DocType_ShortDesc_V{n}`

Example: `2025-10-20_123456_Passport_Scan_V1`

### Folder/Document Properties

Each folder/document shall include:
1. **Folder/Document Name**
2. **Parent Folder ID**
3. **Path** (full hierarchy path)
4. **Created By / Modified By**
5. **Date Created / Date Modified**
6. **Access Permissions**
7. **Optional Tags or Categories**
8. **Confidentiality Level** (Public, Internal, Confidential, Highly Confidential)
9. **Optional Retention Policy ID**
10. **Unique System-Generated Identifier (UUID)**

### Metadata Requirements (Mandatory for all documents)

1. **Title**
2. **Document Type** (controlled list: Invoice, Contract, Report, KYC Record, etc.)
3. **Identifier** (Customer ID, Contract Number, Invoice Number)
4. **Date** (YYYY-MM-DD format)
5. **Creator/Source**
6. **Department/Owner**
7. **Confidentiality Level** (Public, Internal, Confidential, Highly Confidential)
8. **Retention Period**
9. **Keywords/Tags**

### Confidentiality Classification

Visual color-coding system:
- **Public** → Gray (accessible to all within organization)
- **Internal** → Blue (authorized employees only)
- **Confidential** → Orange (specific departments/roles)
- **Highly Confidential** → Red (designated individuals only)

All documents must display visible confidentiality labels (banner, watermark, or icon).

## Security & Compliance

### Authentication & Authorization

#### RBAC (Role-Based Access Control)
- **Roles**: Viewer, Editor, Manager, Admin
- **Permissions**:
  - `view_document`, `edit_document`, `delete_document`
  - `download_document`, `share_document`
  - `manage_folder`, `view_audit_log`
- **Inheritance**: Permissions inherited from parent folders with override capability
- **Department-Based Access**: Default access to department folders

#### Multi-Factor Authentication (MFA)
- TOTP (Time-based One-Time Password) support
- QR code generation for authenticator apps
- Backup codes generation
- Mandatory MFA for admin users
- Optional MFA for sensitive operations

### Encryption
- **At Rest**: AES-256 encryption (MinIO server-side encryption)
- **In Transit**: TLS 1.3 for all API calls
- **Database**: Field-level encryption for sensitive metadata (django-fernet-fields)
- **Key Management**: Integration with KMS

### Audit Trail
- **Immutable Logging**: Append-only audit log
- **Captured Data**:
  - User ID, action type, resource type, resource ID
  - Timestamp (UTC), IP address, user agent
  - Outcome (success/failure), error message
  - Before/after values (for edits)
- **Compliance Reports**: Access reports, change history, user activity, retention compliance

### Retention Policies & Legal Hold

#### Retention Policies
- Automatic archival/deletion based on document type and retention period
- Notifications before deletion (configurable grace period)
- Policy enforcement prevents unauthorized deletion

#### Legal Hold
- Place documents on hold (prevents all deletion/modification)
- Case number tracking
- Authorized release only
- Complete audit trail of hold actions

### Key Security Requirements
- All folder/document operations logged in audit trail
- Permissions inherited from parent folders with override capability
- Legal hold prevents deletion regardless of retention policy
- Folder metadata encrypted during transmission and at rest
- Rate limiting on API endpoints
- WAF (Web Application Firewall) protection
- Input validation and sanitization (XSS, SQL injection prevention)

## Common Development Commands

### Database Operations
```bash
# Create and apply migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser for admin access
python manage.py createsuperuser

# Generate seed data for testing
python manage.py generate_seed_data
```

### Running Services
```bash
# Start Django development server
python manage.py runserver

# Start Celery worker for background tasks
celery -A config worker --loglevel=info

# Start Celery beat for scheduled tasks
celery -A config beat --loglevel=info

# Start Redis (caching)
redis-server

# Start MinIO
minio server /data

# Start Elasticsearch
elasticsearch
```

### Search Index Management
```bash
# Rebuild Elasticsearch indices
python manage.py search_index --rebuild

# Update search index for specific model
python manage.py search_index --populate --models documents.Document

# Check index health
python manage.py search_index --info
```

### Testing Commands
```bash
# Run all tests
python manage.py test

# Run with coverage
coverage run --source='.' manage.py test
coverage report

# Frontend tests
npm test
npm run test:e2e
```

## API Architecture

### RESTful Endpoints

#### Authentication
- `POST /api/v1/auth/register/` - User registration
- `POST /api/v1/auth/login/` - Login (returns JWT tokens)
- `POST /api/v1/auth/logout/` - Logout
- `POST /api/v1/auth/refresh/` - Refresh JWT token
- `POST /api/v1/auth/change-password/` - Change password
- `POST /api/v1/auth/mfa/enable/` - Enable MFA
- `POST /api/v1/auth/mfa/verify/` - Verify MFA code

#### Folders
- `GET /api/v1/folders/` - List folders
- `POST /api/v1/folders/` - Create folder
- `GET /api/v1/folders/{id}/` - Get folder details
- `PUT /api/v1/folders/{id}/` - Rename folder
- `DELETE /api/v1/folders/{id}/` - Delete folder
- `POST /api/v1/folders/{id}/move/` - Move folder
- `GET /api/v1/folders/{id}/permissions/` - Get folder permissions
- `POST /api/v1/folders/{id}/permissions/` - Set folder permissions

#### Documents
- `POST /api/v1/documents/upload/` - Upload document(s)
- `GET /api/v1/documents/` - List documents
- `GET /api/v1/documents/{id}/` - Get document details
- `PUT /api/v1/documents/{id}/metadata/` - Update metadata
- `GET /api/v1/documents/{id}/download/` - Download document
- `GET /api/v1/documents/{id}/preview/` - Preview document
- `POST /api/v1/documents/{id}/versions/` - Upload new version
- `GET /api/v1/documents/{id}/versions/` - List versions
- `POST /api/v1/documents/{id}/share/` - Share document
- `POST /api/v1/documents/bulk-move/` - Bulk move
- `POST /api/v1/documents/bulk-delete/` - Bulk delete

#### Search
- `GET /api/v1/search/` - Search documents
  - Query parameters: `q`, `document_type`, `date_from`, `date_to`, `confidentiality`, `department`, `tags`, `folder_id`

#### Audit
- `GET /api/v1/audit/logs/` - Get audit logs
- `GET /api/v1/audit/reports/` - Generate compliance reports

### API Standards
- **Authentication**: JWT tokens in Authorization header: `Authorization: Bearer <token>`
- **Response Format**: All endpoints return JSON
- **Error Handling**: Consistent error format with HTTP status codes
- **Pagination**: Cursor-based or offset pagination for large result sets
- **Versioning**: API versioning via URL path (`/api/v1/`)
- **Permission Filtering**: Search results filtered by user permissions
- **Bulk Operations**: Support for moving, copying, deleting multiple documents

## Performance Requirements

- **Folder Scalability**: Support 10,000+ folders per tenant without degradation
- **Search Performance**: Search queries must respond in <1 second
- **Concurrent Access**: Parallel access from multiple users without data corruption
- **Upload Performance**: Handle files >500MB with resumable upload
- **API Response Time**: <100ms for standard operations
- **Cache Hit Rate**: ≥70%
- **Concurrent Users**: Support 1000+ concurrent users
- **High Availability**: 99.9% uptime SLA

## File Processing Workflow

### Upload Workflow
1. User uploads document via drag-and-drop or file picker
2. Frontend validates file type and size (client-side)
3. File streamed to backend API (chunked upload for large files)
4. Django triggers Celery task for background processing
5. File saved to MinIO storage via django-storages
6. Checksum (SHA-256) calculated and verified
7. Audit log entry created for upload action

### Text Extraction & Indexing Workflow
1. Celery task extracts text from document:
   - PDF: `pypdf2`
   - Word: `python-docx`
   - Excel: `openpyxl`
   - Scanned documents: `pytesseract` (OCR)
2. Extracted text + metadata sent to Elasticsearch
3. Search index updated
4. Automated categorization rules applied
5. Document marked as "indexed" in database

### Retention Policy Workflow
1. Celery beat triggers daily retention check
2. Documents nearing expiration identified
3. Notifications sent to document owners
4. After grace period, documents soft-deleted
5. Legal hold prevents deletion if applied
6. Final deletion after retention period + grace period

## UI/UX Specifications

### Three-Panel Layout (Desktop)

#### Left Panel - Navigation (240-280px, collapsible)
- Folder tree view (expandable/collapsible)
- Smart folders (dynamic query results)
- Favorites section
- Quick filters (Recent, Shared, Trash)
- Locked folder indicators

#### Center Panel - Content (flexible width)
- Toolbar with Upload, New Folder, Search, View Toggle
- Grid view (thumbnails) or List view (columns)
- Sorting options (Name, Type, Date, Size, Relevance)
- Bulk selection with checkboxes
- Pagination or infinite scroll
- Confidentiality badges on all documents

#### Right Panel - Details (320-360px, collapsible)
- Document metadata display
- Tags with color-coded chips
- Action buttons (Preview, Download, Share, Delete)
- Activity log / version history
- Permission settings

### Responsive Design
- **Mobile** (<640px): Stacked panels, navigation drawer
- **Tablet** (640-1024px): 2-panel layout
- **Desktop** (>1024px): Full 3-panel layout

### User Actions (≤3 clicks for primary operations)
- Upload, Search, Share, Download, Delete
- Create Folder, Rename, Move
- Edit Metadata, Apply Tags
- Confidentiality labels visible on all documents

### Accessibility Standards
- **WCAG 2.1 AA Compliance**
- Keyboard navigation for all features
- Screen reader compatibility
- Color contrast ratios ≥4.5:1 (normal text), ≥3:1 (large text)
- Focus indicators visible
- Keyboard shortcuts:
  - `Ctrl+K` / `Cmd+K` → Search
  - `Ctrl+U` → Upload
  - `Escape` → Close modal/cancel
  - `Enter` → Confirm/Submit
  - Arrow keys → Navigate lists/trees

## Important Implementation Notes

### Architecture Principles
- **Separation of Concerns**: Metadata in PostgreSQL, files in MinIO, search in Elasticsearch
- **Async Processing**: Use Celery for OCR, indexing, and long-running tasks
- **Stateless API**: JWT tokens for authentication, no server-side sessions
- **Event-Driven**: Use Django signals for triggering audit logs and indexing

### Best Practices
- **Version Control**: Maintain complete revision history with restore capability
- **Smart Folders**: Dynamic results based on saved search criteria
- **Folder Templates**: Predefined structures (Project Folders, Employee Files)
- **Automated Categorization**: Rules-based classification
- **Breadcrumb Navigation**: Display full folder hierarchy paths
- **Drag-and-drop**: Support for reorganization in UI
- **Bulk Operations**: Enable moving/copying/deleting multiple items
- **Confirmation Prompts**: Before destructive actions (delete, move)
- **Progressive Enhancement**: Core functionality works without JavaScript

### Security Best Practices
- Never store sensitive data in client-side code
- Validate all user inputs (server-side)
- Sanitize data before display (XSS prevention)
- Use parameterized queries (SQL injection prevention)
- Implement rate limiting on API endpoints
- Enable CORS only for trusted origins
- Use Content Security Policy (CSP) headers
- Remove debug mode in production
- Rotate credentials regularly
- Use secrets management (HashiCorp Vault, AWS Secrets Manager)

### Performance Optimization
- **Database**: Use `select_related()` and `prefetch_related()` for related objects
- **Caching**: Cache folder trees, user permissions, frequently accessed metadata
- **Frontend**: Code splitting, lazy loading, virtual scrolling for long lists
- **API**: Response compression (gzip), conditional requests (ETag)
- **Storage**: Direct MinIO signed URLs (bypass Django for downloads)
- **Search**: Cache search results (5-minute TTL)

## Testing Considerations

### Backend Testing
- Test RBAC permissions thoroughly (users should only access authorized documents)
- Verify audit trail captures all operations accurately
- Test concurrent folder operations for data integrity
- Performance test with 10,000+ folders
- Security test encryption and authentication mechanisms
- Verify retention policies prevent unauthorized deletion
- Test Celery task execution (OCR, indexing)
- Validate metadata enforcement and validation

### Frontend Testing
- Unit tests for all components (Jest + React Testing Library)
- E2E tests for critical user flows (Cypress)
- Accessibility testing (axe-core, manual screen reader testing)
- Cross-browser testing (Chrome, Firefox, Edge, Safari)
- Mobile/tablet testing (iOS, Android)
- Performance testing (Lighthouse audits)
- Visual regression testing

### UAT Test Cases
Each phase has mandatory UAT gates with specific test cases. No phase advancement without complete UAT sign-off.

### Load Testing
- 100 concurrent users: response time <2 seconds
- 500 concurrent users: response time <3 seconds
- 1000 concurrent users: system remains stable
- Sustained load (1 hour): no degradation

## Deployment & Operations

### Containerization
```dockerfile
# Django application containerized with Docker
# Frontend built as static assets served by Nginx
# All services orchestrated with Kubernetes
```

### Monitoring & Alerting
- **APM**: Application Performance Monitoring (New Relic, DataDog)
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Metrics**: Prometheus + Grafana
- **Error Tracking**: Sentry
- **Uptime Monitoring**: PingdomAlert rules for CPU, memory, disk usage, response time

### Backup & Disaster Recovery
- **Database**: Daily automated backups (PostgreSQL)
- **Files**: MinIO backup strategy with versioning
- **Elasticsearch**: Snapshot configuration
- **RTO** (Recovery Time Objective): <4 hours
- **RPO** (Recovery Point Objective): <24 hours
- Regular restoration drills

### CI/CD Pipeline
- Git workflow: main, develop, feature/*, hotfix/*
- Automated testing on pull requests
- Code review required (2 approvals)
- Automated deployment to staging
- Manual promotion to production
- Rollback plan ready

## Success Criteria

### Technical Metrics
- ✅ 99.9% uptime
- ✅ <1 second search response time
- ✅ Support 10,000+ folders per tenant
- ✅ Handle 1000+ concurrent users
- ✅ Zero critical security vulnerabilities
- ✅ 100% audit coverage
- ✅ Code coverage >80%
- ✅ Lighthouse score >90

### Business Metrics
- ✅ User adoption >90% within 3 months
- ✅ User satisfaction score >85%
- ✅ Reduced document retrieval time by 70%
- ✅ Zero compliance violations
- ✅ All primary actions achievable in ≤3 clicks

### Quality Metrics
- ✅ Zero critical bugs in production
- ✅ All UAT test cases passed
- ✅ Documentation complete and current
- ✅ Security audit passed
- ✅ Accessibility WCAG 2.1 AA compliant

## Support & Maintenance

### Continuous Activities

#### Weekly
- Monitor error tracking (Sentry)
- Review user feedback
- Performance monitoring
- Bug fixes
- Security patches

#### Monthly
- Dependency updates (npm audit, pip audit)
- Lighthouse audits
- Accessibility review
- Browser compatibility testing

#### Quarterly
- Disaster recovery testing
- Penetration testing
- Capacity planning review
- User satisfaction surveys
- Major dependency upgrades

#### Annually
- Security certification renewal
- Compliance recertification
- Architecture review
- Technology stack evaluation

## Documentation

- **Technical Documentation**: Architecture, API docs, database schema
- **User Documentation**: User guides, training materials, FAQ
- **Operations Documentation**: Deployment guides, runbooks, troubleshooting
- **API Documentation**: OpenAPI/Swagger specification
- **Component Documentation**: Storybook for UI components

---

**Document Version**: 2.0
**Last Updated**: 2025-11-16
**Authors**: Cedric Mbah, Njeck Clinton
**Status**: Production-Ready Implementation Guide
