// Mock data for testing and development
import {
  User,
  Document,
  Folder,
  Department,
  UserRole,
  ConfidentialityLevel,
  DocumentType,
} from '@types/index'

// Mock Users
export const mockUsers: User[] = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    role: UserRole.ADMIN,
    department: Department.IT,
    mfaEnabled: true,
  },
  {
    id: '2',
    username: 'jdoe',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.EDITOR,
    department: Department.ACCOUNTING,
    mfaEnabled: false,
  },
]

// Mock Folders
export const mockFolders: Folder[] = [
  {
    id: 'root',
    name: 'Root',
    parentId: null,
    path: '/',
    createdBy: '1',
    modifiedBy: '1',
    createdAt: '2025-01-01T00:00:00Z',
    modifiedAt: '2025-01-01T00:00:00Z',
    confidentialityLevel: ConfidentialityLevel.INTERNAL,
    isLocked: false,
    permissions: [],
  },
  {
    id: 'folder-1',
    name: 'Customer Records',
    parentId: 'root',
    path: '/Customer Records',
    createdBy: '1',
    modifiedBy: '1',
    createdAt: '2025-01-01T00:00:00Z',
    modifiedAt: '2025-01-01T00:00:00Z',
    confidentialityLevel: ConfidentialityLevel.CONFIDENTIAL,
    isLocked: false,
    permissions: [],
  },
]

// Mock Documents
export const mockDocuments: Document[] = [
  {
    id: 'doc-1',
    title: 'Invoice #12345',
    fileName: '2025-01-15_CUST001_Invoice_Q1_V1.pdf',
    fileType: 'application/pdf',
    fileSize: 1024000,
    documentType: DocumentType.INVOICE,
    folderId: 'folder-1',
    createdBy: '1',
    modifiedBy: '1',
    createdAt: '2025-01-15T10:00:00Z',
    modifiedAt: '2025-01-15T10:00:00Z',
    confidentialityLevel: ConfidentialityLevel.INTERNAL,
    tags: ['invoice', 'Q1', 'customer-001'],
    metadata: {
      identifier: 'INV-12345',
      date: '2025-01-15',
      creator: 'Admin User',
      department: Department.ACCOUNTING,
    },
    versionNumber: 1,
    isOnLegalHold: false,
    retentionPeriod: '7 years',
    retentionEndDate: '2032-01-15',
  },
  {
    id: 'doc-2',
    title: 'Customer Contract',
    fileName: '2025-01-10_CUST001_Contract_ServiceAgreement_V2.pdf',
    fileType: 'application/pdf',
    fileSize: 2048000,
    documentType: DocumentType.CONTRACT,
    folderId: 'folder-1',
    createdBy: '2',
    modifiedBy: '2',
    createdAt: '2025-01-10T14:30:00Z',
    modifiedAt: '2025-01-12T09:15:00Z',
    confidentialityLevel: ConfidentialityLevel.HIGHLY_CONFIDENTIAL,
    tags: ['contract', 'legal', 'customer-001'],
    metadata: {
      identifier: 'CON-789',
      date: '2025-01-10',
      creator: 'John Doe',
      department: Department.COMPLIANCE,
    },
    versionNumber: 2,
    isOnLegalHold: true,
    retentionPeriod: '10 years',
    retentionEndDate: '2035-01-10',
  },
]
