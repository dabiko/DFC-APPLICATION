/**
 * Favorites Service
 *
 * API service for managing user favorites (folders and documents).
 */

import apiClient from './apiClient'

// Types
export interface FavoriteCollection {
  id: string
  name: string
  description: string
  color: string
  icon: string
  is_shared: boolean
  has_password: boolean
  share_expires_at: string | null
  position: number
  item_count: number
  owner_name: string
  is_owner: boolean
  created_at: string
  updated_at: string
}

export interface FavoriteCollectionDetail extends FavoriteCollection {
  shared_with_users: SharedUser[]
}

export interface SharedUser {
  id: number
  username: string
  full_name: string
  email: string
}

export interface FavoriteFolder {
  id: string
  folder_id: string
  folder_name: string
  folder_path: string
  confidentiality_level: string
  is_locked: boolean
  department_name: string | null
  collection_id: string | null
  collection_name: string | null
  position: number
  created_at: string
}

export interface FavoriteDocument {
  id: string
  document_id: string
  document_title: string
  file_name: string
  file_type: string
  file_size: number
  confidentiality_level: string
  folder_id: string | null
  folder_name: string | null
  department_name: string | null
  collection_id: string | null
  collection_name: string | null
  position: number
  description: string | null
  document_type: string | null
  uploaded_at: string
  updated_at: string
  created_at: string
}

export interface ReorderItem {
  item_id: string
  position: number
}

export interface MoveToCollectionRequest {
  item_ids: string[]
  collection_id: string | null
  item_type: 'folder' | 'document'
}

export interface ExportOptions {
  format: 'json' | 'csv'
  collection_id?: string | null
  include_folders?: boolean
  include_documents?: boolean
}

export interface CollectionCreateData {
  name: string
  description?: string
  color?: string
  icon?: string
}

export interface ToggleFavoriteResponse {
  is_favorite: boolean
}

// Paginated response type
interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

// Folder Favorites API
export const getFavoriteFolders = async (): Promise<FavoriteFolder[]> => {
  const response = await apiClient.get('/auth/favorites/folders/')
  // Handle both paginated and non-paginated responses
  if (Array.isArray(response.data)) {
    return response.data
  }
  // Paginated response
  return (response.data as PaginatedResponse<FavoriteFolder>).results || []
}

export const addFolderToFavorites = async (folderId: string): Promise<void> => {
  await apiClient.post('/auth/favorites/folders/add/', { folder_id: folderId })
}

export const removeFolderFromFavorites = async (folderId: string): Promise<void> => {
  await apiClient.delete(`/auth/favorites/folders/${folderId}/remove/`)
}

export const toggleFolderFavorite = async (folderId: string): Promise<ToggleFavoriteResponse> => {
  const response = await apiClient.post(`/auth/favorites/folders/${folderId}/toggle/`)
  return response.data
}

export const checkFolderFavorite = async (folderId: string): Promise<boolean> => {
  const response = await apiClient.get(`/auth/favorites/folders/${folderId}/check/`)
  return response.data.is_favorite
}

// Document Favorites API
export const getFavoriteDocuments = async (): Promise<FavoriteDocument[]> => {
  const response = await apiClient.get('/auth/favorites/documents/')
  // Handle both paginated and non-paginated responses
  if (Array.isArray(response.data)) {
    return response.data
  }
  // Paginated response
  return (response.data as PaginatedResponse<FavoriteDocument>).results || []
}

export const addDocumentToFavorites = async (documentId: string): Promise<void> => {
  await apiClient.post('/auth/favorites/documents/add/', { document_id: documentId })
}

export const removeDocumentFromFavorites = async (documentId: string): Promise<void> => {
  await apiClient.delete(`/auth/favorites/documents/${documentId}/remove/`)
}

export const toggleDocumentFavorite = async (
  documentId: string
): Promise<ToggleFavoriteResponse> => {
  const response = await apiClient.post(`/auth/favorites/documents/${documentId}/toggle/`)
  return response.data
}

export const checkDocumentFavorite = async (documentId: string): Promise<boolean> => {
  const response = await apiClient.get(`/auth/favorites/documents/${documentId}/check/`)
  return response.data.is_favorite
}

// Combined favorites getter (for sidebar quick access)
export const getAllFavorites = async (): Promise<{
  folders: FavoriteFolder[]
  documents: FavoriteDocument[]
}> => {
  const [folders, documents] = await Promise.all([getFavoriteFolders(), getFavoriteDocuments()])
  return { folders, documents }
}

