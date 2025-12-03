# Search API Specification

## Overview
This document specifies the REST API endpoints required for the Global Search feature. The frontend implementation is complete and ready to integrate with these backend endpoints.

## Base URL
All endpoints are prefixed with: `/api/v1/search/`

---

## Endpoints

### 1. Full Search
**Endpoint:** `POST /api/v1/search/`

**Description:** Performs a full search with filters, sorting, and pagination.

**Request Body:**
```json
{
  "query": "Q4 budget",
  "mode": "simple",  // "simple" | "advanced" | "saved"
  "scope": "all",    // "all" | "folder" | "department"
  "folder_id": null,
  "department_id": null,
  "filters": {
    "documentTypes": ["pdf", "docx"],
    "confidentialityLevels": ["Internal", "Confidential"],
    "departments": ["Accounting", "Finance"],
    "dateRange": {
      "from": "2024-01-01",
      "to": "2024-12-31"
    },
    "createdDateRange": {
      "from": "2024-01-01",
      "to": "2024-12-31"
    },
    "modifiedDateRange": {
      "from": "2024-01-01",
      "to": "2024-12-31"
    },
    "tags": ["budget", "quarterly"],
    "createdBy": ["user-id-1", "user-id-2"],
    "fileSize": {
      "min": 0,
      "max": 10485760  // 10MB in bytes
    },
    "hasAttachments": true,
    "isShared": true,
    "isLocked": false
  },
  "sort_by": "relevance",  // "relevance" | "name" | "date" | "size" | "modified"
  "sort_order": "desc",    // "asc" | "desc"
  "page": 1,
  "page_size": 20
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "result-1",
      "documentId": "doc-001",
      "fileName": "Q4_Budget_2024.pdf",
      "filePath": "/Accounting/Budget/2024",
      "fileSize": 2547896,
      "mimeType": "application/pdf",
      "extension": "pdf",
      "score": 95.5,
      "highlights": [
        {
          "field": "content",
          "snippet": "Quarterly budget allocation...",
          "matches": [
            { "text": "Q4 ", "isMatch": true },
            { "text": "budget", "isMatch": true },
            { "text": " allocation for 2024", "isMatch": false }
          ]
        }
      ],
      "thumbnailUrl": "https://...",
      "createdAt": "2024-10-15T10:30:00Z",
      "modifiedAt": "2024-11-20T14:20:00Z",
      "createdBy": "John Doe",
      "modifiedBy": "Jane Smith",
      "confidentialityLevel": "Confidential",
      "isShared": true,
      "isLocked": false,
      "hasVersions": true,
      "currentVersion": 3,
      "permissions": {
        "canView": true,
        "canEdit": false,
        "canDelete": false,
        "canDownload": true,
        "canShare": false
      }
    }
  ],
  "totalCount": 145,
  "page": 1,
  "pageSize": 20,
  "totalPages": 8,
  "facets": {
    "documentTypes": {
      "pdf": 89,
      "docx": 34,
      "xlsx": 22
    },
    "departments": {
      "Accounting": 56,
      "Finance": 43,
      "IT": 12
    }
  }
}
```

---

### 2. Quick Search
**Endpoint:** `GET /api/v1/search/quick/`

**Description:** Lightweight search for command palette. Returns top 10 results, no heavy filtering.

**Query Parameters:**
- `q` (required): Search query string

**Example:** `GET /api/v1/search/quick/?q=budget`

**Response:**
```json
{
  "results": [
    {
      "id": "result-1",
      "documentId": "doc-001",
      "fileName": "Q4_Budget_2024.pdf",
      "filePath": "/Accounting/Budget/2024",
      "fileSize": 2547896,
      "mimeType": "application/pdf",
      "extension": "pdf",
      "score": 95.5,
      "highlights": [
        {
          "field": "filename",
          "snippet": "Q4_Budget_2024.pdf",
          "matches": [
            { "text": "Q4_", "isMatch": false },
            { "text": "Budget", "isMatch": true },
            { "text": "_2024.pdf", "isMatch": false }
          ]
        }
      ],
      "createdAt": "2024-10-15T10:30:00Z",
      "modifiedAt": "2024-11-20T14:20:00Z",
      "createdBy": "John Doe",
      "confidentialityLevel": "Confidential",
      "permissions": {
        "canView": true,
        "canEdit": false,
        "canDelete": false,
        "canDownload": true,
        "canShare": false
      }
    }
    // ... up to 10 results
  ]
}
```

---

### 3. Autocomplete Suggestions
**Endpoint:** `GET /api/v1/search/suggestions/`

**Description:** Returns autocomplete suggestions based on partial query.

**Query Parameters:**
- `q` (required): Partial search query

**Example:** `GET /api/v1/search/suggestions/?q=bud`

