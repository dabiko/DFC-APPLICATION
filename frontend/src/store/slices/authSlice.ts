import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import { authService, type LoginCredentials, type LoginResponse } from '@services/authService'
import type { User } from '@types'

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
  remainingAttempts: number | null
  isLocked: boolean
}

const initialState: AuthState = {
  user: authService.getStoredUser(),
  isAuthenticated: authService.isAuthenticated(),
  loading: false,
  error: null,
  remainingAttempts: null,
  isLocked: false,
}

/**
 * Async thunk for user login
 */
export const loginUser = createAsyncThunk<
  LoginResponse,
  LoginCredentials,
  { rejectValue: { message: string; remainingAttempts?: number; isLocked?: boolean } }
>('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const response = await authService.login(credentials)
    // Store tokens and user data
    authService.storeAuthData({ access: response.access, refresh: response.refresh }, response.user)
    return response
  } catch (error: any) {
    const errorData = error.response?.data
    const message = errorData?.message || 'Login failed. Please try again.'
    const remainingAttempts = errorData?.remaining_attempts
    const isLocked = errorData?.is_locked || false

    return rejectWithValue({ message, remainingAttempts, isLocked })
  }
})

/**
 * Async thunk for user logout
 */
export const logoutUser = createAsyncThunk('auth/logout', async () => {
  await authService.logout()
})

/**
 * Async thunk for fetching current user profile
 */
export const fetchCurrentUser = createAsyncThunk<User, void, { rejectValue: string }>(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const user = await authService.getCurrentUser()
      // Update stored user data
      localStorage.setItem('auth_user', JSON.stringify(user))
      return user
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch user profile.'
      return rejectWithValue(message)
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Clear authentication error
     */
    clearError: (state) => {
      state.error = null
      state.remainingAttempts = null
      state.isLocked = false
    },

    /**
     * Update user data
     */
    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload
      localStorage.setItem('auth_user', JSON.stringify(action.payload))
    },

    /**
     * Restore authentication state from localStorage
     * (useful for app initialization)
     */
    restoreAuth: (state) => {
      state.user = authService.getStoredUser()
      state.isAuthenticated = authService.isAuthenticated()
    },

    /**
     * Clear authentication state
     * (useful for forced logout or token expiration)
     */
    clearAuth: (state) => {
      state.user = null
      state.isAuthenticated = false
      state.error = null
      state.remainingAttempts = null
      state.isLocked = false
      localStorage.removeItem('auth_tokens')
      localStorage.removeItem('auth_user')
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true
        // Don't clear error on pending - keep previous error visible until new response
        // This prevents errors from disappearing immediately when user submits
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false
        state.isAuthenticated = true
        state.user = action.payload.user
        state.error = null
        state.remainingAttempts = null
        state.isLocked = false
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false
        state.isAuthenticated = false
        state.user = null
        state.error = action.payload?.message || 'Login failed'
        state.remainingAttempts = action.payload?.remainingAttempts ?? null
        state.isLocked = action.payload?.isLocked ?? false
      })

    // Logout
    builder
      .addCase(logoutUser.pending, (state) => {
        state.loading = true
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.loading = false
        state.isAuthenticated = false
        state.user = null
        state.error = null
      })
      .addCase(logoutUser.rejected, (state) => {
        // Even if logout API fails, clear local state
        state.loading = false
        state.isAuthenticated = false
        state.user = null
        state.error = null
      })

    // Fetch current user
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload
        state.error = null
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to fetch user'
      })
  },
})

export const { clearError, updateUser, restoreAuth, clearAuth } = authSlice.actions

export default authSlice.reducer
