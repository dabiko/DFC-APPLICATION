"""
Management command to create sample documents for testing file preview.

Creates various file types:
- Text files (.txt, .md)
- Code files (.py, .js, .json)
- PDF file
- Image file (simple PNG)

Usage:
    python manage.py create_sample_documents
    python manage.py create_sample_documents --folder-id <uuid>
"""

import io
import uuid
import hashlib
from datetime import date
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from django.contrib.auth import get_user_model
from apps.documents.models import Document
from apps.folders.models import Folder

User = get_user_model()


class Command(BaseCommand):
    help = 'Create sample documents for testing file preview functionality'

    def add_arguments(self, parser):
        parser.add_argument(
            '--folder-id',
            type=str,
            help='UUID of folder to place documents in (optional)',
        )
        parser.add_argument(
            '--user-id',
            type=int,
            help='User ID to own the documents (optional)',
        )

    def handle(self, *args, **options):
        # Get user
        user_id = options.get('user_id')
        if user_id:
            user = User.objects.get(id=user_id)
        else:
            user = User.objects.first()

        if not user:
            self.stdout.write(self.style.ERROR('No users found. Please create a user first.'))
            return

        # Get folder
        folder_id = options.get('folder_id')
        if folder_id:
            folder = Folder.objects.get(id=folder_id)
        else:
            # Find a folder in user's department or any folder
            folder = Folder.objects.filter(
                is_deleted=False,
                department_id=user.department_id
            ).first()
            if not folder:
                folder = Folder.objects.filter(is_deleted=False).first()

        if not folder:
            self.stdout.write(self.style.ERROR('No folders found. Please create a folder first.'))
            return

        self.stdout.write(f'Creating sample documents...')
        self.stdout.write(f'  User: {user.username} (Department: {user.department_id})')
        self.stdout.write(f'  Folder: {folder.name} (ID: {folder.id})')
        self.stdout.write('')

        created_docs = []

        # 1. Plain text file
        txt_content = """Welcome to Digital Filing Cabinet
==================================

This is a sample text document created for testing the file preview functionality.

Features of DFC:
- Secure document storage
- Full-text search
- Version control
- Access control and permissions
- Audit trail

This document demonstrates that plain text files (.txt) can be previewed
directly in the browser without needing to download them.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
consequat.

End of sample document.
"""
        doc = self._create_document(
            user=user,
            folder=folder,
            title='Sample Text Document',
            content=txt_content.encode('utf-8'),
            file_name='sample_document.txt',
            file_type='text/plain',
            document_type='REPORT',
        )
        created_docs.append(doc)
        self.stdout.write(self.style.SUCCESS(f'  Created: {doc.title} ({doc.file_name})'))

        # 2. Markdown file
        md_content = """# Project README

## Overview

This is a **sample Markdown document** demonstrating the preview feature.

## Features

- Bullet point 1
- Bullet point 2
- Bullet point 3

## Code Example

```python
def hello_world():
    print("Hello, World!")
```

## Table

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
| Data 4   | Data 5   | Data 6   |

## Links

Visit [Digital Filing Cabinet](https://example.com) for more information.

---

*Created for testing purposes*
"""
        doc = self._create_document(
            user=user,
            folder=folder,
            title='Sample Markdown README',
            content=md_content.encode('utf-8'),
            file_name='README.md',
            file_type='text/markdown',
            document_type='REPORT',
        )
        created_docs.append(doc)
        self.stdout.write(self.style.SUCCESS(f'  Created: {doc.title} ({doc.file_name})'))

        # 3. Python file
        py_content = '''"""
Sample Python Module
====================

This module demonstrates Python code preview in DFC.
"""

from typing import List, Dict, Optional
from dataclasses import dataclass
from datetime import datetime


@dataclass
class Document:
    """Represents a document in the filing cabinet."""

    id: str
    title: str
    content: str
    created_at: datetime
    tags: List[str]
    metadata: Dict[str, str]

    def __post_init__(self):
        if not self.tags:
            self.tags = []
        if not self.metadata:
            self.metadata = {}


class DocumentManager:
    """Manages document operations."""

    def __init__(self):
        self._documents: Dict[str, Document] = {}

    def add_document(self, doc: Document) -> None:
        """Add a document to the manager."""
        self._documents[doc.id] = doc

    def get_document(self, doc_id: str) -> Optional[Document]:
        """Retrieve a document by ID."""
        return self._documents.get(doc_id)

    def search(self, query: str) -> List[Document]:
        """Search documents by title or content."""
        query_lower = query.lower()
        results = []
        for doc in self._documents.values():
            if query_lower in doc.title.lower() or query_lower in doc.content.lower():
                results.append(doc)
        return results

    def list_all(self) -> List[Document]:
        """List all documents."""
        return list(self._documents.values())


def main():
    """Main function demonstrating usage."""
    manager = DocumentManager()

    # Create sample documents
    doc1 = Document(
        id="doc-001",
        title="Financial Report Q4",
        content="Quarterly financial summary...",
        created_at=datetime.now(),
        tags=["finance", "quarterly"],
        metadata={"department": "Accounting"}
    )

    manager.add_document(doc1)

    # Search for documents
    results = manager.search("financial")
    print(f"Found {len(results)} documents")


if __name__ == "__main__":
    main()
'''
        doc = self._create_document(
            user=user,
            folder=folder,
            title='Sample Python Code',
            content=py_content.encode('utf-8'),
            file_name='document_manager.py',
            file_type='text/x-python',
            document_type='OTHER',
        )
        created_docs.append(doc)
        self.stdout.write(self.style.SUCCESS(f'  Created: {doc.title} ({doc.file_name})'))

        # 4. JavaScript file
        js_content = '''/**
 * Document Service
 * Handles document operations in the frontend
 */

const API_BASE_URL = '/api/v1';

/**
 * Fetch all documents from the API
 * @returns {Promise<Document[]>}
 */
export async function fetchDocuments() {
    const response = await fetch(`${API_BASE_URL}/documents/`);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

/**
 * Upload a new document
 * @param {File} file - The file to upload
 * @param {Object} metadata - Document metadata
 * @returns {Promise<Document>}
 */
export async function uploadDocument(file, metadata) {
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(metadata).forEach(([key, value]) => {
        formData.append(key, value);
    });

    const response = await fetch(`${API_BASE_URL}/documents/upload/`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
    }

    return response.json();
}

/**
 * Delete a document
 * @param {string} documentId - The document ID
 */
export async function deleteDocument(documentId) {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        throw new Error(`Delete failed: ${response.status}`);
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('Document service initialized');
});
'''
        doc = self._create_document(
            user=user,
            folder=folder,
            title='Sample JavaScript Code',
            content=js_content.encode('utf-8'),
            file_name='documentService.js',
            file_type='text/javascript',
            document_type='OTHER',
        )
        created_docs.append(doc)
        self.stdout.write(self.style.SUCCESS(f'  Created: {doc.title} ({doc.file_name})'))

        # 5. JSON config file
        json_content = '''{
    "application": {
        "name": "Digital Filing Cabinet",
        "version": "1.0.0",
        "environment": "development"
    },
    "database": {
        "host": "localhost",
        "port": 5432,
        "name": "dfc_db",
        "pool_size": 10
    },
    "storage": {
        "provider": "minio",
        "endpoint": "localhost:9000",
        "bucket": "dfc-documents",
        "region": "us-east-1"
    },
    "search": {
        "provider": "elasticsearch",
        "hosts": ["localhost:9200"],
        "index_prefix": "dfc_"
    },
    "security": {
        "jwt_expiry_hours": 24,
        "password_min_length": 8,
        "mfa_enabled": true
    },
    "features": {
        "ocr_enabled": true,
        "version_control": true,
        "audit_trail": true,
        "retention_policies": true
    }
}
'''
        doc = self._create_document(
            user=user,
            folder=folder,
            title='Sample Configuration',
            content=json_content.encode('utf-8'),
            file_name='config.json',
            file_type='application/json',
            document_type='OTHER',
        )
        created_docs.append(doc)
        self.stdout.write(self.style.SUCCESS(f'  Created: {doc.title} ({doc.file_name})'))

        # 6. CSV data file
        csv_content = """id,name,department,email,hire_date,salary
1,John Smith,Engineering,john.smith@example.com,2020-01-15,85000
2,Jane Doe,Marketing,jane.doe@example.com,2019-06-20,72000
3,Bob Johnson,Finance,bob.johnson@example.com,2021-03-10,90000
4,Alice Williams,HR,alice.williams@example.com,2018-11-05,68000
5,Charlie Brown,Engineering,charlie.brown@example.com,2022-02-28,78000
6,Diana Ross,Sales,diana.ross@example.com,2020-08-15,82000
7,Edward Norton,Legal,edward.norton@example.com,2019-04-22,95000
8,Fiona Apple,Marketing,fiona.apple@example.com,2021-07-01,70000
9,George Lucas,IT,george.lucas@example.com,2017-12-10,88000
10,Helen Troy,Finance,helen.troy@example.com,2022-05-18,75000
"""
        doc = self._create_document(
            user=user,
            folder=folder,
            title='Employee Data Sample',
            content=csv_content.encode('utf-8'),
            file_name='employees.csv',
            file_type='text/csv',
            document_type='REPORT',
        )
        created_docs.append(doc)
        self.stdout.write(self.style.SUCCESS(f'  Created: {doc.title} ({doc.file_name})'))

        # 7. SQL file
        sql_content = """-- Sample Database Schema for DFC
-- Created for testing preview functionality

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(150) UNIQUE NOT NULL,
    email VARCHAR(254) UNIQUE NOT NULL,
    password_hash VARCHAR(128) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    department_id INTEGER REFERENCES departments(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    parent_id INTEGER REFERENCES departments(id),
    storage_quota_gb INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100),
    checksum VARCHAR(64),
    folder_id UUID REFERENCES folders(id),
    owner_id INTEGER REFERENCES users(id),
    department_id INTEGER REFERENCES departments(id),
    confidentiality_level VARCHAR(20) DEFAULT 'INTERNAL',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_documents_folder ON documents(folder_id);
CREATE INDEX idx_documents_owner ON documents(owner_id);
CREATE INDEX idx_documents_department ON documents(department_id);
CREATE INDEX idx_documents_created ON documents(created_at DESC);

-- Sample queries
SELECT d.title, d.file_name, u.username as owner
FROM documents d
JOIN users u ON d.owner_id = u.id
WHERE d.is_deleted = FALSE
ORDER BY d.created_at DESC
LIMIT 10;
"""
        doc = self._create_document(
            user=user,
            folder=folder,
            title='Database Schema SQL',
            content=sql_content.encode('utf-8'),
            file_name='schema.sql',
            file_type='text/x-sql',
            document_type='OTHER',
        )
        created_docs.append(doc)
        self.stdout.write(self.style.SUCCESS(f'  Created: {doc.title} ({doc.file_name})'))

        # 8. YAML configuration
        yaml_content = """# Docker Compose configuration for DFC
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DEBUG=false
      - DATABASE_URL=postgres://user:pass@db:5432/dfc
      - MINIO_ENDPOINT=minio:9000
      - ELASTICSEARCH_HOST=elasticsearch:9200
    depends_on:
      - db
      - minio
      - elasticsearch
    volumes:
      - ./backend:/app
    networks:
      - dfc-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:8000
    depends_on:
      - backend
    networks:
      - dfc-network

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: dfc
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - dfc-network

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data
    networks:
      - dfc-network

  elasticsearch:
    image: elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - es_data:/usr/share/elasticsearch/data
    networks:
      - dfc-network

volumes:
  postgres_data:
  minio_data:
  es_data:

networks:
  dfc-network:
    driver: bridge
"""
        doc = self._create_document(
            user=user,
            folder=folder,
            title='Docker Compose Config',
            content=yaml_content.encode('utf-8'),
            file_name='docker-compose.yml',
            file_type='application/x-yaml',
            document_type='OTHER',
        )
        created_docs.append(doc)
        self.stdout.write(self.style.SUCCESS(f'  Created: {doc.title} ({doc.file_name})'))

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'Successfully created {len(created_docs)} sample documents!'))
        self.stdout.write(f'Folder: {folder.name} (path: {folder.path})')

    def _create_document(self, user, folder, title, content, file_name, file_type, document_type):
        """Create a document with the given content."""
        # Calculate checksum
        checksum = hashlib.sha256(content).hexdigest()

        # Create document
        doc = Document(
            title=title,
            file_name=file_name,
            file_size=len(content),
            file_type=file_type,
            checksum=checksum,
            document_type=document_type,
            identifier=f'SAMPLE-{uuid.uuid4().hex[:8].upper()}',
            document_date=date.today(),
            creator_source='System Generated',
            confidentiality_level='INTERNAL',
            retention_period_years=1,
            folder=folder,
            owner=user,
            department=user.department,
            created_by=user,
        )

        # Save file
        doc.file.save(file_name, ContentFile(content), save=False)
        doc.save()

        return doc
