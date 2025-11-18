"""
Production settings for DFC project.
"""

from .base import *  # noqa

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '').split(',')  # noqa

# Security settings
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# Production logging
LOGGING['handlers']['file'] = {  # noqa
    'level': 'ERROR',
    'class': 'logging.FileHandler',
    'filename': BASE_DIR / 'logs' / 'django.log',  # noqa
    'formatter': 'verbose'
}

LOGGING['root']['handlers'] = ['console', 'file']  # noqa
LOGGING['loggers']['django']['handlers'] = ['console', 'file']  # noqa

# Sentry integration for error tracking
SENTRY_DSN = os.getenv('SENTRY_DSN', '')  # noqa
if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration()],
        traces_sample_rate=0.1,
        send_default_pii=False
    )
