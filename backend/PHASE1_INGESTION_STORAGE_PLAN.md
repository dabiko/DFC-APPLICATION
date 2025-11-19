# Phase 1: Ingestion & Storage Implementation Plan

**Duration**: Weeks 5-10 (6 weeks)
**Status**: 🚧 IN PROGRESS
**Started**: November 19, 2025

---

## Overview

Phase 1 focuses on implementing the core document upload, storage, and management system for the Digital Filing Cabinet (DFC). This phase builds on the completed multi-tenant infrastructure and delivers the fundamental file handling capabilities.

### Objectives

1. **Robust File Storage**: Integrate MinIO for scalable object storage
2. **Advanced Folder Management**: Enhance folder hierarchy with move/copy/template features
3. **Metadata Enforcement**: Implement mandatory metadata validation
4. **Version Control**: Track document versions with restore capability
5. **User-Friendly Upload**: Drag-and-drop interface with progress tracking
6. **Bulk Operations**: Efficient multi-file management

---

## Week 5: MinIO Integration & Storage Layer

### Goals
- Set up MinIO server (S3-compatible object storage)
- Integrate django-storages for seamless file handling
- Implement secure file upload/download with signed URLs
- Configure multi-tenant bucket isolation

### Tasks

#### 5.1 MinIO Setup & Configuration
- [ ] Install and configure MinIO server
- [ ] Create Docker Compose configuration for MinIO
- [ ] Set up access keys and secret keys
- [ ] Configure bucket policies for security
- [ ] Test MinIO connectivity

#### 5.2 Django-Storages Integration
- [ ] Install `django-storages[s3]` and `boto3`
- [ ] Configure MinIO as Django storage backend
- [ ] Update `settings.py` with MinIO configuration
- [ ] Implement organization-based bucket naming (or prefixing)
- [ ] Test file upload to MinIO

#### 5.3 Storage Service Layer
- [ ] Create `apps/storage/` app
- [ ] Implement `StorageService` class for file operations
- [ ] Add methods: `upload_file()`, `download_file()`, `delete_file()`, `generate_signed_url()`
- [ ] Implement file checksum validation (SHA-256)
- [ ] Add file type validation (MIME type checking)

#### 5.4 Document Model Updates
- [ ] Update Document model with MinIO-specific fields
- [ ] Add `minio_bucket`, `minio_object_key` fields
- [ ] Add `file_checksum` (SHA-256) field
- [ ] Add `mime_type` field
- [ ] Create migration

### Deliverables
- ✅ MinIO server running and accessible
- ✅ Django connected to MinIO
- ✅ File upload/download working
- ✅ Multi-tenant bucket isolation
- ✅ Checksum validation implemented

---

## Week 6: Folder Hierarchy Enhancements

### Goals
- Implement advanced folder operations (move, copy, rename)
- Add folder templates for common structures
- Enhance folder permissions inheritance
- Implement breadcrumb navigation support

### Tasks

#### 6.1 Folder Operations
- [ ] Implement `move_folder()` with cascade updates
- [ ] Implement `copy_folder()` with recursive copying
- [ ] Implement `rename_folder()` with path updates
- [ ] Add validation to prevent circular references
- [ ] Update folder `path` field automatically on hierarchy changes

#### 6.2 Folder Templates
- [ ] Create `FolderTemplate` model
- [ ] Implement template application logic
- [ ] Create default templates (Customer Records, Loan Files, etc.)
- [ ] Add API endpoint for template creation/application
- [ ] Test template instantiation

#### 6.3 Folder Permissions
- [ ] Create `FolderPermission` model (user/role-based)
- [ ] Implement permission inheritance from parent folders
- [ ] Add permission override capability
- [ ] Create permission checking middleware
- [ ] Add bulk permission update

#### 6.4 Folder API Enhancements
- [ ] Add `GET /api/v1/folders/tree/` - Hierarchical folder tree
- [ ] Add `POST /api/v1/folders/{id}/move/` - Move folder
- [ ] Add `POST /api/v1/folders/{id}/copy/` - Copy folder
- [ ] Add `GET /api/v1/folders/{id}/breadcrumbs/` - Breadcrumb path
- [ ] Add `POST /api/v1/folders/from-template/` - Create from template

### Deliverables
- ✅ Folder move/copy/rename working
- ✅ Folder templates functional
- ✅ Permission inheritance implemented
- ✅ Enhanced folder API endpoints

---

## Week 7: Metadata Management System

### Goals
- Enforce mandatory metadata on all documents
- Implement controlled vocabularies for document types
- Add custom metadata fields support
- Create metadata validation rules