// ============== Collection APIs ==============

// Get all collections (owned + shared with user)
export const getCollections = async (): Promise<FavoriteCollection[]> => {
  const response = await apiClient.get('/auth/favorites/collections/')
  if (Array.isArray(response.data)) {
    return response.data
  }
  return (response.data as PaginatedResponse<FavoriteCollection>).results || []
}

// Create a new collection
export const createCollection = async (data: CollectionCreateData): Promise<FavoriteCollection> => {
  const response = await apiClient.post('/auth/favorites/collections/create/', data)
  return response.data
}

// Get collection details
export const getCollectionDetail = async (
  collectionId: string
): Promise<FavoriteCollectionDetail> => {
  const response = await apiClient.get(`/auth/favorites/collections/${collectionId}/`)
  return response.data
}

// Update a collection
export const updateCollection = async (
  collectionId: string,
  data: Partial<CollectionCreateData>
): Promise<FavoriteCollection> => {
  const response = await apiClient.put(`/auth/favorites/collections/${collectionId}/update/`, data)
  return response.data
}

// Delete a collection
export const deleteCollection = async (collectionId: string): Promise<void> => {
  await apiClient.delete(`/auth/favorites/collections/${collectionId}/delete/`)
}

// Get items in a collection
export const getCollectionItems = async (
  collectionId: string
): Promise<{
  collection: FavoriteCollection
  folders: FavoriteFolder[]
  documents: FavoriteDocument[]
}> => {
  const response = await apiClient.get(`/auth/favorites/collections/${collectionId}/items/`)
  return response.data
}

// ============== Reorder APIs ==============

// Reorder collections
export const reorderCollections = async (items: ReorderItem[]): Promise<void> => {
  await apiClient.post('/auth/favorites/collections/reorder/', { items })
}

// Reorder favorite folders
export const reorderFavoriteFolders = async (items: ReorderItem[]): Promise<void> => {
  await apiClient.post('/auth/favorites/folders/reorder/', { items })
}

// Reorder favorite documents
export const reorderFavoriteDocuments = async (items: ReorderItem[]): Promise<void> => {
  await apiClient.post('/auth/favorites/documents/reorder/', { items })
}

// Move items to a collection
export const moveToCollection = async (request: MoveToCollectionRequest): Promise<void> => {
  await apiClient.post('/auth/favorites/move/', request)
}

// ============== Share APIs ==============

// User type for sharing
export interface ShareableUser {
  id: number
  username: string
  first_name: string
  last_name: string
  email: string
  department_name: string | null
}

// Get all users for sharing (exclude current user)
export const getShareableUsers = async (search?: string): Promise<ShareableUser[]> => {
  const params: Record<string, string | number> = { page_size: 100 } // Get more users at once
  if (search) {
    params.search = search
  }
  const response = await apiClient.get('/auth/users/', { params })
  // Handle paginated response
  if (response.data && Array.isArray(response.data.results)) {
    return response.data.results
  }
  // Handle non-paginated response (fallback)
  if (Array.isArray(response.data)) {
    return response.data
  }
  return []
}

// Get collection details including shared users
export const getCollectionDetails = async (
  collectionId: string
): Promise<FavoriteCollectionDetail> => {
  const response = await apiClient.get(`/auth/favorites/collections/${collectionId}/`)
  return response.data
}

// Share options interface
export interface ShareCollectionOptions {
  user_ids: number[]
  password?: string | null
  expires_at?: string | null
  remove_password?: boolean
}

// Share a collection with users
export const shareCollection = async (
  collectionId: string,
  options: ShareCollectionOptions
): Promise<FavoriteCollectionDetail> => {
  const response = await apiClient.post(
    `/auth/favorites/collections/${collectionId}/share/`,
    options
  )
  return response.data
}

// Remove all sharing from a collection
export const unshareCollection = async (collectionId: string): Promise<void> => {
  await apiClient.post(`/auth/favorites/collections/${collectionId}/unshare/`)
}

// ============== Export APIs ==============

// Export favorites as JSON or CSV
export const exportFavorites = async (options: ExportOptions): Promise<Blob> => {
  const response = await apiClient.post('/auth/favorites/export/', options, {
    responseType: 'blob',
  })
  return response.data
}

// Helper to download exported file
export const downloadExportedFavorites = async (options: ExportOptions): Promise<void> => {
  const blob = await exportFavorites(options)
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `favorites_export.${options.format}`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}
