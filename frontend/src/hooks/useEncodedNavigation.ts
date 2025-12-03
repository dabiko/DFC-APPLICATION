/**
 * useEncodedNavigation Hook
 * Provides encoded navigation utilities for department and folder IDs
 *
 * This hook wraps URL parameters with encoding/decoding to:
 * 1. Obfuscate database IDs in URLs
 * 2. Provide a cleaner API for navigation
 * 3. Maintain backward compatibility with plain IDs
 */

import { useSearchParams, useNavigate } from 'react-router-dom'
import { useMemo, useCallback } from 'react'
import { encodeId, decodeId } from '@/utils/urlEncoding'

// Feature flag for enabling encoded URLs (can be controlled via environment)
const ENABLE_ENCODED_URLS = true // Set to true to enable encoded URLs

interface EncodedNavigationResult {
  // Decoded IDs from URL (safe to use in API calls)
  departmentId: string | null
  folderId: string | null

  // Raw URL values (for debugging)
  rawDepartmentParam: string | null
  rawFolderParam: string | null

  // Navigation functions
  navigateToDashboard: () => void
  navigateToDepartment: (departmentId: string | number) => void
  navigateToFolder: (folderId: string | number, departmentId?: string | number | null) => void
  navigateToFolderInDepartment: (folderId: string | number, departmentId: string | number) => void

  // URL building utilities
  getDepartmentUrl: (departmentId: string | number) => string
  getFolderUrl: (folderId: string | number, departmentId?: string | number | null) => string
}

/**
 * Hook for handling encoded navigation in the dashboard
 *
 * @example
 * const { departmentId, folderId, navigateToDepartment, navigateToFolder } = useEncodedNavigation()
 *
 * // Navigate to a department (ID will be encoded if feature is enabled)
 * navigateToDepartment(36)
 *
 * // Get decoded IDs for API calls
 * const docs = await getDocuments({ departmentId, folderId })
 */
export function useEncodedNavigation(): EncodedNavigationResult {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Get raw params from URL
  const rawDepartmentParam = searchParams.get('department')
  const rawFolderParam = searchParams.get('folder')

  // Decode IDs (handles both encoded and plain IDs)
  const departmentId = useMemo(() => {
    if (!rawDepartmentParam) return null
    // If encoded URLs are disabled, return as-is
    if (!ENABLE_ENCODED_URLS) return rawDepartmentParam
    // Try to decode, fallback to raw value
    const decoded = decodeId(rawDepartmentParam)
    return decoded || rawDepartmentParam
  }, [rawDepartmentParam])

  const folderId = useMemo(() => {
    if (!rawFolderParam) return null
    // If encoded URLs are disabled, return as-is
    if (!ENABLE_ENCODED_URLS) return rawFolderParam
    // Try to decode, fallback to raw value
    const decoded = decodeId(rawFolderParam)
    return decoded || rawFolderParam
  }, [rawFolderParam])

  // Encode ID for URL if feature is enabled
  const encodeForUrl = useCallback((id: string | number): string => {
    if (!ENABLE_ENCODED_URLS) return String(id)
    return encodeId(id)
  }, [])

  // Navigation functions
  const navigateToDashboard = useCallback(() => {
    navigate('/dashboard')
  }, [navigate])

  const navigateToDepartment = useCallback(
    (deptId: string | number) => {
      const encoded = encodeForUrl(deptId)
      navigate(`/dashboard?department=${encoded}`)
    },
    [navigate, encodeForUrl]
  )

  const navigateToFolder = useCallback(
    (folderIdParam: string | number, deptId?: string | number | null) => {
      const encodedFolder = encodeForUrl(folderIdParam)
      if (deptId) {
        const encodedDept = encodeForUrl(deptId)
        navigate(`/dashboard?folder=${encodedFolder}&department=${encodedDept}`)
      } else {
        navigate(`/dashboard?folder=${encodedFolder}`)
      }
    },
    [navigate, encodeForUrl]
  )

  const navigateToFolderInDepartment = useCallback(
    (folderIdParam: string | number, deptId: string | number) => {
      const encodedFolder = encodeForUrl(folderIdParam)
      const encodedDept = encodeForUrl(deptId)
      navigate(`/dashboard?folder=${encodedFolder}&department=${encodedDept}`)
    },
    [navigate, encodeForUrl]
  )

  // URL building utilities
  const getDepartmentUrl = useCallback(
    (deptId: string | number): string => {
      const encoded = encodeForUrl(deptId)
      return `/dashboard?department=${encoded}`
    },
    [encodeForUrl]
  )

  const getFolderUrl = useCallback(
    (folderIdParam: string | number, deptId?: string | number | null): string => {
      const encodedFolder = encodeForUrl(folderIdParam)
      if (deptId) {
        const encodedDept = encodeForUrl(deptId)
        return `/dashboard?folder=${encodedFolder}&department=${encodedDept}`
      }
      return `/dashboard?folder=${encodedFolder}`
    },
    [encodeForUrl]
  )

  return {
    departmentId,
    folderId,
    rawDepartmentParam,
    rawFolderParam,
    navigateToDashboard,
    navigateToDepartment,
    navigateToFolder,
    navigateToFolderInDepartment,
    getDepartmentUrl,
    getFolderUrl,
  }
}

export default useEncodedNavigation
