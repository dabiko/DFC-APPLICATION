/**
 * Settings Service
 *
 * Handles all API calls for user settings:
 * - Profile management
 * - User preferences
 * - Notification settings
 * - Security settings
 */

import apiClient from './apiClient'

// =============================================================================
// Types
// =============================================================================

export interface UserProfile {
  id: number
  username: string
  employee_id: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  phone_number: string
  job_title: string
  avatar: string | null
  address_line1: string
  address_line2: string
  city: string
  state: string
  postal_code: string
  country: string
  organization: number | null
  organization_name: string | null
  department: number | null
  department_name: string | null
  date_joined: string
  last_login: string | null
  created_at: string
  updated_at: string
}

export interface UpdateProfileData {
  first_name?: string
  last_name?: string
  phone_number?: string
  job_title?: string
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
}

export interface UserPreferences {
  // Display Settings
  theme: 'light' | 'dark' | 'system'
  display_density: 'comfortable' | 'compact'
  // Language and Locale
  language: string
  timezone: string
  date_format: string
  time_format: '12h' | '24h'
  // Document View
  default_document_view: 'grid' | 'list'
  items_per_page: number
  show_file_extensions: boolean
  show_thumbnails: boolean
  // Navigation
  start_page: string
  sidebar_collapsed: boolean
  show_recent_items: boolean
  recent_items_count: number
  // Keyboard & Accessibility
  enable_keyboard_shortcuts: boolean
  enable_animations: boolean
  high_contrast_mode: boolean
  // Timestamps
  created_at: string
  updated_at: string
}

export interface NotificationSettings {
  // Email Notifications
  email_enabled: boolean
  email_document_shared: boolean
  email_workflow_assigned: boolean
  email_workflow_completed: boolean
  email_retention_reminder: boolean
  email_weekly_digest: boolean
  email_security_alerts: boolean
  // In-App Notifications
  in_app_enabled: boolean
  in_app_document_shared: boolean
  in_app_workflow_updates: boolean
  in_app_mentions: boolean
  in_app_system_updates: boolean
  // Desktop Notifications
  desktop_enabled: boolean
  // Quiet Hours
  quiet_hours_enabled: boolean
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  // Sound
  notification_sound: boolean
  // Timestamps
  created_at: string
  updated_at: string
}

export interface SecuritySettings {
  // Session
  session_timeout: number
  require_mfa_for_sensitive: boolean
  // Login Security
  login_notification_email: boolean
  login_notification_new_device: boolean
  login_notification_new_location: boolean
  // IP Whitelist
  ip_whitelist_display: string[]
  // API Access
  api_access_enabled: boolean
  // Timestamps
  created_at: string
  updated_at: string
}

export interface AllSettings {
  profile: UserProfile
  preferences: UserPreferences
  notifications: NotificationSettings
  security: SecuritySettings
}

export interface Session {
  id: string
  device: string
  browser: string
  ip_address: string
  last_activity: string
  is_current: boolean
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Get all user settings in a single request
 */
export const getAllSettings = async (): Promise<AllSettings> => {
  const response = await apiClient.get('/settings/all/')
  return response.data
}

// =============================================================================
// Profile
// =============================================================================

/**
 * Get current user profile
 */
export const getProfile = async (): Promise<UserProfile> => {
  const response = await apiClient.get('/settings/profile/')
  return response.data
}

/**
 * Update user profile
 */
export const updateProfile = async (data: UpdateProfileData): Promise<UserProfile> => {
  const response = await apiClient.patch('/settings/profile/', data)
  return response.data
}

/**
 * Upload user avatar
 */
export const uploadAvatar = async (file: File): Promise<UserProfile> => {
  const formData = new FormData()
  formData.append('avatar', file)

  const response = await apiClient.post('/settings/profile/avatar/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

/**
 * Delete user avatar
 */
export const deleteAvatar = async (): Promise<void> => {
  await apiClient.delete('/settings/profile/avatar/')
}

// =============================================================================
// Preferences
// =============================================================================

/**
 * Get user preferences
 */
export const getPreferences = async (): Promise<UserPreferences> => {
  const response = await apiClient.get('/settings/preferences/')
  return response.data
}

/**
 * Update user preferences
 */
export const updatePreferences = async (
  data: Partial<UserPreferences>
): Promise<UserPreferences> => {
  const response = await apiClient.patch('/settings/preferences/', data)
  return response.data
}

/**
 * Quick update for common preferences (theme, sidebar, view)
 */
export const updateQuickPreferences = async (data: {
  theme?: 'light' | 'dark' | 'system'
  sidebar_collapsed?: boolean
  default_document_view?: 'grid' | 'list'
}): Promise<UserPreferences> => {
  const response = await apiClient.patch('/settings/quick/', data)
  return response.data
}

// =============================================================================
// Notifications
// =============================================================================

/**
 * Get notification settings
 */
export const getNotificationSettings = async (): Promise<NotificationSettings> => {
  const response = await apiClient.get('/settings/notifications/')
  return response.data
}

/**
 * Update notification settings
 */
export const updateNotificationSettings = async (
  data: Partial<NotificationSettings>
): Promise<NotificationSettings> => {
  const response = await apiClient.patch('/settings/notifications/', data)
  return response.data
}

// =============================================================================
// Security
// =============================================================================

/**
 * Get security settings
 */
export const getSecuritySettings = async (): Promise<SecuritySettings> => {
  const response = await apiClient.get('/settings/security/')
  return response.data
}

/**
 * Update security settings
 */
export const updateSecuritySettings = async (
  data: Partial<SecuritySettings> & { ip_whitelist_list?: string[] }
): Promise<SecuritySettings> => {
  const response = await apiClient.patch('/settings/security/', data)
  return response.data
}

// =============================================================================
// Sessions
// =============================================================================

/**
 * Get list of active sessions
 */
export const getSessions = async (): Promise<{ sessions: Session[] }> => {
  const response = await apiClient.get('/settings/sessions/')
  return response.data
}

/**
 * Revoke a specific session
 */
export const revokeSession = async (sessionId: string): Promise<void> => {
  await apiClient.delete(`/settings/sessions/?session_id=${sessionId}`)
}

/**
 * Revoke all other sessions
 */
export const revokeAllOtherSessions = async (): Promise<void> => {
  await apiClient.delete('/settings/sessions/?session_id=all_others')
}

// =============================================================================
// Default Export
// =============================================================================

const settingsService = {
  // All Settings
  getAllSettings,
  // Profile
  getProfile,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  // Preferences
  getPreferences,
  updatePreferences,
  updateQuickPreferences,
  // Notifications
  getNotificationSettings,
  updateNotificationSettings,
  // Security
  getSecuritySettings,
  updateSecuritySettings,
  // Sessions
  getSessions,
  revokeSession,
  revokeAllOtherSessions,
}

export default settingsService
