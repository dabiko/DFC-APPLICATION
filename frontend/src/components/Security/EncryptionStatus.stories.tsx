import type { Meta, StoryObj } from '@storybook/react-vite'
import { EncryptionStatus } from './EncryptionStatus'
import type { DocumentEncryption } from '@/types/encryption'

const meta: Meta<typeof EncryptionStatus> = {
  title: 'Components/Security/EncryptionStatus',
  component: EncryptionStatus,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof EncryptionStatus>

const encryptedDocument: DocumentEncryption = {
  documentId: 'doc-123',
  status: 'encrypted',
  metadata: {
    algorithm: 'AES-256-GCM',
    keyId: 'key-abc123def456',
    version: '1.0',
    encryptedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    encryptedBy: 'john.doe@example.com',
    iv: 'xyz789',
    authTag: 'tag123',
    kdf: 'PBKDF2',
    salt: 'salt456',
  },
  strength: 'military',
  securityLevel: 'confidential',
  accessible: true,
  complianceStandards: ['FIPS-140-3', 'HIPAA', 'GDPR'],
  clientSideEncrypted: true,
  serverSideEncrypted: true,
  endToEndEncrypted: true,
}

const unencryptedDocument: DocumentEncryption = {
  documentId: 'doc-456',
  status: 'unencrypted',
  strength: 'basic',
  securityLevel: 'public',
  accessible: true,
  complianceStandards: [],
  clientSideEncrypted: false,
  serverSideEncrypted: false,
  endToEndEncrypted: false,
}

const encryptingDocument: DocumentEncryption = {
  documentId: 'doc-789',
  status: 'encrypting',
  strength: 'high',
  securityLevel: 'internal',
  accessible: false,
  complianceStandards: ['PCI-DSS'],
  clientSideEncrypted: false,
  serverSideEncrypted: true,
  endToEndEncrypted: false,
}

const restrictedDocument: DocumentEncryption = {
  documentId: 'doc-999',
  status: 'encrypted',
  metadata: {
    algorithm: 'AES-256-GCM',
    keyId: 'key-restricted',
    version: '1.0',
    encryptedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    encryptedBy: 'admin@example.com',
  },
  strength: 'military',
  securityLevel: 'top-secret',
  accessible: false,
  accessDeniedReason: 'Insufficient clearance level. This document requires Top Secret clearance.',
  complianceStandards: ['FIPS-140-3', 'ISO-27001'],
  clientSideEncrypted: true,
  serverSideEncrypted: true,
  endToEndEncrypted: true,
}

/**
 * Fully encrypted document with military-grade security
 */
export const Encrypted: Story = {
  args: {
    encryption: encryptedDocument,
    detailed: true,
    showCompliance: true,
    showSecurityLevel: true,
    showStrength: true,
  },
}

/**
 * Unencrypted document (public)
 */
export const Unencrypted: Story = {
  args: {
    encryption: unencryptedDocument,
    detailed: true,
  },
}

/**
 * Document currently being encrypted
 */
export const Encrypting: Story = {
  args: {
    encryption: encryptingDocument,
    detailed: true,
    animate: true,
  },
}

/**
 * Compact view for inline display
 */
export const Compact: Story = {
  args: {
    encryption: encryptedDocument,
    compact: true,
  },
}

/**
 * Access denied due to insufficient permissions
 */
export const AccessDenied: Story = {
  args: {
    encryption: restrictedDocument,
    detailed: true,
  },
}

/**
 * Minimal view without extra details
 */
export const Minimal: Story = {
  args: {
    encryption: encryptedDocument,
    detailed: false,
    showCompliance: false,
    showStrength: false,
  },
}

/**
 * Top secret document
 */
export const TopSecret: Story = {
  args: {
    encryption: {
      ...encryptedDocument,
      securityLevel: 'top-secret',
    },
    detailed: true,
  },
}

/**
 * Dark mode
 */
export const DarkMode: Story = {
  render: () => (
    <div className="dark bg-gray-950 p-8 min-h-screen">
      <EncryptionStatus
        encryption={encryptedDocument}
        detailed={true}
        showCompliance={true}
        showSecurityLevel={true}
        showStrength={true}
      />
    </div>
  ),
}
