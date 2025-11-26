/**
 * Share Service
 * Service for managing document shares
 */

import apiClient from './apiClient'

export type SharePermission = 'VIEW_ONLY' | 'VIEW_DOWNLOAD' | 'VIEW_DOWNLOAD_COMMENT'

export interface Share {
  id: string
  document: string
  document_id: string
  document_title: string
  token: string
  permission: SharePermission
  is_password_protected: boolean
  expires_at: string | null
  is_active: boolean
  recipient_emails: string[]
  access_count: number
  download_count: number
  view_count: number
  last_accessed_at: string | null
  created_by: string
  created_by_name: string
  created_by_email: string
  created_at: string
  updated_at: string
  revoked_at: string | null
  revoked_by: string | null
  allow_public_access: boolean
  max_access_count: number | null
  notes: string
  share_url: string
  is_expired: boolean
  is_accessible: boolean
}

export interface CreateShareRequest {
  document: string
  permission?: SharePermission
  password?: string
  expires_in_days?: number
  recipient_emails?: string[]
  allow_public_access?: boolean
  max_access_count?: number | null
  notes?: string
}

export interface ShareStatistics {
  total_shares: number
  active_shares: number
  expired_shares: number
  total_accesses: number
}

export interface ShareAccessRecord {
  id: string
  access_type: 'view' | 'download' | 'comment'
  user: string | null
  user_email: string | null
  ip_address: string
  user_agent: string
  accessed_at: string
  country: string
  city: string
}

export interface ShareAnalytics {
  access_count: number
  download_count: number
  view_count: number
  last_accessed_at: string | null
  unique_ips: number
  unique_users: number
  recent_accesses: ShareAccessRecord[]
}

/**
 * Create a new share for a document
 */
export const createShare = async (data: CreateShareRequest): Promise<Share> => {
  const response = await apiClient.post<Share>('/shares/', data)
  return response.data
}

/**
 * Get all shares for the current user
 */
export const getMyShares = async (): Promise<{
  statistics: ShareStatistics
  shares: Share[]
}> => {
  const response = await apiClient.get<{
    statistics: ShareStatistics
    results?: Share[]
    shares?: Share[]
  }>('/shares/my_shares/')

  return {
    statistics: response.data.statistics,
    shares: response.data.results || response.data.shares || [],
  }
}

/**
 * Get a share by ID
 */
export const getShare = async (shareId: string): Promise<Share> => {
  const response = await apiClient.get<Share>(`/shares/${shareId}/`)
  return response.data
}

/**
 * Update a share
 */
export const updateShare = async (
  shareId: string,
  data: Partial<CreateShareRequest>
): Promise<Share> => {
  const response = await apiClient.patch<Share>(`/shares/${shareId}/`, data)
  return response.data
}

/**
 * Revoke a share
 */
export const revokeShare = async (shareId: string, reason?: string): Promise<Share> => {
  const response = await apiClient.post<{ message: string; share: Share }>(
    `/shares/${shareId}/revoke/`,
    { reason }
  )
  return response.data.share
}

/**
 * Delete a share permanently
 */
export const deleteShare = async (shareId: string): Promise<void> => {
  await apiClient.delete(`/shares/${shareId}/`)
}

/**
 * Get analytics for a share
 */
export const getShareAnalytics = async (shareId: string): Promise<ShareAnalytics> => {
  const response = await apiClient.get<ShareAnalytics>(`/shares/${shareId}/analytics/`)
  return response.data
}

/**
 * Resend notifications for a share
 */
export const resendShareNotifications = async (
  shareId: string,
  message?: string
): Promise<void> => {
  await apiClient.post(`/shares/${shareId}/resend_notifications/`, { message })
}

/**
 * Get shares for a specific document
 */
export const getSharesForDocument = async (documentId: string): Promise<Share[]> => {
  const response = await apiClient.get<Share[]>('/shares/', {
    params: { document: documentId },
  })
  return Array.isArray(response.data)
    ? response.data
    : (response.data as { results?: Share[] }).results || []
}

/**
 * Permission label map
 */
export const PERMISSION_LABELS: Record<SharePermission, string> = {
  VIEW_ONLY: 'View Only',
  VIEW_DOWNLOAD: 'View & Download',
  VIEW_DOWNLOAD_COMMENT: 'View, Download & Comment',
}

/**
 * Permission descriptions
 */
export const PERMISSION_DESCRIPTIONS: Record<SharePermission, string> = {
  VIEW_ONLY: 'Recipients can only view the document',
  VIEW_DOWNLOAD: 'Recipients can view and download the document',
  VIEW_DOWNLOAD_COMMENT: 'Recipients can view, download, and comment on the document',
}

// Default export for convenience
const shareService = {
  createShare,
  getMyShares,
  getShare,
  updateShare,
  revokeShare,
  deleteShare,
  getShareAnalytics,
  resendShareNotifications,
  getSharesForDocument,
  PERMISSION_LABELS,
  PERMISSION_DESCRIPTIONS,
}

export default shareService
