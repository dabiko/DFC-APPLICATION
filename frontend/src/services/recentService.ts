/**
 * Recent Activities Service
 *
 * API service for managing recent file/folder activities.
 * Tracks user interactions with documents and folders for quick access.
 */

import apiClient from './apiClient'

// ============================================================================
// TYPES
// ============================================================================

export type ActivityType = 'VIEWED' | 'EDITED' | 'UPLOADED' | 'DOWNLOADED' | 'SHARED'
export type ResourceType = 'DOCUMENT' | 'FOLDER'
export type TimeGroup = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'older'

export interface RecentActivity {
  id: string
  user: number
  user_name?: string
  user_email?: string
  resource_type: ResourceType
  resource_id: string
  resource_name: string
  activity_type: ActivityType
  timestamp: string
  file_type: string
  file_size: number
  folder_id: string | null
  folder_name: string
  folder_path: string
  confidentiality_level: string
  is_pinned: boolean
  pinned_at: string | null
  time_group: TimeGroup
  relative_time: string
  can_pin?: boolean
}

export interface RecentActivityListItem {
  id: string
  resource_type: ResourceType
  resource_id: string
  resource_name: string
  activity_type: ActivityType
  timestamp: string
  file_type: string
  file_size: number
  folder_path: string
  confidentiality_level: string
  is_pinned: boolean
  time_group: TimeGroup
  relative_time: string
}

export interface GroupedActivities {
  today: RecentActivityListItem[]
  yesterday: RecentActivityListItem[]
  this_week: RecentActivityListItem[]
  last_week: RecentActivityListItem[]
  this_month: RecentActivityListItem[]
  older: RecentActivityListItem[]
}

export interface RecentActivitiesResponse {
  count: number
  pinned_count: number
  pinned: RecentActivityListItem[]
  grouped: GroupedActivities
  results: RecentActivityListItem[]
}

export interface RecentActivityStats {
  total: number
  by_type: Record<ActivityType, number>
  by_resource_type: Record<ResourceType, number>
  by_day: Array<{ date: string; count: number }>
  pinned_count: number
  pinned_limit: number
  retention_days: number
}

export interface RecentActivityFilters {
  activity_type?: ActivityType
  resource_type?: ResourceType
  days?: number
  pinned_only?: boolean
  limit?: number
}

export interface ClearHistoryOptions {
  before_date: string
  activity_type?: ActivityType | null
  resource_type?: ResourceType | null
  exclude_pinned?: boolean
}

