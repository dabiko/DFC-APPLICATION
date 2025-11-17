import type { Meta, StoryObj } from '@storybook/react'
import { ShareNotifications } from './ShareNotifications'
import { CollaborationPanel } from './CollaborationPanel'
import type {
  ShareNotification,
  Comment,
  ActiveViewer,
  DocumentAnnotation,
  User,
} from '@/types/sharing'

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

const mockUser3: User = {
  id: '3',
  name: 'Michael Chen',
  email: 'michael.chen@company.com',
  department: 'Compliance',
  isActive: true,
}

// Mock notifications
const mockNotifications: ShareNotification[] = [
  {
    id: 'n1',
    type: 'share_received',
    documentId: 'doc-1',
    documentName: 'Financial Report Q4 2024.pdf',
    sender: mockUser2,
    recipient: mockUser1,
    message: 'Please review and provide feedback',
    createdAt: '2025-11-16T10:00:00Z',
    isRead: false,
  },
  {
    id: 'n2',
    type: 'comment_added',
    documentId: 'doc-2',
    documentName: 'Project Plan.docx',
    shareId: 's2',
    sender: mockUser3,
    recipient: mockUser1,
    message: 'What do you think about the timeline?',
    createdAt: '2025-11-16T09:30:00Z',
    isRead: false,
  },
  {
    id: 'n3',
    type: 'share_accessed',
    documentId: 'doc-3',
    documentName: 'Client Presentation.pptx',
    shareId: 's3',
    sender: mockUser2,
    recipient: mockUser1,
    createdAt: '2025-11-15T16:00:00Z',
    isRead: true,
  },
  {
    id: 'n4',
    type: 'share_expiring',
    documentId: 'doc-4',
    documentName: 'Confidential Contract.pdf',
    shareId: 's4',
    sender: mockUser1,
    recipient: mockUser1,
    message: 'This share will expire in 2 days',
    createdAt: '2025-11-15T10:00:00Z',
    isRead: false,
  },
  {
    id: 'n5',
    type: 'share_expired',
    documentId: 'doc-5',
    documentName: 'Old Report.pdf',
    shareId: 's5',
    sender: mockUser1,
    recipient: mockUser1,
    message: 'Share link has expired',
    createdAt: '2025-11-14T08:00:00Z',
    isRead: true,
  },
]

// Mock comments
const mockComments: Comment[] = [
  {
    id: 'c1',
    documentId: 'doc-1',
    author: mockUser2,
    content: 'Great work on this report! The financial analysis is very thorough.',
    createdAt: '2025-11-16T10:00:00Z',
    isEdited: false,
    reactions: [
      {
        id: 'r1',
        commentId: 'c1',
        user: mockUser1,
        emoji: '👍',
        createdAt: '2025-11-16T10:05:00Z',
      },
    ],
  },
  {
    id: 'c2',
    documentId: 'doc-1',
    author: mockUser3,
    content: 'I have a question about the revenue projections in Q3. Can you elaborate?',
    createdAt: '2025-11-16T11:00:00Z',
    isEdited: false,
    replies: [
      {
        id: 'c3',
        documentId: 'doc-1',
        author: mockUser1,
        content: 'Sure! The projections are based on historical growth patterns and market analysis.',
        createdAt: '2025-11-16T11:30:00Z',
        isEdited: false,
        parentId: 'c2',
      },
    ],
  },
  {
    id: 'c4',
    documentId: 'doc-1',
    author: mockUser1,
    content: '@Sarah can you review the compliance section?',
    createdAt: '2025-11-16T12:00:00Z',
    isEdited: true,
    mentions: [mockUser2],
  },
]

// Mock active viewers
const mockActiveViewers: ActiveViewer[] = [
  {
    user: mockUser2,
    joinedAt: '2025-11-16T14:00:00Z',
    lastSeenAt: '2025-11-16T14:30:00Z',
    isTyping: true,
    color: '#3B82F6',
  },
  {
    user: mockUser3,
    joinedAt: '2025-11-16T14:15:00Z',
    lastSeenAt: '2025-11-16T14:30:00Z',
    isTyping: false,
    color: '#10B981',
  },
]

// Mock annotations
const mockAnnotations: DocumentAnnotation[] = [
  {
    id: 'a1',
    documentId: 'doc-1',
    pageNumber: 5,
    position: { x: 100, y: 200, width: 200, height: 20 },
    type: 'highlight',
    color: '#FBBF24',
    author: mockUser2,
    createdAt: '2025-11-16T10:00:00Z',
    isResolved: false,
  },
  {
    id: 'a2',
    documentId: 'doc-1',
    pageNumber: 8,
    position: { x: 150, y: 300 },
    type: 'note',
    content: 'This section needs more detail about the methodology',
    color: '#3B82F6',
    author: mockUser3,
    createdAt: '2025-11-16T11:00:00Z',
    isResolved: false,
  },
  {
    id: 'a3',
    documentId: 'doc-1',
    pageNumber: 12,
    position: { x: 200, y: 400, width: 150, height: 30 },
    type: 'highlight',
    color: '#EF4444',
    content: 'Important: verify these numbers',
    author: mockUser1,
    createdAt: '2025-11-16T09:00:00Z',
    isResolved: true,
  },
]

