/**
 * Pinned Items Service
 *
 * API service for the Quick Access feature.
 * Allows users to pin documents, folders, and shared items for quick access.
 */

import apiClient from './apiClient'

// ============================================================================
// TYPES
// ============================================================================

export type PinnedItemType = 'DOCUMENT' | 'FOLDER' | 'SHARED_DOCUMENT' | 'SHARED_FOLDER'

export interface PinnedItemDetails {
  type: 'document' | 'folder' | 'shared'
  // Document details
  title?: string
  file_name?: string
  file_type?: string
  file_size?: number
  confidentiality_level?: string
  document_type?: string
  folder_id?: string | null
  folder_name?: string | null
  // Folder details
  name?: string
  path?: string
  parent_id?: string | null
  document_count?: number
  // Shared item details
  shared_item_id?: string
}

export interface PinnedItem {
  id: string
  item_type: PinnedItemType
  display_order: number
  custom_label: string
  display_name: string
  item_id: string
  item_details: PinnedItemDetails | null
  is_accessible: boolean
  pinned_at: string
  updated_at: string
}

export interface PinnedItemsListResponse {
  count: number
  max_items: number
  can_pin_more: boolean
  results: PinnedItem[]
}

export interface PinItemRequest {
  item_type: PinnedItemType
  document_id?: string
  folder_id?: string
  shared_item_id?: string
  custom_label?: string
}

export interface PinItemResponse {
  success: boolean
  message: string
  pin: PinnedItem
}

export interface UnpinResponse {
  success: boolean
  message: string
  unpinned_id: string
}

export interface ReorderResponse {
  success: boolean
  message: string
  updated_count: number
}

export interface PinStatusResponse {
  is_pinned: boolean
  pin_id: string | null
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get all pinned items for the current user
 */
export async function getPinnedItems(): Promise<PinnedItemsListResponse> {
  const response = await apiClient.get<PinnedItemsListResponse>('/documents/pinned/')
  return response.data
}

/**
 * Pin a document
 */
export async function pinDocument(
  documentId: string,
  customLabel?: string
): Promise<PinItemResponse> {
  const response = await apiClient.post<PinItemResponse>('/documents/pinned/create/', {
    item_type: 'DOCUMENT',
    document_id: documentId,
    custom_label: customLabel || '',
  })
  return response.data
}

/**
 * Pin a folder
 */
export async function pinFolder(folderId: string, customLabel?: string): Promise<PinItemResponse> {
  const response = await apiClient.post<PinItemResponse>('/documents/pinned/create/', {
    item_type: 'FOLDER',
    folder_id: folderId,
    custom_label: customLabel || '',
  })
  return response.data
}

/**
 * Pin a shared item
 */
export async function pinSharedItem(
  sharedItemId: string,
  itemType: 'SHARED_DOCUMENT' | 'SHARED_FOLDER',
  customLabel?: string
): Promise<PinItemResponse> {
  const response = await apiClient.post<PinItemResponse>('/documents/pinned/create/', {
    item_type: itemType,
    shared_item_id: sharedItemId,
    custom_label: customLabel || '',
  })
  return response.data
}

/**
 * Remove a pin
 */
export async function unpinItem(pinId: string): Promise<UnpinResponse> {
  const response = await apiClient.delete<UnpinResponse>(`/documents/pinned/${pinId}/`)
  return response.data
}

/**
 * Reorder pinned items
 */
export async function reorderPinnedItems(orderedIds: string[]): Promise<ReorderResponse> {
  const response = await apiClient.post<ReorderResponse>('/documents/pinned/reorder/', {
    ordered_ids: orderedIds,
  })
  return response.data
}

/**
 * Update a pinned item (custom label)
 */
export async function updatePinnedItem(
  pinId: string,
  customLabel: string
): Promise<PinItemResponse> {
  const response = await apiClient.patch<PinItemResponse>(`/documents/pinned/${pinId}/update/`, {
    custom_label: customLabel,
  })
  return response.data
}

/**
 * Check if an item is pinned
 */
export async function checkPinStatus(
  itemType: PinnedItemType,
  itemId: string
): Promise<PinStatusResponse> {
  const response = await apiClient.get<PinStatusResponse>('/documents/pinned/check/', {
    params: {
      item_type: itemType,
      item_id: itemId,
    },
  })
  return response.data
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get icon name for pinned item type
 */
export function getPinnedItemIcon(itemType: PinnedItemType): string {
  const icons: Record<PinnedItemType, string> = {
    DOCUMENT: 'file-text',
    FOLDER: 'folder',
    SHARED_DOCUMENT: 'file-share',
    SHARED_FOLDER: 'folder-share',
  }
  return icons[itemType] || 'file'
}

/**
 * Get color classes for pinned item type
 */
export function getPinnedItemColor(itemType: PinnedItemType): {
  bg: string
  text: string
  border: string
} {
  const colors: Record<PinnedItemType, { bg: string; text: string; border: string }> = {
    DOCUMENT: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-300 dark:border-blue-600',
    },
    FOLDER: {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-300 dark:border-amber-600',
    },
    SHARED_DOCUMENT: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-600 dark:text-green-400',
      border: 'border-green-300 dark:border-green-600',
    },
    SHARED_FOLDER: {
      bg: 'bg-teal-100 dark:bg-teal-900/30',
      text: 'text-teal-600 dark:text-teal-400',
      border: 'border-teal-300 dark:border-teal-600',
    },
  }
  return colors[itemType] || colors.DOCUMENT
}

/**
 * Get label for pinned item type
 */
export function getPinnedItemTypeLabel(itemType: PinnedItemType): string {
  const labels: Record<PinnedItemType, string> = {
    DOCUMENT: 'Document',
    FOLDER: 'Folder',
    SHARED_DOCUMENT: 'Shared Document',
    SHARED_FOLDER: 'Shared Folder',
  }
  return labels[itemType] || itemType
}

/**
 * Check if item type is shared
 */
export function isSharedItem(itemType: PinnedItemType): boolean {
  return itemType === 'SHARED_DOCUMENT' || itemType === 'SHARED_FOLDER'
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export default {
  getPinnedItems,
  pinDocument,
  pinFolder,
  pinSharedItem,
  unpinItem,
  reorderPinnedItems,
  updatePinnedItem,
  checkPinStatus,
  getPinnedItemIcon,
  getPinnedItemColor,
  getPinnedItemTypeLabel,
  isSharedItem,
  formatFileSize,
}
