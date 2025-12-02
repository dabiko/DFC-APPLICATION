/**
 * useMFA Hook
 *
 * Provides MFA status and operations for the current user.
 * Fetches MFA status on mount and provides methods for MFA operations.
 */

import { useState, useEffect, useCallback } from 'react'
import { mfaService, type MFAStatusResponse } from '@/services/mfaService'
import { useAuth } from '@/hooks/useAuth'

export interface MFAStatus {
  mfaEnabled: boolean
  mfaEnforced: boolean
  totpEnabled: boolean
  totpConfirmed: boolean
  enabledAt: string | null
  lastVerifiedAt: string | null
  backupCodesRemaining: number
  verificationFailures: number
}

export interface UseMFAReturn {
  /** Current MFA status */
  status: MFAStatus | null
  /** Whether MFA status is loading */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** Refresh MFA status from server */
  refresh: () => Promise<void>
  /** Check if MFA is fully configured */
  isConfigured: boolean
  /** Check if user needs to set up MFA (enforced but not enabled) */
  needsSetup: boolean
}

const defaultStatus: MFAStatus = {
  mfaEnabled: false,
  mfaEnforced: false,
  totpEnabled: false,
  totpConfirmed: false,
  enabledAt: null,
  lastVerifiedAt: null,
  backupCodesRemaining: 0,
  verificationFailures: 0,
}

export function useMFA(): UseMFAReturn {
  const { isAuthenticated, user } = useAuth()
  const [status, setStatus] = useState<MFAStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    if (!isAuthenticated) {
      setStatus(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await mfaService.getStatus()

      if (response.success) {
        setStatus({
          mfaEnabled: response.data.mfa_enabled,
          mfaEnforced: response.data.mfa_enforced,
          totpEnabled: response.data.totp_enabled,
          totpConfirmed: response.data.totp_confirmed,
          enabledAt: response.data.enabled_at,
          lastVerifiedAt: response.data.last_verified_at,
          backupCodesRemaining: response.data.backup_codes_remaining,
          verificationFailures: response.data.verification_failures,
        })
      } else {
        // If API call fails, use user data from auth context as fallback
        setStatus({
          ...defaultStatus,
          mfaEnabled: user?.mfa_enabled || false,
        })
      }
    } catch (err: any) {
      console.error('Failed to fetch MFA status:', err)
      setError(err.message || 'Failed to fetch MFA status')

      // Use user data from auth context as fallback
      setStatus({
        ...defaultStatus,
        mfaEnabled: user?.mfa_enabled || false,
      })
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, user?.mfa_enabled])

  // Fetch status on mount and when auth state changes
  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Computed values
  const isConfigured = status?.mfaEnabled && status?.totpConfirmed
  const needsSetup = status?.mfaEnforced && !status?.mfaEnabled

  return {
    status,
    isLoading,
    error,
    refresh: fetchStatus,
    isConfigured: isConfigured || false,
    needsSetup: needsSetup || false,
  }
}

/**
 * useMFASetup Hook
 *
 * Provides MFA setup flow state and methods.
 */
export interface MFASetupState {
  step: 'idle' | 'password' | 'qrcode' | 'verify' | 'backup' | 'complete' | 'error'
  qrCode: string | null
  secret: string | null
  backupCodes: string[]
  error: string | null
  isLoading: boolean
}

export interface UseMFASetupReturn {
  state: MFASetupState
  /** Start MFA setup flow */
  startSetup: () => Promise<void>
  /** Confirm setup with TOTP code */
  confirmSetup: (code: string) => Promise<boolean>
  /** Reset setup state */
  reset: () => void
}

export function useMFASetup(): UseMFASetupReturn {
  const [state, setState] = useState<MFASetupState>({
    step: 'idle',
    qrCode: null,
    secret: null,
    backupCodes: [],
    error: null,
    isLoading: false,
  })

  const startSetup = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const response = await mfaService.setup()

      if (response.success) {
        setState({
          step: 'qrcode',
          qrCode: response.data.qr_code,
          secret: response.data.secret,
          backupCodes: [],
          error: null,
          isLoading: false,
        })
      } else {
        setState((prev) => ({
          ...prev,
          step: 'error',
          error: response.message || 'Failed to start MFA setup',
          isLoading: false,
        }))
      }
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        step: 'error',
        error: err.message || 'Failed to start MFA setup',
        isLoading: false,
      }))
    }
  }, [])

  const confirmSetup = useCallback(
    async (code: string): Promise<boolean> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        const response = await mfaService.confirm({ token: code })

        if (response.success) {
          setState({
            step: 'backup',
            qrCode: state.qrCode,
            secret: state.secret,
            backupCodes: response.data.backup_codes,
            error: null,
            isLoading: false,
          })
          return true
        } else {
          setState((prev) => ({
            ...prev,
            error: response.message || 'Invalid verification code',
            isLoading: false,
          }))
          return false
        }
      } catch (err: any) {
        setState((prev) => ({
          ...prev,
          error: err.message || 'Failed to verify code',
          isLoading: false,
        }))
        return false
      }
    },
    [state.qrCode, state.secret]
  )

  const reset = useCallback(() => {
    setState({
      step: 'idle',
      qrCode: null,
      secret: null,
      backupCodes: [],
      error: null,
      isLoading: false,
    })
  }, [])

  return {
    state,
    startSetup,
    confirmSetup,
    reset,
  }
}

