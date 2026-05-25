import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { getMaintenanceStatus, type MaintenanceStatus } from '@/services/systemService'
import { resetMaintenanceState } from '@/services/apiClient'

interface MaintenanceContextValue {
  status: MaintenanceStatus | null
  isLoading: boolean
  refresh: () => Promise<void>
}

const MaintenanceContext = createContext<MaintenanceContextValue>({
  status: null,
  isLoading: true,
  refresh: async () => {},
})

const POLL_INTERVAL_MS = 30_000

export function MaintenanceProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<MaintenanceStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async () => {
    try {
      const data = await getMaintenanceStatus()
      setStatus(data)
      // When maintenance ends, allow the 503 interceptor to fire again next time
      if (!data.maintenance_mode) {
        resetMaintenanceState()
      }
    } catch {
      // Network error — leave previous status intact so UI doesn't flicker
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    intervalRef.current = setInterval(refresh, POLL_INTERVAL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [refresh])

  // Also respond to maintenance-mode-detected events from apiClient interceptor
  useEffect(() => {
    function handleMaintenanceDetected(e: Event) {
      const detail = (e as CustomEvent).detail as {
        message: string
        estimatedEnd: string | null
        startedAt: string | null
      }
      setStatus({
        maintenance_mode: true,
        message: detail.message,
        estimated_end: detail.estimatedEnd,
        started_at: detail.startedAt,
        started_by_name: null,
      })
    }
    window.addEventListener('maintenance-mode-detected', handleMaintenanceDetected)
    return () => window.removeEventListener('maintenance-mode-detected', handleMaintenanceDetected)
  }, [])

  return (
    <MaintenanceContext.Provider value={{ status, isLoading, refresh }}>
      {children}
    </MaintenanceContext.Provider>
  )
}

export function useMaintenanceStatus() {
  return useContext(MaintenanceContext)
}
