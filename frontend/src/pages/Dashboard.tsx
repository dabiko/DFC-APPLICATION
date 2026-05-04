/**
 * Enterprise Dashboard Page
 *
 * Advanced dashboard with real-time data from workflows, procedures,
 * training, documents, and audit APIs. Features tabbed navigation,
 * interactive charts, and clickable KPIs.
 */

import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ThreePanelLayout } from '@components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@components/Dashboard/DashboardSidebar'
import { FolderContentView } from '@components/Dashboard/FolderContentView'
import { DashboardKPIRow } from '@components/Dashboard/DashboardKPIRow'
import { WorkflowOverviewWidget } from '@components/Dashboard/WorkflowOverviewWidget'
import { TrainingOverviewWidget } from '@components/Dashboard/TrainingOverviewWidget'
import { ActivityFeed } from '@components/Dashboard/ActivityFeed'
import { QuickActions } from '@components/Dashboard/QuickActions'
import { DateRangeFilter } from '@components/Dashboard/DateRangeFilter'
import { DonutChart } from '@components/Dashboard/DonutChart'
import { AreaChartWidget } from '@components/Dashboard/AreaChartWidget'
import { SimpleBarChart } from '@components/Dashboard/SimpleBarChart'
import { CreateFolderModal } from '@components/Folder/CreateFolderModal'
import { DocumentUploadModal } from '@components/Upload/DocumentUploadModal'
import { SelectDepartmentModal } from '@components/Dashboard/SelectDepartmentModal'
import { SelectFolderModal } from '@components/Dashboard/SelectFolderModal'
import { useAppDispatch } from '@/store'
import { createFolder, fetchFolders } from '@/store/slices/folderSlice'
import { useDashboardData } from '@/hooks/useDashboardData'
import { authService } from '@/services/auth.service'
import { cn } from '@utils/cn'
import { toast } from '@/utils/toast'
import type { CreateFolderData, Folder } from '@/types/folder'
import type { Department } from '@/types/department'
import type { BulkUploadResult } from '@/types/upload'
import {
  RefreshCw,
  LayoutDashboard,
  GitBranch,
  GraduationCap,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Shield,
  Users,
} from 'lucide-react'

type DashboardTab = 'overview' | 'workflows' | 'training' | 'documents'

const tabs: Array<{ id: DashboardTab; label: string; icon: React.ReactNode }> = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'workflows', label: 'Workflows', icon: <GitBranch className="w-4 h-4" /> },
  { id: 'training', label: 'Training', icon: <GraduationCap className="w-4 h-4" /> },
  { id: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
]

