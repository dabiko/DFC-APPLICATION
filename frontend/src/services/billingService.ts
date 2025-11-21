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
  ApiResponse,
  PaginatedResponse,
  BillingHistoryFilters,
} from '../types/billing'

const BILLING_BASE = '/billing'

/**
 * Plans API
 */
export const plansApi = {
  /**
   * Get all available subscription plans
   */
  async getPlans(): Promise<Plan[]> {
    const response = await apiClient.get<ApiResponse<Plan[]>>(`${BILLING_BASE}/plans/`)
    return response.data.data
  },

  /**
   * Get a specific plan by ID
   */
  async getPlanById(planId: string): Promise<Plan> {
    const response = await apiClient.get<ApiResponse<Plan>>(`${BILLING_BASE}/plans/${planId}/`)
    return response.data.data
  },
}

/**
 * Subscription API
 */
export const subscriptionApi = {
  /**
   * Get current user's subscription
   */
  async getSubscription(): Promise<Subscription> {
    const response = await apiClient.get<ApiResponse<Subscription>>(`${BILLING_BASE}/subscription/`)
    return response.data.data
  },

  /**
   * Create a new subscription
   */
  async createSubscription(data: SubscriptionCreateRequest): Promise<Subscription> {
    const response = await apiClient.post<ApiResponse<Subscription>>(
      `${BILLING_BASE}/subscription/`,
      data
    )
    return response.data.data
  },

  /**
   * Upgrade subscription to a higher plan
   */
  async upgradeSubscription(data: PlanChangeRequest): Promise<Subscription> {
    const response = await apiClient.post<ApiResponse<Subscription>>(
      `${BILLING_BASE}/subscription/upgrade/`,
      data
    )
    return response.data.data
  },

  /**
   * Downgrade subscription to a lower plan
   */
  async downgradeSubscription(data: PlanChangeRequest): Promise<Subscription> {
    const response = await apiClient.post<ApiResponse<Subscription>>(
      `${BILLING_BASE}/subscription/downgrade/`,
      data
    )
    return response.data.data
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(data: CancellationRequest): Promise<Subscription> {
    const response = await apiClient.post<ApiResponse<Subscription>>(
      `${BILLING_BASE}/subscription/cancel/`,
      data
    )
    return response.data.data
  },

  /**
   * Reactivate a cancelled subscription
   */
  async reactivateSubscription(): Promise<Subscription> {
    const response = await apiClient.post<ApiResponse<Subscription>>(
      `${BILLING_BASE}/subscription/reactivate/`
    )
    return response.data.data
  },

  /**
   * Get proration preview for plan change
   */
  async getProrationPreview(data: PlanChangeRequest): Promise<ProrationCalculation> {
    const response = await apiClient.post<ApiResponse<ProrationCalculation>>(
      `${BILLING_BASE}/subscription/proration-preview/`,
      data
    )
    return response.data.data
  },

  /**
   * Update subscription auto-renewal setting
   */
  async updateAutoRenewal(autoRenew: boolean): Promise<Subscription> {
    const response = await apiClient.patch<ApiResponse<Subscription>>(
      `${BILLING_BASE}/subscription/`,
      { autoRenew }
    )
    return response.data.data
  },

  /**
   * Get trial status
   */
  async getTrialStatus(): Promise<TrialStatus> {
    const response = await apiClient.get<ApiResponse<TrialStatus>>(
      `${BILLING_BASE}/subscription/trial-status/`
    )
    return response.data.data
  },

  /**
   * Convert trial to paid subscription
   */
  async convertTrial(data: {
    planId: string
    billingCycle: string
    paymentMethodId: string
  }): Promise<Subscription> {
    const response = await apiClient.post<ApiResponse<Subscription>>(
      `${BILLING_BASE}/subscription/convert-trial/`,
      data
    )
    return response.data.data
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
    const response = await apiClient.get<ApiResponse<PaymentMethod[]>>(
      `${BILLING_BASE}/payment-methods/`
    )
    return response.data.data
  },

  /**
   * Add a new payment method
   */
  async addPaymentMethod(data: PaymentFormData): Promise<PaymentMethod> {
    const response = await apiClient.post<ApiResponse<PaymentMethod>>(
      `${BILLING_BASE}/payment-methods/`,
      data
    )
    return response.data.data
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
    const response = await apiClient.post<ApiResponse<PaymentMethod>>(
      `${BILLING_BASE}/payment-methods/${paymentMethodId}/set-default/`
    )
    return response.data.data
  },

  /**
   * Update payment method
   */
  async updatePaymentMethod(
    paymentMethodId: string,
    data: Partial<PaymentFormData>
  ): Promise<PaymentMethod> {
    const response = await apiClient.patch<ApiResponse<PaymentMethod>>(
      `${BILLING_BASE}/payment-methods/${paymentMethodId}/`,
      data
    )
    return response.data.data
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
    const response = await apiClient.get<PaginatedResponse<Invoice>>(`${BILLING_BASE}/invoices/`, {
      params: {
        page,
        page_size: pageSize,
        ...filters,
      },
    })
    return response.data
  },

  /**
   * Get a specific invoice
   */
  async getInvoiceById(invoiceId: string): Promise<Invoice> {
    const response = await apiClient.get<ApiResponse<Invoice>>(
      `${BILLING_BASE}/invoices/${invoiceId}/`
    )
    return response.data.data
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
    const response = await apiClient.post<ApiResponse<Invoice>>(
      `${BILLING_BASE}/invoices/${invoiceId}/retry-payment/`
    )
    return response.data.data
  },
}

/**
 * Usage API
 */
export const usageApi = {
  /**
   * Get current usage metrics
   */
  async getUsageMetrics(): Promise<UsageMetrics> {
    const response = await apiClient.get<ApiResponse<UsageMetrics>>(`${BILLING_BASE}/usage/`)
    return response.data.data
  },

  /**
   * Get usage alerts
   */
  async getUsageAlerts(): Promise<UsageAlert[]> {
    const response = await apiClient.get<ApiResponse<UsageAlert[]>>(`${BILLING_BASE}/usage/alerts/`)
    return response.data.data
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
    const response = await apiClient.post<ApiResponse<Coupon>>(
      `${BILLING_BASE}/coupons/validate/`,
      { code, planId }
    )
    return response.data.data
  },

  /**
   * Apply coupon to subscription
   */
  async applyCoupon(code: string): Promise<Subscription> {
    const response = await apiClient.post<ApiResponse<Subscription>>(
      `${BILLING_BASE}/coupons/apply/`,
      { code }
    )
    return response.data.data
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
    const response = await apiClient.get<ApiResponse<BillingSettings>>(`${BILLING_BASE}/settings/`)
    return response.data.data
  },

  /**
   * Update billing settings
   */
  async updateSettings(settings: Partial<BillingSettings>): Promise<BillingSettings> {
    const response = await apiClient.patch<ApiResponse<BillingSettings>>(
      `${BILLING_BASE}/settings/`,
      settings
    )
    return response.data.data
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
