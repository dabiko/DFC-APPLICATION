/**
 * Permission Context
 *
 * Provides RBAC permission checking throughout the application.
 * Caches user permissions and provides utilities for permission checks.
 * Integrates with real-time permission sync service.
 *
 * SECURITY NOTE:
 * - All permission checks in this context are for UI/UX purposes ONLY
 * - The backend MUST enforce permissions on every API call
 * - Frontend permission checks should never be trusted for security decisions
 * - isAdmin/isAdminOrManager flags are derived from server-validated permissionSummary
 *
 * Usage:
 * ```tsx
 * // In component
 * const { hasPermission, hasGlobalPermission, checkDocumentPermission } = usePermissions()
 *
 * if (hasGlobalPermission('can_manage_permissions')) {
 *   return <AdminPanel />
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
  useRef,
} from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  getUserPermissionSummary,
  checkDocumentPermission as apiCheckDocumentPermission,
  checkFolderPermission as apiCheckFolderPermission,
  type UserPermissionSummary,
  type EffectivePermissions,
} from '@/services/permissionService'
import permissionSyncService, {
  type PermissionEvent,
  type ConnectionStatus,
} from '@/services/permissionSyncService'

// Permission types
export type PermissionAction =
  | 'can_view'
  | 'can_download'
  | 'can_upload'
  | 'can_edit'
  | 'can_delete'
  | 'can_share'
  | 'can_manage_permissions'
  | 'can_view_audit_log'
  | 'can_manage_retention'
  | 'can_manage_classification'

export interface PermissionCheckResult {
  allowed: boolean
  reason?: string
  source?: string
  /** Indicates if this result came from server validation */
  serverValidated: boolean
}

export interface ResourcePermissions extends EffectivePermissions {
  isOwner?: boolean
  isLoading?: boolean
}

interface PermissionContextValue {
  /** User's permission summary (from server) */
  permissionSummary: UserPermissionSummary | null

  /** Whether permissions are loading */
  isLoading: boolean

  /** Error loading permissions */
  error: string | null

  /**
   * Check if user has a global permission (UI only - backend must also validate)
   * @security This is for UI/UX only. Backend must enforce permissions.
   */
  hasGlobalPermission: (permission: PermissionAction) => boolean

  /**
   * Check if user has any of the specified global permissions (UI only)
   * @security This is for UI/UX only. Backend must enforce permissions.
   */
  hasAnyGlobalPermission: (permissions: PermissionAction[]) => boolean

  /**
   * Check if user has all of the specified global permissions (UI only)
   * @security This is for UI/UX only. Backend must enforce permissions.
   */
  hasAllGlobalPermissions: (permissions: PermissionAction[]) => boolean

  /**
   * Check document permission via backend API
   * @security This calls the backend for validation
   */
  checkDocumentPermission: (
    documentId: string,
    permission: PermissionAction
  ) => Promise<PermissionCheckResult>

  /**
   * Check folder permission via backend API
   * @security This calls the backend for validation
   */
  checkFolderPermission: (
    folderId: string,
    permission: PermissionAction
  ) => Promise<PermissionCheckResult>

  /**
   * Check if user is admin or manager (based on server-validated permissions)
   * @security Derived from server permissionSummary, but UI-only flag
   */
  isAdminOrManager: boolean

  /**
   * Check if user is admin (based on server-validated permissions)
   * @security Derived from server permissionSummary, but UI-only flag
   */
  isAdmin: boolean

  /** Refresh permission data from server */
  refreshPermissions: () => Promise<void>

  /** Clear cached permissions */
  clearPermissionCache: () => void

  /** Real-time sync connection status */
  syncStatus: ConnectionStatus

  /** Subscribe to permission changes for a specific resource */
  subscribeToResource: (
    resourceType: 'document' | 'folder',
    resourceId: string,
    callback: (event: PermissionEvent) => void
  ) => () => void

  /** Invalidate cached permission for a resource */
  invalidateResourcePermission: (resourceType: 'document' | 'folder', resourceId: string) => void
}

const PermissionContext = createContext<PermissionContextValue | null>(null)

interface PermissionProviderProps {
  children: ReactNode
}

// Cache for document/folder permission checks
// SECURITY: Cache is keyed by user session to prevent cross-user contamination
interface CacheEntry {
  result: PermissionCheckResult
  timestamp: number
  sessionId: string
}

const permissionCache = new Map<string, CacheEntry>()
const CACHE_TTL = 2 * 60 * 1000 // 2 minutes (reduced from 5 for security)

// Generate a session ID to prevent cache poisoning across sessions
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('permission_session_id')
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem('permission_session_id', sessionId)
  }
  return sessionId
}

