/**
 * ProcedureReviewPage — Dedicated review page for assigned step reviewers.
 * Any authenticated user can access; the backend enforces that only the
 * assigned reviewer (or superuser) can actually approve/request-changes.
 */

import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ThreePanelLayout } from '@/components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import { ProcedureReviewPanel } from '@/components/procedures/review/ProcedureReviewPanel'
import { useAuth } from '@/hooks/useAuth'

export function ProcedureReviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user: userData } = useAuth()

  const user = {
    id: userData?.id || 0,
    name: userData?.full_name || userData?.username || '',
    email: userData?.email || '',
    is_staff: userData?.is_staff || false,
    is_superuser: userData?.is_superuser || false,
  }

  if (!id) {
    return null
  }

  return (
    <ThreePanelLayout
      header={<DashboardHeader user={user} notifications={[]} onLogout={() => {}} />}
      leftPanel={<DashboardSidebar />}
      leftPanelWidth="auto"
      collapsibleLeft={false}
      centerPanel={
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                Procedure Review
              </h1>
            </div>
          </div>

          {/* Review Panel */}
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-3xl mx-auto">
              <ProcedureReviewPanel procedureId={id} />
            </div>
          </div>
        </div>
      }
    />
  )
}

export default ProcedureReviewPage
