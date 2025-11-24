/**
 * Folder Redux Slice
 * State management for folder operations
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type {
  Folder,
  CreateFolderData,
  UpdateFolderData,
  FolderFilterOptions,
  FolderSortOptions,
} from '@/types/folder'
import folderService, { handleFolderError } from '@/services/folderService'
import { buildFolderTree } from '@/utils/folderTree'

interface FolderState {
  folders: Folder[]
  folderTree: Folder[]
  selectedFolderId: string | null
  selectedFolder: Folder | null
  expandedFolderIds: string[]
  loading: boolean
  error: string | null
  filters: FolderFilterOptions
  sort: FolderSortOptions
}

const initialState: FolderState = {
  folders: [],
  folderTree: [],
  selectedFolderId: null,
  selectedFolder: null,
  expandedFolderIds: [],
  loading: false,
  error: null,
  filters: {},
  sort: {
    sortBy: 'name',
    sortOrder: 'asc',
  },
}

/**
 * Async Thunks
 */

// Fetch all folders
export const fetchFolders = createAsyncThunk(
  'folder/fetchFolders',
  async (
    params: { filters?: FolderFilterOptions; sort?: FolderSortOptions } = {},
    { rejectWithValue }
  ) => {
    try {
      const folders = await folderService.getFolders(params.filters, params.sort)
      return folders
    } catch (error) {
      return rejectWithValue(handleFolderError(error))
    }
  }
)

// Fetch folder by ID
export const fetchFolderById = createAsyncThunk(
  'folder/fetchFolderById',
  async (folderId: string, { rejectWithValue }) => {
    try {
      const folder = await folderService.getFolderById(folderId)
      return folder
    } catch (error) {
      return rejectWithValue(handleFolderError(error))
    }
  }
)

// Create folder
export const createFolder = createAsyncThunk(
  'folder/createFolder',
  async (data: CreateFolderData, { rejectWithValue }) => {
    try {
      const folder = await folderService.createFolder(data)
      return folder
    } catch (error) {
      return rejectWithValue(handleFolderError(error))
    }
  }
)

// Rename folder
export const renameFolder = createAsyncThunk(
  'folder/renameFolder',
  async ({ folderId, newName }: { folderId: string; newName: string }, { rejectWithValue }) => {
    try {
      const folder = await folderService.renameFolder(folderId, newName)
      return folder
    } catch (error) {
      return rejectWithValue(handleFolderError(error))
    }
  }
)

// Move folder
export const moveFolder = createAsyncThunk(
  'folder/moveFolder',
  async (
    { folderId, newParentId }: { folderId: string; newParentId: string | null },
    { rejectWithValue }
  ) => {
    try {
      const folder = await folderService.moveFolder(folderId, newParentId)
      return folder
    } catch (error) {
      return rejectWithValue(handleFolderError(error))
    }
  }
)

// Delete folder
export const deleteFolder = createAsyncThunk(
  'folder/deleteFolder',
  async (
    { folderId, force = false }: { folderId: string; force?: boolean },
    { rejectWithValue }
  ) => {
    try {
      await folderService.deleteFolder(folderId, force)
      return folderId
    } catch (error) {
      return rejectWithValue(handleFolderError(error))
    }
  }
)

// Update folder
export const updateFolder = createAsyncThunk(
  'folder/updateFolder',
  async ({ folderId, data }: { folderId: string; data: UpdateFolderData }, { rejectWithValue }) => {
    try {
      const folder = await folderService.updateFolder(folderId, data)
      return folder
    } catch (error) {
      return rejectWithValue(handleFolderError(error))
    }
  }
)

/**
 * Folder Slice
 */
