/**
 * Billing Dashboard Page
 * Integrates all billing components into a comprehensive billing management interface
 */

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, LayoutDashboard, Tag, FileText, RefreshCw } from 'lucide-react'
import { ThreePanelLayout } from '@/components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
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
import { authService } from '@/services/auth.service'
import { cn } from '@/utils/cn'

type TabId = 'overview' | 'plans' | 'payment' | 'history'

interface Tab {
  id: TabId
  label: string
  icon: React.FC<{ className?: string }>
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'plans', label: 'Plans & Pricing', icon: Tag },
  { id: 'payment', label: 'Payment Methods', icon: CreditCard },
  { id: 'history', label: 'Billing History', icon: FileText },
]

export function BillingDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Custom hooks
  const subscription = useSubscription()
  const plans = usePlans()
  const proration = useProration()
  const paymentMethods = usePaymentMethods()
  const billingHistory = useBillingHistory()
  const usage = useUsageMetrics()
  const modals = useBillingModals()

  // Get user data from auth service for header
  const userData = authService.getUser()
  const user = {
    firstName: userData?.first_name || 'User',
    lastName: userData?.last_name || '',
    email: userData?.email || '',
    is_staff: userData?.is_staff || false,
    is_superuser: userData?.is_superuser || false,
  }

  const notifications: Array<{
    id: string
    title: string
    message: string
    time: string
    read: boolean
  }> = []

  const handleLogout = async () => {
    try {
      const refreshToken = authService.getRefreshToken()
      if (refreshToken) {
        await authService.logout(refreshToken)
      }
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      authService.clearTokens()
      navigate('/login')
    }
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    Promise.all([
      subscription.refresh(),
      paymentMethods.refresh(),
      billingHistory.refresh(),
      usage.refresh(),
    ]).finally(() => setIsRefreshing(false))
  }

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

  // Content renderer
  const renderContent = () => (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CreditCard className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Billing & Subscription
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage your subscription, payment methods, and billing history
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6">
        <nav className="flex gap-1 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'text-green-600 dark:text-green-400 border-green-600 dark:border-green-400'
                  : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Loading State */}
            {subscription.loading && (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 dark:border-gray-700 border-t-green-600" />
              </div>
            )}

            {/* No Subscription - Empty State */}
            {!subscription.loading && !subscription.subscription && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
                <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                  <CreditCard className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No Active Subscription
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                  You don't have an active subscription yet. Choose a plan to get started with all
                  the features.
                </p>
                <button
                  onClick={() => setActiveTab('plans')}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  View Plans
                </button>
              </div>
            )}

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
              onSelectPlan={(_planId, _cycle) => {
                modals.open('upgrade')
              }}
            />
          </div>
        )}

        {activeTab === 'payment' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Payment Methods
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Manage your credit cards and payment options
                </p>
              </div>
              {!showPaymentForm && (
                <button
                  onClick={() => setShowPaymentForm(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Add Payment Method
                </button>
              )}
            </div>

            {showPaymentForm && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
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
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
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
                    <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                      No payment methods added yet
                    </p>
                  </div>
                ) : (
                  paymentMethods.paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-8 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                            {method.type === 'card' && method.card?.brand
                              ? method.card.brand.toUpperCase()
                              : method.type === 'bank_account'
                                ? 'BANK'
                                : method.type === 'paypal'
                                  ? 'PAYPAL'
                                  : method.type.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {method.type === 'card' && method.card
                              ? `•••• •••• •••• ${method.card.last4}`
                              : method.type === 'bank_account' && method.bankAccount
                                ? `•••• ${method.bankAccount.last4}`
                                : method.type === 'paypal' && method.paypal
                                  ? method.paypal.email
                                  : 'Payment Method'}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {method.type === 'card' && method.card
                              ? `Expires ${method.card.expiryMonth}/${method.card.expiryYear}`
                              : method.type === 'bank_account' && method.bankAccount
                                ? `${method.bankAccount.bankName} - ${method.bankAccount.accountType}`
                                : method.type === 'paypal'
                                  ? 'PayPal Account'
                                  : ''}
                          </p>
                        </div>
                        {method.isDefault && (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs font-medium rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {!method.isDefault && (
                          <button
                            onClick={() => handleSetDefaultPaymentMethod(method.id)}
                            className="px-3 py-1 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
                          >
                            Set as Default
                          </button>
                        )}
                        <button
                          onClick={() => handleDeletePaymentMethod(method.id)}
                          className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Billing History
            </h2>
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

  return (
    <ThreePanelLayout
      header={<DashboardHeader user={user} notifications={notifications} onLogout={handleLogout} />}
      leftPanel={<DashboardSidebar />}
      leftPanelWidth="auto"
      collapsibleLeft={false}
      centerPanel={renderContent()}
    />
  )
}
