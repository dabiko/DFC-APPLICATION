/**
 * Document Service
 * API service for document upload and management operations
 */

import apiClient from './apiClient'
import type { CreateDocumentMetadata } from '@/types/metadata'
import type { FileUploadItem, UploadResult, BulkUploadResult } from '@/types/upload'
import type {
  DocumentShortcut,
  DocumentShortcutListItem,
  CreateShortcutRequest,
  BulkCreateShortcutRequest,
  BulkCreateShortcutResponse,
  CanDeleteResponse,
  ShortcutLocationsResponse,
} from '@/types'

export interface UploadDocumentRequest {
  file: File
  folderId?: string | null
  metadata: CreateDocumentMetadata
  onProgress?: (progress: number, uploadSpeed?: number, timeRemaining?: number) => void
}

export interface UploadDocumentResponse {
  id: string
  name: string
  size: number
  mimeType: string
  url: string
  folderId: string | null
  metadata: CreateDocumentMetadata
  createdAt: string
  createdBy: string
}

/**
 * Convert retention period to years
 */
const getRetentionYears = (period: string, customYears?: number): number => {
  const periodMap: Record<string, number> = {
    '1_year': 1,
    '3_years': 3,
    '5_years': 5,
    '7_years': 7,
    '10_years': 10,
    '15_years': 15,
    '20_years': 20,
    permanent: 9999, // Use a very large number for permanent
    custom: customYears || 5,
  }
  return periodMap[period] || 5
}

/**
 * Upload a single document with metadata and progress tracking
 */
export const uploadDocument = async ({
  file,
  folderId,
  metadata,
  onProgress,
}: UploadDocumentRequest): Promise<UploadDocumentResponse> => {
  const formData = new FormData()
  formData.append('file', file)

  // Folder ID (can be null/empty for root)
  if (folderId) {
    formData.append('folder', folderId)
  }

  // Required metadata fields (matching backend expectations)
  formData.append('title', metadata.title)
  formData.append('document_type', metadata.documentType)
  formData.append('identifier', metadata.identifier)
  formData.append('document_date', metadata.date) // Backend expects 'document_date'
  formData.append('creator_source', metadata.creator) // Backend expects 'creator_source'

  // Department: Use metadata.department if provided, otherwise fall back to user's department
  if (metadata.department) {
    formData.append('department', metadata.department)
  } else {
    // Fall back to logged-in user's department ID
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        if (user.department_id) {
          formData.append('department', user.department_id)
        }
      } catch (e) {
        console.error('Failed to parse user data:', e)
      }
    }
  }

  formData.append('confidentiality_level', metadata.confidentialityLevel)

  // Retention period conversion
  const retentionYears = getRetentionYears(metadata.retentionPeriod, metadata.customRetentionYears)
  formData.append('retention_period_years', retentionYears.toString())

  // Tags: Backend expects a list of integer IDs, but for now we skip tags
  // TODO: Implement tag creation/lookup API
  // if (metadata.tags && metadata.tags.length > 0) {
  //   // Need to convert tag names to IDs first
  //   formData.append('tags', JSON.stringify(metadata.tags.map(tag => parseInt(tag))))
  // }

  // Optional fields
  if (metadata.description) formData.append('description', metadata.description)
  if (metadata.subject) formData.append('subject', metadata.subject)
  if (metadata.keywords) formData.append('keywords', JSON.stringify(metadata.keywords))
  if (metadata.customerName) formData.append('customer_name', metadata.customerName)
  if (metadata.contractValue) formData.append('contract_value', metadata.contractValue.toString())
  if (metadata.currency) formData.append('currency', metadata.currency)
  if (metadata.fiscalYear) formData.append('fiscal_year', metadata.fiscalYear)
  if (metadata.language) formData.append('language', metadata.language)
  if (metadata.comments) formData.append('comments', metadata.comments)

  // Track upload progress
  const startTime = Date.now()
  const uploadedBytes = 0

  const response = await apiClient.post<UploadDocumentResponse>('/documents/upload/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 600000, // 10 minutes for large files
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)

        // Calculate upload speed (bytes per second)
        const currentTime = Date.now()
        const elapsedTime = (currentTime - startTime) / 1000 // seconds
        const uploadSpeed = elapsedTime > 0 ? progressEvent.loaded / elapsedTime : 0

        // Calculate time remaining (seconds)
        const remainingBytes = progressEvent.total - progressEvent.loaded
        const timeRemaining = uploadSpeed > 0 ? remainingBytes / uploadSpeed : 0

        onProgress(percentCompleted, uploadSpeed, timeRemaining)
      }
    },
  })

  return response.data
}

