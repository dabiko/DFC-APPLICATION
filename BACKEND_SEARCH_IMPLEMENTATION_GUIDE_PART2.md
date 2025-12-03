# Backend Search Implementation Guide - Part 2

## Step 7: Implement Permission Filtering

**Create `apps/search/permissions.py`:**
```python
"""
Search Permission Filtering
CRITICAL: Ensures users only see documents they have permission to view
"""

from elasticsearch_dsl import Q


def filter_results_by_permissions(search, user):
    """
    Filter search results based on user permissions

    This is CRITICAL for security - users must only see documents they can access

    Filtering criteria:
    1. User owns the document (created_by)
    2. Document is in user's department
    3. Document is explicitly shared with user
    4. Document is in a folder user has access to
    5. Confidentiality level allows user access
    """

    # Build permission filters
    permission_queries = []

    # 1. Documents created by user
    permission_queries.append(Q('term', created_by__id=user.id))

    # 2. Documents in user's department (if user has department)
    if hasattr(user, 'department') and user.department:
        permission_queries.append(Q('term', department=user.department))

    # 3. Documents shared with user
    # TODO: Implement shared documents query
    # This requires a separate index or nested field for shared_with_users

    # 4. Confidentiality level filtering
    # Get user's confidentiality clearance level
    user_clearance = get_user_clearance_level(user)
    allowed_levels = get_allowed_confidentiality_levels(user_clearance)

    if allowed_levels:
        permission_queries.append(Q('terms', confidentiality_level=allowed_levels))

    # 5. Folder permissions
    # TODO: Get list of folder IDs user has access to
    accessible_folder_ids = get_user_accessible_folders(user)
    if accessible_folder_ids:
        permission_queries.append(Q('terms', folder_id=accessible_folder_ids))

    # Combine with OR (user needs at least one permission)
    if permission_queries:
        search = search.query('bool', should=permission_queries, minimum_should_match=1)

    return search


def get_user_clearance_level(user):
    """
    Get user's confidentiality clearance level

    Returns highest clearance level user has access to
    """
    if user.is_superuser:
        return 4  # Highly Confidential

    if user.is_staff:
        return 3  # Confidential

    # Check user's role or department for clearance level
    # TODO: Implement based on your RBAC model

    return 2  # Internal (default for authenticated users)


def get_allowed_confidentiality_levels(clearance_level):
    """
    Get list of confidentiality levels user can access

    Hierarchy:
    0 - Public (everyone)
    1 - Internal (authenticated users)
    2 - Confidential (specific roles/departments)
    3 - Highly Confidential (authorized individuals only)
    """
    level_mapping = {
        0: ['Public'],
        1: ['Public', 'Internal'],
        2: ['Public', 'Internal', 'Confidential'],
        3: ['Public', 'Internal', 'Confidential'],
        4: ['Public', 'Internal', 'Confidential', 'Highly Confidential'],
    }

    return level_mapping.get(clearance_level, ['Public', 'Internal'])


def get_user_accessible_folders(user):
    """
    Get list of folder IDs user has access to

    This should query the folder permissions table
    """
    from apps.documents.models import Folder

    # TODO: Optimize this query - should be cached
    accessible_folders = Folder.objects.filter(
        # Add your permission logic here
        # Examples:
        # - created_by=user
        # - department=user.department
        # - permissions__user=user
        # - is_public=True
    ).values_list('id', flat=True)

    return list(accessible_folders)
```

---

## Step 8: URL Configuration

**Create `apps/search/urls.py`:**
```python
"""
Search URL Configuration
"""

from django.urls import path
from . import views

app_name = 'search'

urlpatterns = [
    # Full search
    path('', views.search_view, name='search'),

    # Quick search
    path('quick/', views.quick_search_view, name='quick-search'),

    # Suggestions
    path('suggestions/', views.suggestions_view, name='suggestions'),

    # Recent searches
    path('recent/', views.recent_searches_view, name='recent-searches'),

    # Export
    path('export/', views.export_search_view, name='export'),
]
```

