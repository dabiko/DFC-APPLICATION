/**
 * useDepartment Hook
 * Custom hook for department-related operations and state
 */

import { useCallback, useEffect, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '@/store'
import {
  fetchNavigation,
  fetchDepartmentById,
  fetchDepartmentSettings,
  fetchDepartmentStats,
  fetchMyAccessGrants,
  fetchMyAccessRequests,
  fetchRoles,
  selectDepartment,
  selectNavigation,
  selectSelectedDepartment,
  selectSelectedDepartmentId,
  selectCurrentDepartmentSettings,
  selectCurrentDepartmentStats,
  selectMyAccessGrants,
  selectMyAccessRequests,
  selectAvailableRoles,
  selectNavigationLoading,
  selectAccessLoading,
  selectDepartmentError,
  selectAccessibleDepartments,
  selectOwnDepartment,
  selectGrantedDepartments,
} from '@/store/slices/departmentSlice'
import type { Department, DepartmentNavigationItem } from '@/types/department'

interface UseDepartmentReturn {
  // Data
  navigation: DepartmentNavigationItem[]
  departments: Department[]
  selectedDepartment: Department | null
  selectedDepartmentId: number | string | null
  ownDepartment: Department | null
  grantedDepartments: Department[]
  accessGrants: ReturnType<typeof selectMyAccessGrants>
  accessRequests: ReturnType<typeof selectMyAccessRequests>
  roles: ReturnType<typeof selectAvailableRoles>
  settings: ReturnType<typeof selectCurrentDepartmentSettings>
  stats: ReturnType<typeof selectCurrentDepartmentStats>
  isGlobalAdmin: boolean

  // Loading states
  isNavigationLoading: boolean
  isAccessLoading: boolean

  // Error
  error: string | null

  // Actions
  selectDepartment: (departmentId: number | string | null) => void
  refreshNavigation: () => Promise<void>
  fetchDepartmentDetails: (departmentId: number | string) => Promise<void>
  canAccessDepartment: (departmentId: number | string) => boolean
  getDepartmentById: (departmentId: number | string) => Department | undefined
  isDepartmentOwn: (departmentId: number | string) => boolean
  isDepartmentGranted: (departmentId: number | string) => boolean
  isDepartmentAdmin: (departmentId: number | string) => boolean
}

export function useDepartment(): UseDepartmentReturn {
  const dispatch = useAppDispatch()

  // Selectors
  const navigation = useAppSelector(selectNavigation)
  const departments = useAppSelector(selectAccessibleDepartments)
  const selectedDepartment = useAppSelector(selectSelectedDepartment)
  const selectedDepartmentId = useAppSelector(selectSelectedDepartmentId)
  const ownDepartment = useAppSelector(selectOwnDepartment)
  const grantedDepartments = useAppSelector(selectGrantedDepartments)
  const accessGrants = useAppSelector(selectMyAccessGrants)
  const accessRequests = useAppSelector(selectMyAccessRequests)
  const roles = useAppSelector(selectAvailableRoles)
  const settings = useAppSelector(selectCurrentDepartmentSettings)
  const stats = useAppSelector(selectCurrentDepartmentStats)
  const isNavigationLoading = useAppSelector(selectNavigationLoading)
  const isAccessLoading = useAppSelector(selectAccessLoading)
  const error = useAppSelector(selectDepartmentError)

  // Initial fetch
  useEffect(() => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
    if (token && navigation.length === 0) {
      dispatch(fetchNavigation())
      dispatch(fetchRoles())
    }
  }, [dispatch, navigation.length])

  // Actions
  const handleSelectDepartment = useCallback(
    (departmentId: number | string | null) => {
      dispatch(selectDepartment(departmentId))
    },
    [dispatch]
  )

  const refreshNavigation = useCallback(async () => {
    await dispatch(fetchNavigation())
    dispatch(fetchMyAccessGrants())
    dispatch(fetchMyAccessRequests())
  }, [dispatch])

  const fetchDepartmentDetails = useCallback(
    async (departmentId: number | string) => {
      await Promise.all([
        dispatch(fetchDepartmentById(departmentId)),
        dispatch(fetchDepartmentSettings(departmentId)),
        dispatch(fetchDepartmentStats(departmentId)),
      ])
    },
    [dispatch]
  )

  const canAccessDepartment = useCallback(
    (departmentId: number | string): boolean => {
      const navItem = navigation.find(
        (n) => n.department.id === departmentId || String(n.department.id) === String(departmentId)
      )
      return navItem?.isAccessible ?? false
    },
    [navigation]
  )

  const getDepartmentById = useCallback(
    (departmentId: number | string): Department | undefined => {
      const navItem = navigation.find(
        (n) => n.department.id === departmentId || String(n.department.id) === String(departmentId)
      )
      return navItem?.department
    },
    [navigation]
  )

  const isDepartmentOwn = useCallback(
    (departmentId: number | string): boolean => {
      const navItem = navigation.find(
        (n) => n.department.id === departmentId || String(n.department.id) === String(departmentId)
      )
      return navItem?.accessType === 'own'
    },
    [navigation]
  )

  const isDepartmentGranted = useCallback(
    (departmentId: number | string): boolean => {
      const navItem = navigation.find(
        (n) => n.department.id === departmentId || String(n.department.id) === String(departmentId)
      )
      return navItem?.accessType === 'granted'
    },
    [navigation]
  )

  const isDepartmentAdmin = useCallback(
    (departmentId: number | string): boolean => {
      const navItem = navigation.find(
        (n) => n.department.id === departmentId || String(n.department.id) === String(departmentId)
      )
      return navItem?.accessType === 'admin'
    },
    [navigation]
  )

  const isGlobalAdmin = useMemo(() => {
    // Check if any department has admin access type
    return navigation.some((n) => n.accessType === 'admin')
  }, [navigation])

  return {
    // Data
    navigation,
    departments,
    selectedDepartment,
    selectedDepartmentId,
    ownDepartment,
    grantedDepartments,
    accessGrants,
    accessRequests,
    roles,
    settings,
    stats,
    isGlobalAdmin,

    // Loading states
    isNavigationLoading,
    isAccessLoading,

    // Error
    error,

    // Actions
    selectDepartment: handleSelectDepartment,
    refreshNavigation,
    fetchDepartmentDetails,
    canAccessDepartment,
    getDepartmentById,
    isDepartmentOwn,
    isDepartmentGranted,
    isDepartmentAdmin,
  }
}

