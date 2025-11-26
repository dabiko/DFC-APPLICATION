/**
 * Upload Types
 * Type definitions for file upload functionality
 */

/**
 * Upload Status
 */
export type UploadStatus =
  | 'pending'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'error'
  | 'cancelled'
  | 'duplicate'

/**
 * File Upload Item
 */
/**
 * Duplicate file info when upload is blocked
 */
export interface DuplicateFileInfo {
  /** ID of the existing document */
  documentId: string
  /** Title of the existing document */
  title: string
  /** File name of the existing document */
  fileName: string
  /** Folder ID where the existing document lives */
  folderId: string | null
  /** Folder name where the existing document lives */
  folderName: string | null
  /** Full path to the folder */
  folderPath: string | null
  /** Confidentiality level */
  confidentialityLevel: string
  /** Document type */
  documentType: string
}

export interface FileUploadItem {
  /** Unique ID for this upload */
  id: string
  /** File object */
  file: File
  /** Upload status */
  status: UploadStatus
  /** Upload progress (0-100) */
  progress: number
  /** Error message if failed */
  error?: string
  /** File preview URL (for images) */
  previewUrl?: string
  /** Uploaded document ID (after successful upload) */
  documentId?: string
  /** Upload start time */
  startedAt?: string
  /** Upload completion time */
  completedAt?: string
  /** Upload speed (bytes per second) */
  uploadSpeed?: number
  /** Time remaining (seconds) */
  timeRemaining?: number
  /** Duplicate file info (when upload blocked due to existing file) */
  duplicateInfo?: DuplicateFileInfo
}

/**
 * Upload Configuration
 */
export interface UploadConfig {
  /** Maximum file size in bytes */
  maxFileSize: number
  /** Maximum number of files */
  maxFiles: number
  /** Accepted file types (MIME types) */
  acceptedFileTypes: string[]
  /** Allow multiple files */
  multiple: boolean
  /** Auto-start upload */
  autoUpload: boolean
  /** Chunk size for large files (bytes) */
  chunkSize?: number
  /** Enable resumable uploads */
  resumable?: boolean
}

/**
 * File Validation Error
 */
export interface FileValidationError {
  /** Error code */
  code: 'file-too-large' | 'file-invalid-type' | 'too-many-files' | 'file-exists' | 'invalid-name'
  /** Error message */
  message: string
  /** File that failed validation */
  file: File
}

/**
 * Upload Result
 */
export interface UploadResult {
  /** Upload was successful */
  success: boolean
  /** Uploaded document ID */
  documentId?: string
  /** Document URL */
  documentUrl?: string
  /** Error message if failed */
  error?: string
  /** File that was uploaded */
  file: File
}

/**
 * Bulk Upload Result
 */
export interface BulkUploadResult {
  /** Total files processed */
  total: number
  /** Successfully uploaded */
  successful: number
  /** Failed uploads */
  failed: number
  /** Individual results */
  results: UploadResult[]
}

/**
 * Upload Statistics
 */
export interface UploadStatistics {
  /** Total files */
  totalFiles: number
  /** Total size (bytes) */
  totalSize: number
  /** Uploaded files */
  uploadedFiles: number
  /** Uploaded size (bytes) */
  uploadedSize: number
  /** Failed files */
  failedFiles: number
  /** Average upload speed (bytes/sec) */
  averageSpeed: number
  /** Estimated time remaining (seconds) */
  estimatedTimeRemaining: number
}

/**
 * Component Props
 */

export interface FileDropzoneProps {
  /** Callback when files are selected/dropped */
  onFilesAdded: (files: File[]) => void
  /** Callback when files are rejected */
  onFilesRejected?: (errors: FileValidationError[]) => void
  /** Upload configuration */
  config?: Partial<UploadConfig>
  /** Is disabled */
  disabled?: boolean
  /** Custom class name */
  className?: string
  /** Show file list */
  showFileList?: boolean
  /** Custom dropzone text */
  dropzoneText?: string
  /** Custom browse text */
  browseText?: string
}

export interface FileUploadProgressProps {
  /** Upload item */
  upload: FileUploadItem
  /** Callback to cancel upload */
  onCancel?: (id: string) => void
  /** Callback to retry upload */
  onRetry?: (id: string) => void
  /** Callback to remove from list */
  onRemove?: (id: string) => void
  /** Callback to create shortcut (when duplicate detected) */
  onCreateShortcut?: (id: string, documentId: string) => void
  /** Show details */
  showDetails?: boolean
  /** Custom class name */
  className?: string
}

export interface FilePreviewCardProps {
  /** File to preview */
  file: File
  /** Preview URL */
  previewUrl?: string
  /** Is selected */
  isSelected?: boolean
  /** Callback when removed */
  onRemove?: () => void
  /** Callback when selected */
  onSelect?: () => void
  /** Show metadata */
  showMetadata?: boolean
  /** Custom class name */
  className?: string
}

export interface DocumentUploadModalProps {
  /** Is modal open */
  isOpen: boolean
  /** Callback when modal closes */
  onClose: () => void
  /** Callback when upload completes */
  onUploadComplete?: (results: BulkUploadResult) => void
  /** Target folder ID */
  folderId?: string
  /** Upload configuration */
  config?: Partial<UploadConfig>
  /** Require metadata before upload */
  requireMetadata?: boolean
  /** Custom class name */
  className?: string
}

export interface FileListProps {
  /** List of upload items */
  uploads: FileUploadItem[]
  /** Callback to cancel upload */
  onCancel?: (id: string) => void
  /** Callback to retry upload */
  onRetry?: (id: string) => void
  /** Callback to remove from list */
  onRemove?: (id: string) => void
  /** Callback to clear all completed */
  onClearCompleted?: () => void
  /** Show statistics */
  showStatistics?: boolean
  /** Custom class name */
  className?: string
}

/**
 * Default Upload Configuration
 */
export const DEFAULT_UPLOAD_CONFIG: UploadConfig = {
  maxFileSize: 500 * 1024 * 1024, // 500MB
  maxFiles: 10,
  acceptedFileTypes: [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
  ],
  multiple: true,
  autoUpload: false,
  chunkSize: 5 * 1024 * 1024, // 5MB chunks
  resumable: true,
}

/**
 * File Type Categories
 */
export const FILE_TYPE_CATEGORIES = {
  document: {
    label: 'Documents',
    icon: '📄',
    extensions: ['.pdf', '.doc', '.docx', '.txt', '.rtf'],
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ],
  },
  spreadsheet: {
    label: 'Spreadsheets',
    icon: '📊',
    extensions: ['.xls', '.xlsx', '.csv'],
    mimeTypes: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ],
  },
  presentation: {
    label: 'Presentations',
    icon: '📽️',
    extensions: ['.ppt', '.pptx'],
    mimeTypes: [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
  },
  image: {
    label: 'Images',
    icon: '🖼️',
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  },
  archive: {
    label: 'Archives',
    icon: '📦',
    extensions: ['.zip', '.rar', '.7z'],
    mimeTypes: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'],
  },
  other: {
    label: 'Other',
    icon: '📎',
    extensions: [],
    mimeTypes: [],
  },
} as const

export type FileTypeCategory = keyof typeof FILE_TYPE_CATEGORIES
