import type { Meta, StoryObj } from '@storybook/react-vite'
import { Card, CardHeader, CardContent, CardFooter, CardImage, CardDivider } from './Card'
import { Button } from '@components/Button'
import {
  EllipsisVerticalIcon,
  HeartIcon,
  ShareIcon,
  BookmarkIcon,
} from '@heroicons/react/24/outline'

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Card>

/**
 * Basic card
 */
export const BasicCard: Story = {
  render: () => (
    <Card className="w-80">
      <CardContent>This is a basic card with default styling and padding.</CardContent>
    </Card>
  ),
}

/**
 * Card with header
 */
export const WithHeader: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader title="Card Title" subtitle="Card subtitle" />
      <CardContent>This card has a header with a title and subtitle.</CardContent>
    </Card>
  ),
}

/**
 * Card with header and footer
 */
export const WithHeaderAndFooter: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader title="Complete Card" subtitle="With all sections" />
      <CardContent>This is a complete card with header, content, and footer sections.</CardContent>
      <CardFooter alignEnd>
        <Button variant="ghost" size="sm">
          Cancel
        </Button>
        <Button size="sm">Save</Button>
      </CardFooter>
    </Card>
  ),
}

/**
 * Card variants
 */
export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Card variant="default" className="w-64">
        <CardHeader title="Default" />
        <CardContent>Default card with border</CardContent>
      </Card>

      <Card variant="outlined" className="w-64">
        <CardHeader title="Outlined" />
        <CardContent>Outlined card with thicker border</CardContent>
      </Card>

      <Card variant="elevated" className="w-64">
        <CardHeader title="Elevated" />
        <CardContent>Elevated card with shadow</CardContent>
      </Card>
    </div>
  ),
}

/**
 * Card padding sizes
 */
export const PaddingSizes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Card padding="sm" className="w-64">
        <CardContent>Small padding (p-4)</CardContent>
      </Card>

      <Card padding="md" className="w-64">
        <CardContent>Medium padding (p-6) - Default</CardContent>
      </Card>

      <Card padding="lg" className="w-64">
        <CardContent>Large padding (p-8)</CardContent>
      </Card>

      <Card padding="none" className="w-64">
        <div className="p-4">
          <CardContent>No padding - Custom spacing</CardContent>
        </div>
      </Card>
    </div>
  ),
}

/**
 * Clickable card
 */
export const ClickableCard: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Card clickable onCardClick={() => alert('Card clicked!')} className="w-64">
        <CardHeader title="Clickable Card" />
        <CardContent>Click anywhere on this card</CardContent>
      </Card>

      <Card clickable disabled className="w-64">
        <CardHeader title="Disabled Card" />
        <CardContent>This card is disabled</CardContent>
      </Card>
    </div>
  ),
}

/**
 * Card with image
 */
export const WithImage: Story = {
  render: () => (
    <Card padding="none" className="w-80">
      <CardImage
        src="https://images.unsplash.com/photo-1557683316-973673baf926?w=400"
        alt="Gradient background"
        aspectRatio="16/9"
      />
      <div className="p-6">
        <CardHeader title="Beautiful Gradient" subtitle="Abstract wallpaper" />
        <CardContent>
          A beautiful abstract gradient background perfect for modern designs.
        </CardContent>
        <CardFooter alignEnd>
          <Button size="sm">Download</Button>
        </CardFooter>
      </div>
    </Card>
  ),
}

/**
 * Card with action in header
 */
export const WithHeaderAction: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader
        title="Settings"
        subtitle="Manage your preferences"
        action={
          <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <EllipsisVerticalIcon className="h-5 w-5" />
          </button>
        }
      />
      <CardContent>Configure your application settings and preferences.</CardContent>
    </Card>
  ),
}

/**
 * Card with dividers
 */
export const WithDividers: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader title="Document Details" />
      <CardDivider />
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Created:</span>
            <span className="font-medium">2 days ago</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Modified:</span>
            <span className="font-medium">1 hour ago</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Size:</span>
            <span className="font-medium">2.4 MB</span>
          </div>
        </div>
      </CardContent>
      <CardDivider />
      <CardFooter>
        <Button variant="ghost" size="sm" fullWidth>
          View Details
        </Button>
      </CardFooter>
    </Card>
  ),
}

