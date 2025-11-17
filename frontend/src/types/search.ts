/**
 * Search Types
 * Types for search functionality, filters, and results
 */

import type { DocumentMetadata } from './metadata'
import type { FileListItem } from './fileManagement'

/**
 * Search Query Types
 */
export type SearchMode = 'simple' | 'advanced' | 'saved'
export type SearchScope = 'all' | 'folder' | 'department'

/**
 * Search Query
 */
export interface SearchQuery {
  query: string
  mode: SearchMode
  scope: SearchScope
  folderId?: string
  departmentId?: string
  filters?: SearchFilters
  sortBy?: SearchSortField
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

/**
 * Search Filters
 */
export interface SearchFilters {
  // Document properties
  documentTypes?: string[]
  confidentialityLevels?: string[]
  departments?: string[]

  // Date filters
  dateRange?: {
    from: string
    to: string
  }
  createdDateRange?: {
    from: string
    to: string
  }
  modifiedDateRange?: {
    from: string
    to: string
  }

  // Size filters
  sizeRange?: {
    min: number
    max: number
  }

  // Tags and metadata
  tags?: string[]
  keywords?: string[]

  // Status filters
  hasVersions?: boolean
  isShared?: boolean
  isLocked?: boolean
  isFavorite?: boolean

  // Content filters
  fileTypes?: string[] // MIME types
  extensions?: string[]

  // User filters
  createdBy?: string[]
  modifiedBy?: string[]
  sharedWith?: string[]
}

/**
 * Sort Options
 */
export type SearchSortField =
  | 'relevance'
  | 'name'
  | 'dateCreated'
  | 'dateModified'
  | 'size'
  | 'type'

/**
 * Search Result
 */
export interface SearchResult {
  id: string
  documentId: string
  fileName: string
  filePath: string
  fileSize: number
  mimeType: string
  extension: string

  // Metadata
  metadata?: DocumentMetadata

  // Search relevance
  score: number // 0-100 relevance score
  highlights: SearchHighlight[]

  // Preview
  thumbnailUrl?: string
  previewUrl?: string

  // Timestamps
  createdAt: string
  modifiedAt: string
  createdBy: string
  modifiedBy: string

  // Status
  confidentialityLevel: 'Public' | 'Internal' | 'Confidential' | 'Highly Confidential'
  isShared: boolean
  isLocked: boolean
  hasVersions: boolean
  currentVersion?: number

  // Permissions
  permissions: {
    canView: boolean
    canEdit: boolean
    canDelete: boolean
    canDownload: boolean
    canShare: boolean
  }
}

/**
 * Search Highlight
 */
export interface SearchHighlight {
  field: string // 'content', 'filename', 'metadata'
  snippet: string // Text snippet with highlighted term
  matches: Array<{
    text: string
    isMatch: boolean
  }>
}

/**
 * Search Response
 */
export interface SearchResponse {
  query: SearchQuery
  results: SearchResult[]
  totalResults: number
  totalPages: number
  currentPage: number
  pageSize: number
  executionTime: number // milliseconds
  facets: SearchFacets
  suggestions?: SearchSuggestion[]
}

/**
 * Search Facets (for filtering)
 */
export interface SearchFacets {
  documentTypes: FacetCount[]
  confidentialityLevels: FacetCount[]
  departments: FacetCount[]
  fileTypes: FacetCount[]
  tags: FacetCount[]
  createdBy: FacetCount[]
  dateRanges: {
    lastDay: number
    lastWeek: number
    lastMonth: number
    lastYear: number
    older: number
  }
  sizeRanges: {
    tiny: number // < 100KB
    small: number // 100KB - 1MB
    medium: number // 1MB - 10MB
    large: number // 10MB - 100MB
    huge: number // > 100MB
  }
}

/**
 * Facet Count
 */
export interface FacetCount {
  value: string
  count: number
  label?: string
}

/**
 * Search Suggestion
 */
export interface SearchSuggestion {
  text: string
  type: 'query' | 'document' | 'tag' | 'department'
  score: number
  metadata?: {
    icon?: string
    description?: string
  }
}

/**
 * Saved Search
 */
export interface SavedSearch {
  id: string
  name: string
  description?: string
  query: SearchQuery
  createdAt: string
  updatedAt: string
  createdBy: string
  isPinned: boolean
  isShared: boolean
  sharedWith?: string[]
  resultCount?: number
  lastExecutedAt?: string
}

/**
 * Recent Search
 */
export interface RecentSearch {
  id: string
  query: string
  filters?: SearchFilters
  executedAt: string
  resultCount: number
}

/**
 * Search History
 */
export interface SearchHistory {
  recentSearches: RecentSearch[]
  savedSearches: SavedSearch[]
  popularSearches: Array<{
    query: string
    count: number
  }>
}

/**
 * Component Props
 */

export interface SearchBarProps {
  value?: string
  placeholder?: string
  onSearch: (query: string) => void
  onAdvancedSearch?: () => void
  showAdvancedButton?: boolean
  showSuggestions?: boolean
  suggestions?: SearchSuggestion[]
  recentSearches?: RecentSearch[]
  isLoading?: boolean
  autoFocus?: boolean
  className?: string
}

export interface AdvancedSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSearch: (query: SearchQuery) => void
  initialQuery?: Partial<SearchQuery>
  availableFolders?: Array<{ id: string; name: string; path: string }>
  availableDepartments?: Array<{ id: string; name: string }>
}

