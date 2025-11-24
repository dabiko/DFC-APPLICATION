/**
 * FolderContentView Component
 * Enterprise-standard folder browsing with full file management capabilities
 */

import { FC, useEffect, useState, useCallback, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store'
import {
  fetchFolders,
  selectFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  moveFolder,
} from '@/store/slices/folderSlice'
import { Breadcrumbs } from '@components/Navigation/Breadcrumbs'
import { FileList } from '@components/FileManagement/FileList'
import { SortFilterBar } from '@components/FileManagement/SortFilterBar'
import { BulkActionToolbar } from '@components/FileManagement/BulkActionToolbar'
import { FilePreviewModal } from '@components/FileManagement/FilePreviewModal'
import { FolderContextMenu } from '@components/Folder/FolderContextMenu'
import { CreateFolderModal } from '@components/Folder/CreateFolderModal'
import { RenameFolderModal } from '@components/Folder/RenameFolderModal'
import { MoveFolderModal } from '@components/Folder/MoveFolderModal'
import { DeleteFolderModal } from '@components/Folder/DeleteFolderModal'
import { FolderPropertiesModal } from '@components/Folder/FolderPropertiesModal'
import { Spinner } from '@components/Feedback/Spinner'
import { Upload, FolderPlus } from 'lucide-react'
import type {
  FileListItem,
  ViewMode,
  SortField,
  SortOrder,
  FilterOptions,
  FolderOperation,
  FilePreview,
} from '@/types/fileManagement'
import type { Folder } from '@/types/folder'
import folderService from '@/services/folderService'

export const FolderContentView: FC = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const folderId = searchParams.get('folder')

  const allFolders = useAppSelector(selectFolders)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [filters, setFilters] = useState<FilterOptions>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isNavigating, setIsNavigating] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Modal states
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [contextMenuFolder, setContextMenuFolder] = useState<Folder | null>(null)
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(
    null
  )
  const [activeOperation, setActiveOperation] = useState<FolderOperation | null>(null)
  const [operationFolder, setOperationFolder] = useState<Folder | null>(null)
  const [previewFile, setPreviewFile] = useState<FilePreview | null>(null)

  // Fetch folders on mount
  useEffect(() => {
    const loadFolders = async () => {
      setIsLoading(true)
      try {
        await dispatch(fetchFolders({})).unwrap()
      } catch (error) {
        console.error('Failed to fetch folders:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadFolders()
  }, [dispatch])

  // Trigger loading animation when navigating between folders
  useEffect(() => {
    setIsNavigating(true)
    const timer = setTimeout(() => {
      setIsNavigating(false)
    }, 300) // 300ms loading animation for smooth UX
    return () => clearTimeout(timer)
  }, [folderId])

  // Get current folder and its items
  const currentFolder = folderId ? allFolders.find((f) => f.id === folderId) : null
  const subfolders = folderId
    ? allFolders.filter((folder) => folder.parentId === folderId)
    : allFolders.filter((folder) => !folder.parentId)

  // Map confidentiality level from backend format to display format
  const mapConfidentialityLevel = (
    level: string
  ): 'Public' | 'Internal' | 'Confidential' | 'Highly Confidential' => {
    const mapping: Record<string, 'Public' | 'Internal' | 'Confidential' | 'Highly Confidential'> =
      {
        public: 'Public',
        internal: 'Internal',
        confidential: 'Confidential',
        highly_confidential: 'Highly Confidential',
      }
    return mapping[level.toLowerCase()] || 'Internal'
  }

  // Convert folders to FileListItem format
  const fileListItems: FileListItem[] = useMemo(() => {
    return subfolders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      type: 'folder' as const,
      itemCount: (folder.childrenCount || 0) + (folder.documentCount || 0),
      hasSubfolders: (folder.childrenCount || 0) > 0,
      path: folder.path,
      createdBy: folder.createdBy,
      createdAt: folder.createdAt,
      modifiedBy: folder.modifiedBy,
      modifiedAt: folder.modifiedAt,
      confidentialityLevel: mapConfidentialityLevel(folder.confidentiality),
      permissions: {
        canView: folder.permissions.canView,
        canEdit: folder.permissions.canEdit,
        canDelete: folder.permissions.canDelete,
        canShare: folder.permissions.canManage,
        canDownload: true,
      },
      isShared: false,
      isLocked: folder.isLocked,
      hasVersions: false,
      isFavorite: false,
      tags: [],
    }))
  }, [subfolders])

  // Build breadcrumb path
  const breadcrumbItems = useMemo(() => {
    if (!currentFolder) {
      return [{ label: 'Root', onClick: () => navigate('/dashboard') }]
    }

    const items = []
    let current = currentFolder
    while (current) {
      const folderId = current.id
      items.unshift({
        label: current.name,
        onClick: () => navigate(`/dashboard?folder=${folderId}`),
      })
      current = allFolders.find((f) => f.id === current?.parentId) || null
    }
    items.unshift({ label: 'Root', onClick: () => navigate('/dashboard') })
    return items
  }, [currentFolder, allFolders, navigate])

  // Handle folder operations
  const handleFolderOperation = useCallback((operation: FolderOperation, folder: Folder) => {
    setOperationFolder(folder)
    setActiveOperation(operation)
  }, [])

  // Handle item click (single click)
  const handleItemClick = useCallback((item: FileListItem) => {
    console.log('Item clicked:', item)
  }, [])

  // Handle item double click (navigate into folder)
  const handleItemDoubleClick = useCallback(
    (item: FileListItem) => {
      if (item.type === 'folder') {
        navigate(`/dashboard?folder=${item.id}`)
      } else {
        // Open file preview for documents
        // TODO: Fetch file preview data and open modal
      }
    },
    [navigate]
  )

  // Handle selection change
  const handleSelectionChange = useCallback((newSelection: Set<string>) => {
    setSelectedIds(newSelection)
  }, [])

  // Handle context menu
  const handleContextMenu = useCallback(
    (event: React.MouseEvent, item: FileListItem) => {
      event.preventDefault()
      const folder = allFolders.find((f) => f.id === item.id)
      if (folder) {
        setContextMenuFolder(folder)
        setContextMenuPosition({ x: event.clientX, y: event.clientY })
      }
    },
    [allFolders]
  )

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenuFolder(null)
    setContextMenuPosition(null)
  }, [])

  // Handle context menu action
  const handleContextMenuAction = useCallback(
    (operation: FolderOperation) => {
      if (operation === 'create') {
        // Special handling for create - set parent and open modal
        setOperationFolder(contextMenuFolder)
        setShowCreateFolder(true)
      } else if (contextMenuFolder) {
        handleFolderOperation(operation, contextMenuFolder)
      }
      closeContextMenu()
    },
    [contextMenuFolder, handleFolderOperation, closeContextMenu]
  )

  // Close context menu on outside click
  useEffect(() => {
    if (contextMenuPosition) {
      const handleClick = () => closeContextMenu()
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [contextMenuPosition, closeContextMenu])

  // Bulk operations
  const selectedItems = useMemo(() => {
    return fileListItems.filter((item) => selectedIds.has(item.id))
  }, [fileListItems, selectedIds])

  const handleBulkMove = useCallback(() => {
    console.log('Bulk move:', Array.from(selectedIds))
    // TODO: Implement bulk move
  }, [selectedIds])

  const handleBulkCopy = useCallback(() => {
    console.log('Bulk copy:', Array.from(selectedIds))
    // TODO: Implement bulk copy
  }, [selectedIds])

  const handleBulkDelete = useCallback(() => {
    console.log('Bulk delete:', Array.from(selectedIds))
    // TODO: Implement bulk delete modal
  }, [selectedIds])

  const handleBulkDownload = useCallback(() => {
    console.log('Bulk download:', Array.from(selectedIds))
    // TODO: Implement bulk download
  }, [selectedIds])

  const handleBulkShare = useCallback(() => {
    console.log('Bulk share:', Array.from(selectedIds))
    // TODO: Implement bulk share modal
  }, [selectedIds])

  const handleBulkAddTags = useCallback(() => {
    console.log('Bulk add tags:', Array.from(selectedIds))
    // TODO: Implement bulk tag modal
  }, [selectedIds])

  const handleBulkChangeConfidentiality = useCallback(() => {
    console.log('Bulk change confidentiality:', Array.from(selectedIds))
    // TODO: Implement bulk confidentiality modal
  }, [selectedIds])

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  // Folder operations handlers
  const handleCreateFolder = useCallback(
    async (data: any) => {
      try {
        // Use operationFolder as parent if creating from context menu, otherwise use current folder
        const parentId = operationFolder?.id || folderId || null
        await dispatch(
          createFolder({
            ...data,
            parentId,
          })
        ).unwrap()
        setShowCreateFolder(false)
        setOperationFolder(null)

        // Show loading state briefly to refresh the view
        setIsNavigating(true)
        setTimeout(() => {
          setIsNavigating(false)
        }, 300)
      } catch (error) {
        console.error('Failed to create folder:', error)
      }
    },
    [dispatch, folderId, operationFolder]
  )

  const handleRenameFolder = useCallback(
    async (newName: string) => {
      if (!operationFolder) return
      try {
        await dispatch(renameFolder({ folderId: operationFolder.id, newName })).unwrap()
        setActiveOperation(null)
        setOperationFolder(null)
      } catch (error) {
        console.error('Failed to rename folder:', error)
      }
    },
    [dispatch, operationFolder]
  )

  const handleMoveFolder = useCallback(
    async (targetFolderId: string | null) => {
      if (!operationFolder) return
      try {
        await dispatch(
          moveFolder({ folderId: operationFolder.id, newParentId: targetFolderId })
        ).unwrap()
        setActiveOperation(null)
        setOperationFolder(null)
      } catch (error) {
        console.error('Failed to move folder:', error)
      }
    },
    [dispatch, operationFolder]
  )

  const handleDeleteFolder = useCallback(
    async (force: boolean) => {
      if (!operationFolder) return
      try {
        await dispatch(deleteFolder({ folderId: operationFolder.id, force })).unwrap()
        setActiveOperation(null)
        setOperationFolder(null)
      } catch (error) {
        console.error('Failed to delete folder:', error)
      }
    },
    [dispatch, operationFolder]
  )

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 relative">
      {/* Loading Overlay */}
      {(isLoading || isNavigating) && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <Spinner size="lg" />
        </div>
      )}
      {/* Header with breadcrumbs and actions */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <Breadcrumbs items={breadcrumbItems} showHomeIcon={true} maxItems={5} />

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateFolder(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <FolderPlus className="w-4 h-4" />
              New Folder
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors">
              <Upload className="w-4 h-4" />
              Upload
            </button>
          </div>
        </div>
      </div>

      {/* Sort and Filter Bar */}
      <SortFilterBar
        sortBy={sortBy}
        sortOrder={sortOrder}
        filters={filters}
        viewMode={viewMode}
        itemCount={fileListItems.length}
        selectedCount={selectedIds.size}
        onSortChange={(field, order) => {
          setSortBy(field)
          setSortOrder(order)
        }}
        onFilterChange={setFilters}
        onViewModeChange={setViewMode}
        onClearFilters={() => setFilters({})}
        showViewToggle={true}
      />

      {/* File List */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <FileList
            items={fileListItems}
            viewMode={viewMode}
            sortBy={sortBy}
            sortOrder={sortOrder}
            selectedIds={selectedIds}
            onItemClick={handleItemClick}
            onItemDoubleClick={handleItemDoubleClick}
            onSelectionChange={handleSelectionChange}
            onContextMenu={handleContextMenu}
            isLoading={false}
            emptyState={
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <FolderPlus className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No items yet
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Get started by creating a folder or uploading documents
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCreateFolder(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors border border-gray-300 dark:border-gray-600"
                >
                  <FolderPlus className="w-4 h-4" />
                  New Folder
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors">
                  <Upload className="w-4 h-4" />
                  Upload Documents
                </button>
              </div>
            </div>
            }
          />
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      <BulkActionToolbar
        selectedCount={selectedIds.size}
        selectedItems={selectedItems}
        onMove={handleBulkMove}
        onCopy={handleBulkCopy}
        onDelete={handleBulkDelete}
        onDownload={handleBulkDownload}
        onShare={handleBulkShare}
        onAddTags={handleBulkAddTags}
        onChangeConfidentiality={handleBulkChangeConfidentiality}
        onClearSelection={handleClearSelection}
      />

      {/* Context Menu */}
      {contextMenuPosition && contextMenuFolder && (
        <FolderContextMenu
          folder={contextMenuFolder}
          position={contextMenuPosition}
          onAction={handleContextMenuAction}
          onClose={closeContextMenu}
        />
      )}

      {/* Modals */}
      <CreateFolderModal
        isOpen={showCreateFolder}
        onClose={() => {
          setShowCreateFolder(false)
          setOperationFolder(null)
        }}
        onCreate={handleCreateFolder}
        parentFolder={operationFolder || currentFolder}
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

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          preview={previewFile}
          isOpen={true}
          onClose={() => setPreviewFile(null)}
          onEdit={() => {
            /* TODO */
          }}
          onDelete={() => {
            /* TODO */
          }}
          onDownload={() => {
            /* TODO */
          }}
          onShare={() => {
            /* TODO */
          }}
          onVersionChange={() => {
            /* TODO */
          }}
        />
      )}
    </div>
  )
}
