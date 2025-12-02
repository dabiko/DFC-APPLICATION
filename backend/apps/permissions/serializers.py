"""
Serializers for RBAC system.

Provides serializers for:
- Role management
- User role assignments
- Folder permissions
- Permission auditing
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.permissions.models import Role, UserRole, FolderPermission, DocumentPermission, PermissionAuditLog
from apps.users.models import Department
from apps.folders.models import Folder

User = get_user_model()


class RoleSerializer(serializers.ModelSerializer):
    """
    Serializer for Role model.
    Used for role listing and details.
    """
    permissions_list = serializers.SerializerMethodField()
    display_name = serializers.CharField(source='get_name_display', read_only=True)

    class Meta:
        model = Role
        fields = [
            'id',
            'name',
            'display_name',
            'description',
            'can_view',
            'can_download',
            'can_upload',
            'can_edit',
            'can_delete',
            'can_share',
            'can_manage_permissions',
            'can_view_audit_log',
            'can_manage_retention',
            'can_manage_classification',
            'permissions_list',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_permissions_list(self, obj):
        """Get list of permission names this role has"""
        return obj.get_permissions_list()


class RoleListSerializer(serializers.ModelSerializer):
    """
    Minimal serializer for role listings.
    """
    display_name = serializers.CharField(source='get_name_display', read_only=True)
    permission_count = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = ['id', 'name', 'display_name', 'description', 'permission_count']

    def get_permission_count(self, obj):
        """Count of active permissions"""
        return len(obj.get_permissions_list())


class UserRoleSerializer(serializers.ModelSerializer):
    """
    Serializer for UserRole assignments.
    """
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_full_name = serializers.CharField(source='user.get_full_name', read_only=True)
    role_name = serializers.CharField(source='role.get_name_display', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True, allow_null=True)
    granted_by_username = serializers.CharField(source='granted_by.username', read_only=True, allow_null=True)
    scope_display = serializers.CharField(source='get_scope_display', read_only=True)
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = UserRole
        fields = [
            'id',
            'user',
            'user_username',
            'user_email',
            'user_full_name',
            'role',
            'role_name',
            'scope',
            'scope_display',
            'department',
            'department_name',
            'granted_by',
            'granted_by_username',
            'granted_at',
            'expires_at',
            'is_expired',
            'is_active',
        ]
        read_only_fields = ['id', 'granted_at', 'granted_by']

    def get_is_expired(self, obj):
        """Check if role assignment has expired"""
        from django.utils import timezone
        if obj.expires_at:
            return obj.expires_at <= timezone.now()
        return False

    def validate(self, data):
        """Validate role assignment"""
        scope = data.get('scope')
        department = data.get('department')

        # Validate department scope
        if scope == UserRole.DEPARTMENT and not department:
            raise serializers.ValidationError(
                "Department is required for DEPARTMENT scope"
            )
        if scope != UserRole.DEPARTMENT and department:
            raise serializers.ValidationError(
                "Department should only be set for DEPARTMENT scope"
            )

        # Check if expires_at is in the future
        expires_at = data.get('expires_at')
        if expires_at:
            from django.utils import timezone
            if expires_at <= timezone.now():
                raise serializers.ValidationError(
                    "Expiration date must be in the future"
                )

        return data

    def create(self, validated_data):
        """Create role assignment and set granted_by"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['granted_by'] = request.user
        return super().create(validated_data)


class UserRoleCreateSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for creating user role assignments.
    """
    class Meta:
        model = UserRole
        fields = ['user', 'role', 'scope', 'department', 'expires_at', 'is_active']

    def validate(self, data):
        """Validate role assignment"""
        scope = data.get('scope')
        department = data.get('department')

        if scope == UserRole.DEPARTMENT and not department:
            raise serializers.ValidationError({
                'department': 'Department is required for DEPARTMENT scope'
            })
        if scope != UserRole.DEPARTMENT and department:
            raise serializers.ValidationError({
                'department': 'Department should only be set for DEPARTMENT scope'
            })

        return data

    def create(self, validated_data):
        """Create role assignment and set granted_by"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['granted_by'] = request.user
        return super().create(validated_data)


