/**
 * KeyManagement Component
 * Interface for managing encryption keys - viewing, rotating, and revoking keys
 */

import { FC, useState } from 'react'
import {
  KeyIcon,
  ArrowPathIcon,
  TrashIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'
import type {
  EncryptionKey,
  KeyStatus,
  KeyRotationEvent,
} from '@/types/encryption'
import {
  getKeyStatusColor,
  KEY_STATUS_LABELS,
  needsRotation,
  isKeyExpired,
  formatFingerprint,
} from '@/types/encryption'
import { formatDistanceToNow } from 'date-fns'

export interface KeyManagementProps {
  /** List of encryption keys */
  keys: EncryptionKey[]
  /** Currently selected key */
  selectedKeyId?: string
  /** On key selection */
  onKeySelect?: (keyId: string) => void
  /** On rotate key */
  onRotateKey?: (keyId: string) => void
  /** On revoke key */
  onRevokeKey?: (keyId: string) => void
  /** On create new key */
  onCreateKey?: () => void
  /** Recent rotation events */
  rotationEvents?: KeyRotationEvent[]
  /** Show rotation history */
  showRotationHistory?: boolean
  /** Loading state */
  isLoading?: boolean
  className?: string
}

export const KeyManagement: FC<KeyManagementProps> = ({
  keys,
  selectedKeyId,
  onKeySelect,
  onRotateKey,
  onRevokeKey,
  onCreateKey,
  rotationEvents = [],
  showRotationHistory = true,
  isLoading = false,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<'keys' | 'history'>('keys')
  const [selectedKey, setSelectedKey] = useState<string | undefined>(selectedKeyId)

  const handleKeySelect = (keyId: string) => {
    setSelectedKey(keyId)
    onKeySelect?.(keyId)
  }

  const getStatusIcon = (status: KeyStatus) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
      case 'expired':
      case 'revoked':
      case 'compromised':
        return <XCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
      case 'pending_rotation':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
      default:
        return <InformationCircleIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
    }
  }

  const getKeyAlertLevel = (key: EncryptionKey): 'none' | 'info' | 'warning' | 'critical' => {
    if (key.status === 'compromised' || key.status === 'revoked') return 'critical'
    if (isKeyExpired(key)) return 'critical'
    if (key.status === 'expired') return 'critical'
    if (needsRotation(key)) return 'warning'
    if (key.status === 'pending_rotation') return 'info'
    return 'none'
  }

  const selectedKeyData = keys.find((k) => k.id === selectedKey)

  return (
    <div className={cn('bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <KeyIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Encryption Key Management
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {keys.length} total keys • {keys.filter((k) => k.status === 'active').length} active
              </p>
            </div>
          </div>

          {onCreateKey && (
            <button
              onClick={onCreateKey}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
            >
              Create New Key
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 mt-4">
          <button
            onClick={() => setActiveTab('keys')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              activeTab === 'keys'
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
          >
            Keys ({keys.length})
          </button>
          {showRotationHistory && (
            <button
              onClick={() => setActiveTab('history')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                activeTab === 'history'
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              Rotation History ({rotationEvents.length})
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : activeTab === 'keys' ? (
          <div className="space-y-3">
            {keys.length === 0 ? (
              <div className="text-center py-12">
                <KeyIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No encryption keys found</p>
              </div>
            ) : (
              keys.map((key) => {
                const alertLevel = getKeyAlertLevel(key)
                const isSelected = key.id === selectedKey

                return (
                  <div
                    key={key.id}
                    onClick={() => handleKeySelect(key.id)}
                    className={cn(
                      'p-4 rounded-lg border cursor-pointer transition-all',
                      isSelected
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
                      alertLevel === 'critical' && 'border-red-500 bg-red-50 dark:bg-red-900/20',
                      alertLevel === 'warning' && 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                    )}
                  >
                    {/* Key Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        {getStatusIcon(key.status)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {key.name}
                            </h3>
                            <span
                              className={cn(
                                'px-2 py-0.5 text-xs font-medium rounded',
                                getKeyStatusColor(key.status),
                                key.status === 'active' && 'bg-green-100 dark:bg-green-900/30',
                                key.status !== 'active' && 'bg-red-100 dark:bg-red-900/30'
                              )}
                            >
                              {KEY_STATUS_LABELS[key.status]}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {key.type.toUpperCase()} • {key.algorithm} • {key.keySize}-bit
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {onRotateKey && key.status === 'active' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onRotateKey(key.id)
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                            title="Rotate Key"
                          >
                            <ArrowPathIcon className="w-4 h-4" />
                          </button>
                        )}
                        {onRevokeKey && key.status === 'active' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onRevokeKey(key.id)
                            }}
                            className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Revoke Key"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Key Details */}
                    <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Created:</span>
                        <p className="text-gray-900 dark:text-gray-100 font-medium">
                          {formatDistanceToNow(new Date(key.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Documents:</span>
                        <p className="text-gray-900 dark:text-gray-100 font-medium">
                          {key.documentCount.toLocaleString()}
                        </p>
                      </div>
                      {key.expiresAt && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Expires:</span>
                          <p className={cn(
                            'font-medium',
                            isKeyExpired(key) ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'
                          )}>
                            {formatDistanceToNow(new Date(key.expiresAt), { addSuffix: true })}
                          </p>
                        </div>
                      )}
                      {key.nextRotationDue && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Next Rotation:</span>
                          <p className={cn(
                            'font-medium',
                            needsRotation(key) ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-gray-100'
                          )}>
                            {formatDistanceToNow(new Date(key.nextRotationDue), { addSuffix: true })}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Fingerprint */}
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Fingerprint:</span>
                      <p className="text-xs font-mono text-gray-900 dark:text-gray-100 mt-1">
                        {formatFingerprint(key.fingerprint)}
                      </p>
                    </div>

                    {/* Alerts */}
                    {needsRotation(key) && (
                      <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded flex items-start gap-2">
                        <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-yellow-800 dark:text-yellow-300">
                          Key rotation is due. Please rotate this key soon.
                        </p>
                      </div>
                    )}
                    {isKeyExpired(key) && (
                      <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded flex items-start gap-2">
                        <XCircleIcon className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-800 dark:text-red-300">
                          This key has expired and should be replaced immediately.
                        </p>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {rotationEvents.length === 0 ? (
              <div className="text-center py-12">
                <ArrowPathIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No rotation history</p>
              </div>
            ) : (
              rotationEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3">
                      <ArrowPathIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Key Rotation
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(event.rotatedAt), { addSuffix: true })} by {event.rotatedBy}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'px-2 py-0.5 text-xs font-medium rounded',
                        event.status === 'completed' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                        event.status === 'in_progress' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                        event.status === 'failed' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                        event.status === 'pending' && 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                      )}
                    >
                      {event.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Reason:</span>
                      <p className="text-gray-900 dark:text-gray-100 font-medium capitalize">
                        {event.reason}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Documents Re-encrypted:</span>
                      <p className="text-gray-900 dark:text-gray-100 font-medium">
                        {event.documentsReencrypted.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {event.status === 'in_progress' && event.progress !== undefined && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500 dark:text-gray-400">Progress</span>
                        <span className="text-gray-900 dark:text-gray-100 font-medium">{event.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${event.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {event.status === 'failed' && event.errorMessage && (
                    <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                      <p className="text-xs text-red-800 dark:text-red-300">
                        {event.errorMessage}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
