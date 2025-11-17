import type { Meta, StoryObj } from '@storybook/react'
import { ShareModal } from './ShareModal'
import type { User, UserGroup } from '@/types/sharing'

// Mock data
const mockUsers: User[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@company.com',
    avatar: 'https://i.pravatar.cc/150?img=1',
    department: 'Finance',
    role: 'Senior Analyst',
    isActive: true,
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@company.com',
    avatar: 'https://i.pravatar.cc/150?img=5',
    department: 'IT',
    role: 'System Administrator',
    isActive: true,
  },
  {
    id: '3',
    name: 'Michael Chen',
    email: 'michael.chen@company.com',
    department: 'Compliance',
    role: 'Compliance Officer',
    isActive: true,
  },
]

const mockGroups: UserGroup[] = [
  {
    id: 'g1',
    name: 'Finance Team',
    description: 'All finance department members',
    memberCount: 12,
    createdAt: '2025-01-01T00:00:00Z',
    createdBy: '1',
  },
  {
    id: 'g2',
    name: 'Executive Team',
    description: 'C-level executives',
    memberCount: 5,
    createdAt: '2025-01-01T00:00:00Z',
    createdBy: '1',
  },
]

const meta = {
  title: 'Sharing/ShareModal',
  component: ShareModal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    initialTab: {
      control: 'select',
      options: ['internal', 'external', 'link'],
      description: 'Initial active tab',
    },
  },
} satisfies Meta<typeof ShareModal>

export default meta
type Story = StoryObj<typeof meta>

export const InternalSharing: Story = {
  args: {
    documentId: 'doc-123',
    documentName: 'Financial Report Q4 2024.pdf',
    isOpen: true,
    onClose: () => console.log('Modal closed'),
    initialTab: 'internal',
  },
  parameters: {
    docs: {
      description: {
        story: 'Share documents with internal users and groups',
      },
    },
  },
}

export const ExternalSharing: Story = {
  args: {
    documentId: 'doc-123',
    documentName: 'Client Presentation.pptx',
    isOpen: true,
    onClose: () => console.log('Modal closed'),
    initialTab: 'external',
  },
  parameters: {
    docs: {
      description: {
        story: 'Share documents with external recipients via email with password protection',
      },
    },
  },
}

export const LinkSharing: Story = {
  args: {
    documentId: 'doc-123',
    documentName: 'Product Roadmap 2025.docx',
    isOpen: true,
    onClose: () => console.log('Modal closed'),
    initialTab: 'link',
  },
  parameters: {
    docs: {
      description: {
        story: 'Generate shareable links with access controls and expiry dates',
      },
    },
  },
}

export const WithExistingShares: Story = {
  args: {
    documentId: 'doc-123',
    documentName: 'Contract Template.pdf',
    isOpen: true,
    onClose: () => console.log('Modal closed'),
    initialTab: 'internal',
    existingShares: [
      {
        id: 's1',
        documentId: 'doc-123',
        documentName: 'Contract Template.pdf',
        sharedBy: mockUsers[0],
        sharedWith: mockUsers[1],
        shareType: 'user',
        permissionLevel: 'view',
        canReshare: false,
        createdAt: '2025-11-10T10:00:00Z',
        accessCount: 5,
        status: 'active',
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Modal showing existing shares for the document',
      },
    },
  },
}

export const Closed: Story = {
  args: {
    documentId: 'doc-123',
    documentName: 'Report.pdf',
    isOpen: false,
    onClose: () => console.log('Modal closed'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Closed state of the modal',
      },
    },
  },
}