class FolderPermissionSerializer(serializers.ModelSerializer):
    """
    Serializer for FolderPermission.
    """
    folder_name = serializers.CharField(source='folder.name', read_only=True)
    folder_path = serializers.CharField(source='folder.get_full_path', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True, allow_null=True)
    user_email = serializers.EmailField(source='user.email', read_only=True, allow_null=True)
    department_name = serializers.CharField(source='department.name', read_only=True, allow_null=True)
    granted_by_username = serializers.CharField(source='granted_by.username', read_only=True, allow_null=True)
    permission_level_display = serializers.CharField(source='get_permission_level_display', read_only=True)
    effective_permissions = serializers.SerializerMethodField()

    class Meta:
        model = FolderPermission
        fields = [
            'id',
            'folder',
            'folder_name',
            'folder_path',
            'user',
            'user_username',
            'user_email',
            'department',
            'department_name',
            'permission_level',
            'permission_level_display',
            'inherit_from_parent',
            'granted_by',
            'granted_by_username',
            'granted_at',
            'effective_permissions',
        ]
        read_only_fields = ['id', 'granted_at', 'granted_by']

    def get_effective_permissions(self, obj):
        """Get effective permissions considering inheritance"""
        return obj.get_effective_permissions()

    def validate(self, data):
        """Validate folder permission assignment"""
        user = data.get('user')
        department = data.get('department')

        # Must have either user or department, not both
        if not user and not department:
            raise serializers.ValidationError(
                "Either user or department must be specified"
            )
        if user and department:
            raise serializers.ValidationError(
                "Cannot assign permission to both user and department"
            )

        return data

    def create(self, validated_data):
        """Create folder permission and set granted_by"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['granted_by'] = request.user
        return super().create(validated_data)


class FolderPermissionCreateSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for creating folder permissions.
    """
    class Meta:
        model = FolderPermission
        fields = [
            'folder',
            'user',
            'department',
            'permission_level',
            'inherit_from_parent',
        ]

    def validate(self, data):
        """Validate folder permission assignment"""
        user = data.get('user')
        department = data.get('department')

        if not user and not department:
            raise serializers.ValidationError({
                'user': 'Either user or department must be specified'
            })
        if user and department:
            raise serializers.ValidationError(
                'Cannot assign permission to both user and department'
            )

        return data

    def create(self, validated_data):
        """Create folder permission and set granted_by"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['granted_by'] = request.user
        return super().create(validated_data)


class FolderPermissionListSerializer(serializers.ModelSerializer):
    """
    Minimal serializer for folder permission listings.
    """
    target = serializers.SerializerMethodField()
    permission_level_display = serializers.CharField(source='get_permission_level_display', read_only=True)

    class Meta:
        model = FolderPermission
        fields = [
            'id',
            'folder',
            'target',
            'permission_level',
            'permission_level_display',
            'inherit_from_parent',
            'granted_at',
        ]

    def get_target(self, obj):
        """Get user or department name"""
        if obj.user:
            return {
                'type': 'user',
                'id': str(obj.user.id),
                'name': obj.user.get_full_name() or obj.user.username,
                'email': obj.user.email,
            }
        elif obj.department:
            return {
                'type': 'department',
                'id': str(obj.department.id),
                'name': obj.department.name,
                'code': obj.department.code,
            }
        return None


class UserPermissionSummarySerializer(serializers.Serializer):
    """
    Serializer for user's permission summary.
    Shows all roles and permissions for a user.
    """
    user_id = serializers.IntegerField()  # User model uses integer IDs
    username = serializers.CharField()
    email = serializers.EmailField()
    full_name = serializers.CharField()
    is_superuser = serializers.BooleanField()

    global_roles = UserRoleSerializer(many=True, read_only=True)
    department_roles = UserRoleSerializer(many=True, read_only=True)
    folder_permissions = FolderPermissionListSerializer(many=True, read_only=True)

    all_permissions = serializers.ListField(child=serializers.CharField())
    accessible_folder_count = serializers.IntegerField()
    accessible_document_count = serializers.IntegerField()


class FolderPermissionCheckSerializer(serializers.Serializer):
    """
    Serializer for checking if user has permission on a folder.
    """
    folder_id = serializers.UUIDField()
    user_id = serializers.IntegerField()  # User model uses integer IDs
    permission = serializers.ChoiceField(choices=[
        'can_view',
        'can_download',
        'can_upload',
        'can_edit',
        'can_delete',
        'can_manage_permissions',
    ])

    has_permission = serializers.BooleanField(read_only=True)
    reason = serializers.CharField(read_only=True)


class BulkPermissionAssignSerializer(serializers.Serializer):
    """
    Serializer for bulk permission assignment.
    Allows assigning permissions to multiple users/departments at once.
    """
    folder_id = serializers.UUIDField()
    assignments = serializers.ListField(
        child=serializers.DictField(),
        allow_empty=False,
        help_text="List of permission assignments"
    )

    def validate_assignments(self, value):
        """Validate each assignment in the list"""
        for assignment in value:
            # Each assignment must have target (user or department)
            if 'user_id' not in assignment and 'department_id' not in assignment:
                raise serializers.ValidationError(
                    "Each assignment must have either user_id or department_id"
                )
            if 'user_id' in assignment and 'department_id' in assignment:
                raise serializers.ValidationError(
                    "Assignment cannot have both user_id and department_id"
                )

            # Must have permission_level
            if 'permission_level' not in assignment:
                raise serializers.ValidationError(
                    "Each assignment must have permission_level"
                )

            # Validate permission_level
            valid_levels = [choice[0] for choice in FolderPermission.PERMISSION_LEVEL_CHOICES]
            if assignment['permission_level'] not in valid_levels:
                raise serializers.ValidationError(
                    f"Invalid permission_level. Must be one of: {', '.join(valid_levels)}"
                )

        return value


class PermissionInheritanceTreeSerializer(serializers.Serializer):
    """
    Serializer for showing permission inheritance tree.
    Shows how permissions flow from parent to child folders.
    """
    folder_id = serializers.UUIDField()
    folder_name = serializers.CharField()
    folder_path = serializers.CharField()

    direct_permissions = FolderPermissionListSerializer(many=True)
    inherited_permissions = serializers.DictField()
    effective_permissions = serializers.DictField()

    children = serializers.ListField(
        child=serializers.DictField(),
        read_only=True,
        help_text="Child folders with their permissions"
    )


# ========================================
# Document Permission Serializers
# ========================================

class DocumentPermissionSerializer(serializers.ModelSerializer):
    """
    Full serializer for DocumentPermission.
    """
    document_title = serializers.CharField(source='document.title', read_only=True)
    document_file_name = serializers.CharField(source='document.file_name', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True, allow_null=True)
    user_email = serializers.EmailField(source='user.email', read_only=True, allow_null=True)
    user_full_name = serializers.SerializerMethodField()
    department_name = serializers.CharField(source='department.name', read_only=True, allow_null=True)
    granted_by_username = serializers.CharField(source='granted_by.username', read_only=True, allow_null=True)
    permission_level_display = serializers.CharField(source='get_permission_level_display', read_only=True)
    effective_permissions = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = DocumentPermission
        fields = [
            'id',
            'document',
            'document_title',
            'document_file_name',
            'user',
            'user_username',
            'user_email',
            'user_full_name',
            'department',
            'department_name',
            'permission_level',
            'permission_level_display',
            'override_folder_permissions',
            'granted_by',
            'granted_by_username',
            'granted_at',
            'expires_at',
            'reason',
            'effective_permissions',
            'is_expired',
        ]
        read_only_fields = ['id', 'granted_at', 'granted_by']

    def get_user_full_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return None

    def get_effective_permissions(self, obj):
        return obj.get_effective_permissions()

    def get_is_expired(self, obj):
        return obj.is_expired()

    def validate(self, data):
        user = data.get('user')
        department = data.get('department')

        if not user and not department:
            raise serializers.ValidationError(
                "Either user or department must be specified"
            )
        if user and department:
            raise serializers.ValidationError(
                "Cannot assign permission to both user and department"
            )

        # Check expires_at is in the future
        expires_at = data.get('expires_at')
        if expires_at:
            from django.utils import timezone
            if expires_at <= timezone.now():
                raise serializers.ValidationError(
                    "Expiration date must be in the future"
                )

        return data

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['granted_by'] = request.user
        return super().create(validated_data)


class DocumentPermissionCreateSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for creating document permissions.
    """
    class Meta:
        model = DocumentPermission
        fields = [
            'document',
            'user',
            'department',
            'permission_level',
            'override_folder_permissions',
            'expires_at',
            'reason',
        ]

    def validate(self, data):
        user = data.get('user')
        department = data.get('department')

        if not user and not department:
            raise serializers.ValidationError({
                'user': 'Either user or department must be specified'
            })
        if user and department:
            raise serializers.ValidationError(
                'Cannot assign permission to both user and department'
            )

        return data

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['granted_by'] = request.user
        return super().create(validated_data)


