/**
 * My Documents Service
 *
 * API service for the My Documents feature.
 * Provides access to user-owned documents with time-based grouping,
 * filtering, and statistics.
 * Includes document state management (lifecycle) functionality.
 */

import apiClient from './apiClient'

// ============================================================================
// TYPES
// ============================================================================

export type TimeGroup = 'today' | 'this_week' | 'this_month' | 'earlier'

export type ConfidentialityLevel = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'HIGHLY_CONFIDENTIAL'

export type DocumentState = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED'

export interface MyDocumentItem {
  id: string
  title: string
  file_name: string
  file_size: number
  file_type: string
  document_type: string
  confidentiality_level: ConfidentialityLevel
  folder: string | null
  folder_name: string | null
  folder_path: string | null
  department: number | null
  department_name: string | null
  version_number: number
  document_date: string | null
  created_at: string
  updated_at: string
  time_ago: string
  time_group: TimeGroup
  tags: string[]
}

export interface MyDocumentsGrouped {
  today: MyDocumentItem[]
  this_week: MyDocumentItem[]
  this_month: MyDocumentItem[]
  earlier: MyDocumentItem[]
}

export interface MyDocumentsListResponse {
  total_count: number
  grouped: MyDocumentsGrouped
  results: MyDocumentItem[]
}

export interface MyDocumentsStats {
  total_documents: number
  total_folders: number
  documents_today: number
  documents_this_week: number
  storage_used_bytes: number
  storage_used_formatted: string
  by_document_type: Record<string, number>
  by_confidentiality: Record<string, number>
}

export interface MyDocumentsListParams {
  document_type?: string
  confidentiality?: ConfidentialityLevel
  search?: string
  sort_by?: 'updated_at' | 'created_at' | 'title' | 'file_size'
  sort_order?: 'asc' | 'desc'
  limit?: number
}

// Document State Types

export interface AllowedTransition {
  state: DocumentState
  label: string
  requires_reason?: boolean
}

export interface DocumentWithState {
  id: string
  title: string
  file_name: string
  file_size: number
  file_type: string
  document_type: string
  confidentiality_level: ConfidentialityLevel
  folder: string | null
  folder_name: string | null
  folder_path: string | null
  department: number | null
  department_name: string | null
  version_number: number
  document_date: string | null
  created_at: string
  updated_at: string
  time_ago: string
  time_group: TimeGroup
  tags: string[]
  // State fields
  state: DocumentState
  state_label: string
  allowed_transitions: AllowedTransition[]
  submitted_for_review_at: string | null
  submitted_by: string | null
  submitted_by_name: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  reviewed_by_name: string | null
  approved_at: string | null
  published_at: string | null
  archived_at: string | null
  review_notes: string
  rejection_reason: string
}

export interface DocumentStateTransition {
  id: string
  document: string
  from_state: DocumentState
  to_state: DocumentState
  from_state_label: string
  to_state_label: string
  transitioned_by: string | null
  transitioned_by_name: string | null
  transitioned_at: string
  relative_time: string
  notes: string
  rejection_reason: string
}

export interface DocumentStateStats {
  total: number
  by_state: Record<DocumentState, number>
  pending_my_review: number
  my_drafts: number
  my_in_review: number
}

export interface DocumentsByStateResponse {
  count: number
  state_filter: DocumentState | null
  results: DocumentWithState[]
}

export interface PendingReviewItem {
  id: string
  title: string
  file_name: string
  file_size: number
  file_type: string
  document_type: string
  confidentiality_level: ConfidentialityLevel
  folder: string | null
  folder_name: string | null
  owner: string
  owner_name: string | null
  submitted_for_review_at: string | null
  submitted_by: string | null
  submitted_by_name: string | null
  time_pending: string | null
}

export interface PendingReviewResponse {
  count: number
  results: PendingReviewItem[]
}

export interface StateHistoryResponse {
  document_id: string
  document_title: string
  current_state: DocumentState
  current_state_label: string
  transitions: DocumentStateTransition[]
}

export interface StateChangeRequest {
  to_state: DocumentState
  notes?: string
  rejection_reason?: string
}

