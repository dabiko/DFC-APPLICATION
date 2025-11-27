/**
 * SecurityTab Component
 *
 * Displays security overview including MFA adoption, locked accounts,
 * recent security events, and account unlock functionality.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Shield,
  Lock,
  Unlock,
  Key,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  Activity,
  TrendingUp,
} from 'lucide-react'
import {
  getSecurityStats,
  getUsers,
  unlockUser,
  type SecurityStats,
  type User as UserType,
  getUserInitials,
} from '@/services/userManagementService'
import { cn } from '@/utils/cn'

// ============================================================================
// TYPES
// ============================================================================

interface SecurityTabProps {
  onRefresh: () => void
}

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
  trend?: { value: number; isPositive: boolean }
}

function StatCard({ title, value, subtitle, icon, color, trend }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
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
// LOCKED USER ROW COMPONENT
// ============================================================================

interface LockedUserRowProps {
  user: UserType
  onUnlock: (userId: string) => void
  isUnlocking: boolean
}

function LockedUserRow({ user, onUnlock, isUnlocking }: LockedUserRowProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
      <div className="flex items-center gap-3">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={`${user.first_name} ${user.last_name}`}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 font-medium text-sm">
            {getUserInitials(user)}
          </div>
        )}
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {user.first_name} {user.last_name}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-xs text-red-600 dark:text-red-400">
            {user.failed_login_attempts} failed attempts
          </div>
          {user.locked_until && (
            <div className="text-xs text-gray-500">
              Locked until {new Date(user.locked_until).toLocaleString()}
            </div>
          )}
        </div>
        <button
          onClick={() => onUnlock(user.id)}
          disabled={isUnlocking}
          className={cn(
            'flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
            isUnlocking
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
          )}
        >
          {isUnlocking ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Unlock className="w-4 h-4" />
          )}
          Unlock
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// MFA USER ROW COMPONENT
// ============================================================================

interface MfaUserRowProps {
  user: UserType
  hasMfa: boolean
}

function MfaUserRow({ user, hasMfa }: MfaUserRowProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={`${user.first_name} ${user.last_name}`}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 font-medium text-xs">
            {getUserInitials(user)}
          </div>
        )}
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {user.first_name} {user.last_name}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
        </div>
      </div>
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
          hasMfa
            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
        )}
      >
        {hasMfa ? (
          <>
            <CheckCircle className="w-3 h-3" />
            Enabled
          </>
        ) : (
          <>
            <XCircle className="w-3 h-3" />
            Disabled
          </>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SecurityTab({ onRefresh }: SecurityTabProps) {
  // State
  const [stats, setStats] = useState<SecurityStats | null>(null)
  const [users, setUsers] = useState<UserType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [unlockingId, setUnlockingId] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<'locked' | 'mfa'>('locked')

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [statsData, usersResponse] = await Promise.all([getSecurityStats(), getUsers()])
      setStats(statsData)
      setUsers(usersResponse.results)
    } catch (error) {
      console.error('Failed to fetch security data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Derived data
  const lockedUsers = users.filter((u) => u.is_locked)
  const mfaEnabledUsers = users.filter((u) => u.mfa_enabled)
  const mfaDisabledUsers = users.filter((u) => !u.mfa_enabled && u.is_active)

  const handleUnlock = async (userId: string) => {
    setUnlockingId(userId)
    try {
      await unlockUser(userId)
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, is_locked: false, failed_login_attempts: 0, locked_until: undefined }
            : u
        )
      )
      onRefresh()
    } catch (error) {
      console.error('Failed to unlock user:', error)
    } finally {
      setUnlockingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 overflow-auto">
      <div className="p-4 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="MFA Adoption"
            value={`${stats?.mfa_adoption_rate || 0}%`}
            subtitle={`${mfaEnabledUsers.length} of ${users.filter((u) => u.is_active).length} active users`}
            icon={<Shield className="w-5 h-5" />}
            color="green"
            trend={
              stats?.mfa_adoption_rate && stats.mfa_adoption_rate > 50
                ? { value: 12, isPositive: true }
                : undefined
            }
          />
          <StatCard
            title="Locked Accounts"
            value={lockedUsers.length}
            subtitle="Require admin action"
            icon={<Lock className="w-5 h-5" />}
            color={lockedUsers.length > 0 ? 'red' : 'green'}
          />
          <StatCard
            title="Active Sessions"
            value={stats?.active_sessions || 0}
            subtitle="Currently logged in"
            icon={<Activity className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            title="Failed Logins (24h)"
            value={stats?.failed_logins_24h || 0}
            subtitle="Last 24 hours"
            icon={<AlertTriangle className="w-5 h-5" />}
            color={stats?.failed_logins_24h && stats.failed_logins_24h > 10 ? 'red' : 'yellow'}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Locked Accounts */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-red-500" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Locked Accounts
                </h3>
                {lockedUsers.length > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                    {lockedUsers.length}
                  </span>
                )}
              </div>
              <button
                onClick={fetchData}
                disabled={isLoading}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <RefreshCw className={cn('w-4 h-4 text-gray-500', isLoading && 'animate-spin')} />
              </button>
            </div>
            <div className="p-4">
              {lockedUsers.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500" />
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    No locked accounts
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    All user accounts are accessible
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lockedUsers.map((user) => (
                    <LockedUserRow
                      key={user.id}
                      user={user}
                      onUnlock={handleUnlock}
                      isUnlocking={unlockingId === user.id}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* MFA Status */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-purple-500" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  MFA Status
                </h3>
              </div>
              <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setActiveSection('locked')}
                  className={cn(
                    'px-2 py-1 text-xs font-medium rounded transition-colors',
                    activeSection === 'locked'
                      ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-gray-100'
                      : 'text-gray-500'
                  )}
                >
                  Without MFA ({mfaDisabledUsers.length})
                </button>
                <button
                  onClick={() => setActiveSection('mfa')}
                  className={cn(
                    'px-2 py-1 text-xs font-medium rounded transition-colors',
                    activeSection === 'mfa'
                      ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-gray-100'
                      : 'text-gray-500'
                  )}
                >
                  With MFA ({mfaEnabledUsers.length})
                </button>
              </div>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              {activeSection === 'locked' ? (
                mfaDisabledUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500" />
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      All users have MFA enabled
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {mfaDisabledUsers.slice(0, 10).map((user) => (
                      <MfaUserRow key={user.id} user={user} hasMfa={false} />
                    ))}
                    {mfaDisabledUsers.length > 10 && (
                      <div className="pt-3 text-center">
                        <span className="text-xs text-gray-500">
                          +{mfaDisabledUsers.length - 10} more users without MFA
                        </span>
                      </div>
                    )}
                  </div>
                )
              ) : mfaEnabledUsers.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-yellow-500" />
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    No users have MFA enabled
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Consider enforcing MFA for better security
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {mfaEnabledUsers.slice(0, 10).map((user) => (
                    <MfaUserRow key={user.id} user={user} hasMfa={true} />
                  ))}
                  {mfaEnabledUsers.length > 10 && (
                    <div className="pt-3 text-center">
                      <span className="text-xs text-gray-500">
                        +{mfaEnabledUsers.length - 10} more users with MFA
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Security Recommendations */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            Security Recommendations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* MFA Recommendation */}
            <div
              className={cn(
                'p-4 rounded-lg border',
                (stats?.mfa_adoption_rate || 0) >= 80
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                {(stats?.mfa_adoption_rate || 0) >= 80 ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                )}
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  MFA Enforcement
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {(stats?.mfa_adoption_rate || 0) >= 80
                  ? 'MFA adoption is above 80%. Consider enforcing MFA for all users.'
                  : `Only ${stats?.mfa_adoption_rate || 0}% of users have MFA enabled. Enable MFA enforcement to improve security.`}
              </p>
            </div>

            {/* Locked Accounts Recommendation */}
            <div
              className={cn(
                'p-4 rounded-lg border',
                lockedUsers.length === 0
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                {lockedUsers.length === 0 ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <Lock className="w-5 h-5 text-red-500" />
                )}
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Account Lockouts
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {lockedUsers.length === 0
                  ? 'No accounts are currently locked. Great!'
                  : `${lockedUsers.length} account${lockedUsers.length > 1 ? 's are' : ' is'} locked. Review and unlock if appropriate.`}
              </p>
            </div>

            {/* Password Policy Recommendation */}
            <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Password Policy
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Ensure strong password requirements: minimum 12 characters, mixed case, numbers, and
                special characters.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SecurityTab
