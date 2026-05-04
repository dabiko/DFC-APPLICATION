"""
Base settings for DFC project.
Common settings shared across all environments.
"""

import os
from pathlib import Path

# Build paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Security
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-change-this-in-production')

# Application definition
INSTALLED_APPS = [
    # Django apps
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'drf_spectacular',
    'django_elasticsearch_dsl',
    'django_otp',
    'django_otp.plugins.otp_totp',

    # Local apps
    'apps.core',  # Core utilities, encryption, middleware
    'apps.users',
    'apps.organizations',  # Multi-tenant organization management
    'apps.billing',  # Billing & subscription management
    'apps.storage',  # MinIO storage integration
    'apps.documents',
    'apps.folders',
    'apps.search',
    'apps.audit',
    'apps.permissions',
    'apps.workflows',
    'apps.retention',
    'apps.classification',
    'apps.sharing',
    'apps.compliance',  # Compliance management center
    'apps.intelligence',  # Document intelligence (NLP, table extraction)
    'apps.events',  # Event-driven architecture (RabbitMQ)
    'apps.integrations',  # API keys, webhooks, and third-party integrations
    'apps.system',  # System administration (super admin)
    'apps.procedures',  # Procedure management & training
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # CORS middleware - must be first!
    'django.middleware.security.SecurityMiddleware',
    'apps.core.middleware.SecurityHeadersMiddleware',  # Security headers
    # 'django.middleware.gzip.GZipMiddleware',  # Disabled: causes ERR_CONTENT_LENGTH_MISMATCH with dev server. Enable in production via reverse proxy (nginx) instead.
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'apps.organizations.middleware.TenantMiddleware',  # Multi-tenant organization context
    'django_otp.middleware.OTPMiddleware',  # MFA middleware
    'apps.users.mfa_middleware.MFAEnforcementMiddleware',  # MFA enforcement for admin
    'apps.users.mfa_middleware.MFASessionMiddleware',  # MFA session management
    'apps.audit.middleware.AuditContextMiddleware',  # Audit context tracking
    'apps.events.middleware.EventContextMiddleware',  # Event-driven architecture context
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.documents.middleware.StorageQuotaMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database
# https://docs.djangoproject.com/en/5.1/ref/settings/#databases
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'dfc_database'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': os.getenv('DB_PASSWORD', 'dabiko'),
        'HOST': os.getenv('DB_HOST', '127.0.0.1'),  # Use IPv4 explicitly
        'PORT': os.getenv('DB_PORT', '5432'),
        'OPTIONS': {
            'connect_timeout': 10,
            'options': '-c search_path=public',
        },
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 8,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Africa/Douala'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom User Model (will be created)
AUTH_USER_MODEL = 'users.CustomUser'

# Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'apps.users.mfa_authentication.MFAJWTAuthentication',  # Custom JWT with MFA check
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# JWT Settings
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=int(os.getenv('JWT_ACCESS_TOKEN_LIFETIME', 60))),
    'REFRESH_TOKEN_LIFETIME': timedelta(minutes=int(os.getenv('JWT_REFRESH_TOKEN_LIFETIME', 1440))),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
}

# CORS Settings
CORS_ALLOWED_ORIGINS = os.getenv(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:3000,http://localhost:3002,http://localhost:3003'
).split(',')

CORS_ALLOW_CREDENTIALS = True

# Allow custom headers for device fingerprinting
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'x-device-fingerprint',  # Custom header for trusted device identification
    'range',  # Required for PDF/video streaming via react-pdf and HTML5 media
]

# Expose headers the browser needs to read from cross-origin responses
# (range metadata for partial-content downloads, filename for download UX).
CORS_EXPOSE_HEADERS = [
    'content-disposition',
    'content-length',
    'content-range',
    'accept-ranges',
]

# CSRF Settings
CSRF_TRUSTED_ORIGINS = os.getenv(
    'CSRF_TRUSTED_ORIGINS',
    'http://localhost:3000,http://localhost:3002,http://localhost:3003'
).split(',')

# Spectacular Settings (API Documentation)
SPECTACULAR_SETTINGS = {
    'TITLE': 'Digital Filing Cabinet API',
    'DESCRIPTION': 'REST API for the Digital Filing Cabinet document management system',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    # Allow unauthenticated access to API documentation for testing
    'SERVE_PERMISSIONS': ['rest_framework.permissions.AllowAny'],
    'SERVE_AUTHENTICATION': [],  # No authentication required for schema/docs
}

# Celery Configuration
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'amqp://dfc_user:dev_password@localhost:5672//')
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/1')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# Redis Cache Configuration
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
    }
}

