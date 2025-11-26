# Azure Blob Storage Setup Guide for DFC Application

## Overview

This guide provides step-by-step instructions for configuring Microsoft Azure Blob Storage and Azure Key Vault to replace MinIO for document storage in the DFC (Digital Filing Cabinet) application.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Azure Account Setup](#azure-account-setup)
3. [Create Resource Group](#create-resource-group)
4. [Create Storage Account](#create-storage-account)
5. [Create Blob Container](#create-blob-container)
6. [Configure Azure Key Vault](#configure-azure-key-vault)
7. [Enable Customer-Managed Keys](#enable-customer-managed-keys)
8. [Configure Access Policies](#configure-access-policies)
9. [Generate Access Keys / SAS Tokens](#generate-access-keys--sas-tokens)
10. [Django Configuration](#django-configuration)
11. [Environment Variables](#environment-variables)
12. [Testing the Connection](#testing-the-connection)
13. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- [ ] Microsoft Azure account (free tier available)
- [ ] Azure CLI installed (optional but recommended)
- [ ] Python 3.10+ installed
- [ ] DFC application codebase

---

## Azure Account Setup

### Step 1: Create Azure Account

1. Go to [https://azure.microsoft.com/free/](https://azure.microsoft.com/free/)
2. Click "Start free" or "Try Azure for free"
3. Sign in with Microsoft account or create one
4. Complete the registration process
5. Verify your identity (phone + credit card for verification)

**Free Tier Includes**:
- 12 months of free services
- $200 credit for first 30 days
- 5GB Blob Storage (LRS) free for 12 months

### Step 2: Access Azure Portal

1. Go to [https://portal.azure.com](https://portal.azure.com)
2. Sign in with your Azure account
3. You'll see the Azure Portal dashboard

---

## Create Resource Group

A resource group is a container for all your Azure resources.

### Using Azure Portal

1. In the Azure Portal, search for "Resource groups" in the top search bar
2. Click "+ Create"
3. Fill in the details:
   - **Subscription**: Select your subscription
   - **Resource group**: `dfc-resources` (or your preferred name)
   - **Region**: Select the closest region (e.g., `West Europe`, `East US`)
4. Click "Review + Create"
5. Click "Create"

### Using Azure CLI

```bash
# Login to Azure
az login

# Create resource group
az group create \
  --name dfc-resources \
  --location westeurope
```

---

## Create Storage Account

### Using Azure Portal

1. Search for "Storage accounts" in the Azure Portal
2. Click "+ Create"
3. Fill in the **Basics** tab:
   - **Subscription**: Select your subscription
   - **Resource group**: `dfc-resources`
   - **Storage account name**: `dfcstorage` (must be globally unique, lowercase, 3-24 chars)
   - **Region**: Same as resource group
   - **Performance**: Standard
   - **Redundancy**: Locally-redundant storage (LRS) for dev, Geo-redundant (GRS) for production

4. Click **Advanced** tab:
   - **Require secure transfer**: Enabled (HTTPS only)
   - **Allow Blob public access**: Disabled
   - **Enable storage account key access**: Enabled
   - **Default access tier**: Hot
   - **Enable hierarchical namespace**: Disabled (unless you need Data Lake)

5. Click **Networking** tab:
   - **Network access**: Enable public access from all networks (for dev)
   - For production: Configure private endpoints

6. Click **Data protection** tab:
   - **Enable soft delete for blobs**: Yes, 7 days
   - **Enable soft delete for containers**: Yes, 7 days
   - **Enable versioning**: Yes (for document versioning)

7. Click **Encryption** tab:
   - **Encryption type**: Microsoft-managed keys (for now, we'll add Key Vault later)

8. Click "Review + Create" then "Create"

### Using Azure CLI

```bash
# Create storage account
az storage account create \
  --name dfcstorage \
  --resource-group dfc-resources \
  --location westeurope \
  --sku Standard_LRS \
  --kind StorageV2 \
  --https-only true \
  --allow-blob-public-access false \
  --min-tls-version TLS1_2
```

---

## Create Blob Container

### Using Azure Portal

1. Go to your Storage Account (`dfcstorage`)
2. In the left menu, click "Containers" under "Data storage"
3. Click "+ Container"
4. Fill in:
   - **Name**: `dfc-documents`
   - **Public access level**: Private (no anonymous access)
5. Click "Create"

**Create additional containers** (optional):
- `dfc-thumbnails` - For document previews
- `dfc-temp` - For temporary uploads

### Using Azure CLI

```bash
# Get storage account key
STORAGE_KEY=$(az storage account keys list \
  --account-name dfcstorage \
  --resource-group dfc-resources \
  --query '[0].value' -o tsv)

# Create container
az storage container create \
  --name dfc-documents \
  --account-name dfcstorage \
  --account-key $STORAGE_KEY \
  --public-access off
```

---

## Configure Azure Key Vault

Azure Key Vault securely stores encryption keys, secrets, and certificates.

### Using Azure Portal

1. Search for "Key vaults" in the Azure Portal
2. Click "+ Create"
3. Fill in the **Basics** tab:
   - **Subscription**: Select your subscription
   - **Resource group**: `dfc-resources`
   - **Key vault name**: `dfc-keyvault` (must be globally unique)
   - **Region**: Same as storage account
   - **Pricing tier**: Standard

4. Click **Access configuration** tab:
   - **Permission model**: Azure role-based access control (recommended)

5. Click **Networking** tab:
   - **Allow access from**: All networks (for dev)
   - For production: Configure private endpoints

6. Click "Review + Create" then "Create"

### Using Azure CLI

```bash
# Create Key Vault
az keyvault create \
  --name dfc-keyvault \
  --resource-group dfc-resources \
  --location westeurope \
  --sku standard \
  --enable-rbac-authorization true
```

### Create Encryption Key

1. Go to your Key Vault (`dfc-keyvault`)
2. In the left menu, click "Keys" under "Objects"
3. Click "+ Generate/Import"
4. Fill in:
   - **Options**: Generate
   - **Name**: `dfc-storage-key`
   - **Key type**: RSA
   - **RSA key size**: 2048
5. Click "Create"

### Using Azure CLI

```bash
# Create encryption key
az keyvault key create \
  --vault-name dfc-keyvault \
  --name dfc-storage-key \
  --kty RSA \
  --size 2048
```

---

## Enable Customer-Managed Keys

Link your Storage Account to use Key Vault for encryption.

### Step 1: Enable Managed Identity for Storage Account

1. Go to your Storage Account (`dfcstorage`)
2. In the left menu, click "Identity" under "Security + networking"
3. Under "System assigned" tab, set Status to **On**
4. Click "Save"
5. Copy the **Object (principal) ID** - you'll need this

### Step 2: Grant Key Vault Access to Storage Account

1. Go to your Key Vault (`dfc-keyvault`)
2. Click "Access control (IAM)" in the left menu
3. Click "+ Add" > "Add role assignment"
4. Select role: **Key Vault Crypto Service Encryption User**
5. Click "Next"
6. Select "Managed identity"
7. Click "+ Select members"
8. Select your Storage Account's managed identity
9. Click "Review + assign"

### Step 3: Configure Customer-Managed Key

1. Go to your Storage Account (`dfcstorage`)
2. Click "Encryption" in the left menu
3. Under "Encryption type", select **Customer-managed keys**
4. For "Key selection method", choose **Select from key vault**
5. Click "Select a key vault and key"
6. Select:
   - **Key vault**: `dfc-keyvault`
   - **Key**: `dfc-storage-key`
7. Click "Select"
8. Click "Save"

---

## Configure Access Policies

### Create Service Principal for Django App

1. Search for "App registrations" in Azure Portal
2. Click "+ New registration"
3. Fill in:
   - **Name**: `dfc-backend-app`
   - **Supported account types**: Single tenant
4. Click "Register"
5. Note down:
   - **Application (client) ID**
   - **Directory (tenant) ID**

### Create Client Secret

1. In your App Registration, click "Certificates & secrets"
2. Click "+ New client secret"
3. Fill in:
   - **Description**: `dfc-backend-secret`
   - **Expires**: 24 months (or as per your policy)
4. Click "Add"
5. **IMMEDIATELY copy the secret Value** (it won't be shown again)

### Grant Storage Account Access

1. Go to your Storage Account (`dfcstorage`)
2. Click "Access control (IAM)"
3. Click "+ Add" > "Add role assignment"
4. Select role: **Storage Blob Data Contributor**
5. Click "Next"
6. Select "User, group, or service principal"
7. Click "+ Select members"
8. Search for `dfc-backend-app` and select it
9. Click "Review + assign"

---

## Generate Access Keys / SAS Tokens

### Option 1: Storage Account Keys (Simpler)

1. Go to your Storage Account
2. Click "Access keys" under "Security + networking"
3. Click "Show" on key1
4. Copy:
   - **Storage account name**: `dfcstorage`
   - **Key**: (the key value)

### Option 2: SAS Token (More Secure)

1. Go to your Storage Account
2. Click "Shared access signature" under "Security + networking"
3. Configure:
   - **Allowed services**: Blob
   - **Allowed resource types**: Container, Object
   - **Allowed permissions**: Read, Write, Delete, List, Add, Create
   - **Start and expiry date/time**: Set appropriate values
   - **Allowed protocols**: HTTPS only
4. Click "Generate SAS and connection string"
5. Copy the **SAS token** or **Connection string**

---

## Django Configuration

### Install Required Packages

```bash
pip install azure-storage-blob azure-identity django-storages
```

Add to `requirements/base.txt`:
```
azure-storage-blob>=12.19.0
azure-identity>=1.15.0
django-storages>=1.14.2
```

### Update Django Settings

Edit `backend/config/settings/base.py`:

```python
# Azure Blob Storage Configuration
AZURE_ACCOUNT_NAME = os.getenv('AZURE_ACCOUNT_NAME')
AZURE_ACCOUNT_KEY = os.getenv('AZURE_ACCOUNT_KEY')
AZURE_CONTAINER = os.getenv('AZURE_CONTAINER', 'dfc-documents')
AZURE_CUSTOM_DOMAIN = os.getenv('AZURE_CUSTOM_DOMAIN', None)
AZURE_SSL = True
AZURE_UPLOAD_MAX_CONN = 2
AZURE_CONNECTION_TIMEOUT_SECS = 20
AZURE_URL_EXPIRATION_SECS = 3600  # 1 hour for signed URLs

# Storage Backend
STORAGES = {
    "default": {
        "BACKEND": "storages.backends.azure_storage.AzureStorage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

# For Service Principal authentication (alternative to account key)
AZURE_TENANT_ID = os.getenv('AZURE_TENANT_ID')
AZURE_CLIENT_ID = os.getenv('AZURE_CLIENT_ID')
AZURE_CLIENT_SECRET = os.getenv('AZURE_CLIENT_SECRET')
```

### Update Storage Service

Create/update `backend/apps/storage/azure_service.py`:

```python
"""
Azure Blob Storage service for DFC application.
"""

import hashlib
import os
import mimetypes
from datetime import datetime, timedelta
from typing import BinaryIO, Dict, Optional

from azure.storage.blob import (
    BlobServiceClient,
    BlobClient,
    ContainerClient,
    generate_blob_sas,
    BlobSasPermissions,
)
from azure.core.exceptions import AzureError
from django.conf import settings


class AzureStorageService:
    """
    Service class for managing file storage operations with Azure Blob Storage.
    """

    def __init__(self):
        """Initialize Azure Blob Storage client."""
        connection_string = (
            f"DefaultEndpointsProtocol=https;"
            f"AccountName={settings.AZURE_ACCOUNT_NAME};"
            f"AccountKey={settings.AZURE_ACCOUNT_KEY};"
            f"EndpointSuffix=core.windows.net"
        )
        self.blob_service_client = BlobServiceClient.from_connection_string(
            connection_string
        )
        self.default_container = settings.AZURE_CONTAINER

    def get_container_client(self, container_name: str = None) -> ContainerClient:
        """Get container client."""
        container = container_name or self.default_container
        return self.blob_service_client.get_container_client(container)

    def get_blob_client(self, blob_name: str, container_name: str = None) -> BlobClient:
        """Get blob client for a specific blob."""
        container = container_name or self.default_container
        return self.blob_service_client.get_blob_client(container, blob_name)

    def get_object_key(
        self,
        organization_id: str,
        document_id: str,
        filename: str,
        version: int = 1,
        category: str = 'documents'
    ) -> str:
        """
        Generate blob name path for Azure storage.

        Structure: {org_id}/{category}/{year}/{month}/{doc_id}_v{version}_{filename}
        """
        now = datetime.now()
        year = now.strftime('%Y')
        month = now.strftime('%m')
        safe_filename = self._sanitize_filename(filename)

        return f"{organization_id}/{category}/{year}/{month}/{document_id}_v{version}_{safe_filename}"

    def upload_file(
        self,
        file_obj: BinaryIO,
        organization_id: str,
        document_id: str,
        filename: str,
        version: int = 1,
        metadata: Optional[Dict[str, str]] = None
    ) -> Dict:
        """
        Upload file to Azure Blob Storage.

        Returns:
            Dictionary containing blob info or error details
        """
        blob_name = self.get_object_key(
            organization_id, document_id, filename, version
        )

        try:
            # Read file content
            file_content = file_obj.read()
            if hasattr(file_obj, 'seek'):
                file_obj.seek(0)

            # Ensure bytes
            if not isinstance(file_content, bytes):
                file_content = file_content.encode('utf-8')

            # Calculate checksum
            checksum = hashlib.sha256(file_content).hexdigest()

            # Detect MIME type
            mime_type, _ = mimetypes.guess_type(filename)
            mime_type = mime_type or 'application/octet-stream'

            # Prepare metadata
            upload_metadata = {
                'original_filename': filename,
                'document_id': str(document_id),
                'organization_id': str(organization_id),
                'version': str(version),
                'sha256_checksum': checksum,
                'upload_timestamp': datetime.utcnow().isoformat()
            }
            if metadata:
                upload_metadata.update(metadata)

            # Upload to Azure
            blob_client = self.get_blob_client(blob_name)
            blob_client.upload_blob(
                file_content,
                overwrite=True,
                metadata=upload_metadata,
                content_settings={'content_type': mime_type}
            )

            return {
                'success': True,
                'container': self.default_container,
                'blob_name': blob_name,
                'file_size': len(file_content),
                'checksum': checksum,
                'mime_type': mime_type,
            }

        except AzureError as e:
            return {
                'success': False,
                'error': str(e),
                'error_code': 'AZURE_ERROR'
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'error_code': 'UNKNOWN_ERROR'
            }

    def download_file(self, blob_name: str) -> Optional[bytes]:
        """Download file content from Azure."""
        try:
            blob_client = self.get_blob_client(blob_name)
            download_stream = blob_client.download_blob()
            return download_stream.readall()
        except AzureError as e:
            print(f"Error downloading file: {e}")
            return None

    def delete_file(self, blob_name: str) -> bool:
        """Delete file from Azure."""
        try:
            blob_client = self.get_blob_client(blob_name)
            blob_client.delete_blob()
            return True
        except AzureError as e:
            print(f"Error deleting file: {e}")
            return False

    def generate_signed_url(
        self,
        blob_name: str,
        expiration: int = 3600,
        permission: str = 'r'
    ) -> Optional[str]:
        """
        Generate temporary signed URL for file access.

        Args:
            blob_name: Blob name/path
            expiration: URL expiration time in seconds
            permission: 'r' for read, 'w' for write
        """
        try:
            permissions = BlobSasPermissions(read=(permission == 'r'))

            sas_token = generate_blob_sas(
                account_name=settings.AZURE_ACCOUNT_NAME,
                container_name=self.default_container,
                blob_name=blob_name,
                account_key=settings.AZURE_ACCOUNT_KEY,
                permission=permissions,
                expiry=datetime.utcnow() + timedelta(seconds=expiration)
            )

            url = (
                f"https://{settings.AZURE_ACCOUNT_NAME}.blob.core.windows.net/"
                f"{self.default_container}/{blob_name}?{sas_token}"
            )
            return url

        except Exception as e:
            print(f"Error generating signed URL: {e}")
            return None

    def file_exists(self, blob_name: str) -> bool:
        """Check if file exists in Azure."""
        try:
            blob_client = self.get_blob_client(blob_name)
            return blob_client.exists()
        except AzureError:
            return False

    def get_file_metadata(self, blob_name: str) -> Optional[Dict]:
        """Get file metadata from Azure."""
        try:
            blob_client = self.get_blob_client(blob_name)
            properties = blob_client.get_blob_properties()
            return {
                'content_type': properties.content_settings.content_type,
                'content_length': properties.size,
                'last_modified': properties.last_modified,
                'etag': properties.etag,
                'metadata': properties.metadata,
            }
        except AzureError as e:
            print(f"Error getting file metadata: {e}")
            return None

    def _sanitize_filename(self, filename: str) -> str:
        """Sanitize filename to be URL-safe."""
        filename = os.path.basename(filename)
        unsafe_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|', ' ']
        for char in unsafe_chars:
            filename = filename.replace(char, '_')
        return filename


# Singleton instance
azure_storage_service = AzureStorageService()
```

---

## Environment Variables

Create/update your `.env` file:

```bash
# Azure Blob Storage
AZURE_ACCOUNT_NAME=dfcstorage
AZURE_ACCOUNT_KEY=your-storage-account-key-here
AZURE_CONTAINER=dfc-documents

# Azure Key Vault (optional - for secrets management)
AZURE_KEY_VAULT_URL=https://dfc-keyvault.vault.azure.net/

# Azure Service Principal (alternative authentication)
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret

# Disable MinIO encryption (now using Azure)
AWS_S3_ENCRYPTION=False
```

---

## Testing the Connection

### Test Script

Create `backend/scripts/test_azure_connection.py`:

```python
#!/usr/bin/env python
"""Test Azure Blob Storage connection."""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.storage.azure_service import azure_storage_service


def test_connection():
    """Test basic Azure operations."""
    print("Testing Azure Blob Storage connection...")

    # Test 1: List containers
    try:
        containers = list(azure_storage_service.blob_service_client.list_containers())
        print(f"[OK] Connected to Azure. Found {len(containers)} container(s)")
        for c in containers:
            print(f"     - {c.name}")
    except Exception as e:
        print(f"[FAIL] Connection failed: {e}")
        return False

    # Test 2: Upload test file
    try:
        test_content = b"Hello from DFC test!"
        from io import BytesIO
        test_file = BytesIO(test_content)

        result = azure_storage_service.upload_file(
            file_obj=test_file,
            organization_id="test-org",
            document_id="test-doc-123",
            filename="test.txt",
            version=1
        )

        if result['success']:
            print(f"[OK] Upload successful: {result['blob_name']}")
        else:
            print(f"[FAIL] Upload failed: {result['error']}")
            return False
    except Exception as e:
        print(f"[FAIL] Upload test failed: {e}")
        return False

    # Test 3: Generate signed URL
    try:
        url = azure_storage_service.generate_signed_url(result['blob_name'])
        if url:
            print(f"[OK] Signed URL generated successfully")
            print(f"     URL: {url[:80]}...")
        else:
            print("[FAIL] Could not generate signed URL")
    except Exception as e:
        print(f"[FAIL] Signed URL test failed: {e}")

    # Test 4: Delete test file
    try:
        deleted = azure_storage_service.delete_file(result['blob_name'])
        if deleted:
            print("[OK] Test file deleted successfully")
        else:
            print("[WARN] Could not delete test file")
    except Exception as e:
        print(f"[WARN] Cleanup failed: {e}")

    print("\nAll tests completed!")
    return True


if __name__ == '__main__':
    test_connection()
```

Run the test:
```bash
cd backend
python scripts/test_azure_connection.py
```

---

## Troubleshooting

### Common Errors

#### 1. "AuthenticationFailed"
**Cause**: Invalid account key or connection string
**Solution**:
- Verify `AZURE_ACCOUNT_NAME` and `AZURE_ACCOUNT_KEY` in `.env`
- Regenerate keys in Azure Portal if needed

#### 2. "ContainerNotFound"
**Cause**: Container doesn't exist
**Solution**:
- Create the container in Azure Portal
- Check `AZURE_CONTAINER` environment variable

#### 3. "AuthorizationPermissionMismatch"
**Cause**: Service principal lacks permissions
**Solution**:
- Add "Storage Blob Data Contributor" role to the service principal
- Wait a few minutes for RBAC changes to propagate

#### 4. "SSL: CERTIFICATE_VERIFY_FAILED"
**Cause**: SSL certificate issues
**Solution**:
```python
# Add to your code (not recommended for production)
import ssl
ssl._create_default_https_context = ssl._create_unverified_context
```

#### 5. "Request body too large"
**Cause**: File exceeds Azure's single-upload limit (256MB for block blobs)
**Solution**: Use chunked upload for large files:
```python
blob_client.upload_blob(data, overwrite=True, max_concurrency=4)
```

### Useful Azure CLI Commands

```bash
# Check storage account
az storage account show --name dfcstorage --resource-group dfc-resources

# List containers
az storage container list --account-name dfcstorage --account-key <key>

# List blobs in container
az storage blob list --container-name dfc-documents --account-name dfcstorage --account-key <key>

# Check Key Vault
az keyvault show --name dfc-keyvault

# List keys in Key Vault
az keyvault key list --vault-name dfc-keyvault
```

---

## Security Best Practices

1. **Never commit secrets** - Use environment variables or Azure Key Vault
2. **Use Private Endpoints** in production - Restrict network access
3. **Enable Soft Delete** - Protect against accidental deletion
4. **Rotate Keys Regularly** - Set up automatic key rotation
5. **Use SAS Tokens** - Prefer SAS tokens over account keys for limited access
6. **Enable Logging** - Turn on Azure Storage Analytics
7. **Use HTTPS Only** - Enforce secure transfer

---

## Next Steps

1. Complete Azure setup following this guide
2. Update Django settings with Azure credentials
3. Run the test script to verify connection
4. Update the document upload serializer to use Azure storage
5. Test document upload in the application

---

**Document Version**: 1.0
**Created**: 2025-11-25
**Author**: Claude Code Assistant
