/**
 * usePermission Hook
 *
 * Provides permission checking for specific resources (documents, folders).
 * Returns permission state with loading status.
 *
 * SECURITY NOTE:
 * - All permission checks call the backend API for validation
 * - No client-side bypasses for admin/owner (backend handles this)
 * - These hooks are for UI/UX only - backend must enforce permissions
 * - isOwner flag is informational only, not used for permission decisions
 *
 * Usage:
 * ```tsx
 * // For a document
 * const { canView, canEdit, canDelete, canShare, isLoading } = useDocumentPermission(document)
 *
 * // For a folder
 * const { canView, canEdit, canDelete, canUpload, isLoading } = useFolderPermission(folder)
 *
 * // Generic resource check
 * const { hasPermission, isLoading } = useResourcePermission('document', documentId, 'can_edit')
 * ```
 */

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions, type PermissionAction } from '@/contexts/PermissionContext'

// Resource types
export interface DocumentResource {
  id: string
  owner_id?: string
  owner?: { id: string }
  folder_id?: string
}

export interface FolderResource {
  id: string
  owner_id?: string
  owner?: { id: string }
  department_id?: string
}

// Permission state
export interface ResourcePermissionState {
  canView: boolean
  canDownload: boolean
  canEdit: boolean
  canDelete: boolean
  canShare: boolean
  canManagePermissions: boolean
  /** Informational only - not used for permission decisions */
  isOwner: boolean
  isLoading: boolean
  error: string | null
  /** Indicates if permissions were validated by server */
  serverValidated: boolean
}

export interface FolderPermissionState extends ResourcePermissionState {
  canUpload: boolean
  canCreateSubfolder: boolean
}

/**
 * Hook to check permissions for a document
 *
 * SECURITY: Always checks permissions via backend API.
 * No client-side bypasses - backend determines actual permissions.
 */