### Tasks

#### 7.1 Metadata Models
- [ ] Create `DocumentType` model (Invoice, Contract, Report, etc.)
- [ ] Create `MetadataField` model for custom fields
- [ ] Create `MetadataValue` model for document-specific values
- [ ] Add confidentiality classification (Public/Internal/Confidential/Highly Confidential)
- [ ] Create migrations

#### 7.2 Metadata Validation
- [ ] Implement metadata validation rules
- [ ] Enforce mandatory fields (Title, Document Type, Date, Creator, Department, Confidentiality)
- [ ] Add format validation (date format, identifier patterns)
- [ ] Create metadata completeness checker
- [ ] Add validation on upload and update

#### 7.3 Metadata API
- [ ] Update Document serializer with metadata fields
- [ ] Add `PUT /api/v1/documents/{id}/metadata/` - Update metadata
- [ ] Add `GET /api/v1/metadata/types/` - List document types
- [ ] Add `GET /api/v1/metadata/fields/` - List custom fields
- [ ] Add metadata search filters

#### 7.4 Metadata Indexing
- [ ] Update Elasticsearch mapping with metadata fields
- [ ] Index metadata for search
- [ ] Implement faceted search by metadata
- [ ] Add metadata autocomplete suggestions

### Deliverables
- ✅ Mandatory metadata enforced
- ✅ Document type controlled list
- ✅ Custom metadata fields
- ✅ Metadata validation working
- ✅ Metadata search enabled

---

## Week 8: Document Versioning System

### Goals
- Track complete version history for all documents
- Enable version comparison
- Implement version restore capability
- Maintain audit trail for versions

### Tasks

#### 8.1 Version Model
- [ ] Update `DocumentVersion` model
- [ ] Add version number auto-increment
- [ ] Add `is_current` flag
- [ ] Add `change_summary` field
- [ ] Add version-specific metadata
- [ ] Create migration

#### 8.2 Versioning Logic
- [ ] Implement `create_new_version()` method
- [ ] Auto-increment version numbers (V1, V2, V3...)
- [ ] Store previous version before update
- [ ] Update file naming convention with version suffix
- [ ] Maintain version creation audit log

#### 8.3 Version API
- [ ] Add `POST /api/v1/documents/{id}/versions/` - Upload new version
- [ ] Add `GET /api/v1/documents/{id}/versions/` - List all versions
- [ ] Add `GET /api/v1/documents/{id}/versions/{version_id}/` - Get specific version
- [ ] Add `POST /api/v1/documents/{id}/versions/{version_id}/restore/` - Restore version
- [ ] Add `GET /api/v1/documents/{id}/versions/compare/` - Compare versions

#### 8.4 Version Storage
- [ ] Store all versions in MinIO (separate objects)
- [ ] Implement version object key naming
- [ ] Add version cleanup policy (optional)
- [ ] Calculate storage per document (all versions)

### Deliverables
- ✅ Complete version history tracking
- ✅ Version restore capability
- ✅ Version comparison API
- ✅ All versions stored in MinIO
- ✅ Audit trail for versions

---

## Week 9: Drag-and-Drop Upload Interface (Backend Support)

### Goals
- Support chunked file uploads for large files (>500MB)
- Implement resumable uploads
- Add upload progress tracking
- Support multi-file upload

### Tasks

#### 9.1 Chunked Upload Backend
- [ ] Implement chunked upload API
- [ ] Add `POST /api/v1/documents/upload/init/` - Initialize upload
- [ ] Add `POST /api/v1/documents/upload/chunk/` - Upload chunk
- [ ] Add `POST /api/v1/documents/upload/complete/` - Finalize upload
- [ ] Add `POST /api/v1/documents/upload/abort/` - Cancel upload

#### 9.2 Upload Session Management
- [ ] Create `UploadSession` model (track upload state)
- [ ] Store uploaded chunks temporarily
- [ ] Validate chunk order and completeness
- [ ] Assemble chunks on completion
- [ ] Clean up failed/abandoned uploads

#### 9.3 Multi-File Upload
- [ ] Support batch upload endpoint
- [ ] Add `POST /api/v1/documents/upload/batch/` - Upload multiple files
- [ ] Return batch upload status
- [ ] Handle partial failures gracefully

#### 9.4 Upload Validation
- [ ] File size limits (max 2GB per file)
- [ ] File type whitelist/blacklist
- [ ] Virus scanning integration (ClamAV - optional)
- [ ] Storage quota enforcement per organization

### Deliverables
- ✅ Chunked upload working for large files
- ✅ Resumable upload support
- ✅ Multi-file batch upload
- ✅ Upload validation and quota enforcement

