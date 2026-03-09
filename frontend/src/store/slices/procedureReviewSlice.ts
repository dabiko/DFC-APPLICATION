/**
 * Procedure Review Redux Slice
 *
 * Manages procedure-specific review data (step comments).
 * General review state (workflow instance, tasks, general comments)
 * is managed by the existing workflow state.
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import {
  listStepComments,
  createStepComment,
  resolveStepComment,
} from '@/services/procedureService'
import type { ProcedureStepComment } from '@/types/procedure'

// =============================================================================
// State
// =============================================================================

interface ProcedureReviewState {
  stepComments: ProcedureStepComment[]
  unresolvedCount: number
  loading: boolean
  error: string | null
}

const initialState: ProcedureReviewState = {
  stepComments: [],
  unresolvedCount: 0,
  loading: false,
  error: null,
}

// =============================================================================
// Async Thunks
// =============================================================================

export const fetchStepComments = createAsyncThunk(
  'procedureReview/fetchStepComments',
  async (procedureId: string, { rejectWithValue }) => {
    try {
      return await listStepComments(procedureId)
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to load comments')
    }
  }
)

export const addStepComment = createAsyncThunk(
  'procedureReview/addStepComment',
  async (
    {
      procedureId,
      data,
    }: {
      procedureId: string
      data: { step: string; body: string; parent_comment?: string | null }
    },
    { rejectWithValue }
  ) => {
    try {
      return await createStepComment(procedureId, data)
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to add comment')
    }
  }
)

export const resolveComment = createAsyncThunk(
  'procedureReview/resolveComment',
  async (
    { procedureId, commentId }: { procedureId: string; commentId: string },
    { rejectWithValue }
  ) => {
    try {
      await resolveStepComment(procedureId, commentId)
      return commentId
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to resolve comment')
    }
  }
)

// =============================================================================
// Slice
// =============================================================================

function countUnresolved(comments: ProcedureStepComment[]): number {
  return comments.reduce((count, c) => {
    return count + (c.is_resolved ? 0 : 1) + countUnresolved(c.replies || [])
  }, 0)
}

const procedureReviewSlice = createSlice({
  name: 'procedureReview',
  initialState,
  reducers: {
    clearReviewState(state) {
      state.stepComments = []
      state.unresolvedCount = 0
      state.error = null
    },
  },
  extraReducers: (builder) => {
    // Fetch comments
    builder
      .addCase(fetchStepComments.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchStepComments.fulfilled, (state, action) => {
        state.loading = false
        state.stepComments = action.payload
        state.unresolvedCount = countUnresolved(action.payload)
      })
      .addCase(fetchStepComments.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Add comment
    builder.addCase(addStepComment.fulfilled, (state, action) => {
      const comment = action.payload
      if (comment.parent_comment) {
        // It's a reply — find and append
        const parent = state.stepComments.find((c) => c.id === comment.parent_comment)
        if (parent) {
          parent.replies = [...(parent.replies || []), comment]
        }
      } else {
        state.stepComments.push(comment)
      }
      state.unresolvedCount = countUnresolved(state.stepComments)
    })

    // Resolve comment
    builder.addCase(resolveComment.fulfilled, (state, action) => {
      const commentId = action.payload
      const markResolved = (comments: ProcedureStepComment[]): boolean => {
        for (const c of comments) {
          if (c.id === commentId) {
            c.is_resolved = true
            return true
          }
          if (c.replies && markResolved(c.replies)) return true
        }
        return false
      }
      markResolved(state.stepComments)
      state.unresolvedCount = countUnresolved(state.stepComments)
    })
  },
})

export const { clearReviewState } = procedureReviewSlice.actions
export default procedureReviewSlice.reducer
