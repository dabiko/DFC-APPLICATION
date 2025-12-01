/**
 * IntegrationsPage Component
 *
 * Manages API keys, webhooks, and third-party integrations with tabbed navigation.
 * Only accessible to organization admins with appropriate feature flags enabled.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Key,
  Webhook,
  Plug2,
  Activity,
  Loader2,
  AlertTriangle,
  Lock,
  RefreshCw,
} from 'lucide-react'
import { ThreePanelLayout } from '@/components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import {
  APIKeysTab,
  WebhooksTab,
  IntegrationsTab,
  IntegrationLogsTab,
} from '@/components/Integrations'
import { authService } from '@/services/auth.service'
import { getIntegrationStats, type IntegrationStats } from '@/services/integrationsService'
import { cn } from '@/utils/cn'

// Tab definitions
const TABS = [
  {
    id: 'api-keys',
    label: 'API Keys',
    icon: Key,
    feature: 'api_access' as const,
  },
  {
    id: 'webhooks',
    label: 'Webhooks',
    icon: Webhook,
    feature: 'webhooks' as const,
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: Plug2,
    feature: null,
  },
  {
    id: 'logs',
    label: 'Activity Logs',
    icon: Activity,
    feature: null,
  },
] as const

type TabId = (typeof TABS)[number]['id']

export function IntegrationsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Get active tab from URL or default to 'api-keys'
  const activeTab = (searchParams.get('tab') as TabId) || 'api-keys'

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Data state
  const [stats, setStats] = useState<IntegrationStats | null>(null)

  // Get user data from auth service for header
  const userData = authService.getUser()
  const user = {
    firstName: userData?.first_name || 'User',
    lastName: userData?.last_name || '',
    email: userData?.email || '',
    is_staff: userData?.is_staff || false,
    is_superuser: userData?.is_superuser || false,
  }

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
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      authService.clearTokens()
      navigate('/login')
    }
  }

  const setActiveTab = (tabId: TabId) => {
    setSearchParams({ tab: tabId })
  }

  // Load integration stats
  const loadStats = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getIntegrationStats()
      setStats(data)
    } catch (err) {
      console.error('Error loading integration stats:', err)
      setError(
        'Failed to load integration settings. You may not have permission to access this page.'
      )
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const handleRefresh = () => {
    setIsRefreshing(true)
    loadStats()
  }

  // Check if a tab's feature is enabled
  const isTabEnabled = (tab: (typeof TABS)[number]) => {
    if (!tab.feature) return true
    if (!stats?.features) return false
    return stats.features[tab.feature]
  }

  // Render the active tab content
  const renderTabContent = () => {
    if (!stats) return null

    const currentTab = TABS.find((t) => t.id === activeTab)
    if (currentTab && !isTabEnabled(currentTab)) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8">
          <Lock className="w-12 h-12 text-gray-400 mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Feature Not Available
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md">
            This feature is not included in your current subscription plan. Upgrade to access{' '}
            {currentTab.label}.
          </p>
        </div>
      )
    }

    switch (activeTab) {
      case 'api-keys':
        return <APIKeysTab onRefresh={loadStats} />
      case 'webhooks':
        return <WebhooksTab onRefresh={loadStats} />
      case 'integrations':
        return <IntegrationsTab onRefresh={loadStats} />
      case 'logs':
        return <IntegrationLogsTab />
      default:
        return null
    }
  }

  // Main content
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-50 dark:bg-gray-900">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Access Denied
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md mb-4">
            {error}
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      )
    }

    return (
      <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
        {/* Page Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Plug2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Integrations
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  API keys, webhooks, and third-party services
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
            {TABS.map((tab) => {
              const enabled = isTabEnabled(tab)
              return (
                <button
                  key={tab.id}
                  onClick={() => enabled && setActiveTab(tab.id)}
                  disabled={!enabled}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                    activeTab === tab.id
                      ? 'text-purple-600 dark:text-purple-400 border-purple-600 dark:border-purple-400'
                      : enabled
                        ? 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                        : 'text-gray-400 dark:text-gray-500 border-transparent cursor-not-allowed opacity-50'
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                  {!enabled && <Lock className="w-3 h-3" />}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Stats Summary */}
        {stats && (
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.api_keys.active}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Active API Keys</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.webhooks.active}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Active Webhooks</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.integrations.active}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Active Integrations</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.webhooks.success_rate}%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Webhook Success Rate</div>
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">{renderTabContent()}</div>
      </div>
    )
  }

  return (
    <ThreePanelLayout
      header={<DashboardHeader user={user} notifications={notifications} onLogout={handleLogout} />}
      leftPanel={<DashboardSidebar />}
      leftPanelWidth="auto"
      collapsibleLeft={false}
      centerPanel={renderContent()}
    />
  )
}

export default IntegrationsPage
