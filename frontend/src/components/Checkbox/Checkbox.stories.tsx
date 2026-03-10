import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Checkbox, CheckboxGroup, Radio, RadioGroup, Switch } from './index'

const meta: Meta<typeof Checkbox> = {
  title: 'Components/Checkbox & Radio',
  component: Checkbox,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Checkbox>

/**
 * Default checkbox
 */
export const CheckboxDefault: Story = {
  render: () => {
    const [checked, setChecked] = useState(false)
    return <Checkbox checked={checked} onChange={(e) => setChecked(e.target.checked)} />
  },
}

/**
 * Checkbox with label
 */
export const CheckboxWithLabel: Story = {
  render: () => {
    const [checked, setChecked] = useState(false)
    return (
      <Checkbox
        label="Accept terms and conditions"
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
      />
    )
  },
}

/**
 * Checkbox sizes
 */
export const CheckboxSizes: Story = {
  render: () => {
    const [checked1, setChecked1] = useState(true)
    const [checked2, setChecked2] = useState(true)
    const [checked3, setChecked3] = useState(true)

    return (
      <div className="flex flex-col gap-4">
        <Checkbox
          size="sm"
          label="Small checkbox"
          checked={checked1}
          onChange={(e) => setChecked1(e.target.checked)}
        />
        <Checkbox
          size="md"
          label="Medium checkbox (default)"
          checked={checked2}
          onChange={(e) => setChecked2(e.target.checked)}
        />
        <Checkbox
          size="lg"
          label="Large checkbox"
          checked={checked3}
          onChange={(e) => setChecked3(e.target.checked)}
        />
      </div>
    )
  },
}

/**
 * Checkbox with helper text
 */
export const CheckboxWithHelperText: Story = {
  render: () => {
    const [checked, setChecked] = useState(false)
    return (
      <div className="w-96">
        <Checkbox
          label="Subscribe to newsletter"
          helperText="You can unsubscribe at any time"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
      </div>
    )
  },
}

/**
 * Checkbox with error
 */
export const CheckboxWithError: Story = {
  render: () => {
    const [checked, setChecked] = useState(false)
    return (
      <div className="w-96">
        <Checkbox
          label="Accept terms and conditions"
          error="You must accept the terms to continue"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
      </div>
    )
  },
}

/**
 * Indeterminate checkbox (for "select all")
 */
export const CheckboxIndeterminate: Story = {
  render: () => {
    const [checked, setChecked] = useState(false)
    const [indeterminate, setIndeterminate] = useState(true)

    return (
      <div className="flex flex-col gap-4">
        <Checkbox
          label="Select all items"
          checked={checked}
          indeterminate={indeterminate}
          onChange={(e) => {
            setChecked(e.target.checked)
            setIndeterminate(false)
          }}
        />
        <div className="ml-6 flex flex-col gap-2 text-sm text-gray-600">
          <div>• Item 1 (checked)</div>
          <div>• Item 2 (unchecked)</div>
          <div>• Item 3 (checked)</div>
        </div>
      </div>
    )
  },
}

/**
 * Disabled checkbox
 */
export const CheckboxDisabled: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Checkbox label="Disabled unchecked" disabled />
      <Checkbox label="Disabled checked" checked disabled />
    </div>
  ),
}

/**
 * Checkbox group
 */
export const CheckboxGroupExample: Story = {
  render: () => {
    const [values, setValues] = useState<string[]>(['tech'])

    return (
      <div className="w-96">
        <CheckboxGroup
          label="Select your interests"
          helperText="Choose as many as you like"
          options={[
            { value: 'tech', label: 'Technology' },
            { value: 'sports', label: 'Sports' },
            { value: 'music', label: 'Music' },
            { value: 'travel', label: 'Travel' },
          ]}
          value={values}
          onChange={setValues}
        />
      </div>
    )
  },
}

/**
 * Checkbox group horizontal
 */
export const CheckboxGroupHorizontal: Story = {
  render: () => {
    const [values, setValues] = useState<string[]>([])

    return (
      <div className="w-full">
        <CheckboxGroup
          label="Select features"
          options={[
            { value: 'notifications', label: 'Notifications' },
            { value: 'analytics', label: 'Analytics' },
            { value: 'api', label: 'API Access' },
          ]}
          value={values}
          onChange={setValues}
          orientation="horizontal"
        />
      </div>
    )
  },
}

/**
 * Radio button
 */
export const RadioDefault: Story = {
  render: () => {
    const [value, setValue] = useState('option1')

    return (
      <div className="flex flex-col gap-4">
        <Radio
          name="radio-group"
          value="option1"
          label="Option 1"
          checked={value === 'option1'}
          onChange={() => setValue('option1')}
        />
        <Radio
          name="radio-group"
          value="option2"
          label="Option 2"
          checked={value === 'option2'}
          onChange={() => setValue('option2')}
        />
        <Radio
          name="radio-group"
          value="option3"
          label="Option 3"
          checked={value === 'option3'}
          onChange={() => setValue('option3')}
        />
      </div>
    )
  },
}

/**
 * Radio sizes
 */
export const RadioSizes: Story = {
  render: () => {
    const [value, setValue] = useState('md')

    return (
      <div className="flex flex-col gap-4">
        <Radio
          size="sm"
          name="size"
          value="sm"
          label="Small radio"
          checked={value === 'sm'}
          onChange={() => setValue('sm')}
        />
        <Radio
          size="md"
          name="size"
          value="md"
          label="Medium radio (default)"
          checked={value === 'md'}
          onChange={() => setValue('md')}
        />
        <Radio
          size="lg"
          name="size"
          value="lg"
          label="Large radio"
          checked={value === 'lg'}
          onChange={() => setValue('lg')}
        />
      </div>
    )
  },
}