export interface StateChangeResponse {
  success: boolean
  message: string
  transition: {
    id: string
    from_state: DocumentState
    to_state: DocumentState
    transitioned_at: string
  }
  document: DocumentWithState
}

export interface AllowedTransitionsResponse {
  document_id: string
  current_state: DocumentState
  current_state_label: string
  allowed_transitions: AllowedTransition[]
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get all documents owned by the current user
 * Returns documents grouped by time period (Today, This Week, This Month, Earlier)
 */
export async function getMyDocuments(
  params?: MyDocumentsListParams
): Promise<MyDocumentsListResponse> {
  const response = await apiClient.get<MyDocumentsListResponse>('/documents/my-documents/', {
    params,
  })
  return response.data
}

/**
 * Get statistics about user's documents
 * Includes counts, storage usage, and breakdowns by type/confidentiality
 */
export async function getMyDocumentsStats(): Promise<MyDocumentsStats> {
  const response = await apiClient.get<MyDocumentsStats>('/documents/my-documents/stats/')
  return response.data
}

// ============================================================================
// DOCUMENT STATE API FUNCTIONS
// ============================================================================

/**
 * Get document state statistics
 * Returns counts by state and pending review counts
 */
export async function getDocumentStateStats(): Promise<DocumentStateStats> {
  const response = await apiClient.get<DocumentStateStats>('/documents/states/stats/')
  return response.data
}

/**
 * Get documents filtered by state
 */
export async function getDocumentsByState(
  state?: DocumentState,
  limit?: number
): Promise<DocumentsByStateResponse> {
  const response = await apiClient.get<DocumentsByStateResponse>(
    '/documents/states/my-documents/',
    {
      params: {
        state,
        limit,
      },
    }
  )
  return response.data
}

/**
 * Get documents pending the current user's review
 */
export async function getPendingReview(limit?: number): Promise<PendingReviewResponse> {
  const response = await apiClient.get<PendingReviewResponse>('/documents/states/pending-review/', {
    params: { limit },
  })
  return response.data
}

/**
 * Get state transition history for a document
 */
export async function getDocumentStateHistory(documentId: string): Promise<StateHistoryResponse> {
  const response = await apiClient.get<StateHistoryResponse>(
    `/documents/${documentId}/state-history/`
  )
  return response.data
}

/**
 * Change document state
 */
export async function changeDocumentState(
  documentId: string,
  request: StateChangeRequest
): Promise<StateChangeResponse> {
  const response = await apiClient.post<StateChangeResponse>(
    `/documents/${documentId}/change-state/`,
    request
  )
  return response.data
}

/**
 * Get allowed state transitions for a document
 */
export async function getAllowedTransitions(
  documentId: string
): Promise<AllowedTransitionsResponse> {
  const response = await apiClient.get<AllowedTransitionsResponse>(
    `/documents/${documentId}/allowed-transitions/`
  )
  return response.data
}

/**
 * Submit document for review (convenience function)
 */
export async function submitForReview(
  documentId: string,
  notes?: string
): Promise<StateChangeResponse> {
  return changeDocumentState(documentId, {
    to_state: 'IN_REVIEW',
    notes,
  })
}

/**
 * Approve document (convenience function)
 */
export async function approveDocument(
  documentId: string,
  notes?: string
): Promise<StateChangeResponse> {
  return changeDocumentState(documentId, {
    to_state: 'APPROVED',
    notes,
  })
}

/**
 * Reject document (convenience function)
 */
export async function rejectDocument(
  documentId: string,
  rejectionReason: string,
  notes?: string
): Promise<StateChangeResponse> {
  return changeDocumentState(documentId, {
    to_state: 'DRAFT',
    notes,
    rejection_reason: rejectionReason,
  })
}

/**
 * Publish document (convenience function)
 */
export async function publishDocument(
  documentId: string,
  notes?: string
): Promise<StateChangeResponse> {
  return changeDocumentState(documentId, {
    to_state: 'PUBLISHED',
    notes,
  })
}

/**
 * Archive document (convenience function)
 */
export async function archiveDocument(
  documentId: string,
  notes?: string
): Promise<StateChangeResponse> {
  return changeDocumentState(documentId, {
    to_state: 'ARCHIVED',
    notes,
  })
}

/**
 * Restore document from archive (convenience function)
 */
export async function restoreDocument(
  documentId: string,
  notes?: string
): Promise<StateChangeResponse> {
  return changeDocumentState(documentId, {
    to_state: 'DRAFT',
    notes,
  })
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get display label for time group
 */
export function getTimeGroupLabel(group: TimeGroup): string {
  const labels: Record<TimeGroup, string> = {
    today: 'Today',
    this_week: 'This Week',
    this_month: 'This Month',
    earlier: 'Earlier',
  }
  return labels[group]
}

/**
 * Get icon name for time group
 */
export function getTimeGroupIcon(group: TimeGroup): string {
  const icons: Record<TimeGroup, string> = {
    today: 'calendar-today',
    this_week: 'calendar-week',
    this_month: 'calendar-month',
    earlier: 'calendar-archive',
  }
  return icons[group]
}

/**
 * Get confidentiality level color classes
 */
export function getConfidentialityColor(level: ConfidentialityLevel): {
  bg: string
  text: string
  border: string
} {
  const colors: Record<ConfidentialityLevel, { bg: string; text: string; border: string }> = {
    PUBLIC: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-600 dark:text-gray-400',
      border: 'border-gray-300 dark:border-gray-600',
    },
    INTERNAL: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-300 dark:border-blue-600',
    },
    CONFIDENTIAL: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-300 dark:border-orange-600',
    },
    HIGHLY_CONFIDENTIAL: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-300 dark:border-red-600',
    },
  }
  return colors[level] || colors.PUBLIC
}