/**
 * Upload multiple documents with bulk progress tracking
 */
export const uploadDocuments = async (
  requests: UploadDocumentRequest[]
): Promise<BulkUploadResult> => {
  const results: UploadResult[] = []
  let successful = 0
  let failed = 0

  for (const request of requests) {
    try {
      const response = await uploadDocument(request)
      results.push({
        success: true,
        documentId: response.id,
        documentUrl: response.url,
        file: request.file,
      })
      successful++
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      results.push({
        success: false,
        error: errorMessage,
        file: request.file,
      })
      failed++
    }
  }

  return {
    total: requests.length,
    successful,
    failed,
    results,
  }
}

/**
 * Get document by ID
 */
export const getDocument = async (documentId: string): Promise<UploadDocumentResponse> => {
  const response = await apiClient.get<UploadDocumentResponse>(`/documents/${documentId}/`)
  return response.data
}

/**
 * Download document
 */
export const downloadDocument = async (documentId: string): Promise<Blob> => {
  const response = await apiClient.get(`/documents/${documentId}/download/`, {
    responseType: 'blob',
  })
  return response.data
}

/**
 * Get document preview URL (for inline viewing in browser)
 * Returns a presigned URL that can be used directly in img/iframe/video tags
 */
export const getDocumentPreviewUrl = async (documentId: string): Promise<string> => {
  const response = await apiClient.get<{ download_url: string }>(
    `/documents/${documentId}/download/`,
    {
      params: {
        mode: 'url',
        inline: 'true',
      },
    }
  )
  return response.data.download_url
}

/**
 * Get document preview data for the preview modal
 */
export const getDocumentPreview = async (
  documentId: string
): Promise<{
  documentId: string
  fileName: string
  fileSize: number
  mimeType: string
  previewUrl: string
  downloadUrl: string
  metadata?: {
    documentType: string
    confidentialityLevel: string
    department?: string
    createdAt?: string
    modifiedAt?: string
    keywords?: string[]
    description?: string
  }
  canEdit: boolean
  canDelete: boolean
  canDownload: boolean
  canShare: boolean
}> => {
  // First get document details
  const document = await getDocument(documentId)

  // Then get preview URL
  const previewUrl = await getDocumentPreviewUrl(documentId)

  // Get download URL (non-inline)
  const downloadResponse = await apiClient.get<{ download_url: string }>(
    `/documents/${documentId}/download/`,
    {
      params: {
        mode: 'url',
        inline: 'false',
      },
    }
  )

  return {
    documentId: document.id,
    fileName: document.file_name,
    fileSize: document.file_size,
    mimeType: document.file_type,
    previewUrl,
    downloadUrl: downloadResponse.data.download_url,
    metadata: {
      documentType: document.document_type,
      confidentialityLevel: document.confidentiality_level,
      department: document.department_name,
      createdAt: document.created_at,
      modifiedAt: document.updated_at,
      keywords: document.tags,
    },
    canEdit: true, // TODO: Get from permissions
    canDelete: true, // TODO: Get from permissions
    canDownload: true, // TODO: Get from permissions
    canShare: true, // TODO: Get from permissions
  }
}

/**
 * Delete document
 */
export const deleteDocument = async (documentId: string): Promise<void> => {
  await apiClient.delete(`/documents/${documentId}/`)
}

/**
 * Text content response from backend
 */
export interface TextContentResponse {
  content: string
  file_name: string
  file_type: string
  file_size: number
  language: string
  line_count: number
}

/**
 * Get text content of a document for preview
 * Supports text files, code files, config files, etc.
 */
export const getDocumentTextContent = async (documentId: string): Promise<TextContentResponse> => {
  const response = await apiClient.get<TextContentResponse>(
    `/documents/${documentId}/text-content/`
  )
  return response.data
}

/**
 * Document from backend API response
 */
export interface DocumentFromBackend {
  id: string
  title: string
  file_name: string
  file_size: number
  file_size_mb: number
  file_type: string
  document_type: string
  confidentiality_level: string
  owner: string
  owner_name: string
  department: string
  department_name: string
  folder: string
  folder_name: string
  version_number: number
  is_current_version: boolean
  created_at: string
  updated_at: string
  tags: string[]
}

