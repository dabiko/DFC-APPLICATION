/**
 * Version Control Types
 * Type definitions for document version management
 */

/**
 * Document Version - represents a single version of a document
 */
export interface DocumentVersion {
  /** Unique version ID */
  id: string
  /** Document ID this version belongs to */
  documentId: string
  /** Version number (incremental) */
  versionNumber: number
  /** File name */
  fileName: string
  /** File size in bytes */
  fileSize: number
  /** MIME type */
  mimeType: string
  /** File checksum (SHA-256) */
  checksum: string
  /** User who created this version */
  createdBy: string
  /** Creation timestamp (ISO string) */
  createdAt: string
  /** Change description/notes */
  changeDescription?: string
  /** Tags associated with this version */
  tags?: string[]
  /** Is this the current/active version */
  isCurrent: boolean
  /** Storage path/key */
  storagePath: string
  /** Download URL (signed URL from MinIO) */
  downloadUrl?: string
  /** Preview URL (if available) */
  previewUrl?: string
}

/**
 * Version Change Type
 */
export type VersionChangeType = 'created' | 'updated' | 'restored' | 'deleted'

/**
 * Version Activity - audit trail entry for version actions
 */
export interface VersionActivity {
  /** Activity ID */
  id: string
  /** Version ID */
  versionId: string
  /** Document ID */
  documentId: string
  /** Activity type */
  activityType: VersionChangeType
  /** User who performed the action */
  performedBy: string
  /** Activity timestamp */
  performedAt: string
  /** Additional details */
  details?: string
  /** IP address */
  ipAddress?: string
}

/**
 * Version Comparison Result
 */
export interface VersionComparison {
  /** Original version */
  fromVersion: DocumentVersion
  /** Compared version */
  toVersion: DocumentVersion
  /** Changes detected */
  changes: VersionChange[]
  /** Metadata differences */
  metadataChanges?: MetadataChange[]
}

/**
 * Version Change Detail
 */
export interface VersionChange {
  /** Change type */
  type: 'content' | 'metadata' | 'file'
  /** Field or section changed */
  field: string
  /** Old value */
  oldValue: string | number | boolean
  /** New value */
  newValue: string | number | boolean
  /** Change description */
  description: string
}

/**
 * Metadata Change Detail
 */
export interface MetadataChange {
  /** Metadata field */
  field: string
  /** Old value */
  oldValue: unknown
  /** New value */
  newValue: unknown
  /** Changed by */
  changedBy: string
  /** Changed at */
  changedAt: string
}

/**
 * Version Restore Request
 */
export interface VersionRestoreRequest {
  /** Document ID */
  documentId: string
  /** Version to restore */
  versionId: string
  /** Reason for restoration */
  reason?: string
  /** Create backup of current version before restore */
  createBackup?: boolean
}

/**
 * Version Statistics
 */
export interface VersionStatistics {
  /** Total number of versions */
  totalVersions: number
  /** Current version number */
  currentVersion: number
  /** Total storage used by all versions (bytes) */
  totalStorageSize: number
  /** First version date */
  firstVersionDate: string
  /** Last modified date */
  lastModifiedDate: string
  /** Number of unique contributors */
  contributorCount: number
  /** List of contributors */
  contributors: string[]
}

/**
 * Version List Filter Options
 */
export interface VersionFilterOptions {
  /** Filter by user */
  createdBy?: string
  /** Filter by date range */
  dateFrom?: string
  dateTo?: string
  /** Filter by version numbers */
  versionFrom?: number
  versionTo?: number
  /** Include deleted versions */
  includeDeleted?: boolean
  /** Sort order */
  sortBy?: 'versionNumber' | 'createdAt' | 'fileSize'
  /** Sort direction */
  sortOrder?: 'asc' | 'desc'
}

/**
 * Component Props
 */

export interface VersionHistoryListProps {
  /** Document ID to show versions for */
  documentId: string
  /** List of versions */
  versions: DocumentVersion[]
  /** Current/active version ID */
  currentVersionId?: string
  /** Callback when version is selected for viewing */
  onViewVersion?: (version: DocumentVersion) => void
  /** Callback when version is selected for download */
  onDownloadVersion?: (version: DocumentVersion) => void
  /** Callback when version is selected for restoration */
  onRestoreVersion?: (version: DocumentVersion) => void
  /** Callback when comparing versions */
  onCompareVersions?: (fromVersion: DocumentVersion, toVersion: DocumentVersion) => void
  /** Loading state */
  isLoading?: boolean
  /** Can user restore versions */
  canRestore?: boolean
  /** Can user delete versions */
  canDelete?: boolean
  /** Custom class name */
  className?: string
}

export interface VersionComparisonProps {
  /** Comparison data */
  comparison: VersionComparison
  /** Is open */
  isOpen: boolean
  /** On close callback */
  onClose: () => void
  /** Loading state */
  isLoading?: boolean
}

export interface VersionTimelineProps {
  /** List of versions */
  versions: DocumentVersion[]
  /** List of activities */
  activities?: VersionActivity[]
  /** Current version ID */
  currentVersionId?: string
  /** Callback when version clicked */
  onVersionClick?: (version: DocumentVersion) => void
  /** Show activities */
  showActivities?: boolean
  /** Custom class name */
  className?: string
}

export interface VersionCardProps {
  /** Version data */
  version: DocumentVersion
  /** Is this the current version */
  isCurrent?: boolean
  /** Is selected for comparison */
  isSelected?: boolean
  /** On view callback */
  onView?: (version: DocumentVersion) => void
  /** On download callback */
  onDownload?: (version: DocumentVersion) => void
  /** On restore callback */
  onRestore?: (version: DocumentVersion) => void
  /** On delete callback */
  onDelete?: (version: DocumentVersion) => void
  /** On select for comparison */
  onSelectForComparison?: (version: DocumentVersion) => void
  /** Can restore */
  canRestore?: boolean
  /** Can delete */
  canDelete?: boolean
  /** Custom class name */
  className?: string
}
