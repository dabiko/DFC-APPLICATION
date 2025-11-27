/**
 * UsersRolesPage Component
 *
 * Enterprise-grade user and role management interface with tabbed navigation,
 * advanced filtering, and comprehensive administration features.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Users,
  Shield,
  Building2,
  Mail,
  Lock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { ThreePanelLayout } from '@/components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import { authService } from '@/services/auth.service'
import {
  UsersTab,
  RolesTab,
  DepartmentsTab,
  InvitationsTab,
  SecurityTab,
} from '@/components/UsersRoles'
import { getUserManagementStats, type UserManagementStats } from '@/services/userManagementService'
import { cn } from '@/utils/cn'

// ============================================================================
// TYPES
// ============================================================================

type TabId = 'users' | 'roles' | 'departments' | 'invitations' | 'security'

interface Tab {
  id: TabId
  label: string
  icon: React.FC<{ className?: string }>
  description: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TABS: Tab[] = [
  {
    id: 'users',
    label: 'Users',
    icon: Users,
    description: 'Manage user accounts and profiles',
  },
  {
    id: 'roles',
    label: 'Roles & Permissions',
    icon: Shield,
    description: 'Configure roles and access control',
  },
  {
    id: 'departments',
    label: 'Departments',
    icon: Building2,
    description: 'Organize users by department',
  },
  {
    id: 'invitations',
    label: 'Invitations',
    icon: Mail,
    description: 'Manage pending invitations',
  },
  {
    id: 'security',
    label: 'Security',
    icon: Lock,
    description: 'Monitor security and MFA',
  },
]

// ============================================================================
// KPI CARD COMPONENT
// ============================================================================

interface KPICardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: { value: number; isPositive: boolean }
  subtitle?: string
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo'
  onClick?: () => void
}

function KPICard({ title, value, icon, trend, subtitle, color, onClick }: KPICardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 transition-all',
        onClick && 'cursor-pointer hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600'
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn('p-2 rounded-lg', colorClasses[color])}>{icon}</div>
        {trend && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-medium',
              trend.isPositive
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            )}
          >
            <TrendingUp className={cn('w-3 h-3', !trend.isPositive && 'rotate-180')} />
            {trend.value}%
          </div>
        )}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
        <div className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</div>
        {subtitle && (
          <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">{subtitle}</div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function UsersRolesPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Get active tab from URL or default to 'users'
  const activeTab = (searchParams.get('tab') as TabId) || 'users'

  // User data for header
  const userData = authService.getUser()
  const user = {
    firstName: userData?.first_name || 'User',
    lastName: userData?.last_name || '',
    email: userData?.email || '',
  }

  // State
  const [stats, setStats] = useState<UserManagementStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

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

  // Fetch stats
  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true)
    try {
      const data = await getUserManagementStats()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setIsLoadingStats(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats, refreshKey])

  // Handle tab change
  const handleTabChange = (tabId: TabId) => {
    setSearchParams({ tab: tabId })
  }

  // Handle refresh
  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1)
  }

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return <UsersTab onRefresh={handleRefresh} />
      case 'roles':
        return <RolesTab onRefresh={handleRefresh} />
      case 'departments':
        return <DepartmentsTab onRefresh={handleRefresh} />
      case 'invitations':
        return <InvitationsTab onRefresh={handleRefresh} />
      case 'security':
        return <SecurityTab onRefresh={handleRefresh} />
      default:
        return <UsersTab onRefresh={handleRefresh} />
    }
  }

  // Render main content
  const renderContent = () => (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header with KPIs */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Users & Roles
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage users, roles, departments, and security settings
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isLoadingStats}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw
                  className={cn('w-5 h-5 text-gray-500', isLoadingStats && 'animate-spin')}
                />
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          {isLoadingStats ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <KPICard
                title="Total Users"
                value={stats.total_users}
                icon={<Users className="w-5 h-5" />}
                trend={
                  stats.new_users_this_month > 0
                    ? {
                        value: Math.round((stats.new_users_this_month / stats.total_users) * 100),
                        isPositive: true,
                      }
                    : undefined
                }
                subtitle={`+${stats.new_users_this_month} this month`}
                color="blue"
                onClick={() => handleTabChange('users')}
              />
              <KPICard
                title="Active Users"
                value={stats.active_users}
                icon={<CheckCircle className="w-5 h-5" />}
                subtitle="Last 30 days"
                color="green"
                onClick={() => handleTabChange('users')}
              />
              <KPICard
                title="Pending Invites"
                value={stats.pending_invitations}
                icon={<Mail className="w-5 h-5" />}
                subtitle="Awaiting response"
                color="yellow"
                onClick={() => handleTabChange('invitations')}
              />
              <KPICard
                title="Locked Accounts"
                value={stats.locked_accounts}
                icon={<AlertTriangle className="w-5 h-5" />}
                subtitle="Need attention"
                color="red"
                onClick={() => handleTabChange('security')}
              />
              <KPICard
                title="MFA Adoption"
                value={`${stats.mfa_adoption_rate}%`}
                icon={<Shield className="w-5 h-5" />}
                subtitle="Users with MFA"
                color="purple"
                onClick={() => handleTabChange('security')}
              />
              <KPICard
                title="Departments"
                value={stats.total_departments}
                icon={<Building2 className="w-5 h-5" />}
                subtitle="Active departments"
                color="indigo"
                onClick={() => handleTabChange('departments')}
              />
            </div>
          ) : null}
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-t border-gray-200 dark:border-gray-700">
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                    isActive
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">{renderTabContent()}</div>
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

export default UsersRolesPage
