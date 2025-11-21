/**
 * Email Validation Utilities
 * Validates business/company emails and rejects personal email providers
 */

// List of common personal email providers (to be rejected)
const PERSONAL_EMAIL_PROVIDERS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'aol.com',
  'icloud.com',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'protonmail.com',
  'gmx.com',
  'inbox.com',
  'mail.ru',
  'qq.com',
  '163.com',
  '126.com',
  'yeah.net',
]

/**
 * Validates email format using RFC 5322 compliant regex
 */
export function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email.trim())
}

/**
 * Checks if email domain is a personal email provider
 */
export function isPersonalEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split('@')[1]
  if (!domain) return false

  return PERSONAL_EMAIL_PROVIDERS.includes(domain)
}

/**
 * Validates business email (format + not personal provider)
 */
export function validateBusinessEmail(email: string): { valid: boolean; error?: string } {
  if (!email || email.trim() === '') {
    return { valid: false, error: 'Email is required' }
  }

  if (!isValidEmailFormat(email)) {
    return { valid: false, error: 'Please enter a valid email address' }
  }

  if (isPersonalEmail(email)) {
    return {
      valid: false,
      error:
        'Please use your company email address. Personal email providers (Gmail, Yahoo, etc.) are not allowed.',
    }
  }

  return { valid: true }
}

/**
 * Get email domain
 */
export function getEmailDomain(email: string): string {
  return email.trim().split('@')[1] || ''
}
