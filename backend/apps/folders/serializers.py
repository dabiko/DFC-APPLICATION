"""
Serializers for folder management.
"""
from rest_framework import serializers
from apps.folders.models import Folder, FolderTemplate, SmartFolder
from apps.users.models import Department


class FolderListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing folders (minimal data for tree views).
    """
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    children_count = serializers.SerializerMethodField()
    documents_count = serializers.SerializerMethodField()

    class Meta:
        model = Folder
        fields = [
            'id', 'name', 'parent', 'path', 'depth',
            'owner', 'owner_name', 'department', 'department_name',
            'confidentiality_level', 'is_locked', 'created_at', 'updated_at',
            'children_count', 'documents_count'
        ]

    def get_children_count(self, obj):
        """Get number of direct children"""
        return obj.children.count()

    def get_documents_count(self, obj):
        """Get number of documents in this folder"""
        return obj.documents.filter(is_deleted=False).count()


class FolderDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for retrieving folder details with full information.
    """
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    parent_name = serializers.CharField(source='parent.name', read_only=True, allow_null=True)
    breadcrumb = serializers.SerializerMethodField()
    children = serializers.SerializerMethodField()
    documents_count = serializers.SerializerMethodField()

    class Meta:
        model = Folder
        fields = [
            'id', 'name', 'parent', 'parent_name', 'path', 'depth',
            'owner', 'owner_name', 'department', 'department_name',
            'confidentiality_level', 'is_locked', 'description',
            'created_at', 'updated_at', 'created_by', 'created_by_name',
            'breadcrumb', 'children', 'documents_count'
        ]
        read_only_fields = ['id', 'path', 'depth', 'created_at', 'updated_at', 'created_by']

    def get_breadcrumb(self, obj):
        """Get breadcrumb trail from root to this folder"""
        breadcrumb = []
        for folder in obj.get_breadcrumb():
            breadcrumb.append({
                'id': folder.id,
                'name': folder.name,
                'path': folder.path
            })
        return breadcrumb

    def get_children(self, obj):
        """Get immediate children folders"""
        children = obj.children.all()
        return FolderListSerializer(children, many=True).data

    def get_documents_count(self, obj):
        """Get number of documents in this folder"""
        return obj.documents.filter(is_deleted=False).count()


class FolderCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new folders.
    """
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = Folder
        fields = [
            'name', 'parent', 'department', 'confidentiality_level', 'description'
        ]

    def validate_name(self, value):
        """Validate folder name"""
        # Check for invalid characters
        invalid_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']
        for char in invalid_chars:
            if char in value:
                raise serializers.ValidationError(
                    f"Folder name cannot contain: {' '.join(invalid_chars)}"
                )

        # Check length
        if len(value) < 1 or len(value) > 255:
            raise serializers.ValidationError(
                "Folder name must be between 1 and 255 characters"
            )

        return value

    def validate(self, attrs):
        """
        Additional validation for folder creation.
        """
        request = self.context.get('request')
        parent = attrs.get('parent')
        department = attrs.get('department')

        # Ensure user has access to parent folder
        if parent and parent.department != request.user.department:
            if not request.user.is_staff:
                raise serializers.ValidationError({
                    'parent': 'You do not have permission to create folders in this location'
                })

        # Ensure department matches parent's department
        if parent and department and parent.department != department:
            raise serializers.ValidationError({
                'department': 'Department must match the parent folder\'s department'
            })

        # If department not specified and parent exists, use parent's department
        if parent and not department:
            attrs['department'] = parent.department

        # Check for duplicate folder name within same parent
        name = attrs.get('name')
        if Folder.objects.filter(parent=parent, name=name).exists():
            raise serializers.ValidationError({
                'name': 'A folder with this name already exists in this location'
            })

        return attrs

    def create(self, validated_data):
        """Create folder with ownership tracking"""
        # owner and created_by are already in validated_data from the view's perform_create
        folder = Folder.objects.create(**validated_data)
        return folder


class FolderUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating folder metadata.
    """
    class Meta:
        model = Folder
        fields = ['name', 'description', 'confidentiality_level', 'is_locked']

    def validate_name(self, value):
        """Validate folder name"""
        invalid_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']
        for char in invalid_chars:
            if char in value:
                raise serializers.ValidationError(
                    f"Folder name cannot contain: {' '.join(invalid_chars)}"
                )

        if len(value) < 1 or len(value) > 255:
            raise serializers.ValidationError(
                "Folder name must be between 1 and 255 characters"
            )

        return value

    def validate(self, attrs):
        """Check for duplicate name in same parent"""
        instance = self.instance
        name = attrs.get('name', instance.name)

        # Check for duplicate name within same parent
        duplicate = Folder.objects.filter(
            parent=instance.parent,
            name=name
        ).exclude(id=instance.id)

        if duplicate.exists():
            raise serializers.ValidationError({
                'name': 'A folder with this name already exists in this location'
            })

        return attrs


