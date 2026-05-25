/**
 * System Administration Service
 *
 * Provides API methods for super admin system management.
 */

import apiClient from './apiClient'

// Types
export interface SystemSettings {
  id: string
  // Platform Identity
  platform_name: string
  platform_tagline: string
  support_email: string
  support_phone: string
  // Maintenance
  maintenance_mode: boolean
  maintenance_message: string
  maintenance_allowed_ips: string[]
  maintenance_started_at: string | null
  maintenance_started_by_name: string | null
  maintenance_estimated_end: string | null
  // Registration
  allow_registration: boolean
  require_email_verification: boolean
  auto_approve_organizations: boolean
  default_trial_days: number
  // Security
  global_rate_limit: number
  max_file_size_mb: number
  allowed_file_types: string[]
  blocked_file_types: string[]
  // Email
  email_from_name: string
  email_from_address: string
  smtp_host: string
  smtp_port: number
  smtp_use_tls: boolean
  smtp_username: string
  // Storage
  storage_provider: 'minio' | 's3' | 'azure' | 'gcs'
  storage_region: string
  storage_bucket: string
  enable_redundant_storage: boolean
  // Search
  search_provider: 'elasticsearch' | 'opensearch' | 'database'
  search_index_delay_seconds: number
  enable_ocr: boolean
  ocr_languages: string[]
  // Audit & Compliance
  audit_retention_days: number
  enable_gdpr_compliance: boolean
  data_residency_required: boolean
  // Feature Toggles
  enable_public_api: boolean
  enable_webhooks: boolean
  enable_third_party_integrations: boolean
  // Timestamps
  created_at: string
  updated_at: string
}

export interface AuditConfiguration {
  id: string
  // Event Categories
  log_auth_events: boolean
  log_document_events: boolean
  log_folder_events: boolean
  log_user_events: boolean
  log_permission_events: boolean
  log_search_events: boolean
  log_api_events: boolean
  log_system_events: boolean
  // Alerts
  alert_on_failed_logins: boolean
  failed_login_threshold: number
  alert_on_bulk_deletion: boolean
  bulk_deletion_threshold: number
  alert_on_permission_changes: boolean
  alert_recipients: string[]
  // Timestamps
  created_at: string
  updated_at: string
}

export interface PlatformAnnouncement {
  id: string
  title: string
  message: string
  severity: 'info' | 'warning' | 'critical' | 'maintenance'
  is_active: boolean
  is_dismissible: boolean
  target_all_users: boolean
  target_plans: string[]
  starts_at: string | null
  ends_at: string | null
  created_by: string
  created_by_name: string | null
  created_at: string
  updated_at: string
}

export interface SystemHealthCheck {
  service_name: string
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
  response_time_ms: number | null
  details: Record<string, unknown>
  error_message: string
  checked_at: string | null
}

export interface SystemHealth {
  overall_status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
  services: Record<string, SystemHealthCheck>
  checked_at: string
}

export interface PlatformStats {
  total_organizations: number
  active_organizations: number
  trial_organizations: number
  total_users: number
  active_users_today: number
  total_documents: number
  total_storage_used_gb: number
  api_requests_today: number
  organizations_by_plan: Record<string, number>
  recent_signups: number
  // MinIO object store
  bucket_used_bytes: number
  bucket_used_gb: number
  server_total_bytes: number
  server_total_gb: number
  server_available_bytes: number
  server_available_gb: number
}

export interface OrganizationSummary {
  id: number
  name: string
  domain: string
  subscription_plan: string
  subscription_status: string
  max_users: number
  current_user_count: number
  max_storage_gb: number
  is_active: boolean
  created_at: string
}

export interface OrganizationDetail extends OrganizationSummary {
  slug: string
  max_documents: number
  trial_ends_at: string | null
  registration_number: string
  tax_id: string
  industry: string
  country: string
  feature_flags: Record<string, boolean>
  updated_at: string
}

export interface FeatureFlagsUpdate {
  // Core Features
  advanced_search?: boolean
  ocr_processing?: boolean
  version_control?: boolean
  folder_templates?: boolean
  // Collaboration
  external_sharing?: boolean
  real_time_collaboration?: boolean
  comments_annotations?: boolean
  // Compliance & Security
  advanced_audit?: boolean
  retention_policies?: boolean
  legal_hold?: boolean
  compliance_reports?: boolean
  data_classification?: boolean
  // Workflow & Automation
  basic_workflows?: boolean
  advanced_workflows?: boolean
  scheduled_tasks?: boolean
  api_access?: boolean
  webhooks?: boolean
  // Analytics & Reporting
  basic_analytics?: boolean
  advanced_analytics?: boolean
  custom_reports?: boolean
  export_reports?: boolean
  // Administration
  custom_roles?: boolean
  sso_integration?: boolean
  custom_branding?: boolean
  priority_support?: boolean
}

// Public maintenance status (no auth required — polled by frontend during maintenance)
export interface MaintenanceStatus {
  maintenance_mode: boolean
  message: string
  estimated_end: string | null
  started_at: string | null
  started_by_name: string | null
}

