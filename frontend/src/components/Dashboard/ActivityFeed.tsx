/**
 * ActivityFeed Component
 *
 * Displays real audit log entries as a live activity feed.
 * Replaces the hardcoded mock data in the original dashboard.
 */

import { useNavigate } from 'react-router-dom'
import {
  Upload,
  Eye,
  Pencil,
  Trash2,
  Download,
  Share2,
  FolderInput,
  Copy,
  LogIn,
  LogOut,
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  ShieldOff,
  ArrowRight,
  Activity,
} from 'lucide-react'
import { cn } from '@utils/cn'
import type { AuditLogListItem } from '@/services/auditService'
import { formatDistanceToNow } from 'date-fns'

interface ActivityFeedProps {
  activities: AuditLogListItem[]
}

const actionIcons: Record<string, React.ReactNode> = {
  CREATE: <Upload className="w-3.5 h-3.5" />,
  VIEW: <Eye className="w-3.5 h-3.5" />,
  EDIT: <Pencil className="w-3.5 h-3.5" />,
  DELETE: <Trash2 className="w-3.5 h-3.5" />,
  DOWNLOAD: <Download className="w-3.5 h-3.5" />,
  SHARE: <Share2 className="w-3.5 h-3.5" />,
  MOVE: <FolderInput className="w-3.5 h-3.5" />,
  COPY: <Copy className="w-3.5 h-3.5" />,
  LOGIN: <LogIn className="w-3.5 h-3.5" />,
  LOGOUT: <LogOut className="w-3.5 h-3.5" />,
  ACCOUNT_LOCKED: <Lock className="w-3.5 h-3.5" />,
  ACCOUNT_UNLOCKED: <Unlock className="w-3.5 h-3.5" />,
  PASSWORD_RESET: <KeyRound className="w-3.5 h-3.5" />,
  MFA_ENABLED: <ShieldCheck className="w-3.5 h-3.5" />,
  MFA_DISABLED: <ShieldOff className="w-3.5 h-3.5" />,
  PERMISSION_CHANGED: <KeyRound className="w-3.5 h-3.5" />,
}

const actionColors: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  VIEW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  EDIT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  DOWNLOAD: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  SHARE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  MOVE: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  LOGIN: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  LOGOUT: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

function getTimeAgo(timestamp: string): string {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
  } catch {
    return timestamp
  }
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const navigate = useNavigate()

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Recent Activity
          </h3>
        </div>
        <button
          onClick={() => navigate('/audit')}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          View All <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Activity className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-1">
          {activities.map((activity) => {
            const icon = actionIcons[activity.action] || <Activity className="w-3.5 h-3.5" />
            const colorClass =
              actionColors[activity.action] ||
              'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            const userName = activity.user_details?.full_name || 'System'
            const initials = userName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()

            return (
              <div
                key={activity.id}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                {/* User avatar */}
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                    {initials}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-900 dark:text-gray-100">
                    <span className="font-medium">{userName}</span>{' '}
                    <span className="text-gray-500 dark:text-gray-400">
                      {activity.action_display?.toLowerCase() || activity.action.toLowerCase()}
                    </span>{' '}
                    {activity.resource_name && (
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {activity.resource_name}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {getTimeAgo(activity.timestamp)}
                  </p>
                </div>

                {/* Action badge */}
                <div className={cn('p-1.5 rounded-md flex-shrink-0', colorClass)}>{icon}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
