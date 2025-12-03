"""
Serializers for Department-as-Root Architecture APIs.

Provides serializers for:
- Department management
- Cross-department access
- Department access requests
- Navigation and settings
"""
from rest_framework import serializers
from django.utils import timezone

from apps.users.models import CustomUser, Department
from apps.users.models_department import (
    DepartmentSettings,
    CrossDepartmentAccess,
    DepartmentAccessRequest
)
from apps.permissions.models import Role


class DepartmentListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for department lists.
    """
    member_count = serializers.SerializerMethodField()
    storage_percentage = serializers.ReadOnlyField()

    class Meta:
        model = Department
        fields = [
            'id', 'name', 'code', 'icon', 'color',
            'display_order', 'is_active', 'member_count',
            'storage_quota_gb', 'storage_percentage'
        ]

    def get_member_count(self, obj):
        return obj.employees.filter(is_active=True).count()


class DepartmentDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for department with all fields.
    """
    parent_name = serializers.CharField(source='parent.name', read_only=True, allow_null=True)
    member_count = serializers.SerializerMethodField()
    storage_used_gb = serializers.ReadOnlyField()
    storage_percentage = serializers.ReadOnlyField()
    root_path = serializers.ReadOnlyField()

    class Meta:
        model = Department
        fields = [
            'id', 'name', 'code', 'description',
            'parent', 'parent_name',
            'icon', 'color', 'display_order',
            'is_active', 'default_confidentiality',
            'storage_quota_gb', 'storage_used_bytes', 'storage_used_gb', 'storage_percentage',
            'member_count', 'root_path',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'storage_used_bytes', 'storage_used_gb',
            'storage_percentage', 'root_path', 'created_at', 'updated_at'
        ]

    def get_member_count(self, obj):
        return obj.employees.filter(is_active=True).count()


class DepartmentCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new department.
    """
    class Meta:
        model = Department
        fields = [
            'name', 'code', 'description', 'parent',
            'icon', 'color', 'display_order',
            'default_confidentiality', 'storage_quota_gb'
        ]

    def validate_code(self, value):
        """Ensure code is uppercase and alphanumeric."""
        value = value.upper()
        if not value.replace('_', '').isalnum():
            raise serializers.ValidationError(
                "Department code must be alphanumeric (underscores allowed)"
            )
        return value

    def validate(self, attrs):
        """Validate parent department belongs to same organization."""
        parent = attrs.get('parent')
        if parent:
            request = self.context.get('request')
            if request and parent.organization_id != request.user.organization_id:
                raise serializers.ValidationError({
                    'parent': 'Parent department must belong to the same organization'
                })
        return attrs


class DepartmentUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating a department.
    """
    class Meta:
        model = Department
        fields = [
            'name', 'description', 'parent',
            'icon', 'color', 'display_order',
            'default_confidentiality', 'storage_quota_gb', 'is_active'
        ]

    def validate(self, attrs):
        """Prevent circular parent references."""
        parent = attrs.get('parent')
        if parent and self.instance:
            # Check for circular reference
            current = parent
            while current:
                if current.id == self.instance.id:
                    raise serializers.ValidationError({
                        'parent': 'Cannot set a descendant as parent (circular reference)'
                    })
                current = current.parent
        return attrs


