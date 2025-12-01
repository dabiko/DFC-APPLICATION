/**
 * File Checksum Utility
 * Calculate SHA-256 checksums for files using the Web Crypto API
 * Falls back to JS implementation when Web Crypto is not available (non-HTTPS)
 */

/**
 * Check if Web Crypto API is available
 */
function isWebCryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && crypto.subtle !== undefined
}

/**
 * Simple SHA-256 implementation in JavaScript (fallback for non-HTTPS)
 * Based on the SHA-256 algorithm specification
 */
function sha256Fallback(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)

  // SHA-256 constants
  const K: number[] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]

  // Initial hash values
  let h0 = 0x6a09e667,
    h1 = 0xbb67ae85,
    h2 = 0x3c6ef372,
    h3 = 0xa54ff53a
  let h4 = 0x510e527f,
    h5 = 0x9b05688c,
    h6 = 0x1f83d9ab,
    h7 = 0x5be0cd19

  // Pre-processing: adding padding bits
  const bitLen = bytes.length * 8
  const newLen = bytes.length + 1 + 8 + ((64 - ((bytes.length + 1 + 8) % 64)) % 64)
  const padded = new Uint8Array(newLen)
  padded.set(bytes)
  padded[bytes.length] = 0x80

  // Append original length in bits as 64-bit big-endian
  const view = new DataView(padded.buffer)
  view.setUint32(newLen - 4, bitLen, false)

  // Helper functions
  const rotr = (n: number, x: number) => (x >>> n) | (x << (32 - n))
  const ch = (x: number, y: number, z: number) => (x & y) ^ (~x & z)
  const maj = (x: number, y: number, z: number) => (x & y) ^ (x & z) ^ (y & z)
  const sigma0 = (x: number) => rotr(2, x) ^ rotr(13, x) ^ rotr(22, x)
  const sigma1 = (x: number) => rotr(6, x) ^ rotr(11, x) ^ rotr(25, x)
  const gamma0 = (x: number) => rotr(7, x) ^ rotr(18, x) ^ (x >>> 3)
  const gamma1 = (x: number) => rotr(17, x) ^ rotr(19, x) ^ (x >>> 10)

  // Process each 512-bit chunk
  for (let i = 0; i < newLen; i += 64) {
    const w: number[] = new Array(64)

    // Break chunk into sixteen 32-bit words
    for (let j = 0; j < 16; j++) {
      w[j] = view.getUint32(i + j * 4, false)
    }

    // Extend to 64 words
    for (let j = 16; j < 64; j++) {
      w[j] = (gamma1(w[j - 2]) + w[j - 7] + gamma0(w[j - 15]) + w[j - 16]) >>> 0
    }

    // Initialize working variables
    let a = h0,
      b = h1,
      c = h2,
      d = h3,
      e = h4,
      f = h5,
      g = h6,
      h = h7

    // Main loop
    for (let j = 0; j < 64; j++) {
      const t1 = (h + sigma1(e) + ch(e, f, g) + K[j] + w[j]) >>> 0
      const t2 = (sigma0(a) + maj(a, b, c)) >>> 0
      h = g
      g = f
      f = e
      e = (d + t1) >>> 0
      d = c
      c = b
      b = a
      a = (t1 + t2) >>> 0
    }

    // Add to hash
    h0 = (h0 + a) >>> 0
    h1 = (h1 + b) >>> 0
    h2 = (h2 + c) >>> 0
    h3 = (h3 + d) >>> 0
    h4 = (h4 + e) >>> 0
    h5 = (h5 + f) >>> 0
    h6 = (h6 + g) >>> 0
    h7 = (h7 + h) >>> 0
  }

  // Convert to hex string
  const toHex = (n: number) => n.toString(16).padStart(8, '0')
  return (
    toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4) + toHex(h5) + toHex(h6) + toHex(h7)
  )
}

/**
 * Calculate SHA-256 checksum for a file
 * @param file - The file to calculate checksum for
 * @param onProgress - Optional callback for progress updates (0-100)
 * @returns Promise resolving to hex-encoded SHA-256 checksum
 */
export async function calculateFileChecksum(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  // For small files (< 10MB), read entire file at once
  if (file.size < 10 * 1024 * 1024) {
    const buffer = await file.arrayBuffer()

    if (isWebCryptoAvailable()) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
      return arrayBufferToHex(hashBuffer)
    } else {
      // Fallback to JS implementation
      return sha256Fallback(buffer)
    }
  }

  // For larger files, read in chunks to avoid memory issues
  const chunkSize = 2 * 1024 * 1024 // 2MB chunks
  const chunks = Math.ceil(file.size / chunkSize)

  // We need to hash incrementally, but Web Crypto doesn't support streaming
  // So we'll collect all chunks and hash at the end
  // For very large files, this could still use significant memory
  const allChunks: Uint8Array[] = []
  let processedSize = 0

  for (let i = 0; i < chunks; i++) {
    const start = i * chunkSize
    const end = Math.min(start + chunkSize, file.size)
    const chunk = file.slice(start, end)
    const buffer = await chunk.arrayBuffer()
    allChunks.push(new Uint8Array(buffer))

    processedSize += buffer.byteLength
    if (onProgress) {
      onProgress(Math.round((processedSize / file.size) * 100))
    }
  }

  // Combine all chunks
  const totalLength = allChunks.reduce((acc, chunk) => acc + chunk.length, 0)
  const combined = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of allChunks) {
    combined.set(chunk, offset)
    offset += chunk.length
  }

  // Calculate hash
  if (isWebCryptoAvailable()) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', combined)
    return arrayBufferToHex(hashBuffer)
  } else {
    // Fallback to JS implementation
    return sha256Fallback(combined.buffer)
  }
}

/**
 * Calculate checksums for multiple files
 * @param files - Array of files to calculate checksums for
 * @param onProgress - Optional callback for overall progress (0-100)
 * @returns Promise resolving to map of filename to checksum
 */
export async function calculateFileChecksums(
  files: File[],
  onProgress?: (progress: number, currentFile: string) => void
): Promise<Map<File, string>> {
  const checksums = new Map<File, string>()
  const totalFiles = files.length

  for (let i = 0; i < files.length; i++) {
    const file = files[i]

    if (onProgress) {
      onProgress(Math.round((i / totalFiles) * 100), file.name)
    }

    const checksum = await calculateFileChecksum(file)
    checksums.set(file, checksum)
  }

  if (onProgress) {
    onProgress(100, '')
  }

  return checksums
}

/**
 * Convert ArrayBuffer to hex string
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const byteArray = new Uint8Array(buffer)
  const hexParts: string[] = []

  for (let i = 0; i < byteArray.length; i++) {
    const hex = byteArray[i].toString(16).padStart(2, '0')
    hexParts.push(hex)
  }

  return hexParts.join('')
}

/**
 * Result of duplicate check
 */
export interface DuplicateCheckResult {
  checksum: string
  file: File
  isDuplicate: boolean
  existingDocument?: {
    id: string
    title: string
    fileName: string
    folderId: string | null
    folderName: string | null
    folderPath: string | null
    confidentialityLevel: string
    documentType: string
  }
}
