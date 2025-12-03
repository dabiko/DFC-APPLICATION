"""
Integration tests for search functionality and performance optimizations.
Tests Week 16 optimization features: caching, compression, ETag support.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.models import Department

User = get_user_model()


class SearchCachingTests(TestCase):
    """Test caching functionality for search"""

    def setUp(self):
        self.client = APIClient()
        self.department = Department.objects.create(name='Test', code='TEST')
        self.user = User.objects.create_user(
            username='testuser',
            email='test@test.com',
            password='pass123',
            department=self.department
        )
        self.client.force_authenticate(user=self.user)
        cache.clear()

    def test_cache_miss_then_hit(self):
        """Test cache MISS followed by HIT on identical query"""
        # First request - cache MISS
        response1 = self.client.get('/api/v1/search/', {'q': 'test'})
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        self.assertEqual(response1.get('X-Cache-Status'), 'MISS')

        # Second request - cache HIT
        response2 = self.client.get('/api/v1/search/', {'q': 'test'})
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        self.assertEqual(response2.get('X-Cache-Status'), 'HIT')

    def test_etag_present(self):
        """Test ETag header is included in response"""
        response = self.client.get('/api/v1/search/', {'q': 'invoice'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('ETag', response.headers)
        self.assertTrue(response.headers['ETag'].startswith('"'))

    def test_cache_control_header(self):
        """Test Cache-Control header with max-age"""
        response = self.client.get('/api/v1/search/', {'q': 'test'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('Cache-Control', response.headers)
        self.assertIn('max-age=300', response.headers['Cache-Control'])


class SearchFunctionalityTests(TestCase):
    """Test search features and filters"""

    def setUp(self):
        self.client = APIClient()
        self.department = Department.objects.create(name='Finance', code='FIN')
        self.user = User.objects.create_user(
            username='searchuser',
            email='search@test.com',
            password='pass123',
            department=self.department
        )
        self.client.force_authenticate(user=self.user)

    def test_search_response_structure(self):
        """Test search response includes all required fields"""
        response = self.client.get('/api/v1/search/', {'q': 'test'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertIn('facets', response.data)
        self.assertIn('count', response.data)
        self.assertIn('page', response.data)
        self.assertIn('took_ms', response.data)

    def test_pagination_parameters(self):
        """Test pagination with page and page_size"""
        response = self.client.get('/api/v1/search/', {
            'q': 'test',
            'page': '1',
            'page_size': '10'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['page'], 1)
        self.assertEqual(response.data['page_size'], 10)

    def test_facets_structure(self):
        """Test facets are returned with proper structure"""
        response = self.client.get('/api/v1/search/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        facets = response.data['facets']
        self.assertIn('document_types', facets)
        self.assertIn('confidentiality_levels', facets)
        self.assertIn('file_types', facets)


class SearchSecurityTests(TestCase):
    """Test search security and permissions"""

    def setUp(self):
        self.client = APIClient()
        self.department = Department.objects.create(name='IT', code='IT')
        self.user = User.objects.create_user(
            username='secureuser',
            email='secure@test.com',
            password='pass123',
            department=self.department
        )

    def test_authentication_required(self):
        """Test unauthenticated requests are rejected"""
        response = self.client.get('/api/v1/search/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_access(self):
        """Test authenticated users can access search"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/search/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class QuickSearchTests(TestCase):
    """Test quick search endpoint for command palette"""

    def setUp(self):
        self.client = APIClient()
        self.department = Department.objects.create(name='Sales', code='SALES')
        self.user = User.objects.create_user(
            username='quickuser',
            email='quick@test.com',
            password='pass123',
            department=self.department
        )
        self.client.force_authenticate(user=self.user)

    def test_quick_search_empty_query(self):
        """Test quick search with empty query returns empty results"""
        response = self.client.get('/api/v1/search/quick/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['results'], [])

    def test_quick_search_with_query(self):
        """Test quick search with query parameter"""
        response = self.client.get('/api/v1/search/quick/?q=budget')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertIsInstance(response.data['results'], list)

    def test_quick_search_authentication_required(self):
        """Test quick search requires authentication"""
        self.client.logout()
        response = self.client.get('/api/v1/search/quick/?q=test')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class SuggestionsTests(TestCase):
    """Test autocomplete suggestions endpoint"""

    def setUp(self):
        self.client = APIClient()
        self.department = Department.objects.create(name='Marketing', code='MKT')
        self.user = User.objects.create_user(
            username='suggestuser',
            email='suggest@test.com',
            password='pass123',
            department=self.department
        )
        self.client.force_authenticate(user=self.user)

    def test_suggestions_minimum_query_length(self):
        """Test suggestions require minimum 2 characters"""
        response = self.client.get('/api/v1/search/suggestions/?q=a')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('suggestions', response.data)
        self.assertIn('message', response.data)

    def test_suggestions_with_valid_query(self):
        """Test suggestions with valid query"""
        response = self.client.get('/api/v1/search/suggestions/?q=bud')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('suggestions', response.data)
        self.assertIsInstance(response.data['suggestions'], list)

    def test_suggestions_authentication_required(self):
        """Test suggestions require authentication"""
        self.client.logout()
        response = self.client.get('/api/v1/search/suggestions/?q=test')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class RecentSearchesTests(TestCase):
    """Test recent searches endpoint"""

    def setUp(self):
        self.client = APIClient()
        self.department = Department.objects.create(name='HR', code='HR')
        self.user = User.objects.create_user(
            username='recentuser',
            email='recent@test.com',
            password='pass123',
            department=self.department
        )
        self.client.force_authenticate(user=self.user)

    def test_get_recent_searches_empty(self):
        """Test getting recent searches when none exist"""
        response = self.client.get('/api/v1/search/recent/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 0)

    def test_save_recent_search(self):
        """Test saving a recent search"""
        response = self.client.post(
            '/api/v1/search/recent/',
            {'query': 'test search'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('query', response.data)
        self.assertEqual(response.data['query'], 'test search')

    def test_save_recent_search_empty_query(self):
        """Test saving empty query fails"""
        response = self.client.post(
            '/api/v1/search/recent/',
            {'query': ''},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_recent_searches_after_save(self):
        """Test getting recent searches after saving some"""
        # Save multiple searches
        self.client.post('/api/v1/search/recent/', {'query': 'search 1'}, format='json')
        self.client.post('/api/v1/search/recent/', {'query': 'search 2'}, format='json')
        self.client.post('/api/v1/search/recent/', {'query': 'search 3'}, format='json')

        # Get recent searches
        response = self.client.get('/api/v1/search/recent/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 3)

    def test_clear_recent_searches(self):
        """Test clearing all recent searches"""
        # Save some searches
        self.client.post('/api/v1/search/recent/', {'query': 'search 1'}, format='json')
        self.client.post('/api/v1/search/recent/', {'query': 'search 2'}, format='json')

        # Clear searches
        response = self.client.delete('/api/v1/search/recent/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify cleared
        response = self.client.get('/api/v1/search/recent/')
        self.assertEqual(len(response.data['results']), 0)

    def test_recent_searches_authentication_required(self):
        """Test recent searches require authentication"""
        self.client.logout()
        response = self.client.get('/api/v1/search/recent/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_recent_searches_limit_parameter(self):
        """Test limit parameter for recent searches"""
        # Save 15 searches
        for i in range(15):
            self.client.post('/api/v1/search/recent/', {'query': f'search {i}'}, format='json')

        # Get with limit
        response = self.client.get('/api/v1/search/recent/?limit=5')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 5)
