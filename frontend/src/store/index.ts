import { configureStore } from '@reduxjs/toolkit'
import { type TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'
import authReducer from './slices/authSlice'
import folderReducer from './slices/folderSlice'
import billingReducer from './slices/billingSlice'
import departmentReducer from './slices/departmentSlice'
import procedureReducer from './slices/procedureSlice'
import trainingReducer from './slices/trainingSlice'
import procedureReviewReducer from './slices/procedureReviewSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    folder: folderReducer,
    billing: billingReducer,
    department: departmentReducer,
    procedures: procedureReducer,
    training: trainingReducer,
    procedureReview: procedureReviewReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['your/action/type'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['folder.expandedFolderIds'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Export typed hooks for use throughout the app
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
