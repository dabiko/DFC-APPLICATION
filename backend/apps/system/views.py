"""
Views for system administration (super admin only).
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count, Sum
from django.utils import timezone
from datetime import timedelta

from .models import (
    SystemSettings,
    AuditConfiguration,
    PlatformAnnouncement,
    SystemHealthCheck,
)
from .serializers import (
    SystemSettingsSerializer,
    AuditConfigurationSerializer,
    PlatformAnnouncementSerializer,
    SystemHealthCheckSerializer,
    PlatformStatsSerializer,
    OrganizationListSerializer,
    FeatureFlagsUpdateSerializer,
)


class PublicPlatformInfoView(APIView):
    """
    Public endpoint returning minimal platform identity for the landing page.
    No authentication required.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        settings = SystemSettings.objects.first()
        if not settings:
            return Response({
                'platform_name': 'Digital Filing Cabinet',
                'platform_tagline': '',
                'support_email': '',
                'support_phone': '',
            })
        return Response({
            'platform_name': settings.platform_name,
            'platform_tagline': settings.platform_tagline,
            'support_email': settings.support_email,
            'support_phone': settings.support_phone,
        })


class PublicMaintenanceStatusView(APIView):
    """
    Public endpoint that returns the current maintenance status.
    No authentication required — always accessible even during maintenance.
    Used by the frontend to poll and auto-recover when maintenance ends.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from django.core.cache import cache
        cached = cache.get('system_settings_maintenance')
        if cached is not None:
            started_by_name = cached.get('started_by_name')
            return Response({
                'maintenance_mode': cached.get('enabled', False),
                'message': cached.get('message', ''),
                'estimated_end': cached.get('estimated_end'),
                'started_at': cached.get('started_at'),
                'started_by_name': started_by_name,
            })

        settings = SystemSettings.objects.first()
        if not settings:
            return Response({'maintenance_mode': False, 'message': '', 'estimated_end': None, 'started_at': None, 'started_by_name': None})

        started_by_name = None
        if settings.maintenance_started_by:
            started_by_name = settings.maintenance_started_by.get_full_name() or settings.maintenance_started_by.email

        return Response({
            'maintenance_mode': settings.maintenance_mode,
            'message': settings.maintenance_message,
            'estimated_end': settings.maintenance_estimated_end,
            'started_at': settings.maintenance_started_at,
            'started_by_name': started_by_name,
        })


class IsSuperAdmin(permissions.BasePermission):
    """
    Permission check for super admin access.
    Only staff users with superuser status can access.
    """

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_staff
            and request.user.is_superuser
        )


class SystemSettingsView(APIView):
    """
    View for managing system-wide settings.
    GET: Retrieve current settings
    PUT/PATCH: Update settings
    """

    permission_classes = [IsSuperAdmin]

    def get(self, request):
        settings = SystemSettings.objects.first()
        if not settings:
            settings = SystemSettings.objects.create()
        serializer = SystemSettingsSerializer(settings)
        return Response(serializer.data)

    def put(self, request):
        settings = SystemSettings.objects.first()
        if not settings:
            settings = SystemSettings.objects.create()
        was_active = settings.maintenance_mode
        serializer = SystemSettingsSerializer(settings, data=request.data)
        if serializer.is_valid():
            obj = serializer.save()
            self._handle_maintenance_toggle(obj, was_active, request.user)
            from django.core.cache import cache
            cache.delete('system_settings_maintenance')
            return Response(SystemSettingsSerializer(obj).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        settings = SystemSettings.objects.first()
        if not settings:
            settings = SystemSettings.objects.create()
        was_active = settings.maintenance_mode
        serializer = SystemSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            obj = serializer.save()
            self._handle_maintenance_toggle(obj, was_active, request.user)
            # Invalidate maintenance-mode cache so the middleware picks up the change immediately
            from django.core.cache import cache
            cache.delete('system_settings_maintenance')
            return Response(SystemSettingsSerializer(obj).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @staticmethod
    def _handle_maintenance_toggle(obj, was_active, user):
        """Auto-set or clear maintenance tracking fields on toggle."""
        update_fields = []
        if obj.maintenance_mode and not was_active:
            obj.maintenance_started_at = timezone.now()
            obj.maintenance_started_by = user
            update_fields = ['maintenance_started_at', 'maintenance_started_by']
        elif not obj.maintenance_mode and was_active:
            obj.maintenance_started_at = None
            obj.maintenance_started_by = None
            obj.maintenance_estimated_end = None
            update_fields = ['maintenance_started_at', 'maintenance_started_by', 'maintenance_estimated_end']
        if update_fields:
            obj.save(update_fields=update_fields)


class AuditConfigurationView(APIView):
    """View for managing audit configuration."""

    permission_classes = [IsSuperAdmin]

    def get(self, request):
        config = AuditConfiguration.objects.first()
        if not config:
            config = AuditConfiguration.objects.create()
        serializer = AuditConfigurationSerializer(config)
        return Response(serializer.data)

    def put(self, request):
        config = AuditConfiguration.objects.first()
        if not config:
            config = AuditConfiguration.objects.create()
        serializer = AuditConfigurationSerializer(config, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        config = AuditConfiguration.objects.first()
        if not config:
            config = AuditConfiguration.objects.create()
        serializer = AuditConfigurationSerializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PlatformAnnouncementViewSet(viewsets.ModelViewSet):
    """ViewSet for managing platform announcements."""

    queryset = PlatformAnnouncement.objects.all()
    serializer_class = PlatformAnnouncementSerializer
    permission_classes = [IsSuperAdmin]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate an announcement."""
        announcement = self.get_object()
        announcement.is_active = True
        announcement.save()
        return Response({'status': 'activated'})

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate an announcement."""
        announcement = self.get_object()
        announcement.is_active = False
        announcement.save()
        return Response({'status': 'deactivated'})


class ActiveAnnouncementsView(APIView):
    """Public view for retrieving active announcements for the current user."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        announcements = PlatformAnnouncement.objects.filter(
            is_active=True
        ).filter(
            models.Q(starts_at__isnull=True) | models.Q(starts_at__lte=now)
        ).filter(
            models.Q(ends_at__isnull=True) | models.Q(ends_at__gte=now)
        )

        # Filter by plan if user has organization
        if hasattr(request.user, 'organization') and request.user.organization:
            plan = request.user.organization.subscription_plan
            announcements = announcements.filter(
                models.Q(target_all_users=True) |
                models.Q(target_plans__contains=[plan])
            )

        serializer = PlatformAnnouncementSerializer(announcements, many=True)
        return Response(serializer.data)


