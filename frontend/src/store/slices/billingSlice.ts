/**
 * Billing Slice - Redux Toolkit state management for billing & subscriptions
 */

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import billingService from '../../services/billingService'
import type {
  Subscription,
  Plan,
  PaymentMethod,
  Invoice,
  UsageMetrics,
  UsageAlert,
  PlanChangeRequest,
  CancellationRequest,
  PaymentFormData,
  BillingHistoryFilters,
  ProrationCalculation,
} from '../../types/billing'

export interface BillingState {
  // Subscription
  subscription: Subscription | null
  subscriptionLoading: boolean
  subscriptionError: string | null

  // Plans
  plans: Plan[]
  plansLoading: boolean
  plansError: string | null

  // Payment Methods
  paymentMethods: PaymentMethod[]
  paymentMethodsLoading: boolean
  paymentMethodsError: string | null

  // Invoices
  invoices: Invoice[]
  invoicesTotal: number
  invoicesPage: number
  invoicesPageSize: number
  invoicesLoading: boolean
  invoicesError: string | null
  invoicesFilters: BillingHistoryFilters

  // Usage
  usage: UsageMetrics | null
  usageAlerts: UsageAlert[]
  usageLoading: boolean
  usageError: string | null

  // Proration
  proration: ProrationCalculation | null
  prorationLoading: boolean
  prorationError: string | null

  // UI State
  activeModal: 'upgrade' | 'cancel' | 'payment' | null
}

const initialState: BillingState = {
  subscription: null,
  subscriptionLoading: false,
  subscriptionError: null,

  plans: [],
  plansLoading: false,
  plansError: null,

  paymentMethods: [],
  paymentMethodsLoading: false,
  paymentMethodsError: null,

  invoices: [],
  invoicesTotal: 0,
  invoicesPage: 1,
  invoicesPageSize: 10,
  invoicesLoading: false,
  invoicesError: null,
  invoicesFilters: {},

  usage: null,
  usageAlerts: [],
  usageLoading: false,
  usageError: null,

  proration: null,
  prorationLoading: false,
  prorationError: null,

  activeModal: null,
}

/**
 * Async Thunks
 */

// Fetch subscription
export const fetchSubscription = createAsyncThunk<
  Subscription | null,
  void,
  { rejectValue: string }
>('billing/fetchSubscription', async (_, { rejectWithValue }) => {
  try {
    return await billingService.subscription.getSubscription()
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch subscription')
  }
})

// Fetch plans
export const fetchPlans = createAsyncThunk<Plan[], void, { rejectValue: string }>(
  'billing/fetchPlans',
  async (_, { rejectWithValue }) => {
    try {
      return await billingService.plans.getPlans()
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch plans')
    }
  }
)

// Upgrade subscription
export const upgradeSubscription = createAsyncThunk<
  Subscription,
  PlanChangeRequest,
  { rejectValue: string }
>('billing/upgradeSubscription', async (request, { rejectWithValue }) => {
  try {
    return await billingService.subscription.upgradeSubscription(request)
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to upgrade subscription')
  }
})

// Downgrade subscription
export const downgradeSubscription = createAsyncThunk<
  Subscription,
  PlanChangeRequest,
  { rejectValue: string }
>('billing/downgradeSubscription', async (request, { rejectWithValue }) => {
  try {
    return await billingService.subscription.downgradeSubscription(request)
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to downgrade subscription')
  }
})

// Cancel subscription
export const cancelSubscription = createAsyncThunk<
  Subscription,
  CancellationRequest,
  { rejectValue: string }
>('billing/cancelSubscription', async (request, { rejectWithValue }) => {
  try {
    return await billingService.subscription.cancelSubscription(request)
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to cancel subscription')
  }
})

// Reactivate subscription
export const reactivateSubscription = createAsyncThunk<Subscription, void, { rejectValue: string }>(
  'billing/reactivateSubscription',
  async (_, { rejectWithValue }) => {
    try {
      return await billingService.subscription.reactivateSubscription()
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reactivate subscription')
    }
  }
)

// Fetch proration preview
export const fetchProration = createAsyncThunk<
  ProrationCalculation,
  PlanChangeRequest,
  { rejectValue: string }
>('billing/fetchProration', async (request, { rejectWithValue }) => {
  try {
    return await billingService.subscription.getProrationPreview(request)
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to calculate proration')
  }
})

