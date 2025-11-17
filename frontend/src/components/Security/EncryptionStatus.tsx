/**
 * EncryptionStatus Component
 * Displays encryption status and security information for documents
 */

import { FC } from 'react'
import {
  LockClosedIcon,
  LockOpenIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'
import type {
  DocumentEncryption,
  EncryptionStatus as EncryptionStatusType,
  SecurityLevel,
  ComplianceStandard,
} from '@/types/encryption'
import {
  getEncryptionStatusColor,
  getEncryptionStatusBg,
  getSecurityLevelColor,
  getSecurityLevelBg,
  ENCRYPTION_STATUS_LABELS,
  SECURITY_LEVEL_LABELS,
  ENCRYPTION_STRENGTH_LABELS,
  getComplianceBadgeColor,
} from '@/types/encryption'

export interface EncryptionStatusProps {
  /** Document encryption information */
  encryption: DocumentEncryption
  /** Show detailed information */
  detailed?: boolean
  /** Compact view */
  compact?: boolean
  /** Click handler */
  onClick?: () => void
  /** Show compliance badges */
  showCompliance?: boolean
  /** Show security level */
  showSecurityLevel?: boolean
  /** Show encryption strength */
  showStrength?: boolean
  /** Animated indicators */
  animate?: boolean
  className?: string
}

export const EncryptionStatus: FC<EncryptionStatusProps> = ({
  encryption,
  detailed = false,
  compact = false,
  onClick,
  showCompliance = true,
  showSecurityLevel = true,
  showStrength = true,
  animate = true,
  className,
}) => {
  const getStatusIcon = (status: EncryptionStatusType) => {
    const iconClass = cn('w-5 h-5', compact && 'w-4 h-4')

    switch (status) {
      case 'encrypted':
        return <LockClosedIcon className={iconClass} />
      case 'unencrypted':
        return <LockOpenIcon className={iconClass} />
      case 'encrypting':
      case 'decrypting':
        return <ShieldCheckIcon className={cn(iconClass, animate && 'animate-pulse')} />
      case 'failed':
        return <ExclamationTriangleIcon className={iconClass} />
      default:
        return <InformationCircleIcon className={iconClass} />
    }
  }

  const getComplianceBadge = (standard: ComplianceStandard) => {
    const color = getComplianceBadgeColor(standard)
    return (
      <span
        key={standard}
        className={cn(
          'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded',
          `bg-${color}-100 text-${color}-700 dark:bg-${color}-900/30 dark:text-${color}-400`
        )}
      >
        {standard}
      </span>
    )
  }

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 rounded text-sm font-medium',
          getEncryptionStatusBg(encryption.status),
          getEncryptionStatusColor(encryption.status),
          onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
          className
        )}
      >
        {getStatusIcon(encryption.status)}
        <span>{ENCRYPTION_STATUS_LABELS[encryption.status]}</span>
      </button>
    )
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4',
        onClick && 'cursor-pointer hover:shadow-md transition-shadow',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'p-2 rounded-lg',
              getEncryptionStatusBg(encryption.status),
              getEncryptionStatusColor(encryption.status)
            )}
          >
            {getStatusIcon(encryption.status)}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {ENCRYPTION_STATUS_LABELS[encryption.status]}
            </h3>
            {encryption.metadata && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {encryption.metadata.algorithm}
              </p>
            )}
          </div>
        </div>

        {showSecurityLevel && (
          <span
            className={cn(
              'px-3 py-1 text-xs font-semibold rounded-full',
              getSecurityLevelBg(encryption.securityLevel),
              getSecurityLevelColor(encryption.securityLevel)
            )}
          >
            {SECURITY_LEVEL_LABELS[encryption.securityLevel]}
          </span>
        )}
      </div>

      {/* Encryption Details */}
      {detailed && encryption.metadata && (
        <div className="space-y-2 mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Encrypted At:</span>
              <p className="text-gray-900 dark:text-gray-100 font-medium">
                {new Date(encryption.metadata.encryptedAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Encrypted By:</span>
              <p className="text-gray-900 dark:text-gray-100 font-medium">
                {encryption.metadata.encryptedBy}
              </p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Algorithm:</span>
              <p className="text-gray-900 dark:text-gray-100 font-medium">
                {encryption.metadata.algorithm}
              </p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Key ID:</span>
              <p className="text-gray-900 dark:text-gray-100 font-medium font-mono text-xs">
                {encryption.metadata.keyId.slice(0, 8)}...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Encryption Type Indicators */}
      <div className="flex flex-wrap gap-2 mb-3">
        {encryption.clientSideEncrypted && (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">
            <ShieldCheckIcon className="w-3 h-3" />
            Client-Side
          </span>
        )}
        {encryption.serverSideEncrypted && (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 rounded">
            <ShieldCheckIcon className="w-3 h-3" />
            Server-Side
          </span>
        )}
        {encryption.endToEndEncrypted && (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">
            <LockClosedIcon className="w-3 h-3" />
            End-to-End
          </span>
        )}
      </div>

      {/* Encryption Strength */}
      {showStrength && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500 dark:text-gray-400">Encryption Strength</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {ENCRYPTION_STRENGTH_LABELS[encryption.strength]}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={cn(
                'h-2 rounded-full transition-all',
                encryption.strength === 'military' && 'w-full bg-green-600',
                encryption.strength === 'high' && 'w-3/4 bg-blue-600',
                encryption.strength === 'standard' && 'w-1/2 bg-yellow-600',
                encryption.strength === 'basic' && 'w-1/4 bg-orange-600'
              )}
            ></div>
          </div>
        </div>
      )}

      {/* Compliance Badges */}
      {showCompliance && encryption.complianceStandards.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Compliance Standards:</p>
          <div className="flex flex-wrap gap-1.5">
            {encryption.complianceStandards.map((standard) => getComplianceBadge(standard))}
          </div>
        </div>
      )}

      {/* Access Status */}
      {!encryption.accessible && encryption.accessDeniedReason && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                Access Denied
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {encryption.accessDeniedReason}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
