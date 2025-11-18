import type { Meta, StoryObj } from '@storybook/react'
import { SharedByMeView } from './SharedByMeView'
import { SharedWithMeView } from './SharedWithMeView'
import type { SharedByMeItem, SharedWithMeItem, User } from '@/types/sharing'

// Mock users
const mockUser1: User = {
  id: '1',
  name: 'John Smith',
  email: 'john.smith@company.com',
  avatar: 'https://i.pravatar.cc/150?img=1',
  department: 'Finance',
  isActive: true,
}

const mockUser2: User = {
  id: '2',
  name: 'Sarah Johnson',
  email: 'sarah.johnson@company.com',
  avatar: 'https://i.pravatar.cc/150?img=5',
  department: 'IT',
  isActive: true,
}

// Mock data for SharedByMe
const mockSharedByMeItems: SharedByMeItem[] = [
  {
    share: {
      id: 's1',
      documentId: 'doc-1',
      documentName: 'Financial Report Q4 2024.pdf',
      sharedBy: mockUser1,
      sharedWith: mockUser2,
      shareType: 'user',
      permissionLevel: 'view',
      canReshare: false,
      createdAt: '2025-11-15T10:00:00Z',
      accessCount: 12,
      status: 'active',
      lastAccessedAt: '2025-11-16T15:30:00Z',
    },
    document: {
      id: 'doc-1',
      name: 'Financial Report Q4 2024.pdf',
      type: 'PDF',
      size: 2500000,
      thumbnail: 'https://via.placeholder.com/150/0000FF/FFFFFF?text=PDF',
    },
    stats: {
      totalShares: 3,
      activeShares: 2,
      totalAccesses: 25,
      lastAccessed: '2025-11-16T15:30:00Z',
    },
  },
  {
    share: {
      id: 's2',
      documentId: 'doc-2',
      documentName: 'Client Presentation.pptx',
      recipientEmail: 'external@client.com',
      sharedBy: mockUser1,
      permissionLevel: 'view',
      password: 'hashed',
      passwordProtected: true,
      expiryDate: '2025-11-20T00:00:00Z',
      createdAt: '2025-11-10T09:00:00Z',
      accessCount: 5,
      status: 'active',
      invitationSent: true,
      invitationSentAt: '2025-11-10T09:00:00Z',
    },
    document: {
      id: 'doc-2',
      name: 'Client Presentation.pptx',
      type: 'PowerPoint',
      size: 5000000,
      thumbnail: 'https://via.placeholder.com/150/FF6347/FFFFFF?text=PPT',
    },
    stats: {
      totalShares: 1,
      activeShares: 1,
      totalAccesses: 5,
      lastAccessed: '2025-11-14T11:20:00Z',
    },
  },
  {
    share: {
      id: 's3',
      documentId: 'doc-3',
      documentName: 'Product Roadmap 2025.docx',
      token: 'abc123xyz',
      url: 'https://app.com/shared/abc123xyz',
      createdBy: mockUser1,
      createdAt: '2025-11-05T14:00:00Z',
      permissionLevel: 'download',
      passwordProtected: false,
      maxAccessCount: 50,
      currentAccessCount: 18,
      status: 'active',
      expiryDate: '2025-12-05T00:00:00Z',
    },
    document: {
      id: 'doc-3',
      name: 'Product Roadmap 2025.docx',
      type: 'Word',
      size: 1200000,
      thumbnail: 'https://via.placeholder.com/150/4169E1/FFFFFF?text=DOC',
    },
    stats: {
      totalShares: 1,
      activeShares: 1,
      totalAccesses: 18,
      lastAccessed: '2025-11-15T16:45:00Z',
    },
  },
  {
    share: {
      id: 's4',
      documentId: 'doc-4',
      documentName: 'Expired Contract.pdf',
      sharedBy: mockUser1,
      sharedWith: mockUser2,
      shareType: 'user',
      permissionLevel: 'view',
      canReshare: false,
      expiryDate: '2025-11-01T00:00:00Z',
      createdAt: '2025-10-15T10:00:00Z',
      accessCount: 8,
      status: 'expired',
    },
    document: {
      id: 'doc-4',
      name: 'Expired Contract.pdf',
      type: 'PDF',
      size: 800000,
    },
    stats: {
      totalShares: 1,
      activeShares: 0,
      totalAccesses: 8,
      lastAccessed: '2025-10-30T12:00:00Z',
    },
  },
]

