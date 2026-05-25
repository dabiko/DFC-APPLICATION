import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

// Token refresh state - prevents multiple simultaneous refresh attempts
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: any) => void
}> = []

// Account deactivation state - prevents multiple modals
let deactivationHandled = false

// Maintenance mode state - prevents multiple events
let maintenanceHandled = false

// Reset refresh state on module load (handles page navigation/reload)
console.log('🔧 apiClient initialized, isRefreshing reset to false')

const processQueue = (error: any, token: string | null = null) => {
  console.log('🔄 Processing queue:', { queueLength: failedQueue.length, hasError: !!error })
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token!)
    }
  })
  failedQueue = []
}

// Export function to reset refresh state (for debugging)
export const resetRefreshState = () => {
  isRefreshing = false
  failedQueue = []
  console.log('🔧 Refresh state manually reset')
}

/**
 * Dispatch a custom event when the platform enters maintenance mode.
 * React components listen to show the full-screen maintenance page.
 */
function dispatchMaintenanceMode(detail: {
  message: string
  estimatedEnd: string | null
  startedAt: string | null
}) {
  if (maintenanceHandled) return
  maintenanceHandled = true
  window.dispatchEvent(new CustomEvent('maintenance-mode-detected', { detail }))
}

export function resetMaintenanceState() {
  maintenanceHandled = false
}

/**
 * Dispatch a custom event when an account is deactivated.
 * React components can listen for this to show a modal.
 */
function dispatchAccountDeactivated() {
  if (deactivationHandled) return
  deactivationHandled = true

  window.dispatchEvent(new CustomEvent('account-deactivated'))
}

/**
 * Clear all auth tokens from both storages.
 */
function clearAllTokens() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
  localStorage.removeItem('remember_me')
  sessionStorage.removeItem('access_token')
  sessionStorage.removeItem('refresh_token')
  sessionStorage.removeItem('user')
}

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - attach access token to all requests
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Check both localStorage and sessionStorage for tokens
    // (auth.service.ts stores them based on "Remember Me" checkbox)
    const accessToken =
      localStorage.getItem('access_token') || sessionStorage.getItem('access_token')

    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`
      // Debug: Log first request after login
      console.log('📤 API Request:', {
        url: config.url,
        hasToken: !!accessToken,
        tokenPreview: accessToken.substring(0, 30) + '...',
      })
    } else {
      console.log('📤 API Request (no token):', config.url)
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - handle token refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Suppress 404 errors for search endpoints in development (API not implemented yet)
    const isSearchEndpoint = originalRequest?.url?.includes('/search/')
    const is404 = error.response?.status === 404
    const isDev = import.meta.env.DEV

    if (!(isSearchEndpoint && is404 && isDev)) {
      console.log('🔴 API Error:', {
        status: error.response?.status,
        url: originalRequest?.url,
        isRefreshing,
        queueLength: failedQueue.length,
      })
    }

    const errorData = error.response?.data as {
      code?: string
      detail?: string
      user_id?: string
      estimated_end?: string | null
      started_at?: string | null
    }

    // Handle maintenance mode (503) — show the maintenance page
    if (error.response?.status === 503 && errorData?.code === 'maintenance_mode') {
      dispatchMaintenanceMode({
        message: errorData.detail || 'The platform is under maintenance.',
        estimatedEnd: errorData.estimated_end ?? null,
        startedAt: errorData.started_at ?? null,
      })
      return Promise.reject(error)
    }

    // Check for account deactivated error (can come from any authenticated endpoint or token refresh)
    if (errorData?.code === 'account_deactivated') {
      console.log('🚫 Account deactivated - showing modal and clearing session')

      clearAllTokens()

      // Dispatch event so the React app can show a modal
      dispatchAccountDeactivated()

      return Promise.reject(error)
    }

    // If error is 401 and we haven't retried yet, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Check if this is an MFA required error - user needs to re-authenticate with MFA
      if (errorData?.code === 'mfa_required') {
        console.log('🔐 MFA verification required - redirecting to login')

        clearAllTokens()

        // Redirect to login with a message
        if (!window.location.pathname.includes('/login')) {
          // Store a flag to show MFA required message on login page
          sessionStorage.setItem('mfa_reverification_required', 'true')
          window.location.href = '/login?reason=mfa_required'
        }

        return Promise.reject(error)
      }

      // If already refreshing, queue this request
      if (isRefreshing) {
        console.log('🔄 Token refresh in progress, queuing request:', originalRequest?.url)
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`
              }
              resolve(apiClient(originalRequest))
            },
            reject: (err: any) => {
              reject(err)
            },
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      console.log(
        '🔄 Attempting token refresh... (first request to trigger refresh:',
        originalRequest?.url,
        ')'
      )

      try {
        // Get refresh token from storage (check both localStorage and sessionStorage)
        const refreshToken =
          localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token')

        if (!refreshToken) {
          console.error('❌ No refresh token available')
          isRefreshing = false
          processQueue(new Error('No refresh token available'), null)
          throw new Error('No refresh token available')
        }

        // Check which storage is being used
        const isLocalStorage = !!localStorage.getItem('refresh_token')
        const storage = isLocalStorage ? localStorage : sessionStorage

        // Call refresh endpoint
        console.log(
          '🔄 Calling refresh endpoint with token:',
          refreshToken?.substring(0, 30) + '...'
        )
        const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
          refresh: refreshToken,
        })

        console.log('✅ Token refresh successful:', response.data)
        const { access, refresh } = response.data

        // Update stored tokens in the same storage location
        storage.setItem('access_token', access)
        if (refresh) {
          storage.setItem('refresh_token', refresh)
        }

        isRefreshing = false
        processQueue(null, access)

        // Retry original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access}`
        }
        return apiClient(originalRequest)
      } catch (refreshError: any) {
        // Refresh failed - check if it's because account was deactivated
        const refreshErrorData = refreshError?.response?.data as { code?: string }
        if (refreshErrorData?.code === 'account_deactivated') {
          console.log('🚫 Account deactivated (detected during token refresh)')
          isRefreshing = false
          processQueue(refreshError, null)
          clearAllTokens()
          dispatchAccountDeactivated()
          return Promise.reject(refreshError)
        }

        // Refresh failed for other reasons (session expired)
        console.error('❌ Token refresh failed:', {
          status: refreshError?.response?.status,
          data: refreshError?.response?.data,
          message: refreshError?.message,
        })

        isRefreshing = false
        processQueue(refreshError, null)

        // Fire-and-forget: log session expiry to audit trail
        try {
          const accessToken =
            localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
          if (accessToken && refreshToken) {
            axios
              .post(
                `${API_BASE_URL}/auth/logout/`,
                { refresh: refreshToken, reason: 'session_expired' },
                { headers: { Authorization: `Bearer ${accessToken}` } }
              )
              .catch(() => {}) // best-effort, don't block redirect
          }
        } catch {
          // ignore
        }

        clearAllTokens()

        // Only redirect if we're not already on the login page
        if (!window.location.pathname.includes('/login')) {
          console.log('🔄 Redirecting to login page...')
          window.location.href = '/login'
        }

        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
