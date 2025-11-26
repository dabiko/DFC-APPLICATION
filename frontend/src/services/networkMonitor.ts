/**
 * Network Monitor Service
 *
 * Monitors network connectivity and connection quality.
 * Provides real-time status updates for the application.
 *
 * Features:
 * - Online/Offline detection using browser APIs
 * - Slow connection detection using Network Information API
 * - Periodic health checks to backend API
 * - Exponential backoff retry mechanism
 * - Event-based notifications
 */

export type NetworkStatus = 'online' | 'offline' | 'slow'

export interface NetworkState {
  status: NetworkStatus
  isOnline: boolean
  isSlow: boolean
  lastChecked: Date | null
  retryCount: number
  retryIn: number // seconds until next retry
  effectiveType?: string // 4g, 3g, 2g, slow-2g
  downlink?: number // Mbps
  rtt?: number // Round-trip time in ms
}

export type NetworkEventType = 'statusChange' | 'retryCountdown' | 'healthCheckComplete'

export interface NetworkEvent {
  type: NetworkEventType
  state: NetworkState
}

export type NetworkEventListener = (event: NetworkEvent) => void

// Connection quality thresholds
const SLOW_CONNECTION_RTT_THRESHOLD = 500 // ms - consider slow if RTT > 500ms
const SLOW_CONNECTION_DOWNLINK_THRESHOLD = 0.5 // Mbps - consider slow if < 0.5 Mbps
const SLOW_EFFECTIVE_TYPES = ['slow-2g', '2g'] // These are considered slow

// Retry configuration
const INITIAL_RETRY_DELAY = 5 // seconds
const MAX_RETRY_DELAY = 60 // seconds
const RETRY_MULTIPLIER = 1.5

// Health check configuration
const HEALTH_CHECK_INTERVAL = 30000 // 30 seconds when online
const HEALTH_CHECK_TIMEOUT = 10000 // 10 seconds timeout for health check

class NetworkMonitor {
  private state: NetworkState
  private listeners: Set<NetworkEventListener> = new Set()
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private countdownTimer: ReturnType<typeof setInterval> | null = null
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null
  private isInitialized = false

  constructor() {
    this.state = {
      status: 'online',
      isOnline: true,
      isSlow: false,
      lastChecked: null,
      retryCount: 0,
      retryIn: 0,
    }
  }

  /**
   * Initialize the network monitor
   * Sets up event listeners and starts monitoring
   */
  public init(): void {
    if (this.isInitialized) return
    this.isInitialized = true

    // Set initial state from browser
    this.state.isOnline = navigator.onLine
    this.state.status = navigator.onLine ? 'online' : 'offline'

    // Listen to browser online/offline events
    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)

    // Listen to connection changes (if supported)
    if ('connection' in navigator) {
      const connection = (navigator as NavigatorWithConnection).connection
      if (connection) {
        connection.addEventListener('change', this.handleConnectionChange)
        this.updateConnectionInfo(connection)
      }
    }

    // Start periodic health checks
    this.startHealthChecks()

