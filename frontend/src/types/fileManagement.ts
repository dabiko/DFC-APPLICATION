/**
 * File Management Types
 * Types for file lists, bulk operations, filtering, and sorting
 */

import type { DocumentMetadata } from './metadata'
import type { DocumentVersion } from './version'

/**
 * View Modes
 */
export type ViewMode = 'grid' | 'list'
export type SortOrder = 'asc' | 'desc'

/**
 * Sort Options
 */
export type SortField =
  | 'name'
  | 'type'
  | 'size'
  | 'dateModified'
  | 'dateCreated'
  | 'relevance'
  | 'confidentiality'

export interface SortOption {
  field: SortField
  order: SortOrder
  label: string
}

/**
 * Filter Options
 */
export interface FilterOptions {
  documentTypes?: string[]
  confidentialityLevels?: string[]
  departments?: string[]
  dateRange?: {
    from: string
    to: string
  }
  sizeRange?: {
    min: number
    max: number
  }
  tags?: string[]
  createdBy?: string[]
  hasVersions?: boolean
  isShared?: boolean
}

/**
 * File/Document List Item
 * Represents a file or folder in the file list
 */
export interface FileListItem {
  id: string
  name: string
  type: 'file' | 'folder'

  // File-specific properties (only if type === 'file')
  fileSize?: number
  mimeType?: string
  extension?: string
  thumbnailUrl?: string
  previewUrl?: string
  downloadUrl?: string

  // Folder-specific properties (only if type === 'folder')
  itemCount?: number
  hasSubfolders?: boolean

  // Common properties
  parentFolderId?: string
  path: string
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string

  // Metadata
  metadata?: DocumentMetadata

  // Access & Security
  confidentialityLevel: 'Public' | 'Internal' | 'Confidential' | 'Highly Confidential'
  permissions: {
    canView: boolean
    canEdit: boolean
    canDelete: boolean
    canShare: boolean
    canDownload: boolean
  }

  // Status indicators
  isShared: boolean
  isLocked: boolean
  hasVersions: boolean
  currentVersion?: number
  isFavorite?: boolean

  // Tags
  tags?: string[]
}

/**
 * Bulk Operation Types
 */
export type BulkOperationType =
  | 'move'
  | 'copy'
  | 'delete'
  | 'download'
  | 'share'
  | 'addTags'
  | 'removeTags'
  | 'changeConfidentiality'
  | 'archive'

export interface BulkOperation {
  type: BulkOperationType
  itemIds: string[]
  status: 'pending' | 'in_progress' | 'completed' | 'error'
  progress?: number
  error?: string
  result?: BulkOperationResult
}

export interface BulkOperationResult {
  successful: string[]
  failed: Array<{
    itemId: string
    error: string
  }>
  totalProcessed: number
  totalSuccess: number
  totalFailed: number
}

/**
 * Bulk Operation Payloads
 */
export interface BulkMovePayload {
  itemIds: string[]
  targetFolderId: string
}

export interface BulkCopyPayload {
  itemIds: string[]
  targetFolderId: string
}

export interface BulkDeletePayload {
  itemIds: string[]
  permanent?: boolean
}

export interface BulkDownloadPayload {
  itemIds: string[]
  archiveName?: string
}

export interface BulkSharePayload {
  itemIds: string[]
  recipients: Array<{
    userId?: string
    email?: string
    permission: 'view' | 'edit'
  }>
  expiresAt?: string
  message?: string
}

export interface BulkTagsPayload {
  itemIds: string[]
  tags: string[]
}

export interface BulkConfidentialityPayload {
  itemIds: string[]
  confidentialityLevel: 'Public' | 'Internal' | 'Confidential' | 'Highly Confidential'
}

/**
 * Selection State
 */
export interface SelectionState {
  selectedIds: Set<string>
  lastSelectedId?: string
  isAllSelected: boolean
  selectMode: 'none' | 'some' | 'all'
}

/**
 * File List State
 */
export interface FileListState {
  items: FileListItem[]
  viewMode: ViewMode
  sortBy: SortField
  sortOrder: SortOrder
  filters: FilterOptions
  selection: SelectionState
  isLoading: boolean
  error?: string
}

