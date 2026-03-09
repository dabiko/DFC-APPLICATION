/**
 * Evidence Service
 *
 * API client for procedure evidence: list, detail, CSV/PDF export.
 */

import apiClient from './apiClient'
import type { PaginatedResponse } from '@/types/procedure'

const BASE = '/procedures'

// =============================================================================
// Types
// =============================================================================

export interface EvidenceRecord {
  id: string
  assignment: {
    id: string
    procedure_title: string
    version_number: number
    assigned_to_name: string
    assigned_by_name: string
    status: string
    due_date: string | null
    created_at: string
    completed_at: string | null
  }
  attempts: {
    id: string
    status: string
    score: number | null
    started_at: string
    completed_at: string | null
    step_completions: {
      step_title: string
      status: string
      started_at: string | null
      completed_at: string | null
    }[]
    quiz_attempts: {
      quiz_title: string
      score: number
      passed: boolean
      started_at: string
      completed_at: string | null
    }[]
  }[]
}

// =============================================================================
// Evidence API
// =============================================================================

export const listEvidence = async (
  params?: Record<string, string>
): Promise<PaginatedResponse<EvidenceRecord>> => {
  const response = await apiClient.get(`${BASE}/evidence/`, { params })
  return response.data
}

export const getEvidence = async (id: string): Promise<EvidenceRecord> => {
  const response = await apiClient.get(`${BASE}/evidence/${id}/`)
  return response.data
}

export const exportEvidenceCsv = async (params?: Record<string, string>): Promise<Blob> => {
  const response = await apiClient.get(`${BASE}/evidence/export_csv/`, {
    params,
    responseType: 'blob',
  })
  return response.data
}

export const exportEvidencePdf = async (id: string): Promise<{ task_id: string }> => {
  const response = await apiClient.post(`${BASE}/evidence/${id}/export_pdf/`)
  return response.data
}

// =============================================================================
// Audit Log
// =============================================================================

export interface ProcedureAuditLogEntry {
  id: string
  procedure: string
  procedure_title: string
  actor: string
  actor_name: string
  action: string
  details: Record<string, unknown>
  created_at: string
}

export const listAuditLog = async (
  params?: Record<string, string>
): Promise<PaginatedResponse<ProcedureAuditLogEntry>> => {
  const response = await apiClient.get(`${BASE}/audit-log/`, { params })
  return response.data
}

// =============================================================================
// Convenience export
// =============================================================================

export const evidenceService = {
  list: listEvidence,
  get: getEvidence,
  exportCsv: exportEvidenceCsv,
  exportPdf: exportEvidencePdf,
  auditLog: listAuditLog,
}
