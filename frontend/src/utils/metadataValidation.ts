/**
 * Metadata Validation Utilities
 * Validation rules and functions for document metadata
 */

import type {
  DocumentMetadata,
  CreateDocumentMetadata,
  MetadataValidationError,
  MetadataValidationResult,
} from '@/types/metadata'
import { getIdentifierTypeInfo } from '@/data/metadataLists'

/**
 * Required metadata fields for all documents
 */
export const REQUIRED_FIELDS: (keyof DocumentMetadata)[] = [
  'title',
  'documentType',
  'identifier',
  'identifierType',
  'date',
  'creator',
  'department',
  'confidentialityLevel',
  'retentionPeriod',
  'tags',
]

/**
 * Check if a field is required
 */
export const isFieldRequired = (field: keyof DocumentMetadata): boolean => {
  return REQUIRED_FIELDS.includes(field)
}

/**
 * Validate title
 */
export const validateTitle = (title: string): MetadataValidationError | null => {
  if (!title || title.trim().length === 0) {
    return {
      field: 'title',
      message: 'Title is required',
      code: 'REQUIRED',
    }
  }

  if (title.length < 3) {
    return {
      field: 'title',
      message: 'Title must be at least 3 characters long',
      code: 'MIN_LENGTH',
    }
  }

  if (title.length > 200) {
    return {
      field: 'title',
      message: 'Title cannot exceed 200 characters',
      code: 'MAX_LENGTH',
    }
  }

  return null
}

/**
 * Validate identifier based on type
 */
export const validateIdentifier = (
  identifier: string,
  identifierType: string
): MetadataValidationError | null => {
  if (!identifier || identifier.trim().length === 0) {
    return {
      field: 'identifier',
      message: 'Identifier is required',
      code: 'REQUIRED',
    }
  }

  // Get identifier type info for pattern validation
  const typeInfo = getIdentifierTypeInfo(identifierType as any)
  if (typeInfo?.pattern) {
    const regex = new RegExp(typeInfo.pattern)
    if (!regex.test(identifier)) {
      return {
        field: 'identifier',
        message: `Identifier must match format: ${typeInfo.format || typeInfo.pattern}`,
        code: 'INVALID_FORMAT',
      }
    }
  }

  return null
}

/**
 * Validate date (must be valid ISO date string)
 */
export const validateDate = (date: string): MetadataValidationError | null => {
  if (!date || date.trim().length === 0) {
    return {
      field: 'date',
      message: 'Date is required',
      code: 'REQUIRED',
    }
  }

  // Check if valid date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(date)) {
    return {
      field: 'date',
      message: 'Date must be in format YYYY-MM-DD',
      code: 'INVALID_FORMAT',
    }
  }

  // Check if valid date
  const dateObj = new Date(date)
  if (isNaN(dateObj.getTime())) {
    return {
      field: 'date',
      message: 'Invalid date',
      code: 'INVALID_DATE',
    }
  }

  // Check if date is not in the future
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (dateObj > today) {
    return {
      field: 'date',
      message: 'Date cannot be in the future',
      code: 'FUTURE_DATE',
    }
  }

  return null
}

/**
 * Validate creator
 */
export const validateCreator = (creator: string): MetadataValidationError | null => {
  if (!creator || creator.trim().length === 0) {
    return {
      field: 'creator',
      message: 'Creator is required',
      code: 'REQUIRED',
    }
  }

  if (creator.length < 2) {
    return {
      field: 'creator',
      message: 'Creator name must be at least 2 characters',
      code: 'MIN_LENGTH',
    }
  }

  return null
}

/**
 * Validate tags
 */
