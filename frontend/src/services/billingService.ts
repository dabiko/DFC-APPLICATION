/**
 * Billing Service - API layer for subscription and billing operations
 * Digital Filing Cabinet (DFC) Application
 */

import apiClient from './apiClient'
import type {
  Subscription,
  Plan,
  PaymentMethod,
  Invoice,
  UsageMetrics,
  PlanChangeRequest,
  CancellationRequest,
  PaymentFormData,
  SubscriptionCreateRequest,
  ProrationCalculation,
  Coupon,
  BillingSettings,
  UsageAlert,
  TrialStatus,
  PaginatedResponse,
  BillingHistoryFilters,
  CardBrand,
} from '../types/billing'

const BILLING_BASE = '/billing'

/**
 * Transform payment method from API response (snake_case) to frontend format (camelCase)
 */
interface ApiPaymentMethod {
  id: string
  type: string
  is_default: boolean
  card?: {
    brand: string
    last4: string
    expiryMonth: number
    expiryYear: number
    holderName: string
  }
  bank_account?: {
    bankName: string
    accountType: string
    last4: string
    holderName: string
  }
  paypal?: {
    email: string
  }
  created_at: string
}

function transformPaymentMethod(apiMethod: ApiPaymentMethod): PaymentMethod {
  return {
    id: apiMethod.id,
    type: apiMethod.type as PaymentMethod['type'],
    isDefault: apiMethod.is_default,
    card: apiMethod.card
      ? {
          brand: apiMethod.card.brand as CardBrand,
          last4: apiMethod.card.last4,
          expiryMonth: apiMethod.card.expiryMonth,
          expiryYear: apiMethod.card.expiryYear,
          holderName: apiMethod.card.holderName,
        }
      : undefined,
    bankAccount: apiMethod.bank_account,
    paypal: apiMethod.paypal,
    createdAt: apiMethod.created_at,
  }
}

/**
 * Plans API
 */
export const plansApi = {
  /**
   * Get all available subscription plans
   */
  async getPlans(): Promise<Plan[]> {
    try {
      const response = await apiClient.get<Plan[]>(`${BILLING_BASE}/plans/`)
      return response.data
    } catch (error: any) {
      // Return empty array if no plans exist (404)
      if (error.response?.status === 404) {
        return []
      }
      throw error
    }
  },

  /**
   * Get a specific plan by ID
   */
  async getPlanById(planId: string): Promise<Plan> {
    const response = await apiClient.get<Plan>(`${BILLING_BASE}/plans/${planId}/`)
    return response.data
  },
}

/**
 * Subscription API
 */
export const subscriptionApi = {
  /**
   * Get current user's subscription
   */
  async getSubscription(): Promise<Subscription | null> {
    try {
      const response = await apiClient.get<Subscription>(`${BILLING_BASE}/subscription/`)
      return response.data
    } catch (error: any) {
      // Return null if no subscription exists (404)
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  },

  /**
   * Create a new subscription
   */
  async createSubscription(data: SubscriptionCreateRequest): Promise<Subscription> {
    const response = await apiClient.post<Subscription>(`${BILLING_BASE}/subscription/`, data)
    return response.data
  },

  /**
   * Upgrade subscription to a higher plan
   */
  async upgradeSubscription(data: PlanChangeRequest): Promise<Subscription> {
    const response = await apiClient.post<{ subscription: Subscription }>(
      `${BILLING_BASE}/subscription/upgrade/`,
      data
    )
    return response.data.subscription
  },

  /**
   * Downgrade subscription to a lower plan
   */
  async downgradeSubscription(data: PlanChangeRequest): Promise<Subscription> {
    const response = await apiClient.post<{ subscription: Subscription }>(
      `${BILLING_BASE}/subscription/downgrade/`,
      data
    )
    return response.data.subscription
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(data: CancellationRequest): Promise<Subscription> {
    const response = await apiClient.post<Subscription>(
      `${BILLING_BASE}/subscription/cancel/`,
      data
    )
    return response.data
  },

  /**
   * Reactivate a cancelled subscription
   */
  async reactivateSubscription(): Promise<Subscription> {
    const response = await apiClient.post<Subscription>(`${BILLING_BASE}/subscription/reactivate/`)
    return response.data
  },

  /**
   * Get proration preview for plan change
   */
  async getProrationPreview(data: PlanChangeRequest): Promise<ProrationCalculation> {
    const response = await apiClient.post<ProrationCalculation>(
      `${BILLING_BASE}/subscription/proration-preview/`,
      data
    )
    return response.data
  },

  /**
   * Update subscription auto-renewal setting
   */
  async updateAutoRenewal(autoRenew: boolean): Promise<Subscription> {
    const response = await apiClient.patch<Subscription>(`${BILLING_BASE}/subscription/`, {
      autoRenew,
    })
    return response.data
  },

  /**
   * Get trial status
   */
  async getTrialStatus(): Promise<TrialStatus> {
    const response = await apiClient.get<TrialStatus>(`${BILLING_BASE}/subscription/trial-status/`)
    return response.data
  },

  /**
   * Convert trial to paid subscription
   */
  async convertTrial(data: {
    planId: string
    billingCycle: string
    paymentMethodId: string
  }): Promise<Subscription> {
    const response = await apiClient.post<Subscription>(
      `${BILLING_BASE}/subscription/convert-trial/`,
      data
    )
    return response.data
  },
}

/**
 * Payment Methods API
 */
export const paymentMethodsApi = {
  /**
   * Get all payment methods for current user
   */
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const response = await apiClient.get<ApiPaymentMethod[]>(`${BILLING_BASE}/payment-methods/`)
      return response.data.map(transformPaymentMethod)
    } catch (error: any) {
      // Return empty array if no payment methods exist (404)
      if (error.response?.status === 404) {
        return []
      }
      throw error
    }
  },

  /**
   * Add a new payment method
   */
  async addPaymentMethod(data: PaymentFormData): Promise<PaymentMethod> {
    const response = await apiClient.post<ApiPaymentMethod>(
      `${BILLING_BASE}/payment-methods/`,
      data
    )
    return transformPaymentMethod(response.data)
  },

  /**
   * Delete a payment method
   */
  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    await apiClient.delete(`${BILLING_BASE}/payment-methods/${paymentMethodId}/`)
  },

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(paymentMethodId: string): Promise<PaymentMethod> {
    const response = await apiClient.post<ApiPaymentMethod>(
      `${BILLING_BASE}/payment-methods/${paymentMethodId}/set-default/`
    )
    return transformPaymentMethod(response.data)
  },

  /**
   * Update payment method
   */
  async updatePaymentMethod(
    paymentMethodId: string,
    data: Partial<PaymentFormData>
  ): Promise<PaymentMethod> {
    const response = await apiClient.patch<ApiPaymentMethod>(
      `${BILLING_BASE}/payment-methods/${paymentMethodId}/`,
      data
    )
    return transformPaymentMethod(response.data)
  },
}