// Fetch payment methods
export const fetchPaymentMethods = createAsyncThunk<PaymentMethod[], void, { rejectValue: string }>(
  'billing/fetchPaymentMethods',
  async (_, { rejectWithValue }) => {
    try {
      return await billingService.paymentMethods.getPaymentMethods()
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch payment methods')
    }
  }
)

// Add payment method
export const addPaymentMethod = createAsyncThunk<
  PaymentMethod,
  PaymentFormData,
  { rejectValue: string }
>('billing/addPaymentMethod', async (data, { rejectWithValue }) => {
  try {
    return await billingService.paymentMethods.addPaymentMethod(data)
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to add payment method')
  }
})

// Delete payment method
export const deletePaymentMethod = createAsyncThunk<string, string, { rejectValue: string }>(
  'billing/deletePaymentMethod',
  async (paymentMethodId, { rejectWithValue }) => {
    try {
      await billingService.paymentMethods.deletePaymentMethod(paymentMethodId)
      return paymentMethodId
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete payment method')
    }
  }
)

// Set default payment method
export const setDefaultPaymentMethod = createAsyncThunk<
  PaymentMethod,
  string,
  { rejectValue: string }
>('billing/setDefaultPaymentMethod', async (paymentMethodId, { rejectWithValue }) => {
  try {
    return await billingService.paymentMethods.setDefaultPaymentMethod(paymentMethodId)
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to set default payment method')
  }
})

// Fetch invoices
export const fetchInvoices = createAsyncThunk<
  { invoices: Invoice[]; total: number },
  { page?: number; pageSize?: number; filters?: BillingHistoryFilters },
  { rejectValue: string }
