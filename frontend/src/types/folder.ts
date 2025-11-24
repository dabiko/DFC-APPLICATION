/**
 * Folder Types
 * Type definitions for folder management system
 */

/**
 * Confidentiality levels for folders
 */
export type ConfidentialityLevel = 'public' | 'internal' | 'confidential' | 'highly_confidential'

/**
 * Folder permissions
 */
export interface FolderPermission {
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canShare: boolean
  canManage: boolean
}

/**
 * Base Folder interface
 */
export interface Folder {
  id: string
  name: string
  parentId: string | null
  path: string // Full path: /Documents/Financial/Reports
  level: number // Depth level (0 = root)
  isLocked: boolean
  confidentiality: ConfidentialityLevel
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
  childrenCount: number // Number of direct children
  documentCount: number // Number of documents in this folder
  hasChildren: boolean // Whether folder has subfolders
  children?: Folder[] // Nested children (for tree structure)
  isExpanded?: boolean // UI state (for tree expansion)
  isLoading?: boolean // UI state (for lazy loading)
  permissions: FolderPermission
}

/**
 * Flattened folder structure for virtualization
 */
export interface FlattenedFolder extends Folder {
  depth: number // Visual indent level
  isVisible: boolean // Whether currently visible in tree
  parentPath: string[] // Array of parent IDs for quick lookup
}

/**
 * Folder tree node for rendering
 */
export interface FolderTreeNode {
  folder: Folder
  depth: number
  isExpanded: boolean
  hasChildren: boolean
  isVisible: boolean
}

/**
 * Folder operation types
 */
export type FolderOperation = 'create' | 'rename' | 'move' | 'delete' | 'properties'

/**
 * Context menu item
 */
export interface ContextMenuItem {
  id: FolderOperation
  label: string
  icon?: React.ReactNode
  disabled?: boolean
  danger?: boolean
  divider?: boolean
}

/**
 * Folder creation data
 */
export interface CreateFolderData {
  name: string
  parentId: string | null
  confidentiality?: ConfidentialityLevel
  templateId?: string
}

/**
 * Folder update data
 */
export interface UpdateFolderData {
  name?: string
  confidentiality?: ConfidentialityLevel
  isLocked?: boolean
}

/**
 * Folder move data
 */
export interface MoveFolderData {
  folderId: string
  newParentId: string | null
  newPath: string
}

/**
 * Folder template
 */
export interface FolderTemplate {
  id: string
  name: string
  description: string
  structure: FolderTemplateStructure[]
  icon?: string
}

/**
 * Folder template structure (recursive)
 */
export interface FolderTemplateStructure {
  name: string
  children?: FolderTemplateStructure[]
}

/**
 * Folder tree props
 */
export interface FolderTreeProps {
  folders: Folder[]
  selectedFolderId?: string | null
  onFolderSelect?: (folder: Folder) => void
  onFolderExpand?: (folderId: string, expanded: boolean) => void
  onFolderOperation?: (operation: FolderOperation, folder: Folder) => void
  enableDragDrop?: boolean
  enableContextMenu?: boolean
  enableVirtualization?: boolean
  maxHeight?: number
  searchQuery?: string
  showIcons?: boolean
  showLockIndicator?: boolean
  showDocumentCount?: boolean
  showConfidentiality?: boolean
}

/**
 * Drag and drop data
 */
export interface FolderDragData {
  folderId: string
  folderName: string
  folderPath: string
  sourceParentId: string | null
}

/**
 * Drop result
 */
export interface FolderDropResult {
  targetFolderId: string
  targetFolderPath: string
  canDrop: boolean
  reason?: string
}

/**
 * Folder filter options
 */
export interface FolderFilterOptions {
  searchQuery?: string
  confidentiality?: ConfidentialityLevel[]
  isLocked?: boolean
  parentId?: string | null
  hasDocuments?: boolean
}

/**
 * Folder sort options
 */
export type FolderSortBy = 'name' | 'createdAt' | 'modifiedAt' | 'documentCount'
export type FolderSortOrder = 'asc' | 'desc'

export interface FolderSortOptions {
  sortBy: FolderSortBy
  sortOrder: FolderSortOrder
}

/**
 * Breadcrumb item
 */
export interface BreadcrumbItem {
  id: string
  name: string
  path: string
  isClickable: boolean
}
