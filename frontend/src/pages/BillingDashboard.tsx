/**
 * Billing Dashboard Page
 * Integrates all billing components into a comprehensive billing management interface
 */

import React, { useState } from 'react'
import {
  CurrentSubscription,
  SubscriptionPlans,
  BillingHistory,
  UsageMetrics,
  UpgradeDowngradeModal,
  CancellationModal,
  PaymentMethodForm,
} from '../components/Billing'
import {
  useSubscription,
  usePlans,
  useProration,
  usePaymentMethods,
  useBillingHistory,
  useUsageMetrics,
  useBillingModals,
} from '../hooks/useBilling'
import { toast, getBillingErrorMessage, billingSuccessMessages } from '../utils/toast'
import type { PlanChangeRequest, CancellationRequest, PaymentFormData } from '../types/billing'

type TabId = 'overview' | 'plans' | 'payment' | 'history'

interface Tab {
  id: TabId
  label: string
  icon: React.ReactNode
}

const tabs: Tab[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
  {
    id: 'plans',
    label: 'Plans & Pricing',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
        />
      </svg>
    ),
  },
  {
    id: 'payment',
    label: 'Payment Methods',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
      </svg>
    ),
  },
  {
    id: 'history',
    label: 'Billing History',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
]

export function BillingDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  // Custom hooks
  const subscription = useSubscription()
  const plans = usePlans()
  const proration = useProration()
  const paymentMethods = usePaymentMethods()
  const billingHistory = useBillingHistory()
  const usage = useUsageMetrics()
  const modals = useBillingModals()

  // Handlers
  const handlePlanSelect = async (planId: string, billingCycle: 'monthly' | 'annual') => {
    if (!subscription.subscription) return

    const isUpgrade =
      plans.plans.findIndex((p) => p.id === planId) >
      plans.plans.findIndex((p) => p.id === subscription.subscription!.planId)

    const request: PlanChangeRequest = {
      currentPlanId: subscription.subscription.planId,
      newPlanId: planId,
      billingCycle,
    }

    try {
      if (isUpgrade) {
        await subscription.upgrade(request)
        toast.success(billingSuccessMessages.subscriptionUpgraded)
      } else {
        await subscription.downgrade(request)
        toast.success(billingSuccessMessages.subscriptionDowngraded)
      }
      subscription.refresh()
      modals.close()
    } catch (error) {
      toast.error(getBillingErrorMessage(error))
    }
  }

  const handleCancelSubscription = async (request: CancellationRequest) => {
    try {
      await subscription.cancel(request)
      toast.success(billingSuccessMessages.subscriptionCancelled)
      subscription.refresh()
      modals.close()
    } catch (error) {
      toast.error(getBillingErrorMessage(error))
    }
  }

  const handleReactivateSubscription = async () => {
    try {
      await subscription.reactivate()
      toast.success(billingSuccessMessages.subscriptionReactivated)
      subscription.refresh()
    } catch (error) {
      toast.error(getBillingErrorMessage(error))
    }
  }

  const handleAddPaymentMethod = async (data: PaymentFormData) => {
    try {
      await paymentMethods.add(data)
      toast.success(billingSuccessMessages.paymentMethodAdded)
      paymentMethods.refresh()
      setShowPaymentForm(false)
    } catch (error) {
      toast.error(getBillingErrorMessage(error))
      throw error // Re-throw to keep form in error state
    }
  }

  const handleDeletePaymentMethod = async (paymentMethodId: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) return

    try {
      await paymentMethods.remove(paymentMethodId)
      toast.success(billingSuccessMessages.paymentMethodDeleted)
      paymentMethods.refresh()
    } catch (error) {
      toast.error(getBillingErrorMessage(error))
    }
  }

  const handleSetDefaultPaymentMethod = async (paymentMethodId: string) => {
    try {
      await paymentMethods.setDefault(paymentMethodId)
      toast.success(billingSuccessMessages.paymentMethodUpdated)
      paymentMethods.refresh()
    } catch (error) {
      toast.error(getBillingErrorMessage(error))
    }
  }

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      await billingHistory.download(invoiceId)
      toast.success(billingSuccessMessages.invoiceDownloaded)
    } catch (error) {
      toast.error(getBillingErrorMessage(error))
    }
  }

  const handleRetryPayment = async (invoiceId: string) => {
    try {
      await billingHistory.retry(invoiceId)
      toast.success(billingSuccessMessages.paymentRetrySuccess)
      billingHistory.refresh()
    } catch (error) {
      toast.error(getBillingErrorMessage(error))
    }
  }

  const handleGetProration = async (planId: string, billingCycle: 'monthly' | 'annual') => {
    if (!subscription.subscription) return

    try {
      await proration.calculate({
        currentPlanId: subscription.subscription.planId,
        newPlanId: planId,
        billingCycle,
      })
    } catch (error) {
      toast.error(getBillingErrorMessage(error))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage your subscription, payment methods, and billing history
            </p>
          </div>

          {/* Tabs */}
          <div className="flex space-x-8 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Current Subscription */}
            {subscription.subscription && (
              <CurrentSubscription
                subscription={subscription.subscription}
                onUpgrade={() => modals.open('upgrade')}
                onDowngrade={() => modals.open('upgrade')}
                onCancel={() => modals.open('cancel')}
                onReactivate={handleReactivateSubscription}
                onManagePayment={() => setActiveTab('payment')}
              />
            )}

            {/* Usage Metrics */}
            {usage.usage && (
              <UsageMetrics
                usage={usage.usage}
                alerts={usage.alerts}
                onUpgrade={() => {
                  modals.open('upgrade')
                  setActiveTab('plans')
                }}
                onDismissAlert={usage.dismiss}
              />
            )}
          </div>
        )}

        {activeTab === 'plans' && (
          <div>
            <SubscriptionPlans
              currentPlanId={subscription.subscription?.planId}
              recommendedPlanId="professional"
              onSelectPlan={(planId, cycle) => {
                modals.open('upgrade')
              }}
            />
          </div>
        )}

        {activeTab === 'payment' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Payment Methods</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Manage your credit cards and payment options
                </p>
              </div>
              {!showPaymentForm && (
                <button
                  onClick={() => setShowPaymentForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Payment Method
                </button>
              )}
            </div>

            {showPaymentForm && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <PaymentMethodForm
                  onSubmit={handleAddPaymentMethod}
                  onCancel={() => setShowPaymentForm(false)}
                  loading={paymentMethods.loading}
                />
              </div>
            )}

            {!showPaymentForm && (
              <div className="space-y-4">
                {paymentMethods.paymentMethods.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      />
                    </svg>
                    <p className="mt-4 text-sm text-gray-600">No payment methods added yet</p>
                  </div>
                ) : (
                  paymentMethods.paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className="bg-white rounded-lg shadow-sm p-6 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-8 bg-gray-100 rounded flex items-center justify-center">
                          <span className="text-xs font-semibold text-gray-600">
                            {method.cardBrand.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">•••• •••• •••• {method.last4}</p>
                          <p className="text-sm text-gray-600">
                            Expires {method.expiryMonth}/{method.expiryYear}
                          </p>
                        </div>
                        {method.isDefault && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {!method.isDefault && (
                          <button
                            onClick={() => handleSetDefaultPaymentMethod(method.id)}
                            className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            Set as Default
                          </button>
                        )}
                        <button
                          onClick={() => handleDeletePaymentMethod(method.id)}
                          className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Billing History</h2>
            <BillingHistory
              invoices={billingHistory.invoices}
              totalCount={billingHistory.total}
              currentPage={billingHistory.page}
              pageSize={billingHistory.pageSize}
              loading={billingHistory.loading}
              onPageChange={billingHistory.setPage}
              onFilterChange={billingHistory.setFilters}
              onDownload={handleDownloadInvoice}
              onRetryPayment={handleRetryPayment}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {modals.isUpgradeOpen && subscription.subscription && (
        <UpgradeDowngradeModal
          isOpen={modals.isUpgradeOpen}
          onClose={modals.close}
          currentPlan={subscription.subscription.plan}
          availablePlans={plans.plans}
          currentBillingCycle={subscription.subscription.billingCycle}
          onConfirm={handlePlanSelect}
          onGetProration={handleGetProration}
          proration={proration.proration}
          prorationLoading={proration.loading}
        />
      )}

      {modals.isCancelOpen && subscription.subscription && (
        <CancellationModal
          isOpen={modals.isCancelOpen}
          onClose={modals.close}
          subscriptionId={subscription.subscription.id}
          nextBillingDate={subscription.subscription.currentPeriodEnd}
          planName={subscription.subscription.plan.name}
          onConfirm={handleCancelSubscription}
        />
      )}
    </div>
  )
}