# MinIO Storage Configuration with Encryption
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
AWS_ACCESS_KEY_ID = os.getenv('MINIO_ACCESS_KEY', 'dfc_minio_admin')
AWS_SECRET_ACCESS_KEY = os.getenv('MINIO_SECRET_KEY', 'dfc_minio_password_2025')
AWS_STORAGE_BUCKET_NAME = os.getenv('MINIO_BUCKET_NAME', 'dfc-documents')
AWS_S3_ENDPOINT_URL = f"http://{os.getenv('MINIO_ENDPOINT', 'localhost:9000')}"
AWS_S3_USE_SSL = os.getenv('MINIO_USE_SSL', 'False') == 'True'
AWS_S3_REGION_NAME = 'us-east-1'
AWS_DEFAULT_ACL = None
AWS_S3_SIGNATURE_VERSION = 's3v4'
AWS_S3_FILE_OVERWRITE = False

# Server-side encryption for MinIO/S3
# Set to True only if MinIO has KMS configured (requires Vault or KES setup)
# For local development without KMS, keep this False
AWS_S3_ENCRYPTION = os.getenv('AWS_S3_ENCRYPTION', 'False') == 'True'
AWS_S3_SERVER_SIDE_ENCRYPTION = 'AES256'  # Use AES-256 encryption when enabled

# Security settings
AWS_QUERYSTRING_AUTH = True  # Use signed URLs
AWS_QUERYSTRING_EXPIRE = 3600  # Signed URLs expire after 1 hour

# Elasticsearch Configuration with TLS
# Note: scheme (http/https) is included in hosts URL
es_scheme = 'https' if os.getenv('ELASTICSEARCH_USE_SSL', 'False') == 'True' else 'http'
es_host = os.getenv('ELASTICSEARCH_HOST', 'localhost')
es_port = os.getenv('ELASTICSEARCH_PORT', '9200')

ELASTICSEARCH_DSL = {
    'default': {
        'hosts': [f"{es_scheme}://{es_host}:{es_port}"],
        'http_auth': (
            os.getenv('ELASTICSEARCH_USER', ''),
            os.getenv('ELASTICSEARCH_PASSWORD', ''),
        ) if os.getenv('ELASTICSEARCH_USER') else None,
        'verify_certs': os.getenv('ELASTICSEARCH_VERIFY_CERTS', 'False') == 'True',
        'ssl_show_warn': False,
        'request_timeout': 30,
        'max_retries': 3,
        'retry_on_timeout': True,
    },
}

# Tesseract OCR Configuration
# Path to Tesseract executable
# Windows: Usually 'C:\\Program Files\\Tesseract-OCR\\tesseract.exe'
# Linux/Ubuntu: Usually '/usr/bin/tesseract'
# macOS: Usually '/usr/local/bin/tesseract'
TESSERACT_CMD = os.getenv('TESSERACT_CMD', '/usr/bin/tesseract')

# Tesseract language packs (default: English)
# Additional languages can be installed:
# - Ubuntu/Debian: sudo apt-get install tesseract-ocr-fra tesseract-ocr-spa
# - Languages: eng (English), fra (French), spa (Spanish), deu (German), etc.
TESSERACT_LANGUAGES = os.getenv('TESSERACT_LANGUAGES', 'eng')

# Email Configuration
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', 'localhost')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 1025))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'False') == 'True'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'noreply@dfc.local')

# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose'
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
    },
}

# ==============================================================================
# ENCRYPTION SETTINGS
# ==============================================================================

# Fernet Field-Level Encryption
# Generate keys with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
FERNET_KEYS = [
    os.getenv('FERNET_KEY_PRIMARY', None),  # Current encryption key
    os.getenv('FERNET_KEY_SECONDARY', None),  # For key rotation (old key)
]

# Remove None values from keys list
FERNET_KEYS = [k for k in FERNET_KEYS if k]

# If no keys configured and in DEBUG mode, will auto-generate (for development only)
if not FERNET_KEYS and not os.getenv('DJANGO_ENV') == 'production':
    # In production, this will raise an error in the encrypted fields
    pass

# HashiCorp Vault Configuration (for production)
VAULT_ADDR = os.getenv('VAULT_ADDR', 'http://localhost:8200')
VAULT_TOKEN = os.getenv('VAULT_TOKEN', None)
VAULT_VERIFY_SSL = os.getenv('VAULT_VERIFY_SSL', 'True') == 'True'

# ==============================================================================
# DJANGO SECURITY SETTINGS
# ==============================================================================

# SSL/HTTPS Settings (enforced in production)
SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'False') == 'True'
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Cookie Security
SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'False') == 'True'
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = os.getenv('CSRF_COOKIE_SECURE', 'False') == 'True'
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Lax'

# Security Headers (additional to middleware)
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'SAMEORIGIN'

