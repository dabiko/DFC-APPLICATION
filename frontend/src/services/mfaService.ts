/**
 * MFA (Multi-Factor Authentication) Service
 *
 * Handles all MFA-related API calls including:
 * - MFA setup and configuration
 * - TOTP verification
 * - Backup codes management
 * - Trusted devices management
 * - MFA status checks
 * - SMS/Email OTP (when enabled)
 */

import api from './apiClient'

// ============================================
// Types
// ============================================

export interface MFASetupResponse {
  success: boolean
  message: string
  data: {
    qr_code: string // Base64 encoded QR code image
    secret: string // Manual entry secret
    issuer: string
    account_name: string
  }
}

export interface MFAConfirmRequest {
  token: string // 6-digit TOTP code
}

export interface MFAConfirmResponse {
  success: boolean
  message: string
  data: {
    mfa_enabled: boolean
    backup_codes: string[] // Plain text backup codes (show only once!)
  }
}

export interface MFAVerifyRequest {
  token: string // 6-digit TOTP or backup code
  user_id: number | string
  trust_device?: boolean
  device_fingerprint?: string
  mfa_token?: string // MFA token from login response
  remember_me?: boolean // Remember me preference from login
}

export interface MFAVerifyResponse {
  success: boolean
  message: string
  data?: {
    verified: boolean
    access?: string // New access token after MFA verification
    refresh?: string // New refresh token after MFA verification
    token_type?: 'totp' | 'backup_code'
    backup_codes_remaining?: number
    user?: {
      id: number
      username: string
      email: string
      first_name: string
      last_name: string
      employee_id: string
      department: string | null
      department_id: string | null
      is_staff: boolean
      is_superuser: boolean
      mfa_enabled: boolean
      organization_id: string | null
      organization_name: string | null
      organization_domain: string | null
    }
  }
}

export interface MFAStatusResponse {
  success: boolean
  data: {
    // Backend MFAStatusSerializer field names (with source mapping)
    is_enabled: boolean // mapped from mfa_enabled
    is_enforced: boolean // mapped from mfa_enforced
    is_configured: boolean // computed from is_fully_configured property
    totp_enabled: boolean
    enabled_at: string | null
    last_verified_at: string | null
    backup_codes_remaining: number
    // Legacy field names (for backwards compatibility)
    mfa_enabled?: boolean
    mfa_enforced?: boolean
    totp_confirmed?: boolean
    verification_failures?: number
  }
}

export interface MFADisableRequest {
  token: string // 6-digit TOTP code
}

export interface MFADisableResponse {
  success: boolean
  message: string
  data: {
    mfa_enabled: boolean
  }
}

export interface BackupCodesRegenerateRequest {
  token: string // 6-digit TOTP code
}

export interface BackupCodesRegenerateResponse {
  success: boolean
  message: string
  data: {
    backup_codes: string[]
  }
}

// Trusted Device Types
export interface TrustedDevice {
  id: string
  device_id: string
  device_name: string
  device_type: 'desktop' | 'laptop' | 'mobile' | 'tablet' | 'other'
  user_agent: string
  ip_address: string | null
  location?: string
  trusted_at: string
  expires_at: string
  last_used_at: string
  is_revoked: boolean
  is_valid: boolean
  is_current: boolean
  expires_in_days: number
}

export interface TrustedDevicesResponse {
  success: boolean
  data: {
    devices: TrustedDevice[]
    count: number
  }
}

// SMS/Email OTP Types
export interface SendOTPRequest {
  method: 'sms' | 'email'
  user_id?: number | string
}

export interface SendOTPResponse {
  success: boolean
  message: string
  data: {
    expires_in: number // seconds
    masked_destination: string // e.g., "***@gmail.com" or "+1***1234"
  }
}

export interface VerifyOTPRequest {
  code: string
  method: 'sms' | 'email'
  user_id: number | string
}

// MFA Compliance/Admin Types
export interface MFAComplianceStats {
  total_users: number
  mfa_enabled_count: number
  mfa_disabled_count: number
  mfa_enforced_count: number
  compliance_percentage: number
  recent_enrollments: number // Last 30 days
  admin_users_without_mfa: number
}