export const validateTags = (tags: string[]): MetadataValidationError | null => {
  if (!tags || tags.length === 0) {
    return {
      field: 'tags',
      message: 'At least one tag is required',
      code: 'REQUIRED',
    }
  }

  // Check each tag
  for (const tag of tags) {
    if (tag.length < 2) {
      return {
        field: 'tags',
        message: 'Each tag must be at least 2 characters',
        code: 'MIN_LENGTH',
      }
    }

    if (tag.length > 50) {
      return {
        field: 'tags',
        message: 'Each tag cannot exceed 50 characters',
        code: 'MAX_LENGTH',
      }
    }

    // Tags should only contain alphanumeric characters, hyphens, and underscores
    if (!/^[a-zA-Z0-9-_]+$/.test(tag)) {
      return {
        field: 'tags',
        message: 'Tags can only contain letters, numbers, hyphens, and underscores',
        code: 'INVALID_FORMAT',
      }
    }
  }

  if (tags.length > 20) {
    return {
      field: 'tags',
      message: 'Maximum 20 tags allowed',
      code: 'MAX_COUNT',
    }
  }

  return null
}

/**
 * Validate custom retention years (when retentionPeriod is 'custom')
 */
export const validateCustomRetentionYears = (
  retentionPeriod: string,
  customRetentionYears?: number
): MetadataValidationError | null => {
  if (retentionPeriod === 'custom') {
    if (!customRetentionYears || customRetentionYears <= 0) {
      return {
        field: 'customRetentionYears',
        message: 'Custom retention years must be specified and greater than 0',
        code: 'REQUIRED',
      }
    }

    if (customRetentionYears > 100) {
      return {
        field: 'customRetentionYears',
        message: 'Custom retention years cannot exceed 100',
        code: 'MAX_VALUE',
      }
    }
  }

  return null
}

/**
 * Validate expiration date (must be after document date)
 */
export const validateExpirationDate = (
  expirationDate: string | undefined,
  documentDate: string
): MetadataValidationError | null => {
  if (!expirationDate) return null

  // Check if valid date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(expirationDate)) {
    return {
      field: 'expirationDate',
      message: 'Expiration date must be in format YYYY-MM-DD',
      code: 'INVALID_FORMAT',
    }
  }

  // Check if valid date
  const expDate = new Date(expirationDate)
  if (isNaN(expDate.getTime())) {
    return {
      field: 'expirationDate',
      message: 'Invalid expiration date',
      code: 'INVALID_DATE',
    }
  }

  // Check if expiration date is after document date
  const docDate = new Date(documentDate)
  if (expDate <= docDate) {
    return {
      field: 'expirationDate',
      message: 'Expiration date must be after document date',
      code: 'INVALID_RANGE',
    }
  }

  return null
}

/**
 * Validate contract value
 */
export const validateContractValue = (
  contractValue: number | undefined
): MetadataValidationError | null => {
  if (contractValue === undefined) return null

  if (contractValue < 0) {
    return {
      field: 'contractValue',
      message: 'Contract value cannot be negative',
      code: 'MIN_VALUE',
    }
  }

  if (contractValue > 999999999999) {
    // 1 trillion limit
    return {
      field: 'contractValue',
      message: 'Contract value is too large',
      code: 'MAX_VALUE',
    }
  }

  return null
}

/**
 * Validate description
 */
export const validateDescription = (
  description: string | undefined
): MetadataValidationError | null => {
  if (!description) return null

  if (description.length > 2000) {
    return {
      field: 'description',
      message: 'Description cannot exceed 2000 characters',
      code: 'MAX_LENGTH',
    }
  }

  return null
}

/**
 * Validate keywords
 */
export const validateKeywords = (
  keywords: string[] | undefined
): MetadataValidationError | null => {
  if (!keywords) return null

  if (keywords.length > 50) {
    return {
      field: 'keywords',
      message: 'Maximum 50 keywords allowed',
      code: 'MAX_COUNT',
    }
  }

  for (const keyword of keywords) {
    if (keyword.length > 100) {
      return {
        field: 'keywords',
        message: 'Each keyword cannot exceed 100 characters',
        code: 'MAX_LENGTH',
      }
    }
  }

  return null
}

/**
 * Validate complete metadata object
 */
