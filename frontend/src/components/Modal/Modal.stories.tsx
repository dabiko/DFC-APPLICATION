import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Modal, ConfirmDialog, Drawer } from './index'
import { Button } from '@components/Button'
import { Input } from '@components/Input'

const meta: Meta<typeof Modal> = {
  title: 'Components/Modal',
  component: Modal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Modal>

/**
 * Basic modal
 */
export const BasicModal: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false)

    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
        <Modal open={isOpen} onClose={() => setIsOpen(false)} title="Modal Title">
          <p className="text-gray-600 dark:text-gray-400">
            This is a basic modal. Click the X button or the overlay to close it.
          </p>
        </Modal>
      </>
    )
  },
}

/**
 * Modal with description
 */
export const WithDescription: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false)

    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
        <Modal
          open={isOpen}
          onClose={() => setIsOpen(false)}
          title="Delete Account"
          description="This action cannot be undone"
        >
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete your account? All of your data will be permanently
            removed from our servers forever. This action cannot be undone.
          </p>
        </Modal>
      </>
    )
  },
}

/**
 * Modal sizes
 */
export const ModalSizes: Story = {
  render: () => {
    const [size, setSize] = useState<'sm' | 'md' | 'lg' | 'xl' | 'full' | null>(null)

    return (
      <>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setSize('sm')}>
            Small
          </Button>
          <Button size="sm" onClick={() => setSize('md')}>
            Medium
          </Button>
          <Button size="sm" onClick={() => setSize('lg')}>
            Large
          </Button>
          <Button size="sm" onClick={() => setSize('xl')}>
            XLarge
          </Button>
          <Button size="sm" onClick={() => setSize('full')}>
            Full
          </Button>
        </div>

        <Modal
          open={size !== null}
          onClose={() => setSize(null)}
          title={`${size?.toUpperCase()} Modal`}
          size={size || 'md'}
        >
          <p className="text-gray-600 dark:text-gray-400">
            This is a {size} sized modal. The content area adjusts based on the size variant.
          </p>
        </Modal>
      </>
    )
  },
}

/**
 * Modal with footer
 */
export const WithFooter: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false)

    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
        <Modal
          open={isOpen}
          onClose={() => setIsOpen(false)}
          title="Edit Profile"
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsOpen(false)}>Save Changes</Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input label="Name" placeholder="Enter your name" />
            <Input label="Email" type="email" placeholder="Enter your email" />
          </div>
        </Modal>
      </>
    )
  },
}

/**
 * Modal without close button
 */
export const WithoutCloseButton: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false)

    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
        <Modal
          open={isOpen}
          onClose={() => setIsOpen(false)}
          title="Please Confirm"
          showCloseButton={false}
          closeOnOverlayClick={false}
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsOpen(false)}>Confirm</Button>
            </>
          }
        >
          <p className="text-gray-600 dark:text-gray-400">
            This modal cannot be closed by clicking the overlay. You must use the buttons.
          </p>
        </Modal>
      </>
    )
  },
}

/**
 * Confirm dialog - Info variant
 */
export const ConfirmDialogInfo: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false)

    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Confirm Dialog</Button>
        <ConfirmDialog
          open={isOpen}
          onClose={() => setIsOpen(false)}
          onConfirm={() => console.log('Confirmed!')}
          title="Confirm Action"
          message="Are you sure you want to proceed with this action?"
          variant="info"
        />
      </>
    )
  },
}

/**
 * Confirm dialog - Warning variant
 */
export const ConfirmDialogWarning: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false)

    return (
      <>
        <Button variant="secondary" onClick={() => setIsOpen(true)}>
          Open Warning Dialog
        </Button>
        <ConfirmDialog
          open={isOpen}
          onClose={() => setIsOpen(false)}
          onConfirm={() => console.log('Confirmed!')}
          title="Warning"
          message="This action may have unintended consequences. Please review carefully before proceeding."
          variant="warning"
          confirmText="Proceed Anyway"
        />
      </>
    )
  },
}

/**
 * Confirm dialog - Danger variant
 */