---

## Week 10: Bulk Operations & File Management

### Goals
- Implement bulk move/copy/delete operations
- Add zip download for multiple files
- Implement smart folders (saved searches)
- Add file preview generation

### Tasks

#### 10.1 Bulk Operations
- [ ] Add `POST /api/v1/documents/bulk-move/` - Move multiple documents
- [ ] Add `POST /api/v1/documents/bulk-copy/` - Copy multiple documents
- [ ] Add `POST /api/v1/documents/bulk-delete/` - Delete multiple documents
- [ ] Add `PUT /api/v1/documents/bulk-metadata/` - Update metadata in bulk
- [ ] Add transaction support for atomic operations

#### 10.2 Zip Download
- [ ] Implement zip archive creation for multiple files
- [ ] Add `POST /api/v1/documents/download/archive/` - Create zip
- [ ] Stream large zip files
- [ ] Include folder structure in zip
- [ ] Add download progress tracking

#### 10.3 Smart Folders
- [ ] Create `SmartFolder` model (saved search criteria)
- [ ] Implement dynamic query evaluation
- [ ] Add smart folder CRUD API
- [ ] Auto-refresh smart folder contents
- [ ] Support complex filter combinations

#### 10.4 File Previews
- [ ] Generate PDF thumbnails (pdf2image)
- [ ] Generate image thumbnails (Pillow)
- [ ] Store thumbnails in MinIO
- [ ] Add `GET /api/v1/documents/{id}/preview/` endpoint
- [ ] Support preview for Office documents (optional)

### Deliverables
- ✅ Bulk operations working
- ✅ Zip download functional
- ✅ Smart folders implemented
- ✅ File preview generation
- ✅ Complete file management system

---

## Technical Architecture

### Storage Structure

```
MinIO Buckets:
├── dfc-org-{organization_id}/
│   ├── documents/
│   │   ├── {year}/
│   │   │   ├── {month}/
│   │   │   │   ├── {document_id}_v{version}.{ext}
│   │   │   │   └── {document_id}_v{version}_checksum.txt
│   ├── thumbnails/
│   │   ├── {document_id}_thumb.jpg
│   └── temp/
│       ├── upload_{session_id}_chunk_{n}
```

### API Endpoint Summary (New in Phase 1)

#### Storage & Upload (5 endpoints)
1. `POST /api/v1/documents/upload/` - Simple upload
2. `POST /api/v1/documents/upload/init/` - Initialize chunked upload
3. `POST /api/v1/documents/upload/chunk/` - Upload chunk
4. `POST /api/v1/documents/upload/complete/` - Complete upload
5. `POST /api/v1/documents/upload/batch/` - Batch upload

#### Folder Operations (5 endpoints)
6. `GET /api/v1/folders/tree/` - Folder tree
7. `POST /api/v1/folders/{id}/move/` - Move folder
8. `POST /api/v1/folders/{id}/copy/` - Copy folder
9. `GET /api/v1/folders/{id}/breadcrumbs/` - Breadcrumbs
10. `POST /api/v1/folders/from-template/` - Create from template

#### Metadata (3 endpoints)
11. `PUT /api/v1/documents/{id}/metadata/` - Update metadata
12. `GET /api/v1/metadata/types/` - Document types
13. `GET /api/v1/metadata/fields/` - Custom fields

#### Versioning (5 endpoints)
14. `POST /api/v1/documents/{id}/versions/` - New version
15. `GET /api/v1/documents/{id}/versions/` - List versions
16. `GET /api/v1/documents/{id}/versions/{version_id}/` - Get version
17. `POST /api/v1/documents/{id}/versions/{version_id}/restore/` - Restore
18. `GET /api/v1/documents/{id}/versions/compare/` - Compare versions

#### Bulk Operations (5 endpoints)
19. `POST /api/v1/documents/bulk-move/` - Bulk move
20. `POST /api/v1/documents/bulk-copy/` - Bulk copy
21. `POST /api/v1/documents/bulk-delete/` - Bulk delete
22. `PUT /api/v1/documents/bulk-metadata/` - Bulk metadata update
23. `POST /api/v1/documents/download/archive/` - Zip download

#### Smart Folders & Previews (3 endpoints)
24. `GET /api/v1/folders/smart/` - List smart folders
25. `POST /api/v1/folders/smart/` - Create smart folder
26. `GET /api/v1/documents/{id}/preview/` - File preview

**Total New Endpoints**: 26

---

## Models Summary

