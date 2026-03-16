/**
 * useDashboardData Hook
 *
 * Fetches and manages all dashboard data with auto-refresh,
 * loading states, and error handling.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchDashboardData } from '@/services/dashboardService'
import type { DashboardData, DateRange } from '@/services/dashboardService'

interface UseDashboardDataReturn {
  data: DashboardData | null
  isLoading: boolean
  error: string | null
  dateRange: DateRange
  setDateRange: (range: DateRange) => void
  refresh: () => void
  lastUpdated: Date | null
}

const AUTO_REFRESH_INTERVAL = 60_000 // 60 seconds

export function useDashboardData(): UseDashboardDataReturn {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true)
    setError(null)

    try {
      const result = await fetchDashboardData()
      setData(result)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadData(true)
  }, [loadData])

  // Auto-refresh
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      loadData(false) // silent refresh
    }, AUTO_REFRESH_INTERVAL)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [loadData])

  const refresh = useCallback(() => {
    loadData(false)
  }, [loadData])

  return {
    data,
    isLoading,
    error,
    dateRange,
    setDateRange,
    refresh,
    lastUpdated,
  }
}
