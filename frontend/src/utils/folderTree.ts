/**
 * Folder Tree Utilities
 * Helper functions for folder tree operations
 */

import type { Folder, FolderTreeNode } from '@/types/folder'

/**
 * Build tree structure from flat folder list
 */
export const buildFolderTree = (folders: Folder[]): Folder[] => {
  // Handle undefined or null folders array
  if (!folders || !Array.isArray(folders)) {
    return []
  }

  const folderMap = new Map<string, Folder>()
  const rootFolders: Folder[] = []

  // Create a map of all folders
  folders.forEach((folder) => {
    folderMap.set(folder.id, { ...folder, children: [] })
  })

  // Build tree structure
  folders.forEach((folder) => {
    const currentFolder = folderMap.get(folder.id)
    if (!currentFolder) return

    if (folder.parentId === null) {
      // Root level folder
      rootFolders.push(currentFolder)
    } else {
      // Child folder
      const parent = folderMap.get(folder.parentId)
      if (parent) {
        parent.children = parent.children || []
        parent.children.push(currentFolder)
      } else {
        // Parent not found, treat as root
        rootFolders.push(currentFolder)
      }
    }
  })

  return rootFolders
}

/**
 * Flatten tree structure for virtualization
 * Only includes visible (expanded) folders
 */
export const flattenFolderTree = (
  folders: Folder[],
  expandedIds: Set<string>,
  depth: number = 0,
  parentPath: string[] = []
): FolderTreeNode[] => {
  if (!folders || !Array.isArray(folders)) {
    return []
  }

  const result: FolderTreeNode[] = []

  folders.forEach((folder) => {
    const isExpanded = expandedIds.has(folder.id)
    const hasChildren = (folder.children && folder.children.length > 0) || folder.hasChildren

    // Add current folder
    result.push({
      folder,
      depth,
      isExpanded,
      hasChildren,
      isVisible: true,
    })

    // Recursively add children if expanded
    if (isExpanded && folder.children && folder.children.length > 0) {
      const childNodes = flattenFolderTree(folder.children, expandedIds, depth + 1, [
        ...parentPath,
        folder.id,
      ])
      result.push(...childNodes)
    }
  })

  return result
}

/**
 * Find folder by ID in tree
 */
export const findFolderById = (folders: Folder[], folderId: string): Folder | null => {
  if (!folders || !Array.isArray(folders)) {
    return null
  }

  for (const folder of folders) {
    if (folder.id === folderId) {
      return folder
    }

    if (folder.children && folder.children.length > 0) {
      const found = findFolderById(folder.children, folderId)
      if (found) return found
    }
  }

  return null
}

/**
 * Get folder path (array of folder names from root to current)
 */
export const getFolderPath = (folders: Folder[], folderId: string): Folder[] => {
  const path: Folder[] = []

  const findPath = (folderList: Folder[], targetId: string, currentPath: Folder[]): boolean => {
    for (const folder of folderList) {
      const newPath = [...currentPath, folder]

      if (folder.id === targetId) {
        path.push(...newPath)
        return true
      }

      if (folder.children && folder.children.length > 0) {
        if (findPath(folder.children, targetId, newPath)) {
          return true
        }
      }
    }

    return false
  }

  findPath(folders, folderId, [])
  return path
}

/**
 * Check if folder can be moved to target (prevent circular reference)
 */
export const canMoveFolder = (
  folders: Folder[],
  sourceFolderId: string,
  targetFolderId: string | null
): { canMove: boolean; reason?: string } => {
  // Can't move to itself
  if (sourceFolderId === targetFolderId) {
    return { canMove: false, reason: 'Cannot move folder into itself' }
  }

  // Allow moving to root
  if (targetFolderId === null) {
    return { canMove: true }
  }

  // Check if target is a descendant of source (would create circular reference)
  const isDescendant = (parentId: string, checkId: string): boolean => {
    const parent = findFolderById(folders, parentId)
    if (!parent || !parent.children) return false

    for (const child of parent.children) {
      if (child.id === checkId) return true
      if (child.children && child.children.length > 0) {
        if (isDescendant(child.id, checkId)) return true
      }
    }

    return false
  }

  if (isDescendant(sourceFolderId, targetFolderId)) {
    return { canMove: false, reason: 'Cannot move folder into its own subfolder' }
  }

  return { canMove: true }
}

