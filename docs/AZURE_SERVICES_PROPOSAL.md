# Azure Services Proposal for DFC Application

## Executive Summary

This document proposes Microsoft Azure services to replace or enhance the current DFC (Digital Filing Cabinet) technology stack. Based on your `PROJECT_IMPLEMENTATION_PLAN_BACKEND.md`, this proposal maps each current service to its Azure equivalent with detailed rationale, pricing considerations, and implementation guidance.

---

## Current Stack vs Azure Services Mapping

| Current Service | Azure Equivalent | Status |
|-----------------|------------------|--------|
| MinIO (Object Storage) | **Azure Blob Storage** | Recommended |
| PostgreSQL | **Azure Database for PostgreSQL** | Recommended |
| Elasticsearch | **Azure Cognitive Search** | Recommended |
| Redis | **Azure Cache for Redis** | Recommended |
| RabbitMQ/Celery | **Azure Service Bus + Azure Functions** | Optional |
| Docker/Kubernetes | **Azure Kubernetes Service (AKS)** | Recommended |
| Nginx | **Azure Application Gateway** | Recommended |
| Prometheus + Grafana | **Azure Monitor + Application Insights** | Recommended |
| ELK Stack | **Azure Log Analytics** | Recommended |
| Sentry | **Azure Application Insights** | Included |
| KMS (Encryption) | **Azure Key Vault** | Already documented |

---

## Tier 1: Essential Services (High Priority)

### 1. Azure Blob Storage (Replace MinIO)

**Purpose**: Store all documents, files, and media uploads.

**Why Azure Blob Storage?**
- Enterprise-grade durability (99.999999999% - 11 nines)
- Native encryption at rest with Azure-managed or customer-managed keys
- Seamless integration with Azure Key Vault for encryption
- Access tiers for cost optimization (Hot, Cool, Archive)
- Immutable storage for compliance (WORM - Write Once Read Many)
- Built-in versioning and soft delete

**Configuration for DFC**:
```
Storage Account Type: StorageV2 (general-purpose v2)
Replication: LRS (dev) / GRS (production)
Access Tier: Hot (frequently accessed documents)
Blob Type: Block Blobs
Enable Versioning: Yes
Enable Soft Delete: Yes (30-day retention)
Encryption: Azure Key Vault managed keys
```

**Django Integration**:
```python
# Already documented in AZURE_STORAGE_SETUP_GUIDE.md
# Uses django-storages with azure-storage-blob
STORAGES = {
    "default": {
        "BACKEND": "storages.backends.azure_storage.AzureStorage",
    },
}
```

**Estimated Monthly Cost**:
- Development: ~$5-15/month (100GB)
- Production: ~$50-200/month (1TB with redundancy)

---

### 2. Azure Database for PostgreSQL (Replace Self-Hosted PostgreSQL)

**Purpose**: Managed PostgreSQL database for metadata, user accounts, audit logs.

**Why Azure Database for PostgreSQL?**
- Fully managed with automatic backups
- Built-in high availability (99.99% SLA)
- Automatic patching and updates
- Point-in-time restore (up to 35 days)
- Advanced threat protection
- Transparent data encryption (TDE)
- Connection pooling with PgBouncer built-in

**Service Tiers**:

| Tier | Use Case | vCores | Storage | Price (est.) |
|------|----------|--------|---------|--------------|
| Burstable B1ms | Development | 1 | 32GB | ~$15/month |
| General Purpose D2s_v3 | Staging | 2 | 128GB | ~$100/month |
| Memory Optimized E4s_v3 | Production | 4 | 512GB | ~$300/month |

**Configuration for DFC**:
```
Server: dfc-postgres-server
Version: PostgreSQL 16
Compute: Burstable (dev) / General Purpose (prod)
Storage: 32GB (dev) / 512GB (prod)
Backup Retention: 7 days (dev) / 35 days (prod)
Geo-Redundant Backup: No (dev) / Yes (prod)
SSL Enforcement: Required
```

