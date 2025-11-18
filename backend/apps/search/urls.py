"""
URL configuration for search app.
"""
from django.urls import path
from apps.search.views import (
    DocumentSearchView,
    SearchAutocompleteView,
    IndexHealthView,
    RefreshIndexView,
)

app_name = 'search'

urlpatterns = [
    # Search endpoints
    path('', DocumentSearchView.as_view(), name='document_search'),
    path('autocomplete/', SearchAutocompleteView.as_view(), name='search_autocomplete'),

    # Admin/monitoring endpoints
    path('health/', IndexHealthView.as_view(), name='index_health'),
    path('refresh/', RefreshIndexView.as_view(), name='index_refresh'),
]
