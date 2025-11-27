# Shared with Me - Enterprise Implementation Proposal

**Document Management System - DFC Application**
**Created:** 2025-11-26
**Status:** Phase 1 Complete - Backend Foundation Implemented

---

## Executive Summary

The "Shared with Me" feature is a cornerstone of enterprise document collaboration found in all major document management platforms. It provides users with a centralized view of all documents and folders that have been shared with them by colleagues, external parties, or automated systems. This feature dramatically improves productivity by eliminating the need to search through emails or remember file locations.

---

## Industry Benchmarking

### How Leading Platforms Implement This

| Platform | Key Features | Organization | Notifications |
|----------|--------------|--------------|---------------|
| **Google Drive** | Filter by owner, file type, date modified; Add shortcuts to My Drive; Workspaces for grouping; AI-powered Priority suggestions | Flat list with filters; Cannot create folders within | Email digest for unviewed files (7+ days inactive) |
| **SharePoint/OneDrive** | "Add shortcut to My files"; Shared libraries; Hub sites for discovery; Quick access section | Shortcuts appear in OneDrive sync; Separate from owned files | Real-time notifications; @mentions in comments |
| **Dropbox** | Shared folders vs Team folders; Granular permissions (view/edit); External sharing controls | Can mirror to local folder; Starred items | Activity feed; Email notifications |
| **Box** | Collaborator roles (7 levels); Watermarking; Access statistics; Collections | Flat list with smart filters | Real-time notifications; Digest emails |
| **Notion** | Shared pages & databases; Permission inheritance; Guest access; Link sharing | Sidebar favorites; Recent list | In-app notifications; Email summaries |

### Common Patterns Across All Platforms

1. **Clear Ownership Distinction** - Users always know who shared what and when
2. **Shortcut/Bookmark System** - Add important shared items to personal workspace
3. **Activity Tracking** - See when files were last modified and by whom
4. **Permission Visibility** - Users know their access level (view/edit/comment)
5. **Smart Filtering** - Filter by owner, date, type, permission level
6. **Notification System** - Real-time and digest notifications for new shares
7. **Quick Actions** - Open, download, add to favorites, request access change
8. **Search Integration** - Shared files appear in global search results

