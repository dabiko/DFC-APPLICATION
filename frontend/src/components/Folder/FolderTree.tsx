/**
 * FolderTree Component
 * Enhanced folder tree with virtualization for handling 10,000+ folders
 */

import { FC, useState, useMemo, useCallback, useEffect } from 'react'
import { List, useListRef } from 'react-window'
import { FolderTreeItem } from './FolderTreeItem'
import { FolderContextMenu } from './FolderContextMenu'
import { Spinner } from '@components/Feedback/Spinner'
import {
  buildFolderTree,
  flattenFolderTree,
  filterFoldersBySearch,
  sortFolders,
} from '@/utils/folderTree'
import type { Folder, FolderTreeProps, FolderTreeNode, FolderOperation } from '@/types/folder'

interface FolderTreeState {
  expandedIds: Set<string>
  selectedFolderId: string | null
  contextMenuFolder: Folder | null
  contextMenuPosition: { x: number; y: number } | null
}

export const FolderTree: FC<FolderTreeProps> = ({
  folders,
  selectedFolderId = null,
  onFolderSelect,
  onFolderExpand,
  onFolderOperation,
  enableDragDrop: _enableDragDrop = false,
  enableContextMenu = true,
  enableVirtualization = true,
  maxHeight = 600,
  searchQuery = '',
  showIcons = true,
  showLockIndicator = true,
  showDocumentCount = false,
  showConfidentiality = false,
}) => {
  // State
  const [state, setState] = useState<FolderTreeState>({
    expandedIds: new Set<string>(),
    selectedFolderId: selectedFolderId,
    contextMenuFolder: null,
    contextMenuPosition: null,
  })

  const [isLoading] = useState(false)
  const listRef = useListRef()

  // Update selected folder when prop changes

  useEffect(() => {
    setState((prev) => ({ ...prev, selectedFolderId }))
  }, [selectedFolderId])

  // Build folder tree structure
  const folderTree = useMemo(() => {
    let tree = buildFolderTree(folders)

    // Apply search filter
    if (searchQuery.trim()) {
      tree = filterFoldersBySearch(tree, searchQuery)
    }

    // Sort folders
    tree = sortFolders(tree, 'name', 'asc')

    return tree
  }, [folders, searchQuery])

  // Auto-expand all folders when searching

  useEffect(() => {
    if (searchQuery.trim()) {
      const allIds = new Set<string>()
      const collectIds = (folderList: Folder[]) => {
        folderList.forEach((f) => {
          allIds.add(f.id)
          if (f.children) collectIds(f.children)
        })
      }
      collectIds(folderTree)
      setState((prev) => ({ ...prev, expandedIds: allIds }))
    }
  }, [searchQuery, folderTree])

  // Flatten tree for virtualization
  const flattenedTree = useMemo(() => {
    return flattenFolderTree(folderTree, state.expandedIds)
  }, [folderTree, state.expandedIds])

  // Handle folder selection
  const handleFolderSelect = useCallback(
    (folder: Folder) => {
      setState((prev) => ({ ...prev, selectedFolderId: folder.id }))
      onFolderSelect?.(folder)
    },
    [onFolderSelect]
  )

  // Handle folder expand/collapse
  const handleToggleExpand = useCallback(
    (folderId: string) => {
      setState((prev) => {
        const newExpandedIds = new Set(prev.expandedIds)
        if (newExpandedIds.has(folderId)) {
          newExpandedIds.delete(folderId)
        } else {
          newExpandedIds.add(folderId)
        }
        return { ...prev, expandedIds: newExpandedIds }
      })

      // Notify parent
      onFolderExpand?.(folderId, !state.expandedIds.has(folderId))
    },
    [state.expandedIds, onFolderExpand]
  )

  // Handle context menu
  const handleContextMenu = useCallback(
    (event: React.MouseEvent, folder: Folder) => {
      if (!enableContextMenu) return

      event.preventDefault()
      setState((prev) => ({
        ...prev,
        contextMenuFolder: folder,
        contextMenuPosition: { x: event.clientX, y: event.clientY },
      }))
    },
    [enableContextMenu]
  )

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setState((prev) => ({
      ...prev,
      contextMenuFolder: null,
      contextMenuPosition: null,
    }))
  }, [])

  // Handle context menu action
  const handleContextMenuAction = useCallback(
    (operation: FolderOperation) => {
      if (state.contextMenuFolder) {
        onFolderOperation?.(operation, state.contextMenuFolder)
      }
      closeContextMenu()
    },
    [state.contextMenuFolder, onFolderOperation, closeContextMenu]
  )

  // Row component for virtualization
  interface RowComponentProps {
    index: number
    style: React.CSSProperties
    ariaAttributes: {
      'aria-posinset': number
      'aria-setsize': number
      role: 'listitem'
    }
    flattenedTree: FolderTreeNode[]
    selectedFolderId: string | null
    onSelect: (folder: Folder) => void
    onToggleExpand: (folderId: string) => void
    onContextMenu: (event: React.MouseEvent, folder: Folder) => void
    showIcons: boolean
    showLockIndicator: boolean
    showDocumentCount: boolean
    showConfidentiality: boolean
  }

  const RowComponent = useCallback(
    ({
      index,
      style,
      flattenedTree,
      selectedFolderId,
      onSelect,
      onToggleExpand,
      onContextMenu,
      showIcons,
      showLockIndicator,
      showDocumentCount,
      showConfidentiality,
    }: RowComponentProps) => {
      const node = flattenedTree[index]

      return (
        <div style={style}>
          <FolderTreeItem
            folder={node.folder}
            depth={node.depth}
            isExpanded={node.isExpanded}
            isSelected={selectedFolderId === node.folder.id}
            hasChildren={node.hasChildren}
            onSelect={onSelect}
            onToggleExpand={onToggleExpand}
            onContextMenu={onContextMenu}
            showIcons={showIcons}
            showLockIndicator={showLockIndicator}
            showDocumentCount={showDocumentCount}
            showConfidentiality={showConfidentiality}
          />
        </div>
      )
    },
    []
  )

  // Row props for virtualization
  const rowProps = useMemo(
    () => ({
      flattenedTree,
      selectedFolderId: state.selectedFolderId,
      onSelect: handleFolderSelect,
      onToggleExpand: handleToggleExpand,
      onContextMenu: handleContextMenu,
      showIcons,
      showLockIndicator,
      showDocumentCount,
      showConfidentiality,
    }),
    [
      flattenedTree,
      state.selectedFolderId,
      handleFolderSelect,
      handleToggleExpand,
      handleContextMenu,
      showIcons,
      showLockIndicator,
      showDocumentCount,
      showConfidentiality,
    ]
  )

  // Close context menu on outside click
  useEffect(() => {
    if (state.contextMenuPosition) {
      const handleClick = () => closeContextMenu()
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [state.contextMenuPosition, closeContextMenu])

  // Keyboard navigation

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!state.selectedFolderId) return

      const selectedIndex = flattenedTree.findIndex(
        (node) => node.folder.id === state.selectedFolderId
      )
      if (selectedIndex === -1) return

      let newIndex = selectedIndex

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          newIndex = Math.min(selectedIndex + 1, flattenedTree.length - 1)
          break
        case 'ArrowUp':
          event.preventDefault()
          newIndex = Math.max(selectedIndex - 1, 0)
          break
        case 'ArrowRight': {
          event.preventDefault()
          const currentNode = flattenedTree[selectedIndex]
          if (currentNode.hasChildren && !currentNode.isExpanded) {
            handleToggleExpand(currentNode.folder.id)
          }
          break
        }
        case 'ArrowLeft': {
          event.preventDefault()
          const currentNode = flattenedTree[selectedIndex]
          if (currentNode.isExpanded) {
            handleToggleExpand(currentNode.folder.id)
          }
          break
        }
      }

      if (newIndex !== selectedIndex) {
        const newNode = flattenedTree[newIndex]
        handleFolderSelect(newNode.folder)

        // Scroll to selected item
        if (listRef.current) {
          listRef.current.scrollToRow({ index: newIndex, align: 'smart' })
        }
      }
    },
    [state.selectedFolderId, flattenedTree, handleToggleExpand, handleFolderSelect]
  )

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  // Empty state
  if (flattenedTree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <div className="text-gray-400 dark:text-gray-600 mb-2">
          <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {searchQuery ? 'No folders match your search' : 'No folders yet'}
        </p>
        {!searchQuery && (
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Create your first folder to get started
          </p>
        )}
      </div>
    )
  }

  // Render with virtualization
  if (enableVirtualization && flattenedTree.length > 50) {
    return (
      <div
        className="folder-tree-container"
        onKeyDown={handleKeyDown}
        role="tree"
        aria-label="Folder tree"
        tabIndex={0}
      >
        <List
          listRef={listRef}
          rowComponent={RowComponent}
          rowProps={rowProps}
          rowCount={flattenedTree.length}
          rowHeight={36}
          style={{ height: maxHeight, width: '100%' }}
          overscanCount={5}
        />

        {/* Context Menu */}
        {enableContextMenu && state.contextMenuPosition && state.contextMenuFolder && (
          <FolderContextMenu
            folder={state.contextMenuFolder}
            position={state.contextMenuPosition}
            onAction={handleContextMenuAction}
            onClose={closeContextMenu}
          />
        )}
      </div>
    )
  }

  // Render without virtualization (for small lists)
  return (
    <div
      className="folder-tree-container"
      onKeyDown={handleKeyDown}
      role="tree"
      aria-label="Folder tree"
      tabIndex={0}
      style={{ maxHeight: `${maxHeight}px`, overflowY: 'auto' }}
    >
      {flattenedTree.map((node, index) => (
        <FolderTreeItem
          key={`${node.folder.id}-${index}`}
          folder={node.folder}
          depth={node.depth}
          isExpanded={node.isExpanded}
          isSelected={state.selectedFolderId === node.folder.id}
          hasChildren={node.hasChildren}
          onSelect={handleFolderSelect}
          onToggleExpand={handleToggleExpand}
          onContextMenu={handleContextMenu}
          showIcons={showIcons}
          showLockIndicator={showLockIndicator}
          showDocumentCount={showDocumentCount}
          showConfidentiality={showConfidentiality}
        />
      ))}

      {/* Context Menu */}
      {enableContextMenu && state.contextMenuPosition && state.contextMenuFolder && (
        <FolderContextMenu
          folder={state.contextMenuFolder}
          position={state.contextMenuPosition}
          onAction={handleContextMenuAction}
          onClose={closeContextMenu}
        />
      )}
    </div>
  )
}