export interface SearchResultCardProps {
  result: SearchResult
  viewMode?: 'list' | 'grid'
  isSelected?: boolean
  onSelect?: (selected: boolean) => void
  onClick?: () => void
  onPreview?: () => void
  onDownload?: () => void
  showHighlights?: boolean
  className?: string
}

export interface SearchResultsListProps {
  results: SearchResult[]
  viewMode?: 'list' | 'grid'
  selectedIds?: Set<string>
  onSelectionChange?: (selectedIds: Set<string>) => void
  onResultClick?: (result: SearchResult) => void
  onResultPreview?: (result: SearchResult) => void
  isLoading?: boolean
  emptyState?: React.ReactNode
  className?: string
}

export interface SearchFiltersPanelProps {
  filters: SearchFilters
  facets?: SearchFacets
  onFilterChange: (filters: SearchFilters) => void
  onClearFilters?: () => void
  isCollapsible?: boolean
  defaultCollapsed?: boolean
  className?: string
}

export interface SavedSearchesProps {
  savedSearches: SavedSearch[]
  onExecute: (search: SavedSearch) => void
  onEdit?: (search: SavedSearch) => void
  onDelete?: (searchId: string) => void
  onShare?: (searchId: string) => void
  onPin?: (searchId: string, pinned: boolean) => void
  canManage?: boolean
  className?: string
}

export interface SearchPaginationProps {
  currentPage: number
  totalPages: number
  totalResults: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  className?: string
}

/**
 * Constants
 */
export const SEARCH_SORT_OPTIONS: Array<{
  field: SearchSortField
  label: string
}> = [
  { field: 'relevance', label: 'Relevance' },
  { field: 'name', label: 'Name (A-Z)' },
  { field: 'dateModified', label: 'Recently Modified' },
  { field: 'dateCreated', label: 'Recently Created' },
  { field: 'size', label: 'File Size' },
  { field: 'type', label: 'File Type' },
]

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

export const DEFAULT_SEARCH_QUERY: SearchQuery = {
  query: '',
  mode: 'simple',
  scope: 'all',
  sortBy: 'relevance',
  sortOrder: 'desc',
  page: 1,
  pageSize: 25,
}

export const FILE_SIZE_RANGES = {
  tiny: { min: 0, max: 100 * 1024, label: 'Tiny (< 100KB)' },
  small: { min: 100 * 1024, max: 1024 * 1024, label: 'Small (100KB - 1MB)' },
  medium: { min: 1024 * 1024, max: 10 * 1024 * 1024, label: 'Medium (1MB - 10MB)' },
  large: { min: 10 * 1024 * 1024, max: 100 * 1024 * 1024, label: 'Large (10MB - 100MB)' },
  huge: { min: 100 * 1024 * 1024, max: Infinity, label: 'Huge (> 100MB)' },
}

export const DATE_RANGE_PRESETS = [
  { label: 'Today', days: 0 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 3 months', days: 90 },
  { label: 'Last 6 months', days: 180 },
  { label: 'Last year', days: 365 },
]