// ShareNotifications Stories
const notificationsMeta = {
  title: 'Sharing/ShareNotifications',
  component: ShareNotifications,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ShareNotifications>

export default notificationsMeta

export const NotificationsDefault: StoryObj<typeof ShareNotifications> = {
  args: {
    notifications: mockNotifications,
    onMarkAsRead: (id) => console.log('Mark as read:', id),
    onMarkAllAsRead: () => console.log('Mark all as read'),
    onDeleteNotification: (id) => console.log('Delete notification:', id),
    onNavigate: (notification) => console.log('Navigate to:', notification),
    unreadCount: 3,
  },
  parameters: {
    docs: {
      description: {
        story: 'Default notification center with multiple notification types',
      },
    },
  },
}

export const NotificationsUnreadOnly: StoryObj<typeof ShareNotifications> = {
  args: {
    notifications: mockNotifications.filter(n => !n.isRead),
    onMarkAsRead: (id) => console.log('Mark as read:', id),
    onMarkAllAsRead: () => console.log('Mark all as read'),
    onDeleteNotification: (id) => console.log('Delete notification:', id),
    onNavigate: (notification) => console.log('Navigate to:', notification),
    unreadCount: 3,
  },
  parameters: {
    docs: {
      description: {
        story: 'Filtered view showing only unread notifications',
      },
    },
  },
}

export const NotificationsEmpty: StoryObj<typeof ShareNotifications> = {
  args: {
    notifications: [],
    onMarkAsRead: (id) => console.log('Mark as read:', id),
    onMarkAllAsRead: () => console.log('Mark all as read'),
    onDeleteNotification: (id) => console.log('Delete notification:', id),
    onNavigate: (notification) => console.log('Navigate to:', notification),
    unreadCount: 0,
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty state when no notifications are available',
      },
    },
  },
}

// CollaborationPanel Stories
const collaborationMeta = {
  title: 'Sharing/CollaborationPanel',
  component: CollaborationPanel,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CollaborationPanel>

export const CollaborationDefault: StoryObj<typeof CollaborationPanel> = {
  args: {
    documentId: 'doc-1',
    activeViewers: mockActiveViewers,
    comments: mockComments,
    annotations: mockAnnotations,
    onAddComment: (content, mentions) => console.log('Add comment:', content, mentions),
    onReplyToComment: (commentId, content) => console.log('Reply to:', commentId, content),
    onAddAnnotation: (annotation) => console.log('Add annotation:', annotation),
    onResolveAnnotation: (annotationId) => console.log('Resolve annotation:', annotationId),
    currentUser: mockUser1,
    canComment: true,
    canAnnotate: true,
    showViewers: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Complete collaboration panel with comments, annotations, and active viewers',
      },
    },
  },
}

export const CollaborationCommentsOnly: StoryObj<typeof CollaborationPanel> = {
  args: {
    documentId: 'doc-1',
    activeViewers: mockActiveViewers,
    comments: mockComments,
    annotations: [],
    onAddComment: (content, mentions) => console.log('Add comment:', content, mentions),
    onReplyToComment: (commentId, content) => console.log('Reply to:', commentId, content),
    currentUser: mockUser1,
    canComment: true,
    canAnnotate: false,
    showViewers: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Panel showing only comments section',
      },
    },
  },
}

export const CollaborationAnnotationsOnly: StoryObj<typeof CollaborationPanel> = {
  args: {
    documentId: 'doc-1',
    activeViewers: mockActiveViewers,
    comments: [],
    annotations: mockAnnotations,
    onAddAnnotation: (annotation) => console.log('Add annotation:', annotation),
    onResolveAnnotation: (annotationId) => console.log('Resolve annotation:', annotationId),
    currentUser: mockUser1,
    canComment: false,
    canAnnotate: true,
    showViewers: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Panel showing only annotations section',
      },
    },
  },
}

export const CollaborationReadOnly: StoryObj<typeof CollaborationPanel> = {
  args: {
    documentId: 'doc-1',
    activeViewers: mockActiveViewers,
    comments: mockComments,
    annotations: mockAnnotations,
    currentUser: mockUser1,
    canComment: false,
    canAnnotate: false,
    showViewers: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Read-only view without ability to add comments or annotations',
      },
    },
  },
}

export const CollaborationEmpty: StoryObj<typeof CollaborationPanel> = {
  args: {
    documentId: 'doc-1',
    activeViewers: [],
    comments: [],
    annotations: [],
    onAddComment: (content, mentions) => console.log('Add comment:', content, mentions),
    onAddAnnotation: (annotation) => console.log('Add annotation:', annotation),
    currentUser: mockUser1,
    canComment: true,
    canAnnotate: true,
    showViewers: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty state with no comments, annotations, or active viewers',
      },
    },
  },
}

export const CollaborationNoViewers: StoryObj<typeof CollaborationPanel> = {
  args: {
    documentId: 'doc-1',
    activeViewers: [],
    comments: mockComments,
    annotations: mockAnnotations,
    onAddComment: (content, mentions) => console.log('Add comment:', content, mentions),
    onReplyToComment: (commentId, content) => console.log('Reply to:', commentId, content),
    onAddAnnotation: (annotation) => console.log('Add annotation:', annotation),
    onResolveAnnotation: (annotationId) => console.log('Resolve annotation:', annotationId),
    currentUser: mockUser1,
    canComment: true,
    canAnnotate: true,
    showViewers: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Panel without active viewers section',
      },
    },
  },
}