class SystemHealthView(APIView):
    """View for system health status."""

    permission_classes = [IsSuperAdmin]

    def get(self, request):
        """Run live health checks against every service and return results."""
        import time
        now = timezone.now()
        health_data = {}

        # ── 1. Database ────────────────────────────────────────────────────────
        t0 = time.monotonic()
        try:
            from django.db import connection
            with connection.cursor() as cur:
                cur.execute('SELECT 1')
            health_data['database'] = {
                'service_name': 'database',
                'status': 'healthy',
                'response_time_ms': round((time.monotonic() - t0) * 1000),
                'details': {'engine': connection.vendor},
                'error_message': None,
                'checked_at': now,
            }
        except Exception as e:
            health_data['database'] = {
                'service_name': 'database', 'status': 'unhealthy',
                'response_time_ms': round((time.monotonic() - t0) * 1000),
                'details': {}, 'error_message': str(e), 'checked_at': now,
            }

        # ── 2. Storage (MinIO) ─────────────────────────────────────────────────
        t0 = time.monotonic()
        try:
            from apps.documents.storage import get_s3_client
            from django.conf import settings as django_settings
            s3 = get_s3_client()
            s3.head_bucket(Bucket=django_settings.AWS_STORAGE_BUCKET_NAME)
            health_data['storage'] = {
                'service_name': 'storage', 'status': 'healthy',
                'response_time_ms': round((time.monotonic() - t0) * 1000),
                'details': {
                    'provider': 'MinIO',
                    'bucket': django_settings.AWS_STORAGE_BUCKET_NAME,
                    'endpoint': django_settings.AWS_S3_ENDPOINT_URL,
                },
                'error_message': None, 'checked_at': now,
            }
        except Exception as e:
            health_data['storage'] = {
                'service_name': 'storage', 'status': 'unhealthy',
                'response_time_ms': round((time.monotonic() - t0) * 1000),
                'details': {}, 'error_message': str(e), 'checked_at': now,
            }

        # ── 3. Search (Elasticsearch) ──────────────────────────────────────────
        t0 = time.monotonic()
        try:
            from django.conf import settings as django_settings
            import requests as req
            es_url = getattr(django_settings, 'ELASTICSEARCH_DSL', {}).get(
                'default', {}
            ).get('hosts', 'http://localhost:9200')
            if isinstance(es_url, list):
                es_url = es_url[0]
            r = req.get(f'{es_url}/_cluster/health', timeout=3)
            es_status = r.json().get('status', 'unknown')
            health_data['search'] = {
                'service_name': 'search',
                'status': 'healthy' if es_status == 'green' else ('degraded' if es_status == 'yellow' else 'unhealthy'),
                'response_time_ms': round((time.monotonic() - t0) * 1000),
                'details': {'cluster_status': es_status, 'url': str(es_url)},
                'error_message': None if es_status in ('green', 'yellow') else f'Cluster status: {es_status}',
                'checked_at': now,
            }
        except Exception as e:
            health_data['search'] = {
                'service_name': 'search', 'status': 'unhealthy',
                'response_time_ms': round((time.monotonic() - t0) * 1000),
                'details': {}, 'error_message': str(e), 'checked_at': now,
            }

        # ── 4. Cache (Redis) ───────────────────────────────────────────────────
        t0 = time.monotonic()
        try:
            from django.core.cache import cache
            cache.set('_health_probe', '1', timeout=5)
            val = cache.get('_health_probe')
            if val != '1':
                raise RuntimeError('Cache round-trip returned unexpected value')
            health_data['cache'] = {
                'service_name': 'cache', 'status': 'healthy',
                'response_time_ms': round((time.monotonic() - t0) * 1000),
                'details': {'backend': str(type(cache).__name__)},
                'error_message': None, 'checked_at': now,
            }
        except Exception as e:
            health_data['cache'] = {
                'service_name': 'cache', 'status': 'unhealthy',
                'response_time_ms': round((time.monotonic() - t0) * 1000),
                'details': {}, 'error_message': str(e), 'checked_at': now,
            }

        # ── 5. Celery / Broker ─────────────────────────────────────────────────
        # Use a direct broker connection test — avoids creating transient reply
        # queues (which RabbitMQ 4.x prohibits) while still confirming the
        # message bus is reachable.
        t0 = time.monotonic()
        try:
            from config.celery import app as celery_app
            from kombu import Connection as KombuConnection
            broker_url = celery_app.conf.broker_url
            with KombuConnection(broker_url, connect_timeout=3) as conn:
                conn.ensure_connection(max_retries=1, timeout=3)
            health_data['celery'] = {
                'service_name': 'celery',
                'status': 'degraded',
                'response_time_ms': round((time.monotonic() - t0) * 1000),
                'details': {'broker': 'connected', 'active_workers': 0},
                'error_message': 'Broker reachable — no Celery workers are running',
                'checked_at': now,
            }
        except Exception as e:
            err_msg = str(e)
            if len(err_msg) > 200:
                err_msg = err_msg[:200].rsplit(' ', 1)[0] + '…'
            health_data['celery'] = {
                'service_name': 'celery', 'status': 'unhealthy',
                'response_time_ms': round((time.monotonic() - t0) * 1000),
                'details': {}, 'error_message': err_msg, 'checked_at': now,
            }

        statuses = [h['status'] for h in health_data.values()]
        if all(s == 'healthy' for s in statuses):
            overall_status = 'healthy'
        elif any(s == 'unhealthy' for s in statuses):
            overall_status = 'unhealthy'
        elif any(s == 'degraded' for s in statuses):
            overall_status = 'degraded'
        else:
            overall_status = 'unknown'

        return Response({
            'overall_status': overall_status,
            'services': health_data,
            'checked_at': now,
        })

    def post(self, request):
        """POST re-uses GET — returns a fresh live check."""
        return self.get(request)