/**
 * Blog post card
 */
export const BlogPostCard: Story = {
  render: () => (
    <Card padding="none" className="w-96" clickable onCardClick={() => console.log('Read more')}>
      <CardImage
        src="https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400"
        alt="Blog post"
        aspectRatio="16/9"
      />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Technology</span>
          <span>•</span>
          <span>5 min read</span>
        </div>
        <CardHeader
          title="Getting Started with React 19"
          subtitle="Learn about the new features in React 19"
        />
        <CardContent>
          Explore the latest features and improvements in React 19, including automatic batching,
          transitions, and more.
        </CardContent>
        <CardFooter>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <button className="flex items-center gap-1 hover:text-primary-600">
              <HeartIcon className="h-4 w-4" />
              <span>24</span>
            </button>
            <button className="flex items-center gap-1 hover:text-primary-600">
              <ShareIcon className="h-4 w-4" />
              <span>Share</span>
            </button>
            <button className="flex items-center gap-1 hover:text-primary-600">
              <BookmarkIcon className="h-4 w-4" />
              <span>Save</span>
            </button>
          </div>
        </CardFooter>
      </div>
    </Card>
  ),
}

/**
 * Product card
 */
export const ProductCard: Story = {
  render: () => (
    <Card padding="none" className="w-72">
      <CardImage
        src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400"
        alt="Headphones"
        aspectRatio="1/1"
      />
      <div className="p-4 space-y-3">
        <CardHeader title="Premium Headphones" subtitle="Wireless • Noise Cancelling" />
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">$299</span>
            <span className="text-sm text-gray-500 line-through">$399</span>
            <span className="text-sm font-medium text-success-600">25% off</span>
          </div>
        </CardContent>
        <CardFooter>
          <Button fullWidth>Add to Cart</Button>
        </CardFooter>
      </div>
    </Card>
  ),
}

/**
 * Stat card
 */
export const StatCard: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <CardContent>
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Users</div>
          <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">12,543</div>
          <div className="mt-2 text-sm text-success-600">+12.5% from last month</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="text-sm text-gray-500 dark:text-gray-400">Revenue</div>
          <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">$45,231</div>
          <div className="mt-2 text-sm text-success-600">+8.2% from last month</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="text-sm text-gray-500 dark:text-gray-400">Active Projects</div>
          <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">89</div>
          <div className="mt-2 text-sm text-error-600">-3.1% from last month</div>
        </CardContent>
      </Card>
    </div>
  ),
}

/**
 * User profile card
 */
export const UserProfileCard: Story = {
  render: () => (
    <Card className="w-80">
      <div className="flex items-center gap-4">
        <img
          src="https://i.pravatar.cc/150?img=12"
          alt="User avatar"
          className="h-16 w-16 rounded-full"
        />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">John Doe</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Product Designer</p>
        </div>
      </div>
      <CardDivider className="my-4" />
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">125</div>
            <div className="text-xs text-gray-500">Projects</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">2.5K</div>
            <div className="text-xs text-gray-500">Followers</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">890</div>
            <div className="text-xs text-gray-500">Following</div>
          </div>
        </div>
      </CardContent>
      <CardDivider className="my-4" />
      <CardFooter>
        <Button variant="ghost" size="sm" fullWidth>
          View Profile
        </Button>
      </CardFooter>
    </Card>
  ),
}

/**
 * Notification card
 */
export const NotificationCard: Story = {
  render: () => (
    <Card className="w-96" clickable onCardClick={() => console.log('Notification clicked')}>
      <div className="flex gap-3">
        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center">
          <span className="text-primary-600 dark:text-primary-400 font-semibold">JD</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            <span className="font-semibold">John Doe</span> commented on your document
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            "Great work on this project! The design looks fantastic."
          </p>
          <p className="mt-2 text-xs text-gray-400">2 hours ago</p>
        </div>
      </div>
    </Card>
  ),
}