/**
 * Get documents in folder
 */
export const getDocumentsInFolder = async (
  folderId: string | null,
  params?: {
    page?: number
    pageSize?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }
): Promise<DocumentFromBackend[]> => {
  const queryParams: Record<string, string> = {}

  // Only add folder param if folderId is provided (for root level, we might want all docs or none)
  if (folderId) {
    queryParams.folder = folderId
  }

  if (params?.page) queryParams.page = params.page.toString()
  if (params?.pageSize) queryParams.page_size = params.pageSize.toString()
  if (params?.sortBy) queryParams.sort_by = params.sortBy
  if (params?.sortOrder) queryParams.sort_order = params.sortOrder

  const response = await apiClient.get<DocumentFromBackend[] | { results: DocumentFromBackend[] }>(
    '/documents/',
    {
      params: queryParams,
    }
  )

  // Handle both paginated response { results: [...] } and direct array response
  if (Array.isArray(response.data)) {
    return response.data
  } else if (response.data && 'results' in response.data && Array.isArray(response.data.results)) {
    return response.data.results
  }
  return []
}

/**
 * Search documents
 */
export const searchDocuments = async (
  query: string,
  filters?: {
    documentType?: string
    department?: string
    confidentialityLevel?: string
    startDate?: string
    endDate?: string
    tags?: string[]
  }
): Promise<UploadDocumentResponse[]> => {
  const response = await apiClient.get('/search/', {
    params: {
      q: query,
      ...filters,
    },
  })
  return response.data.data || response.data
}

/**
 * Validate file before upload
 */
export const validateFile = (
  file: File,
  config?: {
    maxSize?: number
    acceptedTypes?: string[]
  }
): { valid: boolean; error?: string } => {
  const maxSize = config?.maxSize || 500 * 1024 * 1024 // 500MB default
  const acceptedTypes = config?.acceptedTypes

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${formatFileSize(maxSize)}`,
    }
  }

  // Check file type if restrictions exist
  if (acceptedTypes && acceptedTypes.length > 0) {
    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`
    const isTypeAllowed = acceptedTypes.some((type) => {
      if (type.startsWith('.')) {
        return fileExtension === type.toLowerCase()
      }
      return file.type === type
    })

    if (!isTypeAllowed) {
      return {
        valid: false,
        error: `File type not allowed. Accepted types: ${acceptedTypes.join(', ')}`,
      }
    }
  }

  return { valid: true }
}

/**
 * Format file size in human-readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`
}

/**
 * Duplicate file error details returned by the backend
 */
export interface DuplicateFileError {
  code: 'DUPLICATE_FILE'
  message: string
  existingDocument: {
    id: string
    title: string
    fileName: string
    folderId: string | null
    folderName: string | null
    folderPath: string | null
    confidentialityLevel: string
    documentType: string
  }
  suggestion: string
  canCreateShortcut: boolean
}

/**
 * Check if an error is a duplicate file error
 */
export const isDuplicateFileError = (error: unknown): DuplicateFileError | null => {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as {
      response?: {
        data?: Record<string, unknown>
        status?: number
      }
    }

    const data = axiosError.response?.data
    if (data && typeof data === 'object' && 'file' in data) {
      const fileError = data.file as unknown
      // Handle array format from DRF validation
      const errorData = Array.isArray(fileError) ? fileError[0] : fileError

      if (
        errorData &&
        typeof errorData === 'object' &&
        'code' in errorData &&
        errorData.code === 'DUPLICATE_FILE'
      ) {
        const dupError = errorData as {
          code: 'DUPLICATE_FILE'
          message: string
          existing_document: {
            id: string
            title: string
            file_name: string
            folder_id: string | null
            folder_name: string | null
            folder_path: string | null
            confidentiality_level: string
            document_type: string
          }
          suggestion: string
          can_create_shortcut: boolean
        }

        return {
          code: 'DUPLICATE_FILE',
          message: dupError.message,
          existingDocument: {
            id: dupError.existing_document.id,
            title: dupError.existing_document.title,
            fileName: dupError.existing_document.file_name,
            folderId: dupError.existing_document.folder_id,
            folderName: dupError.existing_document.folder_name,
            folderPath: dupError.existing_document.folder_path,
            confidentialityLevel: dupError.existing_document.confidentiality_level,
            documentType: dupError.existing_document.document_type,
          },
          suggestion: dupError.suggestion,
          canCreateShortcut: dupError.can_create_shortcut,
        }
      }
    }
  }
  return null
}

