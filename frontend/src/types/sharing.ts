/**
 * Sharing & Collaboration Type Definitions
 * Week 21: Comprehensive type system for secure document sharing
 */

// ============================================================================
// Core Enums and Types
// ============================================================================

export type ShareType = 'internal' | 'external' | 'link'

export type PermissionLevel = 'view' | 'comment' | 'edit' | 'download' | 'full'

export type ShareStatus = 'active' | 'expired' | 'revoked' | 'pending'

export type NotificationFrequency = 'immediate' | 'daily' | 'weekly' | 'off'

export type ShareMethod = 'email' | 'link' | 'direct'

export type ActivityType =
  | 'shared'
  | 'accessed'
  | 'downloaded'
  | 'edited'
  | 'commented'
  | 'revoked'
  | 'expired'

// ============================================================================
// User and Group Interfaces
// ============================================================================

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  department?: string
  role?: string
  isActive: boolean
}

export interface UserGroup {
  id: string
  name: string
  description?: string
  memberCount: number
  members?: User[]
  createdAt: string
  createdBy: string
}

// ============================================================================
// Share Interfaces
// ============================================================================

export interface InternalShare {
  id: string
  documentId: string
  documentName: string
  sharedBy: User
  sharedWith: User | UserGroup
  shareType: 'user' | 'group'
  permissionLevel: PermissionLevel
  canReshare: boolean
  expiryDate?: string
  createdAt: string
  lastAccessedAt?: string
  accessCount: number
  status: ShareStatus
  message?: string
}

export interface ExternalShare {
  id: string
  documentId: string
  documentName: string
  sharedBy: User
  recipientEmail: string
  recipientName?: string
  permissionLevel: 'view' | 'download'
  password: string
  passwordProtected: true
  expiryDate: string
  createdAt: string
  lastAccessedAt?: string
  accessCount: number
  status: ShareStatus
  message?: string
  invitationSent: boolean
  invitationSentAt?: string
}

export interface ShareLink {
  id: string
  documentId: string
  documentName: string
  token: string
  url: string
  qrCode?: string
  createdBy: User
  createdAt: string
  expiryDate?: string
  permissionLevel: PermissionLevel
  password?: string
  passwordProtected: boolean
  maxAccessCount?: number
  currentAccessCount: number
  allowedDomains?: string[]
  status: ShareStatus
  lastAccessedAt?: string
  accessLog?: ShareAccessLog[]
}

export interface ShareAccessLog {
  id: string
  shareId: string
  accessedAt: string
  ipAddress: string
  userAgent: string
  location?: string
  accessorEmail?: string
  accessorName?: string
  success: boolean
  failureReason?: string
}

// ============================================================================
// Share Request/Response Interfaces
// ============================================================================

export interface CreateInternalShareRequest {
  documentId: string
  userIds?: string[]
  groupIds?: string[]
  permissionLevel: PermissionLevel
  canReshare?: boolean
  expiryDate?: string
  message?: string
  sendNotification?: boolean
}

export interface CreateExternalShareRequest {
  documentId: string
  recipientEmails: string[]
  recipientNames?: string[]
  permissionLevel: 'view' | 'download'
  password: string
  expiryDate: string
  message?: string
  sendInvitation?: boolean
}

export interface CreateShareLinkRequest {
  documentId: string
  permissionLevel: PermissionLevel
  expiryDate?: string
  password?: string
  maxAccessCount?: number
  allowedDomains?: string[]
}

export interface UpdateShareRequest {
  shareId: string
  permissionLevel?: PermissionLevel
  expiryDate?: string
  canReshare?: boolean
  status?: ShareStatus
}

// ============================================================================
// Share Activity Interfaces
// ============================================================================

export interface ShareActivity {
  id: string
  shareId: string
  documentId: string
  documentName: string
  activityType: ActivityType
  performedBy?: User
  performedByEmail?: string
  timestamp: string
  details?: Record<string, unknown>
  ipAddress?: string
}

export interface ShareNotification {
  id: string
  type: 'share_received' | 'share_accessed' | 'share_expiring' | 'share_expired' | 'comment_added'
  documentId: string
  documentName: string
  shareId?: string
  sender: User
  recipient: User
  message?: string
  createdAt: string
  readAt?: string
  isRead: boolean
  actionUrl?: string
}

// ============================================================================
// Collaboration Interfaces
// ============================================================================

export interface Comment {
  id: string
  documentId: string
  author: User
  content: string
  createdAt: string
  updatedAt?: string
  isEdited: boolean
  parentId?: string
  replies?: Comment[]
  mentions?: User[]
  reactions?: CommentReaction[]
}

