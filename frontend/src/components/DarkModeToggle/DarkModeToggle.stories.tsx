import type { Meta, StoryObj } from '@storybook/react-vite'
import { DarkModeToggle } from './DarkModeToggle'

const meta: Meta<typeof DarkModeToggle> = {
  title: 'Components/DarkModeToggle',
  component: DarkModeToggle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof DarkModeToggle>

/**
 * Simple icon toggle button
 */
export const IconVariant: Story = {
  args: {
    variant: 'icon',
    size: 'md',
  },
}

/**
 * Small icon toggle
 */
export const IconSmall: Story = {
  args: {
    variant: 'icon',
    size: 'sm',
  },
}

/**
 * Large icon toggle
 */
export const IconLarge: Story = {
  args: {
    variant: 'icon',
    size: 'lg',
  },
}

/**
 * Button group variant (icons only)
 */
export const ButtonGroup: Story = {
  args: {
    variant: 'button',
  },
}

/**
 * Button group with labels
 */
export const ButtonGroupWithLabels: Story = {
  args: {
    variant: 'button',
    showLabels: true,
  },
}

/**
 * Dropdown select variant
 */
export const SelectVariant: Story = {
  args: {
    variant: 'select',
  },
}

/**
 * All variants showcase
 */
export const AllVariants: Story = {
  render: () => (
    <div className="space-y-8 p-8">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Icon Toggle</h3>
        <div className="flex items-center gap-4">
          <DarkModeToggle variant="icon" size="sm" />
          <DarkModeToggle variant="icon" size="md" />
          <DarkModeToggle variant="icon" size="lg" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Button Group (Icons)
        </h3>
        <DarkModeToggle variant="button" />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Button Group (With Labels)
        </h3>
        <DarkModeToggle variant="button" showLabels />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Select Dropdown
        </h3>
        <DarkModeToggle variant="select" />
      </div>
    </div>
  ),
}

/**
 * In a header/navbar context
 */
export const InHeader: Story = {
  render: () => (
    <div className="w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">My Application</h1>
        </div>
        <div className="flex items-center gap-3">
          <DarkModeToggle variant="icon" />
          <button
            type="button"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  ),
}

/**
 * In a settings panel
 */
export const InSettingsPanel: Story = {
  render: () => (
    <div className="w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Appearance</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Theme
          </label>
          <DarkModeToggle variant="button" showLabels />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Or use dropdown
          </label>
          <DarkModeToggle variant="select" className="w-full" />
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Choose your preferred theme. System will automatically match your device settings.
          </p>
        </div>
      </div>
    </div>
  ),
}
