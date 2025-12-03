# Global Search - User Guide

## How to Use Global Search

### Opening the Search

**Method 1: Keyboard Shortcut**
- Press `Ctrl+K` (Windows/Linux) or `Cmd+K` (Mac) anywhere in the application
- The global search command palette will open

**Method 2: Click Search Button**
- Click the search button in the header (top-left area)
- Shows "Search..." text with ⌘K shortcut badge

### Quick Search (Command Palette)

The command palette provides instant search as you type:

1. **Type your query** - Results appear in real-time (300ms debounce)
2. **See suggestions** - Autocomplete suggestions based on your input
3. **View recent searches** - Your last searches appear when the search is empty
4. **Click a result** - Navigate directly to the document
5. **Press Enter** - Go to full search results page

**Features:**
- Shows top 10 results
- Highlights matching text
- Displays file type, size, and path
- Shows confidentiality level
- Indicates permissions (view, edit, download, etc.)

### Full Search Results Page

Press **Enter** in the command palette or navigate to `/search?q=your+query`:

**Search Bar:**
- Enter or modify your search query
- Search runs automatically

**Results Display:**
- Total count of matching documents
- List or Grid view toggle
- Each result shows:
  - File name and type
  - File path and size
  - Created/modified dates
  - Created by / Modified by
  - Confidentiality badge
  - Permission indicators
  - Highlighted matching text snippets

**Filters Panel:**
- Click "Filters" button to show/hide
- Filter by:
  - Document Type (PDF, Word, Excel, etc.)
  - Confidentiality Level
  - Department
  - Date Range (created, modified)
  - Tags
  - Created By
  - File Size
  - Shared status
  - Locked status

**View Modes:**
- **List View**: Detailed rows with all information
- **Grid View**: Compact cards for quick browsing

**Export:**
- Click "Export" button
- Downloads results as CSV file
- Includes all visible results with metadata

**Pagination:**
- 20 results per page
- Navigate with Previous/Next buttons
- Shows current page and total pages

### Recent Searches

Your recent searches are automatically saved and appear when you:
- Open the global search with empty query
- Click in the search bar

**Benefits:**
- Quick access to frequent searches
- See how many results each search returned
- Click to re-run the search
- Automatically cleared after 30 days (or configurable)

### Search Tips

**Basic Search:**
- Type words or phrases: `budget 2024`
- Search is case-insensitive
- Partial word matching supported

**Finding Specific Files:**
- Include file extension: `report.pdf`
- Use file name: `Q4_Budget`

**Date-Based Search:**
- Use filters for precise date ranges
- Recent documents show higher in results

**Department-Specific:**
- Filter by department to narrow results
- Only shows documents you have permission to view

**Confidentiality:**
- Filter by confidentiality level
- Results automatically filtered by your permissions

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `Cmd+K` | Open global search |
| `Esc` | Close search command palette |
| `Enter` | Go to full search results |
| `↑` `↓` | Navigate results (in command palette) |

### Mobile Usage

**Opening Search:**
- Tap search button in header
- OR use keyboard shortcut (if keyboard connected)

**Command Palette:**
- Same functionality as desktop
- Optimized touch interface
- Swipe to dismiss

**Search Results Page:**
- Hamburger menu for sidebar (top-left)
- Filters panel collapses automatically
- Swipe-friendly grid/list views
- Tap result to view document

### Permissions & Security

**What You Can See:**
- Only documents you have permission to view
- Results filtered by:
  - Your role and permissions
  - Department access
  - Confidentiality clearance
  - Folder-level permissions

**Audit Trail:**
- All searches are logged
- Admins can view search activity
- Helps track document access

**Privacy:**
- Recent searches are private to you
- Can be cleared anytime
- Not shared with other users

### Troubleshooting

**No Results Found:**
- Check spelling
- Try broader search terms
- Adjust or remove filters
- Verify you have permission to access the documents

**Slow Search:**
- Use more specific terms
- Apply filters to narrow results
- Quick search is faster than full search

**Can't Find a Document:**
- Verify document exists and isn't deleted
- Check if document is in Trash
- Confirm you have view permission
- Ask admin if document should be accessible

**Search Not Opening:**
- Refresh the page
- Check internet connection
- Clear browser cache
- Try alternative opening method (click vs keyboard)

### Best Practices

1. **Use Specific Terms**: More specific searches return better results
2. **Apply Filters**: Narrow down large result sets with filters
3. **Save Common Searches**: Smart Folders can save search criteria
4. **Export When Needed**: Use export for reporting or offline analysis
5. **Review Recent**: Use recent searches to avoid retyping

### Advanced Features (Coming Soon)

- **Boolean Operators**: AND, OR, NOT for complex queries
- **Wildcards**: Use `*` for partial matching
- **Saved Searches**: Save filters and criteria
- **Search Templates**: Pre-configured searches for common tasks
- **Search Alerts**: Get notified when new documents match criteria

---

## For Administrators

### Search Configuration

**Elasticsearch Settings:**
- Index refresh interval
- Relevance scoring weights
- Synonym mappings
- Stop words configuration

**Performance Tuning:**
- Cache settings
- Rate limiting
- Concurrent search limits
- Result page size limits

**Security Settings:**
- Permission filtering rules
- Audit log retention
- Search query sanitization
- Rate limiting per user/role

### Monitoring

**Search Analytics:**
- Most common queries
- Zero-result searches
- Slow searches
- Peak usage times
- Popular document types

**Performance Metrics:**
- Average search response time
- Quick search latency
- Full search latency
- Elasticsearch cluster health
- Index size and growth

### Maintenance

**Index Management:**
- Reindex documents when needed
- Update mappings for new fields
- Delete old indices
- Optimize index performance

**Data Cleanup:**
- Archive old search logs
- Clear orphaned recent searches
- Remove deleted documents from index
- Update document permissions in index

---

**Need Help?**
Contact IT Support or refer to the full documentation at `/docs/search`.
