/**
 * NotificationsTab Component
 *
 * Manages user notification preferences:
 * - Email notifications
 * - In-app notifications
 * - Desktop notifications
 * - Quiet hours
 * - Notification sound
 */

import { useState, useEffect } from 'react'
import {
  Bell,
  Mail,
  Monitor,
  Moon,
  Volume2,
  VolumeX,
  FileText,
  GitBranch,
  Clock,
  Shield,
  MessageSquare,
  Info,
  Save,
  Loader2,
} from 'lucide-react'
import type { NotificationSettings } from '@/services/settingsService'
import { cn } from '@/utils/cn'

interface NotificationsTabProps {
  notificationSettings: NotificationSettings | null
  isLoading: boolean
  onUpdateNotificationSettings: (data: Partial<NotificationSettings>) => Promise<void>
}

export function NotificationsTab({
  notificationSettings,
  isLoading,
  onUpdateNotificationSettings,
}: NotificationsTabProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [localSettings, setLocalSettings] = useState<Partial<NotificationSettings>>({})

  // Initialize local state when settings load
  useEffect(() => {
    if (notificationSettings) {
      setLocalSettings(notificationSettings)
    }
  }, [notificationSettings])

  const handleChange = (key: keyof NotificationSettings, value: unknown) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onUpdateNotificationSettings(localSettings)
      setHasChanges(false)
    } catch (error) {
      console.error('Error saving notification settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !notificationSettings) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  const emailEnabled = localSettings.email_enabled ?? true
  const inAppEnabled = localSettings.in_app_enabled ?? true

  return (
    <div className="space-y-6">
      {/* Save Button - Sticky */}
      {hasChanges && (
        <div className="sticky top-0 z-10 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center justify-between">
          <p className="text-sm text-blue-700 dark:text-blue-300">You have unsaved changes</p>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      )}

      {/* Master Toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Notification Channels
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Choose how you want to receive notifications
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {/* Email Notifications */}
          <div
            className={cn(
              'p-4 rounded-lg border-2 transition-colors',
              emailEnabled
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700'
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Mail
                  className={cn(
                    'w-5 h-5',
                    emailEnabled ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
                  )}
                />
                <span
                  className={cn(
                    'font-medium',
                    emailEnabled
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-400'
                  )}
                >
                  Email
                </span>
              </div>
              <ToggleButton
                checked={emailEnabled}
                onChange={(checked) => handleChange('email_enabled', checked)}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Receive notifications via email
            </p>
          </div>

          {/* In-App Notifications */}
          <div
            className={cn(
              'p-4 rounded-lg border-2 transition-colors',
              inAppEnabled
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700'
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bell
                  className={cn(
                    'w-5 h-5',
                    inAppEnabled ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
                  )}
                />
                <span
                  className={cn(
                    'font-medium',
                    inAppEnabled
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-400'
                  )}
                >
                  In-App
                </span>
              </div>
              <ToggleButton
                checked={inAppEnabled}
                onChange={(checked) => handleChange('in_app_enabled', checked)}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Notifications in the application
            </p>
          </div>

          {/* Desktop Notifications */}
          <div
            className={cn(
              'p-4 rounded-lg border-2 transition-colors',
              localSettings.desktop_enabled
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700'
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Monitor
                  className={cn(
                    'w-5 h-5',
                    localSettings.desktop_enabled
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-400'
                  )}
                />
                <span
                  className={cn(
                    'font-medium',
                    localSettings.desktop_enabled
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-400'
                  )}
                >
                  Desktop
                </span>
              </div>
              <ToggleButton
                checked={localSettings.desktop_enabled ?? false}
                onChange={(checked) => handleChange('desktop_enabled', checked)}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Browser push notifications</p>
          </div>
        </div>
      </div>

      {/* Email Notification Preferences */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Mail className="w-5 h-5 text-gray-400" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Email Notifications
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Choose which emails you'd like to receive
            </p>
          </div>
        </div>

        {!emailEnabled && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-2">
            <Info className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Email notifications are disabled. Enable them above to configure these settings.
            </p>
          </div>
        )}

        <div className={cn('space-y-1', !emailEnabled && 'opacity-50 pointer-events-none')}>
          <NotificationRow
            icon={<FileText className="w-4 h-4" />}
            label="Document shared"
            description="When someone shares a document with you"
            checked={localSettings.email_document_shared ?? true}
            onChange={(checked) => handleChange('email_document_shared', checked)}
          />
          <NotificationRow
            icon={<GitBranch className="w-4 h-4" />}
            label="Workflow assigned"
            description="When a workflow task is assigned to you"
            checked={localSettings.email_workflow_assigned ?? true}
            onChange={(checked) => handleChange('email_workflow_assigned', checked)}
          />
          <NotificationRow
            icon={<GitBranch className="w-4 h-4" />}
            label="Workflow completed"
            description="When a workflow you submitted is completed"
            checked={localSettings.email_workflow_completed ?? true}
            onChange={(checked) => handleChange('email_workflow_completed', checked)}
          />
          <NotificationRow
            icon={<Clock className="w-4 h-4" />}
            label="Retention reminder"
            description="Reminders about document retention deadlines"
            checked={localSettings.email_retention_reminder ?? true}
            onChange={(checked) => handleChange('email_retention_reminder', checked)}
          />
          <NotificationRow
            icon={<Mail className="w-4 h-4" />}
            label="Weekly digest"
            description="Weekly summary of activity in your account"
            checked={localSettings.email_weekly_digest ?? true}
            onChange={(checked) => handleChange('email_weekly_digest', checked)}
          />
          <NotificationRow
            icon={<Shield className="w-4 h-4" />}
            label="Security alerts"
            description="Important security notifications (always recommended)"
            checked={localSettings.email_security_alerts ?? true}
            onChange={(checked) => handleChange('email_security_alerts', checked)}
            important
          />
        </div>
      </div>

      {/* In-App Notification Preferences */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-5 h-5 text-gray-400" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              In-App Notifications
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Notifications shown within the application
            </p>
          </div>
        </div>

        {!inAppEnabled && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-2">
            <Info className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              In-app notifications are disabled. Enable them above to configure these settings.
            </p>
          </div>
        )}

        <div className={cn('space-y-1', !inAppEnabled && 'opacity-50 pointer-events-none')}>
          <NotificationRow
            icon={<FileText className="w-4 h-4" />}
            label="Document shared"
            description="When someone shares a document with you"
            checked={localSettings.in_app_document_shared ?? true}
            onChange={(checked) => handleChange('in_app_document_shared', checked)}
          />
          <NotificationRow
            icon={<GitBranch className="w-4 h-4" />}
            label="Workflow updates"
            description="Updates on workflow tasks and progress"
            checked={localSettings.in_app_workflow_updates ?? true}
            onChange={(checked) => handleChange('in_app_workflow_updates', checked)}
          />
          <NotificationRow
            icon={<MessageSquare className="w-4 h-4" />}
            label="Mentions"
            description="When someone mentions you in a comment"
            checked={localSettings.in_app_mentions ?? true}
            onChange={(checked) => handleChange('in_app_mentions', checked)}
          />
          <NotificationRow
            icon={<Info className="w-4 h-4" />}
            label="System updates"
            description="Important system announcements and updates"
            checked={localSettings.in_app_system_updates ?? true}
            onChange={(checked) => handleChange('in_app_system_updates', checked)}
          />
        </div>
      </div>

      {/* Quiet Hours & Sound */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Moon className="w-5 h-5 text-gray-400" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Quiet Hours & Sound
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure when and how you receive notifications
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Notification Sound */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              {localSettings.notification_sound ? (
                <Volume2 className="w-5 h-5 text-gray-400" />
              ) : (
                <VolumeX className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Notification Sound
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Play a sound when you receive a notification
                </p>
              </div>
            </div>
            <ToggleButton
              checked={localSettings.notification_sound ?? true}
              onChange={(checked) => handleChange('notification_sound', checked)}
            />
          </div>

          {/* Quiet Hours */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Quiet Hours</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Pause notifications during specific hours
                  </p>
                </div>
              </div>
              <ToggleButton
                checked={localSettings.quiet_hours_enabled ?? false}
                onChange={(checked) => handleChange('quiet_hours_enabled', checked)}
              />
            </div>

            {localSettings.quiet_hours_enabled && (
              <div className="flex items-center gap-4 ml-8 mt-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 dark:text-gray-400">From</label>
                  <input
                    type="time"
                    value={localSettings.quiet_hours_start || '22:00'}
                    onChange={(e) => handleChange('quiet_hours_start', e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600 dark:text-gray-400">To</label>
                  <input
                    type="time"
                    value={localSettings.quiet_hours_end || '08:00'}
                    onChange={(e) => handleChange('quiet_hours_end', e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Toggle Button Component
interface ToggleButtonProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

function ToggleButton({ checked, onChange, disabled }: ToggleButtonProps) {
  return (
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
  )
}

// Notification Row Component
interface NotificationRowProps {
  icon: React.ReactNode
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
  important?: boolean
}

function NotificationRow({
  icon,
  label,
  description,
  checked,
  onChange,
  important,
}: NotificationRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="flex items-center gap-3">
        <div className="text-gray-400">{icon}</div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
            {important && (
              <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">
                Recommended
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>
      <ToggleButton checked={checked} onChange={onChange} />
    </div>
  )
}

export default NotificationsTab
