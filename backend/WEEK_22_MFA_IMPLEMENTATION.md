# Week 22: Multi-Factor Authentication (MFA) - Implementation Guide

**Implementation Date**: November 19, 2025
**Phase**: Phase 3 - Security & Compliance (Weeks 17-22)
**Status**: =§ IN PROGRESS

## Overview

Week 22 implements comprehensive Multi-Factor Authentication (MFA) using Time-based One-Time Passwords (TOTP) with django-otp. This adds an essential security layer requiring users to verify their identity using a second factor (authenticator app) in addition to their password.

---

##  Acceptance Criteria Progress

| # | Criteria | Status | Notes |
|---|----------|--------|-------|
| 1 | django-otp integrated and configured |  | Installed v1.5.4, configured in settings |
| 2 | MFA setup endpoint generates TOTP secret and QR code |  | Serializer created with QR code generation |
| 3 | MFA confirmation verifies TOTP code and enables MFA |  | Confirmation serializer implemented |
| 4 | MFA verification during login works correctly |   | Serializer ready, needs JWT integration |
| 5 | Backup codes generated (10 codes) |  | MFABackupCode model implemented |
| 6 | Backup codes can be used for MFA verification |  | Verify logic in MFAVerifySerializer |
| 7 | MFA enforcement for admin users | ó | Model field ready, needs middleware |
| 8 | MFA status endpoint returns current state |   | Serializer ready, needs view |
| 9 | MFA disable endpoint works (unless enforced) |   | Serializer ready, needs view |
| 10 | Backup code regeneration requires MFA verification |  | Serializer implemented |
| 11 | All MFA actions logged in audit trail | ó | Needs integration |
| 12 | Custom JWT authentication checks MFA status | ó | Needs implementation |
| 13 | All tests passing | ó | Needs test suite |

---

## Implementation Status

###  COMPLETED

####  1. Dependencies Installed
- `django-otp==1.5.4` - MFA framework
- `qrcode==8.0` - QR code generation
- Added to `requirements/base.txt`

#### 2. Settings Configuration
```python
# config/settings/base.py
INSTALLED_APPS = [
    ...
    'django_otp',
    'django_otp.plugins.otp_totp',
]

MIDDLEWARE = [
    ...
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django_otp.middleware.OTPMiddleware',  # After auth middleware
    ...
]
```

#### 3. MFA Models Created (`apps/users/mfa_models.py`)
- **MFABackupCode** (220+ lines):
  - SHA-256 hashed backup codes
  - 8-character alphanumeric codes (format: XXXX-XXXX)
  - Track usage (used, used_at, used_from_ip)
  - Static methods: `generate_code()`, `hash_code()`, `verify_and_use_code()`
  - Generate 10 codes per user

- **MFASettings** (100+ lines):
  - User MFA preferences and status
  - Fields: `mfa_enabled`, `mfa_enforced`, `totp_enabled`, `totp_confirmed`
  - Verification statistics tracking
  - Methods: `enable_mfa()`, `disable_mfa()`, `confirm_totp()`

#### 4. MFA Serializers Created (`apps/users/mfa_serializers.py`)
- **MFASetupSerializer**: TOTP device creation + QR code generation
- **MFAConfirmSerializer**: Verify TOTP + enable MFA + generate backup codes
- **MFAVerifySerializer**: Verify TOTP/backup code during login
- **MFAStatusSerializer**: Return current MFA state
- **MFADisableSerializer**: Disable MFA with verification
- **BackupCodeRegenerateSerializer**: Regenerate backup codes with verification

---

### ó PENDING IMPLEMENTATION

The following components still need to be created to complete Week 22:

#### 1. MFA Views (`apps/users/mfa_views.py`)

