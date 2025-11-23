/**
 * FolderSidebar Component
 * Industry-standard folder tree sidebar for document navigation
 * Integrates FolderTree with operations, search, and smart folders
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderPlus, RefreshCw, Search, X } from 'lucide-react'
import { FolderTree } from './FolderTree'
import { SmartFolderItem } from './SmartFolderItem'
import { CreateFolderModal } from './CreateFolderModal'
import { RenameFolderModal } from './RenameFolderModal'
import { MoveFolderModal } from './MoveFolderModal'
import { DeleteFolderModal } from './DeleteFolderModal'
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

  // Get smart folders
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

  // Handle folder selection
  const handleFolderSelect = useCallback(
    (folder: Folder) => {
      dispatch(selectFolder(folder.id))
      // Navigate to documents view for this folder
      navigate(`/documents?folder=${folder.id}`)
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

  // Collapsed view - icon only
  if (isCollapsed) {
    return (
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
    )
  }

  // Expanded view - full interface
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header with Actions */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          My Folders
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Search folders"
          >
            <Search className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={openCreateModal}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="New folder"
          >
            <FolderPlus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Refresh"
            disabled={loading}
          >
            <RefreshCw
              className={cn('w-4 h-4 text-gray-600 dark:text-gray-400', loading && 'animate-spin')}
            />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800">
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

      {/* Error Message */}
      {error && (
        <div className="mx-3 mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Folder Tree */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Smart Folders Section */}
        <div className="px-3 py-2">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-3 mb-2">
            SMART FOLDERS
          </div>
          <div className="space-y-1">
            {smartFolders.map((smartFolder) => (
              <SmartFolderItem
                key={smartFolder.id}
                folder={smartFolder}
                isSelected={selectedFolder?.id === smartFolder.id}
                onClick={handleFolderSelect}
              />
            ))}
          </div>
        </div>

        {/* User Folders Section */}
        <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-800">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-3 mb-2">
            MY FOLDERS
          </div>
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
          />
        </div>
      </div>

      {/* Modals */}
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
    </div>
  )
}
