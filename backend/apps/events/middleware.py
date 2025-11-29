"""
Middleware for the event-driven architecture.

This module provides middleware that captures request context
for event publishing.
"""

import uuid
import logging
from typing import Callable

from django.http import HttpRequest, HttpResponse

from .handlers import set_event_context, clear_event_context

logger = logging.getLogger(__name__)


class EventContextMiddleware:
    """
    Middleware that captures request context for event publishing.

    This middleware extracts user ID, organization ID, IP address,
    and other context from each request and makes it available
    to event handlers via thread-local storage.
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        # Extract context from request
        user_id = None
        organization_id = None

        if hasattr(request, 'user') and request.user.is_authenticated:
            user_id = str(request.user.id)
            # Try to get organization from user profile
            if hasattr(request.user, 'organization_id'):
                organization_id = str(request.user.organization_id)
            elif hasattr(request.user, 'profile') and hasattr(request.user.profile, 'organization_id'):
                organization_id = str(request.user.profile.organization_id)

        # Generate or extract correlation ID
        correlation_id = request.headers.get(
            'X-Correlation-ID',
            request.headers.get('X-Request-ID', str(uuid.uuid4()))
        )

        # Get client IP address
        ip_address = self._get_client_ip(request)

        # Set context for event handlers
        set_event_context(
            user_id=user_id,
            organization_id=organization_id,
            correlation_id=correlation_id,
            ip_address=ip_address,
        )

        # Store correlation ID on request for use in responses
        request.correlation_id = correlation_id

        try:
            response = self.get_response(request)

            # Add correlation ID to response headers
            response['X-Correlation-ID'] = correlation_id

            return response
        finally:
            # Clear context after request is complete
            clear_event_context()

    def _get_client_ip(self, request: HttpRequest) -> str:
        """Extract client IP address from request."""
        # Check for forwarded IP (behind proxy/load balancer)
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            # Take the first IP in the chain
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '')
        return ip


class EventHealthCheckMiddleware:
    """
    Middleware that adds event system health to health check responses.
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        response = self.get_response(request)

        # Add event system health to health check endpoints
        if request.path.endswith('/health/') or request.path.endswith('/health'):
            from .connection import get_connection_manager
            try:
                manager = get_connection_manager()
                is_healthy = manager.is_healthy()
                response['X-Events-Health'] = 'healthy' if is_healthy else 'unhealthy'
            except Exception:
                response['X-Events-Health'] = 'unknown'

        return response
