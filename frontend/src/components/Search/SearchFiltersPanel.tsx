/**
 * SearchFiltersPanel Component
 * Faceted search filters panel
 */

import { FC, useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'
import type { SearchFiltersPanelProps, SearchFilters, FacetCount } from '@/types/search'
import { FILE_SIZE_RANGES, DATE_RANGE_PRESETS } from '@/types/search'
import { DatePicker } from '@/components/UI/DatePicker'

export const SearchFiltersPanel: FC<SearchFiltersPanelProps> = ({
  filters,
  facets,
  onFilterChange,
  onClearFilters,
  isCollapsible = false,
  defaultCollapsed = false,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['documentTypes', 'confidentialityLevels', 'dateRange'])
  )

  const activeFilterCount = Object.values(filters).filter((value) => {
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'object') return Object.keys(value).length > 0
    return value !== undefined && value !== null
  }).length

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const handleFilterChange = (key: keyof SearchFilters, value: unknown) => {
    const newFilters = { ...filters, [key]: value }
    onFilterChange(newFilters)
  }

  const handleCheckboxChange = (key: keyof SearchFilters, value: string, checked: boolean) => {
    const current = (filters[key] as string[]) || []
    const updated = checked ? [...current, value] : current.filter((v) => v !== value)
    handleFilterChange(key, updated.length > 0 ? updated : undefined)
  }

  const renderFilterSection = (title: string, key: string, content: React.ReactNode) => {
    const isExpanded = expandedSections.has(key)

    return (
      <div className="border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => toggleSection(key)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</span>
          {isExpanded ? (
            <ChevronUpIcon className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDownIcon className="w-4 h-4 text-gray-500" />
          )}
        </button>

        {isExpanded && <div className="px-4 pb-4 space-y-2">{content}</div>}
      </div>
    )
  }

  const renderFacetCheckboxes = (
    facetKey: keyof SearchFilters,
    facetCounts: FacetCount[] | undefined
  ) => {
    if (!facetCounts) return null

    return facetCounts.map((facet) => (
      <label
        key={facet.value}
        className="flex items-center justify-between gap-2 cursor-pointer group"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <input
            type="checkbox"
            checked={((filters[facetKey] as string[]) || []).includes(facet.value)}
            onChange={(e) => handleCheckboxChange(facetKey, facet.value, e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400">
            {facet.label || facet.value}
          </span>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
          {facet.count}
        </span>
      </label>
    ))
  }

  if (isCollapsible && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={cn(
          'flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
          className
        )}
      >
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Show Filters</span>
        {activeFilterCount > 0 && (
          <span className="px-2 py-0.5 bg-primary-600 text-white text-xs font-semibold rounded-full">
            {activeFilterCount}
          </span>
        )}
      </button>
    )
  }

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Filters</h3>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 bg-primary-600 text-white text-xs font-semibold rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {activeFilterCount > 0 && onClearFilters && (
            <button
              onClick={onClearFilters}
              className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
            >
              Clear all
            </button>
          )}
          {isCollapsible && (
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            >
              <XMarkIcon className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Sections */}
      <div>
        {/* Document Types */}
        {renderFilterSection(
          'Document Type',
          'documentTypes',
          renderFacetCheckboxes('documentTypes', facets?.documentTypes)
        )}

        {/* Confidentiality Levels */}
        {renderFilterSection(
          'Confidentiality',
          'confidentialityLevels',
          renderFacetCheckboxes('confidentialityLevels', facets?.confidentialityLevels)
        )}

        {/* Departments */}
        {facets?.departments &&
          facets.departments.length > 0 &&
          renderFilterSection(
            'Department',
            'departments',
            renderFacetCheckboxes('departments', facets.departments)
          )}

        {/* File Types */}
        {facets?.fileTypes &&
          facets.fileTypes.length > 0 &&
          renderFilterSection(
            'File Type',
            'fileTypes',
            renderFacetCheckboxes('extensions', facets.fileTypes)
          )}

        {/* Date Range */}
        {renderFilterSection(
          'Date Modified',
          'dateRange',
          <>
            {/* Quick Date Presets */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {DATE_RANGE_PRESETS.map((preset) => {
                const isActive = (() => {
                  if (!filters.modifiedDateRange?.from) return false
                  const fromDate = new Date(filters.modifiedDateRange.from)
                  const expectedFrom = new Date()
                  expectedFrom.setDate(expectedFrom.getDate() - preset.days)
                  // Check if dates are within 1 day of each other (to account for time differences)
                  return Math.abs(fromDate.getTime() - expectedFrom.getTime()) < 86400000
                })()

                return (
                  <button
                    key={preset.label}
                    onClick={() => {
                      const from = new Date()
                      from.setDate(from.getDate() - preset.days)
                      handleFilterChange('modifiedDateRange', {
                        from: from.toISOString().split('T')[0],
                        to: new Date().toISOString().split('T')[0],
                      })
                    }}
                    className={cn(
                      'px-2.5 py-1 text-xs font-medium rounded-full transition-all duration-200',
                      isActive
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-primary-100 dark:hover:bg-primary-900/30 hover:text-primary-700 dark:hover:text-primary-400'
                    )}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>

            {/* Custom Date Range */}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
                Custom Range
              </p>
              <div className="space-y-3">
                {/* From Date */}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                    From
                  </label>
                  <DatePicker
                    value={filters.modifiedDateRange?.from || ''}
                    onChange={(date) =>
                      handleFilterChange('modifiedDateRange', {
                        ...filters.modifiedDateRange,
                        from: date,
                      })
                    }
                    placeholder="Start date"
                    maxDate={filters.modifiedDateRange?.to}
                  />
                </div>

                {/* To Date */}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                    To
                  </label>
                  <DatePicker
                    value={filters.modifiedDateRange?.to || ''}
                    onChange={(date) =>
                      handleFilterChange('modifiedDateRange', {
                        ...filters.modifiedDateRange,
                        to: date,
                      })
                    }
                    placeholder="End date"
                    minDate={filters.modifiedDateRange?.from}
                  />
                </div>

                {/* Clear Date Filter Button */}
                {(filters.modifiedDateRange?.from || filters.modifiedDateRange?.to) && (
                  <button
                    onClick={() => handleFilterChange('modifiedDateRange', undefined)}
                    className="w-full px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    Clear date filter
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* File Size */}
        {facets?.sizeRanges &&
          renderFilterSection(
            'File Size',
            'fileSize',
            Object.entries(FILE_SIZE_RANGES).map(([key, range]) => (
              <label
                key={key}
                className="flex items-center justify-between gap-2 cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                    {range.label}
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {facets.sizeRanges[key as keyof typeof facets.sizeRanges] || 0}
                </span>
              </label>
            ))
          )}

        {/* Status Filters */}
        {renderFilterSection(
          'Status',
          'status',
          <>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasVersions || false}
                onChange={(e) => handleFilterChange('hasVersions', e.target.checked || undefined)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Has versions</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.isShared || false}
                onChange={(e) => handleFilterChange('isShared', e.target.checked || undefined)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Shared with me</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.isLocked || false}
                onChange={(e) => handleFilterChange('isLocked', e.target.checked || undefined)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Locked</span>
            </label>
          </>
        )}
      </div>
    </div>
  )
}
