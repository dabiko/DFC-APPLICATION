/**
 * DocumentMetadataForm Component
 * Comprehensive form for document metadata input with validation
 */

import { FC, useState, useEffect, useMemo } from 'react'
import { TagInput } from '@components/Input/TagInput'
import { Select } from '@components/Input/Select'
import { Input } from '@components/Input/Input'
import { Textarea } from '@components/Input/Textarea'
import { DateInput } from '@components/Input/DateInput'
import { Button } from '@components/Button/Button'
import type { MetadataFormProps, CreateDocumentMetadata, DocumentMetadata } from '@/types/metadata'
import {
  DOCUMENT_TYPES,
  DEPARTMENTS,
  CONFIDENTIALITY_LEVELS,
  RETENTION_PERIODS,
  IDENTIFIER_TYPES,
  CURRENCIES,
  getSuggestedTags,
  getDefaultRetentionPeriod,
  getDepartmentInfo,
} from '@/data/metadataLists'
import { validateMetadata, validateField } from '@/utils/metadataValidation'

export const DocumentMetadataForm: FC<MetadataFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  mode = 'create',
  documentType,
  department,
  isLoading = false,
  className = '',
}) => {
  // Form state
  const [formData, setFormData] = useState<Partial<DocumentMetadata>>({
    title: '',
    documentType: documentType || 'other',
    identifier: '',
    identifierType: 'reference_number',
    date: new Date().toISOString().split('T')[0],
    creator: '',
    department: department || 'operations',
    confidentialityLevel: 'internal',
    retentionPeriod: '5_years',
    tags: [],
    description: '',
    keywords: [],
    ...initialValues,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [showOptionalFields, setShowOptionalFields] = useState(false)

  // Update confidentiality level when department changes
  useEffect(() => {
    if (formData.department && !touched.confidentialityLevel) {
      const deptInfo = getDepartmentInfo(formData.department)
      if (deptInfo) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFormData((prev) => ({ ...prev, confidentialityLevel: deptInfo.defaultConfidentiality }))
      }
    }
  }, [formData.department, touched.confidentialityLevel])

  // Update retention period when document type changes
  useEffect(() => {
    if (formData.documentType && !touched.retentionPeriod) {
      const defaultRetention = getDefaultRetentionPeriod(formData.documentType)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData((prev) => ({ ...prev, retentionPeriod: defaultRetention }))
    }
  }, [formData.documentType, touched.retentionPeriod])

  // Get tag suggestions based on document type
  const tagSuggestions = useMemo(() => {
    return formData.documentType ? getSuggestedTags(formData.documentType) : []
  }, [formData.documentType])

  // Handle field change
  const handleChange = (field: keyof DocumentMetadata, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setTouched((prev) => ({ ...prev, [field]: true }))

    // Validate field on change
    const error = validateField(field, value, formData)
    setErrors((prev) => ({
      ...prev,
      [field]: error?.message || '',
    }))
  }

  // Handle field blur
  const handleBlur = (field: keyof DocumentMetadata) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate all fields
    const validationResult = validateMetadata(formData)

    if (!validationResult.isValid) {
      const newErrors: Record<string, string> = {}
      validationResult.errors.forEach((error) => {
        newErrors[error.field] = error.message
      })
      setErrors(newErrors)

      // Mark all required fields as touched
      const newTouched: Record<string, boolean> = {}
      validationResult.errors.forEach((error) => {
        newTouched[error.field] = true
      })
      setTouched(newTouched)

      return
    }

    // Submit form
    onSubmit(formData as CreateDocumentMetadata)
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {/* Required Fields Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
          Required Information
        </h3>

        {/* Title */}
        <Input
          label="Document Title"
          value={formData.title || ''}
          onChange={(e) => handleChange('title', e.target.value)}
          onBlur={() => handleBlur('title')}
          error={touched.title ? errors.title : undefined}
          placeholder="Enter document title"
          required
          disabled={isLoading}
        />

        {/* Document Type */}
        <Select
          label="Document Type"
          value={formData.documentType || ''}
          onChange={(e) => handleChange('documentType', e.target.value)}
          onBlur={() => handleBlur('documentType')}
          error={touched.documentType ? errors.documentType : undefined}
          required
          disabled={isLoading}
        >
          <option value="">Select document type...</option>
          {DOCUMENT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.icon} {type.label} - {type.description}
            </option>
          ))}
        </Select>

        {/* Identifier Type and Identifier */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Identifier Type"
            value={formData.identifierType || ''}
            onChange={(e) => handleChange('identifierType', e.target.value)}
            onBlur={() => handleBlur('identifierType')}
            error={touched.identifierType ? errors.identifierType : undefined}
            required
            disabled={isLoading}
          >
            {IDENTIFIER_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label} {type.format && `(${type.format})`}
              </option>
            ))}
          </Select>

          <Input
            label="Identifier"
            value={formData.identifier || ''}
            onChange={(e) => handleChange('identifier', e.target.value)}
            onBlur={() => handleBlur('identifier')}
            error={touched.identifier ? errors.identifier : undefined}
            placeholder={
              IDENTIFIER_TYPES.find((t) => t.value === formData.identifierType)?.format || 'Enter identifier'
            }
            required
            disabled={isLoading}
          />
        </div>

        {/* Date */}
        <DateInput
          label="Document Date"
          value={formData.date || ''}
          onChange={(e) => handleChange('date', e.target.value)}
          onBlur={() => handleBlur('date')}
          error={touched.date ? errors.date : undefined}
          max={new Date().toISOString().split('T')[0]}
          required
          disabled={isLoading}
        />

        {/* Creator */}
        <Input
          label="Creator / Source"
          value={formData.creator || ''}
          onChange={(e) => handleChange('creator', e.target.value)}
          onBlur={() => handleBlur('creator')}
          error={touched.creator ? errors.creator : undefined}
          placeholder="Enter creator or source name"
          required
          disabled={isLoading}
        />

        {/* Department */}
        <Select
          label="Department / Owner"
          value={formData.department || ''}
          onChange={(e) => handleChange('department', e.target.value)}
          onBlur={() => handleBlur('department')}
          error={touched.department ? errors.department : undefined}
          required
          disabled={isLoading}
        >
          {DEPARTMENTS.map((dept) => (
            <option key={dept.value} value={dept.value}>
              {dept.label} - {dept.description}
            </option>
          ))}
        </Select>

        {/* Confidentiality Level */}
        <Select
          label="Confidentiality Level"
          value={formData.confidentialityLevel || ''}
          onChange={(e) => handleChange('confidentialityLevel', e.target.value)}
          onBlur={() => handleBlur('confidentialityLevel')}
          error={touched.confidentialityLevel ? errors.confidentialityLevel : undefined}
          required
          disabled={isLoading}
        >
          {CONFIDENTIALITY_LEVELS.map((level) => (
            <option key={level.value} value={level.value}>
              {level.icon} {level.label} - {level.description}
            </option>
          ))}
        </Select>

        {/* Retention Period */}
        <div className="space-y-2">
          <Select
            label="Retention Period"
            value={formData.retentionPeriod || ''}
            onChange={(e) => handleChange('retentionPeriod', e.target.value)}
            onBlur={() => handleBlur('retentionPeriod')}
            error={touched.retentionPeriod ? errors.retentionPeriod : undefined}
            required
            disabled={isLoading}
          >
            {RETENTION_PERIODS.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label} - {period.description}
              </option>
            ))}
          </Select>

          {/* Custom Retention Years */}
          {formData.retentionPeriod === 'custom' && (
            <Input
              label="Custom Retention Years"
              type="number"
              value={formData.customRetentionYears || ''}
              onChange={(e) => handleChange('customRetentionYears', parseInt(e.target.value))}
              onBlur={() => handleBlur('customRetentionYears')}
              error={touched.customRetentionYears ? errors.customRetentionYears : undefined}
              min={1}
              max={100}
              required
              disabled={isLoading}
            />
          )}
        </div>

        {/* Tags */}
        <TagInput
          label="Tags / Keywords"
          value={formData.tags || []}
          onChange={(tags) => handleChange('tags', tags)}
          suggestions={tagSuggestions}
          error={touched.tags ? errors.tags : undefined}
          required
          disabled={isLoading}
          helpText="Press Enter to add tags. At least one tag is required."
        />
      </div>

      {/* Optional Fields Section */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setShowOptionalFields(!showOptionalFields)}
          className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
        >
          <span>{showOptionalFields ? '▼' : '▶'}</span>
          <span>Optional Information</span>
        </button>

        {showOptionalFields && (
          <div className="space-y-4 pl-6 border-l-2 border-gray-200 dark:border-gray-700">
            {/* Description */}
            <Textarea
              label="Description"
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              error={errors.description}
              placeholder="Enter document description"
              rows={4}
              maxLength={2000}
              disabled={isLoading}
            />

            {/* Subject */}
            <Input
              label="Subject"
              value={formData.subject || ''}
              onChange={(e) => handleChange('subject', e.target.value)}
              placeholder="Enter subject or topic"
              disabled={isLoading}
            />

            {/* Expiration Date */}
            <DateInput
              label="Expiration Date"
              value={formData.expirationDate || ''}
              onChange={(e) => handleChange('expirationDate', e.target.value)}
              error={errors.expirationDate}
              min={formData.date}
              disabled={isLoading}
              helperText="Optional expiration or review date"
            />

            {/* Contract Value and Currency */}
            {(formData.documentType === 'contract' || formData.documentType === 'agreement') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Contract Value"
                  type="number"
                  value={formData.contractValue || ''}
                  onChange={(e) => handleChange('contractValue', parseFloat(e.target.value))}
                  error={errors.contractValue}
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  disabled={isLoading}
                />

                <Select
                  label="Currency"
                  value={formData.currency || 'USD'}
                  onChange={(e) => handleChange('currency', e.target.value)}
                  disabled={isLoading}
                >
                  {CURRENCIES.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.symbol} {curr.code} - {curr.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {/* Customer Name */}
            <Input
              label="Customer / Client Name"
              value={formData.customerName || ''}
              onChange={(e) => handleChange('customerName', e.target.value)}
              placeholder="Enter customer or client name"
              disabled={isLoading}
            />

            {/* Fiscal Year */}
            <Input
              label="Fiscal Year"
              value={formData.fiscalYear || ''}
              onChange={(e) => handleChange('fiscalYear', e.target.value)}
              placeholder="e.g., FY2025"
              disabled={isLoading}
            />

            {/* Comments */}
            <Textarea
              label="Comments / Notes"
              value={formData.comments || ''}
              onChange={(e) => handleChange('comments', e.target.value)}
              placeholder="Additional notes or comments"
              rows={3}
              disabled={isLoading}
            />
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" isLoading={isLoading}>
          {mode === 'create' ? 'Save Metadata' : 'Update Metadata'}
        </Button>
      </div>
    </form>
  )
}
