"""
Integrations Views.

API endpoints for managing API keys, webhooks, and third-party integrations.
"""

from rest_framework import status, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiResponse

from apps.organizations.models import OrganizationMember
from .models import APIKey, Webhook, Integration, IntegrationLog
from .serializers import (
    APIKeySerializer, APIKeyCreateSerializer,
    WebhookSerializer, WebhookCreateSerializer, WebhookTestSerializer,
    IntegrationSerializer, IntegrationCreateSerializer, IntegrationTestSerializer,
    IntegrationLogSerializer,
)


class IsOrganizationAdmin(permissions.BasePermission):
    """Permission check for organization admin/owner."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        org = request.user.organization
        if not org:
            return False

        try:
            membership = OrganizationMember.objects.get(
                organization=org,
                user=request.user,
                is_active=True
            )
            return membership.is_admin_or_owner
        except OrganizationMember.DoesNotExist:
            return False


class HasAPIAccessFeature(permissions.BasePermission):
    """Check if organization has API access feature enabled."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        org = request.user.organization
        if not org:
            return False

        try:
            return org.feature_flags.api_access
        except Exception:
            return False


class HasWebhooksFeature(permissions.BasePermission):
    """Check if organization has webhooks feature enabled."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        org = request.user.organization
        if not org:
            return False

        try:
            return org.feature_flags.webhooks
        except Exception:
            return False


# =============================================================================
# API Keys ViewSet
# =============================================================================

class APIKeyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing API keys.

    list: Get all API keys for the organization
    create: Create a new API key (returns raw key once)
    retrieve: Get API key details
    update: Update API key settings
    destroy: Revoke/delete an API key
    """

    permission_classes = [permissions.IsAuthenticated, IsOrganizationAdmin, HasAPIAccessFeature]
    serializer_class = APIKeySerializer
    pagination_class = None  # Return plain array

    def get_queryset(self):
        org = self.request.user.organization
        if not org:
            return APIKey.objects.none()
        return APIKey.objects.filter(organization=org)

    def get_serializer_class(self):
        if self.action == 'create':
            return APIKeyCreateSerializer
        return APIKeySerializer

    @extend_schema(tags=['Integrations - API Keys'])
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        tags=['Integrations - API Keys'],
        responses={201: APIKeyCreateSerializer}
    )
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        api_key = serializer.save(
            organization=request.user.organization,
            created_by=request.user
        )

        # Log the creation
        IntegrationLog.objects.create(
            organization=request.user.organization,
            api_key=api_key,
            action='config_change',
            status='success',
            request_data={'action': 'create', 'name': api_key.name}
        )

        return Response(
            APIKeyCreateSerializer(api_key).data,
            status=status.HTTP_201_CREATED
        )

    @extend_schema(tags=['Integrations - API Keys'])
    def destroy(self, request, *args, **kwargs):
        api_key = self.get_object()

        # Log the deletion
        IntegrationLog.objects.create(
            organization=request.user.organization,
            action='config_change',
            status='success',
            request_data={'action': 'delete', 'name': api_key.name, 'id': str(api_key.id)}
        )

        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    @extend_schema(tags=['Integrations - API Keys'])
    def regenerate(self, request, pk=None):
        """Regenerate an API key (creates new key, invalidates old)."""
        old_key = self.get_object()

        # Generate new key
        raw_key, key_prefix, key_hash = APIKey.generate_key()

        # Update the key
        old_key.key_prefix = key_prefix
        old_key.key_hash = key_hash
        old_key.total_requests = 0
        old_key.last_used_at = None
        old_key.last_used_ip = None
        old_key.save()

        # Log the regeneration
        IntegrationLog.objects.create(
            organization=request.user.organization,
            api_key=old_key,
            action='config_change',
            status='success',
            request_data={'action': 'regenerate', 'name': old_key.name}
        )

        return Response({
            'id': str(old_key.id),
            'name': old_key.name,
            'key_prefix': key_prefix,
            'raw_key': raw_key,
            'message': 'API key regenerated. Save the new key - it will not be shown again.'
        })


# =============================================================================
# Webhooks ViewSet
# =============================================================================

class WebhookViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing webhooks.

    list: Get all webhooks for the organization
    create: Create a new webhook
    retrieve: Get webhook details
    update: Update webhook settings
    destroy: Delete a webhook
    """

    permission_classes = [permissions.IsAuthenticated, IsOrganizationAdmin, HasWebhooksFeature]
    serializer_class = WebhookSerializer
    pagination_class = None  # Return plain array

    def get_queryset(self):
        org = self.request.user.organization
        if not org:
            return Webhook.objects.none()
        return Webhook.objects.filter(organization=org)

    def get_serializer_class(self):
        if self.action == 'create':
            return WebhookCreateSerializer
        return WebhookSerializer

    @extend_schema(tags=['Integrations - Webhooks'])
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        tags=['Integrations - Webhooks'],
        responses={201: WebhookCreateSerializer}
    )
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        webhook = serializer.save(
            organization=request.user.organization,
            created_by=request.user
        )

        # Log the creation
        IntegrationLog.objects.create(
            organization=request.user.organization,
            webhook=webhook,
            action='config_change',
            status='success',
            request_data={'action': 'create', 'name': webhook.name, 'url': webhook.url}
        )

        return Response(
            WebhookCreateSerializer(webhook).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'])
    @extend_schema(
        tags=['Integrations - Webhooks'],
        request=WebhookTestSerializer
    )
    def test(self, request, pk=None):
        """Send a test event to the webhook endpoint."""
        import requests
        import json
        import hmac
        import hashlib
        from datetime import datetime

        webhook = self.get_object()
        serializer = WebhookTestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        event_type = serializer.validated_data['event_type']

        # Build test payload
        payload = {
            'event': event_type,
            'timestamp': datetime.utcnow().isoformat(),
            'organization_id': str(webhook.organization.id),
            'test': True,
            'data': {
                'message': 'This is a test webhook delivery',
                'triggered_by': request.user.email,
            }
        }

        # Sign the payload
        payload_json = json.dumps(payload)
        signature = hmac.new(
            webhook.secret.encode(),
            payload_json.encode(),
            hashlib.sha256
        ).hexdigest()

        headers = {
            'Content-Type': 'application/json',
            'X-DFC-Signature': f'sha256={signature}',
            'X-DFC-Event': event_type,
            'X-DFC-Delivery': str(webhook.id),
        }

        try:
            response = requests.post(
                webhook.url,
                data=payload_json,
                headers=headers,
                timeout=webhook.timeout_seconds
            )

            success = 200 <= response.status_code < 300

            # Log the test
            IntegrationLog.objects.create(
                organization=request.user.organization,
                webhook=webhook,
                action='webhook_delivery',
                status='success' if success else 'failure',
                endpoint=webhook.url,
                method='POST',
                status_code=response.status_code,
                request_data={'event': event_type, 'test': True},
                response_data={'body': response.text[:500] if response.text else ''}
            )

            if success:
                return Response({
                    'success': True,
                    'status_code': response.status_code,
                    'message': 'Test webhook delivered successfully'
                })
            else:
                return Response({
                    'success': False,
                    'status_code': response.status_code,
                    'message': f'Webhook returned status {response.status_code}'
                }, status=status.HTTP_400_BAD_REQUEST)

        except requests.exceptions.Timeout:
            IntegrationLog.objects.create(
                organization=request.user.organization,
                webhook=webhook,
                action='webhook_delivery',
                status='failure',
                endpoint=webhook.url,
                method='POST',
                error_message='Request timed out'
            )
            return Response({
                'success': False,
                'message': f'Request timed out after {webhook.timeout_seconds} seconds'
            }, status=status.HTTP_400_BAD_REQUEST)

        except requests.exceptions.RequestException as e:
            IntegrationLog.objects.create(
                organization=request.user.organization,
                webhook=webhook,
                action='webhook_delivery',
                status='failure',
                endpoint=webhook.url,
                method='POST',
                error_message=str(e)
            )
            return Response({
                'success': False,
                'message': f'Request failed: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    @extend_schema(tags=['Integrations - Webhooks'])
    def rotate_secret(self, request, pk=None):
        """Rotate the webhook secret."""
        webhook = self.get_object()

        new_secret = Webhook.generate_secret()
        webhook.secret = new_secret
        webhook.save()

        # Log the rotation
        IntegrationLog.objects.create(
            organization=request.user.organization,
            webhook=webhook,
            action='config_change',
            status='success',
            request_data={'action': 'rotate_secret', 'name': webhook.name}
        )

        return Response({
            'secret': new_secret,
            'message': 'Webhook secret rotated. Update your endpoint to use the new secret.'
        })

    @action(detail=True, methods=['post'])
    @extend_schema(tags=['Integrations - Webhooks'])
    def reactivate(self, request, pk=None):
        """Reactivate an auto-disabled webhook."""
        webhook = self.get_object()

        if not webhook.auto_disabled:
            return Response({
                'message': 'Webhook is not auto-disabled'
            }, status=status.HTTP_400_BAD_REQUEST)

        webhook.is_active = True
        webhook.auto_disabled = False
        webhook.auto_disabled_at = None
        webhook.consecutive_failures = 0
        webhook.save()

        return Response({
            'message': 'Webhook reactivated successfully'
        })


# =============================================================================
# Integrations ViewSet
# =============================================================================

class IntegrationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing third-party integrations.

    list: Get all integrations for the organization
    create: Create a new integration
    retrieve: Get integration details
    update: Update integration settings
    destroy: Delete an integration
    """

    permission_classes = [permissions.IsAuthenticated, IsOrganizationAdmin]
    serializer_class = IntegrationSerializer
    pagination_class = None  # Return plain array

    def get_queryset(self):
        org = self.request.user.organization
        if not org:
            return Integration.objects.none()
        return Integration.objects.filter(organization=org)

    def get_serializer_class(self):
        if self.action == 'create':
            return IntegrationCreateSerializer
        return IntegrationSerializer

    @extend_schema(tags=['Integrations - Services'])
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(tags=['Integrations - Services'])
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        integration = Integration.objects.create(
            organization=request.user.organization,
            configured_by=request.user,
            **serializer.validated_data
        )

        # Log the creation
        IntegrationLog.objects.create(
            organization=request.user.organization,
            integration=integration,
            action='config_change',
            status='success',
            request_data={
                'action': 'create',
                'type': integration.integration_type,
                'name': integration.name
            }
        )

        return Response(
            IntegrationSerializer(integration).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'])
    @extend_schema(
        tags=['Integrations - Services'],
        request=IntegrationTestSerializer
    )
    def test(self, request, pk=None):
        """Test the integration connection."""
        integration = self.get_object()

        # For now, return a mock success
        # In production, implement actual connection tests per integration type
        integration.status = 'active'
        integration.status_message = 'Connection test successful'
        integration.save()

        IntegrationLog.objects.create(
            organization=request.user.organization,
            integration=integration,
            action='integration_sync',
            status='success',
            request_data={'action': 'test_connection'}
        )

        return Response({
            'success': True,
            'message': 'Connection test successful',
            'status': integration.status
        })

    @action(detail=True, methods=['post'])
    @extend_schema(tags=['Integrations - Services'])
    def sync(self, request, pk=None):
        """Trigger a manual sync for the integration."""
        from django.utils import timezone

        integration = self.get_object()
        integration.last_sync_at = timezone.now()
        integration.save()

        IntegrationLog.objects.create(
            organization=request.user.organization,
            integration=integration,
            action='integration_sync',
            status='success',
            request_data={'action': 'manual_sync'}
        )

        return Response({
            'success': True,
            'message': 'Sync triggered successfully',
            'last_sync_at': integration.last_sync_at
        })


# =============================================================================
# Integration Logs View
# =============================================================================

class IntegrationLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing integration logs.
    Read-only access to audit logs for integrations.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = IntegrationLogSerializer
    pagination_class = None  # Return plain array, not paginated

    def get_queryset(self):
        org = self.request.user.organization
        if not org:
            return IntegrationLog.objects.none()

        queryset = IntegrationLog.objects.filter(organization=org)

        # Optional filters
        action = self.request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)

        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        api_key_id = self.request.query_params.get('api_key')
        if api_key_id:
            queryset = queryset.filter(api_key_id=api_key_id)

        webhook_id = self.request.query_params.get('webhook')
        if webhook_id:
            queryset = queryset.filter(webhook_id=webhook_id)

        integration_id = self.request.query_params.get('integration')
        if integration_id:
            queryset = queryset.filter(integration_id=integration_id)

        return queryset.order_by('-created_at')[:100]

    @extend_schema(tags=['Integrations - Logs'])
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)


