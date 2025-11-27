/**
 * MyDocumentsPage Component
 * Enterprise-standard view for documents owned by the current user.
 *
 * Features:
 * - Quick Access section with pinned items
 * - Time-based grouping (Today, This Week, This Month, Earlier)
 * - Statistics dashboard cards
 * - Filter by document type and confidentiality
 * - Search within documents
 * - List/Grid view toggle
 * - Context menu with quick actions
 * - Confidentiality badges with color coding
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  Folder,
  Loader2,
  Search,
  List,
  Grid3X3,
  X,
  Eye,
  Download,
  ExternalLink,
  Trash2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  HardDrive,
  Calendar,
  TrendingUp,
  Filter,
  SortAsc,
  SortDesc,
  MoreHorizontal,
  Edit,
  Copy,
  FolderOpen,
  Pin,
  PinOff,
  GripVertical,
  Share2,
  Zap,
  // State-related icons
  Clock,
  CheckCircle,
  Globe,
  Archive,
  Send,
  XCircle,
  AlertCircle,
  User,
} from 'lucide-react'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { ContextMenu, type ContextMenuItem } from '@/components/common/ContextMenu'
import { authService } from '@/services/auth.service'
import {
  getMyDocuments,
  getMyDocumentsStats,
  getTimeGroupLabel,
  getConfidentialityColor,
  getConfidentialityLabel,
  formatFileSize,
  getTimeGroupsInOrder,
  hasDocuments,
  // State-related imports
  getDocumentStateStats,
  getDocumentsByState,
  getPendingReview,
  submitForReview,
  approveDocument,
  rejectDocument,
  getDocumentStateLabel,
  getDocumentStateColor,
  type MyDocumentItem,
  type MyDocumentsGrouped,
  type MyDocumentsStats,
  type MyDocumentsListParams,
  type TimeGroup,
  type ConfidentialityLevel,
  type DocumentState,
  type DocumentStateStats,
  type DocumentWithState,
  type PendingReviewItem,
} from '@/services/myDocumentsService'
import {
  getPinnedItems,
  pinDocument,
  unpinItem,
  reorderPinnedItems,
  getPinnedItemColor,
  isSharedItem,
  type PinnedItem,
  type PinnedItemsListResponse,
} from '@/services/pinnedItemsService'
import { toast } from '@/utils/toast'
import { cn } from '@/utils/cn'
import { ConfidentialityBadge } from '@/components/Badge/ConfidentialityBadge'

// Constants
const VIEW_STORAGE_KEY = 'my-documents-view-mode'
const TAB_STORAGE_KEY = 'my-documents-active-tab'

type ViewMode = 'list' | 'grid'
type SortField = 'updated_at' | 'created_at' | 'title' | 'file_size'
type SortOrder = 'asc' | 'desc'
type ActiveTab =
  | 'all'
  | 'drafts'
  | 'in_review'
  | 'pending_review'
  | 'approved'
  | 'published'
  | 'archived'

// Document type options (matching backend)
const DOCUMENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'INVOICE', label: 'Invoice' },
  { value: 'REPORT', label: 'Report' },
  { value: 'KYC_RECORD', label: 'KYC Record' },
  { value: 'AUDIT_DOCUMENT', label: 'Audit Document' },
  { value: 'POLICY', label: 'Policy' },
  { value: 'CORRESPONDENCE', label: 'Correspondence' },
  { value: 'FINANCIAL_STATEMENT', label: 'Financial Statement' },
  { value: 'TAX_DOCUMENT', label: 'Tax Document' },
  { value: 'LEGAL', label: 'Legal' },
  { value: 'HR_DOCUMENT', label: 'HR Document' },
  { value: 'OTHER', label: 'Other' },
]

// Confidentiality options
const CONFIDENTIALITY_OPTIONS: { value: ConfidentialityLevel | ''; label: string }[] = [
  { value: '', label: 'All Levels' },
  { value: 'PUBLIC', label: 'Public' },
  { value: 'INTERNAL', label: 'Internal' },
  { value: 'CONFIDENTIAL', label: 'Confidential' },
  { value: 'HIGHLY_CONFIDENTIAL', label: 'Highly Confidential' },
]

// Sort options
const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'updated_at', label: 'Last Modified' },
  { value: 'created_at', label: 'Date Created' },
  { value: 'title', label: 'Name' },
  { value: 'file_size', label: 'Size' },
]

// Get file icon based on MIME type
const getFileIcon = (mimeType: string) => {
  if (mimeType === 'application/pdf') return 'pdf'
  if (
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
    return 'word'
  if (
    mimeType === 'application/vnd.ms-excel' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
    return 'excel'
  if (mimeType.startsWith('image/')) return 'image'
  return 'file'
}

export function MyDocumentsPage() {
  const navigate = useNavigate()

  // Get user data from auth service
  const userData = authService.getUser()
  const user = {
    firstName: userData?.first_name || 'User',
    lastName: userData?.last_name || '',
    email: userData?.email || '',
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
  const [documents, setDocuments] = useState<MyDocumentsGrouped | null>(null)
  const [stats, setStats] = useState<MyDocumentsStats | null>(null)
  const [pinnedItems, setPinnedItems] = useState<PinnedItem[]>([])
  const [pinnedItemsInfo, setPinnedItemsInfo] = useState<{
    count: number
    maxItems: number
    canPinMore: boolean
  }>({ count: 0, maxItems: 20, canPinMore: true })
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [documentTypeFilter, setDocumentTypeFilter] = useState('')
  const [confidentialityFilter, setConfidentialityFilter] = useState<ConfidentialityLevel | ''>('')
  const [sortBy, setSortBy] = useState<SortField>('updated_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY)
    return (saved as ViewMode) || 'list'
  })
  const [expandedGroups, setExpandedGroups] = useState<Set<TimeGroup>>(
    new Set(['today', 'this_week', 'this_month'])
  )
  const [isQuickAccessExpanded, setIsQuickAccessExpanded] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)

  // Document state tabs
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const saved = localStorage.getItem(TAB_STORAGE_KEY)
    return (saved as ActiveTab) || 'all'
  })
  const [stateStats, setStateStats] = useState<DocumentStateStats | null>(null)
  const [stateDocuments, setStateDocuments] = useState<DocumentWithState[]>([])
  const [pendingReviewItems, setPendingReviewItems] = useState<PendingReviewItem[]>([])
  const [isLoadingStateData, setIsLoadingStateData] = useState(false)

  // Filter dropdown states
  const [showTypeFilter, setShowTypeFilter] = useState(false)
  const [showConfidentialityFilter, setShowConfidentialityFilter] = useState(false)
  const [showSortMenu, setShowSortMenu] = useState(false)

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean
    position: { x: number; y: number }
    item: MyDocumentItem | null
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    item: null,
  })

  // Pinned item context menu state
  const [pinnedContextMenu, setPinnedContextMenu] = useState<{
    isOpen: boolean
    position: { x: number; y: number }
    item: PinnedItem | null
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    item: null,
  })

  // Load pinned items
  const loadPinnedItems = useCallback(async () => {
    try {
      const data = await getPinnedItems()
      setPinnedItems(data.results)
      setPinnedItemsInfo({
        count: data.count,
        maxItems: data.max_items,
        canPinMore: data.can_pin_more,
      })
    } catch (error) {
      console.error('Failed to load pinned items:', error)
    }
  }, [])

  // Load data
  const loadData = useCallback(
    async (showLoader = true) => {
      if (showLoader) setIsLoading(true)
      else setIsRefreshing(true)

      try {
        const params: MyDocumentsListParams = {
          sort_by: sortBy,
          sort_order: sortOrder,
        }

        if (documentTypeFilter) {
          params.document_type = documentTypeFilter
        }

        if (confidentialityFilter) {
          params.confidentiality = confidentialityFilter
        }

        if (searchQuery.trim()) {
          params.search = searchQuery.trim()
        }

        const [documentsData, statsData, pinnedData] = await Promise.all([
          getMyDocuments(params),
          getMyDocumentsStats(),
          getPinnedItems(),
        ])

        setPinnedItems(pinnedData.results)
        setPinnedItemsInfo({
          count: pinnedData.count,
          maxItems: pinnedData.max_items,
          canPinMore: pinnedData.can_pin_more,
        })

        setDocuments(documentsData.grouped)
        setStats(statsData)
      } catch (error) {
        console.error('Failed to load documents:', error)
        toast.error('Failed to load your documents')
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [documentTypeFilter, confidentialityFilter, searchQuery, sortBy, sortOrder]
  )

  useEffect(() => {
    loadData()
  }, [loadData])

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, viewMode)
  }, [viewMode])

  // Save tab preference
  useEffect(() => {
    localStorage.setItem(TAB_STORAGE_KEY, activeTab)
  }, [activeTab])

  // Load state-specific data when tab changes
  const loadStateData = useCallback(async () => {
    if (activeTab === 'all') {
      // For "all" tab, we use the regular documents
      return
    }

    setIsLoadingStateData(true)
    try {
      if (activeTab === 'pending_review') {
        const data = await getPendingReview()
        setPendingReviewItems(data.results)
      } else {
        const stateMap: Record<string, DocumentState | undefined> = {
          drafts: 'DRAFT',
          in_review: 'IN_REVIEW',
          approved: 'APPROVED',
          published: 'PUBLISHED',
          archived: 'ARCHIVED',
        }
        const state = stateMap[activeTab]
        if (state) {
          const data = await getDocumentsByState(state)
          setStateDocuments(data.results)
        }
      }
    } catch (error) {
      console.error('Failed to load state data:', error)
      toast.error('Failed to load documents')
    } finally {
      setIsLoadingStateData(false)
    }
  }, [activeTab])

  useEffect(() => {
    loadStateData()
  }, [loadStateData])

  // Load state stats
  const loadStateStats = useCallback(async () => {
    try {
      const stats = await getDocumentStateStats()
      setStateStats(stats)
    } catch (error) {
      console.error('Failed to load state stats:', error)
    }
  }, [])

  useEffect(() => {
    loadStateStats()
  }, [loadStateStats])

  // Close filter dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowTypeFilter(false)
      setShowConfidentialityFilter(false)
      setShowSortMenu(false)
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

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

  // Handle item click (navigate to document)
  const handleItemClick = useCallback(
    (item: MyDocumentItem) => {
      navigate(`/dashboard?document=${item.id}`)
    },
    [navigate]
  )

  // Handle navigate to folder
  const handleNavigateToFolder = useCallback(
    (folderId: string | null) => {
      if (folderId) {
        navigate(`/dashboard?folder=${folderId}`)
      } else {
        navigate('/dashboard')
      }
    },
    [navigate]
  )

  // Context menu handlers
  const openContextMenu = useCallback((e: React.MouseEvent, item: MyDocumentItem) => {
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
    (item: MyDocumentItem): ContextMenuItem[] => {
      return [
        {
          id: 'open',
          label: 'Open',
          icon: <ExternalLink className="w-4 h-4" />,
          onClick: () => handleItemClick(item),
        },
        {
          id: 'preview',
          label: 'Preview',
          icon: <Eye className="w-4 h-4" />,
          onClick: () => handleItemClick(item),
        },
        {
          id: 'download',
          label: 'Download',
          icon: <Download className="w-4 h-4" />,
          onClick: () => {
            window.open(`/api/v1/documents/${item.id}/download/`, '_blank')
          },
        },
        {
          id: 'divider-1',
          label: '',
          divider: true,
          onClick: () => {},
        },
        {
          id: 'go-to-folder',
          label: 'Go to Folder',
          icon: <FolderOpen className="w-4 h-4" />,
          onClick: () => handleNavigateToFolder(item.folder),
        },
        {
          id: 'copy-link',
          label: 'Copy Link',
          icon: <Copy className="w-4 h-4" />,
          onClick: () => {
            navigator.clipboard.writeText(`${window.location.origin}/dashboard?document=${item.id}`)
            toast.success('Link copied to clipboard')
          },
        },
        {
          id: 'divider-2',
          label: '',
          divider: true,
          onClick: () => {},
        },
        {
          id: 'pin',
          label: isPinned(item.id) ? 'Unpin from Quick Access' : 'Pin to Quick Access',
          icon: isPinned(item.id) ? (
            <PinOff className="w-4 h-4 text-amber-500" />
          ) : (
            <Pin className="w-4 h-4" />
          ),
          onClick: () => handleTogglePin(item),
        },
        {
          id: 'divider-3',
          label: '',
          divider: true,
          onClick: () => {},
        },
        {
          id: 'rename',
          label: 'Rename',
          icon: <Edit className="w-4 h-4" />,
          onClick: () => {
            // TODO: Implement rename modal
            toast.info('Rename feature coming soon')
          },
        },
        {
          id: 'delete',
          label: 'Delete',
          icon: <Trash2 className="w-4 h-4 text-red-500" />,
          onClick: () => {
            // TODO: Implement delete confirmation
            toast.info('Delete feature coming soon')
          },
          className: 'text-red-600 dark:text-red-400',
        },
      ]
    },
    [handleItemClick, handleNavigateToFolder, pinnedItems]
  )

  // Check if document is pinned
  const isPinned = useCallback(
    (documentId: string) => {
      return pinnedItems.some((pin) => pin.item_type === 'DOCUMENT' && pin.item_id === documentId)
    },
    [pinnedItems]
  )

  // Get pin ID for document
  const getPinId = useCallback(
    (documentId: string) => {
      const pin = pinnedItems.find((p) => p.item_type === 'DOCUMENT' && p.item_id === documentId)
      return pin?.id
    },
    [pinnedItems]
  )

  // Handle pin/unpin document
  const handleTogglePin = useCallback(
    async (item: MyDocumentItem) => {
      const pinId = getPinId(item.id)

      try {
        if (pinId) {
          // Unpin
          await unpinItem(pinId)
          toast.success(`Unpinned "${item.title}"`)
        } else {
          // Pin
          if (!pinnedItemsInfo.canPinMore) {
            toast.error(`Maximum of ${pinnedItemsInfo.maxItems} pinned items reached`)
            return
          }
          await pinDocument(item.id)
          toast.success(`Pinned "${item.title}" to Quick Access`)
        }
        loadPinnedItems()
      } catch (error) {
        console.error('Failed to toggle pin:', error)
        toast.error('Failed to update pin status')
      }
    },
    [getPinId, pinnedItemsInfo, loadPinnedItems]
  )

  // Handle unpin from Quick Access section
  const handleUnpin = useCallback(
    async (pin: PinnedItem) => {
      try {
        await unpinItem(pin.id)
        toast.success(`Unpinned "${pin.display_name}"`)
        loadPinnedItems()
      } catch (error) {
        console.error('Failed to unpin:', error)
        toast.error('Failed to unpin item')
      }
    },
    [loadPinnedItems]
  )

  // Handle pinned item click
  const handlePinnedItemClick = useCallback(
    (pin: PinnedItem) => {
      if (!pin.is_accessible) {
        toast.error('This item is no longer accessible')
        return
      }

      if (pin.item_type === 'DOCUMENT' || pin.item_type === 'SHARED_DOCUMENT') {
        navigate(`/dashboard?document=${pin.item_id}`)
      } else if (pin.item_type === 'FOLDER' || pin.item_type === 'SHARED_FOLDER') {
        navigate(`/dashboard?folder=${pin.item_id}`)
      }
    },
    [navigate]
  )

  // Handle drag start
  const handleDragStart = useCallback((e: React.DragEvent, pinId: string) => {
    setIsDragging(true)
    setDraggedItem(pinId)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  // Handle drop
  const handleDrop = useCallback(
    async (e: React.DragEvent, targetPinId: string) => {
      e.preventDefault()
      setIsDragging(false)

      if (!draggedItem || draggedItem === targetPinId) {
        setDraggedItem(null)
        return
      }

      // Reorder items
      const currentOrder = pinnedItems.map((p) => p.id)
      const draggedIndex = currentOrder.indexOf(draggedItem)
      const targetIndex = currentOrder.indexOf(targetPinId)

      if (draggedIndex === -1 || targetIndex === -1) {
        setDraggedItem(null)
        return
      }

      // Remove dragged item and insert at target position
      currentOrder.splice(draggedIndex, 1)
      currentOrder.splice(targetIndex, 0, draggedItem)

      try {
        await reorderPinnedItems(currentOrder)
        loadPinnedItems()
      } catch (error) {
        console.error('Failed to reorder:', error)
        toast.error('Failed to reorder items')
      }

      setDraggedItem(null)
    },
    [draggedItem, pinnedItems, loadPinnedItems]
  )

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
    setDraggedItem(null)
  }, [])

  // Pinned item context menu
  const openPinnedContextMenu = useCallback((e: React.MouseEvent, item: PinnedItem) => {
    e.preventDefault()
    e.stopPropagation()
    setPinnedContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      item,
    })
  }, [])

  const closePinnedContextMenu = useCallback(() => {
    setPinnedContextMenu((prev) => ({ ...prev, isOpen: false, item: null }))
  }, [])

  // Build pinned item context menu
  const getPinnedContextMenuItems = useCallback(
    (pin: PinnedItem): ContextMenuItem[] => {
      return [
        {
          id: 'open',
          label: 'Open',
          icon: <ExternalLink className="w-4 h-4" />,
          onClick: () => handlePinnedItemClick(pin),
        },
        {
          id: 'divider-1',
          label: '',
          divider: true,
          onClick: () => {},
        },
        {
          id: 'unpin',
          label: 'Remove from Quick Access',
          icon: <PinOff className="w-4 h-4 text-amber-500" />,
          onClick: () => handleUnpin(pin),
        },
      ]
    },
    [handlePinnedItemClick, handleUnpin]
  )

  // Calculate total documents
  const totalDocuments = useMemo(() => {
    if (!documents) return 0
    return (
      documents.today.length +
      documents.this_week.length +
      documents.this_month.length +
      documents.earlier.length
    )
  }, [documents])

  // Get state icon
  const getStateIcon = (state: DocumentState) => {
    const icons: Record<DocumentState, React.ReactNode> = {
      DRAFT: <Edit className="w-4 h-4" />,
      IN_REVIEW: <Clock className="w-4 h-4" />,
      APPROVED: <CheckCircle className="w-4 h-4" />,
      PUBLISHED: <Globe className="w-4 h-4" />,
      ARCHIVED: <Archive className="w-4 h-4" />,
    }
    return icons[state] || <FileText className="w-4 h-4" />
  }

  // Handle submit for review
  const handleSubmitForReview = async (documentId: string) => {
    try {
      await submitForReview(documentId)
      toast.success('Document submitted for review')
      loadStateData()
      loadStateStats()
    } catch (error) {
      console.error('Failed to submit for review:', error)
      toast.error('Failed to submit for review')
    }
  }

  // Handle approve document
  const handleApproveDocument = async (documentId: string) => {
    try {
      await approveDocument(documentId)
      toast.success('Document approved')
      loadStateData()
      loadStateStats()
    } catch (error) {
      console.error('Failed to approve document:', error)
      toast.error('Failed to approve document')
    }
  }

  // Handle reject document (needs a reason - for now just show a toast)
  const handleRejectDocument = async (documentId: string) => {
    // TODO: Open modal to get rejection reason
    try {
      await rejectDocument(documentId, 'Document needs revisions')
      toast.success('Document rejected')
      loadStateData()
      loadStateStats()
    } catch (error) {
      console.error('Failed to reject document:', error)
      toast.error('Failed to reject document')
    }
  }

  // Render state tabs
  const renderStateTabs = () => {
    const tabs: {
      id: ActiveTab
      label: string
      icon: React.ReactNode
      count?: number
      color?: string
    }[] = [
      {
        id: 'all',
        label: 'All Documents',
        icon: <FileText className="w-4 h-4" />,
        count: stats?.total_documents,
      },
      {
        id: 'drafts',
        label: 'Drafts',
        icon: <Edit className="w-4 h-4" />,
        count: stateStats?.my_drafts,
        color: 'gray',
      },
      {
        id: 'in_review',
        label: 'In Review',
        icon: <Clock className="w-4 h-4" />,
        count: stateStats?.my_in_review,
        color: 'yellow',
      },
      {
        id: 'pending_review',
        label: 'Pending My Review',
        icon: <AlertCircle className="w-4 h-4" />,
        count: stateStats?.pending_my_review,
        color: 'orange',
      },
      {
        id: 'approved',
        label: 'Approved',
        icon: <CheckCircle className="w-4 h-4" />,
        count: stateStats?.by_state?.APPROVED,
        color: 'green',
      },
      {
        id: 'published',
        label: 'Published',
        icon: <Globe className="w-4 h-4" />,
        count: stateStats?.by_state?.PUBLISHED,
        color: 'blue',
      },
      {
        id: 'archived',
        label: 'Archived',
        icon: <Archive className="w-4 h-4" />,
        count: stateStats?.by_state?.ARCHIVED,
        color: 'purple',
      },
    ]

    return (
      <div className="mb-6 overflow-x-auto">
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-medium',
                    tab.id === 'pending_review' && tab.count > 0
                      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Render state badge for document
  const renderStateBadge = (state: DocumentState) => {
    const colors = getDocumentStateColor(state)
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
          colors.bg,
          colors.text
        )}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full', colors.dot)} />
        {getDocumentStateLabel(state)}
      </span>
    )
  }

  // Render state document list item
  const renderStateListItem = (item: DocumentWithState) => {
    return (
      <div
        key={item.id}
        className="group flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-colors select-none"
        onClick={() => handleItemClick(item as unknown as MyDocumentItem)}
        onContextMenu={(e) => openContextMenu(e, item as unknown as MyDocumentItem)}
      >
        {/* File icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <FileText className="w-5 h-5" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {item.title}
            </span>
            {renderStateBadge(item.state)}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="truncate">{item.file_name}</span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span>{formatFileSize(item.file_size)}</span>
          </div>
        </div>

        {/* State actions */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {item.state === 'DRAFT' && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleSubmitForReview(item.id)
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              <Send className="w-3 h-3" />
              Submit
            </button>
          )}
        </div>

        {/* Time */}
        <div className="flex-shrink-0 text-sm text-gray-500 dark:text-gray-400 w-24 text-right">
          {item.time_ago}
        </div>
      </div>
    )
  }

  // Render pending review list item
  const renderPendingReviewItem = (item: PendingReviewItem) => {
    return (
      <div
        key={item.id}
        className="group flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-colors select-none"
        onClick={() => navigate(`/dashboard?document=${item.id}`)}
      >
        {/* File icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
          <Clock className="w-5 h-5" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {item.title}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
              <Clock className="w-3 h-3" />
              In Review
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <User className="w-3 h-3" />
            <span>{item.owner_name || 'Unknown'}</span>
            {item.time_pending && (
              <>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <span>Pending for {item.time_pending}</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleApproveDocument(item.id)
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded-md hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
          >
            <CheckCircle className="w-3 h-3" />
            Approve
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleRejectDocument(item.id)
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
          >
            <XCircle className="w-3 h-3" />
            Reject
          </button>
        </div>

        {/* Confidentiality */}
        <div className="flex-shrink-0">
          <ConfidentialityBadge level={item.confidentiality_level} size="sm" />
        </div>
      </div>
    )
  }

  // Render state-based content
  const renderStateContent = () => {
    if (isLoadingStateData) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
        </div>
      )
    }

    if (activeTab === 'pending_review') {
      if (pendingReviewItems.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              All caught up!
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
              No documents are waiting for your review.
            </p>
          </div>
        )
      }

      return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {pendingReviewItems.map(renderPendingReviewItem)}
        </div>
      )
    }

    if (stateDocuments.length === 0) {
      const stateLabels: Record<ActiveTab, string> = {
        all: 'documents',
        drafts: 'draft documents',
        in_review: 'documents in review',
        pending_review: 'documents pending review',
        approved: 'approved documents',
        published: 'published documents',
        archived: 'archived documents',
      }

      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No {stateLabels[activeTab]}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm">
            Documents in this state will appear here.
          </p>
        </div>
      )
    }

    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {stateDocuments.map(renderStateListItem)}
      </div>
    )
  }

  // Render stats cards
  const renderStatsCards = () => {
    if (!stats) return null

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Documents */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Documents</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.total_documents}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* Total Folders */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">My Folders</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.total_folders}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Folder className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>

        {/* Documents This Week */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">This Week</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.documents_this_week}
              </p>
              {stats.documents_today > 0 && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  +{stats.documents_today} today
                </p>
              )}
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        {/* Storage Used */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Storage Used</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.storage_used_formatted}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <HardDrive className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Render Quick Access section
  const renderQuickAccess = () => {
    if (pinnedItems.length === 0) return null

    return (
      <div className="mb-6">
        {/* Section header */}
        <button
          onClick={() => setIsQuickAccessExpanded(!isQuickAccessExpanded)}
          className="w-full flex items-center gap-2 px-4 py-2 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-t-lg transition-colors bg-amber-50/50 dark:bg-amber-900/10"
        >
          {isQuickAccessExpanded ? (
            <ChevronDown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          )}
          <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="font-medium text-amber-800 dark:text-amber-300">Quick Access</span>
          <span className="text-sm text-amber-600 dark:text-amber-400">
            ({pinnedItems.length}/{pinnedItemsInfo.maxItems})
          </span>
        </button>

        {/* Pinned items */}
        {isQuickAccessExpanded && (
          <div className="bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800 rounded-b-lg overflow-hidden">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-4">
              {pinnedItems.map((pin) => {
                const colors = getPinnedItemColor(pin.item_type)
                const isDocument =
                  pin.item_type === 'DOCUMENT' || pin.item_type === 'SHARED_DOCUMENT'
                const isShared = isSharedItem(pin.item_type)

                return (
                  <div
                    key={pin.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, pin.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, pin.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handlePinnedItemClick(pin)}
                    onContextMenu={(e) => openPinnedContextMenu(e, pin)}
                    className={cn(
                      'group relative flex flex-col p-3 rounded-lg border cursor-pointer transition-all select-none',
                      'hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700',
                      draggedItem === pin.id && 'opacity-50 scale-95',
                      !pin.is_accessible && 'opacity-50',
                      'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    )}
                  >
                    {/* Drag handle */}
                    <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                      <GripVertical className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </div>

                    {/* Icon and badge */}
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center',
                          colors.bg,
                          colors.text
                        )}
                      >
                        {isDocument ? (
                          <FileText className="w-5 h-5" />
                        ) : (
                          <Folder className="w-5 h-5" />
                        )}
                      </div>
                      {isShared && (
                        <Share2 className="w-4 h-4 text-green-500" title="Shared item" />
                      )}
                    </div>

                    {/* Name */}
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {pin.display_name}
                    </p>

                    {/* Type badge */}
                    {pin.item_details && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                        {pin.item_details.type === 'document'
                          ? pin.item_details.document_type?.replace(/_/g, ' ')
                          : pin.item_details.type === 'folder'
                            ? `${pin.item_details.document_count || 0} items`
                            : 'Shared'}
                      </p>
                    )}

                    {/* Unpin button on hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleUnpin(pin)
                      }}
                      className="absolute top-1 right-1 p-1 rounded-md opacity-0 group-hover:opacity-100 bg-white dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-all"
                      title="Unpin"
                    >
                      <PinOff className="w-3 h-3" />
                    </button>

                    {/* Inaccessible overlay */}
                    {!pin.is_accessible && (
                      <div className="absolute inset-0 bg-gray-100/50 dark:bg-gray-800/50 rounded-lg flex items-center justify-center">
                        <span className="text-xs text-red-500 font-medium">Unavailable</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Render list item
  const renderListItem = (item: MyDocumentItem) => {
    return (
      <div
        key={item.id}
        className="group flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-colors select-none"
        onClick={() => handleItemClick(item)}
        onContextMenu={(e) => openContextMenu(e, item)}
      >
        {/* File icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <FileText className="w-5 h-5" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {item.title}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="truncate">{item.file_name}</span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span>{formatFileSize(item.file_size)}</span>
            {item.folder_name && (
              <>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleNavigateToFolder(item.folder)
                  }}
                  className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Folder className="w-3 h-3" />
                  {item.folder_name}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Document type badge */}
        <div className="flex-shrink-0">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            {item.document_type.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Confidentiality */}
        <div className="flex-shrink-0">
          <ConfidentialityBadge level={item.confidentiality_level} size="sm" />
        </div>

        {/* Time */}
        <div className="flex-shrink-0 text-sm text-gray-500 dark:text-gray-400 w-24 text-right">
          {item.time_ago}
        </div>

        {/* Quick actions (visible on hover) */}
        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation()
              window.open(`/api/v1/documents/${item.id}/download/`, '_blank')
            }}
            className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              openContextMenu(e, item)
            }}
            className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 transition-colors"
            title="More actions"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // Render grid item
  const renderGridItem = (item: MyDocumentItem) => {
    const confidentialityColors = getConfidentialityColor(item.confidentiality_level)

    return (
      <div
        key={item.id}
        className="group relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer transition-all select-none"
        onClick={() => handleItemClick(item)}
        onContextMenu={(e) => openContextMenu(e, item)}
      >
        {/* Header with icon */}
        <div className="flex items-start justify-between mb-3">
          <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <FileText className="w-6 h-6" />
          </div>
          <div className="flex items-center gap-1">
            <span
              className={cn(
                'w-2 h-2 rounded-full',
                confidentialityColors.bg,
                item.confidentiality_level === 'HIGHLY_CONFIDENTIAL' && 'animate-pulse'
              )}
              title={getConfidentialityLabel(item.confidentiality_level)}
            />
          </div>
        </div>

        {/* Name */}
        <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate mb-1">{item.title}</h3>

        {/* File info */}
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate mb-3">
          {formatFileSize(item.file_size)}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
            {item.document_type.replace(/_/g, ' ')}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">{item.time_ago}</span>
        </div>

        {/* Quick actions on hover */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation()
              window.open(`/api/v1/documents/${item.id}/download/`, '_blank')
            }}
            className="p-1.5 rounded-md bg-white dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // Render time group section
  const renderTimeGroup = (group: TimeGroup, items: MyDocumentItem[]) => {
    if (items.length === 0) return null

    const isExpanded = expandedGroups.has(group)

    return (
      <div key={group} className="mb-4">
        {/* Group header */}
        <button
          onClick={() => toggleGroup(group)}
          className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg transition-colors bg-gray-50 dark:bg-gray-800"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          )}
          <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
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

  // Render empty state
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <FileText className="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        No documents found
      </h3>
      <p className="text-gray-500 dark:text-gray-400 max-w-sm">
        {searchQuery || documentTypeFilter || confidentialityFilter
          ? 'No documents match your filters. Try adjusting your search criteria.'
          : "You haven't uploaded any documents yet. Upload your first document to get started."}
      </p>
      {!searchQuery && !documentTypeFilter && !confidentialityFilter && (
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Go to Dashboard
        </button>
      )}
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
                  <FileText className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                  My Documents
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  All documents you have uploaded and own
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

            {/* Stats cards */}
            {!isLoading && renderStatsCards()}

            {/* Quick Access section */}
            {!isLoading && renderQuickAccess()}

            {/* State tabs */}
            {!isLoading && renderStateTabs()}

            {/* Filters and search */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search documents..."
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

              {/* Document type filter */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowTypeFilter(!showTypeFilter)
                    setShowConfidentialityFilter(false)
                    setShowSortMenu(false)
                  }}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors',
                    documentTypeFilter
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  )}
                >
                  <FileText className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {documentTypeFilter
                      ? DOCUMENT_TYPE_OPTIONS.find((o) => o.value === documentTypeFilter)?.label
                      : 'Type'}
                  </span>
                  <ChevronDown
                    className={cn('w-4 h-4 transition-transform', showTypeFilter && 'rotate-180')}
                  />
                </button>

                {showTypeFilter && (
                  <div className="absolute top-full mt-2 right-0 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1.5 z-50 max-h-64 overflow-y-auto">
                    {DOCUMENT_TYPE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={(e) => {
                          e.stopPropagation()
                          setDocumentTypeFilter(option.value)
                          setShowTypeFilter(false)
                        }}
                        className={cn(
                          'w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-700',
                          documentTypeFilter === option.value
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

              {/* Confidentiality filter */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowConfidentialityFilter(!showConfidentialityFilter)
                    setShowTypeFilter(false)
                    setShowSortMenu(false)
                  }}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors',
                    confidentialityFilter
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  )}
                >
                  <Filter className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {confidentialityFilter
                      ? getConfidentialityLabel(confidentialityFilter)
                      : 'Confidentiality'}
                  </span>
                  <ChevronDown
                    className={cn(
                      'w-4 h-4 transition-transform',
                      showConfidentialityFilter && 'rotate-180'
                    )}
                  />
                </button>

                {showConfidentialityFilter && (
                  <div className="absolute top-full mt-2 right-0 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1.5 z-50">
                    {CONFIDENTIALITY_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={(e) => {
                          e.stopPropagation()
                          setConfidentialityFilter(option.value)
                          setShowConfidentialityFilter(false)
                        }}
                        className={cn(
                          'w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-700',
                          confidentialityFilter === option.value
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

              {/* Sort menu */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowSortMenu(!showSortMenu)
                    setShowTypeFilter(false)
                    setShowConfidentialityFilter(false)
                  }}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {sortOrder === 'desc' ? (
                    <SortDesc className="w-4 h-4" />
                  ) : (
                    <SortAsc className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">
                    {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
                  </span>
                  <ChevronDown
                    className={cn('w-4 h-4 transition-transform', showSortMenu && 'rotate-180')}
                  />
                </button>

                {showSortMenu && (
                  <div className="absolute top-full mt-2 right-0 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1.5 z-50">
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (sortBy === option.value) {
                            setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                          } else {
                            setSortBy(option.value)
                            setSortOrder('desc')
                          }
                          setShowSortMenu(false)
                        }}
                        className={cn(
                          'w-full flex items-center justify-between px-4 py-2 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-700',
                          sortBy === option.value
                            ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                            : 'text-gray-700 dark:text-gray-300'
                        )}
                      >
                        {option.label}
                        {sortBy === option.value && (
                          <span className="text-xs text-gray-400">
                            {sortOrder === 'desc' ? 'DESC' : 'ASC'}
                          </span>
                        )}
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
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {totalDocuments} document{totalDocuments !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
            </div>
          ) : activeTab !== 'all' ? (
            // State-filtered content
            renderStateContent()
          ) : !documents || !hasDocuments(documents) ? (
            renderEmptyState()
          ) : (
            <div>
              {getTimeGroupsInOrder().map((group) => renderTimeGroup(group, documents[group]))}
            </div>
          )}
        </main>
      </div>

      {/* Context menu */}
      {/* Document context menu */}
      {contextMenu.item && (
        <ContextMenu
          items={getContextMenuItems(contextMenu.item)}
          isOpen={contextMenu.isOpen}
          position={contextMenu.position}
          onClose={closeContextMenu}
        />
      )}

      {/* Pinned item context menu */}
      {pinnedContextMenu.item && (
        <ContextMenu
          items={getPinnedContextMenuItems(pinnedContextMenu.item)}
          isOpen={pinnedContextMenu.isOpen}
          position={pinnedContextMenu.position}
          onClose={closePinnedContextMenu}
        />
      )}
    </div>
  )
}

export default MyDocumentsPage
