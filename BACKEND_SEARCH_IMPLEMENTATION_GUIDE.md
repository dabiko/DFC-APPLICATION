# Backend Search Implementation Guide

## Overview
This guide provides step-by-step instructions to implement the Search API endpoints for the Digital Filing Cabinet application.

## Prerequisites

**Required:**
- Django 4.2+
- Django REST Framework
- Elasticsearch 8.x or OpenSearch 2.x
- PostgreSQL (already set up)
- Celery (for async indexing)

**Install Required Packages:**
```bash
pip install elasticsearch==8.11.0
pip install django-elasticsearch-dsl==8.0
pip install django-elasticsearch-dsl-drf==0.22.5
```

---

## Implementation Steps

### Step 1: Configure Elasticsearch

**1.1 Install Elasticsearch (if not already installed)**

**Option A: Docker (Recommended for Development)**
```bash
docker run -d \
  --name elasticsearch \
  -p 9200:9200 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  elasticsearch:8.11.0
```

**Option B: Direct Installation**
- Download from: https://www.elastic.co/downloads/elasticsearch
- Follow installation guide for your OS

**1.2 Add Elasticsearch Configuration to Django**

Edit `config/settings.py`:
```python
# Elasticsearch Configuration
ELASTICSEARCH_DSL = {
    'default': {
        'hosts': os.getenv('ELASTICSEARCH_URL', 'localhost:9200'),
        'timeout': 30,
    },
}

# Search Settings
SEARCH_RESULTS_PER_PAGE = 20
SEARCH_QUICK_RESULTS_LIMIT = 10
SEARCH_SUGGESTIONS_LIMIT = 10
SEARCH_RECENT_SEARCHES_LIMIT = 20
```

**1.3 Add to .env file**
```env
ELASTICSEARCH_URL=localhost:9200
```

---

### Step 2: Create Search App

**2.1 Create Django App**
```bash
cd dfc_backend
python manage.py startapp search
```

**2.2 Add to INSTALLED_APPS in settings.py**
```python
INSTALLED_APPS = [
    # ... existing apps
    'django_elasticsearch_dsl',
    'django_elasticsearch_dsl_drf',
    'apps.search',
]
```

**2.3 Create App Structure**
```
apps/search/
├── __init__.py
├── models.py          # RecentSearch model
├── documents.py       # Elasticsearch document definitions
├── serializers.py     # API serializers
├── views.py           # API views
├── urls.py            # URL routing
├── signals.py         # Auto-indexing signals
├── tasks.py           # Celery tasks for indexing
└── permissions.py     # Permission filtering
```

---

### Step 3: Define Elasticsearch Document Schema