/**
 * Handle document service errors with field-level validation support
 */
export const handleDocumentError = (error: unknown): string => {
  // First check if it's a duplicate file error
  const duplicateError = isDuplicateFileError(error)
  if (duplicateError) {
    return duplicateError.message
  }

  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as {
      response?: {
        data?: Record<string, unknown> | string
        status?: number
      }
    }

    const data = axiosError.response?.data
    const status = axiosError.response?.status

    // Handle string response
    if (typeof data === 'string') {
      return data
    }

    // Handle object response
    if (data && typeof data === 'object') {
      // Check for common error fields
      if ('message' in data && typeof data.message === 'string') {
        return data.message
      }
      if ('detail' in data && typeof data.detail === 'string') {
        return data.detail
      }
      if ('error' in data && typeof data.error === 'string') {
        return data.error
      }

      // Handle DRF field validation errors (e.g., { "field_name": ["error message"] })
      const fieldErrors: string[] = []
      for (const [field, errors] of Object.entries(data)) {
        if (Array.isArray(errors)) {
          const errorMessages = errors.filter((e) => typeof e === 'string').join(', ')
          if (errorMessages) {
            // Convert snake_case to readable format
            const readableField = field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
            fieldErrors.push(`${readableField}: ${errorMessages}`)
          }
        } else if (typeof errors === 'string') {
          const readableField = field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
          fieldErrors.push(`${readableField}: ${errors}`)
        }
      }

      if (fieldErrors.length > 0) {
        return fieldErrors.join('\n')
      }

      // Handle non_field_errors
      if ('non_field_errors' in data && Array.isArray(data.non_field_errors)) {
        return (data.non_field_errors as string[]).join(', ')
      }
    }

    // Fallback based on status code
    if (status === 400) return 'Invalid request. Please check your input.'
    if (status === 401) return 'Authentication required. Please log in.'
    if (status === 403) return 'You do not have permission to perform this action.'
    if (status === 404) return 'The requested resource was not found.'
    if (status === 413) return 'File is too large.'
    if (status === 500) return 'Server error. Please try again later.'

    return 'An error occurred while processing the document'
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'An unexpected error occurred'
}

// ============================================================================
// DOCUMENT SHORTCUT API FUNCTIONS
// ============================================================================

/**
 * Shortcut from backend API response (snake_case)
 */
export interface ShortcutFromBackend {
  id: string
  folder: string
  created_at: string
  created_by: string
  created_by_name: string
  original_document_id: string
  title: string
  file_name: string
  file_size: number
  file_type: string
  document_type: string
  confidentiality_level: string
  version_number: number
  document_date?: string
  checksum?: string
  owner_id: string
  owner_name: string
  department_id: string
  department_name: string
  original_folder_id: string
  original_folder_name: string
  original_folder_path: string
  is_shortcut: true
  tags: string[]
}

/**
 * Shortcut list item from backend (minimal)
 */
export interface ShortcutListItemFromBackend {
  id: string
  folder: string
  original_document_id: string
  title: string
  file_name: string
  file_size: number
  file_type: string
  document_type: string
  confidentiality_level: string
  original_folder_id: string | null
  original_folder_name: string | null
  created_at: string
  is_shortcut: true
}

/**
 * Create a shortcut to a document in another folder
 */
export const createShortcut = async (
  documentId: string,
  targetFolderId: string
): Promise<DocumentShortcut> => {
  const response = await apiClient.post<ShortcutFromBackend>('/documents/shortcuts/', {
    document_id: documentId,
    target_folder_id: targetFolderId,
  })

  // Transform snake_case to camelCase
  return transformShortcutResponse(response.data)
}

/**
 * Get shortcuts in a folder
 */
export const getShortcutsInFolder = async (
  folderId: string | null
): Promise<DocumentShortcutListItem[]> => {
  const params: Record<string, string> = {}
  if (folderId) {
    params.folder = folderId
  }

  const response = await apiClient.get<
    ShortcutListItemFromBackend[] | { results: ShortcutListItemFromBackend[] }
  >('/documents/shortcuts/list/', { params })

  // Handle both paginated and direct array response
  const shortcuts = Array.isArray(response.data) ? response.data : response.data.results || []

  return shortcuts.map(transformShortcutListItem)
}

