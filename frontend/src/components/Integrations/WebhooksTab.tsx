/**
 * WebhooksTab Component
 *
 * Manages webhooks for event-driven integrations.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Webhook,
  Plus,
  Copy,
  Trash2,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  Play,
  Activity,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import {
  getWebhooks,
  createWebhook,
  deleteWebhook,
  testWebhook,
  rotateWebhookSecret,
  reactivateWebhook,
  type Webhook as WebhookType,
  type WebhookCreate,
} from '@/services/integrationsService'
import { cn } from '@/utils/cn'

interface WebhooksTabProps {
  onRefresh: () => void
}

// All available webhook events
const WEBHOOK_EVENTS = [
  { value: 'document.created', label: 'Document Created', category: 'Documents' },
  { value: 'document.updated', label: 'Document Updated', category: 'Documents' },
  { value: 'document.deleted', label: 'Document Deleted', category: 'Documents' },
  { value: 'document.shared', label: 'Document Shared', category: 'Documents' },
  { value: 'document.downloaded', label: 'Document Downloaded', category: 'Documents' },
  { value: 'folder.created', label: 'Folder Created', category: 'Folders' },
  { value: 'folder.updated', label: 'Folder Updated', category: 'Folders' },
  { value: 'folder.deleted', label: 'Folder Deleted', category: 'Folders' },
  { value: 'user.created', label: 'User Created', category: 'Users' },
  { value: 'user.updated', label: 'User Updated', category: 'Users' },
  { value: 'user.deleted', label: 'User Deleted', category: 'Users' },
  { value: 'user.login', label: 'User Login', category: 'Users' },
  { value: 'workflow.started', label: 'Workflow Started', category: 'Workflows' },
  { value: 'workflow.completed', label: 'Workflow Completed', category: 'Workflows' },
  { value: 'workflow.failed', label: 'Workflow Failed', category: 'Workflows' },
  { value: 'retention.applied', label: 'Retention Applied', category: 'Retention' },
  { value: 'legal_hold.placed', label: 'Legal Hold Placed', category: 'Legal' },
  { value: 'legal_hold.released', label: 'Legal Hold Released', category: 'Legal' },
]

export function WebhooksTab({ onRefresh }: WebhooksTabProps) {
  const [webhooks, setWebhooks] = useState<WebhookType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [newSecret, setNewSecret] = useState<{ id: string; secret: string } | null>(null)

  const loadWebhooks = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getWebhooks()
      setWebhooks(data)
    } catch (error) {
      console.error('Error loading webhooks:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadWebhooks()
  }, [loadWebhooks])

  const handleCreate = async (data: WebhookCreate) => {
    setIsCreating(true)
    try {
      const newWebhook = await createWebhook(data)
      if (newWebhook.secret) {
        setNewSecret({ id: newWebhook.id, secret: newWebhook.secret })
      }
      setShowCreateModal(false)
      loadWebhooks()
      onRefresh()
    } catch (error) {
      console.error('Error creating webhook:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) {
      return
    }

    try {
      await deleteWebhook(id)
      loadWebhooks()
      onRefresh()
    } catch (error) {
      console.error('Error deleting webhook:', error)
    }
  }

  const handleTest = async (id: string, eventType: string) => {
    setTestingId(id)
    try {
      const result = await testWebhook(id, eventType)
      alert(result.message)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      alert(err.response?.data?.message || 'Test failed')
    } finally {
      setTestingId(null)
    }
  }

  const handleRotateSecret = async (id: string) => {
    if (
      !confirm(
        'Are you sure you want to rotate this webhook secret? You will need to update your endpoint.'
      )
    ) {
      return
    }

    try {
      const result = await rotateWebhookSecret(id)
      setNewSecret({ id, secret: result.secret })
    } catch (error) {
      console.error('Error rotating secret:', error)
    }
  }

  const handleReactivate = async (id: string) => {
    try {
      await reactivateWebhook(id)
      loadWebhooks()
      onRefresh()
    } catch (error) {
      console.error('Error reactivating webhook:', error)
    }
  }

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Webhooks</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Receive real-time notifications when events occur in DFC
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Webhook
        </button>
      </div>

      {/* New Secret Display */}
      {newSecret && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-yellow-800 dark:text-yellow-200">Webhook Secret</h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Copy and save this secret. It will not be shown again.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 bg-yellow-100 dark:bg-yellow-900/40 px-3 py-2 rounded font-mono text-sm break-all">
                  {newSecret.secret}
                </code>
                <button
                  onClick={() => copyToClipboard(newSecret.secret, 'secret')}
                  className="p-2 hover:bg-yellow-200 dark:hover:bg-yellow-800 rounded"
                >
                  {copiedId === 'secret' ? (
                    <Check className="w-4 h-4 text-yellow-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-yellow-600" />
                  )}
                </button>
              </div>
              <button
                onClick={() => setNewSecret(null)}
                className="mt-3 text-sm text-yellow-700 dark:text-yellow-300 hover:underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Webhooks List */}
      {webhooks.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Webhook className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Webhooks</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Create your first webhook to receive event notifications
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Create Webhook
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className={cn(
                'bg-white dark:bg-gray-800 rounded-xl border p-4',
                webhook.auto_disabled
                  ? 'border-red-200 dark:border-red-800'
                  : webhook.is_active
                    ? 'border-gray-200 dark:border-gray-700'
                    : 'border-gray-300 dark:border-gray-600'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'p-2 rounded-lg',
                      webhook.auto_disabled
                        ? 'bg-red-100 dark:bg-red-900/30'
                        : webhook.is_active
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : 'bg-gray-100 dark:bg-gray-700'
                    )}
                  >
                    <Webhook
                      className={cn(
                        'w-5 h-5',
                        webhook.auto_disabled
                          ? 'text-red-600 dark:text-red-400'
                          : webhook.is_active
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-500'
                      )}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">{webhook.name}</h3>
                      {webhook.auto_disabled && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                          Auto-disabled
                        </span>
                      )}
                      {!webhook.is_active && !webhook.auto_disabled && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                    <a
                      href={webhook.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-1"
                    >
                      {webhook.url.length > 50 ? `${webhook.url.slice(0, 50)}...` : webhook.url}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {webhook.total_deliveries.toLocaleString()} deliveries
                      </span>
                      <span
                        className={cn(
                          webhook.success_rate >= 95
                            ? 'text-green-600 dark:text-green-400'
                            : webhook.success_rate >= 80
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-red-600 dark:text-red-400'
                        )}
                      >
                        {webhook.success_rate}% success rate
                      </span>
                      {webhook.consecutive_failures > 0 && (
                        <span className="text-red-600 dark:text-red-400">
                          {webhook.consecutive_failures} consecutive failures
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {webhook.auto_disabled ? (
                    <button
                      onClick={() => handleReactivate(webhook.id)}
                      className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Reactivate
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        handleTest(webhook.id, webhook.subscribed_events[0] || 'document.created')
                      }
                      disabled={testingId === webhook.id}
                      className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                      title="Test webhook"
                    >
                      {testingId === webhook.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => handleRotateSecret(webhook.id)}
                    className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                    title="Rotate secret"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(webhook.id)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete webhook"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Subscribed Events */}
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Subscribed events:
                </div>
                <div className="flex flex-wrap gap-1">
                  {webhook.subscribed_events.map((event) => (
                    <span
                      key={event}
                      className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                    >
                      {event}
                    </span>
                  ))}
                </div>
              </div>

              {/* Last failure reason */}
              {webhook.last_failure_reason && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="text-xs text-red-600 dark:text-red-400">
                    Last failure: {webhook.last_failure_reason}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateWebhookModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
          isCreating={isCreating}
          events={WEBHOOK_EVENTS}
        />
      )}
    </div>
  )
}

// Create Webhook Modal
interface CreateWebhookModalProps {
  onClose: () => void
  onCreate: (data: WebhookCreate) => Promise<void>
  isCreating: boolean
  events: typeof WEBHOOK_EVENTS
}

function CreateWebhookModal({ onClose, onCreate, isCreating, events }: CreateWebhookModalProps) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [maxRetries, setMaxRetries] = useState(3)
  const [timeout, setTimeout] = useState(30)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onCreate({
      name,
      url,
      subscribed_events: selectedEvents,
      max_retries: maxRetries,
      timeout_seconds: timeout,
    })
  }

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    )
  }

  const toggleCategory = (category: string) => {
    const categoryEvents = events.filter((e) => e.category === category).map((e) => e.value)
    const allSelected = categoryEvents.every((e) => selectedEvents.includes(e))

    if (allSelected) {
      setSelectedEvents((prev) => prev.filter((e) => !categoryEvents.includes(e)))
    } else {
      setSelectedEvents((prev) => [...new Set([...prev, ...categoryEvents])])
    }
  }

  // Group events by category
  const eventsByCategory = events.reduce(
    (acc, event) => {
      if (!acc[event.category]) {
        acc[event.category] = []
      }
      acc[event.category].push(event)
      return acc
    },
    {} as Record<string, typeof events>
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Webhook</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Slack Notifications"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Endpoint URL (HTTPS only)
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-server.com/webhook"
              pattern="https://.*"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Events ({selectedEvents.length} selected)
            </label>
            <div className="space-y-3 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              {Object.entries(eventsByCategory).map(([category, categoryEvents]) => (
                <div key={category}>
                  <button
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-purple-600 mb-1"
                  >
                    {category}
                  </button>
                  <div className="flex flex-wrap gap-1 ml-2">
                    {categoryEvents.map((event) => (
                      <button
                        key={event.value}
                        type="button"
                        onClick={() => toggleEvent(event.value)}
                        className={cn(
                          'px-2 py-0.5 text-xs rounded transition-colors',
                          selectedEvents.includes(event.value)
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        )}
                      >
                        {event.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Retries
              </label>
              <input
                type="number"
                value={maxRetries}
                onChange={(e) => setMaxRetries(parseInt(e.target.value))}
                min={0}
                max={10}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Timeout (seconds)
              </label>
              <input
                type="number"
                value={timeout}
                onChange={(e) => setTimeout(parseInt(e.target.value))}
                min={5}
                max={60}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name || !url || selectedEvents.length === 0 || isCreating}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Webhook
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default WebhooksTab
