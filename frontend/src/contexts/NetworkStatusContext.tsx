/**
 * Network Status Context
 *
 * Provides network connectivity status throughout the application.
 * Wraps the networkMonitor service in a React context for easy consumption.
 *
 * Usage:
 * ```tsx
 * // In component
 * const { isOnline, isSlow, status, retry } = useNetworkStatus()
 *
 * if (!isOnline) {
 *   return <OfflineMessage />
 * }
 * ```
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useMemo,
} from 'react'
import networkMonitor from '@/services/networkMonitor'

// Define types locally to avoid import issues
type NetworkStatus = 'online' | 'offline' | 'slow'

interface NetworkState {
  status: NetworkStatus
  isOnline: boolean
  isSlow: boolean
  lastChecked: Date | null
  retryCount: number
  retryIn: number
  effectiveType?: string
  downlink?: number
  rtt?: number
}

interface NetworkEvent {
  type: 'statusChange' | 'retryCountdown' | 'healthCheckComplete'
  state: NetworkState
}

interface NetworkStatusContextValue extends NetworkState {
  /** Manually trigger a reconnection attempt */
  retry: () => void
  /** Whether the status banner should be shown */
  showBanner: boolean
  /** Dismiss the banner (for slow connection warnings) */
  dismissBanner: () => void
  /** Whether the banner was manually dismissed */
  isDismissed: boolean
}

const NetworkStatusContext = createContext<NetworkStatusContextValue | null>(null)

interface NetworkStatusProviderProps {
  children: ReactNode
  /** Delay before showing offline banner (ms) - prevents flash on brief disconnects */
  offlineDelay?: number
  /** Auto-hide success banner after connection restored (ms) */
  successDuration?: number
}

export function NetworkStatusProvider({
  children,
  offlineDelay = 1000,
  successDuration = 3000,
}: NetworkStatusProviderProps) {
  const [state, setState] = useState<NetworkState>(() => networkMonitor.getState())
  const [showBanner, setShowBanner] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Initialize network monitor
  useEffect(() => {
    networkMonitor.init()

    const unsubscribe = networkMonitor.subscribe((event: NetworkEvent) => {
      setState(event.state)

      if (event.type === 'statusChange') {
        // Reset dismissed state when status changes
        if (event.state.status === 'offline') {
          setIsDismissed(false)
        }
      }
    })

    return () => {
      unsubscribe()
      networkMonitor.destroy()
    }
  }, [])

  // Handle banner visibility with delay for offline
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>

    if (state.status === 'offline') {
      // Delay showing offline banner to prevent flash on brief disconnects
      timeoutId = setTimeout(() => {
        setShowBanner(true)
        setWasOffline(true)
      }, offlineDelay)
    } else if (state.status === 'slow') {
      // Show slow banner immediately (if not dismissed)
      setShowBanner(!isDismissed)
    } else if (state.status === 'online') {
      // If we were offline, show success message briefly
      if (wasOffline) {
        setShowSuccess(true)
        setShowBanner(true)
        timeoutId = setTimeout(() => {
          setShowSuccess(false)
          setShowBanner(false)
          setWasOffline(false)
        }, successDuration)
      } else {
        setShowBanner(false)
      }
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [state.status, offlineDelay, successDuration, wasOffline, isDismissed])

  const retry = useCallback(() => {
    networkMonitor.retry()
  }, [])

  const dismissBanner = useCallback(() => {
    setIsDismissed(true)
    setShowBanner(false)
  }, [])

  const value = useMemo<NetworkStatusContextValue>(
    () => ({
      ...state,
      retry,
      showBanner: showBanner || showSuccess,
      dismissBanner,
      isDismissed,
      // Override status to 'online' when showing success
      status: showSuccess ? 'online' : state.status,
    }),
    [state, retry, showBanner, showSuccess, dismissBanner, isDismissed]
  )

  return <NetworkStatusContext.Provider value={value}>{children}</NetworkStatusContext.Provider>
}

/**
 * Hook to access network status
 * Must be used within NetworkStatusProvider
 */
export function useNetworkStatus(): NetworkStatusContextValue {
  const context = useContext(NetworkStatusContext)
  if (!context) {
    throw new Error('useNetworkStatus must be used within a NetworkStatusProvider')
  }
  return context
}

/**
 * Hook to check if currently online (convenience)
 */
export function useIsOnline(): boolean {
  const { isOnline } = useNetworkStatus()
  return isOnline
}

/**
 * Hook to check if connection is slow (convenience)
 */
export function useIsSlowConnection(): boolean {
  const { isSlow } = useNetworkStatus()
  return isSlow
}

export default NetworkStatusContext