class FolderMoveSerializer(serializers.Serializer):
    """
    Serializer for moving folders to a new parent.
    """
    new_parent = serializers.UUIDField(
        required=False,
        allow_null=True,
        help_text='UUID of the new parent folder. Null for root level.'
    )

    def validate_new_parent(self, value):
        """Validate that new parent exists and is accessible"""
        if value is None:
            return None

        try:
            folder = Folder.objects.get(id=value)
            request = self.context.get('request')

            # Check permissions
            if not request.user.is_staff:
                if folder.department != request.user.department:
                    raise serializers.ValidationError(
                        'You do not have permission to move folders to this location'
                    )

            return folder
        except Folder.DoesNotExist:
            raise serializers.ValidationError('Parent folder not found')

    def validate(self, attrs):
        """Validate move operation"""
        new_parent = attrs.get('new_parent')
        instance = self.context.get('instance')

        if new_parent:
            # Cannot move folder into itself
            if new_parent.id == instance.id:
                raise serializers.ValidationError({
                    'new_parent': 'Cannot move a folder into itself'
                })

            # Cannot move folder into its own descendants
            if new_parent.path.startswith(instance.path):
                raise serializers.ValidationError({
                    'new_parent': 'Cannot move a folder into its own subdirectory'
                })

            # Check for duplicate name in new location
            if Folder.objects.filter(parent=new_parent, name=instance.name).exists():
                raise serializers.ValidationError({
                    'new_parent': f'A folder named "{instance.name}" already exists in the destination'
                })

        return attrs


