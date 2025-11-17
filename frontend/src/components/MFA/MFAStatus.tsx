import React from 'react'
import { ShieldCheckIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline'
import type { MFAStatusProps } from '@/types/mfa'
import { getMFAStatusColor, getMFAStatusLabel } from '@/types/mfa'
import { format } from 'date-fns'

export const MFAStatus: React.FC<MFAStatusProps> = ({
  config,
  compact = false,
  showDetails = true,
}) => {
  const statusColors = getMFAStatusColor(config.enabled ? 'enabled' : 'disabled')

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2">
        {config.enabled ? (
          <ShieldCheckIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
        ) : (
          <ShieldExclamationIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
        )}
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text}`}
        >
          {getMFAStatusLabel(config.enabled ? 'enabled' : 'disabled')}
        </span>
      </div>
    )
  }

  return (
    <div className={`p-4 rounded-lg border ${statusColors.border} ${statusColors.bg}`}>
      <div className="flex items-start gap-3">
        {config.enabled ? (
          <ShieldCheckIcon className={`w-6 h-6 ${statusColors.text}`} />
        ) : (
          <ShieldExclamationIcon className={`w-6 h-6 ${statusColors.text}`} />
        )}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h4 className={`text-sm font-semibold ${statusColors.text}`}>
              Two-Factor Authentication
            </h4>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text} border ${statusColors.border}`}
            >
              {getMFAStatusLabel(config.enabled ? 'enabled' : 'disabled')}
            </span>
          </div>
          <p className={`text-sm ${statusColors.text} opacity-90`}>
            {config.enabled
              ? 'Your account is protected with two-factor authentication'
              : 'Enable two-factor authentication for enhanced security'}
          </p>

          {showDetails && config.enabled && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {config.lastVerifiedAt && (
                <div>
                  <p className={`text-xs ${statusColors.text} opacity-75`}>Last Verified</p>
                  <p className={`text-sm font-medium ${statusColors.text}`}>
                    {format(new Date(config.lastVerifiedAt), 'MMM d, yyyy')}
                  </p>
                </div>
              )}
              {config.backupCodesGenerated && (
                <div>
                  <p className={`text-xs ${statusColors.text} opacity-75`}>Backup Codes</p>
                  <p className={`text-sm font-medium ${statusColors.text}`}>
                    {config.backupCodesRemaining} remaining
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