export function Dashboard() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview')

  // ── Quick action wizard state ────────────────────────────────────────────
  // Folders must live inside a department; documents must live inside a folder.
  // The dashboard has no folder/department context, so we walk the user through
  // a small wizard before opening the canonical modals used elsewhere.
  type WizardStep =
    | { kind: 'idle' }
    | { kind: 'pick-department'; flow: 'create-folder' | 'upload' }
    | { kind: 'pick-folder'; flow: 'create-folder' | 'upload'; department: Department }
    | { kind: 'create-folder'; department: Department; parentFolder: Folder | null }
    | { kind: 'upload'; department: Department; folder: Folder }
  const [wizard, setWizard] = useState<WizardStep>({ kind: 'idle' })
  const closeWizard = () => setWizard({ kind: 'idle' })

  const { data, isLoading, error, dateRange, setDateRange, refresh, lastUpdated } =
    useDashboardData()

  const handleCreateFolder = async (data: CreateFolderData) => {
    try {
      // The CreateFolderModal already sets `parentId` from the parentFolder prop;
      // pass `data` through unchanged so subfolder creation works correctly.
      await dispatch(createFolder(data)).unwrap()
      closeWizard()
      toast.success(`Folder "${data.name}" created successfully`)
      // Refresh dashboard KPIs and folder list
      dispatch(fetchFolders({}))
      refresh()
    } catch (err: unknown) {
      // Re-throw so the modal can display the error inline (matches FolderContentView behavior)
      const message =
        typeof err === 'string'
          ? err
          : err instanceof Error
            ? err.message
            : 'Failed to create folder'
      throw new Error(message)
    }
  }

  const handleUploadComplete = (result: BulkUploadResult) => {
    if (result.successful > 0) {
      const message =
        result.failed > 0
          ? `${result.successful} file(s) uploaded successfully, ${result.failed} failed`
          : `${result.successful} file(s) uploaded successfully!`
      if (result.failed > 0) {
        toast.warning(message)
      } else {
        toast.success(message)
      }
      refresh()
    } else if (result.failed > 0) {
      toast.error(`Failed to upload ${result.failed} file(s)`)
    }
  }

  // Check if a folder or department is selected via URL parameter
  const selectedFolderId = searchParams.get('folder')
  const selectedDepartmentId = searchParams.get('department')
  const showFolderContentView = selectedFolderId || selectedDepartmentId

  // Get user data from auth service
  const userData = authService.getUser()
  const user = {
    firstName: userData?.first_name || 'User',
    lastName: userData?.last_name || '',
    email: userData?.email || '',
    is_staff: userData?.is_staff || false,
    is_superuser: userData?.is_superuser || false,
  }

  const handleLogout = async () => {
    try {
      const refreshToken = authService.getRefreshToken()
      if (refreshToken) {
        await authService.logout(refreshToken)
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      authService.clearTokens()
      navigate('/login')
    }
  }

  // Build chart data from real API data
  const documentsByDepartment = (data?.documentStats?.documents_by_department ?? []).map((d, i) => {
    const colors = [
      'bg-blue-600',
      'bg-green-600',
      'bg-yellow-600',
      'bg-purple-600',
      'bg-red-600',
      'bg-indigo-600',
      'bg-teal-600',
      'bg-pink-600',
    ]
    return { label: d.name, value: d.count, color: colors[i % colors.length] }
  })

  const documentsByType = (data?.documentStats?.documents_by_type ?? []).map((d) => ({
    label: d.type,
    value: d.count,
  }))

  // Build audit activity chart data (actions by type)
  const auditByAction = Object.entries(data?.auditStats?.actions_by_type ?? {})
    .map(([action, count]) => ({
      name: action.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      value: count as number,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7)

  // Simulate trend data for area chart from audit stats
  const activityTrendData = generateActivityTrend(data?.auditStats?.total_actions ?? 0)

  return (
    <>
      <ThreePanelLayout
        header={<DashboardHeader user={user} notifications={[]} onLogout={handleLogout} />}
        leftPanel={<DashboardSidebar />}
        leftPanelWidth="auto"
        collapsibleLeft={false}
        centerPanel={
          showFolderContentView ? (
            <FolderContentView />
          ) : (
            <div className="h-full overflow-y-auto">
              <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
                {/* Header Row: Welcome + Date Filter + Refresh */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      Welcome back, {user.firstName}!
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      Here's your enterprise overview
                      {lastUpdated && (
                        <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                          Updated {lastUpdated.toLocaleTimeString()}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <DateRangeFilter value={dateRange} onChange={setDateRange} />
                    <button
                      onClick={refresh}
                      disabled={isLoading}
                      className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                      title="Refresh dashboard"
                    >
                      <RefreshCw
                        className={cn('w-4 h-4 text-gray-500', isLoading && 'animate-spin')}
                      />
                    </button>
                  </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                        activeTab === tab.id
                          ? 'border-blue-600 text-blue-700 dark:text-blue-400 dark:border-blue-400'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                      )}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Loading State */}
                {isLoading && !data && (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Loading dashboard data...
                    </p>
                  </div>
                )}

                {/* Error State */}
                {error && !data && (
                  <div className="flex flex-col items-center justify-center py-20">
                    <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
                    <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
                    <button
                      onClick={refresh}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* Dashboard Content */}
                {data && (
                  <>
                    {/* ─── OVERVIEW TAB ─── */}
                    {activeTab === 'overview' && (
                      <div className="space-y-6">
                        {/* Quick Actions */}
                        <QuickActions
                          onUploadDocument={() =>
                            setWizard({ kind: 'pick-department', flow: 'upload' })
                          }
                          onCreateFolder={() =>
                            setWizard({ kind: 'pick-department', flow: 'create-folder' })
                          }
                        />

                        {/* KPI Cards */}
                        <DashboardKPIRow data={data} />

                        {/* Workflow + Training Side-by-Side */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                          <WorkflowOverviewWidget data={data} />
                          <TrainingOverviewWidget data={data.assignmentDashboard} />
                        </div>

                        {/* Activity Feed + Activity Trend */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                          <div className="xl:col-span-2">
                            <ActivityFeed activities={data.recentActivity} />
                          </div>
                          <div className="space-y-6">
                            {/* Quick Stats Card */}
                            <QuickStatsCard data={data} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ─── WORKFLOWS TAB ─── */}
                    {activeTab === 'workflows' && (
                      <div className="space-y-6">
                        {/* Workflow KPIs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <StatCard
                            label="Active Workflows"
                            value={data.workflowStats?.total_active ?? 0}
                            icon={<GitBranch className="w-5 h-5" />}
                            color="blue"
                          />
                          <StatCard
                            label="Pending My Action"
                            value={data.workflowStats?.pending_my_action ?? 0}
                            icon={<Clock className="w-5 h-5" />}
                            color="amber"
                          />
                          <StatCard
                            label="Overdue"
                            value={data.workflowStats?.overdue ?? 0}
                            icon={<AlertCircle className="w-5 h-5" />}
                            color="red"
                          />
                          <StatCard
                            label="Completed This Month"
                            value={data.workflowStats?.completed_this_month ?? 0}
                            icon={<CheckCircle2 className="w-5 h-5" />}
                            color="green"
                          />
                        </div>

                        {/* Full Workflow Widget */}
                        <WorkflowOverviewWidget data={data} />

                        {/* Recent Workflows List */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                            Active Workflows
                          </h3>
                          {data.recentWorkflows.length === 0 ? (
                            <p className="text-sm text-gray-400 py-8 text-center">
                              No active workflows
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {data.recentWorkflows.map((wf) => (
                                <div
                                  key={wf.id}
                                  onClick={() => navigate('/workflows')}
                                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                      {wf.target_title}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {wf.template_name} — Step {wf.current_step}
                                      {wf.current_step_name && `: ${wf.current_step_name}`}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <span
                                      className={cn(
                                        'text-xs px-2 py-0.5 rounded-full font-medium',
                                        wf.is_overdue
                                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                      )}
                                    >
                                      {wf.status}
                                    </span>
                                    {wf.priority === 'URGENT' && (
                                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                        URGENT
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Avg Completion */}
                        {(data.workflowStats?.avg_completion_days ?? 0) > 0 && (
                          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  Average Workflow Completion Time
                                </p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                  {data.workflowStats?.avg_completion_days?.toFixed(1)} days
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ─── TRAINING TAB ─── */}
                    {activeTab === 'training' && (
                      <div className="space-y-6">
                        {/* Training KPIs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <StatCard
                            label="Total Assignments"
                            value={data.assignmentDashboard?.total ?? 0}
                            icon={<GraduationCap className="w-5 h-5" />}
                            color="blue"
                          />
                          <StatCard
                            label="Completion Rate"
                            value={`${Math.round(data.assignmentDashboard?.completion_rate ?? 0)}%`}
                            icon={<CheckCircle2 className="w-5 h-5" />}
                            color="green"
                          />
                          <StatCard
                            label="In Progress"
                            value={data.assignmentDashboard?.in_progress ?? 0}
                            icon={<Clock className="w-5 h-5" />}
                            color="amber"
                          />
                          <StatCard
                            label="Overdue"
                            value={data.assignmentDashboard?.overdue ?? 0}
                            icon={<AlertCircle className="w-5 h-5" />}
                            color="red"
                          />
                        </div>

                        {/* Full Training Widget */}
                        <TrainingOverviewWidget data={data.assignmentDashboard} />

                        {/* Training Status Donut */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                            Assignment Status Distribution
                          </h3>
                          <div className="max-w-xs mx-auto">
                            <DonutChart
                              data={[
                                {
                                  name: 'Completed',
                                  value: data.assignmentDashboard?.completed ?? 0,
                                  color: '#22c55e',
                                },
                                {
                                  name: 'In Progress',
                                  value: data.assignmentDashboard?.in_progress ?? 0,
                                  color: '#f59e0b',
                                },
                                {
                                  name: 'Assigned',
                                  value: data.assignmentDashboard?.assigned ?? 0,
                                  color: '#3b82f6',
                                },
                                {
                                  name: 'Failed',
                                  value: data.assignmentDashboard?.failed ?? 0,
                                  color: '#ef4444',
                                },
                                {
                                  name: 'Overdue',
                                  value: data.assignmentDashboard?.overdue ?? 0,
                                  color: '#f97316',
                                },
                                {
                                  name: 'Waived',
                                  value: data.assignmentDashboard?.waived ?? 0,
                                  color: '#6b7280',
                                },
                              ].filter((d) => d.value > 0)}
                              centerValue={data.assignmentDashboard?.total ?? 0}
                              centerLabel="Total"
                              height={220}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ─── DOCUMENTS TAB ─── */}
                    {activeTab === 'documents' && (
                      <div className="space-y-6">
                        {/* Document KPIs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <StatCard
                            label="Total Documents"
                            value={data.documentStats?.total_documents ?? 0}
                            icon={<FileText className="w-5 h-5" />}
                            color="blue"
                          />
                          <StatCard
                            label="Total Folders"
                            value={data.documentStats?.total_folders ?? 0}
                            icon={<FileText className="w-5 h-5" />}
                            color="green"
                          />
                          <StatCard
                            label="Recent Uploads"
                            value={data.documentStats?.recent_uploads_count ?? 0}
                            icon={<TrendingUp className="w-5 h-5" />}
                            color="purple"
                          />
                          <StatCard
                            label="Audit Actions (30d)"
                            value={data.auditStats?.total_actions ?? 0}
                            icon={<Shield className="w-5 h-5" />}
                            color="indigo"
                          />
                        </div>

                        {/* Charts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {documentsByDepartment.length > 0 ? (
                            <SimpleBarChart
                              data={documentsByDepartment}
                              title="Documents by Department"
                            />
                          ) : (
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                                Documents by Department
                              </h3>
                              <p className="text-sm text-gray-400 py-12 text-center">
                                Upload documents to see department distribution
                              </p>
                            </div>
                          )}
                          {documentsByType.length > 0 ? (
                            <SimpleBarChart data={documentsByType} title="Documents by Type" />
                          ) : (
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                                Documents by Type
                              </h3>
                              <p className="text-sm text-gray-400 py-12 text-center">
                                Upload documents to see type distribution
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Activity by Action Type */}
                        {auditByAction.length > 0 && (
                          <SimpleBarChart
                            data={auditByAction.map((a) => ({ label: a.name, value: a.value }))}
                            title="Actions by Type (Last 30 Days)"
                          />
                        )}

                        {/* Activity Trend */}
                        <AreaChartWidget
                          data={activityTrendData}
                          dataKey="actions"
                          xAxisKey="day"
                          title="Document Activity Trend (Last 30 Days)"
                          color="#3b82f6"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        }
        collapsibleRight={false}
      />

      {/* Quick action wizard.
        Step 1: Pick a department (folders must live inside one).
        Step 2 (upload only): Pick a folder in that department (documents must live inside one).
        Step 3: Open the same CreateFolderModal / DocumentUploadModal used everywhere else
        — preconfigured with the chosen department / folder so behavior matches the
        in-context flows in FolderContentView. */}
      <SelectDepartmentModal
        isOpen={wizard.kind === 'pick-department'}
        onClose={closeWizard}
        onSelect={(department) => {
          if (wizard.kind !== 'pick-department') return
          // Both flows now go through the folder picker. For create-folder the
          // picker is optional (allowRoot=true); for upload it is required.
          setWizard({ kind: 'pick-folder', flow: wizard.flow, department })
        }}
        title={
          wizard.kind === 'pick-department' && wizard.flow === 'create-folder'
            ? 'Choose a department for the new folder'
            : 'Choose a department'
        }
        description={
          wizard.kind === 'pick-department' && wizard.flow === 'create-folder'
            ? 'Folders must live inside a department. Pick one to continue.'
            : 'Documents are organized by department, then by folder. Pick a department to continue.'
        }
      />

      <SelectFolderModal
        isOpen={wizard.kind === 'pick-folder'}
        department={wizard.kind === 'pick-folder' ? wizard.department : null}
        onClose={closeWizard}
        onBack={() => {
          if (wizard.kind !== 'pick-folder') return
          setWizard({ kind: 'pick-department', flow: wizard.flow })
        }}
        allowRoot={wizard.kind === 'pick-folder' && wizard.flow === 'create-folder'}
        title={
          wizard.kind === 'pick-folder' && wizard.flow === 'create-folder'
            ? 'Where should the new folder be created?'
            : 'Choose a folder'
        }
        description={
          wizard.kind === 'pick-folder' && wizard.flow === 'create-folder'
            ? 'Pick an existing folder to create a subfolder, or choose "Department root" to create a top-level folder.'
            : 'Pick the folder where this document should live.'
        }
        onSelect={(folder) => {
          if (wizard.kind !== 'pick-folder') return
          if (wizard.flow === 'create-folder') {
            setWizard({
              kind: 'create-folder',
              department: wizard.department,
              parentFolder: folder,
            })
          } else if (folder) {
            // Upload requires a real folder; the picker enforces this when allowRoot=false.
            setWizard({ kind: 'upload', department: wizard.department, folder })
          }
        }}
      />

      <CreateFolderModal
        isOpen={wizard.kind === 'create-folder'}
        parentFolder={wizard.kind === 'create-folder' ? wizard.parentFolder : null}
        departmentId={wizard.kind === 'create-folder' ? wizard.department.id : null}
        onClose={closeWizard}
        onCreate={handleCreateFolder}
      />

      <DocumentUploadModal
        isOpen={wizard.kind === 'upload'}
        onClose={closeWizard}
        onUploadComplete={(result) => {
          handleUploadComplete(result)
          // Auto-close on full success; leave open if there were duplicates/errors
          if (result.failed === 0) closeWizard()
        }}
        folderId={wizard.kind === 'upload' ? wizard.folder.id : null}
        folderInfo={
          wizard.kind === 'upload'
            ? {
                name: wizard.folder.name,
                departmentId: wizard.folder.departmentId || '',
                departmentName: wizard.folder.departmentName || wizard.department.name,
                path: wizard.folder.path,
              }
            : undefined
        }
        requireMetadata={true}
      />
    </>
  )
}

// ─── Helper Components ────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'indigo'
}) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    red: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    purple: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center gap-4">
      <div className={cn('p-2.5 rounded-lg', colorMap[color])}>{icon}</div>
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {label}
        </p>
        <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      </div>
    </div>
  )
}

function QuickStatsCard({ data }: { data: import('@/services/dashboardService').DashboardData }) {
  const stats = [
    {
      label: 'Completed Tasks (Week)',
      value: data.taskStats?.completed_this_week ?? 0,
      icon: <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />,
    },
    {
      label: 'Unread Tasks',
      value: data.taskStats?.unread ?? 0,
      icon: <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
    },
    {
      label: 'Completed Today',
      value: data.taskStats?.completed_today ?? 0,
      icon: <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
    },
    {
      label: 'Audit Success Rate',
      value: `${Math.round(data.auditStats?.success_rate ?? 0)}%`,
      icon: <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
    },
    {
      label: 'Unique Users (30d)',
      value: data.auditStats ? Object.keys(data.auditStats.actions_by_user ?? {}).length : 0,
      icon: <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
    },
  ]

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Stats</h3>
      <div className="space-y-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {stat.icon}
              <span className="text-xs text-gray-600 dark:text-gray-400">{stat.label}</span>
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Generate simulated trend data based on total actions
function generateActivityTrend(totalActions: number): Array<{ day: string; actions: number }> {
  const days = 30
  const data: Array<{ day: string; actions: number }> = []
  const avgPerDay = Math.max(Math.round(totalActions / days), 1)
  const now = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dayLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    // Add some variance
    const variance = Math.round((Math.random() - 0.5) * avgPerDay * 0.6)
    data.push({
      day: dayLabel,
      actions: Math.max(avgPerDay + variance, 0),
    })
  }
  return data
}