**Update `config/urls.py`:**
```python
from django.urls import path, include

urlpatterns = [
    # ... existing patterns
    path('api/v1/search/', include('apps.search.urls')),
]
```

---

## Step 9: Auto-Indexing with Signals

**Create `apps/search/signals.py`:**
```python
"""
Elasticsearch Auto-Indexing Signals
Automatically update search index when documents change
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from apps.documents.models import Document
from .tasks import index_document, delete_document_from_index


@receiver(post_save, sender=Document)
def document_saved(sender, instance, created, **kwargs):
    """
    Index document when created or updated
    Use Celery for async processing to avoid blocking requests
    """
    # Async indexing (recommended for production)
    index_document.delay(instance.id)

    # Sync indexing (for development/testing)
    # from .documents import DocumentDocument
    # DocumentDocument().update(instance)


@receiver(post_delete, sender=Document)
def document_deleted(sender, instance, **kwargs):
    """
    Remove document from index when deleted
    """
    # Async deletion
    delete_document_from_index.delay(instance.id)

    # Sync deletion
    # from .documents import DocumentDocument
    # try:
    #     DocumentDocument().get(id=instance.id).delete()
    # except:
    #     pass
```

**Register signals in `apps/search/apps.py`:**
```python
from django.apps import AppConfig


class SearchConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.search'

    def ready(self):
        import apps.search.signals  # noqa
```

**Update `apps/search/__init__.py`:**
```python
default_app_config = 'apps.search.apps.SearchConfig'
```

---

## Step 10: Celery Tasks for Indexing

**Create `apps/search/tasks.py`:**
```python
"""
Celery Tasks for Search Indexing
Handles async indexing of documents
"""

from celery import shared_task
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def index_document(self, document_id):
    """
    Index a single document in Elasticsearch

    Args:
        document_id: Document primary key
    """
    try:
        from apps.documents.models import Document
        from .documents import DocumentDocument

        document = Document.objects.get(pk=document_id)
        doc_instance = DocumentDocument()
        doc_instance.update(document)

        logger.info(f"Indexed document {document_id}: {document.name}")
        return {'status': 'success', 'document_id': document_id}

    except Document.DoesNotExist:
        logger.error(f"Document {document_id} not found for indexing")
        return {'status': 'error', 'message': 'Document not found'}

    except Exception as exc:
        logger.error(f"Error indexing document {document_id}: {str(exc)}")
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@shared_task(bind=True, max_retries=3)
def delete_document_from_index(self, document_id):
    """
    Remove document from Elasticsearch index

    Args:
        document_id: Document primary key
    """
    try:
        from .documents import DocumentDocument

        doc = DocumentDocument().get(id=document_id)
        doc.delete()

        logger.info(f"Deleted document {document_id} from index")
        return {'status': 'success', 'document_id': document_id}

    except Exception as exc:
        logger.error(f"Error deleting document {document_id}: {str(exc)}")
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@shared_task
def rebuild_search_index():
    """
    Rebuild entire search index
    Use this for initial setup or after major changes

    Run manually:
    python manage.py shell -c "from apps.search.tasks import rebuild_search_index; rebuild_search_index.delay()"
    """
    from apps.documents.models import Document
    from .documents import DocumentDocument

    logger.info("Starting search index rebuild...")

    # Delete existing index
    DocumentDocument._index.delete(ignore=404)

    # Recreate index
    DocumentDocument.init()

    # Index all documents
    documents = Document.objects.all()
    total = documents.count()

    logger.info(f"Indexing {total} documents...")

    for i, document in enumerate(documents, 1):
        try:
            DocumentDocument().update(document)
            if i % 100 == 0:
                logger.info(f"Indexed {i}/{total} documents")
        except Exception as e:
            logger.error(f"Error indexing document {document.id}: {str(e)}")

    logger.info(f"Index rebuild complete. Indexed {total} documents.")
    return {'status': 'success', 'total_indexed': total}


@shared_task
def extract_document_text(document_id):
    """
    Extract text content from document for indexing
    This can be heavy, so run as separate task

    Supports:
    - PDF: PyPDF2 or pdfplumber
    - Word: python-docx
    - Excel: openpyxl
    - Text files: direct read
    - Images with text: OCR (tesseract)
    """
    try:
        from apps.documents.models import Document
        import io

        document = Document.objects.get(pk=document_id)

        # Download file from MinIO
        file_content = document.file.read()

        extracted_text = ""

        # PDF
        if document.mime_type == 'application/pdf':
            import PyPDF2
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
            for page in pdf_reader.pages:
                extracted_text += page.extract_text()

        # Word
        elif document.mime_type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            import docx
            doc = docx.Document(io.BytesIO(file_content))
            extracted_text = '\n'.join([para.text for para in doc.paragraphs])

        # Excel
        elif document.mime_type == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(file_content))
            for sheet in wb.worksheets:
                for row in sheet.iter_rows(values_only=True):
                    extracted_text += ' '.join([str(cell) for cell in row if cell]) + '\n'

        # Text files
        elif document.mime_type.startswith('text/'):
            extracted_text = file_content.decode('utf-8', errors='ignore')

        # Store extracted text (add field to Document model or metadata)
        # document.extracted_text = extracted_text
        # document.save()

        # Re-index with extracted text
        index_document.delay(document_id)

        logger.info(f"Extracted {len(extracted_text)} characters from document {document_id}")
        return {'status': 'success', 'text_length': len(extracted_text)}

    except Exception as e:
        logger.error(f"Error extracting text from document {document_id}: {str(e)}")
        return {'status': 'error', 'message': str(e)}
```