/**
 * Get shortcut details by ID
 */
export const getShortcutById = async (shortcutId: string): Promise<DocumentShortcut> => {
  const response = await apiClient.get<ShortcutFromBackend>(`/documents/shortcuts/${shortcutId}/`)
  return transformShortcutResponse(response.data)
}

/**
 * Delete a shortcut
 */
export const deleteShortcut = async (shortcutId: string): Promise<void> => {
  await apiClient.delete(`/documents/shortcuts/${shortcutId}/delete/`)
}

/**
 * Get all shortcut locations for a document
 */
export const getShortcutLocations = async (
  documentId: string
): Promise<ShortcutLocationsResponse> => {
  const response = await apiClient.get<{
    document_id: string
    document_title: string
    shortcut_count: number
    shortcuts: Array<{
      id: string
      folder: string
      folder_name: string
      folder_path: string
      created_at: string
      created_by_name: string
    }>
  }>(`/documents/${documentId}/shortcut-locations/`)

  return {
    documentId: response.data.document_id,
    documentTitle: response.data.document_title,
    shortcutCount: response.data.shortcut_count,
    shortcuts: response.data.shortcuts.map((s) => ({
      id: s.id,
      folder: s.folder,
      folderName: s.folder_name,
      folderPath: s.folder_path,
      createdAt: s.created_at,
      createdByName: s.created_by_name,
    })),
  }
}

/**
 * Check if a document can be deleted (no shortcuts exist)
 */
export const canDeleteDocument = async (documentId: string): Promise<CanDeleteResponse> => {
  const response = await apiClient.get<{
    document_id: string
    document_title: string
    can_delete: boolean
    message: string | null
    shortcut_count?: number
    shortcut_locations?: Array<{
      id: string
      folder_name: string
      folder_path: string
    }>
  }>(`/documents/${documentId}/can-delete/`)

  return {
    documentId: response.data.document_id,
    documentTitle: response.data.document_title,
    canDelete: response.data.can_delete,
    message: response.data.message,
    shortcutCount: response.data.shortcut_count,
    shortcutLocations: response.data.shortcut_locations?.map((loc) => ({
      id: loc.id,
      folderName: loc.folder_name,
      folderPath: loc.folder_path,
    })),
  }
}

/**
 * Create shortcuts for multiple documents at once
 */
export const bulkCreateShortcuts = async (
  documentIds: string[],
  targetFolderId: string
): Promise<BulkCreateShortcutResponse> => {
  const response = await apiClient.post<{
    message: string
    created_count: number
    created: ShortcutListItemFromBackend[]
    skipped: {
      same_folder: string[]
      already_exists: string[]
      total: number
    }
  }>('/documents/shortcuts/bulk/', {
    document_ids: documentIds,
    target_folder_id: targetFolderId,
  })

  return {
    message: response.data.message,
    createdCount: response.data.created_count,
    created: response.data.created.map(transformShortcutListItem),
    skipped: {
      sameFolder: response.data.skipped.same_folder,
      alreadyExists: response.data.skipped.already_exists,
      total: response.data.skipped.total,
    },
  }
}

/**
 * Transform backend shortcut response to frontend type
 */
const transformShortcutResponse = (data: ShortcutFromBackend): DocumentShortcut => ({
  id: data.id,
  folder: data.folder,
  createdAt: data.created_at,
  createdBy: data.created_by,
  createdByName: data.created_by_name,
  originalDocumentId: data.original_document_id,
  title: data.title,
  fileName: data.file_name,
  fileSize: data.file_size,
  fileType: data.file_type,
  documentType: data.document_type,
  confidentialityLevel: data.confidentiality_level as any,
  versionNumber: data.version_number,
  documentDate: data.document_date,
  checksum: data.checksum,
  ownerId: data.owner_id,
  ownerName: data.owner_name,
  departmentId: data.department_id,
  departmentName: data.department_name,
  originalFolderId: data.original_folder_id,
  originalFolderName: data.original_folder_name,
  originalFolderPath: data.original_folder_path,
  isShortcut: true,
  tags: data.tags,
})

/**
 * Transform backend shortcut list item to frontend type
 */
