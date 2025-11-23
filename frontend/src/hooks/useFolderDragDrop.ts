/**
 * useFolderDragDrop Hook
 * Custom hook for folder drag-and-drop functionality using @dnd-kit
 */

import { useState, useCallback } from 'react'
import { PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Folder, FolderDragData, FolderDropResult } from '@/types/folder'
import { canMoveFolder, findFolderById } from '@/utils/folderTree'

export interface UseFolderDragDropOptions {
  folders: Folder[]
  onFolderMove?: (folderId: string, newParentId: string | null) => void
  onFolderReorder?: (folderId: string, newIndex: number) => void
}

export interface UseFolderDragDropReturn {
  // Drag state
  isDragging: boolean
  draggedFolder: Folder | null
  dropTargetFolder: Folder | null
  canDrop: boolean
  dropMessage: string | null

  // Drag handlers
  handleDragStart: (event: DragStartEvent) => void
  handleDragOver: (event: DragOverEvent) => void
  handleDragEnd: (event: DragEndEvent) => void
  handleDragCancel: () => void

  // Sensors for accessibility
  sensors: ReturnType<typeof useSensors>

  // Helper functions
  getDragData: (folder: Folder) => FolderDragData
  canDropFolder: (sourceFolderId: string, targetFolderId: string | null) => FolderDropResult
}

export const useFolderDragDrop = ({
  folders,
  onFolderMove,
  onFolderReorder,
}: UseFolderDragDropOptions): UseFolderDragDropReturn => {
  // State
  const [isDragging, setIsDragging] = useState(false)
  const [draggedFolder, setDraggedFolder] = useState<Folder | null>(null)
  const [dropTargetFolder, setDropTargetFolder] = useState<Folder | null>(null)
  const [canDrop, setCanDrop] = useState(false)
  const [dropMessage, setDropMessage] = useState<string | null>(null)

  // Setup sensors for drag interactions
  // PointerSensor: Mouse and touch drag
  // KeyboardSensor: Keyboard navigation for accessibility
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag (prevents accidental drags)
      },
    }),
    useSensor(KeyboardSensor, {
      // Keyboard shortcuts for drag operations
      // Space: Pick up / Drop
      // Arrow keys: Move
      // Escape: Cancel
    })
  )

  // Get drag data for a folder
  const getDragData = useCallback((folder: Folder): FolderDragData => {
    return {
      folderId: folder.id,
      folderName: folder.name,
      folderPath: folder.path,
      sourceParentId: folder.parentId,
    }
  }, [])

  // Check if folder can be dropped
  const canDropFolder = useCallback(
    (sourceFolderId: string, targetFolderId: string | null): FolderDropResult => {
      // Find folders
      const sourceFolder = findFolderById(folders, sourceFolderId)
      const targetFolder = targetFolderId ? findFolderById(folders, targetFolderId) : null

      if (!sourceFolder) {
        return {
          targetFolderId: targetFolderId || '',
          targetFolderPath: targetFolder?.path || '/',
          canDrop: false,
          reason: 'Source folder not found',
        }
      }

      // Check permissions
      if (!sourceFolder.permissions.canEdit) {
        return {
          targetFolderId: targetFolderId || '',
          targetFolderPath: targetFolder?.path || '/',
          canDrop: false,
          reason: 'You do not have permission to move this folder',
        }
      }

      if (sourceFolder.isLocked) {
        return {
          targetFolderId: targetFolderId || '',
          targetFolderPath: targetFolder?.path || '/',
          canDrop: false,
          reason: 'Cannot move a locked folder',
        }
      }

      // Check if target allows children
      if (targetFolder && !targetFolder.permissions.canManage) {
        return {
          targetFolderId: targetFolderId || '',
          targetFolderPath: targetFolder.path,
          canDrop: false,
          reason: 'You do not have permission to add folders here',
        }
      }

      // Prevent circular references
      const moveCheck = canMoveFolder(folders, sourceFolderId, targetFolderId)
      if (!moveCheck.canMove) {
        return {
          targetFolderId: targetFolderId || '',
          targetFolderPath: targetFolder?.path || '/',
          canDrop: false,
          reason: moveCheck.reason || 'Cannot move folder here',
        }
      }

      // Check if already in same location
      if (sourceFolder.parentId === targetFolderId) {
        return {
          targetFolderId: targetFolderId || '',
          targetFolderPath: targetFolder?.path || '/',
          canDrop: false,
          reason: 'Folder is already in this location',
        }
      }

      return {
        targetFolderId: targetFolderId || '',
        targetFolderPath: targetFolder?.path || '/',
        canDrop: true,
      }
    },
    [folders]
  )

  // Handle drag start
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const folderId = event.active.id as string
      const folder = findFolderById(folders, folderId)

      if (folder) {
        setIsDragging(true)
        setDraggedFolder(folder)
        console.log('Drag started:', folder.name)
      }
    },
    [folders]
  )

  // Handle drag over (when hovering over potential drop targets)
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const overId = event.over?.id as string | null
      const activeId = event.active.id as string

      if (!overId) {
        setDropTargetFolder(null)
        setCanDrop(false)
        setDropMessage(null)
        return
      }

      const targetFolder = findFolderById(folders, overId)
      setDropTargetFolder(targetFolder)

      // Check if drop is allowed
      const dropResult = canDropFolder(activeId, overId)
      setCanDrop(dropResult.canDrop)
      setDropMessage(dropResult.reason || null)

      if (dropResult.canDrop) {
        console.log('Can drop on:', targetFolder?.name || 'Root')
      } else {
        console.log('Cannot drop:', dropResult.reason)
      }
    },
    [folders, canDropFolder]
  )

  // Handle drag end (drop)
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      const sourceFolderId = active.id as string
      const targetFolderId = (over?.id as string) || null

      setIsDragging(false)
      setDraggedFolder(null)
      setDropTargetFolder(null)
      setCanDrop(false)
      setDropMessage(null)

      // No drop target or dropped on itself
      if (!over || sourceFolderId === targetFolderId) {
        console.log('Drop cancelled: no valid target')
        return
      }

      // Validate drop
      const dropResult = canDropFolder(sourceFolderId, targetFolderId)
      if (!dropResult.canDrop) {
        console.log('Drop prevented:', dropResult.reason)
        return
      }

      // Execute move
      console.log(`Moving folder ${sourceFolderId} to ${targetFolderId || 'root'}`)
      onFolderMove?.(sourceFolderId, targetFolderId)
    },
    [canDropFolder, onFolderMove]
  )

  // Handle drag cancel (Escape key)
  const handleDragCancel = useCallback(() => {
    setIsDragging(false)
    setDraggedFolder(null)
    setDropTargetFolder(null)
    setCanDrop(false)
    setDropMessage(null)
    console.log('Drag cancelled')
  }, [])

  return {
    isDragging,
    draggedFolder,
    dropTargetFolder,
    canDrop,
    dropMessage,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    sensors,
    getDragData,
    canDropFolder,
  }
}

// Export sortable folder hook for use in FolderTreeItem
export const useSortableFolder = (folderId: string) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
    useSortable({ id: folderId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return {
    attributes,
    listeners,
    setNodeRef,
    style,
    isDragging,
    isOver,
  }
}