export function useDocumentPermission(
  document: DocumentResource | null | undefined
): ResourcePermissionState {
  const { user } = useAuth()
  const { checkDocumentPermission } = usePermissions()

  const [permissions, setPermissions] = useState<ResourcePermissionState>({
    canView: false,
    canDownload: false,
    canEdit: false,
    canDelete: false,
    canShare: false,
    canManagePermissions: false,
    isOwner: false,
    isLoading: true,
    error: null,
    serverValidated: false,
  })

  // isOwner is informational only - not used for permission decisions
  const isOwner = useMemo(() => {
    if (!document || !user) return false
    const ownerId = document.owner_id || document.owner?.id
    return ownerId === user.id
  }, [document, user])

  useEffect(() => {
    if (!document?.id || !user?.id) {
      setPermissions((prev) => ({
        ...prev,
        isLoading: false,
        serverValidated: false,
      }))
      return
    }

    // SECURITY: Always check permissions via backend API
    // Backend will handle admin/owner checks server-side
    const checkPermissions = async () => {
      setPermissions((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        const [viewResult, downloadResult, editResult, deleteResult, shareResult, manageResult] =
          await Promise.all([
            checkDocumentPermission(document.id, 'can_view'),
            checkDocumentPermission(document.id, 'can_download'),
            checkDocumentPermission(document.id, 'can_edit'),
            checkDocumentPermission(document.id, 'can_delete'),
            checkDocumentPermission(document.id, 'can_share'),
            checkDocumentPermission(document.id, 'can_manage_permissions'),
          ])

        setPermissions({
          canView: viewResult.allowed,
          canDownload: downloadResult.allowed,
          canEdit: editResult.allowed,
          canDelete: deleteResult.allowed,
          canShare: shareResult.allowed,
          canManagePermissions: manageResult.allowed,
          isOwner,
          isLoading: false,
          error: null,
          serverValidated: viewResult.serverValidated,
        })
      } catch (err) {
        console.error('Failed to check document permissions:', err)
        // SECURITY: On error, deny all permissions (fail-secure)
        setPermissions({
          canView: false,
          canDownload: false,
          canEdit: false,
          canDelete: false,
          canShare: false,
          canManagePermissions: false,
          isOwner,
          isLoading: false,
          error: 'Failed to check permissions',
          serverValidated: false,
        })
      }
    }

    checkPermissions()
  }, [document?.id, user?.id, isOwner, checkDocumentPermission])

  return permissions
}

/**
 * Hook to check permissions for a folder
 *
 * SECURITY: Always checks permissions via backend API.
 * No client-side bypasses - backend determines actual permissions.
 */
export function useFolderPermission(
  folder: FolderResource | null | undefined
): FolderPermissionState {
  const { user } = useAuth()
  const { checkFolderPermission } = usePermissions()

  const [permissions, setPermissions] = useState<FolderPermissionState>({
    canView: false,
    canDownload: false,
    canEdit: false,
    canDelete: false,
    canShare: false,
    canManagePermissions: false,
    canUpload: false,
    canCreateSubfolder: false,
    isOwner: false,
    isLoading: true,
    error: null,
    serverValidated: false,
  })

  // isOwner is informational only - not used for permission decisions
  const isOwner = useMemo(() => {
    if (!folder || !user) return false
    const ownerId = folder.owner_id || folder.owner?.id
    return ownerId === user.id
  }, [folder, user])

  useEffect(() => {
    if (!folder?.id || !user?.id) {
      setPermissions((prev) => ({
        ...prev,
        isLoading: false,
        serverValidated: false,
      }))
      return
    }

    // SECURITY: Always check permissions via backend API
    // Backend will handle admin/owner checks server-side
    const checkPermissions = async () => {
      setPermissions((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        const [viewResult, editResult, deleteResult, shareResult, manageResult, uploadResult] =
          await Promise.all([
            checkFolderPermission(folder.id, 'can_view'),
            checkFolderPermission(folder.id, 'can_edit'),
            checkFolderPermission(folder.id, 'can_delete'),
            checkFolderPermission(folder.id, 'can_share'),
            checkFolderPermission(folder.id, 'can_manage_permissions'),
            checkFolderPermission(folder.id, 'can_upload'),
          ])

        setPermissions({
          canView: viewResult.allowed,
          canDownload: viewResult.allowed, // If can view folder, can download its contents
          canEdit: editResult.allowed,
          canDelete: deleteResult.allowed,
          canShare: shareResult.allowed,
          canManagePermissions: manageResult.allowed,
          canUpload: uploadResult.allowed,
          canCreateSubfolder: editResult.allowed, // Same as edit
          isOwner,
          isLoading: false,
          error: null,
          serverValidated: viewResult.serverValidated,
        })
      } catch (err) {
        console.error('Failed to check folder permissions:', err)
        // SECURITY: On error, deny all permissions (fail-secure)
        setPermissions({
          canView: false,
          canDownload: false,
          canEdit: false,
          canDelete: false,
          canShare: false,
          canManagePermissions: false,
          canUpload: false,
          canCreateSubfolder: false,
          isOwner,
          isLoading: false,
          error: 'Failed to check permissions',
          serverValidated: false,
        })
      }
    }

    checkPermissions()
  }, [folder?.id, user?.id, isOwner, checkFolderPermission])

  return permissions
}

/**
 * Hook to check a single permission for a resource
 *
 * SECURITY: Always checks via backend API.
 */
export function useResourcePermission(
  resourceType: 'document' | 'folder',
  resourceId: string | undefined,
  permission: PermissionAction
): { hasPermission: boolean; isLoading: boolean; error: string | null; serverValidated: boolean } {
  const { user } = useAuth()
  const { checkDocumentPermission, checkFolderPermission } = usePermissions()

  const [state, setState] = useState({
    hasPermission: false,
    isLoading: true,
    error: null as string | null,
    serverValidated: false,
  })

  useEffect(() => {
    if (!resourceId || !user?.id) {
      setState({ hasPermission: false, isLoading: false, error: null, serverValidated: false })
      return
    }

    // SECURITY: Always check via backend API
    const checkPermission = async () => {
      setState((prev) => ({ ...prev, isLoading: true }))

      try {
        const result =
          resourceType === 'document'
            ? await checkDocumentPermission(resourceId, permission)
            : await checkFolderPermission(resourceId, permission)

        setState({
          hasPermission: result.allowed,
          isLoading: false,
          error: null,
          serverValidated: result.serverValidated,
        })
      } catch (err) {
        console.error(`Failed to check ${resourceType} permission:`, err)
        // SECURITY: On error, deny permission (fail-secure)
        setState({
          hasPermission: false,
          isLoading: false,
          error: 'Failed to check permission',
          serverValidated: false,
        })
      }
    }

    checkPermission()
  }, [
    resourceType,
    resourceId,
    permission,
    user?.id,
    checkDocumentPermission,
    checkFolderPermission,
  ])

  return state
}

/**
 * Hook to check multiple permissions at once
 *
 * SECURITY: Always checks via backend API.
 */
export function useMultiplePermissions(
  resourceType: 'document' | 'folder',
  resourceId: string | undefined,
  permissions: PermissionAction[]
): {
  permissions: Record<PermissionAction, boolean>
  isLoading: boolean
  error: string | null
  serverValidated: boolean
} {
  const { user } = useAuth()
  const { checkDocumentPermission, checkFolderPermission } = usePermissions()

  const [state, setState] = useState<{
    permissions: Record<PermissionAction, boolean>
    isLoading: boolean
    error: string | null
    serverValidated: boolean
  }>({
    permissions: permissions.reduce(
      (acc, p) => ({ ...acc, [p]: false }),
      {} as Record<PermissionAction, boolean>
    ),
    isLoading: true,
    error: null,
    serverValidated: false,
  })

  useEffect(() => {
    if (!resourceId || !user?.id) {
      setState((prev) => ({ ...prev, isLoading: false, serverValidated: false }))
      return
    }

    // SECURITY: Always check via backend API
    const checkPermissions = async () => {
      setState((prev) => ({ ...prev, isLoading: true }))

      try {
        const checkFn =
          resourceType === 'document' ? checkDocumentPermission : checkFolderPermission

        const results = await Promise.all(permissions.map((p) => checkFn(resourceId, p)))

        const permissionMap = permissions.reduce(
          (acc, p, i) => ({ ...acc, [p]: results[i].allowed }),
          {} as Record<PermissionAction, boolean>
        )

        setState({
          permissions: permissionMap,
          isLoading: false,
          error: null,
          serverValidated: results.length > 0 ? results[0].serverValidated : false,
        })
      } catch (err) {
        console.error('Failed to check permissions:', err)
        // SECURITY: On error, deny all permissions (fail-secure)
        setState({
          permissions: permissions.reduce(
            (acc, p) => ({ ...acc, [p]: false }),
            {} as Record<PermissionAction, boolean>
          ),
          isLoading: false,
          error: 'Failed to check permissions',
          serverValidated: false,
        })
      }
    }

    checkPermissions()
  }, [
    resourceType,
    resourceId,
    permissions.join(','),
    user?.id,
    checkDocumentPermission,
    checkFolderPermission,
  ])

  return state
}

// NOTE: useQuickPermissionCheck has been REMOVED for security reasons
// It was making client-side permission decisions without backend validation
// All permission checks must go through the backend API

export default useDocumentPermission