class PlatformStatsView(APIView):
    """View for platform-wide statistics."""

    permission_classes = [IsSuperAdmin]

    def get(self, request):
        from apps.organizations.models import Organization
        from apps.users.models import CustomUser
        from apps.documents.models import Document

        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = now - timedelta(days=7)

        # Organization stats
        total_orgs = Organization.objects.count()
        active_orgs = Organization.objects.filter(is_active=True).count()
        trial_orgs = Organization.objects.filter(subscription_status='trial').count()

        # User stats
        total_users = CustomUser.objects.count()
        active_users_today = CustomUser.objects.filter(
            last_login__gte=today_start
        ).count()

        # Document stats
        total_documents = Document.objects.count()
        total_storage = Document.objects.aggregate(
            total=Sum('file_size')
        )['total'] or 0
        total_storage_gb = total_storage / (1024 * 1024 * 1024)

        # MinIO bucket / server capacity (real disk values)
        from apps.documents.utils import _get_minio_bucket_size, _get_minio_server_capacity
        bucket_used_bytes = _get_minio_bucket_size() or 0
        server_total_bytes, server_avail_bytes = _get_minio_server_capacity()
        server_total_bytes = server_total_bytes or 0
        server_avail_bytes = server_avail_bytes or 0

        # Plan distribution
        plan_counts = Organization.objects.values('subscription_plan').annotate(
            count=Count('id')
        )
        orgs_by_plan = {p['subscription_plan']: p['count'] for p in plan_counts}

        # Recent signups
        recent_signups = Organization.objects.filter(
            created_at__gte=week_ago
        ).count()

        stats = {
            'total_organizations': total_orgs,
            'active_organizations': active_orgs,
            'trial_organizations': trial_orgs,
            'total_users': total_users,
            'active_users_today': active_users_today,
            'total_documents': total_documents,
            'total_storage_used_gb': round(total_storage_gb, 2),
            'api_requests_today': 0,
            'organizations_by_plan': orgs_by_plan,
            'recent_signups': recent_signups,
            # MinIO object store
            'bucket_used_bytes': bucket_used_bytes,
            'bucket_used_gb': round(bucket_used_bytes / (1024 ** 3), 3),
            'server_total_bytes': server_total_bytes,
            'server_total_gb': round(server_total_bytes / (1024 ** 3), 1),
            'server_available_bytes': server_avail_bytes,
            'server_available_gb': round(server_avail_bytes / (1024 ** 3), 1),
        }

        serializer = PlatformStatsSerializer(stats)
        return Response(serializer.data)


