/**
 * TrainingEvidencePage — Evidence viewer for admin/compliance auditor.
 *
 * Route: /procedures/evidence
 * Displays training evidence records with export capabilities.
 */

import { useState, useEffect, useCallback } from 'react'
import { FileCheck, RefreshCw, Search } from 'lucide-react'
import { ThreePanelLayout } from '@/components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import {
  EvidenceTable,
  EvidenceExportButton,
  ComplianceReportCard,
  EvidenceDetailModal,
} from '@/components/procedures/evidence'
import { authService } from '@/services/auth.service'
import { listEvidence, type EvidenceRecord } from '@/services/evidenceService'

export function TrainingEvidencePage() {
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [detailRecord, setDetailRecord] = useState<EvidenceRecord | null>(null)

  const userData = authService.getUser()
  const user = {
    firstName: userData?.first_name || 'User',
    lastName: userData?.last_name || '',
    email: userData?.email || '',
    is_staff: userData?.is_staff || false,
    is_superuser: userData?.is_superuser || false,
  }

  const loadEvidence = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string> = {}
      if (search) params.search = search
      const data = await listEvidence(params)
      const items = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []
      setEvidence(items)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load evidence')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const debounce = setTimeout(loadEvidence, 300)
    return () => clearTimeout(debounce)
  }, [loadEvidence])

  const searchParams: Record<string, string> = {}
  if (search) searchParams.search = search

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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <FileCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Training Evidence
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Compliance evidence records for completed training
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <EvidenceExportButton searchParams={searchParams} />
                <button
                  onClick={loadEvidence}
                  className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-5xl mx-auto space-y-4">
              {/* Compliance Metrics */}
              {!loading && evidence.length > 0 && <ComplianceReportCard evidence={evidence} />}

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by trainee name or procedure..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>

              {/* Evidence Table */}
              <EvidenceTable
                evidence={evidence}
                loading={loading}
                error={error}
                expandedId={expandedId}
                onToggleExpand={setExpandedId}
                onViewDetail={setDetailRecord}
              />
            </div>
          </div>

          {/* Detail Modal */}
          <EvidenceDetailModal
            record={detailRecord}
            isOpen={detailRecord !== null}
            onClose={() => setDetailRecord(null)}
          />
        </div>
      }
    />
  )
}

export default TrainingEvidencePage
