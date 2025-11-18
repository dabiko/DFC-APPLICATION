/**
 * Encryption & Security Types
 * Complete type definitions for encryption, key management, and security features
 */

/**
 * Encryption Algorithm Types
 */
export type EncryptionAlgorithm = 'AES-256-GCM' | 'AES-256-CBC' | 'ChaCha20-Poly1305' | 'RSA-4096'

/**
 * Encryption Status
 */
export type EncryptionStatus = 'encrypted' | 'unencrypted' | 'encrypting' | 'decrypting' | 'failed'

/**
 * Key Status
 */
export type KeyStatus = 'active' | 'expired' | 'revoked' | 'pending_rotation' | 'compromised'

/**
 * Key Type
 */
export type KeyType = 'master' | 'data' | 'backup' | 'archive'

/**
 * Encryption Strength Level
 */
export type EncryptionStrength = 'military' | 'high' | 'standard' | 'basic'

/**
 * Security Level (for documents/folders)
 */
export type SecurityLevel = 'top-secret' | 'secret' | 'confidential' | 'internal' | 'public'

/**
 * Compliance Standard
 */
export type ComplianceStandard =
  | 'FIPS-140-2'
  | 'FIPS-140-3'
  | 'PCI-DSS'
  | 'HIPAA'
  | 'GDPR'
  | 'SOX'
  | 'ISO-27001'

/**
 * Encryption Policy Type
 */
export type EncryptionPolicyType = 'mandatory' | 'optional' | 'automatic' | 'disabled'

/**
 * Key Rotation Frequency
 */
export type KeyRotationFrequency =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'annually'
  | 'manual'

/**
 * Encryption Metadata
 */
export interface EncryptionMetadata {
  /** Encryption algorithm used */
  algorithm: EncryptionAlgorithm
  /** Key ID used for encryption */
  keyId: string
  /** Version of the encryption */
  version: string
  /** Timestamp of encryption */
  encryptedAt: string
  /** User who initiated encryption */
  encryptedBy: string
  /** Initialization vector (IV) for symmetric encryption */
  iv?: string
  /** Authentication tag for AEAD ciphers */
  authTag?: string
  /** Key derivation function used */
  kdf?: 'PBKDF2' | 'scrypt' | 'Argon2'
  /** Salt for key derivation */
  salt?: string
  /** Compression applied before encryption */
  compression?: 'gzip' | 'brotli' | 'none'
}

/**
 * Document Encryption Info
 */
export interface DocumentEncryption {
  /** Document ID */
  documentId: string
  /** Encryption status */
  status: EncryptionStatus
  /** Encryption metadata */
  metadata?: EncryptionMetadata
  /** Encryption strength level */
  strength: EncryptionStrength
  /** Security classification */
  securityLevel: SecurityLevel
  /** Is document currently accessible */
  accessible: boolean
  /** Reason if not accessible */
  accessDeniedReason?: string
  /** Compliance standards met */
  complianceStandards: ComplianceStandard[]
  /** Client-side encrypted */
  clientSideEncrypted: boolean
  /** Server-side encrypted */
  serverSideEncrypted: boolean
  /** End-to-end encrypted */
  endToEndEncrypted: boolean
}

/**
 * Encryption Key
 */
export interface EncryptionKey {
  /** Unique key ID */
  id: string
  /** Key name/label */
  name: string
  /** Key type */
  type: KeyType
  /** Key status */
  status: KeyStatus
  /** Algorithm this key is used for */
  algorithm: EncryptionAlgorithm
  /** Key strength in bits */
  keySize: 128 | 192 | 256 | 2048 | 4096
  /** Creation timestamp */
  createdAt: string
  /** Created by user */
  createdBy: string
  /** Expiration date */
  expiresAt?: string
  /** Last rotation date */
  lastRotatedAt?: string
  /** Next rotation due date */
  nextRotationDue?: string
  /** Rotation frequency */
  rotationFrequency: KeyRotationFrequency
  /** Number of times key has been used */
  usageCount: number
  /** Maximum allowed usage count */
  maxUsageCount?: number
  /** Is key currently in use */
  inUse: boolean
  /** Documents encrypted with this key */
  documentCount: number
  /** Key fingerprint/hash */
  fingerprint: string
  /** Associated compliance standards */
  complianceStandards: ComplianceStandard[]
  /** Key escrow enabled */
  escrowEnabled: boolean
  /** Backup key ID */
  backupKeyId?: string
}

