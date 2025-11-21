/**
 * Custom Hooks for Billing & Subscription Management
 * Provides easy access to billing state and actions
 */

import { useEffect, useCallback } from 'react'
import { useAppDispatch, useAppSelector, type RootState } from '../store'
import {
  fetchSubscription,
  fetchPlans,
  upgradeSubscription,
  downgradeSubscription,
  cancelSubscription,
  reactivateSubscription,
  fetchProration,
  fetchPaymentMethods,
  addPaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  fetchInvoices,
  downloadInvoice,
  retryPayment,
  fetchUsageMetrics,
  fetchUsageAlerts,
  dismissAlert,
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
} from '../store/slices/billingSlice'
import type {
  PlanChangeRequest,
  CancellationRequest,
  PaymentFormData,
  BillingHistoryFilters,
} from '../types/billing'

/**
 * Hook for subscription management
 */
export function useSubscription() {
  const dispatch = useAppDispatch()

  const {
    subscription,
    subscriptionLoading: loading,
    subscriptionError: error,
  } = useAppSelector((state: RootState) => state.billing)

  // Fetch subscription on mount if not already loaded
  useEffect(() => {
    if (!subscription && !loading && !error) {
      dispatch(fetchSubscription())
    }
  }, [])

  const refresh = useCallback(() => {
    dispatch(fetchSubscription())
  }, [dispatch])

  const upgrade = useCallback(
    async (request: PlanChangeRequest) => {
      const result = await dispatch(upgradeSubscription(request))
      return result
    },
    [dispatch]
  )

  const downgrade = useCallback(
    async (request: PlanChangeRequest) => {
      const result = await dispatch(downgradeSubscription(request))
      return result
    },
    [dispatch]
  )

  const cancel = useCallback(
    async (request: CancellationRequest) => {
      const result = await dispatch(cancelSubscription(request))
      return result
    },
    [dispatch]
  )

  const reactivate = useCallback(async () => {
    const result = await dispatch(reactivateSubscription())
    return result
  }, [dispatch])

  const clearError = useCallback(() => {
    dispatch(clearSubscriptionError())
  }, [dispatch])

  return {
    subscription,
    loading,
    error,
    refresh,
    upgrade,
    downgrade,
    cancel,
    reactivate,
    clearError,
  }
}

/**
 * Hook for plans management
 */
export function usePlans() {
  const dispatch = useAppDispatch()

  const {
    plans,
    plansLoading: loading,
    plansError: error,
  } = useAppSelector((state: RootState) => state.billing)

  // Fetch plans on mount if not already loaded
  useEffect(() => {
    if (plans.length === 0 && !loading && !error) {
      dispatch(fetchPlans())
    }
  }, [])

  const refresh = useCallback(() => {
    dispatch(fetchPlans())
  }, [dispatch])

  const clearError = useCallback(() => {
    dispatch(clearPlansError())
  }, [dispatch])

  return {
    plans,
    loading,
    error,
    refresh,
    clearError,
  }
}

/**
 * Hook for proration calculations
 */
export function useProration() {
  const dispatch = useAppDispatch()

  const {
    proration,
    prorationLoading: loading,
    prorationError: error,
  } = useAppSelector((state: RootState) => state.billing)

  const calculate = useCallback(
    async (request: PlanChangeRequest) => {
      const result = await dispatch(fetchProration(request))
      return result
    },
    [dispatch]
  )

  const clear = useCallback(() => {
    dispatch(clearProration())
  }, [dispatch])

  const clearError = useCallback(() => {
    dispatch(clearProrationError())
  }, [dispatch])

  return {
    proration,
    loading,
    error,
    calculate,
    clear,
    clearError,
  }
}

/**
 * Hook for payment methods management
 */
export function usePaymentMethods() {
  const dispatch = useAppDispatch()

  const {
    paymentMethods,
    paymentMethodsLoading: loading,
    paymentMethodsError: error,
  } = useAppSelector((state: RootState) => state.billing)

  // Fetch payment methods on mount if not already loaded
  useEffect(() => {
    if (paymentMethods.length === 0 && !loading && !error) {
      dispatch(fetchPaymentMethods())
    }
  }, [])

  const refresh = useCallback(() => {
    dispatch(fetchPaymentMethods())
  }, [dispatch])

  const add = useCallback(
    async (data: PaymentFormData) => {
      const result = await dispatch(addPaymentMethod(data))
      return result
    },
    [dispatch]
  )

  const remove = useCallback(
    async (paymentMethodId: string) => {
      const result = await dispatch(deletePaymentMethod(paymentMethodId))
      return result
    },
    [dispatch]
  )

  const setDefault = useCallback(
    async (paymentMethodId: string) => {
      const result = await dispatch(setDefaultPaymentMethod(paymentMethodId))
      return result
    },
    [dispatch]
  )

  const clearError = useCallback(() => {
    dispatch(clearPaymentMethodsError())
  }, [dispatch])

  return {
    paymentMethods,
    loading,
    error,
    refresh,
    add,
    remove,
    setDefault,
    clearError,
  }
}

