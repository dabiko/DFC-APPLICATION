"""
Security middleware for adding security headers to all HTTP responses.

Implements best practices for web application security headers
to protect against common vulnerabilities.
"""


class SecurityHeadersMiddleware:
    """
    Add comprehensive security headers to all HTTP responses.

    Headers added:
    - Strict-Transport-Security (HSTS)
    - X-Frame-Options (Clickjacking protection)
    - X-Content-Type-Options (MIME sniffing protection)
    - X-XSS-Protection (XSS filter)
    - Referrer-Policy (Referrer leakage protection)
    - Content-Security-Policy (CSP)
    - Permissions-Policy (Feature policy)
    """

    def __init__(self, get_response):
        """
        Initialize middleware.

        Args:
            get_response: Next middleware or view in the chain
        """
        self.get_response = get_response

    def __call__(self, request):
        """
        Process request and add security headers to response.

        Args:
            request: HttpRequest object

        Returns:
            HttpResponse with security headers
        """
        response = self.get_response(request)

        # HTTP Strict Transport Security (HSTS)
        # Force HTTPS for the next 2 years, including subdomains
        response['Strict-Transport-Security'] = (
            'max-age=63072000; includeSubDomains; preload'
        )

        # Prevent clickjacking attacks
        # Only allow framing from same origin
        response['X-Frame-Options'] = 'SAMEORIGIN'

        # Prevent MIME type sniffing
        # Browser must respect declared Content-Type
        response['X-Content-Type-Options'] = 'nosniff'

        # Enable XSS filter
        # Block page if XSS attack detected
        response['X-XSS-Protection'] = '1; mode=block'

        # Referrer Policy
        # Only send origin when navigating to same-origin, full URL when HTTPS->HTTPS
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'

        # Content Security Policy
        # Define allowed sources for content
        # Relax CSP for API documentation endpoints
        if request.path.startswith('/api/docs/') or request.path.startswith('/api/redoc/'):
            # Allow CDN resources for Swagger UI and ReDoc
            response['Content-Security-Policy'] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "
                "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "img-src 'self' data: https:; "
                "font-src 'self' data: https://cdn.jsdelivr.net; "
                "connect-src 'self' https://cdn.jsdelivr.net; "  # Allow CDN for source maps
                "frame-ancestors 'self'; "
                "form-action 'self'; "
                "base-uri 'self';"
            )
        else:
            # Strict CSP for other endpoints
            response['Content-Security-Policy'] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "  # TODO: Remove unsafe-* in production
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self' data:; "
                "connect-src 'self'; "
                "frame-ancestors 'self'; "
                "form-action 'self'; "
                "base-uri 'self';"
            )

        # Permissions Policy (formerly Feature-Policy)
        # Disable sensitive browser features
        response['Permissions-Policy'] = (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "payment=(), "
            "usb=(), "
            "magnetometer=(), "
            "gyroscope=()"
        )

        # Additional security header for cross-origin policies
        response['Cross-Origin-Opener-Policy'] = 'same-origin'
        response['Cross-Origin-Resource-Policy'] = 'same-origin'
        response['Cross-Origin-Embedder-Policy'] = 'require-corp'

        return response
