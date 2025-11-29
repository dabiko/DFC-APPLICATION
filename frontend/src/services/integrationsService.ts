/**
 * Integrations Service
 *
 * Handles API calls for API keys, webhooks, and third-party integrations.
 */

import apiClient from './apiClient'

// =============================================================================
// Types
// =============================================================================

export interface APIKey {
  id: string
  name: string
  key_prefix: string
  scope: 'read' | 'write' | 'admin'
  allowed_ips: string[]
  rate_limit: number
  is_active: boolean
  expires_at: string | null
  last_used_at: string | null
  last_used_ip: string | null
  total_requests: number
  is_expired: boolean
  is_valid: boolean
  created_by_name: string | null
  created_at: string
  updated_at: string
  raw_key?: string // Only present on creation
}

export interface APIKeyCreate {
  name: string
  scope?: 'read' | 'write' | 'admin'
  allowed_ips?: string[]
  rate_limit?: number
  expires_at?: string | null
}

export interface WebhookEventType {
  value: string
  label: string
}

export interface Webhook {
  id: string
  name: string
  url: string
  secret?: string // Only present on creation
  subscribed_events: string[]
  is_active: boolean
  is_verified: boolean
  max_retries: number
  timeout_seconds: number
  total_deliveries: number
  successful_deliveries: number
  failed_deliveries: number
  last_delivery_at: string | null
  last_failure_at: string | null
  last_failure_reason: string
  consecutive_failures: number
  auto_disabled: boolean
  auto_disabled_at: string | null
  success_rate: number
  event_types: WebhookEventType[]
  created_by_name: string | null
  created_at: string
  updated_at: string
}

export interface WebhookCreate {
  name: string
  url: string
  subscribed_events: string[]
  max_retries?: number
  timeout_seconds?: number
}

export interface IntegrationType {
  value: string
  label: string
}

export interface Integration {
  id: string
  integration_type: string
  integration_type_display: string
  name: string
  description: string
  config: Record<string, unknown>
  status: 'pending' | 'testing' | 'active' | 'error' | 'disabled'
  status_display: string
  status_message: string
  last_sync_at: string | null
  last_error_at: string | null
  available_types: IntegrationType[]
  configured_by_name: string | null
  created_at: string
  updated_at: string
}

export interface IntegrationCreate {
  integration_type: string
  name: string
  description?: string
  config?: Record<string, unknown>
  credentials?: Record<string, unknown>
}

export interface IntegrationLog {
  id: string
  action: string
  action_display: string
  status: string
  endpoint: string
  method: string
  status_code: number | null
  duration_ms: number | null
  error_message: string
  ip_address: string | null
  created_at: string
}

export interface IntegrationStats {
  api_keys: {
    total: number
    active: number
    total_requests: number
  }
  webhooks: {
    total: number
    active: number
    total_deliveries: number
    success_rate: number
  }
  integrations: {
    total: number
    active: number
    error: number
  }
  features: {
    api_access: boolean
    webhooks: boolean
    sso_integration: boolean
  }
}

// =============================================================================
// API Keys
// =============================================================================

export const getAPIKeys = async (): Promise<APIKey[]> => {
  const response = await apiClient.get('/integrations/api-keys/')
  return response.data
}

export const createAPIKey = async (data: APIKeyCreate): Promise<APIKey> => {
  const response = await apiClient.post('/integrations/api-keys/', data)
  return response.data
}

export const updateAPIKey = async (id: string, data: Partial<APIKeyCreate>): Promise<APIKey> => {
  const response = await apiClient.patch(`/integrations/api-keys/${id}/`, data)
  return response.data
}

export const deleteAPIKey = async (id: string): Promise<void> => {
  await apiClient.delete(`/integrations/api-keys/${id}/`)
}

export const regenerateAPIKey = async (
  id: string
): Promise<{ raw_key: string; key_prefix: string }> => {
  const response = await apiClient.post(`/integrations/api-keys/${id}/regenerate/`)
  return response.data
}

// =============================================================================
// Webhooks
// =============================================================================

export const getWebhooks = async (): Promise<Webhook[]> => {
  const response = await apiClient.get('/integrations/webhooks/')
  return response.data
}

export const createWebhook = async (data: WebhookCreate): Promise<Webhook> => {
  const response = await apiClient.post('/integrations/webhooks/', data)
  return response.data
}

export const updateWebhook = async (id: string, data: Partial<WebhookCreate>): Promise<Webhook> => {
  const response = await apiClient.patch(`/integrations/webhooks/${id}/`, data)
  return response.data
}

export const deleteWebhook = async (id: string): Promise<void> => {
  await apiClient.delete(`/integrations/webhooks/${id}/`)
}

export const testWebhook = async (
  id: string,
  eventType: string
): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.post(`/integrations/webhooks/${id}/test/`, {
    event_type: eventType,
  })
  return response.data
}

export const rotateWebhookSecret = async (
  id: string
): Promise<{ secret: string; message: string }> => {
  const response = await apiClient.post(`/integrations/webhooks/${id}/rotate_secret/`)
  return response.data
}

export const reactivateWebhook = async (id: string): Promise<{ message: string }> => {
  const response = await apiClient.post(`/integrations/webhooks/${id}/reactivate/`)
  return response.data
}

// =============================================================================
// Integrations (Third-party services)
// =============================================================================

export const getIntegrations = async (): Promise<Integration[]> => {
  const response = await apiClient.get('/integrations/services/')
  return response.data
}

export const createIntegration = async (data: IntegrationCreate): Promise<Integration> => {
  const response = await apiClient.post('/integrations/services/', data)
  return response.data
}

export const updateIntegration = async (
  id: string,
  data: Partial<IntegrationCreate>
): Promise<Integration> => {
  const response = await apiClient.patch(`/integrations/services/${id}/`, data)
  return response.data
}

export const deleteIntegration = async (id: string): Promise<void> => {
  await apiClient.delete(`/integrations/services/${id}/`)
}

export const testIntegration = async (
  id: string
): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.post(`/integrations/services/${id}/test/`)
  return response.data
}

export const syncIntegration = async (
  id: string
): Promise<{ success: boolean; last_sync_at: string }> => {
  const response = await apiClient.post(`/integrations/services/${id}/sync/`)
  return response.data
}

// =============================================================================
// Logs & Stats
// =============================================================================

export const getIntegrationLogs = async (filters?: {
  action?: string
  status?: string
  api_key?: string
  webhook?: string
  integration?: string
}): Promise<IntegrationLog[]> => {
  const response = await apiClient.get('/integrations/logs/', { params: filters })
  return response.data
}

export const getIntegrationStats = async (): Promise<IntegrationStats> => {
  const response = await apiClient.get('/integrations/stats/')
  return response.data
}

// =============================================================================
// Default Export
// =============================================================================

const integrationsService = {
  // API Keys
  getAPIKeys,
  createAPIKey,
  updateAPIKey,
  deleteAPIKey,
  regenerateAPIKey,
  // Webhooks
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
  rotateWebhookSecret,
  reactivateWebhook,
  // Integrations
  getIntegrations,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  testIntegration,
  syncIntegration,
  // Logs & Stats
  getIntegrationLogs,
  getIntegrationStats,
}

export default integrationsService
