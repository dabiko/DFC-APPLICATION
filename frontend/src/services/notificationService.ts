/**
 * Notification Service
 *
 * API service for managing user notifications.
 * Provides access to in-app notifications and notification preferences.
 */

import apiClient from './apiClient'

// ============================================================================
// TYPES
// ============================================================================

export type NotificationType =
  | 'SHARE_RECEIVED'
  | 'SHARE_INVITATION'
  | 'ACCESS_REQUEST'
  | 'ACCESS_GRANTED'
  | 'ACCESS_DENIED'
  | 'SHARE_REVOKED'
  | 'SHARE_EXPIRING'
  | 'INVITATION_ACCEPTED'
  | 'INVITATION_DECLINED'
  | 'WEEKLY_DIGEST'

export interface Notification {
  id: string
  notification_type: NotificationType
  title: string
  message: string
  actor?: string | null
  actor_name?: string | null
  actor_email?: string | null
  resource_type: string
  resource_id?: string | null
  resource_name: string
  action_url: string
  is_read: boolean
  read_at?: string | null
  created_at: string
  time_ago: string
}

export interface NotificationListResponse {
  results: Notification[]
  total_count: number
  unread_count: number
}

export interface NotificationCount {
  total: number
  unread: number
}

export interface NotificationPreferences {
  in_app_share_received: boolean
  in_app_share_invitation: boolean
  in_app_access_request: boolean
  in_app_share_expiring: boolean
  email_share_received: boolean
  email_share_invitation: boolean
  email_access_request: boolean
  email_share_expiring: boolean
  weekly_digest_enabled: boolean
  weekly_digest_day: number
  updated_at: string
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get all notifications for the current user
 */
export async function getNotifications(): Promise<NotificationListResponse> {
  const response = await apiClient.get<NotificationListResponse>('/notifications/')
  return response.data
}

/**
 * Get only unread notifications
 */
export async function getUnreadNotifications(): Promise<{
  results: Notification[]
  unread_count: number
}> {
  const response = await apiClient.get('/notifications/unread/')
  return response.data
}

/**
 * Get notification counts
 */
export async function getNotificationCount(): Promise<NotificationCount> {
  const response = await apiClient.get<NotificationCount>('/notifications/count/')
  return response.data
}

/**
 * Get a single notification by ID
 */
export async function getNotification(id: string): Promise<Notification> {
  const response = await apiClient.get<Notification>(`/notifications/${id}/`)
  return response.data
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(id: string): Promise<{ success: boolean; is_read: boolean }> {
  const response = await apiClient.post(`/notifications/${id}/read/`)
  return response.data
}

/**
 * Mark multiple notifications as read
 * If no IDs provided, marks all as read
 */
export async function markNotificationsRead(
  notificationIds?: string[]
): Promise<{ success: boolean; marked_count: number }> {
  const response = await apiClient.post('/notifications/mark_read/', {
    notification_ids: notificationIds || [],
  })
  return response.data
}

/**
 * Delete all notifications
 */
export async function clearAllNotifications(): Promise<{
  success: boolean
  deleted_count: number
}> {
  const response = await apiClient.delete('/notifications/clear_all/')
  return response.data
}

/**
 * Delete only read notifications
 */
export async function clearReadNotifications(): Promise<{
  success: boolean
  deleted_count: number
}> {
  const response = await apiClient.delete('/notifications/clear_read/')
  return response.data
}

// ============================================================================
// NOTIFICATION PREFERENCES
// ============================================================================

/**
 * Get current user's notification preferences
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const response = await apiClient.get<NotificationPreferences>('/notification-preferences/')
  return response.data
}

/**
 * Update notification preferences (partial update)
 */
export async function updateNotificationPreferences(
  preferences: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const response = await apiClient.patch<NotificationPreferences>(
    '/notification-preferences/',
    preferences
  )
  return response.data
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get notification type icon name
 */
export function getNotificationIcon(type: NotificationType): string {
  const iconMap: Record<NotificationType, string> = {
    SHARE_RECEIVED: 'share-2',
    SHARE_INVITATION: 'mail',
    ACCESS_REQUEST: 'key',
    ACCESS_GRANTED: 'check-circle',
    ACCESS_DENIED: 'x-circle',
    SHARE_REVOKED: 'user-minus',
    SHARE_EXPIRING: 'clock',
    INVITATION_ACCEPTED: 'user-check',
    INVITATION_DECLINED: 'user-x',
    WEEKLY_DIGEST: 'calendar',
  }
  return iconMap[type] || 'bell'
}

/**
 * Get notification type color
 */
export function getNotificationColor(type: NotificationType): string {
  const colorMap: Record<NotificationType, string> = {
    SHARE_RECEIVED: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
    SHARE_INVITATION: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
    ACCESS_REQUEST: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30',
    ACCESS_GRANTED: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
    ACCESS_DENIED: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
    SHARE_REVOKED: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
    SHARE_EXPIRING: 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30',
    INVITATION_ACCEPTED: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
    INVITATION_DECLINED: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800',
    WEEKLY_DIGEST: 'text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/30',
  }
  return colorMap[type] || 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800'
}

/**
 * Get notification type label
 */
export function getNotificationTypeLabel(type: NotificationType): string {
  const labelMap: Record<NotificationType, string> = {
    SHARE_RECEIVED: 'Share',
    SHARE_INVITATION: 'Invitation',
    ACCESS_REQUEST: 'Access Request',
    ACCESS_GRANTED: 'Access Granted',
    ACCESS_DENIED: 'Access Denied',
    SHARE_REVOKED: 'Revoked',
    SHARE_EXPIRING: 'Expiring Soon',
    INVITATION_ACCEPTED: 'Accepted',
    INVITATION_DECLINED: 'Declined',
    WEEKLY_DIGEST: 'Digest',
  }
  return labelMap[type] || type
}

export default {
  getNotifications,
  getUnreadNotifications,
  getNotificationCount,
  getNotification,
  markAsRead,
  markNotificationsRead,
  clearAllNotifications,
  clearReadNotifications,
  getNotificationPreferences,
  updateNotificationPreferences,
  getNotificationIcon,
  getNotificationColor,
  getNotificationTypeLabel,
}
