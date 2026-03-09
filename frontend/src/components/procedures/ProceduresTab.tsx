/**
 * ProceduresTab — Main procedures tab embedded in WorkflowCenterPage.
 */

import { useState, useEffect, useCallback } from 'react'
import { Plus, Loader2, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ProcedureCard } from './ProcedureCard'
import { ProcedureFilters } from './ProcedureFilters'
import { listProcedures } from '@/services/procedureService'
import type { Procedure, ProcedureFilters as Filters } from '@/types/procedure'

export function ProceduresTab() {
  const navigate = useNavigate()
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>({ state: '', department: '', search: '' })

  const loadProcedures = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const cleanFilters: Record<string, string> = {}
      if (filters.state) cleanFilters.state = filters.state
      if (filters.department) cleanFilters.department = filters.department
      if (filters.search) cleanFilters.search = filters.search

      const data = await listProcedures(cleanFilters as Filters)
      setProcedures(data.results)
    } catch (err: any) {
      console.error('Failed to load procedures:', err)
      setError(err?.response?.data?.detail || 'Failed to load procedures')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    const debounce = setTimeout(loadProcedures, 300)
    return () => clearTimeout(debounce)
  }, [loadProcedures])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Procedures</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage and track operational procedures
          </p>
        </div>
        <button
          onClick={() => navigate('/procedures/new')}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Procedure
        </button>
      </div>

      {/* Filters */}
      <ProcedureFilters filters={filters} onChange={setFilters} />

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          <span className="ml-2 text-sm text-gray-500">Loading procedures...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertTriangle className="h-8 w-8 text-red-400" />
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={loadProcedures}
            className="mt-3 text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            Try again
          </button>
        </div>
      ) : procedures.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-12 dark:border-gray-600">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filters.search || filters.state
              ? 'No procedures match your filters.'
              : 'No procedures yet. Create your first one!'}
          </p>
          {!filters.search && !filters.state && (
            <button
              onClick={() => navigate('/procedures/new')}
              className="mt-3 flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              <Plus className="h-3 w-3" />
              Create procedure
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {procedures.map((proc) => (
            <ProcedureCard
              key={proc.id}
              procedure={proc}
              onClick={() => navigate(`/procedures/${proc.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