### New Models
1. **FolderTemplate** - Predefined folder structures
2. **FolderPermission** - Granular folder access control
3. **DocumentType** - Controlled document type vocabulary
4. **MetadataField** - Custom metadata field definitions
5. **MetadataValue** - Document-specific metadata values
6. **UploadSession** - Track chunked upload state
7. **SmartFolder** - Saved search criteria

### Updated Models
1. **Document** - Add MinIO fields, checksum, MIME type
2. **DocumentVersion** - Enhanced version tracking
3. **Folder** - Add template support, permission support

---

## Testing Strategy

### Unit Tests (per week)
- Week 5: MinIO integration tests (10 tests)
- Week 6: Folder operations tests (12 tests)
- Week 7: Metadata validation tests (8 tests)
- Week 8: Versioning tests (10 tests)
- Week 9: Upload tests (15 tests)
- Week 10: Bulk operations tests (12 tests)

**Total Tests**: ~67 new tests

### Integration Tests
- End-to-end upload flow
- Multi-tenant storage isolation
- Version restore workflow
- Bulk operation transactions

### Performance Tests
- Upload 500MB file (chunked)
- Bulk move 1000 documents
- Generate 100 thumbnails
- Folder tree with 10,000 folders

---

## Security Considerations

### File Upload Security
- ✅ File type validation (whitelist approach)
- ✅ Size limits enforced
- ✅ Virus scanning (optional ClamAV integration)
- ✅ Malicious filename sanitization
- ✅ MIME type verification

### Access Control
- ✅ Folder permission inheritance
- ✅ Document-level access checks
- ✅ Signed URLs for downloads (time-limited)
- ✅ Organization-level storage isolation
- ✅ Audit all file operations

### Data Integrity
- ✅ SHA-256 checksum validation
- ✅ Transaction support for bulk ops
- ✅ Version immutability
- ✅ MinIO versioning enabled
- ✅ Backup strategy for MinIO buckets

---

## Dependencies

### Python Packages (to install)
```
django-storages[s3]==1.14.2
boto3==1.34.0
pdf2image==1.16.3
Pillow==10.2.0
python-magic==0.4.27  # MIME type detection
```

### System Dependencies
- MinIO server (Docker or standalone)
- Poppler (for pdf2image)
- ClamAV (optional, for virus scanning)

---

## Success Criteria

### Functional Requirements
- ✅ Upload files of any size (up to 2GB)
- ✅ Support all common file types (PDF, DOCX, XLSX, images)
- ✅ Folder hierarchy supports unlimited nesting
- ✅ All uploads enforce mandatory metadata
- ✅ Complete version history maintained
- ✅ Bulk operations handle 1000+ files
- ✅ Thumbnails generated for visual files

### Performance Requirements
- ✅ Upload 100MB file in <30 seconds
- ✅ Download via signed URL (no Django bottleneck)
- ✅ Folder tree with 10,000 folders loads in <2 seconds
- ✅ Bulk move 100 documents in <5 seconds
- ✅ Generate thumbnail in <3 seconds

### Security Requirements
- ✅ Zero unauthorized cross-organization access
- ✅ All file operations audited
- ✅ Malicious files rejected
- ✅ Storage quota enforced
- ✅ Signed URLs expire in 1 hour

---

## Risks & Mitigation

### Risk 1: MinIO Configuration Complexity
**Mitigation**: Use Docker Compose for consistent setup, comprehensive documentation

### Risk 2: Large File Upload Performance
**Mitigation**: Implement chunked uploads, use direct S3 uploads via presigned URLs

### Risk 3: Storage Costs
**Mitigation**: Implement retention policies, version cleanup, storage quota enforcement

### Risk 4: File Type Security
**Mitigation**: Strict whitelist, MIME validation, optional virus scanning

---

## Timeline

| Week | Focus Area | Key Deliverable |
|------|------------|-----------------|
| **Week 5** | MinIO Integration | File upload/download working |
| **Week 6** | Folder Enhancements | Move/copy/templates functional |
| **Week 7** | Metadata System | Mandatory metadata enforced |
| **Week 8** | Versioning | Version tracking complete |
| **Week 9** | Upload Interface | Chunked upload working |
| **Week 10** | Bulk Operations | Complete file management |

---

## Next Steps After Phase 1

Upon completion of Phase 1, proceed to:

**Phase 2: Search & Classification (Weeks 11-16)**
- Elasticsearch full-text search
- OCR for scanned documents
- Automated classification
- Advanced filtering

---

**Document Version**: 1.0
**Created**: November 19, 2025
**Status**: 🚧 Implementation Starting
**Estimated Completion**: Week 10 (January 2026)