```python
"""
MFA API Views

Required endpoints:
- POST /api/v1/auth/mfa/setup/ - Initialize MFA setup
- POST /api/v1/auth/mfa/confirm/ - Confirm MFA setup
- POST /api/v1/auth/mfa/verify/ - Verify MFA during login
- GET /api/v1/auth/mfa/status/ - Get MFA status
- POST /api/v1/auth/mfa/disable/ - Disable MFA
- POST /api/v1/auth/mfa/backup-codes/regenerate/ - Regenerate backup codes
"""

from rest_framework import status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.users.mfa_serializers import (
    MFASetupSerializer, MFAConfirmSerializer, MFAVerifySerializer,
    MFAStatusSerializer, MFADisableSerializer, BackupCodeRegenerateSerializer
)
from apps.users.mfa_models import MFASettings
from apps.audit.utils import log_audit_event


class MFASetupView(views.APIView):
    """Initialize MFA setup - generates TOTP secret and QR code"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = MFASetupSerializer(data={}, context={'request': request})
        serializer.is_valid(raise_exception=True)
        data = serializer.save()

        # Log audit event
        log_audit_event(
            user=request.user,
            action='mfa_setup_initiated',
            resource_type='mfa',
            outcome='success'
        )

        return Response(data, status=status.HTTP_200_OK)


class MFAConfirmView(views.APIView):
    """Confirm MFA setup - verifies TOTP and enables MFA"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = MFAConfirmSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.save()

        # Log audit event
        log_audit_event(
            user=request.user,
            action='mfa_enabled',
            resource_type='mfa',
            outcome='success'
        )

        return Response(data, status=status.HTTP_200_OK)


class MFAVerifyView(views.APIView):
    """Verify MFA during login - supports TOTP and backup codes"""
    permission_classes = []  # No auth required (called during login)

    def post(self, request):
        # User should be passed from login view
        user = request.data.get('user')  # or from session

        serializer = MFAVerifySerializer(
            data=request.data,
            context={
                'user': user,
                'ip_address': request.META.get('REMOTE_ADDR')
            }
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Log audit event
        log_audit_event(
            user=user,
            action='mfa_verified',
            resource_type='mfa',
            outcome='success',
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response({'verified': True}, status=status.HTTP_200_OK)


class MFAStatusView(views.APIView):
    """Get current MFA status"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        mfa_settings, _ = MFASettings.objects.get_or_create(user=request.user)
        serializer = MFAStatusSerializer(mfa_settings)
        return Response(serializer.data)


class MFADisableView(views.APIView):
    """Disable MFA (requires verification)"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = MFADisableSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Log audit event
        log_audit_event(
            user=request.user,
            action='mfa_disabled',
            resource_type='mfa',
            outcome='success'
        )

        return Response({'disabled': True}, status=status.HTTP_200_OK)


class BackupCodeRegenerateView(views.APIView):
    """Regenerate backup codes (requires MFA verification)"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = BackupCodeRegenerateSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.save()

        # Log audit event
        log_audit_event(
            user=request.user,
            action='mfa_backup_codes_regenerated',
            resource_type='mfa',
            outcome='success'
        )

        return Response(data, status=status.HTTP_200_OK)
```

#### 2. MFA URLs (`apps/users/mfa_urls.py`)

```python
"""
MFA URL Configuration
"""

from django.urls import path
from apps.users import mfa_views

app_name = 'mfa'

urlpatterns = [
    path('setup/', mfa_views.MFASetupView.as_view(), name='mfa-setup'),
    path('confirm/', mfa_views.MFAConfirmView.as_view(), name='mfa-confirm'),
    path('verify/', mfa_views.MFAVerifyView.as_view(), name='mfa-verify'),
    path('status/', mfa_views.MFAStatusView.as_view(), name='mfa-status'),
    path('disable/', mfa_views.MFADisableView.as_view(), name='mfa-disable'),
    path('backup-codes/regenerate/', mfa_views.BackupCodeRegenerateView.as_view(), name='backup-codes-regenerate'),
]
```

#### 3. Include MFA URLs in main config

```python
# config/urls.py
urlpatterns = [
    ...
    # MFA endpoints
    path('api/v1/auth/mfa/', include('apps.users.mfa_urls')),
]
```

#### 4. Custom JWT Authentication (`apps/users/mfa_authentication.py`)

