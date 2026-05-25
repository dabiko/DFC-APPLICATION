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
        # Skip maintenance check for auth endpoints and the public status endpoint
        skip_paths = (
            '/api/v1/auth/login/',
            '/api/v1/auth/token/refresh/',
            '/api/v1/system/status/',
            '/api/v1/system/public-info/',
            '/api/v1/system/settings/',  # Always allow admins to toggle maintenance off
        )
        if any(request.path.startswith(p) for p in skip_paths):
            return self.get_response(request)

        maintenance_info = self._get_maintenance_info()

        if maintenance_info['enabled']:
            # Superusers bypass maintenance mode.
            # AuthenticationMiddleware only handles session auth, not JWT, so we
            # must also authenticate the JWT token directly in the middleware.
            if (request.user.is_authenticated and request.user.is_superuser) or self._is_superuser_via_jwt(request):
                return self.get_response(request)

            # IP allow-list bypass
            client_ip = self._get_client_ip(request)
            allowed_ips = maintenance_info.get('allowed_ips') or []
            if client_ip and client_ip in allowed_ips:
                return self.get_response(request)

            message = maintenance_info.get('message') or 'The platform is currently undergoing maintenance. Please try again later.'
            return JsonResponse(
                {
                    'detail': message,
                    'code': 'maintenance_mode',
                    'estimated_end': maintenance_info.get('estimated_end'),
                    'started_at': maintenance_info.get('started_at'),
                },
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
                started_by_name = None
                if settings.maintenance_started_by_id:
                    try:
                        u = settings.maintenance_started_by
                        started_by_name = u.get_full_name() or u.email
                    except Exception:
                        pass
                info = {
                    'enabled': settings.maintenance_mode,
                    'message': settings.maintenance_message,
                    'allowed_ips': settings.maintenance_allowed_ips or [],
                    'estimated_end': settings.maintenance_estimated_end.isoformat() if settings.maintenance_estimated_end else None,
                    'started_at': settings.maintenance_started_at.isoformat() if settings.maintenance_started_at else None,
                    'started_by_name': started_by_name,
                }
        except Exception:
            info = {'enabled': False}

        cache.set(self.CACHE_KEY, info, self.CACHE_TTL)
        return info

    @staticmethod
    def _is_superuser_via_jwt(request) -> bool:
        """Authenticate the JWT token in the Authorization header and check superuser status."""
        try:
            from apps.users.mfa_authentication import MFAJWTAuthentication
            auth = MFAJWTAuthentication()
            result = auth.authenticate(request)
            if result:
                user, _ = result
                return bool(user.is_superuser)
        except Exception:
            pass
        return False

    @staticmethod
    def _get_client_ip(request) -> str:
        forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '')