export function PermissionProvider({ children }: PermissionProviderProps) {
  const { user, isAuthenticated, getAccessToken } = useAuth()
  const [permissionSummary, setPermissionSummary] = useState<UserPermissionSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<ConnectionStatus>('disconnected')
  const syncUnsubscribeRef = useRef<(() => void) | null>(null)
  const sessionIdRef = useRef<string>(getSessionId())

  // Clear cache when user changes
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      // Generate new session ID on login
      sessionIdRef.current = getSessionId()
      fetchPermissions()
    } else {
      setPermissionSummary(null)
      permissionCache.clear()
      // Clear session ID on logout
      sessionStorage.removeItem('permission_session_id')
    }
  }, [isAuthenticated, user?.id])

  // Connect to real-time sync service
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      const token = getAccessToken?.()
      if (token) {
        // Connect to sync service
        permissionSyncService.connect(user.id, token)

        // Subscribe to status changes
        const statusUnsubscribe = permissionSyncService.onStatusChange(setSyncStatus)

        // Subscribe to global permission events for this user
        const eventUnsubscribe = permissionSyncService.subscribeAll((event) => {
          // Handle permission changes that affect the current user
          if (event.userId === user.id || !event.userId) {
            handlePermissionEvent(event)
          }
        })

        syncUnsubscribeRef.current = () => {
          statusUnsubscribe()
          eventUnsubscribe()
        }
      }
    } else {
      // Disconnect when logged out
      permissionSyncService.disconnect()
      syncUnsubscribeRef.current?.()
      syncUnsubscribeRef.current = null
    }

    return () => {
      syncUnsubscribeRef.current?.()
    }
  }, [isAuthenticated, user?.id, getAccessToken])

  // Handle incoming permission events
  const handlePermissionEvent = useCallback(
    (event: PermissionEvent) => {
      console.log('[PermissionContext] Received permission event:', event)

      // Invalidate relevant cached permissions
      if (event.resourceType && event.resourceId) {
        const cachePrefix =
          event.resourceType === 'document'
            ? `doc:${event.resourceId}`
            : `folder:${event.resourceId}`

        // Clear all cached permissions for this resource
        permissionCache.forEach((_, key) => {
          if (key.startsWith(cachePrefix)) {
            permissionCache.delete(key)
          }
        })
      }

      // If user's global permissions changed, refresh everything
      if (
        event.type === 'role_assigned' ||
        event.type === 'role_removed' ||
        event.type === 'user_permissions_refreshed'
      ) {
        permissionCache.clear()
        fetchPermissions()
      }
    },
    [user?.id]
  )

  const fetchPermissions = useCallback(async () => {
    if (!user?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const summary = await getUserPermissionSummary(user.id)
      setPermissionSummary(summary)
    } catch (err) {
      console.error('Failed to fetch permissions:', err)
      setError('Failed to load permissions')
      // SECURITY FIX: On error, set null permissions instead of using client-side data
      // This ensures users don't get elevated privileges when API fails
      setPermissionSummary(null)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const refreshPermissions = useCallback(async () => {
    permissionCache.clear()
    await fetchPermissions()
  }, [fetchPermissions])

  const clearPermissionCache = useCallback(() => {
    permissionCache.clear()
  }, [])

  // Subscribe to permission changes for a specific resource
  const subscribeToResource = useCallback(
    (
      resourceType: 'document' | 'folder',
      resourceId: string,
      callback: (event: PermissionEvent) => void
    ) => {
      return permissionSyncService.subscribe(resourceType, resourceId, callback)
    },
    []
  )

  // Invalidate cached permission for a specific resource
  const invalidateResourcePermission = useCallback(
    (resourceType: 'document' | 'folder', resourceId: string) => {
      const cachePrefix = resourceType === 'document' ? `doc:${resourceId}` : `folder:${resourceId}`

      permissionCache.forEach((_, key) => {
        if (key.startsWith(cachePrefix)) {
          permissionCache.delete(key)
        }
      })
    },
    []
  )

  /**
   * Check global permission based on server-provided permission summary
   * SECURITY: Only uses data from permissionSummary (fetched from server)
   * Does NOT trust client-side user object for permission decisions
   */
  const hasGlobalPermission = useCallback(
    (permission: PermissionAction): boolean => {
      // SECURITY: Only trust server-validated permission summary
      if (!permissionSummary) {
        return false // No permissions if summary not loaded
      }

      // Check if user is superuser (from server-validated summary)
      if (permissionSummary.is_superuser) {
        return true
      }

      // Check in server-provided permission list
      if (permissionSummary.all_permissions) {
        return permissionSummary.all_permissions.includes(permission)
      }

      return false
    },
    [permissionSummary]
  )

  const hasAnyGlobalPermission = useCallback(
    (permissions: PermissionAction[]): boolean => {
      return permissions.some((p) => hasGlobalPermission(p))
    },
    [hasGlobalPermission]
  )

  const hasAllGlobalPermissions = useCallback(
    (permissions: PermissionAction[]): boolean => {
      return permissions.every((p) => hasGlobalPermission(p))
    },
    [hasGlobalPermission]
  )

  /**
   * Check document permission via backend API
   * SECURITY: Always calls backend, no client-side bypass
   */
  const checkDocumentPermission = useCallback(
    async (documentId: string, permission: PermissionAction): Promise<PermissionCheckResult> => {
      const sessionId = sessionIdRef.current
      const cacheKey = `doc:${documentId}:${permission}:${user?.id}:${sessionId}`

      // Check cache (with session validation)
      const cached = permissionCache.get(cacheKey)
      if (cached && cached.sessionId === sessionId && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.result
      }

      try {
        // SECURITY: Always call backend API for permission check
        const result = await apiCheckDocumentPermission(documentId, user?.id || '', permission)
        const checkResult: PermissionCheckResult = {
          allowed: result.has_permission,
          reason: result.reason,
          source: result.source,
          serverValidated: true,
        }

        // Cache the result with session ID and timestamp
        permissionCache.set(cacheKey, {
          result: checkResult,
          timestamp: Date.now(),
          sessionId,
        })

        return checkResult
      } catch (err) {
        console.error('Failed to check document permission:', err)
        // SECURITY: On error, deny access (fail-secure)
        return {
          allowed: false,
          reason: 'Failed to verify permissions',
          serverValidated: false,
        }
      }
    },
    [user]
  )

  /**
   * Check folder permission via backend API
   * SECURITY: Always calls backend, no client-side bypass
   */
  const checkFolderPermission = useCallback(
    async (folderId: string, permission: PermissionAction): Promise<PermissionCheckResult> => {
      const sessionId = sessionIdRef.current
      const cacheKey = `folder:${folderId}:${permission}:${user?.id}:${sessionId}`

      // Check cache (with session validation)
      const cached = permissionCache.get(cacheKey)
      if (cached && cached.sessionId === sessionId && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.result
      }

      try {
        // SECURITY: Always call backend API for permission check
        const result = await apiCheckFolderPermission(folderId, user?.id || '', permission)
        const checkResult: PermissionCheckResult = {
          allowed: result.has_permission,
          reason: result.reason,
          source: result.source,
          serverValidated: true,
        }

        // Cache the result with session ID and timestamp
        permissionCache.set(cacheKey, {
          result: checkResult,
          timestamp: Date.now(),
          sessionId,
        })

        return checkResult
      } catch (err) {
        console.error('Failed to check folder permission:', err)
        // SECURITY: On error, deny access (fail-secure)
        return {
          allowed: false,
          reason: 'Failed to verify permissions',
          serverValidated: false,
        }
      }
    },
    [user]
  )

  /**
   * Computed admin status based on server-validated permissions
   * SECURITY: Only derived from permissionSummary (from server)
   */
  const isAdmin = useMemo(() => {
    // SECURITY: Only trust server-validated permission summary
    if (!permissionSummary) {
      return false
    }
    return permissionSummary.is_superuser || false
  }, [permissionSummary])

  /**
   * Computed admin/manager status based on server-validated permissions
   * SECURITY: Derived from server permissions, not client-side user object
   */
  const isAdminOrManager = useMemo(() => {
    if (!permissionSummary) {
      return false
    }
    // Check if user has manager-level permissions from server
    const hasManagerPermission =
      permissionSummary.is_superuser ||
      permissionSummary.all_permissions?.includes('can_manage_permissions') ||
      permissionSummary.global_roles?.some(
        (role) => role.role_name === 'ADMIN' || role.role_name === 'MANAGER'
      )
    return hasManagerPermission || false
  }, [permissionSummary])

  const value = useMemo<PermissionContextValue>(
    () => ({
      permissionSummary,
      isLoading,
      error,
      hasGlobalPermission,
      hasAnyGlobalPermission,
      hasAllGlobalPermissions,
      checkDocumentPermission,
      checkFolderPermission,
      isAdminOrManager,
      isAdmin,
      refreshPermissions,
      clearPermissionCache,
      syncStatus,
      subscribeToResource,
      invalidateResourcePermission,
    }),
    [
      permissionSummary,
      isLoading,
      error,
      hasGlobalPermission,
      hasAnyGlobalPermission,
      hasAllGlobalPermissions,
      checkDocumentPermission,
      checkFolderPermission,
      isAdminOrManager,
      isAdmin,
      refreshPermissions,
      clearPermissionCache,
      syncStatus,
      subscribeToResource,
      invalidateResourcePermission,
    ]
  )

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>
}

/**
 * Hook to access permission context
 * Must be used within PermissionProvider
 */
export function usePermissions(): PermissionContextValue {
  const context = useContext(PermissionContext)
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider')
  }
  return context
}

/**
 * Hook to check if user has a specific global permission
 * @security This is for UI/UX only. Backend must enforce permissions.
 */
export function useHasPermission(permission: PermissionAction): boolean {
  const { hasGlobalPermission } = usePermissions()
  return hasGlobalPermission(permission)
}

/**
 * Hook to check if user is admin (based on server permissions)
 * @security This is for UI/UX only. Backend must enforce permissions.
 */
export function useIsAdmin(): boolean {
  const { isAdmin } = usePermissions()
  return isAdmin
}

/**
 * Hook to check if user is admin or manager (based on server permissions)
 * @security This is for UI/UX only. Backend must enforce permissions.
 */
export function useIsAdminOrManager(): boolean {
  const { isAdminOrManager } = usePermissions()
  return isAdminOrManager
}

export default PermissionContext
