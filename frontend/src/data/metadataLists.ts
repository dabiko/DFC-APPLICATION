/**
 * Metadata Controlled Lists
 * Predefined lists for document metadata fields
 */

import type {
  DocumentTypeInfo,
  RetentionPeriodInfo,
  DepartmentInfo,
  DocumentType,
  RetentionPeriod,
  Department,
  IdentifierType,
} from '@/types/metadata'
import type { ConfidentialityLevel } from '@/types/folder'

/**
 * Document Types - Complete list with categorization
 */
export const DOCUMENT_TYPES: DocumentTypeInfo[] = [
  // Financial
  {
    value: 'invoice',
    label: 'Invoice',
    description: 'Bills and invoices for goods or services',
    category: 'financial',
    icon: '📄',
  },
  {
    value: 'financial_statement',
    label: 'Financial Statement',
    description: 'Balance sheets, income statements, cash flow statements',
    category: 'financial',
    icon: '💰',
  },
  {
    value: 'statement',
    label: 'Account Statement',
    description: 'Bank statements, account summaries',
    category: 'financial',
    icon: '🏦',
  },
  {
    value: 'tax_document',
    label: 'Tax Document',
    description: 'Tax returns, tax certificates, tax assessments',
    category: 'financial',
    icon: '📊',
  },

  // Legal
  {
    value: 'contract',
    label: 'Contract',
    description: 'Legal agreements and contracts',
    category: 'legal',
    icon: '📝',
  },
  {
    value: 'agreement',
    label: 'Agreement',
    description: 'Service agreements, partnership agreements',
    category: 'legal',
    icon: '🤝',
  },
  {
    value: 'legal_document',
    label: 'Legal Document',
    description: 'Legal notices, court documents, legal opinions',
    category: 'legal',
    icon: '⚖️',
  },
  {
    value: 'certificate',
    label: 'Certificate',
    description: 'Certificates of incorporation, compliance certificates',
    category: 'legal',
    icon: '🏅',
  },

  // Compliance
  {
    value: 'kyc_record',
    label: 'KYC Record',
    description: 'Know Your Customer documentation',
    category: 'compliance',
    icon: '🔍',
  },
  {
    value: 'audit_report',
    label: 'Audit Report',
    description: 'Internal and external audit reports',
    category: 'compliance',
    icon: '🔎',
  },
  {
    value: 'policy',
    label: 'Policy',
    description: 'Company policies and guidelines',
    category: 'compliance',
    icon: '📋',
  },
  {
    value: 'procedure',
    label: 'Procedure',
    description: 'Standard operating procedures',
    category: 'compliance',
    icon: '📑',
  },

  // HR
  {
    value: 'hr_document',
    label: 'HR Document',
    description: 'Employment contracts, performance reviews, personnel files',
    category: 'hr',
    icon: '👥',
  },

  // Operational
  {
    value: 'report',
    label: 'Report',
    description: 'Business reports and analytics',
    category: 'operational',
    icon: '📈',
  },
  {
    value: 'correspondence',
    label: 'Correspondence',
    description: 'Emails, letters, and official communications',
    category: 'operational',
    icon: '✉️',
  },
  {
    value: 'memo',
    label: 'Memo',
    description: 'Internal memos and announcements',
    category: 'operational',
    icon: '📌',
  },
  {
    value: 'presentation',
    label: 'Presentation',
    description: 'Slide decks and presentations',
    category: 'operational',
    icon: '🎤',
  },
  {
    value: 'spreadsheet',
    label: 'Spreadsheet',
    description: 'Excel files and data tables',
    category: 'operational',
    icon: '📊',
  },
  {
    value: 'form',
    label: 'Form',
    description: 'Application forms, request forms',
    category: 'operational',
    icon: '📝',
  },

  // General
  {
    value: 'other',
    label: 'Other',
    description: 'Miscellaneous documents',
    category: 'general',
    icon: '📄',
  },
]

/**
 * Retention Periods - Standard retention schedules
 */
