import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

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
    const accessToken = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')

    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`
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

    // If error is 401 and we haven't retried yet, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Get refresh token from storage (check both localStorage and sessionStorage)
        const refreshToken = localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token')

        if (!refreshToken) {
          throw new Error('No refresh token available')
        }

        // Check which storage is being used
        const isLocalStorage = !!localStorage.getItem('refresh_token')
        const storage = isLocalStorage ? localStorage : sessionStorage

        // Call refresh endpoint
        const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
          refresh: refreshToken,
        })

        const { access, refresh } = response.data

        // Update stored tokens in the same storage location
        storage.setItem('access_token', access)
        if (refresh) {
          storage.setItem('refresh_token', refresh)
        }

        // Retry original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access}`
        }
        return apiClient(originalRequest)
      } catch (refreshError) {
        // Refresh failed - clear tokens and redirect to login
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        localStorage.removeItem('remember_me')
        sessionStorage.removeItem('access_token')
        sessionStorage.removeItem('refresh_token')
        sessionStorage.removeItem('user')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