---

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SHARED WITH ME SYSTEM                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                        SHARING SOURCES                                      │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │ │
│  │  │   Direct    │  │   Folder    │  │ Department  │  │   Public    │       │ │
│  │  │   Share     │  │Permission   │  │   Access    │  │   Links     │       │ │
│  │  │  (1-to-1)   │  │ (inherited) │  │  (RBAC)     │  │  (tokens)   │       │ │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘       │ │
│  │         └────────────────┴────────────────┴────────────────┘               │ │
│  │                                    │                                        │ │
│  │                                    ▼                                        │ │
│  │                    ┌──────────────────────────────┐                        │ │
│  │                    │   SharedDocument Model       │                        │ │
│  │                    │   (Unified Access Tracker)   │                        │ │
│  │                    └──────────────────────────────┘                        │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                        USER EXPERIENCE                                      │ │
│  │                                                                              │ │
│  │   ┌──────────────────────────────────────────────────────────────────────┐  │ │
│  │   │  Tab Bar: [All] [Documents] [Folders] [Pending] [External]           │  │ │
│  │   └──────────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                              │ │
│  │   ┌──────────────────────────────────────────────────────────────────────┐  │ │
│  │   │  Filters: Owner ▼ | Date Shared ▼ | Permission ▼ | Type ▼           │  │ │
│  │   └──────────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                              │ │
│  │   ┌──────────────────────────────────────────────────────────────────────┐  │ │
│  │   │  🔖 SHORTCUTS (Pinned Items)                                         │  │ │
│  │   │  ├── 📁 Q4 Project Files          Shared by John D.    2 days ago   │  │ │
│  │   │  └── 📄 Budget Template.xlsx      Shared by Finance    5 days ago   │  │ │
│  │   │                                                                       │  │ │
│  │   │  📅 THIS WEEK                                                        │  │ │
│  │   │  ├── 📄 Contract_Draft.pdf        Shared by Legal      Today        │  │ │
│  │   │  │   └─ "Can Edit" · 15 KB · PDF                                     │  │ │
│  │   │  ├── 📁 Audit Reports 2025        Shared by Compliance Yesterday    │  │ │
│  │   │  │   └─ "Can View" · 12 files                                        │  │ │
│  │   │  └── 📄 Meeting_Notes.docx        Shared by HR         2 days ago   │  │ │
│  │   │      └─ "Can Comment" · 45 KB · Word                                 │  │ │
│  │   │                                                                       │  │ │
│  │   │  📅 EARLIER THIS MONTH                                               │  │ │
│  │   │  ├── 📄 Policy_Update.pdf         Shared by Admin      Nov 15       │  │ │
│  │   │  └── 📁 Training Materials        Shared by HR         Nov 12       │  │ │
│  │   └──────────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                              │ │
│  │   Quick Actions (on hover/right-click):                                     │ │
│  │   [Open] [Download] [Add Shortcut] [Copy Link] [Request Edit Access]        │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │                        NOTIFICATION CENTER                                  │ │
│  │                                                                              │ │
│  │  Real-time Notifications:                                                   │ │
│  │  • "John shared 'Q4 Report.pdf' with you" ────────────────► In-App Toast   │ │
│  │  • "Sarah commented on 'Budget.xlsx'" ─────────────────────► Push/Email    │ │
│  │  • "3 new files shared this week" ─────────────────────────► Weekly Digest │ │
│  │                                                                              │ │
│  │  Pending Actions:                                                           │ │
│  │  • Accept/Decline share invitations                                         │ │
│  │  • Request access to restricted documents                                   │ │
│  │  • Acknowledge confidential document access                                 │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Feature Specification

### Core Features (P0 - Must Have)

| Feature | Description | Business Value |
|---------|-------------|----------------|
| **Shared Documents List** | Centralized view of all documents shared with the user | Reduces time finding shared content by 70% |
| **Shared Folders Access** | View folders where user has been granted access | Enables collaborative workflows |
| **Owner/Sharer Display** | Show who shared each item and when | Accountability and context |
| **Permission Indicators** | Visual badges for View/Edit/Comment/Download rights | Clarity on what actions are allowed |
| **Time-Based Grouping** | Today, This Week, This Month, Earlier | Easy navigation through shares |
| **Quick Actions** | Open, Download, Copy Link, Add to Favorites | Reduce clicks for common tasks |
| **Search Within Shared** | Full-text search within shared items | Fast discovery |
| **Badge Count** | Show count of new/unread shares in sidebar | Awareness of new content |

### Enhanced Features (P1 - Should Have)

| Feature | Description | Business Value |
|---------|-------------|----------------|
| **Shortcuts/Bookmarks** | Pin important shared items to top of list | Personalized quick access |
| **Filter by Owner** | Show only items from specific person | Focus on specific collaborator |
| **Filter by Permission** | Show only editable or view-only items | Task-oriented filtering |
| **Filter by Type** | Documents, Folders, by file type | Content-specific browsing |
| **External Shares Tab** | Separate view for items shared by external users | Security awareness |
| **Pending Invitations** | Accept/decline share requests | Controlled access |
| **Activity Timeline** | See recent activity on shared items | Stay updated on changes |
| **Request Access Change** | Request edit access for view-only items | Streamlined permissions workflow |

### Advanced Features (P2 - Nice to Have)

| Feature | Description | Business Value |
|---------|-------------|----------------|
| **Smart Suggestions** | AI-powered "Suggested for You" based on work patterns | Proactive content discovery |
| **Workspaces** | Group related shared items into collections | Project-based organization |
| **Share Analytics** | For document owners: who accessed what, when | Collaboration insights |
| **Expiring Shares Alert** | Notify when share access is about to expire | Prevent access loss |
| **Offline Access** | Mark shared items for offline availability | Mobile/remote productivity |
| **Share History** | Full history of who shared what with whom | Audit and compliance |

