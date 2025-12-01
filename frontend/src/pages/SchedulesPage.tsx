/**
 * SchedulesPage Component
 *
 * Enterprise-grade retention schedules management with tabs for:
 * - Overview (schedule statistics, upcoming dispositions)
 * - Calendar (visual calendar view of scheduled events)
 * - Review Queue (disposition review and approval)
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Calendar,
  RefreshCw,
  LayoutDashboard,
  ListChecks,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { ThreePanelLayout } from '@/components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import {
  RetentionScheduleOverview,
  RetentionCalendarView,
  DispositionReviewQueue,
  BulkActionPanel,
} from '@/components/Schedule'
import { authService } from '@/services/auth.service'
import {
  getAllSchedules,
  getScheduleStats,
  getCalendarEvents,
  getDispositionQueue,
  approveDisposition,
  rejectDisposition,
  deferDisposition,
  performBulkAction,
  type ScheduleResponse,
  type ScheduleStatsResponse,
  type CalendarEventResponse,
  type DispositionReviewItemResponse,
} from '@/services/retentionService'
import type {
  RetentionSchedule,
  ScheduleStats,
  ScheduleCalendarEvent,
  DispositionReviewItem,
  BulkActionType,
} from '@/types/retention'
import { cn } from '@/utils/cn'

// ============================================================================
// TYPES
// ============================================================================

type TabId = 'overview' | 'calendar' | 'review-queue'

interface Tab {
  id: TabId
  label: string
  icon: React.FC<{ className?: string }>
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'review-queue', label: 'Review Queue', icon: ListChecks },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function mapScheduleResponse(response: ScheduleResponse): RetentionSchedule {
  return {
    id: response.id,
    documentId: response.document_id,
    documentName: response.document_name,
    documentType: response.document_type,
    policyId: response.policy_id,
    policyName: response.policy_name,
    status: response.status,
    priority: response.priority,
    scheduledDate: response.scheduled_date,
    action: response.action,
    department: response.department,
    owner: response.owner,
    ownerEmail: response.owner_email,
    createdAt: response.created_at,
    updatedAt: response.updated_at,
    processedAt: response.processed_at,
    processedBy: response.processed_by,
    notes: response.notes,
    isLegalHold: response.is_legal_hold,
    legalHoldId: response.legal_hold_id,
    retentionDays: response.retention_days,
    extensionCount: response.extension_count,
    maxExtensions: response.max_extensions,
  }
}

function mapCalendarEventResponse(response: CalendarEventResponse): ScheduleCalendarEvent {
  return {
    id: response.id,
    date: response.date,
    type: response.type,
    title: response.title,
    count: response.count,
    status: response.status,
    items: response.items.map((item) => ({
      id: item.id,
      name: item.name,
      action: item.action,
    })),
  }
}

function mapDispositionReviewResponse(
  response: DispositionReviewItemResponse
): DispositionReviewItem {
  return {
    id: response.id,
    documentId: response.document_id,
    documentName: response.document_name,
    documentType: response.document_type,
    documentPath: response.document_path,
    scheduledAction: response.scheduled_action,
    scheduledDate: response.scheduled_date,
    policyId: response.policy_id,
    policyName: response.policy_name,
    department: response.department,
    owner: response.owner,
    ownerEmail: response.owner_email,
    priority: response.priority,
    status: response.status,
    submittedAt: response.submitted_at,
    submittedBy: response.submitted_by,
    reviewedAt: response.reviewed_at,
    reviewedBy: response.reviewed_by,
    reviewNotes: response.review_notes,
    isLegalHold: response.is_legal_hold,
    legalHoldReason: response.legal_hold_reason,
    retentionDays: response.retention_days,
    fileSize: response.file_size,
    lastModified: response.last_modified,
  }
}

function mapStatsResponse(response: ScheduleStatsResponse): ScheduleStats {
  return {
    totalScheduled: response.total_scheduled,
    pendingReview: response.pending_review,
    approvedToday: response.approved_today,
    processedThisWeek: response.processed_this_week,
    upcomingDeletions: response.upcoming_deletions,
    upcomingArchivals: response.upcoming_archivals,
    overdueItems: response.overdue_items,
    onLegalHold: response.on_legal_hold,
    byStatus: response.by_status,
    byAction: response.by_action,
    byPriority: response.by_priority,
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SchedulesPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // User data for header
  const userData = authService.getUser()
  const user = {
    firstName: userData?.first_name || 'User',
    lastName: userData?.last_name || '',
    email: userData?.email || '',
    is_staff: userData?.is_staff || false,
    is_superuser: userData?.is_superuser || false,
  }

  // Mock notifications
  const notifications: Array<{
    id: string
    title: string
    message: string
    time: string
    read: boolean
  }> = []

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

  // Tab state
  const initialTab = (searchParams.get('tab') as TabId) || 'overview'
  const [activeTab, setActiveTab] = useState<TabId>(initialTab)

  // Data states
  const [schedules, setSchedules] = useState<RetentionSchedule[]>([])
  const [stats, setStats] = useState<ScheduleStats | null>(null)
  const [calendarEvents, setCalendarEvents] = useState<ScheduleCalendarEvent[]>([])
  const [reviewQueue, setReviewQueue] = useState<DispositionReviewItem[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isCalendarLoading, setIsCalendarLoading] = useState(false)
  const [isQueueLoading, setIsQueueLoading] = useState(false)

  // Error state
  const [error, setError] = useState<string | null>(null)

  // Bulk action state
  const [selectedItems, setSelectedItems] = useState<DispositionReviewItem[]>([])
  const [showBulkPanel, setShowBulkPanel] = useState(false)
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)

  // Calendar month state
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  // Update URL when tab changes
  const handleTabChange = useCallback(
    (tab: TabId) => {
      setActiveTab(tab)
      setSearchParams({ tab })
    },
    [setSearchParams]
  )

  // Fetch schedules
  const fetchSchedules = useCallback(async () => {
    try {
      const data = await getAllSchedules()
      setSchedules(data.map(mapScheduleResponse))
    } catch (err) {
      console.error('Failed to fetch schedules:', err)
    }
  }, [])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const data = await getScheduleStats()
      setStats(mapStatsResponse(data))
    } catch (err) {
      console.error('Failed to fetch schedule stats:', err)
    }
  }, [])

  // Fetch calendar events
  const fetchCalendarEvents = useCallback(async (year: number, month: number) => {
    setIsCalendarLoading(true)
    try {
      const data = await getCalendarEvents(year, month)
      setCalendarEvents(data.map(mapCalendarEventResponse))
    } catch (err) {
      console.error('Failed to fetch calendar events:', err)
    } finally {
      setIsCalendarLoading(false)
    }
  }, [])

  // Fetch review queue
  const fetchReviewQueue = useCallback(async () => {
    setIsQueueLoading(true)
    try {
      const data = await getDispositionQueue()
      setReviewQueue(data.map(mapDispositionReviewResponse))
    } catch (err) {
      console.error('Failed to fetch review queue:', err)
    } finally {
      setIsQueueLoading(false)
    }
  }, [])

  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        await Promise.all([fetchSchedules(), fetchStats()])
      } catch (err) {
        console.error('Failed to fetch initial data:', err)
        setError('Failed to load schedule data. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchInitialData()
  }, [fetchSchedules, fetchStats])

  // Fetch calendar events when tab changes to calendar or month changes
  useEffect(() => {
    if (activeTab === 'calendar') {
      fetchCalendarEvents(calendarMonth.year, calendarMonth.month)
    }
  }, [activeTab, calendarMonth, fetchCalendarEvents])

  // Fetch review queue when tab changes to review-queue
  useEffect(() => {
    if (activeTab === 'review-queue') {
      fetchReviewQueue()
    }
  }, [activeTab, fetchReviewQueue])

  // Refresh all data
  const handleRefresh = useCallback(async () => {
    setIsLoading(true)
    try {
      await Promise.all([fetchSchedules(), fetchStats()])
      if (activeTab === 'calendar') {
        await fetchCalendarEvents(calendarMonth.year, calendarMonth.month)
      }
      if (activeTab === 'review-queue') {
        await fetchReviewQueue()
      }
    } finally {
      setIsLoading(false)
    }
  }, [fetchSchedules, fetchStats, fetchCalendarEvents, fetchReviewQueue, activeTab, calendarMonth])

  // Handle month change in calendar
  const handleMonthChange = useCallback((year: number, month: number) => {
    setCalendarMonth({ year, month })
  }, [])

  // Handle calendar event click
  const handleEventClick = useCallback((_event: ScheduleCalendarEvent) => {
    // TODO: Navigate to a detail view or open a modal
  }, [])

  // Handle date select in calendar
  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date)
  }, [])

  // Handle schedule click in overview
  const handleScheduleClick = useCallback((_schedule: RetentionSchedule) => {
    // TODO: Navigate to document or show details
  }, [])

  // Handle schedule action in overview
  const handleScheduleAction = useCallback(
    async (scheduleId: string, action: 'approve' | 'defer' | 'view') => {
      if (action === 'view') {
        // Navigate to document or show details
        return
      }

      if (action === 'approve') {
        try {
          await approveDisposition(scheduleId)
          await fetchSchedules()
          await fetchStats()
        } catch (err) {
          console.error('Failed to approve schedule:', err)
        }
      }

      if (action === 'defer') {
        const deferDate = new Date()
        deferDate.setDate(deferDate.getDate() + 30)
        try {
          await deferDisposition(scheduleId, deferDate.toISOString())
          await fetchSchedules()
          await fetchStats()
        } catch (err) {
          console.error('Failed to defer schedule:', err)
        }
      }
    },
    [fetchSchedules, fetchStats]
  )

  // Handle individual item action in review queue
  const handleItemAction = useCallback(
    async (
      itemId: string,
      action: 'approve' | 'reject' | 'defer',
      data?: { reason?: string; deferUntil?: string; notes?: string }
    ) => {
      try {
        if (action === 'approve') {
          await approveDisposition(itemId, data?.notes)
        } else if (action === 'reject') {
          await rejectDisposition(itemId, data?.reason || 'Rejected')
        } else if (action === 'defer') {
          await deferDisposition(itemId, data?.deferUntil || '', data?.reason)
        }
        await fetchReviewQueue()
        await fetchStats()
      } catch (err) {
        console.error(`Failed to ${action} item:`, err)
      }
    },
    [fetchReviewQueue, fetchStats]
  )

  // Handle item selection for bulk actions
  const handleItemSelect = useCallback((item: DispositionReviewItem, selected: boolean) => {
    setSelectedItems((prev) => {
      if (selected) {
        return [...prev, item]
      } else {
        return prev.filter((i) => i.id !== item.id)
      }
    })
  }, [])

  // Handle select all
  const handleSelectAll = useCallback(
    (selected: boolean) => {
      if (selected) {
        setSelectedItems(reviewQueue.filter((item) => item.status === 'pending'))
      } else {
        setSelectedItems([])
      }
    },
    [reviewQueue]
  )

  // Update bulk panel visibility based on selection
  useEffect(() => {
    setShowBulkPanel(selectedItems.length > 0)
  }, [selectedItems])

  // Handle bulk action
  const handleBulkAction = useCallback(
    async (
      action: BulkActionType,
      data?: { reason?: string; deferUntil?: string; extensionDays?: number }
    ) => {
      setIsBulkProcessing(true)
      try {
        await performBulkAction({
          action,
          item_ids: selectedItems.map((item) => item.id),
          reason: data?.reason,
          defer_until: data?.deferUntil,
          extension_days: data?.extensionDays,
        })
        setSelectedItems([])
        await fetchReviewQueue()
        await fetchStats()
      } catch (err) {
        console.error('Failed to perform bulk action:', err)
      } finally {
        setIsBulkProcessing(false)
      }
    },
    [selectedItems, fetchReviewQueue, fetchStats]
  )

  // Convert selected items to format expected by BulkActionPanel
  const bulkPanelItems = useMemo(
    () =>
      selectedItems.map((item) => ({
        id: item.id,
        name: item.documentName,
        type: item.documentType,
        action: item.scheduledAction,
        priority: item.priority,
      })),
    [selectedItems]
  )

  // Render overview tab content
  const renderOverviewTab = () => (
    <RetentionScheduleOverview
      schedules={schedules}
      stats={stats || undefined}
      loading={isLoading}
      onScheduleClick={handleScheduleClick}
      onScheduleAction={handleScheduleAction}
      onRefresh={handleRefresh}
    />
  )

  // Render calendar tab content
  const renderCalendarTab = () => (
    <RetentionCalendarView
      events={calendarEvents}
      selectedDate={selectedDate}
      onDateSelect={handleDateSelect}
      onEventClick={handleEventClick}
      onMonthChange={handleMonthChange}
      loading={isCalendarLoading}
    />
  )

  // Render review queue tab content
  const renderReviewQueueTab = () => (
    <div className="space-y-4">
      <DispositionReviewQueue
        items={reviewQueue}
        selectedItems={selectedItems}
        onItemAction={handleItemAction}
        onItemSelect={handleItemSelect}
        onSelectAll={handleSelectAll}
        loading={isQueueLoading}
      />

      {/* Bulk Action Panel */}
      {showBulkPanel && (
        <BulkActionPanel
          selectedItems={bulkPanelItems}
          onBulkAction={handleBulkAction}
          onClearSelection={() => setSelectedItems([])}
          processing={isBulkProcessing}
        />
      )}
    </div>
  )

  // Main content renderer
  const renderContent = () => (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Schedules & Calendar
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage retention schedules, view calendar, and review disposition queue
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
              Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6">
          <div className="flex border-b border-gray-200 dark:border-gray-700 -mb-px">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const badge =
                tab.id === 'review-queue' && stats?.pendingReview ? stats.pendingReview : undefined
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {badge !== undefined && badge > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                      {badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {error ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Error Loading Data
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : isLoading && activeTab === 'overview' ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Loading schedule data...</p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'calendar' && renderCalendarTab()}
            {activeTab === 'review-queue' && renderReviewQueueTab()}
          </>
        )}
      </div>
    </div>
  )

  return (
    <ThreePanelLayout
      header={<DashboardHeader user={user} notifications={notifications} onLogout={handleLogout} />}
      leftPanel={<DashboardSidebar />}
      leftPanelWidth="auto"
      collapsibleLeft={false}
      centerPanel={renderContent()}
      collapsibleRight={false}
    />
  )
}

export default SchedulesPage