**Response:**
```json
{
  "suggestions": [
    {
      "text": "budget",
      "type": "keyword",  // "keyword" | "document" | "tag" | "department" | "user"
      "score": 95,
      "metadata": {
        "description": "Found in 145 documents"
      }
    },
    {
      "text": "Budget_2024.pdf",
      "type": "document",
      "score": 88,
      "metadata": {
        "description": "Recent document",
        "documentId": "doc-123"
      }
    },
    {
      "text": "budget-planning",
      "type": "tag",
      "score": 75,
      "metadata": {
        "description": "Tag with 23 documents"
      }
    }
  ]
}
```

---

### 4. Recent Searches
**Endpoint:** `GET /api/v1/search/recent/`

**Description:** Returns recent searches for the current user.

**Response:**
```json
{
  "results": [
    {
      "id": "search-1",
      "query": "Q4 Budget",
      "executedAt": "2024-12-03T10:30:00Z",
      "resultCount": 45
    },
    {
      "id": "search-2",
      "query": "Contract templates",
      "executedAt": "2024-12-02T14:20:00Z",
      "resultCount": 12
    }
  ]
}
```

---

### 5. Save Recent Search
**Endpoint:** `POST /api/v1/search/recent/`

**Description:** Saves a search query to the user's recent searches.

**Request Body:**
```json
{
  "query": "Q4 Budget"
}
```

**Response:**
```json
{
  "id": "search-123",
  "query": "Q4 Budget",
  "executedAt": "2024-12-03T10:30:00Z",
  "message": "Search saved successfully"
}
```

---

### 6. Clear Recent Searches
**Endpoint:** `DELETE /api/v1/search/recent/`

**Description:** Clears all recent searches for the current user.

**Response:**
```json
{
  "message": "Recent searches cleared successfully"
}
```

---

### 7. Export Search Results
**Endpoint:** `POST /api/v1/search/export/`

**Description:** Exports search results to CSV or Excel format.

**Request Body:**
```json
{
  "query": "Q4 budget",
  "filters": {
    "documentTypes": ["pdf", "docx"],
    "dateRange": {
      "from": "2024-01-01",
      "to": "2024-12-31"
    }
  },
  "sort_by": "relevance",
  "sort_order": "desc",
  "format": "csv"  // "csv" | "excel"
}
```

**Response:**
- Content-Type: `text/csv` or `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- File download with search results

**CSV Format:**
```csv
File Name,Path,Size,Type,Created Date,Modified Date,Created By,Confidentiality
Q4_Budget_2024.pdf,/Accounting/Budget/2024,2547896,pdf,2024-10-15,2024-11-20,John Doe,Confidential
```

---

## Authentication
All endpoints require authentication via JWT Bearer token:
```
Authorization: Bearer <access_token>
```

---

## Permission Filtering
- All search results must be filtered based on user permissions
- Users should only see documents they have permission to view
- Respect folder-level permissions and inheritance
- Apply department-based access controls
- Honor confidentiality level restrictions

---

## Search Implementation Notes

### Elasticsearch Integration
1. **Index Structure:**
   - Document content (full-text)
   - Metadata (title, type, tags, etc.)
   - Path and hierarchy
   - Permissions (for filtering)
   - Timestamps

2. **Relevance Scoring:**
   - File name matches: highest weight
   - Metadata matches: medium weight
   - Content matches: lower weight
   - Recency boost for recent documents
   - User's department boost

3. **Highlighting:**
   - Return matched text snippets
   - Highlight matching terms
   - Provide context (surrounding text)

### Performance Requirements
- Quick search: < 200ms response time
- Full search: < 1 second response time
- Autocomplete: < 100ms response time
- Support 1000+ concurrent searches

### Security Requirements
- Filter results by user permissions
- Audit log all search queries
- Rate limiting: 100 requests/minute per user
- Sanitize search queries (prevent injection)

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid search query",
  "details": "Query parameter 'q' is required"
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required",
  "details": "Valid access token must be provided"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions",
  "details": "You do not have permission to access this resource"
}
```

### 500 Internal Server Error
```json
{
  "error": "Search service unavailable",
  "details": "Elasticsearch cluster is not responding"
}
```

---

## Testing Checklist

- [ ] Full search with no filters
- [ ] Full search with all filter types
- [ ] Pagination works correctly
- [ ] Sorting by all fields works
- [ ] Quick search returns top 10 results
- [ ] Autocomplete suggestions are relevant
- [ ] Recent searches are saved per user
- [ ] Recent searches can be cleared
- [ ] Export to CSV works
- [ ] Export to Excel works
- [ ] Permission filtering works correctly
- [ ] Users can't see restricted documents
- [ ] Search performance meets requirements
- [ ] Rate limiting works
- [ ] Error handling works correctly

---

## Frontend Integration Status

✅ **Complete and Ready**
- Search service client (`search.service.ts`)
- Global search command palette
- Full search results page
- Debounced input
- Autocomplete
- Recent searches
- Export functionality
- Responsive design

The frontend is production-ready and waiting for backend API implementation.