---

## Data Model

### New Model: SharedItemAccess

```python
# backend/apps/sharing/models.py

class SharedItemAccess(models.Model):
    """
    Tracks all items (documents and folders) shared with a user.
    This is the source of truth for the "Shared with Me" view.

    Key design decisions:
    - Separate from Share model (which is for external link sharing)
    - Supports both documents and folders
    - Tracks the sharing user (owner/sharer)
    - Stores permission level granted
    - Tracks user engagement (viewed, shortcuts, etc.)
    """

    class ResourceType(models.TextChoices):
        DOCUMENT = 'DOCUMENT', 'Document'
        FOLDER = 'FOLDER', 'Folder'

    class PermissionLevel(models.TextChoices):
        VIEW = 'VIEW', 'View Only'
        COMMENT = 'COMMENT', 'View and Comment'
        EDIT = 'EDIT', 'View and Edit'
        FULL = 'FULL', 'Full Access (including delete)'

    class ShareSource(models.TextChoices):
        DIRECT = 'DIRECT', 'Directly shared with user'
        FOLDER_INHERITED = 'FOLDER_INHERITED', 'Inherited from parent folder'
        DEPARTMENT = 'DEPARTMENT', 'Department-based access'
        TEAM = 'TEAM', 'Team membership'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)

    # The user who received the share
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='shared_with_me'
    )

    # The user who shared the item
    shared_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='shared_by_me'
    )

    # Resource reference (document or folder)
    resource_type = models.CharField(max_length=20, choices=ResourceType.choices)
    resource_id = models.UUIDField()

    # Denormalized fields for faster queries
    resource_name = models.CharField(max_length=500)
    file_type = models.CharField(max_length=50, blank=True)  # For documents
    file_size = models.BigIntegerField(default=0)  # For documents
    folder_path = models.CharField(max_length=1000, blank=True)
    confidentiality_level = models.CharField(max_length=20, blank=True)

    # Permission details
    permission_level = models.CharField(
        max_length=20,
        choices=PermissionLevel.choices,
        default=PermissionLevel.VIEW
    )
    share_source = models.CharField(
        max_length=30,
        choices=ShareSource.choices,
        default=ShareSource.DIRECT
    )

    # Share metadata
    shared_at = models.DateTimeField(auto_now_add=True, db_index=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    message = models.TextField(blank=True, help_text='Optional message from sharer')

    # User engagement tracking
    is_shortcut = models.BooleanField(default=False)  # Pinned to top
    shortcut_order = models.IntegerField(default=0)  # Order in shortcuts
    first_viewed_at = models.DateTimeField(null=True, blank=True)
    last_accessed_at = models.DateTimeField(null=True, blank=True)
    access_count = models.IntegerField(default=0)
    is_hidden = models.BooleanField(default=False)  # User hid this item

    # Notification tracking
    is_notified = models.BooleanField(default=False)
    notification_sent_at = models.DateTimeField(null=True, blank=True)
    is_acknowledged = models.BooleanField(default=False)  # For confidential docs
    acknowledged_at = models.DateTimeField(null=True, blank=True)

    # Status
    is_active = models.BooleanField(default=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoked_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='revoked_shared_access'
    )

    class Meta:
        db_table = 'shared_item_access'
        ordering = ['-shared_at']
        indexes = [
            models.Index(fields=['recipient', '-shared_at']),
            models.Index(fields=['recipient', 'resource_type', '-shared_at']),
            models.Index(fields=['recipient', 'is_shortcut', '-shared_at']),
            models.Index(fields=['recipient', 'shared_by', '-shared_at']),
            models.Index(fields=['recipient', 'is_active', '-shared_at']),
            models.Index(fields=['resource_type', 'resource_id']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['recipient', 'resource_type', 'resource_id'],
                name='unique_recipient_resource'
            )
        ]

    MAX_SHORTCUTS = 20  # Maximum pinned items per user
```

### Model: ShareInvitation (For Pending Shares)