/**
 * useMFADisable Hook
 *
 * Provides MFA disable flow state and methods.
 */
export interface UseMFADisableReturn {
  isLoading: boolean
  error: string | null
  /** Disable MFA with TOTP verification */
  disable: (code: string) => Promise<boolean>
}

export function useMFADisable(): UseMFADisableReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const disable = useCallback(async (code: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await mfaService.disable({ token: code })

      if (response.success) {
        return true
      } else {
        setError(response.message || 'Failed to disable MFA')
        return false
      }
    } catch (err: any) {
      setError(err.message || 'Failed to disable MFA')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    isLoading,
    error,
    disable,
  }
}

/**
 * useBackupCodes Hook
 *
 * Provides backup codes management.
 */
export interface UseBackupCodesReturn {
  isLoading: boolean
  error: string | null
  codes: string[]
  /** Regenerate backup codes with TOTP verification */
  regenerate: (code: string) => Promise<boolean>
}

export function useBackupCodes(): UseBackupCodesReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [codes, setCodes] = useState<string[]>([])

  const regenerate = useCallback(async (code: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await mfaService.regenerateBackupCodes({ token: code })

      if (response.success) {
        setCodes(response.data.backup_codes)
        return true
      } else {
        setError(response.message || 'Failed to regenerate backup codes')
        return false
      }
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate backup codes')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    isLoading,
    error,
    codes,
    regenerate,
  }
}

/**
 * useTrustedDevices Hook
 *
 * Provides trusted devices management for MFA.
 */
export interface TrustedDeviceData {
  id: string
  device_id: string
  device_name: string
  device_type: 'desktop' | 'laptop' | 'mobile' | 'tablet' | 'other'
  location: string
  trusted_at: string
  expires_at: string
  last_used_at: string
  is_valid: boolean
  is_current: boolean
  expires_in_days: number
}

export interface UseTrustedDevicesReturn {
  devices: TrustedDeviceData[]
  isLoading: boolean
  error: string | null
  /** Refresh the list of trusted devices */
  refresh: () => Promise<void>
  /** Remove a trusted device by ID */
  removeDevice: (deviceId: string, reason?: string) => Promise<boolean>
  /** Revoke all trusted devices */
  revokeAllDevices: () => Promise<boolean>
  /** Trust the current device */
  trustCurrentDevice: (options?: { deviceName?: string; trustDays?: number }) => Promise<boolean>
  /** Check if the current device is trusted */
  currentDeviceId: string | null
}

export function useTrustedDevices(): UseTrustedDevicesReturn {
  const [devices, setDevices] = useState<TrustedDeviceData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null)

  const fetchDevices = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await mfaService.getTrustedDevices()

      if (response.success) {
        setDevices(response.data.devices)
        // Find the current device
        const current = response.data.devices.find((d: TrustedDeviceData) => d.is_current)
        setCurrentDeviceId(current?.id || null)
      } else {
        setError(response.message || 'Failed to fetch trusted devices')
      }
    } catch (err: any) {
      console.error('Failed to fetch trusted devices:', err)
      setError(err.message || 'Failed to fetch trusted devices')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const removeDevice = useCallback(
    async (deviceId: string, reason?: string): Promise<boolean> => {
      try {
        const response = await mfaService.removeTrustedDevice(deviceId, reason)
        if (response.success) {
          // Refresh the list
          await fetchDevices()
          return true
        }
        return false
      } catch (err: any) {
        console.error('Failed to remove device:', err)
        setError(err.message || 'Failed to remove device')
        return false
      }
    },
    [fetchDevices]
  )

  const revokeAllDevices = useCallback(async (): Promise<boolean> => {
    try {
      const response = await mfaService.revokeAllTrustedDevices()
      if (response.success) {
        setDevices([])
        setCurrentDeviceId(null)
        return true
      }
      return false
    } catch (err: any) {
      console.error('Failed to revoke all devices:', err)
      setError(err.message || 'Failed to revoke all devices')
      return false
    }
  }, [])

  const trustCurrentDevice = useCallback(
    async (options?: { deviceName?: string; trustDays?: number }): Promise<boolean> => {
      try {
        const fingerprint = mfaService.generateDeviceFingerprint()
        const response = await mfaService.trustDevice({
          device_fingerprint: fingerprint,
          device_name: options?.deviceName || detectDeviceName(),
          device_type: detectDeviceType(),
          trust_days: options?.trustDays || 30,
        })

        if (response.success) {
          await fetchDevices()
          return true
        }
        return false
      } catch (err: any) {
        console.error('Failed to trust device:', err)
        setError(err.message || 'Failed to trust device')
        return false
      }
    },
    [fetchDevices]
  )

  // Fetch devices on mount
  useEffect(() => {
    fetchDevices()
  }, [fetchDevices])

  return {
    devices,
    isLoading,
    error,
    refresh: fetchDevices,
    removeDevice,
    revokeAllDevices,
    trustCurrentDevice,
    currentDeviceId,
  }
}

