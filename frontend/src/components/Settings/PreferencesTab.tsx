/**
 * PreferencesTab Component
 *
 * Displays and allows editing of user preferences:
 * - Theme and display settings
 * - Language and locale
 * - Document view preferences
 * - Navigation preferences
 * - Accessibility settings
 */

import { useState, useEffect } from 'react'
import {
  Sun,
  Moon,
  Monitor,
  Globe,
  Clock,
  Calendar,
  Layout,
  Grid,
  List,
  Eye,
  Keyboard,
  Accessibility,
  Save,
  Loader2,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useTheme } from '@/hooks/useTheme'
import type { UserPreferences } from '@/services/settingsService'

interface PreferencesTabProps {
  preferences: UserPreferences | null
  isLoading: boolean
  onUpdatePreferences: (data: Partial<UserPreferences>) => Promise<void>
}

// Language options
const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
]

// Timezone options
const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (US)' },
  { value: 'America/Chicago', label: 'Central Time (US)' },
  { value: 'America/Denver', label: 'Mountain Time (US)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Shanghai', label: 'Shanghai' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Australia/Sydney', label: 'Sydney' },
]

// Date format options
const DATE_FORMATS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (EU)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
]

// Start page options
const START_PAGES = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'my-documents', label: 'My Documents' },
  { value: 'recent', label: 'Recent Files' },
  { value: 'favorites', label: 'Favorites' },
]

