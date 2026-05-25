"""
Maintenance mode middleware.

When maintenance_mode is enabled in SystemSettings, all requests from
non-superusers (and IPs not in maintenance_allowed_ips) receive a 503
JSON response with the configured maintenance message.
"""

import json
from django.http import JsonResponse
from django.core.cache import cache


class MaintenanceModeMiddleware:
    CACHE_KEY = 'system_settings_maintenance'
    CACHE_TTL = 30  # seconds — short TTL so toggles apply quickly

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Skip maintenance check for auth endpoints so admins can still log in
        skip_paths = ('/api/v1/auth/login/', '/api/v1/auth/token/refresh/')
        if any(request.path.startswith(p) for p in skip_paths):
            return self.get_response(request)

        maintenance_info = self._get_maintenance_info()

        if maintenance_info['enabled']:
            # Superusers bypass maintenance mode
            if request.user.is_authenticated and request.user.is_superuser:
                return self.get_response(request)

            # IP allow-list bypass
            client_ip = self._get_client_ip(request)
            allowed_ips = maintenance_info.get('allowed_ips') or []
            if client_ip and client_ip in allowed_ips:
                return self.get_response(request)

            message = maintenance_info.get('message') or 'The platform is currently undergoing maintenance. Please try again later.'
            return JsonResponse(
                {'detail': message, 'code': 'maintenance_mode'},
                status=503,
            )

        return self.get_response(request)

    def _get_maintenance_info(self) -> dict:
        cached = cache.get(self.CACHE_KEY)
        if cached is not None:
            return cached

        try:
            from apps.system.models import SystemSettings
            settings = SystemSettings.objects.first()
            if settings is None:
                info = {'enabled': False}
            else:
                info = {
                    'enabled': settings.maintenance_mode,
                    'message': settings.maintenance_message,
                    'allowed_ips': settings.maintenance_allowed_ips or [],
                }
        except Exception:
            info = {'enabled': False}

        cache.set(self.CACHE_KEY, info, self.CACHE_TTL)
        return info

    @staticmethod
    def _get_client_ip(request) -> str:
        forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '')
