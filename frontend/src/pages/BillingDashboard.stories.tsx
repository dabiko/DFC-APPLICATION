/**
 * Storybook Stories for BillingDashboard Page
 */

import React from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { BillingDashboard } from './BillingDashboard'
import { ToastContainer } from '../components/common/Toast'

// Error boundary to catch rendering errors
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red' }}>
          <h2>Something went wrong rendering BillingDashboard:</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error?.message}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>{this.state.error?.stack}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

const meta: Meta<typeof BillingDashboard> = {
  title: 'Pages/BillingDashboard',
  component: BillingDashboard,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Complete billing dashboard page integrating all billing components with state management.',
      },
    },
  },
  decorators: [
    (Story) => (
      <ErrorBoundary>
        <div style={{ height: '100vh', width: '100%' }}>
          <Story />
          <ToastContainer />
        </div>
      </ErrorBoundary>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof BillingDashboard>

/**
 * Default billing dashboard view
 * Uses global store state - displays empty/initial state
 */
export const Default: Story = {}