const folderSlice = createSlice({
  name: 'folder',
  initialState,
  reducers: {
    // Select folder
    selectFolder: (state, action: PayloadAction<string | null>) => {
      state.selectedFolderId = action.payload
      if (action.payload) {
        state.selectedFolder = state.folders.find((f) => f.id === action.payload) || null
      } else {
        state.selectedFolder = null
      }
    },

    // Toggle folder expansion
    toggleFolderExpansion: (state, action: PayloadAction<string>) => {
      const folderId = action.payload
      const index = state.expandedFolderIds.indexOf(folderId)
      if (index > -1) {
        state.expandedFolderIds.splice(index, 1)
      } else {
        state.expandedFolderIds.push(folderId)
      }
    },

    // Expand folder
    expandFolder: (state, action: PayloadAction<string>) => {
      if (!state.expandedFolderIds.includes(action.payload)) {
        state.expandedFolderIds.push(action.payload)
      }
    },

    // Collapse folder
    collapseFolder: (state, action: PayloadAction<string>) => {
      state.expandedFolderIds = state.expandedFolderIds.filter((id) => id !== action.payload)
    },

    // Expand all folders
    expandAllFolders: (state) => {
      state.expandedFolderIds = state.folders.map((f) => f.id)
    },

    // Collapse all folders
    collapseAllFolders: (state) => {
      state.expandedFolderIds = []
    },

    // Set filters
    setFilters: (state, action: PayloadAction<FolderFilterOptions>) => {
      state.filters = action.payload
    },

    // Set sort
    setSort: (state, action: PayloadAction<FolderSortOptions>) => {
      state.sort = action.payload
    },

    // Clear error
    clearError: (state) => {
      state.error = null
    },

    // Clear folders
    clearFolders: (state) => {
      state.folders = []
      state.folderTree = []
      state.selectedFolderId = null
      state.selectedFolder = null
    },
  },
  extraReducers: (builder) => {
    // Fetch folders
    builder.addCase(fetchFolders.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(fetchFolders.fulfilled, (state, action) => {
      state.loading = false
      state.folders = action.payload
      state.folderTree = buildFolderTree(action.payload)
    })
    builder.addCase(fetchFolders.rejected, (state, action) => {
      state.loading = false
      state.error = action.payload as string
    })

    // Fetch folder by ID
    builder.addCase(fetchFolderById.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(fetchFolderById.fulfilled, (state, action) => {
      state.loading = false
      state.selectedFolder = action.payload
      state.selectedFolderId = action.payload.id

      // Update folder in list if exists
      const index = state.folders.findIndex((f) => f.id === action.payload.id)
      if (index !== -1) {
        state.folders[index] = action.payload
      }
    })
    builder.addCase(fetchFolderById.rejected, (state, action) => {
      state.loading = false
      state.error = action.payload as string
    })

    // Create folder
    builder.addCase(createFolder.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(createFolder.fulfilled, (state, action) => {
      state.loading = false
      state.folders.push(action.payload)
      state.folderTree = buildFolderTree(state.folders)

      // Auto-expand parent folder
      if (action.payload.parentId && !state.expandedFolderIds.includes(action.payload.parentId)) {
        state.expandedFolderIds.push(action.payload.parentId)
      }
    })
    builder.addCase(createFolder.rejected, (state, action) => {
      state.loading = false
      state.error = action.payload as string
    })

    // Rename folder
    builder.addCase(renameFolder.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(renameFolder.fulfilled, (state, action) => {
      state.loading = false
      const index = state.folders.findIndex((f) => f.id === action.payload.id)
      if (index !== -1) {
        state.folders[index] = action.payload
        state.folderTree = buildFolderTree(state.folders)
      }
      if (state.selectedFolderId === action.payload.id) {
        state.selectedFolder = action.payload
      }
    })
    builder.addCase(renameFolder.rejected, (state, action) => {
      state.loading = false
      state.error = action.payload as string
    })

    // Move folder
    builder.addCase(moveFolder.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(moveFolder.fulfilled, (state, action) => {
      state.loading = false
      const index = state.folders.findIndex((f) => f.id === action.payload.id)
      if (index !== -1) {
        state.folders[index] = action.payload
        state.folderTree = buildFolderTree(state.folders)
      }

      // Auto-expand new parent folder
      if (action.payload.parentId && !state.expandedFolderIds.includes(action.payload.parentId)) {
        state.expandedFolderIds.push(action.payload.parentId)
      }
    })
    builder.addCase(moveFolder.rejected, (state, action) => {
      state.loading = false
      state.error = action.payload as string
    })

    // Delete folder
    builder.addCase(deleteFolder.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(deleteFolder.fulfilled, (state, action) => {
      state.loading = false
      state.folders = state.folders.filter((f) => f.id !== action.payload)
      state.folderTree = buildFolderTree(state.folders)

      if (state.selectedFolderId === action.payload) {
        state.selectedFolderId = null
        state.selectedFolder = null
      }
    })
    builder.addCase(deleteFolder.rejected, (state, action) => {
      state.loading = false
      state.error = action.payload as string
    })

    // Update folder
    builder.addCase(updateFolder.pending, (state) => {
      state.loading = true
      state.error = null
    })
    builder.addCase(updateFolder.fulfilled, (state, action) => {
      state.loading = false
      const index = state.folders.findIndex((f) => f.id === action.payload.id)
      if (index !== -1) {
        state.folders[index] = action.payload
        state.folderTree = buildFolderTree(state.folders)
      }
      if (state.selectedFolderId === action.payload.id) {
        state.selectedFolder = action.payload
      }
    })
    builder.addCase(updateFolder.rejected, (state, action) => {
      state.loading = false
      state.error = action.payload as string
    })
  },
})

// Export actions
export const {
  selectFolder,
  toggleFolderExpansion,
  expandFolder,
  collapseFolder,
  expandAllFolders,
  collapseAllFolders,
  setFilters,
  setSort,
  clearError,
  clearFolders,
} = folderSlice.actions

// Export selectors
export const selectFolders = (state: { folder: FolderState }) => state.folder.folders
export const selectFolderTree = (state: { folder: FolderState }) => state.folder.folderTree
export const selectSelectedFolderId = (state: { folder: FolderState }) =>
  state.folder.selectedFolderId
export const selectSelectedFolder = (state: { folder: FolderState }) => state.folder.selectedFolder
export const selectExpandedFolderIds = (state: { folder: FolderState }) =>
  state.folder.expandedFolderIds
export const selectFolderLoading = (state: { folder: FolderState }) => state.folder.loading
export const selectFolderError = (state: { folder: FolderState }) => state.folder.error
export const selectFolderFilters = (state: { folder: FolderState }) => state.folder.filters
export const selectFolderSort = (state: { folder: FolderState }) => state.folder.sort

// Export reducer
export default folderSlice.reducer