// Public Platform Identity (no auth required — used by landing page)
export interface PublicPlatformInfo {
  platform_name: string
  platform_tagline: string
  support_email: string
  support_phone: string
}

export async function getPublicPlatformInfo(): Promise<PublicPlatformInfo> {
  const response = await apiClient.get('/system/public-info/')
  return response.data
}

export async function getMaintenanceStatus(): Promise<MaintenanceStatus> {
  const response = await apiClient.get('/system/status/')
  return response.data
}

// System Settings
export async function getSystemSettings(): Promise<SystemSettings> {
  const response = await apiClient.get('/system/settings/')
  return response.data
}

export async function updateSystemSettings(
  settings: Partial<SystemSettings>
): Promise<SystemSettings> {
  const response = await apiClient.patch('/system/settings/', settings)
  return response.data
}

// Audit Configuration
export async function getAuditConfiguration(): Promise<AuditConfiguration> {
  const response = await apiClient.get('/system/audit-config/')
  return response.data
}

export async function updateAuditConfiguration(
  config: Partial<AuditConfiguration>
): Promise<AuditConfiguration> {
  const response = await apiClient.patch('/system/audit-config/', config)
  return response.data
}

// Platform Announcements
export async function getAnnouncements(): Promise<PlatformAnnouncement[]> {
  const response = await apiClient.get('/system/announcements/')
  return response.data
}

export async function getActiveAnnouncements(): Promise<PlatformAnnouncement[]> {
  const response = await apiClient.get('/system/active-announcements/')
  return response.data
}

export async function createAnnouncement(
  announcement: Omit<
    PlatformAnnouncement,
    'id' | 'created_by' | 'created_by_name' | 'created_at' | 'updated_at'
  >
): Promise<PlatformAnnouncement> {
  const response = await apiClient.post('/system/announcements/', announcement)
  return response.data
}

export async function updateAnnouncement(
  id: string,
  announcement: Partial<PlatformAnnouncement>
): Promise<PlatformAnnouncement> {
  const response = await apiClient.patch(`/system/announcements/${id}/`, announcement)
  return response.data
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await apiClient.delete(`/system/announcements/${id}/`)
}

export async function activateAnnouncement(id: string): Promise<void> {
  await apiClient.post(`/system/announcements/${id}/activate/`)
}

export async function deactivateAnnouncement(id: string): Promise<void> {
  await apiClient.post(`/system/announcements/${id}/deactivate/`)
}

// System Health
export async function getSystemHealth(): Promise<SystemHealth> {
  const response = await apiClient.get('/system/health/')
  return response.data
}

export async function triggerHealthChecks(): Promise<{ status: string; services: string[] }> {
  const response = await apiClient.post('/system/health/')
  return response.data
}

// Platform Stats
export async function getPlatformStats(): Promise<PlatformStats> {
  const response = await apiClient.get('/system/stats/')
  return response.data
}

// Organization Management
export async function getOrganizations(params?: {
  plan?: string
  status?: string
  search?: string
}): Promise<OrganizationSummary[]> {
  const response = await apiClient.get('/system/organizations/', { params })
  return response.data
}

export async function getOrganizationDetail(id: number): Promise<OrganizationDetail> {
  const response = await apiClient.get(`/system/organizations/${id}/`)
  return response.data
}

export async function suspendOrganization(id: number): Promise<{ status: string }> {
  const response = await apiClient.post(`/system/organizations/${id}/suspend/`)
  return response.data
}

export async function activateOrganization(id: number): Promise<{ status: string }> {
  const response = await apiClient.post(`/system/organizations/${id}/activate/`)
  return response.data
}

export async function updateOrganizationLimits(
  id: number,
  limits: {
    max_users?: number
    max_storage_gb?: number
    max_documents?: number
  }
): Promise<{
  status: string
  max_users: number
  max_storage_gb: number
  max_documents: number
}> {
  const response = await apiClient.post(`/system/organizations/${id}/update_limits/`, limits)
  return response.data
}

export async function updateOrganizationPlan(
  id: number,
  plan: 'free' | 'starter' | 'professional' | 'enterprise'
): Promise<{ status: string; new_plan: string }> {
  const response = await apiClient.post(`/system/organizations/${id}/update_plan/`, { plan })
  return response.data
}

export async function updateOrganizationFeatures(
  id: number,
  features: FeatureFlagsUpdate
): Promise<{ status: string }> {
  const response = await apiClient.patch(`/system/organizations/${id}/update_features/`, features)
  return response.data
}

// Export all
export default {
  getSystemSettings,
  updateSystemSettings,
  getAuditConfiguration,
  updateAuditConfiguration,
  getAnnouncements,
  getActiveAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  activateAnnouncement,
  deactivateAnnouncement,
  getSystemHealth,
  triggerHealthChecks,
  getPlatformStats,
  getOrganizations,
  getOrganizationDetail,
  suspendOrganization,
  activateOrganization,
  updateOrganizationLimits,
  updateOrganizationPlan,
  updateOrganizationFeatures,
}
