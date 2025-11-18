/**
 * SecurityBadge Component
 * Small badge indicator for encryption and security status on documents/folders
 */

import { FC } from 'react'
import {
  LockClosedIcon,
  LockOpenIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/solid'
import { cn } from '@utils/cn'
import type {
  EncryptionStatus,
  SecurityLevel,
  EncryptionStrength,
  ComplianceStandard,
} from '@/types/encryption'
import {
  getEncryptionStatusColor,
  getSecurityLevelColor,
  SECURITY_LEVEL_LABELS,
  ENCRYPTION_STATUS_LABELS,
  getComplianceBadgeColor,
} from '@/types/encryption'

export interface SecurityBadgeProps {
  /** Encryption status */
  status?: EncryptionStatus
  /** Security level */
  securityLevel?: SecurityLevel
  /** Encryption strength */
  strength?: EncryptionStrength
  /** Compliance standard */
  compliance?: ComplianceStandard
  /** Badge size */
  size?: 'sm' | 'md' | 'lg'
  /** Badge position (for overlay) */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  /** Show as overlay (absolute positioning) */
  overlay?: boolean
  /** Show tooltip */
  tooltip?: boolean
  /** Custom tooltip text */
  tooltipText?: string
  /** Badge variant */
  variant?: 'icon-only' | 'icon-text' | 'text-only'
  /** Show pulse animation for encrypting/decrypting */
  animate?: boolean
  /** Click handler */
  onClick?: () => void
  className?: string
}

export const SecurityBadge: FC<SecurityBadgeProps> = ({
  status,
  securityLevel,
  strength,
  compliance,
  size = 'md',
  position = 'top-right',
  overlay = false,
  tooltip = true,
  tooltipText,
  variant = 'icon-only',
  animate = true,
  onClick,
  className,
}) => {
  // Size classes
  const sizeClasses = {
    sm: {
      badge: 'px-1.5 py-0.5 text-xs',
      icon: 'w-3 h-3',
    },
    md: {
      badge: 'px-2 py-1 text-sm',
      icon: 'w-4 h-4',
    },
    lg: {
      badge: 'px-3 py-1.5 text-base',
      icon: 'w-5 h-5',
    },
  }

  // Position classes for overlay
  const positionClasses = {
    'top-left': 'top-2 left-2',
    'top-right': 'top-2 right-2',
    'bottom-left': 'bottom-2 left-2',
    'bottom-right': 'bottom-2 right-2',
  }

  // Get icon based on status or security level
  const getIcon = () => {
    const iconClass = cn(
      sizeClasses[size].icon,
      status === 'encrypting' && animate && 'animate-spin',
      status === 'decrypting' && animate && 'animate-pulse'
    )

    if (status) {
      switch (status) {
        case 'encrypted':
          return <LockClosedIcon className={iconClass} />
        case 'unencrypted':
          return <LockOpenIcon className={iconClass} />
        case 'encrypting':
        case 'decrypting':
          return <ShieldCheckIcon className={iconClass} />
        case 'failed':
          return <ShieldExclamationIcon className={iconClass} />
      }
    }

    if (securityLevel) {
      switch (securityLevel) {
        case 'top-secret':
        case 'secret':
          return <ShieldExclamationIcon className={iconClass} />
        case 'confidential':
        case 'internal':
          return <LockClosedIcon className={iconClass} />
        case 'public':
          return <LockOpenIcon className={iconClass} />
      }
    }

    return <LockClosedIcon className={iconClass} />
  }

  // Get badge color
  const getColor = () => {
    if (status) {
      return getEncryptionStatusColor(status)
    }
    if (securityLevel) {
      return getSecurityLevelColor(securityLevel)
    }
    if (compliance) {
      const color = getComplianceBadgeColor(compliance)
      return `text-${color}-600 dark:text-${color}-400`
    }
    return 'text-gray-600 dark:text-gray-400'
  }

  // Get background color
  const getBgColor = () => {
    if (status) {
      switch (status) {
        case 'encrypted':
          return 'bg-green-100 dark:bg-green-900/30'
        case 'unencrypted':
          return 'bg-red-100 dark:bg-red-900/30'
        case 'encrypting':
        case 'decrypting':
          return 'bg-blue-100 dark:bg-blue-900/30'
        case 'failed':
          return 'bg-red-100 dark:bg-red-900/30'
      }
    }
    if (securityLevel) {
      switch (securityLevel) {
        case 'top-secret':
          return 'bg-purple-100 dark:bg-purple-900/30'
        case 'secret':
          return 'bg-red-100 dark:bg-red-900/30'
        case 'confidential':
          return 'bg-orange-100 dark:bg-orange-900/30'
        case 'internal':
          return 'bg-blue-100 dark:bg-blue-900/30'
        case 'public':
          return 'bg-gray-100 dark:bg-gray-900/30'
      }
    }
    if (compliance) {
      const color = getComplianceBadgeColor(compliance)
      return `bg-${color}-100 dark:bg-${color}-900/30`
    }
    return 'bg-gray-100 dark:bg-gray-900/30'
  }

  // Get text for badge
  const getText = () => {
    if (status) {
      return ENCRYPTION_STATUS_LABELS[status]
    }
    if (securityLevel) {
      return SECURITY_LEVEL_LABELS[securityLevel]
    }
    if (compliance) {
      return compliance
    }
    return 'Secure'
  }

  // Get tooltip text
  const getTooltipText = () => {
    if (tooltipText) return tooltipText

    let text = ''
    if (status) {
      text += `Encryption: ${ENCRYPTION_STATUS_LABELS[status]}`
    }
    if (securityLevel) {
      text += text
        ? ` | Security: ${SECURITY_LEVEL_LABELS[securityLevel]}`
        : `Security: ${SECURITY_LEVEL_LABELS[securityLevel]}`
    }
    if (strength) {
      text += text ? ` | Strength: ${strength}` : `Strength: ${strength}`
    }
    if (compliance) {
      text += text ? ` | Compliance: ${compliance}` : `Compliance: ${compliance}`
    }
    return text || 'Security Information'
  }

  return (
    <div
      onClick={onClick}
      title={tooltip ? getTooltipText() : undefined}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        sizeClasses[size].badge,
        getBgColor(),
        getColor(),
        overlay && 'absolute',
        overlay && positionClasses[position],
        overlay && 'shadow-sm',
        onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
    >
      {variant !== 'text-only' && getIcon()}
      {variant !== 'icon-only' && <span>{getText()}</span>}
    </div>
  )
}
