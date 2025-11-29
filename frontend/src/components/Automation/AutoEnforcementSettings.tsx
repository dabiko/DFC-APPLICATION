/**
 * AutoEnforcementSettings Component
 * Configure automatic enforcement of retention policies
 */

import { useState } from 'react'
import {
  Settings,
  Play,
  Pause,
  Clock,
  Archive,
  Trash2,
  AlertTriangle,
  Shield,
  Calendar,
  Users,
  FileType,
  RefreshCw,
  CheckCircle,
  Info,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import type {
  AutoEnforcementSettings as AutoEnforcementSettingsType,
  EnforcementMode,
  RetentionPolicy,
} from '@/types/retention'
import { cn } from '@/utils/cn'

// ============================================================================
// TYPES
// ============================================================================

export interface AutoEnforcementSettingsProps {
  settings?: AutoEnforcementSettingsType
  policies?: RetentionPolicy[]
  onUpdate?: (settings: Partial<AutoEnforcementSettingsType>) => void
  onSave?: () => void
  onReset?: () => void
  onTestRun?: (dryRun: boolean) => void
  loading?: boolean
  saving?: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ENFORCEMENT_MODES: { value: EnforcementMode; label: string; description: string }[] = [
  {
    value: 'automatic',
    label: 'Automatic',
    description: 'Execute dispositions automatically on schedule',
  },
  {
    value: 'manual',
    label: 'Manual',
    description: 'Require manual trigger for each disposition',
  },
  {
    value: 'approval_required',
    label: 'Approval Required',
    description: 'Require approval before execution',
  },
]

const SCHEDULE_FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface SettingsSectionProps {
  title: string
  description?: string
  icon: React.ElementType
  iconColor?: string
  children: React.ReactNode
  collapsible?: boolean
  defaultExpanded?: boolean
}

function SettingsSection({
  title,
  description,
  icon: Icon,
  iconColor = 'text-gray-500',
  children,
  collapsible = false,
  defaultExpanded = true,
}: SettingsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
        disabled={!collapsible}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50',
          collapsible && 'hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer'
        )}
      >
        <div className="flex items-center gap-3">
          {collapsible &&
            (isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            ))}
          <Icon className={cn('w-5 h-5', iconColor)} />
          <div className="text-left">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">{title}</h4>
            {description && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
            )}
          </div>
        </div>
      </button>

      {(!collapsible || isExpanded) && <div className="p-4 space-y-4">{children}</div>}
    </div>
  )
}

interface EnforcementModeSelectProps {
  value: EnforcementMode
  onChange: (value: EnforcementMode) => void
  disabled?: boolean
}

function EnforcementModeSelect({ value, onChange, disabled }: EnforcementModeSelectProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {ENFORCEMENT_MODES.map((mode) => (
        <button
          key={mode.value}
          onClick={() => onChange(mode.value)}
          disabled={disabled}
          className={cn(
            'p-3 rounded-lg border text-left transition-all',
            value === mode.value
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <p className="text-sm font-medium text-gray-900 dark:text-white">{mode.label}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{mode.description}</p>
        </button>
      ))}
    </div>
  )
}

interface NumberInputProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  suffix?: string
  disabled?: boolean
}

function NumberInput({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
  suffix,
  disabled,
}: NumberInputProps) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm text-gray-700 dark:text-gray-300 min-w-[120px]">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Math.min(max, Math.max(min, parseInt(e.target.value) || 0)))}
          min={min}
          max={max}
          disabled={disabled}
          className="w-20 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
        />
        {suffix && <span className="text-sm text-gray-500 dark:text-gray-400">{suffix}</span>}
      </div>
    </div>
  )
}

