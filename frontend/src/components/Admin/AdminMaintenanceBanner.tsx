import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Clock, User, X, Zap, Loader2 } from 'lucide-react'
import { useMaintenanceStatus } from '@/contexts/MaintenanceContext'
import { updateSystemSettings } from '@/services/systemService'

function useLiveDuration(startedAt: string | null) {
  const [text, setText] = useState('')

  useEffect(() => {
    if (!startedAt) {
      setText('')
      return
    }
    const tick = () => {
      const diffMs = Date.now() - new Date(startedAt).getTime()
      const totalSecs = Math.floor(diffMs / 1000)
      const h = Math.floor(totalSecs / 3600)
      const m = Math.floor((totalSecs % 3600) / 60)
      const s = totalSecs % 60
      if (h > 0) setText(`${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`)
      else if (m > 0) setText(`${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`)
      else setText(`${String(s).padStart(2, '0')}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startedAt])

  return text
}

interface ConfirmModalProps {
  onConfirm: () => void
  onCancel: () => void
  isLoading: boolean
  duration: string
}

function ConfirmModal({ onConfirm, onCancel, isLoading, duration }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-500" />
        <div className="p-6">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Zap className="w-7 h-7 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-center text-gray-900 dark:text-gray-100 mb-1">
            End Maintenance Mode?
          </h2>
          {duration && (
            <p className="text-center text-xs text-gray-500 dark:text-gray-400 mb-4">
              Active for {duration}
            </p>
          )}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-5 text-sm text-green-800 dark:text-green-300 flex items-start gap-2">
            <Zap className="w-4 h-4 flex-shrink-0 mt-0.5" />
            All users will immediately regain access to the platform.
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              End Maintenance
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AdminMaintenanceBanner() {
  const { status, refresh } = useMaintenanceStatus()
  const navigate = useNavigate()
  const [showConfirm, setShowConfirm] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const duration = useLiveDuration(status?.started_at ?? null)

  if (!status?.maintenance_mode || dismissed) return null

  const estimatedEnd = status.estimated_end
    ? new Date(status.estimated_end).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      })
    : null

  const handleDeactivate = async () => {
    setIsDeactivating(true)
    try {
      await updateSystemSettings({ maintenance_mode: false })
      await refresh()
      setShowConfirm(false)
    } catch {
      // noop — leave modal open
    } finally {
      setIsDeactivating(false)
    }
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[150] bg-red-600 text-white shadow-lg">
        <div className="max-w-screen-xl mx-auto px-4 py-2 flex items-center gap-3 flex-wrap">
          {/* Left: status */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-red-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-200" />
            </span>
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="font-bold text-sm uppercase tracking-wide">Maintenance Active</span>
            <span className="hidden sm:inline text-red-200 text-sm">
              — All non-admin users are blocked
            </span>
          </div>

          {/* Middle: meta */}
          <div className="flex items-center gap-4 flex-1 flex-wrap ml-2">
            {duration && (
              <div className="flex items-center gap-1.5 text-red-100 text-xs">
                <Clock className="w-3.5 h-3.5" />
                <span>{duration}</span>
              </div>
            )}
            {estimatedEnd && (
              <div className="flex items-center gap-1.5 text-red-100 text-xs">
                <Clock className="w-3.5 h-3.5" />
                <span>Est. end: {estimatedEnd}</span>
              </div>
            )}
            {status.started_by_name && (
              <div className="flex items-center gap-1.5 text-red-100 text-xs">
                <User className="w-3.5 h-3.5" />
                <span>{status.started_by_name}</span>
              </div>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => navigate('/admin/system')}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-700 hover:bg-red-800 transition-colors"
            >
              Settings
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              className="px-3 py-1.5 rounded-md text-xs font-semibold bg-white text-red-700 hover:bg-red-50 transition-colors flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              End Maintenance
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 rounded-md hover:bg-red-700 transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Spacer so content isn't hidden under the banner */}
      <div className="h-[42px]" />

      {showConfirm && (
        <ConfirmModal
          onConfirm={handleDeactivate}
          onCancel={() => setShowConfirm(false)}
          isLoading={isDeactivating}
          duration={duration}
        />
      )}
    </>
  )
}
