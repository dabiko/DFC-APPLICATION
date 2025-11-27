/**
 * Smart Folder Service
 *
 * API service for managing user-created smart folders (saved searches).
 * Smart folders dynamically show documents matching their search criteria.
 */

import apiClient from './apiClient'

// ============================================================================
// TYPES
// ============================================================================

export type SmartFolderIcon =
  | 'folder-search'
  | 'folder-star'
  | 'folder-clock'
  | 'folder-lock'
  | 'folder-check'
  | 'file-search'
  | 'filter'
  | 'search'
  | 'star'
  | 'clock'
  | 'shield'
  | 'bookmark'
  | 'tag'
  | 'archive'
  | 'calendar'
  | 'users'
  | 'briefcase'
  | 'file-text'
  | 'layers'

export type SmartFolderColor =
  | 'blue'
  | 'green'
  | 'yellow'
  | 'orange'
  | 'red'
  | 'purple'
  | 'pink'
  | 'teal'
  | 'indigo'
  | 'gray'

export type RelativeDate = 'today' | 'this_week' | 'this_month' | 'last_7_days' | 'last_30_days'

export type DocumentState = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED'

export type ConfidentialityLevel = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'HIGHLY_CONFIDENTIAL'

export interface SmartFolderCriteria {
  // Text search
  name_contains?: string
  search_text?: string

  // Document filters
  document_type?: string | string[]
  confidentiality_level?: ConfidentialityLevel | ConfidentialityLevel[]
  state?: DocumentState | DocumentState[]
  file_type?: string | string[]
  tags?: string | string[]

  // Size filters
  file_size_min?: number
  file_size_max?: number

  // Date filters
  relative_date?: RelativeDate
  date_range?: {
    from?: string
    to?: string
  }
  created_date_range?: {
    from?: string
    to?: string
  }

  // Location filters
  folder_id?: string | string[]
  folder_path?: string
  department_id?: number | number[]
  owner_id?: string | string[]
}

export interface SmartFolder {
  id: string
  name: string
  description: string
  criteria: SmartFolderCriteria
  icon: SmartFolderIcon
  color: SmartFolderColor
  owner: string
  owner_name: string
  department: number | null
  department_name: string | null
  is_personal: boolean
  is_global: boolean
  is_active: boolean
  document_count: number
  last_count_update: string | null
  include_owned: boolean
  include_shared: boolean
  display_order: number
  is_visible: boolean
  created_at: string
  updated_at: string
  created_by?: string
  created_by_name?: string
}

export interface SmartFolderListResponse {
  count: number
  next: string | null
  previous: string | null
  results: SmartFolder[]
}

export interface CreateSmartFolderRequest {
  name: string
  description?: string
  criteria: SmartFolderCriteria
  icon?: SmartFolderIcon
  color?: SmartFolderColor
  department?: number
  is_personal?: boolean
  is_global?: boolean
  include_owned?: boolean
  include_shared?: boolean
  is_visible?: boolean
}

export interface UpdateSmartFolderRequest {
  name?: string
  description?: string
  criteria?: SmartFolderCriteria
  icon?: SmartFolderIcon
  color?: SmartFolderColor
  is_active?: boolean
  include_owned?: boolean
  include_shared?: boolean
  is_visible?: boolean
  display_order?: number
}

export interface SmartFolderDocument {
  id: string
  title: string
  file_name: string
  file_size: number
  file_size_mb?: number
  file_type: string
  document_type: string
  confidentiality_level: ConfidentialityLevel
  state?: DocumentState
  owner?: string
  owner_name?: string
  department?: number | null
  department_name?: string | null
  folder?: string | null
  folder_name?: string | null
  version_number?: number
  is_current_version?: boolean
  created_at: string
  updated_at: string
  tags?: string[]
}

export interface SmartFolderDocumentsResponse {
  count: number
  smart_folder: {
    id: string
    name: string
    criteria: SmartFolderCriteria
  }
  documents: SmartFolderDocument[]
  // Alias for backwards compatibility
  results?: SmartFolderDocument[]
}

export interface ReorderResponse {
  success: boolean
  message: string
  updated_count: number
}

