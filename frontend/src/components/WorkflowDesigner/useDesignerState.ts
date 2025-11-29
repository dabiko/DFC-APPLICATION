/**
 * Workflow Designer State Hook
 *
 * Manages the state for the workflow designer including
 * undo/redo, step management, and connections.
 */

import { useReducer, useCallback, useMemo } from 'react'
import type {
  DesignerState,
  DesignerAction,
  DesignerTemplate,
  DesignerStep,
  Connection,
  Position,
  CanvasViewport,
} from './types'
import { createEmptyTemplate } from './types'

const MAX_HISTORY = 50

function createInitialState(template?: DesignerTemplate): DesignerState {
  return {
    template: template || createEmptyTemplate(),
    selectedStepId: null,
    selectedConnectionId: null,
    isDragging: false,
    isConnecting: false,
    connectingFrom: null,
    clipboard: null,
    history: [],
    historyIndex: -1,
    isDirty: false,
  }
}

function pushHistory(state: DesignerState): DesignerState {
  const newHistory = state.history.slice(0, state.historyIndex + 1)
  newHistory.push(JSON.parse(JSON.stringify(state.template)))

  if (newHistory.length > MAX_HISTORY) {
    newHistory.shift()
  }

  return {
    ...state,
    history: newHistory,
    historyIndex: newHistory.length - 1,
    isDirty: true,
  }
}

function reorderSteps(steps: DesignerStep[]): DesignerStep[] {
  // Sort by y position first, then x position
  const sorted = [...steps].sort((a, b) => {
    if (Math.abs(a.position.y - b.position.y) < 50) {
      return a.position.x - b.position.x
    }
    return a.position.y - b.position.y
  })

  return sorted.map((step, index) => ({
    ...step,
    order: index + 1,
  }))
}