**Django Configuration**:
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('AZURE_POSTGRES_DB', 'dfc'),
        'USER': os.getenv('AZURE_POSTGRES_USER'),
        'PASSWORD': os.getenv('AZURE_POSTGRES_PASSWORD'),
        'HOST': os.getenv('AZURE_POSTGRES_HOST'),  # <server>.postgres.database.azure.com
        'PORT': '5432',
        'OPTIONS': {
            'sslmode': 'require',
        },
    }
}
```

---

### 3. Azure Cognitive Search (Replace Elasticsearch)

**Purpose**: Full-text search, document indexing, faceted navigation.

**Why Azure Cognitive Search?**
- Fully managed search-as-a-service
- Built-in AI enrichment (OCR, entity extraction, key phrase)
- Semantic search with natural language understanding
- Vector search for AI/ML use cases
- Built-in document cracking (PDF, Word, Excel, images)
- Integrated security with Azure AD
- No cluster management required

**Key Features for DFC**:
1. **Document Cracking**: Automatically extracts text from PDFs, Office docs, images
2. **AI Enrichment Pipeline**: OCR, language detection, entity recognition
3. **Faceted Search**: Filter by document_type, department, date, confidentiality
4. **Autocomplete & Suggestions**: Type-ahead search functionality
5. **Security Trimming**: Filter results based on user permissions

**Service Tiers**:

| Tier | Documents | Storage | Replicas | Price (est.) |
|------|-----------|---------|----------|--------------|
| Free | 10,000 | 50MB | 1 | $0 |
| Basic | 1 million | 2GB | 3 | ~$75/month |
| Standard S1 | 15 million | 160GB | 12 | ~$250/month |

**Index Schema for DFC Documents**:
```json
{
  "name": "dfc-documents",
  "fields": [
    {"name": "id", "type": "Edm.String", "key": true},
    {"name": "title", "type": "Edm.String", "searchable": true, "analyzer": "en.microsoft"},
    {"name": "content", "type": "Edm.String", "searchable": true, "analyzer": "en.microsoft"},
    {"name": "document_type", "type": "Edm.String", "filterable": true, "facetable": true},
    {"name": "department", "type": "Edm.String", "filterable": true, "facetable": true},
    {"name": "confidentiality_level", "type": "Edm.String", "filterable": true},
    {"name": "created_at", "type": "Edm.DateTimeOffset", "filterable": true, "sortable": true},
    {"name": "tags", "type": "Collection(Edm.String)", "filterable": true, "facetable": true},
    {"name": "owner_id", "type": "Edm.String", "filterable": true},
    {"name": "folder_path", "type": "Edm.String", "filterable": true}
  ]
}
```

**Django Integration**:
```python
# Install: pip install azure-search-documents
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential

class AzureSearchService:
    def __init__(self):
        self.client = SearchClient(
            endpoint=settings.AZURE_SEARCH_ENDPOINT,
            index_name="dfc-documents",
            credential=AzureKeyCredential(settings.AZURE_SEARCH_KEY)
        )

    def search_documents(self, query, filters=None, facets=None):
        results = self.client.search(
            search_text=query,
            filter=filters,
            facets=facets,
            highlight_fields="title,content",
            top=20
        )
        return results

    def index_document(self, document):
        self.client.upload_documents(documents=[document])
```

---

### 4. Azure Cache for Redis (Replace Self-Hosted Redis)

**Purpose**: Caching, session storage, Celery message broker.

**Why Azure Cache for Redis?**
- Fully managed Redis service
- Built-in high availability
- Data persistence options
- Geo-replication for disaster recovery
- Integration with Azure Private Link (secure access)

**Service Tiers**:

| Tier | Memory | Use Case | Price (est.) |
|------|--------|----------|--------------|
| Basic C0 | 250MB | Development | ~$16/month |
| Standard C1 | 1GB | Small production | ~$50/month |
| Premium P1 | 6GB | Large production with persistence | ~$225/month |

**Configuration**:
```python
# Django settings
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": f"rediss://{os.getenv('AZURE_REDIS_HOST')}:6380/0",
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "PASSWORD": os.getenv('AZURE_REDIS_KEY'),
            "SSL": True,
        }
    }
}

# Celery broker
CELERY_BROKER_URL = f"rediss://:{os.getenv('AZURE_REDIS_KEY')}@{os.getenv('AZURE_REDIS_HOST')}:6380/1?ssl_cert_reqs=required"
```

---

### 5. Azure Key Vault (Already Documented)

**Purpose**: Secure storage for secrets, encryption keys, and certificates.

**Use Cases for DFC**:
1. **Encryption Keys**: Customer-managed keys for Blob Storage encryption
2. **Database Credentials**: PostgreSQL connection strings
3. **API Keys**: Third-party service credentials
4. **JWT Secret Keys**: Token signing keys
5. **SSL Certificates**: HTTPS certificates

**Already documented in**: `docs/AZURE_STORAGE_SETUP_GUIDE.md`

---

## Tier 2: Infrastructure Services (Medium Priority)

### 6. Azure Kubernetes Service (AKS) - Replace Docker/Kubernetes

**Purpose**: Container orchestration for production deployment.

**Why AKS?**
- Managed Kubernetes control plane (free)
- Automatic upgrades and patching
- Integration with Azure Container Registry
- Built-in monitoring with Azure Monitor
- Horizontal Pod Autoscaler for DFC workloads

**Recommended Configuration**:
```yaml
Node Pools:
  - name: system
    vmSize: Standard_D2s_v3
    nodeCount: 2

  - name: application
    vmSize: Standard_D4s_v3
    nodeCount: 2-5 (autoscale)

  - name: workers
    vmSize: Standard_D2s_v3
    nodeCount: 1-3 (autoscale)
    # For Celery workers