class DepartmentNavigationSerializer(serializers.ModelSerializer):
    """
    Serializer for department navigation in sidebar.
    Includes folder counts, activity indicators, and access information.
    """
    folder_count = serializers.IntegerField(read_only=True, default=0)
    document_count = serializers.IntegerField(read_only=True, default=0)
    has_unread = serializers.SerializerMethodField()
    is_accessible = serializers.SerializerMethodField()
    access_type = serializers.SerializerMethodField()
    granted_role = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = [
            'id', 'name', 'code', 'icon', 'color',
            'display_order', 'folder_count', 'document_count',
            'has_unread', 'storage_percentage',
            'is_accessible', 'access_type', 'granted_role'
        ]

    def get_has_unread(self, obj):
        """Check if department has any recent activity."""
        # Placeholder - could check for recent documents, notifications, etc.
        return False

    def get_is_accessible(self, obj):
        """Check if user can access this department."""
        # If we got this department, it's accessible (filtered in view)
        return True

    def get_access_type(self, obj):
        """
        Determine user's access type to this department.
        Returns: 'own', 'granted', or 'admin'
        """
        user = self.context.get('request').user if self.context.get('request') else None
        if not user:
            return 'none'

        # Superusers and global admins have admin access
        if user.is_superuser:
            return 'admin'

        # Check for global admin role
        from apps.permissions.models import UserRole
        from django.db.models import Q
        has_global_admin = UserRole.objects.filter(
            user=user,
            scope='GLOBAL',
            role__name='ADMIN',
            is_active=True
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
        ).exists()

        if has_global_admin:
            return 'admin'

        # User's own department
        if user.department_id == obj.id:
            return 'own'

        # Check for cross-department access grant
        has_grant = CrossDepartmentAccess.objects.filter(
            user=user,
            department=obj,
            is_active=True
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
        ).exists()

        if has_grant:
            return 'granted'

        return 'none'

    def get_granted_role(self, obj):
        """
        Get the role name if access is via cross-department grant.
        """
        user = self.context.get('request').user if self.context.get('request') else None
        if not user:
            return None

        # Superusers get 'Administrator' as their role
        if user.is_superuser:
            return 'Administrator'

        # Check for global admin role
        from apps.permissions.models import UserRole
        from django.db.models import Q
        global_admin = UserRole.objects.filter(
            user=user,
            scope='GLOBAL',
            role__name='ADMIN',
            is_active=True
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
        ).select_related('role').first()

        if global_admin:
            return global_admin.role.name

        # User's own department - no specific role to show
        if user.department_id == obj.id:
            return None

        # Check for cross-department access grant
        grant = CrossDepartmentAccess.objects.filter(
            user=user,
            department=obj,
            is_active=True
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
        ).select_related('role').first()

        if grant and grant.role:
            return grant.role.name

        return None


class DepartmentSettingsSerializer(serializers.ModelSerializer):
    """
    Serializer for department settings.
    """
    class Meta:
        model = DepartmentSettings
        fields = [
            'department', 'auto_create_structure', 'default_folder_template',
            'default_retention_days', 'require_document_classification',
            'allow_external_sharing', 'notify_on_new_member',
            'notify_on_storage_threshold', 'storage_warning_threshold'
        ]
        read_only_fields = ['department']


# ==================== Cross-Department Access Serializers ====================

class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user info for nested serialization."""
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name']
        read_only_fields = fields

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username


class RoleBasicSerializer(serializers.ModelSerializer):
    """Basic role info for nested serialization."""
    class Meta:
        model = Role
        fields = ['id', 'name', 'description']
        read_only_fields = fields


class CrossDepartmentAccessSerializer(serializers.ModelSerializer):
    """
    Serializer for cross-department access grants.
    """
    user = UserBasicSerializer(read_only=True)
    department = DepartmentListSerializer(read_only=True)
    role = RoleBasicSerializer(read_only=True)
    granted_by = UserBasicSerializer(read_only=True)
    revoked_by = UserBasicSerializer(read_only=True)
    is_expired = serializers.ReadOnlyField()
    is_effective = serializers.ReadOnlyField()

    class Meta:
        model = CrossDepartmentAccess
        fields = [
            'id', 'user', 'department', 'role',
            'granted_by', 'granted_at', 'expires_at',
            'reason', 'is_active', 'is_expired', 'is_effective',
            'requires_approval', 'approved_by', 'approved_at',
            'revoked_at', 'revoked_by', 'revocation_reason'
        ]
        read_only_fields = [
            'id', 'granted_at', 'approved_at', 'revoked_at',
            'is_expired', 'is_effective'
        ]


class CrossDepartmentAccessCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating cross-department access grants.
    """
    user_id = serializers.IntegerField(write_only=True)
    department_id = serializers.IntegerField(write_only=True)
    role_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = CrossDepartmentAccess
        fields = [
            'user_id', 'department_id', 'role_id',
            'reason', 'expires_at', 'requires_approval'
        ]

    def validate_user_id(self, value):
        try:
            user = CustomUser.objects.get(id=value, is_active=True)
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError("User not found or inactive")
        return value

    def validate_department_id(self, value):
        try:
            department = Department.objects.get(id=value, is_active=True)
        except Department.DoesNotExist:
            raise serializers.ValidationError("Department not found or inactive")
        return value

    def validate_role_id(self, value):
        try:
            role = Role.objects.get(id=value)
        except Role.DoesNotExist:
            raise serializers.ValidationError("Role not found")
        return value

    def validate(self, attrs):
        user = CustomUser.objects.get(id=attrs['user_id'])
        department = Department.objects.get(id=attrs['department_id'])

        # User cannot have cross-department access to their own department
        if user.department_id == department.id:
            raise serializers.ValidationError(
                "Cannot grant cross-department access to user's own department"
            )

        # Check for existing active grant
        existing = CrossDepartmentAccess.objects.filter(
            user_id=attrs['user_id'],
            department_id=attrs['department_id'],
            is_active=True
        ).exists()

        if existing:
            raise serializers.ValidationError(
                "User already has active access to this department"
            )

        return attrs

    def create(self, validated_data):
        user_id = validated_data.pop('user_id')
        department_id = validated_data.pop('department_id')
        role_id = validated_data.pop('role_id')

        return CrossDepartmentAccess.objects.create(
            user_id=user_id,
            department_id=department_id,
            role_id=role_id,
            **validated_data
        )


