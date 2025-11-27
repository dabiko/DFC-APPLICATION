# My Documents - Enterprise Implementation Proposal

## Digital Filing Cabinet (DFC)
### Personal Workspace & Smart Organization Feature

---

**Document Version:** 1.0
**Date:** November 2025
**Status:** Proposal
**Author:** Development Team

---

## Executive Summary

This proposal outlines the enterprise-grade implementation of the "My Documents" personal workspace feature for the Digital Filing Cabinet (DFC) application. Based on extensive research of leading enterprise document management systems (SharePoint/OneDrive, Google Drive, Box, M-Files, Dropbox Business, OpenText), we present a comprehensive solution that combines industry best practices with innovative features tailored to CCC PLC's financial document management needs.

The "My Documents" feature will serve as the user's personal command center, providing:
- Unified view of owned documents and folders
- Intelligent organization with smart folders and collections
- Activity tracking and productivity insights
- Seamless integration with existing sharing workflows
- Enterprise-grade compliance and security

---

## Table of Contents

1. [Industry Analysis](#1-industry-analysis)
2. [Proposed Architecture](#2-proposed-architecture)
3. [Feature Specifications](#3-feature-specifications)
4. [User Experience Design](#4-user-experience-design)
5. [Technical Implementation](#5-technical-implementation)
6. [Security & Compliance](#6-security--compliance)
7. [Implementation Roadmap](#7-implementation-roadmap)
8. [Success Metrics](#8-success-metrics)

---

## 1. Industry Analysis

### 1.1 Competitive Landscape

| Platform | Personal Space Approach | Key Differentiator |
|----------|------------------------|-------------------|
| **SharePoint/OneDrive** | Separate OneDrive for personal, SharePoint for team | Desktop sync, Office integration |
| **Google Drive** | "My Drive" unified with Shared Drives | AI suggestions, Workspaces |
| **Box** | Collections for personalization | 7-level permissions, AI metadata |
| **M-Files** | Metadata-driven (folderless) | Context-based organization |
| **Dropbox Business** | Personal + Team folders | AI-powered Dash workspace |
| **OpenText** | Workspace templates | Enterprise workflow automation |

### 1.2 Common Patterns Identified

1. **Clear Ownership Distinction**: Users immediately know what they own vs. what's shared
2. **Quick Access/Shortcuts**: Pin important items without duplication
3. **Activity Tracking**: Real-time visibility into document interactions
4. **Smart Organization**: Saved searches, collections, metadata-driven views
5. **Intelligent Suggestions**: ML-powered recommendations based on work patterns
6. **Unified Search**: Search across owned and shared content seamlessly

### 1.3 DFC Competitive Advantage

Based on our analysis, DFC can differentiate through:

- **Financial Services Focus**: Purpose-built for KYC, AML, compliance workflows
- **Unified Experience**: Personal + Shared in cohesive interface (vs. separate apps)
- **4-Level Permission Model**: VIEW, COMMENT, EDIT, FULL (more granular than competitors)
- **Compliance-First Design**: Acknowledgement workflows, watermarking, legal hold
- **Department-Based Organization**: Align with CCC PLC's organizational structure

---

## 2. Proposed Architecture

### 2.1 My Documents Page Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MY DOCUMENTS                                  │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   Uploads   │  │   Folders   │  │   Drafts    │  │  Activity   │ │
│  │     127     │  │      23     │  │      8      │  │   Today: 5  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│  QUICK ACCESS (Pinned)                                    [Manage]  │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                         │
│  │ 📄 │ │ 📁 │ │ 📄 │ │ 📄 │ │ 📁 │ │ + │                          │
│  │Q4  │ │KYC │ │AML │ │Bud │ │Aud │ │Add│                          │
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘                         │
├─────────────────────────────────────────────────────────────────────┤
│  [All] [Documents] [Folders] [Drafts] [Pending Review]              │
│                                                                      │
│  🔍 Search my documents...          [Filter ▼] [Sort ▼] [≡] [⊞]    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ▼ TODAY (3)                                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ 📄 Q4_Budget_Final.xlsx       Modified 2h ago    Confidential│   │
│  │ 📄 Client_KYC_Report.pdf      Created 4h ago     Internal    │   │
│  │ 📁 November Audits            3 items added      Internal    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ▼ THIS WEEK (12)                                                   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ 📄 AML_Compliance_Check.docx  Modified Mon       H.Confid.   │   │
│  │ ...                                                          │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ▶ THIS MONTH (34)                                                  │
│  ▶ EARLIER (78)                                                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Information Architecture

```
My Documents
├── Quick Access (Pinned Items)
│   ├── Documents (pinned)
│   ├── Folders (pinned)
│   └── Shared Items (shortcuts)
│
├── My Uploads (Documents I created/uploaded)
│   ├── Today
│   ├── This Week
│   ├── This Month
│   └── Earlier
│
├── My Folders (Folders I own)
│   ├── Root folders
│   └── Nested structure
│
├── Drafts (Work in progress)
│   ├── Auto-saved drafts
│   └── Incomplete uploads
│
├── Pending Review (Awaiting my action)
│   ├── Documents shared for my review
│   ├── Access requests to approve
│   └── Expiring shares to renew
│
└── Smart Folders (Saved Searches)
    ├── User-created smart folders
    └── System suggestions
```

---

## 3. Feature Specifications

### 3.1 Core Features

#### 3.1.1 Dashboard Statistics Cards

| Card | Description | Data Source |
|------|-------------|-------------|
| **Total Uploads** | Documents created/uploaded by user | `Document.created_by = user` |
| **My Folders** | Folders owned by user | `Folder.created_by = user` |
| **Drafts** | Documents in draft state | `Document.status = DRAFT` |
| **Today's Activity** | Actions performed today | `AuditLog.user = user, date = today` |

#### 3.1.2 Quick Access Section

**Purpose**: Provide instant access to frequently used items (max 20 items)

**Features**:
- Pin/unpin documents and folders
- Pin shared items as shortcuts (no duplication)
- Drag-to-reorder capability
- Visual distinction: owned (solid) vs. shared (badge)
- One-click access to pinned items
- "Manage" button opens full pinned items management

**Implementation**:
```python
class QuickAccessItem(models.Model):
    user = models.ForeignKey(User)
    content_type = models.CharField()  # DOCUMENT, FOLDER, SHARED_ITEM
    object_id = models.UUIDField()
    display_order = models.IntegerField()
    pinned_at = models.DateTimeField()

    class Meta:
        unique_together = ['user', 'content_type', 'object_id']
        ordering = ['display_order']
```

#### 3.1.3 Document States & Lifecycle

| State | Description | Allowed Actions |
|-------|-------------|-----------------|
| **DRAFT** | Work in progress | Edit, Delete, Submit for Review |
| **IN_REVIEW** | Pending approval | View, Comment, Approve/Reject |
| **APPROVED** | Ready for use | View, Share, Archive |
| **PUBLISHED** | Official version | View, Share, Create New Version |
| **ARCHIVED** | No longer active | View, Restore, Delete |

**State Workflow**:
```
DRAFT → IN_REVIEW → APPROVED → PUBLISHED
                 ↘ REJECTED (back to DRAFT)

PUBLISHED → ARCHIVED (after retention period)
ARCHIVED → RESTORED (to DRAFT) or DELETED (permanent)
```

#### 3.1.4 Tabs & Filtering

| Tab | Filter Criteria | Badge Count |
|-----|-----------------|-------------|
| **All** | All owned items | Total count |
| **Documents** | `resource_type = DOCUMENT` | Document count |
| **Folders** | `resource_type = FOLDER` | Folder count |
| **Drafts** | `status = DRAFT` | Draft count |
| **Pending Review** | Items awaiting user action | Pending count |

**Advanced Filters**:
- Confidentiality Level (Public, Internal, Confidential, Highly Confidential)
- Date Range (Created, Modified)
- File Type (PDF, Word, Excel, Image, etc.)
- Department/Category
- Status (Draft, Approved, Published, Archived)

### 3.2 Smart Organization Features

#### 3.2.1 Smart Folders (Saved Searches)

**Concept**: Allow users to save search queries as virtual folders that dynamically update.

**Examples**:
- "All Q4 2025 Budget Documents" → `name contains "Q4 2025" AND name contains "Budget"`
- "Confidential KYC Records" → `confidentiality = CONFIDENTIAL AND category = KYC`
- "Modified This Week" → `modified_at >= 7 days ago`
- "Large Files (>10MB)" → `file_size > 10MB`

**Implementation**:
```python
class SmartFolder(models.Model):
    user = models.ForeignKey(User)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    icon = models.CharField(default='folder-search')
    color = models.CharField(default='blue')

    # Search criteria (JSON)
    search_query = models.JSONField()
    # Example: {
    #   "name_contains": "Q4 2025",
    #   "confidentiality": ["CONFIDENTIAL"],
    #   "date_range": {"field": "modified_at", "from": "2025-10-01"},
    #   "file_types": ["pdf", "xlsx"]
    # }

    # Scope
    include_owned = models.BooleanField(default=True)
    include_shared = models.BooleanField(default=False)

    # Sharing
    is_shared = models.BooleanField(default=False)
    shared_with = models.ManyToManyField(User, related_name='shared_smart_folders')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

#### 3.2.2 Collections (Manual Grouping)

**Concept**: User-created groups that span multiple folders and ownership.

**Use Cases**:
- "Project Alpha Documents" - Group all docs related to a project
- "Client XYZ Files" - All documents for a specific client
- "Q4 Compliance Review" - Documents for quarterly compliance

**Features**:
- Add documents from anywhere (owned or shared)
- Drag-and-drop organization
- Share collections with team members
- Export collection as ZIP archive
- Collection-level permissions

**Implementation**:
```python
class Collection(models.Model):
    id = models.UUIDField(primary_key=True)
    owner = models.ForeignKey(User)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    color = models.CharField(default='gray')
    icon = models.CharField(default='folder-open')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class CollectionItem(models.Model):
    collection = models.ForeignKey(Collection)
    content_type = models.CharField()  # DOCUMENT, FOLDER
    object_id = models.UUIDField()
    display_order = models.IntegerField()
    added_at = models.DateTimeField(auto_now_add=True)
    added_by = models.ForeignKey(User)

    class Meta:
        unique_together = ['collection', 'content_type', 'object_id']
```

#### 3.2.3 Workspaces (Advanced - Future)

**Concept**: Context-based organization for complex projects (M-Files inspired).

**Structure**:
```
Workspace: "Project Alpha Launch"
├── Overview Dashboard
├── Team Members (with roles)
├── Documents (from multiple sources)
├── Tasks & Milestones
├── Activity Timeline
└── Related Workspaces
```

**Features**:
- Cross-folder document aggregation
- Integrated task management
- Team collaboration hub
- Progress tracking
- Automated workflows

### 3.3 Activity & Insights

#### 3.3.1 Activity Feed

**Purpose**: Real-time visibility into document interactions

**Events Tracked**:
| Event | Description | Displayed To |
|-------|-------------|--------------|
| `DOCUMENT_CREATED` | New document uploaded | Owner |
| `DOCUMENT_MODIFIED` | Document edited | Owner, Collaborators |
| `DOCUMENT_VIEWED` | Document accessed | Owner |
| `DOCUMENT_DOWNLOADED` | Document downloaded | Owner |
| `DOCUMENT_SHARED` | Document shared | Owner, Recipients |
| `PERMISSION_CHANGED` | Access modified | Owner, Affected Users |
| `COMMENT_ADDED` | New comment | Owner, Collaborators |
| `STATE_CHANGED` | Status transition | Owner, Reviewers |

**UI Display**:
```
┌────────────────────────────────────────────────────────────────┐
│ RECENT ACTIVITY                                     [See All]  │
├────────────────────────────────────────────────────────────────┤
│ 📄 Q4_Budget.xlsx                                              │
│    You modified this document                        2h ago    │
│                                                                │
│ 👤 John Smith viewed "AML_Report.pdf"                4h ago    │
│                                                                │
│ 📤 You shared "KYC_Client_A.pdf" with 3 people      Yesterday │
│                                                                │
│ ✅ "Compliance_Check.docx" was approved             Yesterday │
└────────────────────────────────────────────────────────────────┘
```

#### 3.3.2 Productivity Insights (Dashboard Widget)

**Purpose**: Help users understand their document activity patterns

**Metrics**:
- Documents created this week/month
- Most active collaborators
- Storage usage trending
- Pending actions count
- Approaching retention deadlines

**Implementation**:
```python
class UserDocumentStats(models.Model):
    user = models.OneToOneField(User)

    # Counts
    total_documents = models.IntegerField(default=0)
    total_folders = models.IntegerField(default=0)
    total_shared_by_me = models.IntegerField(default=0)
    total_shared_with_me = models.IntegerField(default=0)

    # Storage
    storage_used_bytes = models.BigIntegerField(default=0)
    storage_quota_bytes = models.BigIntegerField()

    # Activity
    documents_created_this_week = models.IntegerField(default=0)
    documents_modified_this_week = models.IntegerField(default=0)
    shares_sent_this_week = models.IntegerField(default=0)

    # Timestamps
    last_activity_at = models.DateTimeField(null=True)
    stats_updated_at = models.DateTimeField(auto_now=True)
```

### 3.4 Intelligent Features

#### 3.4.1 Smart Suggestions

**Concept**: ML-powered recommendations based on user behavior

**Suggestion Types**:

1. **"Suggested for You"** - Documents you might need
   - Based on colleagues' activity in same department
   - Documents in folders you frequently access
   - New documents matching your past search queries

2. **"Complete Your Work"** - Drafts needing attention
   - Drafts not modified in 7+ days
   - Documents shared for review awaiting your action
   - Expiring shares that need renewal

3. **"Organize This"** - Cleanup recommendations
   - Duplicate file detection
   - Uncategorized documents
   - Documents missing required metadata

**Algorithm Inputs**:
- User's recent document access patterns
- Department/team activity
- Document metadata similarity
- Time-based relevance decay
- Collaborative filtering (what similar users accessed)

#### 3.4.2 Auto-Organization Suggestions

**Features**:
- Suggest folder for new uploads based on name/content
- Recommend confidentiality level based on content keywords
- Auto-tag with detected metadata (dates, IDs, names)
- Suggest related documents when viewing

---

## 4. User Experience Design

### 4.1 Page Layout

**Desktop (>1024px)**:
```
┌─────────────────────────────────────────────────────────────────────┐
│ [Sidebar]  │                   My Documents                          │
│            ├─────────────────────────────────────────────────────────┤
│ My Docs ◄  │  Stats Cards (4)                                       │
│ Shared     │  ────────────────────────────────────────────────────  │
│ Recent     │  Quick Access                                          │
│ Favorites  │  ────────────────────────────────────────────────────  │
│ Trash      │  Tabs | Search | Filters | View Toggle                 │
│            │  ────────────────────────────────────────────────────  │
│ ─────────  │                                                        │
│ My Folders │  Document List / Grid                                  │
│  └ Folder1 │    ├── Time Group Headers                              │
│  └ Folder2 │    └── Document Items                                  │
│            │                                                        │
└────────────┴────────────────────────────────────────────────────────┘
```

**Tablet (640-1024px)**:
- Collapsible sidebar (hamburger menu)
- 2-column grid view
- Horizontal scroll for stats cards

**Mobile (<640px)**:
- Bottom navigation
- Single column list
- Stacked stats cards
- Full-screen search overlay

### 4.2 Key Interactions

#### 4.2.1 Document Item Actions

**On Hover (Desktop)**:
```
┌────────────────────────────────────────────────────────────────┐
│ 📄 Q4_Budget_Final.xlsx                                        │
│    Modified 2 hours ago by you              [📌] [↓] [⋯]      │
│    Confidential • 2.4 MB • Excel                               │
└────────────────────────────────────────────────────────────────┘
     │                                          │   │   │
     │                                          │   │   └─ More menu
     │                                          │   └───── Download
     │                                          └───────── Pin/Unpin
     └─ Click to open preview panel
```

**Context Menu (Right-Click)**:
- Open
- Preview
- Download
- Share...
- Add to Collection...
- Add to Quick Access
- Move to...
- Copy to...
- Rename
- Change Confidentiality...
- View Activity
- Delete

#### 4.2.2 Bulk Actions

When multiple items selected:
```
┌────────────────────────────────────────────────────────────────┐
│ ✓ 5 items selected                [Move] [Share] [Delete] [×] │
└────────────────────────────────────────────────────────────────┘
```

### 4.3 Empty States

**No Documents**:
```
┌────────────────────────────────────────────────────────────────┐
│                         📁                                      │
│                                                                 │
│              Your documents will appear here                    │
│                                                                 │
│    Upload your first document or create a new folder to        │
│              start organizing your files.                       │
│                                                                 │
│              [Upload Document]  [Create Folder]                 │
└────────────────────────────────────────────────────────────────┘
```

**No Search Results**:
```
┌────────────────────────────────────────────────────────────────┐
│                         🔍                                      │
│                                                                 │
│              No documents match "quarterly report"              │
│                                                                 │
│    Try adjusting your search or filters, or search in          │
│              "Shared with Me" for documents from others.        │
│                                                                 │
│              [Clear Filters]  [Search Shared Items]             │
└────────────────────────────────────────────────────────────────┘
```

### 4.4 Responsive Behavior

| Breakpoint | Sidebar | Stats Cards | View Default | Quick Access |
|------------|---------|-------------|--------------|--------------|
| Desktop >1024px | Visible | 4 columns | List | Horizontal scroll |
| Tablet 640-1024px | Collapsed | 2 columns | Grid | Horizontal scroll |
| Mobile <640px | Bottom nav | Stacked | List | Vertical stack |

---

## 5. Technical Implementation

### 5.1 Backend API Endpoints

#### 5.1.1 My Documents Endpoints

```
GET    /api/v1/my-documents/
       - Query params: tab, search, sort, filters
       - Returns: Grouped documents with counts

GET    /api/v1/my-documents/stats/
       - Returns: Dashboard statistics

GET    /api/v1/my-documents/activity/
       - Query params: limit, offset, date_range
       - Returns: Activity feed items

POST   /api/v1/my-documents/bulk-action/
       - Body: { action, item_ids }
       - Actions: move, delete, change_confidentiality
```

#### 5.1.2 Quick Access Endpoints

```
GET    /api/v1/quick-access/
       - Returns: Ordered list of pinned items

POST   /api/v1/quick-access/
       - Body: { content_type, object_id }
       - Adds item to quick access

DELETE /api/v1/quick-access/{id}/
       - Removes item from quick access

PATCH  /api/v1/quick-access/reorder/
       - Body: { items: [{id, order}] }
       - Reorders pinned items
```

#### 5.1.3 Smart Folders Endpoints

```
GET    /api/v1/smart-folders/
       - Returns: User's smart folders

POST   /api/v1/smart-folders/
       - Body: { name, search_query, ... }
       - Creates smart folder

GET    /api/v1/smart-folders/{id}/
       - Returns: Smart folder details

GET    /api/v1/smart-folders/{id}/results/
       - Returns: Documents matching criteria

PATCH  /api/v1/smart-folders/{id}/
       - Updates smart folder

DELETE /api/v1/smart-folders/{id}/
       - Deletes smart folder
```

#### 5.1.4 Collections Endpoints

```
GET    /api/v1/collections/
       - Returns: User's collections

POST   /api/v1/collections/
       - Creates new collection

GET    /api/v1/collections/{id}/
       - Returns: Collection with items

POST   /api/v1/collections/{id}/items/
       - Adds item to collection

DELETE /api/v1/collections/{id}/items/{item_id}/
       - Removes item from collection

POST   /api/v1/collections/{id}/export/
       - Exports collection as ZIP
```

### 5.2 Database Models

#### 5.2.1 New Models Required

```python
# apps/documents/models.py (additions)

class DocumentState(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    IN_REVIEW = 'IN_REVIEW', 'In Review'
    APPROVED = 'APPROVED', 'Approved'
    PUBLISHED = 'PUBLISHED', 'Published'
    ARCHIVED = 'ARCHIVED', 'Archived'

# Add to Document model:
# state = models.CharField(max_length=20, choices=DocumentState.choices, default=DocumentState.DRAFT)
# submitted_for_review_at = models.DateTimeField(null=True)
# approved_at = models.DateTimeField(null=True)
# approved_by = models.ForeignKey(User, null=True)
# published_at = models.DateTimeField(null=True)
# archived_at = models.DateTimeField(null=True)


# apps/organization/models.py (new)

class QuickAccessItem(models.Model):
    """User's pinned items for quick access"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='quick_access_items')

    content_type = models.CharField(max_length=20)  # DOCUMENT, FOLDER, SHARED_ITEM
    object_id = models.UUIDField()

    display_order = models.IntegerField(default=0)
    pinned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'quick_access_items'
        unique_together = ['user', 'content_type', 'object_id']
        ordering = ['display_order', '-pinned_at']


class SmartFolder(models.Model):
    """User-defined saved searches"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='smart_folders')

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, default='folder-search')
    color = models.CharField(max_length=20, default='blue')

    # Search criteria stored as JSON
    search_query = models.JSONField(default=dict)

    # Scope settings
    include_owned = models.BooleanField(default=True)
    include_shared = models.BooleanField(default=False)

    # Sharing
    is_shared = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'smart_folders'
        ordering = ['name']


class Collection(models.Model):
    """User-created document groups"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='collections')

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=20, default='gray')
    icon = models.CharField(max_length=50, default='folder-open')

    is_shared = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'collections'
        ordering = ['name']


class CollectionItem(models.Model):
    """Items within a collection"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    collection = models.ForeignKey(Collection, on_delete=models.CASCADE, related_name='items')

    content_type = models.CharField(max_length=20)  # DOCUMENT, FOLDER
    object_id = models.UUIDField()

    display_order = models.IntegerField(default=0)
    added_at = models.DateTimeField(auto_now_add=True)
    added_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    class Meta:
        db_table = 'collection_items'
        unique_together = ['collection', 'content_type', 'object_id']
        ordering = ['display_order', '-added_at']


class UserDocumentStats(models.Model):
    """Cached statistics for user dashboard"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True)

    total_documents = models.IntegerField(default=0)
    total_folders = models.IntegerField(default=0)
    total_shared_by_me = models.IntegerField(default=0)
    total_shared_with_me = models.IntegerField(default=0)

    storage_used_bytes = models.BigIntegerField(default=0)

    documents_created_this_week = models.IntegerField(default=0)
    documents_modified_this_week = models.IntegerField(default=0)

    drafts_count = models.IntegerField(default=0)
    pending_review_count = models.IntegerField(default=0)

    last_activity_at = models.DateTimeField(null=True)
    stats_updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_document_stats'
```

### 5.3 Frontend Components

#### 5.3.1 New Components Required

```
frontend/src/
├── pages/
│   └── MyDocumentsPage.tsx          # Main page component
│
├── components/
│   └── MyDocuments/
│       ├── index.ts                  # Exports
│       ├── StatsCards.tsx            # Dashboard statistics
│       ├── QuickAccess.tsx           # Pinned items section
│       ├── QuickAccessItem.tsx       # Individual pinned item
│       ├── DocumentList.tsx          # Document listing
│       ├── DocumentItem.tsx          # Single document row/card
│       ├── DocumentGrid.tsx          # Grid view
│       ├── TimeGroupHeader.tsx       # Collapsible group header
│       ├── FilterBar.tsx             # Search and filters
│       ├── BulkActions.tsx           # Multi-select actions
│       ├── ActivityFeed.tsx          # Recent activity
│       ├── SmartFolderModal.tsx      # Create/edit smart folder
│       ├── CollectionModal.tsx       # Create/edit collection
│       └── EmptyState.tsx            # Empty state displays
│
└── services/
    ├── myDocumentsService.ts         # API calls
    ├── quickAccessService.ts         # Quick access API
    ├── smartFolderService.ts         # Smart folders API
    └── collectionService.ts          # Collections API
```

### 5.4 Performance Considerations

#### 5.4.1 Caching Strategy

| Data | Cache Duration | Invalidation |
|------|---------------|--------------|
| User Stats | 5 minutes | On document CRUD |
| Quick Access | 1 hour | On pin/unpin |
| Smart Folder Results | 2 minutes | On document CRUD |
| Activity Feed | 1 minute | On activity log |

#### 5.4.2 Pagination

- Default page size: 50 items
- Infinite scroll with intersection observer
- Cursor-based pagination for activity feed
- Pre-fetch next page on scroll

#### 5.4.3 Optimistic Updates

- Pin/unpin: Update UI immediately, rollback on error
- Reorder: Update UI on drag end, sync in background
- Bulk actions: Show progress indicator

---

## 6. Security & Compliance

### 6.1 Access Control

| Feature | Permission Required |
|---------|-------------------|
| View My Documents | Authenticated user |
| Create documents | `documents.create` |
| Delete documents | Owner OR Admin |
| Share documents | Owner OR `documents.share` |
| Create smart folders | Authenticated user |
| Create collections | Authenticated user |
| Share collections | Collection owner |

### 6.2 Audit Logging

All actions logged with:
- User ID
- Action type
- Resource type/ID
- Timestamp
- IP address
- Before/after values (for modifications)

### 6.3 Data Protection

- All documents encrypted at rest (AES-256)
- TLS 1.3 for all API calls
- Confidential documents: watermark on download
- Highly Confidential: additional approval workflow
- No bulk download of HC documents

### 6.4 Retention Compliance

- Enforce retention policies on owned documents
- Notify before automatic archival
- Legal hold prevents deletion
- Audit trail for compliance reporting

---

## 7. Implementation Roadmap

### Phase 1: Foundation (Sprint 1-2)
**Goal**: Basic My Documents page with core functionality

**Deliverables**:
- [ ] My Documents page layout
- [ ] Stats cards component
- [ ] Document list with time grouping
- [ ] Basic filtering (type, confidentiality)
- [ ] Search functionality
- [ ] List/Grid view toggle
- [ ] Backend APIs for document listing

**Acceptance Criteria**:
- Users can view all their documents
- Documents grouped by time (Today, This Week, etc.)
- Basic search and filter works
- View toggle persists

### Phase 2: Quick Access (Sprint 3)
**Goal**: Implement pinning system

**Deliverables**:
- [ ] Quick Access section UI
- [ ] Pin/unpin functionality
- [ ] Drag-to-reorder
- [ ] Backend models and APIs
- [ ] Shortcut to shared items

**Acceptance Criteria**:
- Users can pin up to 20 items
- Drag-and-drop reordering works
- Can pin shared items as shortcuts
- Persists across sessions

### Phase 3: Document States (Sprint 4)
**Goal**: Implement document lifecycle

**Deliverables**:
- [ ] Document state model
- [ ] State transition UI
- [ ] Draft/Pending Review tabs
- [ ] State change notifications
- [ ] Approval workflow (basic)

**Acceptance Criteria**:
- Documents have state (Draft, In Review, etc.)
- Users can transition states
- Pending Review shows items awaiting action

### Phase 4: Smart Folders (Sprint 5-6)
**Goal**: Saved searches as virtual folders

**Deliverables**:
- [ ] Smart Folder model
- [ ] Create/edit smart folder UI
- [ ] Dynamic results display
- [ ] Smart folder in sidebar
- [ ] Share smart folders

**Acceptance Criteria**:
- Users can save search as smart folder
- Smart folders update dynamically
- Can be shared with team

### Phase 5: Collections (Sprint 7)
**Goal**: Manual document grouping

**Deliverables**:
- [ ] Collection model
- [ ] Create collection UI
- [ ] Add to collection action
- [ ] Collection view page
- [ ] Export collection as ZIP

**Acceptance Criteria**:
- Users can create collections
- Add documents from anywhere
- Export works for all items user can access

### Phase 6: Activity & Insights (Sprint 8)
**Goal**: Activity tracking and productivity insights

**Deliverables**:
- [ ] Activity feed component
- [ ] User stats calculation
- [ ] Productivity insights widget
- [ ] Activity page (full view)

**Acceptance Criteria**:
- Activity feed shows recent actions
- Stats accurate and update regularly
- Insights provide actionable information

### Phase 7: Polish & Intelligence (Sprint 9-10)
**Goal**: Smart suggestions and refinements

**Deliverables**:
- [ ] Suggested for You section
- [ ] Auto-organization suggestions
- [ ] Performance optimization
- [ ] Mobile responsiveness
- [ ] Accessibility audit

**Acceptance Criteria**:
- Suggestions relevant to user
- Page loads in <1 second
- Works on mobile devices
- WCAG 2.1 AA compliant

---

## 8. Success Metrics

### 8.1 Adoption Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Daily Active Users | 80% of total users | Unique visits/day |
| Feature Usage | 60% use Quick Access | Pin action count |
| Smart Folder Adoption | 30% create at least 1 | Smart folder count |
| Collection Usage | 20% create collections | Collection count |

### 8.2 Performance Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Page Load Time | <1 second | Time to interactive |
| Search Response | <500ms | API response time |
| Pin Action | <200ms | UI update time |
| Bulk Action | <2s for 50 items | Total operation time |

### 8.3 User Satisfaction

| Metric | Target | Measurement |
|--------|--------|-------------|
| Task Completion | 90% success rate | User testing |
| Error Rate | <2% | Error logging |
| Support Tickets | <5/week for feature | Support tracking |
| User Satisfaction | >4.0/5.0 | Survey |

### 8.4 Business Impact

| Metric | Target | Measurement |
|--------|--------|-------------|
| Document Retrieval Time | -50% vs. current | Time tracking |
| Sharing Efficiency | +30% shares/user | Share count |
| Compliance Violations | 0 related to access | Audit reports |
| Storage Efficiency | -20% duplicates | Duplicate detection |

---

## Appendix A: Comparison with Current Implementation

### Current Smart Folders (smartFolders.ts)

```typescript
export type SmartFolderType = 'my_documents' | 'shared_with_me' | 'recent' | 'favorites' | 'trash'
```

**Current**: Static virtual folders
**Proposed**: Extend with user-created smart folders

### Migration Path

1. Keep existing smart folder types as system defaults
2. Add `SmartFolder` model for user-created folders
3. Display both in sidebar (system first, then user-created)
4. Allow users to hide system smart folders (preference)

---

## Appendix B: Research Sources

1. Microsoft SharePoint/OneDrive Documentation
2. Google Drive API & Shared Drives Guide
3. Box Platform Documentation
4. M-Files Document Lifecycle Management
5. OpenText Document Management Best Practices
6. Dropbox Business Team Features
7. Enterprise DMS Industry Reports (Gartner, Forrester)

---

## Appendix C: Glossary

| Term | Definition |
|------|------------|
| **Smart Folder** | Virtual folder based on saved search criteria |
| **Collection** | User-created grouping of documents |
| **Quick Access** | Pinned items for fast retrieval |
| **Workspace** | Context-based project/client organization |
| **Document State** | Lifecycle stage (Draft, Approved, etc.) |
| **Shortcut** | Reference to shared item without duplication |

---

**Document End**

*For questions or clarifications, contact the Development Team.*
