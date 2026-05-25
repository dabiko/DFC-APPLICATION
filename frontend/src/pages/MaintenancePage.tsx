import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Settings, Clock, Mail, RefreshCw } from 'lucide-react'
import { useMaintenanceStatus } from '@/contexts/MaintenanceContext'

function formatDuration(startedAt: string | null): string {
  if (!startedAt) return ''
  const diffMs = Date.now() - new Date(startedAt).getTime()
  const totalSecs = Math.floor(diffMs / 1000)
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatEstimated(estimatedEnd: string | null): string {
  if (!estimatedEnd) return ''
  const date = new Date(estimatedEnd)
  const dateStr = date.toLocaleDateString([], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const timeStr = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })
  return `${dateStr} at ${timeStr}`
}

function computeTimeRemaining(estimatedEnd: string | null): string {
  if (!estimatedEnd) return ''
  const diffMs = new Date(estimatedEnd).getTime() - Date.now()
  if (diffMs <= 0) return 'Ending shortly'
  const totalSecs = Math.floor(diffMs / 1000)
  const days = Math.floor(totalSecs / 86400)
  const hours = Math.floor((totalSecs % 86400) / 3600)
  const mins = Math.floor((totalSecs % 3600) / 60)
  if (days > 0) return `~${days}d ${hours}h remaining`
  if (hours > 0) return `~${hours}h ${mins}m remaining`
  return `~${mins + 1}m remaining`
}

export function MaintenancePage() {
  const { status, refresh } = useMaintenanceStatus()
  const navigate = useNavigate()
  const location = useLocation()
  const [duration, setDuration] = useState('')
  const [timeRemaining, setTimeRemaining] = useState('')
  const [nextCheckIn, setNextCheckIn] = useState(30)
  const [isChecking, setIsChecking] = useState(false)

  // Live duration timer
  useEffect(() => {
    const tick = () => setDuration(formatDuration(status?.started_at ?? null))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [status?.started_at])

  // Live time-remaining countdown
  useEffect(() => {
    const tick = () => setTimeRemaining(computeTimeRemaining(status?.estimated_end ?? null))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [status?.estimated_end])

  // Countdown to next auto-check
  useEffect(() => {
    setNextCheckIn(30)
    const id = setInterval(() => setNextCheckIn((n) => (n <= 1 ? 30 : n - 1)), 1000)
    return () => clearInterval(id)
  }, [status])

  // Redirect when maintenance ends
  useEffect(() => {
    if (status && !status.maintenance_mode) {
      const returnTo = sessionStorage.getItem('pre_maintenance_path') || '/dashboard'
      sessionStorage.removeItem('pre_maintenance_path')
      navigate(returnTo, { replace: true })
    }
  }, [status, navigate])

  // Store the path the user was on before maintenance hit
  useEffect(() => {
    const currentPath = location.pathname + location.search
    if (currentPath !== '/maintenance') {
      sessionStorage.setItem('pre_maintenance_path', currentPath)
    }
  }, [location])

  const handleManualCheck = async () => {
    setIsChecking(true)
    await refresh()
    setIsChecking(false)
    setNextCheckIn(30)
  }

  const message =
    status?.message ||
    'The system is currently undergoing scheduled maintenance. Please check back soon.'
  const estimatedEnd = formatEstimated(status?.estimated_end ?? null)

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white px-4">
      {/* Animated background grid */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 max-w-lg w-full text-center space-y-8">
        {/* Logo / Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center backdrop-blur-sm">
              <Settings
                className="w-12 h-12 text-amber-400 animate-spin"
                style={{ animationDuration: '8s' }}
              />
            </div>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500" />
            </span>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Scheduled Maintenance
          </div>
          <h1 className="text-3xl font-bold text-white">We'll be back soon</h1>
          <p className="text-slate-300 text-base leading-relaxed max-w-md mx-auto">{message}</p>
        </div>

        {/* Info cards */}
        <div className="flex justify-center gap-4 flex-wrap">
          {estimatedEnd && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <Clock className="w-4 h-4 text-slate-400" />
              <div className="text-left">
                <p className="text-xs text-slate-400">Estimated return</p>
                <p className="text-sm font-semibold text-white">{estimatedEnd}</p>
                {timeRemaining && <p className="text-xs text-amber-400 mt-0.5">{timeRemaining}</p>}
              </div>
            </div>
          )}
          {duration && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <Settings className="w-4 h-4 text-slate-400" />
              <div className="text-left">
                <p className="text-xs text-slate-400">In progress for</p>
                <p className="text-sm font-semibold text-white">{duration}</p>
              </div>
            </div>
          )}
        </div>

        {/* Auto-check indicator */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3 text-sm text-slate-400">
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin text-amber-400' : ''}`} />
            <span>{isChecking ? 'Checking status...' : `Auto-checking in ${nextCheckIn}s`}</span>
          </div>

          {/* Progress bar for countdown */}
          <div className="w-full max-w-xs mx-auto h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-1000"
              style={{ width: `${((30 - nextCheckIn) / 30) * 100}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button
            onClick={handleManualCheck}
            disabled={isChecking}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 font-semibold text-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            Check Now
          </button>
          <a
            href="mailto:support@dfc.com"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm transition-colors"
          >
            <Mail className="w-4 h-4" />
            Contact Support
          </a>
        </div>

        {/* Footer */}
        <p className="text-slate-500 text-xs">
          Digital Filing Cabinet &mdash; Enterprise Document Management
        </p>
      </div>
    </div>
  )
}
