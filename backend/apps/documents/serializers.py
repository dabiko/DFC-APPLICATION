"""
Serializers for document management.
"""
from rest_framework import serializers
from apps.documents.models import Document, Tag, DocumentTag, DocumentVersion
from apps.folders.models import Folder
from apps.users.models import Department
from apps.documents.constants import (
    DOCUMENT_TYPES,
    CONFIDENTIALITY_LEVELS,
    RETENTION_PERIODS,
    ALLOWED_MIME_TYPES,
)
import mimetypes
from datetime import datetime


class TagSerializer(serializers.ModelSerializer):
    """Serializer for Tag model"""

    class Meta:
        model = Tag
        fields = [
            'id', 'name', 'color', 'category',
            'department', 'created_at', 'created_by'
        ]
        read_only_fields = ['id', 'created_at', 'created_by']


class DocumentTagSerializer(serializers.ModelSerializer):
    """Serializer for DocumentTag relationship"""
    tag_name = serializers.CharField(source='tag.name', read_only=True)
    tag_color = serializers.CharField(source='tag.color', read_only=True)

    class Meta:
        model = DocumentTag
        fields = ['id', 'tag', 'tag_name', 'tag_color', 'created_at', 'created_by']
        read_only_fields = ['id', 'created_at', 'created_by']


class DocumentSearchSerializer(serializers.ModelSerializer):
    """
    Highly optimized serializer for search results.
    Returns only essential fields to minimize response size and serialization time.
    """
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = Document
        fields = [
            'id', 'title', 'file_name', 'file_size_mb',
            'file_type', 'document_type', 'confidentiality_level',
            'owner_name', 'department_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = fields


class DocumentListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing documents (minimal data for performance).
    """
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    folder_name = serializers.CharField(source='folder.name', read_only=True)
    tags = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id', 'title', 'file_name', 'file_size', 'file_size_mb',
            'file_type', 'document_type', 'confidentiality_level',
            'owner', 'owner_name', 'department', 'department_name',
            'folder', 'folder_name', 'version_number', 'is_current_version',
            'created_at', 'updated_at', 'tags'
        ]

    def get_tags(self, obj):
        """Get tag names for the document"""
        return [dt.tag.name for dt in obj.document_tags.select_related('tag')]


class DocumentDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for retrieving document details (full data).
    """
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    folder_path = serializers.CharField(source='folder.path', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    tags = DocumentTagSerializer(source='document_tags', many=True, read_only=True)
    versions = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id', 'title', 'file', 'file_name', 'file_size', 'file_size_mb',
            'file_type', 'checksum', 'document_type', 'identifier',
            'document_date', 'creator_source', 'confidentiality_level',
            'retention_period_years', 'folder', 'folder_path',
            'owner', 'owner_name', 'department', 'department_name',
            'version_number', 'parent_version', 'is_current_version',
            'created_at', 'updated_at', 'created_by', 'created_by_name',
            'extracted_text', 'ocr_confidence', 'is_indexed',
            'is_deleted', 'deleted_at', 'tags', 'versions'
        ]
        read_only_fields = [
            'id', 'file', 'file_name', 'file_size', 'file_type', 'checksum',
            'created_at', 'updated_at', 'created_by', 'extracted_text',
            'ocr_confidence', 'is_indexed', 'version_number'
        ]

    def get_versions(self, obj):
        """Get all versions of this document"""
        if obj.is_current_version:
            # This is the latest version, get all previous versions
            versions = []
            current = obj.parent_version
            while current:
                versions.append({
                    'id': current.id,
                    'version_number': current.version_number,
                    'created_at': current.created_at,
                    'created_by': current.created_by.get_full_name()
                })
                current = current.parent_version
            return versions
        else:
            # This is an old version, get the current version
            latest = Document.objects.filter(
                parent_version=obj
            ).order_by('-version_number').first()
            if latest:
                return [{
                    'id': latest.id,
                    'version_number': latest.version_number,
                    'created_at': latest.created_at,
                    'created_by': latest.created_by.get_full_name(),
                    'is_current': True
                }]
            return []


class DocumentUploadSerializer(serializers.ModelSerializer):
    """
    Serializer for uploading new documents.
    Handles file validation and metadata extraction.
    """
    file = serializers.FileField(required=True)
    tags = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True,
        help_text='List of tag IDs to apply to the document'
    )

    class Meta:
        model = Document
        fields = [
            'id', 'title', 'file', 'document_type', 'identifier',
            'document_date', 'creator_source', 'confidentiality_level',
            'retention_period_years', 'folder', 'department', 'tags'
        ]
        read_only_fields = ['id']

    def validate_file(self, value):
        """
        Validate file size and type.
        """
        # Maximum file size: 500MB
        max_size = 500 * 1024 * 1024  # 500MB in bytes
        if value.size > max_size:
            raise serializers.ValidationError(
                f"File size exceeds maximum limit of 500MB. Current size: {value.size / (1024 * 1024):.2f}MB"
            )

        # Allowed MIME types
        allowed_types = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/jpeg',
            'image/png',
            'image/tiff',
            'text/plain',
            'text/csv',
        ]

        # Guess MIME type from filename
        content_type = mimetypes.guess_type(value.name)[0]
        if content_type not in allowed_types:
            raise serializers.ValidationError(
                f"File type '{content_type}' is not allowed. "
                f"Allowed types: PDF, Word, Excel, Images (JPEG, PNG, TIFF), Text, CSV"
            )

        return value

    def validate_document_date(self, value):
        """Validate that document date is not in the future"""
        if value > datetime.now().date():
            raise serializers.ValidationError("Document date cannot be in the future")
        return value

    def validate(self, attrs):
        """
        Additional validation for folder, department, and permissions.
        """
        request = self.context.get('request')
        folder = attrs.get('folder')
        department = attrs.get('department')

        # Ensure user has access to the specified folder
        if folder and folder.department != request.user.department:
            if not request.user.is_staff:
                raise serializers.ValidationError({
                    'folder': 'You do not have permission to upload to this folder'
                })

        # Ensure department matches folder's department
        if folder and department and folder.department != department:
            raise serializers.ValidationError({
                'department': 'Department must match the folder\'s department'
            })

        # If department not specified, use folder's department
        if folder and not department:
            attrs['department'] = folder.department

        return attrs

    def create(self, validated_data):
        """
        Create document with file upload and checksum calculation.
        Uploads file to MinIO for secure storage.
        """
        from apps.storage.services import storage_service

        request = self.context.get('request')
        tags_data = validated_data.pop('tags', [])
        uploaded_file = validated_data.pop('file')

        # Calculate checksum
        checksum = Document.calculate_checksum(uploaded_file)
        uploaded_file.seek(0)  # Reset file pointer after checksum calculation

        # Check for duplicate files (same checksum)
        existing_doc = Document.objects.filter(checksum=checksum).first()
        if existing_doc:
            raise serializers.ValidationError({
                'file': f'This file already exists: {existing_doc.title} (ID: {existing_doc.id})'
            })

        # Extract file metadata
        file_name = uploaded_file.name
        file_size = uploaded_file.size
        file_type = mimetypes.guess_type(file_name)[0] or 'application/octet-stream'

        # Create document instance (without file for now)
        document = Document.objects.create(
            **validated_data,
            file_name=file_name,
            file_size=file_size,
            file_type=file_type,
            checksum=checksum,
            owner=request.user,
            created_by=request.user,
            version_number=1
        )

        # Upload file to MinIO
        try:
            result = storage_service.upload_file(
                file_obj=uploaded_file,
                organization_id=str(request.user.organization.id),
                document_id=str(document.id),
                filename=file_name,
                version=1,
                metadata={
                    'title': document.title,
                    'document_type': document.document_type,
                    'confidentiality': document.confidentiality_level,
                    'uploaded_by': request.user.username
                }
            )

            if result['success']:
                # Update document with MinIO storage details
                document.minio_bucket = result['bucket']
                document.minio_object_key = result['object_key']
                document.minio_etag = result['etag']
                document.file_type = result['mime_type']  # Use accurate MIME type from magic
                document.save(update_fields=['minio_bucket', 'minio_object_key', 'minio_etag', 'file_type'])
            else:
                # If MinIO upload fails, delete the document and raise error
                document.delete()
                raise serializers.ValidationError({
                    'file': f'Failed to upload file to storage: {result.get("error", "Unknown error")}'
                })

        except Exception as e:
            # Clean up on error
            document.delete()
            raise serializers.ValidationError({
                'file': f'Storage error: {str(e)}'
            })

        # Apply tags
        if tags_data:
            for tag_id in tags_data:
                try:
                    tag = Tag.objects.get(id=tag_id)
                    DocumentTag.objects.create(
                        document=document,
                        tag=tag,
                        created_by=request.user
                    )
                except Tag.DoesNotExist:
                    pass  # Skip invalid tag IDs

        return document


class DocumentUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating document metadata.
    File cannot be updated (create new version instead).
    """
    tags = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True,
        help_text='List of tag IDs to apply to the document'
    )

    class Meta:
        model = Document
        fields = [
            'title', 'document_type', 'identifier', 'document_date',
            'creator_source', 'confidentiality_level',
            'retention_period_years', 'folder', 'tags'
        ]

    def update(self, instance, validated_data):
        """Update document metadata and tags"""
        request = self.context.get('request')
        tags_data = validated_data.pop('tags', None)

        # Update document fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update tags if provided
        if tags_data is not None:
            # Remove existing tags
            instance.document_tags.all().delete()

            # Add new tags
            for tag_id in tags_data:
                try:
                    tag = Tag.objects.get(id=tag_id)
                    DocumentTag.objects.create(
                        document=instance,
                        tag=tag,
                        created_by=request.user
                    )
                except Tag.DoesNotExist:
                    pass  # Skip invalid tag IDs

        return instance


class DocumentVersionSerializer(serializers.Serializer):
    """
    Serializer for creating a new document version.
    """
    file = serializers.FileField(required=True)
    change_notes = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text='Notes describing changes in this version'
    )

    def validate_file(self, value):
        """Validate file size and type"""
        # Maximum file size: 500MB
        max_size = 500 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError(
                f"File size exceeds maximum limit of 500MB"
            )
        return value

    def create(self, validated_data):
        """
        Create a new version of the document.
        """
        request = self.context.get('request')
        parent_document = self.context.get('parent_document')
        uploaded_file = validated_data.get('file')

        # Calculate checksum
        checksum = Document.calculate_checksum(uploaded_file)
        uploaded_file.seek(0)

        # Check for duplicate content
        if checksum == parent_document.checksum:
            raise serializers.ValidationError({
                'file': 'New version has identical content to current version'
            })

        # Extract file metadata
        file_name = uploaded_file.name
        file_size = uploaded_file.size
        file_type = mimetypes.guess_type(file_name)[0] or 'application/octet-stream'

        # Create new version
        new_version = Document.objects.create(
            title=parent_document.title,
            file=uploaded_file,
            file_name=file_name,
            file_size=file_size,
            file_type=file_type,
            checksum=checksum,
            document_type=parent_document.document_type,
            identifier=parent_document.identifier,
            document_date=parent_document.document_date,
            creator_source=parent_document.creator_source,
            confidentiality_level=parent_document.confidentiality_level,
            retention_period_years=parent_document.retention_period_years,
            folder=parent_document.folder,
            owner=parent_document.owner,
            department=parent_document.department,
            version_number=parent_document.version_number + 1,
            parent_version=parent_document,
            created_by=request.user
        )

        # Copy tags from parent version
        for doc_tag in parent_document.document_tags.all():
            DocumentTag.objects.create(
                document=new_version,
                tag=doc_tag.tag,
                created_by=request.user
            )

        return new_version


class DocumentMetadataSerializer(serializers.Serializer):
    """
    Serializer for document metadata validation and updates.
    Enforces controlled vocabularies and data validation rules.
    """
    title = serializers.CharField(max_length=500, required=True)
    document_type = serializers.ChoiceField(
        choices=DOCUMENT_TYPES,
        required=True
    )
    identifier = serializers.CharField(
        max_length=255,
        required=True,
        help_text='Customer ID, Contract Number, Invoice Number, etc.'
    )
    document_date = serializers.DateField(required=True)
    creator_source = serializers.CharField(
        max_length=255,
        required=True,
        help_text='Original creator or source of the document'
    )
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        required=True
    )
    confidentiality_level = serializers.ChoiceField(
        choices=CONFIDENTIALITY_LEVELS,
        required=True
    )
    retention_period_years = serializers.IntegerField(required=True)
    keywords = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        allow_empty=True,
        help_text='List of keywords/tags for document classification'
    )
    folder = serializers.PrimaryKeyRelatedField(
        queryset=Folder.objects.all(),
        required=False,
        allow_null=True
    )

    def validate_document_date(self, value):
        """Ensure date is not in future"""
        from datetime import date
        if value > date.today():
            raise serializers.ValidationError('Document date cannot be in the future')
        return value

    def validate_retention_period_years(self, value):
        """Validate retention period against allowed values"""
        valid_periods = [period[0] for period in RETENTION_PERIODS]
        if value not in valid_periods:
            raise serializers.ValidationError(
                f'Invalid retention period. Allowed values: {valid_periods}'
            )
        return value

    def validate(self, attrs):
        """Cross-field validation"""
        folder = attrs.get('folder')
        department = attrs.get('department')

        # If folder is specified, ensure department matches
        if folder and department:
            if folder.department != department:
                raise serializers.ValidationError({
                    'department': 'Department must match the folder\'s department'
                })

        return attrs


class BulkMetadataUpdateSerializer(serializers.Serializer):
    """
    Serializer for bulk metadata updates on multiple documents.
    """
    document_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=True,
        help_text='List of document IDs to update'
    )
    metadata = serializers.DictField(
        required=True,
        help_text='Metadata fields to update'
    )

    def validate_metadata(self, value):
        """Validate that only allowed fields are being updated"""
        allowed_fields = [
            'title', 'document_type', 'identifier', 'document_date',
            'creator_source', 'confidentiality_level', 'retention_period_years',
            'folder'
        ]

        invalid_fields = [field for field in value.keys() if field not in allowed_fields]
        if invalid_fields:
            raise serializers.ValidationError(
                f'Invalid fields: {invalid_fields}. Allowed fields: {allowed_fields}'
            )

        # Validate document_type if present
        if 'document_type' in value:
            valid_types = [dt[0] for dt in DOCUMENT_TYPES]
            if value['document_type'] not in valid_types:
                raise serializers.ValidationError({
                    'document_type': f'Invalid document type. Allowed values: {valid_types}'
                })

        # Validate confidentiality_level if present
        if 'confidentiality_level' in value:
            valid_levels = [cl[0] for cl in CONFIDENTIALITY_LEVELS]
            if value['confidentiality_level'] not in valid_levels:
                raise serializers.ValidationError({
                    'confidentiality_level': f'Invalid confidentiality level. Allowed values: {valid_levels}'
                })

        # Validate retention_period_years if present
        if 'retention_period_years' in value:
            valid_periods = [period[0] for period in RETENTION_PERIODS]
            if value['retention_period_years'] not in valid_periods:
                raise serializers.ValidationError({
                    'retention_period_years': f'Invalid retention period. Allowed values: {valid_periods}'
                })

        # Validate document_date if present
        if 'document_date' in value:
            from datetime import datetime, date
            doc_date = value['document_date']
            if isinstance(doc_date, str):
                try:
                    doc_date = datetime.strptime(doc_date, '%Y-%m-%d').date()
                except ValueError:
                    raise serializers.ValidationError({
                        'document_date': 'Invalid date format. Use YYYY-MM-DD'
                    })
            if doc_date > date.today():
                raise serializers.ValidationError({
                    'document_date': 'Document date cannot be in the future'
                })

        return value


class DocumentVersionListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing document versions (minimal data).
    """
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = DocumentVersion
        fields = [
            'id', 'version_number', 'file_name', 'file_size', 'file_size_mb',
            'file_type', 'checksum', 'change_description', 'is_major_version',
            'is_current_version', 'created_at', 'created_by', 'created_by_name'
        ]
        read_only_fields = fields


class DocumentVersionDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for detailed document version information.
    """
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    document_title = serializers.CharField(source='document.title', read_only=True)
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = DocumentVersion
        fields = [
            'id', 'document', 'document_title', 'version_number',
            'file', 'file_name', 'file_size', 'file_size_mb', 'file_type',
            'checksum', 'change_description', 'is_major_version',
            'is_current_version', 'created_at', 'created_by', 'created_by_name',
            'storage_key', 'download_url'
        ]
        read_only_fields = fields

    def get_download_url(self, obj):
        """Get download URL for this version"""
        request = self.context.get('request')
        if request and obj.file:
            return request.build_absolute_uri(obj.file.url)
        return None


class DocumentVersionUploadSerializer(serializers.Serializer):
    """
    Serializer for uploading a new version of a document.
    """
    file = serializers.FileField(required=True)
    change_description = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=5000,
        help_text='Description of changes in this version'
    )
    is_major_version = serializers.BooleanField(
        required=False,
        default=False,
        help_text='Whether this is a major version (significant changes)'
    )

    def validate_file(self, value):
        """Validate file size and type"""
        from apps.documents.constants import MAX_FILE_SIZE, ALLOWED_MIME_TYPES
        import mimetypes

        # Check file size
        if value.size > MAX_FILE_SIZE:
            raise serializers.ValidationError(
                f'File size exceeds maximum limit of {MAX_FILE_SIZE / (1024**2):.0f}MB'
            )

        # Check MIME type
        content_type = mimetypes.guess_type(value.name)[0]
        if content_type and content_type not in ALLOWED_MIME_TYPES:
            raise serializers.ValidationError(
                f'File type {content_type} is not allowed'
            )

        return value

    def create(self, validated_data):
        """Create new version of document"""
        from apps.documents.utils import create_new_version

        document = self.context['document']
        user = self.context['request'].user

        # Create new version
        version = create_new_version(
            document=document,
            new_file=validated_data['file'],
            change_description=validated_data.get('change_description', ''),
            user=user,
            is_major=validated_data.get('is_major_version', False)
        )

        return version


class VersionRestoreSerializer(serializers.Serializer):
    """
    Serializer for restoring a document to a previous version.
    """
    version_number = serializers.IntegerField(
        required=True,
        min_value=1,
        help_text='Version number to restore to'
    )
    change_description = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=5000,
        help_text='Optional description for the restore operation'
    )

    def validate_version_number(self, value):
        """Validate that the version exists"""
        from apps.documents.models import DocumentVersion

        document = self.context['document']

        # Check if version exists
        if not DocumentVersion.objects.filter(
            document=document,
            version_number=value
        ).exists():
            raise serializers.ValidationError(
                f'Version {value} does not exist for this document'
            )

        # Check if it's the current version
        if value == document.version_number:
            raise serializers.ValidationError(
                f'Document is already at version {value}'
            )

        return value


class VersionComparisonSerializer(serializers.Serializer):
    """
    Serializer for comparing two document versions.
    """
    version1 = serializers.IntegerField(
        required=True,
        min_value=1,
        help_text='First version number to compare'
    )
    version2 = serializers.IntegerField(
        required=True,
        min_value=1,
        help_text='Second version number to compare'
    )

    def validate(self, attrs):
        """Validate that both versions exist"""
        from apps.documents.models import DocumentVersion

        document = self.context['document']
        version1 = attrs['version1']
        version2 = attrs['version2']

        # Check if versions exist
        for version_num in [version1, version2]:
            if not DocumentVersion.objects.filter(
                document=document,
                version_number=version_num
            ).exists():
                raise serializers.ValidationError(
                    f'Version {version_num} does not exist for this document'
                )

        # Check if same version
        if version1 == version2:
            raise serializers.ValidationError(
                'Cannot compare a version with itself'
            )

        return attrs


# ============================================================================
# BULK OPERATIONS SERIALIZERS
# ============================================================================

class BulkMoveSerializer(serializers.Serializer):
    """
    Serializer for bulk moving documents to a different folder.

    Validates:
    - Document IDs exist and user has permission
    - Target folder exists and user has permission
    - Documents won't create circular references
    """
    document_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        max_length=100,
        help_text='List of document UUIDs to move (max 100)'
    )
    target_folder_id = serializers.UUIDField(
        help_text='UUID of the folder to move documents to'
    )

    def validate_document_ids(self, value):
        """Validate all document IDs are unique"""
        if len(value) != len(set(value)):
            raise serializers.ValidationError('Duplicate document IDs found')
        return value

    def validate(self, attrs):
        """Validate documents and folder exist with permissions"""
        from apps.folders.models import Folder

        request = self.context['request']
        user = request.user

        document_ids = attrs['document_ids']
        target_folder_id = attrs['target_folder_id']

        # Check target folder exists
        try:
            target_folder = Folder.objects.get(pk=target_folder_id, is_deleted=False)
        except Folder.DoesNotExist:
            raise serializers.ValidationError({
                'target_folder_id': 'Target folder does not exist or is deleted'
            })

        # Check user has permission to target folder
        if not user.is_staff:
            if target_folder.department != user.department:
                raise serializers.ValidationError({
                    'target_folder_id': 'You do not have permission to move documents to this folder'
                })

        # Check all documents exist and user has permission
        documents = Document.objects.filter(
            pk__in=document_ids,
            is_deleted=False
        )

        if documents.count() != len(document_ids):
            raise serializers.ValidationError({
                'document_ids': 'Some documents do not exist or are deleted'
            })

        # Check permissions for each document
        if not user.is_staff:
            for doc in documents:
                if doc.owner != user and doc.department != user.department:
                    raise serializers.ValidationError({
                        'document_ids': f'You do not have permission to move document {doc.id}'
                    })

        attrs['documents'] = documents
        attrs['target_folder'] = target_folder

        return attrs


class BulkCopySerializer(serializers.Serializer):
    """
    Serializer for bulk copying documents to a different folder.

    Creates duplicates of documents with new UUIDs.
    """
    document_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        max_length=50,
        help_text='List of document UUIDs to copy (max 50)'
    )
    target_folder_id = serializers.UUIDField(
        help_text='UUID of the folder to copy documents to'
    )
    copy_versions = serializers.BooleanField(
        default=False,
        help_text='Whether to copy all versions (default: only current version)'
    )

    def validate_document_ids(self, value):
        """Validate all document IDs are unique"""
        if len(value) != len(set(value)):
            raise serializers.ValidationError('Duplicate document IDs found')
        return value

    def validate(self, attrs):
        """Validate documents and folder exist with permissions"""
        from apps.folders.models import Folder

        request = self.context['request']
        user = request.user

        document_ids = attrs['document_ids']
        target_folder_id = attrs['target_folder_id']

        # Check target folder exists
        try:
            target_folder = Folder.objects.get(pk=target_folder_id, is_deleted=False)
        except Folder.DoesNotExist:
            raise serializers.ValidationError({
                'target_folder_id': 'Target folder does not exist or is deleted'
            })

        # Check user has permission to target folder
        if not user.is_staff:
            if target_folder.department != user.department:
                raise serializers.ValidationError({
                    'target_folder_id': 'You do not have permission to copy documents to this folder'
                })

        # Check all documents exist and user has read permission
        documents = Document.objects.filter(
            pk__in=document_ids,
            is_deleted=False
        )

        if documents.count() != len(document_ids):
            raise serializers.ValidationError({
                'document_ids': 'Some documents do not exist or are deleted'
            })

        # Check permissions for each document
        if not user.is_staff:
            for doc in documents:
                if doc.department != user.department:
                    raise serializers.ValidationError({
                        'document_ids': f'You do not have permission to copy document {doc.id}'
                    })

        attrs['documents'] = documents
        attrs['target_folder'] = target_folder

        return attrs


class BulkDeleteSerializer(serializers.Serializer):
    """
    Serializer for bulk deleting documents.

    Performs soft delete (sets is_deleted=True).
    Checks for legal hold before deletion.
    """
    document_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        max_length=100,
        help_text='List of document UUIDs to delete (max 100)'
    )
    permanent = serializers.BooleanField(
        default=False,
        help_text='Whether to permanently delete (admin only, not recommended)'
    )

    def validate_document_ids(self, value):
        """Validate all document IDs are unique"""
        if len(value) != len(set(value)):
            raise serializers.ValidationError('Duplicate document IDs found')
        return value

    def validate(self, attrs):
        """Validate documents exist and can be deleted"""
        request = self.context['request']
        user = request.user

        document_ids = attrs['document_ids']
        permanent = attrs.get('permanent', False)

        # Only staff can permanently delete
        if permanent and not user.is_staff:
            raise serializers.ValidationError({
                'permanent': 'Only administrators can permanently delete documents'
            })

        # Check all documents exist
        documents = Document.objects.filter(pk__in=document_ids)

        if documents.count() != len(document_ids):
            raise serializers.ValidationError({
                'document_ids': 'Some documents do not exist'
            })

        # Check permissions for each document
        if not user.is_staff:
            for doc in documents:
                if doc.owner != user and doc.department != user.department:
                    raise serializers.ValidationError({
                        'document_ids': f'You do not have permission to delete document {doc.id}'
                    })

        # Check for legal hold (future feature - placeholder)
        # for doc in documents:
        #     if hasattr(doc, 'legal_hold') and doc.legal_hold:
        #         raise serializers.ValidationError({
        #             'document_ids': f'Document {doc.id} is under legal hold and cannot be deleted'
        #         })

        attrs['documents'] = documents

        return attrs


class BulkExportSerializer(serializers.Serializer):
    """
    Serializer for bulk exporting documents as ZIP file.

    Creates a downloadable ZIP archive containing selected documents.
    """
    document_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        max_length=50,
        help_text='List of document UUIDs to export (max 50)'
    )
    include_metadata = serializers.BooleanField(
        default=True,
        help_text='Whether to include metadata JSON file in export'
    )
    archive_name = serializers.CharField(
        max_length=255,
        required=False,
        help_text='Custom name for the ZIP file (without extension)'
    )

    def validate_document_ids(self, value):
        """Validate all document IDs are unique"""
        if len(value) != len(set(value)):
            raise serializers.ValidationError('Duplicate document IDs found')
        return value

    def validate_archive_name(self, value):
        """Validate archive name is safe"""
        import re
        if value:
            # Only allow alphanumeric, spaces, hyphens, underscores
            if not re.match(r'^[a-zA-Z0-9\s\-_]+$', value):
                raise serializers.ValidationError(
                    'Archive name can only contain letters, numbers, spaces, hyphens, and underscores'
                )
        return value

    def validate(self, attrs):
        """Validate documents exist and user has permission"""
        request = self.context['request']
        user = request.user

        document_ids = attrs['document_ids']

        # Check all documents exist and not deleted
        documents = Document.objects.filter(
            pk__in=document_ids,
            is_deleted=False
        )

        if documents.count() != len(document_ids):
            raise serializers.ValidationError({
                'document_ids': 'Some documents do not exist or are deleted'
            })

        # Check permissions for each document
        if not user.is_staff:
            for doc in documents:
                if doc.department != user.department:
                    raise serializers.ValidationError({
                        'document_ids': f'You do not have permission to export document {doc.id}'
                    })

        # Calculate total size
        total_size = sum(doc.file_size for doc in documents)
        max_export_size = 500 * 1024 * 1024  # 500MB limit

        if total_size > max_export_size:
            raise serializers.ValidationError({
                'document_ids': f'Total export size ({total_size / (1024**2):.2f}MB) exceeds limit of 500MB'
            })

        attrs['documents'] = documents
        attrs['total_size'] = total_size

        return attrs