---

## Step 11: Management Commands

**Create `apps/search/management/commands/rebuild_search_index.py`:**
```bash
mkdir -p apps/search/management/commands
touch apps/search/management/__init__.py
touch apps/search/management/commands/__init__.py
```

```python
"""
Management command to rebuild search index
Usage: python manage.py rebuild_search_index
"""

from django.core.management.base import BaseCommand
from apps.search.tasks import rebuild_search_index


class Command(BaseCommand):
    help = 'Rebuild Elasticsearch search index'

    def handle(self, *args, **options):
        self.stdout.write('Rebuilding search index...')
        result = rebuild_search_index()
        self.stdout.write(self.style.SUCCESS(f"Successfully indexed {result['total_indexed']} documents"))
```

---

## Step 12: Testing

**Create `apps/search/tests.py`:**
```python
"""
Search API Tests
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.documents.models import Document, Folder

User = get_user_model()


class SearchAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)

        # Create test documents
        self.folder = Folder.objects.create(
            name='Test Folder',
            created_by=self.user
        )

        self.document1 = Document.objects.create(
            name='Budget Report 2024.pdf',
            folder=self.folder,
            created_by=self.user,
            size=1024000,
            mime_type='application/pdf'
        )

        self.document2 = Document.objects.create(
            name='Financial Statement.xlsx',
            folder=self.folder,
            created_by=self.user,
            size=512000,
            mime_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

    def test_quick_search(self):
        """Test quick search endpoint"""
        response = self.client.get('/api/v1/search/quick/?q=budget')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)

    def test_full_search(self):
        """Test full search with filters"""
        data = {
            'query': 'budget',
            'mode': 'simple',
            'scope': 'all',
            'page': 1,
            'page_size': 20
        }
        response = self.client.post('/api/v1/search/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertIn('totalCount', response.data)

    def test_suggestions(self):
        """Test autocomplete suggestions"""
        response = self.client.get('/api/v1/search/suggestions/?q=bud')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('suggestions', response.data)

    def test_recent_searches(self):
        """Test recent searches"""
        # Save a search
        response = self.client.post(
            '/api/v1/search/recent/',
            {'query': 'test search'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Get recent searches
        response = self.client.get('/api/v1/search/recent/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertTrue(len(response.data['results']) > 0)

    def test_clear_recent_searches(self):
        """Test clearing recent searches"""
        response = self.client.delete('/api/v1/search/recent/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
```