/**
 * Radio group
 */
export const RadioGroupExample: Story = {
  render: () => {
    const [value, setValue] = useState('basic')

    return (
      <div className="w-96">
        <RadioGroup
          name="plan"
          label="Select a plan"
          helperText="Choose the plan that best fits your needs"
          options={[
            { value: 'basic', label: 'Basic - $9/month', helperText: 'Perfect for individuals' },
            { value: 'pro', label: 'Pro - $29/month', helperText: 'For small teams' },
            {
              value: 'enterprise',
              label: 'Enterprise - Custom pricing',
              helperText: 'For large organizations',
            },
          ]}
          value={value}
          onChange={setValue}
        />
      </div>
    )
  },
}

/**
 * Radio group horizontal
 */
export const RadioGroupHorizontal: Story = {
  render: () => {
    const [value, setValue] = useState('card')

    return (
      <div className="w-full">
        <RadioGroup
          name="payment"
          label="Payment method"
          options={[
            { value: 'card', label: 'Credit Card' },
            { value: 'paypal', label: 'PayPal' },
            { value: 'bank', label: 'Bank Transfer' },
          ]}
          value={value}
          onChange={setValue}
          orientation="horizontal"
        />
      </div>
    )
  },
}

/**
 * Radio group with error
 */
export const RadioGroupWithError: Story = {
  render: () => {
    const [value, setValue] = useState('')

    return (
      <div className="w-96">
        <RadioGroup
          name="plan-error"
          label="Select a plan"
          error="Please select a plan to continue"
          options={[
            { value: 'basic', label: 'Basic' },
            { value: 'pro', label: 'Pro' },
            { value: 'enterprise', label: 'Enterprise' },
          ]}
          value={value}
          onChange={setValue}
        />
      </div>
    )
  },
}

/**
 * Switch (Toggle)
 */
export const SwitchDefault: Story = {
  render: () => {
    const [enabled, setEnabled] = useState(false)

    return <Switch checked={enabled} onChange={setEnabled} />
  },
}

/**
 * Switch with label
 */
export const SwitchWithLabel: Story = {
  render: () => {
    const [enabled, setEnabled] = useState(true)

    return (
      <Switch
        checked={enabled}
        onChange={setEnabled}
        label="Enable notifications"
        helperText="Receive email notifications for updates"
      />
    )
  },
}

/**
 * Switch sizes
 */
export const SwitchSizes: Story = {
  render: () => {
    const [enabled1, setEnabled1] = useState(true)
    const [enabled2, setEnabled2] = useState(true)
    const [enabled3, setEnabled3] = useState(true)

    return (
      <div className="flex flex-col gap-4">
        <Switch size="sm" checked={enabled1} onChange={setEnabled1} label="Small switch" />
        <Switch
          size="md"
          checked={enabled2}
          onChange={setEnabled2}
          label="Medium switch (default)"
        />
        <Switch size="lg" checked={enabled3} onChange={setEnabled3} label="Large switch" />
      </div>
    )
  },
}

/**
 * Switch label positions
 */
export const SwitchLabelPositions: Story = {
  render: () => {
    const [enabled1, setEnabled1] = useState(true)
    const [enabled2, setEnabled2] = useState(true)

    return (
      <div className="flex flex-col gap-4 w-80">
        <Switch
          checked={enabled1}
          onChange={setEnabled1}
          label="Label on right (default)"
          labelPosition="right"
        />
        <Switch
          checked={enabled2}
          onChange={setEnabled2}
          label="Label on left"
          labelPosition="left"
        />
      </div>
    )
  },
}

/**
 * Complete form example
 */
export const FormExample: Story = {
  render: () => {
    const [newsletter, setNewsletter] = useState(false)
    const [interests, setInterests] = useState<string[]>([])
    const [plan, setPlan] = useState('basic')
    const [notifications, setNotifications] = useState(true)

    return (
      <div className="w-full max-w-2xl space-y-6 p-6">
        <h2 className="text-2xl font-bold">Settings</h2>

        <Checkbox
          label="Subscribe to newsletter"
          helperText="Get weekly updates about new features"
          checked={newsletter}
          onChange={(e) => setNewsletter(e.target.checked)}
        />

        <CheckboxGroup
          label="Interests"
          helperText="Select topics you're interested in"
          options={[
            { value: 'tech', label: 'Technology' },
            { value: 'business', label: 'Business' },
            { value: 'design', label: 'Design' },
            { value: 'marketing', label: 'Marketing' },
          ]}
          value={interests}
          onChange={setInterests}
        />

        <RadioGroup
          name="subscription-plan"
          label="Subscription Plan"
          helperText="Choose your subscription tier"
          options={[
            { value: 'basic', label: 'Basic - Free', helperText: 'Up to 5 projects' },
            { value: 'pro', label: 'Pro - $9/month', helperText: 'Unlimited projects' },
            { value: 'enterprise', label: 'Enterprise - Custom', helperText: 'Custom solutions' },
          ]}
          value={plan}
          onChange={setPlan}
        />

        <Switch
          checked={notifications}
          onChange={setNotifications}
          label="Enable push notifications"
          helperText="Receive real-time notifications on your device"
        />
      </div>
    )
  },
}
