/**
 * SharedWithMePage Component
 * Enterprise-standard view for documents and folders shared with the current user.
 *
 * Features:
 * - Time-based grouping (Today, This Week, This Month, Earlier)
 * - Shortcuts/pinned items section
 * - Filter by resource type (Documents, Folders)
 * - Filter by permission level (View, Comment, Edit, Full)
 * - Filter by share source (Direct, Folder, Department, Team)
 * - Filter by external/internal shares
 * - Pending invitations tab
 * - Search within shared items
 * - List/Grid view toggle
 * - Context menu with quick actions
 * - Permission badges with color coding
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Folder,
  FileText,
  Loader2,
  Search,
  List,
  Grid3X3,
  X,
  Pin,
  PinOff,
  Eye,
  Pencil,
  Download,
  ExternalLink,
  UserMinus,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Shield,
  MessageSquare,
  Check,
  XCircle,
  Mail,
  Globe,
  ArrowUpCircle,
  ShieldAlert,
} from 'lucide-react'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { ContextMenu, type ContextMenuItem } from '@/components/common/ContextMenu'
import { authService } from '@/services/auth.service'
import {
  getSharedWithMe,
  toggleShortcut,
  leaveSharedItem,
  recordAccess,
  getSharedWithMeStats,
  getPendingInvitations,
  acceptInvitation,
  declineInvitation,
  getPermissionLabel,
  getPermissionColor,
  formatFileSize,
  type GroupedSharedItems,
  type SharedItemListItem,
  type SharedWithMeStats,
  type SharedWithMeFilters,
  type ShareInvitation,
  type PermissionLevel,
} from '@/services/sharedWithMeService'
import { toast } from '@/utils/toast'
import { cn } from '@/utils/cn'
import { ConfidentialityBadge } from '@/components/Badge/ConfidentialityBadge'
import { AcknowledgementModal } from '@/components/Sharing/AcknowledgementModal'
import { RequestAccessModal } from '@/components/Sharing/RequestAccessModal'

// Constants
const VIEW_STORAGE_KEY = 'shared-with-me-view-mode'

type ViewMode = 'list' | 'grid'
type TabType = 'all' | 'documents' | 'folders' | 'pending' | 'external'
type TimeGroup = 'shortcuts' | 'today' | 'this_week' | 'this_month' | 'earlier'

// Tab configuration
const TABS: { value: TabType; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All', icon: <Users className="w-4 h-4" /> },
  { value: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
  { value: 'folders', label: 'Folders', icon: <Folder className="w-4 h-4" /> },
  { value: 'pending', label: 'Pending', icon: <Mail className="w-4 h-4" /> },
  { value: 'external', label: 'External', icon: <Globe className="w-4 h-4" /> },
]

// Permission filter options
const PERMISSION_OPTIONS: { value: PermissionLevel | ''; label: string }[] = [
  { value: '', label: 'All Permissions' },
  { value: 'VIEW', label: 'Can View' },
  { value: 'COMMENT', label: 'Can Comment' },
  { value: 'EDIT', label: 'Can Edit' },
  { value: 'FULL', label: 'Full Access' },
]

// Get time group label
const getTimeGroupLabel = (group: TimeGroup): string => {
  const labels: Record<TimeGroup, string> = {
    shortcuts: 'Shortcuts',
    today: 'Today',
    this_week: 'This Week',
    this_month: 'This Month',
    earlier: 'Earlier',
  }
  return labels[group] || group
}

// Get permission icon
const getPermissionIcon = (level: PermissionLevel) => {
  const icons: Record<PermissionLevel, React.ReactNode> = {
    VIEW: <Eye className="w-3.5 h-3.5" />,
    COMMENT: <MessageSquare className="w-3.5 h-3.5" />,
    EDIT: <Pencil className="w-3.5 h-3.5" />,
    FULL: <Shield className="w-3.5 h-3.5" />,
  }
  return icons[level] || <Eye className="w-3.5 h-3.5" />
}

export function SharedWithMePage() {
  const navigate = useNavigate()

  // Get user data from auth service
  const userData = authService.getUser()
  const user = {
    firstName: userData?.first_name || 'User',
    lastName: userData?.last_name || '',
    email: userData?.email || '',
    is_staff: userData?.is_staff || false,
    is_superuser: userData?.is_superuser || false,
  }

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

  // State
  const [sharedItems, setSharedItems] = useState<GroupedSharedItems | null>(null)
  const [pendingInvitations, setPendingInvitations] = useState<ShareInvitation[]>([])
  const [stats, setStats] = useState<SharedWithMeStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [permissionFilter, setPermissionFilter] = useState<PermissionLevel | ''>('')
  const [sourceFilter, _setSourceFilter] = useState<string>('')
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY)
    return (saved as ViewMode) || 'list'
  })
  const [expandedGroups, setExpandedGroups] = useState<Set<TimeGroup>>(
    new Set(['shortcuts', 'today', 'this_week', 'this_month'])
  )

  // Filter dropdown states
  const [showPermissionFilter, setShowPermissionFilter] = useState(false)
  const [showSourceFilter, setShowSourceFilter] = useState(false)
  const permissionFilterRef = useRef<HTMLButtonElement>(null)
  const sourceFilterRef = useRef<HTMLButtonElement>(null)

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean
    position: { x: number; y: number }
    item: SharedItemListItem | null
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    item: null,
  })

  // Modal states
  const [acknowledgementModal, setAcknowledgementModal] = useState<{
    isOpen: boolean
    invitation: ShareInvitation | null
  }>({
    isOpen: false,
    invitation: null,
  })

  const [requestAccessModal, setRequestAccessModal] = useState<{
    isOpen: boolean
    item: SharedItemListItem | null
  }>({
    isOpen: false,
    item: null,
  })

  // Load data
  const loadData = useCallback(
    async (showLoader = true) => {
      if (showLoader) setIsLoading(true)
      else setIsRefreshing(true)

      try {
        const filters: SharedWithMeFilters = {}

        if (activeTab === 'documents') {
          filters.resource_type = 'DOCUMENT'
        } else if (activeTab === 'folders') {
          filters.resource_type = 'FOLDER'
        } else if (activeTab === 'external') {
          filters.is_external = true
        }

        if (permissionFilter) {
          filters.permission_level = permissionFilter
        }

        if (searchQuery.trim()) {
          filters.search = searchQuery.trim()
        }

        const [itemsData, statsData, invitationsData] = await Promise.all([
          activeTab !== 'pending' ? getSharedWithMe(filters) : Promise.resolve(null),
          getSharedWithMeStats(),
          activeTab === 'pending' || activeTab === 'all'
            ? getPendingInvitations()
            : Promise.resolve([]),
        ])

        if (itemsData) {
          setSharedItems(itemsData)
        }
        setStats(statsData)
        setPendingInvitations(invitationsData)
      } catch (error) {
        console.error('Failed to load shared items:', error)
        toast.error('Failed to load shared items')
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [activeTab, permissionFilter, searchQuery]
  )

  useEffect(() => {
    loadData()
  }, [loadData])

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, viewMode)
  }, [viewMode])

  // Close filter dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (permissionFilterRef.current && !permissionFilterRef.current.contains(e.target as Node)) {
        setShowPermissionFilter(false)
      }
      if (sourceFilterRef.current && !sourceFilterRef.current.contains(e.target as Node)) {
        setShowSourceFilter(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter items by source (client-side additional filtering)
  const filteredItems = useMemo(() => {
    if (!sharedItems) return null

    // If no source filter, return as-is
    if (!sourceFilter) return sharedItems

    // Filter each group by source
    const filterBySource = (items: SharedItemListItem[]) =>
      items.filter((_item) => {
        // Note: source filtering would need to be added to the API or tracked separately
        // For now, this is a placeholder - the API should handle this
        return true
      })

    return {
      ...sharedItems,
      shortcuts: filterBySource(sharedItems.shortcuts),
      today: filterBySource(sharedItems.today),
      this_week: filterBySource(sharedItems.this_week),
      this_month: filterBySource(sharedItems.this_month),
      earlier: filterBySource(sharedItems.earlier),
    }
  }, [sharedItems, sourceFilter])

  // Toggle group expansion
  const toggleGroup = (group: TimeGroup) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) {
        next.delete(group)
      } else {
        next.add(group)
      }
      return next
    })
  }

  // Handle shortcut toggle
  const handleToggleShortcut = useCallback(
    async (item: SharedItemListItem) => {
      try {
        const result = await toggleShortcut(item.id, !item.is_shortcut)
        if (result.success) {
          toast.success(result.is_shortcut ? 'Added to shortcuts' : 'Removed from shortcuts')
          loadData(false)
        }
      } catch (error) {
        console.error('Failed to toggle shortcut:', error)
        toast.error('Failed to update shortcut')
      }
    },
    [loadData]
  )

  // Handle leave share
  const handleLeaveShare = useCallback(
    async (item: SharedItemListItem) => {
      try {
        const result = await leaveSharedItem(item.id)
        if (result.success) {
          toast.success(result.message)
          loadData(false)
        }
      } catch (error) {
        console.error('Failed to leave share:', error)
        toast.error('Failed to leave share')
      }
    },
    [loadData]
  )

  // Handle item click (navigate to document/folder)
  const handleItemClick = useCallback(
    async (item: SharedItemListItem) => {
      // Record access
      try {
        await recordAccess(item.id)
      } catch (error) {
        console.error('Failed to record access:', error)
      }

      if (item.resource_type === 'DOCUMENT') {
        navigate(`/dashboard?document=${item.resource_id}`)
      } else {
        navigate(`/dashboard?folder=${item.resource_id}`)
      }
    },
    [navigate]
  )

  // Handle invitation accept - check if acknowledgement is required
  const handleAcceptInvitation = useCallback(
    async (invitation: ShareInvitation) => {
      // If acknowledgement is required, show the modal first
      if (invitation.requires_acknowledgement) {
        setAcknowledgementModal({ isOpen: true, invitation })
        return
      }

      // Otherwise, accept directly
      try {
        const result = await acceptInvitation(invitation.id, false)
        if (result.success) {
          toast.success(result.message)
          loadData(false)
        }
      } catch (error) {
        console.error('Failed to accept invitation:', error)
        toast.error('Failed to accept invitation')
      }
    },
    [loadData]
  )

  // Handle acknowledgement modal accept
  const handleAcknowledgementAccept = useCallback(
    async (acknowledged: boolean) => {
      if (!acknowledgementModal.invitation) return

      const result = await acceptInvitation(acknowledgementModal.invitation.id, acknowledged)
      if (result.success) {
        toast.success(result.message)
        loadData(false)
      }
    },
    [acknowledgementModal.invitation, loadData]
  )

  // Handle acknowledgement modal decline
  const handleAcknowledgementDecline = useCallback(async () => {
    if (!acknowledgementModal.invitation) return

    const result = await declineInvitation(
      acknowledgementModal.invitation.id,
      'Declined acknowledgement'
    )
    if (result.success) {
      toast.success(result.message)
      loadData(false)
    }
  }, [acknowledgementModal.invitation, loadData])

  // Handle request access click
  const handleRequestAccess = useCallback((item: SharedItemListItem) => {
    setRequestAccessModal({ isOpen: true, item })
  }, [])

  // Handle invitation decline
  const handleDeclineInvitation = useCallback(
    async (invitation: ShareInvitation) => {
      try {
        const result = await declineInvitation(invitation.id)
        if (result.success) {
          toast.success(result.message)
          loadData(false)
        }
      } catch (error) {
        console.error('Failed to decline invitation:', error)
        toast.error('Failed to decline invitation')
      }
    },
    [loadData]
  )

  // Context menu handlers
  const openContextMenu = useCallback((e: React.MouseEvent, item: SharedItemListItem) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      item,
    })
  }, [])

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, isOpen: false, item: null }))
  }, [])

  // Build context menu items
  const getContextMenuItems = useCallback(
    (item: SharedItemListItem): ContextMenuItem[] => {
      const isDocument = item.resource_type === 'DOCUMENT'
      const items: ContextMenuItem[] = [
        {
          id: 'open',
          label: 'Open',
          icon: <ExternalLink className="w-4 h-4" />,
          onClick: () => handleItemClick(item),
        },
      ]

      if (isDocument) {
        items.push({
          id: 'download',
          label: 'Download',
          icon: <Download className="w-4 h-4" />,
          onClick: () => {
            window.open(`/api/v1/documents/${item.resource_id}/download/`, '_blank')
          },
        })
      }

      items.push({
        id: 'divider-1',
        label: '',
        divider: true,
        onClick: () => {},
      })

      items.push({
        id: 'shortcut',
        label: item.is_shortcut ? 'Remove from Shortcuts' : 'Add to Shortcuts',
        icon: item.is_shortcut ? (
          <PinOff className="w-4 h-4 text-amber-500" />
        ) : (
          <Pin className="w-4 h-4" />
        ),
        onClick: () => handleToggleShortcut(item),
      })

      // Only show "Request Access" if user doesn't have FULL permission
      if (item.permission_level !== 'FULL') {
        items.push({
          id: 'request-access',
          label: 'Request Higher Access',
          icon: <ArrowUpCircle className="w-4 h-4 text-blue-500" />,
          onClick: () => handleRequestAccess(item),
        })
      }

      items.push({
        id: 'divider-2',
        label: '',
        divider: true,
        onClick: () => {},
      })

      items.push({
        id: 'leave',
        label: 'Leave Share',
        icon: <UserMinus className="w-4 h-4 text-red-500" />,
        onClick: () => handleLeaveShare(item),
        className: 'text-red-600 dark:text-red-400',
      })

      return items
    },
    [handleItemClick, handleToggleShortcut, handleLeaveShare, handleRequestAccess]
  )

  // Render permission badge
  const renderPermissionBadge = (level: PermissionLevel) => {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
          getPermissionColor(level)
        )}
      >
        {getPermissionIcon(level)}
        {getPermissionLabel(level)}
      </span>
    )
  }

  // Render shared by info
  const renderSharedBy = (item: SharedItemListItem) => {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <span>from</span>
        <span className="font-medium text-gray-700 dark:text-gray-300">{item.shared_by_name}</span>
      </div>
    )
  }

  // Render list item
  const renderListItem = (item: SharedItemListItem, showShortcutIcon = false) => {
    const isDocument = item.resource_type === 'DOCUMENT'

    return (
      <div
        key={item.id}
        className="group flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-colors select-none"
        onClick={() => handleItemClick(item)}
        onContextMenu={(e) => openContextMenu(e, item)}
      >
        {/* Icon */}
        <div
          className={cn(
            'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
            isDocument
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
          )}
        >
          {isDocument ? <FileText className="w-5 h-5" /> : <Folder className="w-5 h-5" />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {item.resource_name}
            </span>
            {showShortcutIcon && item.is_shortcut && (
              <Pin className="w-4 h-4 text-amber-500 flex-shrink-0" />
            )}
            {item.is_external_share && (
              <Globe className="w-4 h-4 text-green-500 flex-shrink-0" title="External share" />
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            {renderSharedBy(item)}
            {isDocument && item.file_size > 0 && (
              <>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <span>{formatFileSize(item.file_size)}</span>
              </>
            )}
          </div>
        </div>

        {/* Permission badge */}
        <div className="flex-shrink-0">{renderPermissionBadge(item.permission_level)}</div>

        {/* Confidentiality */}
        {item.confidentiality_level && (
          <div className="flex-shrink-0">
            <ConfidentialityBadge level={item.confidentiality_level} size="sm" />
          </div>
        )}

        {/* Time */}
        <div className="flex-shrink-0 text-sm text-gray-500 dark:text-gray-400 w-24 text-right">
          {item.time_ago}
        </div>

        {/* Quick actions (visible on hover) */}
        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleToggleShortcut(item)
            }}
            className={cn(
              'p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors',
              item.is_shortcut ? 'text-amber-500' : 'text-gray-400 dark:text-gray-500'
            )}
            title={item.is_shortcut ? 'Remove from shortcuts' : 'Add to shortcuts'}
          >
            {item.is_shortcut ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </button>
          {isDocument && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                window.open(`/api/v1/documents/${item.resource_id}/download/`, '_blank')
              }}
              className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    )
  }

  // Render grid item
  const renderGridItem = (item: SharedItemListItem) => {
    const isDocument = item.resource_type === 'DOCUMENT'

    return (
      <div
        key={item.id}
        className="group relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer transition-all select-none"
        onClick={() => handleItemClick(item)}
        onContextMenu={(e) => openContextMenu(e, item)}
      >
        {/* Header with icon and shortcut */}
        <div className="flex items-start justify-between mb-3">
          <div
            className={cn(
              'w-12 h-12 rounded-lg flex items-center justify-center',
              isDocument
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
            )}
          >
            {isDocument ? <FileText className="w-6 h-6" /> : <Folder className="w-6 h-6" />}
          </div>
          <div className="flex items-center gap-1">
            {item.is_shortcut && <Pin className="w-4 h-4 text-amber-500" />}
            {item.is_external_share && <Globe className="w-4 h-4 text-green-500" />}
          </div>
        </div>

        {/* Name */}
        <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate mb-1">
          {item.resource_name}
        </h3>

        {/* Shared by */}
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate mb-3">
          from {item.shared_by_name}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          {renderPermissionBadge(item.permission_level)}
          <span className="text-xs text-gray-400 dark:text-gray-500">{item.time_ago}</span>
        </div>

        {/* Quick actions on hover */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleToggleShortcut(item)
            }}
            className={cn(
              'p-1.5 rounded-md bg-white dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors',
              item.is_shortcut ? 'text-amber-500' : 'text-gray-500 dark:text-gray-400'
            )}
            title={item.is_shortcut ? 'Remove from shortcuts' : 'Add to shortcuts'}
          >
            {item.is_shortcut ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </button>
        </div>
      </div>
    )
  }

  // Render invitation item
  const renderInvitationItem = (invitation: ShareInvitation) => {
    const isDocument = invitation.resource_type === 'DOCUMENT'

    return (
      <div
        key={invitation.id}
        className="flex items-center gap-4 px-4 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg mb-3"
      >
        {/* Icon */}
        <div
          className={cn(
            'flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center',
            isDocument
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
          )}
        >
          {isDocument ? <FileText className="w-6 h-6" /> : <Folder className="w-6 h-6" />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {invitation.resource_name}
            </span>
            {renderPermissionBadge(invitation.permission_level)}
            {invitation.requires_acknowledgement && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                <ShieldAlert className="w-3 h-3" />
                Requires Acknowledgement
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {invitation.invited_by.first_name} {invitation.invited_by.last_name}
            </span>
            {' invited you'}
            {invitation.message && <span className="italic ml-1">: "{invitation.message}"</span>}
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {invitation.time_ago}
            {invitation.expires_at && !invitation.is_expired && (
              <span className="ml-2 text-amber-600 dark:text-amber-400">
                Expires {new Date(invitation.expires_at).toLocaleDateString()}
              </span>
            )}
            {invitation.is_expired && (
              <span className="ml-2 text-red-600 dark:text-red-400">Expired</span>
            )}
          </div>
        </div>

        {/* Actions */}
        {invitation.is_pending && !invitation.is_expired && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDeclineInvitation(invitation)}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-1"
            >
              <XCircle className="w-4 h-4" />
              Decline
            </button>
            <button
              onClick={() => handleAcceptInvitation(invitation)}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1"
            >
              <Check className="w-4 h-4" />
              Accept
            </button>
          </div>
        )}
      </div>
    )
  }

  // Render time group section
  const renderTimeGroup = (group: TimeGroup, items: SharedItemListItem[]) => {
    if (items.length === 0) return null

    const isExpanded = expandedGroups.has(group)

    return (
      <div key={group} className="mb-4">
        {/* Group header */}
        <button
          onClick={() => toggleGroup(group)}
          className={cn(
            'w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg transition-colors',
            group === 'shortcuts'
              ? 'bg-amber-50 dark:bg-amber-900/20'
              : 'bg-gray-50 dark:bg-gray-800'
          )}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          )}
          {group === 'shortcuts' && <Pin className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
          <span
            className={cn(
              'font-medium',
              group === 'shortcuts'
                ? 'text-amber-800 dark:text-amber-300'
                : 'text-gray-700 dark:text-gray-200'
            )}
          >
            {getTimeGroupLabel(group)}
          </span>
          <span
            className={cn(
              'text-sm',
              group === 'shortcuts'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-gray-400 dark:text-gray-500'
            )}
          >
            ({items.length})
          </span>
        </button>

        {/* Group items */}
        {isExpanded && (
          <div
            className={cn(
              'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-b-lg overflow-hidden',
              group === 'shortcuts' && 'border-amber-200 dark:border-amber-800'
            )}
          >
            {viewMode === 'list' ? (
              items.map((item) => renderListItem(item, group !== 'shortcuts'))
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
                {items.map(renderGridItem)}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Render empty state
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Users className="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        {activeTab === 'pending' ? 'No pending invitations' : 'Nothing shared with you yet'}
      </h3>
      <p className="text-gray-500 dark:text-gray-400 max-w-sm">
        {activeTab === 'pending'
          ? 'You have no pending share invitations at this time.'
          : searchQuery
            ? 'No items match your search. Try a different search term.'
            : 'When someone shares a document or folder with you, it will appear here.'}
      </p>
    </div>
  )

  // Render stats banner
  const renderStatsBanner = () => {
    if (!stats || activeTab === 'pending') return null

    return (
      <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Total:</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">{stats.total}</span>
        </div>
        <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-500" />
          <span className="text-sm text-gray-700 dark:text-gray-300">{stats.documents}</span>
        </div>
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-amber-500" />
          <span className="text-sm text-gray-700 dark:text-gray-300">{stats.folders}</span>
        </div>
        {stats.unread > 0 && (
          <>
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-full">
                {stats.unread} new
              </span>
            </div>
          </>
        )}
        {stats.pending_invitations > 0 && (
          <>
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-medium rounded-full">
                {stats.pending_invitations} pending
              </span>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader user={user} notifications={[]} onLogout={handleLogout} />

        <main className="flex-1 overflow-y-auto p-6">
          {/* Page header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Users className="w-7 h-7 text-green-600 dark:text-green-400" />
                  Shared with Me
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Documents and folders that others have shared with you
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Refresh */}
                <button
                  onClick={() => loadData(false)}
                  disabled={isRefreshing}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw className={cn('w-5 h-5', isRefreshing && 'animate-spin')} />
                </button>
              </div>
            </div>

            {/* Stats banner */}
            {renderStatsBanner()}

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
              {TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                    activeTab === tab.value
                      ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  )}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.value === 'pending' && stats && stats.pending_invitations > 0 && (
                    <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-medium rounded-full">
                      {stats.pending_invitations}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Filters and search */}
            {activeTab !== 'pending' && (
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search shared items..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Permission filter */}
                <div className="relative">
                  <button
                    ref={permissionFilterRef}
                    onClick={() => {
                      setShowPermissionFilter(!showPermissionFilter)
                      setShowSourceFilter(false)
                    }}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors',
                      permissionFilter
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    )}
                  >
                    <Shield className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {permissionFilter ? getPermissionLabel(permissionFilter) : 'Permission'}
                    </span>
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 transition-transform',
                        showPermissionFilter && 'rotate-180'
                      )}
                    />
                  </button>

                  {showPermissionFilter && (
                    <div className="absolute top-full mt-2 right-0 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1.5 z-50">
                      {PERMISSION_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setPermissionFilter(option.value)
                            setShowPermissionFilter(false)
                          }}
                          className={cn(
                            'w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-700',
                            permissionFilter === option.value
                              ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                              : 'text-gray-700 dark:text-gray-300'
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* View mode toggle */}
                <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn(
                      'p-1.5 rounded-md transition-colors',
                      viewMode === 'list'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    )}
                    title="List view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      'p-1.5 rounded-md transition-colors',
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    )}
                    title="Grid view"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                </div>

                {/* Item count */}
                {filteredItems && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {filteredItems.total_count} item
                    {filteredItems.total_count !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
          ) : activeTab === 'pending' ? (
            // Pending invitations view
            pendingInvitations.length === 0 ? (
              renderEmptyState()
            ) : (
              <div className="space-y-3">{pendingInvitations.map(renderInvitationItem)}</div>
            )
          ) : !filteredItems ||
            (filteredItems.shortcuts.length === 0 &&
              filteredItems.today.length === 0 &&
              filteredItems.this_week.length === 0 &&
              filteredItems.this_month.length === 0 &&
              filteredItems.earlier.length === 0) ? (
            renderEmptyState()
          ) : (
            <div>
              {/* Shortcuts section */}
              {renderTimeGroup('shortcuts', filteredItems.shortcuts)}

              {/* Time-grouped sections */}
              {renderTimeGroup('today', filteredItems.today)}
              {renderTimeGroup('this_week', filteredItems.this_week)}
              {renderTimeGroup('this_month', filteredItems.this_month)}
              {renderTimeGroup('earlier', filteredItems.earlier)}
            </div>
          )}
        </main>
      </div>

      {/* Context menu */}
      {contextMenu.item && (
        <ContextMenu
          items={getContextMenuItems(contextMenu.item)}
          isOpen={contextMenu.isOpen}
          position={contextMenu.position}
          onClose={closeContextMenu}
        />
      )}

      {/* Click outside to close filter menus */}
      {(showPermissionFilter || showSourceFilter) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowPermissionFilter(false)
            setShowSourceFilter(false)
          }}
        />
      )}

      {/* Acknowledgement Modal */}
      <AcknowledgementModal
        isOpen={acknowledgementModal.isOpen}
        invitation={acknowledgementModal.invitation}
        onAccept={handleAcknowledgementAccept}
        onDecline={handleAcknowledgementDecline}
        onClose={() => setAcknowledgementModal({ isOpen: false, invitation: null })}
      />

      {/* Request Access Modal */}
      <RequestAccessModal
        isOpen={requestAccessModal.isOpen}
        item={requestAccessModal.item}
        onClose={() => setRequestAccessModal({ isOpen: false, item: null })}
        onSuccess={() => loadData(false)}
      />
    </div>
  )
}

export default SharedWithMePage
