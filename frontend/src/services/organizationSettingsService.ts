/**
 * Organization Settings Service
 *
 * Handles all API calls for organization-level settings:
 * - General settings (branding, contact info)
 * - Security policies
 * - Feature flags
 * - Usage statistics
 */

import apiClient from './apiClient'

// =============================================================================
// Types
// =============================================================================

export interface OrganizationSettings {
  id: string
  logo: string | null
  logo_url: string | null
  primary_color: string
  secondary_color: string
  contact_email: string
  contact_phone: string
  website: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  postal_code: string
  country: string
  timezone: string
  date_format: string
  language: string
  default_confidentiality: 'public' | 'internal' | 'confidential' | 'highly_confidential'
  require_classification: boolean
  allow_external_sharing: boolean
  created_at: string
  updated_at: string
}

export interface Organization {
  id: number
  name: string
  domain: string
  slug: string
  registration_number: string
  tax_id: string
  industry: string
  country: string
  subscription_plan: 'free' | 'starter' | 'professional' | 'enterprise'
  subscription_status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'suspended'
  subscription_display: string
  max_users: number
  max_storage_gb: number
  max_documents: number
  current_user_count: number
  can_add_users: boolean
  trial_ends_at: string | null
  is_trial_expired: boolean
  days_until_trial_expires: number | null
  is_active: boolean
  settings: OrganizationSettings | null
  created_at: string
  updated_at: string
}

export interface SecurityPolicy {
  id: string
  // Password Policy
  password_min_length: number
  password_require_uppercase: boolean
  password_require_lowercase: boolean
  password_require_numbers: boolean
  password_require_special: boolean
  password_expiry_days: number
  password_history_count: number
  password_requirements: string[]
  // MFA Policy
  mfa_required: boolean
  mfa_required_for_admins: boolean
  mfa_grace_period_days: number
  allowed_mfa_methods: ('totp' | 'sms' | 'email')[]
  // Session Policy
  session_timeout_minutes: number
  max_concurrent_sessions: number
  require_reauthentication: boolean
  // Login Security
  max_login_attempts: number
  lockout_duration_minutes: number
  login_notification_enabled: boolean
  suspicious_activity_alerts: boolean
  // IP Restrictions
  ip_whitelist_enabled: boolean
  ip_whitelist: string[]
  // Data Security
  data_export_restricted: boolean
  require_encryption: boolean
  audit_log_retention_days: number
  // Timestamps
  created_at: string
  updated_at: string
}

export interface FeatureFlags {
  id: string
  // Core Features
  advanced_search: boolean
  ocr_processing: boolean
  version_control: boolean
  folder_templates: boolean
  // Collaboration
  external_sharing: boolean
  real_time_collaboration: boolean
  comments_annotations: boolean
  // Compliance & Security
  advanced_audit: boolean
  retention_policies: boolean
  legal_hold: boolean
  compliance_reports: boolean
  data_classification: boolean
  // Workflow & Automation
  basic_workflows: boolean
  advanced_workflows: boolean
  scheduled_tasks: boolean
  api_access: boolean
  webhooks: boolean
  // Analytics & Reporting
  basic_analytics: boolean
  advanced_analytics: boolean
  custom_reports: boolean
  export_reports: boolean
  // Administration
  custom_roles: boolean
  sso_integration: boolean
  custom_branding: boolean
  priority_support: boolean
  // Timestamps
  created_at: string
  updated_at: string
}

export interface UsageStats {
  current_users: number
  max_users: number
  users_percentage: number
  current_storage_gb: number
  max_storage_gb: number
  storage_percentage: number
  current_documents: number
  max_documents: number
  documents_percentage: number
  users_limit_reached: boolean
  storage_limit_reached: boolean
  documents_limit_reached: boolean
}

export interface AllOrganizationSettings {
  organization: Organization
  settings: OrganizationSettings
  security_policy: SecurityPolicy
  feature_flags: FeatureFlags
  usage: UsageStats
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Get all organization settings in a single request
 */
export const getAllOrganizationSettings = async (): Promise<AllOrganizationSettings> => {
  const response = await apiClient.get('/org-settings/all/')
  return response.data
}

/**
 * Get organization general settings
 */
export const getOrganizationGeneral = async (): Promise<Organization> => {
  const response = await apiClient.get('/org-settings/general/')
  return response.data
}

/**
 * Update organization general settings
 */
export const updateOrganizationGeneral = async (
  data: Partial<Organization> & { settings?: Partial<OrganizationSettings> }
): Promise<Organization> => {
  const response = await apiClient.put('/org-settings/general/', data)
  return response.data
}

/**
 * Get security policy settings
 */
export const getSecurityPolicy = async (): Promise<SecurityPolicy> => {
  const response = await apiClient.get('/org-settings/security/')
  return response.data
}

/**
 * Update security policy settings
 */
export const updateSecurityPolicy = async (
  data: Partial<SecurityPolicy>
): Promise<SecurityPolicy> => {
  const response = await apiClient.put('/org-settings/security/', data)
  return response.data
}

/**
 * Get feature flags
 */
export const getFeatureFlags = async (): Promise<FeatureFlags> => {
  const response = await apiClient.get('/org-settings/features/')
  return response.data
}

/**
 * Get usage statistics
 */
export const getUsageStats = async (): Promise<UsageStats> => {
  const response = await apiClient.get('/org-settings/usage/')
  return response.data
}

/**
 * Upload organization logo
 */
export const uploadLogo = async (file: File): Promise<OrganizationSettings> => {
  const formData = new FormData()
  formData.append('logo', file)

  const response = await apiClient.post('/org-settings/logo/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

/**
 * Delete organization logo
 */
export const deleteLogo = async (): Promise<void> => {
  await apiClient.delete('/org-settings/logo/')
}

// =============================================================================
// Default Export
// =============================================================================

const organizationSettingsService = {
  getAllOrganizationSettings,
  getOrganizationGeneral,
  updateOrganizationGeneral,
  getSecurityPolicy,
  updateSecurityPolicy,
  getFeatureFlags,
  getUsageStats,
  uploadLogo,
  deleteLogo,
}

export default organizationSettingsService
