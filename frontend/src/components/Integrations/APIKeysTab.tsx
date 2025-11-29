/**
 * APIKeysTab Component
 *
 * Manages API keys for programmatic access to the DFC API.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Key,
  Plus,
  Copy,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Check,
  X,
  AlertTriangle,
  Clock,
  Activity,
  Loader2,
} from 'lucide-react'
import {
  getAPIKeys,
  createAPIKey,
  deleteAPIKey,
  regenerateAPIKey,
  type APIKey,
  type APIKeyCreate,
} from '@/services/integrationsService'
import { cn } from '@/utils/cn'

interface APIKeysTabProps {
  onRefresh: () => void
}

export function APIKeysTab({ onRefresh }: APIKeysTabProps) {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newKeyData, setNewKeyData] = useState<{ key: APIKey; rawKey: string } | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const loadApiKeys = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getAPIKeys()
      setApiKeys(data)
    } catch (error) {
      console.error('Error loading API keys:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadApiKeys()
  }, [loadApiKeys])

  const handleCreate = async (data: APIKeyCreate) => {
    setIsCreating(true)
    try {
      const newKey = await createAPIKey(data)
      setNewKeyData({ key: newKey, rawKey: newKey.raw_key || '' })
      setShowCreateModal(false)
      loadApiKeys()
      onRefresh()
    } catch (error) {
      console.error('Error creating API key:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return
    }

    try {
      await deleteAPIKey(id)
      loadApiKeys()
      onRefresh()
    } catch (error) {
      console.error('Error deleting API key:', error)
    }
  }

  const handleRegenerate = async (id: string) => {
    if (
      !confirm(
        'Are you sure you want to regenerate this API key? The old key will stop working immediately.'
      )
    ) {
      return
    }

    try {
      const result = await regenerateAPIKey(id)
      const key = apiKeys.find((k) => k.id === id)
      if (key) {
        setNewKeyData({ key: { ...key, key_prefix: result.key_prefix }, rawKey: result.raw_key })
      }
      loadApiKeys()
    } catch (error) {
      console.error('Error regenerating API key:', error)
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">API Keys</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage API keys for programmatic access to the DFC API
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create API Key
        </button>
      </div>

      {/* New Key Display */}
      {newKeyData && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-green-800 dark:text-green-200">
                API Key Created Successfully
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                Copy and save this key now. It will not be shown again.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 bg-green-100 dark:bg-green-900/40 px-3 py-2 rounded font-mono text-sm break-all">
                  {newKeyData.rawKey}
                </code>
                <button
                  onClick={() => copyToClipboard(newKeyData.rawKey, 'new')}
                  className="p-2 hover:bg-green-200 dark:hover:bg-green-800 rounded"
                >
                  {copiedId === 'new' ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-green-600" />
                  )}
                </button>
              </div>
              <button
                onClick={() => setNewKeyData(null)}
                className="mt-3 text-sm text-green-700 dark:text-green-300 hover:underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Keys List */}
      {apiKeys.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No API Keys</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Create your first API key to start using the DFC API
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Create API Key
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((key) => (
            <div
              key={key.id}
              className={cn(
                'bg-white dark:bg-gray-800 rounded-xl border p-4',
                key.is_valid
                  ? 'border-gray-200 dark:border-gray-700'
                  : 'border-red-200 dark:border-red-800'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'p-2 rounded-lg',
                      key.is_valid
                        ? 'bg-purple-100 dark:bg-purple-900/30'
                        : 'bg-red-100 dark:bg-red-900/30'
                    )}
                  >
                    <Key
                      className={cn(
                        'w-5 h-5',
                        key.is_valid
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-red-600 dark:text-red-400'
                      )}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">{key.name}</h3>
                      <span
                        className={cn(
                          'px-2 py-0.5 text-xs font-medium rounded-full',
                          key.scope === 'admin'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : key.scope === 'write'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        )}
                      >
                        {key.scope}
                      </span>
                      {!key.is_active && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full">
                          Inactive
                        </span>
                      )}
                      {key.is_expired && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                          Expired
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-mono">{key.key_prefix}...</span>
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {key.total_requests.toLocaleString()} requests
                      </span>
                      {key.last_used_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last used {new Date(key.last_used_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRegenerate(key.id)}
                    className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                    title="Regenerate key"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(key.id)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete key"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Additional details */}
              {(key.allowed_ips.length > 0 || key.expires_at) && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                  {key.allowed_ips.length > 0 && (
                    <span>Allowed IPs: {key.allowed_ips.join(', ')}</span>
                  )}
                  {key.expires_at && (
                    <span>Expires: {new Date(key.expires_at).toLocaleDateString()}</span>
                  )}
                  <span>Rate limit: {key.rate_limit}/hour</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateAPIKeyModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
          isCreating={isCreating}
        />
      )}
    </div>
  )
}

// Create API Key Modal
interface CreateAPIKeyModalProps {
  onClose: () => void
  onCreate: (data: APIKeyCreate) => Promise<void>
  isCreating: boolean
}

function CreateAPIKeyModal({ onClose, onCreate, isCreating }: CreateAPIKeyModalProps) {
  const [name, setName] = useState('')
  const [scope, setScope] = useState<'read' | 'write' | 'admin'>('read')
  const [rateLimit, setRateLimit] = useState(1000)
  const [expiresAt, setExpiresAt] = useState('')
  const [allowedIps, setAllowedIps] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onCreate({
      name,
      scope,
      rate_limit: rateLimit,
      expires_at: expiresAt || null,
      allowed_ips: allowedIps ? allowedIps.split(',').map((ip) => ip.trim()) : [],
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create API Key</h2>
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
              placeholder="e.g., Production API Key"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Scope
            </label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as 'read' | 'write' | 'admin')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-900 dark:text-white"
            >
              <option value="read">Read Only</option>
              <option value="write">Read & Write</option>
              <option value="admin">Full Admin Access</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Rate Limit (requests/hour)
            </label>
            <input
              type="number"
              value={rateLimit}
              onChange={(e) => setRateLimit(parseInt(e.target.value))}
              min={100}
              max={10000}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Expires At (optional)
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Allowed IPs (comma-separated, optional)
            </label>
            <input
              type="text"
              value={allowedIps}
              onChange={(e) => setAllowedIps(e.target.value)}
              placeholder="e.g., 192.168.1.1, 10.0.0.0/8"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-900 dark:text-white"
            />
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
              disabled={!name || isCreating}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Key
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default APIKeysTab