// Mock data for SharedWithMe
const mockSharedWithMeItems: SharedWithMeItem[] = [
  {
    share: {
      id: 's10',
      documentId: 'doc-10',
      documentName: 'Budget Proposal 2025.xlsx',
      sharedBy: mockUser2,
      sharedWith: mockUser1,
      shareType: 'user',
      permissionLevel: 'edit',
      canReshare: true,
      createdAt: '2025-11-14T08:00:00Z',
      accessCount: 3,
      status: 'active',
      lastAccessedAt: '2025-11-16T10:00:00Z',
    },
    document: {
      id: 'doc-10',
      name: 'Budget Proposal 2025.xlsx',
      type: 'Excel',
      size: 3200000,
      thumbnail: 'https://via.placeholder.com/150/228B22/FFFFFF?text=XLS',
      path: '/finance/budgets/2025-proposal.xlsx',
    },
    sharedBy: mockUser2,
    myPermission: 'edit',
    unreadComments: 3,
    isNew: true,
  },
  {
    share: {
      id: 's11',
      documentId: 'doc-11',
      documentName: 'Team Guidelines.docx',
      sharedBy: mockUser2,
      sharedWith: mockUser1,
      shareType: 'user',
      permissionLevel: 'view',
      canReshare: false,
      createdAt: '2025-11-10T12:00:00Z',
      accessCount: 5,
      status: 'active',
      lastAccessedAt: '2025-11-12T14:30:00Z',
    },
    document: {
      id: 'doc-11',
      name: 'Team Guidelines.docx',
      type: 'Word',
      size: 950000,
      path: '/hr/guidelines/team-guidelines.docx',
    },
    sharedBy: mockUser2,
    myPermission: 'view',
    isNew: false,
  },
  {
    share: {
      id: 's12',
      documentId: 'doc-12',
      documentName: 'Project Plan.pdf',
      sharedBy: mockUser2,
      sharedWith: mockUser1,
      shareType: 'user',
      permissionLevel: 'download',
      canReshare: false,
      createdAt: '2025-11-08T09:00:00Z',
      accessCount: 2,
      status: 'active',
    },
    document: {
      id: 'doc-12',
      name: 'Project Plan.pdf',
      type: 'PDF',
      size: 1800000,
      thumbnail: 'https://via.placeholder.com/150/FF4500/FFFFFF?text=PDF',
      path: '/projects/plans/project-plan.pdf',
    },
    sharedBy: mockUser2,
    myPermission: 'download',
    unreadComments: 0,
    isNew: false,
  },
]

// SharedByMeView Stories
const sharedByMeMeta = {
  title: 'Sharing/SharedByMeView',
  component: SharedByMeView,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SharedByMeView>

export default sharedByMeMeta

export const SharedByMeDefault: StoryObj<typeof SharedByMeView> = {
  args: {
    items: mockSharedByMeItems,
    onRevokeShare: (shareId) => console.log('Revoke share:', shareId),
    onEditShare: (share) => console.log('Edit share:', share),
    onExtendExpiry: (shareId, newDate) => console.log('Extend expiry:', shareId, newDate),
    onViewActivity: (shareId) => console.log('View activity:', shareId),
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Default view showing all documents shared by the current user',
      },
    },
  },
}

export const SharedByMeActiveOnly: StoryObj<typeof SharedByMeView> = {
  args: {
    items: mockSharedByMeItems.filter((item) => item.share.status === 'active'),
    onRevokeShare: (shareId) => console.log('Revoke share:', shareId),
    onEditShare: (share) => console.log('Edit share:', share),
    onExtendExpiry: (shareId, newDate) => console.log('Extend expiry:', shareId, newDate),
    onViewActivity: (shareId) => console.log('View activity:', shareId),
    filter: 'active',
    onFilterChange: (filter) => console.log('Filter changed:', filter),
  },
  parameters: {
    docs: {
      description: {
        story: 'View filtered to show only active shares',
      },
    },
  },
}

export const SharedByMeEmpty: StoryObj<typeof SharedByMeView> = {
  args: {
    items: [],
    onRevokeShare: (shareId) => console.log('Revoke share:', shareId),
    onEditShare: (share) => console.log('Edit share:', share),
    onExtendExpiry: (shareId, newDate) => console.log('Extend expiry:', shareId, newDate),
    onViewActivity: (shareId) => console.log('View activity:', shareId),
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty state when no documents have been shared',
      },
    },
  },
}

export const SharedByMeLoading: StoryObj<typeof SharedByMeView> = {
  args: {
    items: [],
    onRevokeShare: (shareId) => console.log('Revoke share:', shareId),
    onEditShare: (share) => console.log('Edit share:', share),
    onExtendExpiry: (shareId, newDate) => console.log('Extend expiry:', shareId, newDate),
    onViewActivity: (shareId) => console.log('View activity:', shareId),
    loading: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Loading state while fetching shares',
      },
    },
  },
}

// SharedWithMeView Stories
const sharedWithMeMeta = {
  title: 'Sharing/SharedWithMeView',
  component: SharedWithMeView,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SharedWithMeView>

export const SharedWithMeDefault: StoryObj<typeof SharedWithMeView> = {
  args: {
    items: mockSharedWithMeItems,
    onOpenDocument: (docId) => console.log('Open document:', docId),
    onRemoveShare: (shareId) => console.log('Remove share:', shareId),
    sortBy: 'date',
    onSortChange: (sort) => console.log('Sort changed:', sort),
  },
  parameters: {
    docs: {
      description: {
        story: 'Default view showing all documents shared with the current user',
      },
    },
  },
}

export const SharedWithMeWithUnread: StoryObj<typeof SharedWithMeView> = {
  args: {
    items: mockSharedWithMeItems,
    onOpenDocument: (docId) => console.log('Open document:', docId),
    sortBy: 'date',
  },
  parameters: {
    docs: {
      description: {
        story: 'View showing unread comments and new share indicators',
      },
    },
  },
}

export const SharedWithMeEmpty: StoryObj<typeof SharedWithMeView> = {
  args: {
    items: [],
    onOpenDocument: (docId) => console.log('Open document:', docId),
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty state when no documents have been shared with user',
      },
    },
  },
}

export const SharedWithMeLoading: StoryObj<typeof SharedWithMeView> = {
  args: {
    items: [],
    onOpenDocument: (docId) => console.log('Open document:', docId),
    loading: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Loading state while fetching shared documents',
      },
    },
  },
}
