/**
 * Multi-Factor Authentication (MFA) Type Definitions
 * Week 22: Comprehensive type system for TOTP-based MFA
 */

// ============================================================================
// Core Enums and Types
// ============================================================================

export type MFAMethod = 'totp' | 'sms' | 'email' | 'backup_code'

export type MFAStatus = 'enabled' | 'disabled' | 'pending_setup'

export type DeviceType = 'mobile' | 'desktop' | 'tablet' | 'unknown'

export type MFAEventType =
  | 'mfa_enabled'
  | 'mfa_disabled'
  | 'mfa_verified'
  | 'mfa_failed'
  | 'backup_codes_generated'
  | 'backup_code_used'
  | 'device_trusted'
  | 'device_removed'

// ============================================================================
// MFA Configuration Interfaces
// ============================================================================

export interface MFAConfig {
  enabled: boolean
  method: MFAMethod
  setupCompleted: boolean
  backupCodesGenerated: boolean
  backupCodesRemaining: number
  lastVerifiedAt?: string
  createdAt: string
  updatedAt: string
}

export interface TOTPConfig {
  secret: string
  qrCodeUrl: string
  issuer: string
  accountName: string
  algorithm: 'SHA1' | 'SHA256' | 'SHA512'
  digits: 6 | 8
  period: 30 | 60
}

export interface BackupCode {
  id: string
  code: string
  used: boolean
  usedAt?: string
  createdAt: string
}

export interface BackupCodesSet {
  codes: BackupCode[]
  generatedAt: string
  totalCodes: number
  usedCodes: number
  remainingCodes: number
}

// ============================================================================
// Trusted Device Interfaces
// ============================================================================

export interface TrustedDevice {
  id: string
  name: string
  deviceType: DeviceType
  browser: string
  os: string
  ipAddress: string
  location?: string
  trustedAt: string
  lastUsedAt: string
  expiresAt?: string
  isCurrent: boolean
}

export interface DeviceFingerprint {
  userAgent: string
  platform: string
  screenResolution: string
  timezone: string
  language: string
  plugins?: string[]
}

// ============================================================================
// MFA Verification Interfaces
// ============================================================================

export interface MFAVerificationRequest {
  code: string
  method: MFAMethod
  trustDevice?: boolean
  deviceFingerprint?: DeviceFingerprint
}

export interface MFAVerificationResponse {
  verified: boolean
  remainingAttempts?: number
  lockoutUntil?: string
  deviceTrusted?: boolean
  message?: string
}

export interface MFASetupRequest {
  method: MFAMethod
  password: string
}

export interface MFASetupResponse {
  secret: string
  qrCodeUrl: string
  backupCodes: string[]
  setupToken: string
}

export interface MFAConfirmSetupRequest {
  setupToken: string
  verificationCode: string
}

export interface MFADisableRequest {
  password: string
  verificationCode?: string
}

// ============================================================================
// MFA Activity Interfaces
// ============================================================================

export interface MFAActivity {
  id: string
  eventType: MFAEventType
  method?: MFAMethod
  success: boolean
  ipAddress: string
  userAgent: string
  location?: string
  timestamp: string
  details?: Record<string, unknown>
}

export interface MFASecurityLog {
  id: string
  userId: string
  action: string
  success: boolean
  failureReason?: string
  ipAddress: string
  timestamp: string
  metadata?: Record<string, unknown>
}

// ============================================================================
// Component Props Interfaces
// ============================================================================

export interface MFASetupProps {
  onComplete: (setupData: MFASetupResponse) => void
  onCancel: () => void
  loading?: boolean
  method?: MFAMethod
}

export interface MFAVerificationProps {
  onVerify: (request: MFAVerificationRequest) => Promise<MFAVerificationResponse>
  onCancel?: () => void
  method?: MFAMethod
  allowBackupCode?: boolean
  allowTrustDevice?: boolean
  remainingAttempts?: number
  loading?: boolean
}

export interface MFASettingsProps {
  config: MFAConfig
  onEnable: () => void
  onDisable: (request: MFADisableRequest) => Promise<void>
  onRegenerateBackupCodes: () => Promise<BackupCodesSet>
  onViewBackupCodes: () => void
  loading?: boolean
}

