/**
 * SecurityTab Component
 *
 * Comprehensive security settings including:
 * - Password management
 * - Two-Factor Authentication (MFA)
 * - Session management
 * - Security settings (session timeout, login notifications)
 */

import { useState, useEffect } from 'react'
import {
  Shield,
  Key,
  Smartphone,
  Monitor,
  MapPin,
  Clock,
  AlertTriangle,
  Check,
  X,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  RefreshCw,
} from 'lucide-react'
import { MFASettings, MFASetup, MFABackupCodes } from '@/components/MFA'
import type { MFAConfig, MFADisableRequest } from '@/types/mfa'
import type { SecuritySettings, Session } from '@/services/settingsService'
import { mfaService, type TrustedDevice } from '@/services/mfaService'
import { cn } from '@/utils/cn'
import { toast } from '@/utils/toast'

interface SecurityTabProps {
  securitySettings: SecuritySettings | null
  isLoading: boolean
  onUpdateSecuritySettings: (data: Partial<SecuritySettings>) => Promise<void>
  onChangePassword: (data: {
    old_password: string
    new_password: string
    new_password_confirm: string
  }) => Promise<void>
  onMFAEnabled?: () => void // Called after MFA is enabled to trigger re-authentication
}

// Session timeout options
const SESSION_TIMEOUT_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 240, label: '4 hours' },
  { value: 480, label: '8 hours' },
]