export const RETENTION_PERIODS: RetentionPeriodInfo[] = [
  {
    value: '1_year',
    label: '1 Year',
    years: 1,
    description: 'Routine operational documents',
  },
  {
    value: '3_years',
    label: '3 Years',
    years: 3,
    description: 'Tax records, employment records',
  },
  {
    value: '5_years',
    label: '5 Years',
    years: 5,
    description: 'Financial statements, bank records',
  },
  {
    value: '7_years',
    label: '7 Years',
    years: 7,
    description: 'Legal documents, audit records',
  },
  {
    value: '10_years',
    label: '10 Years',
    years: 10,
    description: 'Corporate records, major contracts',
  },
  {
    value: '15_years',
    label: '15 Years',
    years: 15,
    description: 'Real estate documents, pension records',
  },
  {
    value: '20_years',
    label: '20 Years',
    years: 20,
    description: 'Long-term regulatory documents',
  },
  {
    value: 'permanent',
    label: 'Permanent',
    years: null,
    description: 'Articles of incorporation, board minutes, intellectual property',
  },
  {
    value: 'custom',
    label: 'Custom',
    years: null,
    description: 'Specify custom retention period',
  },
]

/**
 * Departments - CCC PLC organizational departments
 */
export const DEPARTMENTS: DepartmentInfo[] = [
  {
    value: 'accounting',
    label: 'Accounting',
    description: 'Financial accounting and bookkeeping',
    defaultConfidentiality: 'confidential',
  },
  {
    value: 'audit',
    label: 'Audit',
    description: 'Internal and external audit functions',
    defaultConfidentiality: 'highly_confidential',
  },
  {
    value: 'compliance',
    label: 'Compliance',
    description: 'Regulatory compliance and risk management',
    defaultConfidentiality: 'confidential',
  },
  {
    value: 'engagements',
    label: 'Engagements',
    description: 'Client engagements and project management',
    defaultConfidentiality: 'confidential',
  },
  {
    value: 'it',
    label: 'IT',
    description: 'Information technology and systems',
    defaultConfidentiality: 'internal',
  },
  {
    value: 'risk',
    label: 'Risk',
    description: 'Risk assessment and management',
    defaultConfidentiality: 'highly_confidential',
  },
  {
    value: 'hr',
    label: 'Human Resources',
    description: 'Human resources and personnel',
    defaultConfidentiality: 'highly_confidential',
  },
  {
    value: 'legal',
    label: 'Legal',
    description: 'Legal affairs and counsel',
    defaultConfidentiality: 'highly_confidential',
  },
  {
    value: 'operations',
    label: 'Operations',
    description: 'Business operations and administration',
    defaultConfidentiality: 'internal',
  },
  {
    value: 'executive',
    label: 'Executive',
    description: 'Executive management and board',
    defaultConfidentiality: 'highly_confidential',
  },
]

/**
 * Confidentiality Levels - Security classification
 */
export interface ConfidentialityLevelInfo {
  value: ConfidentialityLevel
  label: string
  description: string
  color: string
  icon: string
  accessLevel: number // Higher number = more restricted
}

export const CONFIDENTIALITY_LEVELS: ConfidentialityLevelInfo[] = [
  {
    value: 'public',
    label: 'Public',
    description: 'Accessible to all within organization',
    color: 'gray',
    icon: '🌐',
    accessLevel: 0,
  },
  {
    value: 'internal',
    label: 'Internal',
    description: 'Authorized employees only',
    color: 'blue',
    icon: '🏢',
    accessLevel: 1,
  },
  {
    value: 'confidential',
    label: 'Confidential',
    description: 'Specific departments/roles only',
    color: 'orange',
    icon: '🔒',
    accessLevel: 2,
  },
  {
    value: 'highly_confidential',
    label: 'Highly Confidential',
    description: 'Designated individuals only',
    color: 'red',
    icon: '🔐',
    accessLevel: 3,
  },
]

/**
 * Identifier Types - Document identifier classifications
 */
export interface IdentifierTypeInfo {
  value: IdentifierType
  label: string
  description: string
  format?: string // Example format
  pattern?: string // Validation regex
}

