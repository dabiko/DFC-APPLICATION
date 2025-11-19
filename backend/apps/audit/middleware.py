"""
Middleware for automatic audit context tracking.
"""

from apps.audit.utils import set_audit_context, clear_audit_context, get_client_ip, get_user_agent


class AuditContextMiddleware:
    """
    Middleware to automatically set audit context for each request.

    This middleware extracts user, IP address, and user agent from requests
    and stores them in thread-local storage for automatic inclusion in audit logs.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Set audit context before processing the request
        user = request.user if request.user.is_authenticated else None
        ip_address = get_client_ip(request)
        user_agent = get_user_agent(request)
        session_id = request.session.session_key if hasattr(request, 'session') else None

        set_audit_context(
            user=user,
            ip_address=ip_address,
            user_agent=user_agent,
            session_id=session_id
        )

        try:
            response = self.get_response(request)
            return response
        finally:
            # Clear audit context after processing the request
            clear_audit_context()
