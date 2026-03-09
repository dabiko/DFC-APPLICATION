/**
 * ProcedureVersionDiffPage — Side-by-side version comparison page.
 *
 * Route: /procedures/:id/versions/diff
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Loader2, AlertTriangle, GitCompare } from 'lucide-react'
import { ThreePanelLayout } from '@/components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import { VersionDiffViewer } from '@/components/procedures/versioning/VersionDiffViewer'
import { authService } from '@/services/auth.service'
import { listVersions } from '@/services/procedureService'
import type { ProcedureVersionListItem } from '@/types/procedure'

export function ProcedureVersionDiffPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [versions, setVersions] = useState<ProcedureVersionListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const userData = authService.getUser()
  const user = {
    firstName: userData?.first_name || 'User',
    lastName: userData?.last_name || '',
    email: userData?.email || '',
    is_staff: userData?.is_staff || false,
    is_superuser: userData?.is_superuser || false,
  }

  useEffect(() => {
    if (!id) return
    setLoading(true)
    listVersions(id)
      .then((data) => {
        setVersions(data)
        setError(null)
      })
      .catch((err) => setError(err?.response?.data?.detail || 'Failed to load versions'))
      .finally(() => setLoading(false))
  }, [id])

  const content = loading ? (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  ) : error ? (
    <div className="flex flex-col items-center justify-center h-full">
      <AlertTriangle className="h-10 w-10 text-red-400 mb-3" />
      <p className="text-red-600 dark:text-red-400">{error}</p>
    </div>
  ) : (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/procedures/${id}`)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
            <GitCompare className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Version Comparison
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Compare changes between published versions
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          {versions.length < 2 ? (
            <div className="text-center py-12 text-sm text-gray-400">
              At least two published versions are required for comparison.
            </div>
          ) : (
            <VersionDiffViewer procedureId={id!} versions={versions} />
          )}
        </div>
      </div>
    </div>
  )

  return (
    <ThreePanelLayout
      header={<DashboardHeader user={user} notifications={[]} onLogout={() => {}} />}
      leftPanel={<DashboardSidebar />}
      leftPanelWidth="auto"
      collapsibleLeft={false}
      centerPanel={content}
    />
  )
}

export default ProcedureVersionDiffPage
