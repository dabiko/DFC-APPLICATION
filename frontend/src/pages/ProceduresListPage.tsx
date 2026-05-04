/**
 * ProceduresListPage — Standalone page listing all procedures.
 *
 * Route: /procedures
 * Available to all authenticated users (trainees browse published procedures here).
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLogout } from '@/hooks/useLogout'
import {
  ClipboardList,
  Plus,
  Loader2,
  RefreshCw,
  List,
  Grid3X3,
  FileText,
  Clock,
  User,
  Layers,
  Building2,
  ArrowRight,
} from 'lucide-react'
import { ThreePanelLayout } from '@/components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import { ProcedureCard } from '@/components/procedures/ProcedureCard'
import { ProcedureFilters } from '@/components/procedures/ProcedureFilters'
import { ProcedureStatusBadge } from '@/components/procedures/ProcedureStatusBadge'
import { ErrorState } from '@/components/common'
import { htmlToPlainSnippet } from '@/components/RichText'
import { authService } from '@/services/auth.service'
import { listProcedures } from '@/services/procedureService'
import { usePermissions } from '@/contexts/PermissionContext'
import type { Procedure, ProcedureFilters as Filters } from '@/types/procedure'
import { cn } from '@/utils/cn'

// ============================================================================
// GRID CARD COMPONENT
// ============================================================================

function ProcedureGridCard({ procedure, onClick }: { procedure: Procedure; onClick: () => void }) {
  const timeAgo = formatRelativeTime(procedure.updated_at)

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col cursor-pointer rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:border-blue-300 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600 overflow-hidden"
    >
      {/* Color accent bar */}
      <div className={`h-1.5 w-full ${stateAccentColor(procedure.state)}`} />

      <div className="flex flex-col flex-1 p-4">
        {/* Status badge */}
        <div className="flex items-center justify-between mb-3">
          <ProcedureStatusBadge state={procedure.state} />
          {procedure.current_version > 0 && (
            <span className="rounded bg-green-50 px-1.5 py-0.5 text-[11px] font-medium text-green-600 dark:bg-green-900/20 dark:text-green-400">
              v{procedure.current_version}
            </span>
          )}
        </div>

        {/* Icon + Title */}
        <div className="flex items-start gap-3 mb-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400">
            <FileText className="h-5 w-5" />
          </div>
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-gray-900 group-hover:text-blue-600 dark:text-gray-100 dark:group-hover:text-blue-400">
            {procedure.title}
          </h3>
        </div>

        {/* Description */}
        {procedure.description && (
          <p className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400 mb-3">
            {htmlToPlainSnippet(procedure.description, 240)}
          </p>
        )}

        {/* Tags */}
        {procedure.tags && procedure.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {procedure.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300"
              >
                {tag}
              </span>
            ))}
            {procedure.tags.length > 3 && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-400 dark:bg-gray-700 dark:text-gray-500">
                +{procedure.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer meta */}
        <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
          {procedure.department_name && (
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {procedure.department_name}
            </span>
          )}
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {procedure.created_by_name}
          </span>
          {procedure.step_count !== undefined && (
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3" />
              {procedure.step_count} step{procedure.step_count !== 1 ? 's' : ''}
            </span>
          )}
          <span className="flex items-center gap-1 ml-auto">
            <Clock className="h-3 w-3" />
            {timeAgo}
          </span>
        </div>
      </div>

      {/* Hover arrow */}
      <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowRight className="h-4 w-4 text-blue-400" />
      </div>
    </div>
  )
}

function stateAccentColor(state: string): string {
  switch (state) {
    case 'draft':
      return 'bg-gray-300 dark:bg-gray-600'
    case 'in_review':
      return 'bg-yellow-400 dark:bg-yellow-500'
    case 'approved':
      return 'bg-blue-500 dark:bg-blue-400'
    case 'published':
      return 'bg-green-500 dark:bg-green-400'
    case 'retired':
      return 'bg-red-400 dark:bg-red-500'
    default:
      return 'bg-gray-200 dark:bg-gray-700'
  }
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export function ProceduresListPage() {
  const navigate = useNavigate()
  const handleLogout = useLogout()
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>({ state: '', department: '', search: '' })
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    return (localStorage.getItem('procedures-view') as 'list' | 'grid') || 'list'
  })

  const userData = authService.getUser()
  const user = {
    firstName: userData?.first_name || 'User',
    lastName: userData?.last_name || '',
    email: userData?.email || '',
    is_staff: userData?.is_staff || false,
    is_superuser: userData?.is_superuser || false,
  }

  const { hasGlobalPermission } = usePermissions()
  const canCreateProcedure = hasGlobalPermission('create_procedure')

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
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail || 'Failed to load procedures')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    const debounce = setTimeout(loadProcedures, 300)
    return () => clearTimeout(debounce)
  }, [loadProcedures])

  const handleViewChange = (mode: 'list' | 'grid') => {
    setViewMode(mode)
    localStorage.setItem('procedures-view', mode)
  }

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
                    {!loading && procedures.length > 0 && (
                      <span className="ml-1">({procedures.length})</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* View Toggle */}
                <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => handleViewChange('list')}
                    className={cn(
                      'p-2 rounded-md transition-colors',
                      viewMode === 'list'
                        ? 'bg-white dark:bg-gray-600 shadow-sm'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                    )}
                    title="List view"
                  >
                    <List className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </button>
                  <button
                    onClick={() => handleViewChange('grid')}
                    className={cn(
                      'p-2 rounded-md transition-colors',
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-gray-600 shadow-sm'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                    )}
                    title="Grid view"
                  >
                    <Grid3X3 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>

                <button
                  onClick={loadProcedures}
                  className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                {canCreateProcedure && (
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
            <div
              className={cn('mx-auto space-y-4', viewMode === 'list' ? 'max-w-4xl' : 'max-w-6xl')}
            >
              <ProcedureFilters filters={filters} onChange={setFilters} />

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                  <span className="ml-2 text-sm text-gray-500">Loading procedures...</span>
                </div>
              ) : error ? (
                <ErrorState error={error} onRetry={loadProcedures} />
              ) : procedures.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-12 dark:border-gray-600">
                  <ClipboardList className="h-10 w-10 text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {filters.search || filters.state
                      ? 'No procedures match your filters.'
                      : 'No procedures available.'}
                  </p>
                </div>
              ) : viewMode === 'list' ? (
                <div className="grid gap-3">
                  {procedures.map((proc) => (
                    <ProcedureCard
                      key={proc.id}
                      procedure={proc}
                      onClick={() => navigate(`/procedures/${proc.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {procedures.map((proc) => (
                    <ProcedureGridCard
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
