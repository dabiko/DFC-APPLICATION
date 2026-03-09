/**
 * Procedure Redux Slice
 *
 * State management for procedures listing, filtering, and CRUD.
 */

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import {
  listProcedures,
  getProcedure,
  createProcedure,
  updateProcedure,
  deleteProcedure,
} from '@/services/procedureService'
import type { Procedure, ProcedureDetail, ProcedureFilters } from '@/types/procedure'

// =============================================================================
// State
// =============================================================================

interface ProcedureState {
  procedures: Procedure[]
  currentProcedure: ProcedureDetail | null
  loading: boolean
  error: string | null
  filters: ProcedureFilters
  totalCount: number
}

const initialState: ProcedureState = {
  procedures: [],
  currentProcedure: null,
  loading: false,
  error: null,
  filters: { state: '', department: '', search: '' },
  totalCount: 0,
}

// =============================================================================
// Async Thunks
// =============================================================================

export const fetchProcedures = createAsyncThunk(
  'procedures/fetchList',
  async (filters: ProcedureFilters | undefined, { rejectWithValue }) => {
    try {
      const data = await listProcedures(filters)
      return data
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to load procedures')
    }
  }
)

export const fetchProcedureDetail = createAsyncThunk(
  'procedures/fetchDetail',
  async (id: string, { rejectWithValue }) => {
    try {
      return await getProcedure(id)
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to load procedure')
    }
  }
)

export const createNewProcedure = createAsyncThunk(
  'procedures/create',
  async (
    data: { title: string; description: string; department: string; tags?: string[] },
    { rejectWithValue }
  ) => {
    try {
      return await createProcedure(data)
    } catch (error: any) {
      return rejectWithValue(error?.response?.data || 'Failed to create procedure')
    }
  }
)

export const updateExistingProcedure = createAsyncThunk(
  'procedures/update',
  async ({ id, data }: { id: string; data: Partial<ProcedureDetail> }, { rejectWithValue }) => {
    try {
      return await updateProcedure(id, data)
    } catch (error: any) {
      return rejectWithValue(error?.response?.data || 'Failed to update procedure')
    }
  }
)

export const deleteExistingProcedure = createAsyncThunk(
  'procedures/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await deleteProcedure(id)
      return id
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to delete procedure')
    }
  }
)

// =============================================================================
// Slice
// =============================================================================

const procedureSlice = createSlice({
  name: 'procedures',
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<ProcedureFilters>) {
      state.filters = action.payload
    },
    clearCurrentProcedure(state) {
      state.currentProcedure = null
    },
    clearError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    // Fetch list
    builder
      .addCase(fetchProcedures.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchProcedures.fulfilled, (state, action) => {
        state.loading = false
        state.procedures = action.payload.results
        state.totalCount = action.payload.count
      })
      .addCase(fetchProcedures.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Fetch detail
    builder
      .addCase(fetchProcedureDetail.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchProcedureDetail.fulfilled, (state, action) => {
        state.loading = false
        state.currentProcedure = action.payload
      })
      .addCase(fetchProcedureDetail.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Create
    builder.addCase(createNewProcedure.fulfilled, (state, action) => {
      state.procedures.unshift(action.payload as unknown as Procedure)
    })

    // Update
    builder.addCase(updateExistingProcedure.fulfilled, (state, action) => {
      state.currentProcedure = action.payload
      const idx = state.procedures.findIndex((p) => p.id === action.payload.id)
      if (idx >= 0) {
        state.procedures[idx] = action.payload as unknown as Procedure
      }
    })

    // Delete
    builder.addCase(deleteExistingProcedure.fulfilled, (state, action) => {
      state.procedures = state.procedures.filter((p) => p.id !== action.payload)
      if (state.currentProcedure?.id === action.payload) {
        state.currentProcedure = null
      }
    })
  },
})

export const { setFilters, clearCurrentProcedure, clearError } = procedureSlice.actions
export default procedureSlice.reducer
