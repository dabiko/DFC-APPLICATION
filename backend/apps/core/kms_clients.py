"""
Key Management System (KMS) clients for AWS KMS and Azure Key Vault.

Provides unified interface for managing encryption keys across different KMS providers.
"""

from django.conf import settings
from cryptography.fernet import Fernet
from abc import ABC, abstractmethod
import boto3
import base64


class KMSClientBase(ABC):
    """Base class for KMS clients."""

    @abstractmethod
    def get_encryption_key(self, key_id):
        """Retrieve encryption key from KMS."""
        pass

    @abstractmethod
    def create_encryption_key(self, key_name):
        """Create new encryption key in KMS."""
        pass

    @abstractmethod
    def rotate_key(self, key_id):
        """Rotate encryption key."""
        pass

    @abstractmethod
    def encrypt_data_key(self, plaintext_key):
        """Encrypt a data key using KMS master key."""
        pass

    @abstractmethod
    def decrypt_data_key(self, encrypted_key):
        """Decrypt a data key using KMS master key."""
        pass


class AWSKMSClient(KMSClientBase):
    """
    AWS KMS client for encryption key management.

    Features:
    - Master key storage in AWS KMS
    - Data key generation and encryption
    - Automatic key rotation
    - CloudTrail audit logging
    """

    def __init__(self):
        """Initialize AWS KMS client."""
        self.kms = boto3.client(
            'kms',
            region_name=getattr(settings, 'AWS_REGION', 'us-east-1'),
            aws_access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID', None),
            aws_secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY', None),
        )
        self.master_key_id = getattr(settings, 'AWS_KMS_KEY_ID', None)

    def get_encryption_key(self, key_id=None):
        """
        Retrieve and decrypt data encryption key from KMS.

        Args:
            key_id: KMS key ID (uses default if None)

        Returns:
            Decrypted Fernet key
        """
        key_id = key_id or self.master_key_id

        # Generate data key
        response = self.kms.generate_data_key(
            KeyId=key_id,
            KeySpec='AES_256'
        )

        # Return plaintext key (32 bytes for Fernet)
        plaintext_key = response['Plaintext']

        # Convert to Fernet key format (base64 encoded)
        fernet_key = base64.urlsafe_b64encode(plaintext_key).decode()

        return fernet_key

    def create_encryption_key(self, key_name):
        """
        Create new KMS master key.

        Args:
            key_name: Descriptive name for the key

        Returns:
            Key ID
        """
        response = self.kms.create_key(
            Description=f'DFC Encryption Key - {key_name}',
            KeyUsage='ENCRYPT_DECRYPT',
            Origin='AWS_KMS',
            MultiRegion=False,
        )

        key_id = response['KeyMetadata']['KeyId']

        # Create alias
        self.kms.create_alias(
            AliasName=f'alias/dfc/{key_name}',
            TargetKeyId=key_id
        )

        return key_id

    def rotate_key(self, key_id=None):
        """
        Enable automatic key rotation.

        Args:
            key_id: KMS key ID (uses default if None)

        Returns:
            Success boolean
        """
        key_id = key_id or self.master_key_id

        self.kms.enable_key_rotation(KeyId=key_id)

        return True

    def encrypt_data_key(self, plaintext_key):
        """
        Encrypt data key using KMS master key.

        Args:
            plaintext_key: Plain text Fernet key

        Returns:
            Encrypted key (base64 encoded)
        """
        # Decode base64 Fernet key to bytes
        key_bytes = base64.urlsafe_b64decode(plaintext_key.encode())

        response = self.kms.encrypt(
            KeyId=self.master_key_id,
            Plaintext=key_bytes
        )

        # Return encrypted key as base64
        encrypted_key = base64.b64encode(response['CiphertextBlob']).decode()

        return encrypted_key

    def decrypt_data_key(self, encrypted_key):
        """
        Decrypt data key using KMS master key.

        Args:
            encrypted_key: Encrypted Fernet key (base64)

        Returns:
            Decrypted Fernet key
        """
        # Decode base64
        encrypted_blob = base64.b64decode(encrypted_key.encode())

        response = self.kms.decrypt(
            CiphertextBlob=encrypted_blob
        )

        # Convert to Fernet key format
        plaintext_key = response['Plaintext']
        fernet_key = base64.urlsafe_b64encode(plaintext_key).decode()

        return fernet_key


