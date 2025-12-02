/**
 * Permission Sync Service
 *
 * Real-time permission synchronization using WebSocket.
 * Listens for permission changes and notifies subscribers.
 *
 * Events:
 * - permission_granted: A permission was granted to a user
 * - permission_revoked: A permission was revoked from a user
 * - permission_updated: A permission level was changed
 * - role_assigned: A role was assigned to a user
 * - role_removed: A role was removed from a user
 * - folder_permission_changed: Folder permissions were modified
 * - document_permission_changed: Document permissions were modified
 */

export type PermissionEventType =
  | 'permission_granted'
  | 'permission_revoked'
  | 'permission_updated'
  | 'role_assigned'
  | 'role_removed'
  | 'folder_permission_changed'
  | 'document_permission_changed'
  | 'user_permissions_refreshed'

export interface PermissionEvent {
  type: PermissionEventType
  timestamp: string
  userId?: string
  resourceType?: 'document' | 'folder' | 'global'
  resourceId?: string
  permissionLevel?: string
  grantedBy?: string
  details?: Record<string, unknown>
}

export type PermissionEventCallback = (event: PermissionEvent) => void

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error'

export interface PermissionSyncConfig {
  /** WebSocket URL (defaults to /ws/permissions/) */
  wsUrl?: string
  /** Auto-reconnect on disconnect */
  autoReconnect?: boolean
  /** Reconnect interval in ms */
  reconnectInterval?: number
  /** Maximum reconnect attempts */
  maxReconnectAttempts?: number
  /** Enable debug logging */
  debug?: boolean
}

const DEFAULT_CONFIG: PermissionSyncConfig = {
  wsUrl: '/ws/permissions/',
  autoReconnect: true,
  reconnectInterval: 3000,
  maxReconnectAttempts: 10,
  debug: false,
}

class PermissionSyncService {
  private ws: WebSocket | null = null
  private config: PermissionSyncConfig
  private subscribers: Map<string, Set<PermissionEventCallback>> = new Map()
  private globalSubscribers: Set<PermissionEventCallback> = new Set()
  private connectionStatus: ConnectionStatus = 'disconnected'
  private reconnectAttempts = 0
  private reconnectTimer: NodeJS.Timeout | null = null
  private statusSubscribers: Set<(status: ConnectionStatus) => void> = new Set()
  private userId: string | null = null
  private authToken: string | null = null

  constructor(config: PermissionSyncConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Initialize the WebSocket connection
   *
   * SECURITY: Token is sent via message after connection opens, NOT in URL.
   * URL query parameters are logged by servers and visible in browser history.
   */
  connect(userId: string, authToken: string): void {
    this.userId = userId
    this.authToken = authToken

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.log('Already connected')
      return
    }

    this.setStatus('connecting')

    try {
      // Build WebSocket URL - SECURITY: No token in URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = window.location.host
      // Token is sent via authenticate message in handleOpen(), not in URL
      const wsUrl = `${protocol}//${host}${this.config.wsUrl}`

      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = this.handleOpen.bind(this)
      this.ws.onmessage = this.handleMessage.bind(this)
      this.ws.onclose = this.handleClose.bind(this)
      this.ws.onerror = this.handleError.bind(this)
    } catch (error) {
      this.log('Failed to create WebSocket:', error)
      this.setStatus('error')
      this.scheduleReconnect()
    }
  }

  /**
   * Disconnect the WebSocket
   *
   * SECURITY: Clears stored credentials on disconnect
   */
  disconnect(): void {
    this.clearReconnectTimer()
    this.reconnectAttempts = 0

    if (this.ws) {
      this.ws.onclose = null // Prevent auto-reconnect
      this.ws.close()
      this.ws = null
    }

    // SECURITY: Clear stored credentials
    this.userId = null
    this.authToken = null

    this.setStatus('disconnected')
    this.log('Disconnected')
  }

