/**
 * AuditLogPage Component
 *
 * Enterprise-grade audit log viewer with advanced filtering, list/grid views,
 * infinite scrolling, and detailed log inspection capabilities.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Filter,
  RefreshCw,
  List,
  Grid3X3,
  ChevronDown,
  X,
  User,
  Activity,
  FileText,
  Folder,
  Users,
  Tag,
  Shield,
  Share2,
  Clock,
  Gavel,
  Eye,
  Edit,
  Trash2,
  Download,
  LogIn,
  LogOut,
  XCircle,
  Lock,
  Unlock,
  Key,
  ShieldOff,
  RotateCcw,
  Archive,
  ArchiveRestore,
  PlusCircle,
  Copy,
  Move,
  CheckCircle,
  AlertCircle,
  Loader2,
  ShieldAlert,
  Mail,
} from 'lucide-react'
import { DatePicker } from '@/components/UI/DatePicker'
import { ThreePanelLayout } from '@/components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import { authService } from '@/services/auth.service'
import {
  getAuditLogs,
  getAuditLog,
  getAuditLogStats,
  type AuditLogListItem,
  type AuditLog,
  type AuditLogFilters,
  type AuditLogStats,
  type AuditAction,
  type AuditResourceType,
  type AuditOutcome,
  ACTION_OPTIONS,
  RESOURCE_TYPE_OPTIONS,
  OUTCOME_OPTIONS,
  getActionColorClasses,
  getOutcomeClasses,
  isSuccessOutcome,
  formatAuditTimestamp,
  formatRelativeTime,
} from '@/services/auditService'
import { cn } from '@/utils/cn'

// ============================================================================
// ICON MAPPING
// ============================================================================

const ActionIcons: Record<string, React.FC<{ className?: string }>> = {
  CREATE: PlusCircle,
  VIEW: Eye,
  EDIT: Edit,
  DELETE: Trash2,
  DOWNLOAD: Download,
  SHARE: Share2,
  MOVE: Move,
  COPY: Copy,
  LOGIN: LogIn,
  LOGOUT: LogOut,
  FAILED_LOGIN: XCircle,
  ACCOUNT_LOCKED: Lock,
  ACCOUNT_UNLOCKED: Unlock,
  PASSWORD_RESET: Key,
  MFA_ENABLED: Shield,
  MFA_DISABLED: ShieldOff,
  PERMISSION_CHANGED: Users,
  RESTORE: RotateCcw,
  ARCHIVE: Archive,
  UNARCHIVE: ArchiveRestore,
  // Additional MFA-related actions
  MFA_VERIFICATION_SUCCESS: Shield,
  MFA_CONFIRM_FAILED: ShieldAlert,
  MFA_SETUP_INITIATED: Shield,
  MFA_SETUP_PASSWORD_FAILED: ShieldAlert,
  MFA_DISABLED_EMAIL_FAILED: ShieldOff,
  ALL_TRUSTED_DEVICES_REVOKED: ShieldOff,
  TRUSTED_DEVICE_ADDED: Shield,
  TRUSTED_DEVICE_REVOKED: ShieldOff,
  BACKUP_CODES_GENERATED: Key,
  BACKUP_CODES_USED: Key,
  MFA_BACKUP_CODES_REGENERATED: Key,
  MFA_BACKUP_CODES_REGENERATE_FAILED: Key,
}

const ResourceTypeIcons: Record<string, React.FC<{ className?: string }>> = {
  DOCUMENT: FileText,
  FOLDER: Folder,
  USER: User,
  TAG: Tag,
  PERMISSION: Shield,
  SHARE: Share2,
  RETENTION_POLICY: Clock,
  LEGAL_HOLD: Gavel,
  // Additional resource types
  MFA_SETTINGS: Shield,
  TRUSTED_DEVICE: Shield,
  EMAIL: Mail,
  BACKUP_CODES: Key,
  SESSION: LogIn,
}

// Helper function to get action icon (case-insensitive)
function getActionIcon(action: string): React.FC<{ className?: string }> {
  const normalizedAction = String(action).toUpperCase()
  return ActionIcons[normalizedAction] || Activity
}

// Helper function to get resource type icon (case-insensitive)
function getResourceIcon(resourceType: string): React.FC<{ className?: string }> {
  const normalizedType = String(resourceType).toUpperCase()
  return ResourceTypeIcons[normalizedType] || FileText
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface FilterDropdownProps {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  icon?: React.ReactNode
}

function FilterDropdown({ label, value, options, onChange, icon }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find((opt) => opt.value === value)

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors',
          value
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300'
            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
        )}
      >
        {icon}
        <span>{selectedOption?.label || label}</span>
        <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 max-h-64 overflow-y-auto">
          <button
            onClick={() => {
              onChange('')
              setIsOpen(false)
            }}
            className={cn(
              'w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700',
              !value && 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
            )}
          >
            All {label}s
          </button>
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={cn(
                'w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700',
                value === option.value &&
                  'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface DateRangePickerProps {
  startDate: string
  endDate: string
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
}

function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-2">
      <DatePicker
        value={startDate}
        onChange={onStartDateChange}
        placeholder="Start date"
        maxDate={endDate || undefined}
        className="w-[150px]"
      />
      <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">to</span>
      <DatePicker
        value={endDate}
        onChange={onEndDateChange}
        placeholder="End date"
        minDate={startDate || undefined}
        className="w-[150px]"
      />
    </div>
  )
}

interface AuditLogRowProps {
  log: AuditLogListItem
  onClick: () => void
}

function AuditLogRow({ log, onClick }: AuditLogRowProps) {
  const ActionIcon = getActionIcon(log.action)
  const ResourceIcon = getResourceIcon(log.resource_type)
  const actionColors = getActionColorClasses(log.action)
  const outcomeColors = getOutcomeClasses(log.outcome)

  return (
    <tr
      onClick={onClick}
      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-800"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={cn('p-1.5 rounded-lg', actionColors.bg)}>
            <ActionIcon className={cn('w-4 h-4', actionColors.text)} />
          </div>
          <span
            className={cn(
              'text-sm font-medium px-2 py-0.5 rounded',
              actionColors.bg,
              actionColors.text
            )}
          >
            {log.action_display}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <ResourceIcon className="w-4 h-4 text-gray-400" />
          <div>
            <div className="text-sm text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
              {log.resource_name}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {log.resource_type_display}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </div>
          <div>
            <div className="text-sm text-gray-900 dark:text-gray-100">
              {log.user_details?.full_name || log.user_details?.email || 'System'}
            </div>
            {log.user_details?.email && log.user_details.full_name && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {log.user_details.email}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div
          className="text-sm text-gray-500 dark:text-gray-400"
          title={formatAuditTimestamp(log.timestamp)}
        >
          {formatRelativeTime(log.timestamp)}
        </div>
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            'inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
            outcomeColors.bg,
            outcomeColors.text
          )}
        >
          {isSuccessOutcome(log.outcome) ? (
            <CheckCircle className="w-3 h-3" />
          ) : (
            <AlertCircle className="w-3 h-3" />
          )}
          {log.outcome}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono">
        {log.ip_address}
      </td>
    </tr>
  )
}

interface AuditLogCardProps {
  log: AuditLogListItem
  onClick: () => void
}

function AuditLogCard({ log, onClick }: AuditLogCardProps) {
  const ActionIcon = getActionIcon(log.action)
  const ResourceIcon = getResourceIcon(log.resource_type)
  const actionColors = getActionColorClasses(log.action)
  const outcomeColors = getOutcomeClasses(log.outcome)

  return (
    <div
      onClick={onClick}
      className="p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer overflow-hidden"
    >
      {/* Header - Action & Status */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className={cn('p-1.5 sm:p-2 rounded-lg flex-shrink-0', actionColors.bg)}>
            <ActionIcon className={cn('w-4 h-4 sm:w-5 sm:h-5', actionColors.text)} />
          </div>
          <div className="min-w-0 flex-1">
            <div className={cn('text-xs sm:text-sm font-semibold truncate', actionColors.text)}>
              {log.action_display}
            </div>
            <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
              {formatRelativeTime(log.timestamp)}
            </div>
          </div>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full flex-shrink-0',
            outcomeColors.bg,
            outcomeColors.text
          )}
        >
          {isSuccessOutcome(log.outcome) ? (
            <CheckCircle className="w-3 h-3" />
          ) : (
            <AlertCircle className="w-3 h-3" />
          )}
        </span>
      </div>

      {/* Resource */}
      <div className="flex items-center gap-2 mb-2 min-w-0">
        <ResourceIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
        <span className="text-xs sm:text-sm text-gray-900 dark:text-gray-100 truncate">
          {log.resource_name}
        </span>
      </div>

      {/* Footer - User & IP */}
      <div className="flex items-center justify-between text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <User className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">
            {log.user_details?.full_name || log.user_details?.email || 'System'}
          </span>
        </div>
        <span className="font-mono text-[10px] flex-shrink-0 hidden sm:block">
          {log.ip_address}
        </span>
      </div>
    </div>
  )
}

