/**
 * SortFilterBar Component
 * Provides sorting, filtering, and view mode controls for file lists
 */

import { FC, Fragment, useState } from 'react'
import { Menu, Transition, Popover } from '@headlessui/react'
import {
  Squares2X2Icon,
  ListBulletIcon,
  FunnelIcon,
  XMarkIcon,
  ChevronDownIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'
import type { SortFilterBarProps, SortField, SortOrder, FilterOptions } from '@/types/fileManagement'
import { SORT_OPTIONS } from '@/types/fileManagement'

export const SortFilterBar: FC<SortFilterBarProps> = ({
  sortBy,
  sortOrder,
  filters,
  viewMode,
  itemCount,
  selectedCount = 0,
  onSortChange,
  onFilterChange,
  onViewModeChange,
  onClearFilters,
  showViewToggle = true,
  className,
}) => {
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filters)

  const activeFilterCount = Object.values(filters).filter((value) => {
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'object') return Object.keys(value).length > 0
    return value !== undefined && value !== null
  }).length

  const currentSortOption = SORT_OPTIONS.find(
    (opt) => opt.field === sortBy && opt.order === sortOrder
  )

  const handleSortChange = (field: SortField, order: SortOrder) => {
    onSortChange(field, order)
  }

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleClearFilters = () => {
    const emptyFilters: FilterOptions = {}
    setLocalFilters(emptyFilters)
    onFilterChange(emptyFilters)
    if (onClearFilters) {
      onClearFilters()
    }
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {/* Left side - Item count and selection */}
      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {selectedCount > 0 ? (
            <span className="font-medium text-primary-600 dark:text-primary-400">
              {selectedCount} of {itemCount} selected
            </span>
          ) : (
            <span>{itemCount} items</span>
          )}
        </div>
      </div>

      {/* Right side - Controls */}
      <div className="flex items-center gap-2">
        {/* Sort Menu */}
        <Menu as="div" className="relative">
          <Menu.Button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors border border-gray-200 dark:border-gray-700">
            <AdjustmentsHorizontalIcon className="w-4 h-4" />
            <span className="hidden sm:inline">{currentSortOption?.label || 'Sort'}</span>
            <ChevronDownIcon className="w-4 h-4" />
          </Menu.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
              <div className="py-1">
                {SORT_OPTIONS.map((option) => (
                  <Menu.Item key={`${option.field}-${option.order}`}>
                    {({ active }) => (
                      <button
                        onClick={() => handleSortChange(option.field, option.order)}
                        className={cn(
                          'flex items-center w-full px-4 py-2 text-sm',
                          active
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                            : 'text-gray-700 dark:text-gray-300',
                          option.field === sortBy && option.order === sortOrder &&
                            'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
                        )}
                      >
                        {option.label}
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </div>
            </Menu.Items>
          </Transition>
        </Menu>

        {/* Filter Popover */}
        <Popover className="relative">
          {({ open }) => (
            <>
              <Popover.Button
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors border',
                  activeFilterCount > 0
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-800'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700'
                )}
              >
                <FunnelIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Filter</span>
                {activeFilterCount > 0 && (
                  <span className="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-primary-600 text-white">
                    {activeFilterCount}
                  </span>
                )}
              </Popover.Button>

              <Transition
                as={Fragment}
                enter="transition ease-out duration-200"
                enterFrom="opacity-0 translate-y-1"
                enterTo="opacity-100 translate-y-0"
                leave="transition ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-1"
              >
                <Popover.Panel className="absolute right-0 mt-2 w-80 origin-top-right rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Filter Options
                      </h3>
                      {activeFilterCount > 0 && (
                        <button
                          onClick={handleClearFilters}
                          className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    {/* Document Types */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Document Type
                      </label>
                      <select
                        multiple
                        value={localFilters.documentTypes || []}
                        onChange={(e) =>
                          handleFilterChange(
                            'documentTypes',
                            Array.from(e.target.selectedOptions, (option) => option.value)
                          )
                        }
                        className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                        size={3}
                      >
                        <option value="Invoice">Invoice</option>
                        <option value="Contract">Contract</option>
                        <option value="Report">Report</option>
                        <option value="KYC Record">KYC Record</option>
                        <option value="Identification">Identification</option>
                        <option value="Statement">Statement</option>
                      </select>
                    </div>

                    {/* Confidentiality Levels */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Confidentiality
                      </label>
                      <div className="space-y-2">
                        {['Public', 'Internal', 'Confidential', 'Highly Confidential'].map((level) => (
                          <label key={level} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={(localFilters.confidentialityLevels || []).includes(level)}
                              onChange={(e) => {
                                const current = localFilters.confidentialityLevels || []
                                const newLevels = e.target.checked
                                  ? [...current, level]
                                  : current.filter((l) => l !== level)
                                handleFilterChange('confidentialityLevels', newLevels)
                              }}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{level}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Date Range */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Date Range
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={localFilters.dateRange?.from || ''}
                          onChange={(e) =>
                            handleFilterChange('dateRange', {
                              ...localFilters.dateRange,
                              from: e.target.value,
                            })
                          }
                          className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                          placeholder="From"
                        />
                        <input
                          type="date"
                          value={localFilters.dateRange?.to || ''}
                          onChange={(e) =>
                            handleFilterChange('dateRange', {
                              ...localFilters.dateRange,
                              to: e.target.value,
                            })
                          }
                          className="rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                          placeholder="To"
                        />
                      </div>
                    </div>

                    {/* Additional Filters */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={localFilters.hasVersions || false}
                          onChange={(e) => handleFilterChange('hasVersions', e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Has versions</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={localFilters.isShared || false}
                          onChange={(e) => handleFilterChange('isShared', e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Shared with me</span>
                      </label>
                    </div>
                  </div>
                </Popover.Panel>
              </Transition>
            </>
          )}
        </Popover>

        {/* View Mode Toggle */}
        {showViewToggle && (
          <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-md">
            <button
              onClick={() => onViewModeChange('grid')}
              className={cn(
                'p-2 rounded transition-colors',
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              )}
              title="Grid view"
            >
              <Squares2X2Icon className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={cn(
                'p-2 rounded transition-colors',
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              )}
              title="List view"
            >
              <ListBulletIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
