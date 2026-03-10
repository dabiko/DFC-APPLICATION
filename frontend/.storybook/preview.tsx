import React from 'react'
import type { Preview } from '@storybook/react-vite'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter } from 'react-router-dom'
import '../src/index.css' // Import Tailwind CSS

// Initialize MSW for Storybook
import { worker } from '../src/mocks/browser'

// Start MSW - this returns a promise but we don't need to await it
// The service worker will intercept requests once it's ready
worker.start({
  onUnhandledRequest: 'bypass',
  quiet: true, // Reduce console noise
})

// Import reducers
import authReducer from '../src/store/slices/authSlice'
import folderReducer from '../src/store/slices/folderSlice'
import billingReducer from '../src/store/slices/billingSlice'
import departmentReducer from '../src/store/slices/departmentSlice'

// Import Contexts
import PermissionContext from '../src/contexts/PermissionContext'
import NetworkStatusContext from '../src/contexts/NetworkStatusContext'

// Create a mock store for Storybook
// Let reducers initialize their own states naturally from their initialState
const createMockStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      folder: folderReducer,
      billing: billingReducer,
      department: departmentReducer,
    },
  })

// Mock network status values for Storybook
const mockNetworkStatusContextValue = {
  status: 'online' as const,
  isOnline: true,
  isSlow: false,
  lastChecked: new Date(),
  retryCount: 0,
  retryIn: 0,
  effectiveType: '4g',
  downlink: 10,
  rtt: 50,
  retry: () => {},
  showBanner: false,
  dismissBanner: () => {},
  isDismissed: false,
}

// Mock permission values for Storybook
const mockPermissionContextValue = {
  permissionSummary: null,
  isLoading: false,
  error: null,
  hasGlobalPermission: () => true,
  hasAnyGlobalPermission: () => true,
  hasAllGlobalPermissions: () => true,
  checkDocumentPermission: async () => ({
    can_view: true,
    can_edit: true,
    can_delete: true,
    can_share: true,
    can_download: true,
    can_manage_permissions: true,
  }),
  checkFolderPermission: async () => ({
    can_view: true,
    can_edit: true,
    can_delete: true,
    can_share: true,
    can_upload: true,
    can_manage_permissions: true,
  }),
  isAdminOrManager: true,
  isAdmin: true,
  refreshPermissions: async () => {},
  clearPermissionCache: () => {},
  syncStatus: 'connected' as const,
  subscribeToResource: () => () => {},
  invalidateResourcePermission: () => {},
}

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      disabled: true,
    },
  },
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', icon: 'sun', title: 'Light mode' },
          { value: 'dark', icon: 'moon', title: 'Dark mode' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || 'light'

      // Apply theme to html element
      if (typeof window !== 'undefined') {
        const root = window.document.documentElement
        root.classList.remove('light', 'dark')
        root.classList.add(theme)
      }

      return (
        <MemoryRouter>
          <Provider store={createMockStore()}>
            <NetworkStatusContext.Provider value={mockNetworkStatusContextValue}>
              <PermissionContext.Provider value={mockPermissionContextValue as any}>
                <Story />
              </PermissionContext.Provider>
            </NetworkStatusContext.Provider>
          </Provider>
        </MemoryRouter>
      )
    },
  ],
}

export default preview