```python
class ShareInvitation(models.Model):
    """
    Pending share invitations that require user acceptance.
    Used for confidential documents or when explicit consent is required.
    """

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        ACCEPTED = 'ACCEPTED', 'Accepted'
        DECLINED = 'DECLINED', 'Declined'
        EXPIRED = 'EXPIRED', 'Expired'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)

    # Invitation details
    invited_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='share_invitations'
    )
    invited_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sent_invitations'
    )

    # Resource
    resource_type = models.CharField(max_length=20)
    resource_id = models.UUIDField()
    resource_name = models.CharField(max_length=500)

    # Permission offered
    permission_level = models.CharField(max_length=20)

    # Invitation metadata
    message = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    # Timestamps
    invited_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    # Requires acknowledgement for highly confidential docs
    requires_acknowledgement = models.BooleanField(default=False)
    acknowledgement_text = models.TextField(blank=True)

    class Meta:
        db_table = 'share_invitations'
        ordering = ['-invited_at']
```

---

## API Design

### Endpoints

```yaml
# Shared with Me API

# Core Endpoints
GET /api/v1/shared-with-me/
  description: Get all items shared with current user
  parameters:
    - resource_type: string (optional) - Filter by DOCUMENT/FOLDER
    - shared_by: uuid (optional) - Filter by sharer
    - permission_level: string (optional) - Filter by permission
    - date_from: date (optional) - Shared after date
    - date_to: date (optional) - Shared before date
    - is_shortcut: boolean (optional) - Only shortcuts
    - is_external: boolean (optional) - Only external shares
    - search: string (optional) - Search query
    - ordering: string (default: -shared_at) - Sort order
    - limit: integer (default: 50)
    - offset: integer (default: 0)
  response:
    shortcuts: [...] # Pinned items
    items: [...] # Regular items grouped by time
    stats:
      total: integer
      unread: integer
      documents: integer
      folders: integer

GET /api/v1/shared-with-me/{id}/
  description: Get details of a shared item
  response: SharedItemAccess with full details

POST /api/v1/shared-with-me/{id}/shortcut/
  description: Add/remove item from shortcuts
  body: { is_shortcut: boolean, order?: integer }
  response: { success: true, is_shortcut: boolean }

POST /api/v1/shared-with-me/{id}/hide/
  description: Hide an item from the list
  response: { success: true }

POST /api/v1/shared-with-me/{id}/access/
  description: Record access to shared item
  body: { access_type: "view" | "download" }
  response: { success: true }

DELETE /api/v1/shared-with-me/{id}/leave/
  description: Remove yourself from a share (leave shared folder)
  response: { success: true }

# Share Invitations
GET /api/v1/shared-with-me/invitations/
  description: Get pending share invitations
  response: List of ShareInvitation

POST /api/v1/shared-with-me/invitations/{id}/accept/
  description: Accept a share invitation
  body: { acknowledged?: boolean }
  response: { success: true, shared_item: SharedItemAccess }

POST /api/v1/shared-with-me/invitations/{id}/decline/
  description: Decline a share invitation
  body: { reason?: string }
  response: { success: true }

# Access Request
POST /api/v1/shared-with-me/{id}/request-access/
  description: Request higher permission level
  body: { requested_permission: string, reason: string }
  response: { success: true, request_id: uuid }

# Statistics
GET /api/v1/shared-with-me/stats/
  description: Get sharing statistics
  response:
    total_shared: integer
    by_permission: { view: n, edit: n, ... }
    by_type: { document: n, folder: n }
    by_sharer: [{ user: {...}, count: n }]
    recent_count: integer (last 7 days)

# Sharing (for document owners)
POST /api/v1/documents/{id}/share/
  description: Share a document with users
  body:
    recipients: [{ user_id: uuid, permission: string }]
    message: string (optional)
    notify: boolean (default: true)
    expires_at: datetime (optional)
    require_acknowledgement: boolean (default: false)
  response: { success: true, shares: [...] }

GET /api/v1/documents/{id}/shared-with/
  description: Get list of users document is shared with
  response: List of SharedItemAccess
```

