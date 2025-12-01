/**
 * AutomationPage Component
 *
 * Enterprise-grade automation management dashboard for retention workflows.
 * Phase 5: Automation & Notifications
 *
 * Tabs:
 * - Dashboard (Overview & Stats)
 * - Scheduled Jobs (Job management and monitoring)
 * - Notifications (User notification preferences)
 * - Email Templates (Template management)
 * - Enforcement (Auto-enforcement settings)
 */

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Zap,
  Bell,
  Mail,
  Settings,
  Clock,
  Calendar,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Play,
  TrendingUp,
  FileText,
  Archive,
  LayoutDashboard,
  Brain,
} from 'lucide-react'
import { ThreePanelLayout } from '@/components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import { authService } from '@/services/auth.service'
import {
  NotificationPreferences,
  EmailTemplatesManager,
  AutoEnforcementSettings,
  ScheduledJobsDashboard,
  MLClassificationDashboard,
} from '@/components/Automation'
import {
  getAutomationStats,
  getScheduledJobs,
  getUpcomingJobs,
  type AutomationStats,
  type ScheduledJob,
} from '@/services/retentionService'
import { cn } from '@/utils/cn'
import { getJobTypeLabel } from '@/types/retention'

// ============================================================================
// TYPES
// ============================================================================

type TabId = 'dashboard' | 'classification' | 'jobs' | 'notifications' | 'templates' | 'enforcement'

interface Tab {
  id: TabId
  label: string
  icon: React.FC<{ className?: string }>
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TABS: Tab[] = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'classification', label: 'Classification', icon: Brain },
  { id: 'jobs', label: 'Scheduled Jobs', icon: Clock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'templates', label: 'Email Templates', icon: Mail },
  { id: 'enforcement', label: 'Enforcement', icon: Settings },
]

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AutomationPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabId>(
    (searchParams.get('tab') as TabId) || 'dashboard'
  )

  // Data state
  const [stats, setStats] = useState<AutomationStats | null>(null)
  const [jobs, setJobs] = useState<ScheduledJob[]>([])
  const [upcomingJobs, setUpcomingJobs] = useState<ScheduledJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Get user data from auth service
  const userData = authService.getUser()
  const user = {
    firstName: userData?.first_name || 'User',
    lastName: userData?.last_name || '',
    email: userData?.email || '',
    is_staff: userData?.is_staff || false,
    is_superuser: userData?.is_superuser || false,
  }

  // Mock notifications
  const notifications = [
    {
      id: '1',
      title: 'Automation job completed',
      message: 'Retention policy scan completed successfully',
      time: '15m ago',
      read: false,
    },
  ]

  // Handle logout
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

  // Update URL when tab changes
  useEffect(() => {
    setSearchParams({ tab: activeTab })
  }, [activeTab, setSearchParams])

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const [statsData, jobsData, upcomingData] = await Promise.all([
        getAutomationStats(),
        getScheduledJobs(),
        getUpcomingJobs(5),
      ])
      setStats(statsData)
      setJobs(jobsData)
      setUpcomingJobs(upcomingData)
    } catch (error) {
      console.error('Failed to fetch automation data:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchData()
  }

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId)
  }

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================

  const renderDashboardTab = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )
    }

    const activeJobs = jobs.filter((j) => j.status === 'running').length
    const pausedJobs = jobs.filter((j) => j.status === 'paused').length
    const failedJobs = jobs.filter((j) => j.status === 'failed').length

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Jobs</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats?.activeJobs || activeJobs}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Play className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            {pausedJobs > 0 && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{pausedJobs} paused</p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Completed Today</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats?.completedToday || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Failed Today</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats?.failedToday || failedJobs}
                </p>
              </div>
              <div
                className={cn(
                  'p-3 rounded-lg',
                  (stats?.failedToday || failedJobs) > 0
                    ? 'bg-red-100 dark:bg-red-900/30'
                    : 'bg-gray-100 dark:bg-gray-700'
                )}
              >
                <AlertCircle
                  className={cn(
                    'h-6 w-6',
                    (stats?.failedToday || failedJobs) > 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-400 dark:text-gray-500'
                  )}
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Success Rate</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats?.successRate || 100}%
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Documents Processed</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {stats?.documentsProcessed?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded">
                <Archive className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Archived</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {stats?.documentsArchived?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded">
                <Bell className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Notifications Sent</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {stats?.notificationsSent?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Jobs */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Upcoming Jobs
                </h3>
                <button
                  onClick={() => handleTabChange('jobs')}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View all
                </button>
              </div>
            </div>
            <div className="p-4">
              {upcomingJobs.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No upcoming jobs scheduled
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingJobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-2 h-2 rounded-full',
                            job.status === 'scheduled'
                              ? 'bg-blue-500'
                              : job.status === 'running'
                                ? 'bg-green-500'
                                : 'bg-gray-400'
                          )}
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {job.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {getJobTypeLabel(job.type)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {job.nextRunAt
                            ? new Date(job.nextRunAt).toLocaleDateString()
                            : 'Not scheduled'}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {job.nextRunAt
                            ? new Date(job.nextRunAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Errors */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Recent Errors
              </h3>
            </div>
            <div className="p-4">
              {!stats?.recentErrors || stats.recentErrors.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No recent errors</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.recentErrors.slice(0, 5).map((error, index) => (
                    <div
                      key={index}
                      className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
                    >
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-red-800 dark:text-red-200">{error.message}</p>
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            {new Date(error.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-medium text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => handleTabChange('jobs')}
              className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Clock className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">View Jobs</span>
            </button>
            <button
              onClick={() => handleTabChange('notifications')}
              className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Bell className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Notifications</span>
            </button>
            <button
              onClick={() => handleTabChange('templates')}
              className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Mail className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Templates</span>
            </button>
            <button
              onClick={() => handleTabChange('enforcement')}
              className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Settings className="h-5 w-5 text-amber-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Enforcement</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboardTab()
      case 'classification':
        return <MLClassificationDashboard />
      case 'jobs':
        return (
          <ScheduledJobsDashboard
            jobs={jobs}
            stats={stats || undefined}
            isLoading={isLoading}
            onRefresh={handleRefresh}
          />
        )
      case 'notifications':
        return <NotificationPreferences />
      case 'templates':
        return <EmailTemplatesManager />
      case 'enforcement':
        return <AutoEnforcementSettings />
      default:
        return null
    }
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <ThreePanelLayout
      header={<DashboardHeader user={user} notifications={notifications} onLogout={handleLogout} />}
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
                  <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Automation Center
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Manage automated retention workflows and notifications
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
                      ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                      : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
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

export default AutomationPage
