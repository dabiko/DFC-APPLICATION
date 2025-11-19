"""
URL configuration for DFC project.

Includes:
- Admin panel
- API v1 routes (authentication, users, departments)
- API documentation (Swagger/OpenAPI)
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

urlpatterns = [
    # Admin panel
    path('admin/', admin.site.urls),

    # API v1 - Authentication & Users
    path('api/v1/auth/', include('apps.users.urls', namespace='users')),
    path('api/v1/auth/mfa/', include('apps.users.mfa_urls', namespace='mfa')),

    # API v1 - Organizations (Multi-tenant)
    path('api/v1/organizations/', include('apps.organizations.urls', namespace='organizations')),

    # API v1 - Documents
    path('api/v1/documents/', include('apps.documents.urls', namespace='documents')),

    # API v1 - Folders
    path('api/v1/folders/', include('apps.folders.urls', namespace='folders')),

    # API v1 - Search
    path('api/v1/search/', include('apps.search.urls', namespace='search')),

    # API v1 - Classification
    path('api/v1/classification/', include('apps.classification.urls', namespace='classification')),

    # API v1 - Permissions (RBAC)
    path('api/v1/permissions/', include('apps.permissions.urls', namespace='permissions')),

    # API v1 - Audit Logs
    path('api/v1/audit/', include('apps.audit.urls', namespace='audit')),

    # API v1 - Retention & Legal Hold
    path('api/v1/retention/', include('apps.retention.urls')),

    # API v1 - Sharing & Collaboration
    path('api/v1/', include('apps.sharing.urls')),

    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
