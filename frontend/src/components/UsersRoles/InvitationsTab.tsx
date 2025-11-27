/**
 * InvitationsTab Component
 *
 * Displays pending, accepted, and expired invitations with
 * resend and revoke functionality.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Mail,
  Search,
  RefreshCw,
  Trash2,
  Send,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
  Shield,
  Building2,
  MoreVertical,
} from 'lucide-react'
import {
  getInvitations,
  resendInvitation,
  revokeInvitation,
  type Invitation,
  formatRelativeTime,
  getRoleColorClasses,
} from '@/services/userManagementService'
import { cn } from '@/utils/cn'

// ============================================================================
// TYPES
// ============================================================================

interface InvitationsTabProps {
  onRefresh: () => void
}

type InvitationStatus = 'all' | 'pending' | 'accepted' | 'expired' | 'revoked'

// ============================================================================
// STATUS BADGE COMPONENT
// ============================================================================

interface StatusBadgeProps {
  status: string
}

function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return {
          icon: Clock,
          classes: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
        }
      case 'accepted':
        return {
          icon: CheckCircle,
          classes: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
        }
      case 'expired':
        return {
          icon: XCircle,
          classes: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
        }
      case 'revoked':
        return {
          icon: AlertTriangle,
          classes: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
        }
      default:
        return {
          icon: Clock,
          classes: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
        }
    }
  }

  const config = getStatusConfig(status)
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium capitalize',
        config.classes
      )}
    >
      <Icon className="w-3 h-3" />
      {status}
    </span>
  )
}

// ============================================================================
// INVITATION ROW COMPONENT
// ============================================================================

interface InvitationRowProps {
  invitation: Invitation
  onResend: (id: string) => void
  onRevoke: (id: string) => void
  isResending: boolean
  isRevoking: boolean
}

function InvitationRow({
  invitation,
  onResend,
  onRevoke,
  isResending,
  isRevoking,
}: InvitationRowProps) {
  const [showMenu, setShowMenu] = useState(false)
  const roleClasses = getRoleColorClasses(invitation.role)
  const isPending = invitation.status.toLowerCase() === 'pending'

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      {/* Email */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <Mail className="w-4 h-4 text-gray-500" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {invitation.email}
            </div>
          </div>
        </div>
      </td>

      {/* Role */}
      <td className="px-4 py-3">
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium capitalize',
            roleClasses
          )}
        >
          <Shield className="w-3 h-3" />
          {invitation.role.replace('_', ' ')}
        </span>
      </td>

      {/* Department */}
      <td className="px-4 py-3">
        {invitation.department_name ? (
          <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
            <Building2 className="w-4 h-4" />
            {invitation.department_name}
          </div>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <StatusBadge status={invitation.status} />
      </td>

      {/* Sent Date */}
      <td className="px-4 py-3">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {formatRelativeTime(invitation.created_at)}
        </div>
        <div className="text-xs text-gray-400">
          {new Date(invitation.created_at).toLocaleDateString()}
        </div>
      </td>

      {/* Expires */}
      <td className="px-4 py-3">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {invitation.expires_at ? formatRelativeTime(invitation.expires_at) : '—'}
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        {isPending && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-8 z-20 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1">
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      onResend(invitation.id)
                    }}
                    disabled={isResending}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    {isResending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Resend
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      onRevoke(invitation.id)
                    }}
                    disabled={isRevoking}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                  >
                    {isRevoking ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Revoke
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </td>
    </tr>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function InvitationsTab({ onRefresh }: InvitationsTabProps) {
  // State
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<InvitationStatus>('all')
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  // Fetch invitations
  const fetchInvitations = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await getInvitations()
      setInvitations(response.results)
    } catch (error) {
      console.error('Failed to fetch invitations:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInvitations()
  }, [fetchInvitations])

  // Filter invitations
  const filteredInvitations = invitations.filter((inv) => {
    const matchesSearch =
      inv.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.last_name?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || inv.status.toLowerCase() === statusFilter

    return matchesSearch && matchesStatus
  })

  // Stats
  const stats = {
    total: invitations.length,
    pending: invitations.filter((i) => i.status.toLowerCase() === 'pending').length,
    accepted: invitations.filter((i) => i.status.toLowerCase() === 'accepted').length,
    expired: invitations.filter((i) => i.status.toLowerCase() === 'expired').length,
    revoked: invitations.filter((i) => i.status.toLowerCase() === 'revoked').length,
  }

  const handleResend = async (id: string) => {
    setResendingId(id)
    try {
      await resendInvitation(id)
      fetchInvitations()
    } catch (error) {
      console.error('Failed to resend invitation:', error)
    } finally {
      setResendingId(null)
    }
  }

  const handleRevoke = async (id: string) => {
    setRevokingId(id)
    try {
      await revokeInvitation(id)
      setInvitations((prev) =>
        prev.map((inv) => (inv.id === id ? { ...inv, status: 'revoked' } : inv))
      )
      onRefresh()
    } catch (error) {
      console.error('Failed to revoke invitation:', error)
    } finally {
      setRevokingId(null)
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
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between gap-4 mb-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search invitations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchInvitations}
            disabled={isLoading}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-5 h-5 text-gray-500', isLoading && 'animate-spin')} />
          </button>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          {(['all', 'pending', 'accepted', 'expired', 'revoked'] as InvitationStatus[]).map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors capitalize',
                  statusFilter === status
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                {status}
                <span className="ml-1 text-xs opacity-75">
                  ({status === 'all' ? stats.total : stats[status as keyof typeof stats]})
                </span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {filteredInvitations.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              No invitations found
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Invite users from the Users tab'}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Sent
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredInvitations.map((invitation) => (
                  <InvitationRow
                    key={invitation.id}
                    invitation={invitation}
                    onResend={handleResend}
                    onRevoke={handleRevoke}
                    isResending={resendingId === invitation.id}
                    isRevoking={revokingId === invitation.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats Footer */}
      <div className="flex-shrink-0 px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>
            Showing {filteredInvitations.length} of {invitations.length} invitations
          </span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-yellow-500" />
              {stats.pending} pending
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              {stats.accepted} accepted
            </span>
            <span className="flex items-center gap-1">
              <XCircle className="w-4 h-4 text-gray-400" />
              {stats.expired} expired
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InvitationsTab
