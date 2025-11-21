/**
 * BillingHistory Component
 * Displays invoice history with download and filtering capabilities
 */

import React, { useState } from 'react'
import { Button } from '../Button/Button'
import { Badge } from '../Badge/Badge'
import { Input } from '../Input/Input'
import { Select } from '../Select/Select'
import { Pagination } from '../Navigation/Pagination'
import { formatPrice } from '../../config/subscriptionPlans'
import type { Invoice, InvoiceStatus, BillingHistoryFilters } from '../../types/billing'
import { cn } from '../../utils/cn'

export interface BillingHistoryProps {
  invoices: Invoice[]
  totalCount?: number
  currentPage?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onDownload?: (invoiceId: string) => Promise<void>
  onRetryPayment?: (invoiceId: string) => Promise<void>
  onFilterChange?: (filters: BillingHistoryFilters) => void
  loading?: boolean
  className?: string
}

export const BillingHistory: React.FC<BillingHistoryProps> = ({
  invoices,
  totalCount = 0,
  currentPage = 1,
  pageSize = 10,
  onPageChange,
  onDownload,
  onRetryPayment,
  onFilterChange,
  loading = false,
  className,
}) => {
  const [filters, setFilters] = useState<BillingHistoryFilters>({})
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [retryingId, setRetryingId] = useState<string | null>(null)

  const totalPages = Math.ceil(totalCount / pageSize)

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success">Paid</Badge>
      case 'pending':
        return <Badge variant="warning">Pending</Badge>
      case 'failed':
        return <Badge variant="error">Failed</Badge>
      case 'refunded':
        return <Badge variant="default">Refunded</Badge>
      case 'draft':
        return <Badge variant="default">Draft</Badge>
      default:
        return <Badge variant="default">{status}</Badge>
    }
  }

  const handleDownload = async (invoiceId: string) => {
    if (!onDownload) return

    setDownloadingId(invoiceId)
    try {
      await onDownload(invoiceId)
    } finally {
      setDownloadingId(null)
    }
  }

  const handleRetryPayment = async (invoiceId: string) => {
    if (!onRetryPayment) return

    setRetryingId(invoiceId)
    try {
      await onRetryPayment(invoiceId)
    } finally {
      setRetryingId(null)
    }
  }

  const handleFilterChange = (field: keyof BillingHistoryFilters, value: any) => {
    const newFilters = { ...filters, [field]: value }
    setFilters(newFilters)

    if (onFilterChange) {
      onFilterChange(newFilters)
    }
  }

  const clearFilters = () => {
    setFilters({})
    if (onFilterChange) {
      onFilterChange({})
    }
  }

  const hasActiveFilters = Object.keys(filters).some(
    (key) => filters[key as keyof BillingHistoryFilters] !== undefined
  )

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Billing History</h3>
          <p className="mt-1 text-sm text-gray-600">View and download your past invoices</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Select
            label="Status"
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'paid', label: 'Paid' },
              { value: 'pending', label: 'Pending' },
              { value: 'failed', label: 'Failed' },
              { value: 'refunded', label: 'Refunded' },
            ]}
          />

          <Input
            label="From Date"
            type="date"
            value={filters.dateFrom || ''}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value || undefined)}
          />

          <Input
            label="To Date"
            type="date"
            value={filters.dateTo || ''}
            onChange={(e) => handleFilterChange('dateTo', e.target.value || undefined)}
          />
        </div>

        {hasActiveFilters && (
          <div className="mt-4">
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Invoice Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {loading && invoices.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
            <p className="mt-4 text-sm text-gray-600">Loading invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center">
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-4 text-sm font-medium text-gray-900">No invoices</h3>
            <p className="mt-2 text-sm text-gray-600">
              {hasActiveFilters
                ? 'No invoices match your filters.'
                : "You don't have any invoices yet."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Invoice
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {invoice.invoiceNumber}
                        </div>
                        {invoice.items.length > 0 && (
                          <div className="text-sm text-gray-500">
                            {invoice.items[0].description}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                        {new Date(invoice.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {formatPrice(invoice.amount, invoice.currency)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {getStatusBadge(invoice.status)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                        <div className="flex items-center justify-end space-x-2">
                          {invoice.status === 'failed' && onRetryPayment && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRetryPayment(invoice.id)}
                              loading={retryingId === invoice.id}
                              disabled={retryingId === invoice.id}
                            >
                              Retry
                            </Button>
                          )}
                          {onDownload && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(invoice.id)}
                              loading={downloadingId === invoice.id}
                              disabled={downloadingId === invoice.id}
                            >
                              Download
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="divide-y divide-gray-200 md:hidden">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.invoiceNumber}
                      </div>
                      <div className="mt-1 text-sm text-gray-600">
                        {new Date(invoice.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="mt-2 text-lg font-bold text-gray-900">
                        {formatPrice(invoice.amount, invoice.currency)}
                      </div>
                    </div>
                    <div>{getStatusBadge(invoice.status)}</div>
                  </div>
                  <div className="mt-4 flex space-x-2">
                    {invoice.status === 'failed' && onRetryPayment && (
                      <Button
                        variant="outline"
                        size="sm"
                        fullWidth
                        onClick={() => handleRetryPayment(invoice.id)}
                        loading={retryingId === invoice.id}
                        disabled={retryingId === invoice.id}
                      >
                        Retry Payment
                      </Button>
                    )}
                    {onDownload && (
                      <Button
                        variant="ghost"
                        size="sm"
                        fullWidth
                        onClick={() => handleDownload(invoice.id)}
                        loading={downloadingId === invoice.id}
                        disabled={downloadingId === invoice.id}
                      >
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  )
}

export default BillingHistory
