/**
 * Shared With Me Service
 *
 * API service for managing items shared with the current user.
 * Provides access to documents and folders shared by others.
 */

import apiClient from './apiClient'

// ============================================================================
// TYPES
// ============================================================================

export type ResourceType = 'DOCUMENT' | 'FOLDER'
export type PermissionLevel = 'VIEW' | 'COMMENT' | 'EDIT' | 'FULL'
export type ShareSource = 'DIRECT' | 'FOLDER_INHERITED' | 'DEPARTMENT' | 'TEAM'
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED'

export interface SharedByUser {
  id: string
  first_name: string
  last_name: string
  email: string
  avatar?: string | null
  is_external: boolean
}

export interface SharedItem {
  id: string
  resource_type: ResourceType
  resource_id: string
  resource_name: string
  file_type: string
  file_size: number
  folder_path: string
  confidentiality_level: string
  thumbnail_url?: string
  permission_level: PermissionLevel
  share_source: ShareSource
  shared_at: string
  expires_at?: string | null
  message?: string
  is_shortcut: boolean
  shortcut_order: number
  first_viewed_at?: string | null
  last_accessed_at?: string | null
  access_count: number
  is_hidden: boolean
  is_notified: boolean
  is_acknowledged: boolean
  is_external_share: boolean
  is_active: boolean
  shared_by: SharedByUser
  is_expired: boolean
  is_accessible: boolean
  can_edit: boolean
  can_comment: boolean
  can_delete: boolean
  time_ago: string
}

export interface SharedItemListItem {
  id: string
  resource_type: ResourceType
  resource_id: string
  resource_name: string
  file_type: string
  file_size: number
  confidentiality_level: string
  permission_level: PermissionLevel
  shared_at: string
  is_shortcut: boolean
  shortcut_order: number
  is_external_share: boolean
  shared_by_id: string
  shared_by_name: string
  shared_by_email: string
  time_ago: string
}

export interface GroupedSharedItems {
  shortcuts: SharedItemListItem[]
  today: SharedItemListItem[]
  this_week: SharedItemListItem[]
  this_month: SharedItemListItem[]
  earlier: SharedItemListItem[]
  total_count: number
}

export interface SharedWithMeStats {
  total: number
  unread: number
  documents: number
  folders: number
  shortcuts: number
  external: number
  by_permission: Record<PermissionLevel, number>
  by_sharer: Array<{
    shared_by__id: string
    shared_by__first_name: string
    shared_by__last_name: string
    shared_by__email: string
    count: number
  }>
  recent_count: number
  pending_invitations: number
}

export interface ShareInvitation {
  id: string
  resource_type: ResourceType
  resource_id: string
  resource_name: string
  permission_level: PermissionLevel
  message?: string
  status: InvitationStatus
  invited_at: string
  expires_at?: string | null
  responded_at?: string | null
  requires_acknowledgement: boolean
  acknowledgement_text?: string
  invited_by: SharedByUser
  is_expired: boolean
  is_pending: boolean
  time_ago: string
}

export interface SharedWithMeFilters {
  resource_type?: ResourceType
  shared_by?: string
  permission_level?: PermissionLevel
  is_external?: boolean
  is_shortcut?: boolean
  date_from?: string
  date_to?: string
  search?: string
}

export interface ShareWithUsersRequest {
  document_id?: string
  folder_id?: string
  recipient_ids: string[]
  permission_level?: PermissionLevel
  message?: string
  expires_in_days?: number
  notify?: boolean
  require_acceptance?: boolean
  require_acknowledgement?: boolean
  acknowledgement_text?: string
}

export interface ShareWithUsersResponse {
  success: boolean
  message: string
  results: Array<{
    type: 'share' | 'invitation'
    recipient_id: string
    share_id?: string
    invitation_id?: string
  }>
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get all items shared with the current user (grouped by time)
 */
export async function getSharedWithMe(filters?: SharedWithMeFilters): Promise<GroupedSharedItems> {
  const params = new URLSearchParams()

  if (filters) {
    if (filters.resource_type) params.append('resource_type', filters.resource_type)
    if (filters.shared_by) params.append('shared_by', filters.shared_by)
    if (filters.permission_level) params.append('permission_level', filters.permission_level)
    if (filters.is_external !== undefined) params.append('is_external', String(filters.is_external))
    if (filters.is_shortcut !== undefined) params.append('is_shortcut', String(filters.is_shortcut))
    if (filters.date_from) params.append('date_from', filters.date_from)
    if (filters.date_to) params.append('date_to', filters.date_to)
    if (filters.search) params.append('search', filters.search)
  }

  const response = await apiClient.get<GroupedSharedItems>(`/shared-with-me/?${params.toString()}`)
  return response.data
}

/**
 * Get a single shared item by ID
 */
export async function getSharedItem(id: string): Promise<SharedItem> {
  const response = await apiClient.get<SharedItem>(`/shared-with-me/${id}/`)
  return response.data
}

/**
 * Add or remove an item from shortcuts
 */
export async function toggleShortcut(
  id: string,
  isShortcut: boolean,
  order?: number
): Promise<{ success: boolean; is_shortcut: boolean; shortcut_order: number }> {
  const response = await apiClient.post(`/shared-with-me/${id}/shortcut/`, {
    is_shortcut: isShortcut,
    order,
  })
  return response.data
}

/**
 * Hide an item from the shared with me list
 */
export async function hideSharedItem(id: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post(`/shared-with-me/${id}/hide/`)
  return response.data
}

/**
 * Unhide a previously hidden item
 */
export async function unhideSharedItem(id: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post(`/shared-with-me/${id}/unhide/`)
  return response.data
}

/**
 * Record access to a shared item
 */
export async function recordAccess(id: string): Promise<{ success: boolean }> {
  const response = await apiClient.post(`/shared-with-me/${id}/access/`)
  return response.data
}

/**
 * Leave a shared item (remove yourself from the share)
 */
export async function leaveSharedItem(id: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.delete(`/shared-with-me/${id}/leave/`)
  return response.data
}

/**
 * Request higher permission level for a shared item
 */
export async function requestAccess(
  id: string,
  requestedPermission: PermissionLevel,
  reason: string
): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post(`/shared-with-me/${id}/request-access/`, {
    requested_permission: requestedPermission,
    reason,
  })
  return response.data
}

