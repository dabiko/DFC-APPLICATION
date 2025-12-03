/**
 * Department Service
 * API service for department operations in Department-as-Root architecture
 */

import api from './apiClient'
import type {
  Department,
  DepartmentSettings,
  CrossDepartmentAccess,
  CrossDepartmentAccessRequest,
  DepartmentNavigationItem,
  CreateDepartmentData,
  UpdateDepartmentData,
  CreateAccessRequestData,
  GrantAccessData,
  ReviewAccessRequestData,
  DepartmentStats,
  DepartmentRole,
  DepartmentFilterOptions,
  DepartmentSortOptions,
} from '@/types/department'

/**
 * Transform department from backend format
 */
function transformDepartmentFromBackend(data: any): Department {
  return {
    id: data.id,
    name: data.name,
    code: data.code,
    description: data.description || '',
    parentId: data.parent || null,
    organizationId: data.organization,
    organizationName: data.organization_name || null,
    isActive: data.is_active ?? true,
    storageQuotaGb: data.storage_quota_gb || 100,
    storageUsedBytes: data.storage_used_bytes || 0,
    storageUsedGb: data.storage_used_gb || 0,
    storagePercentUsed: data.storage_percent_used || 0,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    children: data.children ? data.children.map(transformDepartmentFromBackend) : [],
    hasChildren: data.has_children || (data.children && data.children.length > 0) || false,
    userCount: data.user_count || 0,
    folderCount: data.folder_count || 0,
  }
}

/**
 * Transform cross-department access from backend
 */
function transformAccessFromBackend(data: any): CrossDepartmentAccess {
  return {
    id: data.id,
    userId: data.user,
    userName: data.user_name || data.user_details?.full_name || '',
    userEmail: data.user_email || data.user_details?.email || '',
    departmentId: data.department,
    departmentName: data.department_name || data.department_details?.name || '',
    departmentCode: data.department_code || data.department_details?.code || '',
    roleId: data.role,
    roleName: data.role_name || data.role_details?.name || '',
    reason: data.reason || '',
    grantedById: data.granted_by,
    grantedByName: data.granted_by_name || '',
    grantedAt: data.granted_at || data.created_at,
    expiresAt: data.expires_at || null,
    isActive: data.is_active ?? true,
    isExpired: data.is_expired || false,
  }
}

/**
 * Transform access request from backend
 */