export interface UserMFAStatus {
  user_id: string
  username: string
  email: string
  full_name: string
  is_admin: boolean
  is_staff: boolean
  mfa_enabled: boolean
  mfa_enforced: boolean
  enabled_at: string | null
  last_verified_at: string | null
}

export interface MFAEnforcementPolicy {
  id: string
  name: string
  description: string
  target_type: 'all_users' | 'admins_only' | 'role_based' | 'department_based'
  target_roles?: string[]
  target_departments?: string[]
  grace_period_days: number
  is_active: boolean
  created_at: string
  created_by: string
}

// Risk-based Auth Types
export interface LoginRiskAssessment {
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  risk_score: number // 0-100
  factors: RiskFactor[]
  requires_mfa: boolean
  requires_step_up: boolean
}

export interface RiskFactor {
  name: string
  description: string
  score: number
  details?: Record<string, unknown>
}

// ============================================
// MFA Service Class
// ============================================

class MFAService {
  private baseUrl = '/auth/mfa'

  // ==========================================
  // Core MFA Operations
  // ==========================================

  /**
   * Initiate MFA setup - generates QR code and secret
   * Requires password verification before generating TOTP secret
   */
  async setup(password: string): Promise<MFASetupResponse> {
    const response = await api.post(`${this.baseUrl}/setup/`, { password })
    return response.data
  }

  /**
   * Confirm MFA setup by verifying TOTP code
   * Returns backup codes on success
   */
  async confirm(data: MFAConfirmRequest): Promise<MFAConfirmResponse> {
    const response = await api.post(`${this.baseUrl}/confirm/`, data)
    return response.data
  }

  /**
   * Verify MFA code during login
   * Can be TOTP code or backup code
   */
  async verify(data: MFAVerifyRequest): Promise<MFAVerifyResponse> {
    try {
      console.log('[MFA Service] Verify request data:', {
        ...data,
        token: data.token ? '******' : undefined, // Hide token in logs
      })
      const response = await api.post(`${this.baseUrl}/verify/`, data)
      console.log('[MFA Service] Verify response:', response.data)
      return response.data
    } catch (error: any) {
      // Handle 400 errors with specific error messages from backend
      if (error.response?.data) {
        const errorData = error.response.data
        // Extract specific error message from errors.token array if available
        const specificError =
          errorData.errors?.token?.[0] || errorData.message || 'Verification failed'
        return {
          success: false,
          message: specificError,
          data: {
            verified: false,
            backup_codes_remaining: errorData.data?.backup_codes_remaining,
          },
        }
      }
      throw error
    }
  }

  /**
   * Get current MFA status for authenticated user
   */
  async getStatus(): Promise<MFAStatusResponse> {
    const response = await api.get(`${this.baseUrl}/status/`)
    return response.data
  }

  /**
   * Disable MFA (requires TOTP verification)
   */
  async disable(data: MFADisableRequest): Promise<MFADisableResponse> {
    const response = await api.post(`${this.baseUrl}/disable/`, data)
    return response.data
  }

  /**
   * Regenerate backup codes (requires TOTP verification)
   */
  async regenerateBackupCodes(
    data: BackupCodesRegenerateRequest
  ): Promise<BackupCodesRegenerateResponse> {
    const response = await api.post(`${this.baseUrl}/backup-codes/regenerate/`, data)
    return response.data
  }

  // ==========================================
  // Trusted Devices
  // ==========================================

  /**
   * Get list of trusted devices for current user
   */
  async getTrustedDevices(): Promise<TrustedDevicesResponse> {
    // Include device fingerprint header so backend can identify current device
    const fingerprint = this.generateDeviceFingerprint()
    const response = await api.get(`${this.baseUrl}/trusted-devices/`, {
      headers: {
        'X-Device-Fingerprint': fingerprint,
      },
    })
    return response.data
  }