const transformShortcutListItem = (
  data: ShortcutListItemFromBackend
): DocumentShortcutListItem => ({
  id: data.id,
  folder: data.folder,
  originalDocumentId: data.original_document_id,
  title: data.title,
  fileName: data.file_name,
  fileSize: data.file_size,
  fileType: data.file_type,
  documentType: data.document_type,
  confidentialityLevel: data.confidentiality_level as any,
  originalFolderId: data.original_folder_id,
  originalFolderName: data.original_folder_name,
  createdAt: data.created_at,
  isShortcut: true,
})

/**
 * Move a document to a different folder
 */
export const moveDocument = async (
  documentId: string,
  targetFolderId: string
): Promise<{ message: string; movedCount: number }> => {
  const response = await apiClient.post<{
    message: string
    moved_count: number
    target_folder: {
      id: string
      name: string
      path: string
    }
  }>('/documents/bulk-move/', {
    document_ids: [documentId],
    target_folder_id: targetFolderId,
  })

  return {
    message: response.data.message,
    movedCount: response.data.moved_count,
  }
}

/**
 * Move multiple documents to a different folder
 */
export const moveDocuments = async (
  documentIds: string[],
  targetFolderId: string
): Promise<{ message: string; movedCount: number }> => {
  const response = await apiClient.post<{
    message: string
    moved_count: number
    target_folder: {
      id: string
      name: string
      path: string
    }
  }>('/documents/bulk-move/', {
    document_ids: documentIds,
    target_folder_id: targetFolderId,
  })

  return {
    message: response.data.message,
    movedCount: response.data.moved_count,
  }
}

/**
 * Rename a document (update its title)
 */
export const renameDocument = async (documentId: string, newTitle: string): Promise<void> => {
  await apiClient.patch(`/documents/${documentId}/update/`, {
    title: newTitle,
  })
}

// ============================================================================
// DOCUMENT VERSIONS API FUNCTIONS
// ============================================================================

/**
 * Version from backend API response
 */
export interface DocumentVersionFromBackend {
  id: string
  document: string
  version_number: number
  file_name: string
  file_size: number
  file_type: string
  checksum: string
  storage_path: string
  created_at: string
  created_by: string
  created_by_name: string
  change_description?: string
  is_current: boolean
}

/**
 * Get all versions of a document
 */
export const getDocumentVersions = async (
  documentId: string
): Promise<DocumentVersionFromBackend[]> => {
  const response = await apiClient.get<
    DocumentVersionFromBackend[] | { results: DocumentVersionFromBackend[] }
  >(`/documents/${documentId}/versions/list/`)

  // Handle both paginated and direct array response
  if (Array.isArray(response.data)) {
    return response.data
  } else if (response.data && 'results' in response.data) {
    return response.data.results
  }
  return []
}

/**
 * Download a specific version of a document
 */
export const downloadDocumentVersion = async (
  documentId: string,
  versionId: string
): Promise<Blob> => {
  const response = await apiClient.get(`/documents/${documentId}/versions/${versionId}/download/`, {
    responseType: 'blob',
  })
  return response.data
}

/**
 * Restore a specific version of a document
 */
export const restoreDocumentVersion = async (
  documentId: string,
  versionId: string
): Promise<void> => {
  await apiClient.post(`/documents/${documentId}/versions/${versionId}/restore/`)
}

// ============================================================================
// DOCUMENT ACCESS/PERMISSIONS API FUNCTIONS
// ============================================================================

/**
 * Access entry from backend API response
 */
export interface DocumentAccessFromBackend {
  id: string
  user_id: string
  user_name: string
  user_email: string
  permission: 'view' | 'edit' | 'manage' | 'owner'
  granted_at: string
  granted_by?: string
}

/**
 * Get access list for a document
 * Uses the new RBAC permissions API
 */
export const getDocumentAccess = async (
  documentId: string
): Promise<DocumentAccessFromBackend[]> => {
  try {
    const response = await apiClient.get(`/permissions/document-permissions/`, {
      params: { document_id: documentId },
    })

    // Transform permission data to access list format
    const permissions = response.data.results || response.data || []
    return permissions.map(
      (perm: {
        id: string
        user?: string
        user_username?: string
        user_email?: string
        user_full_name?: string
        department?: string
        department_name?: string
        permission_level: string
        granted_at: string
        granted_by_username?: string
      }) => ({
        id: perm.id,
        user_id: perm.user,
        user_name: perm.user_full_name || perm.user_username || perm.department_name || 'Unknown',
        user_email: perm.user_email || '',
        permission: mapPermissionLevel(perm.permission_level),
        granted_at: perm.granted_at,
        granted_by: perm.granted_by_username,
      })
    )
  } catch {
    // Return empty array if permissions API is not available
    return []
  }
}

