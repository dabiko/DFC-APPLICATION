/**
 * PaymentMethodForm Component
 * Secure form for adding/updating payment methods
 */

import React, { useState } from 'react'
import { Input } from '../Input/Input'
import { Button } from '../Button/Button'
import { Alert } from '../Feedback/Alert'
import {
  validateCardNumber,
  validateExpiryDate,
  validateCVV,
  validateCardholderName,
  validatePostalCode,
  formatCardNumber,
  formatExpiryDate,
  detectCardBrand,
  getCardBrandName,
} from '../../utils/paymentValidation'
import type { PaymentFormData } from '../../types/billing'
import { cn } from '../../utils/cn'

export interface PaymentMethodFormProps {
  onSubmit: (data: PaymentFormData) => Promise<void>
  onCancel?: () => void
  initialData?: Partial<PaymentFormData>
  loading?: boolean
  error?: string
  className?: string
}

export const PaymentMethodForm: React.FC<PaymentMethodFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  loading = false,
  error: externalError,
  className,
}) => {
  const [formData, setFormData] = useState<PaymentFormData>({
    cardNumber: initialData?.cardNumber || '',
    cardholderName: initialData?.cardholderName || '',
    expiryMonth: initialData?.expiryMonth || '',
    expiryYear: initialData?.expiryYear || '',
    cvv: initialData?.cvv || '',
    billingAddress: {
      line1: initialData?.billingAddress?.line1 || '',
      line2: initialData?.billingAddress?.line2 || '',
      city: initialData?.billingAddress?.city || '',
      state: initialData?.billingAddress?.state || '',
      postalCode: initialData?.billingAddress?.postalCode || '',
      country: initialData?.billingAddress?.country || 'US',
    },
  })

  const [errors, setErrors] = useState<
    Partial<Record<keyof PaymentFormData | 'billingAddress', string>>
  >({})
  const [touched, setTouched] = useState<
    Partial<Record<keyof PaymentFormData | 'billingAddress', boolean>>
  >({})

  // Derive card brand from card number (avoid setState in effect)
  const cardBrand = formData.cardNumber ? detectCardBrand(formData.cardNumber) : 'unknown'

  const handleInputChange = (field: keyof PaymentFormData, value: string) => {
    // Format card number
    if (field === 'cardNumber') {
      value = formatCardNumber(value)
    }

    setFormData((prev) => ({ ...prev, [field]: value }))
    setTouched((prev) => ({ ...prev, [field]: true }))

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleAddressChange = (field: keyof PaymentFormData['billingAddress'], value: string) => {
    setFormData((prev) => ({
      ...prev,
      billingAddress: { ...prev.billingAddress, [field]: value },
    }))
    setTouched((prev) => ({ ...prev, billingAddress: true }))

    if (errors.billingAddress) {
      setErrors((prev) => ({ ...prev, billingAddress: undefined }))
    }
  }

  const handleExpiryChange = (value: string) => {
    const formatted = formatExpiryDate(value)
    const [month, year] = formatted.split('/')

    setFormData((prev) => ({
      ...prev,
      expiryMonth: month || '',
      expiryYear: year || '',
    }))
    setTouched((prev) => ({ ...prev, expiryMonth: true, expiryYear: true }))

    if (errors.expiryMonth || errors.expiryYear) {
      setErrors((prev) => ({
        ...prev,
        expiryMonth: undefined,
        expiryYear: undefined,
      }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof PaymentFormData | 'billingAddress', string>> = {}

    // Validate card number
    const cardValidation = validateCardNumber(formData.cardNumber)
    if (!cardValidation.valid) {
      newErrors.cardNumber = cardValidation.error
    }

    // Validate cardholder name
    const nameValidation = validateCardholderName(formData.cardholderName)
    if (!nameValidation.valid) {
      newErrors.cardholderName = nameValidation.error
    }

    // Validate expiry date
    const expiryValidation = validateExpiryDate(formData.expiryMonth, formData.expiryYear)
    if (!expiryValidation.valid) {
      newErrors.expiryMonth = expiryValidation.error
    }

    // Validate CVV
    const cvvValidation = validateCVV(formData.cvv, cardBrand)
    if (!cvvValidation.valid) {
      newErrors.cvv = cvvValidation.error
    }

    // Validate billing address
    if (!formData.billingAddress.line1) {
      newErrors.billingAddress = 'Address is required'
    } else if (!formData.billingAddress.city) {
      newErrors.billingAddress = 'City is required'
    } else if (!formData.billingAddress.state) {
      newErrors.billingAddress = 'State is required'
    } else {
      const postalValidation = validatePostalCode(formData.billingAddress.postalCode)
      if (!postalValidation.valid) {
        newErrors.billingAddress = postalValidation.error
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Mark all fields as touched
    setTouched({
      cardNumber: true,
      cardholderName: true,
      expiryMonth: true,
      expiryYear: true,
      cvv: true,
      billingAddress: true,
    })

    if (!validateForm()) {
      return
    }

    try {
      await onSubmit(formData)
    } catch (err) {
      // Error handling is done via external error prop
      console.error('Payment form submission error:', err)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      {/* External Error */}
      {externalError && (
        <Alert variant="error" title="Payment Error">
          {externalError}
        </Alert>
      )}

      {/* Security Notice */}
      <Alert variant="info" title="Secure Payment">
        Your payment information is encrypted and secure. We never store your full card details.
      </Alert>

      {/* Card Number */}
      <div>
        <Input
          label="Card Number"
          type="text"
          placeholder="1234 5678 9012 3456"
          value={formData.cardNumber}
          onChange={(e) => handleInputChange('cardNumber', e.target.value)}
          error={touched.cardNumber ? errors.cardNumber : undefined}
          maxLength={23}
          required
          autoComplete="cc-number"
          icon={
            cardBrand !== 'unknown' ? (
              <span className="text-xs font-medium text-gray-600">
                {getCardBrandName(cardBrand)}
              </span>
            ) : undefined
          }
        />
      </div>

      {/* Cardholder Name */}
      <div>
        <Input
          label="Cardholder Name"
          type="text"
          placeholder="John Doe"
          value={formData.cardholderName}
          onChange={(e) => handleInputChange('cardholderName', e.target.value)}
          error={touched.cardholderName ? errors.cardholderName : undefined}
          required
          autoComplete="cc-name"
        />
      </div>

      {/* Expiry Date and CVV */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Input
            label="Expiry Date"
            type="text"
            placeholder="MM/YY"
            value={
              formData.expiryMonth && formData.expiryYear
                ? `${formData.expiryMonth}/${formData.expiryYear}`
                : ''
            }
            onChange={(e) => handleExpiryChange(e.target.value)}
            error={touched.expiryMonth ? errors.expiryMonth : undefined}
            maxLength={5}
            required
            autoComplete="cc-exp"
          />
        </div>
        <div>
          <Input
            label="CVV"
            type="text"
            placeholder={cardBrand === 'amex' ? '1234' : '123'}
            value={formData.cvv}
            onChange={(e) => handleInputChange('cvv', e.target.value.replace(/\D/g, ''))}
            error={touched.cvv ? errors.cvv : undefined}
            maxLength={cardBrand === 'amex' ? 4 : 3}
            required
            autoComplete="cc-csc"
          />
        </div>
      </div>

      {/* Billing Address */}
      <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h4 className="text-sm font-semibold text-gray-900">Billing Address</h4>

        <Input
          label="Address Line 1"
          type="text"
          placeholder="123 Main St"
          value={formData.billingAddress.line1}
          onChange={(e) => handleAddressChange('line1', e.target.value)}
          required
          autoComplete="address-line1"
        />

        <Input
          label="Address Line 2 (Optional)"
          type="text"
          placeholder="Apt 4B"
          value={formData.billingAddress.line2}
          onChange={(e) => handleAddressChange('line2', e.target.value)}
          autoComplete="address-line2"
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="City"
            type="text"
            placeholder="New York"
            value={formData.billingAddress.city}
            onChange={(e) => handleAddressChange('city', e.target.value)}
            required
            autoComplete="address-level2"
          />

          <Input
            label="State"
            type="text"
            placeholder="NY"
            value={formData.billingAddress.state}
            onChange={(e) => handleAddressChange('state', e.target.value)}
            required
            autoComplete="address-level1"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Postal Code"
            type="text"
            placeholder="10001"
            value={formData.billingAddress.postalCode}
            onChange={(e) => handleAddressChange('postalCode', e.target.value)}
            required
            autoComplete="postal-code"
          />

          <Input
            label="Country"
            type="text"
            value={formData.billingAddress.country}
            onChange={(e) => handleAddressChange('country', e.target.value)}
            disabled
            autoComplete="country"
          />
        </div>

        {touched.billingAddress && errors.billingAddress && (
          <p className="text-sm text-red-600">{errors.billingAddress}</p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" loading={loading} disabled={loading}>
          {loading ? 'Processing...' : 'Add Payment Method'}
        </Button>
      </div>
    </form>
  )
}

export default PaymentMethodForm
