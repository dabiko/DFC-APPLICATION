/**
 * FolderSidebar Component
 * Industry-standard folder tree sidebar for document navigation
 * Integrates FolderTree with operations, search, smart folders, and user-created smart folders
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderPlus, RefreshCw, Search, X, Plus, FolderSearch } from 'lucide-react'
import { FolderTree } from './FolderTree'
import { UserSmartFolderItem } from './UserSmartFolderItem'
import { CreateFolderModal } from './CreateFolderModal'
import { RenameFolderModal } from './RenameFolderModal'
import { MoveFolderModal } from './MoveFolderModal'
import { DeleteFolderModal } from './DeleteFolderModal'
import { FolderPropertiesModal } from './FolderPropertiesModal'
import { SmartFolderModal, DeleteSmartFolderModal } from '@/components/SmartFolder'
import { useAppDispatch, useAppSelector } from '@/store'
import {
  fetchFolders,
  selectFolders,
  selectSelectedFolder,
  selectFolderLoading,
  selectFolderError,
  createFolder,
  renameFolder,
  moveFolder,
  deleteFolder,
  selectFolder,
} from '@/store/slices/folderSlice'
import { getSmartFolders, isSmartFolder } from '@/utils/smartFolders'
import { getVisibleSmartFolders, type SmartFolder } from '@/services/smartFolderService'
import type { Folder, FolderOperation, CreateFolderData } from '@/types/folder'
import { cn } from '@utils/cn'

interface FolderSidebarProps {
  isCollapsed?: boolean
  className?: string
}

export function FolderSidebar({ isCollapsed = false, className }: FolderSidebarProps) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  // Redux state
  const folders = useAppSelector(selectFolders)
  const selectedFolder = useAppSelector(selectSelectedFolder)
  const loading = useAppSelector(selectFolderLoading)
  const error = useAppSelector(selectFolderError)

  // Local state
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  // Modal states
  const [activeOperation, setActiveOperation] = useState<FolderOperation | null>(null)
  const [operationFolder, setOperationFolder] = useState<Folder | null>(null)

  // Smart folder modal states
  const [showSmartFolderModal, setShowSmartFolderModal] = useState(false)
  const [showDeleteSmartFolderModal, setShowDeleteSmartFolderModal] = useState(false)
  const [editingSmartFolder, setEditingSmartFolder] = useState<SmartFolder | null>(null)
  const [deletingSmartFolder, setDeletingSmartFolder] = useState<SmartFolder | null>(null)
  const [userSmartFolders, setUserSmartFolders] = useState<SmartFolder[]>([])
  const [userSmartFoldersLoading, setUserSmartFoldersLoading] = useState(false)
  const [selectedUserSmartFolder, setSelectedUserSmartFolder] = useState<string | null>(null)

  // Get system smart folders
  const smartFolders = useMemo(() => getSmartFolders(), [])

  // Fetch folders on mount
  useEffect(() => {
    // Only fetch if user is authenticated
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
    if (token) {
      dispatch(fetchFolders()).catch((error) => {
        console.error('Failed to fetch folders:', error)
      })
    }
  }, [dispatch])

  // Fetch user-created smart folders
  const fetchUserSmartFolders = useCallback(async () => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
    if (!token) return

    setUserSmartFoldersLoading(true)
    try {
      const folders = await getVisibleSmartFolders()
      setUserSmartFolders(folders)
    } catch (error) {
      console.error('Failed to fetch user smart folders:', error)
    } finally {
      setUserSmartFoldersLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUserSmartFolders()
  }, [fetchUserSmartFolders])

  // Handle folder selection
  const handleFolderSelect = useCallback(
    (folder: Folder) => {
      dispatch(selectFolder(folder.id))
      // Update URL with folder parameter
      navigate(`/dashboard?folder=${folder.id}`)
    },
    [dispatch, navigate]
  )

  // Handle folder operations
  const handleFolderOperation = useCallback((operation: FolderOperation, folder: Folder) => {
    setOperationFolder(folder)
    setActiveOperation(operation)
  }, [])

  // Create folder handler
  const handleCreateFolder = useCallback(
    async (data: CreateFolderData) => {
      try {
        await dispatch(createFolder(data)).unwrap()
        setActiveOperation(null)
        setOperationFolder(null)
      } catch (err) {
        console.error('Failed to create folder:', err)
      }
    },
    [dispatch]
  )

  // Rename folder handler
  const handleRenameFolder = useCallback(
    async (folderId: string, newName: string) => {
      try {
        await dispatch(renameFolder({ folderId, newName })).unwrap()
        setActiveOperation(null)
        setOperationFolder(null)
      } catch (err) {
        console.error('Failed to rename folder:', err)
      }
    },
    [dispatch]
  )

  // Move folder handler
  const handleMoveFolder = useCallback(
    async (folderId: string, newParentId: string | null) => {
      try {
        await dispatch(moveFolder({ folderId, newParentId })).unwrap()
        setActiveOperation(null)
        setOperationFolder(null)
      } catch (err) {
        console.error('Failed to move folder:', err)
      }
    },
    [dispatch]
  )

  // Delete folder handler
  const handleDeleteFolder = useCallback(
    async (folderId: string, force: boolean = false) => {
      try {
        await dispatch(deleteFolder({ folderId, force })).unwrap()
        setActiveOperation(null)
        setOperationFolder(null)
      } catch (err) {
        console.error('Failed to delete folder:', err)
      }
    },
    [dispatch]
  )

  // Refresh folders
  const handleRefresh = useCallback(() => {
    dispatch(fetchFolders())
  }, [dispatch])

  // Open create folder modal
  const openCreateModal = useCallback(() => {
    setOperationFolder(selectedFolder)
    setActiveOperation('create')
  }, [selectedFolder])

  // Handle user smart folder selection
  const handleUserSmartFolderClick = useCallback((folder: SmartFolder) => {
    setSelectedUserSmartFolder(folder.id)
  }, [])

  // Handle edit user smart folder
  const handleEditUserSmartFolder = useCallback((folder: SmartFolder) => {
    setEditingSmartFolder(folder)
    setShowSmartFolderModal(true)
  }, [])

  // Handle delete user smart folder - opens confirmation modal
  const handleDeleteUserSmartFolder = useCallback((folder: SmartFolder) => {
    setDeletingSmartFolder(folder)
    setShowDeleteSmartFolderModal(true)
  }, [])

  // Handle delete smart folder modal close
  const handleDeleteSmartFolderModalClose = useCallback(() => {
    setShowDeleteSmartFolderModal(false)
    setDeletingSmartFolder(null)
  }, [])

  // Handle smart folder deleted
  const handleSmartFolderDeleted = useCallback(() => {
    fetchUserSmartFolders()
  }, [fetchUserSmartFolders])

  // Handle smart folder modal close
  const handleSmartFolderModalClose = useCallback(() => {
    setShowSmartFolderModal(false)
    setEditingSmartFolder(null)
  }, [])

  // Handle smart folder save (create or update)
  const handleSmartFolderSave = useCallback(() => {
    // Refresh the smart folders list after create/update
    fetchUserSmartFolders()
    // Note: Modal handles its own close via onClose prop
  }, [fetchUserSmartFolders])

  // Open create smart folder modal
  const openCreateSmartFolderModal = useCallback(() => {
    setEditingSmartFolder(null)
    setShowSmartFolderModal(true)
  }, [])

  // Shared modals - rendered regardless of collapsed state
  const modals = (
    <>
      <CreateFolderModal
        isOpen={activeOperation === 'create'}
        parentFolder={operationFolder}
        onClose={() => {
          setActiveOperation(null)
          setOperationFolder(null)
        }}
        onCreate={handleCreateFolder}
      />

      <RenameFolderModal
        isOpen={activeOperation === 'rename'}
        folder={operationFolder}
        onClose={() => {
          setActiveOperation(null)
          setOperationFolder(null)
        }}
        onRename={handleRenameFolder}
      />

      <MoveFolderModal
        isOpen={activeOperation === 'move'}
        folder={operationFolder}
        folders={folders}
        onClose={() => {
          setActiveOperation(null)
          setOperationFolder(null)
        }}
        onMove={handleMoveFolder}
      />

      <DeleteFolderModal
        isOpen={activeOperation === 'delete'}
        folder={operationFolder}
        onClose={() => {
          setActiveOperation(null)
          setOperationFolder(null)
        }}
        onDelete={handleDeleteFolder}
      />

      <FolderPropertiesModal
        isOpen={activeOperation === 'properties'}
        folder={operationFolder}
        onClose={() => {
          setActiveOperation(null)
          setOperationFolder(null)
        }}
      />

      <SmartFolderModal
        isOpen={showSmartFolderModal}
        onClose={handleSmartFolderModalClose}
        onSave={handleSmartFolderSave}
        smartFolder={editingSmartFolder}
      />

      <DeleteSmartFolderModal
        isOpen={showDeleteSmartFolderModal}
        smartFolder={deletingSmartFolder}
        onClose={handleDeleteSmartFolderModalClose}
        onDeleted={handleSmartFolderDeleted}
      />
    </>
  )

  // Collapsed view - icon only
  if (isCollapsed) {
    return (
      <>
        <div className={cn('flex flex-col items-center py-4 gap-3', className)}>
          <button
            onClick={openCreateModal}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group relative"
            title="New Folder"
          >
            <FolderPlus className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              New Folder
            </div>
          </button>

          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group relative"
            title="Refresh"
          >
            <RefreshCw
              className={cn('w-5 h-5 text-gray-600 dark:text-gray-400', loading && 'animate-spin')}
            />
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              Refresh
            </div>
          </button>
        </div>
        {modals}
      </>
    )
  }

  // Expanded view - full interface
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Error Message */}
      {error && (
        <div className="mx-3 mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Folder Tree */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* User Smart Folders Section */}
        <div className="px-3 py-2">
          <div className="flex items-center justify-between px-3 mb-2">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              SMART FOLDERS
            </div>
            <button
              onClick={openCreateSmartFolderModal}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Create Smart Folder"
            >
              <Plus className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          <div className="space-y-1">
            {userSmartFoldersLoading ? (
              <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">Loading...</div>
            ) : userSmartFolders.length === 0 ? (
              <button
                onClick={openCreateSmartFolderModal}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <FolderSearch className="w-4 h-4" />
                <span>Create your first smart folder</span>
              </button>
            ) : (
              userSmartFolders.map((folder) => (
                <UserSmartFolderItem
                  key={folder.id}
                  folder={folder}
                  isSelected={selectedUserSmartFolder === folder.id}
                  onClick={handleUserSmartFolderClick}
                  onEdit={handleEditUserSmartFolder}
                  onDelete={handleDeleteUserSmartFolder}
                />
              ))
            )}
          </div>
        </div>

        {/* User Folders Section */}
        <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-800">
          {/* MY FOLDERS Header with Actions */}
          <div className="flex items-center justify-between px-3 mb-2">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">MY FOLDERS</div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Search folders"
              >
                <Search className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              </button>
              <button
                onClick={openCreateModal}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="New folder"
              >
                <FolderPlus className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              </button>
              <button
                onClick={handleRefresh}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Refresh"
                disabled={loading}
              >
                <RefreshCw
                  className={cn(
                    'w-3.5 h-3.5 text-gray-500 dark:text-gray-400',
                    loading && 'animate-spin'
                  )}
                />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          {showSearch && (
            <div className="px-3 mb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search folders..."
                  className="w-full pl-9 pr-8 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
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
            </div>
          )}

          <FolderTree
            folders={folders}
            selectedFolderId={
              selectedFolder?.id && !isSmartFolder(selectedFolder.id) ? selectedFolder.id : null
            }
            onFolderSelect={handleFolderSelect}
            onFolderOperation={handleFolderOperation}
            searchQuery={searchQuery}
            enableDragDrop={true}
            enableContextMenu={true}
            enableVirtualization={folders.length > 50}
            showDocumentCount={true}
            showLockIndicator={true}
            showConfidentiality={true}
          />
        </div>
      </div>

      {/* Modals */}
      {modals}
    </div>
  )
}
