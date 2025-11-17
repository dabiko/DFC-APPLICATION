/**
 * Metadata Types
 * Type definitions for document metadata management
 */

import type { ConfidentialityLevel } from './folder'

/**
 * Document Type - Controlled list of document classifications
 */
export type DocumentType =
  | 'invoice'
  | 'contract'
  | 'report'
  | 'kyc_record'
  | 'statement'
  | 'correspondence'
  | 'policy'
  | 'procedure'
  | 'memo'
  | 'presentation'
  | 'spreadsheet'
  | 'form'
  | 'certificate'
  | 'agreement'
  | 'audit_report'
  | 'financial_statement'
  | 'tax_document'
  | 'legal_document'
  | 'hr_document'
  | 'other'

/**
 * Document type metadata with display information
 */
export interface DocumentTypeInfo {
  value: DocumentType
  label: string
  description: string
  category: 'financial' | 'legal' | 'operational' | 'hr' | 'compliance' | 'general'
  icon?: string
}

/**
 * Retention Period - Standard retention periods
 */
export type RetentionPeriod =
  | '1_year'
  | '3_years'
  | '5_years'
  | '7_years'
  | '10_years'
  | '15_years'
  | '20_years'
  | 'permanent'
  | 'custom'

/**
 * Retention period metadata
 */
export interface RetentionPeriodInfo {
  value: RetentionPeriod
  label: string
  years: number | null // null for permanent
  description: string
}

/**
 * Department - CCC PLC departments
 */
export type Department =
  | 'accounting'
  | 'audit'
  | 'compliance'
  | 'engagements'
  | 'it'
  | 'risk'
  | 'hr'
  | 'legal'
  | 'operations'
  | 'executive'

/**
 * Department metadata
 */
export interface DepartmentInfo {
  value: Department
  label: string
  description: string
  defaultConfidentiality: ConfidentialityLevel
}

/**
 * Document Identifier Type
 */
export type IdentifierType =
  | 'customer_id'
  | 'contract_number'
  | 'invoice_number'
  | 'case_number'
  | 'policy_number'
  | 'account_number'
  | 'reference_number'
  | 'transaction_id'
  | 'employee_id'
  | 'other'

/**
 * Document metadata - core metadata fields for all documents
 */
export interface DocumentMetadata {
  // Required fields (mandatory)
  title: string
  documentType: DocumentType
  identifier: string
  identifierType: IdentifierType
  date: string // ISO date string (YYYY-MM-DD)
  creator: string
  department: Department
  confidentialityLevel: ConfidentialityLevel
  retentionPeriod: RetentionPeriod
  tags: string[]

  // Optional fields
  description?: string
  subject?: string
  keywords?: string[]
  customRetentionYears?: number // Used when retentionPeriod is 'custom'
  expirationDate?: string // ISO date string
  relatedDocuments?: string[] // Array of document IDs
  customerName?: string
  contractValue?: number
  currency?: string
  fiscalYear?: string
  version?: number
  language?: string
  pageCount?: number
  isOnLegalHold?: boolean
  legalHoldReason?: string
  complianceStatus?: 'compliant' | 'non_compliant' | 'pending_review'
  reviewedBy?: string
  reviewDate?: string
  approvedBy?: string
  approvalDate?: string
  comments?: string
}

/**
 * Metadata validation error
 */
export interface MetadataValidationError {
  field: keyof DocumentMetadata
  message: string
  code: string
}

/**
 * Metadata validation result
 */
export interface MetadataValidationResult {
  isValid: boolean
  errors: MetadataValidationError[]
  warnings?: MetadataValidationError[]
}

/**
 * Create metadata input - for new documents
 */
export type CreateDocumentMetadata = Omit<
  DocumentMetadata,
  'version' | 'reviewedBy' | 'reviewDate' | 'approvedBy' | 'approvalDate'
>

/**
 * Update metadata input - for editing existing documents
 */
export type UpdateDocumentMetadata = Partial<DocumentMetadata>

/**
 * Metadata history entry
 */
export interface MetadataHistoryEntry {
  id: string
  documentId: string
  timestamp: string
  changedBy: string
  changeType: 'created' | 'updated' | 'deleted'
  field: keyof DocumentMetadata
  oldValue: unknown
  newValue: unknown
  reason?: string
}

/**
 * Metadata template - predefined metadata for common document types
 */
export interface MetadataTemplate {
  id: string
  name: string
  description: string
  documentType: DocumentType
  department: Department
  defaultValues: Partial<DocumentMetadata>
  requiredFields: (keyof DocumentMetadata)[]
  icon?: string
}

/**
 * Tag suggestion
 */
export interface TagSuggestion {
  tag: string
  count: number
  category?: string
}

/**
 * Metadata field definition
 */
export interface MetadataFieldDefinition {
  key: keyof DocumentMetadata
  label: string
  type: 'text' | 'select' | 'date' | 'number' | 'textarea' | 'tags' | 'boolean'
  required: boolean
  placeholder?: string
  helpText?: string
  validation?: {
    min?: number
    max?: number
    pattern?: string
    custom?: (value: unknown) => boolean
  }
  options?: { value: string; label: string }[]
  dependsOn?: {
    field: keyof DocumentMetadata
    value: unknown
  }
}

/**
 * Metadata form state
 */
export interface MetadataFormState {
  values: Partial<DocumentMetadata>
  errors: Record<string, string>
  touched: Record<string, boolean>
  isSubmitting: boolean
  isDirty: boolean
}

/**
 * Metadata display mode
 */
export type MetadataDisplayMode = 'view' | 'edit' | 'compact'

/**
 * Metadata component props
 */
export interface MetadataDisplayProps {
  metadata: DocumentMetadata
  mode?: MetadataDisplayMode
  onEdit?: () => void
  showHistory?: boolean
  showActions?: boolean
  className?: string
}

export interface MetadataFormProps {
  initialValues?: Partial<DocumentMetadata>
  onSubmit: (metadata: CreateDocumentMetadata | UpdateDocumentMetadata) => void | Promise<void>
  onCancel?: () => void
  mode?: 'create' | 'edit'
  documentType?: DocumentType
  department?: Department
  isLoading?: boolean
  className?: string
}

export interface MetadataEditorProps {
  metadata: DocumentMetadata
  field: keyof DocumentMetadata
  onSave: (field: keyof DocumentMetadata, value: unknown) => void | Promise<void>
  onCancel: () => void
  isLoading?: boolean
}
