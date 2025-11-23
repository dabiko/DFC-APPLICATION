/**
 * Smart Folders Utility
 * Defines virtual folders for common document collections
 * These appear at the top of the folder tree before user folders
 */

import type { Folder } from '@/types/folder'

/**
 * Smart folder types
 */
export type SmartFolderType = 'my_documents' | 'shared_with_me' | 'recent' | 'favorites' | 'trash'

/**
 * Smart folder metadata
 */
export interface SmartFolderInfo {
  id: string
  type: SmartFolderType
  name: string
  icon: string
  description: string
  path: string
  isVirtual: boolean
  color?: string
}

/**
 * All available smart folders
 */
export const SMART_FOLDERS: Record<SmartFolderType, SmartFolderInfo> = {
  my_documents: {
    id: 'smart:my_documents',
    type: 'my_documents',
    name: 'My Documents',
    icon: 'folder-user',
    description: 'Documents you created',
    path: '/smart/my_documents',
    isVirtual: true,
    color: 'blue',
  },
  shared_with_me: {
    id: 'smart:shared_with_me',
    type: 'shared_with_me',
    name: 'Shared with Me',
    icon: 'folder-share',
    description: 'Documents shared by others',
    path: '/smart/shared_with_me',
    isVirtual: true,
    color: 'green',
  },
  recent: {
    id: 'smart:recent',
    type: 'recent',
    name: 'Recent Files',
    icon: 'clock',
    description: 'Recently accessed documents',
    path: '/smart/recent',
    isVirtual: true,
    color: 'purple',
  },
  favorites: {
    id: 'smart:favorites',
    type: 'favorites',
    name: 'Favorites',
    icon: 'star',
    description: 'Your favorite documents',
    path: '/smart/favorites',
    isVirtual: true,
    color: 'yellow',
  },
  trash: {
    id: 'smart:trash',
    type: 'trash',
    name: 'Trash',
    icon: 'trash',
    description: 'Deleted documents (30 days)',
    path: '/smart/trash',
    isVirtual: true,
    color: 'red',
  },
}

/**
 * Convert smart folder info to Folder interface
 */
export function smartFolderToFolder(smartFolder: SmartFolderInfo): Folder {
  return {
    id: smartFolder.id,
    name: smartFolder.name,
    parentId: null,
    path: smartFolder.path,
    level: 0,
    isLocked: true, // Smart folders can't be modified
    confidentiality: 'internal',
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    modifiedBy: 'system',
    modifiedAt: new Date().toISOString(),
    childrenCount: 0,
    documentCount: 0,
    hasChildren: false,
    permissions: {
      canView: true,
      canEdit: false,
      canDelete: false,
      canShare: false,
      canManage: false,
    },
  }
}

/**
 * Get all smart folders as Folder objects
 */
export function getSmartFolders(): Folder[] {
  return Object.values(SMART_FOLDERS).map(smartFolderToFolder)
}

/**
 * Check if a folder ID is a smart folder
 */
export function isSmartFolder(folderId: string): boolean {
  return folderId.startsWith('smart:')
}

/**
 * Get smart folder type from ID
 */
export function getSmartFolderType(folderId: string): SmartFolderType | null {
  if (!isSmartFolder(folderId)) return null
  const type = folderId.replace('smart:', '') as SmartFolderType
  return type in SMART_FOLDERS ? type : null
}

/**
 * Get smart folder info from ID
 */
export function getSmartFolderInfo(folderId: string): SmartFolderInfo | null {
  const type = getSmartFolderType(folderId)
  return type ? SMART_FOLDERS[type] : null
}

/**
 * Build combined folder tree with smart folders at the top
 */
export function buildFolderTreeWithSmart(userFolders: Folder[]): Folder[] {
  const smartFolders = getSmartFolders()
  return [...smartFolders, ...userFolders]
}
