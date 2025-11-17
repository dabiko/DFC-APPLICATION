import React, { useState } from 'react'
import {
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import type { MFABackupCodesProps } from '@/types/mfa'
import {
  formatBackupCode,
  downloadBackupCodes,
  printBackupCodes,
  getBackupCodesUsagePercentage,
  needsBackupCodeRegeneration,
} from '@/types/mfa'

export const MFABackupCodes: React.FC<MFABackupCodesProps> = ({
  codes,
  onRegenerate,
  onDownload,
  onPrint,
  showCodes = false,
  loading = false,
}) => {
  const [visible, setVisible] = useState(showCodes)
  const [regenerating, setRegenerating] = useState(false)

  const usagePercentage = getBackupCodesUsagePercentage(codes)
  const needsRegeneration = needsBackupCodeRegeneration(codes)

  const handleDownload = () => {
    const codeStrings = codes.codes.map(c => c.code)
    downloadBackupCodes(codeStrings)
    onDownload()
  }

  const handlePrint = () => {
    const codeStrings = codes.codes.map(c => c.code)
    printBackupCodes(codeStrings)
    onPrint()
  }

  const handleRegenerate = async () => {
    if (confirm('Regenerate backup codes? Your current codes will no longer work.')) {
      setRegenerating(true)
      try {
        await onRegenerate()
      } finally {
        setRegenerating(false)
      }
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-3">
          <KeyIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Backup Codes
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Use these codes if you can't access your authenticator app
            </p>
          </div>
        </div>
        <button
          onClick={() => setVisible(!visible)}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title={visible ? 'Hide codes' : 'Show codes'}
        >
          {visible ? (
            <EyeSlashIcon className="w-5 h-5" />
          ) : (
            <EyeIcon className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Usage Stats */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {codes.remainingCodes} of {codes.totalCodes} codes remaining
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {usagePercentage}% used
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              usagePercentage > 80
                ? 'bg-red-600'
                : usagePercentage > 50
                ? 'bg-orange-600'
                : 'bg-green-600'
            }`}
            style={{ width: `${usagePercentage}%` }}
          />
        </div>
      </div>

      {/* Low Codes Warning */}
      {needsRegeneration && (
        <div className="mb-6 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
          <div className="flex gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-orange-800 dark:text-orange-300 mb-1">
                Running Low on Backup Codes
              </p>
              <p className="text-sm text-orange-700 dark:text-orange-400">
                Consider regenerating your backup codes to ensure you always have access.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Codes Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {codes.codes.map((code, index) => (
          <div
            key={code.id}
            className={`px-4 py-3 rounded-lg border font-mono text-center ${
              code.used
                ? 'bg-gray-100 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600 opacity-50'
                : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
            }`}
          >
            <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
              {index + 1}.
            </span>
            <span className={`text-sm font-semibold ${
              code.used
                ? 'text-gray-500 dark:text-gray-500 line-through'
                : visible
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-400 dark:text-gray-500'
            }`}>
              {visible ? formatBackupCode(code.code) : '••••-••••'}
            </span>
            {code.used && (
              <span className="block text-xs text-gray-500 dark:text-gray-500 mt-1">
                Used
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleDownload}
          className="flex-1 min-w-[140px] px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
        >
          <ArrowDownTrayIcon className="w-4 h-4 inline mr-1" />
          Download
        </button>
        <button
          onClick={handlePrint}
          className="flex-1 min-w-[140px] px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
        >
          <PrinterIcon className="w-4 h-4 inline mr-1" />
          Print
        </button>
        <button
          onClick={handleRegenerate}
          disabled={loading || regenerating}
          className="flex-1 min-w-[140px] px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowPathIcon className={`w-4 h-4 inline mr-1 ${regenerating ? 'animate-spin' : ''}`} />
          {regenerating ? 'Regenerating...' : 'Regenerate'}
        </button>
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>Important:</strong> Each backup code can only be used once. Store them securely.
          If you use all your codes, regenerate a new set.
        </p>
      </div>
    </div>
  )
}
