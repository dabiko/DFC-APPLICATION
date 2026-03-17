/**
 * GeneralSettingsTab Component
 *
 * Organization general settings including:
 * - Organization info (name, registration, tax ID)
 * - Branding (logo, colors)
 * - Contact information
 * - Document defaults
 */

import { useState, useRef } from 'react'
import {
  Building2,
  Upload,
  Trash2,
  Globe,
  Phone,
  Mail,
  MapPin,
  Save,
  Loader2,
  Image,
  Palette,
} from 'lucide-react'
import type { Organization, OrganizationSettings } from '@/services/organizationSettingsService'
import { ConfirmDialog } from '@/components/Modal/ConfirmDialog'
import { cn } from '@/utils/cn'

interface GeneralSettingsTabProps {
  organization: Organization
  settings: OrganizationSettings
  onUpdate: (
    data: Partial<Organization> & { settings?: Partial<OrganizationSettings> }
  ) => Promise<void>
  onUploadLogo: (file: File) => Promise<void>
  onDeleteLogo: () => Promise<void>
}

export function GeneralSettingsTab({
  organization,
  settings,
  onUpdate,
  onUploadLogo,
  onDeleteLogo,
}: GeneralSettingsTabProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const [isDeletingLogo, setIsDeletingLogo] = useState(false)
  const [showDeleteLogoConfirm, setShowDeleteLogoConfirm] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: organization.name,
    registration_number: organization.registration_number,
    tax_id: organization.tax_id,
    industry: organization.industry,
    country: organization.country,
    settings: {
      primary_color: settings.primary_color,
      secondary_color: settings.secondary_color,
      contact_email: settings.contact_email,
      contact_phone: settings.contact_phone,
      website: settings.website,
      address_line1: settings.address_line1,
      address_line2: settings.address_line2,
      city: settings.city,
      state: settings.state,
      postal_code: settings.postal_code,
      timezone: settings.timezone,
      language: settings.language,
      default_confidentiality: settings.default_confidentiality,
      require_classification: settings.require_classification,
      allow_external_sharing: settings.allow_external_sharing,
    },
  })

  const handleChange = (field: string, value: string | boolean, isSettings = false) => {
    if (isSettings) {
      setFormData((prev) => ({
        ...prev,
        settings: { ...prev.settings, [field]: value },
      }))
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }))
    }
    setHasChanges(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onUpdate(formData)
      setHasChanges(false)
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingLogo(true)
    try {
      await onUploadLogo(file)
    } catch (error) {
      console.error('Error uploading logo:', error)
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const handleDeleteLogo = async () => {
    setIsDeletingLogo(true)
    try {
      await onDeleteLogo()
    } catch (error) {
      console.error('Error deleting logo:', error)
    } finally {
      setIsDeletingLogo(false)
      setShowDeleteLogoConfirm(false)
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* Save Button - Sticky */}
        {hasChanges && (
          <div className="sticky top-0 z-10 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 flex items-center justify-between">
            <p className="text-sm text-indigo-700 dark:text-indigo-300">You have unsaved changes</p>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </div>
        )}

        {/* Organization Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Building2 className="w-5 h-5 text-gray-400" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Organization Information
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Basic information about your organization
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Organization Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Domain
              </label>
              <input
                type="text"
                value={organization.domain}
                disabled
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Registration Number
              </label>
              <input
                type="text"
                value={formData.registration_number}
                onChange={(e) => handleChange('registration_number', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tax ID
              </label>
              <input
                type="text"
                value={formData.tax_id}
                onChange={(e) => handleChange('tax_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Industry
              </label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => handleChange('industry', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Country
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => handleChange('country', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="w-5 h-5 text-gray-400" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Branding</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Customize your organization's appearance
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Organization Logo
              </label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-900">
                  {settings.logo_url ? (
                    <img
                      src={settings.logo_url}
                      alt="Organization logo"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Image className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingLogo}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                  >
                    {isUploadingLogo ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    Upload Logo
                  </button>
                  {settings.logo_url && (
                    <button
                      onClick={() => setShowDeleteLogoConfirm(true)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Recommended: 200x200px, max 2MB</p>
            </div>

            {/* Colors */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Primary Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.settings.primary_color}
                    onChange={(e) => handleChange('primary_color', e.target.value, true)}
                    className="w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.settings.primary_color}
                    onChange={(e) => handleChange('primary_color', e.target.value, true)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Secondary Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.settings.secondary_color}
                    onChange={(e) => handleChange('secondary_color', e.target.value, true)}
                    className="w-10 h-10 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.settings.secondary_color}
                    onChange={(e) => handleChange('secondary_color', e.target.value, true)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Mail className="w-5 h-5 text-gray-400" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Contact Information
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                How to reach your organization
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4" /> Contact Email
                </span>
              </label>
              <input
                type="email"
                value={formData.settings.contact_email}
                onChange={(e) => handleChange('contact_email', e.target.value, true)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4" /> Contact Phone
                </span>
              </label>
              <input
                type="tel"
                value={formData.settings.contact_phone}
                onChange={(e) => handleChange('contact_phone', e.target.value, true)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <span className="flex items-center gap-1">
                  <Globe className="w-4 h-4" /> Website
                </span>
              </label>
              <input
                type="url"
                value={formData.settings.website}
                onChange={(e) => handleChange('website', e.target.value, true)}
                placeholder="https://"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Address */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" /> Address
              </span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Address Line 1"
                value={formData.settings.address_line1}
                onChange={(e) => handleChange('address_line1', e.target.value, true)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
              />
              <input
                type="text"
                placeholder="Address Line 2"
                value={formData.settings.address_line2}
                onChange={(e) => handleChange('address_line2', e.target.value, true)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
              />
              <input
                type="text"
                placeholder="City"
                value={formData.settings.city}
                onChange={(e) => handleChange('city', e.target.value, true)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
              />
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="State"
                  value={formData.settings.state}
                  onChange={(e) => handleChange('state', e.target.value, true)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="Postal Code"
                  value={formData.settings.postal_code}
                  onChange={(e) => handleChange('postal_code', e.target.value, true)}
                  className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Document Defaults */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Building2 className="w-5 h-5 text-gray-400" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Document Defaults
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Default settings for new documents
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Default Confidentiality Level
              </label>
              <select
                value={formData.settings.default_confidentiality}
                onChange={(e) => handleChange('default_confidentiality', e.target.value, true)}
                className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
              >
                <option value="public">Public</option>
                <option value="internal">Internal</option>
                <option value="confidential">Confidential</option>
                <option value="highly_confidential">Highly Confidential</option>
              </select>
            </div>

            <ToggleSetting
              label="Require Classification"
              description="Require documents to be classified on upload"
              checked={formData.settings.require_classification}
              onChange={(checked) => handleChange('require_classification', checked, true)}
            />

            <ToggleSetting
              label="Allow External Sharing"
              description="Allow sharing documents with users outside the organization"
              checked={formData.settings.allow_external_sharing}
              onChange={(checked) => handleChange('allow_external_sharing', checked, true)}
            />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteLogoConfirm}
        onClose={() => !isDeletingLogo && setShowDeleteLogoConfirm(false)}
        onConfirm={handleDeleteLogo}
        title="Remove Organization Logo"
        message="Are you sure you want to remove the organization logo? This will affect how your organization appears across the application."
        variant="danger"
        confirmText="Remove Logo"
        loading={isDeletingLogo}
      />
    </>
  )
}

// Toggle Setting Component
interface ToggleSettingProps {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

function ToggleSetting({ label, description, checked, onChange, disabled }: ToggleSettingProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          checked ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  )
}

export default GeneralSettingsTab
