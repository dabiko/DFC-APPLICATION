/**
 * Department Types
 * Type definitions for department management in Department-as-Root architecture
 */

/**
 * Department entity
 */
export interface Department {
  id: number | string
  name: string
  code: string
  description?: string
  parentId: number | string | null
  organizationId: number | string
  organizationName?: string
  isActive: boolean
  storageQuotaGb: number
  storageUsedBytes: number
  storageUsedGb?: number
  storagePercentUsed?: number
  createdAt: string
  updatedAt: string
  // Nested data
  children?: Department[]
  hasChildren?: boolean
  userCount?: number
  folderCount?: number
  // UI state
  isExpanded?: boolean
  isLoading?: boolean
}

/**
 * Department settings
 */
export interface DepartmentSettings {
  id: number | string
  departmentId: number | string
  defaultRetentionDays: number
  autoCreateStructure: boolean
  defaultFolderTemplate?: string | null
  allowCrossDepartmentAccess: boolean
  requireApprovalForAccess: boolean
  maxFolderDepth: number
  createdAt: string
  updatedAt: string
}

/**
 * Cross-department access grant
 */
export interface CrossDepartmentAccess {
  id: number | string
  userId: number | string
  userName?: string
  userEmail?: string
  departmentId: number | string
  departmentName?: string
  departmentCode?: string
  roleId: number | string
  roleName?: string
  reason: string
  grantedById: number | string
  grantedByName?: string
  grantedAt: string
  expiresAt?: string | null
  isActive: boolean
  // Computed
  isExpired?: boolean
}

/**
 * Cross-department access request
 */
export interface CrossDepartmentAccessRequest {
  id: number | string
  requesterId: number | string
  requesterName?: string
  requesterEmail?: string
  departmentId: number | string
  departmentName?: string
  departmentCode?: string
  requestedRoleId: number | string
  requestedRoleName?: string
  reason: string
  status: AccessRequestStatus
  reviewedById?: number | string | null
  reviewedByName?: string | null
  reviewedAt?: string | null
  reviewNotes?: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Access request status
 */
export type AccessRequestStatus = 'pending' | 'approved' | 'denied' | 'cancelled'

export const AccessRequestStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  DENIED: 'denied',
  CANCELLED: 'cancelled',
} as const

/**
 * Department navigation item (for sidebar)
 */
export interface DepartmentNavigationItem {
  department: Department
  isAccessible: boolean
  accessType: 'own' | 'granted' | 'admin' | 'none'
  grantedRole?: string
  folderCount?: number
}

/**
 * Create department data
 */
export interface CreateDepartmentData {
  name: string
  code: string
  description?: string
  parentId?: number | string | null
  storageQuotaGb?: number
}

/**
 * Update department data
 */
export interface UpdateDepartmentData {
  name?: string
  code?: string
  description?: string
  isActive?: boolean
  storageQuotaGb?: number
}

/**
 * Create cross-department access request
 */
export interface CreateAccessRequestData {
  departmentId: number | string
  requestedRoleId: number | string
  reason: string
}

/**
 * Grant cross-department access
 */
export interface GrantAccessData {
  userId: number | string
  departmentId: number | string
  roleId: number | string
  reason: string
  expiresAt?: string | null
}

/**
 * Review access request
 */
export interface ReviewAccessRequestData {
  requestId: number | string
  status: 'approved' | 'denied'
  reviewNotes?: string
  roleId?: number | string // Can override requested role when approving
  expiresAt?: string | null
}

/**
 * Department statistics
 */
export interface DepartmentStats {
  departmentId: number | string
  totalFolders: number
  totalDocuments: number
  totalUsers: number
  storageUsedBytes: number
  storageUsedGb: number
  storageQuotaGb: number
  storagePercentUsed: number
  activeAccessGrants: number
  pendingAccessRequests: number
}

/**
 * Department tree node (for hierarchical display)
 */
export interface DepartmentTreeNode {
  department: Department
  depth: number
  isExpanded: boolean
  hasChildren: boolean
  isVisible: boolean
  isAccessible: boolean
}

/**
 * Department filter options
 */
export interface DepartmentFilterOptions {
  searchQuery?: string
  isActive?: boolean
  organizationId?: number | string
  hasAccess?: boolean
}

/**
 * Department sort options
 */
export type DepartmentSortBy = 'name' | 'code' | 'createdAt' | 'storageUsed' | 'userCount'
export type DepartmentSortOrder = 'asc' | 'desc'

export interface DepartmentSortOptions {
  sortBy: DepartmentSortBy
  sortOrder: DepartmentSortOrder
}

/**
 * Department breadcrumb item
 */
export interface DepartmentBreadcrumbItem {
  id: number | string
  name: string
  code: string
  isClickable: boolean
}

/**
 * Role for department access
 */
export interface DepartmentRole {
  id: number | string
  name: string
  displayName?: string
  canView: boolean
  canDownload: boolean
  canUpload: boolean
  canEdit: boolean
  canDelete: boolean
  canShare: boolean
  canManage: boolean
}