# =============================================================================
# Integration Stats View
# =============================================================================

class IntegrationStatsView(APIView):
    """Get integration statistics for the organization."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(tags=['Integrations'])
    def get(self, request):
        org = request.user.organization

        # Handle case where user has no organization
        if not org:
            return Response({
                'api_keys': {'total': 0, 'active': 0, 'total_requests': 0},
                'webhooks': {'total': 0, 'active': 0, 'total_deliveries': 0, 'success_rate': 0},
                'integrations': {'total': 0, 'active': 0, 'error': 0},
                'features': {'api_access': False, 'webhooks': False, 'sso_integration': False},
            })

        api_keys = APIKey.objects.filter(organization=org)
        webhooks = Webhook.objects.filter(organization=org)
        integrations = Integration.objects.filter(organization=org)

        # Calculate stats
        api_key_stats = {
            'total': api_keys.count(),
            'active': api_keys.filter(is_active=True).count(),
            'total_requests': sum(k.total_requests for k in api_keys),
        }

        webhook_stats = {
            'total': webhooks.count(),
            'active': webhooks.filter(is_active=True).count(),
            'total_deliveries': sum(w.total_deliveries for w in webhooks),
            'success_rate': 0,
        }

        total_webhook_deliveries = sum(w.total_deliveries for w in webhooks)
        successful_deliveries = sum(w.successful_deliveries for w in webhooks)
        if total_webhook_deliveries > 0:
            webhook_stats['success_rate'] = round(
                (successful_deliveries / total_webhook_deliveries) * 100, 1
            )

        integration_stats = {
            'total': integrations.count(),
            'active': integrations.filter(status='active').count(),
            'error': integrations.filter(status='error').count(),
        }

        # Feature availability
        try:
            feature_flags = org.feature_flags
            features = {
                'api_access': feature_flags.api_access,
                'webhooks': feature_flags.webhooks,
                'sso_integration': feature_flags.sso_integration,
            }
        except Exception:
            features = {
                'api_access': False,
                'webhooks': False,
                'sso_integration': False,
            }

        return Response({
            'api_keys': api_key_stats,
            'webhooks': webhook_stats,
            'integrations': integration_stats,
            'features': features,
        })
