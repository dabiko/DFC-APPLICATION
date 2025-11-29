/**
 * SecurityPoliciesTab Component
 *
 * Organization security policy settings including:
 * - Password requirements
 * - MFA policies
 * - Session settings
 * - Login security
 * - IP restrictions
 */

import { useState, useEffect } from 'react'
import {
  Key,
  Shield,
  Clock,
  Lock,
  Globe,
  AlertTriangle,
  Save,
  Loader2,
  Info,
  Check,
  X,
} from 'lucide-react'
import type { SecurityPolicy } from '@/services/organizationSettingsService'
import { cn } from '@/utils/cn'

interface SecurityPoliciesTabProps {
  securityPolicy: SecurityPolicy
  onUpdate: (data: Partial<SecurityPolicy>) => Promise<void>
}

export function SecurityPoliciesTab({ securityPolicy, onUpdate }: SecurityPoliciesTabProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [formData, setFormData] = useState<Partial<SecurityPolicy>>({})

  // Initialize form data
  useEffect(() => {
    setFormData(securityPolicy)
  }, [securityPolicy])

  const handleChange = <K extends keyof SecurityPolicy>(key: K, value: SecurityPolicy[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onUpdate(formData)
      setHasChanges(false)
    } catch (error) {
      console.error('Error saving security policy:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Save Button - Sticky */}
      {hasChanges && (
        <div className="sticky top-0 z-10 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 flex items-center justify-between">
          <p className="text-sm text-indigo-700 dark:text-indigo-300">You have unsaved changes</p>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      )}

      {/* Password Policy */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <Key className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Password Policy</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure password requirements for all users
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Minimum Length */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Minimum Password Length
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={6}
                max={24}
                value={formData.password_min_length || 8}
                onChange={(e) => handleChange('password_min_length', parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <span className="w-12 text-center text-sm font-medium text-gray-900 dark:text-white">
                {formData.password_min_length || 8}
              </span>
            </div>
          </div>

          {/* Requirements Grid */}
          <div className="grid grid-cols-2 gap-4">
            <ToggleSetting
              label="Require Uppercase"
              description="At least one uppercase letter (A-Z)"
              checked={formData.password_require_uppercase ?? true}
              onChange={(checked) => handleChange('password_require_uppercase', checked)}
            />
            <ToggleSetting
              label="Require Lowercase"
              description="At least one lowercase letter (a-z)"
              checked={formData.password_require_lowercase ?? true}
              onChange={(checked) => handleChange('password_require_lowercase', checked)}
            />
            <ToggleSetting
              label="Require Numbers"
              description="At least one number (0-9)"
              checked={formData.password_require_numbers ?? true}
              onChange={(checked) => handleChange('password_require_numbers', checked)}
            />
            <ToggleSetting
              label="Require Special Characters"
              description="At least one special character (!@#$%)"
              checked={formData.password_require_special ?? false}
              onChange={(checked) => handleChange('password_require_special', checked)}
            />
          </div>

          {/* Password Expiry */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password Expiry (days)
              </label>
              <select
                value={formData.password_expiry_days || 0}
                onChange={(e) => handleChange('password_expiry_days', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
              >
                <option value={0}>Never</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
                <option value={180}>180 days</option>
                <option value={365}>365 days</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Require users to change passwords periodically
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password History
              </label>
              <select
                value={formData.password_history_count || 3}
                onChange={(e) => handleChange('password_history_count', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
              >
                <option value={0}>No history</option>
                <option value={3}>Remember last 3 passwords</option>
                <option value={5}>Remember last 5 passwords</option>
                <option value={10}>Remember last 10 passwords</option>
                <option value={24}>Remember last 24 passwords</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Prevent reuse of recent passwords</p>
            </div>
          </div>

          {/* Password Requirements Preview */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password Requirements Preview
            </h4>
            <ul className="space-y-1">
              <RequirementItem
                met={true}
                text={`Minimum ${formData.password_min_length || 8} characters`}
              />
              {formData.password_require_uppercase && (
                <RequirementItem met={true} text="At least one uppercase letter" />
              )}
              {formData.password_require_lowercase && (
                <RequirementItem met={true} text="At least one lowercase letter" />
              )}
              {formData.password_require_numbers && (
                <RequirementItem met={true} text="At least one number" />
              )}
              {formData.password_require_special && (
                <RequirementItem met={true} text="At least one special character" />
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* MFA Policy */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Multi-Factor Authentication
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure MFA requirements for your organization
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <ToggleSetting
            label="Require MFA for All Users"
            description="All users must enable MFA to access the system"
            checked={formData.mfa_required ?? false}
            onChange={(checked) => handleChange('mfa_required', checked)}
          />
          <ToggleSetting
            label="Require MFA for Admins"
            description="Admin users must have MFA enabled"
            checked={formData.mfa_required_for_admins ?? true}
            onChange={(checked) => handleChange('mfa_required_for_admins', checked)}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                MFA Grace Period
              </label>
              <select
                value={formData.mfa_grace_period_days || 7}
                onChange={(e) => handleChange('mfa_grace_period_days', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
              >
                <option value={0}>No grace period</option>
                <option value={3}>3 days</option>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Time to enable MFA after account creation
              </p>
            </div>
          </div>

          {/* Info Box */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              TOTP (Time-based One-Time Password) is the default MFA method. Users can set up MFA
              using apps like Google Authenticator or Authy.
            </p>
          </div>
        </div>
      </div>

      {/* Session Policy */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Session Settings
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure session timeout and concurrency
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Session Timeout
              </label>
              <select
                value={formData.session_timeout_minutes || 60}
                onChange={(e) => handleChange('session_timeout_minutes', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
                <option value={240}>4 hours</option>
                <option value={480}>8 hours</option>
                <option value={1440}>24 hours</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Concurrent Sessions
              </label>
              <select
                value={formData.max_concurrent_sessions || 5}
                onChange={(e) => handleChange('max_concurrent_sessions', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
              >
                <option value={1}>1 session</option>
                <option value={3}>3 sessions</option>
                <option value={5}>5 sessions</option>
                <option value={10}>10 sessions</option>
                <option value={20}>Unlimited</option>
              </select>
            </div>
          </div>

          <ToggleSetting
            label="Require Re-authentication"
            description="Require password for sensitive operations"
            checked={formData.require_reauthentication ?? true}
            onChange={(checked) => handleChange('require_reauthentication', checked)}
          />
        </div>
      </div>

      {/* Login Security */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <Lock className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Login Security</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure login attempts and notifications
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Login Attempts
              </label>
              <select
                value={formData.max_login_attempts || 5}
                onChange={(e) => handleChange('max_login_attempts', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
              >
                <option value={3}>3 attempts</option>
                <option value={5}>5 attempts</option>
                <option value={7}>7 attempts</option>
                <option value={10}>10 attempts</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Lockout Duration
              </label>
              <select
                value={formData.lockout_duration_minutes || 30}
                onChange={(e) => handleChange('lockout_duration_minutes', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
              >
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={1440}>24 hours (manual unlock)</option>
              </select>
            </div>
          </div>

          <ToggleSetting
            label="Login Notifications"
            description="Notify users when they log in from a new device"
            checked={formData.login_notification_enabled ?? true}
            onChange={(checked) => handleChange('login_notification_enabled', checked)}
          />
          <ToggleSetting
            label="Suspicious Activity Alerts"
            description="Alert admins on suspicious login attempts"
            checked={formData.suspicious_activity_alerts ?? true}
            onChange={(checked) => handleChange('suspicious_activity_alerts', checked)}
          />
        </div>
      </div>

      {/* IP Restrictions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Globe className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">IP Restrictions</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Limit access by IP address</p>
          </div>
        </div>

        <div className="space-y-4">
          <ToggleSetting
            label="Enable IP Whitelist"
            description="Only allow access from specific IP addresses"
            checked={formData.ip_whitelist_enabled ?? false}
            onChange={(checked) => handleChange('ip_whitelist_enabled', checked)}
          />

          {formData.ip_whitelist_enabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Allowed IP Addresses
              </label>
              <textarea
                value={(formData.ip_whitelist || []).join('\n')}
                onChange={(e) =>
                  handleChange(
                    'ip_whitelist',
                    e.target.value.split('\n').filter((ip) => ip.trim())
                  )
                }
                placeholder="Enter one IP address per line..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter IP addresses or CIDR ranges (e.g., 192.168.1.0/24)
              </p>
            </div>
          )}

          {/* Warning */}
          {formData.ip_whitelist_enabled && (
            <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Be careful with IP restrictions. You may lock yourself out if your IP address
                changes. Consider including backup IP addresses.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Data Security */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Data Security</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure data protection settings
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <ToggleSetting
            label="Restrict Data Exports"
            description="Limit bulk data export capabilities"
            checked={formData.data_export_restricted ?? false}
            onChange={(checked) => handleChange('data_export_restricted', checked)}
          />
          <ToggleSetting
            label="Require Encryption"
            description="Encrypt all documents at rest"
            checked={formData.require_encryption ?? true}
            onChange={(checked) => handleChange('require_encryption', checked)}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Audit Log Retention
            </label>
            <select
              value={formData.audit_log_retention_days || 365}
              onChange={(e) => handleChange('audit_log_retention_days', parseInt(e.target.value))}
              className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
            >
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={180}>6 months</option>
              <option value={365}>1 year</option>
              <option value={730}>2 years</option>
              <option value={2555}>7 years</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">How long to keep audit logs for compliance</p>
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
          checked ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600',
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

// Requirement Item Component
interface RequirementItemProps {
  met: boolean
  text: string
}

function RequirementItem({ met, text }: RequirementItemProps) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {met ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-gray-400" />}
      <span className={met ? 'text-green-700 dark:text-green-400' : 'text-gray-500'}>{text}</span>
    </li>
  )
}

export default SecurityPoliciesTab