/**
 * Get statistics for shared with me items
 */
export async function getSharedWithMeStats(): Promise<SharedWithMeStats> {
  const response = await apiClient.get<SharedWithMeStats>('/shared-with-me/stats/')
  return response.data
}

/**
 * Get list of hidden items
 */
export async function getHiddenItems(): Promise<SharedItemListItem[]> {
  const response = await apiClient.get<SharedItemListItem[]>('/shared-with-me/hidden/')
  return response.data
}

// ============================================================================
// INVITATION API FUNCTIONS
// ============================================================================

/**
 * Get all share invitations for the current user
 */
export async function getShareInvitations(): Promise<ShareInvitation[]> {
  const response = await apiClient.get<ShareInvitation[]>('/share-invitations/')
  return response.data
}

/**
 * Get only pending share invitations
 */
export async function getPendingInvitations(): Promise<ShareInvitation[]> {
  const response = await apiClient.get<ShareInvitation[]>('/share-invitations/pending/')
  return response.data
}

/**
 * Accept a share invitation
 */
export async function acceptInvitation(
  id: string,
  acknowledged?: boolean
): Promise<{ success: boolean; message: string; shared_item: SharedItem }> {
  const response = await apiClient.post(`/share-invitations/${id}/accept/`, {
    acknowledged: acknowledged ?? false,
  })
  return response.data
}

/**
 * Decline a share invitation
 */
export async function declineInvitation(
  id: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post(`/share-invitations/${id}/decline/`, {
    reason: reason ?? '',
  })
  return response.data
}

// ============================================================================
// SHARING API FUNCTIONS
// ============================================================================

/**
 * Share a document or folder with specific users
 */
export async function shareWithUsers(
  request: ShareWithUsersRequest
): Promise<ShareWithUsersResponse> {
  const response = await apiClient.post<ShareWithUsersResponse>('/share-with-users/', request)
  return response.data
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get permission level display label
 */
export function getPermissionLabel(level: PermissionLevel): string {
  const labels: Record<PermissionLevel, string> = {
    VIEW: 'Can View',
    COMMENT: 'Can Comment',
    EDIT: 'Can Edit',
    FULL: 'Full Access',
  }
  return labels[level] || level
}

/**
 * Get permission level color for badges
 */
export function getPermissionColor(level: PermissionLevel): string {
  const colors: Record<PermissionLevel, string> = {
    VIEW: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800',
    COMMENT: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
    EDIT: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
    FULL: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
  }
  return colors[level] || colors.VIEW
}

/**
 * Get share source display label
 */
export function getShareSourceLabel(source: ShareSource): string {
  const labels: Record<ShareSource, string> = {
    DIRECT: 'Shared directly',
    FOLDER_INHERITED: 'From folder access',
    DEPARTMENT: 'Department access',
    TEAM: 'Team access',
  }
  return labels[source] || source
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Get file type icon name based on file extension
 */
export function getFileTypeIcon(fileType: string): string {
  const iconMap: Record<string, string> = {
    pdf: 'file-text',
    doc: 'file-text',
    docx: 'file-text',
    xls: 'file-spreadsheet',
    xlsx: 'file-spreadsheet',
    ppt: 'file-presentation',
    pptx: 'file-presentation',
    jpg: 'image',
    jpeg: 'image',
    png: 'image',
    gif: 'image',
    svg: 'image',
    mp4: 'video',
    mov: 'video',
    avi: 'video',
    mp3: 'music',
    wav: 'music',
    zip: 'archive',
    rar: 'archive',
    '7z': 'archive',
    txt: 'file-text',
    csv: 'file-spreadsheet',
    json: 'file-code',
    xml: 'file-code',
    html: 'file-code',
    css: 'file-code',
    js: 'file-code',
    ts: 'file-code',
  }
  return iconMap[fileType?.toLowerCase()] || 'file'
}

export default {
  getSharedWithMe,
  getSharedItem,
  toggleShortcut,
  hideSharedItem,
  unhideSharedItem,
  recordAccess,
  leaveSharedItem,
  requestAccess,
  getSharedWithMeStats,
  getHiddenItems,
  getShareInvitations,
  getPendingInvitations,
  acceptInvitation,
  declineInvitation,
  shareWithUsers,
  getPermissionLabel,
  getPermissionColor,
  getShareSourceLabel,
  formatFileSize,
  getFileTypeIcon,
}
