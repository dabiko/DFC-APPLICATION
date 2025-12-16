/**
 * Folder Service
 * API service for folder operations
 */

import axios from 'axios'
import api from './apiClient'
import type {
  Folder,
  CreateFolderData,
  UpdateFolderData,
  FolderFilterOptions,
  FolderSortOptions,
} from '@/types/folder'

/**
 * Folder Service API
 */
export const folderService = {
  /**
   * Get all folders
   */
  getFolders: async (
    filters?: FolderFilterOptions,
    sort?: FolderSortOptions
  ): Promise<Folder[]> => {
    const params: Record<string, any> = {}

    if (filters) {
      if (filters.searchQuery) params.search = filters.searchQuery
      if (filters.confidentiality) params.confidentiality = filters.confidentiality.join(',')
      if (filters.isLocked !== undefined) params.is_locked = filters.isLocked
      if (filters.parentId !== undefined) params.parent_id = filters.parentId
      if (filters.hasDocuments !== undefined) params.has_documents = filters.hasDocuments
    }

    if (sort) {
      params.sort_by = sort.sortBy
      params.sort_order = sort.sortOrder
    }

    const response = await api.get<any[]>('/folders/', { params })

    // Debug: Log the response to see what we're getting
    console.log('Folders API Response:', response.data)

    // Transform backend response to frontend format
    const { transformFoldersFromBackend } = await import('@/utils/dataTransformers')
    const transformed = transformFoldersFromBackend(response.data)
    console.log('Transformed folders:', transformed)
    return transformed
  },

  /**
   * Get folder by ID
   */
  getFolderById: async (folderId: string): Promise<Folder> => {
    const response = await api.get<any>(`/folders/${folderId}/`)
    const { transformFolderFromBackend } = await import('@/utils/dataTransformers')
    return transformFolderFromBackend(response.data)
  },

  /**
   * Get folder children
   */
  getFolderChildren: async (folderId: string): Promise<Folder[]> => {
    const response = await api.get<Folder[]>(`/folders/${folderId}/children/`)
    return response.data
  },

  /**
   * Create new folder
   */
  createFolder: async (data: CreateFolderData): Promise<Folder> => {
    const { transformFolderFromBackend } = await import('@/utils/dataTransformers')

    // Transform confidentiality to backend format
    const confidentialityMapping: Record<string, string> = {
      public: 'PUBLIC',
      internal: 'INTERNAL',
      confidential: 'CONFIDENTIAL',
      highly_confidential: 'HIGHLY_CONFIDENTIAL',
    }

    // Build the request payload
    const payload: Record<string, any> = {
      name: data.name,
      parent: data.parentId, // Backend expects 'parent' not 'parent_id'
      confidentiality_level: data.confidentiality
        ? confidentialityMapping[data.confidentiality]
        : 'INTERNAL',
      description: data.description || '',
    }

    // Add department if provided (required for root folders)
    if (data.department !== undefined && data.department !== null) {
      payload.department = data.department
    }

    // Add template_id if provided
    if (data.templateId) {
      payload.template_id = data.templateId
    }

    const response = await api.post<any>('/folders/', payload)
    return transformFolderFromBackend(response.data)
  },

  /**
   * Update folder (partial update)
   */
  updateFolder: async (folderId: string, data: UpdateFolderData): Promise<Folder> => {
    const { transformFolderFromBackend } = await import('@/utils/dataTransformers')

    const confidentialityMapping: Record<string, string> = {
      public: 'PUBLIC',
      internal: 'INTERNAL',
      confidential: 'CONFIDENTIAL',
      highly_confidential: 'HIGHLY_CONFIDENTIAL',
    }

    // Build payload with only provided fields
    const payload: Record<string, any> = {}
    if (data.name !== undefined) {
      payload.name = data.name
    }
    if (data.confidentiality !== undefined) {
      payload.confidentiality_level = confidentialityMapping[data.confidentiality]
    }
    if (data.isLocked !== undefined) {
      payload.is_locked = data.isLocked
    }
    if (data.description !== undefined) {
      payload.description = data.description
    }

    // Use PATCH for partial updates
    const response = await api.patch<any>(`/folders/${folderId}/update/`, payload)
    return transformFolderFromBackend(response.data)
  },

  /**
   * Rename folder
   */
  renameFolder: async (folderId: string, newName: string): Promise<Folder> => {
    return folderService.updateFolder(folderId, { name: newName })
  },

  /**
   * Move folder
   */
  moveFolder: async (folderId: string, newParentId: string | null): Promise<Folder> => {
    const { transformFolderFromBackend } = await import('@/utils/dataTransformers')
    const response = await api.post<any>(`/folders/${folderId}/move/`, {
      new_parent_id: newParentId,
    })
    return transformFolderFromBackend(response.data)
  },

  /**
   * Delete folder
   */
  deleteFolder: async (folderId: string, force: boolean = false): Promise<void> => {
    await api.delete(`/folders/${folderId}/delete/`, {
      params: { force },
    })
  },

  /**
   * Get folder permissions
   */
  getFolderPermissions: async (folderId: string): Promise<any> => {
    const response = await api.get(`/folders/${folderId}/permissions/`)
    return response.data
  },

  /**
   * Set folder permissions
   */
  setFolderPermissions: async (folderId: string, permissions: any): Promise<any> => {
    const response = await api.post(`/folders/${folderId}/permissions/`, permissions)
    return response.data
  },

  /**
   * Get folder path (breadcrumbs)
   */
  getFolderPath: async (folderId: string): Promise<Folder[]> => {
    const response = await api.get<Folder[]>(`/folders/${folderId}/path/`)
    return response.data
  },

  /**
   * Get folder statistics
   */
  getFolderStats: async (
    folderId: string
  ): Promise<{
    totalFolders: number
    totalDocuments: number
    maxDepth: number
    totalSize: number
  }> => {
    const response = await api.get(`/folders/${folderId}/stats/`)
    return response.data
  },

  /**
   * Duplicate folder
   */
  duplicateFolder: async (folderId: string, newName?: string): Promise<Folder> => {
    const response = await api.post<Folder>(`/folders/${folderId}/duplicate/`, {
      new_name: newName,
    })
    return response.data
  },

  /**
   * Lock folder
   */
  lockFolder: async (folderId: string): Promise<Folder> => {
    return folderService.updateFolder(folderId, { isLocked: true })
  },

  /**
   * Unlock folder
   */
  unlockFolder: async (folderId: string): Promise<Folder> => {
    return folderService.updateFolder(folderId, { isLocked: false })
  },

  /**
   * Bulk move folders
   */
  bulkMoveFolders: async (folderIds: string[], newParentId: string | null): Promise<void> => {
    await api.post('/folders/bulk-move/', {
      folder_ids: folderIds,
      new_parent_id: newParentId,
    })
  },

  /**
   * Bulk delete folders
   */
  bulkDeleteFolders: async (folderIds: string[], force: boolean = false): Promise<void> => {
    await api.post('/folders/bulk-delete/', {
      folder_ids: folderIds,
      force,
    })
  },

  /**
   * Export folder structure
   */
  exportFolderStructure: async (
    folderId: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<Blob> => {
    const response = await api.get(`/folders/${folderId}/export/`, {
      params: { format },
      responseType: 'blob',
    })
    return response.data
  },

  /**
   * Import folder structure
   */
  importFolderStructure: async (parentId: string | null, file: File): Promise<Folder[]> => {
    const formData = new FormData()
    formData.append('file', file)
    if (parentId) {
      formData.append('parent_id', parentId)
    }

    const response = await api.post<Folder[]>('/folders/import/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  /**
   * Get folders in trash
   */
  getTrashFolders: async (): Promise<Folder[]> => {
    const response = await api.get<any>('/folders/trash/')
    // Handle paginated response
    const data = Array.isArray(response.data) ? response.data : response.data?.results || []
    const { transformFoldersFromBackend } = await import('@/utils/dataTransformers')
    return transformFoldersFromBackend(data)
  },

  /**
   * Restore folder from trash
   */
  restoreFolder: async (folderId: string): Promise<Folder> => {
    const { transformFolderFromBackend } = await import('@/utils/dataTransformers')
    const response = await api.post<any>(`/folders/${folderId}/restore/`)
    return transformFolderFromBackend(response.data)
  },

  /**
   * Permanently delete folder (must be in trash first)
   */
  permanentlyDeleteFolder: async (folderId: string): Promise<void> => {
    await api.delete(`/folders/${folderId}/delete/`, {
      params: { permanent: true },
    })
  },

  /**
   * Empty trash (permanently delete all trashed folders)
   */
  emptyTrash: async (): Promise<{ message: string; deleted_count: number }> => {
    const response = await api.post('/folders/trash/empty/')
    return response.data
  },
}

/**
 * Error handler helper
 * Handles various error formats including Django REST Framework validation errors
 */
export const handleFolderError = (error: any): string => {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      // Server responded with error
      const data = error.response.data

      // Handle Django REST Framework validation errors
      // Format: {"field_name": ["error message 1", "error message 2"]}
      if (typeof data === 'object' && !data.message && !data.detail) {
        const fieldErrors: string[] = []
        for (const [field, messages] of Object.entries(data)) {
          if (Array.isArray(messages)) {
            // Join multiple messages for the same field
            fieldErrors.push(...messages.map((msg) => String(msg)))
          } else if (typeof messages === 'string') {
            fieldErrors.push(messages)
          }
        }
        if (fieldErrors.length > 0) {
          return fieldErrors.join('. ')
        }
      }

      if (typeof data === 'object' && data.message) {
        return data.message
      }
      if (typeof data === 'object' && data.detail) {
        return data.detail
      }
      if (typeof data === 'string') {
        return data
      }
      return `Server error: ${error.response.status}`
    } else if (error.request) {
      // Request made but no response
      return 'No response from server. Please check your connection.'
    }
  }
  return error.message || 'An unexpected error occurred'
}

export default folderService
