"""
Serializers for user authentication and management.
"""
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password
from django.core import exceptions as django_exceptions
from django.utils import timezone
from apps.users.models import CustomUser, Department


class DepartmentSerializer(serializers.ModelSerializer):
    """Serializer for Department model"""
    parent_name = serializers.CharField(source='parent.name', read_only=True, allow_null=True)
    member_count = serializers.SerializerMethodField()
    storage_used_gb = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = [
            'id', 'name', 'code', 'parent', 'parent_name',
            'storage_quota_gb', 'storage_used_gb', 'member_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_member_count(self, obj):
        return obj.employees.count()

    def get_storage_used_gb(self, obj):
        # Placeholder - would calculate actual storage usage
        return 0


class UserBasicSerializer(serializers.ModelSerializer):
    """
    Basic user serializer for displaying user info in nested contexts.
    Only includes essential fields.
    """

    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id', 'username', 'email', 'first_name', 'last_name']


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for CustomUser model.
    Used for retrieving and updating user information.

    The `role` field reads/writes the user's OrganizationMember role.
    """
    department_name = serializers.CharField(source='department.name', read_only=True)
    department_code = serializers.CharField(source='department.code', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    organization_id = serializers.UUIDField(source='organization.id', read_only=True)
    role = serializers.CharField(required=False)

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'employee_id',
            'first_name', 'last_name', 'phone_number',
            'department', 'department_name', 'department_code',
            'organization', 'organization_name', 'organization_id',
            'avatar', 'is_staff', 'is_superuser', 'is_active',
            'mfa_enabled', 'date_joined', 'last_login',
            'created_at', 'updated_at',
            'role',
        ]
        read_only_fields = [
            'id', 'employee_id', 'date_joined', 'last_login',
            'created_at', 'updated_at', 'is_staff', 'is_superuser',
            'mfa_enabled', 'organization', 'organization_name', 'organization_id'
        ]
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def _get_membership(self, user):
        from apps.organizations.models import OrganizationMember
        return OrganizationMember.objects.filter(
            user=user,
            organization=user.organization,
        ).first()

    def to_representation(self, instance):
        """Include the organization role when reading."""
        data = super().to_representation(instance)
        membership = self._get_membership(instance)
        if membership:
            data['role'] = membership.role
        elif instance.is_superuser:
            data['role'] = 'admin'
        elif instance.is_staff:
            data['role'] = 'manager'
        else:
            data['role'] = 'member'
        return data

    def update(self, instance, validated_data):
        """Handle the role field separately — update OrganizationMember."""
        new_role = validated_data.pop('role', None)
        instance = super().update(instance, validated_data)

        if new_role is not None:
            from apps.organizations.models import OrganizationMember
            OrganizationMember.objects.update_or_create(
                user=instance,
                organization=instance.organization,
                defaults={'role': new_role},
            )
        return instance


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    Validates email domain and password strength.
    Automatically creates or joins organization based on email domain.
    """
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    department_name = serializers.CharField(source='department.name', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    organization_id = serializers.UUIDField(source='organization.id', read_only=True)

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'phone_number',
            'department', 'department_name', 'employee_id',
            'organization', 'organization_name', 'organization_id',
            'created_at'
        ]
        read_only_fields = ['id', 'employee_id', 'organization', 'organization_name', 'organization_id', 'created_at']
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'department': {'required': True},
        }

    def validate_email(self, value):
        """
        Validate that email is a business email (not free email provider).
        Uses organization validators to block Gmail, Yahoo, etc.
        """
        from apps.organizations.validators import validate_business_email

        # Validate it's a business email (not Gmail, Yahoo, etc.)
        validate_business_email(value)

        return value.lower()

    def validate(self, attrs):
        """
        Validate that passwords match and meet requirements
        """
        password = attrs.get('password')
        password_confirm = attrs.pop('password_confirm', None)

        if password != password_confirm:
            raise serializers.ValidationError(
                {"password_confirm": "Passwords do not match"}
            )

        # Validate password strength using Django's validators
        user = CustomUser(**attrs)
        try:
            validate_password(password, user=user)
        except django_exceptions.ValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})

        return attrs

    def create(self, validated_data):
        """
        Create user with hashed password and auto-create/join organization.

        Multi-tenant logic:
        1. Extract domain from user's email
        2. Check if organization with that domain already exists
        3. If yes: Join existing organization as 'member'
        4. If no: Create new organization and join as 'owner'
        """
        from django.db import transaction
        from apps.organizations.models import Organization, OrganizationMember
        from apps.organizations.validators import extract_domain_from_email

        password = validated_data.pop('password')
        email = validated_data.get('email')

        # Extract domain from email
        domain = extract_domain_from_email(email)

        with transaction.atomic():
            # Check if organization exists for this domain
            organization, created = Organization.objects.get_or_create(
                domain=domain,
                defaults={
                    'name': domain.split('.')[0].upper(),  # e.g., 'cccplc' from 'cccplc.net'
                    'subscription_plan': 'free',
                    'subscription_status': 'trial',
                }
            )

            # Create the user with organization assigned
            user = CustomUser.objects.create_user(
                password=password,
                organization=organization,
                **validated_data
            )

            # Create organization membership
            # If organization was just created, user is owner; otherwise member
            role = 'owner' if created else 'member'
            OrganizationMember.objects.create(
                user=user,
                organization=organization,
                role=role,
                is_active=True
            )

        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT token serializer that includes additional user information.
    Also handles account lockout mechanism and Remember Me functionality.
    Accepts both email and username for login.
    """
    remember_me = serializers.BooleanField(default=False, required=False)

    def validate(self, attrs):
        """
        Override to check for account lockout and track failed login attempts.
        Accepts both email and username for authentication.
        """
        # Extract remember_me before calling parent validate (it's not a standard field)
        remember_me = attrs.pop('remember_me', False)

        username_or_email = attrs.get('username', '')
        password = attrs.get('password', '')

        # Try to find the user by username or email
        user = None
        if '@' in username_or_email:
            # Looks like an email
            try:
                user = CustomUser.objects.get(email=username_or_email)
                # Replace email with username for parent validation
                attrs['username'] = user.username
            except CustomUser.DoesNotExist:
                pass
        else:
            # Looks like a username
            try:
                user = CustomUser.objects.get(username=username_or_email)
            except CustomUser.DoesNotExist:
                pass

        # Check if account is deactivated BEFORE authentication attempt
        if user and not user.is_active:
            self._log_auth_event(
                'FAILED_LOGIN', user,
                outcome='FAILURE',
                metadata={
                    'reason': 'account_deactivated',
                    'attempted_username': username_or_email,
                }
            )
            raise serializers.ValidationError(
                {
                    "detail": "Your account has been deactivated. Please contact your administrator.",
                    "code": "account_deactivated",
                }
            )

        # Check if account is locked BEFORE authentication attempt
        if user and user.is_account_locked:
            self._log_auth_event(
                'FAILED_LOGIN', user,
                outcome='FAILURE',
                metadata={
                    'reason': 'account_locked',
                    'locked_until': user.account_locked_until.isoformat() if user.account_locked_until else None,
                }
            )
            raise serializers.ValidationError(
                {
                    "detail": f"Account locked due to too many failed login attempts. "
                            f"Please try again after {user.account_locked_until.strftime('%Y-%m-%d %H:%M:%S UTC')}",
                    "locked": True,
                    "locked_until": user.account_locked_until.isoformat() if user.account_locked_until else None
                }
            )

        # Try to authenticate
        try:
            data = super().validate(attrs)
        except Exception as e:
            # Authentication failed - record failed login attempt if user exists
            if user:
                lockout_info = user.record_failed_login()

                # Audit log: failed login
                self._log_auth_event(
                    'FAILED_LOGIN', user,
                    outcome='FAILURE',
                    metadata={
                        'reason': 'invalid_credentials',
                        'remaining_attempts': lockout_info['remaining_attempts'],
                        'locked': lockout_info['locked'],
                    }
                )

                if lockout_info['locked']:
                    # Audit log: account locked
                    self._log_auth_event(
                        'ACCOUNT_LOCKED', user,
                        metadata={
                            'reason': 'max_failed_attempts',
                            'failed_attempts': user.failed_login_attempts,
                            'locked_until': lockout_info['locked_until'].isoformat() if lockout_info['locked_until'] else None,
                        }
                    )
                    # Account just got locked
                    raise serializers.ValidationError(
                        {
                            "detail": lockout_info['message'],
                            "locked": True,
                            "locked_until": lockout_info['locked_until'].isoformat() if lockout_info['locked_until'] else None,
                            "remaining_attempts": 0
                        }
                    )
                else:
                    # Still has attempts remaining
                    raise serializers.ValidationError(
                        {
                            "detail": lockout_info['message'],
                            "locked": False,
                            "remaining_attempts": lockout_info['remaining_attempts']
                        }
                    )
            else:
                # User not found - generic error message (don't reveal if user exists)
                raise serializers.ValidationError(
                    {"detail": "Invalid credentials. Please check your username/email and password."}
                )

        # Get the authenticated user (set by parent's validate method)
        user = self.user

        # Check if MFA is enabled for this user
        if user.mfa_enabled:
            import logging
            logger = logging.getLogger(__name__)

            # Check if this is a trusted device (bypass MFA)
            device_fingerprint = self.context.get('request').data.get('device_fingerprint')
            logger.info(f"[MFA] User {user.email} - MFA enabled, checking trusted device")
            logger.info(f"[MFA] Device fingerprint received: {device_fingerprint}")

            if device_fingerprint:
                from apps.users.mfa_models import TrustedDevice
                import hashlib
                device_id = hashlib.sha256(device_fingerprint.encode()).hexdigest()
                logger.info(f"[MFA] Device ID (hashed): {device_id}")

                # Check if any trusted devices exist for this user
                trusted_devices = TrustedDevice.objects.filter(user=user, is_revoked=False)
                logger.info(f"[MFA] User has {trusted_devices.count()} non-revoked trusted devices")
                for td in trusted_devices:
                    logger.info(f"[MFA] Trusted device: id={td.device_id}, expires={td.expires_at}, is_valid={td.is_valid}")

                is_trusted = TrustedDevice.is_device_trusted(user, device_fingerprint)
                logger.info(f"[MFA] is_device_trusted result: {is_trusted}")

                if is_trusted:
                    # Device is trusted - skip MFA verification
                    # Record successful login and continue with normal token flow
                    logger.info(f"[MFA] Device is trusted - skipping MFA for {user.email}")
                    user.record_successful_login()

                    # Generate tokens with mfa_verified claim
                    from datetime import timedelta
                    from rest_framework_simplejwt.tokens import RefreshToken

                    refresh = RefreshToken.for_user(user)
                    # Add mfa_verified claim to the token - required by MFAJWTAuthentication
                    refresh['mfa_verified'] = True

                    # If remember_me is True, extend token lifetime
                    if remember_me:
                        refresh.set_exp(lifetime=timedelta(days=30))

                    data['refresh'] = str(refresh)
                    data['access'] = str(refresh.access_token)

                    # Add flag to indicate device was trusted (for frontend)
                    data['device_trusted'] = True

                    # Continue to add user data below (skip MFA requirement)
                else:
                    # Device not trusted - require MFA
                    logger.info(f"[MFA] Device not trusted - requiring MFA for {user.email}")
            else:
                # No device fingerprint provided - require MFA
                logger.info(f"[MFA] No device fingerprint provided - requiring MFA")

            # If we didn't skip MFA above, require it
            if not data.get('device_trusted'):
                # Don't issue full tokens yet - require MFA verification
                # Generate a temporary MFA token that expires in 5 minutes
                import jwt
                from datetime import timedelta
                from django.conf import settings

                mfa_token_payload = {
                    'user_id': user.id,
                    'type': 'mfa_pending',
                    'exp': timezone.now() + timedelta(minutes=5),
                    'iat': timezone.now(),
                }

                # Use Django's SECRET_KEY to sign the MFA token
                mfa_token = jwt.encode(
                    {
                        'user_id': user.id,
                        'type': 'mfa_pending',
                        'exp': (timezone.now() + timedelta(minutes=5)).timestamp(),
                        'iat': timezone.now().timestamp(),
                    },
                    settings.SECRET_KEY,
                    algorithm='HS256'
                )

                # Return partial response requiring MFA
                return {
                    'mfa_required': True,
                    'mfa_token': mfa_token,
                    'user': {
                        'id': user.id,
                        'email': user.email,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'mfa_enabled': True,
                    },
                    'remember_me': remember_me,
                }

        # No MFA required - record successful login and return full tokens
        # (Skip if device_trusted is set - we already recorded login and generated tokens above)
        if not data.get('device_trusted'):
            user.record_successful_login()

            # Audit log: successful login
            self._log_auth_event(
                'LOGIN', user,
                metadata={
                    'mfa_required': False,
                    'remember_me': remember_me,
                }
            )

            # If remember_me is True, generate longer-lived refresh token
            if remember_me:
                from datetime import timedelta
                from rest_framework_simplejwt.tokens import RefreshToken

                # Create custom refresh token with extended lifetime
                refresh = RefreshToken.for_user(user)
                # Extend refresh token lifetime to 30 days for remember me
                refresh.set_exp(lifetime=timedelta(days=30))

                # Update tokens in response
                data['refresh'] = str(refresh)
                data['access'] = str(refresh.access_token)

        # Add custom claims including organization context
        data['user'] = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'employee_id': user.employee_id,
            'department': user.department.name if user.department else None,
            'department_id': str(user.department.id) if user.department else None,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
            'mfa_enabled': user.mfa_enabled,
            # Organization context for multi-tenant SaaS
            'organization_id': str(user.organization.id) if user.organization else None,
            'organization_name': user.organization.name if user.organization else None,
            'organization_domain': user.organization.domain if user.organization else None,
            'organization_logo_url': self._get_org_logo_url(user),
        }

        return data

    @classmethod
    def get_token(cls, user):
        """
        Add custom claims to token including organization context.
        This allows frontend to access organization info without additional API calls.
        """
        token = super().get_token(user)

        # Add custom user claims
        token['username'] = user.username
        token['email'] = user.email
        token['employee_id'] = user.employee_id
        token['department'] = user.department.name if user.department else None

        # Add organization claims for multi-tenant context
        if user.organization:
            token['organization_id'] = str(user.organization.id)
            token['organization_name'] = user.organization.name
            token['organization_domain'] = user.organization.domain
            token['subscription_plan'] = user.organization.subscription_plan
            token['subscription_status'] = user.organization.subscription_status
        else:
            token['organization_id'] = None
            token['organization_name'] = None
            token['organization_domain'] = None
            token['subscription_plan'] = None
            token['subscription_status'] = None

        return token

    def _get_org_logo_url(self, user):
        """Get the organization logo URL if available."""
        try:
            if user.organization:
                from apps.organizations.settings_models import OrganizationSettings
                settings = OrganizationSettings.objects.filter(
                    organization=user.organization
                ).first()
                if settings and settings.logo:
                    url = settings.logo.url
                    if url.startswith('http'):
                        return url
                    request = self.context.get('request')
                    if request:
                        return request.build_absolute_uri(url)
                    return url
        except Exception:
            pass
        return None

    def _log_auth_event(self, action, target_user, outcome='SUCCESS', metadata=None):
        """Log an authentication event to the audit trail."""
        try:
            from apps.audit.utils import log_user_action, get_client_ip, get_user_agent
            request = self.context.get('request')
            ip = get_client_ip(request) if request else None
            ua = get_user_agent(request) if request else None

            from apps.audit.utils import set_audit_context
            set_audit_context(user=target_user, ip_address=ip, user_agent=ua)

            log_user_action(
                action=action,
                target_user=target_user,
                user=target_user,
                outcome=outcome,
                metadata=metadata or {},
            )
        except Exception:
            import logging
            logging.getLogger(__name__).warning(
                f"Failed to log audit event: {action} for user {target_user.id}",
                exc_info=True
            )


class ComprehensiveRegistrationSerializer(serializers.Serializer):
    """
    Comprehensive registration serializer that matches frontend signup form.
    Handles company information, personal/KYC data, address, and compliance.
    """
    # Step 1: Company Information
    company_name = serializers.CharField(max_length=200)
    company_registration_number = serializers.CharField(max_length=100)
    company_tax_id = serializers.CharField(max_length=100)
    industry = serializers.CharField(max_length=100)

    # Step 2: Personal Information & KYC
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20)
    country = serializers.CharField(max_length=100)
    job_title = serializers.CharField(max_length=100)

    # Address Information
    address_line1 = serializers.CharField(max_length=255)
    address_line2 = serializers.CharField(max_length=255, required=False, allow_blank=True)
    city = serializers.CharField(max_length=100)
    state = serializers.CharField(max_length=100)
    postal_code = serializers.CharField(max_length=20)

    # Step 3: Security
    password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    confirm_password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )

    # Agreements
    terms_accepted = serializers.BooleanField()
    privacy_accepted = serializers.BooleanField()
    marketing_accepted = serializers.BooleanField(default=False)

    def validate_email(self, value):
        """Validate business email"""
        from apps.organizations.validators import validate_business_email
        validate_business_email(value)
        return value.lower()

    def validate(self, attrs):
        """Validate passwords match and compliance accepted"""
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match"}
            )

        if not attrs.get('terms_accepted'):
            raise serializers.ValidationError(
                {"terms_accepted": "You must accept the Terms of Service"}
            )

        if not attrs.get('privacy_accepted'):
            raise serializers.ValidationError(
                {"privacy_accepted": "You must accept the Privacy Policy"}
            )

        # Validate password strength
        try:
            validate_password(attrs['password'])
        except django_exceptions.ValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})

        return attrs

    def create(self, validated_data):
        """
        Create complete user account with organization and all details.

        Process:
        1. Create or get Organization from email domain
        2. Add company details to Organization
        3. Create default Department if needed
        4. Generate username and employee_id
        5. Create CustomUser with all profile data
        6. Create OrganizationMember (owner for new org)
        """
        from django.db import transaction
        from django.utils import timezone
        from apps.organizations.models import Organization, OrganizationMember
        from apps.organizations.validators import extract_domain_from_email
        import uuid

        # Extract domain
        email = validated_data['email']
        domain = extract_domain_from_email(email)

        with transaction.atomic():
            # Create or get organization
            organization, org_created = Organization.objects.get_or_create(
                domain=domain,
                defaults={
                    'name': validated_data['company_name'],
                    'registration_number': validated_data['company_registration_number'],
                    'tax_id': validated_data['company_tax_id'],
                    'industry': validated_data['industry'],
                    'country': validated_data['country'],
                    'subscription_plan': 'free',
                    'subscription_status': 'trial',
                }
            )

            # Update organization if it already existed
            if not org_created:
                organization.name = validated_data['company_name']
                organization.registration_number = validated_data['company_registration_number']
                organization.tax_id = validated_data['company_tax_id']
                organization.industry = validated_data['industry']
                organization.country = validated_data['country']
                organization.save()

            # Create default department if needed
            department, _ = Department.objects.get_or_create(
                organization=organization,
                code='GENERAL',
                defaults={
                    'name': 'General',
                    'storage_quota_gb': 100
                }
            )

            # Generate username and employee_id
            username = email.split('@')[0]
            # Ensure username is unique
            base_username = username
            counter = 1
            while CustomUser.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1

            employee_id = f"EMP-{uuid.uuid4().hex[:8].upper()}"

            # Create user
            user = CustomUser.objects.create_user(
                username=username,
                email=email,
                password=validated_data['password'],
                first_name=validated_data['first_name'],
                last_name=validated_data['last_name'],
                employee_id=employee_id,
                organization=organization,
                department=department,
                # Profile fields
                phone_number=validated_data['phone'],
                job_title=validated_data['job_title'],
                # Address fields
                address_line1=validated_data['address_line1'],
                address_line2=validated_data.get('address_line2', ''),
                city=validated_data['city'],
                state=validated_data['state'],
                postal_code=validated_data['postal_code'],
                country=validated_data['country'],
                # Compliance fields
                terms_accepted_at=timezone.now() if validated_data['terms_accepted'] else None,
                privacy_accepted_at=timezone.now() if validated_data['privacy_accepted'] else None,
                marketing_consent=validated_data.get('marketing_accepted', False),
            )

            # Create organization membership
            role = 'owner' if org_created else 'member'
            OrganizationMember.objects.create(
                user=user,
                organization=organization,
                role=role,
                is_active=True
            )

        return user


class PasswordChangeSerializer(serializers.Serializer):
    """
    Serializer for password change endpoint
    """
    old_password = serializers.CharField(
        required=True,
        style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        required=True,
        style={'input_type': 'password'}
    )
    new_password_confirm = serializers.CharField(
        required=True,
        style={'input_type': 'password'}
    )

    def validate(self, attrs):
        """
        Validate that new passwords match and meet requirements
        """
        new_password = attrs.get('new_password')
        new_password_confirm = attrs.get('new_password_confirm')

        if new_password != new_password_confirm:
            raise serializers.ValidationError(
                {"new_password_confirm": "New passwords do not match"}
            )

        # Validate password strength
        user = self.context['request'].user
        try:
            validate_password(new_password, user=user)
        except django_exceptions.ValidationError as e:
            raise serializers.ValidationError({"new_password": list(e.messages)})

        return attrs

    def validate_old_password(self, value):
        """
        Validate that old password is correct
        """
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect")
        return value

    def save(self, **kwargs):
        """
        Change the user's password
        """
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user
