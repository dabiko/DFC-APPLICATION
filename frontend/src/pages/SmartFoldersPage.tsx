/**
 * SmartFoldersPage
 * Main page for managing user-created smart folders
 * Displays all smart folders in a grid/list view with create, edit, and delete actions
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  RefreshCw,
  FolderSearch,
  Grid,
  List,
  Search,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { ThreePanelLayout } from '@/components/Layout/ThreePanelLayout'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { SmartFolderCard } from '@/components/SmartFolder/SmartFolderCard'
import { SmartFolderModal, DeleteSmartFolderModal } from '@/components/SmartFolder'
import { authService } from '@/services/auth.service'
import { getSmartFolders, updateSmartFolder, type SmartFolder } from '@/services/smartFolderService'
import { cn } from '@/utils/cn'
import { toast } from '@/utils/toast'

type ViewMode = 'grid' | 'list'

export function SmartFoldersPage() {
  const navigate = useNavigate()

  // State
  const [smartFolders, setSmartFolders] = useState<SmartFolder[]>([])
  const [filteredFolders, setFilteredFolders] = useState<SmartFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<SmartFolder | null>(null)

  // Get current user
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
    await authService.logout()
    navigate('/login')
  }

  // Fetch smart folders
  const fetchSmartFolders = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await getSmartFolders()
      setSmartFolders(response.results || [])
      setFilteredFolders(response.results || [])
    } catch (err) {
      console.error('Failed to fetch smart folders:', err)
      setError('Failed to load smart folders. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchSmartFolders()
  }, [fetchSmartFolders])

  // Filter folders based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFolders(smartFolders)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = smartFolders.filter(
      (folder) =>
        folder.name.toLowerCase().includes(query) ||
        folder.description?.toLowerCase().includes(query)
    )
    setFilteredFolders(filtered)
  }, [searchQuery, smartFolders])

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchSmartFolders()
    setRefreshing(false)
    toast.success('Smart folders refreshed')
  }

  // Handle create
  const handleCreate = () => {
    setSelectedFolder(null)
    setShowCreateModal(true)
  }

  // Handle create success
  const handleCreateSuccess = () => {
    setShowCreateModal(false)
    fetchSmartFolders()
  }

  // Handle edit
  const handleEdit = (folder: SmartFolder) => {
    setSelectedFolder(folder)
    setShowEditModal(true)
  }

  // Handle edit success
  const handleEditSuccess = () => {
    setShowEditModal(false)
    setSelectedFolder(null)
    fetchSmartFolders()
  }

  // Handle delete
  const handleDelete = (folder: SmartFolder) => {
    setSelectedFolder(folder)
    setShowDeleteModal(true)
  }

  // Handle delete success
  const handleDeleteSuccess = () => {
    setShowDeleteModal(false)
    setSelectedFolder(null)
    fetchSmartFolders()
  }

  // Handle toggle visibility
  const handleToggleVisibility = async (folder: SmartFolder) => {
    try {
      await updateSmartFolder(folder.id, {
        is_visible: !folder.is_visible,
      })
      toast.success(
        folder.is_visible
          ? 'Smart folder hidden from sidebar'
          : 'Smart folder now visible in sidebar'
      )
      fetchSmartFolders()
    } catch (err) {
      console.error('Failed to toggle visibility:', err)
      toast.error('Failed to update visibility')
    }
  }

  // Render empty state
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
        <FolderSearch className="w-8 h-8 text-blue-600 dark:text-blue-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        No smart folders yet
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-6">
        Smart folders automatically organize documents based on criteria you define. Create your
        first smart folder to get started.
      </p>
      <button
        onClick={handleCreate}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Create Smart Folder
      </button>
    </div>
  )

  // Render error state
  const renderErrorState = () => (
    <div className="flex flex-col items-center justify-center py-20">
      <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Failed to load smart folders
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-6">{error}</p>
      <button
        onClick={fetchSmartFolders}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>
    </div>
  )

  // Render loading state
  if (loading) {
    return (
      <ThreePanelLayout
        header={<DashboardHeader user={user} notifications={[]} onLogout={handleLogout} />}
        leftPanel={<DashboardSidebar />}
        leftPanelWidth="auto"
        collapsibleLeft={false}
        centerPanel={
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        }
        collapsibleRight={false}
      />
    )
  }

  return (
    <>
      <ThreePanelLayout
        header={<DashboardHeader user={user} notifications={[]} onLogout={handleLogout} />}
        leftPanel={<DashboardSidebar />}
        leftPanelWidth="auto"
        collapsibleLeft={false}
        centerPanel={
          <>
            {/* Page Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <div className="flex items-center justify-between">
                {/* Title and description */}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Smart Folders
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Organize documents automatically with saved search criteria
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search smart folders..."
                      className="pl-9 pr-8 py-2 text-sm w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                      >
                        <X className="w-3 h-3 text-gray-500" />
                      </button>
                    )}
                  </div>

                  {/* View mode toggle */}
                  <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={cn(
                        'p-2 transition-colors',
                        viewMode === 'grid'
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                      )}
                      title="Grid view"
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={cn(
                        'p-2 transition-colors',
                        viewMode === 'list'
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                      )}
                      title="List view"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Refresh button */}
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                    title="Refresh"
                  >
                    <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
                  </button>

                  {/* Create button */}
                  <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create Smart Folder
                  </button>
                </div>
              </div>

              {/* Stats */}
              {smartFolders.length > 0 && (
                <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Total: </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {smartFolders.length} {smartFolders.length === 1 ? 'folder' : 'folders'}
                    </span>
                  </div>
                  {searchQuery && (
                    <div className="text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Showing: </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {filteredFolders.length}{' '}
                        {filteredFolders.length === 1 ? 'result' : 'results'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {error ? (
                renderErrorState()
              ) : smartFolders.length === 0 ? (
                renderEmptyState()
              ) : filteredFolders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No results found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
                    No smart folders match "{searchQuery}". Try a different search term.
                  </p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filteredFolders.map((folder) => (
                    <SmartFolderCard
                      key={folder.id}
                      folder={folder}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onToggleVisibility={handleToggleVisibility}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredFolders.map((folder) => (
                    <SmartFolderCard
                      key={folder.id}
                      folder={folder}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onToggleVisibility={handleToggleVisibility}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        }
        collapsibleRight={false}
      />

      {/* Modals */}
      <SmartFolderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      <SmartFolderModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedFolder(null)
        }}
        onSuccess={handleEditSuccess}
        smartFolder={selectedFolder}
      />

      <DeleteSmartFolderModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setSelectedFolder(null)
        }}
        onDeleted={handleDeleteSuccess}
        smartFolder={selectedFolder}
      />
    </>
  )
}
