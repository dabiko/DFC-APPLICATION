/**
 * TrashPage Component
 * Enterprise-standard trash/recycle bin view
 * Features: View deleted items, restore, permanent delete, empty trash
 * Enhanced with filters, pagination, confirmation modals, and audit info
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Folder,
  FileText,
  Clock,
  Loader2,
  Search,
  Grid3X3,
  List,
  ChevronLeft,
  ChevronRight,
  Eye,
  User,
  X,
  AlertCircle,
} from 'lucide-react'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { folderService } from '@/services/folderService'
import {
  getTrashDocuments,
  restoreDocument,
  permanentlyDeleteDocument,
  emptyDocumentTrash,
  type TrashedDocument,
} from '@/services/documentService'
import { authService } from '@/services/auth.service'
import { toast } from '@/utils/toast'
import { cn } from '@/utils/cn'
import type { Folder as FolderType } from '@/types/folder'

// Unified trash item type
interface TrashItem {
  id: string
  name: string
  type: 'folder' | 'document'
  path?: string
  deletedAt: string | null
  deletedByName: string | null
  deletedByEmail?: string | null
  totalSize?: number
  fileSize?: number
  fileType?: string
  childrenCount?: number
  documentCount?: number
  // Original data for operations
  originalFolder?: FolderType
  originalDocument?: TrashedDocument
}

// Retention period in days (configurable)
const TRASH_RETENTION_DAYS = 30
const ITEMS_PER_PAGE = 10

// Filter types
type FilterType = 'all' | 'folders' | 'documents'
type ViewMode = 'list' | 'grid'

// Modal types
type ModalType = 'restore' | 'delete' | 'empty' | 'preview' | null

interface ModalState {
  type: ModalType
  item?: TrashItem | null
  confirmText?: string
}

export function TrashPage() {
  const navigate = useNavigate()
  const [trashedFolders, setTrashedFolders] = useState<FolderType[]>([])
  const [trashedDocuments, setTrashedDocuments] = useState<TrashedDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isRestoring, setIsRestoring] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isEmptyingTrash, setIsEmptyingTrash] = useState(false)

  // Filters and search
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)

  // Modal state
  const [modal, setModal] = useState<ModalState>({ type: null })
  const [confirmInput, setConfirmInput] = useState('')

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

  // Fetch trashed items (both folders and documents)
  const fetchTrashedItems = useCallback(async () => {
    setIsLoading(true)
    try {
      const [folders, documents] = await Promise.all([
        folderService.getTrashFolders(),
        getTrashDocuments(),
      ])
      setTrashedFolders(folders)
      setTrashedDocuments(documents)
    } catch (error) {
      console.error('Failed to fetch trash:', error)
      toast.error('Failed to load trash items')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTrashedItems()
  }, [fetchTrashedItems])

  // Transform folders and documents into unified TrashItem format
  const allTrashItems = useMemo((): TrashItem[] => {
    const folderItems: TrashItem[] = trashedFolders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      type: 'folder' as const,
      path: folder.path,
      deletedAt: folder.deletedAt || null,
      deletedByName: folder.deletedByName || null,
      deletedByEmail: folder.deletedByEmail || null,
      totalSize: folder.totalSize,
      childrenCount: folder.childrenCount,
      documentCount: folder.documentCount,
      originalFolder: folder,
    }))

    const documentItems: TrashItem[] = trashedDocuments.map((doc) => ({
      id: doc.id,
      name: doc.title,
      type: 'document' as const,
      path: doc.folder_path || '/',
      deletedAt: doc.deleted_at,
      deletedByName: doc.deleted_by_name,
      deletedByEmail: doc.deleted_by_email || null,
      fileSize: doc.file_size,
      fileType: doc.file_type,
      originalDocument: doc,
    }))

    // Combine and sort by deleted date (most recent first)
    return [...folderItems, ...documentItems].sort((a, b) => {
      const dateA = a.deletedAt ? new Date(a.deletedAt).getTime() : 0
      const dateB = b.deletedAt ? new Date(b.deletedAt).getTime() : 0
      return dateB - dateA
    })
  }, [trashedFolders, trashedDocuments])

  // Filter and search logic
  const filteredItems = useMemo(() => {
    let items = allTrashItems

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.path?.toLowerCase().includes(query) ||
          item.deletedByName?.toLowerCase().includes(query)
      )
    }

    // Apply type filter
    if (filterType === 'documents') {
      items = items.filter((item) => item.type === 'document')
    } else if (filterType === 'folders') {
      items = items.filter((item) => item.type === 'folder')
    }
    // filterType === 'all' keeps all items

    return items
  }, [allTrashItems, searchQuery, filterType])

  // Pagination logic
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE)
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredItems, currentPage])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterType])

  // Item counts for filter badges
  const itemCounts = useMemo(() => {
    return {
      all: trashedFolders.length + trashedDocuments.length,
      folders: trashedFolders.length,
      documents: trashedDocuments.length,
    }
  }, [trashedFolders, trashedDocuments])

  // Open modal
  const openModal = (type: ModalType, item?: TrashItem | null) => {
    setModal({ type, item })
    setConfirmInput('')
  }

  // Close modal
  const closeModal = () => {
    setModal({ type: null })
    setConfirmInput('')
  }

  // Restore an item (folder or document)
  const handleRestore = async (item: TrashItem) => {
    setIsRestoring(item.id)
    try {
      if (item.type === 'folder') {
        await folderService.restoreFolder(item.id)
        setTrashedFolders((prev) => prev.filter((f) => f.id !== item.id))
      } else {
        await restoreDocument(item.id)
        setTrashedDocuments((prev) => prev.filter((d) => d.id !== item.id))
      }
      toast.success(`"${item.name}" has been restored successfully`)
      setSelectedIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(item.id)
        return newSet
      })
      closeModal()
    } catch (error: any) {
      console.error('Failed to restore item:', error)
      const message = error?.response?.data?.error || 'Failed to restore item'
      toast.error(message)
    } finally {
      setIsRestoring(null)
    }
  }

  // Permanently delete an item (folder or document)
  const handlePermanentDelete = async (item: TrashItem) => {
    setIsDeleting(item.id)
    try {
      if (item.type === 'folder') {
        await folderService.permanentlyDeleteFolder(item.id)
        setTrashedFolders((prev) => prev.filter((f) => f.id !== item.id))
      } else {
        await permanentlyDeleteDocument(item.id)
        setTrashedDocuments((prev) => prev.filter((d) => d.id !== item.id))
      }
      toast.success(`"${item.name}" has been permanently deleted`)
      setSelectedIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(item.id)
        return newSet
      })
      closeModal()
    } catch (error) {
      console.error('Failed to permanently delete item:', error)
      toast.error('Failed to permanently delete item')
    } finally {
      setIsDeleting(null)
    }
  }

  // Empty trash (both folders and documents)
  const handleEmptyTrash = async () => {
    setIsEmptyingTrash(true)
    try {
      // Empty both folder and document trash
      const [folderResult, documentResult] = await Promise.all([
        folderService.emptyTrash(),
        emptyDocumentTrash(),
      ])
      const totalDeleted = (folderResult.deleted_count || 0) + (documentResult.deleted_count || 0)
      toast.success(`Trash emptied: ${totalDeleted} item(s) permanently deleted`)
      setTrashedFolders([])
      setTrashedDocuments([])
      setSelectedIds(new Set())
      closeModal()
    } catch (error) {
      console.error('Failed to empty trash:', error)
      toast.error('Failed to empty trash')
    } finally {
      setIsEmptyingTrash(false)
    }
  }

  // Bulk restore
  const handleBulkRestore = async () => {
    const selectedItems = allTrashItems.filter((item) => selectedIds.has(item.id))
    let restored = 0
    let failed = 0

    for (const item of selectedItems) {
      try {
        if (item.type === 'folder') {
          await folderService.restoreFolder(item.id)
        } else {
          await restoreDocument(item.id)
        }
        restored++
      } catch {
        failed++
      }
    }

    if (restored > 0) {
      toast.success(`${restored} item(s) restored successfully`)
      fetchTrashedItems()
    }
    if (failed > 0) {
      toast.error(`Failed to restore ${failed} item(s)`)
    }
    setSelectedIds(new Set())
  }

  // Toggle selection
  const toggleSelection = (folderId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(folderId)) {
        newSet.delete(folderId)
      } else {
        newSet.add(folderId)
      }
      return newSet
    })
  }

  // Select all on current page
  const toggleSelectAll = () => {
    const currentPageIds = paginatedItems.map((f) => f.id)
    const allSelected = currentPageIds.every((id) => selectedIds.has(id))

    if (allSelected) {
      setSelectedIds((prev) => {
        const newSet = new Set(prev)
        currentPageIds.forEach((id) => newSet.delete(id))
        return newSet
      })
    } else {
      setSelectedIds((prev) => {
        const newSet = new Set(prev)
        currentPageIds.forEach((id) => newSet.add(id))
        return newSet
      })
    }
  }

  // Format date
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Unknown'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Format file size
  const formatSize = (bytes: number | undefined) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // Calculate days until permanent deletion
  const getDaysRemaining = (deletedAt: string | null | undefined) => {
    if (!deletedAt) return TRASH_RETENTION_DAYS
    const deleted = new Date(deletedAt)
    const expiryDate = new Date(deleted.getTime() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000)
    const now = new Date()
    const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    return Math.max(0, daysRemaining)
  }

  // Check if all items on current page are selected
  const allCurrentPageSelected =
    paginatedItems.length > 0 && paginatedItems.every((f) => selectedIds.has(f.id))

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <DashboardHeader user={user} notifications={[]} onLogout={handleLogout} />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <DashboardSidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto p-6">
            {/* Warning Info Box - Moved to Top */}
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-medium mb-1">Trash Retention Policy</p>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-700 dark:text-amber-300 text-xs">
                    <li>
                      Items in trash are automatically deleted after {TRASH_RETENTION_DAYS} days
                    </li>
                    <li>Restoring a folder also restores all its contents</li>
                    <li>Permanently deleted items cannot be recovered</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Page Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-xl">
                    <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Trash</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {itemCounts.all} item{itemCounts.all !== 1 ? 's' : ''} in trash
                    </p>
                  </div>
                </div>

                {trashedFolders.length > 0 && (
                  <button
                    onClick={() => openModal('empty')}
                    disabled={isEmptyingTrash}
                    className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Empty Trash
                  </button>
                )}
              </div>
            </div>

            {/* Filters Bar */}
            <div className="mb-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search trash..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filter Tabs and View Toggle */}
              <div className="flex items-center gap-3">
                {/* Filter Tabs */}
                <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  {(['all', 'folders', 'documents'] as FilterType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={cn(
                        'px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5',
                        filterType === type
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      )}
                    >
                      {type === 'all' && 'All'}
                      {type === 'folders' && (
                        <>
                          <Folder className="w-3.5 h-3.5" />
                          Folders
                        </>
                      )}
                      {type === 'documents' && (
                        <>
                          <FileText className="w-3.5 h-3.5" />
                          Documents
                        </>
                      )}
                      <span
                        className={cn(
                          'ml-1 px-1.5 py-0.5 text-xs rounded-full',
                          filterType === type
                            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        )}
                      >
                        {itemCounts[type]}
                      </span>
                    </button>
                  ))}
                </div>

                {/* View Toggle */}
                <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn(
                      'p-1.5 rounded-md transition-colors',
                      viewMode === 'list'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
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
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    )}
                    title="Grid view"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  {selectedIds.size} item(s) selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBulkRestore}
                    className="px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors flex items-center gap-1"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restore Selected
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
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <Trash2 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                  {searchQuery ? 'No items found' : 'Trash is empty'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery
                    ? 'Try adjusting your search query'
                    : 'Deleted folders and documents will appear here'}
                </p>
              </div>
            ) : viewMode === 'list' ? (
              /* List View */
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="col-span-1 flex items-center">
                    <input
                      type="checkbox"
                      checked={allCurrentPageSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-3">Name</div>
                  <div className="col-span-2">Deleted By</div>
                  <div className="col-span-2">Deleted</div>
                  <div className="col-span-1">Size</div>
                  <div className="col-span-1">Expires</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedItems.map((item) => {
                    const daysRemaining = getDaysRemaining(item.deletedAt)
                    const isSelected = selectedIds.has(item.id)
                    const isProcessing = isRestoring === item.id || isDeleting === item.id
                    const itemSize = item.type === 'folder' ? item.totalSize : item.fileSize

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
                          isSelected && 'bg-blue-50 dark:bg-blue-900/10'
                        )}
                      >
                        {/* Checkbox */}
                        <div className="col-span-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelection(item.id)}
                            disabled={isProcessing}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                          />
                        </div>

                        {/* Name */}
                        <div className="col-span-3 flex items-center gap-3">
                          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            {item.type === 'folder' ? (
                              <Folder className="w-5 h-5 text-amber-500" />
                            ) : (
                              <FileText className="w-5 h-5 text-blue-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                              {item.name}
                            </p>
                            <p
                              className="text-xs text-gray-500 dark:text-gray-400 truncate"
                              title={item.path}
                            >
                              {item.path || '/'}
                            </p>
                          </div>
                        </div>

                        {/* Deleted By */}
                        <div className="col-span-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                              <User className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                                {item.deletedByName || 'Unknown'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Deleted Date */}
                        <div className="col-span-2 flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                          <Clock className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{formatDate(item.deletedAt)}</span>
                        </div>

                        {/* Size */}
                        <div className="col-span-1 text-sm text-gray-600 dark:text-gray-400">
                          {formatSize(itemSize)}
                        </div>

                        {/* Days Remaining */}
                        <div className="col-span-1">
                          <span
                            className={cn(
                              'text-xs font-medium px-2 py-1 rounded-full',
                              daysRemaining <= 7
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                : daysRemaining <= 14
                                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            )}
                          >
                            {daysRemaining}d
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="col-span-2 flex items-center justify-end gap-1">
                          <button
                            onClick={() => openModal('preview', item)}
                            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openModal('restore', item)}
                            disabled={isProcessing}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
                            title="Restore"
                          >
                            {isRestoring === item.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RotateCcw className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => openModal('delete', item)}
                            disabled={isProcessing}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete permanently"
                          >
                            {isDeleting === item.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                      {Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)} of{' '}
                      {filteredItems.length} items
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((page) => {
                          // Show first, last, current, and adjacent pages
                          return (
                            page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1
                          )
                        })
                        .map((page, index, arr) => (
                          <span key={page}>
                            {index > 0 && arr[index - 1] !== page - 1 && (
                              <span className="px-2 text-gray-400">...</span>
                            )}
                            <button
                              onClick={() => setCurrentPage(page)}
                              className={cn(
                                'w-8 h-8 text-sm font-medium rounded-lg transition-colors',
                                currentPage === page
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                              )}
                            >
                              {page}
                            </button>
                          </span>
                        ))}
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Grid View */
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {paginatedItems.map((item) => {
                  const daysRemaining = getDaysRemaining(item.deletedAt)
                  const isSelected = selectedIds.has(item.id)
                  const isProcessing = isRestoring === item.id || isDeleting === item.id
                  const itemSize = item.type === 'folder' ? item.totalSize : item.fileSize

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'p-4 bg-white dark:bg-gray-800 rounded-xl border transition-all',
                        isSelected
                          ? 'border-blue-500 ring-2 ring-blue-500/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      )}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelection(item.id)}
                          disabled={isProcessing}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                        />
                        <span
                          className={cn(
                            'text-xs font-medium px-2 py-0.5 rounded-full',
                            daysRemaining <= 7
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          )}
                        >
                          {daysRemaining}d left
                        </span>
                      </div>

                      <div className="flex flex-col items-center text-center mb-4">
                        <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl mb-3">
                          {item.type === 'folder' ? (
                            <Folder className="w-8 h-8 text-amber-500" />
                          ) : (
                            <FileText className="w-8 h-8 text-blue-500" />
                          )}
                        </div>
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate w-full">
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatSize(itemSize)}
                        </p>
                      </div>

                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        <p className="truncate">Deleted by: {item.deletedByName || 'Unknown'}</p>
                        <p>{formatDate(item.deletedAt)}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openModal('restore', item)}
                          disabled={isProcessing}
                          className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => openModal('delete', item)}
                          disabled={isProcessing}
                          className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Grid View Pagination */}
            {viewMode === 'grid' && totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Restore Confirmation Modal */}
      {modal.type === 'restore' && modal.item && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <RotateCcw className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Restore Item?
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              Are you sure you want to restore <strong>"{modal.item.name}"</strong>?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
              {modal.item.type === 'folder'
                ? 'The folder and all its contents will be restored to its original location.'
                : 'The document will be restored to its original folder.'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeModal}
                disabled={isRestoring === modal.item.id}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRestore(modal.item!)}
                disabled={isRestoring === modal.item.id}
                className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isRestoring === modal.item.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Restore
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {modal.type === 'delete' && modal.item && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Permanently Delete?
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to permanently delete <strong>"{modal.item.name}"</strong>?
            </p>
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">
                  This action cannot be undone. The{' '}
                  {modal.item.type === 'folder' ? 'folder and all its contents' : 'document'} will
                  be permanently deleted.
                </p>
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type <span className="font-mono text-red-600">{modal.item.name}</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={`Enter ${modal.item.type === 'folder' ? 'folder' : 'document'} name`}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeModal}
                disabled={isDeleting === modal.item.id}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePermanentDelete(modal.item!)}
                disabled={isDeleting === modal.item.id || confirmInput !== modal.item.name}
                className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting === modal.item.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty Trash Confirmation Modal */}
      {modal.type === 'empty' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Empty Trash?
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This will permanently delete all{' '}
              <strong>{trashedFolders.length + trashedDocuments.length}</strong> item(s) in the
              trash ({trashedFolders.length} folder(s), {trashedDocuments.length} document(s)).
            </p>
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">
                  This action cannot be undone. All items will be permanently deleted.
                </p>
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type <span className="font-mono text-red-600">EMPTY TRASH</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="Enter EMPTY TRASH"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeModal}
                disabled={isEmptyingTrash}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEmptyTrash}
                disabled={isEmptyingTrash || confirmInput !== 'EMPTY TRASH'}
                className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEmptyingTrash ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Emptying...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Empty Trash
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {modal.type === 'preview' && modal.item && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <Folder className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {modal.item.name}
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Original Location</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                    {modal.item.path || '/'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Size</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {formatSize(modal.item.totalSize)}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Deleted By</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {modal.item.deletedByName || 'Unknown'}
                  </p>
                  {modal.item.deletedByEmail && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {modal.item.deletedByEmail}
                    </p>
                  )}
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Deleted At</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {formatDate(modal.item.deletedAt)}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Contents</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {modal.item.childrenCount || 0} subfolder
                    {modal.item.childrenCount !== 1 ? 's' : ''}, {modal.item.documentCount || 0}{' '}
                    document{modal.item.documentCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Auto-Delete In</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {getDaysRemaining(modal.item.deletedAt)} days
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    closeModal()
                    openModal('restore', modal.item)
                  }}
                  className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restore
                </button>
                <button
                  onClick={() => {
                    closeModal()
                    openModal('delete', modal.item)
                  }}
                  className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TrashPage
