"""
Development settings for DFC project.
"""

from .base import *  # noqa

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '[::1]']

# Development-specific apps
INSTALLED_APPS += [
    'django_extensions',
    'debug_toolbar',
]

# Debug Toolbar
MIDDLEWARE += [
    'debug_toolbar.middleware.DebugToolbarMiddleware',
]

INTERNAL_IPS = [
    '127.0.0.1',
]

# Email backend for development (prints to console)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

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
