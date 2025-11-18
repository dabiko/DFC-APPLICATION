/**
 * EncryptionSettings Component
 * User/system encryption preferences and configuration panel
 */

import { FC, useState } from 'react'
import {
  Cog6ToothIcon,
  LockClosedIcon,
  BellIcon,
  ShieldCheckIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'
import type {
  EncryptionSettings as EncryptionSettingsType,
  EncryptionAlgorithm,
  EncryptionPolicy,
} from '@/types/encryption'
import { getDefaultEncryptionSettings } from '@/types/encryption'

export interface EncryptionSettingsProps {
  /** Current settings */
  settings: EncryptionSettingsType
  /** On settings change */
  onSettingsChange?: (settings: EncryptionSettingsType) => void
  /** Available policies */
  availablePolicies?: EncryptionPolicy[]
  /** On save settings */
  onSave?: () => void
  /** On reset to defaults */
  onReset?: () => void
  /** Save in progress */
  saving?: boolean
  /** Show save button */
  showActions?: boolean
  className?: string
}

export const EncryptionSettings: FC<EncryptionSettingsProps> = ({
  settings,
  onSettingsChange,
  availablePolicies = [],
  onSave,
  onReset,
  saving = false,
  showActions = true,
  className,
}) => {
  const [localSettings, setLocalSettings] = useState<EncryptionSettingsType>(settings)
  const [hasChanges, setHasChanges] = useState(false)

  const updateSetting = <K extends keyof EncryptionSettingsType>(
    key: K,
    value: EncryptionSettingsType[K]
  ) => {
    const newSettings = { ...localSettings, [key]: value }
    setLocalSettings(newSettings)
    setHasChanges(true)
    onSettingsChange?.(newSettings)
  }

  const handleSave = () => {
    setHasChanges(false)
    onSave?.()
  }

  const handleReset = () => {
    const defaultSettings = getDefaultEncryptionSettings()
    setLocalSettings(defaultSettings)
    setHasChanges(true)
    onSettingsChange?.(defaultSettings)
    onReset?.()
  }

  const algorithmOptions: EncryptionAlgorithm[] = [
    'AES-256-GCM',
    'AES-256-CBC',
    'ChaCha20-Poly1305',
    'RSA-4096',
  ]

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <Cog6ToothIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Encryption Settings
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Configure your encryption preferences
              </p>
            </div>
          </div>

          {hasChanges && (
            <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded">
              Unsaved Changes
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* General Settings */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <LockClosedIcon className="w-4 h-4" />
            General Encryption
          </h3>
          <div className="space-y-3">
            {/* Encrypt by Default */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Encrypt by Default
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Automatically encrypt all new uploads
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.encryptByDefault}
                  onChange={(e) => updateSetting('encryptByDefault', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>

            {/* Preferred Algorithm */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Preferred Algorithm
              </label>
              <select
                value={localSettings.preferredAlgorithm}
                onChange={(e) =>
                  updateSetting('preferredAlgorithm', e.target.value as EncryptionAlgorithm)
                }
                className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {algorithmOptions.map((algo) => (
                  <option key={algo} value={algo}>
                    {algo}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Default encryption algorithm for new files
              </p>
            </div>

            {/* Prefer Client-Side */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Prefer Client-Side Encryption
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Encrypt files in browser before upload
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.preferClientSide}
                  onChange={(e) => updateSetting('preferClientSide', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Display Settings */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <ShieldCheckIcon className="w-4 h-4" />
            Display & Indicators
          </h3>
          <div className="space-y-3">
            {/* Show Indicators */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Show Encryption Indicators
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Display lock icons on encrypted files
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.showIndicators}
                  onChange={(e) => updateSetting('showIndicators', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>

            {/* Warn Unencrypted */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Warn on Unencrypted Uploads
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Show warning when uploading without encryption
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.warnUnencrypted}
                  onChange={(e) => updateSetting('warnUnencrypted', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Access Settings */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <ClockIcon className="w-4 h-4" />
            Access & Decryption
          </h3>
          <div className="space-y-3">
            {/* Auto Decrypt */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Auto-Decrypt on View
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Automatically decrypt when viewing files
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.autoDecrypt}
                  onChange={(e) => updateSetting('autoDecrypt', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>

            {/* Cache Decrypted */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Cache Decrypted Files
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Temporarily cache for faster access
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.cacheDecrypted}
                  onChange={(e) => updateSetting('cacheDecrypted', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>

            {localSettings.cacheDecrypted && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Cache Duration (seconds)
                </label>
                <input
                  type="number"
                  value={localSettings.cacheDuration}
                  onChange={(e) => updateSetting('cacheDuration', parseInt(e.target.value))}
                  min="60"
                  max="3600"
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Files will be automatically removed from cache after this duration
                </p>
              </div>
            )}

            {/* Require Password for Sensitive */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Password for Sensitive Files
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Require password for top-secret files
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.requirePasswordForSensitive}
                  onChange={(e) => updateSetting('requirePasswordForSensitive', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <BellIcon className="w-4 h-4" />
            Notifications
          </h3>
          <div className="space-y-3">
            {/* Key Rotation Notifications */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Key Rotation Alerts
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Notify when keys need rotation
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.notifyKeyRotation}
                  onChange={(e) => updateSetting('notifyKeyRotation', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>

            {/* Audit Alerts */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Security Audit Alerts
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Notify on suspicious encryption activity
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.auditAlerts}
                  onChange={(e) => updateSetting('auditAlerts', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Active Policies */}
        {availablePolicies.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Active Policies ({localSettings.activePolicies.length})
            </h3>
            <div className="space-y-2">
              {availablePolicies.map((policy) => (
                <div
                  key={policy.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {policy.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {policy.description}
                    </p>
                  </div>
                  {policy.enabled && (
                    <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              hasChanges && !saving
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
            )}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  )
}
