/**
 * Network Status Banner Component
 *
 * Displays a compact, centered notification for network connectivity issues.
 * - Red: Offline with reconnection countdown
 * - Yellow: Slow connection with tips
 * - Green: Connection restored (auto-dismisses)
 *
 * Floating centered design - non-intrusive and elegant.
 */

import { useEffect, useState } from 'react'
import {
  WifiOff,
  Wifi,
  CheckCircle,
  RefreshCw,
  X,
  Loader2,
  SignalLow,
} from 'lucide-react'
import { useNetworkStatus } from '@/contexts/NetworkStatusContext'
import { cn } from '@/utils/cn'

interface NetworkStatusBannerProps {
  className?: string
}

export function NetworkStatusBanner({ className }: NetworkStatusBannerProps) {
  const { status, isOnline, isSlow, retryIn, retryCount, retry, showBanner, dismissBanner, rtt } =
    useNetworkStatus()
  const [isRetrying, setIsRetrying] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  // Animate in/out
  useEffect(() => {
    if (showBanner) {
      // Small delay for enter animation
      const timer = setTimeout(() => setIsVisible(true), 50)
      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
    }
  }, [showBanner])

  // Reset retrying state when status changes
  useEffect(() => {
    if (isOnline && !isSlow) {
      setIsRetrying(false)
    }
  }, [isOnline, isSlow])

  const handleRetry = () => {
    setIsRetrying(true)
    retry()
    setTimeout(() => setIsRetrying(false), 2000)
  }

  if (!showBanner) {
    return null
  }

  // Success state (connection restored)
  if (status === 'online' && !isSlow) {
    return (
      <div className="fixed top-4 left-0 right-0 z-[100] flex justify-center pointer-events-none">
        <div
          className={cn(
            'pointer-events-auto transform transition-all duration-300 ease-out',
            'bg-green-600 text-white shadow-lg rounded-full px-5 py-2.5',
            'flex items-center gap-2.5',
            isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0',
            className
          )}
          role="status"
          aria-live="polite"
        >
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-medium">Connection restored</span>
          <Wifi className="w-4 h-4 flex-shrink-0" />
        </div>
      </div>
    )
  }

  // Offline state
  if (status === 'offline') {
    return (
      <div className="fixed top-4 left-0 right-0 z-[100] flex justify-center pointer-events-none">
        <div
          className={cn(
            'pointer-events-auto transform transition-all duration-300 ease-out',
            'bg-red-600 text-white shadow-xl rounded-2xl px-4 py-3 max-w-md w-[90%] sm:w-auto',
            isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0',
            className
          )}
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div className="flex-shrink-0 p-2 bg-white/20 rounded-full">
              <WifiOff className="w-5 h-5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">No internet connection</p>
              <p className="text-xs text-red-100 mt-0.5">
                {retryIn > 0 ? (
                  <>
                    Reconnecting in <span className="font-mono font-bold">{retryIn}s</span>
                    {retryCount > 1 && (
                      <span className="text-red-200 ml-1">(Attempt {retryCount})</span>
                    )}
                  </>
                ) : (
                  'Checking connection...'
                )}
              </p>
            </div>

            {/* Retry button */}
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className={cn(
                'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                'bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isRetrying ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{isRetrying ? 'Retrying' : 'Retry'}</span>
            </button>
          </div>

          {/* Progress bar */}
          {retryIn > 0 && (
            <div className="mt-2.5 h-1 bg-red-400/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/60 rounded-full transition-all duration-1000 ease-linear"
                style={{
                  width: `${Math.max(0, (1 - retryIn / getMaxRetryDelay(retryCount)) * 100)}%`,
                }}
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  // Slow connection state
  if (status === 'slow' || isSlow) {
    return (
      <div className="fixed top-4 left-0 right-0 z-[100] flex justify-center pointer-events-none">
        <div
          className={cn(
            'pointer-events-auto transform transition-all duration-300 ease-out',
            'bg-amber-500 text-amber-950 shadow-xl rounded-2xl px-4 py-3 max-w-md w-[90%] sm:w-auto',
            isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0',
            className
          )}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div className="flex-shrink-0 p-2 bg-amber-600/20 rounded-full">
              <SignalLow className="w-5 h-5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Slow connection</p>
              <p className="text-xs text-amber-800 mt-0.5">
                {rtt && rtt > 500 && <span>{rtt}ms latency · </span>}
                Some features may be delayed
              </p>
            </div>

            {/* Dismiss button */}
            <button
              onClick={dismissBanner}
              className={cn(
                'flex-shrink-0 p-1.5 rounded-lg transition-colors',
                'hover:bg-amber-600/20'
              )}
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

/**
 * Calculate max retry delay for progress bar
 */
function getMaxRetryDelay(retryCount: number): number {
  const INITIAL_RETRY_DELAY = 5
  const MAX_RETRY_DELAY = 60
  const RETRY_MULTIPLIER = 1.5
  return Math.min(INITIAL_RETRY_DELAY * Math.pow(RETRY_MULTIPLIER, retryCount - 1), MAX_RETRY_DELAY)
}

/**
 * Spacer component - no longer needed with floating design
 * Kept for backwards compatibility
 */
export function NetworkStatusBannerSpacer() {
  return null
}

export default NetworkStatusBanner
