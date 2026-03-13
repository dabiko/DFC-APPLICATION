/**
 * ProcedureFilters — State, department, and search filters.
 */

import { useState } from 'react'
import { Search, Filter, X } from 'lucide-react'
import type { ProcedureFilters as Filters } from '@/types/procedure'
import { ProcedureState } from '@/types/procedure'

interface ProcedureFiltersProps {
  filters: Filters
  onChange: (filters: Filters) => void
}

const stateOptions = [
  { value: '', label: 'All States' },
  { value: ProcedureState.DRAFT, label: 'Draft' },
  { value: ProcedureState.IN_REVIEW, label: 'In Review' },
  { value: ProcedureState.APPROVED, label: 'Approved' },
  { value: ProcedureState.PUBLISHED, label: 'Published' },
  { value: ProcedureState.RETIRED, label: 'Retired' },
]

export function ProcedureFilters({ filters, onChange }: ProcedureFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)

  const hasActiveFilters = filters.state || filters.department

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search procedures..."
            value={filters.search || ''}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
          />
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
            hasActiveFilters
              ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
          }`}
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">
              {[filters.state, filters.department].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Filter row */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
          <select
            value={filters.state || ''}
            onChange={(e) => onChange({ ...filters, state: e.target.value as Filters['state'] })}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          >
            {stateOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={() => onChange({ search: filters.search })}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500"
            >
              <X className="h-3 w-3" />
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}
