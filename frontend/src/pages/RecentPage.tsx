/**
 * RecentPage Component
 * Enterprise-standard recent files/folders view with activity tracking,
 * time-based grouping, pinning, and filtering capabilities.
 *
 * Features:
 * - Time-based grouping (Today, Yesterday, This Week, etc.)
 * - Activity type filtering (Viewed, Edited, Uploaded, Downloaded, Shared)
 * - Resource type filtering (All, Documents, Folders)
 * - Pin frequently accessed items (max 10)
 * - List/Grid view toggle with persistent preference
 * - Search within recent items
 * - Clear history by date range
 * - Activity statistics
 * - Quick actions (Open, Download, Pin, etc.)
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clock,
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
  Upload,
  Download,
  Share2,
  ExternalLink,
  Trash2,
  BarChart3,
  Filter,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { DateTimePicker } from '@/components/common/DateTimePicker'
import { ContextMenu, type ContextMenuItem } from '@/components/common/ContextMenu'
import { ShareDocumentModal } from '@/components/Document/ShareDocumentModal'
import { authService } from '@/services/auth.service'
import type { FileListItem } from '@/types/fileManagement'
import {
  getRecentActivities,
  getRecentActivityStats,
  pinActivity,
  unpinActivity,
  clearHistory,
  getActivityTypeLabel,
  getActivityTypeColor,
  getActivityTypeBgColor,
  getTimeGroupLabel,
  formatFileSize,
  type RecentActivitiesResponse,
  type RecentActivityListItem,
  type RecentActivityStats,
  type ActivityType,
  type ResourceType,
  type TimeGroup,
  type ClearHistoryOptions,
} from '@/services/recentService'
import { toast } from '@/utils/toast'
import { cn } from '@/utils/cn'
import { ConfidentialityBadge } from '@/components/Badge/ConfidentialityBadge'

// Constants
const VIEW_STORAGE_KEY = 'recent-view-mode'

type ViewMode = 'list' | 'grid'
type FilterType = 'all' | 'documents' | 'folders'
type ActivityFilter = 'all' | ActivityType

// Activity type options for filtering (icons are rendered with theme-aware colors in the component)
const ACTIVITY_TYPES: { value: ActivityFilter; label: string; iconType: ActivityFilter }[] = [
  { value: 'all', label: 'All Activities', iconType: 'all' },
  { value: 'VIEWED', label: 'Viewed', iconType: 'VIEWED' },
  { value: 'EDITED', label: 'Edited', iconType: 'EDITED' },
  { value: 'UPLOADED', label: 'Uploaded', iconType: 'UPLOADED' },
  { value: 'DOWNLOADED', label: 'Downloaded', iconType: 'DOWNLOADED' },
  { value: 'SHARED', label: 'Shared', iconType: 'SHARED' },
]

// Get filter icon with theme-aware colors
const getFilterIcon = (iconType: ActivityFilter) => {
  if (iconType === 'all') {
    return <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
  }
  return getActivityIcon(iconType as ActivityType)
}

// Get activity icon component with theme-aware colors
const getActivityIcon = (activityType: ActivityType, size: 'sm' | 'md' = 'md') => {
  const sizeClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
  const colorClasses: Record<ActivityType, string> = {
    VIEWED: 'text-blue-600 dark:text-blue-400',
    EDITED: 'text-green-600 dark:text-green-400',
    UPLOADED: 'text-purple-600 dark:text-purple-400',
    DOWNLOADED: 'text-orange-600 dark:text-orange-400',
    SHARED: 'text-teal-600 dark:text-teal-400',
  }
  const colorClass = colorClasses[activityType] || 'text-gray-600 dark:text-gray-400'

  const icons: Record<ActivityType, React.ReactNode> = {
    VIEWED: <Eye className={cn(sizeClass, colorClass)} />,
    EDITED: <Pencil className={cn(sizeClass, colorClass)} />,
    UPLOADED: <Upload className={cn(sizeClass, colorClass)} />,
    DOWNLOADED: <Download className={cn(sizeClass, colorClass)} />,
    SHARED: <Share2 className={cn(sizeClass, colorClass)} />,
  }
  return icons[activityType] || <Clock className={cn(sizeClass, colorClass)} />
}

export function RecentPage() {
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
  const [activities, setActivities] = useState<RecentActivitiesResponse | null>(null)
  const [stats, setStats] = useState<RecentActivityStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY)
    return (saved as ViewMode) || 'list'
  })
  const [expandedGroups, setExpandedGroups] = useState<Set<TimeGroup>>(
    new Set(['today', 'yesterday', 'this_week'])
  )
  const [showStats, setShowStats] = useState(false)
  const [showClearModal, setShowClearModal] = useState(false)
  const [showActivityFilterMenu, setShowActivityFilterMenu] = useState(false)

  // Context menu state (for right-click)
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean
    position: { x: number; y: number }
    item: RecentActivityListItem | null
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    item: null,
  })

  // Clear modal custom dropdown states
  const [showClearActivityDropdown, setShowClearActivityDropdown] = useState(false)
  const [showClearResourceDropdown, setShowClearResourceDropdown] = useState(false)
  const [clearActivityDropdownPosition, setClearActivityDropdownPosition] = useState<
    'below' | 'above'
  >('below')
  const [clearResourceDropdownPosition, setClearResourceDropdownPosition] = useState<
    'below' | 'above'
  >('below')
  const clearActivityDropdownRef = useRef<HTMLButtonElement>(null)
  const clearResourceDropdownRef = useRef<HTMLButtonElement>(null)

  // Dropdown positioning state for activity filter
  const [activityFilterPosition, setActivityFilterPosition] = useState<'below' | 'above'>('below')
  const activityFilterRef = useRef<HTMLButtonElement>(null)

  // Calculate dropdown position based on available space
  const calculateDropdownPosition = useCallback(
    (
      buttonRef: React.RefObject<HTMLButtonElement | null>,
      dropdownHeight: number = 200
    ): 'below' | 'above' => {
      if (!buttonRef.current) return 'below'

      const buttonRect = buttonRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - buttonRect.bottom
      const spaceAbove = buttonRect.top

      // If not enough space below but more space above, position above
      return spaceBelow < dropdownHeight && spaceAbove > spaceBelow ? 'above' : 'below'
    },
    []
  )

  // Update activity filter dropdown position when opened
  useEffect(() => {
    if (showActivityFilterMenu) {
      setActivityFilterPosition(calculateDropdownPosition(activityFilterRef, 280))
    }
  }, [showActivityFilterMenu, calculateDropdownPosition])

  // Update clear modal activity dropdown position when opened
  useEffect(() => {
    if (showClearActivityDropdown) {
      setClearActivityDropdownPosition(calculateDropdownPosition(clearActivityDropdownRef, 240))
    }
  }, [showClearActivityDropdown, calculateDropdownPosition])

  // Update clear modal resource dropdown position when opened
  useEffect(() => {
    if (showClearResourceDropdown) {
      setClearResourceDropdownPosition(calculateDropdownPosition(clearResourceDropdownRef, 140))
    }
  }, [showClearResourceDropdown, calculateDropdownPosition])

  // Close clear modal dropdowns when clicking outside
  useEffect(() => {
    if (!showClearActivityDropdown && !showClearResourceDropdown) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        clearActivityDropdownRef.current &&
        !clearActivityDropdownRef.current.contains(e.target as Node)
      ) {
        setShowClearActivityDropdown(false)
      }
      if (
        clearResourceDropdownRef.current &&
        !clearResourceDropdownRef.current.contains(e.target as Node)
      ) {
        setShowClearResourceDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showClearActivityDropdown, showClearResourceDropdown])

  // Clear history modal state
  const [clearBeforeDate, setClearBeforeDate] = useState<string>('')
  const [clearActivityType, setClearActivityType] = useState<ActivityType | ''>('')
  const [clearResourceType, setClearResourceType] = useState<ResourceType | ''>('')
  const [excludePinned, setExcludePinned] = useState(true)
  const [isClearing, setIsClearing] = useState(false)

  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [itemToShare, setItemToShare] = useState<FileListItem | null>(null)

  // Load data
  const loadData = useCallback(
    async (showLoader = true) => {
      if (showLoader) setIsLoading(true)
      else setIsRefreshing(true)

      try {
        const filters: {
          activity_type?: ActivityType
          resource_type?: ResourceType
          limit?: number
        } = {
          limit: 200,
        }

        if (activityFilter !== 'all') {
          filters.activity_type = activityFilter as ActivityType
        }

        if (filterType === 'documents') {
          filters.resource_type = 'DOCUMENT'
        } else if (filterType === 'folders') {
          filters.resource_type = 'FOLDER'
        }

        const [activitiesData, statsData] = await Promise.all([
          getRecentActivities(filters),
          getRecentActivityStats(),
        ])

        setActivities(activitiesData)
        setStats(statsData)
      } catch (error) {
        console.error('Failed to load recent activities:', error)
        toast.error('Failed to load recent activities')
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [activityFilter, filterType]
  )

  useEffect(() => {
    loadData()
  }, [loadData])

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, viewMode)
  }, [viewMode])

  // Filter and search items
  const filteredItems = useMemo(() => {
    if (!activities) return []

    let items = [...activities.results]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      items = items.filter(
        (item) =>
          item.resource_name.toLowerCase().includes(query) ||
          item.folder_path.toLowerCase().includes(query)
      )
    }

    return items
  }, [activities, searchQuery])

  // Group filtered items by time
  const groupedItems = useMemo(() => {
    const groups: Record<TimeGroup, RecentActivityListItem[]> = {
      today: [],
      yesterday: [],
      this_week: [],
      last_week: [],
      this_month: [],
      older: [],
    }

    // Separate pinned items
    const pinnedItems = filteredItems.filter((item) => item.is_pinned)
    const unpinnedItems = filteredItems.filter((item) => !item.is_pinned)

    // Group unpinned items
    unpinnedItems.forEach((item) => {
      const group = item.time_group as TimeGroup
      if (groups[group]) {
        groups[group].push(item)
      } else {
        groups.older.push(item)
      }
    })

    return { pinned: pinnedItems, groups }
  }, [filteredItems])

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

  // Handle pin/unpin
  const handleTogglePin = useCallback(
    async (item: RecentActivityListItem) => {
      try {
        if (item.is_pinned) {
          await unpinActivity(item.id)
          toast.success('Item unpinned')
        } else {
          if (stats && stats.pinned_count >= stats.pinned_limit) {
            toast.error(`Maximum of ${stats.pinned_limit} pinned items reached`)
            return
          }
          await pinActivity(item.id)
          toast.success('Item pinned')
        }
        loadData(false)
      } catch (error) {
        console.error('Failed to toggle pin:', error)
        toast.error('Failed to update pin status')
      }
    },
    [stats, loadData]
  )

  // Handle clear history
  const handleClearHistory = async () => {
    if (!clearBeforeDate) {
      toast.error('Please select a date')
      return
    }

    setIsClearing(true)
    try {
      const options: ClearHistoryOptions = {
        before_date: new Date(clearBeforeDate).toISOString(),
        exclude_pinned: excludePinned,
      }

      if (clearActivityType) {
        options.activity_type = clearActivityType as ActivityType
      }
      if (clearResourceType) {
        options.resource_type = clearResourceType as ResourceType
      }

      const result = await clearHistory(options)
      toast.success(result.message)
      setShowClearModal(false)
      setClearBeforeDate('')
      setClearActivityType('')
      setClearResourceType('')
      loadData(false)
    } catch (error) {
      console.error('Failed to clear history:', error)
      toast.error('Failed to clear history')
    } finally {
      setIsClearing(false)
    }
  }

  // Handle item click (navigate to document/folder)
  const handleItemClick = useCallback(
    (item: RecentActivityListItem) => {
      if (item.resource_type === 'DOCUMENT') {
        navigate(`/dashboard?document=${item.resource_id}`)
      } else {
        navigate(`/dashboard?folder=${item.resource_id}`)
      }
    },
    [navigate]
  )

  // Handle share action
  const handleShare = useCallback((item: RecentActivityListItem) => {
    if (item.resource_type !== 'DOCUMENT') {
      toast.error('Only documents can be shared from here')
      return
    }

    // Convert RecentActivityListItem to FileListItem for ShareDocumentModal
    const fileItem: FileListItem = {
      id: item.resource_id,
      name: item.resource_name,
      type: 'file',
      fileSize: item.file_size,
      mimeType: item.file_type,
      path: item.folder_path || '/',
      createdBy: '',
      createdAt: item.timestamp,
      modifiedAt: item.timestamp,
      modifiedBy: '',
      confidentialityLevel: item.confidentiality_level as
        | 'PUBLIC'
        | 'INTERNAL'
        | 'CONFIDENTIAL'
        | 'HIGHLY_CONFIDENTIAL',
      isShared: false,
      isFavorite: false,
    }

    setItemToShare(fileItem)
    setShareModalOpen(true)
  }, [])

  // Context menu handlers
  const openContextMenu = useCallback((e: React.MouseEvent, item: RecentActivityListItem) => {
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

  // Build context menu items for the current item
  const getContextMenuItems = useCallback(
    (item: RecentActivityListItem): ContextMenuItem[] => {
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
        items.push({
          id: 'share',
          label: 'Share',
          icon: <Share2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />,
          onClick: () => handleShare(item),
        })
      }

      items.push({
        id: 'divider-1',
        label: '',
        divider: true,
        onClick: () => {},
      })

      items.push({
        id: 'pin',
        label: item.is_pinned ? 'Unpin' : 'Pin to top',
        icon: item.is_pinned ? (
          <PinOff className="w-4 h-4 text-amber-500" />
        ) : (
          <Pin className="w-4 h-4" />
        ),
        onClick: () => handleTogglePin(item),
      })

      return items
    },
    [handleItemClick, handleShare, handleTogglePin]
  )

  // Render activity badge
  const renderActivityBadge = (activityType: ActivityType) => {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
          getActivityTypeBgColor(activityType),
          getActivityTypeColor(activityType)
        )}
      >
        {getActivityIcon(activityType)}
        {getActivityTypeLabel(activityType)}
      </span>
    )
  }

  // Render item row (list view)
  const renderListItem = (item: RecentActivityListItem) => {
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
            {item.is_pinned && <Pin className="w-4 h-4 text-amber-500 flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="truncate">{item.folder_path || 'Root'}</span>
            {isDocument && item.file_size > 0 && (
              <>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <span>{formatFileSize(item.file_size)}</span>
              </>
            )}
          </div>
        </div>

        {/* Activity badge */}
        <div className="flex-shrink-0">{renderActivityBadge(item.activity_type)}</div>

        {/* Confidentiality */}
        {item.confidentiality_level && (
          <div className="flex-shrink-0">
            <ConfidentialityBadge level={item.confidentiality_level} size="sm" />
          </div>
        )}

        {/* Time */}
        <div className="flex-shrink-0 text-sm text-gray-500 dark:text-gray-400 w-24 text-right">
          {item.relative_time}
        </div>

        {/* Quick actions (visible on hover) */}
        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleTogglePin(item)
            }}
            className={cn(
              'p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors',
              item.is_pinned ? 'text-amber-500' : 'text-gray-400 dark:text-gray-500'
            )}
            title={item.is_pinned ? 'Unpin' : 'Pin'}
          >
            {item.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
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
  const renderGridItem = (item: RecentActivityListItem) => {
    const isDocument = item.resource_type === 'DOCUMENT'

    return (
      <div
        key={item.id}
        className="group relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer transition-all select-none"
        onClick={() => handleItemClick(item)}
        onContextMenu={(e) => openContextMenu(e, item)}
      >
        {/* Header with icon and pin */}
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
          {item.is_pinned && <Pin className="w-4 h-4 text-amber-500" />}
        </div>

        {/* Name */}
        <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate mb-1">
          {item.resource_name}
        </h3>

        {/* Path */}
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate mb-3">
          {item.folder_path || 'Root'}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          {renderActivityBadge(item.activity_type)}
          <span className="text-xs text-gray-400 dark:text-gray-500">{item.relative_time}</span>
        </div>

        {/* Quick actions on hover */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleTogglePin(item)
            }}
            className={cn(
              'p-1.5 rounded-md bg-white dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors',
              item.is_pinned ? 'text-amber-500' : 'text-gray-500 dark:text-gray-400'
            )}
            title={item.is_pinned ? 'Unpin' : 'Pin'}
          >
            {item.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </button>
          {isDocument && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                window.open(`/api/v1/documents/${item.resource_id}/download/`, '_blank')
              }}
              className="p-1.5 rounded-md bg-white dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    )
  }

  // Render time group section
  const renderTimeGroup = (group: TimeGroup, items: RecentActivityListItem[]) => {
    if (items.length === 0) return null

    const isExpanded = expandedGroups.has(group)

    return (
      <div key={group} className="mb-4">
        {/* Group header */}
        <button
          onClick={() => toggleGroup(group)}
          className="w-full flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          )}
          <span className="font-medium text-gray-700 dark:text-gray-200">
            {getTimeGroupLabel(group)}
          </span>
          <span className="text-sm text-gray-400 dark:text-gray-500">({items.length})</span>
        </button>

        {/* Group items */}
        {isExpanded && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-b-lg overflow-hidden">
            {viewMode === 'list' ? (
              items.map(renderListItem)
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

  // Render statistics panel
  const renderStatsPanel = () => {
    if (!stats) return null

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            Activity Statistics (Last {stats.retention_days} days)
          </h3>
          <button
            onClick={() => setShowStats(false)}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Activities</div>
          </div>

          {/* Pinned */}
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats.pinned_count}/{stats.pinned_limit}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Pinned Items</div>
          </div>

          {/* Documents */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.by_resource_type.DOCUMENT || 0}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Documents</div>
          </div>

          {/* Folders */}
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats.by_resource_type.FOLDER || 0}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Folders</div>
          </div>
        </div>

        {/* Activity breakdown */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            By Activity Type
          </h4>
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats.by_type).map(([type, count]) => (
              <div
                key={type}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm',
                  getActivityTypeBgColor(type as ActivityType),
                  getActivityTypeColor(type as ActivityType)
                )}
              >
                {getActivityIcon(type as ActivityType)}
                <span>{getActivityTypeLabel(type as ActivityType)}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Render clear history modal
  const renderClearModal = () => {
    if (!showClearModal) return null

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop - no onClick to prevent closing on outside click */}
        <div className="absolute inset-0 bg-black/50 dark:bg-black/70" />
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 mx-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-500" />
            Clear History
          </h3>

          <div className="space-y-4">
            {/* Warning */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                This action cannot be undone. Cleared items will be permanently removed from your
                recent history.
              </p>
            </div>

            {/* Before date - Using DateTimePicker component */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Clear items before
              </label>
              <DateTimePicker
                value={clearBeforeDate}
                onChange={(value) => setClearBeforeDate(value)}
                max={new Date().toISOString()}
                placeholder="Select a date and time"
                showTime={true}
              />
            </div>

            {/* Activity type filter - Custom Dropdown */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Activity Type (optional)
              </label>
              <button
                ref={clearActivityDropdownRef}
                type="button"
                onClick={() => {
                  setShowClearActivityDropdown(!showClearActivityDropdown)
                  setShowClearResourceDropdown(false)
                }}
                className={cn(
                  'w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-left',
                  'border-2 rounded-xl transition-all duration-200',
                  'bg-white dark:bg-gray-900',
                  showClearActivityDropdown
                    ? 'border-blue-500 ring-2 ring-blue-500/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500',
                  'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                )}
              >
                <div className="flex items-center gap-2">
                  {clearActivityType ? (
                    <>
                      <span
                        className={cn(
                          'flex items-center justify-center w-6 h-6 rounded-md',
                          getActivityTypeBgColor(clearActivityType as ActivityType)
                        )}
                      >
                        {getActivityIcon(clearActivityType as ActivityType, 'sm')}
                      </span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {getActivityTypeLabel(clearActivityType as ActivityType)}
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">All types</span>
                  )}
                </div>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 text-gray-400 transition-transform duration-200',
                    showClearActivityDropdown && 'rotate-180'
                  )}
                />
              </button>

              {showClearActivityDropdown && (
                <div
                  className={cn(
                    'absolute left-0 right-0 z-[60]',
                    'bg-white dark:bg-gray-800',
                    'border-2 border-gray-200 dark:border-gray-600',
                    'ring-1 ring-black/5 dark:ring-white/10',
                    'rounded-xl shadow-2xl',
                    'py-1.5 overflow-hidden',
                    'animate-in fade-in-0 zoom-in-95 duration-200',
                    clearActivityDropdownPosition === 'below'
                      ? 'top-full mt-2 origin-top'
                      : 'bottom-full mb-2 origin-bottom'
                  )}
                >
                  {/* All types option */}
                  <button
                    type="button"
                    onClick={() => {
                      setClearActivityType('')
                      setShowClearActivityDropdown(false)
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                      'hover:bg-gray-50 dark:hover:bg-gray-700/70',
                      !clearActivityType
                        ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 font-medium'
                        : 'text-gray-700 dark:text-gray-300'
                    )}
                  >
                    <span className="flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 dark:bg-gray-700">
                      <Clock className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                    </span>
                    All types
                  </button>
                  {/* Activity type options */}
                  {(['VIEWED', 'EDITED', 'UPLOADED', 'DOWNLOADED', 'SHARED'] as ActivityType[]).map(
                    (type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setClearActivityType(type)
                          setShowClearActivityDropdown(false)
                        }}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                          'hover:bg-gray-50 dark:hover:bg-gray-700/70',
                          'border-t border-gray-100 dark:border-gray-700/50',
                          clearActivityType === type
                            ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 font-medium'
                            : 'text-gray-700 dark:text-gray-300'
                        )}
                      >
                        <span
                          className={cn(
                            'flex items-center justify-center w-6 h-6 rounded-md',
                            clearActivityType === type
                              ? 'bg-blue-100 dark:bg-blue-900/50'
                              : getActivityTypeBgColor(type)
                          )}
                        >
                          {getActivityIcon(type, 'sm')}
                        </span>
                        {getActivityTypeLabel(type)}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Resource type filter - Custom Dropdown */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Resource Type (optional)
              </label>
              <button
                ref={clearResourceDropdownRef}
                type="button"
                onClick={() => {
                  setShowClearResourceDropdown(!showClearResourceDropdown)
                  setShowClearActivityDropdown(false)
                }}
                className={cn(
                  'w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-left',
                  'border-2 rounded-xl transition-all duration-200',
                  'bg-white dark:bg-gray-900',
                  showClearResourceDropdown
                    ? 'border-blue-500 ring-2 ring-blue-500/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500',
                  'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                )}
              >
                <div className="flex items-center gap-2">
                  {clearResourceType ? (
                    <>
                      <span
                        className={cn(
                          'flex items-center justify-center w-6 h-6 rounded-md',
                          clearResourceType === 'DOCUMENT'
                            ? 'bg-blue-100 dark:bg-blue-900/30'
                            : 'bg-amber-100 dark:bg-amber-900/30'
                        )}
                      >
                        {clearResourceType === 'DOCUMENT' ? (
                          <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Folder className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        )}
                      </span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {clearResourceType === 'DOCUMENT' ? 'Documents only' : 'Folders only'}
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">All resources</span>
                  )}
                </div>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 text-gray-400 transition-transform duration-200',
                    showClearResourceDropdown && 'rotate-180'
                  )}
                />
              </button>

              {showClearResourceDropdown && (
                <div
                  className={cn(
                    'absolute left-0 right-0 z-[60]',
                    'bg-white dark:bg-gray-800',
                    'border-2 border-gray-200 dark:border-gray-600',
                    'ring-1 ring-black/5 dark:ring-white/10',
                    'rounded-xl shadow-2xl',
                    'py-1.5 overflow-hidden',
                    'animate-in fade-in-0 zoom-in-95 duration-200',
                    clearResourceDropdownPosition === 'below'
                      ? 'top-full mt-2 origin-top'
                      : 'bottom-full mb-2 origin-bottom'
                  )}
                >
                  {/* All resources option */}
                  <button
                    type="button"
                    onClick={() => {
                      setClearResourceType('')
                      setShowClearResourceDropdown(false)
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                      'hover:bg-gray-50 dark:hover:bg-gray-700/70',
                      !clearResourceType
                        ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 font-medium'
                        : 'text-gray-700 dark:text-gray-300'
                    )}
                  >
                    <span className="flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 dark:bg-gray-700">
                      <Clock className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                    </span>
                    All resources
                  </button>
                  {/* Documents option */}
                  <button
                    type="button"
                    onClick={() => {
                      setClearResourceType('DOCUMENT')
                      setShowClearResourceDropdown(false)
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                      'hover:bg-gray-50 dark:hover:bg-gray-700/70',
                      'border-t border-gray-100 dark:border-gray-700/50',
                      clearResourceType === 'DOCUMENT'
                        ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 font-medium'
                        : 'text-gray-700 dark:text-gray-300'
                    )}
                  >
                    <span
                      className={cn(
                        'flex items-center justify-center w-6 h-6 rounded-md',
                        clearResourceType === 'DOCUMENT'
                          ? 'bg-blue-100 dark:bg-blue-900/50'
                          : 'bg-blue-50 dark:bg-blue-900/30'
                      )}
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    </span>
                    Documents only
                  </button>
                  {/* Folders option */}
                  <button
                    type="button"
                    onClick={() => {
                      setClearResourceType('FOLDER')
                      setShowClearResourceDropdown(false)
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                      'hover:bg-gray-50 dark:hover:bg-gray-700/70',
                      'border-t border-gray-100 dark:border-gray-700/50',
                      clearResourceType === 'FOLDER'
                        ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 font-medium'
                        : 'text-gray-700 dark:text-gray-300'
                    )}
                  >
                    <span
                      className={cn(
                        'flex items-center justify-center w-6 h-6 rounded-md',
                        clearResourceType === 'FOLDER'
                          ? 'bg-blue-100 dark:bg-blue-900/50'
                          : 'bg-amber-50 dark:bg-amber-900/30'
                      )}
                    >
                      <Folder className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    </span>
                    Folders only
                  </button>
                </div>
              )}
            </div>

            {/* Exclude pinned */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={excludePinned}
                onChange={(e) => setExcludePinned(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 bg-white dark:bg-gray-900"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Keep pinned items</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowClearModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleClearHistory}
              disabled={!clearBeforeDate || isClearing}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isClearing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Clear History
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Render empty state
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Clock className="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        No recent activity
      </h3>
      <p className="text-gray-500 dark:text-gray-400 max-w-sm">
        {searchQuery
          ? 'No items match your search. Try a different search term.'
          : 'Your recent files and folders will appear here as you view, edit, upload, or download them.'}
      </p>
    </div>
  )

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
                  <Clock className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                  Recent Files
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  Quick access to your recently accessed files and folders
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Stats toggle */}
                <button
                  onClick={() => setShowStats(!showStats)}
                  className={cn(
                    'p-2 rounded-lg border transition-colors',
                    showStats
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  )}
                  title="Show statistics"
                >
                  <BarChart3 className="w-5 h-5" />
                </button>

                {/* Refresh */}
                <button
                  onClick={() => loadData(false)}
                  disabled={isRefreshing}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw className={cn('w-5 h-5', isRefreshing && 'animate-spin')} />
                </button>

                {/* Clear history */}
                <button
                  onClick={() => setShowClearModal(true)}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  title="Clear history"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Statistics panel */}
            {showStats && renderStatsPanel()}

            {/* Filters and search */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search recent items..."
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

              {/* Resource type tabs */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                {(['all', 'documents', 'folders'] as FilterType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={cn(
                      'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                      filterType === type
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    )}
                  >
                    {type === 'all' ? 'All' : type === 'documents' ? 'Documents' : 'Folders'}
                  </button>
                ))}
              </div>

              {/* Activity filter dropdown */}
              <div className="relative">
                <button
                  ref={activityFilterRef}
                  onClick={() => setShowActivityFilterMenu(!showActivityFilterMenu)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors',
                    activityFilter !== 'all'
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  )}
                >
                  <Filter className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {activityFilter === 'all'
                      ? 'All Activities'
                      : getActivityTypeLabel(activityFilter as ActivityType)}
                  </span>
                  <ChevronDown
                    className={cn(
                      'w-4 h-4 transition-transform duration-200',
                      showActivityFilterMenu && 'rotate-180'
                    )}
                  />
                </button>

                {showActivityFilterMenu && (
                  <div
                    className={cn(
                      'absolute right-0 w-52 z-50',
                      'bg-white dark:bg-gray-800',
                      // Enhanced border styling
                      'border-2 border-gray-200 dark:border-gray-600',
                      'ring-1 ring-black/5 dark:ring-white/10',
                      // Enhanced shadow and rounded corners
                      'rounded-xl shadow-2xl',
                      'py-1.5',
                      // Smooth animation
                      'animate-in fade-in-0 zoom-in-95 duration-200',
                      // Auto-flip positioning
                      activityFilterPosition === 'below'
                        ? 'top-full mt-2 origin-top'
                        : 'bottom-full mb-2 origin-bottom'
                    )}
                  >
                    {ACTIVITY_TYPES.map((option, index) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setActivityFilter(option.value)
                          setShowActivityFilterMenu(false)
                        }}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                          'hover:bg-gray-50 dark:hover:bg-gray-700/70',
                          activityFilter === option.value
                            ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 font-medium'
                            : 'text-gray-700 dark:text-gray-300',
                          // Add subtle separator between items
                          index !== ACTIVITY_TYPES.length - 1 &&
                            'border-b border-gray-100 dark:border-gray-700/50'
                        )}
                      >
                        <span
                          className={cn(
                            'flex items-center justify-center w-6 h-6 rounded-md',
                            activityFilter === option.value
                              ? 'bg-blue-100 dark:bg-blue-900/50'
                              : 'bg-gray-100 dark:bg-gray-700'
                          )}
                        >
                          {getFilterIcon(option.iconType)}
                        </span>
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
              {activities && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
          ) : !activities || filteredItems.length === 0 ? (
            renderEmptyState()
          ) : (
            <div>
              {/* Pinned section */}
              {groupedItems.pinned.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-t-lg border border-amber-200 dark:border-amber-800">
                    <Pin className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="font-medium text-amber-800 dark:text-amber-300">Pinned</span>
                    <span className="text-sm text-amber-600 dark:text-amber-400">
                      ({groupedItems.pinned.length})
                    </span>
                  </div>
                  <div className="bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800 border-t-0 rounded-b-lg overflow-hidden">
                    {viewMode === 'list' ? (
                      groupedItems.pinned.map(renderListItem)
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
                        {groupedItems.pinned.map(renderGridItem)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Time-grouped sections */}
              {(
                [
                  'today',
                  'yesterday',
                  'this_week',
                  'last_week',
                  'this_month',
                  'older',
                ] as TimeGroup[]
              ).map((group) => renderTimeGroup(group, groupedItems.groups[group]))}
            </div>
          )}
        </main>
      </div>

      {/* Clear history modal */}
      {renderClearModal()}

      {/* Share document modal */}
      <ShareDocumentModal
        isOpen={shareModalOpen}
        item={itemToShare}
        onClose={() => {
          setShareModalOpen(false)
          setItemToShare(null)
        }}
        onShareCreated={() => {
          toast.success('Document shared successfully')
        }}
      />

      {/* Right-click context menu */}
      {contextMenu.item && (
        <ContextMenu
          items={getContextMenuItems(contextMenu.item)}
          isOpen={contextMenu.isOpen}
          position={contextMenu.position}
          onClose={closeContextMenu}
        />
      )}

      {/* Click outside to close activity filter menu */}
      {showActivityFilterMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowActivityFilterMenu(false)
          }}
        />
      )}
    </div>
  )
}

export default RecentPage