class CrossDepartmentAccessRevokeSerializer(serializers.Serializer):
    """
    Serializer for revoking cross-department access.
    """
    reason = serializers.CharField(required=False, allow_blank=True, default='')


# ==================== Access Request Serializers ====================

class DepartmentAccessRequestSerializer(serializers.ModelSerializer):
    """
    Serializer for department access requests.
    """
    requester = UserBasicSerializer(read_only=True)
    department = DepartmentListSerializer(read_only=True)
    requested_role = RoleBasicSerializer(read_only=True)
    reviewed_by = UserBasicSerializer(read_only=True)

    class Meta:
        model = DepartmentAccessRequest
        fields = [
            'id', 'requester', 'department', 'requested_role',
            'reason', 'status', 'created_at',
            'reviewed_by', 'reviewed_at', 'review_notes',
            'requested_duration_days'
        ]
        read_only_fields = [
            'id', 'status', 'created_at',
            'reviewed_by', 'reviewed_at', 'review_notes'
        ]


class DepartmentAccessRequestCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating access requests.
    """
    department_id = serializers.IntegerField(write_only=True)
    requested_role_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = DepartmentAccessRequest
        fields = [
            'department_id', 'requested_role_id',
            'reason', 'requested_duration_days'
        ]

    def validate_department_id(self, value):
        try:
            department = Department.objects.get(id=value, is_active=True)
        except Department.DoesNotExist:
            raise serializers.ValidationError("Department not found or inactive")
        return value

    def validate_requested_role_id(self, value):
        try:
            role = Role.objects.get(id=value)
        except Role.DoesNotExist:
            raise serializers.ValidationError("Role not found")
        return value

    def validate(self, attrs):
        request = self.context.get('request')
        if not request:
            return attrs

        user = request.user
        department_id = attrs['department_id']

        # Cannot request access to own department
        if user.department_id == department_id:
            raise serializers.ValidationError(
                "Cannot request access to your own department"
            )

        # Check for existing pending request
        existing = DepartmentAccessRequest.objects.filter(
            requester=user,
            department_id=department_id,
            status='PENDING'
        ).exists()

        if existing:
            raise serializers.ValidationError(
                "You already have a pending request for this department"
            )

        # Check if already has access
        has_access = CrossDepartmentAccess.objects.filter(
            user=user,
            department_id=department_id,
            is_active=True
        ).exists()

        if has_access:
            raise serializers.ValidationError(
                "You already have active access to this department"
            )

        return attrs

    def create(self, validated_data):
        department_id = validated_data.pop('department_id')
        requested_role_id = validated_data.pop('requested_role_id')

        return DepartmentAccessRequest.objects.create(
            department_id=department_id,
            requested_role_id=requested_role_id,
            **validated_data
        )


class DepartmentAccessRequestActionSerializer(serializers.Serializer):
    """
    Serializer for approve/reject actions on access requests.
    """
    notes = serializers.CharField(required=False, allow_blank=True, default='')
