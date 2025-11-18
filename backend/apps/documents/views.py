"""
Views for document management and file operations.
"""
from rest_framework import generics, status, permissions, parsers, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import FileResponse, Http404
from django.db import models
from django.db.models import Q
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse, inline_serializer

from apps.documents.models import Document, Tag, DocumentTag
from apps.documents.serializers import (
    DocumentListSerializer,
    DocumentDetailSerializer,
    DocumentUploadSerializer,
    DocumentUpdateSerializer,
    DocumentVersionSerializer,
    DocumentMetadataSerializer,
    BulkMetadataUpdateSerializer,
    TagSerializer,
    DocumentVersionListSerializer,
    DocumentVersionDetailSerializer,
    DocumentVersionUploadSerializer,
    VersionRestoreSerializer,
)
from apps.documents.storage import generate_presigned_url
import logging

logger = logging.getLogger(__name__)


@extend_schema(
    tags=['Documents'],
    request=DocumentUploadSerializer,
    responses={
        201: DocumentDetailSerializer,
        400: OpenApiResponse(description='Validation error'),
    }
)
class DocumentUploadView(generics.CreateAPIView):
    """
    Upload a new document with file and metadata.

    Features:
    - Multi-part form data upload
    - File validation (size, type)
    - Automatic checksum calculation (SHA-256)
    - Duplicate detection
    - Tag assignment
    - Audit logging
    """
    serializer_class = DocumentUploadSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def create(self, request, *args, **kwargs):
        """
        Handle document upload with comprehensive validation.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document = serializer.save()

        # Log the upload
        logger.info(
            f"Document uploaded: {document.id} by user {request.user.username}"
        )

        # Return full document details
        response_serializer = DocumentDetailSerializer(document)
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED
        )


@extend_schema(
    tags=['Documents'],
    parameters=[
        OpenApiParameter(
            name='folder',
            type=str,
            location=OpenApiParameter.QUERY,
            description='Filter by folder ID'
        ),
        OpenApiParameter(
            name='document_type',
            type=str,
            location=OpenApiParameter.QUERY,
            description='Filter by document type'
        ),
        OpenApiParameter(
            name='confidentiality',
            type=str,
            location=OpenApiParameter.QUERY,
            description='Filter by confidentiality level'
        ),
        OpenApiParameter(
            name='search',
            type=str,
            location=OpenApiParameter.QUERY,
            description='Search in title and identifier'
        ),
    ],
    responses={
        200: DocumentListSerializer(many=True),
    }
)
class DocumentListView(generics.ListAPIView):
    """
    List all documents with filtering and search.

    Supports filtering by:
    - Folder
    - Document type
    - Confidentiality level
    - Search query (title, identifier)

    Results are filtered by user permissions.
    """
    serializer_class = DocumentListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Get documents filtered by permissions and query parameters.
        """
        user = self.request.user
        queryset = Document.objects.select_related(
            'owner', 'department', 'folder', 'created_by'
        ).prefetch_related('document_tags__tag').filter(is_deleted=False)

        # Filter by user's department unless staff
        if not user.is_staff:
            queryset = queryset.filter(department=user.department)

        # Apply filters from query parameters
        folder_id = self.request.query_params.get('folder')
        if folder_id:
            queryset = queryset.filter(folder_id=folder_id)

        document_type = self.request.query_params.get('document_type')
        if document_type:
            queryset = queryset.filter(document_type=document_type)

        confidentiality = self.request.query_params.get('confidentiality')
        if confidentiality:
            queryset = queryset.filter(confidentiality_level=confidentiality)

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(identifier__icontains=search) |
                Q(file_name__icontains=search)
            )

        return queryset.order_by('-created_at')


@extend_schema(
    tags=['Documents'],
    responses={
        200: DocumentDetailSerializer,
        404: OpenApiResponse(description='Document not found'),
    }
)
class DocumentDetailView(generics.RetrieveAPIView):
    """
    Retrieve detailed information about a specific document.

    Returns:
    - Full metadata
    - Tags
    - Version history
    - File information
    """
    serializer_class = DocumentDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        """Filter documents by user permissions"""
        user = self.request.user
        queryset = Document.objects.select_related(
            'owner', 'department', 'folder', 'created_by'
        ).prefetch_related('document_tags__tag')

        if not user.is_staff:
            queryset = queryset.filter(department=user.department)

        return queryset


