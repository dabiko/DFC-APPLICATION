// Global type definitions for the DFC application

// User types
export interface User {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  department: Department
  avatar?: string
  mfaEnabled: boolean
}

export const UserRole = {
  VIEWER: 'viewer',
  EDITOR: 'editor',
  MANAGER: 'manager',
  ADMIN: 'admin',
} as const

export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export const Department = {
  ENGAGEMENTS: 'engagements',
  ACCOUNTING: 'accounting',
  IT: 'it',
  COMPLIANCE: 'compliance',
  RISK: 'risk',
  AUDIT: 'audit',
} as const

export type Department = (typeof Department)[keyof typeof Department]

// Document types
export interface Document {
  id: string
  title: string
  fileName: string
  fileType: string
  fileSize: number
  documentType: DocumentType
  folderId: string
  createdBy: string
  modifiedBy: string
  createdAt: string
  modifiedAt: string
  confidentialityLevel: ConfidentialityLevel
  tags: string[]
  metadata: DocumentMetadata
  versionNumber: number
  isOnLegalHold: boolean
  retentionPeriod?: string
  retentionEndDate?: string
}

export const DocumentType = {
  INVOICE: 'invoice',
  CONTRACT: 'contract',
  REPORT: 'report',
  KYC_RECORD: 'kyc_record',
  COMPLIANCE_DOCUMENT: 'compliance_document',
  FINANCIAL_STATEMENT: 'financial_statement',
  OTHER: 'other',
} as const

export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType]

export const ConfidentialityLevel = {
  PUBLIC: 'public',
  INTERNAL: 'internal',
  CONFIDENTIAL: 'confidential',
  HIGHLY_CONFIDENTIAL: 'highly_confidential',
} as const

export type ConfidentialityLevel = (typeof ConfidentialityLevel)[keyof typeof ConfidentialityLevel]

export interface DocumentMetadata {
  identifier?: string
  date?: string
  creator?: string
  department?: Department
  customFields?: Record<string, string | number | boolean>
}

// Folder types
export interface Folder {
  id: string
  name: string
  parentId: string | null
  path: string
  createdBy: string
  modifiedBy: string
  createdAt: string
  modifiedAt: string
  confidentialityLevel: ConfidentialityLevel
  isLocked: boolean
  permissions: Permission[]
}

// Permission types
export interface Permission {
  userId: string
  level: PermissionLevel
  inheritedFrom?: string
}

export const PermissionLevel = {
  VIEW: 'view',
  EDIT: 'edit',
  SHARE: 'share',
  MANAGE: 'manage',
} as const

export type PermissionLevel = (typeof PermissionLevel)[keyof typeof PermissionLevel]

// API Response types
export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// Error types
export interface ApiError {
  message: string
  code?: string
  field?: string
}
