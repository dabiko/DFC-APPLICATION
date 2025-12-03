"""
API views for document search and Elasticsearch monitoring.

Provides endpoints for:
- Full-text search across documents
- Advanced filtering and faceted search
- Search autocomplete suggestions
- Index health monitoring (admin only)
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from elasticsearch_dsl import Search, Q
from elasticsearch.exceptions import ConnectionError as ESConnectionError
from django.core.cache import cache
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers
from django.views.decorators.http import condition
from django.utils.http import http_date
from django.utils.cache import get_cache_key, patch_response_headers
from django.utils import timezone
import hashlib
import time

from apps.search.documents import DocumentDocument
from apps.search.utils import (
    get_cluster_health,
    get_index_document_count,
    get_search_performance_stats,
    get_indexing_performance_stats,
    get_comprehensive_index_report,
    refresh_index,
    get_elasticsearch_client,
)
from apps.documents.serializers import DocumentListSerializer, DocumentSearchSerializer
from apps.documents.models import Document

import logging

logger = logging.getLogger(__name__)


class DocumentSearchView(APIView):
    """
    Full-text search across documents.

    Supports:
    - Full-text search in title, filename, and extracted text
    - Filtering by document type, confidentiality, date range, etc.
    - Faceted search results
    - Highlighting of matched terms
    - Permission-based filtering (users only see authorized documents)

    Query Parameters:
        q (str): Search query text
        document_type (str): Filter by document type (comma-separated for multiple)
        confidentiality_level (str): Filter by confidentiality level
        date_from (date): Filter documents from this date
        date_to (date): Filter documents to this date
        folder_id (uuid): Filter by folder
        department_id (int): Filter by department
        tags (str): Filter by tags (comma-separated)
        owner_id (uuid): Filter by owner
        file_type (str): Filter by file type (e.g., 'application/pdf')
        page (int): Page number for pagination (default: 1)
        page_size (int): Results per page (default: 20, max: 100)
        sort_by (str): Sort field (default: '_score' for relevance)
        order (str): Sort order ('asc' or 'desc', default: 'desc')

    Example:
        GET /api/v1/search/?q=invoice&document_type=INVOICE&date_from=2024-01-01

    Returns:
        {
            "count": 150,
            "results": [...],
            "facets": {
                "document_types": {...},
                "confidentiality_levels": {...}
            },
            "page": 1,
            "page_size": 20,
            "total_pages": 8
        }
    """

    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'options']

    def _generate_cache_key(self, request, query_params=None):
        """
        Generate cache key based on query parameters and user permissions.
        """
        # Include user ID and query params in cache key
        if query_params is None:
            params = dict(request.query_params)
        else:
            params = query_params.copy()
        params['user_id'] = str(request.user.id)
        # Sort for consistent keys
        cache_str = str(sorted(params.items()))
        cache_hash = hashlib.md5(cache_str.encode()).hexdigest()
        return f'search_results_{cache_hash}'

    def get(self, request):
        """
        Execute search query and return results with caching.
        Cache results for 5 minutes to improve performance.
        """
        try:
            # Check cache first
            cache_key = self._generate_cache_key(request)
            cached_response = cache.get(cache_key)

            if cached_response:
                logger.debug(f"Cache hit for search query: {cache_key}")
                response = Response(cached_response)
                response['X-Cache-Status'] = 'HIT'
                return response

            logger.debug(f"Cache miss for search query: {cache_key}")

            # Get search parameters
            query_text = request.query_params.get('q', '').strip()
            page = int(request.query_params.get('page', 1))
            page_size = min(int(request.query_params.get('page_size', 20)), 100)
            sort_by = request.query_params.get('sort_by', '_score')
            order = request.query_params.get('order', 'desc')

            # Create Elasticsearch search object
            search = Search(index='documents')

            # Apply full-text search if query provided
            if query_text:
                # Multi-match query across multiple fields with different weights
                search = search.query(
                    'multi_match',
                    query=query_text,
                    fields=[
                        'title^3',  # Title has highest weight
                        'file_name^2',  # Filename has medium weight
                        'extracted_text',  # Content has standard weight
                        'creator_source',
                        'identifier',
                    ],
                    type='best_fields',
                    fuzziness='AUTO',  # Handle typos
                )

                # Enable highlighting for matched terms
                search = search.highlight(
                    'title',
                    'file_name',
                    'extracted_text',
                    fragment_size=150,
                    number_of_fragments=3,
                )

            # Apply filters
            filters = []

            # Filter out deleted documents
            filters.append(Q('term', is_deleted=False))

            # Document type filter
            if doc_types := request.query_params.get('document_type'):
                types_list = [t.strip() for t in doc_types.split(',')]
                filters.append(Q('terms', document_type=types_list))

            # Confidentiality level filter
            if conf_level := request.query_params.get('confidentiality_level'):
                filters.append(Q('term', confidentiality_level=conf_level))

            # Date range filter
            date_from = request.query_params.get('date_from')
            date_to = request.query_params.get('date_to')
            if date_from or date_to:
                date_range = {}
                if date_from:
                    date_range['gte'] = date_from
                if date_to:
                    date_range['lte'] = date_to
                filters.append(Q('range', document_date=date_range))

            # Folder filter
            if folder_id := request.query_params.get('folder_id'):
                filters.append(Q('term', **{'folder.id': folder_id}))

            # Department filter
            if dept_id := request.query_params.get('department_id'):
                filters.append(Q('term', **{'department.id': dept_id}))

            # Tags filter (must have ALL specified tags)
            if tags := request.query_params.get('tags'):
                tags_list = [t.strip() for t in tags.split(',')]
                for tag in tags_list:
                    filters.append(Q('term', tags=tag))

            # Owner filter
            if owner_id := request.query_params.get('owner_id'):
                filters.append(Q('term', **{'owner.id': owner_id}))

            # File type filter
            if file_type := request.query_params.get('file_type'):
                filters.append(Q('term', file_type=file_type))

            # Permission-based filtering (users only see documents they have access to)
            if not request.user.is_staff:
                # Regular users see:
                # 1. Documents they own
                # 2. Documents in their department
                # 3. Public documents
                permission_filters = Q('term', **{'owner.id': str(request.user.id)})
                if request.user.department:
                    permission_filters |= Q('term', **{'department.id': request.user.department.id})
                permission_filters |= Q('term', confidentiality_level='PUBLIC')

                filters.append(permission_filters)

            # Apply all filters
            if filters:
                combined_filter = filters[0]
                for f in filters[1:]:
                    combined_filter &= f
                search = search.filter(combined_filter)

            # Sorting
            if sort_by == '_score':
                # Default relevance sorting (only if query text provided)
                if not query_text:
                    sort_by = 'created_at'  # Fall back to created_at if no search query

            if sort_by != '_score':
                sort_field = f'-{sort_by}' if order == 'desc' else sort_by
                search = search.sort(sort_field)

            # Pagination
            start = (page - 1) * page_size
            search = search[start:start + page_size]

            # Add aggregations (facets) for filtering UI
            search.aggs.bucket('document_types', 'terms', field='document_type', size=20)
            search.aggs.bucket('confidentiality_levels', 'terms', field='confidentiality_level')
            search.aggs.bucket('file_types', 'terms', field='file_type', size=10)
            search.aggs.bucket('departments', 'terms', field='department.name.raw', size=10)

            # Add spell checking suggestions (if query text provided)
            if query_text:
                search = search.suggest(
                    'title_suggestions',
                    query_text,
                    term={'field': 'title'}
                )
                search = search.suggest(
                    'filename_suggestions',
                    query_text,
                    term={'field': 'file_name'}
                )

            # Execute search
            response = search.execute()

            # Get document IDs from search results
            doc_ids = [hit.meta.id for hit in response.hits]

            # Fetch full document objects from database (for complete data)
            documents = Document.objects.filter(
                id__in=doc_ids,
                is_deleted=False
            ).select_related('owner', 'department', 'folder', 'created_by')

            # Preserve search result order
            docs_dict = {str(doc.id): doc for doc in documents}
            ordered_docs = [docs_dict[doc_id] for doc_id in doc_ids if doc_id in docs_dict]

            # Serialize documents with optimized search serializer
            serializer = DocumentSearchSerializer(ordered_docs, many=True)

            # Prepare facets
            facets = {
                'document_types': {
                    bucket.key: bucket.doc_count
                    for bucket in response.aggregations.document_types.buckets
                },
                'confidentiality_levels': {
                    bucket.key: bucket.doc_count
                    for bucket in response.aggregations.confidentiality_levels.buckets
                },
                'file_types': {
                    bucket.key: bucket.doc_count
                    for bucket in response.aggregations.file_types.buckets
                },
                'departments': {
                    bucket.key: bucket.doc_count
                    for bucket in response.aggregations.departments.buckets
                },
            }

            # Prepare spell checking suggestions
            suggestions = {}
            if query_text and hasattr(response, 'suggest'):
                # Extract unique spelling suggestions
                title_suggestions = []
                filename_suggestions = []

                if 'title_suggestions' in response.suggest:
                    for suggestion in response.suggest.title_suggestions:
                        for option in suggestion.options:
                            if option.text not in title_suggestions:
                                title_suggestions.append(option.text)

                if 'filename_suggestions' in response.suggest:
                    for suggestion in response.suggest.filename_suggestions:
                        for option in suggestion.options:
                            if option.text not in filename_suggestions:
                                filename_suggestions.append(option.text)

                # Combine unique suggestions
                all_suggestions = list(set(title_suggestions + filename_suggestions))
                if all_suggestions:
                    suggestions = {
                        'did_you_mean': all_suggestions[:5],  # Top 5 suggestions
                        'original_query': query_text
                    }

            # Prepare response
            total_results = response.hits.total.value
            total_pages = (total_results + page_size - 1) // page_size

            response_data = {
                'count': total_results,
                'results': serializer.data,
                'facets': facets,
                'page': page,
                'page_size': page_size,
                'total_pages': total_pages,
                'query': query_text,
                'took_ms': response.took,  # Search execution time
            }

            # Add suggestions if available
            if suggestions:
                response_data['suggestions'] = suggestions

            # Cache the response for 5 minutes (300 seconds)
            cache.set(cache_key, response_data, 300)

            # Create response with caching headers
            response = Response(response_data)
            response['X-Cache-Status'] = 'MISS'

            # Generate ETag for response
            etag = hashlib.md5(str(response_data).encode()).hexdigest()
            response['ETag'] = f'"{etag}"'

            # Add cache control headers (5 minutes)
            response['Cache-Control'] = 'private, max-age=300'

            return response

        except ESConnectionError:
            logger.error('Elasticsearch connection failed')
            return Response(
                {'error': 'Search service unavailable. Please try again later.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            logger.error(f'Search failed: {e}', exc_info=True)
            return Response(
                {'error': 'An error occurred during search. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def post(self, request):
        """
        Execute search query via POST with JSON body.
        Supports the same parameters as GET but via request body.
        """
        try:
            # Extract parameters from request body
            data = request.data

            # Convert POST data to query params format for compatibility
            query_params = {}

            # Map frontend POST parameters to backend query parameters
            if 'query' in data:
                query_params['q'] = data['query']
            if 'mode' in data:
                query_params['mode'] = data['mode']
            if 'scope' in data:
                query_params['scope'] = data['scope']
            if 'folder_id' in data or 'folderId' in data:
                query_params['folder_id'] = data.get('folder_id') or data.get('folderId')
            if 'department_id' in data or 'departmentId' in data:
                query_params['department_id'] = data.get('department_id') or data.get('departmentId')
            if 'filters' in data and data['filters']:
                filters = data['filters']
                if isinstance(filters, dict):
                    if filters.get('documentTypes'):
                        query_params['document_type'] = ','.join(filters['documentTypes'])
                    if filters.get('confidentialityLevels'):
                        query_params['confidentiality_level'] = ','.join(filters['confidentialityLevels'])
                    if filters.get('dateFrom'):
                        query_params['date_from'] = filters['dateFrom']
                    if filters.get('dateTo'):
                        query_params['date_to'] = filters['dateTo']
                    if filters.get('tags'):
                        query_params['tags'] = ','.join(filters['tags'])
                    if filters.get('fileTypes'):
                        query_params['file_type'] = ','.join(filters['fileTypes'])

            if 'sort_by' in data or 'sortBy' in data:
                query_params['sort_by'] = data.get('sort_by') or data.get('sortBy')
            if 'sort_order' in data or 'sortOrder' in data:
                query_params['sort_order'] = data.get('sort_order') or data.get('sortOrder')
            if 'page' in data:
                query_params['page'] = str(data['page'])
            if 'page_size' in data or 'pageSize' in data:
                query_params['page_size'] = str(data.get('page_size') or data.get('pageSize'))

            # Check cache first
            cache_key = self._generate_cache_key(request, query_params)
            cached_response = cache.get(cache_key)

            if cached_response:
                logger.debug(f"Cache hit for search query: {cache_key}")
                response = Response(cached_response)
                response['X-Cache-Status'] = 'HIT'
                return response

            logger.debug(f"Cache miss for search query: {cache_key}")

            # Get search parameters
            query_text = query_params.get('q', '').strip()
            page = int(query_params.get('page', 1))
            page_size = min(int(query_params.get('page_size', 20)), 100)
            sort_by = query_params.get('sort_by', '_score')
            order = query_params.get('sort_order', 'desc')

            # Create Elasticsearch search object
            search = Search(index='documents')

            # Apply full-text search if query provided
            if query_text:
                search = search.query(
                    'multi_match',
                    query=query_text,
                    fields=[
                        'title^3',
                        'file_name^2',
                        'extracted_text',
                        'creator_source',
                        'identifier',
                    ],
                    type='best_fields',
                    fuzziness='AUTO',
                )

            # Apply filters
            search = search.filter('term', is_deleted=False)

            # Document type filter
            if 'document_type' in query_params:
                doc_types = [dt.strip() for dt in query_params['document_type'].split(',')]
                search = search.filter('terms', document_type=doc_types)

            # Confidentiality filter
            if 'confidentiality_level' in query_params:
                conf_levels = [cl.strip() for cl in query_params['confidentiality_level'].split(',')]
                search = search.filter('terms', confidentiality_level=conf_levels)

            # Date range filter
            if 'date_from' in query_params or 'date_to' in query_params:
                date_filter = {}
                if 'date_from' in query_params:
                    date_filter['gte'] = query_params['date_from']
                if 'date_to' in query_params:
                    date_filter['lte'] = query_params['date_to']
                search = search.filter('range', created_at=date_filter)

            # Folder filter
            if 'folder_id' in query_params:
                search = search.filter('term', **{'folder.id': query_params['folder_id']})

            # Department filter
            if 'department_id' in query_params:
                search = search.filter('term', **{'department.id': int(query_params['department_id'])})

            # Permission filtering
            if not request.user.is_staff:
                permission_filter = Q('term', **{'owner.id': str(request.user.id)})
                if request.user.department:
                    permission_filter |= Q('term', **{'department.id': request.user.department.id})
                permission_filter |= Q('term', confidentiality_level='PUBLIC')
                search = search.filter(permission_filter)

            # Sorting
            if sort_by == '_score':
                # Score is already sorted in descending order by default
                # Only sort by score ascending if explicitly requested
                if order == 'asc':
                    search = search.sort('_score')
                # For desc, do nothing - it's already the default
            else:
                sort_order_prefix = '-' if order == 'desc' else ''
                search = search.sort(f'{sort_order_prefix}{sort_by}')

            # Pagination
            start = (page - 1) * page_size
            search = search[start:start + page_size]

            # Execute search
            es_response = search.execute()

            # Get document IDs
            doc_ids = [hit.meta.id for hit in es_response.hits]

            # Fetch documents from database
            documents = Document.objects.filter(
                id__in=doc_ids,
                is_deleted=False
            ).select_related('owner', 'department', 'folder')

            # Preserve order
            docs_dict = {str(doc.id): doc for doc in documents}
            ordered_docs = [docs_dict[doc_id] for doc_id in doc_ids if doc_id in docs_dict]

            # Serialize
            serializer = DocumentSearchSerializer(ordered_docs, many=True)

            # Build response
            response_data = {
                'results': serializer.data,
                'totalCount': es_response.hits.total.value,
                'page': page,
                'pageSize': page_size,
                'totalPages': (es_response.hits.total.value + page_size - 1) // page_size,
                'query': query_text,
                'took_ms': es_response.took,
            }

            # Cache the response
            cache.set(cache_key, response_data, 300)

            # Create response
            response = Response(response_data)
            response['X-Cache-Status'] = 'MISS'
            response['ETag'] = f'"{hashlib.md5(str(response_data).encode()).hexdigest()}"'
            response['Cache-Control'] = 'private, max-age=300'

            return response

        except ESConnectionError:
            logger.error('Elasticsearch connection failed')
            return Response(
                {'error': 'Search service unavailable. Please try again later.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            logger.error(f'POST search failed: {e}', exc_info=True)
            return Response(
                {'error': 'An error occurred during search. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SearchAutocompleteView(APIView):
    """
    Autocomplete suggestions for search queries.

    Provides type-ahead suggestions based on:
    - Document titles
    - File names
    - Tags

    Query Parameters:
        q (str): Partial search query (minimum 2 characters)
        limit (int): Maximum suggestions to return (default: 10)

    Example:
        GET /api/v1/search/autocomplete/?q=inv

    Returns:
        {
            "suggestions": [
                "Invoice 2024",
                "Invoice Template",
                "Inventory Report"
            ]
        }
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Get autocomplete suggestions.
        """
        try:
            query = request.query_params.get('q', '').strip()
            limit = min(int(request.query_params.get('limit', 10)), 50)

            if len(query) < 2:
                return Response({
                    'suggestions': [],
                    'message': 'Query must be at least 2 characters'
                })

            # Create search with suggest analyzer
            search = Search(index='documents')

            # Use prefix query on suggest fields
            search = search.query(
                'multi_match',
                query=query,
                fields=['title.suggest', 'file_name.suggest'],
                type='phrase_prefix',
            )

            # Filter by permissions
            if not request.user.is_staff:
                permission_filter = Q('term', **{'owner.id': str(request.user.id)})
                if request.user.department:
                    permission_filter |= Q('term', **{'department.id': request.user.department.id})
                permission_filter |= Q('term', confidentiality_level='PUBLIC')
                search = search.filter(permission_filter)

            # Limit results
            search = search[:limit]

            # Execute search
            response = search.execute()

            # Extract unique suggestions
            suggestions = []
            seen = set()

            for hit in response.hits:
                # Add title if not seen
                if hit.title and hit.title not in seen:
                    suggestions.append(hit.title)
                    seen.add(hit.title)

                # Stop if we have enough suggestions
                if len(suggestions) >= limit:
                    break

            return Response({
                'suggestions': suggestions,
                'count': len(suggestions)
            })

        except Exception as e:
            logger.error(f'Autocomplete failed: {e}', exc_info=True)
            return Response(
                {'error': 'Autocomplete service unavailable'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class IndexHealthView(APIView):
    """
    Get Elasticsearch index health information.

    Admin-only endpoint for monitoring search infrastructure.

    Returns:
        {
            "cluster_health": {...},
            "document_count": 1500,
            "index_exists": true,
            "search_performance": {...},
            "indexing_performance": {...}
        }
    """

    permission_classes = [IsAdminUser]

    def get(self, request):
        """
        Get comprehensive index health report.
        """
        try:
            report = get_comprehensive_index_report()
            return Response(report)
        except Exception as e:
            logger.error(f'Failed to get index health: {e}', exc_info=True)
            return Response(
                {'error': 'Could not retrieve index health'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RefreshIndexView(APIView):
    """
    Force refresh of Elasticsearch index.

    Admin-only endpoint to make recently indexed documents immediately searchable.
    Normally Elasticsearch refreshes automatically every 1 second.

    POST /api/v1/search/refresh/
    """

    permission_classes = [IsAdminUser]

    def post(self, request):
        """
        Refresh the index.
        """
        try:
            success = refresh_index()
            if success:
                return Response({
                    'message': 'Index refreshed successfully',
                    'document_count': get_index_document_count()
                })
            else:
                return Response(
                    {'error': 'Failed to refresh index'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        except Exception as e:
            logger.error(f'Index refresh failed: {e}', exc_info=True)
            return Response(
                {'error': 'Index refresh failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class QuickSearchView(APIView):
    """
    Quick search for command palette.

    Lightweight search optimized for speed, returns top 10 results.
    No facets or heavy aggregations.

    Query Parameters:
        q (str): Search query text

    Example:
        GET /api/v1/search/quick/?q=budget

    Returns:
        {
            "results": [...]
        }
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Execute quick search.
        """
        try:
            query_text = request.query_params.get('q', '').strip()

            if not query_text:
                return Response({'results': []})

            # Create lightweight search
            search = Search(index='documents')

            # Multi-match query
            search = search.query(
                'multi_match',
                query=query_text,
                fields=[
                    'title^3',
                    'file_name^2',
                    'extracted_text',
                    'tags',
                ],
                type='best_fields',
                fuzziness='AUTO',
            )

            # Filter out deleted documents
            search = search.filter('term', is_deleted=False)

            # Permission filtering
            if not request.user.is_staff:
                permission_filter = Q('term', **{'owner.id': str(request.user.id)})
                if request.user.department:
                    permission_filter |= Q('term', **{'department.id': request.user.department.id})
                permission_filter |= Q('term', confidentiality_level='PUBLIC')
                search = search.filter(permission_filter)

            # Limit to top 10 results
            search = search[:10]

            # Execute search
            response = search.execute()

            # Get document IDs
            doc_ids = [hit.meta.id for hit in response.hits]

            # Fetch documents from database
            documents = Document.objects.filter(
                id__in=doc_ids,
                is_deleted=False
            ).select_related('owner', 'department', 'folder')

            # Preserve order
            docs_dict = {str(doc.id): doc for doc in documents}
            ordered_docs = [docs_dict[doc_id] for doc_id in doc_ids if doc_id in docs_dict]

            # Serialize
            serializer = DocumentSearchSerializer(ordered_docs, many=True)

            return Response({'results': serializer.data})

        except ESConnectionError:
            logger.error('Elasticsearch connection failed for quick search')
            return Response(
                {'error': 'Search service unavailable'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            logger.error(f'Quick search failed: {e}', exc_info=True)
            return Response({'results': []})


class SuggestionsView(APIView):
    """
    Get search suggestions for autocomplete.

    Returns suggestions from document titles, file names, and tags.

    Query Parameters:
        q (str): Partial query (minimum 2 characters)

    Example:
        GET /api/v1/search/suggestions/?q=bud

    Returns:
        {
            "suggestions": [
                {
                    "text": "Budget Report 2024",
                    "type": "document",
                    "score": 95.5,
                    "metadata": {"description": "..."}
                },
                ...
            ]
        }
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Get autocomplete suggestions.
        """
        try:
            from apps.search.serializers import SearchSuggestionSerializer

            query = request.query_params.get('q', '').strip()

            if len(query) < 2:
                return Response({
                    'suggestions': [],
                    'message': 'Query must be at least 2 characters'
                })

            # Search for documents
            search = Search(index='documents')
            search = search.query(
                'multi_match',
                query=query,
                fields=['title.suggest', 'file_name.suggest'],
                type='phrase_prefix',
            )

            # Filter by permissions
            if not request.user.is_staff:
                permission_filter = Q('term', **{'owner.id': str(request.user.id)})
                if request.user.department:
                    permission_filter |= Q('term', **{'department.id': request.user.department.id})
                permission_filter |= Q('term', confidentiality_level='PUBLIC')
                search = search.filter(permission_filter)

            # Limit results
            search = search[:10]

            # Execute
            response = search.execute()

            # Build suggestions
            suggestions = []
            seen = set()

            for hit in response.hits:
                if hit.title and hit.title not in seen:
                    suggestions.append({
                        'text': hit.title,
                        'type': 'document',
                        'score': hit.meta.score,
                        'metadata': {
                            'description': f'{hit.file_name}',
                            'document_id': hit.meta.id
                        }
                    })
                    seen.add(hit.title)

                if len(suggestions) >= 10:
                    break

            # Add tag suggestions
            if len(suggestions) < 10:
                # Get popular tags that match query
                from apps.documents.models import Tag
                tags = Tag.objects.filter(
                    name__icontains=query
                ).order_by('-usage_count')[:5]

                for tag in tags:
                    suggestions.append({
                        'text': tag.name,
                        'type': 'tag',
                        'score': 90.0,
                        'metadata': {
                            'description': f'Tag with {tag.usage_count} documents'
                        }
                    })

            serializer = SearchSuggestionSerializer(suggestions, many=True)
            return Response({'suggestions': serializer.data})

        except Exception as e:
            logger.error(f'Suggestions failed: {e}', exc_info=True)
            return Response({'suggestions': []})


class RecentSearchesView(APIView):
    """
    Get or save recent searches for current user.

    GET: Returns recent searches
    POST: Saves a new search query
    DELETE: Clears all recent searches

    Query Parameters (GET):
        limit (int): Maximum number of results (default: 10)

    Request Body (POST):
        {
            "query": "search text"
        }

    Example:
        GET /api/v1/search/recent/
        POST /api/v1/search/recent/ {"query": "budget"}
        DELETE /api/v1/search/recent/

    Returns (GET):
        {
            "results": [...]
        }
    """

    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'delete', 'options']

    def get(self, request):
        """
        Get recent searches for current user.
        """
        try:
            from apps.search.models import RecentSearch
            from apps.search.serializers import RecentSearchSerializer

            limit = min(int(request.query_params.get('limit', 10)), 50)

            # Get recent searches for user
            recent_searches = RecentSearch.objects.filter(
                user=request.user
            ).order_by('-executed_at')[:limit]

            serializer = RecentSearchSerializer(recent_searches, many=True)
            return Response({'results': serializer.data})

        except Exception as e:
            logger.error(f'Get recent searches failed: {e}', exc_info=True)
            return Response(
                {'error': 'Failed to retrieve recent searches'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def post(self, request):
        """
        Save a new recent search.
        """
        from apps.search.models import RecentSearch
        from apps.search.serializers import RecentSearchSerializer

        try:
            query = request.data.get('query', '').strip()

            logger.debug(f'Saving recent search for user {request.user.id}: {query}')

            if not query:
                return Response(
                    {'error': 'Query is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if this query already exists for user
            existing = RecentSearch.objects.filter(
                user=request.user,
                query=query
            ).first()

            if existing:
                # Update timestamp
                existing.executed_at = timezone.now()
                existing.save(update_fields=['executed_at'])
                serializer = RecentSearchSerializer(existing)
                logger.debug(f'Updated existing recent search {existing.id}')
            else:
                # Create new
                recent_search = RecentSearch.objects.create(
                    user=request.user,
                    query=query,
                    result_count=0  # Will be updated when search is executed
                )
                serializer = RecentSearchSerializer(recent_search)
                logger.debug(f'Created new recent search {recent_search.id}')

            # Keep only last 50 searches per user
            old_searches = RecentSearch.objects.filter(
                user=request.user
            ).order_by('-executed_at')[50:]

            if old_searches.exists():
                old_count = old_searches.count()
                old_searches.delete()
                logger.debug(f'Deleted {old_count} old searches')

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f'Save recent search failed: {e}', exc_info=True)
            return Response(
                {'error': 'Failed to save search', 'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def delete(self, request):
        """
        Clear all recent searches for current user.
        """
        try:
            from apps.search.models import RecentSearch

            RecentSearch.objects.filter(user=request.user).delete()
            return Response({'message': 'Recent searches cleared'})

        except Exception as e:
            logger.error(f'Clear recent searches failed: {e}', exc_info=True)
            return Response(
                {'error': 'Failed to clear searches'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