/**
 * Get confidentiality level label
 */
export function getConfidentialityLabel(level: ConfidentialityLevel): string {
  const labels: Record<ConfidentialityLevel, string> = {
    PUBLIC: 'Public',
    INTERNAL: 'Internal',
    CONFIDENTIAL: 'Confidential',
    HIGHLY_CONFIDENTIAL: 'Highly Confidential',
  }
  return labels[level] || level
}

/**
 * Get document type icon
 */
export function getDocumentTypeIcon(type: string): string {
  const iconMap: Record<string, string> = {
    // Common document types
    CONTRACT: 'file-text',
    INVOICE: 'file-invoice',
    REPORT: 'file-chart',
    KYC_RECORD: 'user-check',
    AUDIT_DOCUMENT: 'clipboard-check',
    POLICY: 'shield',
    CORRESPONDENCE: 'mail',
    FINANCIAL_STATEMENT: 'calculator',
    TAX_DOCUMENT: 'receipt',
    LEGAL: 'scale',
    HR_DOCUMENT: 'users',
    OTHER: 'file',
  }
  return iconMap[type] || 'file'
}

/**
 * Get file type icon based on MIME type
 */
export function getFileTypeIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType === 'application/pdf') return 'file-pdf'
  if (
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
    return 'file-word'
  if (
    mimeType === 'application/vnd.ms-excel' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
    return 'file-excel'
  if (
    mimeType === 'application/vnd.ms-powerpoint' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  )
    return 'file-powerpoint'
  if (mimeType.startsWith('text/')) return 'file-text'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType === 'application/zip' || mimeType === 'application/x-rar-compressed')
    return 'file-archive'
  return 'file'
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
 * Get all time groups in order
 */
export function getTimeGroupsInOrder(): TimeGroup[] {
  return ['today', 'this_week', 'this_month', 'earlier']
}

/**
 * Check if grouped response has any documents
 */
export function hasDocuments(grouped: MyDocumentsGrouped): boolean {
  return (
    grouped.today.length > 0 ||
    grouped.this_week.length > 0 ||
    grouped.this_month.length > 0 ||
    grouped.earlier.length > 0
  )
}

/**
 * Get total document count from grouped response
 */
export function getTotalFromGrouped(grouped: MyDocumentsGrouped): number {
  return (
    grouped.today.length +
    grouped.this_week.length +
    grouped.this_month.length +
    grouped.earlier.length
  )
}

// ============================================================================
// DOCUMENT STATE UTILITY FUNCTIONS
// ============================================================================

/**
 * Get all document states in workflow order
 */
export function getDocumentStatesInOrder(): DocumentState[] {
  return ['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED']
}

/**
 * Get label for document state
 */
export function getDocumentStateLabel(state: DocumentState): string {
  const labels: Record<DocumentState, string> = {
    DRAFT: 'Draft',
    IN_REVIEW: 'In Review',
    APPROVED: 'Approved',
    PUBLISHED: 'Published',
    ARCHIVED: 'Archived',
  }
  return labels[state] || state
}

/**
 * Get icon name for document state
 */
export function getDocumentStateIcon(state: DocumentState): string {
  const icons: Record<DocumentState, string> = {
    DRAFT: 'edit',
    IN_REVIEW: 'clock',
    APPROVED: 'check-circle',
    PUBLISHED: 'globe',
    ARCHIVED: 'archive',
  }
  return icons[state] || 'file'
}

/**
 * Get color classes for document state
 */
export function getDocumentStateColor(state: DocumentState): {
  bg: string
  text: string
  border: string
  dot: string
} {
  const colors: Record<DocumentState, { bg: string; text: string; border: string; dot: string }> = {
    DRAFT: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-600 dark:text-gray-400',
      border: 'border-gray-300 dark:border-gray-600',
      dot: 'bg-gray-400',
    },
    IN_REVIEW: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-700 dark:text-yellow-400',
      border: 'border-yellow-300 dark:border-yellow-600',
      dot: 'bg-yellow-400',
    },
    APPROVED: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-400',
      border: 'border-green-300 dark:border-green-600',
      dot: 'bg-green-400',
    },
    PUBLISHED: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-400',
      border: 'border-blue-300 dark:border-blue-600',
      dot: 'bg-blue-400',
    },
    ARCHIVED: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-700 dark:text-purple-400',
      border: 'border-purple-300 dark:border-purple-600',
      dot: 'bg-purple-400',
    },
  }
  return colors[state] || colors.DRAFT
}

