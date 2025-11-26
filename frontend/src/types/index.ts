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

// Document Shortcut types
export interface DocumentShortcut {
  id: string
  folder: string
  createdAt: string
  createdBy: string
  createdByName: string
  // Original document metadata (proxied)
  originalDocumentId: string
  title: string
  fileName: string
  fileSize: number
  fileType: string
  documentType: string
  confidentialityLevel: ConfidentialityLevel
  versionNumber: number
  documentDate?: string
  checksum?: string
  // Owner and department
  ownerId: string
  ownerName: string
  departmentId: string
  departmentName: string
  // Original location
  originalFolderId: string
  originalFolderName: string
  originalFolderPath: string
  // Shortcut flag and tags
  isShortcut: true
  tags: string[]
}

export interface DocumentShortcutListItem {
  id: string
  folder: string
  originalDocumentId: string
  title: string
  fileName: string
  fileSize: number
  fileType: string
  documentType: string
  confidentialityLevel: ConfidentialityLevel
  originalFolderId: string | null
  originalFolderName: string | null
  createdAt: string
  isShortcut: true
}

export interface DocumentShortcutLocation {
  id: string
  folder: string
  folderName: string
  folderPath: string
  createdAt: string
  createdByName: string
}

export interface CreateShortcutRequest {
  documentId: string
  targetFolderId: string
}

export interface BulkCreateShortcutRequest {
  documentIds: string[]
  targetFolderId: string
}

export interface BulkCreateShortcutResponse {
  message: string
  createdCount: number
  created: DocumentShortcutListItem[]
  skipped: {
    sameFolder: string[]
    alreadyExists: string[]
    total: number
  }
}

export interface CanDeleteResponse {
  documentId: string
  documentTitle: string
  canDelete: boolean
  message: string | null
  shortcutCount?: number
  shortcutLocations?: {
    id: string
    folderName: string
    folderPath: string
  }[]
}

export interface ShortcutLocationsResponse {
  documentId: string
  documentTitle: string
  shortcutCount: number
  shortcuts: DocumentShortcutLocation[]
}