export const validateMetadata = (
  metadata: Partial<DocumentMetadata> | CreateDocumentMetadata
): MetadataValidationResult => {
  const errors: MetadataValidationError[] = []
  const warnings: MetadataValidationError[] = []

  // Validate required fields
  for (const field of REQUIRED_FIELDS) {
    const value = metadata[field]
    if (value === undefined || value === null || value === '') {
      errors.push({
        field,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} is required`,
        code: 'REQUIRED',
      })
    }
  }

  // Validate specific fields
  if (metadata.title) {
    const titleError = validateTitle(metadata.title)
    if (titleError) errors.push(titleError)
  }

  if (metadata.identifier && metadata.identifierType) {
    const identifierError = validateIdentifier(metadata.identifier, metadata.identifierType)
    if (identifierError) errors.push(identifierError)
  }

  if (metadata.date) {
    const dateError = validateDate(metadata.date)
    if (dateError) errors.push(dateError)
  }

  if (metadata.creator) {
    const creatorError = validateCreator(metadata.creator)
    if (creatorError) errors.push(creatorError)
  }

  if (metadata.tags) {
    const tagsError = validateTags(metadata.tags)
    if (tagsError) errors.push(tagsError)
  }

  if (metadata.retentionPeriod) {
    const retentionError = validateCustomRetentionYears(
      metadata.retentionPeriod,
      metadata.customRetentionYears
    )
    if (retentionError) errors.push(retentionError)
  }

  if (metadata.expirationDate && metadata.date) {
    const expirationError = validateExpirationDate(metadata.expirationDate, metadata.date)
    if (expirationError) errors.push(expirationError)
  }

  if (metadata.contractValue !== undefined) {
    const contractError = validateContractValue(metadata.contractValue)
    if (contractError) errors.push(contractError)
  }

  if (metadata.description) {
    const descriptionError = validateDescription(metadata.description)
    if (descriptionError) errors.push(descriptionError)
  }

  if (metadata.keywords) {
    const keywordsError = validateKeywords(metadata.keywords)
    if (keywordsError) errors.push(keywordsError)
  }

  // Add warnings
  if (metadata.tags && metadata.tags.length > 10) {
    warnings.push({
      field: 'tags',
      message: 'Consider using fewer tags for better organization',
      code: 'TOO_MANY_TAGS',
    })
  }

  if (metadata.description && metadata.description.length < 20) {
    warnings.push({
      field: 'description',
      message: 'Consider adding a more detailed description',
      code: 'SHORT_DESCRIPTION',
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate single field
 */
export const validateField = (
  field: keyof DocumentMetadata,
  value: unknown,
  metadata?: Partial<DocumentMetadata>
): MetadataValidationError | null => {
  switch (field) {
    case 'title':
      return validateTitle(value as string)
    case 'identifier':
      return validateIdentifier(value as string, metadata?.identifierType as string)
    case 'date':
      return validateDate(value as string)
    case 'creator':
      return validateCreator(value as string)
    case 'tags':
      return validateTags(value as string[])
    case 'customRetentionYears':
      return validateCustomRetentionYears(metadata?.retentionPeriod as string, value as number)
    case 'expirationDate':
      return validateExpirationDate(value as string, metadata?.date as string)
    case 'contractValue':
      return validateContractValue(value as number)
    case 'description':
      return validateDescription(value as string)
    case 'keywords':
      return validateKeywords(value as string[])
    default:
      return null
  }
}

/**
 * Get validation error message for a field
 */
export const getFieldError = (
  errors: MetadataValidationError[],
  field: keyof DocumentMetadata
): string | undefined => {
  const error = errors.find((e) => e.field === field)
  return error?.message
}

/**
 * Check if metadata has any errors
 */
export const hasErrors = (result: MetadataValidationResult): boolean => {
  return result.errors.length > 0
}

/**
 * Check if metadata has any warnings
 */
export const hasWarnings = (result: MetadataValidationResult): boolean => {
  return result.warnings ? result.warnings.length > 0 : false
}
