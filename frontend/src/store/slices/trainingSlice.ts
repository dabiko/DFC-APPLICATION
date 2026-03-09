/**
 * Training Redux Slice
 *
 * State management for training delivery: assignments, attempts, step progress, quiz state.
 */

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import {
  listAssignments,
  type ProcedureAssignment,
  type AssignmentDashboard,
  getAssignmentDashboard,
} from '@/services/assignmentService'
import {
  startTraining,
  completeTraining,
  type TrainingAttemptResponse,
  type StepCompletionResponse,
} from '@/services/trainingService'

// =============================================================================
// State
// =============================================================================

interface QuizState {
  quizAttemptId: string | null
  versionQuizId: string
  started: boolean
  submitted: boolean
}

interface TrainingState {
  myAssignments: ProcedureAssignment[]
  dashboard: AssignmentDashboard | null
  currentAttempt: TrainingAttemptResponse | null
  currentStep: StepCompletionResponse | null
  quizState: QuizState | null
  loading: boolean
  error: string | null
}

const initialState: TrainingState = {
  myAssignments: [],
  dashboard: null,
  currentAttempt: null,
  currentStep: null,
  quizState: null,
  loading: false,
  error: null,
}

// =============================================================================
// Async Thunks
// =============================================================================

export const fetchMyAssignments = createAsyncThunk(
  'training/fetchMyAssignments',
  async (params: Record<string, string> | undefined, { rejectWithValue }) => {
    try {
      const data = await listAssignments(params)
      return data
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to load assignments')
    }
  }
)

export const fetchDashboard = createAsyncThunk(
  'training/fetchDashboard',
  async (_, { rejectWithValue }) => {
    try {
      return await getAssignmentDashboard()
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to load dashboard')
    }
  }
)

export const beginTraining = createAsyncThunk(
  'training/beginTraining',
  async (assignmentId: string, { rejectWithValue }) => {
    try {
      return await startTraining(assignmentId)
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to start training')
    }
  }
)

export const finishTraining = createAsyncThunk(
  'training/finishTraining',
  async (attemptId: string, { rejectWithValue }) => {
    try {
      return await completeTraining(attemptId)
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.detail || 'Failed to complete training')
    }
  }
)

// =============================================================================
// Slice
// =============================================================================

const trainingSlice = createSlice({
  name: 'training',
  initialState,
  reducers: {
    setCurrentStep(state, action: PayloadAction<StepCompletionResponse | null>) {
      state.currentStep = action.payload
    },
    setQuizState(state, action: PayloadAction<QuizState | null>) {
      state.quizState = action.payload
    },
    clearTrainingState(state) {
      state.currentAttempt = null
      state.currentStep = null
      state.quizState = null
    },
    clearTrainingError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    // Fetch assignments
    builder
      .addCase(fetchMyAssignments.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchMyAssignments.fulfilled, (state, action) => {
        state.loading = false
        state.myAssignments = action.payload.results
      })
      .addCase(fetchMyAssignments.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Dashboard
    builder.addCase(fetchDashboard.fulfilled, (state, action) => {
      state.dashboard = action.payload
    })

    // Start training
    builder
      .addCase(beginTraining.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(beginTraining.fulfilled, (state, action) => {
        state.loading = false
        state.currentAttempt = action.payload
      })
      .addCase(beginTraining.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Complete training
    builder.addCase(finishTraining.fulfilled, (state, action) => {
      state.currentAttempt = action.payload
    })
  },
})

export const { setCurrentStep, setQuizState, clearTrainingState, clearTrainingError } =
  trainingSlice.actions
export default trainingSlice.reducer
