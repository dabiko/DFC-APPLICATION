import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { HorizontalMenu, HorizontalMenuDivider } from './HorizontalMenu'
import {
  HomeIcon,
  DocumentTextIcon,
  FolderIcon,
  UsersIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  BellIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'

const meta: Meta<typeof HorizontalMenu> = {
  title: 'Components/Navigation/HorizontalMenu',
  component: HorizontalMenu,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof HorizontalMenu>

/**
 * Default horizontal menu
 */
export const Default: Story = {
  args: {
    items: [
      { label: 'Home', icon: <HomeIcon className="h-5 w-5" />, active: true },
      { label: 'Documents', icon: <DocumentTextIcon className="h-5 w-5" />, badge: 12 },
      { label: 'Folders', icon: <FolderIcon className="h-5 w-5" /> },
      { label: 'Users', icon: <UsersIcon className="h-5 w-5" /> },
      { label: 'Analytics', icon: <ChartBarIcon className="h-5 w-5" /> },
    ],
  },
}

/**
 * Pills variant with rounded background
 */
export const Pills: Story = {
  args: {
    variant: 'pills',
    items: [
      { label: 'Dashboard', icon: <HomeIcon className="h-5 w-5" />, active: true },
      { label: 'Documents', icon: <DocumentTextIcon className="h-5 w-5" />, badge: 5 },
      { label: 'Reports', icon: <ChartBarIcon className="h-5 w-5" /> },
      { label: 'Settings', icon: <Cog6ToothIcon className="h-5 w-5" /> },
    ],
  },
}

/**
 * Underline variant (popular in modern UIs)
 */
export const Underline: Story = {
  args: {
    variant: 'underline',
    items: [
      { label: 'Overview', active: true },
      { label: 'Documents', badge: 24 },
      { label: 'Folders' },
      { label: 'Shared' },
      { label: 'Recent' },
    ],
  },
}

/**
 * Small size menu
 */
export const SmallSize: Story = {
  args: {
    size: 'sm',
    variant: 'pills',
    items: [
      { label: 'All', active: true },
      { label: 'Pending', badge: 3 },
      { label: 'Completed' },
      { label: 'Archived' },
    ],
  },
}

/**
 * Large size menu
 */
export const LargeSize: Story = {
  args: {
    size: 'lg',
    variant: 'underline',
    items: [
      { label: 'Dashboard', icon: <HomeIcon className="h-6 w-6" />, active: true },
      { label: 'Files', icon: <DocumentTextIcon className="h-6 w-6" />, badge: 99 },
      { label: 'Analytics', icon: <ChartBarIcon className="h-6 w-6" /> },
    ],
  },
}

/**
 * Centered menu
 */
export const Centered: Story = {
  args: {
    centered: true,
    variant: 'pills',
    items: [{ label: 'Profile' }, { label: 'Settings' }, { label: 'Notifications', badge: 8 }],
  },
}

/**
 * Full width menu (items distributed evenly)
 */
export const FullWidth: Story = {
  args: {
    fullWidth: true,
    variant: 'underline',
    items: [
      { label: 'Home', active: true },
      { label: 'Browse' },
      { label: 'Search' },
      { label: 'Profile' },
    ],
  },
}

/**
 * With badges
 */
export const WithBadges: Story = {
  args: {
    variant: 'pills',
    items: [
      { label: 'Inbox', icon: <BellIcon className="h-5 w-5" />, badge: 12 },
      { label: 'Unread', badge: 5, active: true },
      { label: 'Important', badge: 2 },
      { label: 'Archived', badge: 156 },
    ],
  },
}

/**
 * Without icons
 */
export const WithoutIcons: Story = {
  args: {
    variant: 'underline',
    items: [
      { label: 'All Documents', active: true },
      { label: 'My Documents' },
      { label: 'Shared Documents' },
      { label: 'Recent' },
      { label: 'Favorites' },
    ],
  },
}

/**
 * With disabled items
 */
export const WithDisabledItems: Story = {
  args: {
    variant: 'pills',
    items: [
      { label: 'Available', active: true },
      { label: 'Processing', badge: 3 },
      { label: 'Failed', disabled: true },
      { label: 'Archived', disabled: true },
    ],
  },
}

/**
 * Interactive example with state
 */
export const Interactive: Story = {
  render: () => {
    const [activeIndex, setActiveIndex] = useState(0)

    const menuItems = [
      { label: 'Dashboard', icon: <HomeIcon className="h-5 w-5" /> },
      { label: 'Documents', icon: <DocumentTextIcon className="h-5 w-5" />, badge: 24 },
      { label: 'Folders', icon: <FolderIcon className="h-5 w-5" /> },
      { label: 'Users', icon: <UsersIcon className="h-5 w-5" />, badge: 5 },
      { label: 'Settings', icon: <Cog6ToothIcon className="h-5 w-5" /> },
    ]

    return (
      <div className="space-y-8">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Default Variant
          </h3>
          <HorizontalMenu
            items={menuItems.map((item, idx) => ({
              ...item,
              active: idx === activeIndex,
              onClick: () => setActiveIndex(idx),
            }))}
          />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Pills Variant
          </h3>
          <HorizontalMenu
            variant="pills"
            items={menuItems.map((item, idx) => ({
              ...item,
              active: idx === activeIndex,
              onClick: () => setActiveIndex(idx),
            }))}
          />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Underline Variant
          </h3>
          <HorizontalMenu
            variant="underline"
            items={menuItems.map((item, idx) => ({
              ...item,
              active: idx === activeIndex,
              onClick: () => setActiveIndex(idx),
            }))}
          />
        </div>

        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Active item: <span className="font-semibold">{menuItems[activeIndex].label}</span>
          </p>
        </div>
      </div>
    )
  },
}

/**
 * In a header layout
 */
export const InHeader: Story = {
  render: () => (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Digital Filing Cabinet
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg relative"
            >
              <BellIcon className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </div>

        <HorizontalMenu
          variant="underline"
          items={[
            { label: 'Dashboard', icon: <HomeIcon className="h-5 w-5" />, active: true },
            { label: 'Documents', icon: <DocumentTextIcon className="h-5 w-5" />, badge: 12 },
            { label: 'Folders', icon: <FolderIcon className="h-5 w-5" /> },
            { label: 'Analytics', icon: <ChartBarIcon className="h-5 w-5" /> },
            { label: 'Settings', icon: <Cog6ToothIcon className="h-5 w-5" /> },
          ]}
        />
      </div>
    </div>
  ),
}

/**
 * Mobile responsive menu (overflow scroll)
 */
export const MobileResponsive: Story = {
  render: () => (
    <div className="max-w-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="bg-white dark:bg-gray-900 p-4">
        <h2 className="text-lg font-semibold mb-3">Mobile View</h2>
        <HorizontalMenu
          variant="pills"
          size="sm"
          items={[
            { label: 'All', active: true },
            { label: 'Unread', badge: 5 },
            { label: 'Important', badge: 2 },
            { label: 'Sent' },
            { label: 'Drafts' },
            { label: 'Spam' },
            { label: 'Trash' },
          ]}
        />
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Scroll horizontally to see more items →
        </p>
      </div>
    </div>
  ),
}

/**
 * Combined with dividers
 */
export const WithDividers: Story = {
  render: () => (
    <div className="flex items-center gap-2 bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
      <button
        type="button"
        className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
      >
        File
      </button>
      <button
        type="button"
        className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
      >
        Edit
      </button>
      <HorizontalMenuDivider />
      <button
        type="button"
        className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
      >
        View
      </button>
      <button
        type="button"
        className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
      >
        Help
      </button>
    </div>
  ),
}
