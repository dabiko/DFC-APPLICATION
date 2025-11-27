/**
 * UserDetailPanel Component
 *
 * Displays detailed user information in a side panel with activity history,
 * permissions overview, and quick actions.
 */

import { useState, useEffect } from 'react'
import {
  X,
  Mail,
  Phone,
  Building2,
  Shield,
  Calendar,
  Clock,
  MapPin,
  Activity,
  Key,
  Lock,
  Unlock,
  Edit2,
  UserX,
  UserCheck,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react'
import {
  type User,
  getUserStatus,
  getStatusColorClasses,
  getRoleColorClasses,
  formatRelativeTime,
  getUserInitials,
  ROLE_PERMISSIONS,
} from '@/services/userManagementService'
import { cn } from '@/utils/cn'

// ============================================================================
// TYPES
// ============================================================================

interface UserDetailPanelProps {
  isOpen: boolean
  user: User | null
  onClose: () => void
  onEdit: (user: User) => void
  onActivate?: (userId: string) => Promise<void>
  onDeactivate?: (userId: string) => Promise<void>
  onUnlock?: (userId: string) => Promise<void>
  onResetPassword?: (userId: string) => Promise<void>
}

interface ActivityItem {
  id: string
  action: string
  description: string
  timestamp: string
  icon: React.ReactNode
  type: 'success' | 'warning' | 'error' | 'info'
}

// ============================================================================
// MOCK ACTIVITY DATA
// ============================================================================

function generateMockActivity(user: User): ActivityItem[] {
  const activities: ActivityItem[] = []
  const now = new Date()

  if (user.last_login) {
    activities.push({
      id: '1',
      action: 'Login',
      description: 'Successfully logged in',
      timestamp: user.last_login,
      icon: <CheckCircle className="w-4 h-4" />,
      type: 'success',
    })
  }

  activities.push({
    id: '2',
    action: 'Profile Updated',
    description: 'User profile information was updated',
    timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    icon: <Edit2 className="w-4 h-4" />,
    type: 'info',
  })

  if (user.mfa_enabled) {
    activities.push({
      id: '3',
      action: 'MFA Enabled',
      description: 'Two-factor authentication was enabled',
      timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      icon: <Shield className="w-4 h-4" />,
      type: 'success',
    })
  }

  activities.push({
    id: '4',
    action: 'Account Created',
    description: 'User account was created',
    timestamp: user.date_joined,
    icon: <UserCheck className="w-4 h-4" />,
    type: 'info',
  })

  return activities.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface InfoRowProps {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {value || '—'}
        </div>
      </div>
    </div>
  )
}

interface ActionButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  variant?: 'default' | 'danger' | 'success'
  disabled?: boolean
  loading?: boolean
}