export function PreferencesTab({
  preferences,
  isLoading,
  onUpdatePreferences,
}: PreferencesTabProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [localPrefs, setLocalPrefs] = useState<Partial<UserPreferences>>({})

  // Use the theme hook to apply theme changes immediately
  const { theme: currentTheme, setTheme } = useTheme()

  // Initialize local state when preferences load
  useEffect(() => {
    if (preferences) {
      setLocalPrefs(preferences)
    }
  }, [preferences])

  const handleChange = (key: keyof UserPreferences, value: unknown) => {
    setLocalPrefs((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onUpdatePreferences(localPrefs)
      setHasChanges(false)
    } catch (error) {
      console.error('Error saving preferences:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !preferences) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

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

      {/* Appearance */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Sun className="w-5 h-5 text-gray-400" />
          Appearance
        </h3>

        {/* Theme */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Theme
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'light' as const, icon: Sun, label: 'Light' },
              { value: 'dark' as const, icon: Moon, label: 'Dark' },
              { value: 'system' as const, icon: Monitor, label: 'System' },
            ].map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => {
                  // Apply theme immediately using the hook
                  setTheme(value)
                  // Also update local prefs to save to backend
                  handleChange('theme', value)
                }}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors',
                  currentTheme === value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                )}
              >
                <Icon
                  className={cn(
                    'w-6 h-6',
                    currentTheme === value ? 'text-blue-500' : 'text-gray-400'
                  )}
                />
                <span
                  className={cn(
                    'text-sm font-medium',
                    currentTheme === value
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400'
                  )}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Display Density */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Display Density
          </label>
          <div className="flex gap-3">
            {[
              { value: 'comfortable', label: 'Comfortable' },
              { value: 'compact', label: 'Compact' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handleChange('display_density', value)}
                className={cn(
                  'flex-1 px-4 py-3 rounded-lg border-2 transition-colors text-sm font-medium',
                  localPrefs.display_density === value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Language & Region */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-gray-400" />
          Language & Region
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Language
            </label>
            <select
              value={localPrefs.language || 'en'}
              onChange={(e) => handleChange('language', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
            >
              {LANGUAGES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Timezone
            </label>
            <select
              value={localPrefs.timezone || 'UTC'}
              onChange={(e) => handleChange('timezone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
            >
              {TIMEZONES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date Format
            </label>
            <select
              value={localPrefs.date_format || 'MM/DD/YYYY'}
              onChange={(e) => handleChange('date_format', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
            >
              {DATE_FORMATS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Time Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Time Format
            </label>
            <div className="flex gap-3">
              {[
                { value: '12h', label: '12-hour' },
                { value: '24h', label: '24-hour' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleChange('time_format', value)}
                  className={cn(
                    'flex-1 px-4 py-2 rounded-lg border-2 transition-colors text-sm font-medium',
                    localPrefs.time_format === value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Document View */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Layout className="w-5 h-5 text-gray-400" />
          Document View
        </h3>

        <div className="space-y-4">
          {/* Default View */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Default View
            </label>
            <div className="flex gap-3">
              {[
                { value: 'grid', icon: Grid, label: 'Grid View' },
                { value: 'list', icon: List, label: 'List View' },
              ].map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => handleChange('default_document_view', value)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors',
                    localPrefs.default_document_view === value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5',
                      localPrefs.default_document_view === value ? 'text-blue-500' : 'text-gray-400'
                    )}
                  />
                  <span
                    className={cn(
                      'text-sm font-medium',
                      localPrefs.default_document_view === value
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400'
                    )}
                  >
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Items per page */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Items per page: {localPrefs.items_per_page || 25}
            </label>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={localPrefs.items_per_page || 25}
              onChange={(e) => handleChange('items_per_page', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>10</span>
              <span>100</span>
            </div>
          </div>

          {/* Toggle Options */}
          <div className="space-y-3">
            <ToggleOption
              label="Show file extensions"
              description="Display file extensions in document names"
              icon={<Eye className="w-4 h-4" />}
              checked={localPrefs.show_file_extensions ?? true}
              onChange={(checked) => handleChange('show_file_extensions', checked)}
            />
            <ToggleOption
              label="Show thumbnails"
              description="Display document thumbnails when available"
              icon={<Eye className="w-4 h-4" />}
              checked={localPrefs.show_thumbnails ?? true}
              onChange={(checked) => handleChange('show_thumbnails', checked)}
            />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Layout className="w-5 h-5 text-gray-400" />
          Navigation
        </h3>

        <div className="space-y-4">
          {/* Start Page */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Page
            </label>
            <select
              value={localPrefs.start_page || 'dashboard'}
              onChange={(e) => handleChange('start_page', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white"
            >
              {START_PAGES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Options */}
          <div className="space-y-3">
            <ToggleOption
              label="Remember sidebar state"
              description="Keep sidebar collapsed/expanded state between sessions"
              checked={localPrefs.sidebar_collapsed ?? false}
              onChange={(checked) => handleChange('sidebar_collapsed', checked)}
            />
            <ToggleOption
              label="Show recent items"
              description="Display recent items in sidebar"
              checked={localPrefs.show_recent_items ?? true}
              onChange={(checked) => handleChange('show_recent_items', checked)}
            />
          </div>

          {localPrefs.show_recent_items && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Recent items count: {localPrefs.recent_items_count || 10}
              </label>
              <input
                type="range"
                min={5}
                max={25}
                step={1}
                value={localPrefs.recent_items_count || 10}
                onChange={(e) => handleChange('recent_items_count', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>

      {/* Accessibility */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Accessibility className="w-5 h-5 text-gray-400" />
          Accessibility
        </h3>

        <div className="space-y-3">
          <ToggleOption
            label="Enable keyboard shortcuts"
            description="Use keyboard shortcuts for common actions"
            icon={<Keyboard className="w-4 h-4" />}
            checked={localPrefs.enable_keyboard_shortcuts ?? true}
            onChange={(checked) => handleChange('enable_keyboard_shortcuts', checked)}
          />
          <ToggleOption
            label="Enable animations"
            description="Show UI animations and transitions"
            checked={localPrefs.enable_animations ?? true}
            onChange={(checked) => handleChange('enable_animations', checked)}
          />
          <ToggleOption
            label="High contrast mode"
            description="Increase contrast for better visibility"
            checked={localPrefs.high_contrast_mode ?? false}
            onChange={(checked) => handleChange('high_contrast_mode', checked)}
          />
        </div>
      </div>
    </div>
  )
}

// Toggle Option Component
interface ToggleOptionProps {
  label: string
  description: string
  icon?: React.ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
}

function ToggleOption({ label, description, icon, checked, onChange }: ToggleOptionProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-start gap-3">
        {icon && <div className="text-gray-400 mt-0.5">{icon}</div>}
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
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

export default PreferencesTab
