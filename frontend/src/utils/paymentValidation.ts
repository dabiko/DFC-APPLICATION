/**
 * Payment Validation Utilities
 * Credit card validation using Luhn algorithm and other checks
 */

/**
 * Card brand detection based on card number
 */
export function detectCardBrand(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\s/g, '')

  // Visa: starts with 4
  if (/^4/.test(cleaned)) return 'visa'

  // Mastercard: starts with 51-55 or 2221-2720
  if (/^5[1-5]/.test(cleaned) || /^2(22[1-9]|2[3-9]|[3-6]|7[01]|720)/.test(cleaned)) {
    return 'mastercard'
  }

  // American Express: starts with 34 or 37
  if (/^3[47]/.test(cleaned)) return 'amex'

  // Discover: starts with 6011, 622126-622925, 644-649, or 65
  if (
    /^6011/.test(cleaned) ||
    /^622(12[6-9]|1[3-9]|[2-8]|9[01]|92[0-5])/.test(cleaned) ||
    /^64[4-9]/.test(cleaned) ||
    /^65/.test(cleaned)
  ) {
    return 'discover'
  }

  // Diners Club: starts with 300-305, 36, or 38
  if (/^3(0[0-5]|[68])/.test(cleaned)) return 'diners'

  // JCB: starts with 2131, 1800, or 35
  if (/^(2131|1800|35)/.test(cleaned)) return 'jcb'

  return 'unknown'
}

/**
 * Luhn algorithm for credit card validation
 */
export function luhnCheck(cardNumber: string): boolean {
  const cleaned = cardNumber.replace(/\s/g, '')

  if (!/^\d+$/.test(cleaned)) return false

  let sum = 0
  let isEven = false

  // Loop through values from right to left
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10)

    if (isEven) {
      digit *= 2
      if (digit > 9) {
        digit -= 9
      }
    }

    sum += digit
    isEven = !isEven
  }

  return sum % 10 === 0
}

/**
 * Validate card number
 */
export function validateCardNumber(cardNumber: string): {
  valid: boolean
  error?: string
} {
  const cleaned = cardNumber.replace(/\s/g, '')

  if (!cleaned) {
    return { valid: false, error: 'Card number is required' }
  }

  if (!/^\d+$/.test(cleaned)) {
    return { valid: false, error: 'Card number must contain only digits' }
  }

  if (cleaned.length < 13 || cleaned.length > 19) {
    return { valid: false, error: 'Card number must be between 13 and 19 digits' }
  }

  if (!luhnCheck(cleaned)) {
    return { valid: false, error: 'Invalid card number' }
  }

  return { valid: true }
}

/**
 * Format card number with spaces (4-digit groups)
 */
export function formatCardNumber(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\s/g, '')
  const brand = detectCardBrand(cleaned)

  // American Express: 4-6-5 format
  if (brand === 'amex') {
    return cleaned
      .replace(/(\d{4})(\d{6})(\d{5})/, '$1 $2 $3')
      .trim()
      .substring(0, 17) // Max 15 digits + 2 spaces
  }

  // All others: 4-4-4-4 format
  return cleaned
    .replace(/(\d{4})/g, '$1 ')
    .trim()
    .substring(0, 23) // Max 19 digits + 4 spaces
}

/**
 * Validate expiry date (MM/YY format)
 */
export function validateExpiryDate(
  month: string,
  year: string
): { valid: boolean; error?: string } {
  if (!month || !year) {
    return { valid: false, error: 'Expiry date is required' }
  }

  const monthNum = parseInt(month, 10)
  const yearNum = parseInt(year, 10)

  if (isNaN(monthNum) || isNaN(yearNum)) {
    return { valid: false, error: 'Invalid expiry date' }
  }

  if (monthNum < 1 || monthNum > 12) {
    return { valid: false, error: 'Invalid month (must be 01-12)' }
  }

  // Convert 2-digit year to 4-digit year
  const currentYear = new Date().getFullYear()
  const currentCentury = Math.floor(currentYear / 100) * 100
  const fullYear = yearNum < 100 ? currentCentury + yearNum : yearNum

  // Check if card is expired
  const expiryDate = new Date(fullYear, monthNum - 1) // Last day of the month
  const today = new Date()
  today.setDate(1) // Set to first day of current month for comparison

  if (expiryDate < today) {
    return { valid: false, error: 'Card has expired' }
  }

  // Check if expiry is too far in the future (more than 20 years)
  const maxYear = currentYear + 20
  if (fullYear > maxYear) {
    return { valid: false, error: 'Expiry year is too far in the future' }
  }

  return { valid: true }
}

/**
 * Format expiry date (MM/YY)
 */
export function formatExpiryDate(value: string): string {
  const cleaned = value.replace(/\D/g, '')

  if (cleaned.length >= 2) {
    return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`
  }

  return cleaned
}

/**
 * Validate CVV
 */
export function validateCVV(
  cvv: string,
  cardBrand?: string
): {
  valid: boolean
  error?: string
} {
  if (!cvv) {
    return { valid: false, error: 'CVV is required' }
  }

  if (!/^\d+$/.test(cvv)) {
    return { valid: false, error: 'CVV must contain only digits' }
  }

  // American Express uses 4-digit CVV, others use 3-digit
  const expectedLength = cardBrand === 'amex' ? 4 : 3

  if (cvv.length !== expectedLength) {
    return {
      valid: false,
      error: `CVV must be ${expectedLength} digits`,
    }
  }

  return { valid: true }
}

/**
 * Validate cardholder name
 */
export function validateCardholderName(name: string): {
  valid: boolean
  error?: string
} {
  if (!name || !name.trim()) {
    return { valid: false, error: 'Cardholder name is required' }
  }

  if (name.trim().length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' }
  }

  if (!/^[a-zA-Z\s'-]+$/.test(name)) {
    return {
      valid: false,
      error: 'Name can only contain letters, spaces, hyphens, and apostrophes',
    }
  }

  return { valid: true }
}

/**
 * Validate postal code (US format)
 */
export function validatePostalCode(postalCode: string): {
  valid: boolean
  error?: string
} {
  if (!postalCode) {
    return { valid: false, error: 'Postal code is required' }
  }

  // US ZIP code: 5 digits or 5+4 format
  const usZipRegex = /^\d{5}(-\d{4})?$/
  // Canadian postal code: A1A 1A1
  const canadaPostalRegex = /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/

  if (!usZipRegex.test(postalCode) && !canadaPostalRegex.test(postalCode)) {
    return { valid: false, error: 'Invalid postal code format' }
  }

  return { valid: true }
}

/**
 * Mask card number (show only last 4 digits)
 */
export function maskCardNumber(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\s/g, '')
  if (cleaned.length < 4) return '****'
  return `**** **** **** ${cleaned.slice(-4)}`
}

/**
 * Get card brand display name
 */
export function getCardBrandName(brand: string): string {
  const brandNames: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    discover: 'Discover',
    diners: 'Diners Club',
    jcb: 'JCB',
    unknown: 'Unknown',
  }

  return brandNames[brand] || 'Unknown'
}