```

**Cost Estimate**: ~$150-400/month (2-5 nodes)

### 7. Azure Container Registry (ACR)

**Purpose**: Store Docker images for DFC application.

**Features**:
- Private container registry
- Vulnerability scanning
- Geo-replication
- Integration with AKS

**Tiers**:

| Tier | Storage | Price (est.) |
|------|---------|--------------|
| Basic | 10GB | ~$5/month |
| Standard | 100GB | ~$20/month |
| Premium | 500GB | ~$50/month |

### 8. Azure Application Gateway

**Purpose**: Load balancing, SSL termination, WAF protection.

**Features**:
- Layer 7 load balancing
- SSL/TLS termination
- Web Application Firewall (WAF)
- URL-based routing
- Autoscaling

**Configuration for DFC**:
```
SKU: Standard_v2 or WAF_v2
Capacity: Autoscale (2-10 instances)
WAF Mode: Prevention
OWASP Rule Set: 3.2
Custom Rules:
  - Block SQL injection
  - Block XSS attempts
  - Rate limiting (1000 req/min per IP)
```

**Cost Estimate**: ~$100-300/month (with WAF)

---

## Tier 3: Monitoring & DevOps (Recommended)

### 9. Azure Monitor + Application Insights

**Purpose**: Replace Prometheus + Grafana + Sentry.

**Why Azure Monitor?**
- Unified monitoring platform
- Application Performance Management (APM)
- Custom dashboards and alerts
- Log analytics with KQL queries
- Error tracking and diagnostics

**Components**:

| Component | Replaces | Purpose |
|-----------|----------|---------|
| Application Insights | Sentry | Error tracking, APM |
| Log Analytics | ELK Stack | Log aggregation |
| Metrics | Prometheus | System metrics |
| Dashboards | Grafana | Visualization |

**Django Integration**:
```python
# Install: pip install opencensus-ext-django opencensus-ext-azure

MIDDLEWARE = [
    'opencensus.ext.django.middleware.OpencensusMiddleware',
    # ... other middleware
]

OPENCENSUS = {
    'TRACE': {
        'SAMPLER': 'opencensus.trace.samplers.ProbabilitySampler(rate=1)',
        'EXPORTER': '''opencensus.ext.azure.trace_exporter.AzureExporter(
            connection_string="InstrumentationKey=<your-key>"
        )''',
    }
}
```

**Cost Estimate**: ~$50-150/month (based on data ingestion)

### 10. Azure DevOps / GitHub Actions

**Purpose**: CI/CD pipeline for DFC application.

**Pipeline Stages**:
1. **Build**: Run tests, lint code, build Docker image
2. **Test**: Integration tests, security scans
3. **Deploy to Staging**: Automatic deployment
4. **Deploy to Production**: Manual approval gate

**Example GitHub Actions Workflow**:
```yaml
name: DFC CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Tests
        run: |
          pip install -r requirements.txt
          python manage.py test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Build and Push to ACR
        uses: azure/docker-login@v1
        with:
          login-server: dfcregistry.azurecr.io
          username: ${{ secrets.ACR_USERNAME }}
          password: ${{ secrets.ACR_PASSWORD }}
      - run: |
          docker build -t dfcregistry.azurecr.io/dfc-backend:${{ github.sha }} .
          docker push dfcregistry.azurecr.io/dfc-backend:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to AKS
        uses: azure/k8s-deploy@v1
        with:
          manifests: k8s/
          images: dfcregistry.azurecr.io/dfc-backend:${{ github.sha }}
```

---

## Tier 4: Advanced Features (Optional)

### 11. Azure Functions (Enhance Celery Tasks)

**Purpose**: Serverless execution for specific workloads.

**Use Cases for DFC**:
1. **Document Processing**: OCR, text extraction (triggered by Blob upload)
2. **Thumbnail Generation**: Create previews for uploaded documents
3. **Email Notifications**: Send retention policy alerts
4. **Scheduled Tasks**: Daily retention policy checks

**Example - OCR Processing Function**:
```python
import azure.functions as func
from azure.cognitiveservices.vision.computervision import ComputerVisionClient

def main(myblob: func.InputStream):
    """Process uploaded document with OCR"""
    # Triggered when new blob is uploaded
    document_content = myblob.read()

    # Extract text using Azure Computer Vision
    cv_client = ComputerVisionClient(endpoint, credentials)
    result = cv_client.read(document_content)

    # Store extracted text back to database
    save_extracted_text(myblob.name, result.text)