/**
 * Key Rotation Event
 */
export interface KeyRotationEvent {
  /** Event ID */
  id: string
  /** Key ID being rotated */
  keyId: string
  /** Old key ID */
  oldKeyId: string
  /** New key ID */
  newKeyId: string
  /** Rotation timestamp */
  rotatedAt: string
  /** User who initiated rotation */
  rotatedBy: string
  /** Reason for rotation */
  reason: 'scheduled' | 'compromised' | 'policy' | 'manual'
  /** Number of documents re-encrypted */
  documentsReencrypted: number
  /** Rotation status */
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  /** Error message if failed */
  errorMessage?: string
  /** Completion percentage */
  progress?: number
}

/**
 * Encryption Policy
 */
export interface EncryptionPolicy {
  /** Policy ID */
  id: string
  /** Policy name */
  name: string
  /** Policy description */
  description: string
  /** Policy type */
  type: EncryptionPolicyType
  /** Is policy active */
  enabled: boolean
  /** Security level required */
  requiredSecurityLevel: SecurityLevel
  /** Required encryption algorithm */
  requiredAlgorithm?: EncryptionAlgorithm
  /** Minimum key size */
  minKeySize: number
  /** Force client-side encryption */
  forceClientSide: boolean
  /** Allowed algorithms */
  allowedAlgorithms: EncryptionAlgorithm[]
  /** Key rotation frequency */
  keyRotationFrequency: KeyRotationFrequency
  /** Compliance standards to meet */
  complianceStandards: ComplianceStandard[]
  /** Apply to file types */
  fileTypes?: string[]
  /** Apply to folders */
  folderIds?: string[]
  /** Apply to departments */
  departments?: string[]
  /** Created timestamp */
  createdAt: string
  /** Last modified */
  modifiedAt: string
  /** Policy priority (higher = more important) */
  priority: number
}

/**
 * Secure Upload Configuration
 */
export interface SecureUploadConfig {
  /** Enable encryption during upload */
  encryptOnUpload: boolean
  /** Encryption algorithm to use */
  algorithm: EncryptionAlgorithm
  /** Client-side encryption */
  clientSideEncryption: boolean
  /** Chunk size for large files (bytes) */
  chunkSize: number
  /** Enable file integrity verification */
  verifyIntegrity: boolean
  /** Hash algorithm for verification */
  hashAlgorithm: 'SHA-256' | 'SHA-512' | 'Blake2b'
  /** Enable secure transfer (TLS) */
  secureTransfer: boolean
  /** Minimum TLS version */
  minTlsVersion: '1.2' | '1.3'
  /** Automatically classify security level */
  autoClassify: boolean
  /** Default security level */
  defaultSecurityLevel: SecurityLevel
  /** Virus scan before encryption */
  virusScan: boolean
  /** Content inspection enabled */
  contentInspection: boolean
}

/**
 * Encryption Settings (User/System)
 */
export interface EncryptionSettings {
  /** User/System ID */
  id: string
  /** Default encryption enabled */
  encryptByDefault: boolean
  /** Preferred algorithm */
  preferredAlgorithm: EncryptionAlgorithm
  /** Client-side encryption preference */
  preferClientSide: boolean
  /** Show encryption indicators */
  showIndicators: boolean
  /** Warn on unencrypted uploads */
  warnUnencrypted: boolean
  /** Auto-decrypt when viewing */
  autoDecrypt: boolean
  /** Cache decrypted files */
  cacheDecrypted: boolean
  /** Cache duration (seconds) */
  cacheDuration: number
  /** Require password for sensitive files */
  requirePasswordForSensitive: boolean
  /** Key rotation notifications */
  notifyKeyRotation: boolean
  /** Encryption audit alerts */
  auditAlerts: boolean
  /** Active policies */
  activePolicies: string[]
}

/**
 * Encryption Audit Entry
 */