    // Initial health check
    this.performHealthCheck()
  }

  /**
   * Cleanup and stop monitoring
   */
  public destroy(): void {
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)

    if ('connection' in navigator) {
      const connection = (navigator as NavigatorWithConnection).connection
      if (connection) {
        connection.removeEventListener('change', this.handleConnectionChange)
      }
    }

    this.stopRetryTimer()
    this.stopHealthChecks()
    this.listeners.clear()
    this.isInitialized = false
  }

  /**
   * Subscribe to network status changes
   */
  public subscribe(listener: NetworkEventListener): () => void {
    this.listeners.add(listener)
    // Immediately notify with current state
    listener({ type: 'statusChange', state: { ...this.state } })
    return () => this.listeners.delete(listener)
  }

  /**
   * Get current network state
   */
  public getState(): NetworkState {
    return { ...this.state }
  }

  /**
   * Manually trigger a retry/reconnection attempt
   */
  public retry(): void {
    this.stopRetryTimer()
    this.state.retryIn = 0
    this.performHealthCheck()
  }

  // Private methods

  private handleOnline = (): void => {
    console.log('[NetworkMonitor] Browser reports online')
    this.stopRetryTimer()
    this.state.retryCount = 0
    this.performHealthCheck()
  }

  private handleOffline = (): void => {
    console.log('[NetworkMonitor] Browser reports offline')
    this.updateStatus('offline')
    this.startRetryTimer()
  }

  private handleConnectionChange = (): void => {
    if ('connection' in navigator) {
      const connection = (navigator as NavigatorWithConnection).connection
      if (connection) {
        this.updateConnectionInfo(connection)
        this.checkConnectionQuality()
      }
    }
  }

  private updateConnectionInfo(connection: NetworkInformation): void {
    this.state.effectiveType = connection.effectiveType
    this.state.downlink = connection.downlink
    this.state.rtt = connection.rtt
  }

  private checkConnectionQuality(): void {
    if (!this.state.isOnline) return

    const isSlow = this.isConnectionSlow()

    if (isSlow !== this.state.isSlow) {
      this.state.isSlow = isSlow
      this.state.status = isSlow ? 'slow' : 'online'
      this.notifyListeners('statusChange')
    }
  }

  private isConnectionSlow(): boolean {
    // Check effective type
    if (this.state.effectiveType && SLOW_EFFECTIVE_TYPES.includes(this.state.effectiveType)) {
      return true
    }

    // Check RTT
    if (this.state.rtt && this.state.rtt > SLOW_CONNECTION_RTT_THRESHOLD) {
      return true
    }

    // Check downlink speed
    if (this.state.downlink && this.state.downlink < SLOW_CONNECTION_DOWNLINK_THRESHOLD) {
      return true
    }

    return false
  }

  private async performHealthCheck(): Promise<void> {
    if (!navigator.onLine) {
      this.updateStatus('offline')
      return
    }

    try {
      const startTime = Date.now()

      // Try to fetch a small resource from the backend
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT)

      const response = await fetch('/api/v1/health/', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
      })

      clearTimeout(timeoutId)

      const responseTime = Date.now() - startTime
      this.state.lastChecked = new Date()
      this.state.rtt = responseTime

      if (response.ok) {
        // Connection is working
        const wasPreviouslyOffline = !this.state.isOnline
        this.state.isOnline = true
        this.state.retryCount = 0

        // Check if connection is slow based on response time
        const isSlow = responseTime > SLOW_CONNECTION_RTT_THRESHOLD || this.isConnectionSlow()
        this.state.isSlow = isSlow
        this.state.status = isSlow ? 'slow' : 'online'

        this.notifyListeners('healthCheckComplete')

        if (wasPreviouslyOffline) {
          this.notifyListeners('statusChange')
        }
      } else {
        throw new Error(`Health check failed: ${response.status}`)
      }
    } catch (error) {
      console.warn('[NetworkMonitor] Health check failed:', error)

      // If browser says we're online but health check fails,
      // might be a server issue or very slow connection
      if (navigator.onLine) {
        // Could be slow connection or server down
        this.state.isSlow = true
        this.state.status = 'slow'
        this.notifyListeners('statusChange')
      } else {
        this.updateStatus('offline')
        this.startRetryTimer()
      }
    }
  }

  private updateStatus(status: NetworkStatus): void {
    const previousStatus = this.state.status

    this.state.status = status
    this.state.isOnline = status !== 'offline'
    this.state.isSlow = status === 'slow'

    if (previousStatus !== status) {
      this.notifyListeners('statusChange')
    }
  }

  private startRetryTimer(): void {
    this.stopRetryTimer()

    // Calculate retry delay with exponential backoff
    const delay = Math.min(
      INITIAL_RETRY_DELAY * Math.pow(RETRY_MULTIPLIER, this.state.retryCount),
      MAX_RETRY_DELAY
    )

    this.state.retryIn = Math.ceil(delay)
    this.state.retryCount++

    // Start countdown
    this.countdownTimer = setInterval(() => {
      this.state.retryIn--
      this.notifyListeners('retryCountdown')

      if (this.state.retryIn <= 0) {
        this.stopRetryTimer()
        this.performHealthCheck()
      }
    }, 1000)

    this.notifyListeners('retryCountdown')
  }

  private stopRetryTimer(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
      this.countdownTimer = null
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
  }

  private startHealthChecks(): void {
    this.stopHealthChecks()
    this.healthCheckTimer = setInterval(() => {
      if (this.state.isOnline) {
        this.performHealthCheck()
      }
    }, HEALTH_CHECK_INTERVAL)
  }

  private stopHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
    }
  }

  private notifyListeners(type: NetworkEventType): void {
    const event: NetworkEvent = {
      type,
      state: { ...this.state },
    }
    this.listeners.forEach((listener) => listener(event))
  }
}

// Type definitions for Network Information API
interface NetworkInformation extends EventTarget {
  effectiveType: string
  downlink: number
  rtt: number
  saveData: boolean
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation
}

// Singleton instance
export const networkMonitor = new NetworkMonitor()

export default networkMonitor
