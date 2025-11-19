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

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'employee_id',
            'first_name', 'last_name', 'phone_number',
            'department', 'department_name', 'department_code',
            'avatar', 'is_staff', 'is_superuser', 'is_active',
            'mfa_enabled', 'date_joined', 'last_login',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'employee_id', 'date_joined', 'last_login',
            'created_at', 'updated_at', 'is_staff', 'is_superuser',
            'mfa_enabled'
        ]
        extra_kwargs = {
            'password': {'write_only': True}
        }


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    Validates email domain and password strength.
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

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'phone_number',
            'department', 'department_name', 'employee_id',
            'created_at'
        ]
        read_only_fields = ['id', 'employee_id', 'created_at']
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'department': {'required': True},
        }

    def validate_email(self, value):
        """
        Validate that email ends with @cccplc.net
        """
        if not value.endswith('@cccplc.net'):
            raise serializers.ValidationError(
                "Email must be a valid @cccplc.net address"
            )
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
        Create user with hashed password
        """
        password = validated_data.pop('password')
        user = CustomUser.objects.create_user(
            password=password,
            **validated_data
        )
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT token serializer that includes additional user information.
    Also handles account lockout mechanism.
    """

    def validate(self, attrs):
        """
        Override to check for account lockout and track failed login attempts
        """
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

        # Add custom claims
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
        }

        return data

    @classmethod
    def get_token(cls, user):
        """
        Add custom claims to token
        """
        token = super().get_token(user)

        # Add custom claims
        token['username'] = user.username
        token['email'] = user.email
        token['employee_id'] = user.employee_id
        token['department'] = user.department.name if user.department else None

        return token


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
