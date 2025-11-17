from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import CustomUser


class UserSerializer(serializers.ModelSerializer):
    """Serializer for CustomUser model"""

    class Meta:
        model = CustomUser
        fields = (
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'role',
            'department',
            'mfa_enabled',
            'avatar',
            'date_joined',
        )
        read_only_fields = ('id', 'date_joined')


class LoginSerializer(serializers.Serializer):
    """Serializer for user login"""

    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})

    ALLOWED_EMAIL_DOMAIN = 'cccplc.net'

    def validate_email(self, value):
        """Validate that email ends with cccplc.net"""
        if not value.lower().endswith(f'@{self.ALLOWED_EMAIL_DOMAIN}'):
            raise serializers.ValidationError(
                f'Only users with @{self.ALLOWED_EMAIL_DOMAIN} email addresses can access this platform.'
            )
        return value.lower()

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        if email and password:
            # Check if user exists first
            try:
                user_obj = CustomUser.objects.get(email=email)

                # Check if account is locked
                if user_obj.is_locked:
                    error = serializers.ValidationError({
                        'non_field_errors': ['Your account has been locked due to too many failed login attempts. Please contact the administrator to unlock your account.']
                    })
                    error.detail['is_locked'] = True
                    raise error

            except CustomUser.DoesNotExist:
                user_obj = None

            # Authenticate using email
            user = authenticate(
                request=self.context.get('request'),
                username=email,  # Django authenticate uses 'username' kwarg
                password=password
            )

            if not user:
                # Increment failed attempts if user exists
                if user_obj:
                    user_obj.increment_failed_login_attempts()
                    remaining_attempts = user_obj.remaining_login_attempts

                    if user_obj.is_locked:
                        error = serializers.ValidationError({
                            'non_field_errors': ['Your account has been locked due to too many failed login attempts. Please contact the administrator to unlock your account.']
                        })
                        error.detail['is_locked'] = True
                        raise error
                    else:
                        error = serializers.ValidationError({
                            'non_field_errors': [f'Invalid email or password. You have {remaining_attempts} attempt(s) remaining before your account is locked.']
                        })
                        error.detail['remaining_attempts'] = remaining_attempts
                        raise error
                else:
                    raise serializers.ValidationError('Invalid email or password')

            if not user.is_active:
                raise serializers.ValidationError('User account is disabled')

            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError('Must include email and password')


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for changing password"""

    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Old password is incorrect')
        return value

    def validate_new_password(self, value):
        # Add password strength validation if needed
        if len(value) < 8:
            raise serializers.ValidationError('Password must be at least 8 characters long')
        return value


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration (for future use)"""

    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    class Meta:
        model = CustomUser
        fields = (
            'username',
            'email',
            'password',
            'password_confirm',
            'first_name',
            'last_name',
            'department',
        )

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password': 'Passwords do not match'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = CustomUser.objects.create_user(**validated_data)
        return user
