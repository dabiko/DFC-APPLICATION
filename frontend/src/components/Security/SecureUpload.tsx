/**
 * SecureUpload Component
 * Secure file upload with encryption options and security configuration
 */

import { FC, useState, useCallback } from 'react'
import {
  CloudArrowUpIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'
import type {
  SecureUploadConfig,
  EncryptionAlgorithm,
  SecurityLevel,
} from '@/types/encryption'
import {
  SECURITY_LEVEL_LABELS,
  getDefaultSecureUploadConfig,
} from '@/types/encryption'

export interface SecureUploadProps {
  /** Upload configuration */
  config?: SecureUploadConfig
  /** On configuration change */
  onConfigChange?: (config: SecureUploadConfig) => void
  /** On file upload */
  onUpload?: (files: File[], config: SecureUploadConfig) => void
  /** Upload in progress */
  uploading?: boolean
  /** Upload progress (0-100) */
  progress?: number
  /** Show advanced settings */
  showAdvancedSettings?: boolean
  /** Allowed file types */
  allowedFileTypes?: string[]
  /** Maximum file size (bytes) */
  maxFileSize?: number
  className?: string
}

export const SecureUpload: FC<SecureUploadProps> = ({
  config = getDefaultSecureUploadConfig(),
  onConfigChange,
  onUpload,
  uploading = false,
  progress = 0,
  showAdvancedSettings = false,
  allowedFileTypes,
  maxFileSize,
  className,
}) => {
  const [localConfig, setLocalConfig] = useState<SecureUploadConfig>(config)
  const [dragActive, setDragActive] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [showSettings, setShowSettings] = useState(showAdvancedSettings)

  const updateConfig = (updates: Partial<SecureUploadConfig>) => {
    const newConfig = { ...localConfig, ...updates }
    setLocalConfig(newConfig)
    onConfigChange?.(newConfig)
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files)
      setSelectedFiles(files)
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const files = Array.from(e.target.files)
      setSelectedFiles(files)
    }
  }, [])

  const handleUpload = () => {
    if (selectedFiles.length > 0 && onUpload) {
      onUpload(selectedFiles, localConfig)
    }
  }

  const algorithmOptions: EncryptionAlgorithm[] = [
    'AES-256-GCM',
    'AES-256-CBC',
    'ChaCha20-Poly1305',
    'RSA-4096',
  ]

  const securityLevels: SecurityLevel[] = [
    'top-secret',
    'secret',
    'confidential',
    'internal',
    'public',
  ]

  return (
    <div className={cn('bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <CloudArrowUpIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Secure File Upload
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Upload files with encryption and security options
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Upload Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
            dragActive
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-300 dark:border-gray-600',
            uploading && 'opacity-50 pointer-events-none'
          )}
        >
          {uploading ? (
            <div className="space-y-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Uploading and encrypting...
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {progress}% complete
                </p>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 max-w-xs mx-auto">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          ) : selectedFiles.length > 0 ? (
            <div className="space-y-3">
              <CheckCircleIcon className="w-12 h-12 mx-auto text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                </p>
                <ul className="mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  {selectedFiles.map((file, index) => (
                    <li key={index}>{file.name}</li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center justify-center gap-2">
                <label className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium cursor-pointer">
                  Choose Different Files
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    accept={allowedFileTypes?.join(',')}
                  />
                </label>
                <button
                  onClick={handleUpload}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                >
                  Upload Securely
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <CloudArrowUpIcon className="w-12 h-12 mx-auto text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Drag and drop files here
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  or click to browse
                </p>
              </div>
              <label className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium cursor-pointer">
                Choose Files
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept={allowedFileTypes?.join(',')}
                />
              </label>
              {allowedFileTypes && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Allowed: {allowedFileTypes.join(', ')}
                </p>
              )}
              {maxFileSize && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Max size: {(maxFileSize / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
            </div>
          )}
        </div>

        {/* Security Settings */}
        <div className="space-y-3">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center justify-between w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Security Settings
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {showSettings ? 'Hide' : 'Show'}
            </span>
          </button>

          {showSettings && (
            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              {/* Encryption Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LockClosedIcon className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Encrypt on Upload
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Files will be encrypted before upload
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localConfig.encryptOnUpload}
                    onChange={(e) => updateConfig({ encryptOnUpload: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </label>
              </div>

              {localConfig.encryptOnUpload && (
                <>
                  {/* Algorithm Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Encryption Algorithm
                    </label>
                    <select
                      value={localConfig.algorithm}
                      onChange={(e) => updateConfig({ algorithm: e.target.value as EncryptionAlgorithm })}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      {algorithmOptions.map((algo) => (
                        <option key={algo} value={algo}>
                          {algo}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Client-Side Encryption */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Client-Side Encryption
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Encrypt files in your browser before upload
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localConfig.clientSideEncryption}
                        onChange={(e) => updateConfig({ clientSideEncryption: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                </>
              )}

              {/* Security Level */}
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Security Classification
                </label>
                <select
                  value={localConfig.defaultSecurityLevel}
                  onChange={(e) => updateConfig({ defaultSecurityLevel: e.target.value as SecurityLevel })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {securityLevels.map((level) => (
                    <option key={level} value={level}>
                      {SECURITY_LEVEL_LABELS[level]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Virus Scan */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheckIcon className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Virus Scan
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Scan files for malware before encryption
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localConfig.virusScan}
                    onChange={(e) => updateConfig({ virusScan: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </label>
              </div>

              {/* Verify Integrity */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Verify File Integrity
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Generate and verify checksums
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localConfig.verifyIntegrity}
                    onChange={(e) => updateConfig({ verifyIntegrity: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Security Info */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-start gap-2">
            <ShieldCheckIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-800 dark:text-blue-300">
              <p className="font-medium mb-1">Your files are secure</p>
              <ul className="space-y-0.5 list-disc list-inside">
                {localConfig.encryptOnUpload && <li>Files encrypted with {localConfig.algorithm}</li>}
                {localConfig.clientSideEncryption && <li>Client-side encryption enabled</li>}
                {localConfig.secureTransfer && <li>Secure transfer (TLS {localConfig.minTlsVersion})</li>}
                {localConfig.virusScan && <li>Automatic virus scanning</li>}
                {localConfig.verifyIntegrity && <li>File integrity verification</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