```python
"""
Custom JWT Authentication with MFA Check
"""

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed
from apps.users.mfa_models import MFASettings


class MFAJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that checks MFA status.

    If user has MFA enabled, ensure they've completed MFA verification.
    """

    def authenticate(self, request):
        # Standard JWT authentication
        result = super().authenticate(request)

        if result is None:
            return None

        user, token = result

        # Check if user requires MFA
        try:
            mfa_settings = MFASettings.objects.get(user=user)
            if mfa_settings.requires_mfa:
                # Check if MFA has been verified in this session
                if not request.session.get('mfa_verified'):
                    raise AuthenticationFailed(
                        'MFA verification required. Please verify your identity.'
                    )
        except MFASettings.DoesNotExist:
            pass  # No MFA settings, proceed

        return user, token
```

#### 5. Update REST_FRAMEWORK settings

```python
# config/settings/base.py
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'apps.users.mfa_authentication.MFAJWTAuthentication',  # Use custom auth
    ],
    ...
}
```

#### 6. MFA Enforcement Middleware (`apps/users/mfa_middleware.py`)

```python
"""
MFA Enforcement Middleware

Ensures admin users have MFA enabled.
"""

from django.http import JsonResponse
from apps.users.mfa_models import MFASettings


class MFAEnforcementMiddleware:
    """
    Middleware to enforce MFA for admin/superuser accounts.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            # Check if user is admin/superuser
            if request.user.is_staff or request.user.is_superuser:
                mfa_settings, created = MFASettings.objects.get_or_create(
                    user=request.user
                )

                # Enforce MFA for admins
                if created or not mfa_settings.mfa_enforced:
                    mfa_settings.mfa_enforced = True
                    mfa_settings.save()

                # Check if MFA is configured
                if not mfa_settings.is_fully_configured:
                    # Allow access to MFA setup endpoints
                    if not request.path.startswith('/api/v1/auth/mfa/'):
                        return JsonResponse({
                            'error': 'MFA setup required',
                            'message': 'As an administrator, you must set up Multi-Factor Authentication.',
                            'setup_url': '/api/v1/auth/mfa/setup/'
                        }, status=403)

        return self.get_response(request)
```

#### 7. Add MFA Enforcement Middleware to settings

```python
# config/settings/base.py
MIDDLEWARE = [
    ...
    'django_otp.middleware.OTPMiddleware',
    'apps.users.mfa_middleware.MFAEnforcementMiddleware',  # After OTP middleware
    'apps.audit.middleware.AuditContextMiddleware',
    ...
]
```

#### 8. Database Migrations

```bash
# Create migrations for MFA models
python manage.py makemigrations users

# Apply migrations
python manage.py migrate users

# Create django-otp migrations (TOTP devices)
python manage.py migrate django_otp
python manage.py migrate otp_totp
```

#### 9. Admin Interface (`apps/users/admin.py` - Update)

```python
# Add to existing admin.py

from apps.users.mfa_models import MFABackupCode, MFASettings


@admin.register(MFASettings)
class MFASettingsAdmin(admin.ModelAdmin):
    list_display = [
        'user',
        'mfa_enabled',
        'mfa_enforced',
        'totp_confirmed',
        'last_verified_at'
    ]
    list_filter = ['mfa_enabled', 'mfa_enforced', 'totp_confirmed']
    search_fields = ['user__email', 'user__first_name', 'user__last_name']
    readonly_fields = [
        'user', 'enabled_at', 'disabled_at', 'last_verified_at',
        'totp_confirmed_at', 'verification_failures', 'last_failure_at'
    ]


@admin.register(MFABackupCode)
class MFABackupCodeAdmin(admin.ModelAdmin):
    list_display = ['user', 'used', 'used_at', 'created_at']
    list_filter = ['used']
    search_fields = ['user__email']
    readonly_fields = ['user', 'code_hash', 'used', 'used_at', 'used_from_ip', 'created_at']

    def has_add_permission(self, request):
        return False
```

#### 10. Test Suite (`apps/users/tests/test_mfa.py`)

Create comprehensive tests covering all acceptance criteria.

---

## API Endpoints

### 1. Setup MFA
```
POST /api/v1/auth/mfa/setup/
Authorization: Bearer <token>

Response:
{
  "secret": "BASE32_ENCODED_SECRET",
  "qr_code": "data:image/png;base64,..."
}
```

### 2. Confirm MFA Setup
```
POST /api/v1/auth/mfa/confirm/
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "123456"
}

Response:
{
  "backup_codes": [
    "ABCD-EFGH",
    "IJKL-MNOP",
    ...
  ]
}
```

