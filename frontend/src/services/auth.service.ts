/**
 * Authentication Service
 * Handles all authentication-related API calls
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export interface LoginCredentials {
  username: string // Backend expects 'username' field (can be email)
  password: string
}

export interface LoginResponse {
  // Full login response (no MFA or MFA not enabled)
  access?: string
  refresh?: string
  user: {
    id: number
    username?: string
    email: string
    first_name: string
    last_name: string
    employee_id?: string
    department?: string | null
    is_staff?: boolean
    is_superuser?: boolean
    mfa_enabled: boolean
    organization_id?: string | null
    organization_name?: string | null
    organization_domain?: string | null
  }
  // MFA required response
  mfa_required?: boolean
  mfa_token?: string
  remember_me?: boolean
}

export interface PasswordResetRequest {
  email: string
}

export interface PasswordResetConfirm {
  token: string
  password: string
  password_confirm: string
}

export interface AuthError {
  detail?: string
  username?: string[]
  password?: string[]
  non_field_errors?: string[]
  locked?: boolean
  locked_until?: string
  remaining_attempts?: number
}

class AuthService {
  /**
   * Login user with email/username and password
   * @param email - Can be either email address or username
   * @param password - User's password
   * @param rememberMe - Whether to extend token lifetime
   */
  async login(
    email: string,
    password: string,
    rememberMe: boolean = false
  ): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: email, // Backend expects 'username' field (accepts both email and username)
        password: password,
        remember_me: rememberMe, // Send remember_me flag for extended token lifetime
      }),
    })

    if (!response.ok) {
      const error: AuthError = await response.json()
      // Throw the full error object so Login page can access all fields
      const customError: any = new Error(this.getErrorMessage(error))
      customError.locked = error.locked
      customError.locked_until = error.locked_until
      customError.remaining_attempts = error.remaining_attempts
      customError.fullError = error
      throw customError
    }

    return response.json()
  }

  /**
   * Logout user by blacklisting refresh token
   * @param refreshToken - Optional refresh token. If not provided, will be retrieved from storage.
   */
  async logout(refreshToken?: string): Promise<void> {
    // Get refresh token from parameter or storage
    const token = refreshToken || this.getRefreshToken()

    // Always clear tokens, even if API call fails
    try {
      // Only call API if we have both tokens
      if (token && token.trim() !== '') {
        const accessToken = this.getAccessToken()

        if (accessToken) {
          const response = await fetch(`${API_BASE_URL}/api/v1/auth/logout/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              refresh: token,
            }),
          })

          if (!response.ok) {
            // Log but don't throw - we still want to clear local tokens
            const error = await response.json()
            console.error('Logout API error:', error.detail || 'Logout failed')
          }
        }
      }
    } catch (error) {
      // Log but don't throw - we still want to clear local tokens
      console.error('Logout API call failed:', error)
    }

    // Always clear all tokens from storage
    this.clearTokens()
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<{ access: string; refresh: string }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/token/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh: refreshToken,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Token refresh failed')
    }

    return response.json()
  }

  /**
   * Request password reset email
   */
  async requestPasswordReset(email: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/password/reset/request/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Password reset request failed')
    }
  }

  /**
   * Validate password reset token
   */
  async validateResetToken(token: string): Promise<{
    valid: boolean
    detail: string
    expired?: boolean
    user_email?: string
    expires_in_minutes?: number
  }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/password/reset/validate/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    })

    return response.json()
  }

  /**
   * Confirm password reset with token
   */
  async confirmPasswordReset(
    token: string,
    password: string,
    passwordConfirm: string
  ): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/password/reset/confirm/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        password,
        password_confirm: passwordConfirm,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Password reset failed')
    }
  }

  /**
   * Store authentication tokens
   * Uses localStorage if rememberMe is true, sessionStorage otherwise
   */
  storeTokens(access: string, refresh: string, rememberMe: boolean = false): void {
    const storage = rememberMe ? localStorage : sessionStorage

    storage.setItem('access_token', access)
    storage.setItem('refresh_token', refresh)
    storage.setItem('remember_me', rememberMe.toString())
  }

  /**
   * Store user data
   */
  storeUser(user: LoginResponse['user'], rememberMe: boolean = false): void {
    const storage = rememberMe ? localStorage : sessionStorage
    storage.setItem('user', JSON.stringify(user))
  }

  /**
   * Get access token from storage
   */
  getAccessToken(): string | null {
    return localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
  }

  /**
   * Get refresh token from storage
   */
  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token')
  }

  /**
   * Get stored user data
   */
  getUser(): LoginResponse['user'] | null {
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user')
    if (!userStr) return null

    try {
      return JSON.parse(userStr)
    } catch {
      return null
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken()
  }

  /**
   * Clear all tokens and user data from storage
   */
  clearTokens(): void {
    // Clear from both localStorage and sessionStorage
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    localStorage.removeItem('remember_me')

    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('refresh_token')
    sessionStorage.removeItem('user')
    sessionStorage.removeItem('remember_me')
  }

  /**
   * Extract error message from API error response
   */
  private getErrorMessage(error: AuthError): string {
    if (error.detail) {
      return error.detail
    }

    if (error.non_field_errors && error.non_field_errors.length > 0) {
      return error.non_field_errors[0]
    }

    if (error.username && error.username.length > 0) {
      return error.username[0]
    }

    if (error.password && error.password.length > 0) {
      return error.password[0]
    }

    return 'Authentication failed. Please try again.'
  }
}

export const authService = new AuthService()
