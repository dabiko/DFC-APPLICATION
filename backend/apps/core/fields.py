"""
Custom encrypted field implementations using Fernet symmetric encryption.

These fields provide transparent encryption/decryption for sensitive data at rest.
Data is encrypted before being stored in the database and decrypted when retrieved.
"""

from django.db import models
from django.conf import settings
from cryptography.fernet import Fernet, MultiFernet
import base64


class EncryptedFieldMixin:
    """
    Mixin for encrypted fields that handles encryption/decryption.
    """

    def __init__(self, *args, **kwargs):
        # Encrypted fields are stored as text
        kwargs['max_length'] = kwargs.get('max_length', 1000)
        super().__init__(*args, **kwargs)

    def get_fernet(self):
        """
        Get Fernet cipher for encryption/decryption.
        Supports multiple keys for key rotation.
        """
        keys = getattr(settings, 'FERNET_KEYS', None)

        if not keys:
            # Generate a default key for development only
            if settings.DEBUG:
                return Fernet(Fernet.generate_key())
            else:
                raise ValueError(
                    "FERNET_KEYS not configured in settings. "
                    "Please set FERNET_KEYS for encryption."
                )

        # Convert keys to Fernet instances
        fernet_keys = []
        for key in keys:
            if isinstance(key, str):
                key = key.encode()
            fernet_keys.append(Fernet(key))

        # Use MultiFernet for key rotation support
        if len(fernet_keys) > 1:
            return MultiFernet(fernet_keys)
        return fernet_keys[0]

    def encrypt_value(self, value):
        """Encrypt a value"""
        if value is None or value == '':
            return value

        if isinstance(value, str):
            value = value.encode('utf-8')

        fernet = self.get_fernet()
        encrypted = fernet.encrypt(value)

        # Track encryption metric
        try:
            from apps.core.metrics import EncryptionMetrics
            EncryptionMetrics.increment_encryption_count(field_name=self.name)
        except ImportError:
            pass  # Metrics not available

        # Return as string for storage
        return encrypted.decode('utf-8')

    def decrypt_value(self, value):
        """Decrypt a value"""
        if not value:
            return value

        if isinstance(value, str):
            value = value.encode('utf-8')

        try:
            fernet = self.get_fernet()
            decrypted = fernet.decrypt(value)

            # Track successful decryption metric
            try:
                from apps.core.metrics import EncryptionMetrics
                EncryptionMetrics.increment_decryption_count(field_name=self.name)
            except ImportError:
                pass  # Metrics not available

            return decrypted.decode('utf-8')
        except Exception as e:
            # Track decryption failure
            try:
                from apps.core.metrics import EncryptionMetrics
                EncryptionMetrics.increment_decryption_failure(
                    field_name=self.name,
                    error=str(e)
                )
            except ImportError:
                pass  # Metrics not available

            # If decryption fails, it might be an old key or corrupted data
            raise ValueError(f"Failed to decrypt value: {str(e)}")

    def get_prep_value(self, value):
        """Convert Python value to database value (encrypt)"""
        if value is None or value == '':
            return value
        return self.encrypt_value(value)

    def from_db_value(self, value, expression, connection):
        """Convert database value to Python value (decrypt)"""
        if value is None:
            return value
        return self.decrypt_value(value)

    def to_python(self, value):
        """Convert to Python value"""
        if value is None or isinstance(value, str):
            return value
        return str(value)


class EncryptedCharField(EncryptedFieldMixin, models.CharField):
    """
    Encrypted CharField that stores encrypted data in the database.

    Usage:
        customer_id = EncryptedCharField(max_length=255, null=True, blank=True)

    Note: Encrypted fields cannot be used in database queries (WHERE clauses).
    For searchable encrypted data, use Elasticsearch with field-level encryption.
    """
    description = "Encrypted CharField for sensitive data"


class EncryptedTextField(EncryptedFieldMixin, models.TextField):
    """
    Encrypted TextField that stores encrypted data in the database.

    Usage:
        notes = EncryptedTextField(null=True, blank=True)

    Note: Encrypted fields cannot be used in database queries (WHERE clauses).
    For searchable encrypted data, use Elasticsearch with field-level encryption.
    """
    description = "Encrypted TextField for sensitive data"

    def __init__(self, *args, **kwargs):
        # TextField doesn't have max_length, so we override parent init
        models.TextField.__init__(self, *args, **kwargs)
