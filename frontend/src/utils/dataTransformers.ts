/**
 * Data Transformers
 * Transform data between backend (snake_case) and frontend (camelCase) formats
 */

import type { Folder } from '@/types/folder'

/**
 * Transform backend folder response to frontend format
 */
export function transformFolderFromBackend(backendFolder: any): Folder {
  return {
    id: backendFolder.id,
    name: backendFolder.name,
    parentId: backendFolder.parent || null,
    path: backendFolder.path,
    depth: backendFolder.depth || 0,

    // Transform confidentiality level
    confidentiality: transformConfidentialityFromBackend(backendFolder.confidentiality_level),

    // Metadata
    description: backendFolder.description || '',
    isLocked: backendFolder.is_locked || false,
    documentCount: backendFolder.document_count || backendFolder.children_count || 0,

    // Timestamps
    createdAt: backendFolder.created_at,
    modifiedAt: backendFolder.updated_at || backendFolder.created_at,

    // User and department info
    owner: backendFolder.owner?.username || backendFolder.owner?.id?.toString() || '',
    createdBy: backendFolder.created_by?.username || backendFolder.created_by?.id?.toString() || '',
    department: backendFolder.department?.name || backendFolder.department?.id?.toString() || '',

    // Children
    hasChildren:
      backendFolder.children_count > 0 ||
      (backendFolder.children && backendFolder.children.length > 0),
    children: backendFolder.children ? backendFolder.children.map(transformFolderFromBackend) : [],

    // Permissions (default to true if not provided - backend should provide these)
    permissions: {
      canView: backendFolder.permissions?.can_view ?? true,
      canEdit: backendFolder.permissions?.can_edit ?? true,
      canDelete: backendFolder.permissions?.can_delete ?? true,
      canManage: backendFolder.permissions?.can_manage ?? true,
    },
  }
}

/**
 * Transform frontend folder data to backend format
 */
export function transformFolderToBackend(frontendFolder: Partial<Folder>): any {
  const backendData: any = {}

  if (frontendFolder.name !== undefined) {
    backendData.name = frontendFolder.name
  }

  if (frontendFolder.parentId !== undefined) {
    backendData.parent_id = frontendFolder.parentId
  }

  if (frontendFolder.confidentiality !== undefined) {
    backendData.confidentiality = transformConfidentialityToBackend(frontendFolder.confidentiality)
  }

  if (frontendFolder.description !== undefined) {
    backendData.description = frontendFolder.description
  }

  if (frontendFolder.isLocked !== undefined) {
    backendData.is_locked = frontendFolder.isLocked
  }

  return backendData
}

/**
 * Transform confidentiality level from backend to frontend
 */
function transformConfidentialityFromBackend(backendLevel: string): string {
  const mapping: Record<string, string> = {
    PUBLIC: 'public',
    INTERNAL: 'internal',
    CONFIDENTIAL: 'confidential',
    HIGHLY_CONFIDENTIAL: 'highly_confidential',
  }
  return mapping[backendLevel] || 'internal'
}

/**
 * Transform confidentiality level from frontend to backend
 */
function transformConfidentialityToBackend(frontendLevel: string): string {
  const mapping: Record<string, string> = {
    public: 'PUBLIC',
    internal: 'INTERNAL',
    confidential: 'CONFIDENTIAL',
    highly_confidential: 'HIGHLY_CONFIDENTIAL',
  }
  return mapping[frontendLevel] || 'INTERNAL'
}

/**
 * Transform multiple folders from backend
 */
export function transformFoldersFromBackend(backendFolders: any): Folder[] {
  // Handle different response formats
  if (!backendFolders) {
    return []
  }

  // If it's already an array, transform it
  if (Array.isArray(backendFolders)) {
    return backendFolders.map(transformFolderFromBackend)
  }

  // If it's a paginated response with 'results' key
  if (backendFolders.results && Array.isArray(backendFolders.results)) {
    return backendFolders.results.map(transformFolderFromBackend)
  }

  // If it's a single object wrapped in data/folders key
  if (backendFolders.data && Array.isArray(backendFolders.data)) {
    return backendFolders.data.map(transformFolderFromBackend)
  }

  if (backendFolders.folders && Array.isArray(backendFolders.folders)) {
    return backendFolders.folders.map(transformFolderFromBackend)
  }

  // If it's a single folder object, wrap in array
  if (backendFolders.id) {
    return [transformFolderFromBackend(backendFolders)]
  }

  // Fallback: return empty array
  console.error('Unexpected backend response format:', backendFolders)
  return []
}

/**
 * Handle API errors and extract error messages
 */
export function extractErrorMessage(error: any): string {
  if (error.response?.data) {
    const data = error.response.data

    // Check for various error message formats
    if (typeof data === 'string') {
      return data
    }

    if (data.error) {
      return data.error
    }

    if (data.detail) {
      return data.detail
    }

    if (data.message) {
      return data.message
    }

    // Handle validation errors (field-specific errors)
    if (typeof data === 'object') {
      const firstKey = Object.keys(data)[0]
      if (firstKey && Array.isArray(data[firstKey])) {
        return `${firstKey}: ${data[firstKey][0]}`
      }
    }
  }

  if (error.message) {
    return error.message
  }

  return 'An unexpected error occurred'
}

/**
 * Transform folder template from backend
 */
export function transformFolderTemplateFromBackend(backendTemplate: any): any {
  return {
    id: backendTemplate.id,
    name: backendTemplate.name,
    description: backendTemplate.description,
    structure: backendTemplate.structure,
    department: backendTemplate.department?.name || null,
    isActive: backendTemplate.is_active,
    createdAt: backendTemplate.created_at,
  }
}