interface AuditLogDetailModalProps {
  log: AuditLog | null
  isOpen: boolean
  onClose: () => void
  isLoading: boolean
}

function AuditLogDetailModal({ log, isOpen, onClose, isLoading }: AuditLogDetailModalProps) {
  if (!isOpen) return null

  const ActionIcon = log ? getActionIcon(log.action) : Activity
  const actionColors = log ? getActionColorClasses(log.action) : { bg: '', text: '' }
  const outcomeColors = log ? getOutcomeClasses(log.outcome) : { bg: '', text: '' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Audit Log Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 max-h-[calc(90vh-120px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : log ? (
            <div className="space-y-6">
              {/* Action Header */}
              <div className="flex items-center gap-4">
                <div className={cn('p-3 rounded-xl', actionColors.bg)}>
                  <ActionIcon className={cn('w-8 h-8', actionColors.text)} />
                </div>
                <div>
                  <h3 className={cn('text-xl font-semibold', actionColors.text)}>
                    {log.action_display}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatAuditTimestamp(log.timestamp)}
                  </p>
                </div>
                <span
                  className={cn(
                    'ml-auto inline-flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-full',
                    outcomeColors.bg,
                    outcomeColors.text
                  )}
                >
                  {isSuccessOutcome(log.outcome) ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  {log.outcome_display}
                </span>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Resource
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {log.resource_name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {log.resource_type_display}
                    {log.resource_id && ` (${log.resource_id.slice(0, 8)}...)`}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                    User
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {log.user_details?.full_name || 'System'}
                  </div>
                  {log.user_details?.email && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {log.user_details.email}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                    IP Address
                  </div>
                  <div className="text-sm font-mono text-gray-900 dark:text-gray-100">
                    {log.ip_address}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Log ID
                  </div>
                  <div className="text-sm font-mono text-gray-900 dark:text-gray-100 truncate">
                    {log.id}
                  </div>
                </div>
              </div>

              {/* User Agent */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                  User Agent
                </div>
                <div className="text-sm text-gray-900 dark:text-gray-100 break-all">
                  {log.user_agent}
                </div>
              </div>

              {/* Error Message (if any) */}
              {log.error_message && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="text-xs font-medium text-red-600 dark:text-red-400 uppercase mb-1">
                    Error Message
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300">{log.error_message}</div>
                </div>
              )}

              {/* Changed Fields */}
              {log.changed_fields && log.changed_fields.length > 0 && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                    Changed Fields
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {log.changed_fields.map((field) => (
                      <span
                        key={field}
                        className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Before/After Values */}
              {(log.before_value || log.after_value) && (
                <div className="grid grid-cols-2 gap-4">
                  {log.before_value && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                        Before
                      </div>
                      <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-auto max-h-40">
                        {JSON.stringify(log.before_value, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.after_value && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                        After
                      </div>
                      <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-auto max-h-40">
                        {JSON.stringify(log.after_value, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Metadata */}
              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                    Additional Metadata
                  </div>
                  <pre className="text-xs text-gray-700 dark:text-gray-300 overflow-auto max-h-40">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">Failed to load audit log details</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AuditLogPage() {
  const navigate = useNavigate()

  // User data for header
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

  // State
  const [logs, setLogs] = useState<AuditLogListItem[]>([])
  const [stats, setStats] = useState<AuditLogStats | null>(null)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  // Loading and error states
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // View state
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [showFilters, setShowFilters] = useState(true)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [resourceTypeFilter, setResourceTypeFilter] = useState('')
  const [outcomeFilter, setOutcomeFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)

  const PAGE_SIZE = 10

  // Build filters object
  const buildFilters = useCallback((): AuditLogFilters => {
    const filters: AuditLogFilters = {
      page_size: PAGE_SIZE,
      page: 1,
    }

    if (searchQuery) filters.search = searchQuery
    if (actionFilter) filters.action = actionFilter as AuditAction
    if (resourceTypeFilter) filters.resource_type = resourceTypeFilter as AuditResourceType
    if (outcomeFilter) filters.outcome = outcomeFilter as AuditOutcome
    if (startDate) filters.start_date = startDate
    if (endDate) filters.end_date = endDate

    return filters
  }, [searchQuery, actionFilter, resourceTypeFilter, outcomeFilter, startDate, endDate])

  // Fetch initial logs
  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const filters = buildFilters()
      const response = await getAuditLogs(filters)
      setLogs(response.results)
      setTotalCount(response.count)
      setHasMore(!!response.next)
      setPage(1)
    } catch (err: unknown) {
      console.error('Failed to fetch audit logs:', err)
      // Check for permission error
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status?: number; data?: { detail?: string } } }
        if (axiosError.response?.status === 403) {
          setError(
            'You do not have permission to view audit logs. This feature is restricted to administrators.'
          )
        } else if (axiosError.response?.status === 401) {
          setError('Your session has expired. Please log in again.')
        } else {
          setError(
            axiosError.response?.data?.detail || 'Failed to load audit logs. Please try again.'
          )
        }
      } else {
        setError('Failed to load audit logs. Please check your connection and try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [buildFilters])

  // Fetch more logs (load more)
  const fetchMoreLogs = useCallback(async () => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)
    try {
      const filters = buildFilters()
      filters.page = page + 1
      const response = await getAuditLogs(filters)
      setLogs((prev) => [...prev, ...response.results])
      setHasMore(!!response.next)
      setPage((prev) => prev + 1)
    } catch (err) {
      console.error('Failed to fetch more audit logs:', err)
    } finally {
      setIsLoadingMore(false)
    }
  }, [buildFilters, page, hasMore, isLoadingMore])

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const statsData = await getAuditLogStats()
      setStats(statsData)
    } catch (err) {
      console.error('Failed to fetch audit stats:', err)
    }
  }, [])

  // Fetch log details
  const fetchLogDetails = useCallback(async (logId: string) => {
    setIsDetailLoading(true)
    setIsDetailModalOpen(true)
    try {
      const log = await getAuditLog(logId)
      setSelectedLog(log)
    } catch (err) {
      console.error('Failed to fetch audit log details:', err)
      setSelectedLog(null)
    } finally {
      setIsDetailLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchLogs()
    fetchStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Refetch when filters change
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchLogs()
    }, 300)
    return () => clearTimeout(debounceTimer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter, resourceTypeFilter, outcomeFilter, startDate, endDate])

  // Debounced search
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery !== undefined) {
        fetchLogs()
      }
    }, 500)
    return () => clearTimeout(debounceTimer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('')
    setActionFilter('')
    setResourceTypeFilter('')
    setOutcomeFilter('')
    setStartDate('')
    setEndDate('')
  }

  const hasActiveFilters =
    searchQuery || actionFilter || resourceTypeFilter || outcomeFilter || startDate || endDate

  // Infinite scroll observer
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isLoadingMore) return
      if (observerRef.current) observerRef.current.disconnect()

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          fetchMoreLogs()
        }
      })

      if (node) observerRef.current.observe(node)
    },
    [isLoadingMore, hasMore, fetchMoreLogs]
  )

  // Render the audit log content
  const renderAuditContent = () => (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Audit Logs</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Track all system activities and user actions
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Stats Summary */}
              {stats && !error && (
                <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {stats.total_actions.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
                  </div>
                  <div className="w-px h-8 bg-gray-300 dark:bg-gray-600" />
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                      {stats.success_rate}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Success</div>
                  </div>
                </div>
              )}

              {/* View Toggle */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'p-2 rounded-md transition-colors',
                    viewMode === 'list'
                      ? 'bg-white dark:bg-gray-600 shadow-sm'
                      : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                  )}
                  title="List view"
                >
                  <List className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'p-2 rounded-md transition-colors',
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-gray-600 shadow-sm'
                      : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                  )}
                  title="Grid view"
                >
                  <Grid3X3 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>
              </div>

              {/* Refresh */}
              <button
                onClick={() => {
                  fetchLogs()
                  fetchStats()
                }}
                disabled={isLoading}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={cn('w-5 h-5 text-gray-500', isLoading && 'animate-spin')} />
              </button>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        {!error && (
          <div className="px-6 pb-4">
            <div className="flex items-center gap-4 mb-3">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search logs..."
                  className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <X className="w-3 h-3 text-gray-500" />
                  </button>
                )}
              </div>

              {/* Toggle Filters */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors',
                  showFilters
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                )}
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-blue-500" />}
              </button>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            {showFilters && (
              <div className="flex flex-wrap items-center gap-3">
                <FilterDropdown
                  label="Action"
                  value={actionFilter}
                  options={ACTION_OPTIONS}
                  onChange={setActionFilter}
                  icon={<Activity className="w-4 h-4" />}
                />
                <FilterDropdown
                  label="Resource"
                  value={resourceTypeFilter}
                  options={RESOURCE_TYPE_OPTIONS}
                  onChange={setResourceTypeFilter}
                  icon={<FileText className="w-4 h-4" />}
                />
                <FilterDropdown
                  label="Outcome"
                  value={outcomeFilter}
                  options={OUTCOME_OPTIONS}
                  onChange={setOutcomeFilter}
                  icon={<CheckCircle className="w-4 h-4" />}
                />
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
                <DateRangePicker
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={setStartDate}
                  onEndDateChange={setEndDate}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {error ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-full mb-4">
              <ShieldAlert className="w-12 h-12 text-red-500 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Access Denied
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">{error}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Activity className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
              No audit logs found
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {hasActiveFilters
                ? "Try adjusting your filters to find what you're looking for"
                : 'Audit logs will appear here as activities occur'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : viewMode === 'list' ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Resource
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      IP Address
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <AuditLogRow key={log.id} log={log} onClick={() => fetchLogDetails(log.id)} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {logs.map((log) => (
              <AuditLogCard key={log.id} log={log} onClick={() => fetchLogDetails(log.id)} />
            ))}
          </div>
        )}

        {/* Load More / Infinite Scroll Trigger */}
        {!isLoading && !error && logs.length > 0 && (
          <div ref={loadMoreRef} className="flex flex-col items-center justify-center py-8 gap-4">
            {isLoadingMore && (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading more...</span>
              </div>
            )}
            {hasMore && !isLoadingMore && (
              <button
                onClick={fetchMoreLogs}
                className="px-6 py-2.5 text-sm font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Load More ({logs.length} of {totalCount})
              </button>
            )}
            {!hasMore && logs.length > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing all {logs.length} records
              </p>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AuditLogDetailModal
        log={selectedLog}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setSelectedLog(null)
        }}
        isLoading={isDetailLoading}
      />
    </div>
  )

  return (
    <ThreePanelLayout
      header={<DashboardHeader user={user} notifications={[]} onLogout={handleLogout} />}
      leftPanel={<DashboardSidebar />}
      leftPanelWidth="auto"
      collapsibleLeft={false}
      centerPanel={renderAuditContent()}
      collapsibleRight={false}
    />
  )
}

export default AuditLogPage
