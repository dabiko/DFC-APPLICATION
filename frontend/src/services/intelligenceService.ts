/**
 * Document Intelligence Service
 *
 * API client for document intelligence features:
 * - Entity extraction
 * - Table extraction
 * - Key-value extraction
 * - Document summarization
 */

import api from './apiClient'

// =============================================================================
// Types
// =============================================================================

export interface ExtractedEntity {
  id: string
  document: string
  entity_type: EntityType
  value: string
  normalized_value: string
  start_position: number
  end_position: number
  page_number: number
  context: string
  confidence_score: number
  extraction_method: string
  is_verified: boolean
  verified_by: string | null
  verified_at: string | null
  created_at: string
}

export type EntityType =
  | 'PERSON'
  | 'ORGANIZATION'
  | 'DATE'
  | 'MONEY'
  | 'PERCENTAGE'
  | 'LOCATION'
  | 'PHONE'
  | 'EMAIL'
  | 'ACCOUNT_NUMBER'
  | 'REFERENCE'
  | 'CUSTOM'

export interface ExtractedTable {
  id: string
  document: string
  table_number: number
  title: string
  page_number: number
  headers: string[]
  rows: string[][]
  row_count: number
  column_count: number
  table_type: string
  confidence_score: number
  raw_html: string
  raw_markdown: string
  has_merged_cells: boolean
  extraction_method: string
  is_verified: boolean
  created_at: string
}

export interface DocumentSummary {
  id: string
  document: string
  summary_type: SummaryType
  summary_text: string
  key_points: string[]
  topics: string[]
  sentiment: string
  sentiment_score: number
  model_used: string
  word_count: number
  compression_ratio: number
  coherence_score: number | null
  relevance_score: number | null
  user_rating: number | null
  user_feedback: string
  rated_by: string | null
  created_at: string
}

export type SummaryType = 'BRIEF' | 'STANDARD' | 'DETAILED' | 'BULLET_POINTS' | 'EXECUTIVE'

export interface ExtractedKeyValue {
  id: string
  document: string
  key: string
  value: string
  normalized_key: string
  normalized_value: string
  value_type: string
  page_number: number
  confidence_score: number
  group_name: string
  group_order: number
  is_verified: boolean
  created_at: string
}

export interface IntelligenceJob {
  id: string
  document: string
  job_type: JobType
  status: JobStatus
  progress_percent: number
  current_task: string
  entities_found: number
  tables_found: number
  key_values_found: number
  summaries_generated: number
  error_message: string
  started_at: string | null
  completed_at: string | null
  duration_seconds: number | null
  config: Record<string, unknown>
  created_by: string
  created_by_name: string
  created_at: string
}

export type JobType = 'FULL' | 'ENTITIES' | 'TABLES' | 'SUMMARY' | 'KEY_VALUES'
export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

export interface IntelligenceSettings {
  enable_entity_extraction: boolean
  entity_confidence_threshold: number
  entity_types_enabled: string[]
  enable_table_extraction: boolean
  table_extraction_method: string
  enable_summarization: boolean
  default_summary_type: string
  max_summary_length: number
  enable_key_value_extraction: boolean
  key_value_templates: Record<string, unknown>
  auto_process_on_upload: boolean
  process_document_types: string[]
  max_file_size_mb: number
  max_pages: number
  batch_size: number
  timeout_seconds: number
  updated_at: string
}

export interface IntelligenceStats {
  total_documents_processed: number
  total_entities_extracted: number
  total_tables_extracted: number
  total_summaries_generated: number
  entities_by_type: Record<string, number>
  average_confidence: number
  jobs_pending: number
  jobs_processing: number
  jobs_completed_today: number
  jobs_failed_today: number
}