---

## Frontend Components

### Page Structure

```
SharedWithMePage/
├── SharedWithMeHeader
│   ├── PageTitle ("Shared with Me")
│   ├── SearchInput
│   └── ViewToggle (List/Grid)
│
├── SharedWithMeTabs
│   ├── AllTab (count badge)
│   ├── DocumentsTab (count badge)
│   ├── FoldersTab (count badge)
│   ├── PendingTab (count badge) - invitations
│   └── ExternalTab (count badge) - external shares
│
├── SharedWithMeFilters
│   ├── OwnerFilter (dropdown with avatars)
│   ├── PermissionFilter (View/Edit/Comment/Full)
│   ├── DateFilter (Today/Week/Month/Custom)
│   └── ClearFilters button
│
├── SharedWithMeContent
│   ├── ShortcutsSection (if any shortcuts)
│   │   └── ShortcutGrid (draggable for reordering)
│   │
│   └── TimeGroupedList
│       ├── TodaySection
│       │   └── SharedItemRow[]
│       ├── ThisWeekSection
│       │   └── SharedItemRow[]
│       └── EarlierSection
│           └── SharedItemRow[]
│
├── SharedItemRow
│   ├── FileIcon (with type indicator)
│   ├── ItemInfo
│   │   ├── Name
│   │   ├── SharedBy (avatar + name)
│   │   ├── SharedDate (relative time)
│   │   └── PermissionBadge
│   ├── HoverActions
│   │   ├── OpenButton
│   │   ├── DownloadButton (if allowed)
│   │   ├── ShortcutButton (pin/unpin)
│   │   └── MoreButton (context menu)
│   └── ContextMenu
│       ├── Open
│       ├── Download
│       ├── Add to Shortcuts / Remove
│       ├── Copy Link
│       ├── View Details
│       ├── Request Edit Access (if view-only)
│       ├── Leave / Remove Access
│       └── Hide from List
│
└── SharedWithMeEmptyState
    ├── IllustrationIcon
    ├── Title ("Nothing shared with you yet")
    └── Description
```

### Key UI Components

```typescript
// Types
interface SharedItem {
  id: string
  resourceType: 'DOCUMENT' | 'FOLDER'
  resourceId: string
  resourceName: string
  fileType?: string
  fileSize?: number
  folderPath?: string
  confidentialityLevel: string
  permissionLevel: 'VIEW' | 'COMMENT' | 'EDIT' | 'FULL'
  shareSource: 'DIRECT' | 'FOLDER_INHERITED' | 'DEPARTMENT' | 'TEAM'
  sharedBy: {
    id: string
    firstName: string
    lastName: string
    email: string
    avatar?: string
    isExternal: boolean
  }
  sharedAt: string
  expiresAt?: string
  message?: string
  isShortcut: boolean
  shortcutOrder?: number
  firstViewedAt?: string
  lastAccessedAt?: string
  accessCount: number
  isAcknowledged: boolean
}

interface ShareInvitation {
  id: string
  resourceType: string
  resourceId: string
  resourceName: string
  permissionLevel: string
  invitedBy: User
  invitedAt: string
  expiresAt?: string
  message?: string
  requiresAcknowledgement: boolean
  acknowledgementText?: string
}
```

---

## Implementation Phases

### Phase 1: Foundation (3-4 days) ✅ COMPLETED
- [x] Create `SharedItemAccess` model
- [x] Create `ShareInvitation` model
- [x] Create database migrations
- [x] Create serializers
- [x] Implement core API endpoints (GET, shortcuts, hide)
- [x] Add share tracking signals (when documents/folders are shared)

### Phase 2: Frontend Core (4-5 days)
- [ ] Create `SharedWithMePage.tsx`
- [ ] Create `sharedWithMeService.ts` API client
- [ ] Build tabs component (All, Documents, Folders, Pending, External)
- [ ] Create filter components (Owner, Permission, Date)
- [ ] Build time-grouped list view
- [ ] Add shortcuts section with drag-and-drop reorder
- [ ] Implement row actions (context menu)
- [ ] Add route configuration (`/shared`)
- [ ] Update sidebar navigation (add to Smart Folders)

