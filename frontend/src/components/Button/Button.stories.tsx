import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'
import {
  ArrowRightIcon,
  ArrowLeftIcon,
  TrashIcon,
  PlusIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'tertiary', 'danger', 'ghost'],
      description: 'The visual style variant of the button',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'The size of the button',
    },
    loading: {
      control: 'boolean',
      description: 'Shows loading spinner',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the button',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Makes button full width',
    },
    iconOnly: {
      control: 'boolean',
      description: 'Icon-only button with no text',
    },
    iconPosition: {
      control: 'select',
      options: ['left', 'right'],
      description: 'Position of the icon',
    },
  },
}

export default meta
type Story = StoryObj<typeof Button>

/**
 * Default button with primary variant
 */
export const Default: Story = {
  args: {
    children: 'Button',
    variant: 'primary',
    size: 'md',
  },
}

/**
 * All button variants
 */
export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="tertiary">Tertiary</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="ghost">Ghost</Button>
    </div>
  ),
}

/**
 * All button sizes
 */
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
}

/**
 * Buttons with icons on the left
 */
export const WithIconLeft: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button icon={<ArrowLeftIcon className="h-4 w-4" />} iconPosition="left">
        Back
      </Button>
      <Button variant="secondary" icon={<PlusIcon className="h-4 w-4" />} iconPosition="left">
        Add Item
      </Button>
      <Button variant="danger" icon={<TrashIcon className="h-4 w-4" />} iconPosition="left">
        Delete
      </Button>
    </div>
  ),
}

/**
 * Buttons with icons on the right
 */
export const WithIconRight: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button icon={<ArrowRightIcon className="h-4 w-4" />} iconPosition="right">
        Next
      </Button>
      <Button
        variant="secondary"
        icon={<ArrowRightIcon className="h-4 w-4" />}
        iconPosition="right"
      >
        Continue
      </Button>
    </div>
  ),
}

/**
 * Icon-only buttons
 */
export const IconOnly: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button size="sm" iconOnly icon={<MagnifyingGlassIcon className="h-4 w-4" />} />
      <Button size="md" iconOnly icon={<MagnifyingGlassIcon className="h-5 w-5" />} />
      <Button size="lg" iconOnly icon={<MagnifyingGlassIcon className="h-6 w-6" />} />
      <Button variant="danger" size="md" iconOnly icon={<TrashIcon className="h-5 w-5" />} />
    </div>
  ),
}

/**
 * Loading state
 */
export const Loading: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button loading>Loading...</Button>
      <Button variant="secondary" loading>
        Please wait
      </Button>
      <Button variant="danger" loading>
        Deleting...
      </Button>
    </div>
  ),
}

/**
 * Disabled state
 */
export const Disabled: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button disabled>Disabled</Button>
      <Button variant="secondary" disabled>
        Disabled
      </Button>
      <Button variant="danger" disabled>
        Disabled
      </Button>
    </div>
  ),
}

/**
 * Full width button
 */
export const FullWidth: Story = {
  render: () => (
    <div className="w-full max-w-md space-y-4">
      <Button fullWidth>Full Width Primary</Button>
      <Button variant="secondary" fullWidth>
        Full Width Secondary
      </Button>
      <Button variant="tertiary" fullWidth icon={<PlusIcon className="h-4 w-4" />}>
        Full Width with Icon
      </Button>
    </div>
  ),
}

/**
 * Button group
 */
export const ButtonGroup: Story = {
  render: () => (
    <div className="flex gap-2">
      <Button variant="ghost">Cancel</Button>
      <Button variant="tertiary">Save Draft</Button>
      <Button variant="primary">Publish</Button>
    </div>
  ),
}

/**
 * All states demonstration
 */
export const AllStates: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-3">Primary</h3>
        <div className="flex flex-wrap gap-4">
          <Button variant="primary">Default</Button>
          <Button variant="primary" className="hover:bg-primary-700">
            Hover
          </Button>
          <Button variant="primary" className="active:bg-primary-800">
            Active
          </Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
          <Button variant="primary" loading>
            Loading
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Secondary</h3>
        <div className="flex flex-wrap gap-4">
          <Button variant="secondary">Default</Button>
          <Button variant="secondary" disabled>
            Disabled
          </Button>
          <Button variant="secondary" loading>
            Loading
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Danger</h3>
        <div className="flex flex-wrap gap-4">
          <Button variant="danger">Default</Button>
          <Button variant="danger" disabled>
            Disabled
          </Button>
          <Button variant="danger" loading>
            Loading
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Ghost</h3>
        <div className="flex flex-wrap gap-4">
          <Button variant="ghost">Default</Button>
          <Button variant="ghost" disabled>
            Disabled
          </Button>
          <Button variant="ghost" loading>
            Loading
          </Button>
        </div>
      </div>
    </div>
  ),
}
