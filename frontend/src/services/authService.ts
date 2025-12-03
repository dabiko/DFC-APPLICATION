import apiClient from './apiClient'
import type { User, ApiResponse } from '@types'

export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginResponse {
  access: string
  refresh: string
  user: User
}

export interface ChangePasswordData {
  oldPassword: string
  newPassword: string
}

export interface TokenRefreshResponse {
  access: string
}

/**
 * Authentication Service
 * Handles all authentication-related API calls
 */
export const authService = {
  /**
   * Login user with email and password
   */
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login/', credentials)
    return response.data.data
  },

  /**
   * Logout user (invalidate refresh token on server)
   */
  logout: async (): Promise<void> => {
    // Get refresh token from either localStorage or sessionStorage
    const refreshToken =
      localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token')

    // Only call API if we have a valid refresh token
    if (refreshToken && refreshToken.trim() !== '') {
      try {
        await apiClient.post('/auth/logout/', { refresh: refreshToken })
      } catch (error) {
        // Continue with logout even if API call fails
        console.error('Logout API call failed:', error)
      }
    }

    // Clear all auth data from both storages regardless of API call result
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    localStorage.removeItem('remember_me')
    localStorage.removeItem('auth_tokens')
    localStorage.removeItem('auth_user')

    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('refresh_token')
    sessionStorage.removeItem('user')
  },

  /**
   * Refresh access token using refresh token
   */
  refreshToken: async (refreshToken: string): Promise<TokenRefreshResponse> => {
    const response = await apiClient.post<ApiResponse<TokenRefreshResponse>>('/auth/refresh/', {
      refresh: refreshToken,
    })
    return response.data.data
  },

  /**
   * Get current user profile
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>('/auth/profile/')
    return response.data.data
  },

  /**
   * Change user password
   */
  changePassword: async (data: ChangePasswordData): Promise<void> => {
    await apiClient.post('/auth/change-password/', {
      old_password: data.oldPassword,
      new_password: data.newPassword,
    })
  },

  /**
   * Request password reset email
   */
  requestPasswordReset: async (email: string): Promise<void> => {
    await apiClient.post('/auth/password-reset/', { email })
  },

  /**
   * Reset password with token
   */
  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await apiClient.post('/auth/password-reset/confirm/', {
      token,
      new_password: newPassword,
    })
  },

  /**
   * Verify if user is authenticated (has valid token)
   */
  isAuthenticated: (): boolean => {
    const tokens = localStorage.getItem('auth_tokens')
    return !!tokens
  },

  /**
   * Get stored access token
   */
  getAccessToken: (): string | null => {
    const tokens = localStorage.getItem('auth_tokens')
    if (tokens) {
      const { accessToken } = JSON.parse(tokens)
      return accessToken
    }
    return null
  },

  /**
   * Get stored user data
   */
  getStoredUser: (): User | null => {
    const user = localStorage.getItem('auth_user')
    if (user) {
      return JSON.parse(user)
    }
    return null
  },

  /**
   * Store authentication data
   */
  storeAuthData: (tokens: { access: string; refresh: string }, user: User): void => {
    localStorage.setItem(
      'auth_tokens',
      JSON.stringify({
        accessToken: tokens.access,
        refreshToken: tokens.refresh,
      })
    )
    localStorage.setItem('auth_user', JSON.stringify(user))
  },
}
