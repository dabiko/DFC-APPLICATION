/**
 * Department Redux Slice
 * State management for department operations in Department-as-Root architecture
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type {
  Department,
  DepartmentNavigationItem,
  CrossDepartmentAccess,
  CrossDepartmentAccessRequest,
  DepartmentSettings,
  DepartmentStats,
  DepartmentRole,
  CreateAccessRequestData,
  GrantAccessData,
  ReviewAccessRequestData,
} from '@/types/department'
import departmentService, { handleDepartmentError } from '@/services/departmentService'

interface DepartmentState {
  // Core department data
  departments: Department[]
  navigation: DepartmentNavigationItem[]
  selectedDepartmentId: number | string | null
  selectedDepartment: Department | null
  currentDepartmentSettings: DepartmentSettings | null
  currentDepartmentStats: DepartmentStats | null

  // Cross-department access
  myAccessGrants: CrossDepartmentAccess[]
  departmentAccessGrants: CrossDepartmentAccess[]
  myAccessRequests: CrossDepartmentAccessRequest[]
  pendingAccessRequests: CrossDepartmentAccessRequest[]

  // Roles
  availableRoles: DepartmentRole[]

  // UI state
  expandedDepartmentIds: (number | string)[]
  loading: boolean
  navigationLoading: boolean
  accessLoading: boolean
  error: string | null
}

const initialState: DepartmentState = {
  departments: [],
  navigation: [],
  selectedDepartmentId: null,
  selectedDepartment: null,
  currentDepartmentSettings: null,
  currentDepartmentStats: null,

  myAccessGrants: [],
  departmentAccessGrants: [],
  myAccessRequests: [],
  pendingAccessRequests: [],

  availableRoles: [],

  expandedDepartmentIds: [],
  loading: false,
  navigationLoading: false,
  accessLoading: false,
  error: null,
}

// ============ Async Thunks ============

// Fetch all departments
export const fetchDepartments = createAsyncThunk(
  'department/fetchDepartments',
  async (_, { rejectWithValue }) => {
    try {
      const departments = await departmentService.getDepartments()
      return departments
    } catch (error) {
      return rejectWithValue(handleDepartmentError(error))
    }
  }
)

// Fetch navigation (accessible departments)
export const fetchNavigation = createAsyncThunk(
  'department/fetchNavigation',
  async (_, { rejectWithValue }) => {
    try {
      const navigation = await departmentService.getNavigation()
      return navigation
    } catch (error) {
      return rejectWithValue(handleDepartmentError(error))
    }
  }
)

// Fetch department by ID
export const fetchDepartmentById = createAsyncThunk(
  'department/fetchDepartmentById',
  async (departmentId: number | string, { rejectWithValue }) => {
    try {
      const department = await departmentService.getDepartmentById(departmentId)
      return department
    } catch (error) {
      return rejectWithValue(handleDepartmentError(error))
    }
  }
)

// Fetch department settings
export const fetchDepartmentSettings = createAsyncThunk(
  'department/fetchDepartmentSettings',
  async (departmentId: number | string, { rejectWithValue }) => {
    try {
      const settings = await departmentService.getDepartmentSettings(departmentId)
      return settings
    } catch (error) {
      return rejectWithValue(handleDepartmentError(error))
    }
  }
)

// Fetch department stats
export const fetchDepartmentStats = createAsyncThunk(
  'department/fetchDepartmentStats',
  async (departmentId: number | string, { rejectWithValue }) => {
    try {
      const stats = await departmentService.getDepartmentStats(departmentId)
      return stats
    } catch (error) {
      return rejectWithValue(handleDepartmentError(error))
    }
  }
)

// Fetch my access grants
export const fetchMyAccessGrants = createAsyncThunk(
  'department/fetchMyAccessGrants',
  async (_, { rejectWithValue }) => {
    try {
      const grants = await departmentService.getMyAccessGrants()
      return grants
    } catch (error) {
      return rejectWithValue(handleDepartmentError(error))
    }
  }
)

// Fetch department access grants
export const fetchDepartmentAccessGrants = createAsyncThunk(
  'department/fetchDepartmentAccessGrants',
  async (departmentId: number | string, { rejectWithValue }) => {
    try {
      const grants = await departmentService.getDepartmentAccessGrants(departmentId)
      return grants
    } catch (error) {
      return rejectWithValue(handleDepartmentError(error))
    }
  }
)

// Grant access
export const grantAccess = createAsyncThunk(
  'department/grantAccess',
  async (data: GrantAccessData, { rejectWithValue }) => {
    try {
      const access = await departmentService.grantAccess(data)
      return access
    } catch (error) {
      return rejectWithValue(handleDepartmentError(error))
    }
  }
)

// Revoke access
export const revokeAccess = createAsyncThunk(
  'department/revokeAccess',
  async (accessId: number | string, { rejectWithValue }) => {
    try {
      await departmentService.revokeAccess(accessId)
      return accessId
    } catch (error) {
      return rejectWithValue(handleDepartmentError(error))
    }
  }
)

// Fetch my access requests
export const fetchMyAccessRequests = createAsyncThunk(
  'department/fetchMyAccessRequests',
  async (_, { rejectWithValue }) => {
    try {
      const requests = await departmentService.getMyAccessRequests()
      return requests
    } catch (error) {
      return rejectWithValue(handleDepartmentError(error))
    }
  }
)

// Fetch pending access requests for department
export const fetchDepartmentAccessRequests = createAsyncThunk(
  'department/fetchDepartmentAccessRequests',
  async (departmentId: number | string, { rejectWithValue }) => {
    try {
      const requests = await departmentService.getDepartmentAccessRequests(departmentId)
      return requests
    } catch (error) {
      return rejectWithValue(handleDepartmentError(error))
    }
  }
)

// Create access request
export const createAccessRequest = createAsyncThunk(
  'department/createAccessRequest',
  async (data: CreateAccessRequestData, { rejectWithValue }) => {
    try {
      const request = await departmentService.createAccessRequest(data)
      return request
    } catch (error) {
      return rejectWithValue(handleDepartmentError(error))
    }
  }
)

// Review access request
export const reviewAccessRequest = createAsyncThunk(
  'department/reviewAccessRequest',
  async (data: ReviewAccessRequestData, { rejectWithValue }) => {
    try {
      const result = await departmentService.reviewAccessRequest(data)
      return { requestId: data.requestId, status: data.status, accessGrant: result }
    } catch (error) {
      return rejectWithValue(handleDepartmentError(error))
    }
  }
)

// Cancel access request
export const cancelAccessRequest = createAsyncThunk(
  'department/cancelAccessRequest',
  async (requestId: number | string, { rejectWithValue }) => {
    try {
      await departmentService.cancelAccessRequest(requestId)
      return requestId
    } catch (error) {
      return rejectWithValue(handleDepartmentError(error))
    }
  }
)

// Fetch available roles
export const fetchRoles = createAsyncThunk(
  'department/fetchRoles',
  async (_, { rejectWithValue }) => {
    try {
      const roles = await departmentService.getRoles()
      return roles
    } catch (error) {
      return rejectWithValue(handleDepartmentError(error))
    }
  }
)

// ============ Slice ============

const departmentSlice = createSlice({
  name: 'department',
  initialState,
  reducers: {
    // Select department
    selectDepartment: (state, action: PayloadAction<number | string | null>) => {
      state.selectedDepartmentId = action.payload
      if (action.payload) {
        // Find in navigation or departments list
        const navItem = state.navigation.find((n) => n.department.id === action.payload)
        if (navItem) {
          state.selectedDepartment = navItem.department
        } else {
          state.selectedDepartment = state.departments.find((d) => d.id === action.payload) || null
        }
      } else {
        state.selectedDepartment = null
      }
    },

    // Toggle department expansion
    toggleDepartmentExpansion: (state, action: PayloadAction<number | string>) => {
      const deptId = action.payload
      const index = state.expandedDepartmentIds.indexOf(deptId)
      if (index > -1) {
        state.expandedDepartmentIds.splice(index, 1)
      } else {
        state.expandedDepartmentIds.push(deptId)
      }
    },

    // Expand department
    expandDepartment: (state, action: PayloadAction<number | string>) => {
      if (!state.expandedDepartmentIds.includes(action.payload)) {
        state.expandedDepartmentIds.push(action.payload)
      }
    },

    // Collapse department
    collapseDepartment: (state, action: PayloadAction<number | string>) => {
      state.expandedDepartmentIds = state.expandedDepartmentIds.filter(
        (id) => id !== action.payload
      )
    },

    // Expand all departments
    expandAllDepartments: (state) => {
      state.expandedDepartmentIds = state.navigation.map((n) => n.department.id)
    },

    // Collapse all departments
    collapseAllDepartments: (state) => {
      state.expandedDepartmentIds = []
    },

    // Clear error
    clearError: (state) => {
      state.error = null
    },

    // Clear department data (on logout)
    clearDepartmentData: (_state) => {
      return initialState
    },

    // Set current department settings
    setCurrentDepartmentSettings: (state, action: PayloadAction<DepartmentSettings | null>) => {
      state.currentDepartmentSettings = action.payload
    },

    // Set current department stats
    setCurrentDepartmentStats: (state, action: PayloadAction<DepartmentStats | null>) => {
      state.currentDepartmentStats = action.payload
    },
  },
  extraReducers: (builder) => {
    // Fetch departments
    builder.addCase(fetchDepartments.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(fetchDepartments.fulfilled, (state, action) => {
      state.loading = false
      state.departments = action.payload
    })
    builder.addCase(fetchDepartments.rejected, (state, action) => {
      state.loading = false
      state.error = action.payload as string
    })

    // Fetch navigation
    builder.addCase(fetchNavigation.pending, (state) => {
      state.navigationLoading = true
      state.error = null
    })
    builder.addCase(fetchNavigation.fulfilled, (state, action) => {
      state.navigationLoading = false
      state.navigation = action.payload

      // Auto-select user's own department if none selected
      if (!state.selectedDepartmentId && action.payload.length > 0) {
        const ownDept = action.payload.find((n) => n.accessType === 'own')
        if (ownDept) {
          state.selectedDepartmentId = ownDept.department.id
          state.selectedDepartment = ownDept.department
        }
      }
    })
    builder.addCase(fetchNavigation.rejected, (state, action) => {
      state.navigationLoading = false
      state.error = action.payload as string
    })

    // Fetch department by ID
    builder.addCase(fetchDepartmentById.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(fetchDepartmentById.fulfilled, (state, action) => {
      state.loading = false
      state.selectedDepartment = action.payload
      state.selectedDepartmentId = action.payload.id

      // Update in departments list
      const index = state.departments.findIndex((d) => d.id === action.payload.id)
      if (index !== -1) {
        state.departments[index] = action.payload
      }
    })
    builder.addCase(fetchDepartmentById.rejected, (state, action) => {
      state.loading = false
      state.error = action.payload as string
    })

    // Fetch department settings
    builder.addCase(fetchDepartmentSettings.fulfilled, (state, action) => {
      state.currentDepartmentSettings = action.payload
    })

    // Fetch department stats
    builder.addCase(fetchDepartmentStats.fulfilled, (state, action) => {
      state.currentDepartmentStats = action.payload
    })

    // Fetch my access grants
    builder.addCase(fetchMyAccessGrants.pending, (state) => {
      state.accessLoading = true
    })
    builder.addCase(fetchMyAccessGrants.fulfilled, (state, action) => {
      state.accessLoading = false
      state.myAccessGrants = action.payload
    })
    builder.addCase(fetchMyAccessGrants.rejected, (state, action) => {
      state.accessLoading = false
      state.error = action.payload as string
    })

    // Fetch department access grants
    builder.addCase(fetchDepartmentAccessGrants.pending, (state) => {
      state.accessLoading = true
    })
    builder.addCase(fetchDepartmentAccessGrants.fulfilled, (state, action) => {
      state.accessLoading = false
      state.departmentAccessGrants = action.payload
    })
    builder.addCase(fetchDepartmentAccessGrants.rejected, (state, action) => {
      state.accessLoading = false
      state.error = action.payload as string
    })

    // Grant access
    builder.addCase(grantAccess.fulfilled, (state, action) => {
      state.departmentAccessGrants.push(action.payload)
    })

    // Revoke access
    builder.addCase(revokeAccess.fulfilled, (state, action) => {
      state.departmentAccessGrants = state.departmentAccessGrants.filter(
        (g) => g.id !== action.payload
      )
      state.myAccessGrants = state.myAccessGrants.filter((g) => g.id !== action.payload)
    })

    // Fetch my access requests
    builder.addCase(fetchMyAccessRequests.fulfilled, (state, action) => {
      state.myAccessRequests = action.payload
    })

    // Fetch department access requests
    builder.addCase(fetchDepartmentAccessRequests.fulfilled, (state, action) => {
      state.pendingAccessRequests = action.payload
    })

    // Create access request
    builder.addCase(createAccessRequest.fulfilled, (state, action) => {
      state.myAccessRequests.push(action.payload)
    })

    // Review access request
    builder.addCase(reviewAccessRequest.fulfilled, (state, action) => {
      // Remove from pending requests
      state.pendingAccessRequests = state.pendingAccessRequests.filter(
        (r) => r.id !== action.payload.requestId
      )
      // If approved, add the access grant
      if (action.payload.accessGrant) {
        state.departmentAccessGrants.push(action.payload.accessGrant)
      }
    })

    // Cancel access request
    builder.addCase(cancelAccessRequest.fulfilled, (state, action) => {
      state.myAccessRequests = state.myAccessRequests.filter((r) => r.id !== action.payload)
    })

    // Fetch roles
    builder.addCase(fetchRoles.fulfilled, (state, action) => {
      state.availableRoles = action.payload
    })
  },
})

// Export actions
export const {
  selectDepartment,
  toggleDepartmentExpansion,
  expandDepartment,
  collapseDepartment,
  expandAllDepartments,
  collapseAllDepartments,
  clearError,
  clearDepartmentData,
  setCurrentDepartmentSettings,
  setCurrentDepartmentStats,
} = departmentSlice.actions

// Export selectors
export const selectDepartments = (state: { department: DepartmentState }) =>
  state.department.departments
export const selectNavigation = (state: { department: DepartmentState }) =>
  state.department.navigation
export const selectSelectedDepartmentId = (state: { department: DepartmentState }) =>
  state.department.selectedDepartmentId
export const selectSelectedDepartment = (state: { department: DepartmentState }) =>
  state.department.selectedDepartment
export const selectCurrentDepartmentSettings = (state: { department: DepartmentState }) =>
  state.department.currentDepartmentSettings
export const selectCurrentDepartmentStats = (state: { department: DepartmentState }) =>
  state.department.currentDepartmentStats
export const selectMyAccessGrants = (state: { department: DepartmentState }) =>
  state.department.myAccessGrants
export const selectDepartmentAccessGrants = (state: { department: DepartmentState }) =>
  state.department.departmentAccessGrants
export const selectMyAccessRequests = (state: { department: DepartmentState }) =>
  state.department.myAccessRequests
export const selectPendingAccessRequests = (state: { department: DepartmentState }) =>
  state.department.pendingAccessRequests
export const selectAvailableRoles = (state: { department: DepartmentState }) =>
  state.department.availableRoles
export const selectExpandedDepartmentIds = (state: { department: DepartmentState }) =>
  state.department.expandedDepartmentIds
export const selectDepartmentLoading = (state: { department: DepartmentState }) =>
  state.department.loading
export const selectNavigationLoading = (state: { department: DepartmentState }) =>
  state.department.navigationLoading
export const selectAccessLoading = (state: { department: DepartmentState }) =>
  state.department.accessLoading
export const selectDepartmentError = (state: { department: DepartmentState }) =>
  state.department.error

// Derived selectors
export const selectAccessibleDepartments = (state: { department: DepartmentState }) =>
  state.department.navigation.filter((n) => n.isAccessible).map((n) => n.department)

export const selectOwnDepartment = (state: { department: DepartmentState }) => {
  const ownNav = state.department.navigation.find((n) => n.accessType === 'own')
  return ownNav?.department || null
}

export const selectGrantedDepartments = (state: { department: DepartmentState }) =>
  state.department.navigation.filter((n) => n.accessType === 'granted').map((n) => n.department)

// Export reducer
export default departmentSlice.reducer