/**
 * Folder Breadcrumb
 */
export interface FolderBreadcrumb {
  id: string
  name: string
  path: string
}

/**
 * File Preview
 */
export interface FilePreview {
  documentId: string
  fileName: string
  fileSize: number
  mimeType: string
  previewUrl?: string
  downloadUrl: string
  metadata?: DocumentMetadata
  versions?: DocumentVersion[]
  canEdit: boolean
  canDelete: boolean
  canDownload: boolean
  canShare: boolean
}

/**
 * Component Props
 */

export interface FileListProps {
  items: FileListItem[]
  viewMode?: ViewMode
  sortBy?: SortField
  sortOrder?: SortOrder
  selectedIds?: Set<string>
  onItemClick?: (item: FileListItem) => void
  onItemDoubleClick?: (item: FileListItem) => void
  onSelectionChange?: (selectedIds: Set<string>) => void
  onSortChange?: (sortBy: SortField, sortOrder: SortOrder) => void
  onViewModeChange?: (viewMode: ViewMode) => void
  isLoading?: boolean
  emptyState?: React.ReactNode
  className?: string
}

export interface FileCardProps {
  item: FileListItem
  viewMode: ViewMode
  isSelected?: boolean
  onClick?: () => void
  onDoubleClick?: () => void
  onSelect?: (selected: boolean) => void
  onFavoriteToggle?: () => void
  showCheckbox?: boolean
  showActions?: boolean
  className?: string
}

export interface BulkActionToolbarProps {
  selectedCount: number
  selectedItems: FileListItem[]
  onMove?: (itemIds: string[]) => void
  onCopy?: (itemIds: string[]) => void
  onDelete?: (itemIds: string[]) => void
  onDownload?: (itemIds: string[]) => void
  onShare?: (itemIds: string[]) => void
  onAddTags?: (itemIds: string[]) => void
  onChangeConfidentiality?: (itemIds: string[]) => void
  onClearSelection?: () => void
  className?: string
}

export interface FilePreviewModalProps {
  preview: FilePreview | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (documentId: string) => void
  onDelete?: (documentId: string) => void
  onDownload?: (documentId: string) => void
  onShare?: (documentId: string) => void
  onVersionChange?: (versionId: string) => void
  isLoading?: boolean
}

export interface SortFilterBarProps {
  sortBy: SortField
  sortOrder: SortOrder
  filters: FilterOptions
  viewMode: ViewMode
  itemCount: number
  selectedCount?: number
  onSortChange: (sortBy: SortField, sortOrder: SortOrder) => void
  onFilterChange: (filters: FilterOptions) => void
  onViewModeChange: (viewMode: ViewMode) => void
  onClearFilters?: () => void
  showViewToggle?: boolean
  className?: string
}

/**
 * Utility Types
 */
export interface FileStatistics {
  totalFiles: number
  totalFolders: number
  totalSize: number
  filesByType: Record<string, number>
  filesByConfidentiality: Record<string, number>
}

/**
 * Constants
 */
export const SORT_OPTIONS: SortOption[] = [
  { field: 'name', order: 'asc', label: 'Name (A-Z)' },
  { field: 'name', order: 'desc', label: 'Name (Z-A)' },
  { field: 'dateModified', order: 'desc', label: 'Modified (Newest)' },
  { field: 'dateModified', order: 'asc', label: 'Modified (Oldest)' },
  { field: 'dateCreated', order: 'desc', label: 'Created (Newest)' },
  { field: 'dateCreated', order: 'asc', label: 'Created (Oldest)' },
  { field: 'size', order: 'desc', label: 'Size (Largest)' },
  { field: 'size', order: 'asc', label: 'Size (Smallest)' },
  { field: 'type', order: 'asc', label: 'Type (A-Z)' },
  { field: 'relevance', order: 'desc', label: 'Relevance' },
]

export const CONFIDENTIALITY_COLORS = {
  Public: 'gray',
  Internal: 'blue',
  Confidential: 'orange',
  'Highly Confidential': 'red',
} as const

export const CONFIDENTIALITY_ICONS = {
  Public: '🌐',
  Internal: '🏢',
  Confidential: '🔒',
  'Highly Confidential': '🔐',
} as const
