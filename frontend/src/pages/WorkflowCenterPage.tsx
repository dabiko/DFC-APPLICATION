/**
 * WorkflowCenterPage Component
 *
 * Enterprise-grade workflow management center for document approvals and reviews.
 *
 * Tabs:
 * - My Tasks: Personal task inbox with approve/reject/delegate actions
 * - Workflows: Active workflow instances
 * - Templates: Workflow template management
 * - Completed: Completed workflow history
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  GitBranch,
  Inbox,
  Play,
  LayoutTemplate,
  CheckCircle,
  RefreshCw,
  Loader2,
  Plus,
  Search,
  Filter,
  Clock,
  AlertTriangle,
  FileText,
  Users,
  ArrowRight,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Send,
  Eye,
  BarChart3,
  ClipboardList,
} from 'lucide-react'
import { ThreePanelLayout } from '@/components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import { cn } from '@/utils/cn'
import { authService } from '@/services/auth.service'
import { usePermissions } from '@/contexts/PermissionContext'
import { WorkflowAnalyticsDashboard } from '@/components/WorkflowAnalytics'
import { ProceduresTab } from '@/components/procedures/ProceduresTab'
import {
  getMyTasks,
  getWorkflowInstances,
  getWorkflowTemplates,
  getTaskStats,
  getWorkflowStats,
  approveTask,
  rejectTask,
  markTaskAsRead,
  delegateTask,
  type WorkflowTask,
  type WorkflowInstance,
  type WorkflowTemplate,
  type TaskStats,
  type WorkflowStats,
  getStatusColor,
  getPriorityColor,
  formatStatus,
  formatPriority,
} from '@/services/workflowService'
import { getUsers } from '@/services/userManagementService'

// =============================================================================
// Types
// =============================================================================

type TabId = 'tasks' | 'workflows' | 'templates' | 'completed' | 'analytics' | 'procedures'

interface Tab {
  id: TabId
  label: string
  icon: React.FC<{ className?: string }>
  badge?: number
}

// =============================================================================
// Main Component
// =============================================================================

export function WorkflowCenterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialTab = (searchParams.get('tab') as TabId) || 'tasks'
  const [activeTab, setActiveTab] = useState<TabId>(initialTab)
  const { hasGlobalPermission } = usePermissions()
  const canCreateTemplate = hasGlobalPermission('create_workflow_template')

  // Data state
  const [tasks, setTasks] = useState<WorkflowTask[]>([])
  const [workflows, setWorkflows] = useState<WorkflowInstance[]>([])
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [completedWorkflows, setCompletedWorkflows] = useState<WorkflowInstance[]>([])
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null)
  const [workflowStats, setWorkflowStats] = useState<WorkflowStats | null>(null)

  // UI state
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTask, setSelectedTask] = useState<WorkflowTask | null>(null)
  const [actionComment, setActionComment] = useState('')
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showDelegateModal, setShowDelegateModal] = useState(false)
  const [delegateUsers, setDelegateUsers] = useState<
    Array<{ id: number; username: string; full_name: string }>
  >([])
  const [delegateToId, setDelegateToId] = useState<number | null>(null)
  const [delegateSearch, setDelegateSearch] = useState('')

  // User data
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

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const [tasksData, statsData, workflowStatsData] = await Promise.all([
        getMyTasks(),
        getTaskStats(),
        getWorkflowStats(),
      ])
      setTasks(tasksData)
      setTaskStats(statsData)
      setWorkflowStats(workflowStatsData)
    } catch (err) {
      console.error('Failed to fetch workflow data:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load workflow data'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  const fetchWorkflows = useCallback(async () => {
    try {
      const [active, completed] = await Promise.all([
        getWorkflowInstances({ status: 'ACTIVE' }),
        getWorkflowInstances({ status: 'APPROVED' }),
      ])
      setWorkflows(active)
      setCompletedWorkflows(completed)
    } catch (error) {
      console.error('Failed to fetch workflows:', error)
    }
  }, [])

  const fetchTemplates = useCallback(async () => {
    try {
      const data = await getWorkflowTemplates({ is_active: true })
      setTemplates(data)
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    }
  }, [])

  useEffect(() => {
    fetchData()
    fetchWorkflows()
    fetchTemplates()
  }, [fetchData, fetchWorkflows, fetchTemplates])

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchData()
    fetchWorkflows()
    fetchTemplates()
  }

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId)
    setSelectedTask(null)
  }

  // Task actions
  const handleApprove = async (task: WorkflowTask) => {
    if (!actionComment.trim()) {
      setActionError('A comment is required when approving.')
      return
    }
    setIsActionLoading(true)
    setActionError(null)
    try {
      await approveTask(task.id, actionComment)
      setActionComment('')
      setSelectedTask(null)
      fetchData()
    } catch (err: any) {
      setActionError(
        err?.response?.data?.error || err?.response?.data?.detail || 'Failed to approve task'
      )
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleReject = async (task: WorkflowTask) => {
    if (!actionComment.trim()) {
      setActionError('A comment/reason is required when rejecting.')
      return
    }
    setIsActionLoading(true)
    setActionError(null)
    try {
      await rejectTask(task.id, actionComment)
      setActionComment('')
      setSelectedTask(null)
      fetchData()
    } catch (err: any) {
      setActionError(
        err?.response?.data?.error || err?.response?.data?.detail || 'Failed to reject task'
      )
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleDelegate = async () => {
    if (!selectedTask || !delegateToId) return
    if (!actionComment.trim()) {
      setActionError('A comment is required when delegating.')
      return
    }
    setIsActionLoading(true)
    setActionError(null)
    try {
      await delegateTask(selectedTask.id, delegateToId, actionComment)
      setActionComment('')
      setSelectedTask(null)
      setShowDelegateModal(false)
      setDelegateToId(null)
      setDelegateSearch('')
      fetchData()
    } catch (err: any) {
      setActionError(
        err?.response?.data?.error || err?.response?.data?.detail || 'Failed to delegate task'
      )
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleSelectTask = async (task: WorkflowTask) => {
    setSelectedTask(task)
    if (!task.is_read) {
      await markTaskAsRead(task.id)
      // Update local state
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, is_read: true } : t)))
    }
  }

  // Tab configuration
  const TABS: Tab[] = [
    {
      id: 'tasks',
      label: 'My Tasks',
      icon: Inbox,
      badge: taskStats?.total_pending || 0,
    },
    { id: 'workflows', label: 'Active Workflows', icon: Play },
    { id: 'templates', label: 'Templates', icon: LayoutTemplate },
    { id: 'completed', label: 'Completed', icon: CheckCircle },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'procedures', label: 'Procedures', icon: ClipboardList },
  ]

  // ==========================================================================
  // Render Functions
  // ==========================================================================

  const renderTasksTab = () => {
    return (
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Task List */}
        <div className="flex-1 min-w-0">
          {/* Stats Cards - Responsive grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Inbox className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {taskStats?.total_pending || 0}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {taskStats?.unread || 0}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Unread</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {taskStats?.total_overdue || 0}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Overdue</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {taskStats?.completed_today || 0}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Done Today</p>
                </div>
              </div>
            </div>
          </div>

          {/* Task List */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tasks..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                  />
                </div>
                <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                  <Filter className="w-4 h-4" />
                  Filters
                </button>
              </div>
            </div>

            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  All caught up!
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  You have no pending tasks at the moment.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {tasks
                  .filter(
                    (task) =>
                      task.target_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      task.workflow_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      task.step_name.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((task) => (
                    <div
                      key={task.id}
                      onClick={() => handleSelectTask(task)}
                      className={cn(
                        'px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors',
                        selectedTask?.id === task.id && 'bg-blue-50 dark:bg-blue-900/20',
                        !task.is_read && 'bg-blue-50/50 dark:bg-blue-900/10'
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 pt-1">
                          {!task.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {task.target_title}
                            </span>
                            {task.is_overdue && (
                              <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded">
                                Overdue
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <span>{task.workflow_name}</span>
                            <ArrowRight className="w-3 h-3" />
                            <span className="font-medium">{task.step_name}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <span
                              className={cn(
                                'px-2 py-0.5 text-xs font-medium rounded-full',
                                getPriorityColor(task.priority)
                              )}
                            >
                              {formatPriority(task.priority)}
                            </span>
                            {task.due_date && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Due: {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded">
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Task Detail Panel - Desktop Sidebar / Mobile Bottom Sheet */}
        {selectedTask && (
          <>
            {/* Mobile Overlay */}
            <div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setSelectedTask(null)}
            />

            {/* Panel - Full bottom sheet on mobile, sidebar on desktop */}
            <div
              className={cn(
                'bg-white dark:bg-gray-800 rounded-t-2xl lg:rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden',
                'fixed lg:relative bottom-0 left-0 right-0 lg:bottom-auto lg:left-auto lg:right-auto',
                'z-50 lg:z-auto',
                'max-h-[85vh] lg:max-h-none',
                'w-full lg:w-96',
                'animate-slide-up lg:animate-none'
              )}
            >
              {/* Drag Handle - Mobile only */}
              <div className="lg:hidden flex justify-center pt-2 pb-1">
                <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
              </div>

              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-medium text-gray-900 dark:text-white">Task Details</h3>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="lg:hidden p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <XCircle className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(85vh-120px)] lg:max-h-[600px]">
                {/* Target Info */}
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {selectedTask.target_type === 'procedure' ? 'Procedure' : 'Document'}
                  </label>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1 break-words">
                    {selectedTask.target_title}
                  </p>
                </div>

                {/* Workflow Info */}
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Workflow
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {selectedTask.workflow_name}
                  </p>
                </div>

                {/* Current Step */}
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Action Required
                  </label>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                    {selectedTask.step_name}
                  </p>
                </div>

                {/* Priority & Due Date - Stack on mobile */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Priority
                    </label>
                    <span
                      className={cn(
                        'inline-block px-2 py-1 text-xs font-medium rounded mt-1',
                        getPriorityColor(selectedTask.priority)
                      )}
                    >
                      {formatPriority(selectedTask.priority)}
                    </span>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Due Date
                    </label>
                    <p
                      className={cn(
                        'text-sm mt-1',
                        selectedTask.is_overdue
                          ? 'text-red-600 dark:text-red-400 font-medium'
                          : 'text-gray-900 dark:text-white'
                      )}
                    >
                      {selectedTask.due_date
                        ? new Date(selectedTask.due_date).toLocaleDateString()
                        : 'No due date'}
                    </p>
                  </div>
                </div>

                {/* Step-review tasks: reviewer should use the Review Procedure page */}
                {selectedTask.step_name.startsWith('Step Review:') ? (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      You are assigned as a <strong>step reviewer</strong>. Use the "Review
                      Procedure" button below to review and approve or request changes on your
                      assigned step(s).
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Comment Input — for procedure-level reviewers */}
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">
                        Comment <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={actionComment}
                        onChange={(e) => {
                          setActionComment(e.target.value)
                          setActionError(null)
                        }}
                        placeholder="Provide your reason/comment (required)..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm resize-none"
                      />
                      {actionError && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{actionError}</p>
                      )}
                    </div>

                    {/* Action Buttons — only for procedure-level reviewers */}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => handleApprove(selectedTask)}
                        disabled={isActionLoading}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 disabled:opacity-50 transition-colors touch-manipulation"
                      >
                        {isActionLoading ? (
                          <Loader2 className="w-5 h-5 sm:w-4 sm:h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 sm:w-4 sm:h-4" />
                        )}
                        <span className="font-medium">Approve</span>
                      </button>
                      <button
                        onClick={() => handleReject(selectedTask)}
                        disabled={isActionLoading}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 disabled:opacity-50 transition-colors touch-manipulation"
                      >
                        {isActionLoading ? (
                          <Loader2 className="w-5 h-5 sm:w-4 sm:h-4 animate-spin" />
                        ) : (
                          <XCircle className="w-5 h-5 sm:w-4 sm:h-4" />
                        )}
                        <span className="font-medium">Reject</span>
                      </button>
                    </div>
                  </>
                )}

                {/* Secondary Actions */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  {/* Delegate — only for procedure-level reviewers */}
                  {!selectedTask.step_name.startsWith('Step Review:') && (
                    <button
                      onClick={async () => {
                        if (!actionComment.trim()) {
                          setActionError('A comment is required when delegating.')
                          return
                        }
                        setShowDelegateModal(true)
                        try {
                          const res = await getUsers({ page_size: 200 })
                          const users = Array.isArray(res.results) ? res.results : []
                          setDelegateUsers(
                            users
                              .map((u: any) => ({
                                id: Number(u.id),
                                username: u.username,
                                full_name:
                                  u.full_name ||
                                  `${u.first_name || ''} ${u.last_name || ''}`.trim() ||
                                  u.username,
                              }))
                              .filter((u: any) => u.id !== selectedTask?.assigned_to)
                          )
                        } catch {
                          setDelegateUsers([])
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 text-sm text-gray-700 dark:text-gray-300 touch-manipulation"
                    >
                      <Send className="w-5 h-5 sm:w-4 sm:h-4" />
                      Delegate
                    </button>
                  )}
                  {/* Review Procedure — for all procedure-related tasks */}
                  {selectedTask?.target_type === 'procedure' && (
                    <button
                      onClick={() => navigate(`/procedures/${selectedTask.target_id}/review`)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-3 sm:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 active:bg-purple-800 text-sm font-medium touch-manipulation"
                    >
                      <Eye className="w-5 h-5 sm:w-4 sm:h-4" />
                      Review Procedure
                    </button>
                  )}
                  {selectedTask?.target_type !== 'procedure' && (
                    <button className="flex-1 flex items-center justify-center gap-2 px-3 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 touch-manipulation">
                      <Eye className="w-5 h-5 sm:w-4 sm:h-4" />
                      View Document
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Delegate Modal */}
        {showDelegateModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-gray-800">
              <div className="flex items-center justify-between border-b px-5 py-4 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Delegate Task
                </h3>
                <button
                  onClick={() => {
                    setShowDelegateModal(false)
                    setDelegateToId(null)
                    setDelegateSearch('')
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              <div className="p-5 space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Select a user to delegate this task to:
                </p>
                <input
                  type="text"
                  value={delegateSearch}
                  onChange={(e) => setDelegateSearch(e.target.value)}
                  placeholder="Search users..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600">
                  {delegateUsers
                    .filter(
                      (u) =>
                        !delegateSearch ||
                        u.full_name.toLowerCase().includes(delegateSearch.toLowerCase()) ||
                        u.username.toLowerCase().includes(delegateSearch.toLowerCase())
                    )
                    .map((u) => (
                      <label
                        key={u.id}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700',
                          delegateToId === u.id && 'bg-blue-50 dark:bg-blue-900/20'
                        )}
                      >
                        <input
                          type="radio"
                          name="delegate_to"
                          checked={delegateToId === u.id}
                          onChange={() => setDelegateToId(u.id)}
                          className="border-gray-300"
                        />
                        <span className="text-gray-900 dark:text-gray-100">{u.full_name}</span>
                        <span className="text-xs text-gray-400">@{u.username}</span>
                      </label>
                    ))}
                  {delegateUsers.length === 0 && (
                    <div className="p-3 text-center text-xs text-gray-400">No users found</div>
                  )}
                </div>
                {actionError && (
                  <p className="text-xs text-red-600 dark:text-red-400">{actionError}</p>
                )}
              </div>
              <div className="flex justify-end gap-2 border-t px-5 py-4 dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowDelegateModal(false)
                    setDelegateToId(null)
                    setDelegateSearch('')
                  }}
                  className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelegate}
                  disabled={!delegateToId || isActionLoading}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isActionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Delegate
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderWorkflowsTab = () => {
    return (
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Play className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {workflowStats?.total_active || 0}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {workflowStats?.overdue || 0}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Overdue</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {workflowStats?.completed_this_week || 0}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">This Week</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {workflowStats?.avg_completion_days || 0}d
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Time</p>
              </div>
            </div>
          </div>
        </div>

        {/* Workflows Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-medium text-gray-900 dark:text-white">Active Workflows</h3>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              <Plus className="w-4 h-4" />
              Start Workflow
            </button>
          </div>

          {workflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <GitBranch className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No active workflows</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Document
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Workflow
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Current Step
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Assignee
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Due Date
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {workflows.map((workflow) => (
                  <tr
                    key={workflow.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {workflow.target_title}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {workflow.template_name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900 dark:text-white">
                          {workflow.current_step_name || `Step ${workflow.current_step}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {workflow.current_assignee?.map((a) => (
                        <div key={a.id} className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <Users className="w-3 h-3 text-gray-500" />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">{a.name}</span>
                        </div>
                      ))}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'text-sm',
                          workflow.is_overdue
                            ? 'text-red-600 dark:text-red-400 font-medium'
                            : 'text-gray-600 dark:text-gray-400'
                        )}
                      >
                        {workflow.due_date ? new Date(workflow.due_date).toLocaleDateString() : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full',
                          getStatusColor(workflow.status)
                        )}
                      >
                        {formatStatus(workflow.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    )
  }

  const renderTemplatesTab = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            />
          </div>
          {canCreateTemplate && (
            <button
              onClick={() => navigate('/workflows/designer')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Template
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-blue-300 dark:hover:border-blue-600 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <GitBranch className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                  {template.category || 'General'}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {template.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                {template.description || 'No description'}
              </p>
              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>{template.step_count} steps</span>
                <span>~{template.default_due_days} days</span>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <span className="text-xs text-gray-400">Used {template.times_used} times</span>
                <span
                  className={cn(
                    'px-2 py-0.5 text-xs rounded',
                    getPriorityColor(template.default_priority)
                  )}
                >
                  {formatPriority(template.default_priority)}
                </span>
              </div>
            </div>
          ))}

          {/* Add New Template Card */}
          <div
            onClick={() => navigate('/workflows/designer')}
            className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors min-h-[200px]"
          >
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full mb-3">
              <Plus className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Create Template</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Design a custom workflow
            </p>
          </div>
        </div>
      </div>
    )
  }

  const renderCompletedTab = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-white">Completed Workflows</h3>
          </div>

          {completedWorkflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <CheckCircle className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No completed workflows yet</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Document
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Workflow
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Initiated By
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Completed
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {completedWorkflows.map((workflow) => (
                  <tr
                    key={workflow.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {workflow.target_title}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {workflow.template_name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {workflow.initiated_by_name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {workflow.completed_at
                          ? new Date(workflow.completed_at).toLocaleDateString()
                          : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full',
                          getStatusColor(workflow.status)
                        )}
                      >
                        {formatStatus(workflow.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    )
  }

  const renderContent = () => {
    // Show error state
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 max-w-md text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-red-800 dark:text-red-300 mb-2">
              Error Loading Data
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      )
    }

    // Show initial loading
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      )
    }

    switch (activeTab) {
      case 'tasks':
        return renderTasksTab()
      case 'workflows':
        return renderWorkflowsTab()
      case 'templates':
        return renderTemplatesTab()
      case 'completed':
        return renderCompletedTab()
      case 'analytics':
        return <WorkflowAnalyticsDashboard />
      case 'procedures':
        return <ProceduresTab />
      default:
        return null
    }
  }

  // ==========================================================================
  // Main Render
  // ==========================================================================

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
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <GitBranch className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Workflow Center
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Manage document approvals and reviews
                  </p>
                </div>
              </div>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                Refresh
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6">
            <nav className="flex gap-1 -mb-px">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                    activeTab === tab.id
                      ? 'text-purple-600 dark:text-purple-400 border-purple-600 dark:border-purple-400'
                      : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="ml-1 px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-auto p-6">{renderContent()}</div>
        </div>
      }
    />
  )
}

export default WorkflowCenterPage