export const ConfirmDialogDanger: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false)

    return (
      <>
        <Button variant="danger" onClick={() => setIsOpen(true)}>
          Delete Item
        </Button>
        <ConfirmDialog
          open={isOpen}
          onClose={() => setIsOpen(false)}
          onConfirm={() => console.log('Deleted!')}
          title="Delete Document"
          message="Are you sure you want to delete this document? This action cannot be undone and all associated data will be permanently removed."
          variant="danger"
          confirmText="Delete"
          cancelText="Keep Document"
        />
      </>
    )
  },
}

/**
 * Confirm dialog with loading state
 */
export const ConfirmDialogLoading: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleConfirm = () => {
      setLoading(true)
      setTimeout(() => {
        setLoading(false)
        setIsOpen(false)
      }, 2000)
    }

    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Dialog</Button>
        <ConfirmDialog
          open={isOpen}
          onClose={() => setIsOpen(false)}
          onConfirm={handleConfirm}
          title="Save Changes"
          message="Do you want to save your changes?"
          loading={loading}
          confirmText="Save"
        />
      </>
    )
  },
}

/**
 * Drawer from right
 */
export const DrawerRight: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false)

    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Right Drawer</Button>
        <Drawer
          open={isOpen}
          onClose={() => setIsOpen(false)}
          title="Filters"
          description="Refine your search results"
          position="right"
        >
          <div className="space-y-4">
            <Input label="Search" placeholder="Search..." />
            <Input label="Category" placeholder="Select category" />
            <Input label="Date Range" type="date" />
          </div>
        </Drawer>
      </>
    )
  },
}

/**
 * Drawer from left
 */
export const DrawerLeft: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false)

    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Left Drawer</Button>
        <Drawer open={isOpen} onClose={() => setIsOpen(false)} title="Navigation" position="left">
          <nav className="space-y-2">
            <a
              href="#"
              className="block px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Dashboard
            </a>
            <a
              href="#"
              className="block px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Documents
            </a>
            <a
              href="#"
              className="block px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Settings
            </a>
            <a
              href="#"
              className="block px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Profile
            </a>
          </nav>
        </Drawer>
      </>
    )
  },
}

/**
 * Drawer sizes
 */
export const DrawerSizes: Story = {
  render: () => {
    const [size, setSize] = useState<'sm' | 'md' | 'lg' | 'xl' | null>(null)

    return (
      <>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setSize('sm')}>
            Small
          </Button>
          <Button size="sm" onClick={() => setSize('md')}>
            Medium
          </Button>
          <Button size="sm" onClick={() => setSize('lg')}>
            Large
          </Button>
          <Button size="sm" onClick={() => setSize('xl')}>
            XLarge
          </Button>
        </div>

        <Drawer
          open={size !== null}
          onClose={() => setSize(null)}
          title={`${size?.toUpperCase()} Drawer`}
          size={size || 'md'}
        >
          <p className="text-gray-600 dark:text-gray-400">
            This is a {size} sized drawer. The width adjusts based on the size variant.
          </p>
        </Drawer>
      </>
    )
  },
}

/**
 * Drawer with footer
 */
export const DrawerWithFooter: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false)

    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Drawer</Button>
        <Drawer
          open={isOpen}
          onClose={() => setIsOpen(false)}
          title="Edit Settings"
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsOpen(false)}>Apply</Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input label="Username" placeholder="Enter username" />
            <Input label="Email" type="email" placeholder="Enter email" />
            <Input label="Phone" type="tel" placeholder="Enter phone" />
          </div>
        </Drawer>
      </>
    )
  },
}

/**
 * Form in modal example
 */
export const FormInModal: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false)
    const [formData, setFormData] = useState({ name: '', email: '', message: '' })

    const handleSubmit = () => {
      console.log('Form submitted:', formData)
      setIsOpen(false)
    }

    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Contact Us</Button>
        <Modal
          open={isOpen}
          onClose={() => setIsOpen(false)}
          title="Contact Form"
          description="We'll get back to you as soon as possible"
          size="lg"
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>Send Message</Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Name"
              placeholder="Your name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              label="Message"
              placeholder="Your message..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            />
          </div>
        </Modal>
      </>
    )
  },
}
