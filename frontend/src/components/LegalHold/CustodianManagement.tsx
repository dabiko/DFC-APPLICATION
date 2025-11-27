/**
 * CustodianManagement Component
 * Manages custodians for a legal hold including adding, removing,
 * tracking acknowledgments, and sending notifications
 */

import { useState, useCallback, useMemo } from 'react'
import {
  Users,
  UserPlus,
  Search,
  Mail,
  CheckCircle,
  Clock,
  AlertTriangle,
  MoreVertical,
  Trash2,
  Send,
  RefreshCw,
  Download,
  X,
  Shield,
  Eye,
} from 'lucide-react'
import type { LegalHold, HoldNotification } from '@/types/retention'
import { cn } from '@/utils/cn'

// ============================================================================
// TYPES
// ============================================================================

export interface Custodian {
  id: string
  name: string
  email: string
  department?: string
  role: 'custodian' | 'legal_counsel' | 'reviewer'
  addedAt: string
  addedBy: string
  notificationStatus: 'pending' | 'sent' | 'delivered' | 'acknowledged' | 'failed'
  notificationSentAt?: string
  acknowledgedAt?: string
  documentsCount?: number
  lastActivity?: string
}

export interface CustodianManagementProps {
  isOpen: boolean
  onClose: () => void
  holdId: string
  holdName: string
  custodians: Custodian[]
  notifications?: HoldNotification[]
  availableUsers?: Array<{ id: string; name: string; email: string; department?: string }>
  onAddCustodian: (
    custodian: Omit<Custodian, 'id' | 'addedAt' | 'addedBy' | 'notificationStatus'>
  ) => Promise<void>
  onRemoveCustodian: (custodianId: string) => Promise<void>
  onUpdateRole: (custodianId: string, role: Custodian['role']) => Promise<void>
  onSendNotification?: (custodianIds: string[]) => Promise<void>
  onResendNotification: (custodianId: string) => Promise<void>
  onExportCustodians?: () => void
  loading?: boolean
  canEdit?: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ROLE_LABELS: Record<
  Custodian['role'],
  { label: string; description: string; color: string }
> = {
  custodian: {
    label: 'Custodian',
    description: 'Responsible for preserving documents',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  legal_counsel: {
    label: 'Legal Counsel',
    description: 'Provides legal oversight',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  },
  reviewer: {
    label: 'Reviewer',
    description: 'Reviews hold compliance',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  },
}

const NOTIFICATION_STATUS_CONFIG: Record<
  Custodian['notificationStatus'],
  { label: string; icon: React.FC<{ className?: string }>; color: string }
> = {
  pending: {
    label: 'Pending',
    icon: Clock,
    color: 'text-gray-500 dark:text-gray-400',
  },
  sent: {
    label: 'Sent',
    icon: Send,
    color: 'text-blue-500 dark:text-blue-400',
  },
  delivered: {
    label: 'Delivered',
    icon: Mail,
    color: 'text-blue-600 dark:text-blue-400',
  },
  acknowledged: {
    label: 'Acknowledged',
    icon: CheckCircle,
    color: 'text-green-600 dark:text-green-400',
  },
  failed: {
    label: 'Failed',
    icon: AlertTriangle,
    color: 'text-red-500 dark:text-red-400',
  },
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CustodianManagement({
  isOpen,
  onClose,
  holdId,
  holdName,
  custodians,
  availableUsers = [],
  onAddCustodian,
  onRemoveCustodian,
  onUpdateRole,
  onSendNotification,
  onResendNotification,
  onExportCustodians,
  loading = false,
  canEdit = true,
}: CustodianManagementProps) {
  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedCustodians, setSelectedCustodians] = useState<Set<string>>(new Set())
  const [filterRole, setFilterRole] = useState<Custodian['role'] | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<Custodian['notificationStatus'] | 'all'>('all')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Add modal state
  const [addUserSearch, setAddUserSearch] = useState('')
  const [selectedRole, setSelectedRole] = useState<Custodian['role']>('custodian')

  // Filter and search custodians
  const filteredCustodians = useMemo(() => {
    return custodians.filter((c) => {
      const matchesSearch =
        !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.department?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesRole = filterRole === 'all' || c.role === filterRole
      const matchesStatus = filterStatus === 'all' || c.notificationStatus === filterStatus

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [custodians, searchQuery, filterRole, filterStatus])

  // Statistics
  const stats = useMemo(() => {
    const total = custodians.length
    const acknowledged = custodians.filter((c) => c.notificationStatus === 'acknowledged').length
    const pending = custodians.filter(
      (c) => c.notificationStatus === 'pending' || c.notificationStatus === 'sent'
    ).length
    const failed = custodians.filter((c) => c.notificationStatus === 'failed').length

    return { total, acknowledged, pending, failed }
  }, [custodians])

  // Filter available users
  const filteredUsers = useMemo(() => {
    if (!addUserSearch.trim()) return availableUsers.slice(0, 10)
    const search = addUserSearch.toLowerCase()
    return availableUsers
      .filter(
        (u) =>
          !custodians.some((c) => c.id === u.id) &&
          (u.name.toLowerCase().includes(search) ||
            u.email.toLowerCase().includes(search) ||
            u.department?.toLowerCase().includes(search))
      )
      .slice(0, 10)
  }, [availableUsers, addUserSearch, custodians])

  // Handlers
  const handleSelectAll = useCallback(() => {
    if (selectedCustodians.size === filteredCustodians.length) {
      setSelectedCustodians(new Set())
    } else {
      setSelectedCustodians(new Set(filteredCustodians.map((c) => c.id)))
    }
  }, [filteredCustodians, selectedCustodians])

  const handleToggleSelect = useCallback((custodianId: string) => {
    setSelectedCustodians((prev) => {
      const next = new Set(prev)
      if (next.has(custodianId)) {
        next.delete(custodianId)
      } else {
        next.add(custodianId)
      }
      return next
    })
  }, [])

  const handleSendNotifications = useCallback(async () => {
    if (selectedCustodians.size === 0) return
    setIsProcessing(true)
    try {
      await onSendNotification(Array.from(selectedCustodians))
      setSelectedCustodians(new Set())
    } finally {
      setIsProcessing(false)
    }
  }, [selectedCustodians, onSendNotification])

  const handleAddUser = useCallback(
    async (user: { id: string; name: string; email: string; department?: string }) => {
      setIsProcessing(true)
      try {
        await onAddCustodian({
          ...user,
          role: selectedRole,
        })
        setAddUserSearch('')
      } finally {
        setIsProcessing(false)
      }
    },
    [onAddCustodian, selectedRole]
  )

  const handleRemove = useCallback(
    async (custodianId: string) => {
      setIsProcessing(true)
      try {
        await onRemoveCustodian(custodianId)
        setOpenMenuId(null)
      } finally {
        setIsProcessing(false)
      }
    },
    [onRemoveCustodian]
  )

  const handleResend = useCallback(
    async (custodianId: string) => {
      setIsProcessing(true)
      try {
        await onResendNotification(custodianId)
        setOpenMenuId(null)
      } finally {
        setIsProcessing(false)
      }
    },
    [onResendNotification]
  )

  const handleRoleChange = useCallback(
    async (custodianId: string, role: Custodian['role']) => {
      setIsProcessing(true)
      try {
        await onUpdateRole(custodianId, role)
        setOpenMenuId(null)
      } finally {
        setIsProcessing(false)
      }
    },
    [onUpdateRole]
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Manage Custodians
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {holdName} - {stats.total} custodian{stats.total !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.total}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Custodians</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.acknowledged}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Acknowledged</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                    <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.pending}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.failed}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Failed</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search custodians..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                  />
                </div>

                {/* Filters */}
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value as typeof filterRole)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                >
                  <option value="all">All Roles</option>
                  <option value="custodian">Custodians</option>
                  <option value="legal_counsel">Legal Counsel</option>
                  <option value="reviewer">Reviewers</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="sent">Sent</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                {selectedCustodians.size > 0 && (
                  <button
                    onClick={handleSendNotifications}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                  >
                    <Send className="w-4 h-4" />
                    Send Notifications ({selectedCustodians.size})
                  </button>
                )}

                <button
                  onClick={onExportCustodians}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>

                {canEdit && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Custodian
                  </button>
                )}
              </div>
            </div>

            {/* Custodian Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="w-12 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={
                          filteredCustodians.length > 0 &&
                          selectedCustodians.size === filteredCustodians.length
                        }
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Custodian
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Added
                    </th>
                    <th className="w-12 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <RefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Loading custodians...
                        </p>
                      </td>
                    </tr>
                  ) : filteredCustodians.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <Users className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {searchQuery || filterRole !== 'all' || filterStatus !== 'all'
                            ? 'No custodians match your filters'
                            : 'No custodians added yet'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredCustodians.map((custodian) => {
                      const StatusIcon =
                        NOTIFICATION_STATUS_CONFIG[custodian.notificationStatus].icon
                      const roleConfig = ROLE_LABELS[custodian.role]

                      return (
                        <tr
                          key={custodian.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedCustodians.has(custodian.id)}
                              onChange={() => handleToggleSelect(custodian.id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                  {custodian.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {custodian.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {custodian.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                'px-2 py-1 text-xs font-medium rounded-full',
                                roleConfig.color
                              )}
                            >
                              {roleConfig.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {custodian.department || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <StatusIcon
                                className={cn(
                                  'w-4 h-4',
                                  NOTIFICATION_STATUS_CONFIG[custodian.notificationStatus].color
                                )}
                              />
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {NOTIFICATION_STATUS_CONFIG[custodian.notificationStatus].label}
                              </span>
                            </div>
                            {custodian.acknowledgedAt && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                {formatDate(custodian.acknowledgedAt)}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {formatDate(custodian.addedAt)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="relative">
                              <button
                                onClick={() =>
                                  setOpenMenuId(openMenuId === custodian.id ? null : custodian.id)
                                }
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                              >
                                <MoreVertical className="w-4 h-4 text-gray-500" />
                              </button>

                              {openMenuId === custodian.id && (
                                <>
                                  <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setOpenMenuId(null)}
                                  />
                                  <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                                    <div className="py-1">
                                      <button
                                        onClick={() => handleResend(custodian.id)}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                      >
                                        <RefreshCw className="w-4 h-4" />
                                        Resend Notification
                                      </button>
                                      {canEdit && (
                                        <>
                                          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                                          <div className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                                            Change Role
                                          </div>
                                          {(
                                            ['custodian', 'legal_counsel', 'reviewer'] as const
                                          ).map((role) => (
                                            <button
                                              key={role}
                                              onClick={() => handleRoleChange(custodian.id, role)}
                                              className={cn(
                                                'w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700',
                                                custodian.role === role
                                                  ? 'text-blue-600 dark:text-blue-400'
                                                  : 'text-gray-700 dark:text-gray-300'
                                              )}
                                            >
                                              {role === 'custodian' && (
                                                <Users className="w-4 h-4" />
                                              )}
                                              {role === 'legal_counsel' && (
                                                <Shield className="w-4 h-4" />
                                              )}
                                              {role === 'reviewer' && <Eye className="w-4 h-4" />}
                                              {ROLE_LABELS[role].label}
                                              {custodian.role === role && (
                                                <CheckCircle className="w-3 h-3 ml-auto" />
                                              )}
                                            </button>
                                          ))}
                                          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                                          <button
                                            onClick={() => handleRemove(custodian.id)}
                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                            Remove Custodian
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Add Custodian Modal */}
            {showAddModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-2xl">
                  <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Add Custodian
                    </h3>
                    <button
                      onClick={() => setShowAddModal(false)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Role Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Role
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['custodian', 'legal_counsel', 'reviewer'] as const).map((role) => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => setSelectedRole(role)}
                            className={cn(
                              'p-3 border rounded-lg text-left transition-colors',
                              selectedRole === role
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                                : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                            )}
                          >
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {ROLE_LABELS[role].label}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {ROLE_LABELS[role].description}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* User Search */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Search Users
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={addUserSearch}
                          onChange={(e) => setAddUserSearch(e.target.value)}
                          placeholder="Search by name, email, or department..."
                          className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                        />
                      </div>

                      {/* User Results */}
                      {filteredUsers.length > 0 && (
                        <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg max-h-60 overflow-y-auto">
                          {filteredUsers.map((user) => (
                            <button
                              key={user.id}
                              onClick={() => handleAddUser(user)}
                              disabled={isProcessing}
                              className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                    {user.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {user.name}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {user.email}
                                    {user.department && ` • ${user.department}`}
                                  </p>
                                </div>
                              </div>
                              <UserPlus className="w-4 h-4 text-gray-400" />
                            </button>
                          ))}
                        </div>
                      )}

                      {addUserSearch && filteredUsers.length === 0 && (
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                          No users found matching your search
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end p-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustodianManagement
