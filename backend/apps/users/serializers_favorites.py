"""
Favorites Serializers

Serializers for user favorites (folders, documents, and collections).
"""

from rest_framework import serializers
from apps.users.models_favorites import FavoriteFolder, FavoriteDocument, FavoriteCollection


# ============== Collection Serializers ==============

class FavoriteCollectionSerializer(serializers.ModelSerializer):
    """Serializer for favorite collections."""
    item_count = serializers.ReadOnlyField()
    owner_name = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
    has_password = serializers.SerializerMethodField()

    class Meta:
        model = FavoriteCollection
        fields = [
            'id', 'name', 'description', 'color', 'icon',
            'is_shared', 'has_password', 'share_expires_at',
            'position', 'item_count',
            'owner_name', 'is_owner',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'item_count', 'owner_name', 'is_owner', 'has_password', 'created_at', 'updated_at']

    def get_owner_name(self, obj):
        return f"{obj.owner.first_name} {obj.owner.last_name}".strip() or obj.owner.username

    def get_is_owner(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.owner == request.user
        return False

    def get_has_password(self, obj):
        """Return whether the collection has password protection."""
        return bool(obj.share_password)


class FavoriteCollectionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating collections."""

    class Meta:
        model = FavoriteCollection
        fields = ['name', 'description', 'color', 'icon']


class FavoriteCollectionDetailSerializer(FavoriteCollectionSerializer):
    """Detailed serializer including shared users."""
    shared_with_users = serializers.SerializerMethodField()

    class Meta(FavoriteCollectionSerializer.Meta):
        fields = FavoriteCollectionSerializer.Meta.fields + ['shared_with_users']

    def get_shared_with_users(self, obj):
        return [
            {
                'id': user.id,
                'username': user.username,
                'full_name': f"{user.first_name} {user.last_name}".strip() or user.username,
                'email': user.email
            }
            for user in obj.shared_with.all()
        ]


# ============== Folder Favorites Serializers ==============

class FavoriteFolderSerializer(serializers.ModelSerializer):
    """Basic serializer for favorite folders."""

    class Meta:
        model = FavoriteFolder
        fields = ['id', 'folder', 'collection', 'position', 'created_at']
        read_only_fields = ['id', 'created_at']


class FavoriteFolderListSerializer(serializers.ModelSerializer):
    """Serializer for listing favorite folders with folder details."""
    folder_id = serializers.SerializerMethodField()
    folder_name = serializers.CharField(source='folder.name')
    folder_path = serializers.CharField(source='folder.path', allow_null=True)
    confidentiality_level = serializers.CharField(source='folder.confidentiality_level')
    is_locked = serializers.BooleanField(source='folder.is_locked', default=False)
    department_name = serializers.SerializerMethodField()
    collection_id = serializers.SerializerMethodField()
    collection_name = serializers.SerializerMethodField()

    class Meta:
        model = FavoriteFolder
        fields = [
            'id', 'folder_id', 'folder_name', 'folder_path',
            'confidentiality_level', 'is_locked', 'department_name',
            'collection_id', 'collection_name', 'position',
            'created_at'
        ]

    def get_folder_id(self, obj):
        if obj.folder:
            return str(obj.folder.id)
        return None

    def get_department_name(self, obj):
        if obj.folder and obj.folder.department:
            return obj.folder.department.name
        return None

    def get_collection_id(self, obj):
        if obj.collection:
            return str(obj.collection.id)
        return None

    def get_collection_name(self, obj):
        if obj.collection:
            return obj.collection.name
        return None


# ============== Document Favorites Serializers ==============

class FavoriteDocumentSerializer(serializers.ModelSerializer):
    """Basic serializer for favorite documents."""

    class Meta:
        model = FavoriteDocument
        fields = ['id', 'document', 'collection', 'position', 'created_at']
        read_only_fields = ['id', 'created_at']


class FavoriteDocumentListSerializer(serializers.ModelSerializer):
    """Serializer for listing favorite documents with document details."""
    document_id = serializers.SerializerMethodField()
    document_title = serializers.CharField(source='document.title')
    file_name = serializers.CharField(source='document.file_name')
    file_type = serializers.CharField(source='document.file_type')
    file_size = serializers.IntegerField(source='document.file_size')
    confidentiality_level = serializers.CharField(source='document.confidentiality_level')
    folder_id = serializers.SerializerMethodField()
    folder_name = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    collection_id = serializers.SerializerMethodField()
    collection_name = serializers.SerializerMethodField()
    # Additional fields for quick preview
    description = serializers.CharField(source='document.description', allow_null=True, allow_blank=True)
    document_type = serializers.CharField(source='document.document_type', allow_null=True)
    uploaded_at = serializers.DateTimeField(source='document.created_at')
    updated_at = serializers.DateTimeField(source='document.updated_at')

    class Meta:
        model = FavoriteDocument
        fields = [
            'id', 'document_id', 'document_title', 'file_name',
            'file_type', 'file_size', 'confidentiality_level',
            'folder_id', 'folder_name', 'department_name',
            'collection_id', 'collection_name', 'position',
            'description', 'document_type', 'uploaded_at', 'updated_at',
            'created_at'
        ]

    def get_document_id(self, obj):
        if obj.document:
            return str(obj.document.id)
        return None

    def get_folder_id(self, obj):
        if obj.document and obj.document.folder:
            return str(obj.document.folder.id)
        return None

    def get_folder_name(self, obj):
        if obj.document and obj.document.folder:
            return obj.document.folder.name
        return None

    def get_department_name(self, obj):
        if obj.document and obj.document.department:
            return obj.document.department.name
        return None

    def get_collection_id(self, obj):
        if obj.collection:
            return str(obj.collection.id)
        return None

    def get_collection_name(self, obj):
        if obj.collection:
            return obj.collection.name
        return None


# ============== Reorder Serializers ==============

class ReorderItemSerializer(serializers.Serializer):
    """Serializer for reordering items."""
    item_id = serializers.UUIDField()
    position = serializers.IntegerField(min_value=0)


class BulkReorderSerializer(serializers.Serializer):
    """Serializer for bulk reorder operations."""
    items = ReorderItemSerializer(many=True)


class MoveToCollectionSerializer(serializers.Serializer):
    """Serializer for moving items to a collection."""
    item_ids = serializers.ListField(child=serializers.UUIDField())
    collection_id = serializers.UUIDField(allow_null=True)  # null = Uncategorized
    item_type = serializers.ChoiceField(choices=['folder', 'document'])


# ============== Share Serializers ==============

class ShareCollectionSerializer(serializers.Serializer):
    """Serializer for sharing a collection."""
    user_ids = serializers.ListField(child=serializers.IntegerField())
    password = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=128,
        help_text='Optional password to protect the shared collection'
    )
    expires_at = serializers.DateTimeField(
        required=False,
        allow_null=True,
        help_text='Optional expiration date for the share'
    )
    remove_password = serializers.BooleanField(
        required=False,
        default=False,
        help_text='Set to true to remove existing password protection'
    )


# ============== Export Serializers ==============

class ExportFavoritesSerializer(serializers.Serializer):
    """Serializer for export options."""
    format = serializers.ChoiceField(choices=['json', 'csv'], default='json')
    collection_id = serializers.UUIDField(allow_null=True, required=False)
    include_folders = serializers.BooleanField(default=True)
    include_documents = serializers.BooleanField(default=True)
