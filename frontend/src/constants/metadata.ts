/**
 * Metadata Constants
 * Dropdown options and configurations for document metadata
 */

import type {
  DocumentType,
  DocumentTypeInfo,
  Department,
  DepartmentInfo,
  RetentionPeriod,
  RetentionPeriodInfo,
  IdentifierType,
} from '@/types/metadata'
import type { ConfidentialityLevel } from '@/types/folder'

/**
 * Document Types with labels and descriptions
 * NOTE: Backend expects UPPERCASE values (e.g., 'INVOICE' not 'invoice')
 */
export const DOCUMENT_TYPES: DocumentTypeInfo[] = [
  {
    value: 'INVOICE',
    label: 'Invoice',
    description: 'Financial invoices',
    category: 'financial',
    icon: '📄',
  },
  {
    value: 'CONTRACT',
    label: 'Contract',
    description: 'Legal contracts and agreements',
    category: 'legal',
    icon: '📝',
  },
  {
    value: 'REPORT',
    label: 'Report',
    description: 'Business and financial reports',
    category: 'operational',
    icon: '📊',
  },
  {
    value: 'KYC_RECORD',
    label: 'KYC Record',
    description: 'Know Your Customer documentation',
    category: 'compliance',
    icon: '🔍',
  },
  {
    value: 'STATEMENT',
    label: 'Statement',
    description: 'Financial statements',
    category: 'financial',
    icon: '💰',
  },
  {
    value: 'CORRESPONDENCE',
    label: 'Correspondence',
    description: 'Business correspondence',
    category: 'operational',
    icon: '✉️',
  },
  {
    value: 'POLICY_DOCUMENT',
    label: 'Policy',
    description: 'Company policies',
    category: 'compliance',
    icon: '📋',
  },
  {
    value: 'PROCEDURE_DOCUMENT',
    label: 'Procedure',
    description: 'Standard operating procedures',
    category: 'operational',
    icon: '⚙️',
  },
  {
    value: 'MEMO',
    label: 'Memo',
    description: 'Internal memos',
    category: 'operational',
    icon: '📌',
  },
  {
    value: 'PRESENTATION',
    label: 'Presentation',
    description: 'Business presentations',
    category: 'operational',
    icon: '📽️',
  },
  {
    value: 'SPREADSHEET',
    label: 'Spreadsheet',
    description: 'Data spreadsheets',
    category: 'operational',
    icon: '📈',
  },
  {
    value: 'FORM',
    label: 'Form',
    description: 'Business forms',
    category: 'operational',
    icon: '📋',
  },
  {
    value: 'CERTIFICATE',
    label: 'Certificate',
    description: 'Certificates and credentials',
    category: 'compliance',
    icon: '🏆',
  },
  {
    value: 'AGREEMENT',
    label: 'Agreement',
    description: 'Business agreements',
    category: 'legal',
    icon: '🤝',
  },
  {
    value: 'AUDIT_REPORT',
    label: 'Audit Report',
    description: 'Internal and external audit reports',
    category: 'compliance',
    icon: '🔎',
  },
  {
    value: 'BANK_STATEMENT',
    label: 'Bank Statement',
    description: 'Bank statements',
    category: 'financial',
    icon: '💵',
  },
  {
    value: 'TAX_DOCUMENT',
    label: 'Tax Document',
    description: 'Tax-related documents',
    category: 'financial',
    icon: '📑',
  },
  {
    value: 'LEGAL_DOCUMENT',
    label: 'Legal Document',
    description: 'Legal documents',
    category: 'legal',
    icon: '⚖️',
  },
  {
    value: 'PASSPORT',
    label: 'Passport',
    description: 'Passport documents',
    category: 'identity',
    icon: '🛂',
  },
  {
    value: 'ID_CARD',
    label: 'ID Card',
    description: 'Identity cards',
    category: 'identity',
    icon: '🪪',
  },
  {
    value: 'OTHER',
    label: 'Other',
    description: 'Other document types',
    category: 'general',
    icon: '📎',
  },
]

/**
 * Departments with labels and descriptions
 */
export const DEPARTMENTS: DepartmentInfo[] = [
  {
    value: 'accounting',
    label: 'Accounting',
    description: 'Financial accounting department',
    defaultConfidentiality: 'Confidential',
  },
  {
    value: 'audit',
    label: 'Audit',
    description: 'Internal and external audit',
    defaultConfidentiality: 'Highly Confidential',
  },
  {
    value: 'compliance',
    label: 'Compliance',
    description: 'Regulatory compliance',
    defaultConfidentiality: 'Confidential',
  },
  {
    value: 'engagements',
    label: 'Engagements',
    description: 'Client engagements',
    defaultConfidentiality: 'Confidential',
  },
  {
    value: 'it',
    label: 'IT',
    description: 'Information technology',
    defaultConfidentiality: 'Internal',
  },
  {
    value: 'risk',
    label: 'Risk',
    description: 'Risk management',
    defaultConfidentiality: 'Confidential',
  },
  {
    value: 'hr',
    label: 'Human Resources',
    description: 'Human resources',
    defaultConfidentiality: 'Highly Confidential',
  },
  {
    value: 'legal',
    label: 'Legal',
    description: 'Legal department',
    defaultConfidentiality: 'Highly Confidential',
  },
  {
    value: 'operations',
    label: 'Operations',
    description: 'Business operations',
    defaultConfidentiality: 'Internal',
  },
  {
    value: 'executive',
    label: 'Executive',
    description: 'Executive management',
    defaultConfidentiality: 'Highly Confidential',
  },
]