/**
 * Map backend permission level to frontend permission type
 */
const mapPermissionLevel = (level: string): 'view' | 'edit' | 'manage' | 'owner' => {
  switch (level) {
    case 'VIEW_ONLY':
    case 'VIEW_DOWNLOAD':
      return 'view'
    case 'CONTRIBUTE':
    case 'EDIT':
      return 'edit'
    case 'FULL_CONTROL':
      return 'manage'
    default:
      return 'view'
  }
}

// ============================================================================
// AUDIT/ACTIVITY API FUNCTIONS
// ============================================================================

/**
 * Activity entry from backend API response
 */
export interface ActivityFromBackend {
  id: string
  action: string
  resource_type: string
  resource_id: string
  resource_name: string
  user: string
  user_email: string
  timestamp: string
  outcome: 'SUCCESS' | 'FAILURE'
  ip_address?: string
  user_agent?: string
  details?: string
  before_value?: Record<string, unknown>
  after_value?: Record<string, unknown>
  changed_fields?: string[]
  error_message?: string
}

/**
 * Get activity/audit logs for a specific resource
 * @param resourceType - 'DOCUMENT' or 'FOLDER'
 * @param resourceId - The ID of the resource
 */
export const getResourceActivity = async (
  resourceType: 'DOCUMENT' | 'FOLDER',
  resourceId: string
): Promise<ActivityFromBackend[]> => {
  const response = await apiClient.get<ActivityFromBackend[] | { results: ActivityFromBackend[] }>(
    `/audit/logs/resource/${resourceType}/${resourceId}/`
  )

  // Handle both paginated and direct array response
  if (Array.isArray(response.data)) {
    return response.data
  } else if (response.data && 'results' in response.data) {
    return response.data.results
  }
  return []
}

/**
 * Get activity for a document
 */
export const getDocumentActivity = async (documentId: string): Promise<ActivityFromBackend[]> => {
  return getResourceActivity('DOCUMENT', documentId)
}

/**
 * Get activity for a folder
 */
export const getFolderActivity = async (folderId: string): Promise<ActivityFromBackend[]> => {
  return getResourceActivity('FOLDER', folderId)
}

/**
 * Duplicate check result from API
 */
export interface DuplicateInfo {
  id: string
  title: string
  file_name: string
  folder_id: string | null
  folder_name: string | null
  folder_path: string | null
  confidentiality_level: string
  document_type: string
}

export interface CheckDuplicatesResponse {
  duplicates: Record<string, DuplicateInfo | null>
}

/**
 * Check if files with given checksums already exist
 * @param checksums - Array of SHA-256 checksums to check
 * @returns Map of checksum to duplicate info (null if no duplicate)
 */
export const checkDuplicates = async (checksums: string[]): Promise<CheckDuplicatesResponse> => {
  const response = await apiClient.post<CheckDuplicatesResponse>('/documents/check-duplicates/', {
    checksums,
  })
  return response.data
}

// Export default service object
const documentService = {
  uploadDocument,
  uploadDocuments,
  getDocument,
  downloadDocument,
  deleteDocument,
  getDocumentsInFolder,
  searchDocuments,
  validateFile,
  formatFileSize,
  handleDocumentError,
  isDuplicateFileError,
  // Shortcut functions
  createShortcut,
  getShortcutsInFolder,
  getShortcutById,
  deleteShortcut,
  getShortcutLocations,
  canDeleteDocument,
  bulkCreateShortcuts,
  // Move functions
  moveDocument,
  moveDocuments,
  // Rename function
  renameDocument,
  // Duplicate check
  checkDuplicates,
  // Version functions
  getDocumentVersions,
  downloadDocumentVersion,
  restoreDocumentVersion,
  // Access/permissions functions
  getDocumentAccess,
  // Activity/audit functions
  getResourceActivity,
  getDocumentActivity,
  getFolderActivity,
}

export default documentService