function designerReducer(state: DesignerState, action: DesignerAction): DesignerState {
  switch (action.type) {
    case 'SET_TEMPLATE': {
      return {
        ...createInitialState(action.payload),
        history: [JSON.parse(JSON.stringify(action.payload))],
        historyIndex: 0,
      }
    }

    case 'ADD_STEP': {
      const stateWithHistory = pushHistory(state)
      const newSteps = [...stateWithHistory.template.steps, action.payload]
      return {
        ...stateWithHistory,
        template: {
          ...stateWithHistory.template,
          steps: reorderSteps(newSteps),
        },
        selectedStepId: action.payload.id,
      }
    }

    case 'UPDATE_STEP': {
      const stateWithHistory = pushHistory(state)
      return {
        ...stateWithHistory,
        template: {
          ...stateWithHistory.template,
          steps: stateWithHistory.template.steps.map((step) =>
            step.id === action.payload.id ? { ...step, ...action.payload.updates } : step
          ),
        },
      }
    }

    case 'DELETE_STEP': {
      const stateWithHistory = pushHistory(state)
      return {
        ...stateWithHistory,
        template: {
          ...stateWithHistory.template,
          steps: reorderSteps(
            stateWithHistory.template.steps.filter((step) => step.id !== action.payload)
          ),
          connections: stateWithHistory.template.connections.filter(
            (conn) => conn.sourceStepId !== action.payload && conn.targetStepId !== action.payload
          ),
        },
        selectedStepId: state.selectedStepId === action.payload ? null : state.selectedStepId,
      }
    }

    case 'MOVE_STEP': {
      // Don't push history for every move - only at end of drag
      return {
        ...state,
        template: {
          ...state.template,
          steps: state.template.steps.map((step) =>
            step.id === action.payload.id ? { ...step, position: action.payload.position } : step
          ),
        },
        isDirty: true,
      }
    }

    case 'SELECT_STEP': {
      return {
        ...state,
        selectedStepId: action.payload,
        selectedConnectionId: action.payload ? null : state.selectedConnectionId,
      }
    }

    case 'ADD_CONNECTION': {
      // Check if connection already exists
      const exists = state.template.connections.some(
        (conn) =>
          conn.sourceStepId === action.payload.sourceStepId &&
          conn.targetStepId === action.payload.targetStepId
      )
      if (exists) {
        return { ...state, isConnecting: false, connectingFrom: null }
      }

      const stateWithHistory = pushHistory(state)
      return {
        ...stateWithHistory,
        template: {
          ...stateWithHistory.template,
          connections: [...stateWithHistory.template.connections, action.payload],
        },
        isConnecting: false,
        connectingFrom: null,
      }
    }

    case 'UPDATE_CONNECTION': {
      const stateWithHistory = pushHistory(state)
      return {
        ...stateWithHistory,
        template: {
          ...stateWithHistory.template,
          connections: stateWithHistory.template.connections.map((conn) =>
            conn.id === action.payload.id ? { ...conn, ...action.payload.updates } : conn
          ),
        },
      }
    }

    case 'DELETE_CONNECTION': {
      const stateWithHistory = pushHistory(state)
      return {
        ...stateWithHistory,
        template: {
          ...stateWithHistory.template,
          connections: stateWithHistory.template.connections.filter(
            (conn) => conn.id !== action.payload
          ),
        },
        selectedConnectionId:
          state.selectedConnectionId === action.payload ? null : state.selectedConnectionId,
      }
    }

    case 'SELECT_CONNECTION': {
      return {
        ...state,
        selectedConnectionId: action.payload,
        selectedStepId: action.payload ? null : state.selectedStepId,
      }
    }

    case 'SET_VIEWPORT': {
      return {
        ...state,
        template: {
          ...state.template,
          viewport: action.payload,
        },
      }
    }

    case 'START_CONNECTING': {
      return {
        ...state,
        isConnecting: true,
        connectingFrom: action.payload,
      }
    }

    case 'END_CONNECTING': {
      return {
        ...state,
        isConnecting: false,
        connectingFrom: null,
      }
    }

    case 'COPY_STEP': {
      const step = state.template.steps.find((s) => s.id === action.payload)
      if (!step) return state
      return {
        ...state,
        clipboard: { ...step },
      }
    }

    case 'PASTE_STEP': {
      if (!state.clipboard) return state
      const stateWithHistory = pushHistory(state)
      const newStep: DesignerStep = {
        ...state.clipboard,
        id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `${state.clipboard.name} (copy)`,
        position: action.payload,
        order: state.template.steps.length + 1,
      }
      return {
        ...stateWithHistory,
        template: {
          ...stateWithHistory.template,
          steps: [...stateWithHistory.template.steps, newStep],
        },
        selectedStepId: newStep.id,
      }
    }

    case 'UNDO': {
      if (state.historyIndex <= 0) return state
      const newIndex = state.historyIndex - 1
      return {
        ...state,
        template: JSON.parse(JSON.stringify(state.history[newIndex])),
        historyIndex: newIndex,
        selectedStepId: null,
        selectedConnectionId: null,
      }
    }

    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state
      const newIndex = state.historyIndex + 1
      return {
        ...state,
        template: JSON.parse(JSON.stringify(state.history[newIndex])),
        historyIndex: newIndex,
        selectedStepId: null,
        selectedConnectionId: null,
      }
    }

    case 'MARK_CLEAN': {
      return {
        ...state,
        isDirty: false,
      }
    }

    case 'UPDATE_TEMPLATE_SETTINGS': {
      const stateWithHistory = pushHistory(state)
      return {
        ...stateWithHistory,
        template: {
          ...stateWithHistory.template,
          ...action.payload,
        },
      }
    }

    case 'REORDER_STEPS': {
      const stateWithHistory = pushHistory(state)
      return {
        ...stateWithHistory,
        template: {
          ...stateWithHistory.template,
          steps: reorderSteps(stateWithHistory.template.steps),
        },
      }
    }

    default:
      return state
  }
}