/**
 * Role permissions mapping - what each role can do
 */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  VIEWER: ['view', 'download'],
  EDITOR: ['view', 'download', 'upload', 'edit'],
  MANAGER: ['view', 'download', 'upload', 'edit', 'delete', 'share'],
  ADMIN: ['view', 'download', 'upload', 'edit', 'delete', 'share', 'manage'],
}

/**
 * Hook for checking department access permissions
 */
export function useDepartmentAccess(departmentId?: number | string | null) {
  const {
    navigation,
    canAccessDepartment,
    isDepartmentOwn,
    isDepartmentGranted,
    isDepartmentAdmin,
    isGlobalAdmin,
  } = useDepartment()

  return useMemo(() => {
    if (!departmentId) {
      return {
        canAccess: false,
        isOwn: false,
        isGranted: false,
        isAdmin: false,
        accessType: null as 'own' | 'granted' | 'admin' | null,
        grantedRole: null as string | null,
        // Permission action helpers
        canView: false,
        canDownload: false,
        canUpload: false,
        canEdit: false,
        canDelete: false,
        canShare: false,
        canManage: false,
        canCreateFolder: false,
        canCreateDocument: false,
      }
    }

    const navItem = navigation.find(
      (n) => n.department.id === departmentId || String(n.department.id) === String(departmentId)
    )

    const isAdmin = isDepartmentAdmin(departmentId) || isGlobalAdmin
    const role = navItem?.grantedRole?.toUpperCase() || null
    const accessType = navItem?.accessType || null

    // Get permissions based on role
    const rolePermissions = role ? ROLE_PERMISSIONS[role] || [] : []

    // Own department members have EDITOR-level permissions by default
    const isOwn = isDepartmentOwn(departmentId)
    const effectivePermissions = isAdmin
      ? ROLE_PERMISSIONS.ADMIN
      : isOwn && rolePermissions.length === 0
        ? ROLE_PERMISSIONS.EDITOR
        : rolePermissions

    const hasPermission = (action: string) => isAdmin || effectivePermissions.includes(action)

    return {
      canAccess: canAccessDepartment(departmentId),
      isOwn,
      isGranted: isDepartmentGranted(departmentId),
      isAdmin,
      accessType,
      grantedRole: navItem?.grantedRole || null,
      // Permission action helpers
      canView: hasPermission('view'),
      canDownload: hasPermission('download'),
      canUpload: hasPermission('upload'),
      canEdit: hasPermission('edit'),
      canDelete: hasPermission('delete'),
      canShare: hasPermission('share'),
      canManage: hasPermission('manage'),
      canCreateFolder: hasPermission('upload'),
      canCreateDocument: hasPermission('upload'),
    }
  }, [
    departmentId,
    navigation,
    canAccessDepartment,
    isDepartmentOwn,
    isDepartmentGranted,
    isDepartmentAdmin,
    isGlobalAdmin,
  ])
}

export default useDepartment
