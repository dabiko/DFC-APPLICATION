// MFA Components
export { MFASetup } from './MFASetup'
export { MFAVerification } from './MFAVerification'
export { MFASettings } from './MFASettings'
export { MFABackupCodes } from './MFABackupCodes'
export { MFAStatus } from './MFAStatus'
export { TrustedDevices } from './TrustedDevices'

// Re-export all MFA types
export type {
  // Core Configuration
  MFAConfig,
  MFAMethod,
  MFAStatus as MFAStatusType,
  TOTPConfig,

  // Backup Codes
  BackupCode,
  BackupCodesSet,

  // Trusted Devices
  TrustedDevice,
  DeviceType,
  DeviceFingerprint,

  // Setup
  MFASetupRequest,
  MFASetupResponse,
  MFASetupState,
  MFASetupStep,

  // Verification
  MFAVerificationRequest,
  MFAVerificationResponse,
  MFAVerificationState,

  // Disable
  MFADisableRequest,
  MFADisableResponse,

  // Activity & Security
  MFAActivity,
  MFAActivityType,
  MFASecurityLog,
  MFASecurityEvent,

  // Component Props
  MFASetupProps,
  MFAVerificationProps,
  MFASettingsProps,
  MFABackupCodesProps,
  MFAStatusProps,
  TrustedDevicesProps,
} from '@/types/mfa'

// Re-export helper functions
export {
  // Code Formatting & Validation
  formatMFACode,
  validateMFACode,
  validateBackupCode,
  formatBackupCode,

  // Status & Labels
  getMFAStatusColor,
  getMFAStatusLabel,
  getMFAMethodLabel,
  getMFAMethodIcon,

  // Device Management
  detectDeviceType,
  generateDeviceFingerprint,
  getDeviceTypeIcon,
  isDeviceTrustExpiring,
  isDeviceTrustExpired,

  // Backup Codes
  downloadBackupCodes,
  printBackupCodes,
  generateBackupCodes,
  getBackupCodesUsagePercentage,
  needsBackupCodeRegeneration,

  // Event Formatting
  formatMFAEventDescription,
} from '@/types/mfa'
