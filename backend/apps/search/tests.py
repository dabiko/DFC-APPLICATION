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
