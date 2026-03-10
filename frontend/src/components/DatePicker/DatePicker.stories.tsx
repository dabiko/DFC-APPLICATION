import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { DatePicker, DateRangePicker } from './index'
import type { DateRange } from 'react-day-picker'
import { addDays, subDays } from 'date-fns'

const meta: Meta<typeof DatePicker> = {
  title: 'Components/DatePicker',
  component: DatePicker,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof DatePicker>

/**
 * Basic date picker
 */
export const Basic: Story = {
  render: () => {
    const [date, setDate] = useState<Date>()

    return (
      <div className="w-80">
        <DatePicker value={date} onChange={setDate} placeholder="Select a date" />
      </div>
    )
  },
}

/**
 * With label and helper text
 */
export const WithLabel: Story = {
  render: () => {
    const [date, setDate] = useState<Date>()

    return (
      <div className="w-80">
        <DatePicker
          label="Document Date"
          value={date}
          onChange={setDate}
          placeholder="Select document date"
          helperText="Select the date when the document was created"
        />
      </div>
    )
  },
}

/**
 * Required field
 */
export const Required: Story = {
  render: () => {
    const [date, setDate] = useState<Date>()

    return (
      <div className="w-80">
        <DatePicker
          label="Upload Date"
          value={date}
          onChange={setDate}
          required
          placeholder="Select upload date"
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
    const [date, setDate] = useState<Date>()

    return (
      <div className="w-80">
        <DatePicker
          label="Expiry Date"
          value={date}
          onChange={setDate}
          error="Please select a valid expiry date"
          placeholder="Select expiry date"
        />
      </div>
    )
  },
}

/**
 * With min/max dates
 */
export const WithMinMaxDates: Story = {
  render: () => {
    const [date, setDate] = useState<Date>()
    const today = new Date()

    return (
      <div className="w-80">
        <DatePicker
          label="Future Date Only"
          value={date}
          onChange={setDate}
          minDate={today}
          maxDate={addDays(today, 30)}
          placeholder="Select a date (next 30 days)"
          helperText="Only dates within the next 30 days are selectable"
        />
      </div>
    )
  },
}

/**
 * Disabled state
 */
export const Disabled: Story = {
  render: () => {
    return (
      <div className="w-80">
        <DatePicker label="Document Date" value={new Date()} disabled placeholder="Select a date" />
      </div>
    )
  },
}

/**
 * Not clearable
 */
export const NotClearable: Story = {
  render: () => {
    const [date, setDate] = useState<Date>(new Date())

    return (
      <div className="w-80">
        <DatePicker
          label="Document Date"
          value={date}
          onChange={setDate}
          clearable={false}
          placeholder="Select a date"
        />
      </div>
    )
  },
}

/**
 * Date Range Picker - Basic
 */
export const DateRangeBasic: StoryObj<typeof DateRangePicker> = {
  render: () => {
    const [range, setRange] = useState<DateRange>()

    return (
      <div className="w-96">
        <DateRangePicker value={range} onChange={setRange} placeholder="Select date range" />
      </div>
    )
  },
}

/**
 * Date Range Picker - With label
 */
export const DateRangeWithLabel: StoryObj<typeof DateRangePicker> = {
  render: () => {
    const [range, setRange] = useState<DateRange>()

    return (
      <div className="w-96">
        <DateRangePicker
          label="Filter by Date Range"
          value={range}
          onChange={setRange}
          placeholder="Select start and end dates"
          helperText="Select a date range to filter documents"
        />
      </div>
    )
  },
}

/**
 * Date Range Picker - With preset
 */
export const DateRangeWithPreset: StoryObj<typeof DateRangePicker> = {
  render: () => {
    const today = new Date()
    const [range, setRange] = useState<DateRange>({
      from: subDays(today, 7),
      to: today,
    })

    return (
      <div className="w-96">
        <DateRangePicker
          label="Date Range"
          value={range}
          onChange={setRange}
          placeholder="Select date range"
          helperText="Currently showing last 7 days"
        />
      </div>
    )
  },
}

/**
 * DFC Document Filter Example
 */
export const DFCDocumentFilter: Story = {
  render: () => {
    const [uploadDate, setUploadDate] = useState<Date>()
    const [dateRange, setDateRange] = useState<DateRange>()

    return (
      <div className="w-full max-w-2xl space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Filter Documents</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Use date filters to find specific documents
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DatePicker
            label="Upload Date"
            value={uploadDate}
            onChange={setUploadDate}
            placeholder="Select upload date"
            helperText="Filter by upload date"
          />

          <DateRangePicker
            label="Modified Date Range"
            value={dateRange}
            onChange={setDateRange}
            placeholder="Select date range"
            helperText="Filter by modification date range"
          />
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="text-sm font-semibold mb-2">Selected Filters:</h3>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>Upload Date: {uploadDate ? uploadDate.toLocaleDateString() : 'Not selected'}</li>
            <li>
              Modified Date Range:{' '}
              {dateRange?.from && dateRange?.to
                ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
                : 'Not selected'}
            </li>
          </ul>
        </div>
      </div>
    )
  },
}
