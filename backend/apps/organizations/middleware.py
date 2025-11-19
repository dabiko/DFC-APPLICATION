"""
Tenant middleware for multi-tenant data isolation.

Automatically sets the current organization based on the authenticated user.
"""
from django.utils.deprecation import MiddlewareMixin
from .utils import set_current_organization, clear_current_organization


class TenantMiddleware(MiddlewareMixin):
    """
    Middleware to set current organization in thread-local storage.

    This middleware must be placed AFTER AuthenticationMiddleware in settings.
    It automatically sets the organization context based on the authenticated user.
    """

    def process_request(self, request):
        """
        Set the current organization based on authenticated user.

        Args:
            request: HttpRequest object
        """
        # Clear any existing organization context
        clear_current_organization()

        # Set organization from authenticated user
        if request.user and request.user.is_authenticated:
            if hasattr(request.user, 'organization') and request.user.organization:
                set_current_organization(request.user.organization)

        return None

    def process_response(self, request, response):
        """
        Clear organization context after request is processed.

        Args:
            request: HttpRequest object
            response: HttpResponse object

        Returns:
            HttpResponse object
        """
        clear_current_organization()
        return response

    def process_exception(self, request, exception):
        """
        Clear organization context when exception occurs.

        Args:
            request: HttpRequest object
            exception: Exception that was raised

        Returns:
            None (allows exception to propagate)
        """
        clear_current_organization()
        return None