export interface MFABackupCodesProps {
  codes: BackupCodesSet
  onRegenerate: () => Promise<BackupCodesSet>
  onDownload: () => void
  onPrint: () => void
  showCodes?: boolean
  loading?: boolean
}

export interface MFAStatusProps {
  config: MFAConfig
  compact?: boolean
  showDetails?: boolean
}

export interface TrustedDevicesProps {
  devices: TrustedDevice[]
  currentDeviceId?: string
  onRemoveDevice: (deviceId: string) => Promise<void>
  onTrustDevice: (deviceId: string) => Promise<void>
  loading?: boolean
}

export interface MFAQRCodeProps {
  qrCodeUrl: string
  secret: string
  issuer: string
  accountName: string
  onCopySecret: () => void
}

// ============================================================================
// User Interface State
// ============================================================================

export interface MFASetupState {
  step: 'password' | 'qrcode' | 'verification' | 'backup_codes' | 'complete'
  setupData?: MFASetupResponse
  verificationCode: string
  error?: string
}

export interface MFAVerificationState {
  code: string
  method: MFAMethod
  trustDevice: boolean
  error?: string
  remainingAttempts?: number
  isLocked: boolean
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format MFA code with spaces for readability
 * Example: "123456" -> "123 456"
 */
export function formatMFACode(code: string): string {
  return code.replace(/(\d{3})(\d{3})/, '$1 $2')
}

/**
 * Validate MFA code format
 */
export function validateMFACode(code: string, digits: 6 | 8 = 6): boolean {
  const regex = digits === 6 ? /^\d{6}$/ : /^\d{8}$/
  return regex.test(code.replace(/\s/g, ''))
}

/**
 * Validate backup code format
 */
export function validateBackupCode(code: string): boolean {
  // Backup codes are typically 8-10 alphanumeric characters
  const regex = /^[A-Z0-9]{8,10}$/i
  return regex.test(code.replace(/[-\s]/g, ''))
}

/**
 * Format backup code for display
 * Example: "ABCD1234" -> "ABCD-1234"
 */
export function formatBackupCode(code: string): string {
  return code.replace(/(.{4})(.{4})/, '$1-$2')
}

/**
 * Get MFA status badge color
 */
export function getMFAStatusColor(status: MFAStatus): {
  bg: string
  text: string
  border: string
} {
  const colors: Record<MFAStatus, { bg: string; text: string; border: string }> = {
    enabled: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-800 dark:text-green-300',
      border: 'border-green-300 dark:border-green-700',
    },
    disabled: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-800 dark:text-red-300',
      border: 'border-red-300 dark:border-red-700',
    },
    pending_setup: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-800 dark:text-yellow-300',
      border: 'border-yellow-300 dark:border-yellow-700',
    },
  }
  return colors[status]
}

/**
 * Get MFA status label
 */
export function getMFAStatusLabel(status: MFAStatus): string {
  const labels: Record<MFAStatus, string> = {
    enabled: 'Enabled',
    disabled: 'Disabled',
    pending_setup: 'Pending Setup',
  }
  return labels[status]
}

/**
 * Get MFA method label
 */
export function getMFAMethodLabel(method: MFAMethod): string {
  const labels: Record<MFAMethod, string> = {
    totp: 'Authenticator App',
    sms: 'SMS',
    email: 'Email',
    backup_code: 'Backup Code',
  }
  return labels[method]
}

/**
 * Get MFA method icon
 */
export function getMFAMethodIcon(method: MFAMethod): string {
  const icons: Record<MFAMethod, string> = {
    totp: '🔐',
    sms: '📱',
    email: '📧',
    backup_code: '🔑',
  }
  return icons[method]
}

/**
 * Get device type icon
 */
export function getDeviceTypeIcon(deviceType: DeviceType): string {
  const icons: Record<DeviceType, string> = {
    mobile: '📱',
    desktop: '🖥️',
    tablet: '📲',
    unknown: '❓',
  }
  return icons[deviceType]
}

