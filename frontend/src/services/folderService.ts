/**
 * Folder Service
 * API service for folder operations
 */

import axios from 'axios'
import type {
  Folder,
  CreateFolderData,
  UpdateFolderData,
  MoveFolderData,
  FolderFilterOptions,
  FolderSortOptions,
} from '@/types/folder'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

// Axios instance with auth interceptor
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - redirect to login
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

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

    const response = await api.get<Folder[]>('/folders/', { params })
    return response.data
  },

  /**
   * Get folder by ID
   */
  getFolderById: async (folderId: string): Promise<Folder> => {
    const response = await api.get<Folder>(`/folders/${folderId}/`)
    return response.data
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
    const response = await api.post<Folder>('/folders/', {
      name: data.name,
      parent_id: data.parentId,
      confidentiality: data.confidentiality,
      template_id: data.templateId,
    })
    return response.data
  },

  /**
   * Update folder
   */
  updateFolder: async (folderId: string, data: UpdateFolderData): Promise<Folder> => {
    const response = await api.put<Folder>(`/folders/${folderId}/`, {
      name: data.name,
      confidentiality: data.confidentiality,
      is_locked: data.isLocked,
    })
    return response.data
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
    const response = await api.post<Folder>(`/folders/${folderId}/move/`, {
      new_parent_id: newParentId,
    })
    return response.data
  },

  /**
   * Delete folder
   */
  deleteFolder: async (folderId: string, force: boolean = false): Promise<void> => {
    await api.delete(`/folders/${folderId}/`, {
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
}

/**
 * Error handler helper
 */
export const handleFolderError = (error: any): string => {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      // Server responded with error
      const data = error.response.data
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
