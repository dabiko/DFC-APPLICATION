/**
 * NotificationPreferences Component
 * Manages user notification preferences for retention events
 */

import { useState, useCallback } from 'react'
import {
  Bell,
  Mail,
  Smartphone,
  Globe,
  Moon,
  Clock,
  ChevronDown,
  ChevronRight,
  Check,
  Send,
  Loader2,
  Info,
} from 'lucide-react'
import type {
  UserNotificationSettings,
  NotificationPreferencesGroup,
  NotificationPreference,
  NotificationEventType,
  NotificationChannel,
  NotificationFrequency,
} from '@/types/retention'
import { getNotificationChannelLabel } from '@/types/retention'
import { cn } from '@/utils/cn'

// ============================================================================
// TYPES
// ============================================================================

export interface NotificationPreferencesProps {
  settings?: UserNotificationSettings
  groups?: NotificationPreferencesGroup[]
  onUpdate?: (settings: Partial<UserNotificationSettings>) => void
  onPreferenceChange?: (
    eventType: NotificationEventType,
    updates: Partial<NotificationPreference>
  ) => void
  onTestNotification?: (channel: NotificationChannel) => void
  loading?: boolean
  saving?: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CHANNEL_ICONS: Record<NotificationChannel, React.ElementType> = {
  email: Mail,
  in_app: Bell,
  sms: Smartphone,
  webhook: Globe,
}

// Frequency options for future use
const _FREQUENCY_OPTIONS: { value: NotificationFrequency; label: string }[] = [
  { value: 'immediate', label: 'Immediately' },
  { value: 'hourly', label: 'Hourly digest' },
  { value: 'daily', label: 'Daily digest' },
  { value: 'weekly', label: 'Weekly digest' },
]

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface ChannelToggleProps {
  channel: NotificationChannel
  enabled: boolean
  onToggle: (enabled: boolean) => void
  disabled?: boolean
}

function ChannelToggle({ channel, enabled, onToggle, disabled }: ChannelToggleProps) {
  const Icon = CHANNEL_ICONS[channel]

  return (
    <button
      onClick={() => onToggle(!enabled)}
      disabled={disabled}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
        enabled
          ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">{getNotificationChannelLabel(channel)}</span>
      {enabled && <Check className="w-3 h-3 ml-1" />}
    </button>
  )
}

interface EventPreferenceRowProps {
  eventType: NotificationEventType
  label: string
  description: string
  preference?: NotificationPreference
  defaultChannels: NotificationChannel[]
  required?: boolean
  globalEnabled: boolean
  onUpdate: (updates: Partial<NotificationPreference>) => void
}

function EventPreferenceRow({
  eventType: _eventType,
  label,
  description,
  preference,
  defaultChannels,
  required,
  globalEnabled,
  onUpdate,
}: EventPreferenceRowProps) {
  const channels = preference?.channels || defaultChannels
  const enabled = preference?.enabled ?? true
  const isDisabled = !globalEnabled || (required && enabled)

  const toggleChannel = (channel: NotificationChannel) => {
    const currentChannels = [...channels]
    const index = currentChannels.indexOf(channel)
    if (index > -1) {
      currentChannels.splice(index, 1)
    } else {
      currentChannels.push(channel)
    }
    onUpdate({ channels: currentChannels })
  }

  return (
    <div
      className={cn(
        'flex items-start justify-between py-4 border-b border-gray-100 dark:border-gray-800 last:border-0',
        !enabled && 'opacity-50'
      )}
    >
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-white">{label}</span>
          {required && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">
              Required
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Channel toggles */}
        <div className="flex items-center gap-1">
          {(['email', 'in_app'] as NotificationChannel[]).map((channel) => {
            const isActive = channels.includes(channel)
            const Icon = CHANNEL_ICONS[channel]
            return (
              <button
                key={channel}
                onClick={() => toggleChannel(channel)}
                disabled={!enabled || !globalEnabled}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  isActive
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300',
                  (!enabled || !globalEnabled) && 'cursor-not-allowed'
                )}
                title={getNotificationChannelLabel(channel)}
              >
                <Icon className="w-4 h-4" />
              </button>
            )
          })}
        </div>

