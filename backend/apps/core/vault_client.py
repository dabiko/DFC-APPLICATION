"""
HashiCorp Vault client for secrets management.

Provides secure key management and retrieval from HashiCorp Vault.
"""

import hvac
from django.conf import settings
from cryptography.fernet import Fernet


class VaultClient:
    """
    HashiCorp Vault client for secrets management.

    Features:
    - Secure retrieval of encryption keys
    - Automatic key rotation
    - Connection pooling
    - Authentication management
    """

    def __init__(self):
        """
        Initialize Vault client.

        Requires settings:
        - VAULT_ADDR: Vault server address
        - VAULT_TOKEN: Authentication token
        - VAULT_VERIFY_SSL: Whether to verify SSL certificates
        """
        self.client = hvac.Client(
            url=getattr(settings, 'VAULT_ADDR', 'http://localhost:8200'),
            token=getattr(settings, 'VAULT_TOKEN', None),
            verify=getattr(settings, 'VAULT_VERIFY_SSL', True)
        )

        # Only check authentication in production
        if not settings.DEBUG and not self.client.is_authenticated():
            raise Exception('Vault authentication failed')

    def get_secret(self, path, key):
        """
        Retrieve a secret from Vault.

        Args:
            path: Path to the secret (e.g., 'dfc/encryption')
            key: Key name within the secret

        Returns:
            Secret value

        Raises:
            Exception: If secret retrieval fails
        """
        try:
            response = self.client.secrets.kv.v2.read_secret_version(path=path)
            return response['data']['data'].get(key)
        except Exception as e:
            raise Exception(f'Failed to retrieve secret from Vault: {str(e)}')

    def set_secret(self, path, data):
        """
        Store a secret in Vault.

        Args:
            path: Path to store the secret
            data: Dictionary of key-value pairs to store

        Raises:
            Exception: If secret storage fails
        """
        try:
            self.client.secrets.kv.v2.create_or_update_secret(
                path=path,
                secret=data
            )
        except Exception as e:
            raise Exception(f'Failed to store secret in Vault: {str(e)}')

    def rotate_encryption_key(self):
        """
        Rotate encryption keys.

        Creates a new primary key and moves the current primary to secondary.

        Returns:
            New primary key

        Note: This does NOT re-encrypt existing data. For data migration,
        use the data_migration management command.
        """
        # Generate new Fernet key
        new_key = Fernet.generate_key().decode()

        # Get current keys
        try:
            current_primary = self.get_secret('dfc/encryption', 'fernet_key_primary')
        except Exception:
            current_primary = None

        # Store in Vault
        self.set_secret(
            path='dfc/encryption',
            data={
                'fernet_key_primary': new_key,
                'fernet_key_secondary': current_primary  # Move current to secondary
            }
        )

        return new_key

    def get_encryption_keys(self):
        """
        Get all encryption keys (primary and secondary).

        Returns:
            List of keys [primary, secondary]
        """
        try:
            primary = self.get_secret('dfc/encryption', 'fernet_key_primary')
            secondary = self.get_secret('dfc/encryption', 'fernet_key_secondary')

            keys = []
            if primary:
                keys.append(primary)
            if secondary:
                keys.append(secondary)

            return keys
        except Exception as e:
            # In development, return None to use auto-generated keys
            if settings.DEBUG:
                return None
            raise

    def get_django_secret_key(self):
        """
        Get Django SECRET_KEY from Vault.

        Returns:
            Django SECRET_KEY
        """
        try:
            return self.get_secret('dfc/django', 'secret_key')
        except Exception:
            if settings.DEBUG:
                return None
            raise

    def get_database_credentials(self):
        """
        Get database credentials from Vault.

        Returns:
            Dictionary with database connection parameters
        """
        try:
            return {
                'name': self.get_secret('dfc/database', 'name'),
                'user': self.get_secret('dfc/database', 'user'),
                'password': self.get_secret('dfc/database', 'password'),
                'host': self.get_secret('dfc/database', 'host'),
                'port': self.get_secret('dfc/database', 'port'),
            }
        except Exception:
            if settings.DEBUG:
                return None
            raise

    def get_minio_credentials(self):
        """
        Get MinIO credentials from Vault.

        Returns:
            Dictionary with MinIO connection parameters
        """
        try:
            return {
                'access_key': self.get_secret('dfc/minio', 'access_key'),
                'secret_key': self.get_secret('dfc/minio', 'secret_key'),
                'bucket_name': self.get_secret('dfc/minio', 'bucket_name'),
            }
        except Exception:
            if settings.DEBUG:
                return None
            raise


# Singleton instance
_vault_client = None


def get_vault_client():
    """
    Get singleton Vault client instance.

    Returns:
        VaultClient instance
    """
    global _vault_client

    if _vault_client is None:
        try:
            _vault_client = VaultClient()
        except Exception as e:
            # In development, this is okay
            if settings.DEBUG:
                return None
            raise

    return _vault_client


def load_secrets_from_vault():
    """
    Load secrets from Vault and update Django settings.

    This should be called early in the Django startup process,
    typically in settings/production.py.

    Updates:
    - FERNET_KEYS
    - SECRET_KEY
    - AWS_SECRET_ACCESS_KEY (MinIO)
    - Database credentials
    """
    # Only load from Vault in production
    if settings.DEBUG:
        return

    try:
        vault = get_vault_client()
        if vault is None:
            return

        # Load encryption keys
        encryption_keys = vault.get_encryption_keys()
        if encryption_keys:
            settings.FERNET_KEYS = encryption_keys

        # Load Django secret key
        django_secret = vault.get_django_secret_key()
        if django_secret:
            settings.SECRET_KEY = django_secret

        # Load MinIO credentials
        minio_creds = vault.get_minio_credentials()
        if minio_creds:
            settings.AWS_ACCESS_KEY_ID = minio_creds['access_key']
            settings.AWS_SECRET_ACCESS_KEY = minio_creds['secret_key']
            settings.AWS_STORAGE_BUCKET_NAME = minio_creds['bucket_name']

    except Exception as e:
        # In production, we want to fail loudly if Vault is unavailable
        raise Exception(f'Failed to load secrets from Vault: {str(e)}')
