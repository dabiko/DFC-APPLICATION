/**
 * usePermissionSync Hook
 *
 * React hook for real-time permission synchronization.
 * Connects to the permission sync service and provides reactive state.
 *
 * Usage:
 * ```tsx
 * // In a component
 * const { connectionStatus, subscribe } = usePermissionSync()
 *
 * useEffect(() => {
 *   const unsubscribe = subscribe('document', documentId, (event) => {
 *     console.log('Permission changed:', event)
 *     // Refresh permissions
 *   })
 *   return unsubscribe
 * }, [documentId, subscribe])
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import permissionSyncService, {
  type ConnectionStatus,
  type PermissionEvent,
  type PermissionEventCallback,
} from '@/services/permissionSyncService'

export interface UsePermissionSyncOptions {
  /** Auto-connect when authenticated */
  autoConnect?: boolean
  /** Enable debug logging */
  debug?: boolean
}

export interface UsePermissionSyncReturn {
  /** Current connection status */
  connectionStatus: ConnectionStatus
  /** Whether connected to the sync service */
  isConnected: boolean
  /** Subscribe to permission changes for a specific resource */
  subscribe: (
    resourceType: 'document' | 'folder',
    resourceId: string,
    callback: PermissionEventCallback
  ) => () => void
  /** Subscribe to all permission changes */
  subscribeAll: (callback: PermissionEventCallback) => () => void
  /** Manually connect to the sync service */
  connect: () => void
  /** Disconnect from the sync service */
  disconnect: () => void
  /** Request a permission refresh from the server */
  requestRefresh: (resourceType?: 'document' | 'folder', resourceId?: string) => void
}

export function usePermissionSync(options: UsePermissionSyncOptions = {}): UsePermissionSyncReturn {
  const { autoConnect = true } = options
  const { isAuthenticated, user, getAccessToken } = useAuth()
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const isConnectedRef = useRef(false)

  // Subscribe to status changes
  useEffect(() => {
    const unsubscribe = permissionSyncService.onStatusChange((status) => {
      setConnectionStatus(status)
      isConnectedRef.current = status === 'connected'
    })
    return unsubscribe
  }, [])

  // Auto-connect when authenticated
  useEffect(() => {
    if (autoConnect && isAuthenticated && user?.id) {
      const token = getAccessToken?.() || localStorage.getItem('access_token') || ''
      if (token && !isConnectedRef.current) {
        permissionSyncService.connect(user.id, token)
      }
    }

    return () => {
      // Don't disconnect on unmount - keep connection alive
      // Service is singleton and should persist across component mounts
    }
  }, [autoConnect, isAuthenticated, user?.id, getAccessToken])

  // Disconnect when user logs out
  useEffect(() => {
    if (!isAuthenticated && isConnectedRef.current) {
      permissionSyncService.disconnect()
    }
  }, [isAuthenticated])

  const connect = useCallback(() => {
    if (user?.id) {
      const token = getAccessToken?.() || localStorage.getItem('access_token') || ''
      permissionSyncService.connect(user.id, token)
    }
  }, [user?.id, getAccessToken])

  const disconnect = useCallback(() => {
    permissionSyncService.disconnect()
  }, [])

  const subscribe = useCallback(
    (
      resourceType: 'document' | 'folder',
      resourceId: string,
      callback: PermissionEventCallback
    ) => {
      return permissionSyncService.subscribe(resourceType, resourceId, callback)
    },
    []
  )

  const subscribeAll = useCallback((callback: PermissionEventCallback) => {
    return permissionSyncService.subscribeAll(callback)
  }, [])

  const requestRefresh = useCallback(
    (resourceType?: 'document' | 'folder', resourceId?: string) => {
      permissionSyncService.requestRefresh(resourceType, resourceId)
    },
    []
  )

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    subscribe,
    subscribeAll,
    connect,
    disconnect,
    requestRefresh,
  }
}

/**
 * Hook to subscribe to permission changes for a specific document
 */
export function useDocumentPermissionSync(
  documentId: string | undefined,
  onPermissionChange?: PermissionEventCallback
): {
  connectionStatus: ConnectionStatus
  lastEvent: PermissionEvent | null
} {
  const { connectionStatus, subscribe } = usePermissionSync()
  const [lastEvent, setLastEvent] = useState<PermissionEvent | null>(null)

  useEffect(() => {
    if (!documentId) return

    const handleEvent = (event: PermissionEvent) => {
      setLastEvent(event)
      onPermissionChange?.(event)
    }

    const unsubscribe = subscribe('document', documentId, handleEvent)
    return unsubscribe
  }, [documentId, subscribe, onPermissionChange])

  return { connectionStatus, lastEvent }
}

/**
 * Hook to subscribe to permission changes for a specific folder
 */
export function useFolderPermissionSync(
  folderId: string | undefined,
  onPermissionChange?: PermissionEventCallback
): {
  connectionStatus: ConnectionStatus
  lastEvent: PermissionEvent | null
} {
  const { connectionStatus, subscribe } = usePermissionSync()
  const [lastEvent, setLastEvent] = useState<PermissionEvent | null>(null)

  useEffect(() => {
    if (!folderId) return

    const handleEvent = (event: PermissionEvent) => {
      setLastEvent(event)
      onPermissionChange?.(event)
    }

    const unsubscribe = subscribe('folder', folderId, handleEvent)
    return unsubscribe
  }, [folderId, subscribe, onPermissionChange])

  return { connectionStatus, lastEvent }
}

/**
 * Hook to subscribe to all permission changes (for admin dashboards)
 */
export function useAllPermissionSync(onPermissionChange?: PermissionEventCallback): {
  connectionStatus: ConnectionStatus
  events: PermissionEvent[]
} {
  const { connectionStatus, subscribeAll } = usePermissionSync()
  const [events, setEvents] = useState<PermissionEvent[]>([])

  useEffect(() => {
    const handleEvent = (event: PermissionEvent) => {
      setEvents((prev) => [event, ...prev].slice(0, 100)) // Keep last 100 events
      onPermissionChange?.(event)
    }

    const unsubscribe = subscribeAll(handleEvent)
    return unsubscribe
  }, [subscribeAll, onPermissionChange])

  return { connectionStatus, events }
}

export default usePermissionSync
