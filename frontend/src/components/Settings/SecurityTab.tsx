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
import { cn } from '@/utils/cn'

interface SecurityTabProps {
  securitySettings: SecuritySettings | null
  isLoading: boolean
  onUpdateSecuritySettings: (data: Partial<SecuritySettings>) => Promise<void>
  onChangePassword: (data: {
    old_password: string
    new_password: string
    new_password_confirm: string
  }) => Promise<void>
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
  const [mfaConfig, setMfaConfig] = useState<MFAConfig>({
    enabled: false,
    method: 'totp',
    setupCompleted: false,
    backupCodesGenerated: false,
    backupCodesRemaining: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  // Sessions state
  const [sessions, setSessions] = useState<Session[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)

  // Load sessions
  useEffect(() => {
    loadSessions()
  }, [])

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

  const handleMFADisable = async (_request: MFADisableRequest) => {
    // Integration point for MFA disable API
    setMfaConfig((prev) => ({ ...prev, enabled: false }))
  }

  const handleMFASetupComplete = () => {
    setShowMFASetup(false)
    setMfaConfig((prev) => ({
      ...prev,
      enabled: true,
      setupCompleted: true,
      backupCodesGenerated: true,
      backupCodesRemaining: 10,
    }))
  }

  const handleRegenerateBackupCodes = async () => {
    // Integration point for regenerate backup codes API
    console.log('Regenerating backup codes...')
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

  if (isLoading) {
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
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setShowBackupCodes(false)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Backup Codes</h2>
        </div>
        <MFABackupCodes
          codes={{
            codes: [],
            generatedAt: new Date().toISOString(),
            totalCodes: 10,
            usedCodes: 10 - mfaConfig.backupCodesRemaining,
            remainingCodes: mfaConfig.backupCodesRemaining,
          }}
          onClose={() => setShowBackupCodes(false)}
          onRegenerate={handleRegenerateBackupCodes}
        />
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