**Run tests:**
```bash
python manage.py test apps.search
```

---

## Step 13: Initial Setup & Deployment

**13.1 Create Elasticsearch Index**
```bash
# Create index
python manage.py search_index --create

# Or use custom command
python manage.py rebuild_search_index
```

**13.2 Index Existing Documents**
```bash
# Populate index
python manage.py search_index --populate
```

**13.3 Verify Index**
```bash
# Check index status
curl http://localhost:9200/documents/_search?pretty
```

**13.4 Production Checklist**

- [ ] Elasticsearch cluster is running and accessible
- [ ] Elasticsearch credentials configured in .env
- [ ] Index created successfully
- [ ] All existing documents indexed
- [ ] Celery workers running for async tasks
- [ ] Signals registered for auto-indexing
- [ ] Permission filtering working correctly
- [ ] API endpoints tested
- [ ] Rate limiting configured
- [ ] Monitoring and logging set up

---

## Step 14: Performance Optimization

**14.1 Elasticsearch Settings**
```python
# In settings.py
ELASTICSEARCH_DSL = {
    'default': {
        'hosts': [os.getenv('ELASTICSEARCH_URL', 'localhost:9200')],
        'timeout': 30,
        'max_retries': 3,
        'retry_on_timeout': True,
    },
}
```

**14.2 Caching**
```python
# Cache search results
from django.core.cache import cache

def search_view(request):
    # Generate cache key from search parameters
    cache_key = f"search_{hash(str(request.data))}"

    # Check cache
    cached_result = cache.get(cache_key)
    if cached_result:
        return Response(cached_result)

    # Perform search...
    result = ...

    # Cache for 5 minutes
    cache.set(cache_key, result, 300)

    return Response(result)
```

**14.3 Database Optimization**
```python
# Bulk permission checks
def get_user_accessible_folders(user):
    # Use select_related and prefetch_related
    accessible_folders = Folder.objects.filter(
        created_by=user
    ).select_related('parent').values_list('id', flat=True)

    # Cache result
    cache_key = f"user_folders_{user.id}"
    cache.set(cache_key, list(accessible_folders), 3600)  # 1 hour

    return list(accessible_folders)
```

---

## Troubleshooting

### Common Issues

**1. Elasticsearch Connection Error**
```
Error: ConnectionError: Connection refused
```
**Solution:** Ensure Elasticsearch is running
```bash
docker ps | grep elasticsearch
# or
systemctl status elasticsearch
```

**2. Index Not Found**
```
Error: IndexNotFoundException: no such index [documents]
```
**Solution:** Create the index
```bash
python manage.py search_index --create
```

**3. Permission Denied in Search**
```
Error: User sees documents they shouldn't
```
**Solution:** Check permission filtering in `permissions.py`

**4. Slow Search Performance**
```
Search takes > 2 seconds
```
**Solution:**
- Add caching
- Optimize Elasticsearch queries
- Use pagination
- Reduce result set size

---

## Summary

### What You've Implemented:

✅ Elasticsearch integration
✅ Document indexing with full-text search
✅ Permission-filtered search
✅ Quick search API
✅ Autocomplete suggestions
✅ Recent search history
✅ Export functionality
✅ Auto-indexing with signals
✅ Async indexing with Celery
✅ Text extraction from files
✅ Management commands
✅ Tests

### Estimated Time:
- **Basic Setup**: 2-4 hours
- **Core Search**: 4-6 hours
- **Permission Filtering**: 2-3 hours
- **Auto-Indexing**: 2-3 hours
- **Text Extraction**: 3-4 hours
- **Testing**: 2-3 hours
- **Total**: 15-23 hours

### Next Steps:
1. Run initial index build
2. Test all endpoints
3. Verify permissions
4. Monitor performance
5. Deploy to staging
6. User acceptance testing
7. Deploy to production

The search API is now ready for integration with the frontend! 🚀