function transformAccessRequestFromBackend(data: any): CrossDepartmentAccessRequest {
  return {
    id: data.id,
    requesterId: data.requester,
    requesterName: data.requester_name || data.requester_details?.full_name || '',
    requesterEmail: data.requester_email || data.requester_details?.email || '',
    departmentId: data.department,
    departmentName: data.department_name || data.department_details?.name || '',
    departmentCode: data.department_code || data.department_details?.code || '',
    requestedRoleId: data.requested_role,
    requestedRoleName: data.requested_role_name || data.role_details?.name || '',
    reason: data.reason || '',
    status: data.status,
    reviewedById: data.reviewed_by || null,
    reviewedByName: data.reviewed_by_name || null,
    reviewedAt: data.reviewed_at || null,
    reviewNotes: data.review_notes || null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

/**
 * Transform navigation item from backend
 * Backend returns flat structure with department fields + access fields
 */
function transformNavigationItemFromBackend(data: any): DepartmentNavigationItem {
  // Backend returns flat structure - department fields are at root level
  // along with access_type, is_accessible, granted_role
  return {
    department: transformDepartmentFromBackend(data.department || data),
    isAccessible: data.is_accessible ?? true,
    accessType: data.access_type || 'own',
    grantedRole: data.granted_role || data.role_name || null,
    folderCount: data.folder_count || data.department?.folder_count || 0,
  }
}

/**
 * Transform role from backend
 */
function transformRoleFromBackend(data: any): DepartmentRole {
  return {
    id: data.id,
    name: data.name,
    displayName: data.display_name || data.name,
    canView: data.can_view ?? false,
    canDownload: data.can_download ?? false,
    canUpload: data.can_upload ?? false,
    canEdit: data.can_edit ?? false,
    canDelete: data.can_delete ?? false,
    canShare: data.can_share ?? false,
    canManage: data.can_manage ?? false,
  }
}

/**
 * Department Service API
 */
export const departmentService = {
  /**
   * Get all departments (admin view)
   */
  getDepartments: async (
    filters?: DepartmentFilterOptions,
    sort?: DepartmentSortOptions
  ): Promise<Department[]> => {
    const params: Record<string, any> = {}

    if (filters) {
      if (filters.searchQuery) params.search = filters.searchQuery
      if (filters.isActive !== undefined) params.is_active = filters.isActive
      if (filters.organizationId) params.organization = filters.organizationId
      if (filters.hasAccess !== undefined) params.has_access = filters.hasAccess
    }

    if (sort) {
      params.sort_by = sort.sortBy
      params.sort_order = sort.sortOrder
    }

    const response = await api.get<any[]>('/dept/departments/', { params })
    const data = Array.isArray(response.data) ? response.data : response.data.results || []
    return data.map(transformDepartmentFromBackend)
  },

  /**
   * Get department navigation (accessible departments for current user)
   */
  getNavigation: async (): Promise<DepartmentNavigationItem[]> => {
    const response = await api.get<any[]>('/dept/departments/navigation/')
    const data = Array.isArray(response.data) ? response.data : response.data.results || []
    return data.map(transformNavigationItemFromBackend)
  },

  /**
   * Get department by ID
   */
  getDepartmentById: async (departmentId: number | string): Promise<Department> => {
    const response = await api.get<any>(`/dept/departments/${departmentId}/`)
    return transformDepartmentFromBackend(response.data)
  },

  /**
   * Get department settings
   */
  getDepartmentSettings: async (departmentId: number | string): Promise<DepartmentSettings> => {
    const response = await api.get<any>(`/dept/departments/${departmentId}/settings/`)
    return {
      id: response.data.id,
      departmentId: response.data.department,
      defaultRetentionDays: response.data.default_retention_days || 2555,
      autoCreateStructure: response.data.auto_create_structure || false,
      defaultFolderTemplate: response.data.default_folder_template || null,
      allowCrossDepartmentAccess: response.data.allow_cross_department_access ?? true,
      requireApprovalForAccess: response.data.require_approval_for_access ?? false,
      maxFolderDepth: response.data.max_folder_depth || 10,
      createdAt: response.data.created_at,
      updatedAt: response.data.updated_at,
    }
  },

  /**
   * Get department statistics
   */
  getDepartmentStats: async (departmentId: number | string): Promise<DepartmentStats> => {
    const response = await api.get<any>(`/dept/departments/${departmentId}/stats/`)
    return {
      departmentId: response.data.department_id || departmentId,
      totalFolders: response.data.total_folders || 0,
      totalDocuments: response.data.total_documents || 0,
      totalUsers: response.data.total_users || 0,
      storageUsedBytes: response.data.storage_used_bytes || 0,
      storageUsedGb: response.data.storage_used_gb || 0,
      storageQuotaGb: response.data.storage_quota_gb || 100,
      storagePercentUsed: response.data.storage_percent_used || 0,
      activeAccessGrants: response.data.active_access_grants || 0,
      pendingAccessRequests: response.data.pending_access_requests || 0,
    }
  },

  /**
   * Get folders for a department
   */
  getDepartmentFolders: async (departmentId: number | string): Promise<any[]> => {
    const response = await api.get<any[]>(`/dept/departments/${departmentId}/folders/`)
    const data = Array.isArray(response.data) ? response.data : response.data.results || []
    // Use the folder transformer from dataTransformers
    const { transformFoldersFromBackend } = await import('@/utils/dataTransformers')
    return transformFoldersFromBackend(data)
  },

  /**
   * Create department (admin only)
   */
  createDepartment: async (data: CreateDepartmentData): Promise<Department> => {
    const response = await api.post<any>('/dept/departments/', {
      name: data.name,
      code: data.code,
      description: data.description || '',
      parent: data.parentId || null,
      storage_quota_gb: data.storageQuotaGb || 100,
    })
    return transformDepartmentFromBackend(response.data)
  },

  /**
   * Update department (admin only)
   */
  updateDepartment: async (
    departmentId: number | string,
    data: UpdateDepartmentData
  ): Promise<Department> => {
    const payload: Record<string, any> = {}
    if (data.name !== undefined) payload.name = data.name
    if (data.code !== undefined) payload.code = data.code
    if (data.description !== undefined) payload.description = data.description
    if (data.isActive !== undefined) payload.is_active = data.isActive
    if (data.storageQuotaGb !== undefined) payload.storage_quota_gb = data.storageQuotaGb

    const response = await api.patch<any>(`/dept/departments/${departmentId}/`, payload)
    return transformDepartmentFromBackend(response.data)
  },

  // ============ Cross-Department Access ============

  /**
   * Get active access grants for current user
   */
  getMyAccessGrants: async (): Promise<CrossDepartmentAccess[]> => {
    const response = await api.get<any[]>('/dept/access/')
    const data = Array.isArray(response.data) ? response.data : response.data.results || []
    return data.map(transformAccessFromBackend)
  },

  /**
   * Get access grants for a department (manager view)
   */
  getDepartmentAccessGrants: async (
    departmentId: number | string
  ): Promise<CrossDepartmentAccess[]> => {
    const response = await api.get<any[]>(`/dept/departments/${departmentId}/access-grants/`)
    const data = Array.isArray(response.data) ? response.data : response.data.results || []
    return data.map(transformAccessFromBackend)
  },

  /**
   * Grant cross-department access
   */
  grantAccess: async (data: GrantAccessData): Promise<CrossDepartmentAccess> => {
    const response = await api.post<any>('/dept/access/', {
      user: data.userId,
      department: data.departmentId,
      role: data.roleId,
      reason: data.reason,
      expires_at: data.expiresAt || null,
    })
    return transformAccessFromBackend(response.data)
  },

  /**
   * Revoke cross-department access
   */
  revokeAccess: async (accessId: number | string): Promise<void> => {
    await api.delete(`/dept/access/${accessId}/`)
  },

  /**
   * Update access grant
   */
  updateAccess: async (
    accessId: number | string,
    data: Partial<GrantAccessData>
  ): Promise<CrossDepartmentAccess> => {
    const payload: Record<string, any> = {}
    if (data.roleId !== undefined) payload.role = data.roleId
    if (data.reason !== undefined) payload.reason = data.reason
    if (data.expiresAt !== undefined) payload.expires_at = data.expiresAt

    const response = await api.patch<any>(`/dept/access/${accessId}/`, payload)
    return transformAccessFromBackend(response.data)
  },

  // ============ Access Requests ============

  /**
   * Get my pending access requests
   */
  getMyAccessRequests: async (): Promise<CrossDepartmentAccessRequest[]> => {
    const response = await api.get<any[]>('/dept/access-requests/my-requests/')
    const data = Array.isArray(response.data) ? response.data : response.data.results || []
    return data.map(transformAccessRequestFromBackend)
  },

  /**
   * Get pending requests for department (manager view)
   */
  getDepartmentAccessRequests: async (
    departmentId: number | string
  ): Promise<CrossDepartmentAccessRequest[]> => {
    const response = await api.get<any[]>(`/dept/departments/${departmentId}/access-requests/`)
    const data = Array.isArray(response.data) ? response.data : response.data.results || []
    return data.map(transformAccessRequestFromBackend)
  },

  /**
   * Create access request
   */
  createAccessRequest: async (
    data: CreateAccessRequestData
  ): Promise<CrossDepartmentAccessRequest> => {
    const response = await api.post<any>('/dept/access-requests/', {
      department: data.departmentId,
      requested_role: data.requestedRoleId,
      reason: data.reason,
    })
    return transformAccessRequestFromBackend(response.data)
  },

  /**
   * Review access request (approve/deny)
   */
  reviewAccessRequest: async (
    data: ReviewAccessRequestData
  ): Promise<CrossDepartmentAccess | null> => {
    const response = await api.post<any>(`/dept/access-requests/${data.requestId}/review/`, {
      status: data.status,
      review_notes: data.reviewNotes || '',
      role: data.roleId,
      expires_at: data.expiresAt || null,
    })

    // If approved, returns the created access grant
    if (data.status === 'approved' && response.data.access_grant) {
      return transformAccessFromBackend(response.data.access_grant)
    }
    return null
  },

  /**
   * Cancel my access request
   */
  cancelAccessRequest: async (requestId: number | string): Promise<void> => {
    await api.post(`/dept/access-requests/${requestId}/cancel/`)
  },

  // ============ Roles ============

  /**
   * Get available roles for department access
   */
  getRoles: async (): Promise<DepartmentRole[]> => {
    const response = await api.get<any[]>('/permissions/roles/')
    const data = Array.isArray(response.data) ? response.data : response.data.results || []
    return data.map(transformRoleFromBackend)
  },

  // ============ Utilities ============

  /**
   * Check if user can access department
   */
  canAccessDepartment: async (departmentId: number | string): Promise<boolean> => {
    try {
      const response = await api.get<any>(`/dept/departments/${departmentId}/can-access/`)
      return response.data.can_access ?? false
    } catch {
      return false
    }
  },

  /**
   * Get accessible departments list (simplified)
   */
  getAccessibleDepartments: async (): Promise<Department[]> => {
    const navigation = await departmentService.getNavigation()
    return navigation.filter((item) => item.isAccessible).map((item) => item.department)
  },
}

/**
 * Error handler helper
 */
export const handleDepartmentError = (error: any): string => {
  if (error.response?.data) {
    const data = error.response.data
    if (typeof data === 'string') return data
    if (data.message) return data.message
    if (data.detail) return data.detail
    if (data.error) return data.error
    // Handle validation errors
    if (typeof data === 'object') {
      const firstKey = Object.keys(data)[0]
      if (firstKey && Array.isArray(data[firstKey])) {
        return `${firstKey}: ${data[firstKey][0]}`
      }
    }
  }
  return error.message || 'An unexpected error occurred'
}

export default departmentService