export interface CommentReaction {
  id: string
  commentId: string
  user: User
  emoji: string
  createdAt: string
}

export interface ActiveViewer {
  user: User
  joinedAt: string
  lastSeenAt: string
  cursorPosition?: number
  isTyping: boolean
  color: string
}

export interface DocumentAnnotation {
  id: string
  documentId: string
  pageNumber?: number
  position: {
    x: number
    y: number
    width?: number
    height?: number
  }
  type: 'highlight' | 'note' | 'drawing' | 'text'
  content?: string
  color: string
  author: User
  createdAt: string
  updatedAt?: string
  isResolved: boolean
  replies?: Comment[]
}

// ============================================================================
// View Interfaces
// ============================================================================

export interface SharedByMeItem {
  share: InternalShare | ExternalShare | ShareLink
  document: {
    id: string
    name: string
    type: string
    size: number
    thumbnail?: string
  }
  stats: {
    totalShares: number
    activeShares: number
    totalAccesses: number
    lastAccessed?: string
  }
}

export interface SharedWithMeItem {
  share: InternalShare
  document: {
    id: string
    name: string
    type: string
    size: number
    thumbnail?: string
    path: string
  }
  sharedBy: User
  myPermission: PermissionLevel
  unreadComments?: number
  isNew: boolean
}

// ============================================================================
// Component Props Interfaces
// ============================================================================

export interface ShareModalProps {
  documentId: string
  documentName: string
  isOpen: boolean
  onClose: () => void
  initialTab?: 'internal' | 'external' | 'link'
  existingShares?: (InternalShare | ExternalShare | ShareLink)[]
}

export interface InternalUserShareProps {
  documentId: string
  onShare: (request: CreateInternalShareRequest) => Promise<void>
  availableUsers?: User[]
  availableGroups?: UserGroup[]
  loading?: boolean
}

export interface ExternalUserShareProps {
  documentId: string
  onShare: (request: CreateExternalShareRequest) => Promise<void>
  loading?: boolean
  organizationDomain?: string
}

export interface ShareLinkGeneratorProps {
  documentId: string
  onGenerate: (request: CreateShareLinkRequest) => Promise<ShareLink>
  existingLink?: ShareLink
  onRevoke?: (linkId: string) => Promise<void>
  loading?: boolean
}

export interface SharedByMeViewProps {
  items: SharedByMeItem[]
  onRevokeShare: (shareId: string) => void
  onEditShare: (share: InternalShare | ExternalShare | ShareLink) => void
  onExtendExpiry: (shareId: string, newDate: string) => void
  onViewActivity: (shareId: string) => void
  loading?: boolean
  filter?: ShareStatus
  onFilterChange?: (filter: ShareStatus | 'all') => void
}

export interface SharedWithMeViewProps {
  items: SharedWithMeItem[]
  onOpenDocument: (documentId: string) => void
  onRemoveShare?: (shareId: string) => void
  loading?: boolean
  sortBy?: 'date' | 'name' | 'sharedBy'
  onSortChange?: (sort: 'date' | 'name' | 'sharedBy') => void
}

export interface ShareNotificationsProps {
  notifications: ShareNotification[]
  onMarkAsRead: (notificationId: string) => void
  onMarkAllAsRead: () => void
  onDeleteNotification: (notificationId: string) => void
  onNavigate: (notification: ShareNotification) => void
  unreadCount: number
}

export interface CollaborationPanelProps {
  documentId: string
  activeViewers?: ActiveViewer[]
  comments?: Comment[]
  annotations?: DocumentAnnotation[]
  onAddComment?: (content: string, mentions?: string[]) => void
  onReplyToComment?: (commentId: string, content: string) => void
  onAddAnnotation?: (annotation: Omit<DocumentAnnotation, 'id' | 'author' | 'createdAt'>) => void
  onResolveAnnotation?: (annotationId: string) => void
  currentUser: User
  canComment?: boolean
  canAnnotate?: boolean
  showViewers?: boolean
}

export interface UserSearchSelectorProps {
  selectedUsers: User[]
  selectedGroups: UserGroup[]
  onSelectUser: (user: User) => void
  onDeselectUser: (userId: string) => void
  onSelectGroup: (group: UserGroup) => void
  onDeselectGroup: (groupId: string) => void
  availableUsers?: User[]
  availableGroups?: UserGroup[]
  maxSelections?: number
  placeholder?: string
  allowGroups?: boolean
}

