import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Input, Textarea } from './index'
import { MagnifyingGlassIcon, EnvelopeIcon, UserIcon, PhoneIcon } from '@heroicons/react/24/outline'

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Input>

/**
 * Default text input
 */
export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
}

/**
 * Input with label
 */
export const WithLabel: Story = {
  args: {
    label: 'Email Address',
    type: 'email',
    placeholder: 'Enter your email',
  },
}

/**
 * All input sizes
 */
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <Input size="sm" placeholder="Small input" />
      <Input size="md" placeholder="Medium input (default)" />
      <Input size="lg" placeholder="Large input" />
    </div>
  ),
}

/**
 * Input types
 */
export const InputTypes: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <Input label="Text" type="text" placeholder="Enter text" />
      <Input label="Email" type="email" placeholder="Enter email" />
      <Input label="Password" type="password" placeholder="Enter password" />
      <Input label="Number" type="number" placeholder="Enter number" />
      <Input label="Search" type="search" placeholder="Search..." clearable />
      <Input label="Tel" type="tel" placeholder="Enter phone number" />
      <Input label="URL" type="url" placeholder="Enter URL" />
      <Input label="Date" type="date" />
      <Input label="Time" type="time" />
    </div>
  ),
}

/**
 * Password input with show/hide toggle
 */
export const Password: Story = {
  render: () => {
    const [password, setPassword] = useState('')
    return (
      <div className="w-80">
        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
    )
  },
}

/**
 * Search input with clear button
 */
export const Search: Story = {
  render: () => {
    const [search, setSearch] = useState('')
    return (
      <div className="w-80">
        <Input
          type="search"
          placeholder="Search documents..."
          leftIcon={<MagnifyingGlassIcon className="h-5 w-5" />}
          clearable
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
        />
      </div>
    )
  },
}

/**
 * Inputs with icons
 */
export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <Input
        label="Email"
        type="email"
        placeholder="Enter your email"
        leftIcon={<EnvelopeIcon className="h-5 w-5" />}
      />
      <Input
        label="Username"
        type="text"
        placeholder="Enter username"
        leftIcon={<UserIcon className="h-5 w-5" />}
      />
      <Input
        label="Phone"
        type="tel"
        placeholder="Enter phone number"
        leftIcon={<PhoneIcon className="h-5 w-5" />}
      />
    </div>
  ),
}

/**
 * Input with helper text
 */
export const WithHelperText: Story = {
  args: {
    label: 'Username',
    placeholder: 'Enter username',
    helperText: 'Must be 3-20 characters, alphanumeric only',
  },
}

/**
 * Input with error state
 */
export const WithError: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <Input label="Email" type="email" value="invalid-email" error="Please enter a valid email" />
      <Input
        label="Password"
        type="password"
        value="123"
        error="Password must be at least 8 characters"
      />
      <Input label="Required Field" value="" error="This field is required" />
    </div>
  ),
}

/**
 * Disabled state
 */
export const Disabled: Story = {
  args: {
    label: 'Username',
    value: 'johndoe',
    disabled: true,
  },
}

/**
 * Full width input
 */
export const FullWidth: Story = {
  render: () => (
    <div className="w-full max-w-2xl">
      <Input label="Full Width Input" fullWidth placeholder="This input fills the container" />
    </div>
  ),
}

/**
 * Form example with various inputs
 */
export const FormExample: Story = {
  render: () => {
    const [formData, setFormData] = useState({
      email: '',
      password: '',
      search: '',
    })

    return (
      <div className="w-96 space-y-4">
        <Input
          label="Email Address"
          type="email"
          placeholder="Enter your email"
          leftIcon={<EnvelopeIcon className="h-5 w-5" />}
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          helperText="We'll never share your email"
        />

        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          helperText="Must be at least 8 characters"
        />

        <Input
          type="search"
          placeholder="Search..."
          leftIcon={<MagnifyingGlassIcon className="h-5 w-5" />}
          clearable
          value={formData.search}
          onChange={(e) => setFormData({ ...formData, search: e.target.value })}
          onClear={() => setFormData({ ...formData, search: '' })}
        />
      </div>
    )
  },
}

// Textarea Stories
export const TextareaDefault: Story = {
  render: () => <Textarea placeholder="Enter your message..." />,
}

export const TextareaWithLabel: Story = {
  render: () => (
    <div className="w-96">
      <Textarea label="Description" placeholder="Enter description..." />
    </div>
  ),
}

export const TextareaSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-96">
      <Textarea size="sm" placeholder="Small textarea" />
      <Textarea size="md" placeholder="Medium textarea (default)" />
      <Textarea size="lg" placeholder="Large textarea" />
    </div>
  ),
}

export const TextareaWithCount: Story = {
  render: () => {
    const [text, setText] = useState('')
    return (
      <div className="w-96">
        <Textarea
          label="Comment"
          placeholder="Enter your comment..."
          maxLength={500}
          showCount
          value={text}
          onChange={(e) => setText(e.target.value)}
          helperText="Maximum 500 characters"
        />
      </div>
    )
  },
}

export const TextareaWithError: Story = {
  render: () => (
    <div className="w-96">
      <Textarea
        label="Required Field"
        value=""
        error="This field is required"
        placeholder="Enter text..."
      />
    </div>
  ),
}

export const TextareaDisabled: Story = {
  render: () => (
    <div className="w-96">
      <Textarea
        label="Disabled Textarea"
        value="This textarea is disabled"
        disabled
        placeholder="Enter text..."
      />
    </div>
  ),
}