export interface EncryptionAuditEntry {
  /** Audit entry ID */
  id: string
  /** Timestamp */
  timestamp: string
  /** User ID */
  userId: string
  /** User name */
  userName: string
  /** Action performed */
  action:
    | 'encrypt'
    | 'decrypt'
    | 'key_created'
    | 'key_rotated'
    | 'key_revoked'
    | 'policy_changed'
    | 'access_granted'
    | 'access_denied'
  /** Resource ID (document, key, etc.) */
  resourceId: string
  /** Resource type */
  resourceType: 'document' | 'key' | 'policy' | 'settings'
  /** Encryption algorithm used */
  algorithm?: EncryptionAlgorithm
  /** Key ID involved */
  keyId?: string
  /** Success or failure */
  outcome: 'success' | 'failure'
  /** Error message if failed */
  errorMessage?: string
  /** IP address */
  ipAddress: string
  /** User agent */
  userAgent: string
  /** Additional details */
  details?: Record<string, unknown>
}

/**
 * Security Badge Configuration
 */
export interface SecurityBadgeConfig {
  /** Show encryption status */
  showEncryption: boolean
  /** Show security level */
  showSecurityLevel: boolean
  /** Show compliance badges */
  showCompliance: boolean
  /** Show lock icon */
  showLockIcon: boolean
  /** Badge size */
  size: 'sm' | 'md' | 'lg'
  /** Badge position */
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  /** Tooltip enabled */
  tooltip: boolean
  /** Animate indicators */
  animate: boolean
}

/**
 * Helper Functions
 */

/**
 * Get color for encryption status
 */
export const getEncryptionStatusColor = (status: EncryptionStatus): string => {
  const colors: Record<EncryptionStatus, string> = {
    encrypted: 'text-green-600 dark:text-green-400',
    unencrypted: 'text-red-600 dark:text-red-400',
    encrypting: 'text-blue-600 dark:text-blue-400',
    decrypting: 'text-yellow-600 dark:text-yellow-400',
    failed: 'text-red-600 dark:text-red-400',
  }
  return colors[status] || 'text-gray-600 dark:text-gray-400'
}

/**
 * Get background color for encryption status
 */
export const getEncryptionStatusBg = (status: EncryptionStatus): string => {
  const colors: Record<EncryptionStatus, string> = {
    encrypted: 'bg-green-100 dark:bg-green-900/30',
    unencrypted: 'bg-red-100 dark:bg-red-900/30',
    encrypting: 'bg-blue-100 dark:bg-blue-900/30',
    decrypting: 'bg-yellow-100 dark:bg-yellow-900/30',
    failed: 'bg-red-100 dark:bg-red-900/30',
  }
  return colors[status] || 'bg-gray-100 dark:bg-gray-900/30'
}

/**
 * Get color for security level
 */
export const getSecurityLevelColor = (level: SecurityLevel): string => {
  const colors: Record<SecurityLevel, string> = {
    'top-secret': 'text-purple-600 dark:text-purple-400',
    secret: 'text-red-600 dark:text-red-400',
    confidential: 'text-orange-600 dark:text-orange-400',
    internal: 'text-blue-600 dark:text-blue-400',
    public: 'text-gray-600 dark:text-gray-400',
  }
  return colors[level] || 'text-gray-600 dark:text-gray-400'
}

/**
 * Get background color for security level
 */
export const getSecurityLevelBg = (level: SecurityLevel): string => {
  const colors: Record<SecurityLevel, string> = {
    'top-secret': 'bg-purple-100 dark:bg-purple-900/30',
    secret: 'bg-red-100 dark:bg-red-900/30',
    confidential: 'bg-orange-100 dark:bg-orange-900/30',
    internal: 'bg-blue-100 dark:bg-blue-900/30',
    public: 'bg-gray-100 dark:bg-gray-900/30',
  }
  return colors[level] || 'bg-gray-100 dark:bg-gray-900/30'
}

/**
 * Get color for key status
 */
export const getKeyStatusColor = (status: KeyStatus): string => {
  const colors: Record<KeyStatus, string> = {
    active: 'text-green-600 dark:text-green-400',
    expired: 'text-red-600 dark:text-red-400',
    revoked: 'text-red-600 dark:text-red-400',
    pending_rotation: 'text-yellow-600 dark:text-yellow-400',
    compromised: 'text-red-600 dark:text-red-400',
  }
  return colors[status] || 'text-gray-600 dark:text-gray-400'
}

/**
 * Get display label for encryption status
 */
