/**
 * AdvancedSearchModal Component
 * Modal for constructing advanced search queries
 */

import { FC, Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import type { AdvancedSearchModalProps, SearchQuery, SearchFilters } from '@/types/search'
import { DEFAULT_SEARCH_QUERY, DATE_RANGE_PRESETS } from '@/types/search'
import { Input } from '@components/Input/Input'
import { Select } from '@components/Input/Select'

export const AdvancedSearchModal: FC<AdvancedSearchModalProps> = ({
  isOpen,
  onClose,
  onSearch,
  initialQuery,
  availableFolders = [],
  availableDepartments = [],
}) => {
  const [query, setQuery] = useState<SearchQuery>({
    ...DEFAULT_SEARCH_QUERY,
    ...initialQuery,
  })

  const [filters, setFilters] = useState<SearchFilters>(initialQuery?.filters || {})

  const handleQueryChange = (field: keyof SearchQuery, value: unknown) => {
    setQuery({ ...query, [field]: value })
  }

  const handleFilterChange = (field: keyof SearchFilters, value: unknown) => {
    setFilters({ ...filters, [field]: value })
  }

  const handleArrayFilterChange = (field: keyof SearchFilters, value: string) => {
    const current = (filters[field] as string[]) || []
    if (current.includes(value)) {
      handleFilterChange(
        field,
        current.filter((v) => v !== value)
      )
    } else {
      handleFilterChange(field, [...current, value])
    }
  }

  const handleSearch = () => {
    const searchQuery: SearchQuery = {
      ...query,
      mode: 'advanced',
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    }
    onSearch(searchQuery)
    onClose()
  }

  const handleClearFilters = () => {
    setFilters({})
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-lg bg-white dark:bg-gray-900 shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Advanced Search
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Search Query */}
                  <div>
                    <Input
                      label="Search Query"
                      value={query.query}
                      onChange={(e) => handleQueryChange('query', e.target.value)}
                      placeholder="Enter your search terms..."
                      helperText="Use quotes for exact phrases, OR/AND for boolean logic"
                    />
                  </div>

                  {/* Scope */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Select
                        label="Search Scope"
                        value={query.scope}
                        onChange={(e) => handleQueryChange('scope', e.target.value)}
                      >
                        <option value="all">All Documents</option>
                        <option value="folder">Specific Folder</option>
                        <option value="department">Specific Department</option>
                      </Select>
                    </div>

                    {query.scope === 'folder' && (
                      <div>
                        <Select
                          label="Folder"
                          value={query.folderId || ''}
                          onChange={(e) => handleQueryChange('folderId', e.target.value)}
                        >
                          <option value="">Select folder...</option>
                          {availableFolders.map((folder) => (
                            <option key={folder.id} value={folder.id}>
                              {folder.path}
                            </option>
                          ))}
                        </Select>
                      </div>
                    )}

                    {query.scope === 'department' && (
                      <div>
                        <Select
                          label="Department"
                          value={query.departmentId || ''}
                          onChange={(e) => handleQueryChange('departmentId', e.target.value)}
                        >
                          <option value="">Select department...</option>
                          {availableDepartments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Filters Section */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Filters
                      </h3>
                      <button
                        onClick={handleClearFilters}
                        className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        Clear all filters
                      </button>
                    </div>

                    <div className="space-y-4">
                      {/* Document Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Document Type
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            'Invoice',
                            'Contract',
                            'Report',
                            'KYC Record',
                            'Identification',
                            'Statement',
                          ].map((type) => (
                            <label key={type} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={(filters.documentTypes || []).includes(type)}
                                onChange={() => handleArrayFilterChange('documentTypes', type)}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {type}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Confidentiality */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Confidentiality Level
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {['Public', 'Internal', 'Confidential', 'Highly Confidential'].map(
                            (level) => (
                              <label key={level} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={(filters.confidentialityLevels || []).includes(level)}
                                  onChange={() =>
                                    handleArrayFilterChange('confidentialityLevels', level)
                                  }
                                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  {level}
                                </span>
                              </label>
                            )
                          )}
                        </div>
                      </div>

                      {/* Date Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Date Range (Modified)
                        </label>
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          {DATE_RANGE_PRESETS.slice(0, 6).map((preset) => (
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
                              className="px-3 py-2 text-xs font-medium border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            type="date"
                            label="From"
                            value={filters.modifiedDateRange?.from || ''}
                            onChange={(e) =>
                              handleFilterChange('modifiedDateRange', {
                                ...filters.modifiedDateRange,
                                from: e.target.value,
                              })
                            }
                          />
                          <Input
                            type="date"
                            label="To"
                            value={filters.modifiedDateRange?.to || ''}
                            onChange={(e) =>
                              handleFilterChange('modifiedDateRange', {
                                ...filters.modifiedDateRange,
                                to: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>

                      {/* File Size */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          File Size (MB)
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            type="number"
                            label="Min"
                            value={
                              filters.sizeRange?.min ? filters.sizeRange.min / (1024 * 1024) : ''
                            }
                            onChange={(e) =>
                              handleFilterChange('sizeRange', {
                                ...filters.sizeRange,
                                min: e.target.value
                                  ? parseFloat(e.target.value) * 1024 * 1024
                                  : undefined,
                              })
                            }
                            placeholder="0"
                          />
                          <Input
                            type="number"
                            label="Max"
                            value={
                              filters.sizeRange?.max ? filters.sizeRange.max / (1024 * 1024) : ''
                            }
                            onChange={(e) =>
                              handleFilterChange('sizeRange', {
                                ...filters.sizeRange,
                                max: e.target.value
                                  ? parseFloat(e.target.value) * 1024 * 1024
                                  : undefined,
                              })
                            }
                            placeholder="500"
                          />
                        </div>
                      </div>

                      {/* Status Filters */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Status
                        </label>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={filters.hasVersions || false}
                              onChange={(e) =>
                                handleFilterChange('hasVersions', e.target.checked || undefined)
                              }
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              Has versions
                            </span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={filters.isShared || false}
                              onChange={(e) =>
                                handleFilterChange('isShared', e.target.checked || undefined)
                              }
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              Shared with me
                            </span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={filters.isLocked || false}
                              onChange={(e) =>
                                handleFilterChange('isLocked', e.target.checked || undefined)
                              }
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Locked</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSearch}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                  >
                    <MagnifyingGlassIcon className="w-4 h-4" />
                    Search
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
