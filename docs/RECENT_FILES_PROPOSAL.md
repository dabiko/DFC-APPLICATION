# Recent Files - Enterprise Implementation Proposal

**Document Management System - DFC Application**
**Created:** 2025-11-26
**Status:** ✅ COMPLETED

---

## Configuration Decisions

| Setting | Decision |
|---------|----------|
| Retention Period | 30 days |
| Admin Access | Yes - Admins can see other users' recent files |
| Scope | Both documents and folders |
| Pin Limit | 10 items maximum |
| Clear History | By date range |

---

## Executive Summary

The "Recent Files" feature is a critical productivity tool found in all major document management systems (Google Drive, SharePoint, Dropbox, OneDrive). It provides quick access to recently accessed, modified, or uploaded files, significantly reducing navigation time and improving user efficiency.

---

## How Industry Leaders Implement This

| Platform | Features | Retention | Sorting Options |
|----------|----------|-----------|-----------------|
| **Google Drive** | Viewed, Edited, Uploaded tabs; Suggested files (AI) | 30 days | Date, Name, Last modified |
| **SharePoint** | Recent documents; Pinned files; Activity feed | 90 days | Date accessed, Modified, Name |
| **Dropbox** | Recents; Starred; File requests | 30 days | Date opened, Name |
| **OneDrive** | Recent; Shared; Favorites | 60 days | Date, Name, Modified by |
| **Box** | Recents; Recommended; All files | 30 days | Date, Type, Size |
| **Notion** | Recently visited; Quick find | Unlimited | Last edited, Created |

### Common Patterns Observed:

1. **Multiple Activity Types** - View, Edit, Upload, Download, Comment
2. **Smart Suggestions** - AI-based "Suggested for you"
3. **Pinning/Quick Access** - Pin frequently used files to top
4. **Cross-Device Sync** - Recent files sync across devices
5. **Time-Based Grouping** - Today, Yesterday, Last 7 days, Last 30 days
6. **Preview on Hover** - Quick preview without opening

---

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        RECENT FILES SYSTEM                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    ACTIVITY TRACKING                             │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │   │
│  │  │  VIEW   │  │  EDIT   │  │ UPLOAD  │  │DOWNLOAD │            │   │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘            │   │
│  │       └───────────┴───────────┴───────────┴──────┐              │   │
│  │                                                   ▼              │   │
│  │                         ┌─────────────────────────────┐         │   │
│  │                         │   RecentActivity Model      │         │   │
│  │                         │   (Optimized for Queries)   │         │   │
│  │                         └─────────────────────────────┘         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    DATA AGGREGATION                              │   │
│  │                                                                   │   │
│  │   Recent Activities  ──►  Deduplicate  ──►  Group by Time       │   │
│  │         │                     │                   │              │   │
│  │         ▼                     ▼                   ▼              │   │
│  │   ┌──────────┐         ┌──────────┐        ┌──────────┐         │   │
│  │   │  Today   │         │Yesterday │        │ This Week│         │   │
│  │   │  (12)    │         │   (8)    │        │   (25)   │         │   │
│  │   └──────────┘         └──────────┘        └──────────┘         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    USER INTERFACE                                │   │
│  │                                                                   │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │  Filters: [All] [Viewed] [Edited] [Uploaded] [Downloaded]│    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  │                                                                   │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │  📅 Today                                                │    │   │
│  │  │  ├── 📄 Q4_Report.pdf         Viewed 2 min ago          │    │   │
│  │  │  ├── 📄 Budget_2025.xlsx      Edited 15 min ago         │    │   │
│  │  │  └── 📄 Contract_Draft.docx   Uploaded 1 hour ago       │    │   │
│  │  │                                                          │    │   │
│  │  │  📅 Yesterday                                            │    │   │
│  │  │  ├── 📄 Meeting_Notes.pdf     Downloaded                 │    │   │
│  │  │  └── 📄 Policy_Update.docx    Edited                     │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Feature Specification

### Core Features

| Feature | Priority | Description |
|---------|----------|-------------|
| **Activity Tracking** | P0 | Track View, Edit, Upload, Download actions |
| **Time Grouping** | P0 | Today, Yesterday, Last 7 days, Last 30 days, Older |
| **Filter by Action** | P0 | Filter by activity type (All, Viewed, Edited, etc.) |
| **Quick Actions** | P0 | Open, Download, Share, Add to Favorites from list |
| **Search Within** | P1 | Search within recent files |
| **Pin to Top** | P1 | Pin frequently accessed files (max 10) |
| **Clear History** | P1 | Allow users to clear history by date range |
| **Preview Panel** | P2 | Quick preview without navigation |
| **Suggested Files** | P2 | AI-based suggestions (future) |

### Activity Types to Track

| Action | Trigger | Icon | Color |
|--------|---------|------|-------|
| **Viewed** | Document preview/open | 👁️ Eye | Blue |
| **Edited** | Document metadata update | ✏️ Pencil | Green |
| **Uploaded** | New document upload | ⬆️ Upload | Purple |
| **Downloaded** | Document download | ⬇️ Download | Orange |
| **Shared** | Document shared | 🔗 Share | Teal |
| **Commented** | Comment added (future) | 💬 Comment | Yellow |