```

**Cost**: Pay-per-execution (~$0.20 per million executions)

### 12. Azure Cognitive Services

**Purpose**: AI-powered document processing.

**Services Relevant to DFC**:

| Service | Purpose | Price |
|---------|---------|-------|
| Computer Vision | OCR for scanned documents | ~$1 per 1000 images |
| Form Recognizer | Extract structured data from forms | ~$1.50 per 1000 pages |
| Text Analytics | Key phrase extraction, sentiment | ~$1 per 1000 records |
| Translator | Multi-language support | ~$10 per million characters |

**Form Recognizer for DFC**:
- Auto-extract data from invoices, receipts, contracts
- Pre-built models for common document types
- Custom models for organization-specific forms

### 13. Azure Active Directory B2C

**Purpose**: Enhanced authentication and identity management.

**Features**:
- Multi-factor authentication (built-in)
- Social identity providers (if needed)
- Custom branding for login pages
- Password policies
- Account lockout protection

**Integration with Django**:
```python
# Install: pip install msal django-auth-adfs

AUTHENTICATION_BACKENDS = [
    'django_auth_adfs.backend.AdfsAuthCodeBackend',
    'django.contrib.auth.backends.ModelBackend',
]

AUTH_ADFS = {
    'AUDIENCE': '<Application ID>',
    'CLIENT_ID': '<Application ID>',
    'CLIENT_SECRET': '<Client Secret>',
    'TENANT_ID': '<Tenant ID>',
    'RELYING_PARTY_ID': '<Application ID>',
}
```

---

## Cost Summary

### Development Environment (Monthly)
| Service | Estimated Cost |
|---------|---------------|
| Blob Storage (100GB) | $5 |
| PostgreSQL (Burstable) | $15 |
| Cognitive Search (Free) | $0 |
| Redis (Basic) | $16 |
| Key Vault | $3 |
| **Total** | **~$39/month** |

### Production Environment (Monthly)
| Service | Estimated Cost |
|---------|---------------|
| Blob Storage (1TB, GRS) | $50 |
| PostgreSQL (General Purpose) | $150 |
| Cognitive Search (Basic) | $75 |
| Redis (Standard) | $50 |
| Key Vault | $10 |
| AKS (3 nodes) | $200 |
| Application Gateway (WAF) | $150 |
| Application Insights | $75 |
| Container Registry | $20 |
| **Total** | **~$780/month** |

*Note: Costs are estimates and may vary based on usage and region.*

---

## Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1-2)
1. ✅ Azure Blob Storage + Key Vault (already documented)
2. Azure Database for PostgreSQL
3. Azure Cache for Redis

### Phase 2: Search & Monitoring (Week 3-4)
1. Azure Cognitive Search
2. Azure Application Insights
3. Migrate from Elasticsearch

### Phase 3: Container Infrastructure (Week 5-6)
1. Azure Container Registry
2. Azure Kubernetes Service
3. CI/CD Pipeline setup

### Phase 4: Advanced Features (Week 7-8)
1. Azure Application Gateway + WAF
2. Azure Functions for background tasks
3. Azure Cognitive Services integration

---

## Security Best Practices

1. **Network Security**
   - Use Virtual Networks (VNet) for all services
   - Private Endpoints for database and storage
   - Network Security Groups (NSG) for traffic control

2. **Identity & Access**
   - Managed Identities for service-to-service auth
   - Azure AD integration for user authentication
   - RBAC for Azure resource access

3. **Data Protection**
   - Customer-managed keys in Key Vault
   - TLS 1.2+ for all connections
   - Transparent Data Encryption (TDE) for databases

4. **Compliance**
   - Azure Policy for compliance enforcement
   - Azure Security Center for security posture
   - Regular security assessments

---

## Next Steps

1. **Review this proposal** and identify priority services
2. **Complete Azure account setup** (if not done)
3. **Follow AZURE_STORAGE_SETUP_GUIDE.md** for Blob Storage + Key Vault
4. **Create Azure resources** in development environment
5. **Migrate one service at a time** starting with storage
6. **Test thoroughly** before moving to production

---

## References

- [Azure Blob Storage Documentation](https://docs.microsoft.com/azure/storage/blobs/)
- [Azure Database for PostgreSQL](https://docs.microsoft.com/azure/postgresql/)
- [Azure Cognitive Search](https://docs.microsoft.com/azure/search/)
- [Azure Kubernetes Service](https://docs.microsoft.com/azure/aks/)
- [Azure Monitor](https://docs.microsoft.com/azure/azure-monitor/)
- [Azure Pricing Calculator](https://azure.microsoft.com/pricing/calculator/)

---

**Document Version**: 1.0
**Created**: 2025-11-25
**Author**: Claude Code Assistant