/**
 * Hook for billing history (invoices)
 */
export function useBillingHistory() {
  const dispatch = useAppDispatch()

  const {
    invoices,
    invoicesTotal: total,
    invoicesPage: page,
    invoicesPageSize: pageSize,
    invoicesFilters: filters,
    invoicesLoading: loading,
    invoicesError: error,
  } = useAppSelector((state: RootState) => state.billing)

  // Fetch invoices when page or filters change
  useEffect(() => {
    dispatch(fetchInvoices({ page, pageSize, filters }))
  }, [page, filters, dispatch])

  const refresh = useCallback(() => {
    dispatch(fetchInvoices({ page, pageSize, filters }))
  }, [dispatch, page, pageSize, filters])

  const setPage = useCallback(
    (newPage: number) => {
      dispatch(setInvoicesPage(newPage))
    },
    [dispatch]
  )

  const setFilters = useCallback(
    (newFilters: BillingHistoryFilters) => {
      dispatch(setInvoicesFilters(newFilters))
    },
    [dispatch]
  )

  const download = useCallback(
    async (invoiceId: string) => {
      const result = await dispatch(downloadInvoice(invoiceId))
      return result
    },
    [dispatch]
  )

  const retry = useCallback(
    async (invoiceId: string) => {
      const result = await dispatch(retryPayment(invoiceId))
      return result
    },
    [dispatch]
  )

  const clearError = useCallback(() => {
    dispatch(clearInvoicesError())
  }, [dispatch])

  return {
    invoices,
    total,
    page,
    pageSize,
    filters,
    loading,
    error,
    refresh,
    setPage,
    setFilters,
    download,
    retry,
    clearError,
  }
}

/**
 * Hook for usage metrics and alerts
 */
export function useUsageMetrics() {
  const dispatch = useAppDispatch()

  const {
    usage,
    usageAlerts: alerts,
    usageLoading: loading,
    usageError: error,
  } = useAppSelector((state: RootState) => state.billing)

  // Fetch usage metrics on mount
  useEffect(() => {
    if (!usage && !loading && !error) {
      dispatch(fetchUsageMetrics())
      dispatch(fetchUsageAlerts())
    }
  }, [])

  const refresh = useCallback(() => {
    dispatch(fetchUsageMetrics())
    dispatch(fetchUsageAlerts())
  }, [dispatch])

  const dismiss = useCallback(
    async (alertId: string) => {
      const result = await dispatch(dismissAlert(alertId))
      return result
    },
    [dispatch]
  )

  const clearError = useCallback(() => {
    dispatch(clearUsageError())
  }, [dispatch])

  return {
    usage,
    alerts,
    loading,
    error,
    refresh,
    dismiss,
    clearError,
  }
}

/**
 * Hook for modal management
 */
export function useBillingModals() {
  const dispatch = useAppDispatch()

  const { activeModal } = useAppSelector((state: RootState) => state.billing)

  const open = useCallback(
    (modal: 'upgrade' | 'cancel' | 'payment') => {
      dispatch(openModal(modal))
    },
    [dispatch]
  )

  const close = useCallback(() => {
    dispatch(closeModal())
  }, [dispatch])

  return {
    activeModal,
    isUpgradeOpen: activeModal === 'upgrade',
    isCancelOpen: activeModal === 'cancel',
    isPaymentOpen: activeModal === 'payment',
    open,
    close,
  }
}

/**
 * Convenience hook that provides all billing functionality
 */
export function useBillingComplete() {
  const subscription = useSubscription()
  const plans = usePlans()
  const proration = useProration()
  const paymentMethods = usePaymentMethods()
  const billingHistory = useBillingHistory()
  const usage = useUsageMetrics()
  const modals = useBillingModals()

  return {
    subscription,
    plans,
    proration,
    paymentMethods,
    billingHistory,
    usage,
    modals,
  }
}
