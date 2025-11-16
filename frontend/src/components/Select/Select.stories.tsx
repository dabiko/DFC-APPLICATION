import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Select, MultiSelect, SelectOption } from './index'
import {
  GlobeAmericasIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  HeartIcon,
} from '@heroicons/react/24/outline'

const meta: Meta<typeof Select> = {
  title: 'Components/Select',
  component: Select,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Select>

const countries: SelectOption[] = [
  { value: 'us', label: 'United States' },
  { value: 'ca', label: 'Canada' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'de', label: 'Germany' },
  { value: 'fr', label: 'France' },
  { value: 'jp', label: 'Japan' },
  { value: 'cn', label: 'China' },
  { value: 'in', label: 'India' },
  { value: 'br', label: 'Brazil' },
  { value: 'au', label: 'Australia' },
]

const departments: SelectOption[] = [
  { value: 'eng', label: 'Engineering', icon: <BriefcaseIcon className="h-4 w-4" /> },
  { value: 'des', label: 'Design', icon: <AcademicCapIcon className="h-4 w-4" /> },
  { value: 'mkt', label: 'Marketing', icon: <HeartIcon className="h-4 w-4" /> },
  { value: 'sales', label: 'Sales', icon: <GlobeAmericasIcon className="h-4 w-4" /> },
]

const priorities: SelectOption[] = [
  { value: 'low', label: 'Low Priority' },
  { value: 'medium', label: 'Medium Priority' },
  { value: 'high', label: 'High Priority' },
  { value: 'critical', label: 'Critical', disabled: true },
]

/**
 * Default single select
 */
export const Default: Story = {
  render: () => {
    const [value, setValue] = useState<string | number>('')
    return (
      <div className="w-80">
        <Select
          options={countries}
          value={value}
          onChange={setValue}
          placeholder="Select country"
        />
      </div>
    )
  },
}

/**
 * With label
 */
export const WithLabel: Story = {
  render: () => {
    const [value, setValue] = useState<string | number>('')
    return (
      <div className="w-80">
        <Select
          label="Country"
          options={countries}
          value={value}
          onChange={setValue}
          placeholder="Select your country"
        />
      </div>
    )
  },
}

/**
 * All sizes
 */
export const Sizes: Story = {
  render: () => {
    const [value1, setValue1] = useState<string | number>('')
    const [value2, setValue2] = useState<string | number>('')
    const [value3, setValue3] = useState<string | number>('')

    return (
      <div className="flex flex-col gap-4 w-80">
        <Select
          size="sm"
          label="Small"
          options={countries}
          value={value1}
          onChange={setValue1}
          placeholder="Small select"
        />
        <Select
          size="md"
          label="Medium (default)"
          options={countries}
          value={value2}
          onChange={setValue2}
          placeholder="Medium select"
        />
        <Select
          size="lg"
          label="Large"
          options={countries}
          value={value3}
          onChange={setValue3}
          placeholder="Large select"
        />
      </div>
    )
  },
}

/**
 * With icons
 */
export const WithIcons: Story = {
  render: () => {
    const [value, setValue] = useState<string | number>('')
    return (
      <div className="w-80">
        <Select
          label="Department"
          options={departments}
          value={value}
          onChange={setValue}
          placeholder="Select department"
        />
      </div>
    )
  },
}

/**
 * Searchable select
 */
export const Searchable: Story = {
  render: () => {
    const [value, setValue] = useState<string | number>('')
    return (
      <div className="w-80">
        <Select
          label="Country"
          options={countries}
          value={value}
          onChange={setValue}
          searchable
          placeholder="Search and select country"
          helperText="Type to search"
        />
      </div>
    )
  },
}

/**
 * With helper text
 */
export const WithHelperText: Story = {
  render: () => {
    const [value, setValue] = useState<string | number>('')
    return (
      <div className="w-80">
        <Select
          label="Priority"
          options={priorities}
          value={value}
          onChange={setValue}
          helperText="Select the priority level for this task"
        />
      </div>
    )
  },
}

/**
 * With error
 */
export const WithError: Story = {
  render: () => {
    const [value, setValue] = useState<string | number>('')
    return (
      <div className="w-80">
        <Select
          label="Country"
          options={countries}
          value={value}
          onChange={setValue}
          error="Country is required"
        />
      </div>
    )
  },
}

/**
 * Disabled state
 */
export const Disabled: Story = {
  render: () => (
    <div className="w-80">
      <Select label="Country" options={countries} value="us" disabled />
    </div>
  ),
}

/**
 * With disabled options
 */
export const DisabledOptions: Story = {
  render: () => {
    const [value, setValue] = useState<string | number>('')
    return (
      <div className="w-80">
        <Select
          label="Priority"
          options={priorities}
          value={value}
          onChange={setValue}
          helperText="Critical priority is disabled"
        />
      </div>
    )
  },
}

/**
 * Multi-select
 */
export const MultiSelectExample: Story = {
  render: () => {
    const [values, setValues] = useState<(string | number)[]>([])
    return (
      <div className="w-96">
        <MultiSelect
          label="Tags"
          options={[
            { value: 'react', label: 'React' },
            { value: 'vue', label: 'Vue' },
            { value: 'angular', label: 'Angular' },
            { value: 'svelte', label: 'Svelte' },
            { value: 'next', label: 'Next.js' },
            { value: 'nuxt', label: 'Nuxt.js' },
            { value: 'gatsby', label: 'Gatsby' },
          ]}
          value={values}
          onChange={setValues}
          placeholder="Select frameworks"
        />
      </div>
    )
  },
}

/**
 * Multi-select with search
 */
export const MultiSelectSearchable: Story = {
  render: () => {
    const [values, setValues] = useState<(string | number)[]>([])
    return (
      <div className="w-96">
        <MultiSelect
          label="Countries"
          options={countries}
          value={values}
          onChange={setValues}
          searchable
          placeholder="Search and select countries"
          helperText="You can select multiple countries"
        />
      </div>
    )
  },
}

/**
 * Multi-select with max selections
 */
export const MultiSelectMaxSelections: Story = {
  render: () => {
    const [values, setValues] = useState<(string | number)[]>([])
    return (
      <div className="w-96">
        <MultiSelect
          label="Top 3 Countries"
          options={countries}
          value={values}
          onChange={setValues}
          maxSelections={3}
          placeholder="Select up to 3 countries"
          helperText="Maximum 3 selections allowed"
        />
      </div>
    )
  },
}

/**
 * Multi-select with icons
 */
export const MultiSelectWithIcons: Story = {
  render: () => {
    const [values, setValues] = useState<(string | number)[]>([])
    return (
      <div className="w-96">
        <MultiSelect
          label="Departments"
          options={departments}
          value={values}
          onChange={setValues}
          placeholder="Select departments"
        />
      </div>
    )
  },
}

/**
 * Form example with multiple selects
 */
export const FormExample: Story = {
  render: () => {
    const [country, setCountry] = useState<string | number>('')
    const [department, setDepartment] = useState<string | number>('')
    const [tags, setTags] = useState<(string | number)[]>([])

    return (
      <div className="w-96 space-y-4">
        <Select
          label="Country"
          options={countries}
          value={country}
          onChange={setCountry}
          searchable
          placeholder="Select your country"
        />

        <Select
          label="Department"
          options={departments}
          value={department}
          onChange={setDepartment}
          placeholder="Select your department"
        />

        <MultiSelect
          label="Skills"
          options={[
            { value: 'js', label: 'JavaScript' },
            { value: 'ts', label: 'TypeScript' },
            { value: 'react', label: 'React' },
            { value: 'node', label: 'Node.js' },
            { value: 'python', label: 'Python' },
          ]}
          value={tags}
          onChange={setTags}
          searchable
          maxSelections={3}
          placeholder="Select up to 3 skills"
          helperText="Choose your top 3 skills"
        />
      </div>
    )
  },
}
