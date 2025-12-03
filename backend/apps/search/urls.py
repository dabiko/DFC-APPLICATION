"""
URL configuration for search app.
"""
from django.urls import path
from apps.search.views import (
    DocumentSearchView,
    SearchAutocompleteView,
    IndexHealthView,
    RefreshIndexView,
    QuickSearchView,
    SuggestionsView,
    RecentSearchesView,
)

app_name = 'search'

urlpatterns = [
    # Search endpoints
    path('', DocumentSearchView.as_view(), name='document_search'),
    path('quick/', QuickSearchView.as_view(), name='quick_search'),
    path('suggestions/', SuggestionsView.as_view(), name='suggestions'),
    path('recent/', RecentSearchesView.as_view(), name='recent_searches'),
    path('autocomplete/', SearchAutocompleteView.as_view(), name='search_autocomplete'),

    # Admin/monitoring endpoints
    path('health/', IndexHealthView.as_view(), name='index_health'),
    path('refresh/', RefreshIndexView.as_view(), name='index_refresh'),
]