### 3. Verify MFA (During Login)
```
POST /api/v1/auth/mfa/verify/
Content-Type: application/json

{
  "token": "123456"  // or "ABCD-EFGH" for backup code
}

Response:
{
  "verified": true
}
```

### 4. Get MFA Status
```
GET /api/v1/auth/mfa/status/
Authorization: Bearer <token>

Response:
{
  "is_enforced": false,
  "is_enabled": true,
  "is_configured": true,
  "totp_enabled": true,
  "enabled_at": "2025-11-19T12:00:00Z",
  "last_verified_at": "2025-11-19T14:30:00Z",
  "backup_codes_remaining": 8
}
```

### 5. Disable MFA
```
POST /api/v1/auth/mfa/disable/
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "123456"
}

Response:
{
  "disabled": true
}
```

### 6. Regenerate Backup Codes
```
POST /api/v1/auth/mfa/backup-codes/regenerate/
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "123456"
}

Response:
{
  "backup_codes": [
    "WXYZ-1234",
    ...
  ]
}
```

---

## User Flow

### Setup Flow
1. User navigates to MFA setup
2. POST `/api/v1/auth/mfa/setup/` - receives QR code
3. User scans QR code with authenticator app (Google Authenticator, Authy, etc.)
4. User enters 6-digit code from app
5. POST `/api/v1/auth/mfa/confirm/` with code
6. User receives 10 backup codes - **MUST SAVE THESE**
7. MFA is now enabled

### Login Flow (MFA Enabled)
1. User enters email + password
2. If credentials valid, check if MFA enabled
3. If MFA enabled, prompt for TOTP code
4. User enters 6-digit code from authenticator app (or backup code)
5. POST `/api/v1/auth/mfa/verify/` with code
6. If valid, set `mfa_verified=True` in session
7. Return JWT tokens

### Admin Enforcement
1. Admin/superuser logs in
2. Middleware checks if MFA configured
3. If not configured, redirect to MFA setup (403 on other endpoints)
4. Admin must complete MFA setup before accessing system
5. Cannot disable MFA (enforced)

---

## Security Features

### 1. Backup Codes
- 10 codes generated per user
- 8 characters, format: XXXX-XXXX
- SHA-256 hashed storage
- Single-use only
- Track usage (timestamp + IP)

### 2. TOTP Security
- Time-based (30-second window)
- 6-digit codes
- Industry standard (RFC 6238)
- Works with all authenticator apps

### 3. Audit Logging
All MFA actions logged:
- `mfa_setup_initiated`
- `mfa_enabled`
- `mfa_verified`
- `mfa_disabled`
- `mfa_backup_codes_regenerated`
- `mfa_verification_failed`

### 4. Admin Enforcement
- Automatic for `is_staff=True` or `is_superuser=True`
- Cannot be disabled
- Blocks access until configured

---

## Testing Checklist

- [ ] MFA setup generates valid QR code
- [ ] QR code can be scanned by authenticator apps
- [ ] TOTP verification works with Google Authenticator
- [ ] TOTP verification works with Authy
- [ ] Backup codes are generated (10 codes)
- [ ] Backup codes can be used for login
- [ ] Backup codes are single-use
- [ ] MFA status endpoint returns correct data
- [ ] MFA disable requires verification
- [ ] MFA disable fails if enforced
- [ ] Backup code regeneration requires verification
- [ ] Admin users have MFA enforced
- [ ] Audit logs capture all MFA events
- [ ] Custom JWT auth checks MFA status
- [ ] Session tracks MFA verification
- [ ] Invalid TOTP codes are rejected
- [ ] Used backup codes are rejected

---

## Next Steps

1.  Create `mfa_views.py`
2.  Create `mfa_urls.py`
3.  Create `mfa_authentication.py`
4.  Create `mfa_middleware.py`
5. ó Run migrations
6. ó Update admin interface
7. ó Create test suite
8. ó Integration testing
9. ó Update main URLs
10. ó Update REST_FRAMEWORK settings

---

**Document Version**: 1.0
**Last Updated**: November 19, 2025
**Status**: 60% Complete - Core models and serializers done
