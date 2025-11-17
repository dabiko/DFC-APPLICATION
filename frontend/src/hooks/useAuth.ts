import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@store'
import { loginUser, logoutUser, fetchCurrentUser, clearError } from '@store/slices/authSlice'
import type { LoginCredentials } from '@services/authService'

/**
 * Custom hook for authentication
 * Provides easy access to auth state and actions
 *
 * @example
 * ```tsx
 * const { user, isAuthenticated, login, logout, loading, error } = useAuth()
 *
 * const handleLogin = async () => {
 *   await login({ email: 'user@example.com', password: 'password' })
 * }
 * ```
 */
export const useAuth = () => {
  const dispatch = useAppDispatch()
  const { user, isAuthenticated, loading, error, remainingAttempts, isLocked } = useAppSelector(
    (state) => state.auth
  )

  /**
   * Login user
   */
  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const result = await dispatch(loginUser(credentials))
      return result
    },
    [dispatch]
  )

  /**
   * Logout user
   */
  const logout = useCallback(async () => {
    await dispatch(logoutUser())
  }, [dispatch])

  /**
   * Fetch current user profile
   */
  const refreshUser = useCallback(async () => {
    await dispatch(fetchCurrentUser())
  }, [dispatch])

  /**
   * Clear authentication error
   */
  const clearAuthError = useCallback(() => {
    dispatch(clearError())
  }, [dispatch])

  /**
   * Check if user has specific role
   */
  const hasRole = useCallback(
    (role: string | string[]) => {
      if (!user) return false
      const roles = Array.isArray(role) ? role : [role]
      return roles.includes(user.role)
    },
    [user]
  )

  /**
   * Check if user belongs to specific department
   */
  const hasDepartment = useCallback(
    (department: string | string[]) => {
      if (!user) return false
      const departments = Array.isArray(department) ? department : [department]
      return departments.includes(user.department)
    },
    [user]
  )

  return {
    // State
    user,
    isAuthenticated,
    loading,
    error,
    remainingAttempts,
    isLocked,

    // Actions
    login,
    logout,
    refreshUser,
    clearAuthError,

    // Utilities
    hasRole,
    hasDepartment,
  }
}