@extend_schema(
    tags=['Documents'],
    request=DocumentUpdateSerializer,
    responses={
        200: DocumentDetailSerializer,
        400: OpenApiResponse(description='Validation error'),
        403: OpenApiResponse(description='Permission denied'),
        404: OpenApiResponse(description='Document not found'),
    }
)
class DocumentUpdateView(generics.UpdateAPIView):
    """
    Update document metadata.

    Note: File cannot be updated directly.
    To update the file, create a new version instead.
    """
    serializer_class = DocumentUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        """Filter documents by user permissions"""
        user = self.request.user
        queryset = Document.objects.all()

        # Only owner or staff can update
        if not user.is_staff:
            queryset = queryset.filter(owner=user)

        return queryset

    def update(self, request, *args, **kwargs):
        """Update document and return full details"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        document = serializer.save()

        logger.info(
            f"Document updated: {document.id} by user {request.user.username}"
        )

        response_serializer = DocumentDetailSerializer(document)
        return Response(response_serializer.data)


@extend_schema(
    tags=['Documents'],
    responses={
        204: OpenApiResponse(description='Document deleted successfully'),
        403: OpenApiResponse(description='Permission denied'),
        404: OpenApiResponse(description='Document not found'),
    }
)
class DocumentDeleteView(generics.DestroyAPIView):
    """
    Soft delete a document.

    The document is marked as deleted but not removed from storage.
    This allows for recovery and maintains audit trail.
    """
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        """Filter documents by user permissions"""
        user = self.request.user
        queryset = Document.objects.filter(is_deleted=False)

        # Only owner or staff can delete
        if not user.is_staff:
            queryset = queryset.filter(owner=user)

        return queryset

    def perform_destroy(self, instance):
        """Soft delete instead of hard delete"""
        from django.utils import timezone
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.save()

        logger.info(
            f"Document soft deleted: {instance.id} by user {self.request.user.username}"
        )


@extend_schema(
    tags=['Documents'],
    responses={
        200: OpenApiResponse(description='File download URL'),
        403: OpenApiResponse(description='Permission denied'),
        404: OpenApiResponse(description='Document not found'),
    }
)
class DocumentDownloadView(APIView):
    """
    Download document with enhanced features.

    Supports:
    - Direct file streaming or presigned URL
    - Optional inline viewing (preview in browser)
    - Range requests for resumable downloads
    - Download tracking (audit trail)

    Query Parameters:
    - mode: 'url' (presigned URL) or 'stream' (direct download) [default: 'url']
    - inline: true/false (view in browser vs download) [default: false]
    - expiration: URL expiration in seconds (only for mode=url) [default: 3600]
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, id):
        """Download document or generate presigned URL"""
        try:
            # Get document with permission check
            user = request.user
            document = Document.objects.select_related('department', 'owner').get(id=id, is_deleted=False)

            # Check permissions
            if not user.is_staff and document.department != user.department:
                return Response(
                    {'detail': 'You do not have permission to download this document'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Get query parameters
            mode = request.query_params.get('mode', 'url')  # 'url' or 'stream'
            inline = request.query_params.get('inline', 'false').lower() == 'true'
            expiration = int(request.query_params.get('expiration', 3600))

            # Validate expiration (max 24 hours)
            if expiration > 86400:
                expiration = 86400

            if mode == 'stream':
                # Direct file streaming through Django
                from django.http import FileResponse
                from wsgiref.util import FileWrapper
                import mimetypes

                try:
                    # Open file
                    document.file.open('rb')
                    file_wrapper = FileWrapper(document.file)

                    # Determine content type
                    content_type = document.file_type or mimetypes.guess_type(document.file_name)[0] or 'application/octet-stream'

                    # Create response
                    response = FileResponse(file_wrapper, content_type=content_type)

                    # Set disposition (inline for preview, attachment for download)
                    if inline:
                        response['Content-Disposition'] = f'inline; filename="{document.file_name}"'
                    else:
                        response['Content-Disposition'] = f'attachment; filename="{document.file_name}"'

                    # Set file size for progress tracking
                    response['Content-Length'] = document.file_size

                    # Enable range requests for resumable downloads
                    response['Accept-Ranges'] = 'bytes'

                    logger.info(
                        f"Document {document.id} streamed to user {user.id} (mode=stream, inline={inline})"
                    )

                    # TODO: Create audit log entry for download

                    return response

                except Exception as e:
                    logger.error(f"Error streaming file: {e}", exc_info=True)
                    return Response(
                        {'error': 'Failed to stream file'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )

            else:
                # Generate presigned URL (default)
                file_key = document.file.name
                download_url = generate_presigned_url(
                    file_key,
                    expiration=expiration,
                    inline=inline
                )

                logger.info(
                    f"Download URL generated for document {document.id} by user {user.id} (expires={expiration}s)"
                )

                # TODO: Create audit log entry for download URL generation

                return Response({
                    'download_url': download_url,
                    'file_name': document.file_name,
                    'file_size': document.file_size,
                    'file_size_mb': document.file_size_mb,
                    'file_type': document.file_type,
                    'expires_in': expiration,
                    'mode': 'url'
                })

        except Document.DoesNotExist:
            raise Http404('Document not found or has been deleted')
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error in document download: {e}", exc_info=True)
            return Response(
                {'error': 'Failed to process download request'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@extend_schema(
    tags=['Documents'],
    request=DocumentVersionSerializer,
    responses={
        201: DocumentDetailSerializer,
        400: OpenApiResponse(description='Validation error'),
        403: OpenApiResponse(description='Permission denied'),
        404: OpenApiResponse(description='Document not found'),
    }
)
class DocumentVersionCreateView(APIView):
    """
    Create a new version of an existing document.

    Uploads a new file while preserving:
    - Original metadata
    - Tags
    - Folder location
    - Ownership

    The version number is automatically incremented.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def post(self, request, id):
        """Create new document version"""
        try:
            # Get parent document
            user = request.user
            parent_document = Document.objects.get(id=id)

            # Check permissions (only owner or staff can create versions)
            if not user.is_staff and parent_document.owner != user:
                return Response(
                    {'detail': 'You do not have permission to version this document'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Validate and create new version
            serializer = DocumentVersionSerializer(
                data=request.data,
                context={'request': request, 'parent_document': parent_document}
            )
            serializer.is_valid(raise_exception=True)
            new_version = serializer.save()

            logger.info(
                f"New version created for document {id}: version {new_version.version_number} "
                f"by user {user.username}"
            )

            # Return full details of new version
            response_serializer = DocumentDetailSerializer(new_version)
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED
            )

        except Document.DoesNotExist:
            raise Http404('Document not found')


# Tag Management Views

@extend_schema(
    tags=['Tags'],
    responses={
        200: TagSerializer(many=True),
    }
)
class TagListCreateView(generics.ListCreateAPIView):
    """
    List all tags or create a new tag.

    Tags are used for categorizing and organizing documents.
    """
    serializer_class = TagSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Get tags filtered by user's department or global tags"""
        user = self.request.user
        queryset = Tag.objects.all()

        if not user.is_staff:
            # Show department-specific tags and global tags (no department)
            queryset = queryset.filter(
                Q(department=user.department) | Q(department__isnull=True)
            )

        return queryset.order_by('name')

    def perform_create(self, serializer):
        """Set created_by when creating tag"""
        serializer.save(created_by=self.request.user)


@extend_schema(
    tags=['Tags'],
    responses={
        200: TagSerializer,
        404: OpenApiResponse(description='Tag not found'),
    }
)
class TagDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a specific tag.

    Only staff or tag creator can modify/delete tags.
    """
    serializer_class = TagSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter tags by permissions"""
        user = self.request.user
        queryset = Tag.objects.all()

        if not user.is_staff:
            queryset = queryset.filter(created_by=user)

        return queryset


# Chunked Upload Views

@extend_schema(
    tags=['Documents - Chunked Upload'],
    responses={
        201: OpenApiResponse(description='Chunked upload session created'),
        400: OpenApiResponse(description='Validation error'),
    }
)
class ChunkedUploadInitiateView(APIView):
    """
    Initiate a chunked upload session for large files.

    Returns an upload_id to be used for subsequent chunk uploads.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Initiate chunked upload session"""
        from apps.documents.models import ChunkedUpload
        from apps.documents.utils import check_storage_quota
        import uuid
        from datetime import timedelta

        file_name = request.data.get('file_name')
        file_size = int(request.data.get('file_size', 0))
        chunk_size = int(request.data.get('chunk_size', 5242880))  # Default 5MB
        folder_id = request.data.get('folder')

        if not file_name or not file_size:
            return Response(
                {'error': 'file_name and file_size are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check storage quota
        can_upload, message = check_storage_quota(request.user, file_size)
        if not can_upload:
            return Response(
                {'error': 'Storage quota exceeded', 'detail': message},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
            )

        # Calculate total chunks
        total_chunks = (file_size + chunk_size - 1) // chunk_size

        # Create upload session
        upload_id = str(uuid.uuid4())
        chunked_upload = ChunkedUpload.objects.create(
            upload_id=upload_id,
            file_name=file_name,
            file_size=file_size,
            chunk_size=chunk_size,
            total_chunks=total_chunks,
            user=request.user,
            folder_id=folder_id,
            expires_at=timezone.now() + timedelta(hours=24)
        )

        logger.info(
            f"Chunked upload initiated: {upload_id} for user {request.user.username}"
        )

        return Response({
            'upload_id': upload_id,
            'chunk_size': chunk_size,
            'total_chunks': total_chunks,
            'expires_at': chunked_upload.expires_at
        }, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=['Documents - Chunked Upload'],
    responses={
        200: OpenApiResponse(description='Chunk received'),
        201: OpenApiResponse(description='Upload complete'),
        400: OpenApiResponse(description='Validation error'),
        404: OpenApiResponse(description='Upload session not found'),
    }
)
class ChunkedUploadChunkView(APIView):
    """
    Upload a chunk of the file.

    When all chunks are received, the file is automatically assembled
    and a document record is created.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser]

    def post(self, request, upload_id):
        """Upload a chunk"""
        from apps.documents.models import ChunkedUpload
        from apps.documents.utils import store_chunk, assemble_chunks, cleanup_chunks
        from django.core.files.base import File

        try:
            chunked_upload = ChunkedUpload.objects.get(
                upload_id=upload_id,
                user=request.user
            )
        except ChunkedUpload.DoesNotExist:
            return Response(
                {'error': 'Upload session not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if expired
        if chunked_upload.expires_at < timezone.now():
            chunked_upload.status = 'EXPIRED'
            chunked_upload.save()
            return Response(
                {'error': 'Upload session expired'},
                status=status.HTTP_400_BAD_REQUEST
            )

        chunk_number = int(request.data.get('chunk_number'))
        chunk_data = request.FILES.get('chunk')

        if chunk_data is None:
            return Response(
                {'error': 'chunk is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Store chunk
        store_chunk(upload_id, chunk_number, chunk_data)
        chunked_upload.add_chunk(chunk_number)

        # Check if upload is complete
        if chunked_upload.is_complete:
            try:
                # Assemble chunks
                assembled_file_path = assemble_chunks(chunked_upload)

                # Create document from assembled file
                with open(assembled_file_path, 'rb') as f:
                    django_file = File(f, name=chunked_upload.file_name)

                    # Use DocumentUploadSerializer to create document
                    metadata = chunked_upload.metadata or {}
                    data = {
                        'file': django_file,
                        'title': metadata.get('title', chunked_upload.file_name),
                        'document_type': metadata.get('document_type', 'OTHER'),
                        'identifier': metadata.get('identifier', ''),
                        'document_date': metadata.get('document_date', timezone.now().date()),
                        'creator_source': metadata.get('creator_source', request.user.get_full_name()),
                        'confidentiality_level': metadata.get('confidentiality_level', 'INTERNAL'),
                        'retention_period_years': metadata.get('retention_period_years', 7),
                        'folder': chunked_upload.folder_id,
                        'department': request.user.department_id,
                    }

                    serializer = DocumentUploadSerializer(
                        data=data,
                        context={'request': request}
                    )
                    serializer.is_valid(raise_exception=True)
                    document = serializer.save()

                # Cleanup
                cleanup_chunks(upload_id)
                import os
                os.remove(assembled_file_path)

                chunked_upload.status = 'COMPLETE'
                chunked_upload.save()

                logger.info(
                    f"Chunked upload complete: {upload_id}, document {document.id} created"
                )

                return Response(
                    {
                        'status': 'complete',
                        'document': DocumentDetailSerializer(document).data
                    },
                    status=status.HTTP_201_CREATED
                )

            except Exception as e:
                chunked_upload.status = 'FAILED'
                chunked_upload.save()
                logger.error(f"Failed to assemble chunks for {upload_id}: {e}")
                return Response(
                    {'error': 'Failed to assemble file', 'detail': str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        # Chunk received, more chunks pending
        return Response({
            'status': 'chunk received',
            'chunk_number': chunk_number,
            'uploaded_chunks': len(chunked_upload.uploaded_chunks),
            'total_chunks': chunked_upload.total_chunks,
            'progress_percentage': chunked_upload.progress_percentage
        })


@extend_schema(
    tags=['Documents - Chunked Upload'],
    responses={
        200: OpenApiResponse(description='Upload status'),
        404: OpenApiResponse(description='Upload session not found'),
    }
)
class ChunkedUploadStatusView(APIView):
    """
    Get the status of a chunked upload session.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, upload_id):
        """Get upload status"""
        from apps.documents.models import ChunkedUpload

        try:
            chunked_upload = ChunkedUpload.objects.get(
                upload_id=upload_id,
                user=request.user
            )
        except ChunkedUpload.DoesNotExist:
            return Response(
                {'error': 'Upload session not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({
            'upload_id': chunked_upload.upload_id,
            'file_name': chunked_upload.file_name,
            'file_size': chunked_upload.file_size,
            'status': chunked_upload.status,
            'uploaded_chunks': chunked_upload.uploaded_chunks,
            'total_chunks': chunked_upload.total_chunks,
            'progress_percentage': chunked_upload.progress_percentage,
            'expires_at': chunked_upload.expires_at
        })


# Storage Monitoring Views

@extend_schema(
    tags=['Storage'],
    responses={
        200: OpenApiResponse(description='Storage usage statistics'),
    }
)
class StorageUsageView(APIView):
    """
    Get storage usage statistics.

    Staff can see all departments, regular users see only their department.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get storage usage"""
        from apps.documents.utils import get_storage_usage, get_user_storage_summary

        user = request.user
        department_id = request.query_params.get('department')

        # If requesting specific department
        if department_id:
            if not user.is_staff and str(user.department_id) != department_id:
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

            from apps.users.models import Department
            try:
                department = Department.objects.get(id=department_id)
                usage = get_storage_usage(department=department)
                usage['department'] = {
                    'id': department.id,
                    'name': department.name,
                    'code': department.code
                }
            except Department.DoesNotExist:
                return Response(
                    {'error': 'Department not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # Return user's personal summary
            usage = get_user_storage_summary(user)

        return Response(usage)


@extend_schema(
    tags=['Storage'],
    responses={
        200: OpenApiResponse(description='Department quota status'),
        404: OpenApiResponse(description='Department not found'),
    }
)
class DepartmentQuotaView(APIView):
    """
    Get storage quota information for a department.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, department_id):
        """Get department quota status"""
        from apps.documents.utils import get_department_quota_status
        from apps.users.models import Department

        # Check permissions
        if not request.user.is_staff:
            if str(request.user.department_id) != str(department_id):
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

        try:
            department = Department.objects.get(id=department_id)
        except Department.DoesNotExist:
            return Response(
                {'error': 'Department not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        quota_status = get_department_quota_status(department)
        quota_status['department'] = {
            'id': department.id,
            'name': department.name,
            'code': department.code
        }

        return Response(quota_status)


# Metadata Management Views

@extend_schema(
    tags=['Metadata'],
    responses={
        200: OpenApiResponse(description='Metadata schema definition'),
    }
)
class MetadataSchemaView(APIView):
    """
    Get metadata schema definition.

    Returns the complete metadata schema with all fields,
    controlled vocabularies, and naming conventions.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get metadata schema"""
        from apps.documents.utils import get_metadata_schema

        schema = get_metadata_schema()
        return Response(schema)


@extend_schema(
    tags=['Metadata'],
    request=DocumentMetadataSerializer,
    responses={
        200: DocumentDetailSerializer,
        400: OpenApiResponse(description='Validation error'),
        403: OpenApiResponse(description='Permission denied'),
        404: OpenApiResponse(description='Document not found'),
    }
)
class DocumentMetadataUpdateView(generics.UpdateAPIView):
    """
    Update document metadata.

    Allows updating all metadata fields except the file itself.
    Use the version upload endpoint to update the file.
    """
    queryset = Document.objects.all()
    serializer_class = DocumentMetadataSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter documents by permissions"""
        user = self.request.user
        queryset = Document.objects.all()

        if not user.is_staff:
            queryset = queryset.filter(
                models.Q(owner=user) | models.Q(department=user.department)
            )

        return queryset

    def perform_update(self, serializer):
        """Update document metadata and handle tags"""
        document = self.get_object()
        request = self.request

        # Check if user has permission to edit
        if not request.user.is_staff:
            if document.owner != request.user and document.department != request.user.department:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('You do not have permission to edit this document')

        # Extract keywords before validation
        keywords = serializer.validated_data.pop('keywords', None)

        # Update document fields
        for field, value in serializer.validated_data.items():
            setattr(document, field, value)
        document.save()

        # Update tags if keywords provided
        if keywords is not None:
            self._update_tags(document, keywords)

        # Log the metadata change
        from apps.audit.utils import log_action
        log_action(
            user=request.user,
            action='EDIT',
            resource_type='Document',
            resource_id=document.id,
            resource_name=document.title,
            metadata={'changed_fields': list(serializer.validated_data.keys())}
        )

        logger.info(
            f"Document metadata updated: {document.id} ({document.title}) "
            f"by user {request.user.username}"
        )

    def _update_tags(self, document, keywords):
        """Create/associate tags from keywords"""
        from apps.documents.models import Tag, DocumentTag

        # Remove existing tags
        DocumentTag.objects.filter(document=document).delete()

        # Add new tags
        for keyword in keywords:
            # Get or create tag
            tag, created = Tag.objects.get_or_create(
                name=keyword.lower(),
                defaults={
                    'created_by': self.request.user,
                    'department': document.department
                }
            )

            # Create document-tag relationship
            DocumentTag.objects.create(
                document=document,
                tag=tag,
                created_by=self.request.user
            )

        logger.info(f"Updated {len(keywords)} tags for document {document.id}")


@extend_schema(
    tags=['Metadata'],
    request=BulkMetadataUpdateSerializer,
    responses={
        200: OpenApiResponse(description='Bulk update results'),
        400: OpenApiResponse(description='Validation error'),
        403: OpenApiResponse(description='Permission denied'),
    }
)
class BulkMetadataUpdateView(APIView):
    """
    Update metadata for multiple documents at once.

    Useful for batch operations like:
    - Updating confidentiality level for multiple documents
    - Changing retention period for a group of documents
    - Moving multiple documents to a new folder
    - Updating department assignment
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Perform bulk metadata update"""
        from apps.documents.serializers import BulkMetadataUpdateSerializer
        from django.db import transaction

        # Validate request data
        serializer = BulkMetadataUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        document_ids = serializer.validated_data['document_ids']
        metadata_updates = serializer.validated_data['metadata']

        # Get documents
        documents = Document.objects.filter(id__in=document_ids)

        # Check permissions for each document
        for doc in documents:
            if not request.user.is_staff:
                if doc.owner != request.user and doc.department != request.user.department:
                    return Response(
                        {
                            'error': 'Permission denied',
                            'detail': f'No permission to edit document: {doc.title}'
                        },
                        status=status.HTTP_403_FORBIDDEN
                    )

        # Perform bulk update in transaction
        updated_count = 0
        errors = []

        with transaction.atomic():
            for doc in documents:
                try:
                    # Update metadata fields
                    for field, value in metadata_updates.items():
                        # Handle special field conversions
                        if field == 'document_date' and isinstance(value, str):
                            from datetime import datetime
                            value = datetime.strptime(value, '%Y-%m-%d').date()

                        if field == 'folder' and isinstance(value, str):
                            from apps.folders.models import Folder
                            value = Folder.objects.get(id=value)

                        setattr(doc, field, value)

                    doc.save()
                    updated_count += 1

                    # Log the change
                    from apps.audit.utils import log_action
                    log_action(
                        user=request.user,
                        action='BULK_EDIT',
                        resource_type='Document',
                        resource_id=doc.id,
                        resource_name=doc.title,
                        metadata={'updated_fields': list(metadata_updates.keys())}
                    )

                except Exception as e:
                    errors.append({
                        'document_id': str(doc.id),
                        'error': str(e)
                    })
                    logger.error(f"Error updating document {doc.id}: {e}")

        logger.info(
            f"Bulk metadata update completed: {updated_count} documents updated "
            f"by user {request.user.username}"
        )

        return Response({
            'updated': updated_count,
            'total': len(document_ids),
            'errors': errors
        })


@extend_schema(
    tags=['Tags'],
    responses={
        200: TagSerializer(many=True),
    }
)
class TagListCreateView(generics.ListCreateAPIView):
    """
    List all tags or create a new tag.

    Tags are used for document classification and categorization.
    Can be department-specific or global.
    """
    serializer_class = TagSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Get tags filtered by department"""
        user = self.request.user
        queryset = Tag.objects.all()

        if not user.is_staff:
            # Show department tags and global tags (no department)
            queryset = queryset.filter(
                models.Q(department=user.department) | models.Q(department__isnull=True)
            )

        # Optional filtering by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)

        # Optional search by name
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(name__icontains=search)

        return queryset.order_by('name')

    def perform_create(self, serializer):
        """Create tag with ownership"""
        tag = serializer.save(
            created_by=self.request.user,
            department=self.request.user.department
        )
        logger.info(f"Tag created: {tag.name} by user {self.request.user.username}")


@extend_schema(
    tags=['Tags'],
    responses={
        200: TagSerializer,
        404: OpenApiResponse(description='Tag not found'),
    }
)
class TagDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a tag.
    """
    serializer_class = TagSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter tags by permissions"""
        user = self.request.user
        queryset = Tag.objects.all()

        if not user.is_staff:
            # Can only modify own department's tags
            queryset = queryset.filter(created_by=user)

        return queryset


# Document Versioning Views

@extend_schema(
    tags=['Document Versions'],
    request=parsers.MultiPartParser,
    responses={
        201: DocumentVersionDetailSerializer,
        400: OpenApiResponse(description='Validation error'),
        403: OpenApiResponse(description='Permission denied'),
        404: OpenApiResponse(description='Document not found'),
    }
)
class DocumentVersionUploadView(APIView):
    """
    Upload a new version of a document.

    Creates a new version snapshot while preserving the complete version history.
    The main document record is updated to point to the latest version.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def post(self, request, pk):
        """Upload new version"""
        from apps.documents.models import DocumentVersion
        from apps.documents.serializers import DocumentVersionUploadSerializer, DocumentVersionDetailSerializer

        # Get document
        try:
            document = Document.objects.get(pk=pk)
        except Document.DoesNotExist:
            raise Http404('Document not found')

        # Check permission
        if not request.user.is_staff:
            if document.owner != request.user and document.department != request.user.department:
                return Response(
                    {'error': 'You do not have permission to modify this document'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Validate and create version
        serializer = DocumentVersionUploadSerializer(
            data=request.data,
            context={'request': request, 'document': document}
        )
        serializer.is_valid(raise_exception=True)

        try:
            version = serializer.save()

            logger.info(
                f"New version {version.version_number} uploaded for document {document.id} "
                f"by user {request.user.username}"
            )

            # Return version details
            response_serializer = DocumentVersionDetailSerializer(version, context={'request': request})
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


@extend_schema(
    tags=['Document Versions'],
    responses={
        200: DocumentVersionListSerializer(many=True),
        404: OpenApiResponse(description='Document not found'),
    }
)
class DocumentVersionListView(generics.ListAPIView):
    """
    List all versions of a document.

    Returns version history ordered by version number (newest first).
    """
    serializer_class = DocumentVersionListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Get versions for document"""
        from apps.documents.models import DocumentVersion

        document_id = self.kwargs['pk']

        # Check if document exists and user has access
        try:
            document = Document.objects.get(pk=document_id)
        except Document.DoesNotExist:
            raise Http404('Document not found')

        # Check permissions
        if not self.request.user.is_staff:
            if document.department != self.request.user.department:
                raise Http404('Document not found')

        return DocumentVersion.objects.filter(
            document_id=document_id
        ).select_related('created_by').order_by('-version_number')


@extend_schema(
    tags=['Document Versions'],
    responses={
        200: DocumentVersionDetailSerializer,
        404: OpenApiResponse(description='Version not found'),
    }
)
class DocumentVersionDetailView(generics.RetrieveAPIView):
    """
    Get details of a specific document version.
    """
    serializer_class = DocumentVersionDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Get specific version"""
        from apps.documents.models import DocumentVersion

        document_id = self.kwargs['pk']
        version_number = self.kwargs['version_number']

        # Check if document exists and user has access
        try:
            document = Document.objects.get(pk=document_id)
        except Document.DoesNotExist:
            raise Http404('Document not found')

        # Check permissions
        if not self.request.user.is_staff:
            if document.department != self.request.user.department:
                raise Http404('Document not found')

        return DocumentVersion.objects.filter(
            document_id=document_id,
            version_number=version_number
        ).select_related('created_by', 'document')

    def get_object(self):
        """Get the version object"""
        queryset = self.get_queryset()
        obj = queryset.first()
        if not obj:
            raise Http404('Version not found')
        return obj


@extend_schema(
    tags=['Document Versions'],
    request=VersionRestoreSerializer,
    responses={
        200: DocumentVersionDetailSerializer,
        400: OpenApiResponse(description='Validation error'),
        403: OpenApiResponse(description='Permission denied'),
        404: OpenApiResponse(description='Document/Version not found'),
    }
)
class DocumentVersionRestoreView(APIView):
    """
    Restore a document to a previous version.

    This creates a new version using the content from the specified previous version.
    The version history is preserved (we don't actually delete or revert).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        """Restore to previous version"""
        from apps.documents.utils import restore_version
        from apps.documents.serializers import VersionRestoreSerializer, DocumentVersionDetailSerializer

        # Get document
        try:
            document = Document.objects.get(pk=pk)
        except Document.DoesNotExist:
            raise Http404('Document not found')

        # Check permission
        if not request.user.is_staff:
            if document.owner != request.user:
                return Response(
                    {'error': 'You do not have permission to restore this document'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Validate request
        serializer = VersionRestoreSerializer(
            data=request.data,
            context={'document': document}
        )
        serializer.is_valid(raise_exception=True)

        version_number = serializer.validated_data['version_number']

        try:
            # Restore version
            new_version = restore_version(document, version_number, request.user)

            logger.info(
                f"Document {document.id} restored to version {version_number}, "
                f"created new version {new_version.version_number} by user {request.user.username}"
            )

            # Return new version details
            response_serializer = DocumentVersionDetailSerializer(new_version, context={'request': request})
            return Response(response_serializer.data)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


@extend_schema(
    tags=['Document Versions'],
    parameters=[
        OpenApiParameter(
            name='version1',
            type=int,
            location=OpenApiParameter.QUERY,
            description='First version number to compare',
            required=True
        ),
        OpenApiParameter(
            name='version2',
            type=int,
            location=OpenApiParameter.QUERY,
            description='Second version number to compare',
            required=True
        ),
    ],
    responses={
        200: OpenApiResponse(description='Version comparison data'),
        400: OpenApiResponse(description='Validation error'),
        404: OpenApiResponse(description='Document/Version not found'),
    }
)
class DocumentVersionCompareView(APIView):
    """
    Compare two versions of a document.

    Returns detailed comparison including file size differences,
    time between versions, and change summaries.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        """Compare two versions"""
        from apps.documents.models import DocumentVersion
        from apps.documents.utils import compare_versions

        # Get document
        try:
            document = Document.objects.get(pk=pk)
        except Document.DoesNotExist:
            raise Http404('Document not found')

        # Check permissions
        if not request.user.is_staff:
            if document.department != request.user.department:
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Get version numbers from query params
        version1_num = request.query_params.get('version1')
        version2_num = request.query_params.get('version2')

        if not version1_num or not version2_num:
            return Response(
                {'error': 'Both version1 and version2 query parameters are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            version1_num = int(version1_num)
            version2_num = int(version2_num)
        except ValueError:
            return Response(
                {'error': 'Version numbers must be integers'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get versions
        try:
            version1 = DocumentVersion.objects.get(
                document=document,
                version_number=version1_num
            )
            version2 = DocumentVersion.objects.get(
                document=document,
                version_number=version2_num
            )
        except DocumentVersion.DoesNotExist:
            return Response(
                {'error': 'One or both versions not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Compare versions
        comparison = compare_versions(version1, version2)

        return Response(comparison)


@extend_schema(
    tags=['Document Versions'],
    responses={
        200: OpenApiResponse(description='Version statistics'),
        404: OpenApiResponse(description='Document not found'),
    }
)
class DocumentVersionStatsView(APIView):
    """
    Get statistics about document versions.

    Returns comprehensive statistics including version count,
    storage usage, and version history timeline.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        """Get version statistics"""
        from apps.documents.utils import get_version_statistics

        # Get document
        try:
            document = Document.objects.get(pk=pk)
        except Document.DoesNotExist:
            raise Http404('Document not found')

        # Check permissions
        if not request.user.is_staff:
            if document.department != request.user.department:
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Get statistics
        stats = get_version_statistics(document)

        return Response(stats)


# ============================================================================
# BULK OPERATIONS VIEWS
# ============================================================================

@extend_schema(
    tags=['Bulk Operations'],
    request=inline_serializer(
        'BulkMoveRequest',
        fields={
            'document_ids': serializers.ListField(child=serializers.UUIDField()),
            'target_folder_id': serializers.UUIDField(),
        }
    ),
    responses={
        200: OpenApiResponse(description='Documents moved successfully'),
        400: OpenApiResponse(description='Validation error'),
        403: OpenApiResponse(description='Permission denied'),
        404: OpenApiResponse(description='Folder or documents not found'),
    }
)
class BulkMoveDocumentsView(APIView):
    """
    Bulk move documents to a different folder.

    Endpoint: POST /api/documents/bulk-move/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Move multiple documents to target folder"""
        from apps.documents.serializers import BulkMoveSerializer
        from django.db import transaction

        # Validate request
        serializer = BulkMoveSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        documents = serializer.validated_data['documents']
        target_folder = serializer.validated_data['target_folder']

        # Perform bulk move in transaction
        try:
            with transaction.atomic():
                moved_count = 0
                for doc in documents:
                    doc.folder = target_folder
                    doc.save(update_fields=['folder', 'updated_at'])
                    moved_count += 1

                    # TODO: Create audit log entry
                    logger.info(
                        f"Document {doc.id} moved to folder {target_folder.id} by user {request.user.id}"
                    )

            return Response({
                'message': f'Successfully moved {moved_count} document(s)',
                'moved_count': moved_count,
                'target_folder': {
                    'id': str(target_folder.id),
                    'name': target_folder.name,
                    'path': target_folder.path
                }
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error during bulk move: {str(e)}", exc_info=True)
            return Response(
                {'error': 'An error occurred during bulk move operation'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@extend_schema(
    tags=['Bulk Operations'],
    request=inline_serializer(
        'BulkCopyRequest',
        fields={
            'document_ids': serializers.ListField(child=serializers.UUIDField()),
            'target_folder_id': serializers.UUIDField(),
            'copy_versions': serializers.BooleanField(default=False),
        }
    ),
    responses={
        201: OpenApiResponse(description='Documents copied successfully'),
        400: OpenApiResponse(description='Validation error'),
        403: OpenApiResponse(description='Permission denied'),
        404: OpenApiResponse(description='Folder or documents not found'),
    }
)
class BulkCopyDocumentsView(APIView):
    """
    Bulk copy documents to a different folder.

    Creates duplicates with new UUIDs.
    Endpoint: POST /api/documents/bulk-copy/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Copy multiple documents to target folder"""
        from apps.documents.serializers import BulkCopySerializer
        from django.db import transaction
        from django.core.files.base import ContentFile
        import uuid

        # Validate request
        serializer = BulkCopySerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        documents = serializer.validated_data['documents']
        target_folder = serializer.validated_data['target_folder']
        copy_versions = serializer.validated_data.get('copy_versions', False)

        # Perform bulk copy in transaction
        try:
            with transaction.atomic():
                copied_documents = []

                for doc in documents:
                    # Create new document instance
                    new_doc = Document(
                        id=uuid.uuid4(),
                        title=f"{doc.title} (Copy)",
                        file_name=doc.file_name,
                        file_size=doc.file_size,
                        file_type=doc.file_type,
                        checksum=doc.checksum,
                        document_type=doc.document_type,
                        identifier=doc.identifier,
                        document_date=doc.document_date,
                        creator_source=doc.creator_source,
                        confidentiality_level=doc.confidentiality_level,
                        retention_period_years=doc.retention_period_years,
                        folder=target_folder,
                        owner=request.user,
                        department=target_folder.department,
                        version_number=1,
                        created_by=request.user,
                        extracted_text=doc.extracted_text,
                        ocr_confidence=doc.ocr_confidence,
                        is_indexed=False,  # Will need re-indexing
                    )

                    # Copy file content
                    if doc.file:
                        doc.file.open('rb')
                        file_content = doc.file.read()
                        doc.file.close()
                        new_doc.file.save(doc.file_name, ContentFile(file_content), save=False)

                    new_doc.save()
                    copied_documents.append(new_doc)

                    # Copy versions if requested
                    if copy_versions:
                        versions = DocumentVersion.objects.filter(document=doc).order_by('version_number')
                        for version in versions:
                            new_version = DocumentVersion(
                                id=uuid.uuid4(),
                                document=new_doc,
                                version_number=version.version_number,
                                file_name=version.file_name,
                                file_size=version.file_size,
                                file_type=version.file_type,
                                checksum=version.checksum,
                                change_description=version.change_description,
                                is_major_version=version.is_major_version,
                                created_by=request.user,
                            )

                            # Copy version file
                            if version.file:
                                version.file.open('rb')
                                version_content = version.file.read()
                                version.file.close()
                                new_version.file.save(version.file_name, ContentFile(version_content), save=False)

                            new_version.save()

                    logger.info(
                        f"Document {doc.id} copied to {new_doc.id} in folder {target_folder.id} by user {request.user.id}"
                    )

                return Response({
                    'message': f'Successfully copied {len(copied_documents)} document(s)',
                    'copied_count': len(copied_documents),
                    'target_folder': {
                        'id': str(target_folder.id),
                        'name': target_folder.name,
                        'path': target_folder.path
                    },
                    'new_document_ids': [str(doc.id) for doc in copied_documents]
                }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error during bulk copy: {str(e)}", exc_info=True)
            return Response(
                {'error': 'An error occurred during bulk copy operation'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@extend_schema(
    tags=['Bulk Operations'],
    request=inline_serializer(
        'BulkDeleteRequest',
        fields={
            'document_ids': serializers.ListField(child=serializers.UUIDField()),
            'permanent': serializers.BooleanField(default=False),
        }
    ),
    responses={
        200: OpenApiResponse(description='Documents deleted successfully'),
        400: OpenApiResponse(description='Validation error'),
        403: OpenApiResponse(description='Permission denied'),
        404: OpenApiResponse(description='Documents not found'),
    }
)
class BulkDeleteDocumentsView(APIView):
    """
    Bulk delete documents (soft delete by default).

    Endpoint: POST /api/documents/bulk-delete/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Delete multiple documents"""
        from apps.documents.serializers import BulkDeleteSerializer
        from django.db import transaction
        from django.utils import timezone

        # Validate request
        serializer = BulkDeleteSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        documents = serializer.validated_data['documents']
        permanent = serializer.validated_data.get('permanent', False)

        # Perform bulk delete in transaction
        try:
            with transaction.atomic():
                deleted_count = 0

                if permanent:
                    # Permanent deletion (admin only)
                    for doc in documents:
                        doc_id = str(doc.id)
                        doc.delete()
                        deleted_count += 1
                        logger.warning(
                            f"Document {doc_id} permanently deleted by user {request.user.id}"
                        )
                else:
                    # Soft delete
                    for doc in documents:
                        doc.is_deleted = True
                        doc.deleted_at = timezone.now()
                        doc.save(update_fields=['is_deleted', 'deleted_at', 'updated_at'])
                        deleted_count += 1
                        logger.info(
                            f"Document {doc.id} soft deleted by user {request.user.id}"
                        )

                return Response({
                    'message': f'Successfully deleted {deleted_count} document(s)',
                    'deleted_count': deleted_count,
                    'permanent': permanent
                }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error during bulk delete: {str(e)}", exc_info=True)
            return Response(
                {'error': 'An error occurred during bulk delete operation'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@extend_schema(
    tags=['Bulk Operations'],
    request=inline_serializer(
        'BulkExportRequest',
        fields={
            'document_ids': serializers.ListField(child=serializers.UUIDField()),
            'include_metadata': serializers.BooleanField(default=True),
            'archive_name': serializers.CharField(required=False),
        }
    ),
    responses={
        200: OpenApiResponse(
            description='ZIP file download',
            response={'type': 'file', 'format': 'binary'}
        ),
        400: OpenApiResponse(description='Validation error'),
        403: OpenApiResponse(description='Permission denied'),
        404: OpenApiResponse(description='Documents not found'),
    }
)
class BulkExportDocumentsView(APIView):
    """
    Bulk export documents as ZIP file.

    Endpoint: POST /api/documents/bulk-export/
    Returns: ZIP file download
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Export multiple documents as ZIP"""
        from apps.documents.serializers import BulkExportSerializer
        from django.http import HttpResponse
        import zipfile
        import io
        import json
        from datetime import datetime

        # Validate request
        serializer = BulkExportSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        documents = serializer.validated_data['documents']
        include_metadata = serializer.validated_data.get('include_metadata', True)
        archive_name = serializer.validated_data.get('archive_name', f'documents_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}')

        try:
            # Create ZIP file in memory
            zip_buffer = io.BytesIO()

            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                # Track filenames to handle duplicates
                file_names = {}

                for doc in documents:
                    # Get unique filename
                    base_name = doc.file_name
                    if base_name in file_names:
                        file_names[base_name] += 1
                        name, ext = base_name.rsplit('.', 1) if '.' in base_name else (base_name, '')
                        unique_name = f"{name}_{file_names[base_name]}.{ext}" if ext else f"{name}_{file_names[base_name]}"
                    else:
                        file_names[base_name] = 1
                        unique_name = base_name

                    # Add file to ZIP
                    if doc.file:
                        doc.file.open('rb')
                        zip_file.writestr(unique_name, doc.file.read())
                        doc.file.close()

                # Add metadata JSON if requested
                if include_metadata:
                    metadata = []
                    for doc in documents:
                        metadata.append({
                            'id': str(doc.id),
                            'title': doc.title,
                            'file_name': doc.file_name,
                            'file_size': doc.file_size,
                            'file_type': doc.file_type,
                            'document_type': doc.document_type,
                            'identifier': doc.identifier,
                            'document_date': doc.document_date.isoformat() if doc.document_date else None,
                            'creator_source': doc.creator_source,
                            'confidentiality_level': doc.confidentiality_level,
                            'version_number': doc.version_number,
                            'created_at': doc.created_at.isoformat(),
                            'owner': doc.owner.get_full_name() if doc.owner else None,
                            'department': doc.department.name if doc.department else None,
                        })

                    zip_file.writestr(
                        'metadata.json',
                        json.dumps(metadata, indent=2)
                    )

            # Prepare response
            zip_buffer.seek(0)
            response = HttpResponse(zip_buffer.read(), content_type='application/zip')
            response['Content-Disposition'] = f'attachment; filename="{archive_name}.zip"'

            logger.info(
                f"Bulk export of {len(documents)} documents by user {request.user.id}"
            )

            return response

        except Exception as e:
            logger.error(f"Error during bulk export: {str(e)}", exc_info=True)
            return Response(
                {'error': 'An error occurred during bulk export operation'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================================================
# THUMBNAIL & CONVERSION VIEWS
# ============================================================================

@extend_schema(
    tags=['Documents'],
    responses={
        202: OpenApiResponse(description='Thumbnail generation task started'),
        403: OpenApiResponse(description='Permission denied'),
        404: OpenApiResponse(description='Document not found'),
    }
)
class DocumentGenerateThumbnailView(APIView):
    """
    Generate thumbnail for a document.

    Triggers Celery task to create 200x200 thumbnail.
    Supports images and PDFs.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, id):
        """Trigger thumbnail generation"""
        try:
            document = Document.objects.get(pk=id, is_deleted=False)
        except Document.DoesNotExist:
            raise Http404('Document not found')

        # Check permission
        if not request.user.is_staff:
            if document.department != request.user.department:
                return Response(
                    {'error': 'You do not have permission to access this document'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Trigger Celery task
        from apps.workflows.tasks import generate_thumbnail
        task = generate_thumbnail.delay(str(document.id))

        logger.info(
            f"Thumbnail generation task started for document {document.id} "
            f"by user {request.user.id}, task_id={task.id}"
        )

        return Response({
            'message': 'Thumbnail generation started',
            'task_id': task.id,
            'document_id': str(document.id),
            'document_name': document.file_name
        }, status=status.HTTP_202_ACCEPTED)


@extend_schema(
    tags=['Documents'],
    responses={
        202: OpenApiResponse(description='PDF conversion task started'),
        400: OpenApiResponse(description='File type not supported'),
        403: OpenApiResponse(description='Permission denied'),
        404: OpenApiResponse(description='Document not found'),
    }
)
class DocumentConvertToPDFView(APIView):
    """
    Convert Office document to PDF.

    Triggers Celery task to convert document to PDF format.
    Supports Word, Excel, PowerPoint, and LibreOffice formats.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, id):
        """Trigger PDF conversion"""
        try:
            document = Document.objects.get(pk=id, is_deleted=False)
        except Document.DoesNotExist:
            raise Http404('Document not found')

        # Check permission
        if not request.user.is_staff:
            if document.department != request.user.department:
                return Response(
                    {'error': 'You do not have permission to access this document'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Check if file type is convertible
        convertible_types = {
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.ms-powerpoint',
            'application/vnd.oasis.opendocument.text',
            'application/vnd.oasis.opendocument.spreadsheet',
            'application/vnd.oasis.opendocument.presentation',
        }

        if document.file_type not in convertible_types:
            return Response({
                'error': f'PDF conversion not supported for {document.file_type}',
                'supported_types': list(convertible_types)
            }, status=status.HTTP_400_BAD_REQUEST)

        # Trigger Celery task
        from apps.workflows.tasks import convert_to_pdf
        task = convert_to_pdf.delay(str(document.id))

        logger.info(
            f"PDF conversion task started for document {document.id} "
            f"by user {request.user.id}, task_id={task.id}"
        )

        return Response({
            'message': 'PDF conversion started',
            'task_id': task.id,
            'document_id': str(document.id),
            'document_name': document.file_name
        }, status=status.HTTP_202_ACCEPTED)


@extend_schema(
    tags=['Documents'],
    responses={
        200: OpenApiResponse(description='Thumbnail image'),
        404: OpenApiResponse(description='Thumbnail not found'),
    }
)
class DocumentThumbnailView(APIView):
    """
    Get document thumbnail.

    Returns the generated thumbnail image.
    Generates thumbnail on-demand if not available.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, id):
        """Get thumbnail"""
        try:
            document = Document.objects.get(pk=id, is_deleted=False)
        except Document.DoesNotExist:
            raise Http404('Document not found')

        # Check permission
        if not request.user.is_staff:
            if document.department != request.user.department:
                return Response(
                    {'error': 'You do not have permission to access this document'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Check if thumbnail exists
        if document.thumbnail_path:
            from django.core.files.storage import default_storage

            if default_storage.exists(document.thumbnail_path):
                # Generate presigned URL for thumbnail
                from apps.documents.storage import generate_presigned_url
                thumbnail_url = generate_presigned_url(
                    document.thumbnail_path,
                    expiration=3600,
                    inline=True
                )

                return Response({
                    'thumbnail_url': thumbnail_url,
                    'thumbnail_path': document.thumbnail_path,
                    'expires_in': 3600
                })

        # Thumbnail doesn't exist - trigger generation
        from apps.workflows.tasks import generate_thumbnail
        task = generate_thumbnail.delay(str(document.id))

        return Response({
            'message': 'Thumbnail not found. Generation started.',
            'task_id': task.id,
            'status': 'generating'
        }, status=status.HTTP_202_ACCEPTED)