**Create `apps/search/documents.py`:**
```python
"""
Elasticsearch Document Definitions
Maps Document model to Elasticsearch index
"""

from django_elasticsearch_dsl import Document, fields
from django_elasticsearch_dsl.registries import registry
from apps.documents.models import Document as DocumentModel


@registry.register_document
class DocumentDocument(Document):
    """
    Elasticsearch document for Document model
    Indexes all searchable fields
    """

    # File fields
    file_name = fields.TextField(
        attr='name',
        fields={
            'keyword': fields.KeywordField(),
            'suggest': fields.CompletionField(),
        }
    )
    file_path = fields.TextField(attr='get_full_path')
    file_content = fields.TextField()  # Extracted text content

    # Metadata fields
    title = fields.TextField(
        fields={'keyword': fields.KeywordField()}
    )
    document_type = fields.KeywordField(attr='metadata.document_type')
    identifier = fields.KeywordField(attr='metadata.identifier')
    tags = fields.KeywordField(attr='metadata.keywords', multi=True)

    # User fields
    created_by = fields.ObjectField(
        properties={
            'id': fields.IntegerField(),
            'username': fields.KeywordField(),
            'full_name': fields.TextField(),
        }
    )
    modified_by = fields.ObjectField(
        properties={
            'id': fields.IntegerField(),
            'username': fields.KeywordField(),
            'full_name': fields.TextField(),
        }
    )

    # Dates
    created_at = fields.DateField()
    modified_at = fields.DateField()
    document_date = fields.DateField(attr='metadata.date')

    # Folder/Department
    folder_id = fields.IntegerField(attr='folder.id')
    folder_path = fields.TextField(attr='folder.get_full_path')
    department = fields.KeywordField(attr='metadata.department')

    # Access control
    confidentiality_level = fields.KeywordField(attr='metadata.confidentiality_level')
    is_shared = fields.BooleanField()
    is_locked = fields.BooleanField(attr='is_locked')

    # File properties
    file_size = fields.LongField(attr='size')
    mime_type = fields.KeywordField(attr='mime_type')
    extension = fields.KeywordField()

    # Version info
    has_versions = fields.BooleanField()
    current_version = fields.IntegerField()

    class Index:
        name = 'documents'
        settings = {
            'number_of_shards': 1,
            'number_of_replicas': 0,
            'analysis': {
                'analyzer': {
                    'custom_analyzer': {
                        'type': 'custom',
                        'tokenizer': 'standard',
                        'filter': ['lowercase', 'asciifolding'],
                    }
                }
            }
        }

    class Django:
        model = DocumentModel
        fields = []  # We define fields manually above
        related_models = ['folder', 'created_by', 'modified_by']

    def get_instances_from_related(self, related_instance):
        """
        Update index when related models change
        """
        if isinstance(related_instance, related_instance.__class__):
            return related_instance.document_set.all()
        return []

    def prepare_file_content(self, instance):
        """
        Extract text content from file for indexing
        This should be done asynchronously for large files
        """
        # TODO: Implement text extraction
        # For now, return empty string
        # In production, use Celery task to extract text
        return instance.extract_text_content() if hasattr(instance, 'extract_text_content') else ''

    def prepare_extension(self, instance):
        """
        Get file extension
        """
        return instance.name.split('.')[-1].lower() if '.' in instance.name else ''

    def prepare_has_versions(self, instance):
        """
        Check if document has versions
        """
        return instance.versions.exists() if hasattr(instance, 'versions') else False

    def prepare_current_version(self, instance):
        """
        Get current version number
        """
        return instance.versions.count() if hasattr(instance, 'versions') else 1
```

---

### Step 4: Create RecentSearch Model

**Edit `apps/search/models.py`:**
```python
"""
Search Models
Stores user search history
"""

from django.db import models
from django.conf import settings


class RecentSearch(models.Model):
    """
    Stores recent searches for each user
    Used for autocomplete and search history
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='recent_searches'
    )
    query = models.CharField(max_length=500)
    executed_at = models.DateTimeField(auto_now_add=True)
    result_count = models.IntegerField(default=0)

    class Meta:
        db_table = 'search_recent_searches'
        ordering = ['-executed_at']
        indexes = [
            models.Index(fields=['user', '-executed_at']),
        ]
        verbose_name = 'Recent Search'
        verbose_name_plural = 'Recent Searches'

    def __str__(self):
        return f"{self.user.username}: {self.query}"
```

**Create and run migration:**
```bash
python manage.py makemigrations search
python manage.py migrate search
```

---

### Step 5: Create Serializers