### Phase 3: Sharing Flow (3-4 days)
- [ ] Create share dialog/modal for documents
- [ ] Implement user search/autocomplete
- [ ] Add permission level selector
- [ ] Implement share invitations (accept/decline)
- [ ] Add acknowledgement flow for confidential docs
- [ ] Create "Request Access" feature

### Phase 4: Notifications & Polish (2-3 days)
- [ ] Implement real-time notifications for new shares
- [ ] Add email notifications (configurable)
- [ ] Create weekly digest email
- [ ] Add badge count to sidebar
- [ ] Loading states and empty states
- [ ] Grid view option
- [ ] Dark mode support
- [ ] Testing and bug fixes

---

## Notification System

### Real-Time Notifications

| Event | In-App | Email | Push |
|-------|--------|-------|------|
| New document shared | Toast + Badge | Immediate | Optional |
| New folder shared | Toast + Badge | Immediate | Optional |
| Permission changed | Toast | No | No |
| Share revoked | Toast | No | No |
| Comment on shared doc | Toast | If subscribed | Optional |
| Share expiring (24h) | Toast | Yes | No |
| Weekly digest | No | Yes | No |

### Notification Preferences (User Settings)

```yaml
notifications:
  shared_with_me:
    in_app: true  # Always on
    email_immediate: true
    email_digest: weekly  # none, daily, weekly
    push: false
```

---

## Security Considerations

### Access Control
- All shared items respect the original document/folder permissions
- Users can only see items explicitly shared with them
- Permission inheritance follows folder hierarchy
- Revoked shares immediately remove access

### Audit Trail
- All share actions logged (create, access, modify, revoke)
- Access tracking for compliance reporting
- Exportable audit reports

### Confidentiality
- Highly Confidential documents require explicit acknowledgement
- Watermarks applied to downloaded confidential documents
- External shares clearly marked and monitored

### Data Protection
- Share expiration enforced server-side
- Inactive shares auto-archived after 90 days
- GDPR-compliant data export/deletion

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Time to find shared document | < 5 seconds |
| Shared with Me usage rate | > 70% of active users |
| Shortcut adoption | > 40% of users |
| Notification open rate | > 50% |
| Share invitation response rate | > 90% within 24h |
| User satisfaction | > 4.2/5.0 |

---

## Competitive Advantages

1. **Unified View** - Unlike Google Drive/OneDrive, we combine document and folder shares in one view with clear distinction
2. **Enterprise-Grade Permissions** - 4-level permission model with inheritance tracking
3. **Compliance-First** - Built-in acknowledgement for confidential documents
4. **Smart Shortcuts** - Personalized quick access with drag-and-drop ordering
5. **Activity Insights** - Know when shared items were modified (not just shared date)
6. **External Share Awareness** - Dedicated tab for items from external parties
7. **Access Request Workflow** - Streamlined process to request higher permissions

---

## Dependencies

### Backend
- Existing `Share` model (for external link sharing)
- `Document` and `Folder` models
- User authentication system
- Notification infrastructure
- Celery for async tasks (notifications, digests)

### Frontend
- React with TypeScript
- Existing component library (buttons, badges, tooltips)
- Context menu component (already built)
- Toast notification system
- Date/time utilities

---

## References

- [Google Drive Shared with Me](https://support.google.com/drive/answer/2375057)
- [OneDrive/SharePoint Best Practices](https://www.it.northwestern.edu/about/it-projects/box-transition/migration-overview/tips.html)
- [Dropbox File Permissions](https://www.dropbox.com/features/share/file-permissions)
- [SharePoint Collaboration Features](https://www.6sc.com/boosting-collaboration-with-sharepoints-enhanced-features/)

---

**Document Version**: 1.0
**Author**: Claude (AI Assistant)
**Review Status**: Pending Approval