export interface RefreshCountResponse {
  id: string
  name: string
  document_count: number
  last_count_update: string
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get all smart folders for the current user
 */
export async function getSmartFolders(): Promise<SmartFolderListResponse> {
  const response = await apiClient.get<SmartFolderListResponse>('/folders/smart-folders/')
  return response.data
}

/**
 * Get visible smart folders only (for sidebar display)
 */
export async function getVisibleSmartFolders(): Promise<SmartFolder[]> {
  const response = await apiClient.get<SmartFolderListResponse>('/folders/smart-folders/')
  return response.data.results.filter((folder) => folder.is_visible && folder.is_active)
}

/**
 * Get a specific smart folder by ID
 */
export async function getSmartFolder(id: string): Promise<SmartFolder> {
  const response = await apiClient.get<SmartFolder>(`/folders/smart-folders/${id}/`)
  return response.data
}

/**
 * Create a new smart folder
 */
export async function createSmartFolder(data: CreateSmartFolderRequest): Promise<SmartFolder> {
  const response = await apiClient.post<SmartFolder>('/folders/smart-folders/', data)
  return response.data
}

/**
 * Update a smart folder
 */
export async function updateSmartFolder(
  id: string,
  data: UpdateSmartFolderRequest
): Promise<SmartFolder> {
  const response = await apiClient.patch<SmartFolder>(`/folders/smart-folders/${id}/`, data)
  return response.data
}

/**
 * Delete a smart folder
 */
export async function deleteSmartFolder(id: string): Promise<void> {
  await apiClient.delete(`/folders/smart-folders/${id}/`)
}

/**
 * Get documents matching a smart folder's criteria
 */
export async function getSmartFolderDocuments(
  id: string,
  limit?: number
): Promise<SmartFolderDocumentsResponse> {
  const response = await apiClient.get<SmartFolderDocumentsResponse>(
    `/folders/smart-folders/${id}/documents/`,
    { params: { limit } }
  )
  return response.data
}

/**
 * Refresh the cached document count for a smart folder
 */
export async function refreshSmartFolderCount(id: string): Promise<RefreshCountResponse> {
  const response = await apiClient.post<RefreshCountResponse>(
    `/folders/smart-folders/${id}/refresh/`
  )
  return response.data
}

/**
 * Reorder smart folders
 */
export async function reorderSmartFolders(orderedIds: string[]): Promise<ReorderResponse> {
  const response = await apiClient.post<ReorderResponse>('/folders/smart-folders/reorder/', {
    ordered_ids: orderedIds,
  })
  return response.data
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get all available icons
 */
export function getAvailableIcons(): SmartFolderIcon[] {
  return [
    'folder-search',
    'folder-star',
    'folder-clock',
    'folder-lock',
    'folder-check',
    'file-search',
    'filter',
    'search',
    'star',
    'clock',
    'shield',
    'bookmark',
    'tag',
    'archive',
    'calendar',
    'users',
    'briefcase',
    'file-text',
    'layers',
  ]
}

/**
 * Get all available colors
 */
export function getAvailableColors(): SmartFolderColor[] {
  return ['blue', 'green', 'yellow', 'orange', 'red', 'purple', 'pink', 'teal', 'indigo', 'gray']
}

/**
 * Get color classes for a smart folder color
 */
export function getSmartFolderColorClasses(color: SmartFolderColor): {
  bg: string
  text: string
  border: string
} {
  const colors: Record<SmartFolderColor, { bg: string; text: string; border: string }> = {
    blue: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-300 dark:border-blue-600',
    },
    green: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-600 dark:text-green-400',
      border: 'border-green-300 dark:border-green-600',
    },
    yellow: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-600 dark:text-yellow-400',
      border: 'border-yellow-300 dark:border-yellow-600',
    },
    orange: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-300 dark:border-orange-600',
    },
    red: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-300 dark:border-red-600',
    },
    purple: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-300 dark:border-purple-600',
    },
    pink: {
      bg: 'bg-pink-100 dark:bg-pink-900/30',
      text: 'text-pink-600 dark:text-pink-400',
      border: 'border-pink-300 dark:border-pink-600',
    },
    teal: {
      bg: 'bg-teal-100 dark:bg-teal-900/30',
      text: 'text-teal-600 dark:text-teal-400',
      border: 'border-teal-300 dark:border-teal-600',
    },
    indigo: {
      bg: 'bg-indigo-100 dark:bg-indigo-900/30',
      text: 'text-indigo-600 dark:text-indigo-400',
      border: 'border-indigo-300 dark:border-indigo-600',
    },
    gray: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-600 dark:text-gray-400',
      border: 'border-gray-300 dark:border-gray-600',
    },
  }
  return colors[color] || colors.blue
}

/**
 * Get display label for relative date
 */
export function getRelativeDateLabel(relativeDate: RelativeDate): string {
  const labels: Record<RelativeDate, string> = {
    today: 'Today',
    this_week: 'This Week',
    this_month: 'This Month',
    last_7_days: 'Last 7 Days',
    last_30_days: 'Last 30 Days',
  }
  return labels[relativeDate] || relativeDate
}

/**
 * Get available relative date options
 */
export function getRelativeDateOptions(): { value: RelativeDate; label: string }[] {
  return [
    { value: 'today', label: 'Today' },
    { value: 'this_week', label: 'This Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_7_days', label: 'Last 7 Days' },
    { value: 'last_30_days', label: 'Last 30 Days' },
  ]
}

/**
 * Build a human-readable description of the criteria
 */
export function describeCriteria(criteria: SmartFolderCriteria): string {
  const parts: string[] = []

  if (criteria.name_contains) {
    parts.push(`Name contains "${criteria.name_contains}"`)
  }

  if (criteria.search_text) {
    parts.push(`Contains "${criteria.search_text}"`)
  }

  if (criteria.document_type) {
    const types = Array.isArray(criteria.document_type)
      ? criteria.document_type.join(', ')
      : criteria.document_type
    parts.push(`Type: ${types}`)
  }

  if (criteria.confidentiality_level) {
    const levels = Array.isArray(criteria.confidentiality_level)
      ? criteria.confidentiality_level.join(', ')
      : criteria.confidentiality_level
    parts.push(`Confidentiality: ${levels}`)
  }

  if (criteria.state) {
    const states = Array.isArray(criteria.state) ? criteria.state.join(', ') : criteria.state
    parts.push(`State: ${states}`)
  }

  if (criteria.relative_date) {
    parts.push(`Modified: ${getRelativeDateLabel(criteria.relative_date)}`)
  }

  if (criteria.tags) {
    const tags = Array.isArray(criteria.tags) ? criteria.tags.join(', ') : criteria.tags
    parts.push(`Tags: ${tags}`)
  }

  if (parts.length === 0) {
    return 'All documents'
  }

  return parts.join(' • ')
}

export default {
  // API functions
  getSmartFolders,
  getVisibleSmartFolders,
  getSmartFolder,
  createSmartFolder,
  updateSmartFolder,
  deleteSmartFolder,
  getSmartFolderDocuments,
  refreshSmartFolderCount,
  reorderSmartFolders,
  // Utility functions
  getAvailableIcons,
  getAvailableColors,
  getSmartFolderColorClasses,
  getRelativeDateLabel,
  getRelativeDateOptions,
  describeCriteria,
}
