import React, { useState } from 'react'
import {
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  DeviceTabletIcon,
  CheckCircleIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  MapPinIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline'
import type { TrustedDevice, TrustedDevicesProps } from '@/types/mfa'
import { isDeviceTrustExpiring, getDeviceTypeIcon } from '@/types/mfa'
import { format, formatDistanceToNow } from 'date-fns'

export const TrustedDevices: React.FC<TrustedDevicesProps> = ({
  devices,
  currentDeviceId,
  onRemoveDevice,
  onTrustCurrentDevice,
  loading = false,
}) => {
  const [removingDeviceId, setRemovingDeviceId] = useState<string | null>(null)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [deviceToRemove, setDeviceToRemove] = useState<TrustedDevice | null>(null)

  const currentDevice = devices.find(d => d.id === currentDeviceId)
  const isCurrentDeviceTrusted = !!currentDevice

  const handleRemoveClick = (device: TrustedDevice) => {
    setDeviceToRemove(device)
    setShowRemoveModal(true)
  }

  const handleConfirmRemove = async () => {
    if (!deviceToRemove) return

    setRemovingDeviceId(deviceToRemove.id)
    try {
      await onRemoveDevice(deviceToRemove.id)
      setShowRemoveModal(false)
      setDeviceToRemove(null)
    } catch (error) {
      console.error('Failed to remove device:', error)
    } finally {
      setRemovingDeviceId(null)
    }
  }

  const getDeviceIcon = (type: TrustedDevice['deviceType']) => {
    switch (type) {
      case 'mobile':
        return <DevicePhoneMobileIcon className="w-5 h-5" />
      case 'tablet':
        return <DeviceTabletIcon className="w-5 h-5" />
      case 'desktop':
      default:
        return <ComputerDesktopIcon className="w-5 h-5" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Trusted Devices
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage devices that don't require MFA for 30 days
          </p>
        </div>
        {!isCurrentDeviceTrusted && onTrustCurrentDevice && (
          <button
            onClick={onTrustCurrentDevice}
            disabled={loading}
            className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Trust This Device
          </button>
        )}
      </div>

      {/* Devices List */}
      {devices.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <ComputerDesktopIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 mb-2">No Trusted Devices</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Trust devices to skip MFA verification for 30 days
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {devices.map((device) => {
            const isCurrentDevice = device.id === currentDeviceId
            const isExpiringSoon = isDeviceTrustExpiring(device.expiresAt)
            const daysUntilExpiry = Math.ceil(
              (new Date(device.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            )

            return (
              <div
                key={device.id}
                className={`bg-white dark:bg-gray-800 rounded-lg border p-4 ${
                  isCurrentDevice
                    ? 'border-blue-500 dark:border-blue-400'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Device Icon */}
                  <div
                    className={`p-3 rounded-lg ${
                      isCurrentDevice
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {getDeviceIcon(device.deviceType)}
                  </div>

                  {/* Device Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                            {device.deviceName}
                          </h3>
                          {isCurrentDevice && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                              <CheckCircleIcon className="w-3 h-3 mr-1" />
                              Current Device
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {device.browser} on {device.os}
                        </p>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveClick(device)}
                        disabled={loading || removingDeviceId === device.id}
                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Remove device"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Device Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                          IP Address
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                          {device.ipAddress}
                        </p>
                      </div>
                      {device.location && (
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                            <MapPinIcon className="w-3 h-3 inline mr-1" />
                            Location
                          </p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {device.location}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                          <ClockIcon className="w-3 h-3 inline mr-1" />
                          Last Used
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatDistanceToNow(new Date(device.lastUsedAt), { addSuffix: true })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                          Expires
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {format(new Date(device.expiresAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>

                    {/* Expiry Warning */}
                    {isExpiringSoon && (
                      <div className="flex items-start gap-2 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded">
                        <ExclamationTriangleIcon className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-orange-700 dark:text-orange-300">
                          This device will expire in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}.
                          You'll need to verify with MFA after that.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Info Card */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex gap-3">
          <GlobeAltIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
              About Trusted Devices
            </p>
            <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
              <li>• Trusted devices skip MFA verification for 30 days</li>
              <li>• Remove devices you no longer use or recognize</li>
              <li>• We'll notify you when new devices are trusted</li>
              <li>• Devices expire automatically after 30 days</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Remove Device Modal */}
      {showRemoveModal && deviceToRemove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Remove Trusted Device?
            </h3>

            <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <div className="flex gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  This device will require MFA verification on next login.
                </p>
              </div>
            </div>

            <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                {deviceToRemove.deviceName}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {deviceToRemove.browser} on {deviceToRemove.os}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                IP: {deviceToRemove.ipAddress}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRemoveModal(false)
                  setDeviceToRemove(null)
                }}
                disabled={removingDeviceId === deviceToRemove.id}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemove}
                disabled={removingDeviceId === deviceToRemove.id}
                className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {removingDeviceId === deviceToRemove.id ? 'Removing...' : 'Remove Device'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