---

## Data Model

### RecentActivity Model

```python
# backend/apps/documents/models.py

class RecentActivity(models.Model):
    """
    Optimized table for tracking recent document/folder activities.
    Separate from AuditLog for performance (smaller table, specific indexes).
    Auto-cleanup of entries older than retention period (30 days).
    """

    class ActivityType(models.TextChoices):
        VIEWED = 'VIEWED', 'Viewed'
        EDITED = 'EDITED', 'Edited'
        UPLOADED = 'UPLOADED', 'Uploaded'
        DOWNLOADED = 'DOWNLOADED', 'Downloaded'
        SHARED = 'SHARED', 'Shared'

    class ResourceType(models.TextChoices):
        DOCUMENT = 'DOCUMENT', 'Document'
        FOLDER = 'FOLDER', 'Folder'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recent_activities')

    # Resource reference (document or folder)
    resource_type = models.CharField(max_length=20, choices=ResourceType.choices)
    resource_id = models.UUIDField()

    activity_type = models.CharField(max_length=20, choices=ActivityType.choices)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    # Denormalized fields for faster queries (avoid JOINs)
    resource_name = models.CharField(max_length=500)
    file_type = models.CharField(max_length=50, blank=True)  # For documents
    file_size = models.BigIntegerField(default=0)  # For documents
    folder_id = models.UUIDField(null=True)  # Parent folder
    folder_name = models.CharField(max_length=255, blank=True)
    folder_path = models.CharField(max_length=1000, blank=True)
    confidentiality_level = models.CharField(max_length=20, blank=True)

    # For pinned items
    is_pinned = models.BooleanField(default=False)
    pinned_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'recent_activities'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['user', 'resource_type', '-timestamp']),
            models.Index(fields=['user', 'activity_type', '-timestamp']),
            models.Index(fields=['user', 'is_pinned', '-timestamp']),
            models.Index(fields=['resource_type', 'resource_id']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'resource_type', 'resource_id', 'activity_type'],
                name='unique_user_resource_activity'
            )
        ]

    RETENTION_DAYS = 30
    MAX_PINNED_ITEMS = 10
```

---

## API Design

### Endpoints

```yaml
# Recent Activities API

GET /api/v1/recent/
  description: Get user's recent activities
  parameters:
    - activity_type: string (optional) - Filter by type
    - resource_type: string (optional) - Filter by document/folder
    - days: integer (default: 30) - Number of days
    - limit: integer (default: 50) - Max results
    - pinned_only: boolean (default: false)
  response: Grouped activities

POST /api/v1/recent/{id}/pin/
  description: Pin/unpin an item
  response: { is_pinned: boolean }

DELETE /api/v1/recent/clear/
  description: Clear history by date range
  parameters:
    - before_date: datetime (required)
  response: { cleared_count: integer }

GET /api/v1/recent/stats/
  description: Activity statistics
  response: { total, by_type, by_day }

# Admin endpoint
GET /api/v1/admin/recent/
  description: View all users' recent activities (admin only)
```

---

## Implementation Phases

### Phase 1: Foundation (2-3 days) ✅ COMPLETED
- [x] Save proposal document
- [x] Create `RecentActivity` model
- [x] Create database migration
- [x] Create serializers
- [x] Implement API endpoints
- [x] Add activity logging signals

### Phase 2: Frontend Core (3-4 days) ✅ COMPLETED
- [x] Create `RecentPage.tsx` component
- [x] Implement `recentService.ts` API client
- [x] Build activity filter tabs
- [x] Create time-grouped list view
- [x] Add row actions (context menu) with Open, Download, Share, Pin/Unpin
- [x] Add route configuration
- [x] Add sidebar navigation link
- [x] Grid view with context menu

### Phase 3: Enhanced Features (2-3 days) ✅ COMPLETED
- [x] Implement pin/unpin functionality
- [x] Add search within recent files
- [x] Create clear history by date range
- [x] Add activity statistics

### Phase 4: Polish & Integration (1-2 days) ✅ COMPLETED
- [x] Wire up sidebar navigation
- [x] Add loading states and empty states
- [x] Add activity count badge to Recent smart folder
- [x] Dark mode support throughout
- [x] Enhanced dropdown UX with auto-flip positioning
- [x] Testing and bug fixes

---

## Estimated Effort

| Phase | Duration |
|-------|----------|
| Phase 1: Foundation | 2-3 days |
| Phase 2: Frontend Core | 3-4 days |
| Phase 3: Enhanced | 2-3 days |
| Phase 4: Polish | 1-2 days |
| **Total** | **8-12 days** |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Avg. time to access recent file | < 3 seconds |
| Recent files usage rate | > 60% of users |
| Reduced navigation clicks | -40% |
| User satisfaction | > 4.0/5.0 |
