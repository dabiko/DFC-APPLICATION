/**
 * FavoritesPage Component
 * Enterprise-standard favorites view with collections, drag-to-reorder,
 * quick preview, export, and sharing capabilities.
 *
 * Features:
 * - Collection-based organization (groups/folders for favorites)
 * - List/Grid view toggle with persistent preference
 * - Drag-to-reorder within collections
 * - Infinite scrolling for large lists
 * - Quick preview on hover
 * - Export favorites list (JSON/CSV)
 * - Share collections with team members
 * - Sorting options (name, date added, type)
 * - Keyboard shortcuts
 * - Bulk operations
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Star,
  Folder,
  FileText,
  Loader2,
  ChevronRight,
  ChevronDown,
  Search,
  List,
  Grid3X3,
  SortAsc,
  SortDesc,
  Clock,
  X,
  Check,
  ArrowUpDown,
  Plus,
  FolderPlus,
  Download,
  Share2,
  MoreHorizontal,
  Edit2,
  Trash2,
  Users,
  GripVertical,
  Eye,
  ExternalLink,
  Lock,
  UserPlus,
  UserMinus,
  AlertTriangle,
  Mail,
  Building2,
  Key,
  Calendar,
  Shield,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import { DateTimePicker } from '@/components/common/DateTimePicker'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { authService } from '@/services/auth.service'
import {
  getFavoriteFolders,
  getFavoriteDocuments,
  removeFolderFromFavorites,
  removeDocumentFromFavorites,
  getCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  reorderFavoriteFolders,
  reorderFavoriteDocuments,
  reorderCollections,
  moveToCollection,
  shareCollection,
  unshareCollection,
  downloadExportedFavorites,
  getShareableUsers,
  getCollectionDetails,
  type FavoriteFolder as FavoriteFolderType,
  type FavoriteDocument as FavoriteDocumentType,
  type FavoriteCollection,
  type FavoriteCollectionDetail,
  type CollectionCreateData,
  type ReorderItem,
  type ShareableUser,
  type SharedUser,
  type ShareCollectionOptions,
} from '@/services/favoritesService'
import { toast } from '@/utils/toast'
import { cn } from '@/utils/cn'
import { ConfidentialityBadge } from '@/components/Badge/ConfidentialityBadge'
import {
  CollectionContextMenu,
  type CollectionOperation,
} from '@/components/Favorites/CollectionContextMenu'

// Constants
const ITEMS_PER_PAGE = 10
const VIEW_STORAGE_KEY = 'favorites-view-mode'
const SORT_STORAGE_KEY = 'favorites-sort'
const COLLAPSED_COLLECTIONS_KEY = 'favorites-collapsed-collections'

type ViewMode = 'list' | 'grid'
type SortField = 'name' | 'date' | 'type'
type SortOrder = 'asc' | 'desc'

interface CombinedItem {
  id: string
  itemId: string
  name: string
  type: 'folder' | 'document'
  path?: string
  department?: string | null
  fileType?: string
  fileSize?: number
  description?: string | null
  confidentialityLevel?: string
  collectionId: string | null
  collectionName: string | null
  position: number
  createdAt: string
  originalData: FavoriteFolderType | FavoriteDocumentType
}

// Collection colors palette
const COLLECTION_COLORS = [
  { name: 'blue', class: 'bg-blue-500' },
  { name: 'green', class: 'bg-green-500' },
  { name: 'purple', class: 'bg-purple-500' },
  { name: 'orange', class: 'bg-orange-500' },
  { name: 'pink', class: 'bg-pink-500' },
  { name: 'yellow', class: 'bg-yellow-500' },
  { name: 'red', class: 'bg-red-500' },
  { name: 'cyan', class: 'bg-cyan-500' },
]

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function FavoritesPage() {
  const navigate = useNavigate()
  const mainRef = useRef<HTMLElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const dragItemRef = useRef<CombinedItem | null>(null)
  const dragOverItemRef = useRef<CombinedItem | null>(null)

  // State
  const [favoriteFolders, setFavoriteFolders] = useState<FavoriteFolderType[]>([])
  const [favoriteDocuments, setFavoriteDocuments] = useState<FavoriteDocumentType[]>([])
  const [collections, setCollections] = useState<FavoriteCollection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'folders' | 'documents'>('all')
  const [activeCollection, setActiveCollection] = useState<string | null>(null) // null = all, 'uncategorized' = no collection
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY)
    return (saved as ViewMode) || 'list'
  })
  const [sortField, setSortField] = useState<SortField>(() => {
    const saved = localStorage.getItem(SORT_STORAGE_KEY)
    return saved ? JSON.parse(saved).field : 'date'
  })
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => {
    const saved = localStorage.getItem(SORT_STORAGE_KEY)
    return saved ? JSON.parse(saved).order : 'desc'
  })
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [collapsedCollections, setCollapsedCollections] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(COLLAPSED_COLLECTIONS_KEY)
    return saved ? new Set(JSON.parse(saved)) : new Set()
  })

  // Modal states
  const [showCreateCollection, setShowCreateCollection] = useState(false)
  const [showEditCollection, setShowEditCollection] = useState<FavoriteCollection | null>(null)
  const [showShareCollection, setShowShareCollection] = useState<FavoriteCollection | null>(null)
  const [showDeleteCollection, setShowDeleteCollection] = useState<FavoriteCollection | null>(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [showCollectionMenu, setShowCollectionMenu] = useState<string | null>(null)

  // Context menu state for collections
  const [contextMenu, setContextMenu] = useState<{
    collection: FavoriteCollection
    position: { x: number; y: number }
  } | null>(null)

  // Quick preview state
  const [previewItem, setPreviewItem] = useState<CombinedItem | null>(null)
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Drag state
  const [isDragging, setIsDragging] = useState(false)

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

  // Persist view mode
  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, viewMode)
  }, [viewMode])

  // Persist sort preference
  useEffect(() => {
    localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify({ field: sortField, order: sortOrder }))
  }, [sortField, sortOrder])

  // Persist collapsed collections
  useEffect(() => {
    localStorage.setItem(COLLAPSED_COLLECTIONS_KEY, JSON.stringify([...collapsedCollections]))
  }, [collapsedCollections])

  // Fetch favorites and collections
  const fetchFavorites = useCallback(async () => {
    setIsLoading(true)
    try {
      const [folders, documents, collectionsList] = await Promise.all([
        getFavoriteFolders(),
        getFavoriteDocuments(),
        getCollections(),
      ])

      setFavoriteFolders(folders)
      setFavoriteDocuments(documents)
      setCollections(collectionsList)
    } catch (error) {
      console.error('Failed to fetch favorites:', error)
      toast.error('Failed to load favorites')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFavorites()
  }, [fetchFavorites])

  // Combine and process items
  const combinedItems = useMemo((): CombinedItem[] => {
    const items: CombinedItem[] = []

    // Add folders
    favoriteFolders.forEach((folder) => {
      items.push({
        id: folder.id,
        itemId: folder.folder_id,
        name: folder.folder_name,
        type: 'folder',
        path: folder.folder_path,
        department: folder.department_name,
        confidentialityLevel: folder.confidentiality_level,
        collectionId: folder.collection_id,
        collectionName: folder.collection_name,
        position: folder.position,
        createdAt: folder.created_at,
        originalData: folder,
      })
    })

    // Add documents
    favoriteDocuments.forEach((doc) => {
      items.push({
        id: doc.id,
        itemId: doc.document_id,
        name: doc.document_title || doc.file_name,
        type: 'document',
        path: doc.folder_name || 'Root',
        fileType: doc.file_type,
        fileSize: doc.file_size,
        description: doc.description,
        department: doc.department_name,
        confidentialityLevel: doc.confidentiality_level,
        collectionId: doc.collection_id,
        collectionName: doc.collection_name,
        position: doc.position,
        createdAt: doc.created_at,
        originalData: doc,
      })
    })

    return items
  }, [favoriteFolders, favoriteDocuments])

  // Filter items by collection, tab, and search
  const filteredItems = useMemo(() => {
    let items = combinedItems

    // Filter by collection
    if (activeCollection === 'uncategorized') {
      items = items.filter((item) => !item.collectionId)
    } else if (activeCollection) {
      items = items.filter((item) => item.collectionId === activeCollection)
    }

    // Filter by tab
    if (activeTab === 'folders') {
      items = items.filter((item) => item.type === 'folder')
    } else if (activeTab === 'documents') {
      items = items.filter((item) => item.type === 'document')
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.path?.toLowerCase().includes(query) ||
          item.department?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
      )
    }

    // Sort items
    items = [...items].sort((a, b) => {
      // First sort by position if in same collection
      if (a.collectionId === b.collectionId && sortField !== 'name') {
        const posComp = a.position - b.position
        if (posComp !== 0) return posComp
      }

      let comparison = 0

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'type':
          comparison = a.type.localeCompare(b.type)
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return items
  }, [combinedItems, activeCollection, activeTab, searchQuery, sortField, sortOrder])

  // Items to display (for infinite scroll)
  const displayedItems = useMemo(() => {
    return filteredItems.slice(0, displayCount)
  }, [filteredItems, displayCount])

  const hasMore = displayCount < filteredItems.length

  // Group items by collection for display
  const itemsByCollection = useMemo(() => {
    const grouped: Record<string, CombinedItem[]> = { uncategorized: [] }

    // Initialize collection groups
    collections.forEach((c) => {
      grouped[c.id] = []
    })

    // Group items
    combinedItems.forEach((item) => {
      if (item.collectionId && grouped[item.collectionId]) {
        grouped[item.collectionId].push(item)
      } else {
        grouped.uncategorized.push(item)
      }
    })

    return grouped
  }, [combinedItems, collections])

  // Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore) {
          setIsLoadingMore(true)
          setTimeout(() => {
            setDisplayCount((prev) => prev + ITEMS_PER_PAGE)
            setIsLoadingMore(false)
          }, 300)
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [hasMore, isLoadingMore])

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE)
  }, [activeTab, activeCollection, searchQuery, sortField, sortOrder])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + G: Toggle grid/list view
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault()
        setViewMode((prev) => (prev === 'list' ? 'grid' : 'list'))
      }
      // Escape: Clear selection, search, or preview
      if (e.key === 'Escape') {
        if (previewItem) {
          setPreviewItem(null)
        } else if (selectedIds.size > 0) {
          setSelectedIds(new Set())
        } else if (searchQuery) {
          setSearchQuery('')
        }
      }
      // Ctrl/Cmd + A: Select all visible
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === 'a' &&
        document.activeElement?.tagName !== 'INPUT'
      ) {
        e.preventDefault()
        if (selectedIds.size === displayedItems.length) {
          setSelectedIds(new Set())
        } else {
          setSelectedIds(new Set(displayedItems.map((item) => item.id)))
        }
      }
      // Ctrl/Cmd + N: New collection
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        setShowCreateCollection(true)
      }
      // Ctrl/Cmd + E: Export
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault()
        setShowExportModal(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIds, searchQuery, displayedItems, previewItem])

  // Remove from favorites
  const handleRemoveFavorite = async (item: CombinedItem) => {
    try {
      if (item.type === 'folder') {
        await removeFolderFromFavorites(item.itemId)
        setFavoriteFolders((prev) => prev.filter((f) => f.folder_id !== item.itemId))
      } else {
        await removeDocumentFromFavorites(item.itemId)
        setFavoriteDocuments((prev) => prev.filter((d) => d.document_id !== item.itemId))
      }
      toast.success(`"${item.name}" removed from favorites`)
      setSelectedIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(item.id)
        return newSet
      })
    } catch (error) {
      console.error('Failed to remove from favorites:', error)
      toast.error('Failed to remove from favorites')
    }
  }

  // Bulk remove
  const handleBulkRemove = async () => {
    const selectedItems = displayedItems.filter((item) => selectedIds.has(item.id))
    let removed = 0
    let failed = 0

    for (const item of selectedItems) {
      try {
        if (item.type === 'folder') {
          await removeFolderFromFavorites(item.itemId)
          setFavoriteFolders((prev) => prev.filter((f) => f.folder_id !== item.itemId))
        } else {
          await removeDocumentFromFavorites(item.itemId)
          setFavoriteDocuments((prev) => prev.filter((d) => d.document_id !== item.itemId))
        }
        removed++
      } catch {
        failed++
      }
    }

    if (removed > 0) {
      toast.success(`${removed} item(s) removed from favorites`)
    }
    if (failed > 0) {
      toast.error(`Failed to remove ${failed} item(s)`)
    }
    setSelectedIds(new Set())
  }

  // Navigate to item
  const handleItemClick = (item: CombinedItem) => {
    if (item.type === 'folder') {
      navigate(`/dashboard?folder=${item.itemId}`)
    } else {
      const doc = item.originalData as FavoriteDocumentType
      if (doc.folder_id) {
        navigate(`/dashboard?folder=${doc.folder_id}&document=${item.itemId}`)
      } else {
        navigate(`/dashboard?document=${item.itemId}`)
      }
    }
  }

  // Toggle selection
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // Toggle collection collapse
  const toggleCollectionCollapse = (collectionId: string) => {
    setCollapsedCollections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(collectionId)) {
        newSet.delete(collectionId)
      } else {
        newSet.add(collectionId)
      }
      return newSet
    })
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // Get recently added items (last 7 days)
  const recentItems = useMemo(() => {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return combinedItems.filter((item) => new Date(item.createdAt) > weekAgo).slice(0, 5)
  }, [combinedItems])

  const totalItems = favoriteFolders.length + favoriteDocuments.length

  // Sort options
  const sortOptions = [
    { field: 'name' as SortField, label: 'Name' },
    { field: 'date' as SortField, label: 'Date Added' },
    { field: 'type' as SortField, label: 'Type' },
  ]

  // Collection CRUD handlers
  const handleCreateCollection = async (data: CollectionCreateData) => {
    try {
      const newCollection = await createCollection(data)
      setCollections((prev) => [...prev, newCollection])
      toast.success(`Collection "${data.name}" created`)
      setShowCreateCollection(false)
    } catch (error) {
      console.error('Failed to create collection:', error)
      toast.error('Failed to create collection')
    }
  }

  const handleUpdateCollection = async (
    collectionId: string,
    data: Partial<CollectionCreateData>
  ) => {
    try {
      const updated = await updateCollection(collectionId, data)
      setCollections((prev) => prev.map((c) => (c.id === collectionId ? updated : c)))
      toast.success('Collection updated')
      setShowEditCollection(null)
    } catch (error) {
      console.error('Failed to update collection:', error)
      toast.error('Failed to update collection')
    }
  }

  const handleDeleteCollection = async (collectionId: string) => {
    try {
      await deleteCollection(collectionId)
      setCollections((prev) => prev.filter((c) => c.id !== collectionId))
      // Items in deleted collection become uncategorized (handled by backend)
      setFavoriteFolders((prev) =>
        prev.map((f) =>
          f.collection_id === collectionId
            ? { ...f, collection_id: null, collection_name: null }
            : f
        )
      )
      setFavoriteDocuments((prev) =>
        prev.map((d) =>
          d.collection_id === collectionId
            ? { ...d, collection_id: null, collection_name: null }
            : d
        )
      )
      toast.success('Collection deleted')
      if (activeCollection === collectionId) {
        setActiveCollection(null)
      }
    } catch (error) {
      console.error('Failed to delete collection:', error)
      toast.error('Failed to delete collection')
    }
  }

  // Move items to collection
  const handleMoveToCollection = async (collectionId: string | null) => {
    const selectedItems = displayedItems.filter((item) => selectedIds.has(item.id))
    const folderIds = selectedItems.filter((i) => i.type === 'folder').map((i) => i.id)
    const documentIds = selectedItems.filter((i) => i.type === 'document').map((i) => i.id)

    try {
      if (folderIds.length > 0) {
        await moveToCollection({
          item_ids: folderIds,
          collection_id: collectionId,
          item_type: 'folder',
        })
      }
      if (documentIds.length > 0) {
        await moveToCollection({
          item_ids: documentIds,
          collection_id: collectionId,
          item_type: 'document',
        })
      }

      // Update local state
      const collection = collections.find((c) => c.id === collectionId)
      setFavoriteFolders((prev) =>
        prev.map((f) =>
          folderIds.includes(f.id)
            ? { ...f, collection_id: collectionId, collection_name: collection?.name || null }
            : f
        )
      )
      setFavoriteDocuments((prev) =>
        prev.map((d) =>
          documentIds.includes(d.id)
            ? { ...d, collection_id: collectionId, collection_name: collection?.name || null }
            : d
        )
      )

      toast.success(`${selectedIds.size} item(s) moved`)
      setSelectedIds(new Set())
      setShowMoveModal(false)
    } catch (error) {
      console.error('Failed to move items:', error)
      toast.error('Failed to move items')
    }
  }

  // Share collection
  const handleShareCollection = async (collectionId: string, options: ShareCollectionOptions) => {
    try {
      const updated = await shareCollection(collectionId, options)
      setCollections((prev) =>
        prev.map((c) =>
          c.id === collectionId
            ? {
                ...c,
                is_shared: options.user_ids.length > 0,
                has_password: updated.has_password,
                share_expires_at: updated.share_expires_at,
              }
            : c
        )
      )
      toast.success('Collection shared successfully')
      setShowShareCollection(null)
    } catch (error) {
      console.error('Failed to share collection:', error)
      toast.error('Failed to share collection')
    }
  }

  const handleUnshareCollection = async (collectionId: string) => {
    try {
      await unshareCollection(collectionId)
      setCollections((prev) =>
        prev.map((c) => (c.id === collectionId ? { ...c, is_shared: false } : c))
      )
      toast.success('Collection sharing removed')
    } catch (error) {
      console.error('Failed to unshare collection:', error)
      toast.error('Failed to unshare collection')
    }
  }

  // Export favorites
  const handleExport = async (format: 'json' | 'csv', includeAll: boolean) => {
    try {
      await downloadExportedFavorites({
        format,
        collection_id: includeAll ? undefined : activeCollection || undefined,
        include_folders: true,
        include_documents: true,
      })
      toast.success(`Favorites exported as ${format.toUpperCase()}`)
      setShowExportModal(false)
    } catch (error) {
      console.error('Failed to export favorites:', error)
      toast.error('Failed to export favorites')
    }
  }

  // Handle collection context menu action
  const handleCollectionContextAction = (operation: CollectionOperation) => {
    if (!contextMenu) return

    const collection = contextMenu.collection

    switch (operation) {
      case 'edit':
        setShowEditCollection(collection)
        break
      case 'share':
        setShowShareCollection(collection)
        break
      case 'unshare':
        handleUnshareCollection(collection.id)
        break
      case 'delete':
        setShowDeleteCollection(collection)
        break
      case 'export':
        // Export just this collection
        downloadExportedFavorites({
          format: 'json',
          collection_id: collection.id,
          include_folders: true,
          include_documents: true,
        })
          .then(() => toast.success(`Collection "${collection.name}" exported`))
          .catch(() => toast.error('Failed to export collection'))
        break
    }

    setContextMenu(null)
  }

  // Drag and drop handlers
  const handleDragStart = (item: CombinedItem) => {
    dragItemRef.current = item
    setIsDragging(true)
  }

  const handleDragEnter = (item: CombinedItem) => {
    dragOverItemRef.current = item
  }

  const handleDragEnd = async () => {
    if (!dragItemRef.current || !dragOverItemRef.current) {
      setIsDragging(false)
      return
    }

    const dragItem = dragItemRef.current
    const dragOverItem = dragOverItemRef.current

    // Only reorder within same type and collection
    if (
      dragItem.type !== dragOverItem.type ||
      dragItem.collectionId !== dragOverItem.collectionId
    ) {
      setIsDragging(false)
      dragItemRef.current = null
      dragOverItemRef.current = null
      return
    }

    // Get items in same collection/type
    const sameCollectionItems = (dragItem.type === 'folder' ? favoriteFolders : favoriteDocuments)
      .filter(
        (i) =>
          (dragItem.type === 'folder'
            ? (i as FavoriteFolderType).collection_id
            : (i as FavoriteDocumentType).collection_id) === dragItem.collectionId
      )
      .sort((a, b) => a.position - b.position)

    // Calculate new positions
    const reorderItems: ReorderItem[] = []
    let newPosition = 0

    sameCollectionItems.forEach((item) => {
      if (item.id === dragItem.id) return // Skip dragged item

      if (item.id === dragOverItem.id) {
        // Insert dragged item before this item
        reorderItems.push({ item_id: dragItem.id, position: newPosition })
        newPosition++
      }

      reorderItems.push({ item_id: item.id, position: newPosition })
      newPosition++

      // Insert dragged item after if it was the last item
    })

    // If dragOverItem was last, add dragItem at end
    if (!reorderItems.find((i) => i.item_id === dragItem.id)) {
      reorderItems.push({ item_id: dragItem.id, position: newPosition })
    }

    try {
      if (dragItem.type === 'folder') {
        await reorderFavoriteFolders(reorderItems)
        // Update local state
        setFavoriteFolders((prev) => {
          const updated = [...prev]
          reorderItems.forEach((r) => {
            const idx = updated.findIndex((f) => f.id === r.item_id)
            if (idx !== -1) {
              updated[idx] = { ...updated[idx], position: r.position }
            }
          })
          return updated.sort((a, b) => a.position - b.position)
        })
      } else {
        await reorderFavoriteDocuments(reorderItems)
        setFavoriteDocuments((prev) => {
          const updated = [...prev]
          reorderItems.forEach((r) => {
            const idx = updated.findIndex((d) => d.id === r.item_id)
            if (idx !== -1) {
              updated[idx] = { ...updated[idx], position: r.position }
            }
          })
          return updated.sort((a, b) => a.position - b.position)
        })
      }
    } catch (error) {
      console.error('Failed to reorder items:', error)
      toast.error('Failed to reorder items')
    }

    setIsDragging(false)
    dragItemRef.current = null
    dragOverItemRef.current = null
  }

  // Quick preview handlers
  const handleMouseEnter = (item: CombinedItem) => {
    previewTimeoutRef.current = setTimeout(() => {
      setPreviewItem(item)
    }, 500) // 500ms delay before showing preview
  }

  const handleMouseLeave = () => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current)
      previewTimeoutRef.current = null
    }
    setPreviewItem(null)
  }

  // Render item row (list view)
  const renderListItem = (item: CombinedItem) => {
    const isSelected = selectedIds.has(item.id)

    return (
      <div
        key={item.id}
        draggable
        onDragStart={() => handleDragStart(item)}
        onDragEnter={() => handleDragEnter(item)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => e.preventDefault()}
        onMouseEnter={() => handleMouseEnter(item)}
        onMouseLeave={handleMouseLeave}
        className={cn(
          'flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group',
          isSelected && 'bg-blue-50 dark:bg-blue-900/20',
          isDragging && 'cursor-grabbing'
        )}
      >
        {/* Drag handle */}
        <div className="mr-2 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>

        {/* Checkbox */}
        <div className="mr-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelection(item.id)}
            className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
          />
        </div>

        {/* Item content */}
        <div
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
          onClick={() => handleItemClick(item)}
        >
          <div
            className={cn(
              'p-2 rounded',
              item.type === 'folder'
                ? 'bg-blue-100 dark:bg-blue-900/30'
                : 'bg-gray-100 dark:bg-gray-700'
            )}
          >
            {item.type === 'folder' ? (
              <Folder className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            ) : (
              <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {item.name}
              </p>
              {item.confidentialityLevel && (
                <ConfidentialityBadge
                  level={
                    item.confidentialityLevel.toLowerCase().replace(/\s+/g, '-') as
                      | 'public'
                      | 'internal'
                      | 'confidential'
                      | 'highly-confidential'
                  }
                  showIcon
                  className="text-xs"
                />
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {item.type === 'folder' ? (
                <>
                  {item.path || '/'} {item.department && `• ${item.department}`}
                </>
              ) : (
                <>
                  {item.fileType} {item.fileSize && `• ${formatFileSize(item.fileSize)}`} • in{' '}
                  {item.path}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Collection badge */}
        {item.collectionName && (
          <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded mr-3">
            <Folder className="w-3 h-3" />
            {item.collectionName}
          </span>
        )}

        {/* Date & Actions */}
        <div className="flex items-center gap-3 ml-4">
          <span className="text-xs text-gray-400 hidden sm:inline whitespace-nowrap">
            {formatDate(item.createdAt)}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleRemoveFavorite(item)
            }}
            className="p-2 text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
            title="Remove from favorites"
          >
            <Star className="w-4 h-4 fill-current" />
          </button>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    )
  }

  // Render item card (grid view)
  const renderGridItem = (item: CombinedItem) => {
    const isSelected = selectedIds.has(item.id)

    return (
      <div
        key={item.id}
        draggable
        onDragStart={() => handleDragStart(item)}
        onDragEnter={() => handleDragEnter(item)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => e.preventDefault()}
        onMouseEnter={() => handleMouseEnter(item)}
        onMouseLeave={handleMouseLeave}
        className={cn(
          'relative bg-white dark:bg-gray-800 border rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer group',
          isSelected
            ? 'border-blue-500 dark:border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
            : 'border-gray-200 dark:border-gray-700',
          isDragging && 'cursor-grabbing'
        )}
        onClick={() => handleItemClick(item)}
      >
        {/* Selection checkbox */}
        <div
          className={cn(
            'absolute top-2 left-2 transition-opacity',
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelection(item.id)}
            className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
          />
        </div>

        {/* Favorite button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleRemoveFavorite(item)
          }}
          className="absolute top-2 right-2 p-1.5 text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          title="Remove from favorites"
        >
          <Star className="w-4 h-4 fill-current" />
        </button>

        {/* Icon */}
        <div
          className={cn(
            'w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3',
            item.type === 'folder'
              ? 'bg-blue-100 dark:bg-blue-900/30'
              : 'bg-gray-100 dark:bg-gray-700'
          )}
        >
          {item.type === 'folder' ? (
            <Folder className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          ) : (
            <FileText className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          )}
        </div>

        {/* Name */}
        <p className="font-medium text-gray-900 dark:text-gray-100 text-center truncate text-sm">
          {item.name}
        </p>

        {/* Type badge */}
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
          {item.type === 'folder' ? 'Folder' : item.fileType}
        </p>

        {/* Confidentiality badge */}
        {item.confidentialityLevel && (
          <div className="flex justify-center mt-2">
            <ConfidentialityBadge
              level={
                item.confidentialityLevel.toLowerCase().replace(/\s+/g, '-') as
                  | 'public'
                  | 'internal'
                  | 'confidential'
                  | 'highly-confidential'
              }
              showIcon
              className="text-xs"
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <DashboardHeader user={user} notifications={[]} onLogout={handleLogout} />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <DashboardSidebar />

        {/* Main Content */}
        <main ref={mainRef} className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
          <div className="max-w-6xl mx-auto p-6">
            {/* Page Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                    <Star className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      Favorites
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {totalItems} item{totalItems !== 1 ? 's' : ''} in {collections.length}{' '}
                      collection{collections.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-2">
                  {/* New Collection */}
                  <button
                    onClick={() => setShowCreateCollection(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                    title="New Collection (Ctrl+N)"
                  >
                    <FolderPlus className="w-4 h-4" />
                    <span className="hidden sm:inline">New Collection</span>
                  </button>

                  {/* Export */}
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:border-gray-400 dark:hover:border-gray-600 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300"
                    title="Export (Ctrl+E)"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Export</span>
                  </button>

                  {/* View Toggle */}
                  <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('list')}
                      className={cn(
                        'p-2 rounded-md transition-colors',
                        viewMode === 'list'
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      )}
                      title="List view (Ctrl+G)"
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('grid')}
                      className={cn(
                        'p-2 rounded-md transition-colors',
                        viewMode === 'grid'
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      )}
                      title="Grid view (Ctrl+G)"
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Collections Sidebar + Content */}
            <div className="flex gap-6">
              {/* Collections Panel */}
              <div className="w-64 flex-shrink-0 hidden lg:block">
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Collections
                  </h3>

                  <div className="space-y-1">
                    {/* All Favorites */}
                    <button
                      onClick={() => setActiveCollection(null)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors',
                        activeCollection === null
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      )}
                    >
                      <Star className="w-4 h-4" />
                      <span className="flex-1 text-left">All Favorites</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{totalItems}</span>
                    </button>

                    {/* Uncategorized */}
                    <button
                      onClick={() => setActiveCollection('uncategorized')}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors',
                        activeCollection === 'uncategorized'
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      )}
                    >
                      <Folder className="w-4 h-4 text-gray-400" />
                      <span className="flex-1 text-left">Uncategorized</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {itemsByCollection.uncategorized?.length || 0}
                      </span>
                    </button>

                    {/* User Collections */}
                    {collections.map((collection) => (
                      <div key={collection.id} className="relative group">
                        <button
                          onClick={() => setActiveCollection(collection.id)}
                          onContextMenu={(e) => {
                            e.preventDefault()
                            setContextMenu({
                              collection,
                              position: { x: e.clientX, y: e.clientY },
                            })
                          }}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors',
                            activeCollection === collection.id
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          )}
                        >
                          <div
                            className={cn(
                              'w-3 h-3 rounded-sm',
                              COLLECTION_COLORS.find((c) => c.name === collection.color)?.class ||
                                'bg-blue-500'
                            )}
                          />
                          <span className="flex-1 text-left truncate">{collection.name}</span>
                          {collection.is_shared && (
                            <Users className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          )}
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {collection.item_count}
                          </span>
                        </button>

                        {/* Collection menu button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowCollectionMenu(
                              showCollectionMenu === collection.id ? null : collection.id
                            )
                          }}
                          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {/* Collection dropdown menu */}
                        {showCollectionMenu === collection.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setShowCollectionMenu(null)}
                            />
                            <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                              <div className="p-1">
                                <button
                                  onClick={() => {
                                    setShowEditCollection(collection)
                                    setShowCollectionMenu(null)
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                >
                                  <Edit2 className="w-4 h-4" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    setShowShareCollection(collection)
                                    setShowCollectionMenu(null)
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                >
                                  <Share2 className="w-4 h-4" />
                                  Share
                                </button>
                                <button
                                  onClick={() => {
                                    setShowDeleteCollection(collection)
                                    setShowCollectionMenu(null)
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add Collection Button */}
                  <button
                    onClick={() => setShowCreateCollection(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 mt-3 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Collection
                  </button>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 min-w-0">
                {/* Recently Added (only show when not searching and on 'all' collection) */}
                {!searchQuery && !activeCollection && recentItems.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Recently Added
                      </h2>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {recentItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleItemClick(item)}
                          className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-700 transition-colors flex-shrink-0"
                        >
                          {item.type === 'folder' ? (
                            <Folder className="w-4 h-4 text-blue-500" />
                          ) : (
                            <FileText className="w-4 h-4 text-gray-500" />
                          )}
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap max-w-[150px] truncate">
                            {item.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Toolbar: Search, Tabs, Sort */}
                <div className="mb-6 flex flex-col lg:flex-row gap-4">
                  {/* Search */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search favorites..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {/* Tabs */}
                    <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      {[
                        { key: 'all', label: 'All', count: filteredItems.length },
                        {
                          key: 'folders',
                          label: 'Folders',
                          count: filteredItems.filter((i) => i.type === 'folder').length,
                        },
                        {
                          key: 'documents',
                          label: 'Documents',
                          count: filteredItems.filter((i) => i.type === 'document').length,
                        },
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => setActiveTab(tab.key as typeof activeTab)}
                          className={cn(
                            'px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5',
                            activeTab === tab.key
                              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                          )}
                        >
                          {tab.label}
                          <span
                            className={cn(
                              'text-xs px-1.5 py-0.5 rounded-full',
                              activeTab === tab.key
                                ? 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                            )}
                          >
                            {tab.count}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Sort Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setShowSortMenu(!showSortMenu)}
                        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
                      >
                        <ArrowUpDown className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {sortOptions.find((o) => o.field === sortField)?.label}
                        </span>
                        {sortOrder === 'asc' ? (
                          <SortAsc className="w-4 h-4 text-gray-400" />
                        ) : (
                          <SortDesc className="w-4 h-4 text-gray-400" />
                        )}
                      </button>

                      {showSortMenu && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setShowSortMenu(false)}
                          />
                          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                            <div className="p-2">
                              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 py-1">
                                Sort by
                              </div>
                              {sortOptions.map((option) => (
                                <button
                                  key={option.field}
                                  onClick={() => {
                                    if (sortField === option.field) {
                                      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
                                    } else {
                                      setSortField(option.field)
                                      setSortOrder('asc')
                                    }
                                    setShowSortMenu(false)
                                  }}
                                  className={cn(
                                    'w-full flex items-center justify-between px-2 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700',
                                    sortField === option.field
                                      ? 'text-blue-600 dark:text-blue-400'
                                      : 'text-gray-700 dark:text-gray-300'
                                  )}
                                >
                                  {option.label}
                                  {sortField === option.field && <Check className="w-4 h-4" />}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bulk Actions Bar */}
                {selectedIds.size > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between flex-wrap gap-2">
                    <span className="text-sm text-blue-700 dark:text-blue-300">
                      {selectedIds.size} item(s) selected
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setShowMoveModal(true)}
                        className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors flex items-center gap-1"
                      >
                        <Folder className="w-4 h-4" />
                        Move to Collection
                      </button>
                      <button
                        onClick={handleBulkRemove}
                        className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors flex items-center gap-1"
                      >
                        <Star className="w-4 h-4" />
                        Remove from Favorites
                      </button>
                      <button
                        onClick={() => setSelectedIds(new Set())}
                        className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>
                )}

                {/* Content */}
                {isLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                  </div>
                ) : totalItems === 0 ? (
                  <div className="text-center py-20">
                    <Star className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                      No favorites yet
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      Star folders and documents for quick access
                    </p>
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      Browse Documents
                    </button>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="text-center py-12">
                    <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      No favorites match your filters
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery('')
                        setActiveCollection(null)
                        setActiveTab('all')
                      }}
                      className="mt-2 text-blue-600 dark:text-blue-400 hover:underline text-sm"
                    >
                      Clear all filters
                    </button>
                  </div>
                ) : viewMode === 'list' ? (
                  /* List View */
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {displayedItems.map(renderListItem)}
                    </div>
                  </div>
                ) : (
                  /* Grid View */
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {displayedItems.map(renderGridItem)}
                  </div>
                )}

                {/* Load More / Infinite Scroll Trigger */}
                {hasMore && (
                  <div ref={loadMoreRef} className="flex justify-center py-8">
                    {isLoadingMore ? (
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Loading more...</span>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 dark:text-gray-500">
                        Scroll for more ({filteredItems.length - displayCount} remaining)
                      </p>
                    )}
                  </div>
                )}

                {/* Keyboard Shortcuts Hint */}
                <div className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
                  <span className="inline-flex items-center gap-4 flex-wrap justify-center">
                    <span>
                      <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                        Ctrl+G
                      </kbd>{' '}
                      Toggle view
                    </span>
                    <span>
                      <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                        Ctrl+N
                      </kbd>{' '}
                      New collection
                    </span>
                    <span>
                      <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                        Ctrl+E
                      </kbd>{' '}
                      Export
                    </span>
                    <span>
                      <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">Esc</kbd>{' '}
                      Clear
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Quick Preview Panel */}
      {previewItem && (
        <div
          className="fixed right-4 bottom-4 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50"
          onMouseEnter={() => {
            if (previewTimeoutRef.current) {
              clearTimeout(previewTimeoutRef.current)
            }
          }}
          onMouseLeave={handleMouseLeave}
        >
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {previewItem.type === 'folder' ? (
                  <Folder className="w-5 h-5 text-blue-500" />
                ) : (
                  <FileText className="w-5 h-5 text-gray-500" />
                )}
                <span className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
                  {previewItem.name}
                </span>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-sm">
              {previewItem.type === 'document' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Type:</span>
                    <span className="text-gray-900 dark:text-gray-100">{previewItem.fileType}</span>
                  </div>
                  {previewItem.fileSize && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Size:</span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {formatFileSize(previewItem.fileSize)}
                      </span>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Location:</span>
                <span className="text-gray-900 dark:text-gray-100 truncate max-w-[150px]">
                  {previewItem.path || '/'}
                </span>
              </div>
              {previewItem.department && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Department:</span>
                  <span className="text-gray-900 dark:text-gray-100">{previewItem.department}</span>
                </div>
              )}
              {previewItem.confidentialityLevel && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400">Confidentiality:</span>
                  <ConfidentialityBadge
                    level={
                      previewItem.confidentialityLevel.toLowerCase().replace(/\s+/g, '-') as
                        | 'public'
                        | 'internal'
                        | 'confidential'
                        | 'highly-confidential'
                    }
                    showIcon
                    className="text-xs"
                  />
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Added:</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {formatDate(previewItem.createdAt)}
                </span>
              </div>
              {previewItem.description && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-gray-600 dark:text-gray-400 line-clamp-3">
                    {previewItem.description}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => handleItemClick(previewItem)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open
              </button>
              <button
                onClick={() => {
                  handleRemoveFavorite(previewItem)
                  setPreviewItem(null)
                }}
                className="px-3 py-2 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
              >
                <Star className="w-4 h-4 fill-current" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Collection Modal */}
      {showCreateCollection && (
        <CollectionModal
          onClose={() => setShowCreateCollection(false)}
          onSave={handleCreateCollection}
        />
      )}

      {/* Edit Collection Modal */}
      {showEditCollection && (
        <CollectionModal
          collection={showEditCollection}
          onClose={() => setShowEditCollection(null)}
          onSave={(data) => handleUpdateCollection(showEditCollection.id, data)}
        />
      )}

      {/* Share Collection Modal */}
      {showShareCollection && (
        <ShareModal
          collection={showShareCollection}
          onClose={() => setShowShareCollection(null)}
          onShare={(options) => handleShareCollection(showShareCollection.id, options)}
          onUnshare={() => handleUnshareCollection(showShareCollection.id)}
        />
      )}

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          onExport={handleExport}
          hasActiveCollection={!!activeCollection}
        />
      )}

      {/* Move to Collection Modal */}
      {showMoveModal && (
        <MoveToCollectionModal
          collections={collections}
          selectedCount={selectedIds.size}
          onClose={() => setShowMoveModal(false)}
          onMove={handleMoveToCollection}
        />
      )}

      {/* Collection Context Menu */}
      {contextMenu && (
        <CollectionContextMenu
          collection={contextMenu.collection}
          position={contextMenu.position}
          onAction={handleCollectionContextAction}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Delete Collection Modal */}
      {showDeleteCollection && (
        <DeleteCollectionModal
          collection={showDeleteCollection}
          itemCount={itemsByCollection[showDeleteCollection.id]?.length || 0}
          onClose={() => setShowDeleteCollection(null)}
          onDelete={async () => {
            await handleDeleteCollection(showDeleteCollection.id)
            setShowDeleteCollection(null)
          }}
        />
      )}
    </div>
  )
}

// Collection Create/Edit Modal Component
interface CollectionModalProps {
  collection?: FavoriteCollection
  onClose: () => void
  onSave: (data: CollectionCreateData) => void
}

function CollectionModal({ collection, onClose, onSave }: CollectionModalProps) {
  const [name, setName] = useState(collection?.name || '')
  const [description, setDescription] = useState(collection?.description || '')
  const [color, setColor] = useState(collection?.color || 'blue')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)
    try {
      await onSave({ name: name.trim(), description: description.trim(), color })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {collection ? 'Edit Collection' : 'Create Collection'}
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Project Files, Monthly Reports"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this collection for?"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {COLLECTION_COLORS.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setColor(c.name)}
                      className={cn(
                        'w-8 h-8 rounded-full transition-all',
                        c.class,
                        color === c.name
                          ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800'
                          : 'hover:scale-110'
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || isSubmitting}
                className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {collection ? 'Save Changes' : 'Create Collection'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Share Modal Component
interface ShareModalProps {
  collection: FavoriteCollection
  onClose: () => void
  onShare: (options: ShareCollectionOptions) => void
  onUnshare: () => void
}

function ShareModal({ collection, onClose, onShare, onUnshare }: ShareModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<ShareableUser[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set())
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const currentUser = authService.getUser()

  // Protection options
  const [enablePassword, setEnablePassword] = useState(collection.has_password || false)
  const [password, setPassword] = useState('')
  const [removePassword, setRemovePassword] = useState(false)
  const [enableExpiration, setEnableExpiration] = useState(!!collection.share_expires_at)
  const [expiresAt, setExpiresAt] = useState(
    collection.share_expires_at
      ? new Date(collection.share_expires_at).toISOString().slice(0, 16)
      : ''
  )

  // Load users and collection details
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [usersData, collectionData] = await Promise.all([
          getShareableUsers(),
          getCollectionDetails(collection.id),
        ])

        // Filter out current user from shareable users
        const filteredUsers = usersData.filter((u) => u.id !== currentUser?.id)
        setUsers(filteredUsers)

        // Set already shared users
        if (collectionData.shared_with_users) {
          setSharedUsers(collectionData.shared_with_users)
          setSelectedUserIds(new Set(collectionData.shared_with_users.map((u) => u.id)))
        }
      } catch (err) {
        console.error('Failed to load users:', err)
        setError('Failed to load users. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [collection.id, currentUser?.id])

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users
    const query = searchQuery.toLowerCase()
    return users.filter(
      (user) =>
        user.first_name.toLowerCase().includes(query) ||
        user.last_name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.username.toLowerCase().includes(query) ||
        user.department_name?.toLowerCase().includes(query)
    )
  }, [users, searchQuery])

  // Toggle user selection
  const toggleUser = (userId: number) => {
    setSelectedUserIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(userId)) {
        newSet.delete(userId)
      } else {
        newSet.add(userId)
      }
      return newSet
    })
  }

  // Handle share
  const handleShare = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      const options: ShareCollectionOptions = {
        user_ids: Array.from(selectedUserIds),
      }

      // Handle password
      if (removePassword) {
        options.remove_password = true
      } else if (enablePassword && password) {
        options.password = password
      }

      // Handle expiration
      if (enableExpiration && expiresAt) {
        options.expires_at = new Date(expiresAt).toISOString()
      } else if (!enableExpiration) {
        options.expires_at = null
      }

      await onShare(options)
      onClose()
    } catch (err) {
      setError('Failed to share collection. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle unshare
  const handleUnshare = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      await onUnshare()
      onClose()
    } catch (err) {
      setError('Failed to remove sharing. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Check if there are changes
  const originalIds = new Set(sharedUsers.map((u) => u.id))
  const hasUserChanges =
    selectedUserIds.size !== originalIds.size ||
    Array.from(selectedUserIds).some((id) => !originalIds.has(id))
  const hasPasswordChanges =
    (enablePassword && password) || removePassword || (!enablePassword && collection.has_password)
  const hasExpirationChanges =
    enableExpiration !== !!collection.share_expires_at ||
    (enableExpiration && expiresAt !== collection.share_expires_at?.slice(0, 16))
  const hasChanges = hasUserChanges || hasPasswordChanges || hasExpirationChanges

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Share2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2
                id="share-modal-title"
                className="text-lg font-semibold text-gray-900 dark:text-gray-100"
              >
                Share Collection
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{collection.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          {/* Info banner */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-4">
            <div className="flex gap-2">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Shared users can view this collection and its items but cannot modify them.
                </p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by name, email, or department..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* User list */}
          <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Users className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">
                  {searchQuery ? 'No users match your search' : 'No users available'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((user) => {
                  const isSelected = selectedUserIds.has(user.id)
                  const isCurrentlyShared = sharedUsers.some((u) => u.id === user.id)

                  return (
                    <button
                      key={user.id}
                      onClick={() => toggleUser(user.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      )}
                    >
                      {/* Avatar */}
                      <div
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium',
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        )}
                      >
                        {user.first_name[0]}
                        {user.last_name[0]}
                      </div>

                      {/* User info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {user.first_name} {user.last_name}
                          </p>
                          {isCurrentlyShared && (
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                              Shared
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </span>
                          {user.department_name && (
                            <span className="flex items-center gap-1 truncate">
                              <Building2 className="w-3 h-3" />
                              {user.department_name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Checkbox */}
                      <div
                        className={cn(
                          'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                          isSelected
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300 dark:border-gray-600'
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Selection summary */}
          {selectedUserIds.size > 0 && (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              {selectedUserIds.size} user{selectedUserIds.size !== 1 ? 's' : ''} selected
            </p>
          )}

          {/* Protection Options */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Protection Options (Optional)
            </h3>

            {/* Password Protection */}
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enablePassword}
                  onChange={(e) => {
                    setEnablePassword(e.target.checked)
                    if (!e.target.checked) {
                      setPassword('')
                      if (collection.has_password) {
                        setRemovePassword(true)
                      }
                    } else {
                      setRemovePassword(false)
                    }
                  }}
                  disabled={isSubmitting}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Require password to access
                  {collection.has_password && !removePassword && (
                    <span className="px-1.5 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Protected
                    </span>
                  )}
                </span>
              </label>
              {enablePassword && (
                <div className="ml-7">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      collection.has_password
                        ? 'Enter new password (leave empty to keep current)'
                        : 'Enter password'
                    }
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {collection.has_password && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Leave empty to keep the current password
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Expiration Date */}
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableExpiration}
                  onChange={(e) => {
                    setEnableExpiration(e.target.checked)
                    if (!e.target.checked) {
                      setExpiresAt('')
                    }
                  }}
                  disabled={isSubmitting}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Set expiration date
                  {collection.share_expires_at && enableExpiration && (
                    <span className="px-1.5 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded">
                      Expires {new Date(collection.share_expires_at).toLocaleDateString()}
                    </span>
                  )}
                </span>
              </label>
              {enableExpiration && (
                <div className="ml-7">
                  <DateTimePicker
                    value={expiresAt}
                    onChange={setExpiresAt}
                    min={new Date().toISOString().slice(0, 16)}
                    disabled={isSubmitting}
                    placeholder="Select expiration date and time"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    After this date, shared users will no longer have access
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-900 rounded-b-lg border-t border-gray-200 dark:border-gray-700">
          {/* Unshare button */}
          {collection.is_shared && (
            <button
              onClick={handleUnshare}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
            >
              <UserMinus className="w-4 h-4" />
              Remove All
            </button>
          )}

          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleShare}
              disabled={isSubmitting || !hasChanges}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  {collection.is_shared ? 'Update Sharing' : 'Share'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Delete Collection Modal Component
interface DeleteCollectionModalProps {
  collection: FavoriteCollection
  itemCount: number
  onClose: () => void
  onDelete: () => Promise<void>
}

function DeleteCollectionModal({
  collection,
  itemCount,
  onClose,
  onDelete,
}: DeleteCollectionModalProps) {
  const [confirmationText, setConfirmationText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [acknowledgeItems, setAcknowledgeItems] = useState(false)

  const isConfirmationValid = confirmationText === collection.name
  const hasItems = itemCount > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isConfirmationValid) {
      setError('Collection name does not match. Please type the exact name to confirm.')
      return
    }

    if (hasItems && !acknowledgeItems) {
      setError('Please acknowledge that items will become uncategorized.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await onDelete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move collection to trash')
      setIsLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-collection-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
              <Trash2 className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h2
              id="delete-collection-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              Move to Trash
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            {/* Warning */}
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex gap-3">
                <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                    Move to Trash
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    This collection will be moved to trash. You can restore it later from the trash.
                    Items in this collection will become uncategorized but will not be removed from
                    your favorites.
                  </p>
                </div>
              </div>
            </div>

            {/* Collection details */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-400">Collection:</span>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'w-3 h-3 rounded-sm',
                      COLLECTION_COLORS.find((c) => c.name === collection.color)?.class ||
                        'bg-blue-500'
                    )}
                  />
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {collection.name}
                  </span>
                </div>
              </div>
              {collection.description && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Description: </span>
                  <span className="text-gray-900 dark:text-gray-100">{collection.description}</span>
                </div>
              )}
              <div>
                <span className="text-gray-600 dark:text-gray-400">Items: </span>
                <span className="text-gray-900 dark:text-gray-100">{itemCount}</span>
              </div>
              {collection.is_shared && (
                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <Users className="w-4 h-4" />
                  <span>This collection is shared with others</span>
                </div>
              )}
            </div>

            {/* Items warning */}
            {hasItems && (
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <p className="text-sm text-orange-800 dark:text-orange-200 mb-2">
                  This collection contains <strong>{itemCount}</strong> item
                  {itemCount !== 1 ? 's' : ''}. These items will become uncategorized.
                </p>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acknowledgeItems}
                    onChange={(e) => {
                      setAcknowledgeItems(e.target.checked)
                      setError(null)
                    }}
                    disabled={isLoading}
                    className="mt-1 w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <span className="text-sm text-orange-700 dark:text-orange-300">
                    I understand that all items will become uncategorized
                  </span>
                </label>
              </div>
            )}

            {/* Confirmation input */}
            <div>
              <label
                htmlFor="confirmation"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Type{' '}
                <span className="font-mono font-semibold text-yellow-600 dark:text-yellow-400">
                  {collection.name}
                </span>{' '}
                to confirm
              </label>
              <input
                id="confirmation"
                type="text"
                value={confirmationText}
                onChange={(e) => {
                  setConfirmationText(e.target.value)
                  setError(null)
                }}
                disabled={isLoading}
                placeholder="Type collection name here"
                className={cn(
                  'w-full px-3 py-2 border rounded-lg',
                  'bg-white dark:bg-gray-900',
                  'text-gray-900 dark:text-gray-100',
                  'placeholder-gray-400 dark:placeholder-gray-500',
                  'focus:outline-none focus:ring-2 focus:ring-yellow-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                )}
                autoFocus
              />
              {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-900 rounded-b-lg border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !isConfirmationValid || (hasItems && !acknowledgeItems)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Moving to Trash...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Move to Trash
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Export Modal Component
interface ExportModalProps {
  onClose: () => void
  onExport: (format: 'json' | 'csv', includeAll: boolean) => void
  hasActiveCollection: boolean
}

function ExportModal({ onClose, onExport, hasActiveCollection }: ExportModalProps) {
  const [format, setFormat] = useState<'json' | 'csv'>('json')
  const [includeAll, setIncludeAll] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await onExport(format, includeAll)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Export Favorites
            </h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Format
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFormat('json')}
                  className={cn(
                    'flex-1 px-4 py-2 text-sm font-medium rounded-lg border transition-colors',
                    format === 'json'
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-400'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                  )}
                >
                  JSON
                </button>
                <button
                  onClick={() => setFormat('csv')}
                  className={cn(
                    'flex-1 px-4 py-2 text-sm font-medium rounded-lg border transition-colors',
                    format === 'csv'
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-400'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                  )}
                >
                  CSV
                </button>
              </div>
            </div>

            {hasActiveCollection && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Scope
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={includeAll}
                      onChange={() => setIncludeAll(true)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">All favorites</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!includeAll}
                      onChange={() => setIncludeAll(false)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Current collection only
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isExporting && <Loader2 className="w-4 h-4 animate-spin" />}
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Move to Collection Modal Component
interface MoveToCollectionModalProps {
  collections: FavoriteCollection[]
  selectedCount: number
  onClose: () => void
  onMove: (collectionId: string | null) => void
}

function MoveToCollectionModal({
  collections,
  selectedCount,
  onClose,
  onMove,
}: MoveToCollectionModalProps) {
  const [isMoving, setIsMoving] = useState(false)

  const handleMove = async (collectionId: string | null) => {
    setIsMoving(true)
    try {
      await onMove(collectionId)
    } finally {
      setIsMoving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Move {selectedCount} item(s)
            </h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-1 max-h-64 overflow-y-auto">
            {/* Uncategorized option */}
            <button
              onClick={() => handleMove(null)}
              disabled={isMoving}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <Folder className="w-4 h-4 text-gray-400" />
              Uncategorized
            </button>

            {/* Collections */}
            {collections.map((collection) => (
              <button
                key={collection.id}
                onClick={() => handleMove(collection.id)}
                disabled={isMoving}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <div
                  className={cn(
                    'w-4 h-4 rounded-sm',
                    COLLECTION_COLORS.find((c) => c.name === collection.color)?.class ||
                      'bg-blue-500'
                  )}
                />
                <span className="flex-1 text-left truncate">{collection.name}</span>
                <span className="text-xs text-gray-500">{collection.item_count}</span>
              </button>
            ))}
          </div>

          {isMoving && (
            <div className="flex items-center justify-center gap-2 mt-4 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Moving...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FavoritesPage
