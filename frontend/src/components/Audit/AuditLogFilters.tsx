/**
 * AuditLogFilters Component
 * Advanced filtering interface for audit logs
 */

import { FC, useState } from 'react'
import { XMarkIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'
import type { AuditLogFiltersProps, AuditActionType, ResourceType, AuditOutcome, AuditSeverity } from '@/types/audit'
import {
  ACTION_TYPE_LABELS,
  RESOURCE_TYPE_LABELS,
  OUTCOME_LABELS,
  SEVERITY_LABELS,
  getActionCategory,
  ACTION_TYPE_CATEGORIES,
} from '@/types/audit'

export const AuditLogFilters: FC<AuditLogFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  availableUsers,
  availableResources,
  className,
}) => {
  const [activeSection, setActiveSection] = useState<string | null>('dateRange')

  const handleFilterChange = (key: keyof typeof filters, value: unknown) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    })
  }

  const handleActionTypeToggle = (actionType: AuditActionType) => {
    const currentTypes = filters.actionTypes || []
    const newTypes = currentTypes.includes(actionType)
      ? currentTypes.filter((t) => t !== actionType)
      : [...currentTypes, actionType]

    handleFilterChange('actionTypes', newTypes.length > 0 ? newTypes : undefined)
  }

  const handleResourceTypeToggle = (resourceType: ResourceType) => {
    const currentTypes = filters.resourceTypes || []
    const newTypes = currentTypes.includes(resourceType)
      ? currentTypes.filter((t) => t !== resourceType)
      : [...currentTypes, resourceType]

    handleFilterChange('resourceTypes', newTypes.length > 0 ? newTypes : undefined)
  }

  const handleOutcomeToggle = (outcome: AuditOutcome) => {
    const currentOutcomes = filters.outcomes || []
    const newOutcomes = currentOutcomes.includes(outcome)
      ? currentOutcomes.filter((o) => o !== outcome)
      : [...currentOutcomes, outcome]

    handleFilterChange('outcomes', newOutcomes.length > 0 ? newOutcomes : undefined)
  }

  const handleSeverityToggle = (severity: AuditSeverity) => {
    const currentSeverities = filters.severities || []
    const newSeverities = currentSeverities.includes(severity)
      ? currentSeverities.filter((s) => s !== severity)
      : [...currentSeverities, severity]

    handleFilterChange('severities', newSeverities.length > 0 ? newSeverities : undefined)
  }

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter((value) => {
      if (Array.isArray(value)) return value.length > 0
      return value !== undefined && value !== null && value !== ''
    }).length
  }

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section)
  }

  // Group action types by category
  const groupedActionTypes = Object.entries(ACTION_TYPE_LABELS).reduce(
    (groups, [action, label]) => {
      const category = getActionCategory(action as AuditActionType)
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push({ action: action as AuditActionType, label })
      return groups
    },
    {} as Record<string, Array<{ action: AuditActionType; label: string }>>
  )

  return (
    <div className={cn('bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filters</h3>
            {getActiveFiltersCount() > 0 && (
              <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs font-medium rounded-full">
                {getActiveFiltersCount()} active
              </span>
            )}
          </div>

          {getActiveFiltersCount() > 0 && (
            <button
              onClick={onClearFilters}
              className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Filter Sections */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {/* Date Range */}
        <div className="p-4">
          <button
            onClick={() => toggleSection('dateRange')}
            className="w-full flex items-center justify-between text-left"
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Date Range</span>
            <XMarkIcon
              className={cn(
                'w-4 h-4 text-gray-400 transition-transform',
                activeSection === 'dateRange' ? 'rotate-0' : 'rotate-45'
              )}
            />
          </button>

          {activeSection === 'dateRange' && (
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">From</label>
                <input
                  type="datetime-local"
                  value={filters.dateFrom || ''}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">To</label>
                <input
                  type="datetime-local"
                  value={filters.dateTo || ''}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Types */}
        <div className="p-4">
          <button
            onClick={() => toggleSection('actionTypes')}
            className="w-full flex items-center justify-between text-left"
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Action Types
              {filters.actionTypes && filters.actionTypes.length > 0 && (
                <span className="ml-2 text-xs text-gray-500">({filters.actionTypes.length})</span>
              )}
            </span>
            <XMarkIcon
              className={cn(
                'w-4 h-4 text-gray-400 transition-transform',
                activeSection === 'actionTypes' ? 'rotate-0' : 'rotate-45'
              )}
            />
          </button>

          {activeSection === 'actionTypes' && (
            <div className="mt-3 space-y-4 max-h-96 overflow-y-auto">
              {Object.entries(groupedActionTypes).map(([category, actions]) => (
                <div key={category}>
                  <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    {ACTION_TYPE_CATEGORIES[category as keyof typeof ACTION_TYPE_CATEGORIES]}
                  </h4>
                  <div className="space-y-2">
                    {actions.map(({ action, label }) => (
                      <label key={action} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={filters.actionTypes?.includes(action) || false}
                          onChange={() => handleActionTypeToggle(action)}
                          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resource Types */}
        <div className="p-4">
          <button
            onClick={() => toggleSection('resourceTypes')}
            className="w-full flex items-center justify-between text-left"
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Resource Types
              {filters.resourceTypes && filters.resourceTypes.length > 0 && (
                <span className="ml-2 text-xs text-gray-500">({filters.resourceTypes.length})</span>
              )}
            </span>
            <XMarkIcon
              className={cn(
                'w-4 h-4 text-gray-400 transition-transform',
                activeSection === 'resourceTypes' ? 'rotate-0' : 'rotate-45'
              )}
            />
          </button>

          {activeSection === 'resourceTypes' && (
            <div className="mt-3 space-y-2">
              {Object.entries(RESOURCE_TYPE_LABELS).map(([type, label]) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.resourceTypes?.includes(type as ResourceType) || false}
                    onChange={() => handleResourceTypeToggle(type as ResourceType)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Outcomes */}
        <div className="p-4">
          <button
            onClick={() => toggleSection('outcomes')}
            className="w-full flex items-center justify-between text-left"
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Outcomes
              {filters.outcomes && filters.outcomes.length > 0 && (
                <span className="ml-2 text-xs text-gray-500">({filters.outcomes.length})</span>
              )}
            </span>
            <XMarkIcon
              className={cn(
                'w-4 h-4 text-gray-400 transition-transform',
                activeSection === 'outcomes' ? 'rotate-0' : 'rotate-45'
              )}
            />
          </button>

          {activeSection === 'outcomes' && (
            <div className="mt-3 space-y-2">
              {Object.entries(OUTCOME_LABELS).map(([outcome, label]) => (
                <label key={outcome} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.outcomes?.includes(outcome as AuditOutcome) || false}
                    onChange={() => handleOutcomeToggle(outcome as AuditOutcome)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Severity Levels */}
        <div className="p-4">
          <button
            onClick={() => toggleSection('severities')}
            className="w-full flex items-center justify-between text-left"
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Severity Levels
              {filters.severities && filters.severities.length > 0 && (
                <span className="ml-2 text-xs text-gray-500">({filters.severities.length})</span>
              )}
            </span>
            <XMarkIcon
              className={cn(
                'w-4 h-4 text-gray-400 transition-transform',
                activeSection === 'severities' ? 'rotate-0' : 'rotate-45'
              )}
            />
          </button>

          {activeSection === 'severities' && (
            <div className="mt-3 space-y-2">
              {Object.entries(SEVERITY_LABELS).map(([severity, label]) => (
                <label key={severity} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.severities?.includes(severity as AuditSeverity) || false}
                    onChange={() => handleSeverityToggle(severity as AuditSeverity)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* User Filter */}
        {availableUsers && availableUsers.length > 0 && (
          <div className="p-4">
            <button
              onClick={() => toggleSection('user')}
              className="w-full flex items-center justify-between text-left"
            >
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">User</span>
              <XMarkIcon
                className={cn(
                  'w-4 h-4 text-gray-400 transition-transform',
                  activeSection === 'user' ? 'rotate-0' : 'rotate-45'
                )}
              />
            </button>

            {activeSection === 'user' && (
              <div className="mt-3">
                <select
                  value={filters.userId || ''}
                  onChange={(e) => handleFilterChange('userId', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Users</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* IP Address Filter */}
        <div className="p-4">
          <button
            onClick={() => toggleSection('ipAddress')}
            className="w-full flex items-center justify-between text-left"
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">IP Address</span>
            <XMarkIcon
              className={cn(
                'w-4 h-4 text-gray-400 transition-transform',
                activeSection === 'ipAddress' ? 'rotate-0' : 'rotate-45'
              )}
            />
          </button>

          {activeSection === 'ipAddress' && (
            <div className="mt-3">
              <input
                type="text"
                placeholder="e.g., 192.168.1.1"
                value={filters.ipAddress || ''}
                onChange={(e) => handleFilterChange('ipAddress', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