class DocumentPermissionListSerializer(serializers.ModelSerializer):
    """
    Minimal serializer for document permission listings.
    """
    target = serializers.SerializerMethodField()
    permission_level_display = serializers.CharField(source='get_permission_level_display', read_only=True)
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = DocumentPermission
        fields = [
            'id',
            'document',
            'target',
            'permission_level',
            'permission_level_display',
            'override_folder_permissions',
            'expires_at',
            'granted_at',
            'is_expired',
        ]

    def get_target(self, obj):
        if obj.user:
            return {
                'type': 'user',
                'id': str(obj.user.id),
                'name': obj.user.get_full_name() or obj.user.username,
                'email': obj.user.email,
            }
        elif obj.department:
            return {
                'type': 'department',
                'id': str(obj.department.id),
                'name': obj.department.name,
                'code': obj.department.code if hasattr(obj.department, 'code') else None,
            }
        return None

    def get_is_expired(self, obj):
        return obj.is_expired()


class DocumentPermissionCheckSerializer(serializers.Serializer):
    """
    Serializer for checking if user has permission on a document.
    """
    document_id = serializers.UUIDField()
    user_id = serializers.IntegerField()  # User model uses integer IDs
    permission = serializers.ChoiceField(choices=[
        'can_view',
        'can_download',
        'can_edit',
        'can_delete',
        'can_share',
        'can_manage_permissions',
    ])

    has_permission = serializers.BooleanField(read_only=True)
    reason = serializers.CharField(read_only=True)
    source = serializers.CharField(read_only=True)


