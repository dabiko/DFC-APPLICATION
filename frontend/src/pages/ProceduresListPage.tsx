/**
 * ProceduresListPage — Standalone page listing all procedures.
 *
 * Route: /procedures
 * Available to all authenticated users (trainees browse published procedures here).
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLogout } from '@/hooks/useLogout'
import { ClipboardList, Plus, Loader2, AlertTriangle, RefreshCw } from 'lucide-react'
import { ThreePanelLayout } from '@/components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import { ProcedureCard } from '@/components/procedures/ProcedureCard'
import { ProcedureFilters } from '@/components/procedures/ProcedureFilters'
import { authService } from '@/services/auth.service'
import { listProcedures } from '@/services/procedureService'
import type { Procedure, ProcedureFilters as Filters } from '@/types/procedure'

export function ProceduresListPage() {
  const navigate = useNavigate()
  const handleLogout = useLogout()
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>({ state: '', department: '', search: '' })

  const userData = authService.getUser()
  const user = {
    firstName: userData?.first_name || 'User',
    lastName: userData?.last_name || '',
    email: userData?.email || '',
    is_staff: userData?.is_staff || false,
    is_superuser: userData?.is_superuser || false,
  }

  const isAdmin = user.is_staff || user.is_superuser

  const loadProcedures = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const cleanFilters: Record<string, string> = {}
      if (filters.state) cleanFilters.state = filters.state
      if (filters.department) cleanFilters.department = filters.department
      if (filters.search) cleanFilters.search = filters.search

      const data = await listProcedures(cleanFilters as Filters)
      const items = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []
      setProcedures(items)
    } catch (err: any) {
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
    <ThreePanelLayout
      header={<DashboardHeader user={user} notifications={[]} onLogout={handleLogout} />}
      leftPanel={<DashboardSidebar />}
      leftPanelWidth="auto"
      collapsibleLeft={false}
      centerPanel={
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
          {/* Page Header */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <ClipboardList className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Procedures
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Browse and manage operational procedures
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadProcedures}
                  className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                {isAdmin && (
                  <button
                    onClick={() => navigate('/procedures/new')}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    New Procedure
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-4xl mx-auto space-y-4">
              <ProcedureFilters filters={filters} onChange={setFilters} />

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
                  <ClipboardList className="h-10 w-10 text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {filters.search || filters.state
                      ? 'No procedures match your filters.'
                      : 'No procedures available.'}
                  </p>
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
          </div>
        </div>
      }
    />
  )
}

export default ProceduresListPage
