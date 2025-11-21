"""
Development settings for DFC project.
"""

from .base import *  # noqa

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '[::1]']

# Development-specific apps
INSTALLED_APPS += [
    # 'django_extensions',  # Not installed yet
    # 'debug_toolbar',  # Not installed yet
]

# Debug Toolbar
# MIDDLEWARE += [
#     'debug_toolbar.middleware.DebugToolbarMiddleware',
# ]

INTERNAL_IPS = [
    '127.0.0.1',
]

# Email backend for development (prints to console)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Email settings
import os  # noqa
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'noreply@digitalfilingcabinet.com')
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')

# Disable SSL redirect in development
SECURE_SSL_REDIRECT = False

# Simplified password hashing for development (faster)
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# Additional logging for development
LOGGING['loggers']['django']['level'] = 'DEBUG'  # noqa
LOGGING['loggers']['apps'] = {  # noqa
    'handlers': ['console'],
    'level': 'DEBUG',
    'propagate': False,
}

# CORS Settings for Development (allow all origins for easier testing)
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