export interface ClearHistoryResponse {
  message: string
  cleared_count: number
  before_date: string
  excluded_pinned: boolean
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get recent activities for the current user
 */
export const getRecentActivities = async (
  filters?: RecentActivityFilters
): Promise<RecentActivitiesResponse> => {
  const params: Record<string, string | number | boolean> = {}

  if (filters?.activity_type) {
    params.activity_type = filters.activity_type
  }
  if (filters?.resource_type) {
    params.resource_type = filters.resource_type
  }
  if (filters?.days !== undefined) {
    params.days = filters.days
  }
  if (filters?.pinned_only !== undefined) {
    params.pinned_only = filters.pinned_only
  }
  if (filters?.limit !== undefined) {
    params.limit = filters.limit
  }

  const response = await apiClient.get('/documents/recent/', { params })
  return response.data
}

/**
 * Get details of a specific recent activity
 */
export const getRecentActivityDetail = async (id: string): Promise<RecentActivity> => {
  const response = await apiClient.get(`/documents/recent/${id}/`)
  return response.data
}

/**
 * Pin or unpin a recent activity item
 */
export const togglePinActivity = async (id: string, isPinned: boolean): Promise<RecentActivity> => {
  const response = await apiClient.post(`/documents/recent/${id}/pin/`, {
    is_pinned: isPinned,
  })
  return response.data
}

/**
 * Pin a recent activity item
 */
export const pinActivity = async (id: string): Promise<RecentActivity> => {
  return togglePinActivity(id, true)
}

/**
 * Unpin a recent activity item
 */
export const unpinActivity = async (id: string): Promise<RecentActivity> => {
  return togglePinActivity(id, false)
}

/**
 * Clear recent activity history by date range
 */
export const clearHistory = async (options: ClearHistoryOptions): Promise<ClearHistoryResponse> => {
  const response = await apiClient.delete('/documents/recent/clear/', {
    data: options,
  })
  return response.data
}

/**
 * Get recent activity statistics
 */
export const getRecentActivityStats = async (): Promise<RecentActivityStats> => {
  const response = await apiClient.get('/documents/recent/stats/')
  return response.data
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get icon name for activity type
 */
export const getActivityTypeIcon = (activityType: ActivityType): string => {
  const icons: Record<ActivityType, string> = {
    VIEWED: 'eye',
    EDITED: 'pencil',
    UPLOADED: 'upload',
    DOWNLOADED: 'download',
    SHARED: 'share',
  }
  return icons[activityType] || 'file'
}

/**
 * Get color for activity type (with dark mode support)
 */
export const getActivityTypeColor = (activityType: ActivityType): string => {
  const colors: Record<ActivityType, string> = {
    VIEWED: 'text-blue-600 dark:text-blue-400',
    EDITED: 'text-green-600 dark:text-green-400',
    UPLOADED: 'text-purple-600 dark:text-purple-400',
    DOWNLOADED: 'text-orange-600 dark:text-orange-400',
    SHARED: 'text-teal-600 dark:text-teal-400',
  }
  return colors[activityType] || 'text-gray-600 dark:text-gray-400'
}

/**
 * Get background color for activity type badge (with dark mode support)
 */
export const getActivityTypeBgColor = (activityType: ActivityType): string => {
  const colors: Record<ActivityType, string> = {
    VIEWED: 'bg-blue-100 dark:bg-blue-900/30',
    EDITED: 'bg-green-100 dark:bg-green-900/30',
    UPLOADED: 'bg-purple-100 dark:bg-purple-900/30',
    DOWNLOADED: 'bg-orange-100 dark:bg-orange-900/30',
    SHARED: 'bg-teal-100 dark:bg-teal-900/30',
  }
  return colors[activityType] || 'bg-gray-100 dark:bg-gray-700'
}

/**
 * Get display label for activity type
 */
export const getActivityTypeLabel = (activityType: ActivityType): string => {
  const labels: Record<ActivityType, string> = {
    VIEWED: 'Viewed',
    EDITED: 'Edited',
    UPLOADED: 'Uploaded',
    DOWNLOADED: 'Downloaded',
    SHARED: 'Shared',
  }
  return labels[activityType] || activityType
}

/**
 * Get display label for resource type
 */
export const getResourceTypeLabel = (resourceType: ResourceType): string => {
  return resourceType === 'DOCUMENT' ? 'Document' : 'Folder'
}

/**
 * Get display label for time group
 */
export const getTimeGroupLabel = (timeGroup: TimeGroup): string => {
  const labels: Record<TimeGroup, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    this_week: 'This Week',
    last_week: 'Last Week',
    this_month: 'This Month',
    older: 'Older',
  }
  return labels[timeGroup] || timeGroup
}

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Check if an activity is for a document (vs folder)
 */
export const isDocumentActivity = (activity: RecentActivityListItem): boolean => {
  return activity.resource_type === 'DOCUMENT'
}

/**
 * Check if an activity is for a folder
 */
export const isFolderActivity = (activity: RecentActivityListItem): boolean => {
  return activity.resource_type === 'FOLDER'
}

/**
 * Get confidentiality level color
 */
export const getConfidentialityColor = (level: string): string => {
  const colors: Record<string, string> = {
    PUBLIC: 'text-gray-600 bg-gray-100',
    INTERNAL: 'text-blue-600 bg-blue-100',
    CONFIDENTIAL: 'text-orange-600 bg-orange-100',
    HIGHLY_CONFIDENTIAL: 'text-red-600 bg-red-100',
  }
  return colors[level] || 'text-gray-600 bg-gray-100'
}

/**
 * Get file type icon based on MIME type
 */
export const getFileTypeIcon = (fileType: string): string => {
  if (!fileType) return 'file'

  if (fileType.includes('pdf')) return 'file-pdf'
  if (fileType.includes('word') || fileType.includes('document')) return 'file-word'
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'file-excel'
  if (fileType.includes('powerpoint') || fileType.includes('presentation')) return 'file-powerpoint'
  if (fileType.includes('image')) return 'file-image'
  if (fileType.includes('video')) return 'file-video'
  if (fileType.includes('audio')) return 'file-audio'
  if (fileType.includes('text')) return 'file-text'
  if (fileType.includes('zip') || fileType.includes('archive')) return 'file-archive'

  return 'file'
}
