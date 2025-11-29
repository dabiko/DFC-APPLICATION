"""
Integrations URL Configuration.

Routes for API keys, webhooks, and third-party integrations.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'integrations'

router = DefaultRouter()
router.register(r'api-keys', views.APIKeyViewSet, basename='api-keys')
router.register(r'webhooks', views.WebhookViewSet, basename='webhooks')
router.register(r'services', views.IntegrationViewSet, basename='services')
router.register(r'logs', views.IntegrationLogViewSet, basename='logs')

urlpatterns = [
    path('', include(router.urls)),
    path('stats/', views.IntegrationStatsView.as_view(), name='stats'),
]