        {/* Enable/Disable toggle */}
        <button
          onClick={() => onUpdate({ enabled: !enabled })}
          disabled={isDisabled}
          className={cn(
            'relative w-10 h-6 rounded-full transition-colors',
            enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600',
            isDisabled && 'cursor-not-allowed opacity-50'
          )}
        >
          <span
            className={cn(
              'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
              enabled ? 'left-5' : 'left-1'
            )}
          />
        </button>
      </div>
    </div>
  )
}

interface CategorySectionProps {
  category: string
  description: string
  events: NotificationPreferencesGroup['events']
  preferences: NotificationPreference[]
  globalEnabled: boolean
  onPreferenceChange: (
    eventType: NotificationEventType,
    updates: Partial<NotificationPreference>
  ) => void
  defaultExpanded?: boolean
}

function CategorySection({
  category,
  description,
  events,
  preferences,
  globalEnabled,
  onPreferenceChange,
  defaultExpanded = true,
}: CategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
          <div className="text-left">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">{category}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
          </div>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {events.length} notification{events.length !== 1 ? 's' : ''}
        </span>
      </button>

      {isExpanded && (
        <div className="px-4">
          {events.map((event) => {
            const preference = preferences.find((p) => p.eventType === event.eventType)
            return (
              <EventPreferenceRow
                key={event.eventType}
                eventType={event.eventType}
                label={event.label}
                description={event.description}
                preference={preference}
                defaultChannels={event.defaultChannels}
                required={event.required}
                globalEnabled={globalEnabled}
                onUpdate={(updates) => onPreferenceChange(event.eventType, updates)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function NotificationPreferences({
  settings: propSettings,
  groups: propGroups,
  onUpdate = () => {},
  onPreferenceChange = () => {},
  onTestNotification,
  loading = false,
  saving = false,
}: NotificationPreferencesProps) {
  const [testingChannel, setTestingChannel] = useState<NotificationChannel | null>(null)

  // Default settings to prevent undefined errors
  const settings: UserNotificationSettings = propSettings || {
    globalEnabled: true,
    emailEnabled: true,
    inAppEnabled: true,
    smsEnabled: false,
    webhookEnabled: false,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    digestFrequency: 'immediate',
    preferences: [],
  }

  // Default groups if not provided
  const groups: NotificationPreferencesGroup[] = propGroups || []

  const handleTestNotification = useCallback(
    async (channel: NotificationChannel) => {
      if (!onTestNotification) return
      setTestingChannel(channel)
      try {
        await onTestNotification(channel)
      } finally {
        setTestingChannel(null)
      }
    },
    [onTestNotification]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading notification preferences...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Global Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Global Notification Settings
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Master controls for all notification channels
            </p>
          </div>
          {saving && (
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Saving...</span>
            </div>
          )}
        </div>

        {/* Master toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Enable All Notifications
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Turn off to disable all notifications
              </p>
            </div>
          </div>
          <button
            onClick={() => onUpdate({ globalEnabled: !settings.globalEnabled })}
            className={cn(
              'relative w-12 h-7 rounded-full transition-colors',
              settings.globalEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
            )}
          >
            <span
              className={cn(
                'absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform',
                settings.globalEnabled ? 'left-6' : 'left-1'
              )}
            />
          </button>
        </div>

        {/* Channel toggles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="space-y-2">
            <ChannelToggle
              channel="email"
              enabled={settings.emailEnabled}
              onToggle={(enabled) => onUpdate({ emailEnabled: enabled })}
              disabled={!settings.globalEnabled}
            />
            {onTestNotification && settings.emailEnabled && (
              <button
                onClick={() => handleTestNotification('email')}
                disabled={testingChannel !== null}
                className="w-full flex items-center justify-center gap-1 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
              >
                {testingChannel === 'email' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Send className="w-3 h-3" />
                )}
                Test
              </button>
            )}
          </div>

          <div className="space-y-2">
            <ChannelToggle
              channel="in_app"
              enabled={settings.inAppEnabled}
              onToggle={(enabled) => onUpdate({ inAppEnabled: enabled })}
              disabled={!settings.globalEnabled}
            />
          </div>

          <div className="space-y-2">
            <ChannelToggle
              channel="sms"
              enabled={settings.smsEnabled}
              onToggle={(enabled) => onUpdate({ smsEnabled: enabled })}
              disabled={!settings.globalEnabled}
            />
          </div>

          <div className="space-y-2">
            <ChannelToggle
              channel="webhook"
              enabled={settings.webhookEnabled}
              onToggle={(enabled) => onUpdate({ webhookEnabled: enabled })}
              disabled={!settings.globalEnabled}
            />
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Moon className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Quiet Hours</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Pause notifications during specific hours
                </p>
              </div>
            </div>
            <button
              onClick={() => onUpdate({ quietHoursEnabled: !settings.quietHoursEnabled })}
              disabled={!settings.globalEnabled}
              className={cn(
                'relative w-10 h-6 rounded-full transition-colors',
                settings.quietHoursEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600',
                !settings.globalEnabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
                  settings.quietHoursEnabled ? 'left-5' : 'left-1'
                )}
              />
            </button>
          </div>

          {settings.quietHoursEnabled && (
            <div className="flex items-center gap-4 ml-8">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">From</label>
                <input
                  type="time"
                  value={settings.quietHoursStart}
                  onChange={(e) => onUpdate({ quietHoursStart: e.target.value })}
                  disabled={!settings.globalEnabled}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">To</label>
                <input
                  type="time"
                  value={settings.quietHoursEnd}
                  onChange={(e) => onUpdate({ quietHoursEnd: e.target.value })}
                  disabled={!settings.globalEnabled}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Email Digest */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Email Digest</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Receive a summary of notifications
                </p>
              </div>
            </div>
            <button
              onClick={() => onUpdate({ emailDigestEnabled: !settings.emailDigestEnabled })}
              disabled={!settings.globalEnabled || !settings.emailEnabled}
              className={cn(
                'relative w-10 h-6 rounded-full transition-colors',
                settings.emailDigestEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600',
                (!settings.globalEnabled || !settings.emailEnabled) &&
                  'opacity-50 cursor-not-allowed'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
                  settings.emailDigestEnabled ? 'left-5' : 'left-1'
                )}
              />
            </button>
          </div>

          {settings.emailDigestEnabled && (
            <div className="flex items-center gap-4 ml-8">
              <select
                value={settings.emailDigestFrequency}
                onChange={(e) =>
                  onUpdate({ emailDigestFrequency: e.target.value as 'daily' | 'weekly' })
                }
                disabled={!settings.globalEnabled || !settings.emailEnabled}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">at</label>
                <input
                  type="time"
                  value={settings.emailDigestTime}
                  onChange={(e) => onUpdate({ emailDigestTime: e.target.value })}
                  disabled={!settings.globalEnabled || !settings.emailEnabled}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Event Preferences */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Event Notifications
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure notifications for specific events
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Info className="w-4 h-4" />
            <span>Required notifications cannot be disabled</span>
          </div>
        </div>

        {!settings.globalEnabled && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <Bell className="w-4 h-4" />
              <span className="text-sm font-medium">
                Notifications are disabled. Enable global notifications to configure event
                preferences.
              </span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {groups.map((group, index) => (
            <CategorySection
              key={group.category}
              category={group.category}
              description={group.description}
              events={group.events}
              preferences={settings.preferences}
              globalEnabled={settings.globalEnabled}
              onPreferenceChange={onPreferenceChange}
              defaultExpanded={index === 0}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default NotificationPreferences