/**
 * Filter folders by search query
 */
export const filterFoldersBySearch = (folders: Folder[], searchQuery: string): Folder[] => {
  if (!folders || !Array.isArray(folders)) {
    return []
  }

  if (!searchQuery.trim()) return folders

  const query = searchQuery.toLowerCase()
  const result: Folder[] = []

  const searchFolder = (folder: Folder): boolean => {
    const nameMatches = folder.name.toLowerCase().includes(query)
    const pathMatches = folder.path.toLowerCase().includes(query)

    let childrenMatch = false
    let filteredChildren: Folder[] = []

    if (folder.children) {
      filteredChildren = folder.children.filter(searchFolder)
      childrenMatch = filteredChildren.length > 0
    }

    if (nameMatches || pathMatches || childrenMatch) {
      result.push({
        ...folder,
        children: filteredChildren,
        isExpanded: childrenMatch, // Auto-expand if children match
      })
      return true
    }

    return false
  }

  folders.forEach(searchFolder)
  return result
}

/**
 * Sort folders
 */
export const sortFolders = (
  folders: Folder[],
  sortBy: 'name' | 'createdAt' | 'modifiedAt' | 'documentCount' = 'name',
  sortOrder: 'asc' | 'desc' = 'asc'
): Folder[] => {
  if (!folders || !Array.isArray(folders)) {
    return []
  }

  const sorted = [...folders].sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
      case 'modifiedAt':
        comparison = new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime()
        break
      case 'documentCount':
        comparison = a.documentCount - b.documentCount
        break
    }

    return sortOrder === 'asc' ? comparison : -comparison
  })

  // Recursively sort children
  return sorted.map((folder) => ({
    ...folder,
    children: folder.children ? sortFolders(folder.children, sortBy, sortOrder) : [],
  }))
}

/**
 * Get all descendant IDs of a folder
 */
export const getDescendantIds = (folder: Folder): string[] => {
  const ids: string[] = []

  const collectIds = (f: Folder) => {
    ids.push(f.id)
    if (f.children) {
      f.children.forEach(collectIds)
    }
  }

  if (folder.children) {
    folder.children.forEach(collectIds)
  }

  return ids
}

/**
 * Calculate folder statistics
 */
export const calculateFolderStats = (
  folder: Folder
): { totalFolders: number; totalDocuments: number; maxDepth: number } => {
  let totalFolders = 1
  let totalDocuments = folder.documentCount
  let maxDepth = 0

  const traverse = (f: Folder, depth: number) => {
    maxDepth = Math.max(maxDepth, depth)

    if (f.children) {
      f.children.forEach((child) => {
        totalFolders++
        totalDocuments += child.documentCount
        traverse(child, depth + 1)
      })
    }
  }

  traverse(folder, 0)

  return { totalFolders, totalDocuments, maxDepth }
}

/**
 * Get parent folder ID
 */
export const getParentFolderId = (folders: Folder[], folderId: string): string | null => {
  const folder = findFolderById(folders, folderId)
  return folder?.parentId || null
}

/**
 * Expand folder and all its parents
 */
export const expandFolderAndParents = (folders: Folder[], folderId: string): Set<string> => {
  const expandedIds = new Set<string>()
  const path = getFolderPath(folders, folderId)

  path.forEach((folder) => {
    expandedIds.add(folder.id)
  })

  return expandedIds
}

/**
 * Collapse folder and all its children
 */
export const collapseFolderAndChildren = (folder: Folder): Set<string> => {
  const collapsedIds = new Set<string>()
  collapsedIds.add(folder.id)

  const collectIds = (f: Folder) => {
    if (f.children) {
      f.children.forEach((child) => {
        collapsedIds.add(child.id)
        collectIds(child)
      })
    }
  }

  collectIds(folder)
  return collapsedIds
}
