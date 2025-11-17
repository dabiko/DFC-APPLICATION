/**
 * Metadata Service
 * API service for document metadata operations
 */

import api from './api'
import type {
  DocumentMetadata,
  CreateDocumentMetadata,
  UpdateDocumentMetadata,
  MetadataHistoryEntry,
  MetadataTemplate,
  TagSuggestion,
} from '@/types/metadata'

/**
 * Get metadata for a document
 */
export const getDocumentMetadata = async (documentId: string): Promise<DocumentMetadata> => {
  const response = await api.get(`/api/v1/documents/${documentId}/metadata`)
  return response.data.data
}

/**
 * Create metadata for a new document
 */
export const createDocumentMetadata = async (
  documentId: string,
  metadata: CreateDocumentMetadata
): Promise<DocumentMetadata> => {
  const response = await api.post(`/api/v1/documents/${documentId}/metadata`, metadata)
  return response.data.data
}

/**
 * Update document metadata
 */
export const updateDocumentMetadata = async (
  documentId: string,
  metadata: UpdateDocumentMetadata
): Promise<DocumentMetadata> => {
  const response = await api.put(`/api/v1/documents/${documentId}/metadata`, metadata)
  return response.data.data
}

/**
 * Partially update document metadata (PATCH)
 */
export const patchDocumentMetadata = async (
  documentId: string,
  updates: Partial<DocumentMetadata>
): Promise<DocumentMetadata> => {
  const response = await api.patch(`/api/v1/documents/${documentId}/metadata`, updates)
  return response.data.data
}

/**
 * Get metadata history for a document
 */
export const getMetadataHistory = async (documentId: string): Promise<MetadataHistoryEntry[]> => {
  const response = await api.get(`/api/v1/documents/${documentId}/metadata/history`)
  return response.data.data
}

/**
 * Get metadata templates
 */
export const getMetadataTemplates = async (params?: {
  documentType?: string
  department?: string
}): Promise<MetadataTemplate[]> => {
  const response = await api.get('/api/v1/metadata/templates', { params })
  return response.data.data
}

/**
 * Get a specific metadata template
 */
export const getMetadataTemplate = async (templateId: string): Promise<MetadataTemplate> => {
  const response = await api.get(`/api/v1/metadata/templates/${templateId}`)
  return response.data.data
}

/**
 * Create a new metadata template
 */
export const createMetadataTemplate = async (
  template: Omit<MetadataTemplate, 'id'>
): Promise<MetadataTemplate> => {
  const response = await api.post('/api/v1/metadata/templates', template)
  return response.data.data
}

/**
 * Get tag suggestions
 */
export const getTagSuggestions = async (params?: {
  query?: string
  documentType?: string
  limit?: number
}): Promise<TagSuggestion[]> => {
  const response = await api.get('/api/v1/metadata/tags/suggestions', { params })
  return response.data.data
}

/**
 * Get popular tags
 */
export const getPopularTags = async (limit: number = 20): Promise<TagSuggestion[]> => {
  const response = await api.get('/api/v1/metadata/tags/popular', { params: { limit } })
  return response.data.data
}

/**
 * Validate metadata
 */
export const validateMetadata = async (
  metadata: Partial<DocumentMetadata>
): Promise<{ isValid: boolean; errors: Array<{ field: string; message: string }> }> => {
  const response = await api.post('/api/v1/metadata/validate', metadata)
  return response.data.data
}

/**
 * Bulk update metadata for multiple documents
 */
export const bulkUpdateMetadata = async (
  documentIds: string[],
  updates: Partial<DocumentMetadata>
): Promise<{ updated: number; failed: number; errors: Array<{ documentId: string; error: string }> }> => {
  const response = await api.post('/api/v1/metadata/bulk-update', {
    documentIds,
    updates,
  })
  return response.data.data
}

/**
 * Export metadata as CSV
 */
export const exportMetadataCSV = async (documentIds: string[]): Promise<Blob> => {
  const response = await api.post(
    '/api/v1/metadata/export/csv',
    { documentIds },
    { responseType: 'blob' }
  )
  return response.data
}

/**
 * Export metadata as JSON
 */
export const exportMetadataJSON = async (documentIds: string[]): Promise<Blob> => {
  const response = await api.post(
    '/api/v1/metadata/export/json',
    { documentIds },
    { responseType: 'blob' }
  )
  return response.data
}

/**
 * Import metadata from CSV
 */
export const importMetadataCSV = async (file: File): Promise<{
  imported: number
  failed: number
  errors: Array<{ row: number; error: string }>
}> => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post('/api/v1/metadata/import/csv', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data.data
}

/**
 * Get metadata field statistics
 */
export const getMetadataStats = async (params?: {
  field?: string
  startDate?: string
  endDate?: string
}): Promise<{
  totalDocuments: number
  byDocumentType: Record<string, number>
  byDepartment: Record<string, number>
  byConfidentiality: Record<string, number>
  topTags: TagSuggestion[]
}> => {
  const response = await api.get('/api/v1/metadata/stats', { params })
  return response.data.data
}

/**
 * Handle metadata service errors
 */
export const handleMetadataError = (error: unknown): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { data?: { message?: string } } }
    return axiosError.response?.data?.message || 'An error occurred while processing metadata'
  }
  return 'An unexpected error occurred'
}

// Export default service object
const metadataService = {
  getDocumentMetadata,
  createDocumentMetadata,
  updateDocumentMetadata,
  patchDocumentMetadata,
  getMetadataHistory,
  getMetadataTemplates,
  getMetadataTemplate,
  createMetadataTemplate,
  getTagSuggestions,
  getPopularTags,
  validateMetadata,
  bulkUpdateMetadata,
  exportMetadataCSV,
  exportMetadataJSON,
  importMetadataCSV,
  getMetadataStats,
}

export default metadataService
