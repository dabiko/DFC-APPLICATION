/**
 * URL Encoding Utility
 * Enterprise-standard URL encoding for IDs to improve security and aesthetics
 *
 * This utility provides a simple, reversible encoding scheme that:
 * 1. Obfuscates raw database IDs from URLs
 * 2. Creates shorter, cleaner URLs
 * 3. Is URL-safe (no special characters that need escaping)
 *
 * Note: This is obfuscation, NOT encryption. For truly sensitive IDs,
 * consider implementing server-side short codes or UUIDs.
 */

// Characters used for base62 encoding (URL-safe)
const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

// Minimum length for encoded IDs (enterprise standard: 8-12 characters)
const MIN_ENCODED_LENGTH = 8

// Salt for obfuscation - makes encoded IDs unpredictable without knowing this value
// IMPORTANT: Changing this salt will invalidate all existing encoded URLs
const ENCODING_SALT = 'dfcB8jrfn1dBdweKgaAKbIov939IfhIJVIMaSdiGD8kfP7h4P2Nf5J5RP11FxIi'

// Pre-computed salt hash for performance (computed once at module load)
const SALT_HASH = computeSaltHash(ENCODING_SALT)

/**
 * Compute a numeric hash from the salt string
 * Uses a simple but effective hash algorithm (djb2)
 */
function computeSaltHash(salt: string): number {
  let hash = 5381
  for (let i = 0; i < salt.length; i++) {
    hash = (hash * 33) ^ salt.charCodeAt(i)
  }
  // Ensure positive number and limit to reasonable range
  return Math.abs(hash) % 1000000
}

/**
 * Obfuscate a numeric ID using the salt
 * Uses XOR and multiplication to make the relationship non-linear
 */
function obfuscateNumber(num: number): number {
  // Add offset to avoid zero issues
  const shifted = num + 1000

  // XOR with salt hash
  const xored = shifted ^ SALT_HASH % 65536

  // Multiply by a prime derived from salt and add scramble
  const prime = 31 + (SALT_HASH % 100)
  const scrambled = xored * prime + (SALT_HASH % 1000)

  return scrambled
}

/**
 * Reverse the obfuscation to get original number
 */
function deobfuscateNumber(scrambled: number): number {
  // Reverse the scramble
  const prime = 31 + (SALT_HASH % 100)
  const xored = (scrambled - (SALT_HASH % 1000)) / prime

  // Reverse XOR
  const shifted = xored ^ SALT_HASH % 65536

  // Remove offset
  return shifted - 1000
}

/**
 * Pad an encoded ID to the minimum length using deterministic padding
 * The padding is based on the original ID so it can be stripped during decoding
 */
function padEncodedId(encoded: string, originalId: number): string {
  if (encoded.length >= MIN_ENCODED_LENGTH) {
    return encoded
  }

  // Generate deterministic padding based on the salt and original ID
  const paddingNeeded = MIN_ENCODED_LENGTH - encoded.length
  let padding = ''

  // Use a simple deterministic algorithm to generate padding characters
  const paddingSeed = (SALT_HASH + originalId) % 1000000
  for (let i = 0; i < paddingNeeded; i++) {
    const charIndex = (paddingSeed * (i + 1) * 7) % 62
    padding += BASE62_CHARS[charIndex]
  }

  // Add padding at the end with a separator character position marker
  // We use lowercase letters at specific positions to mark where the actual ID ends
  return encoded + padding
}

/**
 * Encode an ID for URL usage
 * Converts numeric IDs to a shorter, obfuscated string using salted encoding
 *
 * @param id - The ID to encode (number or string)
 * @returns Encoded string suitable for URLs (minimum 8 characters for enterprise standard)
 *
 * @example
 * encodeId(36) // returns something like "1MRNx7Kp" (8 chars, varies based on salt)
 * encodeId('550e8400-e29b-41d4-a716-446655440000') // returns "u_550e8400..."
 */
export function encodeId(id: string | number | null | undefined): string {
  if (id === null || id === undefined) {
    return ''
  }

  const idStr = String(id)

  // If it's a UUID, use a prefix and shortened version
  if (isUUID(idStr)) {
    return `u_${idStr.replace(/-/g, '')}`
  }

  // For numeric IDs, use salted base62 encoding with padding
  const numId = parseInt(idStr, 10)
  if (!isNaN(numId) && numId >= 0) {
    const obfuscated = obfuscateNumber(numId)
    const encoded = toBase62(obfuscated)
    // Pad to minimum length using deterministic padding based on the ID
    return padEncodedId(encoded, numId)
  }

  // For other string IDs, use URL-safe base64
  return `s_${urlSafeBase64Encode(idStr)}`
}

/**
 * Decode a URL-encoded ID back to its original form
 *
 * @param encoded - The encoded string from URL
 * @returns Original ID as string, or null if invalid
 *
 * @example
 * decodeId('3xK9m') // returns '36' (varies based on salt)
 * decodeId('u_550e8400e29b41d4a716446655440000') // returns '550e8400-e29b-41d4-a716-446655440000'
 */