export const IDENTIFIER_TYPES: IdentifierTypeInfo[] = [
  {
    value: 'customer_id',
    label: 'Customer ID',
    description: 'Unique customer identifier',
    format: 'CUST-123456',
    pattern: '^CUST-\\d{6}$',
  },
  {
    value: 'contract_number',
    label: 'Contract Number',
    description: 'Contract reference number',
    format: 'CNT-2025-001',
    pattern: '^CNT-\\d{4}-\\d{3}$',
  },
  {
    value: 'invoice_number',
    label: 'Invoice Number',
    description: 'Invoice reference number',
    format: 'INV-2025-0001',
    pattern: '^INV-\\d{4}-\\d{4}$',
  },
  {
    value: 'case_number',
    label: 'Case Number',
    description: 'Case or matter reference',
    format: 'CASE-2025-A-001',
    pattern: '^CASE-\\d{4}-[A-Z]-\\d{3}$',
  },
  {
    value: 'policy_number',
    label: 'Policy Number',
    description: 'Policy reference number',
    format: 'POL-123456',
    pattern: '^POL-\\d{6}$',
  },
  {
    value: 'account_number',
    label: 'Account Number',
    description: 'Account reference number',
    format: 'ACC-123456789',
    pattern: '^ACC-\\d{9}$',
  },
  {
    value: 'reference_number',
    label: 'Reference Number',
    description: 'General reference number',
    format: 'REF-2025-001',
  },
  {
    value: 'transaction_id',
    label: 'Transaction ID',
    description: 'Transaction reference',
    format: 'TXN-123456789',
  },
  {
    value: 'employee_id',
    label: 'Employee ID',
    description: 'Employee reference number',
    format: 'EMP-12345',
    pattern: '^EMP-\\d{5}$',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Other identifier type',
  },
]

/**
 * Common document tags by category
 */
export const COMMON_TAGS: Record<string, string[]> = {
  financial: ['urgent', 'payment', 'invoice', 'expense', 'revenue', 'budget', 'forecast'],
  legal: ['contract', 'agreement', 'litigation', 'intellectual-property', 'regulatory'],
  compliance: ['kyc', 'aml', 'gdpr', 'sox', 'audit', 'risk-assessment'],
  hr: ['employment', 'performance', 'training', 'compensation', 'benefits'],
  operational: ['project', 'meeting', 'client', 'vendor', 'internal'],
  status: ['draft', 'final', 'approved', 'pending-review', 'archived'],
  priority: ['high-priority', 'urgent', 'routine', 'low-priority'],
}

/**
 * Currency codes
 */
export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
]

/**
 * Language codes
 */
export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'es', name: 'Spanish' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
]

/**
 * Helper functions to get items by value
 */
export const getDocumentTypeInfo = (type: DocumentType): DocumentTypeInfo | undefined => {
  return DOCUMENT_TYPES.find((t) => t.value === type)
}

export const getRetentionPeriodInfo = (period: RetentionPeriod): RetentionPeriodInfo | undefined => {
  return RETENTION_PERIODS.find((p) => p.value === period)
}

export const getDepartmentInfo = (department: Department): DepartmentInfo | undefined => {
  return DEPARTMENTS.find((d) => d.value === department)
}

export const getConfidentialityInfo = (
  level: ConfidentialityLevel
): ConfidentialityLevelInfo | undefined => {
  return CONFIDENTIALITY_LEVELS.find((c) => c.value === level)
}

export const getIdentifierTypeInfo = (type: IdentifierType): IdentifierTypeInfo | undefined => {
  return IDENTIFIER_TYPES.find((i) => i.value === type)
}

/**
 * Get document types by category
 */
export const getDocumentTypesByCategory = (
  category: DocumentTypeInfo['category']
): DocumentTypeInfo[] => {
  return DOCUMENT_TYPES.filter((t) => t.category === category)
}

/**
 * Get suggested tags for document type
 */
export const getSuggestedTags = (documentType: DocumentType): string[] => {
  const typeInfo = getDocumentTypeInfo(documentType)
  if (!typeInfo) return []

  return COMMON_TAGS[typeInfo.category] || []
}

/**
 * Get default retention period for document type
 */
export const getDefaultRetentionPeriod = (documentType: DocumentType): RetentionPeriod => {
  const defaults: Partial<Record<DocumentType, RetentionPeriod>> = {
    invoice: '7_years',
    contract: '10_years',
    financial_statement: '7_years',
    tax_document: '7_years',
    legal_document: '10_years',
    audit_report: '7_years',
    kyc_record: '5_years',
    hr_document: '7_years',
    policy: 'permanent',
    certificate: 'permanent',
  }

  return defaults[documentType] || '5_years'
}