export function SecurityTab({
  securitySettings,
  isLoading,
  onUpdateSecuritySettings,
  onChangePassword,
  onMFAEnabled,
}: SecurityTabProps) {
  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    new_password_confirm: '',
  })
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  // MFA state
  const [showMFASetup, setShowMFASetup] = useState(false)
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [regeneratedCodes, setRegeneratedCodes] = useState<string[]>([])
  const [showRegenerateModal, setShowRegenerateModal] = useState(false)
  const [regenerateToken, setRegenerateToken] = useState('')
  const [regenerateError, setRegenerateError] = useState<string | null>(null)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [mfaConfig, setMfaConfig] = useState<MFAConfig>({
    enabled: false,
    method: 'totp',
    setupCompleted: false,
    backupCodesGenerated: false,
    backupCodesRemaining: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  const [loadingMFA, setLoadingMFA] = useState(true)

  // Sessions state
  const [sessions, setSessions] = useState<Session[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)

  // Trusted devices state
  const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([])
  const [loadingTrustedDevices, setLoadingTrustedDevices] = useState(false)
  const [currentDeviceFingerprint, setCurrentDeviceFingerprint] = useState<string>('')
  const [showRemoveDeviceModal, setShowRemoveDeviceModal] = useState(false)
  const [deviceToRemove, setDeviceToRemove] = useState<TrustedDevice | null>(null)
  const [showRemoveAllDevicesModal, setShowRemoveAllDevicesModal] = useState(false)
  const [removingDevice, setRemovingDevice] = useState(false)

  // Load MFA status from backend
  useEffect(() => {
    const loadMFAStatus = async () => {
      setLoadingMFA(true)
      try {
        const response = await mfaService.getStatus()
        console.log('[SecurityTab] MFA status response:', JSON.stringify(response, null, 2))

        if (response.success && response.data) {
          const { data } = response
          console.log('[SecurityTab] MFA data:', JSON.stringify(data, null, 2))

          // Backend MFAStatusSerializer returns: is_enabled, is_configured, is_enforced, totp_enabled
          // Use the correctly typed fields from the updated interface
          const isEnabled = data.is_enabled
          const isConfigured = data.is_configured
          const backupCodesRemaining = data.backup_codes_remaining ?? 0
          const lastVerifiedAt = data.last_verified_at || undefined
          const enabledAt = data.enabled_at || new Date().toISOString()

          console.log('[SecurityTab] Parsed MFA status:', {
            isEnabled,
            isConfigured,
            backupCodesRemaining,
            lastVerifiedAt,
            enabledAt,
          })

          const newConfig = {
            enabled: Boolean(isEnabled),
            method: 'totp' as const,
            setupCompleted: Boolean(isConfigured),
            backupCodesGenerated: backupCodesRemaining > 0,
            backupCodesRemaining: backupCodesRemaining,
            lastVerifiedAt: lastVerifiedAt,
            createdAt: enabledAt,
            updatedAt: new Date().toISOString(),
          }

          console.log('[SecurityTab] Setting mfaConfig to:', JSON.stringify(newConfig, null, 2))
          setMfaConfig(newConfig)
        } else {
          console.warn(
            '[SecurityTab] MFA status response was not successful or had no data:',
            response
          )
        }
      } catch (error) {
        console.error('[SecurityTab] Error loading MFA status:', error)
      } finally {
        setLoadingMFA(false)
      }
    }
    loadMFAStatus()
  }, [])

  // Load sessions
  useEffect(() => {
    loadSessions()
  }, [])

  // Load trusted devices and get current device fingerprint
  useEffect(() => {
    // Generate current device fingerprint
    const fingerprint = mfaService.generateDeviceFingerprint()
    setCurrentDeviceFingerprint(fingerprint)
    console.log('[SecurityTab] useEffect triggered, mfaConfig.enabled:', mfaConfig.enabled)

    // Load trusted devices if MFA is enabled
    if (mfaConfig.enabled) {
      console.log('[SecurityTab] MFA is enabled, loading trusted devices...')
      loadTrustedDevices()
    }
  }, [mfaConfig.enabled])

  const loadSessions = async () => {
    setLoadingSessions(true)
    try {
      // Mock session data for now - will integrate with real API
      setSessions([
        {
          id: 'current',
          device: 'Current Session',
          browser: 'Chrome on Windows',
          ip_address: '192.168.1.1',
          last_activity: new Date().toISOString(),
          is_current: true,
        },
      ])
    } catch (error) {
      console.error('Error loading sessions:', error)
    } finally {
      setLoadingSessions(false)
    }
  }

  const loadTrustedDevices = async () => {
    setLoadingTrustedDevices(true)
    try {
      console.log('[SecurityTab] Loading trusted devices...')
      const response = await mfaService.getTrustedDevices()
      console.log('[SecurityTab] Trusted devices response:', response)
      if (response.success && response.data?.devices) {
        console.log('[SecurityTab] Found', response.data.devices.length, 'trusted devices')
        setTrustedDevices(response.data.devices)
      } else {
        console.log('[SecurityTab] No devices in response or response unsuccessful')
      }
    } catch (error) {
      console.error('[SecurityTab] Error loading trusted devices:', error)
    } finally {
      setLoadingTrustedDevices(false)
    }
  }

  const handleRemoveDeviceClick = (device: TrustedDevice) => {
    setDeviceToRemove(device)
    setShowRemoveDeviceModal(true)
  }

  const handleConfirmRemoveDevice = async () => {
    if (!deviceToRemove) return

    setRemovingDevice(true)
    try {
      const response = await mfaService.removeTrustedDevice(deviceToRemove.id)
      if (response.success) {
        toast.success('Device removed from trusted devices')
        setShowRemoveDeviceModal(false)
        setDeviceToRemove(null)
        // Refresh the list
        await loadTrustedDevices()
      } else {
        toast.error(response.message || 'Failed to remove device')
      }
    } catch (error) {
      console.error('Error revoking trusted device:', error)
      toast.error('Failed to remove device')
    } finally {
      setRemovingDevice(false)
    }
  }

  const handleRemoveAllDevicesClick = () => {
    setShowRemoveAllDevicesModal(true)
  }

  const handleConfirmRemoveAllDevices = async () => {
    setRemovingDevice(true)
    try {
      const response = await mfaService.revokeAllTrustedDevices()
      if (response.success) {
        toast.success(response.message || 'All other trusted devices removed')
        setShowRemoveAllDevicesModal(false)
        // Refresh the list (current device should still be there)
        await loadTrustedDevices()
      } else {
        toast.error(response.message || 'Failed to remove devices')
      }
    } catch (error) {
      console.error('Error revoking all trusted devices:', error)
      toast.error('Failed to remove devices')
    } finally {
      setRemovingDevice(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)

    if (passwordData.new_password !== passwordData.new_password_confirm) {
      setPasswordError('New passwords do not match')
      return
    }

    if (passwordData.new_password.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }

    setIsChangingPassword(true)
    try {
      await onChangePassword(passwordData)
      setPasswordSuccess(true)
      setPasswordData({ old_password: '', new_password: '', new_password_confirm: '' })
      setShowPasswordForm(false)
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (error) {
      setPasswordError('Failed to change password. Please check your current password.')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleMFAEnable = () => {
    setShowMFASetup(true)
  }

  const handleMFADisable = async (request: MFADisableRequest) => {
    try {
      const response = await mfaService.disable(request)

      if (response.success) {
        // Show success toast
        toast.success(response.message || 'Two-factor authentication disabled successfully')

        // Refresh MFA status from server
        const statusResponse = await mfaService.getStatus()
        if (statusResponse.success && statusResponse.data) {
          const { data } = statusResponse
          setMfaConfig({
            enabled: Boolean(data.is_enabled),
            method: 'totp' as const,
            setupCompleted: Boolean(data.is_configured),
            backupCodesGenerated: (data.backup_codes_remaining ?? 0) > 0,
            backupCodesRemaining: data.backup_codes_remaining ?? 0,
            lastVerifiedAt: data.last_verified_at || undefined,
            createdAt: data.enabled_at || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        } else {
          // Fallback to local state update
          setMfaConfig((prev) => ({
            ...prev,
            enabled: false,
            setupCompleted: false,
            backupCodesGenerated: false,
            backupCodesRemaining: 0,
          }))
        }
      } else {
        throw new Error(response.message || 'Failed to disable MFA')
      }
    } catch (error) {
      console.error('[SecurityTab] Error disabling MFA:', error)
      throw error // Re-throw so the MFASettings component can handle it
    }
  }

  const handleMFASetupComplete = async () => {
    setShowMFASetup(false)

    // Show success toast with re-login message
    toast.success(
      'Two-factor authentication enabled successfully. Please log in again to verify your identity.'
    )

    // Refresh MFA status from server to get accurate state
    try {
      const response = await mfaService.getStatus()
      if (response.success && response.data) {
        const { data } = response
        setMfaConfig({
          enabled: Boolean(data.is_enabled),
          method: 'totp' as const,
          setupCompleted: Boolean(data.is_configured),
          backupCodesGenerated: (data.backup_codes_remaining ?? 0) > 0,
          backupCodesRemaining: data.backup_codes_remaining ?? 0,
          lastVerifiedAt: data.last_verified_at || undefined,
          createdAt: data.enabled_at || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }
    } catch (error) {
      console.error('[SecurityTab] Error refreshing MFA status after setup:', error)
      // Fallback to optimistic update if refresh fails
      setMfaConfig((prev) => ({
        ...prev,
        enabled: true,
        setupCompleted: true,
        backupCodesGenerated: true,
        backupCodesRemaining: 10,
      }))
    }

    // Trigger re-authentication after a short delay to allow user to see the success message
    if (onMFAEnabled) {
      setTimeout(() => {
        onMFAEnabled()
      }, 2000)
    }
  }

  const handleRegenerateBackupCodes = async () => {
    // Show modal to enter TOTP code
    setShowRegenerateModal(true)
    setRegenerateToken('')
    setRegenerateError(null)
  }

  const handleConfirmRegenerate = async () => {
    if (!regenerateToken || regenerateToken.length !== 6) {
      setRegenerateError('Please enter a valid 6-digit code')
      return
    }

    setIsRegenerating(true)
    setRegenerateError(null)

    try {
      const response = await mfaService.regenerateBackupCodes({ token: regenerateToken })

      if (response.success && response.data?.backup_codes) {
        // Store the new codes to display
        setRegeneratedCodes(response.data.backup_codes)
        // Update the remaining count
        setMfaConfig((prev) => ({
          ...prev,
          backupCodesRemaining: response.data.backup_codes.length,
          backupCodesGenerated: true,
        }))
        // Close the TOTP modal
        setShowRegenerateModal(false)
        setRegenerateToken('')
        // Navigate to backup codes view to show the new codes
        setShowBackupCodes(true)
      } else {
        setRegenerateError(response.message || 'Failed to regenerate backup codes')
      }
    } catch (error: any) {
      console.error('Failed to regenerate backup codes:', error)
      const errorMessage =
        error.response?.data?.errors?.token?.[0] ||
        error.response?.data?.message ||
        error.message ||
        'Failed to regenerate backup codes'
      setRegenerateError(errorMessage)
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleRevokeSession = async (sessionId: string) => {
    if (sessionId === 'current') {
      alert('Cannot revoke current session')
      return
    }
    // Integration point for session revoke API
    setSessions((prev) => prev.filter((s) => s.id !== sessionId))
  }

  const handleRevokeAllOther = async () => {
    if (confirm('Are you sure you want to log out of all other sessions?')) {
      setSessions((prev) => prev.filter((s) => s.is_current))
    }
  }

  // Debug log for mfaConfig state
  console.log('[SecurityTab] Rendering with mfaConfig:', JSON.stringify(mfaConfig, null, 2))

  if (isLoading || loadingMFA) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  // MFA Setup Modal
  if (showMFASetup) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setShowMFASetup(false)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Set Up Two-Factor Authentication
          </h2>
        </div>
        <MFASetup onComplete={handleMFASetupComplete} onCancel={() => setShowMFASetup(false)} />
      </div>
    )
  }

  // Backup Codes Modal
  if (showBackupCodes) {
    // Convert regenerated codes to BackupCode format if available
    const backupCodesList = regeneratedCodes.map((code, index) => ({
      id: `code-${index}`,
      code: code,
      used: false,
      createdAt: new Date().toISOString(),
    }))

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => {
              setShowBackupCodes(false)
              setRegeneratedCodes([]) // Clear codes when closing
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Backup Codes</h2>
        </div>
        <MFABackupCodes
          codes={{
            codes: backupCodesList,
            generatedAt: new Date().toISOString(),
            totalCodes: 10,
            usedCodes: 10 - mfaConfig.backupCodesRemaining,
            remainingCodes: mfaConfig.backupCodesRemaining,
          }}
          onRegenerate={handleRegenerateBackupCodes}
          showCodes={regeneratedCodes.length > 0}
        />

        {/* TOTP Verification Modal for Regeneration */}
        {showRegenerateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Verify Your Identity
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Enter your 6-digit authenticator code to regenerate backup codes. This will
                invalidate all existing backup codes.
              </p>

              <input
                type="text"
                value={regenerateToken}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                  setRegenerateToken(value)
                  setRegenerateError(null)
                }}
                placeholder="000000"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-blue-500 mb-4"
                maxLength={6}
                autoFocus
              />

              {regenerateError && (
                <p className="text-sm text-red-600 dark:text-red-400 mb-4">{regenerateError}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRegenerateModal(false)
                    setRegenerateToken('')
                    setRegenerateError(null)
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRegenerate}
                  disabled={regenerateToken.length !== 6 || isRegenerating}
                  className="flex-1 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRegenerating ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Regenerating...
                    </span>
                  ) : (
                    'Regenerate'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Password Success Message */}
      {passwordSuccess && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
          <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
          <p className="text-sm text-green-700 dark:text-green-300">
            Password changed successfully!
          </p>
        </div>
      )}

      {/* Password Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <Key className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Password</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Change your password to keep your account secure
              </p>
            </div>
          </div>
          {!showPasswordForm && (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            >
              Change Password
            </button>
          )}
        </div>

        {showPasswordForm && (
          <form onSubmit={handlePasswordChange} className="space-y-4 mt-4">
            {passwordError && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-700 dark:text-red-300">{passwordError}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showOldPassword ? 'text' : 'password'}
                  value={passwordData.old_password}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, old_password: e.target.value })
                  }
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordData.new_password}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, new_password: e.target.value })
                  }
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordData.new_password_confirm}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, new_password_confirm: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
                required
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowPasswordForm(false)
                  setPasswordError(null)
                }}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isChangingPassword}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
              >
                {isChangingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                Change Password
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Two-Factor Authentication */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Two-Factor Authentication
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Add an extra layer of security to your account
            </p>
          </div>
        </div>

        <MFASettings
          config={mfaConfig}
          onEnable={handleMFAEnable}
          onDisable={handleMFADisable}
          onRegenerateBackupCodes={handleRegenerateBackupCodes}
          onViewBackupCodes={() => setShowBackupCodes(true)}
        />
      </div>

      {/* Active Sessions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Monitor className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Active Sessions
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage your logged-in devices
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadSessions}
              disabled={loadingSessions}
              className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <RefreshCw className={cn('w-4 h-4', loadingSessions && 'animate-spin')} />
            </button>
            {sessions.length > 1 && (
              <button
                onClick={handleRevokeAllOther}
                className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                Log Out All Others
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={cn(
                'flex items-center justify-between p-4 rounded-lg border',
                session.is_current
                  ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              )}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'p-2 rounded-lg',
                    session.is_current
                      ? 'bg-green-100 dark:bg-green-800'
                      : 'bg-gray-100 dark:bg-gray-700'
                  )}
                >
                  {session.device.includes('Mobile') ? (
                    <Smartphone className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <Monitor className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {session.browser}
                    </p>
                    {session.is_current && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {session.ip_address}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(session.last_activity).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              {!session.is_current && (
                <button
                  onClick={() => handleRevokeSession(session.id)}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Trusted Devices - Only show if MFA is enabled */}
      {mfaConfig.enabled && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Smartphone className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Trusted Devices
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Devices that can skip MFA verification for 30 days
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadTrustedDevices}
                disabled={loadingTrustedDevices}
                className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className={cn('w-4 h-4', loadingTrustedDevices && 'animate-spin')} />
              </button>
              {trustedDevices.filter((d) => !d.is_current).length > 0 && (
                <button
                  onClick={handleRemoveAllDevicesClick}
                  className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  Remove All Others
                </button>
              )}
            </div>
          </div>

          {loadingTrustedDevices ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            </div>
          ) : trustedDevices.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Smartphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No trusted devices</p>
              <p className="text-sm mt-1">
                Trust a device during MFA verification to skip it for 30 days
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {trustedDevices.map((device) => {
                const isCurrentDevice = device.is_current
                const expiresAt = new Date(device.expires_at)
                const daysUntilExpiry = Math.ceil(
                  (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                )
                const isExpiringSoon = daysUntilExpiry <= 7 && daysUntilExpiry > 0

                return (
                  <div
                    key={device.id}
                    className={cn(
                      'flex items-center justify-between p-4 rounded-lg border',
                      isCurrentDevice
                        ? 'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'p-2 rounded-lg',
                          isCurrentDevice
                            ? 'bg-purple-100 dark:bg-purple-800'
                            : 'bg-gray-100 dark:bg-gray-700'
                        )}
                      >
                        {device.device_type === 'mobile' || device.device_type === 'tablet' ? (
                          <Smartphone className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        ) : (
                          <Monitor className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {device.device_name ||
                              device.user_agent?.split(' ')[0] ||
                              'Unknown Device'}
                          </p>
                          {isCurrentDevice && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded-full">
                              This Device
                            </span>
                          )}
                          {isExpiringSoon && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 dark:bg-orange-800 text-orange-700 dark:text-orange-300 rounded-full">
                              Expires in {daysUntilExpiry} days
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {device.ip_address && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {device.ip_address}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Last used: {new Date(device.last_used_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    {!isCurrentDevice && (
                      <button
                        onClick={() => handleRemoveDeviceClick(device)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Remove device"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Remove Single Device Confirmation Modal */}
      {showRemoveDeviceModal && deviceToRemove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Remove Trusted Device
              </h3>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to remove this device from your trusted devices?
            </p>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-6">
              <div className="flex items-center gap-3">
                {deviceToRemove.device_type === 'mobile' ||
                deviceToRemove.device_type === 'tablet' ? (
                  <Smartphone className="w-5 h-5 text-gray-500" />
                ) : (
                  <Monitor className="w-5 h-5 text-gray-500" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {deviceToRemove.device_name ||
                      deviceToRemove.user_agent?.split(' ')[0] ||
                      'Unknown Device'}
                  </p>
                  {deviceToRemove.ip_address && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      IP: {deviceToRemove.ip_address}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <p className="text-sm text-orange-600 dark:text-orange-400 mb-6">
              After removal, you will need to verify MFA when logging in from this device.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRemoveDeviceModal(false)
                  setDeviceToRemove(null)
                }}
                disabled={removingDevice}
                className="flex-1 px-4 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemoveDevice}
                disabled={removingDevice}
                className="flex-1 px-4 py-2.5 text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {removingDevice ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  'Remove Device'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove All Devices Confirmation Modal */}
      {showRemoveAllDevicesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Remove All Other Devices
              </h3>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to remove all other trusted devices? This will affect{' '}
              <span className="font-semibold text-gray-900 dark:text-white">
                {trustedDevices.filter((d) => !d.is_current).length} device(s)
              </span>
              .
            </p>

            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mb-6">
              <p className="text-sm text-orange-700 dark:text-orange-300">
                After removal, you will need to verify MFA when logging in from those devices. Your
                current device will remain trusted.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRemoveAllDevicesModal(false)}
                disabled={removingDevice}
                className="flex-1 px-4 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemoveAllDevices}
                disabled={removingDevice}
                className="flex-1 px-4 py-2.5 text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {removingDevice ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  'Remove All Others'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Security Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Security Settings
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure additional security options
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Session Timeout */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Session Timeout
            </label>
            <select
              value={securitySettings?.session_timeout || 60}
              onChange={(e) =>
                onUpdateSecuritySettings({ session_timeout: parseInt(e.target.value) })
              }
              className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
            >
              {SESSION_TIMEOUT_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Automatically log out after period of inactivity
            </p>
          </div>

          {/* Toggle Settings */}
          <div className="space-y-4">
            <ToggleSetting
              label="Require MFA for sensitive operations"
              description="Prompt for MFA when performing high-risk actions"
              checked={securitySettings?.require_mfa_for_sensitive ?? true}
              onChange={(checked) =>
                onUpdateSecuritySettings({ require_mfa_for_sensitive: checked })
              }
            />
            <ToggleSetting
              label="Email on new login"
              description="Receive an email when you log in from a new location or device"
              checked={securitySettings?.login_notification_email ?? true}
              onChange={(checked) =>
                onUpdateSecuritySettings({ login_notification_email: checked })
              }
            />
            <ToggleSetting
              label="Notify on new device"
              description="Alert when someone logs into your account from a new device"
              checked={securitySettings?.login_notification_new_device ?? true}
              onChange={(checked) =>
                onUpdateSecuritySettings({ login_notification_new_device: checked })
              }
            />
            <ToggleSetting
              label="Notify on new location"
              description="Alert when someone logs into your account from a new location"
              checked={securitySettings?.login_notification_new_location ?? true}
              onChange={(checked) =>
                onUpdateSecuritySettings({ login_notification_new_location: checked })
              }
            />
          </div>
        </div>
      </div>

      {/* TOTP Verification Modal for Regeneration - shown from main settings */}
      {showRegenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Verify Your Identity
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Enter your 6-digit authenticator code to regenerate backup codes. This will invalidate
              all existing backup codes.
            </p>

            <input
              type="text"
              value={regenerateToken}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                setRegenerateToken(value)
                setRegenerateError(null)
              }}
              placeholder="000000"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-blue-500 mb-4"
              maxLength={6}
              autoFocus
            />

            {regenerateError && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-4">{regenerateError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRegenerateModal(false)
                  setRegenerateToken('')
                  setRegenerateError(null)
                }}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRegenerate}
                disabled={regenerateToken.length !== 6 || isRegenerating}
                className="flex-1 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRegenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Regenerating...
                  </span>
                ) : (
                  'Regenerate'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Toggle Setting Component
interface ToggleSettingProps {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

function ToggleSetting({ label, description, checked, onChange, disabled }: ToggleSettingProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  )
}

export default SecurityTab
