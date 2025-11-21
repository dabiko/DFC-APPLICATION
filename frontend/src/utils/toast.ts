/**
 * Toast Notification Utility
 * Provides consistent error and success messaging across billing components
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastOptions {
  message: string
  type: ToastType
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

class ToastManager {
  private listeners: Array<(toast: ToastOptions) => void> = []

  subscribe(listener: (toast: ToastOptions) => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  show(options: ToastOptions) {
    this.listeners.forEach((listener) => listener(options))
  }

  success(message: string, duration = 5000) {
    this.show({ message, type: 'success', duration })
  }

  error(message: string, duration = 7000) {
    this.show({ message, type: 'error', duration })
  }

  warning(message: string, duration = 6000) {
    this.show({ message, type: 'warning', duration })
  }

  info(message: string, duration = 5000) {
    this.show({ message, type: 'info', duration })
  }
}

export const toast = new ToastManager()

// Billing-specific error messages
export const billingErrorMessages = {
  // Payment errors
  cardDeclined: 'Your card was declined. Please try a different payment method.',
  insufficientFunds: 'Insufficient funds. Please use a different card or contact your bank.',
  cardExpired: 'Your card has expired. Please update your payment method.',
  cardInvalid: 'Invalid card details. Please check and try again.',

  // Network errors
  networkError: 'Network error. Please check your connection and try again.',
  serverError: 'Server error. Please try again later.',
  timeout: 'Request timed out. Please try again.',

  // Subscription errors
  subscriptionNotFound: 'Subscription not found. Please contact support.',
  planNotAvailable: 'This plan is no longer available.',
  downgradeRestricted: 'Cannot downgrade to this plan. Please contact support.',
  alreadySubscribed: 'You are already subscribed to this plan.',

  // Payment method errors
  paymentMethodNotFound: 'Payment method not found.',
  cannotDeleteDefault: 'Cannot delete default payment method. Set another as default first.',

  // Invoice errors
  invoiceNotFound: 'Invoice not found.',
  downloadFailed: 'Failed to download invoice. Please try again.',

  // Generic
  unknown: 'An unexpected error occurred. Please try again or contact support.',
}

// Billing-specific success messages
export const billingSuccessMessages = {
  subscriptionUpgraded: 'Successfully upgraded subscription!',
  subscriptionDowngraded: 'Successfully downgraded subscription.',
  subscriptionCancelled: 'Subscription cancelled successfully.',
  subscriptionReactivated: 'Subscription reactivated successfully.',

  paymentMethodAdded: 'Payment method added successfully.',
  paymentMethodDeleted: 'Payment method removed successfully.',
  paymentMethodUpdated: 'Default payment method updated.',

  paymentRetrySuccess: 'Payment processed successfully.',
  invoiceDownloaded: 'Invoice downloaded successfully.',
}

/**
 * Maps API error codes to user-friendly messages
 */
export function getBillingErrorMessage(error: any): string {
  if (!error) return billingErrorMessages.unknown

  // Network errors
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return billingErrorMessages.timeout
  }
  if (error.message?.includes('Network Error')) {
    return billingErrorMessages.networkError
  }

  // API error responses
  const errorCode = error.response?.data?.code || error.code
  const errorMessage = error.response?.data?.message || error.message

  // Payment-specific errors
  const paymentErrorMap: Record<string, string> = {
    card_declined: billingErrorMessages.cardDeclined,
    insufficient_funds: billingErrorMessages.insufficientFunds,
    expired_card: billingErrorMessages.cardExpired,
    invalid_card: billingErrorMessages.cardInvalid,
    subscription_not_found: billingErrorMessages.subscriptionNotFound,
    plan_not_available: billingErrorMessages.planNotAvailable,
    downgrade_restricted: billingErrorMessages.downgradeRestricted,
    already_subscribed: billingErrorMessages.alreadySubscribed,
    payment_method_not_found: billingErrorMessages.paymentMethodNotFound,
    cannot_delete_default: billingErrorMessages.cannotDeleteDefault,
    invoice_not_found: billingErrorMessages.invoiceNotFound,
  }

  if (errorCode && paymentErrorMap[errorCode]) {
    return paymentErrorMap[errorCode]
  }

  // HTTP status codes
  if (error.response?.status === 500) {
    return billingErrorMessages.serverError
  }

  // Return API message if available, otherwise generic error
  return errorMessage || billingErrorMessages.unknown
}

/**
 * Retry configuration for failed requests
 */
export interface RetryConfig {
  maxAttempts: number
  delay: number
  backoff: boolean
}

export const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  delay: 1000,
  backoff: true,
}

/**
 * Retry a failed async operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxAttempts, delay, backoff } = { ...defaultRetryConfig, ...config }
  let lastError: any

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      if (attempt < maxAttempts) {
        const waitTime = backoff ? delay * Math.pow(2, attempt - 1) : delay
        await new Promise((resolve) => setTimeout(resolve, waitTime))
      }
    }
  }

  throw lastError
}