class FolderTemplateSerializer(serializers.ModelSerializer):
    """
    Serializer for folder templates.
    """
    department_name = serializers.CharField(source='department.name', read_only=True, allow_null=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = FolderTemplate
        fields = [
            'id', 'name', 'description', 'structure',
            'department', 'department_name', 'is_active',
            'created_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'created_by']

    def validate_structure(self, value):
        """Validate folder structure JSON"""
        if not isinstance(value, dict):
            raise serializers.ValidationError(
                'Structure must be a valid JSON object'
            )

        # Ensure structure has required fields
        if 'folders' not in value:
            raise serializers.ValidationError(
                'Structure must contain a "folders" key with folder hierarchy'
            )

        return value

    def create(self, validated_data):
        """Create template with ownership tracking"""
        request = self.context.get('request')
        template = FolderTemplate.objects.create(
            **validated_data,
            created_by=request.user
        )
        return template


class FolderTreeSerializer(serializers.Serializer):
    """
    Serializer for folder tree structure (hierarchical representation).
    """
    id = serializers.UUIDField()
    name = serializers.CharField()
    path = serializers.CharField()
    depth = serializers.IntegerField()
    confidentiality_level = serializers.CharField()
    children_count = serializers.IntegerField()
    documents_count = serializers.IntegerField()
    children = serializers.SerializerMethodField()

    def get_children(self, obj):
        """Recursively get children folders"""
        children = obj.get('children', [])
        return FolderTreeSerializer(children, many=True).data


class TrashFolderSerializer(serializers.ModelSerializer):
    """
    Serializer for folders in trash with deleted_by information.
    """
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    children_count = serializers.SerializerMethodField()
    documents_count = serializers.SerializerMethodField()
    deleted_by_name = serializers.SerializerMethodField()
    deleted_by_email = serializers.SerializerMethodField()
    total_size = serializers.SerializerMethodField()

    class Meta:
        model = Folder
        fields = [
            'id', 'name', 'parent', 'path', 'depth',
            'owner', 'owner_name', 'department', 'department_name',
            'confidentiality_level', 'is_locked', 'created_at', 'updated_at',
            'children_count', 'documents_count',
            'deleted_at', 'deleted_by', 'deleted_by_name', 'deleted_by_email',
            'total_size'
        ]

    def get_children_count(self, obj):
        """Get number of direct children (including deleted)"""
        return obj.children.filter(is_deleted=True).count()

    def get_documents_count(self, obj):
        """Get number of documents in this folder"""
        return obj.documents.count()

    def get_deleted_by_name(self, obj):
        """Get the name of the user who deleted the folder"""
        if obj.deleted_by:
            return obj.deleted_by.get_full_name() or obj.deleted_by.username
        return None

    def get_deleted_by_email(self, obj):
        """Get the email of the user who deleted the folder"""
        if obj.deleted_by:
            return obj.deleted_by.email
        return None

    def get_total_size(self, obj):
        """Get total size of documents in this folder"""
        from django.db.models import Sum
        total = obj.documents.aggregate(total=Sum('file_size'))['total']
        return total or 0


# ============================================================================
# SMART FOLDER SERIALIZERS
# ============================================================================

class SmartFolderListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing smart folders (minimal data).
    """
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True, allow_null=True)

    class Meta:
        model = SmartFolder
        fields = [
            'id', 'name', 'description', 'icon', 'color',
            'is_personal', 'is_global', 'is_active',
            'owner', 'owner_name', 'department', 'department_name',
            'document_count', 'last_count_update',
            'include_owned', 'include_shared',
            'display_order', 'is_visible',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'owner', 'document_count', 'last_count_update', 'created_at', 'updated_at']


class SmartFolderDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for smart folder details with full information.
    """
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True, allow_null=True)

    class Meta:
        model = SmartFolder
        fields = [
            'id', 'name', 'description', 'criteria', 'icon', 'color',
            'owner', 'owner_name', 'department', 'department_name',
            'is_personal', 'is_global', 'is_active',
            'document_count', 'last_count_update',
            'include_owned', 'include_shared',
            'display_order', 'is_visible',
            'created_at', 'updated_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = ['id', 'owner', 'document_count', 'last_count_update', 'created_at', 'updated_at', 'created_by']


class SmartFolderCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating smart folders.

    Validates criteria JSON structure.
    """
    class Meta:
        model = SmartFolder
        fields = [
            'name', 'description', 'criteria', 'icon', 'color',
            'department', 'is_personal', 'is_global',
            'include_owned', 'include_shared', 'is_visible'
        ]

    def validate_name(self, value):
        """Validate smart folder name"""
        if len(value) < 1 or len(value) > 255:
            raise serializers.ValidationError(
                "Smart folder name must be between 1 and 255 characters"
            )
        return value

    def validate_criteria(self, value):
        """Validate criteria JSON structure"""
        if not isinstance(value, dict):
            raise serializers.ValidationError(
                'Criteria must be a valid JSON object'
            )

        # Validate supported filter keys
        supported_keys = {
            'document_type', 'confidentiality_level', 'date_range',
            'folder_path', 'folder_id', 'tags', 'file_type',
            'file_size_min', 'file_size_max', 'owner_id', 'department_id',
            'search_text', 'created_date_range',
            # New filter types for My Documents feature
            'relative_date', 'state', 'name_contains'
        }

        invalid_keys = set(value.keys()) - supported_keys
        if invalid_keys:
            raise serializers.ValidationError(
                f'Unsupported criteria keys: {", ".join(invalid_keys)}. '
                f'Supported keys: {", ".join(sorted(supported_keys))}'
            )

        # Validate relative_date values
        if 'relative_date' in value:
            valid_relative_dates = ['today', 'this_week', 'this_month', 'last_7_days', 'last_30_days']
            if value['relative_date'] not in valid_relative_dates:
                raise serializers.ValidationError(
                    f'relative_date must be one of: {", ".join(valid_relative_dates)}'
                )

        # Validate state values
        if 'state' in value:
            valid_states = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED']
            states = value['state'] if isinstance(value['state'], list) else [value['state']]
            for s in states:
                if s not in valid_states:
                    raise serializers.ValidationError(
                        f'state must be one of: {", ".join(valid_states)}'
                    )

        # Validate date_range format
        if 'date_range' in value:
            date_range = value['date_range']
            if not isinstance(date_range, dict):
                raise serializers.ValidationError(
                    'date_range must be an object with "from" and/or "to" keys'
                )
            if 'from' not in date_range and 'to' not in date_range:
                raise serializers.ValidationError(
                    'date_range must have at least "from" or "to" key'
                )

        # Validate created_date_range format
        if 'created_date_range' in value:
            created_range = value['created_date_range']
            if not isinstance(created_range, dict):
                raise serializers.ValidationError(
                    'created_date_range must be an object with "from" and/or "to" keys'
                )

        # Validate tags is list if present
        if 'tags' in value and not isinstance(value['tags'], (list, str)):
            raise serializers.ValidationError(
                'tags must be a string or list of strings'
            )

        return value

    def validate(self, attrs):
        """Additional validation"""
        request = self.context.get('request')
        is_personal = attrs.get('is_personal', True)
        is_global = attrs.get('is_global', False)
        department = attrs.get('department')
        name = attrs.get('name')

        # Check for duplicate name for the same user
        if name:
            existing = SmartFolder.objects.filter(
                owner=request.user,
                name__iexact=name.strip(),
                is_active=True
            )
            if existing.exists():
                raise serializers.ValidationError({
                    'name': 'You already have a smart folder with this name'
                })

        # Only staff can create global smart folders
        if is_global and not request.user.is_staff:
            raise serializers.ValidationError({
                'is_global': 'Only administrators can create global smart folders'
            })

        # Department-shared smart folders must have department set
        if not is_personal and not is_global and not department:
            raise serializers.ValidationError({
                'department': 'Department must be specified for shared smart folders'
            })

        # Personal smart folders cannot have department
        if is_personal and department:
            raise serializers.ValidationError({
                'department': 'Personal smart folders cannot have a department'
            })

        # Global smart folders cannot have department
        if is_global and department:
            raise serializers.ValidationError({
                'department': 'Global smart folders cannot be department-specific'
            })

        return attrs

    def create(self, validated_data):
        """Create smart folder with ownership"""
        # owner and created_by are set in perform_create of the view
        smart_folder = SmartFolder.objects.create(**validated_data)
        return smart_folder


class SmartFolderUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating smart folders.
    """
    class Meta:
        model = SmartFolder
        fields = [
            'name', 'description', 'criteria', 'icon', 'color', 'is_active',
            'include_owned', 'include_shared', 'is_visible', 'display_order'
        ]

    def validate_name(self, value):
        """Validate smart folder name"""
        if len(value) < 1 or len(value) > 255:
            raise serializers.ValidationError(
                "Smart folder name must be between 1 and 255 characters"
            )
        return value

    def validate_criteria(self, value):
        """Validate criteria JSON structure"""
        if not isinstance(value, dict):
            raise serializers.ValidationError(
                'Criteria must be a valid JSON object'
            )

        supported_keys = {
            'document_type', 'confidentiality_level', 'date_range',
            'folder_path', 'folder_id', 'tags', 'file_type',
            'file_size_min', 'file_size_max', 'owner_id', 'department_id',
            'search_text', 'created_date_range'
        }

        invalid_keys = set(value.keys()) - supported_keys
        if invalid_keys:
            raise serializers.ValidationError(
                f'Unsupported criteria keys: {", ".join(invalid_keys)}'
            )

        return value


class SmartFolderReorderSerializer(serializers.Serializer):
    """
    Serializer for reordering smart folders.
    """
    ordered_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        help_text='List of smart folder IDs in desired order'
    )

    def validate_ordered_ids(self, value):
        """Validate that all IDs belong to the user."""
        request = self.context.get('request')
        if not request:
            raise serializers.ValidationError('Request context required')

        user_folder_ids = set(
            SmartFolder.objects.filter(owner=request.user)
            .values_list('id', flat=True)
        )

        for folder_id in value:
            if folder_id not in user_folder_ids:
                raise serializers.ValidationError(
                    f'Smart folder {folder_id} not found or does not belong to you'
                )

        return value