interface ToggleRowProps {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

function ToggleRow({ label, description, checked, onChange, disabled }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={cn(
          'relative w-10 h-6 rounded-full transition-colors',
          checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span
          className={cn(
            'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
            checked ? 'left-5' : 'left-1'
          )}
        />
      </button>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AutoEnforcementSettings({
  settings: propSettings,
  policies: _policies,
  onUpdate = () => {},
  onSave = () => {},
  onReset = () => {},
  onTestRun,
  loading = false,
  saving = false,
}: AutoEnforcementSettingsProps) {
  const [showTestConfirm, setShowTestConfirm] = useState(false)

  // Default settings to prevent undefined errors
  const settings: AutoEnforcementSettingsType = propSettings || {
    id: '',
    enforcementMode: 'manual',
    enabled: false,
    // Archival settings
    archivalEnabled: true,
    archivalMode: 'automatic',
    archivalDelayDays: 0,
    archivalNotifyBeforeDays: 7,
    // Deletion settings
    deletionEnabled: false,
    deletionMode: 'approval_required',
    deletionDelayDays: 30,
    deletionNotifyBeforeDays: 14,
    deletionRequireApproval: true,
    deletionApprovers: [],
    // Grace period settings
    gracePeriodEnabled: true,
    gracePeriodDays: 30,
    // Retry settings
    retryOnFailure: true,
    maxRetries: 3,
    retryDelayMinutes: 30,
    // Exclusions
    excludeDepartments: [],
    excludeDocumentTypes: [],
    excludeConfidentialityLevels: [],
    // Schedule
    executionSchedule: {
      enabled: false,
      frequency: 'daily',
      dayOfWeek: 1,
      dayOfMonth: 1,
      timeOfDay: '02:00',
      timezone: 'UTC',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading enforcement settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Auto-Enforcement Settings
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Configure how retention policies are automatically enforced
          </p>
        </div>
        <div className="flex items-center gap-3">
          {onTestRun && (
            <button
              onClick={() => setShowTestConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Play className="w-4 h-4" />
              Test Run
            </button>
          )}
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      {/* Master Enable/Disable */}
      <div
        className={cn(
          'p-4 rounded-lg border',
          settings.enabled
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-2 rounded-lg',
                settings.enabled
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'bg-gray-200 dark:bg-gray-700'
              )}
            >
              {settings.enabled ? (
                <Play className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <Pause className="w-5 h-5 text-gray-500" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Auto-Enforcement {settings.enabled ? 'Enabled' : 'Disabled'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {settings.enabled
                  ? 'Retention policies will be automatically enforced based on your settings'
                  : 'All automatic enforcement is paused'}
              </p>
            </div>
          </div>
          <button
            onClick={() => onUpdate({ enabled: !settings.enabled })}
            className={cn(
              'relative w-12 h-7 rounded-full transition-colors',
              settings.enabled ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
            )}
          >
            <span
              className={cn(
                'absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform',
                settings.enabled ? 'left-6' : 'left-1'
              )}
            />
          </button>
        </div>
      </div>

      {/* Global Enforcement Mode */}
      <SettingsSection
        title="Default Enforcement Mode"
        description="How dispositions should be handled by default"
        icon={Settings}
        iconColor="text-blue-500"
      >
        <EnforcementModeSelect
          value={settings.enforcementMode}
          onChange={(mode) => onUpdate({ enforcementMode: mode })}
          disabled={!settings.enabled}
        />
      </SettingsSection>

      {/* Archival Settings */}
      <SettingsSection
        title="Archival Settings"
        description="Configure automatic document archival"
        icon={Archive}
        iconColor="text-blue-500"
        collapsible
      >
        <ToggleRow
          label="Enable Auto-Archival"
          description="Automatically archive documents when retention period ends"
          checked={settings.archivalEnabled}
          onChange={(checked) => onUpdate({ archivalEnabled: checked })}
          disabled={!settings.enabled}
        />

        {settings.archivalEnabled && (
          <div className="space-y-3 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
            <EnforcementModeSelect
              value={settings.archivalMode}
              onChange={(mode) => onUpdate({ archivalMode: mode })}
              disabled={!settings.enabled}
            />

            <NumberInput
              label="Delay after due date"
              value={settings.archivalDelayDays}
              onChange={(value) => onUpdate({ archivalDelayDays: value })}
              suffix="days"
              disabled={!settings.enabled}
            />

            <NumberInput
              label="Notify before archival"
              value={settings.archivalNotifyBeforeDays}
              onChange={(value) => onUpdate({ archivalNotifyBeforeDays: value })}
              suffix="days"
              disabled={!settings.enabled}
            />
          </div>
        )}
      </SettingsSection>

      {/* Deletion Settings */}
      <SettingsSection
        title="Deletion Settings"
        description="Configure automatic document deletion"
        icon={Trash2}
        iconColor="text-red-500"
        collapsible
      >
        <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg mb-4">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">
            Deletion is permanent and cannot be undone. Configure these settings carefully.
          </p>
        </div>

        <ToggleRow
          label="Enable Auto-Deletion"
          description="Automatically delete documents when retention period ends"
          checked={settings.deletionEnabled}
          onChange={(checked) => onUpdate({ deletionEnabled: checked })}
          disabled={!settings.enabled}
        />

        {settings.deletionEnabled && (
          <div className="space-y-3 pl-4 border-l-2 border-red-200 dark:border-red-800">
            <EnforcementModeSelect
              value={settings.deletionMode}
              onChange={(mode) => onUpdate({ deletionMode: mode })}
              disabled={!settings.enabled}
            />

            <NumberInput
              label="Delay after due date"
              value={settings.deletionDelayDays}
              onChange={(value) => onUpdate({ deletionDelayDays: value })}
              suffix="days"
              disabled={!settings.enabled}
            />

            <NumberInput
              label="Notify before deletion"
              value={settings.deletionNotifyBeforeDays}
              onChange={(value) => onUpdate({ deletionNotifyBeforeDays: value })}
              suffix="days"
              disabled={!settings.enabled}
            />

            <ToggleRow
              label="Require Approval for Deletions"
              description="All deletions must be approved by designated approvers"
              checked={settings.deletionRequireApproval}
              onChange={(checked) => onUpdate({ deletionRequireApproval: checked })}
              disabled={!settings.enabled}
            />

            {settings.deletionRequireApproval && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Designated Approvers
                </label>
                <div className="flex flex-wrap gap-2">
                  {settings.deletionApprovers.map((approver) => (
                    <span
                      key={approver}
                      className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                    >
                      <Users className="w-3 h-3" />
                      {approver}
                    </span>
                  ))}
                  {settings.deletionApprovers.length === 0 && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      No approvers configured
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </SettingsSection>

      {/* Grace Period Settings */}
      <SettingsSection
        title="Grace Period"
        description="Allow document owners to extend retention before action"
        icon={Clock}
        iconColor="text-orange-500"
        collapsible
      >
        <ToggleRow
          label="Enable Grace Period"
          description="Give document owners time to request extensions before disposition"
          checked={settings.gracePeriodEnabled}
          onChange={(checked) => onUpdate({ gracePeriodEnabled: checked })}
          disabled={!settings.enabled}
        />

        {settings.gracePeriodEnabled && (
          <NumberInput
            label="Grace period duration"
            value={settings.gracePeriodDays}
            onChange={(value) => onUpdate({ gracePeriodDays: value })}
            suffix="days"
            disabled={!settings.enabled}
          />
        )}
      </SettingsSection>

      {/* Retry Settings */}
      <SettingsSection
        title="Error Handling"
        description="How to handle failed enforcement attempts"
        icon={RefreshCw}
        iconColor="text-purple-500"
        collapsible
      >
        <ToggleRow
          label="Retry on Failure"
          description="Automatically retry failed disposition attempts"
          checked={settings.retryOnFailure}
          onChange={(checked) => onUpdate({ retryOnFailure: checked })}
          disabled={!settings.enabled}
        />

        {settings.retryOnFailure && (
          <div className="space-y-3 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
            <NumberInput
              label="Maximum retries"
              value={settings.maxRetries}
              onChange={(value) => onUpdate({ maxRetries: value })}
              max={10}
              disabled={!settings.enabled}
            />

            <NumberInput
              label="Retry delay"
              value={settings.retryDelayMinutes}
              onChange={(value) => onUpdate({ retryDelayMinutes: value })}
              suffix="minutes"
              disabled={!settings.enabled}
            />
          </div>
        )}
      </SettingsSection>

      {/* Execution Schedule */}
      <SettingsSection
        title="Execution Schedule"
        description="When to run automatic enforcement"
        icon={Calendar}
        iconColor="text-green-500"
        collapsible
      >
        <ToggleRow
          label="Enable Scheduled Execution"
          description="Run enforcement on a regular schedule"
          checked={settings.executionSchedule.enabled}
          onChange={(checked) =>
            onUpdate({
              executionSchedule: { ...settings.executionSchedule, enabled: checked },
            })
          }
          disabled={!settings.enabled}
        />

        {settings.executionSchedule.enabled && (
          <div className="space-y-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-700 dark:text-gray-300 min-w-[120px]">
                Frequency
              </label>
              <select
                value={settings.executionSchedule.frequency}
                onChange={(e) =>
                  onUpdate({
                    executionSchedule: {
                      ...settings.executionSchedule,
                      frequency: e.target.value as 'daily' | 'weekly' | 'monthly',
                    },
                  })
                }
                disabled={!settings.enabled}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {SCHEDULE_FREQUENCIES.map((freq) => (
                  <option key={freq.value} value={freq.value}>
                    {freq.label}
                  </option>
                ))}
              </select>
            </div>

            {settings.executionSchedule.frequency === 'weekly' && (
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-700 dark:text-gray-300 min-w-[120px]">
                  Day of week
                </label>
                <select
                  value={settings.executionSchedule.dayOfWeek ?? 1}
                  onChange={(e) =>
                    onUpdate({
                      executionSchedule: {
                        ...settings.executionSchedule,
                        dayOfWeek: parseInt(e.target.value),
                      },
                    })
                  }
                  disabled={!settings.enabled}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {settings.executionSchedule.frequency === 'monthly' && (
              <NumberInput
                label="Day of month"
                value={settings.executionSchedule.dayOfMonth ?? 1}
                onChange={(value) =>
                  onUpdate({
                    executionSchedule: {
                      ...settings.executionSchedule,
                      dayOfMonth: value,
                    },
                  })
                }
                min={1}
                max={28}
                disabled={!settings.enabled}
              />
            )}

            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-700 dark:text-gray-300 min-w-[120px]">
                Time of day
              </label>
              <input
                type="time"
                value={settings.executionSchedule.timeOfDay}
                onChange={(e) =>
                  onUpdate({
                    executionSchedule: {
                      ...settings.executionSchedule,
                      timeOfDay: e.target.value,
                    },
                  })
                }
                disabled={!settings.enabled}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            {settings.executionSchedule.lastRun && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Info className="w-4 h-4" />
                Last run: {new Date(settings.executionSchedule.lastRun).toLocaleString()}
              </div>
            )}

            {settings.executionSchedule.nextRun && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                Next run: {new Date(settings.executionSchedule.nextRun).toLocaleString()}
              </div>
            )}
          </div>
        )}
      </SettingsSection>

      {/* Exclusions */}
      <SettingsSection
        title="Exclusions"
        description="Exclude certain items from automatic enforcement"
        icon={Shield}
        iconColor="text-gray-500"
        collapsible
        defaultExpanded={false}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Excluded Departments
            </label>
            <div className="flex flex-wrap gap-2">
              {settings.excludeDepartments.map((dept) => (
                <span
                  key={dept}
                  className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                >
                  {dept}
                </span>
              ))}
              {settings.excludeDepartments.length === 0 && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  No departments excluded
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Excluded Document Types
            </label>
            <div className="flex flex-wrap gap-2">
              {settings.excludeDocumentTypes.map((type) => (
                <span
                  key={type}
                  className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                >
                  <FileType className="w-3 h-3" />
                  {type}
                </span>
              ))}
              {settings.excludeDocumentTypes.length === 0 && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  No document types excluded
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Excluded Confidentiality Levels
            </label>
            <div className="flex flex-wrap gap-2">
              {settings.excludeConfidentialityLevels.map((level) => (
                <span
                  key={level}
                  className="inline-flex items-center gap-1 px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                >
                  {level}
                </span>
              ))}
              {settings.excludeConfidentialityLevels.length === 0 && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  No confidentiality levels excluded
                </span>
              )}
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Test Run Confirmation Modal */}
      {showTestConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <Play className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Run Test?</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This will simulate enforcement without making any actual changes. You can review what
              would happen before enabling auto-enforcement.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowTestConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onTestRun?.(true)
                  setShowTestConfirm(false)
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Run Dry Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AutoEnforcementSettings