>(
  'billing/fetchInvoices',
  async ({ page = 1, pageSize = 10, filters = {} }, { rejectWithValue }) => {
    try {
      const response = await billingService.invoices.getInvoices(page, pageSize, filters)
      return {
        invoices: response.data,
        total: response.pagination.total,
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch invoices')
    }
  }
)

// Download invoice
export const downloadInvoice = createAsyncThunk<void, string, { rejectValue: string }>(
  'billing/downloadInvoice',
  async (invoiceId, { rejectWithValue }) => {
    try {
      const blob = await billingService.invoices.downloadInvoice(invoiceId)
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-${invoiceId}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to download invoice')
    }
  }
)

// Retry failed payment
export const retryPayment = createAsyncThunk<Invoice, string, { rejectValue: string }>(
  'billing/retryPayment',
  async (invoiceId, { rejectWithValue }) => {
    try {
      return await billingService.invoices.retryPayment(invoiceId)
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Payment retry failed')
    }
  }
)

// Fetch usage metrics
export const fetchUsageMetrics = createAsyncThunk<
  UsageMetrics | null,
  void,
  { rejectValue: string }
>('billing/fetchUsageMetrics', async (_, { rejectWithValue }) => {
  try {
    return await billingService.usage.getUsageMetrics()
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch usage metrics')
  }
})

// Fetch usage alerts
export const fetchUsageAlerts = createAsyncThunk<UsageAlert[], void, { rejectValue: string }>(
  'billing/fetchUsageAlerts',
  async (_, { rejectWithValue }) => {
    try {
      return await billingService.usage.getUsageAlerts()
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch usage alerts')
    }
  }
)

// Dismiss usage alert
export const dismissAlert = createAsyncThunk<string, string, { rejectValue: string }>(
  'billing/dismissAlert',
  async (alertId, { rejectWithValue }) => {
    try {
      await billingService.usage.dismissAlert(alertId)
      return alertId
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to dismiss alert')
    }
  }
)

/**
 * Slice
 */
const billingSlice = createSlice({
  name: 'billing',
  initialState,
  reducers: {
    // Clear errors
    clearSubscriptionError: (state) => {
      state.subscriptionError = null
    },
    clearPlansError: (state) => {
      state.plansError = null
    },
    clearPaymentMethodsError: (state) => {
      state.paymentMethodsError = null
    },
    clearInvoicesError: (state) => {
      state.invoicesError = null
    },
    clearUsageError: (state) => {
      state.usageError = null
    },
    clearProrationError: (state) => {
      state.prorationError = null
    },

    // Update invoice filters
    setInvoicesFilters: (state, action: PayloadAction<BillingHistoryFilters>) => {
      state.invoicesFilters = action.payload
      state.invoicesPage = 1 // Reset to first page when filters change
    },

    // Update invoice page
    setInvoicesPage: (state, action: PayloadAction<number>) => {
      state.invoicesPage = action.payload
    },

    // Modal management
    openModal: (state, action: PayloadAction<'upgrade' | 'cancel' | 'payment'>) => {
      state.activeModal = action.payload
    },
    closeModal: (state) => {
      state.activeModal = null
    },

    // Clear proration
    clearProration: (state) => {
      state.proration = null
      state.prorationError = null
    },
  },
  extraReducers: (builder) => {
    // Fetch Subscription
    builder
      .addCase(fetchSubscription.pending, (state) => {
        state.subscriptionLoading = true
        state.subscriptionError = null
      })
      .addCase(fetchSubscription.fulfilled, (state, action) => {
        state.subscriptionLoading = false
        state.subscription = action.payload
        if (action.payload?.usage) {
          state.usage = action.payload.usage
        }
      })
      .addCase(fetchSubscription.rejected, (state, action) => {
        state.subscriptionLoading = false
        state.subscriptionError = action.payload || 'Failed to fetch subscription'
      })

    // Fetch Plans
    builder
      .addCase(fetchPlans.pending, (state) => {
        state.plansLoading = true
        state.plansError = null
      })
      .addCase(fetchPlans.fulfilled, (state, action) => {
        state.plansLoading = false
        state.plans = action.payload
      })
      .addCase(fetchPlans.rejected, (state, action) => {
        state.plansLoading = false
        state.plansError = action.payload || 'Failed to fetch plans'
      })

    // Upgrade Subscription
    builder
      .addCase(upgradeSubscription.pending, (state) => {
        state.subscriptionLoading = true
        state.subscriptionError = null
      })
      .addCase(upgradeSubscription.fulfilled, (state, action) => {
        state.subscriptionLoading = false
        state.subscription = action.payload
        if (action.payload?.usage) {
          state.usage = action.payload.usage
        }
        state.activeModal = null
      })
      .addCase(upgradeSubscription.rejected, (state, action) => {
        state.subscriptionLoading = false
        state.subscriptionError = action.payload || 'Failed to upgrade'
      })

    // Downgrade Subscription
    builder
      .addCase(downgradeSubscription.pending, (state) => {
        state.subscriptionLoading = true
        state.subscriptionError = null
      })
      .addCase(downgradeSubscription.fulfilled, (state, action) => {
        state.subscriptionLoading = false
        state.subscription = action.payload
        if (action.payload?.usage) {
          state.usage = action.payload.usage
        }
        state.activeModal = null
      })
      .addCase(downgradeSubscription.rejected, (state, action) => {
        state.subscriptionLoading = false
        state.subscriptionError = action.payload || 'Failed to downgrade'
      })

    // Cancel Subscription
    builder
      .addCase(cancelSubscription.pending, (state) => {
        state.subscriptionLoading = true
        state.subscriptionError = null
      })
      .addCase(cancelSubscription.fulfilled, (state, action) => {
        state.subscriptionLoading = false
        state.subscription = action.payload
        state.activeModal = null
      })
      .addCase(cancelSubscription.rejected, (state, action) => {
        state.subscriptionLoading = false
        state.subscriptionError = action.payload || 'Failed to cancel'
      })

    // Reactivate Subscription
    builder
      .addCase(reactivateSubscription.pending, (state) => {
        state.subscriptionLoading = true
        state.subscriptionError = null
      })
      .addCase(reactivateSubscription.fulfilled, (state, action) => {
        state.subscriptionLoading = false
        state.subscription = action.payload
      })
      .addCase(reactivateSubscription.rejected, (state, action) => {
        state.subscriptionLoading = false
        state.subscriptionError = action.payload || 'Failed to reactivate'
      })

    // Fetch Proration
    builder
      .addCase(fetchProration.pending, (state) => {
        state.prorationLoading = true
        state.prorationError = null
      })
      .addCase(fetchProration.fulfilled, (state, action) => {
        state.prorationLoading = false
        state.proration = action.payload
      })
      .addCase(fetchProration.rejected, (state, action) => {
        state.prorationLoading = false
        state.prorationError = action.payload || 'Failed to calculate proration'
      })

    // Fetch Payment Methods
    builder
      .addCase(fetchPaymentMethods.pending, (state) => {
        state.paymentMethodsLoading = true
        state.paymentMethodsError = null
      })
      .addCase(fetchPaymentMethods.fulfilled, (state, action) => {
        state.paymentMethodsLoading = false
        state.paymentMethods = action.payload
      })
      .addCase(fetchPaymentMethods.rejected, (state, action) => {
        state.paymentMethodsLoading = false
        state.paymentMethodsError = action.payload || 'Failed to fetch payment methods'
      })

    // Add Payment Method
    builder
      .addCase(addPaymentMethod.pending, (state) => {
        state.paymentMethodsLoading = true
        state.paymentMethodsError = null
      })
      .addCase(addPaymentMethod.fulfilled, (state, action) => {
        state.paymentMethodsLoading = false
        state.paymentMethods.push(action.payload)
        state.activeModal = null
      })
      .addCase(addPaymentMethod.rejected, (state, action) => {
        state.paymentMethodsLoading = false
        state.paymentMethodsError = action.payload || 'Failed to add payment method'
      })

    // Delete Payment Method
    builder
      .addCase(deletePaymentMethod.pending, (state) => {
        state.paymentMethodsLoading = true
        state.paymentMethodsError = null
      })
      .addCase(deletePaymentMethod.fulfilled, (state, action) => {
        state.paymentMethodsLoading = false
        state.paymentMethods = state.paymentMethods.filter((pm) => pm.id !== action.payload)
      })
      .addCase(deletePaymentMethod.rejected, (state, action) => {
        state.paymentMethodsLoading = false
        state.paymentMethodsError = action.payload || 'Failed to delete payment method'
      })

    // Set Default Payment Method
    builder
      .addCase(setDefaultPaymentMethod.pending, (state) => {
        state.paymentMethodsLoading = true
        state.paymentMethodsError = null
      })
      .addCase(setDefaultPaymentMethod.fulfilled, (state, action) => {
        state.paymentMethodsLoading = false
        state.paymentMethods = state.paymentMethods.map((pm) =>
          pm.id === action.payload.id ? { ...pm, isDefault: true } : { ...pm, isDefault: false }
        )
      })
      .addCase(setDefaultPaymentMethod.rejected, (state, action) => {
        state.paymentMethodsLoading = false
        state.paymentMethodsError = action.payload || 'Failed to set default payment method'
      })

    // Fetch Invoices
    builder
      .addCase(fetchInvoices.pending, (state) => {
        state.invoicesLoading = true
        state.invoicesError = null
      })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        state.invoicesLoading = false
        state.invoices = action.payload.invoices
        state.invoicesTotal = action.payload.total
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.invoicesLoading = false
        state.invoicesError = action.payload || 'Failed to fetch invoices'
      })

    // Retry Payment
    builder
      .addCase(retryPayment.pending, (state) => {
        state.invoicesLoading = true
        state.invoicesError = null
      })
      .addCase(retryPayment.fulfilled, (state, action) => {
        state.invoicesLoading = false
        // Update the invoice in the list
        state.invoices = state.invoices.map((inv) =>
          inv.id === action.payload.id ? action.payload : inv
        )
      })
      .addCase(retryPayment.rejected, (state, action) => {
        state.invoicesLoading = false
        state.invoicesError = action.payload || 'Payment retry failed'
      })

    // Fetch Usage Metrics
    builder
      .addCase(fetchUsageMetrics.pending, (state) => {
        state.usageLoading = true
        state.usageError = null
      })
      .addCase(fetchUsageMetrics.fulfilled, (state, action) => {
        state.usageLoading = false
        if (action.payload) {
          state.usage = action.payload
        }
      })
      .addCase(fetchUsageMetrics.rejected, (state, action) => {
        state.usageLoading = false
        state.usageError = action.payload || 'Failed to fetch usage'
      })

    // Fetch Usage Alerts
    builder
      .addCase(fetchUsageAlerts.pending, (state) => {
        state.usageLoading = true
        state.usageError = null
      })
      .addCase(fetchUsageAlerts.fulfilled, (state, action) => {
        state.usageLoading = false
        state.usageAlerts = action.payload
      })
      .addCase(fetchUsageAlerts.rejected, (state, action) => {
        state.usageLoading = false
        state.usageError = action.payload || 'Failed to fetch alerts'
      })

    // Dismiss Alert
    builder.addCase(dismissAlert.fulfilled, (state, action) => {
      state.usageAlerts = state.usageAlerts.filter((alert) => alert.id !== action.payload)
    })
  },
})

export const {
  clearSubscriptionError,
  clearPlansError,
  clearPaymentMethodsError,
  clearInvoicesError,
  clearUsageError,
  clearProrationError,
  setInvoicesFilters,
  setInvoicesPage,
  openModal,
  closeModal,
  clearProration,
} = billingSlice.actions

export default billingSlice.reducer