# HSTS (HTTP Strict Transport Security)
SECURE_HSTS_SECONDS = int(os.getenv('SECURE_HSTS_SECONDS', '0'))  # 0 in dev, 63072000 (2 years) in production
SECURE_HSTS_INCLUDE_SUBDOMAINS = os.getenv('SECURE_HSTS_INCLUDE_SUBDOMAINS', 'False') == 'True'
SECURE_HSTS_PRELOAD = os.getenv('SECURE_HSTS_PRELOAD', 'False') == 'True'

# Allowed hosts (must be configured in production)
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# CSRF Trusted Origins
CSRF_TRUSTED_ORIGINS = os.getenv(
    'CSRF_TRUSTED_ORIGINS',
    'http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003',
).split(',')

# ==============================================================================
# MONITORING & ALERTING CONFIGURATION
# ==============================================================================

# Alert System
ENABLE_EMAIL_ALERTS = os.getenv('ENABLE_EMAIL_ALERTS', 'False') == 'True'
ENABLE_SLACK_ALERTS = os.getenv('ENABLE_SLACK_ALERTS', 'False') == 'True'
ENABLE_SMS_ALERTS = os.getenv('ENABLE_SMS_ALERTS', 'False') == 'True'

ALERT_FROM_EMAIL = os.getenv('ALERT_FROM_EMAIL', 'alerts@dfc.cccplc.com')

# Alert Recipients
DEFAULT_ALERT_RECIPIENTS = os.getenv('DEFAULT_ALERT_RECIPIENTS', '').split(',')
EMERGENCY_ALERT_RECIPIENTS = os.getenv('EMERGENCY_ALERT_RECIPIENTS', '').split(',')
CRITICAL_ALERT_RECIPIENTS = os.getenv('CRITICAL_ALERT_RECIPIENTS', '').split(',')
CERTIFICATE_ALERT_RECIPIENTS = os.getenv('CERTIFICATE_ALERT_RECIPIENTS', '').split(',')
ENCRYPTION_ALERT_RECIPIENTS = os.getenv('ENCRYPTION_ALERT_RECIPIENTS', '').split(',')

# Emergency SMS Numbers (for critical alerts)
EMERGENCY_SMS_NUMBERS = os.getenv('EMERGENCY_SMS_NUMBERS', '').split(',')

# Slack Webhook
SLACK_WEBHOOK_URL = os.getenv('SLACK_WEBHOOK_URL', None)

# Certificate Monitoring
SSL_CERTIFICATE_PATHS = {
    'nginx': os.getenv('SSL_CERT_PATH', '/etc/letsencrypt/live/dfc.cccplc.com/fullchain.pem'),
}

REMOTE_CERTIFICATE_CHECKS = {
    'production': {
        'hostname': os.getenv('PRODUCTION_HOSTNAME', 'dfc.cccplc.com'),
        'port': 443,
    },
}

# Encryption Monitoring Thresholds
ENCRYPTION_FAILURE_THRESHOLD = float(os.getenv('ENCRYPTION_FAILURE_THRESHOLD', '1.0'))  # 1% failure rate
KEY_ROTATION_INTERVAL_DAYS = int(os.getenv('KEY_ROTATION_INTERVAL_DAYS', '90'))  # 90 days

# Security Monitoring Thresholds
FAILED_AUTH_THRESHOLD = int(os.getenv('FAILED_AUTH_THRESHOLD', '100'))  # Per hour
UNAUTHORIZED_ACCESS_THRESHOLD = int(os.getenv('UNAUTHORIZED_ACCESS_THRESHOLD', '50'))  # Per hour

# Environment identifier for alerts
ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')

# ==============================================================================
# PASSWORD RESET & SECURITY CONFIGURATION
# ==============================================================================

# Frontend URL for password reset emails
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003')

# Password History Settings
PASSWORD_HISTORY_COUNT = int(os.getenv('PASSWORD_HISTORY_COUNT', '5'))  # Prevent reusing last 5 passwords

# Password Reset Rate Limiting
PASSWORD_RESET_RATE_LIMIT = int(os.getenv('PASSWORD_RESET_RATE_LIMIT', '3'))  # Max attempts per window
PASSWORD_RESET_RATE_WINDOW = int(os.getenv('PASSWORD_RESET_RATE_WINDOW', '1'))  # Window in hours

# ==============================================================================
# EMAIL CONFIGURATION (Resend)
# ==============================================================================

# Resend API Configuration
RESEND_API_KEY = os.getenv('RESEND_API_KEY', '')
USE_RESEND_IN_DEV = os.getenv('USE_RESEND_IN_DEV', 'False') == 'True'

# Email sender configuration
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'DFC <btamunang@quantum-soft.ai>')
SUPPORT_EMAIL = os.getenv('SUPPORT_EMAIL', 'support@yourdomain.com')

# Email backend (configured via EMAIL_BACKEND environment variable in .env)
# Don't override here - let it use the value from line 278