export function decodeId(encoded: string | null | undefined): string | null {
  if (!encoded) {
    return null
  }

  // UUID format (prefixed with u_)
  if (encoded.startsWith('u_')) {
    const hex = encoded.slice(2)
    if (hex.length === 32) {
      // Restore UUID format with hyphens
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    }
    return hex
  }

  // String format (prefixed with s_)
  if (encoded.startsWith('s_')) {
    return urlSafeBase64Decode(encoded.slice(2))
  }

  // Check if it's a plain numeric ID (backwards compatibility)
  // Plain numeric IDs are just digits, no letters
  if (/^\d+$/.test(encoded)) {
    return encoded
  }

  // Check if it's a plain UUID (backwards compatibility)
  if (isUUID(encoded)) {
    return encoded
  }

  // Base62 numeric format with salted deobfuscation
  // Try decoding with progressively shorter lengths to handle padding
  for (let len = encoded.length; len >= 3; len--) {
    const substring = encoded.substring(0, len)
    const scrambled = fromBase62(substring)
    if (scrambled !== null) {
      const original = deobfuscateNumber(scrambled)
      // Validate that the result is a valid non-negative integer within reasonable bounds
      if (Number.isInteger(original) && original >= 0 && original < 10000000) {
        // Verify the padding matches (deterministic check)
        const reEncoded = encodeId(original)
        if (reEncoded === encoded) {
          return String(original)
        }
      }
    }
  }

  // Fallback: return as-is (might be a plain ID or unknown format)
  return encoded
}

/**
 * Convert a number to base62 string
 */
function toBase62(num: number): string {
  if (num === 0) return BASE62_CHARS[0]

  let result = ''
  let n = num
  while (n > 0) {
    result = BASE62_CHARS[n % 62] + result
    n = Math.floor(n / 62)
  }
  return result
}

/**
 * Convert a base62 string back to number
 */
function fromBase62(str: string): number | null {
  if (!str || !/^[0-9A-Za-z]+$/.test(str)) {
    return null
  }

  let result = 0
  for (let i = 0; i < str.length; i++) {
    const char = str[i]
    const index = BASE62_CHARS.indexOf(char)
    if (index === -1) return null
    result = result * 62 + index
  }
  return result
}

/**
 * URL-safe base64 encode
 */
function urlSafeBase64Encode(str: string): string {
  try {
    const base64 = btoa(unescape(encodeURIComponent(str)))
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  } catch {
    return str
  }
}

/**
 * URL-safe base64 decode
 */
function urlSafeBase64Decode(encoded: string): string {
  try {
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '='
    }
    return decodeURIComponent(escape(atob(base64)))
  } catch {
    return encoded
  }
}

/**
 * Check if a string is a UUID
 */
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

/**
 * Hook for using encoded URLs in React Router
 *
 * @example
 * const { encodedDepartmentId, encodedFolderId, navigate } = useEncodedNavigation()
 * navigate.toDepartment(36) // navigates to /dashboard?department=Ga
 * navigate.toFolder('abc-123') // navigates to /dashboard?folder=u_abc123
 */
export function createEncodedNavigator(navigateFn: (path: string) => void) {
  return {
    toDashboard: () => navigateFn('/dashboard'),
    toDepartment: (departmentId: string | number) => {
      const encoded = encodeId(departmentId)
      navigateFn(`/dashboard?department=${encoded}`)
    },
    toFolder: (folderId: string | number) => {
      const encoded = encodeId(folderId)
      navigateFn(`/dashboard?folder=${encoded}`)
    },
    toFolderInDepartment: (folderId: string | number, departmentId: string | number) => {
      const encodedFolder = encodeId(folderId)
      const encodedDept = encodeId(departmentId)
      navigateFn(`/dashboard?folder=${encodedFolder}&department=${encodedDept}`)
    },
  }
}

/**
 * Parse encoded IDs from URL search params
 *
 * @example
 * const { departmentId, folderId } = parseEncodedParams(searchParams)
 */
export function parseEncodedParams(searchParams: URLSearchParams): {
  departmentId: string | null
  folderId: string | null
} {
  const rawDepartment = searchParams.get('department')
  const rawFolder = searchParams.get('folder')

  return {
    departmentId: decodeId(rawDepartment),
    folderId: decodeId(rawFolder),
  }
}

/**
 * Build URL with encoded IDs
 *
 * @example
 * buildEncodedUrl('/dashboard', { department: 36, folder: 'abc-123' })
 * // returns '/dashboard?department=Ga&folder=u_abc123'
 */
export function buildEncodedUrl(
  basePath: string,
  params: Record<string, string | number | null | undefined>
): string {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) {
      searchParams.set(key, encodeId(value))
    }
  }

  const queryString = searchParams.toString()
  return queryString ? `${basePath}?${queryString}` : basePath
}

export default {
  encodeId,
  decodeId,
  createEncodedNavigator,
  parseEncodedParams,
  buildEncodedUrl,
}