function ActionButton({
  icon,
  label,
  onClick,
  variant = 'default',
  disabled,
  loading,
}: ActionButtonProps) {
  const variantClasses = {
    default:
      'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600',
    danger:
      'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40',
    success:
      'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        variantClasses[variant],
        (disabled || loading) && 'opacity-50 cursor-not-allowed'
      )}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      <span>{label}</span>
    </button>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function UserDetailPanel({
  isOpen,
  user,
  onClose,
  onEdit,
  onActivate,
  onDeactivate,
  onUnlock,
  onResetPassword,
}: UserDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'permissions' | 'activity'>('details')
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      setActivities(generateMockActivity(user))
    }
  }, [user])

  // Don't render if not open or no user
  if (!isOpen || !user) {
    return null
  }

  const status = getUserStatus(user)
  const statusClasses = getStatusColorClasses(status)
  const roleClasses = getRoleColorClasses(user.role || 'viewer')

  // Get permissions for user's role
  const permissions = ROLE_PERMISSIONS[user.role || 'viewer'] || []

  const handleAction = async (action: string, handler?: (userId: string) => Promise<void>) => {
    if (!handler) return
    setActionLoading(action)
    try {
      await handler(user.id)
    } catch (error) {
      console.error(`Failed to ${action}:`, error)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={`${user.first_name} ${user.last_name}`}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                {getUserInitials(user)}
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {user.first_name} {user.last_name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Status and Role Badges */}
        <div className="flex items-center gap-2 mt-3">
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
              statusClasses
            )}
          >
            {status === 'Active' && <CheckCircle className="w-3 h-3" />}
            {status === 'Inactive' && <XCircle className="w-3 h-3" />}
            {status === 'Locked' && <Lock className="w-3 h-3" />}
            {status === 'Pending' && <Clock className="w-3 h-3" />}
            {status}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium capitalize',
              roleClasses
            )}
          >
            <Shield className="w-3 h-3" />
            {(user.role || 'viewer').replace('_', ' ')}
          </span>
          {user.mfa_enabled && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
              <Key className="w-3 h-3" />
              MFA
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 flex border-b border-gray-200 dark:border-gray-700">
        {(['details', 'permissions', 'activity'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize',
              activeTab === tab
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'details' && (
          <div className="space-y-1">
            <InfoRow icon={<Mail className="w-4 h-4" />} label="Email Address" value={user.email} />
            <InfoRow
              icon={<Phone className="w-4 h-4" />}
              label="Phone Number"
              value={user.phone_number}
            />
            <InfoRow
              icon={<Building2 className="w-4 h-4" />}
              label="Department"
              value={user.department?.name}
            />
            <InfoRow
              icon={<Shield className="w-4 h-4" />}
              label="Role"
              value={
                <span className="capitalize">{(user.role || 'viewer').replace('_', ' ')}</span>
              }
            />
            <InfoRow
              icon={<Calendar className="w-4 h-4" />}
              label="Joined"
              value={new Date(user.date_joined).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            />
            <InfoRow
              icon={<Clock className="w-4 h-4" />}
              label="Last Login"
              value={user.last_login ? formatRelativeTime(user.last_login) : 'Never'}
            />
            <InfoRow
              icon={<MapPin className="w-4 h-4" />}
              label="Last IP Address"
              value={user.last_login_ip || 'Unknown'}
            />
            <InfoRow
              icon={<Activity className="w-4 h-4" />}
              label="Login Count"
              value={user.login_count?.toString() || '0'}
            />

            {user.is_locked && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">Account Locked</span>
                </div>
                <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                  Failed attempts: {user.failed_login_attempts || 0}
                  {user.locked_until && (
                    <>
                      <br />
                      Locked until: {new Date(user.locked_until).toLocaleString()}
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'permissions' && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Permissions for{' '}
              <span className="font-medium capitalize">
                {(user.role || 'viewer').replace('_', ' ')}
              </span>{' '}
              role:
            </div>

            {permissions.length > 0 ? (
              <div className="space-y-2">
                {permissions.map((permission) => (
                  <div
                    key={permission}
                    className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                      {permission.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No permissions assigned</p>
              </div>
            )}

            {user.is_superuser && (
              <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">Superuser</span>
                </div>
                <p className="text-xs text-purple-500 dark:text-purple-400 mt-1">
                  This user has all permissions and bypasses all permission checks.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-4">
            {activities.length > 0 ? (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                {activities.map((activity) => (
                  <div key={activity.id} className="relative flex gap-3 pb-4">
                    <div
                      className={cn(
                        'relative z-10 w-8 h-8 rounded-full flex items-center justify-center',
                        activity.type === 'success' &&
                          'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
                        activity.type === 'warning' &&
                          'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
                        activity.type === 'error' &&
                          'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
                        activity.type === 'info' &&
                          'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      )}
                    >
                      {activity.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {activity.action}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {activity.description}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {formatRelativeTime(activity.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No activity recorded</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions Footer */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="grid grid-cols-2 gap-2">
          <ActionButton
            icon={<Edit2 className="w-4 h-4" />}
            label="Edit User"
            onClick={() => onEdit(user)}
          />
          <ActionButton
            icon={<RefreshCw className="w-4 h-4" />}
            label="Reset Password"
            onClick={() => handleAction('reset', onResetPassword)}
            loading={actionLoading === 'reset'}
          />
          {user.is_locked ? (
            <ActionButton
              icon={<Unlock className="w-4 h-4" />}
              label="Unlock Account"
              onClick={() => handleAction('unlock', onUnlock)}
              variant="success"
              loading={actionLoading === 'unlock'}
            />
          ) : user.is_active ? (
            <ActionButton
              icon={<UserX className="w-4 h-4" />}
              label="Deactivate"
              onClick={() => handleAction('deactivate', onDeactivate)}
              variant="danger"
              loading={actionLoading === 'deactivate'}
            />
          ) : (
            <ActionButton
              icon={<UserCheck className="w-4 h-4" />}
              label="Activate"
              onClick={() => handleAction('activate', onActivate)}
              variant="success"
              loading={actionLoading === 'activate'}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default UserDetailPanel