class AzureKeyVaultClient(KMSClientBase):
    """
    Azure Key Vault client for encryption key management.

    Features:
    - Master key storage in Azure Key Vault
    - Managed HSM support
    - Azure Active Directory authentication
    - Audit logging via Azure Monitor
    """

    def __init__(self):
        """Initialize Azure Key Vault client."""
        try:
            from azure.identity import DefaultAzureCredential
            from azure.keyvault.keys import KeyClient
            from azure.keyvault.secrets import SecretClient
        except ImportError:
            raise ImportError(
                "Azure SDK not installed. Install with: "
                "pip install azure-identity azure-keyvault-keys azure-keyvault-secrets"
            )

        vault_url = getattr(settings, 'AZURE_KEY_VAULT_URL', None)
        if not vault_url:
            raise ValueError("AZURE_KEY_VAULT_URL not configured")

        credential = DefaultAzureCredential()

        self.key_client = KeyClient(vault_url=vault_url, credential=credential)
        self.secret_client = SecretClient(vault_url=vault_url, credential=credential)

    def get_encryption_key(self, key_name='dfc-fernet-key'):
        """
        Retrieve encryption key from Azure Key Vault.

        Args:
            key_name: Name of the secret in Key Vault

        Returns:
            Fernet key
        """
        secret = self.secret_client.get_secret(key_name)
        return secret.value

    def create_encryption_key(self, key_name):
        """
        Create new encryption key in Azure Key Vault.

        Args:
            key_name: Name for the new key

        Returns:
            Key version ID
        """
        # Generate Fernet key
        fernet_key = Fernet.generate_key().decode()

        # Store in Key Vault as secret
        secret = self.secret_client.set_secret(
            key_name,
            fernet_key,
            tags={
                'application': 'dfc',
                'purpose': 'field-encryption',
                'created_by': 'dfc-rotation-script'
            }
        )

        return secret.properties.version

    def rotate_key(self, key_name='dfc-fernet-key'):
        """
        Rotate encryption key by creating new version.

        Args:
            key_name: Name of the key to rotate

        Returns:
            New key version ID
        """
        # Create new version of the key
        return self.create_encryption_key(key_name)

    def encrypt_data_key(self, plaintext_key):
        """
        For Azure, we store keys directly as secrets.
        This method stores a new version.
        """
        secret = self.secret_client.set_secret(
            'dfc-data-key',
            plaintext_key
        )
        return secret.properties.version

    def decrypt_data_key(self, key_version):
        """
        Retrieve specific version of data key.

        Args:
            key_version: Version ID of the key

        Returns:
            Plaintext key
        """
        secret = self.secret_client.get_secret(
            'dfc-data-key',
            version=key_version
        )
        return secret.value


def get_kms_client():
    """
    Get appropriate KMS client based on settings.

    Returns:
        KMS client instance
    """
    kms_provider = getattr(settings, 'KMS_PROVIDER', 'vault')

    if kms_provider == 'aws':
        return AWSKMSClient()
    elif kms_provider == 'azure':
        return AzureKeyVaultClient()
    elif kms_provider == 'vault':
        from apps.core.vault_client import get_vault_client
        return get_vault_client()
    else:
        raise ValueError(f'Unknown KMS provider: {kms_provider}')


# Usage example
"""
# In settings.py
KMS_PROVIDER = 'aws'  # or 'azure' or 'vault'
AWS_KMS_KEY_ID = 'arn:aws:kms:us-east-1:123456789:key/12345678-1234-1234-1234-123456789012'

# Or for Azure
KMS_PROVIDER = 'azure'
AZURE_KEY_VAULT_URL = 'https://dfc-keyvault.vault.azure.net/'

# In code
from apps.core.kms_clients import get_kms_client

kms = get_kms_client()
key = kms.get_encryption_key()
"""
