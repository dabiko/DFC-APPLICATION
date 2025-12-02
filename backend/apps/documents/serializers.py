"""
Serializers for document management.
"""
from rest_framework import serializers
from apps.documents.models import Document, Tag, DocumentTag, DocumentVersion, DocumentShortcut, RecentActivity
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
            'file_type', 'document_type', 'confidentiality_level', 'state',
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
    # Override file field to return URL string or null (not FieldFile object)
    file = serializers.SerializerMethodField()

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

    def get_file(self, obj):
        """Return file URL or None - files are stored in MinIO, not Django FileField"""
        # If file is stored in MinIO, return None here
        # The actual download URL should be fetched via the download endpoint
        if obj.minio_object_key:
            return None  # File is in MinIO, use download endpoint
        # Fallback for legacy Django FileField storage
        if obj.file and hasattr(obj.file, 'url'):
            try:
                return obj.file.url
            except ValueError:
                return None
        return None

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
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        required=False,
        allow_null=True,
        help_text='Department ID (UUID). If not provided, uses the uploading user\'s department.'
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

        # If department not specified, default to user's department
        if not department:
            if folder and folder.department:
                # Use folder's department
                attrs['department'] = folder.department
            elif request.user.department:
                # Use user's department
                attrs['department'] = request.user.department
            else:
                raise serializers.ValidationError({
                    'department': 'Department is required. User has no assigned department.'
                })

        # Ensure user has access to the specified folder
        if folder and folder.department != request.user.department:
            if not request.user.is_staff:
                raise serializers.ValidationError({
                    'folder': 'You do not have permission to upload to this folder'
                })

        # Ensure department matches folder's department
        if folder and attrs.get('department') and folder.department != attrs.get('department'):
            raise serializers.ValidationError({
                'department': 'Department must match the folder\'s department'
            })

        return attrs

    def create(self, validated_data):
        """
        Create document with file upload and checksum calculation.
        Uploads file to MinIO for secure storage.
        """
        from apps.storage.services import storage_service
        import logging
        logger = logging.getLogger(__name__)

        request = self.context.get('request')

        # Debug: Print what's in validated_data BEFORE popping
        print(f"DEBUG - validated_data keys BEFORE pop: {list(validated_data.keys())}")
        for key, value in validated_data.items():
            print(f"DEBUG - {key}: {type(value).__name__}")

        tags_data = validated_data.pop('tags', [])
        uploaded_file = validated_data.pop('file', None)

        if uploaded_file is None:
            raise serializers.ValidationError({'file': 'No file provided'})

        # Debug: Print what's in validated_data AFTER popping
        print(f"DEBUG - validated_data keys AFTER pop: {list(validated_data.keys())}")

        # Calculate checksum
        checksum = Document.calculate_checksum(uploaded_file)
        uploaded_file.seek(0)  # Reset file pointer after checksum calculation

        # Check for duplicate files (same checksum)
        existing_doc = Document.objects.select_related('folder', 'department').filter(
            checksum=checksum, is_deleted=False
        ).first()
        if existing_doc:
            # Provide detailed information about the existing document
            # so frontend can offer to create a shortcut
            error_data = {
                'code': 'DUPLICATE_FILE',
                'message': f'This file already exists: {existing_doc.title}',
                'existing_document': {
                    'id': str(existing_doc.id),
                    'title': existing_doc.title,
                    'file_name': existing_doc.file_name,
                    'folder_id': str(existing_doc.folder_id) if existing_doc.folder_id else None,
                    'folder_name': existing_doc.folder.name if existing_doc.folder else None,
                    'folder_path': existing_doc.folder.path if existing_doc.folder else None,
                    'confidentiality_level': existing_doc.confidentiality_level,
                    'document_type': existing_doc.document_type,
                },
                'suggestion': 'You can create a shortcut to reference this document in the target folder instead of uploading a duplicate.',
                'can_create_shortcut': True,
            }
            raise serializers.ValidationError({
                'file': error_data
            })

        # Extract file metadata
        file_name = uploaded_file.name
        file_size = uploaded_file.size
        file_type = mimetypes.guess_type(file_name)[0] or 'application/octet-stream'

        # Debug: Print validated_data right before create
        print(f"DEBUG - About to create Document with keys: {list(validated_data.keys())}")
        for k, v in validated_data.items():
            print(f"DEBUG - Field '{k}': type={type(v).__name__}, value={repr(v)[:50]}")

        document = None
        try:
            # Temporarily disconnect signals to avoid serialization issues during initial create
            from django.db.models.signals import post_save
            from apps.documents.signals import update_document_index, log_document_save

            post_save.disconnect(update_document_index, sender=Document)
            post_save.disconnect(log_document_save, sender=Document)

            try:
                # Create document instance (without file - file goes to MinIO)
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
                print(f"DEBUG - Document created with id: {document.id}")
            finally:
                # Reconnect signals
                post_save.connect(update_document_index, sender=Document)
                post_save.connect(log_document_save, sender=Document)
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
                if document.id:
                    document.delete()
                raise serializers.ValidationError({
                    'file': f'Failed to upload file to storage: {result.get("error", "Unknown error")}'
                })

        except serializers.ValidationError as ve:
            # Re-raise validation errors - extract message to avoid serialization issues
            if document and document.id:
                document.delete()
            # Extract the actual error message from ValidationError
            if hasattr(ve, 'detail'):
                error_detail = ve.detail
                if isinstance(error_detail, dict):
                    # Flatten nested error messages
                    messages = []
                    for key, value in error_detail.items():
                        if isinstance(value, list):
                            messages.extend([str(v) for v in value])
                        else:
                            messages.append(str(value))
                    error_message = '; '.join(messages)
                else:
                    error_message = str(error_detail)
            else:
                error_message = str(ve)
            raise serializers.ValidationError({
                'file': error_message
            })
        except TypeError as te:
            # Handle serialization errors (like FieldFile not JSON serializable)
            import traceback
            print(f"TypeError during upload: {te}")
            print(f"Full traceback:\n{traceback.format_exc()}")
            if document and document.id:
                document.delete()
            raise serializers.ValidationError({
                'file': f'Upload error: {te.__class__.__name__} - {str(te)}'
            })
        except Exception as e:
            # Clean up on error - only delete if document was saved
            import traceback
            print(f"Exception during upload: {e}")
            print(f"Full traceback:\n{traceback.format_exc()}")
            if document and document.id:
                document.delete()
            # Extract error message safely - avoid serialization issues
            try:
                error_message = str(e)
            except Exception:
                error_message = e.__class__.__name__
            raise serializers.ValidationError({
                'file': f'Storage error: {error_message}'
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
            target_folder = Folder.objects.get(pk=target_folder_id)
        except Folder.DoesNotExist:
            raise serializers.ValidationError({
                'target_folder_id': 'Target folder does not exist'
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
            target_folder = Folder.objects.get(pk=target_folder_id)
        except Folder.DoesNotExist:
            raise serializers.ValidationError({
                'target_folder_id': 'Target folder does not exist'
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

        # Check permissions for each document using RBAC
        from apps.permissions.utils import PermissionChecker
        checker = PermissionChecker(user)

        for doc in documents:
            # Allow if: superuser, owner, or has can_delete permission via RBAC
            has_permission = (
                user.is_superuser or
                doc.owner == user or
                checker.has_global_permission('can_delete')
            )

            # Check folder-level permission if document is in a folder
            if not has_permission and doc.folder:
                has_permission = checker.has_folder_permission(doc.folder, 'can_delete')

            # Check department permission if document has a department
            if not has_permission and doc.department:
                has_permission = checker.has_department_permission(doc.department, 'can_delete')

            if not has_permission:
                raise serializers.ValidationError({
                    'document_ids': f'You do not have permission to delete document "{doc.title}"'
                })

        # Check for legal holds
        for doc in documents:
            if hasattr(doc, 'legal_holds'):
                active_holds = doc.legal_holds.filter(is_active=True)
                if active_holds.exists():
                    hold_cases = ', '.join([h.case_number for h in active_holds])
                    raise serializers.ValidationError({
                        'document_ids': f'Document "{doc.title}" is under legal hold (cases: {hold_cases}) and cannot be deleted'
                    })

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


# ============================================================================
# DOCUMENT SHORTCUT SERIALIZERS
# ============================================================================

class DocumentShortcutSerializer(serializers.ModelSerializer):
    """
    Serializer for DocumentShortcut model.

    Provides read-only access to original document's metadata through proxy fields.
    Includes is_shortcut flag for frontend identification.
    """
    # Original document metadata (read-only proxied fields)
    title = serializers.CharField(source='original_document.title', read_only=True)
    file_name = serializers.CharField(source='original_document.file_name', read_only=True)
    file_size = serializers.IntegerField(source='original_document.file_size', read_only=True)
    file_type = serializers.CharField(source='original_document.file_type', read_only=True)
    document_type = serializers.CharField(source='original_document.document_type', read_only=True)
    confidentiality_level = serializers.CharField(source='original_document.confidentiality_level', read_only=True)
    version_number = serializers.IntegerField(source='original_document.version_number', read_only=True)
    document_date = serializers.DateField(source='original_document.document_date', read_only=True)
    checksum = serializers.CharField(source='original_document.checksum', read_only=True)

    # Owner and department info - use SerializerMethodField for null safety
    owner_id = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()
    department_id = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()

    # Original location info - use SerializerMethodField for null safety
    original_document_id = serializers.UUIDField(source='original_document.id', read_only=True)
    original_folder_id = serializers.SerializerMethodField()
    original_folder_name = serializers.SerializerMethodField()
    original_folder_path = serializers.SerializerMethodField()

    # Shortcut-specific fields
    created_by_name = serializers.SerializerMethodField()
    is_shortcut = serializers.SerializerMethodField()

    # Tags from original document
    tags = serializers.SerializerMethodField()

    class Meta:
        model = DocumentShortcut
        fields = [
            # Shortcut identifiers
            'id', 'folder', 'created_at', 'created_by', 'created_by_name',
            # Original document metadata
            'original_document_id', 'title', 'file_name', 'file_size', 'file_type',
            'document_type', 'confidentiality_level', 'version_number',
            'document_date', 'checksum',
            # Owner and department
            'owner_id', 'owner_name', 'department_id', 'department_name',
            # Original location
            'original_folder_id', 'original_folder_name', 'original_folder_path',
            # Shortcut flag and tags
            'is_shortcut', 'tags'
        ]
        read_only_fields = fields

    def get_is_shortcut(self, obj):
        """Always returns True - identifies this as a shortcut"""
        return True

    def get_tags(self, obj):
        """Get tag names from original document"""
        if obj.original_document:
            return [dt.tag.name for dt in obj.original_document.document_tags.select_related('tag')]
        return []

    def get_owner_id(self, obj):
        """Safely get owner ID"""
        if obj.original_document and obj.original_document.owner:
            return str(obj.original_document.owner.id)
        return None

    def get_owner_name(self, obj):
        """Safely get owner name"""
        if obj.original_document and obj.original_document.owner:
            return obj.original_document.owner.get_full_name()
        return None

    def get_department_id(self, obj):
        """Safely get department ID"""
        if obj.original_document and obj.original_document.department:
            return obj.original_document.department.id
        return None

    def get_department_name(self, obj):
        """Safely get department name"""
        if obj.original_document and obj.original_document.department:
            return obj.original_document.department.name
        return None

    def get_original_folder_id(self, obj):
        """Safely get original folder ID"""
        if obj.original_document and obj.original_document.folder:
            return str(obj.original_document.folder.id)
        return None

    def get_original_folder_name(self, obj):
        """Safely get original folder name"""
        if obj.original_document and obj.original_document.folder:
            return obj.original_document.folder.name
        return None

    def get_original_folder_path(self, obj):
        """Safely get original folder path"""
        if obj.original_document and obj.original_document.folder:
            return obj.original_document.folder.path
        return None

    def get_created_by_name(self, obj):
        """Safely get created by name"""
        if obj.created_by:
            return obj.created_by.get_full_name()
        return None


class DocumentShortcutListSerializer(serializers.ModelSerializer):
    """
    Minimal serializer for listing shortcuts (optimized for performance).
    """
    title = serializers.CharField(source='original_document.title', read_only=True)
    file_name = serializers.CharField(source='original_document.file_name', read_only=True)
    file_size = serializers.IntegerField(source='original_document.file_size', read_only=True)
    file_type = serializers.CharField(source='original_document.file_type', read_only=True)
    document_type = serializers.CharField(source='original_document.document_type', read_only=True)
    confidentiality_level = serializers.CharField(source='original_document.confidentiality_level', read_only=True)
    original_document_id = serializers.UUIDField(source='original_document.id', read_only=True)
    original_folder_id = serializers.SerializerMethodField()
    original_folder_name = serializers.SerializerMethodField()
    is_shortcut = serializers.SerializerMethodField()

    class Meta:
        model = DocumentShortcut
        fields = [
            'id', 'folder', 'original_document_id', 'title', 'file_name',
            'file_size', 'file_type', 'document_type', 'confidentiality_level',
            'original_folder_id', 'original_folder_name', 'created_at', 'is_shortcut'
        ]
        read_only_fields = fields

    def get_is_shortcut(self, obj):
        return True

    def get_original_folder_id(self, obj):
        """Safely get original folder ID"""
        if obj.original_document and obj.original_document.folder:
            return str(obj.original_document.folder_id)
        return None

    def get_original_folder_name(self, obj):
        """Safely get original folder name"""
        if obj.original_document and obj.original_document.folder:
            return obj.original_document.folder.name
        return None


class CreateShortcutSerializer(serializers.Serializer):
    """
    Serializer for creating a document shortcut.

    Validates:
    - Document exists and user has access
    - Target folder exists and user has access
    - Shortcut doesn't already exist in target folder
    - Cannot create shortcut in same folder as original
    """
    document_id = serializers.UUIDField(
        help_text='UUID of the document to create a shortcut for'
    )
    target_folder_id = serializers.UUIDField(
        help_text='UUID of the folder where the shortcut will be created'
    )

    def validate(self, attrs):
        """Validate document and folder access permissions"""
        request = self.context['request']
        user = request.user

        document_id = attrs['document_id']
        target_folder_id = attrs['target_folder_id']

        # Check document exists
        try:
            document = Document.objects.select_related(
                'folder', 'owner', 'department'
            ).get(pk=document_id, is_deleted=False)
        except Document.DoesNotExist:
            raise serializers.ValidationError({
                'document_id': 'Document does not exist or has been deleted'
            })

        # Check user has access to document
        if not user.is_staff:
            if document.department != user.department:
                raise serializers.ValidationError({
                    'document_id': 'You do not have permission to access this document'
                })

        # Check target folder exists
        try:
            target_folder = Folder.objects.get(pk=target_folder_id)
        except Folder.DoesNotExist:
            raise serializers.ValidationError({
                'target_folder_id': 'Target folder does not exist'
            })

        # Check user has access to target folder
        if not user.is_staff:
            if target_folder.department != user.department:
                raise serializers.ValidationError({
                    'target_folder_id': 'You do not have permission to create shortcuts in this folder'
                })

        # Cannot create shortcut in same folder as original
        if document.folder_id == target_folder_id:
            raise serializers.ValidationError({
                'target_folder_id': 'Cannot create a shortcut in the same folder as the original document'
            })

        # Check if shortcut already exists in target folder
        if DocumentShortcut.objects.filter(
            original_document=document,
            folder=target_folder
        ).exists():
            raise serializers.ValidationError({
                'target_folder_id': 'A shortcut to this document already exists in this folder'
            })

        attrs['document'] = document
        attrs['target_folder'] = target_folder

        return attrs

    def create(self, validated_data):
        """Create the document shortcut"""
        request = self.context['request']

        shortcut = DocumentShortcut.objects.create(
            original_document=validated_data['document'],
            folder=validated_data['target_folder'],
            created_by=request.user
        )

        return shortcut


class DocumentShortcutLocationSerializer(serializers.ModelSerializer):
    """
    Serializer for showing where shortcuts to a document exist.
    Used when displaying shortcut locations in the UI.
    """
    folder_name = serializers.CharField(source='folder.name', read_only=True)
    folder_path = serializers.CharField(source='folder.path', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = DocumentShortcut
        fields = ['id', 'folder', 'folder_name', 'folder_path', 'created_at', 'created_by_name']
        read_only_fields = fields


class BulkCreateShortcutSerializer(serializers.Serializer):
    """
    Serializer for creating shortcuts for multiple documents at once.
    """
    document_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        max_length=50,
        help_text='List of document UUIDs to create shortcuts for (max 50)'
    )
    target_folder_id = serializers.UUIDField(
        help_text='UUID of the folder where shortcuts will be created'
    )

    def validate_document_ids(self, value):
        """Validate all document IDs are unique"""
        if len(value) != len(set(value)):
            raise serializers.ValidationError('Duplicate document IDs found')
        return value

    def validate(self, attrs):
        """Validate documents and folder access"""
        request = self.context['request']
        user = request.user

        document_ids = attrs['document_ids']
        target_folder_id = attrs['target_folder_id']

        # Check target folder exists
        try:
            target_folder = Folder.objects.get(pk=target_folder_id)
        except Folder.DoesNotExist:
            raise serializers.ValidationError({
                'target_folder_id': 'Target folder does not exist'
            })

        # Check user has access to target folder
        if not user.is_staff:
            if target_folder.department != user.department:
                raise serializers.ValidationError({
                    'target_folder_id': 'You do not have permission to create shortcuts in this folder'
                })

        # Check all documents exist
        documents = Document.objects.filter(
            pk__in=document_ids,
            is_deleted=False
        ).select_related('folder', 'department')

        if documents.count() != len(document_ids):
            raise serializers.ValidationError({
                'document_ids': 'Some documents do not exist or have been deleted'
            })

        # Check permissions for each document
        if not user.is_staff:
            for doc in documents:
                if doc.department != user.department:
                    raise serializers.ValidationError({
                        'document_ids': f'You do not have permission to access document {doc.id}'
                    })

        # Filter out documents already in target folder or with existing shortcuts
        valid_documents = []
        skipped = {
            'same_folder': [],
            'already_exists': []
        }

        existing_shortcuts = set(
            DocumentShortcut.objects.filter(
                original_document__in=documents,
                folder=target_folder
            ).values_list('original_document_id', flat=True)
        )

        for doc in documents:
            if str(doc.folder_id) == str(target_folder_id):
                skipped['same_folder'].append(str(doc.id))
            elif doc.id in existing_shortcuts:
                skipped['already_exists'].append(str(doc.id))
            else:
                valid_documents.append(doc)

        attrs['documents'] = valid_documents
        attrs['target_folder'] = target_folder
        attrs['skipped'] = skipped

        return attrs

    def create(self, validated_data):
        """Create shortcuts for all valid documents"""
        request = self.context['request']
        shortcuts = []

        for document in validated_data['documents']:
            shortcut = DocumentShortcut.objects.create(
                original_document=document,
                folder=validated_data['target_folder'],
                created_by=request.user
            )
            shortcuts.append(shortcut)

        return {
            'created': shortcuts,
            'skipped': validated_data['skipped']
        }


# ============================================================================
# RECENT ACTIVITY SERIALIZERS
# ============================================================================

class RecentActivitySerializer(serializers.ModelSerializer):
    """
    Serializer for RecentActivity model.

    Provides full details of recent activities including:
    - Activity type (VIEWED, EDITED, UPLOADED, DOWNLOADED, SHARED)
    - Resource information (document or folder)
    - Time grouping helper fields
    - Pinning status
    """
    user_name = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()
    time_group = serializers.SerializerMethodField()
    relative_time = serializers.SerializerMethodField()
    can_pin = serializers.SerializerMethodField()

    class Meta:
        model = RecentActivity
        fields = [
            'id', 'user', 'user_name', 'user_email',
            'resource_type', 'resource_id', 'resource_name',
            'activity_type', 'timestamp',
            'file_type', 'file_size', 'folder_id', 'folder_name', 'folder_path',
            'confidentiality_level',
            'is_pinned', 'pinned_at',
            'time_group', 'relative_time', 'can_pin'
        ]
        read_only_fields = fields

    def get_user_name(self, obj):
        """Get full name of the user"""
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return None

    def get_user_email(self, obj):
        """Get email of the user"""
        if obj.user:
            return obj.user.email
        return None

    def get_time_group(self, obj):
        """
        Get time group for UI grouping.
        Returns: 'today', 'yesterday', 'this_week', 'last_week', 'this_month', 'older'
        """
        from django.utils import timezone
        from datetime import timedelta

        now = timezone.now()
        timestamp = obj.timestamp

        # Calculate date boundaries
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday_start = today_start - timedelta(days=1)
        week_start = today_start - timedelta(days=today_start.weekday())
        last_week_start = week_start - timedelta(days=7)
        month_start = today_start.replace(day=1)

        if timestamp >= today_start:
            return 'today'
        elif timestamp >= yesterday_start:
            return 'yesterday'
        elif timestamp >= week_start:
            return 'this_week'
        elif timestamp >= last_week_start:
            return 'last_week'
        elif timestamp >= month_start:
            return 'this_month'
        else:
            return 'older'

    def get_relative_time(self, obj):
        """
        Get human-readable relative time string.
        Examples: '2 minutes ago', '1 hour ago', 'Yesterday at 3:45 PM'
        """
        from django.utils import timezone
        from datetime import timedelta

        now = timezone.now()
        diff = now - obj.timestamp

        if diff < timedelta(minutes=1):
            return 'Just now'
        elif diff < timedelta(hours=1):
            minutes = int(diff.total_seconds() / 60)
            return f'{minutes} minute{"s" if minutes != 1 else ""} ago'
        elif diff < timedelta(days=1):
            hours = int(diff.total_seconds() / 3600)
            return f'{hours} hour{"s" if hours != 1 else ""} ago'
        elif diff < timedelta(days=2):
            return f'Yesterday at {obj.timestamp.strftime("%I:%M %p")}'
        elif diff < timedelta(days=7):
            return obj.timestamp.strftime('%A at %I:%M %p')
        else:
            return obj.timestamp.strftime('%b %d, %Y')

    def get_can_pin(self, obj):
        """Check if this activity can be pinned"""
        can_pin, _ = obj.can_pin()
        return can_pin


class RecentActivityListSerializer(serializers.ModelSerializer):
    """
    Minimal serializer for listing recent activities (optimized for performance).
    """
    time_group = serializers.SerializerMethodField()
    relative_time = serializers.SerializerMethodField()

    class Meta:
        model = RecentActivity
        fields = [
            'id', 'resource_type', 'resource_id', 'resource_name',
            'activity_type', 'timestamp',
            'file_type', 'file_size', 'folder_path',
            'confidentiality_level',
            'is_pinned',
            'time_group', 'relative_time'
        ]
        read_only_fields = fields

    def get_time_group(self, obj):
        """Get time group for UI grouping"""
        from django.utils import timezone
        from datetime import timedelta

        now = timezone.now()
        timestamp = obj.timestamp

        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday_start = today_start - timedelta(days=1)
        week_start = today_start - timedelta(days=today_start.weekday())
        last_week_start = week_start - timedelta(days=7)
        month_start = today_start.replace(day=1)

        if timestamp >= today_start:
            return 'today'
        elif timestamp >= yesterday_start:
            return 'yesterday'
        elif timestamp >= week_start:
            return 'this_week'
        elif timestamp >= last_week_start:
            return 'last_week'
        elif timestamp >= month_start:
            return 'this_month'
        else:
            return 'older'

    def get_relative_time(self, obj):
        """Get human-readable relative time"""
        from django.utils import timezone
        from datetime import timedelta

        now = timezone.now()
        diff = now - obj.timestamp

        if diff < timedelta(minutes=1):
            return 'Just now'
        elif diff < timedelta(hours=1):
            minutes = int(diff.total_seconds() / 60)
            return f'{minutes}m ago'
        elif diff < timedelta(days=1):
            hours = int(diff.total_seconds() / 3600)
            return f'{hours}h ago'
        elif diff < timedelta(days=2):
            return 'Yesterday'
        elif diff < timedelta(days=7):
            return obj.timestamp.strftime('%A')
        else:
            return obj.timestamp.strftime('%b %d')


class RecentActivityPinSerializer(serializers.Serializer):
    """
    Serializer for pinning/unpinning a recent activity.
    """
    is_pinned = serializers.BooleanField(
        required=True,
        help_text='True to pin, False to unpin'
    )

    def validate(self, attrs):
        """Validate pin operation"""
        activity = self.context.get('activity')
        is_pinned = attrs['is_pinned']

        if is_pinned:
            # Check if can pin
            can_pin, reason = activity.can_pin()
            if not can_pin:
                raise serializers.ValidationError({'is_pinned': reason})
        else:
            # Check if item is actually pinned
            if not activity.is_pinned:
                raise serializers.ValidationError({'is_pinned': 'Item is not pinned'})

        return attrs


class RecentActivityClearSerializer(serializers.Serializer):
    """
    Serializer for clearing recent activity history by date range.
    """
    before_date = serializers.DateTimeField(
        required=True,
        help_text='Clear activities before this date/time (ISO 8601 format)'
    )
    activity_type = serializers.ChoiceField(
        choices=RecentActivity.ActivityType.choices,
        required=False,
        allow_null=True,
        help_text='Optionally filter by activity type'
    )
    resource_type = serializers.ChoiceField(
        choices=RecentActivity.ResourceType.choices,
        required=False,
        allow_null=True,
        help_text='Optionally filter by resource type (DOCUMENT or FOLDER)'
    )
    exclude_pinned = serializers.BooleanField(
        default=True,
        help_text='Whether to exclude pinned items from clearing (default: True)'
    )

    def validate_before_date(self, value):
        """Ensure date is not in the future"""
        from django.utils import timezone

        if value > timezone.now():
            raise serializers.ValidationError('Cannot clear future activities')
        return value


class RecentActivityStatsSerializer(serializers.Serializer):
    """
    Serializer for activity statistics response.
    """
    total = serializers.IntegerField()
    by_type = serializers.DictField(
        child=serializers.IntegerField(),
        help_text='Count of activities by type (VIEWED, EDITED, etc.)'
    )
    by_resource_type = serializers.DictField(
        child=serializers.IntegerField(),
        help_text='Count of activities by resource type (DOCUMENT, FOLDER)'
    )
    by_day = serializers.ListField(
        child=serializers.DictField(),
        help_text='Count of activities by day for the last 30 days'
    )
    pinned_count = serializers.IntegerField()
    pinned_limit = serializers.IntegerField()


# ============================================================================
# MY DOCUMENTS SERIALIZERS
# ============================================================================


class MyDocumentListItemSerializer(serializers.ModelSerializer):
    """
    Serializer for listing documents in My Documents view.
    Includes time grouping and folder information.
    """
    folder_name = serializers.CharField(source='folder.name', read_only=True)
    folder_path = serializers.CharField(source='folder.path', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    time_ago = serializers.SerializerMethodField()
    time_group = serializers.SerializerMethodField()
    tags = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id', 'title', 'file_name', 'file_size', 'file_type',
            'document_type', 'confidentiality_level',
            'folder', 'folder_name', 'folder_path',
            'department', 'department_name',
            'version_number', 'document_date',
            'created_at', 'updated_at',
            'time_ago', 'time_group', 'tags',
        ]
        read_only_fields = fields

    def get_tags(self, obj):
        """Get tag names for the document"""
        return [dt.tag.name for dt in obj.document_tags.select_related('tag')]

    def get_time_ago(self, obj):
        """Get human-readable time ago string"""
        from django.utils import timezone
        from datetime import timedelta

        now = timezone.now()
        diff = now - obj.updated_at

        if diff < timedelta(minutes=1):
            return 'Just now'
        elif diff < timedelta(hours=1):
            minutes = int(diff.total_seconds() / 60)
            return f'{minutes}m ago'
        elif diff < timedelta(days=1):
            hours = int(diff.total_seconds() / 3600)
            return f'{hours}h ago'
        elif diff < timedelta(days=2):
            return 'Yesterday'
        elif diff < timedelta(days=7):
            return obj.updated_at.strftime('%A')
        else:
            return obj.updated_at.strftime('%b %d')

    def get_time_group(self, obj):
        """Get time group for UI grouping"""
        from django.utils import timezone
        from datetime import timedelta

        now = timezone.now()
        timestamp = obj.updated_at

        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=today_start.weekday())
        month_start = today_start.replace(day=1)

        if timestamp >= today_start:
            return 'today'
        elif timestamp >= week_start:
            return 'this_week'
        elif timestamp >= month_start:
            return 'this_month'
        else:
            return 'earlier'


class MyDocumentsStatsSerializer(serializers.Serializer):
    """
    Serializer for My Documents statistics.
    """
    total_documents = serializers.IntegerField()
    total_folders = serializers.IntegerField()
    documents_today = serializers.IntegerField()
    documents_this_week = serializers.IntegerField()
    storage_used_bytes = serializers.IntegerField()
    storage_used_formatted = serializers.CharField()

    # By type breakdown
    by_document_type = serializers.DictField(
        child=serializers.IntegerField(),
        help_text='Count of documents by type'
    )

    # By confidentiality breakdown
    by_confidentiality = serializers.DictField(
        child=serializers.IntegerField(),
        help_text='Count of documents by confidentiality level'
    )


class MyDocumentsGroupedSerializer(serializers.Serializer):
    """
    Serializer for grouped My Documents response.
    Groups documents by time period.
    """
    today = MyDocumentListItemSerializer(many=True)
    this_week = MyDocumentListItemSerializer(many=True)
    this_month = MyDocumentListItemSerializer(many=True)
    earlier = MyDocumentListItemSerializer(many=True)
    total_count = serializers.IntegerField()


# ============================================================================
# PINNED ITEMS SERIALIZERS (Quick Access)
# ============================================================================

class PinnedItemSerializer(serializers.ModelSerializer):
    """
    Serializer for PinnedItem model.
    Includes resolved item details for documents and folders.
    """
    display_name = serializers.SerializerMethodField()
    item_id = serializers.SerializerMethodField()
    item_details = serializers.SerializerMethodField()
    is_accessible = serializers.SerializerMethodField()

    class Meta:
        from apps.documents.models import PinnedItem
        model = PinnedItem
        fields = [
            'id', 'item_type', 'display_order', 'custom_label',
            'display_name', 'item_id', 'item_details', 'is_accessible',
            'pinned_at', 'updated_at'
        ]
        read_only_fields = ['id', 'pinned_at', 'updated_at']

    def get_display_name(self, obj):
        """Get the display name for the pinned item."""
        return obj.get_display_name()

    def get_item_id(self, obj):
        """Get the actual item ID (document, folder, or shared item)."""
        return obj.get_item_id()

    def get_is_accessible(self, obj):
        """Check if the pinned item is still accessible."""
        if obj.document:
            return not obj.document.is_deleted
        if obj.folder:
            return not obj.folder.is_deleted
        if obj.shared_item_id:
            # Check if shared access still exists
            from apps.sharing.models import SharedItemAccess
            return SharedItemAccess.objects.filter(
                id=obj.shared_item_id,
                is_active=True
            ).exists()
        return False

    def get_item_details(self, obj):
        """Get additional details about the pinned item."""
        if obj.document:
            return {
                'type': 'document',
                'title': obj.document.title,
                'file_name': obj.document.file_name,
                'file_type': obj.document.file_type,
                'file_size': obj.document.file_size,
                'confidentiality_level': obj.document.confidentiality_level,
                'document_type': obj.document.document_type,
                'folder_id': str(obj.document.folder_id) if obj.document.folder_id else None,
                'folder_name': obj.document.folder.name if obj.document.folder else None,
            }
        elif obj.folder:
            return {
                'type': 'folder',
                'name': obj.folder.name,
                'path': obj.folder.path,
                'parent_id': str(obj.folder.parent_id) if obj.folder.parent_id else None,
                'document_count': obj.folder.documents.filter(is_deleted=False).count(),
            }
        elif obj.shared_item_id:
            return {
                'type': 'shared',
                'name': obj.shared_item_name,
                'shared_item_id': str(obj.shared_item_id),
            }
        return None


class PinnedItemCreateSerializer(serializers.Serializer):
    """
    Serializer for creating a new pinned item.
    """
    item_type = serializers.ChoiceField(
        choices=['DOCUMENT', 'FOLDER', 'SHARED_DOCUMENT', 'SHARED_FOLDER']
    )
    document_id = serializers.UUIDField(required=False, allow_null=True)
    folder_id = serializers.UUIDField(required=False, allow_null=True)
    shared_item_id = serializers.UUIDField(required=False, allow_null=True)
    custom_label = serializers.CharField(max_length=255, required=False, allow_blank=True)

    def validate(self, attrs):
        """Validate that the correct ID is provided based on item_type."""
        item_type = attrs.get('item_type')
        document_id = attrs.get('document_id')
        folder_id = attrs.get('folder_id')
        shared_item_id = attrs.get('shared_item_id')

        if item_type == 'DOCUMENT':
            if not document_id:
                raise serializers.ValidationError({
                    'document_id': 'Required for DOCUMENT item type'
                })
            # Verify document exists and user has access
            from apps.documents.models import Document
            try:
                document = Document.objects.get(pk=document_id, is_deleted=False)
                user = self.context['request'].user
                # User must own the document or be staff
                if document.owner != user and not user.is_staff:
                    raise serializers.ValidationError({
                        'document_id': 'You do not have access to this document'
                    })
                attrs['document'] = document
            except Document.DoesNotExist:
                raise serializers.ValidationError({
                    'document_id': 'Document not found'
                })

        elif item_type == 'FOLDER':
            if not folder_id:
                raise serializers.ValidationError({
                    'folder_id': 'Required for FOLDER item type'
                })
            # Verify folder exists and user has access
            from apps.folders.models import Folder
            try:
                folder = Folder.objects.get(pk=folder_id, is_deleted=False)
                user = self.context['request'].user
                # User must own the folder or be staff
                if folder.owner != user and not user.is_staff:
                    raise serializers.ValidationError({
                        'folder_id': 'You do not have access to this folder'
                    })
                attrs['folder'] = folder
            except Folder.DoesNotExist:
                raise serializers.ValidationError({
                    'folder_id': 'Folder not found'
                })

        elif item_type in ['SHARED_DOCUMENT', 'SHARED_FOLDER']:
            if not shared_item_id:
                raise serializers.ValidationError({
                    'shared_item_id': 'Required for shared item types'
                })
            # Verify shared access exists
            from apps.sharing.models import SharedItemAccess
            try:
                shared_access = SharedItemAccess.objects.get(
                    pk=shared_item_id,
                    recipient=self.context['request'].user,
                    is_active=True
                )
                attrs['shared_access'] = shared_access
                attrs['shared_item_name'] = shared_access.resource_name
            except SharedItemAccess.DoesNotExist:
                raise serializers.ValidationError({
                    'shared_item_id': 'Shared item not found or access revoked'
                })

        return attrs

    def create(self, validated_data):
        """Create the pinned item."""
        from apps.documents.models import PinnedItem

        user = self.context['request'].user

        # Check if user can pin more items
        can_pin, reason = PinnedItem.can_user_pin(user)
        if not can_pin:
            raise serializers.ValidationError({'non_field_errors': [reason]})

        # Check for existing pin
        item_type = validated_data['item_type']
        existing_pin = None

        if item_type == 'DOCUMENT':
            existing_pin = PinnedItem.objects.filter(
                user=user,
                document=validated_data['document']
            ).first()
        elif item_type == 'FOLDER':
            existing_pin = PinnedItem.objects.filter(
                user=user,
                folder=validated_data['folder']
            ).first()
        elif item_type in ['SHARED_DOCUMENT', 'SHARED_FOLDER']:
            existing_pin = PinnedItem.objects.filter(
                user=user,
                shared_item_id=validated_data.get('shared_item_id')
            ).first()

        if existing_pin:
            raise serializers.ValidationError({
                'non_field_errors': ['This item is already pinned']
            })

        # Create the pin
        pin_data = {
            'user': user,
            'item_type': item_type,
            'custom_label': validated_data.get('custom_label', ''),
        }

        if item_type == 'DOCUMENT':
            pin_data['document'] = validated_data['document']
        elif item_type == 'FOLDER':
            pin_data['folder'] = validated_data['folder']
        elif item_type in ['SHARED_DOCUMENT', 'SHARED_FOLDER']:
            pin_data['shared_item_id'] = validated_data['shared_item_id']
            pin_data['shared_item_name'] = validated_data.get('shared_item_name', '')

        return PinnedItem.objects.create(**pin_data)


class PinnedItemReorderSerializer(serializers.Serializer):
    """
    Serializer for reordering pinned items.
    """
    ordered_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        help_text='List of pin IDs in desired order'
    )

    def validate_ordered_ids(self, value):
        """Validate all IDs belong to the user."""
        from apps.documents.models import PinnedItem

        user = self.context['request'].user
        user_pin_ids = set(
            PinnedItem.objects.filter(user=user).values_list('id', flat=True)
        )
        provided_ids = set(value)

        # Check for invalid IDs
        invalid_ids = provided_ids - user_pin_ids
        if invalid_ids:
            raise serializers.ValidationError(
                f'Invalid pin IDs: {list(invalid_ids)}'
            )

        return value


class PinnedItemUpdateSerializer(serializers.Serializer):
    """
    Serializer for updating a pinned item (custom label).
    """
    custom_label = serializers.CharField(max_length=255, required=False, allow_blank=True)


# ============================================================================
# DOCUMENT STATE SERIALIZERS
# ============================================================================


class DocumentStateTransitionSerializer(serializers.ModelSerializer):
    """
    Serializer for DocumentStateTransition model.
    Provides audit trail for document state changes.
    """
    transitioned_by_name = serializers.SerializerMethodField()
    from_state_label = serializers.SerializerMethodField()
    to_state_label = serializers.SerializerMethodField()
    relative_time = serializers.SerializerMethodField()

    class Meta:
        from apps.documents.models import DocumentStateTransition
        model = DocumentStateTransition
        fields = [
            'id', 'document', 'from_state', 'to_state',
            'from_state_label', 'to_state_label',
            'transitioned_by', 'transitioned_by_name',
            'transitioned_at', 'relative_time',
            'notes', 'rejection_reason'
        ]
        read_only_fields = fields

    def get_transitioned_by_name(self, obj):
        """Get the name of the user who made the transition."""
        if obj.transitioned_by:
            return obj.transitioned_by.get_full_name() or obj.transitioned_by.username
        return None

    def get_from_state_label(self, obj):
        """Get human-readable label for from_state."""
        from apps.documents.models import DocumentState
        labels = dict(DocumentState.choices)
        return labels.get(obj.from_state, obj.from_state)

    def get_to_state_label(self, obj):
        """Get human-readable label for to_state."""
        from apps.documents.models import DocumentState
        labels = dict(DocumentState.choices)
        return labels.get(obj.to_state, obj.to_state)

    def get_relative_time(self, obj):
        """Get human-readable relative time."""
        from django.utils import timezone
        from datetime import timedelta

        now = timezone.now()
        diff = now - obj.transitioned_at

        if diff < timedelta(minutes=1):
            return 'Just now'
        elif diff < timedelta(hours=1):
            minutes = int(diff.total_seconds() / 60)
            return f'{minutes}m ago'
        elif diff < timedelta(days=1):
            hours = int(diff.total_seconds() / 3600)
            return f'{hours}h ago'
        elif diff < timedelta(days=2):
            return 'Yesterday'
        elif diff < timedelta(days=7):
            return obj.transitioned_at.strftime('%A')
        else:
            return obj.transitioned_at.strftime('%b %d, %Y')


class DocumentStateChangeSerializer(serializers.Serializer):
    """
    Serializer for changing document state.
    Validates transition is allowed and handles state-specific requirements.
    """
    to_state = serializers.ChoiceField(
        choices=[
            ('IN_REVIEW', 'In Review'),
            ('APPROVED', 'Approved'),
            ('DRAFT', 'Draft'),  # For rejection or restore
            ('PUBLISHED', 'Published'),
            ('ARCHIVED', 'Archived'),
        ],
        help_text='Target state for the document'
    )
    notes = serializers.CharField(
        max_length=5000,
        required=False,
        allow_blank=True,
        help_text='Optional notes for this transition'
    )
    rejection_reason = serializers.CharField(
        max_length=5000,
        required=False,
        allow_blank=True,
        help_text='Required when rejecting (transitioning from IN_REVIEW to DRAFT)'
    )

    def validate(self, attrs):
        """Validate the state transition is allowed."""
        from apps.documents.models import DocumentStateTransition, DocumentState

        document = self.context.get('document')
        to_state = attrs.get('to_state')
        rejection_reason = attrs.get('rejection_reason', '')

        if not document:
            raise serializers.ValidationError('Document not found in context')

        # Check if transition is valid
        if not DocumentStateTransition.is_valid_transition(document.state, to_state):
            allowed = DocumentStateTransition.get_allowed_transitions(document.state)
            allowed_labels = [dict(DocumentState.choices).get(s, s) for s in allowed]
            raise serializers.ValidationError({
                'to_state': f'Cannot transition from {document.get_state_display()} to {attrs.get("to_state")}. '
                           f'Allowed transitions: {", ".join(allowed_labels) if allowed_labels else "none"}'
            })

        # Require rejection_reason when rejecting
        if document.state == DocumentState.IN_REVIEW and to_state == DocumentState.DRAFT:
            if not rejection_reason:
                raise serializers.ValidationError({
                    'rejection_reason': 'Rejection reason is required when rejecting a document'
                })

        attrs['document'] = document
        return attrs

    def create(self, validated_data):
        """Perform the state transition."""
        from apps.documents.models import DocumentStateTransition

        document = validated_data['document']
        to_state = validated_data['to_state']
        notes = validated_data.get('notes', '')
        rejection_reason = validated_data.get('rejection_reason', '')
        user = self.context['request'].user

        # Create the transition
        transition = DocumentStateTransition.create_transition(
            document=document,
            to_state=to_state,
            user=user,
            notes=notes,
            rejection_reason=rejection_reason
        )

        return transition


class DocumentWithStateSerializer(serializers.ModelSerializer):
    """
    Serializer for documents that includes state information.
    Used in My Documents listing with state tabs.
    """
    folder_name = serializers.CharField(source='folder.name', read_only=True)
    folder_path = serializers.CharField(source='folder.path', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    state_label = serializers.SerializerMethodField()
    allowed_transitions = serializers.SerializerMethodField()
    time_ago = serializers.SerializerMethodField()
    time_group = serializers.SerializerMethodField()
    tags = serializers.SerializerMethodField()
    submitted_by_name = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id', 'title', 'file_name', 'file_size', 'file_type',
            'document_type', 'confidentiality_level',
            'folder', 'folder_name', 'folder_path',
            'department', 'department_name',
            'version_number', 'document_date',
            'created_at', 'updated_at',
            'time_ago', 'time_group', 'tags',
            # State fields
            'state', 'state_label', 'allowed_transitions',
            'submitted_for_review_at', 'submitted_by', 'submitted_by_name',
            'reviewed_at', 'reviewed_by', 'reviewed_by_name',
            'approved_at', 'published_at', 'archived_at',
            'review_notes', 'rejection_reason',
        ]
        read_only_fields = fields

    def get_state_label(self, obj):
        """Get human-readable state label."""
        return obj.get_state_display()

    def get_allowed_transitions(self, obj):
        """Get list of allowed state transitions."""
        from apps.documents.models import DocumentStateTransition, DocumentState
        allowed = DocumentStateTransition.get_allowed_transitions(obj.state)
        return [
            {'state': s, 'label': dict(DocumentState.choices).get(s, s)}
            for s in allowed
        ]

    def get_tags(self, obj):
        """Get tag names for the document."""
        return [dt.tag.name for dt in obj.document_tags.select_related('tag')]

    def get_time_ago(self, obj):
        """Get human-readable time ago string."""
        from django.utils import timezone
        from datetime import timedelta

        now = timezone.now()
        diff = now - obj.updated_at

        if diff < timedelta(minutes=1):
            return 'Just now'
        elif diff < timedelta(hours=1):
            minutes = int(diff.total_seconds() / 60)
            return f'{minutes}m ago'
        elif diff < timedelta(days=1):
            hours = int(diff.total_seconds() / 3600)
            return f'{hours}h ago'
        elif diff < timedelta(days=2):
            return 'Yesterday'
        elif diff < timedelta(days=7):
            return obj.updated_at.strftime('%A')
        else:
            return obj.updated_at.strftime('%b %d')

    def get_time_group(self, obj):
        """Get time group for UI grouping."""
        from django.utils import timezone
        from datetime import timedelta

        now = timezone.now()
        timestamp = obj.updated_at

        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=today_start.weekday())
        month_start = today_start.replace(day=1)

        if timestamp >= today_start:
            return 'today'
        elif timestamp >= week_start:
            return 'this_week'
        elif timestamp >= month_start:
            return 'this_month'
        else:
            return 'earlier'

    def get_submitted_by_name(self, obj):
        """Get name of user who submitted for review."""
        if obj.submitted_by:
            return obj.submitted_by.get_full_name() or obj.submitted_by.username
        return None

    def get_reviewed_by_name(self, obj):
        """Get name of reviewer."""
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name() or obj.reviewed_by.username
        return None


class PendingReviewSerializer(serializers.ModelSerializer):
    """
    Serializer for documents pending the current user's review action.
    Shows documents where user is expected to approve/reject.
    """
    owner_name = serializers.SerializerMethodField()
    folder_name = serializers.CharField(source='folder.name', read_only=True)
    submitted_by_name = serializers.SerializerMethodField()
    time_pending = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id', 'title', 'file_name', 'file_size', 'file_type',
            'document_type', 'confidentiality_level',
            'folder', 'folder_name',
            'owner', 'owner_name',
            'submitted_for_review_at', 'submitted_by', 'submitted_by_name',
            'time_pending',
        ]
        read_only_fields = fields

    def get_owner_name(self, obj):
        """Get document owner's name."""
        if obj.owner:
            return obj.owner.get_full_name() or obj.owner.username
        return None

    def get_submitted_by_name(self, obj):
        """Get name of user who submitted for review."""
        if obj.submitted_by:
            return obj.submitted_by.get_full_name() or obj.submitted_by.username
        return None

    def get_time_pending(self, obj):
        """Get how long the document has been pending review."""
        from django.utils import timezone
        from datetime import timedelta

        if not obj.submitted_for_review_at:
            return None

        now = timezone.now()
        diff = now - obj.submitted_for_review_at

        if diff < timedelta(hours=1):
            minutes = int(diff.total_seconds() / 60)
            return f'{minutes}m'
        elif diff < timedelta(days=1):
            hours = int(diff.total_seconds() / 3600)
            return f'{hours}h'
        else:
            days = diff.days
            return f'{days}d'


class DocumentStateStatsSerializer(serializers.Serializer):
    """
    Serializer for document state statistics.
    """
    total = serializers.IntegerField()
    by_state = serializers.DictField(
        child=serializers.IntegerField(),
        help_text='Count of documents by state'
    )
    pending_my_review = serializers.IntegerField(
        help_text='Documents awaiting current user\'s review action'
    )
    my_drafts = serializers.IntegerField(
        help_text='User\'s draft documents'
    )
    my_in_review = serializers.IntegerField(
        help_text='User\'s documents currently in review'
    )


# ============================================================================
# TRASH DOCUMENT SERIALIZERS
# ============================================================================

class TrashDocumentSerializer(serializers.ModelSerializer):
    """
    Serializer for documents in trash with deleted_by information.
    """
    owner_name = serializers.SerializerMethodField()
    department_name = serializers.CharField(source='department.name', read_only=True)
    folder_name = serializers.CharField(source='folder.name', read_only=True)
    folder_path = serializers.CharField(source='folder.path', read_only=True)
    deleted_by_name = serializers.SerializerMethodField()
    deleted_by_email = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id', 'title', 'file_name', 'file_size', 'file_type',
            'document_type', 'confidentiality_level',
            'owner', 'owner_name', 'department', 'department_name',
            'folder', 'folder_name', 'folder_path',
            'created_at', 'updated_at',
            'deleted_at', 'deleted_by', 'deleted_by_name', 'deleted_by_email',
        ]

    def get_owner_name(self, obj):
        """Get the name of the document owner"""
        if obj.owner:
            return obj.owner.get_full_name() or obj.owner.username
        return None

    def get_deleted_by_name(self, obj):
        """Get the name of the user who deleted the document"""
        if obj.deleted_by:
            return obj.deleted_by.get_full_name() or obj.deleted_by.username
        return None

    def get_deleted_by_email(self, obj):
        """Get the email of the user who deleted the document"""
        if obj.deleted_by:
            return obj.deleted_by.email
        return None