  /**
   * Subscribe to permission events for a specific resource
   */
  subscribe(
    resourceType: 'document' | 'folder',
    resourceId: string,
    callback: PermissionEventCallback
  ): () => void {
    const key = `${resourceType}:${resourceId}`

    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set())
    }

    this.subscribers.get(key)!.add(callback)

    // Send subscription message to server
    this.sendMessage({
      action: 'subscribe',
      resourceType,
      resourceId,
    })

    // Return unsubscribe function
    return () => {
      this.subscribers.get(key)?.delete(callback)
      if (this.subscribers.get(key)?.size === 0) {
        this.subscribers.delete(key)
        this.sendMessage({
          action: 'unsubscribe',
          resourceType,
          resourceId,
        })
      }
    }
  }

  /**
   * Subscribe to all permission events (global)
   */
  subscribeAll(callback: PermissionEventCallback): () => void {
    this.globalSubscribers.add(callback)

    // Send global subscription message
    this.sendMessage({
      action: 'subscribe_all',
    })

    return () => {
      this.globalSubscribers.delete(callback)
      if (this.globalSubscribers.size === 0) {
        this.sendMessage({
          action: 'unsubscribe_all',
        })
      }
    }
  }

  /**
   * Subscribe to connection status changes
   */
  onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.statusSubscribers.add(callback)
    // Immediately call with current status
    callback(this.connectionStatus)
    return () => {
      this.statusSubscribers.delete(callback)
    }
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.connectionStatus
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionStatus === 'connected'
  }

  /**
   * Request permission refresh from server
   */
  requestRefresh(resourceType?: 'document' | 'folder', resourceId?: string): void {
    this.sendMessage({
      action: 'refresh',
      resourceType,
      resourceId,
    })
  }

  // Private methods

  private handleOpen(): void {
    this.log('Connected')
    this.setStatus('connected')
    this.reconnectAttempts = 0

    // SECURITY: Authenticate via message (not URL) - token is not logged
    this.sendAuthMessage({
      action: 'authenticate',
      userId: this.userId,
      token: this.authToken,
    })

    // Re-subscribe to all resources
    this.subscribers.forEach((_, key) => {
      const [resourceType, resourceId] = key.split(':')
      this.sendMessage({
        action: 'subscribe',
        resourceType,
        resourceId,
      })
    })

    if (this.globalSubscribers.size > 0) {
      this.sendMessage({
        action: 'subscribe_all',
      })
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data) as PermissionEvent

      this.log('Received:', data)

      // Notify global subscribers
      this.globalSubscribers.forEach((callback) => {
        try {
          callback(data)
        } catch (error) {
          console.error('Error in global permission event callback:', error)
        }
      })

      // Notify resource-specific subscribers
      if (data.resourceType && data.resourceId) {
        const key = `${data.resourceType}:${data.resourceId}`
        this.subscribers.get(key)?.forEach((callback) => {
          try {
            callback(data)
          } catch (error) {
            console.error('Error in permission event callback:', error)
          }
        })
      }
    } catch (error) {
      this.log('Failed to parse message:', error)
    }
  }

  private handleClose(event: CloseEvent): void {
    this.log('Connection closed:', event.code, event.reason)
    this.setStatus('disconnected')
    this.ws = null

    if (this.config.autoReconnect && event.code !== 1000) {
      this.scheduleReconnect()
    }
  }

  private handleError(event: Event): void {
    this.log('WebSocket error:', event)
    this.setStatus('error')
  }

  private sendMessage(message: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      this.log('Cannot send message: not connected')
    }
  }

  /**
   * Send authentication message without logging sensitive data
   * SECURITY: This method does not log the token to prevent credential exposure in logs
   */
  private sendAuthMessage(message: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
      // SECURITY: Log action without exposing token
      this.log('Sent authenticate message for user:', message.userId)
    } else {
      this.log('Cannot send auth message: not connected')
    }
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status
      this.statusSubscribers.forEach((callback) => callback(status))
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= (this.config.maxReconnectAttempts || 10)) {
      this.log('Max reconnect attempts reached')
      return
    }

    this.clearReconnectTimer()

    const interval = this.config.reconnectInterval || 3000
    const backoff = Math.min(interval * Math.pow(1.5, this.reconnectAttempts), 30000)

    this.log(`Reconnecting in ${backoff}ms (attempt ${this.reconnectAttempts + 1})`)

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++
      if (this.userId && this.authToken) {
        this.connect(this.userId, this.authToken)
      }
    }, backoff)
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[PermissionSync]', ...args)
    }
  }
}

// Singleton instance
export const permissionSyncService = new PermissionSyncService({
  debug: process.env.NODE_ENV === 'development',
})

export default permissionSyncService