/**
 * Invoices API
 */
export const invoicesApi = {
  /**
   * Get billing history (invoices)
   */
  async getInvoices(
    page: number = 1,
    pageSize: number = 10,
    filters?: BillingHistoryFilters
  ): Promise<PaginatedResponse<Invoice>> {
    try {
      const response = await apiClient.get<{ results: Invoice[]; count: number }>(
        `${BILLING_BASE}/invoices/`,
        {
          params: {
            page,
            page_size: pageSize,
            ...filters,
          },
        }
      )
      // Transform DRF pagination format to our expected format
      return {
        data: response.data.results || [],
        pagination: {
          total: response.data.count || 0,
          page,
          pageSize,
          totalPages: Math.ceil((response.data.count || 0) / pageSize),
        },
      }
    } catch (error: any) {
      // Return empty result if no invoices exist (404)
      if (error.response?.status === 404) {
        return {
          data: [],
          pagination: {
            total: 0,
            page,
            pageSize,
            totalPages: 0,
          },
        }
      }
      throw error
    }
  },

  /**
   * Get a specific invoice
   */
  async getInvoiceById(invoiceId: string): Promise<Invoice> {
    const response = await apiClient.get<Invoice>(`${BILLING_BASE}/invoices/${invoiceId}/`)
    return response.data
  },

  /**
   * Download invoice PDF
   */
  async downloadInvoice(invoiceId: string): Promise<Blob> {
    const response = await apiClient.get(`${BILLING_BASE}/invoices/${invoiceId}/download/`, {
      responseType: 'blob',
    })
    return response.data
  },

  /**
   * Retry failed payment for invoice
   */
  async retryPayment(invoiceId: string): Promise<Invoice> {
    const response = await apiClient.post<Invoice>(
      `${BILLING_BASE}/invoices/${invoiceId}/retry-payment/`
    )
    return response.data
  },
}

/**
 * Usage API
 */
export const usageApi = {
  /**
   * Get current usage metrics
   */
  async getUsageMetrics(): Promise<UsageMetrics | null> {
    try {
      const response = await apiClient.get<UsageMetrics>(`${BILLING_BASE}/usage/`)
      return response.data
    } catch (error: any) {
      // Return null if no subscription exists (404)
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  },

  /**
   * Get usage alerts
   */
  async getUsageAlerts(): Promise<UsageAlert[]> {
    try {
      const response = await apiClient.get<UsageAlert[]>(`${BILLING_BASE}/usage/alerts/`)
      return response.data
    } catch (error: any) {
      // Return empty array if no subscription exists (404)
      if (error.response?.status === 404) {
        return []
      }
      throw error
    }
  },

  /**
   * Dismiss a usage alert
   */
  async dismissAlert(alertId: string): Promise<void> {
    await apiClient.post(`${BILLING_BASE}/usage/alerts/${alertId}/dismiss/`)
  },
}

/**
 * Coupons API
 */
export const couponsApi = {
  /**
   * Validate a coupon code
   */
  async validateCoupon(code: string, planId?: string): Promise<Coupon> {
    const response = await apiClient.post<Coupon>(`${BILLING_BASE}/coupons/validate/`, {
      code,
      planId,
    })
    return response.data
  },

  /**
   * Apply coupon to subscription
   */
  async applyCoupon(code: string): Promise<{ message: string; coupon: Coupon }> {
    const response = await apiClient.post<{ message: string; coupon: Coupon }>(
      `${BILLING_BASE}/coupons/apply/`,
      { code }
    )
    return response.data
  },
}

/**
 * Settings API
 */
export const billingSettingsApi = {
  /**
   * Get billing settings
   */
  async getSettings(): Promise<BillingSettings> {
    const response = await apiClient.get<BillingSettings>(`${BILLING_BASE}/settings/`)
    return response.data
  },

  /**
   * Update billing settings
   */
  async updateSettings(settings: Partial<BillingSettings>): Promise<BillingSettings> {
    const response = await apiClient.patch<BillingSettings>(`${BILLING_BASE}/settings/`, settings)
    return response.data
  },
}

/**
 * Combined billing service export
 */
const billingService = {
  plans: plansApi,
  subscription: subscriptionApi,
  paymentMethods: paymentMethodsApi,
  invoices: invoicesApi,
  usage: usageApi,
  coupons: couponsApi,
  settings: billingSettingsApi,
}

export default billingService