// Helper functions for device detection
function detectDeviceName(): string {
  const ua = navigator.userAgent
  let browser = 'Unknown Browser'
  let os = 'Unknown OS'

  // Detect browser
  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    browser = 'Chrome'
  } else if (ua.includes('Firefox')) {
    browser = 'Firefox'
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    browser = 'Safari'
  } else if (ua.includes('Edg')) {
    browser = 'Edge'
  } else if (ua.includes('MSIE') || ua.includes('Trident')) {
    browser = 'Internet Explorer'
  }

  // Detect OS
  if (ua.includes('Windows')) {
    os = 'Windows'
  } else if (ua.includes('Mac OS')) {
    os = 'macOS'
  } else if (ua.includes('Linux')) {
    os = 'Linux'
  } else if (ua.includes('Android')) {
    os = 'Android'
  } else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) {
    os = 'iOS'
  }

  return `${browser} on ${os}`
}

function detectDeviceType(): 'desktop' | 'laptop' | 'mobile' | 'tablet' | 'other' {
  const ua = navigator.userAgent
  if (/Mobi|Android|iPhone/i.test(ua)) {
    return 'mobile'
  }
  if (/iPad|Tablet/i.test(ua)) {
    return 'tablet'
  }
  return 'desktop'
}

/**
 * useMFAAdmin Hook
 *
 * Provides MFA admin functionality for compliance dashboard.
 */
export interface MFAComplianceStats {
  total_users: number
  mfa_enabled_count: number
  mfa_enabled_percentage: number
  mfa_enforced_count: number
  totp_enabled_count: number
  users_needing_setup: number
  recent_verifications_24h: number
  failed_verifications_24h: number
  active_trusted_devices: number
}

export interface UserMFAStatus {
  id: number
  email: string
  first_name: string
  last_name: string
  is_active: boolean
  mfa_enabled: boolean
  mfa_enforced: boolean
  totp_confirmed: boolean
  backup_codes_remaining: number
  last_verified_at: string | null
  trusted_devices_count: number
}

export interface UseMFAAdminReturn {
  stats: MFAComplianceStats | null
  users: UserMFAStatus[]
  isLoading: boolean
  error: string | null
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
  /** Fetch compliance stats */
  fetchStats: () => Promise<void>
  /** Fetch users with MFA status */
  fetchUsers: (params?: {
    page?: number
    pageSize?: number
    mfaStatus?: string
    search?: string
  }) => Promise<void>
  /** Enforce MFA for a user */
  enforceMFA: (userId: number, enforce: boolean) => Promise<boolean>
}

export function useMFAAdmin(): UseMFAAdminReturn {
  const [stats, setStats] = useState<MFAComplianceStats | null>(null)
  const [users, setUsers] = useState<UserMFAStatus[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  })

  const fetchStats = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await mfaService.getComplianceStats()

      if (response.success) {
        setStats(response.data)
      } else {
        setError(response.message || 'Failed to fetch compliance stats')
      }
    } catch (err: any) {
      console.error('Failed to fetch compliance stats:', err)
      setError(err.message || 'Failed to fetch compliance stats')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchUsers = useCallback(
    async (params?: { page?: number; pageSize?: number; mfaStatus?: string; search?: string }) => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await mfaService.getAllUsersStatus({
          page: params?.page || 1,
          page_size: params?.pageSize || 20,
          mfa_status: params?.mfaStatus,
          search: params?.search,
        })

        if (response.success) {
          setUsers(response.data.users)
          setPagination({
            total: response.data.total,
            page: response.data.page,
            pageSize: response.data.page_size,
            totalPages: response.data.total_pages,
          })
        } else {
          setError(response.message || 'Failed to fetch users')
        }
      } catch (err: any) {
        console.error('Failed to fetch users:', err)
        setError(err.message || 'Failed to fetch users')
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const enforceMFA = useCallback(async (userId: number, enforce: boolean): Promise<boolean> => {
    try {
      const response = await mfaService.enforceMFAForUser(userId.toString(), enforce)
      return response.success
    } catch (err: any) {
      console.error('Failed to enforce MFA:', err)
      setError(err.message || 'Failed to enforce MFA')
      return false
    }
  }, [])

  return {
    stats,
    users,
    isLoading,
    error,
    pagination,
    fetchStats,
    fetchUsers,
    enforceMFA,
  }
}

export default useMFA