class OrganizationManagementViewSet(viewsets.ViewSet):
    """ViewSet for super admin organization management."""

    permission_classes = [IsSuperAdmin]

    def list(self, request):
        """List all organizations with key metrics."""
        from apps.organizations.models import Organization

        organizations = Organization.objects.all().order_by('-created_at')

        # Apply filters
        plan = request.query_params.get('plan')
        status_filter = request.query_params.get('status')
        search = request.query_params.get('search')

        if plan:
            organizations = organizations.filter(subscription_plan=plan)
        if status_filter:
            organizations = organizations.filter(subscription_status=status_filter)
        if search:
            organizations = organizations.filter(
                models.Q(name__icontains=search) |
                models.Q(domain__icontains=search)
            )

        data = []
        for org in organizations:
            data.append({
                'id': org.id,
                'name': org.name,
                'domain': org.domain,
                'subscription_plan': org.subscription_plan,
                'subscription_status': org.subscription_status,
                'max_users': org.max_users,
                'current_user_count': org.current_user_count,
                'max_storage_gb': org.max_storage_gb,
                'is_active': org.is_active,
                'created_at': org.created_at,
            })

        serializer = OrganizationListSerializer(data, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        """Get detailed organization info."""
        from apps.organizations.models import Organization

        try:
            org = Organization.objects.get(pk=pk)
        except Organization.DoesNotExist:
            return Response(
                {'error': 'Organization not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get feature flags
        feature_flags = {}
        if hasattr(org, 'feature_flags'):
            flags = org.feature_flags
            for field in flags._meta.get_fields():
                if field.name not in ['id', 'organization', 'created_at', 'updated_at']:
                    feature_flags[field.name] = getattr(flags, field.name, None)

        return Response({
            'id': org.id,
            'name': org.name,
            'domain': org.domain,
            'slug': org.slug,
            'subscription_plan': org.subscription_plan,
            'subscription_status': org.subscription_status,
            'max_users': org.max_users,
            'current_user_count': org.current_user_count,
            'max_storage_gb': org.max_storage_gb,
            'max_documents': org.max_documents,
            'is_active': org.is_active,
            'trial_ends_at': org.trial_ends_at,
            'registration_number': org.registration_number,
            'tax_id': org.tax_id,
            'industry': org.industry,
            'country': org.country,
            'feature_flags': feature_flags,
            'created_at': org.created_at,
            'updated_at': org.updated_at,
        })

    @action(detail=True, methods=['post'])
    def suspend(self, request, pk=None):
        """Suspend an organization."""
        from apps.organizations.models import Organization

        try:
            org = Organization.objects.get(pk=pk)
        except Organization.DoesNotExist:
            return Response(
                {'error': 'Organization not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        org.subscription_status = 'suspended'
        org.is_active = False
        org.save()

        return Response({'status': 'Organization suspended'})

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a suspended organization."""
        from apps.organizations.models import Organization

        try:
            org = Organization.objects.get(pk=pk)
        except Organization.DoesNotExist:
            return Response(
                {'error': 'Organization not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        org.is_active = True
        if org.subscription_status == 'suspended':
            org.subscription_status = 'active'
        org.save()

        return Response({'status': 'Organization activated'})

    @action(detail=True, methods=['post'])
    def update_limits(self, request, pk=None):
        """Update organization resource limits."""
        from apps.organizations.models import Organization

        try:
            org = Organization.objects.get(pk=pk)
        except Organization.DoesNotExist:
            return Response(
                {'error': 'Organization not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        if 'max_users' in request.data:
            org.max_users = request.data['max_users']
        if 'max_storage_gb' in request.data:
            org.max_storage_gb = request.data['max_storage_gb']
        if 'max_documents' in request.data:
            org.max_documents = request.data['max_documents']

        org.save()

        return Response({
            'status': 'Limits updated',
            'max_users': org.max_users,
            'max_storage_gb': org.max_storage_gb,
            'max_documents': org.max_documents,
        })

    @action(detail=True, methods=['post'])
    def update_plan(self, request, pk=None):
        """Update organization subscription plan."""
        from apps.organizations.models import Organization
        from apps.organizations.settings_models import OrganizationFeatureFlags

        try:
            org = Organization.objects.get(pk=pk)
        except Organization.DoesNotExist:
            return Response(
                {'error': 'Organization not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        new_plan = request.data.get('plan')
        if new_plan not in ['free', 'starter', 'professional', 'enterprise']:
            return Response(
                {'error': 'Invalid plan'},
                status=status.HTTP_400_BAD_REQUEST
            )

        org.subscription_plan = new_plan
        org.save()

        # Update feature flags based on new plan
        feature_flags, created = OrganizationFeatureFlags.objects.get_or_create(
            organization=org
        )
        plan_features = OrganizationFeatureFlags.get_plan_features(new_plan)
        for key, value in plan_features.items():
            if hasattr(feature_flags, key):
                setattr(feature_flags, key, value)
        feature_flags.save()

        return Response({
            'status': 'Plan updated',
            'new_plan': new_plan,
        })

    @action(detail=True, methods=['patch'])
    def update_features(self, request, pk=None):
        """Update organization feature flags (override plan defaults)."""
        from apps.organizations.models import Organization
        from apps.organizations.settings_models import OrganizationFeatureFlags

        try:
            org = Organization.objects.get(pk=pk)
        except Organization.DoesNotExist:
            return Response(
                {'error': 'Organization not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = FeatureFlagsUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        feature_flags, created = OrganizationFeatureFlags.objects.get_or_create(
            organization=org
        )

        for key, value in serializer.validated_data.items():
            if hasattr(feature_flags, key):
                setattr(feature_flags, key, value)
        feature_flags.save()

        return Response({'status': 'Features updated'})
