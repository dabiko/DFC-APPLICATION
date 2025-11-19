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

    def _generate_cache_key(self, request):
        """
        Generate cache key based on query parameters and user permissions.
        """
        # Include user ID and query params in cache key
        params = dict(request.query_params)
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
