"""
Serializers for user authentication and management.
"""
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password
from django.core import exceptions as django_exceptions
from apps.users.models import CustomUser, Department


class DepartmentSerializer(serializers.ModelSerializer):
    """Serializer for Department model"""

    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'parent', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


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
    """
    department_name = serializers.CharField(source='department.name', read_only=True)
    department_code = serializers.CharField(source='department.code', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    organization_id = serializers.UUIDField(source='organization.id', read_only=True)

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'employee_id',
            'first_name', 'last_name', 'phone_number',
            'department', 'department_name', 'department_code',
            'organization', 'organization_name', 'organization_id',
            'avatar', 'is_staff', 'is_superuser', 'is_active',
            'mfa_enabled', 'date_joined', 'last_login',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'employee_id', 'date_joined', 'last_login',
            'created_at', 'updated_at', 'is_staff', 'is_superuser',
            'mfa_enabled', 'organization', 'organization_name', 'organization_id'
        ]
        extra_kwargs = {
            'password': {'write_only': True}
        }


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
    """
    remember_me = serializers.BooleanField(default=False, required=False)

    def validate(self, attrs):
        """
        Override to check for account lockout and track failed login attempts
        """
        # Extract remember_me before calling parent validate (it's not a standard field)
        remember_me = attrs.pop('remember_me', False)

        username = attrs.get('username')

        # First, try to authenticate
        data = super().validate(attrs)

        # Get the authenticated user (set by parent's validate method)
        user = self.user

        # Check if account is locked
        if user.is_account_locked:
            raise serializers.ValidationError(
                {
                    "detail": f"Account locked due to too many failed login attempts. "
                            f"Please try again after {user.account_locked_until.strftime('%Y-%m-%d %H:%M:%S UTC')}"
                }
            )

        # Record successful login
        user.record_successful_login()

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
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
            'mfa_enabled': user.mfa_enabled,
            # Organization context for multi-tenant SaaS
            'organization_id': str(user.organization.id) if user.organization else None,
            'organization_name': user.organization.name if user.organization else None,
            'organization_domain': user.organization.domain if user.organization else None,
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