/**
 * Detect device type from user agent
 */
export function detectDeviceType(userAgent: string): DeviceType {
  const ua = userAgent.toLowerCase()
  if (/mobile|android|iphone|ipod/i.test(ua)) return 'mobile'
  if (/ipad|tablet/i.test(ua)) return 'tablet'
  if (/windows|mac|linux/i.test(ua)) return 'desktop'
  return 'unknown'
}

/**
 * Generate device fingerprint
 */
export function generateDeviceFingerprint(): DeviceFingerprint {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
  }
}

/**
 * Check if device trust is about to expire
 */
export function isDeviceTrustExpiring(expiresAt?: string, daysThreshold = 7): boolean {
  if (!expiresAt) return false
  const expiry = new Date(expiresAt)
  const now = new Date()
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return daysUntilExpiry > 0 && daysUntilExpiry <= daysThreshold
}

/**
 * Check if device trust has expired
 */
export function isDeviceTrustExpired(expiresAt?: string): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

/**
 * Format MFA event description
 */
export function formatMFAEventDescription(event: MFAActivity): string {
  const descriptions: Record<MFAEventType, string> = {
    mfa_enabled: 'Two-factor authentication enabled',
    mfa_disabled: 'Two-factor authentication disabled',
    mfa_verified: 'Successfully verified',
    mfa_failed: 'Verification failed',
    backup_codes_generated: 'Backup codes generated',
    backup_code_used: 'Backup code used',
    device_trusted: 'Device trusted',
    device_removed: 'Device removed',
  }
  return descriptions[event.eventType] || 'Unknown event'
}

/**
 * Calculate backup codes usage percentage
 */
export function getBackupCodesUsagePercentage(codes: BackupCodesSet): number {
  if (codes.totalCodes === 0) return 0
  return Math.round((codes.usedCodes / codes.totalCodes) * 100)
}

/**
 * Check if backup codes need regeneration
 */
export function needsBackupCodeRegeneration(codes: BackupCodesSet): boolean {
  return codes.remainingCodes <= 2
}

/**
 * Generate random backup codes
 */
export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = []
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed ambiguous characters

  for (let i = 0; i < count; i++) {
    let code = ''
    for (let j = 0; j < 8; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    codes.push(code)
  }

  return codes
}

/**
 * Download backup codes as text file
 */
export function downloadBackupCodes(codes: string[], filename = 'backup-codes.txt'): void {
  const content = [
    'DFC Application - Backup Codes',
    '================================',
    '',
    'Save these backup codes in a secure location.',
    'Each code can only be used once.',
    '',
    ...codes.map((code, i) => `${i + 1}. ${formatBackupCode(code)}`),
    '',
    `Generated: ${new Date().toLocaleString()}`,
  ].join('\n')

  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Print backup codes
 */
export function printBackupCodes(codes: string[]): void {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const content = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Backup Codes</title>
        <style>
          body {
            font-family: monospace;
            padding: 20px;
            max-width: 600px;
            margin: 0 auto;
          }
          h1 {
            text-align: center;
            margin-bottom: 30px;
          }
          .codes {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 30px 0;
          }
          .code {
            padding: 10px;
            border: 1px solid #ccc;
            text-align: center;
            font-size: 16px;
            font-weight: bold;
          }
          .warning {
            background: #fff3cd;
            border: 1px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>DFC Application - Backup Codes</h1>
        <div class="warning">
          ⚠️ Save these codes in a secure location. Each code can only be used once.
        </div>
        <div class="codes">
          ${codes
            .map(
              (code, i) => `
            <div class="code">${i + 1}. ${formatBackupCode(code)}</div>
          `
            )
            .join('')}
        </div>
        <p style="text-align: center; color: #666;">
          Generated: ${new Date().toLocaleString()}
        </p>
        <div style="text-align: center; margin-top: 30px;">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">
            Print Codes
          </button>
        </div>
      </body>
    </html>
  `

  printWindow.document.write(content)
  printWindow.document.close()
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (_error) {
    // Fallback for older browsers
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const success = document.execCommand('copy')
    document.body.removeChild(textarea)
    return success
  }
}