class BulkDocumentPermissionSerializer(serializers.Serializer):
    """
    Serializer for bulk document permission assignment.
    """
    document_id = serializers.UUIDField()
    assignments = serializers.ListField(
        child=serializers.DictField(),
        allow_empty=False,
        help_text="List of permission assignments"
    )

    def validate_assignments(self, value):
        for assignment in value:
            if 'user_id' not in assignment and 'department_id' not in assignment:
                raise serializers.ValidationError(
                    "Each assignment must have either user_id or department_id"
                )
            if 'user_id' in assignment and 'department_id' in assignment:
                raise serializers.ValidationError(
                    "Assignment cannot have both user_id and department_id"
                )
            if 'permission_level' not in assignment:
                raise serializers.ValidationError(
                    "Each assignment must have permission_level"
                )

            valid_levels = [choice[0] for choice in DocumentPermission.PERMISSION_LEVEL_CHOICES]
            if assignment['permission_level'] not in valid_levels:
                raise serializers.ValidationError(
                    f"Invalid permission_level. Must be one of: {', '.join(valid_levels)}"
                )

        return value


# ========================================
# Permission Audit Log Serializers
# ========================================

class PermissionAuditLogSerializer(serializers.ModelSerializer):
    """
    Serializer for permission audit log entries.
    """
    actor_username = serializers.CharField(source='actor.username', read_only=True, allow_null=True)
    actor_full_name = serializers.SerializerMethodField()
    target_user_username = serializers.CharField(source='target_user.username', read_only=True, allow_null=True)
    target_department_name = serializers.CharField(source='target_department.name', read_only=True, allow_null=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    resource_type_display = serializers.CharField(source='get_resource_type_display', read_only=True)

    class Meta:
        model = PermissionAuditLog
        fields = [
            'id',
            'actor',
            'actor_username',
            'actor_full_name',
            'action',
            'action_display',
            'resource_type',
            'resource_type_display',
            'resource_id',
            'target_user',
            'target_user_username',
            'target_department',
            'target_department_name',
            'old_permission_level',
            'new_permission_level',
            'reason',
            'ip_address',
            'timestamp',
        ]
        read_only_fields = ['id', 'timestamp']

    def get_actor_full_name(self, obj):
        if obj.actor:
            return obj.actor.get_full_name() or obj.actor.username
        return 'System'


class PermissionAuditLogListSerializer(serializers.ModelSerializer):
    """
    Minimal serializer for audit log listings.
    """
    actor_name = serializers.SerializerMethodField()
    target_name = serializers.SerializerMethodField()
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = PermissionAuditLog
        fields = [
            'id',
            'actor_name',
            'action',
            'action_display',
            'resource_type',
            'resource_id',
            'target_name',
            'timestamp',
        ]

    def get_actor_name(self, obj):
        if obj.actor:
            return obj.actor.get_full_name() or obj.actor.username
        return 'System'

    def get_target_name(self, obj):
        if obj.target_user:
            return obj.target_user.get_full_name() or obj.target_user.username
        elif obj.target_department:
            return obj.target_department.name
        return 'Unknown'