  /**
   * Remove a trusted device
   */
  async removeTrustedDevice(
    deviceId: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`${this.baseUrl}/trusted-devices/${deviceId}/`, {
      data: { reason: reason || '' },
    })
    return response.data
  }

  /**
   * Revoke all trusted devices
   */
  async revokeAllTrustedDevices(): Promise<{
    success: boolean
    message: string
    data: { devices_revoked: number }
  }> {
    const response = await api.post(`${this.baseUrl}/trusted-devices/revoke-all/`)
    return response.data
  }

  /**
   * Trust a new device
   */
  async trustDevice(data: {
    device_fingerprint: string
    device_name?: string
    device_type?: 'desktop' | 'laptop' | 'mobile' | 'tablet' | 'other'
    trust_days?: number
  }): Promise<{ success: boolean; message: string; data: TrustedDevice }> {
    const response = await api.post(`${this.baseUrl}/trusted-devices/trust/`, data)
    return response.data
  }

  /**
   * Check if a device is trusted
   */
  async checkTrustedDevice(
    userId: string | number,
    deviceFingerprint: string
  ): Promise<{ success: boolean; data: { is_trusted: boolean } }> {
    const response = await api.post(`${this.baseUrl}/trusted-devices/check/`, {
      user_id: userId,
      device_fingerprint: deviceFingerprint,
    })
    return response.data
  }

  // ==========================================
  // SMS/Email OTP
  // ==========================================

  /**
   * Send OTP via SMS or Email
   */
  async sendOTP(data: SendOTPRequest): Promise<SendOTPResponse> {
    const response = await api.post(`${this.baseUrl}/otp/send/`, data)
    return response.data
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(data: VerifyOTPRequest): Promise<MFAVerifyResponse> {
    const response = await api.post(`${this.baseUrl}/otp/verify/`, data)
    return response.data
  }

  // ==========================================
  // Admin/Compliance Operations
  // ==========================================

  /**
   * Get MFA compliance statistics (admin only)
   */
  async getComplianceStats(): Promise<{ success: boolean; data: MFAComplianceStats }> {
    const response = await api.get(`${this.baseUrl}/admin/compliance/stats/`)
    return response.data
  }

  /**
   * Get MFA status for all users (admin only)
   */
  async getAllUsersStatus(params?: {
    mfa_enabled?: boolean
    is_admin?: boolean
    search?: string
    page?: number
    page_size?: number
    mfa_status?: string // 'enabled', 'disabled', 'enforced'
  }): Promise<{
    success: boolean
    data: {
      users: UserMFAStatus[]
      total: number
      page: number
      page_size: number
      total_pages: number
    }
  }> {
    const response = await api.get(`${this.baseUrl}/admin/users/`, { params })
    return response.data
  }

  /**
   * Enforce MFA for specific user (admin only)
   */
  async enforceMFAForUser(
    userId: string,
    enforce: boolean = true
  ): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`${this.baseUrl}/admin/users/${userId}/enforce/`, { enforce })
    return response.data
  }

  /**
   * Remove MFA enforcement for specific user (admin only)
   */
  async removeEnforcementForUser(userId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`${this.baseUrl}/admin/users/${userId}/enforce/`, {
      enforce: false,
    })
    return response.data
  }

  /**
   * Reset MFA for user (admin only) - disables MFA and removes all backup codes
   */
  async resetMFAForUser(userId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`${this.baseUrl}/admin/reset/${userId}/`)
    return response.data
  }

  // ==========================================
  // MFA Enforcement Policies
  // ==========================================

  /**
   * Get all MFA enforcement policies (admin only)
   */
  async getEnforcementPolicies(): Promise<{ success: boolean; data: MFAEnforcementPolicy[] }> {
    const response = await api.get(`${this.baseUrl}/admin/policies/`)
    return response.data
  }

  /**
   * Create MFA enforcement policy (admin only)
   */
  async createEnforcementPolicy(
    policy: Omit<MFAEnforcementPolicy, 'id' | 'created_at' | 'created_by'>
  ): Promise<{ success: boolean; data: MFAEnforcementPolicy }> {
    const response = await api.post(`${this.baseUrl}/admin/policies/`, policy)
    return response.data
  }

  /**
   * Update MFA enforcement policy (admin only)
   */
  async updateEnforcementPolicy(
    policyId: string,
    policy: Partial<MFAEnforcementPolicy>
  ): Promise<{ success: boolean; data: MFAEnforcementPolicy }> {
    const response = await api.patch(`${this.baseUrl}/admin/policies/${policyId}/`, policy)
    return response.data
  }

  /**
   * Delete MFA enforcement policy (admin only)
   */
  async deleteEnforcementPolicy(policyId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`${this.baseUrl}/admin/policies/${policyId}/`)
    return response.data
  }

  // ==========================================
  // Risk-Based Authentication
  // ==========================================

  /**
   * Assess login risk based on various factors
   */
  async assessLoginRisk(data: {
    user_id?: number | string
    ip_address?: string
    user_agent?: string
    device_fingerprint?: string
  }): Promise<{ success: boolean; data: LoginRiskAssessment }> {
    const response = await api.post(`${this.baseUrl}/risk/assess/`, data)
    return response.data
  }

  // ==========================================
  // Utility Functions
  // ==========================================

  /**
   * Check if a code looks like a backup code (contains dash)
   */
  isBackupCode(code: string): boolean {
    return code.includes('-') || (code.length === 8 && /^[A-Z0-9]+$/.test(code.toUpperCase()))
  }

  /**
   * Format code for display
   */
  formatCode(code: string, isBackup: boolean = false): string {
    if (isBackup) {
      // Format as XXXX-XXXX
      const clean = code.replace(/[^A-Z0-9]/gi, '').toUpperCase()
      if (clean.length >= 8) {
        return `${clean.slice(0, 4)}-${clean.slice(4, 8)}`
      }
      return clean
    }
    // Format as 6-digit code
    return code.replace(/\D/g, '').slice(0, 6)
  }

  /**
   * Validate TOTP code format
   */
  validateTOTPCode(code: string): boolean {
    return /^\d{6}$/.test(code)
  }

  /**
   * Validate backup code format
   */
  validateBackupCode(code: string): boolean {
    const clean = code.replace(/[^A-Z0-9]/gi, '').toUpperCase()
    return clean.length === 8 && /^[A-Z0-9]+$/.test(clean)
  }

  /**
   * Generate device fingerprint for trusted device feature
   */
  generateDeviceFingerprint(): string {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.textBaseline = 'top'
      ctx.font = '14px Arial'
      ctx.fillText('DFC fingerprint', 2, 2)
    }

    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      !!window.sessionStorage,
      !!window.localStorage,
      navigator.hardwareConcurrency || 'unknown',
      canvas.toDataURL(),
    ]

    // Simple hash function
    let hash = 0
    const str = components.join('|')
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Get device info for display
   */
  getDeviceInfo(): { browser: string; os: string; device_type: string } {
    const ua = navigator.userAgent

    // Detect browser
    let browser = 'Unknown'
    if (ua.includes('Chrome')) browser = 'Chrome'
    else if (ua.includes('Firefox')) browser = 'Firefox'
    else if (ua.includes('Safari')) browser = 'Safari'
    else if (ua.includes('Edge')) browser = 'Edge'
    else if (ua.includes('Opera')) browser = 'Opera'

    // Detect OS
    let os = 'Unknown'
    if (ua.includes('Windows')) os = 'Windows'
    else if (ua.includes('Mac')) os = 'macOS'
    else if (ua.includes('Linux')) os = 'Linux'
    else if (ua.includes('Android')) os = 'Android'
    else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'

    // Detect device type
    let device_type = 'desktop'
    if (ua.includes('Mobile')) device_type = 'mobile'
    else if (ua.includes('Tablet') || ua.includes('iPad')) device_type = 'tablet'

    return { browser, os, device_type }
  }
}

// Export singleton instance
export const mfaService = new MFAService()
export default mfaService
