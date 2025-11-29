/**
 * IntegrationsTab Component
 *
 * Manages third-party service integrations (SSO, cloud storage, etc.).
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Plug2,
  Plus,
  Trash2,
  RefreshCw,
  Check,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Settings,
  Play,
  Cloud,
  Lock,
  MessageSquare,
} from 'lucide-react'
import {
  getIntegrations,
  createIntegration,
  deleteIntegration,
  testIntegration,
  syncIntegration,
  type Integration,
  type IntegrationCreate,
} from '@/services/integrationsService'
import { cn } from '@/utils/cn'

interface IntegrationsTabProps {
  onRefresh: () => void
}

// Integration type categories
const INTEGRATION_CATEGORIES = {
  Authentication: [
    { value: 'sso_saml', label: 'SAML SSO', icon: Lock },
    { value: 'sso_oauth', label: 'OAuth 2.0 SSO', icon: Lock },
    { value: 'sso_oidc', label: 'OpenID Connect', icon: Lock },
    { value: 'ldap', label: 'LDAP/Active Directory', icon: Lock },
  ],
  'Cloud Storage': [
    { value: 'aws_s3', label: 'Amazon S3', icon: Cloud },
    { value: 'azure_blob', label: 'Azure Blob Storage', icon: Cloud },
    { value: 'google_cloud', label: 'Google Cloud Storage', icon: Cloud },
    { value: 'sharepoint', label: 'Microsoft SharePoint', icon: Cloud },
    { value: 'onedrive', label: 'Microsoft OneDrive', icon: Cloud },
    { value: 'dropbox', label: 'Dropbox Business', icon: Cloud },
    { value: 'box', label: 'Box', icon: Cloud },
  ],
  Communication: [
    { value: 'slack', label: 'Slack', icon: MessageSquare },
    { value: 'teams', label: 'Microsoft Teams', icon: MessageSquare },
    { value: 'email_smtp', label: 'Custom SMTP', icon: MessageSquare },
  ],
  Other: [{ value: 'custom', label: 'Custom Integration', icon: Settings }],
}

const getIntegrationIcon = (type: string) => {
  for (const category of Object.values(INTEGRATION_CATEGORIES)) {
    const found = category.find((i) => i.value === type)
    if (found) return found.icon
  }
  return Plug2
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    case 'testing':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    case 'pending':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    case 'error':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    case 'disabled':
      return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
  }
}

export function IntegrationsTab({ onRefresh }: IntegrationsTabProps) {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)

  const loadIntegrations = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getIntegrations()
      setIntegrations(data)
    } catch (error) {
      console.error('Error loading integrations:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadIntegrations()
  }, [loadIntegrations])

  const handleCreate = async (data: IntegrationCreate) => {
    setIsCreating(true)
    try {
      await createIntegration(data)
      setShowCreateModal(false)
      loadIntegrations()
      onRefresh()
    } catch (error) {
      console.error('Error creating integration:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this integration?')) {
      return
    }

    try {
      await deleteIntegration(id)
      loadIntegrations()
      onRefresh()
    } catch (error) {
      console.error('Error deleting integration:', error)
    }
  }

  const handleTest = async (id: string) => {
    setTestingId(id)
    try {
      const result = await testIntegration(id)
      alert(result.message)
      loadIntegrations()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      alert(err.response?.data?.message || 'Connection test failed')
    } finally {
      setTestingId(null)
    }
  }

  const handleSync = async (id: string) => {
    setSyncingId(id)
    try {
      await syncIntegration(id)
      loadIntegrations()
    } catch (error) {
      console.error('Error syncing integration:', error)
    } finally {
      setSyncingId(null)
    }
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Third-party Integrations
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Connect DFC with external services and platforms
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Integration
        </button>
      </div>

      {/* Integrations List */}
      {integrations.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Plug2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Integrations
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Connect DFC with your favorite services
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Add Integration
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map((integration) => {
            const Icon = getIntegrationIcon(integration.integration_type)
            return (
              <div
                key={integration.id}
                className={cn(
                  'bg-white dark:bg-gray-800 rounded-xl border p-4',
                  integration.status === 'error'
                    ? 'border-red-200 dark:border-red-800'
                    : 'border-gray-200 dark:border-gray-700'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        'p-2 rounded-lg',
                        integration.status === 'active'
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : integration.status === 'error'
                            ? 'bg-red-100 dark:bg-red-900/30'
                            : 'bg-gray-100 dark:bg-gray-700'
                      )}
                    >
                      <Icon
                        className={cn(
                          'w-5 h-5',
                          integration.status === 'active'
                            ? 'text-green-600 dark:text-green-400'
                            : integration.status === 'error'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-gray-500'
                        )}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {integration.name}
                        </h3>
                        <span
                          className={cn(
                            'px-2 py-0.5 text-xs font-medium rounded-full',
                            getStatusColor(integration.status)
                          )}
                        >
                          {integration.status_display}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {integration.integration_type_display}
                      </p>
                      {integration.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {integration.description}
                        </p>
                      )}
                      {integration.last_sync_at && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Last sync: {new Date(integration.last_sync_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleTest(integration.id)}
                      disabled={testingId === integration.id}
                      className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                      title="Test connection"
                    >
                      {testingId === integration.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleSync(integration.id)}
                      disabled={syncingId === integration.id}
                      className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                      title="Sync now"
                    >
                      {syncingId === integration.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(integration.id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete integration"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Error message */}
                {integration.status === 'error' && integration.status_message && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{integration.status_message}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Available Integrations */}
      <div className="mt-8">
        <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
          Available Integrations
        </h3>
        <div className="space-y-6">
          {Object.entries(INTEGRATION_CATEGORIES).map(([category, types]) => (
            <div key={category}>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {category}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {types.map((type) => {
                  const Icon = type.icon
                  const isConfigured = integrations.some((i) => i.integration_type === type.value)
                  return (
                    <button
                      key={type.value}
                      onClick={() => {
                        if (!isConfigured) {
                          setShowCreateModal(true)
                        }
                      }}
                      disabled={isConfigured}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                        isConfigured
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 cursor-default'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/10'
                      )}
                    >
                      <Icon
                        className={cn('w-5 h-5', isConfigured ? 'text-green-600' : 'text-gray-400')}
                      />
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {type.label}
                        </div>
                      </div>
                      {isConfigured && <Check className="w-4 h-4 text-green-600" />}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateIntegrationModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
          isCreating={isCreating}
          categories={INTEGRATION_CATEGORIES}
        />
      )}
    </div>
  )
}

// Create Integration Modal
interface CreateIntegrationModalProps {
  onClose: () => void
  onCreate: (data: IntegrationCreate) => Promise<void>
  isCreating: boolean
  categories: typeof INTEGRATION_CATEGORIES
}

function CreateIntegrationModal({
  onClose,
  onCreate,
  isCreating,
  categories,
}: CreateIntegrationModalProps) {
  const [name, setName] = useState('')
  const [integrationType, setIntegrationType] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onCreate({
      name,
      integration_type: integrationType,
      description,
      config: {},
      credentials: {},
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Integration</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Integration Type
            </label>
            <select
              value={integrationType}
              onChange={(e) => setIntegrationType(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-900 dark:text-white"
            >
              <option value="">Select integration type...</option>
              {Object.entries(categories).map(([category, types]) => (
                <optgroup key={category} label={category}>
                  {types.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Production SSO"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this integration"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-900 dark:text-white resize-none"
            />
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <div className="flex items-start gap-2 text-sm text-yellow-700 dark:text-yellow-300">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                After creating, you'll need to configure the integration credentials and settings.
              </span>
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
              disabled={!name || !integrationType || isCreating}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
              Add Integration
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default IntegrationsTab