export function useDesignerState(initialTemplate?: DesignerTemplate) {
  const [state, dispatch] = useReducer(designerReducer, initialTemplate, createInitialState)

  // Actions
  const setTemplate = useCallback((template: DesignerTemplate) => {
    dispatch({ type: 'SET_TEMPLATE', payload: template })
  }, [])

  const addStep = useCallback((step: DesignerStep) => {
    dispatch({ type: 'ADD_STEP', payload: step })
  }, [])

  const updateStep = useCallback((id: string, updates: Partial<DesignerStep>) => {
    dispatch({ type: 'UPDATE_STEP', payload: { id, updates } })
  }, [])

  const deleteStep = useCallback((id: string) => {
    dispatch({ type: 'DELETE_STEP', payload: id })
  }, [])

  const moveStep = useCallback((id: string, position: Position) => {
    dispatch({ type: 'MOVE_STEP', payload: { id, position } })
  }, [])

  const selectStep = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_STEP', payload: id })
  }, [])

  const addConnection = useCallback((connection: Connection) => {
    dispatch({ type: 'ADD_CONNECTION', payload: connection })
  }, [])

  const updateConnection = useCallback((id: string, updates: Partial<Connection>) => {
    dispatch({ type: 'UPDATE_CONNECTION', payload: { id, updates } })
  }, [])

  const deleteConnection = useCallback((id: string) => {
    dispatch({ type: 'DELETE_CONNECTION', payload: id })
  }, [])

  const selectConnection = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_CONNECTION', payload: id })
  }, [])

  const setViewport = useCallback((viewport: CanvasViewport) => {
    dispatch({ type: 'SET_VIEWPORT', payload: viewport })
  }, [])

  const startConnecting = useCallback((stepId: string) => {
    dispatch({ type: 'START_CONNECTING', payload: stepId })
  }, [])

  const endConnecting = useCallback(() => {
    dispatch({ type: 'END_CONNECTING' })
  }, [])

  const copyStep = useCallback((id: string) => {
    dispatch({ type: 'COPY_STEP', payload: id })
  }, [])

  const pasteStep = useCallback((position: Position) => {
    dispatch({ type: 'PASTE_STEP', payload: position })
  }, [])

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' })
  }, [])

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' })
  }, [])

  const markClean = useCallback(() => {
    dispatch({ type: 'MARK_CLEAN' })
  }, [])

  const updateTemplateSettings = useCallback((settings: Partial<DesignerTemplate>) => {
    dispatch({ type: 'UPDATE_TEMPLATE_SETTINGS', payload: settings })
  }, [])

  const reorderStepsAction = useCallback(() => {
    dispatch({ type: 'REORDER_STEPS' })
  }, [])

  // Computed values
  const canUndo = useMemo(() => state.historyIndex > 0, [state.historyIndex])
  const canRedo = useMemo(
    () => state.historyIndex < state.history.length - 1,
    [state.historyIndex, state.history.length]
  )

  const selectedStep = useMemo(
    () => state.template.steps.find((s) => s.id === state.selectedStepId) || null,
    [state.template.steps, state.selectedStepId]
  )

  const selectedConnection = useMemo(
    () => state.template.connections.find((c) => c.id === state.selectedConnectionId) || null,
    [state.template.connections, state.selectedConnectionId]
  )

  return {
    // State
    state,
    template: state.template,
    selectedStepId: state.selectedStepId,
    selectedConnectionId: state.selectedConnectionId,
    selectedStep,
    selectedConnection,
    isConnecting: state.isConnecting,
    connectingFrom: state.connectingFrom,
    clipboard: state.clipboard,
    isDirty: state.isDirty,
    canUndo,
    canRedo,

    // Actions
    setTemplate,
    addStep,
    updateStep,
    deleteStep,
    moveStep,
    selectStep,
    addConnection,
    updateConnection,
    deleteConnection,
    selectConnection,
    setViewport,
    startConnecting,
    endConnecting,
    copyStep,
    pasteStep,
    undo,
    redo,
    markClean,
    updateTemplateSettings,
    reorderSteps: reorderStepsAction,
  }
}

export type DesignerStateReturn = ReturnType<typeof useDesignerState>
