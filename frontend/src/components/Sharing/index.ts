/**
 * Sharing & Collaboration Components
 * Week 21: Secure document sharing and real-time collaboration
 */

// Main Components
export { ShareModal } from './ShareModal'
export { UserSearchSelector } from './UserSearchSelector'
export { SharedByMeView } from './SharedByMeView'
export { SharedWithMeView } from './SharedWithMeView'
export { ShareNotifications } from './ShareNotifications'
export { CollaborationPanel } from './CollaborationPanel'
export { AcknowledgementModal } from './AcknowledgementModal'
export { RequestAccessModal } from './RequestAccessModal'

// Re-export types for convenience
export type {
  // Core types
  ShareType,
  PermissionLevel,
  ShareStatus,
  NotificationFrequency,
  ShareMethod,
  ActivityType,

  // User and Group
  User,
  UserGroup,

  // Share interfaces
  InternalShare,
  ExternalShare,
  ShareLink,
  ShareAccessLog,

  // Request/Response
  CreateInternalShareRequest,
  CreateExternalShareRequest,
  CreateShareLinkRequest,
  UpdateShareRequest,

  // Activity
  ShareActivity,
  ShareNotification,

  // Collaboration
  Comment,
  CommentReaction,
  ActiveViewer,
  DocumentAnnotation,

  // View data
  SharedByMeItem,
  SharedWithMeItem,

  // Component props
  ShareModalProps,
  InternalUserShareProps,
  ExternalUserShareProps,
  ShareLinkGeneratorProps,
  SharedByMeViewProps,
  SharedWithMeViewProps,
  ShareNotificationsProps,
  CollaborationPanelProps,
  UserSearchSelectorProps,

  // Notification preferences
  NotificationPreferences,
} from '@/types/sharing'

// Re-export helper functions
export {
  getPermissionLabel,
  getPermissionDescription,
  getShareStatusColor,
  isShareExpiringSoon,
  isShareExpired,
  canPerformAction,
  generateShareToken,
  formatShareUrl,
  getDefaultNotificationPreferences,
  validateEmail,
  validatePassword,
  extractMentions,
  formatActivityDescription,
  getPermissionIcon,
} from '@/types/sharing'