**Create `apps/search/serializers.py`:**
```python
"""
Search API Serializers
"""

from rest_framework import serializers
from apps.documents.models import Document
from .models import RecentSearch


class SearchHighlightMatchSerializer(serializers.Serializer):
    """Match snippet in highlight"""
    text = serializers.CharField()
    isMatch = serializers.BooleanField()


class SearchHighlightSerializer(serializers.Serializer):
    """Highlight snippet for search result"""
    field = serializers.CharField()
    snippet = serializers.CharField()
    matches = SearchHighlightMatchSerializer(many=True)


class SearchResultPermissionsSerializer(serializers.Serializer):
    """Document permissions for search result"""
    canView = serializers.BooleanField()
    canEdit = serializers.BooleanField()
    canDelete = serializers.BooleanField()
    canDownload = serializers.BooleanField()
    canShare = serializers.BooleanField()


class SearchResultSerializer(serializers.Serializer):
    """
    Search Result Serializer
    Matches frontend SearchResult type
    """
    id = serializers.CharField()
    documentId = serializers.CharField(source='meta.id')
    fileName = serializers.CharField(source='file_name')
    filePath = serializers.CharField(source='file_path')
    fileSize = serializers.IntegerField(source='file_size')
    mimeType = serializers.CharField(source='mime_type')
    extension = serializers.CharField()
    score = serializers.FloatField(source='meta.score')
    highlights = SearchHighlightSerializer(many=True, required=False)
    thumbnailUrl = serializers.CharField(required=False, allow_null=True)
    createdAt = serializers.DateTimeField(source='created_at')
    modifiedAt = serializers.DateTimeField(source='modified_at')
    createdBy = serializers.CharField(source='created_by.full_name')
    modifiedBy = serializers.CharField(source='modified_by.full_name')
    confidentialityLevel = serializers.CharField(source='confidentiality_level')
    isShared = serializers.BooleanField(source='is_shared')
    isLocked = serializers.BooleanField(source='is_locked')
    hasVersions = serializers.BooleanField(source='has_versions')
    currentVersion = serializers.IntegerField(source='current_version')
    permissions = SearchResultPermissionsSerializer()


class SearchRequestSerializer(serializers.Serializer):
    """
    Search Request Serializer
    Validates search parameters
    """
    query = serializers.CharField(required=True)
    mode = serializers.ChoiceField(
        choices=['simple', 'advanced', 'saved'],
        default='simple'
    )
    scope = serializers.ChoiceField(
        choices=['all', 'folder', 'department'],
        default='all'
    )
    folder_id = serializers.IntegerField(required=False, allow_null=True)
    department_id = serializers.CharField(required=False, allow_null=True)

    # Filters
    filters = serializers.JSONField(required=False, default=dict)

    # Sorting
    sort_by = serializers.ChoiceField(
        choices=['relevance', 'name', 'date', 'size', 'modified'],
        default='relevance'
    )
    sort_order = serializers.ChoiceField(
        choices=['asc', 'desc'],
        default='desc'
    )

    # Pagination
    page = serializers.IntegerField(default=1, min_value=1)
    page_size = serializers.IntegerField(default=20, min_value=1, max_value=100)


class SearchResponseSerializer(serializers.Serializer):
    """Search Response with results and metadata"""
    results = SearchResultSerializer(many=True)
    totalCount = serializers.IntegerField(source='total_count')
    page = serializers.IntegerField()
    pageSize = serializers.IntegerField(source='page_size')
    totalPages = serializers.IntegerField(source='total_pages')
    facets = serializers.JSONField(required=False)


class SearchSuggestionSerializer(serializers.Serializer):
    """Autocomplete suggestion"""
    text = serializers.CharField()
    type = serializers.ChoiceField(
        choices=['keyword', 'document', 'tag', 'department', 'user']
    )
    score = serializers.FloatField()
    metadata = serializers.JSONField()


class RecentSearchSerializer(serializers.ModelSerializer):
    """Recent search history item"""
    id = serializers.CharField(source='pk')
    query = serializers.CharField()
    executedAt = serializers.DateTimeField(source='executed_at')
    resultCount = serializers.IntegerField(source='result_count')

    class Meta:
        model = RecentSearch
        fields = ['id', 'query', 'executedAt', 'resultCount']


class SaveRecentSearchSerializer(serializers.Serializer):
    """Save recent search request"""
    query = serializers.CharField(max_length=500)
```

---

### Step 6: Implement Search Views