export interface DocumentIntelligence {
  document_id: string
  entities: ExtractedEntity[]
  tables: ExtractedTable[]
  key_values: ExtractedKeyValue[]
  summary: DocumentSummary | null
  processing_job: IntelligenceJob | null
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Get all intelligence data for a document
 */
export async function getDocumentIntelligence(documentId: string): Promise<DocumentIntelligence> {
  const response = await api.get(`/intelligence/document/${documentId}/`)
  return response.data
}

/**
 * Process a document for intelligence extraction
 */
export async function processDocument(
  documentId: string,
  jobType: JobType = 'FULL',
  config?: Record<string, unknown>
): Promise<IntelligenceJob> {
  const response = await api.post(`/intelligence/document/${documentId}/process/`, {
    job_type: jobType,
    config,
  })
  return response.data
}

/**
 * Create a new intelligence job
 */
export async function createJob(
  documentId: string,
  jobType: JobType = 'FULL',
  config?: Record<string, unknown>
): Promise<IntelligenceJob> {
  const response = await api.post('/intelligence/jobs/', {
    document_id: documentId,
    job_type: jobType,
    config,
  })
  return response.data
}

/**
 * Get job status
 */
export async function getJob(jobId: string): Promise<IntelligenceJob> {
  const response = await api.get(`/intelligence/jobs/${jobId}/`)
  return response.data
}

/**
 * Cancel a job
 */
export async function cancelJob(jobId: string): Promise<IntelligenceJob> {
  const response = await api.post(`/intelligence/jobs/${jobId}/cancel/`)
  return response.data
}

/**
 * List jobs with optional filters
 */
export async function listJobs(params?: {
  document_id?: string
  status?: JobStatus
  job_type?: JobType
}): Promise<IntelligenceJob[]> {
  const response = await api.get('/intelligence/jobs/', { params })
  return response.data
}

/**
 * Batch process multiple documents
 */
export async function batchProcess(
  documentIds: string[],
  jobType: JobType = 'FULL',
  config?: Record<string, unknown>
): Promise<{ jobs_created: number; jobs: IntelligenceJob[] }> {
  const response = await api.post('/intelligence/batch/', {
    document_ids: documentIds,
    job_type: jobType,
    config,
  })
  return response.data
}

// =============================================================================
// Entity Functions
// =============================================================================

/**
 * List extracted entities
 */
export async function listEntities(params?: {
  document_id?: string
  entity_type?: EntityType
  is_verified?: boolean
  min_confidence?: number
}): Promise<ExtractedEntity[]> {
  const response = await api.get('/intelligence/entities/', { params })
  return response.data
}

/**
 * Verify an entity
 */
export async function verifyEntity(
  entityId: string,
  correctedValue?: string
): Promise<ExtractedEntity> {
  const response = await api.post(`/intelligence/entities/${entityId}/verify/`, {
    corrected_value: correctedValue,
  })
  return response.data
}

/**
 * Get entities by document
 */
export async function getEntitiesByDocument(documentId: string): Promise<ExtractedEntity[]> {
  const response = await api.get(`/intelligence/entities/by_document/${documentId}/`)
  return response.data
}

/**
 * Get entities by type
 */
export async function getEntitiesByType(entityType: EntityType): Promise<ExtractedEntity[]> {
  const response = await api.get(`/intelligence/entities/by_type/${entityType}/`)
  return response.data
}

// =============================================================================
// Table Functions
// =============================================================================

/**
 * List extracted tables
 */
export async function listTables(params?: {
  document_id?: string
  table_type?: string
}): Promise<ExtractedTable[]> {
  const response = await api.get('/intelligence/tables/', { params })
  return response.data
}

/**
 * Get table details
 */
export async function getTable(tableId: string): Promise<ExtractedTable> {
  const response = await api.get(`/intelligence/tables/${tableId}/`)
  return response.data
}

/**
 * Export table as CSV, markdown, or JSON
 */
export async function exportTable(
  tableId: string,
  format: 'csv' | 'markdown' | 'json' = 'json'
): Promise<Blob | { headers: string[]; rows: string[][] } | { markdown: string }> {
  if (format === 'csv') {
    const response = await api.get(`/intelligence/tables/${tableId}/export/`, {
      params: { format: 'csv' },
      responseType: 'blob',
    })
    return response.data
  }

  const response = await api.get(`/intelligence/tables/${tableId}/export/`, {
    params: { format },
  })
  return response.data
}

// =============================================================================
// Summary Functions
// =============================================================================

/**
 * List document summaries
 */
export async function listSummaries(params?: {
  document_id?: string
  summary_type?: SummaryType
}): Promise<DocumentSummary[]> {
  const response = await api.get('/intelligence/summaries/', { params })
  return response.data
}

/**
 * Get summary details
 */
export async function getSummary(summaryId: string): Promise<DocumentSummary> {
  const response = await api.get(`/intelligence/summaries/${summaryId}/`)
  return response.data
}

/**
 * Rate a summary
 */
export async function rateSummary(
  summaryId: string,
  rating: number,
  feedback?: string
): Promise<DocumentSummary> {
  const response = await api.post(`/intelligence/summaries/${summaryId}/rate/`, {
    rating,
    feedback,
  })
  return response.data
}

// =============================================================================
// Key-Value Functions
// =============================================================================

/**
 * List extracted key-value pairs
 */
export async function listKeyValues(params?: {
  document_id?: string
  group_name?: string
}): Promise<ExtractedKeyValue[]> {
  const response = await api.get('/intelligence/key-values/', { params })
  return response.data
}

// =============================================================================
// Stats & Settings
// =============================================================================

/**
 * Get intelligence statistics
 */
export async function getStats(): Promise<IntelligenceStats> {
  const response = await api.get('/intelligence/stats/')
  return response.data
}

/**
 * Get intelligence settings
 */
export async function getSettings(): Promise<IntelligenceSettings> {
  const response = await api.get('/intelligence/settings/')
  return response.data
}

/**
 * Update intelligence settings
 */
export async function updateSettings(
  settings: Partial<IntelligenceSettings>
): Promise<IntelligenceSettings> {
  const response = await api.patch('/intelligence/settings/', settings)
  return response.data
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get entity type display info (label and color)
 */
export function getEntityTypeInfo(type: EntityType): { label: string; color: string } {
  const typeMap: Record<EntityType, { label: string; color: string }> = {
    PERSON: { label: 'Person', color: 'blue' },
    ORGANIZATION: { label: 'Organization', color: 'purple' },
    DATE: { label: 'Date', color: 'green' },
    MONEY: { label: 'Money', color: 'yellow' },
    PERCENTAGE: { label: 'Percentage', color: 'orange' },
    LOCATION: { label: 'Location', color: 'cyan' },
    PHONE: { label: 'Phone', color: 'indigo' },
    EMAIL: { label: 'Email', color: 'pink' },
    ACCOUNT_NUMBER: { label: 'Account #', color: 'teal' },
    REFERENCE: { label: 'Reference', color: 'gray' },
    CUSTOM: { label: 'Custom', color: 'slate' },
  }
  return typeMap[type] || { label: type, color: 'gray' }
}

/**
 * Get job status display info
 */
export function getJobStatusInfo(status: JobStatus): { label: string; color: string } {
  const statusMap: Record<JobStatus, { label: string; color: string }> = {
    PENDING: { label: 'Pending', color: 'gray' },
    PROCESSING: { label: 'Processing', color: 'blue' },
    COMPLETED: { label: 'Completed', color: 'green' },
    FAILED: { label: 'Failed', color: 'red' },
    CANCELLED: { label: 'Cancelled', color: 'orange' },
  }
  return statusMap[status] || { label: status, color: 'gray' }
}

/**
 * Format confidence score as percentage
 */
export function formatConfidence(score: number): string {
  return `${Math.round(score * 100)}%`
}
