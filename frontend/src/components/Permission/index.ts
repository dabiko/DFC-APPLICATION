/**
 * Permission Components
 *
 * Components for RBAC permission checking and access control.
 */

export { PermissionGate, AdminGate, ManagerGate, OwnerGate, withPermission } from './PermissionGate'
export { AccessDenied, AccessDeniedBadge, AccessDeniedOverlay } from './AccessDenied'
export { PermissionButton, PermissionIconButton } from './PermissionButton'
export { PermissionAuditDashboard } from './PermissionAuditDashboard'

// Re-export types
export type { AccessDeniedProps } from './AccessDenied'