/**
 * Retention Periods with labels and descriptions
 */
export const RETENTION_PERIODS: RetentionPeriodInfo[] = [
  { value: '1_year', label: '1 Year', years: 1, description: 'Retain for 1 year' },
  { value: '3_years', label: '3 Years', years: 3, description: 'Retain for 3 years' },
  { value: '5_years', label: '5 Years', years: 5, description: 'Retain for 5 years' },
  {
    value: '7_years',
    label: '7 Years',
    years: 7,
    description: 'Retain for 7 years (Common for financial documents)',
  },
  { value: '10_years', label: '10 Years', years: 10, description: 'Retain for 10 years' },
  { value: '15_years', label: '15 Years', years: 15, description: 'Retain for 15 years' },
  { value: '20_years', label: '20 Years', years: 20, description: 'Retain for 20 years' },
  { value: 'permanent', label: 'Permanent', years: null, description: 'Retain indefinitely' },
  { value: 'custom', label: 'Custom', years: null, description: 'Custom retention period' },
]

/**
 * Confidentiality Levels with colors and descriptions
 * NOTE: Backend expects UPPERCASE values (e.g., 'PUBLIC' not 'Public')
 */
export const CONFIDENTIALITY_LEVELS: Array<{
  value: string // Backend expects UPPERCASE
  label: string
  description: string
  color: string
  textColor: string
  bgColor: string
}> = [
  {
    value: 'PUBLIC',
    label: 'Public',
    description: 'Accessible to all within organization',
    color: 'gray',
    textColor: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
  },
  {
    value: 'INTERNAL',
    label: 'Internal',
    description: 'Authorized employees only',
    color: 'blue',
    textColor: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  {
    value: 'CONFIDENTIAL',
    label: 'Confidential',
    description: 'Specific departments/roles only',
    color: 'orange',
    textColor: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  {
    value: 'HIGHLY_CONFIDENTIAL',
    label: 'Highly Confidential',
    description: 'Designated individuals only',
    color: 'red',
    textColor: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
]

/**
 * Identifier Types
 */
export const IDENTIFIER_TYPES: Array<{ value: IdentifierType; label: string }> = [
  { value: 'customer_id', label: 'Customer ID' },
  { value: 'contract_number', label: 'Contract Number' },
  { value: 'invoice_number', label: 'Invoice Number' },
  { value: 'case_number', label: 'Case Number' },
  { value: 'policy_number', label: 'Policy Number' },
  { value: 'account_number', label: 'Account Number' },
  { value: 'reference_number', label: 'Reference Number' },
  { value: 'transaction_id', label: 'Transaction ID' },
  { value: 'employee_id', label: 'Employee ID' },
  { value: 'other', label: 'Other' },
]

/**
 * Get document type info by value
 */
export const getDocumentType = (value: DocumentType): DocumentTypeInfo | undefined => {
  return DOCUMENT_TYPES.find((type) => type.value === value)
}

/**
 * Get department info by value
 */
export const getDepartment = (value: Department): DepartmentInfo | undefined => {
  return DEPARTMENTS.find((dept) => dept.value === value)
}

/**
 * Get retention period info by value
 */
export const getRetentionPeriod = (value: RetentionPeriod): RetentionPeriodInfo | undefined => {
  return RETENTION_PERIODS.find((period) => period.value === value)
}

/**
 * Get confidentiality level info by value
 */
export const getConfidentialityLevel = (value: ConfidentialityLevel) => {
  return CONFIDENTIALITY_LEVELS.find((level) => level.value === value)
}

/**
 * Get default retention period for a document type
 */
export const getDefaultRetentionForDocumentType = (documentType: DocumentType): RetentionPeriod => {
  const retentionMap: Partial<Record<DocumentType, RetentionPeriod>> = {
    invoice: '7_years',
    contract: '10_years',
    financial_statement: '7_years',
    tax_document: '7_years',
    legal_document: '10_years',
    audit_report: '7_years',
    kyc_record: '10_years',
    hr_document: '7_years',
    policy: 'permanent',
    certificate: 'permanent',
  }
  return retentionMap[documentType] || '5_years'
}

/**
 * Get default confidentiality for department
 */
export const getDefaultConfidentialityForDepartment = (department: Department): string => {
  const deptInfo = getDepartment(department)
  // Return UPPERCASE with underscores for backend (e.g., 'HIGHLY_CONFIDENTIAL')
  return deptInfo?.defaultConfidentiality?.toUpperCase().replace(/\s+/g, '_') || 'INTERNAL'
}