export const ENCRYPTION_STATUS_LABELS: Record<EncryptionStatus, string> = {
  encrypted: 'Encrypted',
  unencrypted: 'Not Encrypted',
  encrypting: 'Encrypting...',
  decrypting: 'Decrypting...',
  failed: 'Encryption Failed',
}

/**
 * Get display label for security level
 */
export const SECURITY_LEVEL_LABELS: Record<SecurityLevel, string> = {
  'top-secret': 'Top Secret',
  secret: 'Secret',
  confidential: 'Confidential',
  internal: 'Internal Use Only',
  public: 'Public',
}

/**
 * Get display label for key status
 */
export const KEY_STATUS_LABELS: Record<KeyStatus, string> = {
  active: 'Active',
  expired: 'Expired',
  revoked: 'Revoked',
  pending_rotation: 'Pending Rotation',
  compromised: 'Compromised',
}

/**
 * Get display label for encryption strength
 */
export const ENCRYPTION_STRENGTH_LABELS: Record<EncryptionStrength, string> = {
  military: 'Military Grade',
  high: 'High Security',
  standard: 'Standard',
  basic: 'Basic',
}

/**
 * Get icon for encryption algorithm
 */
export const getAlgorithmIcon = (algorithm: EncryptionAlgorithm): string => {
  const icons: Record<EncryptionAlgorithm, string> = {
    'AES-256-GCM': '🔐',
    'AES-256-CBC': '🔒',
    'ChaCha20-Poly1305': '🛡️',
    'RSA-4096': '🔑',
  }
  return icons[algorithm] || '🔒'
}

/**
 * Get strength level from algorithm
 */
export const getAlgorithmStrength = (algorithm: EncryptionAlgorithm): EncryptionStrength => {
  const strength: Record<EncryptionAlgorithm, EncryptionStrength> = {
    'AES-256-GCM': 'military',
    'AES-256-CBC': 'high',
    'ChaCha20-Poly1305': 'military',
    'RSA-4096': 'high',
  }
  return strength[algorithm] || 'standard'
}

/**
 * Check if key needs rotation
 */
export const needsRotation = (key: EncryptionKey): boolean => {
  if (key.status !== 'active') return false
  if (!key.nextRotationDue) return false
  return new Date(key.nextRotationDue) <= new Date()
}

/**
 * Check if key is expired
 */
export const isKeyExpired = (key: EncryptionKey): boolean => {
  if (!key.expiresAt) return false
  return new Date(key.expiresAt) <= new Date()
}

/**
 * Get compliance badge color
 */
export const getComplianceBadgeColor = (standard: ComplianceStandard): string => {
  const colors: Record<ComplianceStandard, string> = {
    'FIPS-140-2': 'blue',
    'FIPS-140-3': 'blue',
    'PCI-DSS': 'green',
    HIPAA: 'purple',
    GDPR: 'indigo',
    SOX: 'orange',
    'ISO-27001': 'teal',
  }
  return colors[standard] || 'gray'
}

/**
 * Format key fingerprint for display
 */
export const formatFingerprint = (fingerprint: string): string => {
  // Format as: XXXX XXXX XXXX XXXX
  return fingerprint.match(/.{1,4}/g)?.join(' ') || fingerprint
}

/**
 * Get default encryption settings
 */
export const getDefaultEncryptionSettings = (): EncryptionSettings => ({
  id: '',
  encryptByDefault: true,
  preferredAlgorithm: 'AES-256-GCM',
  preferClientSide: true,
  showIndicators: true,
  warnUnencrypted: true,
  autoDecrypt: true,
  cacheDecrypted: false,
  cacheDuration: 300,
  requirePasswordForSensitive: true,
  notifyKeyRotation: true,
  auditAlerts: true,
  activePolicies: [],
})

/**
 * Get default secure upload config
 */
export const getDefaultSecureUploadConfig = (): SecureUploadConfig => ({
  encryptOnUpload: true,
  algorithm: 'AES-256-GCM',
  clientSideEncryption: true,
  chunkSize: 1024 * 1024 * 5, // 5MB
  verifyIntegrity: true,
  hashAlgorithm: 'SHA-256',
  secureTransfer: true,
  minTlsVersion: '1.3',
  autoClassify: true,
  defaultSecurityLevel: 'internal',
  virusScan: true,
  contentInspection: true,
})