**Create `apps/search/views.py`:**
```python
"""
Search API Views
Implements all search endpoints
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from elasticsearch_dsl import Q, Search
from django.conf import settings
from django.http import HttpResponse
import csv

from .documents import DocumentDocument
from .models import RecentSearch
from .serializers import (
    SearchRequestSerializer,
    SearchResponseSerializer,
    SearchResultSerializer,
    SearchSuggestionSerializer,
    RecentSearchSerializer,
    SaveRecentSearchSerializer,
)
from .permissions import filter_results_by_permissions


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def search_view(request):
    """
    Full search with filters, sorting, and pagination
    POST /api/v1/search/
    """
    serializer = SearchRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    # Build Elasticsearch query
    search = DocumentDocument.search()

    # Query string
    if data['query']:
        search = search.query(
            'multi_match',
            query=data['query'],
            fields=[
                'file_name^3',      # Highest weight for filename
                'title^2',          # High weight for title
                'tags^2',           # High weight for tags
                'file_content',     # Content search
                'identifier',
            ],
            fuzziness='AUTO',
        )

    # Apply filters
    filters = data.get('filters', {})

    if filters.get('documentTypes'):
        search = search.filter('terms', document_type=filters['documentTypes'])

    if filters.get('confidentialityLevels'):
        search = search.filter('terms', confidentiality_level=filters['confidentialityLevels'])

    if filters.get('departments'):
        search = search.filter('terms', department=filters['departments'])

    if filters.get('tags'):
        search = search.filter('terms', tags=filters['tags'])

    if filters.get('dateRange'):
        search = search.filter(
            'range',
            document_date={
                'gte': filters['dateRange'].get('from'),
                'lte': filters['dateRange'].get('to'),
            }
        )

    if filters.get('createdDateRange'):
        search = search.filter(
            'range',
            created_at={
                'gte': filters['createdDateRange'].get('from'),
                'lte': filters['createdDateRange'].get('to'),
            }
        )

    if filters.get('modifiedDateRange'):
        search = search.filter(
            'range',
            modified_at={
                'gte': filters['modifiedDateRange'].get('from'),
                'lte': filters['modifiedDateRange'].get('to'),
            }
        )

    if filters.get('fileSize'):
        search = search.filter(
            'range',
            file_size={
                'gte': filters['fileSize'].get('min', 0),
                'lte': filters['fileSize'].get('max'),
            }
        )

    if filters.get('isShared') is not None:
        search = search.filter('term', is_shared=filters['isShared'])

    if filters.get('isLocked') is not None:
        search = search.filter('term', is_locked=filters['isLocked'])

    # Scope filtering
    if data['scope'] == 'folder' and data.get('folder_id'):
        search = search.filter('term', folder_id=data['folder_id'])

    if data['scope'] == 'department' and data.get('department_id'):
        search = search.filter('term', department=data['department_id'])

    # Permission filtering (CRITICAL - users should only see documents they can access)
    search = filter_results_by_permissions(search, request.user)

    # Sorting
    if data['sort_by'] == 'name':
        search = search.sort(f"file_name.keyword:{data['sort_order']}")
    elif data['sort_by'] == 'date':
        search = search.sort(f"document_date:{data['sort_order']}")
    elif data['sort_by'] == 'size':
        search = search.sort(f"file_size:{data['sort_order']}")
    elif data['sort_by'] == 'modified':
        search = search.sort(f"modified_at:{data['sort_order']}")
    # Relevance (default) - no explicit sort, uses score

    # Highlighting
    search = search.highlight('file_name', 'title', 'file_content', 'tags')
    search = search.highlight_options(
        pre_tags=['<mark>'],
        post_tags=['</mark>'],
        fragment_size=150,
        number_of_fragments=3,
    )

    # Pagination
    page = data['page']
    page_size = data['page_size']
    start = (page - 1) * page_size
    search = search[start:start + page_size]

    # Execute search
    response = search.execute()

    # Build results
    results = []
    for hit in response.hits:
        # Build highlights
        highlights = []
        if hasattr(hit.meta, 'highlight'):
            for field, snippets in hit.meta.highlight.to_dict().items():
                for snippet in snippets:
                    # Parse highlight matches
                    matches = []
                    # Simple parsing - split by <mark> tags
                    # TODO: Improve parsing logic
                    matches.append({
                        'text': snippet.replace('<mark>', '').replace('</mark>', ''),
                        'isMatch': '<mark>' in snippet
                    })

                    highlights.append({
                        'field': field,
                        'snippet': snippet.replace('<mark>', '').replace('</mark>', ''),
                        'matches': matches
                    })

        # Get document instance for permissions
        # TODO: Optimize with bulk query
        from apps.documents.models import Document
        try:
            doc = Document.objects.get(pk=hit.meta.id)
            permissions = {
                'canView': True,  # Already filtered
                'canEdit': doc.user_can_edit(request.user),
                'canDelete': doc.user_can_delete(request.user),
                'canDownload': doc.user_can_download(request.user),
                'canShare': doc.user_can_share(request.user),
            }
        except Document.DoesNotExist:
            continue

        result = {
            **hit.to_dict(),
            'highlights': highlights,
            'permissions': permissions,
        }
        results.append(result)

    # Facets (aggregations)
    # TODO: Add aggregations for filter options
    facets = {}

    # Build response
    total_count = response.hits.total.value
    response_data = {
        'results': results,
        'total_count': total_count,
        'page': page,
        'page_size': page_size,
        'total_pages': (total_count + page_size - 1) // page_size,
        'facets': facets,
    }

    serializer = SearchResponseSerializer(response_data)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def quick_search_view(request):
    """
    Quick search - returns top 10 results
    GET /api/v1/search/quick/?q=query
    """
    query = request.query_params.get('q', '').strip()

    if not query:
        return Response({'results': []})

    # Simple search, top 10 results
    search = DocumentDocument.search()
    search = search.query(
        'multi_match',
        query=query,
        fields=['file_name^3', 'title^2', 'tags^2', 'file_content'],
        fuzziness='AUTO',
    )

    # Permission filtering
    search = filter_results_by_permissions(search, request.user)

    # Highlighting
    search = search.highlight('file_name', 'title')
    search = search.highlight_options(
        pre_tags=['<mark>'],
        post_tags=['</mark>'],
        fragment_size=100,
        number_of_fragments=1,
    )

    # Top 10 only
    search = search[:settings.SEARCH_QUICK_RESULTS_LIMIT]

    response = search.execute()

    # Build results (simplified)
    results = []
    for hit in response.hits:
        highlights = []
        if hasattr(hit.meta, 'highlight'):
            for field, snippets in hit.meta.highlight.to_dict().items():
                highlights.append({
                    'field': field,
                    'snippet': snippets[0].replace('<mark>', '').replace('</mark>', ''),
                    'matches': [{'text': snippets[0], 'isMatch': True}]
                })

        from apps.documents.models import Document
        try:
            doc = Document.objects.get(pk=hit.meta.id)
            permissions = {
                'canView': True,
                'canEdit': doc.user_can_edit(request.user),
                'canDelete': doc.user_can_delete(request.user),
                'canDownload': doc.user_can_download(request.user),
                'canShare': doc.user_can_share(request.user),
            }
        except Document.DoesNotExist:
            continue

        results.append({
            **hit.to_dict(),
            'highlights': highlights,
            'permissions': permissions,
        })

    return Response({'results': results})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def suggestions_view(request):
    """
    Get autocomplete suggestions
    GET /api/v1/search/suggestions/?q=query
    """
    query = request.query_params.get('q', '').strip()

    if not query:
        return Response({'suggestions': []})

    suggestions = []

    # Document name suggestions
    search = DocumentDocument.search()
    search = search.suggest(
        'file_suggestions',
        query,
        completion={'field': 'file_name.suggest', 'size': 5}
    )

    response = search.execute()

    if hasattr(response, 'suggest') and 'file_suggestions' in response.suggest:
        for option in response.suggest.file_suggestions[0].options:
            suggestions.append({
                'text': option.text,
                'type': 'document',
                'score': option._score,
                'metadata': {'description': 'Document'}
            })

    # Tag suggestions
    # TODO: Implement tag aggregation

    # Department suggestions
    # TODO: Implement department suggestions

    serializer = SearchSuggestionSerializer(suggestions, many=True)
    return Response({'suggestions': serializer.data})


@api_view(['GET', 'POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def recent_searches_view(request):
    """
    Recent searches management
    GET: Get recent searches
    POST: Save a search
    DELETE: Clear all recent searches
    """
    if request.method == 'GET':
        searches = RecentSearch.objects.filter(user=request.user)[:settings.SEARCH_RECENT_SEARCHES_LIMIT]
        serializer = RecentSearchSerializer(searches, many=True)
        return Response({'results': serializer.data})

    elif request.method == 'POST':
        serializer = SaveRecentSearchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Create or update recent search
        RecentSearch.objects.create(
            user=request.user,
            query=serializer.validated_data['query'],
            result_count=0  # TODO: Get actual count from search
        )

        return Response({
            'message': 'Search saved successfully',
            'query': serializer.validated_data['query']
        }, status=status.HTTP_201_CREATED)

    elif request.method == 'DELETE':
        RecentSearch.objects.filter(user=request.user).delete()
        return Response({'message': 'Recent searches cleared successfully'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def export_search_view(request):
    """
    Export search results to CSV/Excel
    POST /api/v1/search/export/
    """
    # TODO: Implement search logic similar to search_view
    # For now, return a simple CSV

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="search_results.csv"'

    writer = csv.writer(response)
    writer.writerow(['File Name', 'Path', 'Size', 'Type', 'Created Date', 'Confidentiality'])

    # TODO: Add actual search results

    return response
```

---

**Continue to next part...**

Would you like me to continue with:
- Step 7: Permission Filtering
- Step 8: URL Configuration
- Step 9: Signals for Auto-Indexing
- Step 10: Celery Tasks
- Step 11: Testing
- Step 12: Deployment

Or would you prefer a different format/approach?