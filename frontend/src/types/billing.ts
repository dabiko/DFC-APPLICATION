/**
 * TypeScript type definitions for Billing & Subscription System
 * Digital Filing Cabinet (DFC) Application
 */

/**
 * Billing cycle options
 */
export enum BillingCycle {
  MONTHLY = 'monthly',
  ANNUAL = 'annual',
}

/**
 * Subscription status
 */
export enum SubscriptionStatus {
  ACTIVE = 'active',
  TRIAL = 'trial',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  PAST_DUE = 'past_due',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

/**
 * Invoice status
 */
export enum InvoiceStatus {
  PAID = 'paid',
  PENDING = 'pending',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  DRAFT = 'draft',
}

/**
 * Payment method type
 */
export enum PaymentMethodType {
  CARD = 'card',
  BANK_ACCOUNT = 'bank_account',
  PAYPAL = 'paypal',
}

/**
 * Card brand
 */
export enum CardBrand {
  VISA = 'visa',
  MASTERCARD = 'mastercard',
  AMEX = 'amex',
  DISCOVER = 'discover',
  DINERS = 'diners',
  JCB = 'jcb',
  UNKNOWN = 'unknown',
}

/**
 * Subscription plan tier
 */
export type PlanTier = 'basic' | 'professional' | 'enterprise' | 'trial'

/**
 * Price information
 */
export interface Price {
  monthly: number
  annual: number
  currency: string
  custom?: boolean
}

/**
 * Plan limits and quotas
 */
export interface PlanLimits {
  users: number // -1 for unlimited
  storageGB: number
  documents: number
  folders: number
  apiCallsPerMonth: number
  retentionPolicyDays: number
  auditLogDays: number
  versioningPerDocument: number
  trialDays?: number
}

/**
 * Subscription plan
 */
export interface Plan {
  id: string
  name: string
  description: string
  price: Price
  features: string[]
  limits: PlanLimits
  highlighted: boolean
  trial?: boolean
  popular?: boolean
}

/**
 * Usage metrics
 */
export interface UsageMetrics {
  users: {
    current: number
    limit: number
  }
  storage: {
    currentGB: number
    limitGB: number
    percentage: number
  }
  documents: {
    current: number
    limit: number
    percentage: number
  }
  folders: {
    current: number
    limit: number
  }
  apiCalls: {
    currentMonth: number
    limit: number
    percentage: number
  }
}

/**
 * User subscription
 */
export interface Subscription {
  id: string
  userId: string
  planId: string
  plan: Plan
  status: SubscriptionStatus
  billingCycle: BillingCycle
  currentPeriodStart: string // ISO date
  currentPeriodEnd: string // ISO date
  cancelAtPeriodEnd: boolean
  cancelledAt?: string // ISO date
  trialStart?: string // ISO date
  trialEnd?: string // ISO date
  createdAt: string // ISO date
  updatedAt: string // ISO date
  autoRenew: boolean
  usage: UsageMetrics
}

/**
 * Payment method
 */
export interface PaymentMethod {
  id: string
  type: PaymentMethodType
  isDefault: boolean
  card?: {
    brand: CardBrand
    last4: string
    expiryMonth: number
    expiryYear: number
    holderName: string
  }
  bankAccount?: {
    bankName: string
    accountType: string
    last4: string
    holderName: string
  }
  paypal?: {
    email: string
  }
  createdAt: string // ISO date
}

/**
 * Invoice line item
 */
export interface InvoiceLineItem {
  id: string
  description: string
  amount: number
  quantity: number
  total: number
  period?: {
    start: string // ISO date
    end: string // ISO date
  }
}

/**
 * Invoice
 */
export interface Invoice {
  id: string
  invoiceNumber: string
  subscriptionId: string
  userId: string
  status: InvoiceStatus
  amount: number
  subtotal: number
  tax: number
  discount?: number
  currency: string
  items: InvoiceLineItem[]
  dueDate: string // ISO date
  paidAt?: string // ISO date
  createdAt: string // ISO date
  pdfUrl?: string
  paymentMethodId?: string
}

/**
 * Proration calculation
 */
export interface ProrationCalculation {
  unusedAmount: number // Credit from current plan
  newPlanAmount: number // Charge for new plan
  prorationAmount: number // Net amount (can be positive or negative)
  effectiveDate: string // ISO date
  nextBillingDate: string // ISO date
  description: string
}

/**
 * Coupon/Discount code
 */
export interface Coupon {
  id: string
  code: string
  name: string
  description?: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  currency?: string
  maxRedemptions?: number
  redemptionsCount: number
  validFrom: string // ISO date
  validTo?: string // ISO date
  applicablePlans?: string[]
  active: boolean
}

/**
 * Plan change request
 */
export interface PlanChangeRequest {
  currentPlanId: string
  newPlanId: string
  billingCycle: BillingCycle
  effectiveDate?: string // ISO date - defaults to immediate
  prorationPreview?: ProrationCalculation
}

/**
 * Subscription cancellation request
 */
export interface CancellationRequest {
  subscriptionId: string
  reason?: string
  feedback?: string
  cancelAtPeriodEnd: boolean // true = cancel at end of billing period, false = immediate
  effectiveDate?: string // ISO date
}

/**
 * Payment form data
 */
export interface PaymentFormData {
  cardNumber: string
  cardholderName: string
  expiryMonth: string
  expiryYear: string
  cvv: string
  billingAddress: {
    line1: string
    line2?: string
    city: string
    state: string
    postalCode: string
    country: string
  }
}

/**
 * Subscription creation request
 */
export interface SubscriptionCreateRequest {
  planId: string
  billingCycle: BillingCycle
  paymentMethodId: string
  couponCode?: string
  trialDays?: number
}

/**
 * Payment intent (for Stripe-like flow)
 */
export interface PaymentIntent {
  id: string
  clientSecret: string
  amount: number
  currency: string
  status:
    | 'requires_payment_method'
    | 'requires_confirmation'
    | 'requires_action'
    | 'processing'
    | 'succeeded'
    | 'canceled'
  subscriptionId?: string
}

/**
 * Billing history filters
 */
export interface BillingHistoryFilters {
  status?: InvoiceStatus
  dateFrom?: string // ISO date
  dateTo?: string // ISO date
  minAmount?: number
  maxAmount?: number
}

/**
 * Trial status
 */
export interface TrialStatus {
  isActive: boolean
  daysRemaining: number
  endDate: string // ISO date
  planId: string
  canExtend: boolean
}

/**
 * Billing notification preferences
 */
export interface BillingNotificationPreferences {
  paymentSuccess: boolean
  paymentFailed: boolean
  subscriptionUpgraded: boolean
  subscriptionDowngraded: boolean
  subscriptionCancelled: boolean
  invoiceAvailable: boolean
  trialExpiring: boolean
  renewalReminder: boolean
  usageLimit80Percent: boolean
  usageLimit95Percent: boolean
}

/**
 * Usage alert
 */
export interface UsageAlert {
  id: string
  type: 'storage' | 'documents' | 'users' | 'api_calls'
  severity: 'info' | 'warning' | 'critical'
  message: string
  currentValue: number
  limitValue: number
  percentage: number
  createdAt: string // ISO date
  dismissed: boolean
}

/**
 * Billing settings
 */
export interface BillingSettings {
  autoRenew: boolean
  notifications: BillingNotificationPreferences
  defaultPaymentMethodId?: string
  billingEmail?: string
  taxId?: string
  company?: {
    name: string
    address: {
      line1: string
      line2?: string
      city: string
      state: string
      postalCode: string
      country: string
    }
  }
}

/**
 * API response wrappers
 */
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  errors?: Record<string, string[]>
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

// Explicit re-exports to ensure proper module resolution
export type {
  TrialStatus,
  Plan,
  Subscription,
  PaymentMethod,
  Invoice,
  InvoiceLineItem,
  ProrationCalculation,
  UsageMetrics,
  UsageAlert,
  Coupon,
}