/**
 * Get action label for state transition
 */
export function getStateTransitionActionLabel(
  fromState: DocumentState,
  toState: DocumentState
): string {
  // Special case mappings
  if (fromState === 'DRAFT' && toState === 'IN_REVIEW') {
    return 'Submit for Review'
  }
  if (fromState === 'IN_REVIEW' && toState === 'APPROVED') {
    return 'Approve'
  }
  if (fromState === 'IN_REVIEW' && toState === 'DRAFT') {
    return 'Reject'
  }
  if (fromState === 'APPROVED' && toState === 'PUBLISHED') {
    return 'Publish'
  }
  if (toState === 'ARCHIVED') {
    return 'Archive'
  }
  if (fromState === 'ARCHIVED' && toState === 'DRAFT') {
    return 'Restore'
  }

  // Default: "Move to {state}"
  return `Move to ${getDocumentStateLabel(toState)}`
}

/**
 * Check if a state is a final state (no further transitions except archive)
 */
export function isFinalState(state: DocumentState): boolean {
  return state === 'PUBLISHED' || state === 'ARCHIVED'
}

/**
 * Check if document is editable in given state
 */
export function isEditableState(state: DocumentState): boolean {
  return state === 'DRAFT'
}

export default {
  // API functions
  getMyDocuments,
  getMyDocumentsStats,
  getDocumentStateStats,
  getDocumentsByState,
  getPendingReview,
  getDocumentStateHistory,
  changeDocumentState,
  getAllowedTransitions,
  submitForReview,
  approveDocument,
  rejectDocument,
  publishDocument,
  archiveDocument,
  restoreDocument,
  // Time group utilities
  getTimeGroupLabel,
  getTimeGroupIcon,
  getTimeGroupsInOrder,
  hasDocuments,
  getTotalFromGrouped,
  // Confidentiality utilities
  getConfidentialityColor,
  getConfidentialityLabel,
  // Document type utilities
  getDocumentTypeIcon,
  getFileTypeIcon,
  formatFileSize,
  // State utilities
  getDocumentStatesInOrder,
  getDocumentStateLabel,
  getDocumentStateIcon,
  getDocumentStateColor,
  getStateTransitionActionLabel,
  isFinalState,
  isEditableState,
}