// ============================================================================
// Notification Preferences
// ============================================================================

export interface NotificationPreferences {
  shareReceived: NotificationFrequency
  shareAccessed: NotificationFrequency
  shareExpiring: NotificationFrequency
  commentAdded: NotificationFrequency
  mentionedInComment: NotificationFrequency
  documentEdited: NotificationFrequency
  emailNotifications: boolean
  inAppNotifications: boolean
  desktopNotifications: boolean
  quietHoursEnabled: boolean
  quietHoursStart?: string
  quietHoursEnd?: string
}

// ============================================================================
// Helper Functions
// ============================================================================

export function getPermissionLabel(permission: PermissionLevel): string {
  const labels: Record<PermissionLevel, string> = {
    view: 'View Only',
    comment: 'Can Comment',
    edit: 'Can Edit',
    download: 'Can Download',
    full: 'Full Access',
  }
  return labels[permission]
}

export function getPermissionDescription(permission: PermissionLevel): string {
  const descriptions: Record<PermissionLevel, string> = {
    view: 'Can view the document but cannot download or edit',
    comment: 'Can view and add comments to the document',
    edit: 'Can view, comment, and edit the document',
    download: 'Can view and download the document',
    full: 'Full access including resharing and deletion',
  }
  return descriptions[permission]
}

export function getShareStatusColor(status: ShareStatus): {
  bg: string
  text: string
  border: string
} {
  const colors: Record<ShareStatus, { bg: string; text: string; border: string }> = {
    active: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-800 dark:text-green-300',
      border: 'border-green-300 dark:border-green-700',
    },
    expired: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-700 dark:text-gray-300',
      border: 'border-gray-300 dark:border-gray-600',
    },
    revoked: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-800 dark:text-red-300',
      border: 'border-red-300 dark:border-red-700',
    },
    pending: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-800 dark:text-yellow-300',
      border: 'border-yellow-300 dark:border-yellow-700',
    },
  }
  return colors[status]
}

export function isShareExpiringSoon(expiryDate?: string, daysThreshold = 7): boolean {
  if (!expiryDate) return false
  const expiry = new Date(expiryDate)
  const now = new Date()
  const daysUntilExpiry = Math.ceil(
    (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )
  return daysUntilExpiry > 0 && daysUntilExpiry <= daysThreshold
}

export function isShareExpired(expiryDate?: string): boolean {
  if (!expiryDate) return false
  return new Date(expiryDate) < new Date()
}

export function canPerformAction(
  permission: PermissionLevel,
  action: 'view' | 'comment' | 'edit' | 'download' | 'delete' | 'reshare'
): boolean {
  const permissionHierarchy: Record<PermissionLevel, number> = {
    view: 1,
    comment: 2,
    download: 2,
    edit: 3,
    full: 4,
  }

  const actionRequirements: Record<typeof action, number> = {
    view: 1,
    comment: 2,
    download: 2,
    edit: 3,
    delete: 4,
    reshare: 4,
  }

  return permissionHierarchy[permission] >= actionRequirements[action]
}

export function generateShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

export function formatShareUrl(token: string, baseUrl?: string): string {
  const base = baseUrl || window.location.origin
  return `${base}/shared/${token}`
}

export function getDefaultNotificationPreferences(): NotificationPreferences {
  return {
    shareReceived: 'immediate',
    shareAccessed: 'daily',
    shareExpiring: 'immediate',
    commentAdded: 'immediate',
    mentionedInComment: 'immediate',
    documentEdited: 'daily',
    emailNotifications: true,
    inAppNotifications: true,
    desktopNotifications: false,
    quietHoursEnabled: false,
  }
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePassword(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export function extractMentions(text: string): string[] {
  const mentionRegex = /@(\w+)/g
  const mentions: string[] = []
  let match

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1])
  }

  return mentions
}

export function formatActivityDescription(activity: ShareActivity): string {
  const actions: Record<ActivityType, string> = {
    shared: 'shared this document',
    accessed: 'accessed this document',
    downloaded: 'downloaded this document',
    edited: 'edited this document',
    commented: 'added a comment',
    revoked: 'revoked access',
    expired: 'access expired',
  }

  return actions[activity.activityType] || 'performed an action'
}

export function getPermissionIcon(permission: PermissionLevel): string {
  const icons: Record<PermissionLevel, string> = {
    view: '👁️',
    comment: '💬',
    edit: '✏️',
    download: '⬇️',
    full: '⭐',
  }
  return icons[permission]
}
