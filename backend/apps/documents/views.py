"""
Views for document management and file operations.
"""
from rest_framework import generics, status, permissions, parsers, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import models
from django.db.models import Q
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse, inline_serializer

from apps.documents.models import Document, Tag, DocumentTag, DocumentShortcut, RecentActivity
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
    DocumentShortcutSerializer,
    DocumentShortcutListSerializer,
    CreateShortcutSerializer,
    DocumentShortcutLocationSerializer,
    BulkCreateShortcutSerializer,
    RecentActivitySerializer,
    RecentActivityListSerializer,
    RecentActivityPinSerializer,
    RecentActivityClearSerializer,
    RecentActivityStatsSerializer,
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
        import traceback

        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            document = serializer.save()
        except Exception as e:
            print(f"Error in DocumentUploadView.create: {e}")
            print(f"Error type: {type(e)}")
            print(f"Full traceback:\n{traceback.format_exc()}")
            raise

        # Log the upload
        logger.info(
            f"Document uploaded: {document.id} by user {request.user.username}"
        )

        # Trigger background text extraction
        try:
            from apps.workflows.tasks import extract_text_and_index
            extract_text_and_index.delay(str(document.id))
            logger.info(f"Text extraction task queued for document {document.id}")
        except Exception as e:
            logger.error(f"Failed to queue text extraction task: {e}")
            # Don't fail the upload if background task queuing fails

        # Return full document details
        response_serializer = DocumentDetailSerializer(document)
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED
        )


@extend_schema(
    tags=['Documents'],
    request=inline_serializer(
        name='CheckDuplicateRequest',
        fields={
            'checksums': serializers.ListField(
                child=serializers.CharField(),
                help_text='List of SHA-256 checksums to check'
            )
        }
    ),
    responses={
        200: inline_serializer(
            name='CheckDuplicateResponse',
            fields={
                'duplicates': serializers.DictField(
                    help_text='Map of checksum to duplicate info (null if no duplicate)'
                )
            }
        ),
    }
)
class CheckDuplicateView(APIView):
    """
    Check if files with given checksums already exist.

    This endpoint allows checking multiple files at once before upload,
    saving users time by detecting duplicates early.

    Request body:
    {
        "checksums": ["abc123...", "def456..."]
    }

    Response:
    {
        "duplicates": {
            "abc123...": {
                "id": "uuid",
                "title": "Existing Document",
                "file_name": "file.pdf",
                "folder_id": "uuid",
                "folder_name": "Folder Name",
                "folder_path": "/path/to/folder",
                "confidentiality_level": "INTERNAL",
                "document_type": "CONTRACT"
            },
            "def456...": null  // No duplicate found
        }
    }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        checksums = request.data.get('checksums', [])

        if not checksums:
            return Response(
                {'error': 'No checksums provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not isinstance(checksums, list):
            return Response(
                {'error': 'checksums must be a list'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Limit to prevent abuse
        if len(checksums) > 50:
            return Response(
                {'error': 'Maximum 50 checksums per request'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Find existing documents with matching checksums
        existing_docs = Document.objects.select_related('folder', 'department').filter(
            checksum__in=checksums,
            is_deleted=False
        )

        # Build response map
        duplicates = {}
        for checksum in checksums:
            doc = next((d for d in existing_docs if d.checksum == checksum), None)
            if doc:
                duplicates[checksum] = {
                    'id': str(doc.id),
                    'title': doc.title,
                    'file_name': doc.file_name,
                    'folder_id': str(doc.folder_id) if doc.folder_id else None,
                    'folder_name': doc.folder.name if doc.folder else None,
                    'folder_path': doc.folder.path if doc.folder else None,
                    'confidentiality_level': doc.confidentiality_level,
                    'document_type': doc.document_type,
                }
            else:
                duplicates[checksum] = None

        return Response({'duplicates': duplicates})


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

        # Debug logging
        logger.info(f"DocumentListView - User: {user.username} (ID: {user.id})")
        logger.info(f"DocumentListView - User Department: {user.department_id}")
        logger.info(f"DocumentListView - Is Staff: {user.is_staff}")
        logger.info(f"DocumentListView - Query Params: {dict(self.request.query_params)}")

        queryset = Document.objects.select_related(
            'owner', 'department', 'folder', 'created_by'
        ).prefetch_related('document_tags__tag').filter(is_deleted=False)

        logger.info(f"DocumentListView - After is_deleted filter: {queryset.count()}")

        # Filter by user's department unless staff
        if not user.is_staff:
            queryset = queryset.filter(department=user.department)
            logger.info(f"DocumentListView - After department filter: {queryset.count()}")

        # Apply filters from query parameters

        # Filter by specific department (for department navigation)
        # Only staff users can filter by any department; regular users are already filtered to their department
        department_param = self.request.query_params.get('department')
        if department_param:
            if user.is_staff:
                # Staff can filter by specific department
                queryset = queryset.filter(department_id=department_param)
                logger.info(f"DocumentListView - After department param filter: {queryset.count()}")
            # Non-staff are already filtered to their department above

        # Filter for root-level documents (no folder)
        folder_isnull = self.request.query_params.get('folder__isnull')
        if folder_isnull and folder_isnull.lower() == 'true':
            queryset = queryset.filter(folder__isnull=True)
            logger.info(f"DocumentListView - After folder__isnull filter: {queryset.count()}")

        folder_id = self.request.query_params.get('folder')
        if folder_id:
            queryset = queryset.filter(folder_id=folder_id)
            logger.info(f"DocumentListView - After folder filter (folder={folder_id}): {queryset.count()}")

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

        final_count = queryset.count()
        logger.info(f"DocumentListView - Final count: {final_count}")

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

    def retrieve(self, request, *args, **kwargs):
        """Override retrieve to log view activity"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)

        # Log recent activity for viewing document
        from apps.documents.signals import log_document_view_activity
        log_document_view_activity(request.user, instance)

        return Response(serializer.data)


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

    Permission checks:
    1. User must be authenticated
    2. User must be owner, superuser, or have can_delete permission via RBAC
    3. Document must not be under legal hold
    """
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        """Filter documents - permission check done in perform_destroy"""
        return Document.objects.filter(is_deleted=False)

    def perform_destroy(self, instance):
        """Soft delete instead of hard delete - with permission and legal hold protection"""
        from django.utils import timezone
        from rest_framework.exceptions import PermissionDenied
        from apps.permissions.utils import PermissionChecker

        user = self.request.user

        # Check permissions using RBAC
        checker = PermissionChecker(user)

        # Allow if: superuser, owner, or has can_delete permission
        has_permission = (
            user.is_superuser or
            instance.owner == user or
            checker.has_global_permission('can_delete')
        )

        # Also check folder-level permission if document is in a folder
        if not has_permission and instance.folder:
            has_permission = checker.has_folder_permission(instance.folder, 'can_delete')

        # Check department permission if document has a department
        if not has_permission and instance.department:
            has_permission = checker.has_department_permission(instance.department, 'can_delete')

        if not has_permission:
            raise PermissionDenied("You do not have permission to delete this document.")

        # Check for active legal holds
        active_holds = instance.legal_holds.filter(is_active=True)
        if active_holds.exists():
            hold_cases = ', '.join([h.case_number for h in active_holds])
            raise PermissionDenied(
                f"Cannot delete document under legal hold. Active cases: {hold_cases}"
            )

        # Delete file from MinIO storage before soft delete
        # This ensures file is removed immediately while keeping database record in trash
        from apps.documents.signals import delete_document_file_from_storage
        delete_document_file_from_storage(instance)

        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.deleted_by = user
        instance.save()

        logger.info(
            f"Document soft deleted: {instance.id} by user {user.username}"
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

            # Check if file exists before any operation
            # For MinIO storage, check minio_object_key; for local storage, check document.file
            has_minio_file = document.minio_object_key and document.minio_bucket
            has_local_file = document.file and document.file.name

            if not has_minio_file and not has_local_file:
                return Response(
                    {'error': 'File not found', 'detail': 'This document does not have an associated file. It may have been deleted from storage.'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Verify file actually exists in MinIO storage
            if has_minio_file:
                from apps.storage.services import StorageService
                storage_service = StorageService()
                if not storage_service.file_exists(document.minio_bucket, document.minio_object_key):
                    return Response(
                        {
                            'error': 'file_missing_in_storage',
                            'detail': 'The file no longer exists in storage. The database record may be orphaned.',
                            'document_id': str(document.id),
                            'can_delete': True
                        },
                        status=status.HTTP_404_NOT_FOUND
                    )

            if mode == 'stream':
                # Direct file streaming through Django
                from django.http import FileResponse, HttpResponse
                from wsgiref.util import FileWrapper
                import mimetypes

                try:
                    # Determine content type
                    content_type = document.file_type or mimetypes.guess_type(document.file_name)[0] or 'application/octet-stream'

                    if has_minio_file:
                        # Download from MinIO storage
                        from apps.storage.services import storage_service
                        file_content = storage_service.download_file(document.minio_bucket, document.minio_object_key)

                        if file_content is None:
                            return Response(
                                {'error': 'File not found in storage'},
                                status=status.HTTP_404_NOT_FOUND
                            )

                        response = HttpResponse(file_content, content_type=content_type)
                    else:
                        # Stream from local file storage (legacy)
                        document.file.open('rb')
                        file_wrapper = FileWrapper(document.file)
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

                    # Log recent activity for download
                    from apps.documents.signals import log_document_download_activity
                    log_document_download_activity(user, document)

                    # Audit log: document download/preview
                    try:
                        from apps.audit.utils import log_document_action, get_client_ip, get_user_agent, set_audit_context
                        set_audit_context(user=user, ip_address=get_client_ip(request), user_agent=get_user_agent(request))
                        log_document_action(
                            action='VIEW' if inline else 'DOWNLOAD',
                            document=document,
                            user=user,
                            metadata={
                                'mode': 'stream',
                                'inline': inline,
                                'file_name': document.file_name,
                                'file_size': document.file_size,
                            }
                        )
                    except Exception:
                        pass

                    return response

                except Exception as e:
                    logger.error(f"Error streaming file: {e}", exc_info=True)
                    return Response(
                        {'error': 'Failed to stream file'},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )

            else:
                # Generate presigned URL (default)
                # Prefer MinIO object key, fall back to document.file.name for legacy documents
                file_key = document.minio_object_key if has_minio_file else document.file.name
                download_url = generate_presigned_url(
                    file_key,
                    expiration=expiration,
                    inline=inline
                )

                logger.info(
                    f"Download URL generated for document {document.id} by user {user.id} (expires={expiration}s)"
                )

                # Log recent activity for download
                from apps.documents.signals import log_document_download_activity
                log_document_download_activity(user, document)

                # Audit log: document download/preview via presigned URL
                try:
                    from apps.audit.utils import log_document_action, get_client_ip, get_user_agent, set_audit_context
                    set_audit_context(user=user, ip_address=get_client_ip(request), user_agent=get_user_agent(request))
                    log_document_action(
                        action='VIEW' if inline else 'DOWNLOAD',
                        document=document,
                        user=user,
                        metadata={
                            'mode': 'presigned_url',
                            'inline': inline,
                            'file_name': document.file_name,
                            'file_size': document.file_size,
                            'expiration': expiration,
                        }
                    )
                except Exception:
                    pass

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
            # Provide more specific error messages based on exception type
            error_message = 'Failed to process download request'
            if 'NoCredentialsError' in str(type(e).__name__) or 'credentials' in str(e).lower():
                error_message = 'Storage service credentials not configured'
            elif 'EndpointConnectionError' in str(type(e).__name__) or 'connection' in str(e).lower():
                error_message = 'Cannot connect to storage service (MinIO may not be running)'
            elif 'NoSuchKey' in str(type(e).__name__) or 'NoSuchBucket' in str(type(e).__name__):
                error_message = 'File not found in storage'
            elif 'ClientError' in str(type(e).__name__):
                error_message = f'Storage service error: {str(e)}'
            return Response(
                {'error': error_message, 'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@extend_schema(
    tags=['Documents'],
    responses={
        200: inline_serializer(
            name='DocumentTextContentResponse',
            fields={
                'content': serializers.CharField(),
                'file_name': serializers.CharField(),
                'file_type': serializers.CharField(),
                'file_size': serializers.IntegerField(),
                'language': serializers.CharField(),
                'line_count': serializers.IntegerField(),
            }
        ),
        400: OpenApiResponse(description='File type not supported for text preview'),
        403: OpenApiResponse(description='Permission denied'),
        404: OpenApiResponse(description='Document not found'),
    }
)
class DocumentTextContentView(APIView):
    """
    Get text content of a document for preview.

    Supports text-based files like:
    - Plain text (.txt, .log, .md)
    - Code files (.py, .js, .ts, .java, .cpp, .c, .h, .css, .html, .xml, .json, .yaml, .yml)
    - Config files (.ini, .conf, .cfg, .env)
    - Data files (.csv, .tsv)

    Returns the raw text content with metadata for syntax highlighting.
    """
    permission_classes = [permissions.IsAuthenticated]

    # Supported text file extensions and their language mappings
    SUPPORTED_EXTENSIONS = {
        # Plain text
        '.txt': 'text',
        '.log': 'text',
        '.md': 'markdown',
        '.markdown': 'markdown',
        '.rst': 'restructuredtext',

        # Web
        '.html': 'html',
        '.htm': 'html',
        '.css': 'css',
        '.scss': 'scss',
        '.sass': 'sass',
        '.less': 'less',

        # JavaScript/TypeScript
        '.js': 'javascript',
        '.jsx': 'jsx',
        '.ts': 'typescript',
        '.tsx': 'tsx',
        '.mjs': 'javascript',
        '.cjs': 'javascript',

        # Python
        '.py': 'python',
        '.pyw': 'python',
        '.pyx': 'python',

        # Java/Kotlin
        '.java': 'java',
        '.kt': 'kotlin',
        '.kts': 'kotlin',

        # C/C++
        '.c': 'c',
        '.h': 'c',
        '.cpp': 'cpp',
        '.hpp': 'cpp',
        '.cc': 'cpp',
        '.cxx': 'cpp',

        # C#
        '.cs': 'csharp',

        # Go
        '.go': 'go',

        # Rust
        '.rs': 'rust',

        # Ruby
        '.rb': 'ruby',

        # PHP
        '.php': 'php',

        # Shell
        '.sh': 'bash',
        '.bash': 'bash',
        '.zsh': 'bash',
        '.ps1': 'powershell',
        '.bat': 'batch',
        '.cmd': 'batch',

        # Data formats
        '.json': 'json',
        '.xml': 'xml',
        '.yaml': 'yaml',
        '.yml': 'yaml',
        '.toml': 'toml',
        '.csv': 'csv',
        '.tsv': 'csv',

        # Config
        '.ini': 'ini',
        '.conf': 'text',
        '.cfg': 'ini',
        '.env': 'text',
        '.properties': 'properties',

        # SQL
        '.sql': 'sql',

        # Docker
        'Dockerfile': 'dockerfile',
        '.dockerfile': 'dockerfile',

        # Other
        '.gitignore': 'text',
        '.editorconfig': 'ini',
        'Makefile': 'makefile',
        '.makefile': 'makefile',
    }

    # Maximum file size for text preview (5MB)
    MAX_TEXT_SIZE = 5 * 1024 * 1024

    def get(self, request, id):
        """Get text content of document"""
        try:
            # Get document with permission check
            user = request.user
            document = Document.objects.select_related('department', 'owner').get(id=id, is_deleted=False)

            # Check permissions
            if not user.is_staff and document.department != user.department:
                return Response(
                    {'detail': 'You do not have permission to view this document'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Check file size
            if document.file_size > self.MAX_TEXT_SIZE:
                return Response(
                    {'error': f'File too large for text preview. Maximum size is {self.MAX_TEXT_SIZE // (1024*1024)}MB'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get file extension
            file_name = document.file_name.lower()
            extension = None

            # Check for special filenames (like Dockerfile, Makefile)
            base_name = file_name.split('/')[-1]
            if base_name in self.SUPPORTED_EXTENSIONS:
                extension = base_name
            else:
                # Get extension from filename
                import os
                _, ext = os.path.splitext(file_name)
                extension = ext.lower() if ext else None

            # Check if file type is supported
            if not extension or extension not in self.SUPPORTED_EXTENSIONS:
                return Response(
                    {'error': f'File type not supported for text preview. Supported: {", ".join(sorted(set(self.SUPPORTED_EXTENSIONS.keys())))}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            language = self.SUPPORTED_EXTENSIONS[extension]

            # Read file content
            try:
                # Check for MinIO or local file storage
                has_minio_file = document.minio_object_key and document.minio_bucket
                has_local_file = document.file and document.file.name

                if not has_minio_file and not has_local_file:
                    return Response(
                        {'error': 'File not found', 'detail': 'This document does not have an associated file.'},
                        status=status.HTTP_404_NOT_FOUND
                    )

                if has_minio_file:
                    # Read from MinIO storage
                    from apps.storage.services import storage_service
                    content_bytes = storage_service.download_file(document.minio_bucket, document.minio_object_key)
                    if content_bytes is None:
                        return Response(
                            {'error': 'File not found in storage'},
                            status=status.HTTP_404_NOT_FOUND
                        )
                else:
                    # Read from local file storage (legacy)
                    document.file.open('rb')
                    content_bytes = document.file.read()
                    document.file.close()

                # Try to decode as UTF-8, fallback to latin-1
                try:
                    content = content_bytes.decode('utf-8')
                except UnicodeDecodeError:
                    try:
                        content = content_bytes.decode('latin-1')
                    except UnicodeDecodeError:
                        return Response(
                            {'error': 'Unable to decode file content. File may be binary.'},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                # Count lines
                line_count = content.count('\n') + 1 if content else 0

                # Log view activity
                from apps.documents.signals import log_document_view_activity
                log_document_view_activity(user, document)

                return Response({
                    'content': content,
                    'file_name': document.file_name,
                    'file_type': document.file_type,
                    'file_size': document.file_size,
                    'language': language,
                    'line_count': line_count,
                })

            except Exception as e:
                logger.error(f"Error reading file content: {e}", exc_info=True)
                return Response(
                    {'error': 'Failed to read file content'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        except Document.DoesNotExist:
            raise Http404('Document not found or has been deleted')
        except Exception as e:
            logger.error(f"Error in text content view: {e}", exc_info=True)
            return Response(
                {'error': 'Failed to get text content', 'detail': str(e)},
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
                    from apps.documents.signals import delete_document_file_from_storage
                    for doc in documents:
                        # Delete file from MinIO before soft delete
                        delete_document_file_from_storage(doc)
                        doc.is_deleted = True
                        doc.deleted_at = timezone.now()
                        doc.deleted_by = request.user
                        doc.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by', 'updated_at'])
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


class DocumentExtractTextView(APIView):
    """
    Trigger text extraction for a document.

    Can be used to:
    - Re-extract text after document update
    - Extract text from documents uploaded before this feature
    - Force re-extraction if previous attempt failed

    POST /api/v1/documents/{id}/extract-text/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, id):
        """
        Trigger text extraction task.
        """
        try:
            # Get document
            document = get_object_or_404(Document, pk=id, is_deleted=False)

            # Check permissions
            if not request.user.is_staff and document.department != request.user.department:
                return Response(
                    {'error': 'You do not have permission to extract text from this document'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Check if document type supports text extraction
            supported_types = [
                'application/pdf',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-excel',
                'text/plain',
                'text/csv',
                'application/csv',
            ]

            if document.file_type not in supported_types:
                return Response({
                    'error': f'Text extraction not supported for {document.file_type}',
                    'supported_types': supported_types
                }, status=status.HTTP_400_BAD_REQUEST)

            # Trigger extraction task
            from apps.workflows.tasks import extract_document_text
            task = extract_document_text.delay(str(document.id))

            logger.info(
                f"Text extraction triggered for document {document.id} by user {request.user.username}"
            )

            return Response({
                'message': 'Text extraction started',
                'task_id': task.id,
                'document_id': str(document.id),
                'document_name': document.file_name,
                'file_type': document.file_type,
                'status': 'processing'
            }, status=status.HTTP_202_ACCEPTED)

        except Document.DoesNotExist:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Failed to trigger text extraction: {e}", exc_info=True)
            return Response(
                {'error': 'Failed to start text extraction'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DocumentOCRView(APIView):
    """
    Trigger OCR for a scanned document.

    Used for documents that are scanned images or image-based PDFs.

    POST /api/v1/documents/{id}/ocr/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, id):
        """
        Trigger OCR task.
        """
        try:
            # Get document
            document = get_object_or_404(Document, pk=id, is_deleted=False)

            # Check permissions
            if not request.user.is_staff and document.department != request.user.department:
                return Response(
                    {'error': 'You do not have permission to perform OCR on this document'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Only PDFs support OCR currently
            if document.file_type != 'application/pdf':
                return Response({
                    'error': 'OCR is currently only supported for PDF documents',
                    'document_type': document.file_type
                }, status=status.HTTP_400_BAD_REQUEST)

            # Trigger OCR task
            from apps.workflows.tasks import ocr_document
            task = ocr_document.delay(str(document.id))

            logger.info(
                f"OCR triggered for document {document.id} by user {request.user.username}"
            )

            return Response({
                'message': 'OCR processing started',
                'task_id': task.id,
                'document_id': str(document.id),
                'document_name': document.file_name,
                'status': 'processing',
                'note': 'OCR may take several minutes depending on document size'
            }, status=status.HTTP_202_ACCEPTED)

        except Document.DoesNotExist:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Failed to trigger OCR: {e}", exc_info=True)
            return Response(
                {'error': 'Failed to start OCR processing'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DocumentExtractedTextView(APIView):
    """
    Get extracted text from a document.

    Returns the text that was extracted via text extraction or OCR.

    GET /api/v1/documents/{id}/extracted-text/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, id):
        """
        Retrieve extracted text.
        """
        try:
            # Get document
            document = get_object_or_404(Document, pk=id, is_deleted=False)

            # Check permissions
            if not request.user.is_staff and document.department != request.user.department:
                return Response(
                    {'error': 'You do not have permission to view this document'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Check if text has been extracted
            if not document.extracted_text:
                return Response({
                    'message': 'No extracted text available',
                    'document_id': str(document.id),
                    'has_text': False,
                    'suggestion': 'Trigger text extraction using POST /documents/{id}/extract-text/'
                }, status=status.HTTP_404_NOT_FOUND)

            # Return extracted text with metadata
            return Response({
                'document_id': str(document.id),
                'document_name': document.file_name,
                'file_type': document.file_type,
                'extracted_text': document.extracted_text,
                'text_length': len(document.extracted_text),
                'ocr_confidence': document.ocr_confidence,
                'was_ocr': document.ocr_confidence is not None,
                'has_text': True
            })

        except Document.DoesNotExist:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Failed to retrieve extracted text: {e}", exc_info=True)
            return Response(
                {'error': 'Failed to retrieve extracted text'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================================================
# DOCUMENT SHORTCUT VIEWS
# ============================================================================

@extend_schema(
    tags=['Document Shortcuts'],
    request=CreateShortcutSerializer,
    responses={
        201: DocumentShortcutSerializer,
        400: OpenApiResponse(description='Validation error'),
        403: OpenApiResponse(description='Permission denied'),
        404: OpenApiResponse(description='Document or folder not found'),
    }
)
class DocumentShortcutCreateView(APIView):
    """
    Create a shortcut to a document in another folder.

    A shortcut is a reference to the original document that appears
    in a different folder. The shortcut inherits all metadata from
    the original document and cannot be modified independently.

    POST /api/v1/documents/shortcuts/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Create a new document shortcut"""
        serializer = CreateShortcutSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        shortcut = serializer.save()

        logger.info(
            f"Document shortcut created: document {shortcut.original_document_id} "
            f"-> folder {shortcut.folder_id} by user {request.user.username}"
        )

        response_serializer = DocumentShortcutSerializer(shortcut)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=['Document Shortcuts'],
    parameters=[
        OpenApiParameter(
            name='folder',
            type=str,
            location=OpenApiParameter.QUERY,
            description='Filter shortcuts by folder ID'
        ),
    ],
    responses={
        200: DocumentShortcutListSerializer(many=True),
    }
)
class DocumentShortcutListView(generics.ListAPIView):
    """
    List document shortcuts.

    Can filter by folder to get all shortcuts in a specific folder.

    GET /api/v1/documents/shortcuts/
    GET /api/v1/documents/shortcuts/?folder={folder_id}
    """
    serializer_class = DocumentShortcutListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Get shortcuts filtered by user permissions"""
        user = self.request.user

        queryset = DocumentShortcut.objects.select_related(
            'original_document',
            'original_document__folder',
            'original_document__owner',
            'original_document__department',
            'folder',
            'created_by'
        )

        # Filter by user's department unless staff
        if not user.is_staff:
            queryset = queryset.filter(
                original_document__department=user.department
            )

        # Filter by folder if specified
        folder_id = self.request.query_params.get('folder')
        if folder_id:
            queryset = queryset.filter(folder_id=folder_id)

        return queryset.order_by('-created_at')


@extend_schema(
    tags=['Document Shortcuts'],
    responses={
        200: DocumentShortcutSerializer,
        404: OpenApiResponse(description='Shortcut not found'),
    }
)
class DocumentShortcutDetailView(generics.RetrieveAPIView):
    """
    Get details of a specific shortcut.

    GET /api/v1/documents/shortcuts/{id}/
    """
    serializer_class = DocumentShortcutSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        """Filter shortcuts by user permissions"""
        user = self.request.user

        queryset = DocumentShortcut.objects.select_related(
            'original_document',
            'original_document__folder',
            'original_document__owner',
            'original_document__department',
            'folder',
            'created_by'
        ).prefetch_related('original_document__document_tags__tag')

        if not user.is_staff:
            queryset = queryset.filter(
                original_document__department=user.department
            )

        return queryset


@extend_schema(
    tags=['Document Shortcuts'],
    responses={
        204: OpenApiResponse(description='Shortcut deleted successfully'),
        403: OpenApiResponse(description='Permission denied'),
        404: OpenApiResponse(description='Shortcut not found'),
    }
)
class DocumentShortcutDeleteView(generics.DestroyAPIView):
    """
    Delete a document shortcut.

    This only removes the shortcut reference, not the original document.

    DELETE /api/v1/documents/shortcuts/{id}/
    """
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        """Filter shortcuts by user permissions"""
        user = self.request.user

        queryset = DocumentShortcut.objects.select_related(
            'original_document',
            'original_document__department',
            'folder',
            'created_by'
        )

        # Only creator or staff can delete shortcuts
        if not user.is_staff:
            queryset = queryset.filter(created_by=user)

        return queryset

    def perform_destroy(self, instance):
        """Delete the shortcut"""
        logger.info(
            f"Document shortcut deleted: {instance.id} (document {instance.original_document_id} "
            f"-> folder {instance.folder_id}) by user {self.request.user.username}"
        )
        instance.delete()


@extend_schema(
    tags=['Document Shortcuts'],
    responses={
        200: DocumentShortcutLocationSerializer(many=True),
        404: OpenApiResponse(description='Document not found'),
    }
)
class DocumentShortcutLocationsView(APIView):
    """
    Get all shortcut locations for a document.

    Shows where shortcuts to this document exist.

    GET /api/v1/documents/{id}/shortcut-locations/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, id):
        """Get all shortcut locations for a document"""
        try:
            document = Document.objects.select_related('department').get(
                pk=id, is_deleted=False
            )
        except Document.DoesNotExist:
            raise Http404('Document not found')

        # Check permissions
        if not request.user.is_staff:
            if document.department != request.user.department:
                return Response(
                    {'error': 'You do not have permission to view this document'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Get all shortcuts for this document
        shortcuts = DocumentShortcut.objects.filter(
            original_document=document
        ).select_related('folder', 'created_by')

        serializer = DocumentShortcutLocationSerializer(shortcuts, many=True)

        return Response({
            'document_id': str(document.id),
            'document_title': document.title,
            'shortcut_count': shortcuts.count(),
            'shortcuts': serializer.data
        })


@extend_schema(
    tags=['Document Shortcuts'],
    responses={
        200: OpenApiResponse(description='Deletion allowed status'),
        404: OpenApiResponse(description='Document not found'),
    }
)
class DocumentCanDeleteView(APIView):
    """
    Check if a document can be deleted.

    Returns whether the document can be deleted and any blocking reasons.
    Documents with shortcuts cannot be deleted until shortcuts are removed.

    GET /api/v1/documents/{id}/can-delete/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, id):
        """Check if document can be deleted"""
        try:
            document = Document.objects.select_related('department').get(
                pk=id, is_deleted=False
            )
        except Document.DoesNotExist:
            raise Http404('Document not found')

        # Check permissions
        if not request.user.is_staff:
            if document.owner != request.user:
                return Response(
                    {'error': 'You do not have permission to delete this document'},
                    status=status.HTTP_403_FORBIDDEN
                )

        can_delete, message = document.can_delete()

        response_data = {
            'document_id': str(document.id),
            'document_title': document.title,
            'can_delete': can_delete,
            'message': message
        }

        # If can't delete, include shortcut information
        if not can_delete:
            shortcuts = DocumentShortcut.objects.filter(
                original_document=document
            ).select_related('folder')

            response_data['shortcut_count'] = shortcuts.count()
            response_data['shortcut_locations'] = [
                {
                    'id': str(s.id),
                    'folder_name': s.folder.name,
                    'folder_path': s.folder.path
                }
                for s in shortcuts
            ]

        return Response(response_data)


@extend_schema(
    tags=['Document Shortcuts'],
    request=BulkCreateShortcutSerializer,
    responses={
        201: OpenApiResponse(description='Shortcuts created successfully'),
        400: OpenApiResponse(description='Validation error'),
        403: OpenApiResponse(description='Permission denied'),
    }
)
class BulkCreateShortcutsView(APIView):
    """
    Create shortcuts for multiple documents at once.

    POST /api/v1/documents/shortcuts/bulk/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Create shortcuts for multiple documents"""
        serializer = BulkCreateShortcutSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        result = serializer.save()

        created_shortcuts = result['created']
        skipped = result['skipped']

        logger.info(
            f"Bulk shortcut creation: {len(created_shortcuts)} created, "
            f"{len(skipped['same_folder']) + len(skipped['already_exists'])} skipped "
            f"by user {request.user.username}"
        )

        response_serializer = DocumentShortcutListSerializer(created_shortcuts, many=True)

        return Response({
            'message': f'Created {len(created_shortcuts)} shortcut(s)',
            'created_count': len(created_shortcuts),
            'created': response_serializer.data,
            'skipped': {
                'same_folder': skipped['same_folder'],
                'already_exists': skipped['already_exists'],
                'total': len(skipped['same_folder']) + len(skipped['already_exists'])
            }
        }, status=status.HTTP_201_CREATED)


# ============================================================================
# RECENT ACTIVITY VIEWS
# ============================================================================

@extend_schema(
    tags=['Recent Activities'],
    parameters=[
        OpenApiParameter(
            name='activity_type',
            type=str,
            location=OpenApiParameter.QUERY,
            description='Filter by activity type (VIEWED, EDITED, UPLOADED, DOWNLOADED, SHARED)',
            enum=['VIEWED', 'EDITED', 'UPLOADED', 'DOWNLOADED', 'SHARED']
        ),
        OpenApiParameter(
            name='resource_type',
            type=str,
            location=OpenApiParameter.QUERY,
            description='Filter by resource type (DOCUMENT, FOLDER)',
            enum=['DOCUMENT', 'FOLDER']
        ),
        OpenApiParameter(
            name='days',
            type=int,
            location=OpenApiParameter.QUERY,
            description='Number of days to look back (default: 30, max: 30)'
        ),
        OpenApiParameter(
            name='pinned_only',
            type=bool,
            location=OpenApiParameter.QUERY,
            description='Only show pinned items'
        ),
        OpenApiParameter(
            name='limit',
            type=int,
            location=OpenApiParameter.QUERY,
            description='Maximum number of results (default: 50, max: 200)'
        ),
    ],
    responses={
        200: RecentActivitySerializer(many=True),
    }
)
class RecentActivityListView(generics.ListAPIView):
    """
    List user's recent activities.

    Returns activities grouped by time (Today, Yesterday, This Week, etc.)
    with support for filtering by activity type, resource type, and date range.

    Features:
    - Pinned items appear first
    - Time-based grouping for UI display
    - Configurable retention period (default: 30 days)
    - Activity type filtering (VIEWED, EDITED, UPLOADED, DOWNLOADED, SHARED)
    - Resource type filtering (DOCUMENT, FOLDER)

    GET /api/v1/recent/
    """
    serializer_class = RecentActivityListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Get recent activities for the authenticated user"""
        from datetime import timedelta

        user = self.request.user

        # Base queryset - user's activities
        queryset = RecentActivity.objects.filter(user=user)

        # Filter by days (default 30, max 30)
        days = min(int(self.request.query_params.get('days', 30)), 30)
        cutoff_date = timezone.now() - timedelta(days=days)
        queryset = queryset.filter(timestamp__gte=cutoff_date)

        # Filter by activity type
        activity_type = self.request.query_params.get('activity_type')
        if activity_type:
            queryset = queryset.filter(activity_type=activity_type.upper())

        # Filter by resource type
        resource_type = self.request.query_params.get('resource_type')
        if resource_type:
            queryset = queryset.filter(resource_type=resource_type.upper())

        # Filter pinned only
        pinned_only = self.request.query_params.get('pinned_only', '').lower() == 'true'
        if pinned_only:
            queryset = queryset.filter(is_pinned=True)

        # Order: pinned first, then by timestamp
        queryset = queryset.order_by('-is_pinned', '-timestamp')

        # Apply limit (default 50, max 200)
        limit = min(int(self.request.query_params.get('limit', 50)), 200)

        return queryset[:limit]

    def list(self, request, *args, **kwargs):
        """Override list to add grouping information"""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)

        # Group activities by time
        grouped = {
            'today': [],
            'yesterday': [],
            'this_week': [],
            'last_week': [],
            'this_month': [],
            'older': []
        }

        for item in serializer.data:
            time_group = item.get('time_group', 'older')
            grouped[time_group].append(item)

        # Get pinned items separately
        pinned = [item for item in serializer.data if item.get('is_pinned')]

        return Response({
            'count': len(serializer.data),
            'pinned_count': len(pinned),
            'pinned': pinned,
            'grouped': grouped,
            'results': serializer.data
        })


@extend_schema(
    tags=['Recent Activities'],
    responses={
        200: RecentActivitySerializer,
        404: OpenApiResponse(description='Activity not found'),
    }
)
class RecentActivityDetailView(generics.RetrieveAPIView):
    """
    Get details of a specific recent activity.

    GET /api/v1/recent/{id}/
    """
    serializer_class = RecentActivitySerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        """Only allow user to see their own activities"""
        return RecentActivity.objects.filter(user=self.request.user)


@extend_schema(
    tags=['Recent Activities'],
    request=RecentActivityPinSerializer,
    responses={
        200: RecentActivitySerializer,
        400: OpenApiResponse(description='Pin limit reached or validation error'),
        404: OpenApiResponse(description='Activity not found'),
    }
)
class RecentActivityPinView(APIView):
    """
    Pin or unpin a recent activity item.

    Users can pin up to 10 items (configurable via MAX_PINNED_ITEMS).
    Pinned items appear at the top of the recent activities list.

    POST /api/v1/recent/{id}/pin/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, id):
        """Pin or unpin an activity"""
        try:
            activity = RecentActivity.objects.get(id=id, user=request.user)
        except RecentActivity.DoesNotExist:
            return Response(
                {'error': 'Activity not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = RecentActivityPinSerializer(
            data=request.data,
            context={'activity': activity}
        )
        serializer.is_valid(raise_exception=True)

        is_pinned = serializer.validated_data['is_pinned']

        if is_pinned:
            success = activity.pin()
            action = 'pinned'
        else:
            success = activity.unpin()
            action = 'unpinned'

        if not success:
            return Response(
                {'error': f'Failed to {action} item'},
                status=status.HTTP_400_BAD_REQUEST
            )

        logger.info(
            f"Recent activity {id} {action} by user {request.user.username}"
        )

        response_serializer = RecentActivitySerializer(activity)
        return Response(response_serializer.data)


@extend_schema(
    tags=['Recent Activities'],
    request=RecentActivityClearSerializer,
    responses={
        200: OpenApiResponse(description='Activities cleared'),
        400: OpenApiResponse(description='Validation error'),
    }
)
class RecentActivityClearView(APIView):
    """
    Clear recent activity history by date range.

    Allows users to clear their history while optionally preserving pinned items.

    DELETE /api/v1/recent/clear/
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        """Clear activities before a specific date"""
        serializer = RecentActivityClearSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        before_date = serializer.validated_data['before_date']
        activity_type = serializer.validated_data.get('activity_type')
        resource_type = serializer.validated_data.get('resource_type')
        exclude_pinned = serializer.validated_data.get('exclude_pinned', True)

        # Build query
        queryset = RecentActivity.objects.filter(
            user=request.user,
            timestamp__lt=before_date
        )

        if activity_type:
            queryset = queryset.filter(activity_type=activity_type)

        if resource_type:
            queryset = queryset.filter(resource_type=resource_type)

        if exclude_pinned:
            queryset = queryset.filter(is_pinned=False)

        # Count and delete
        count = queryset.count()
        queryset.delete()

        logger.info(
            f"Cleared {count} recent activities for user {request.user.username} "
            f"(before {before_date}, exclude_pinned={exclude_pinned})"
        )

        return Response({
            'message': f'Cleared {count} activity entries',
            'cleared_count': count,
            'before_date': before_date.isoformat(),
            'excluded_pinned': exclude_pinned
        })


@extend_schema(
    tags=['Recent Activities'],
    responses={
        200: RecentActivityStatsSerializer,
    }
)
class RecentActivityStatsView(APIView):
    """
    Get statistics about recent activities.

    Returns counts by activity type, resource type, and daily breakdown
    for the last 30 days.

    GET /api/v1/recent/stats/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get activity statistics"""
        from django.db.models import Count
        from django.db.models.functions import TruncDate
        from datetime import timedelta

        user = request.user
        cutoff_date = timezone.now() - timedelta(days=30)

        # Base queryset
        queryset = RecentActivity.objects.filter(
            user=user,
            timestamp__gte=cutoff_date
        )

        # Total count
        total = queryset.count()

        # Count by activity type
        by_type = dict(
            queryset.values('activity_type')
            .annotate(count=Count('id'))
            .values_list('activity_type', 'count')
        )

        # Count by resource type
        by_resource_type = dict(
            queryset.values('resource_type')
            .annotate(count=Count('id'))
            .values_list('resource_type', 'count')
        )

        # Count by day (last 30 days)
        by_day = list(
            queryset.annotate(date=TruncDate('timestamp'))
            .values('date')
            .annotate(count=Count('id'))
            .order_by('-date')
            .values('date', 'count')
        )

        # Convert dates to strings for JSON serialization
        by_day = [
            {'date': item['date'].isoformat(), 'count': item['count']}
            for item in by_day
        ]

        # Pinned count
        pinned_count = RecentActivity.get_user_pinned_count(user)

        return Response({
            'total': total,
            'by_type': by_type,
            'by_resource_type': by_resource_type,
            'by_day': by_day,
            'pinned_count': pinned_count,
            'pinned_limit': RecentActivity.MAX_PINNED_ITEMS,
            'retention_days': RecentActivity.RETENTION_DAYS
        })


@extend_schema(
    tags=['Recent Activities - Admin'],
    parameters=[
        OpenApiParameter(
            name='user_id',
            type=str,
            location=OpenApiParameter.QUERY,
            description='Filter by user ID (admin only)'
        ),
        OpenApiParameter(
            name='activity_type',
            type=str,
            location=OpenApiParameter.QUERY,
            description='Filter by activity type'
        ),
        OpenApiParameter(
            name='days',
            type=int,
            location=OpenApiParameter.QUERY,
            description='Number of days to look back'
        ),
        OpenApiParameter(
            name='limit',
            type=int,
            location=OpenApiParameter.QUERY,
            description='Maximum results'
        ),
    ],
    responses={
        200: RecentActivitySerializer(many=True),
        403: OpenApiResponse(description='Admin access required'),
    }
)
class AdminRecentActivityListView(generics.ListAPIView):
    """
    Admin view to see all users' recent activities.

    Only accessible by staff/admin users.

    GET /api/v1/admin/recent/
    """
    serializer_class = RecentActivitySerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        """Get all recent activities with optional filtering"""
        from datetime import timedelta

        queryset = RecentActivity.objects.select_related('user').all()

        # Filter by user ID
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        # Filter by days (default 7 for admin view)
        days = min(int(self.request.query_params.get('days', 7)), 90)
        cutoff_date = timezone.now() - timedelta(days=days)
        queryset = queryset.filter(timestamp__gte=cutoff_date)

        # Filter by activity type
        activity_type = self.request.query_params.get('activity_type')
        if activity_type:
            queryset = queryset.filter(activity_type=activity_type.upper())

        # Order by timestamp
        queryset = queryset.order_by('-timestamp')

        # Apply limit (default 100, max 500)
        limit = min(int(self.request.query_params.get('limit', 100)), 500)

        return queryset[:limit]


# ============================================================================
# MY DOCUMENTS VIEWS
# ============================================================================

@extend_schema(
    tags=['My Documents'],
    parameters=[
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
            description='Filter by confidentiality level (PUBLIC, INTERNAL, CONFIDENTIAL, HIGHLY_CONFIDENTIAL)'
        ),
        OpenApiParameter(
            name='search',
            type=str,
            location=OpenApiParameter.QUERY,
            description='Search by title or file name'
        ),
        OpenApiParameter(
            name='sort_by',
            type=str,
            location=OpenApiParameter.QUERY,
            description='Sort field (updated_at, created_at, title, file_size)',
            enum=['updated_at', 'created_at', 'title', 'file_size']
        ),
        OpenApiParameter(
            name='sort_order',
            type=str,
            location=OpenApiParameter.QUERY,
            description='Sort order (asc, desc)',
            enum=['asc', 'desc']
        ),
        OpenApiParameter(
            name='limit',
            type=int,
            location=OpenApiParameter.QUERY,
            description='Maximum number of results (default: 100, max: 500)'
        ),
    ],
    responses={
        200: OpenApiResponse(description='List of user documents with time grouping'),
    }
)
class MyDocumentsListView(APIView):
    """
    List all documents owned by the authenticated user.

    Features:
    - Time-based grouping (Today, This Week, This Month, Earlier)
    - Filtering by document type and confidentiality
    - Search by title or file name
    - Sorting options

    GET /api/v1/documents/my-documents/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get user's documents with grouping and filtering"""
        from datetime import timedelta
        from apps.documents.serializers import MyDocumentListItemSerializer

        user = request.user

        # Base queryset - documents owned by user
        queryset = Document.objects.filter(
            owner=user,
            is_deleted=False
        ).select_related('folder', 'department').prefetch_related('document_tags__tag')

        # Filter by document type
        document_type = request.query_params.get('document_type')
        if document_type:
            queryset = queryset.filter(document_type=document_type)

        # Filter by confidentiality
        confidentiality = request.query_params.get('confidentiality')
        if confidentiality:
            queryset = queryset.filter(confidentiality_level=confidentiality.upper())

        # Search filter
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(file_name__icontains=search)
            )

        # Sorting
        sort_by = request.query_params.get('sort_by', 'updated_at')
        sort_order = request.query_params.get('sort_order', 'desc')
        if sort_by in ['updated_at', 'created_at', 'title', 'file_size']:
            order_prefix = '-' if sort_order == 'desc' else ''
            queryset = queryset.order_by(f'{order_prefix}{sort_by}')
        else:
            queryset = queryset.order_by('-updated_at')

        # Apply limit
        limit = min(int(request.query_params.get('limit', 100)), 500)
        documents = list(queryset[:limit])

        # Serialize documents
        serializer = MyDocumentListItemSerializer(documents, many=True)

        # Group by time
        grouped = {
            'today': [],
            'this_week': [],
            'this_month': [],
            'earlier': []
        }

        for item in serializer.data:
            time_group = item.get('time_group', 'earlier')
            grouped[time_group].append(item)

        return Response({
            'total_count': len(documents),
            'grouped': grouped,
            'results': serializer.data
        })


@extend_schema(
    tags=['My Documents'],
    responses={
        200: OpenApiResponse(description='Statistics about user documents'),
    }
)
class MyDocumentsStatsView(APIView):
    """
    Get statistics about user's documents.

    Returns:
    - Total document count
    - Total folder count
    - Documents created today/this week
    - Storage used
    - Breakdown by document type
    - Breakdown by confidentiality level

    GET /api/v1/documents/my-documents/stats/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get document statistics for the user"""
        from datetime import timedelta
        from django.db.models import Count, Sum
        from apps.folders.models import Folder

        user = request.user
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=today_start.weekday())

        # Base queryset
        documents = Document.objects.filter(owner=user, is_deleted=False)

        # Total documents
        total_documents = documents.count()

        # Total folders owned by user
        total_folders = Folder.objects.filter(owner=user, is_deleted=False).count()

        # Documents created today
        documents_today = documents.filter(created_at__gte=today_start).count()

        # Documents created this week
        documents_this_week = documents.filter(created_at__gte=week_start).count()

        # Storage used
        storage_used = documents.aggregate(total=Sum('file_size'))['total'] or 0

        # Format storage
        def format_bytes(size):
            for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
                if size < 1024:
                    return f"{size:.1f} {unit}"
                size /= 1024
            return f"{size:.1f} PB"

        # By document type
        by_document_type = dict(
            documents.values('document_type')
            .annotate(count=Count('id'))
            .values_list('document_type', 'count')
        )

        # By confidentiality level
        by_confidentiality = dict(
            documents.values('confidentiality_level')
            .annotate(count=Count('id'))
            .values_list('confidentiality_level', 'count')
        )

        return Response({
            'total_documents': total_documents,
            'total_folders': total_folders,
            'documents_today': documents_today,
            'documents_this_week': documents_this_week,
            'storage_used_bytes': storage_used,
            'storage_used_formatted': format_bytes(storage_used),
            'by_document_type': by_document_type,
            'by_confidentiality': by_confidentiality
        })


# ============================================================================
# PINNED ITEMS VIEWS (Quick Access)
# ============================================================================

@extend_schema(
    tags=['Pinned Items'],
    responses={
        200: OpenApiResponse(description='List of pinned items'),
    }
)
class PinnedItemListView(generics.ListAPIView):
    """
    List all pinned items for the current user.

    Returns items ordered by display_order for Quick Access section.

    GET /api/v1/documents/pinned/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        from apps.documents.models import PinnedItem
        return PinnedItem.objects.filter(
            user=self.request.user
        ).select_related('document', 'folder', 'document__folder')

    def get_serializer_class(self):
        from apps.documents.serializers import PinnedItemSerializer
        return PinnedItemSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)

        from apps.documents.models import PinnedItem
        return Response({
            'count': queryset.count(),
            'max_items': PinnedItem.MAX_PINNED_ITEMS,
            'can_pin_more': queryset.count() < PinnedItem.MAX_PINNED_ITEMS,
            'results': serializer.data
        })


@extend_schema(
    tags=['Pinned Items'],
    responses={
        201: OpenApiResponse(description='Item pinned successfully'),
        400: OpenApiResponse(description='Validation error'),
    }
)
class PinnedItemCreateView(generics.CreateAPIView):
    """
    Pin a document, folder, or shared item.

    POST /api/v1/documents/pinned/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        from apps.documents.serializers import PinnedItemCreateSerializer
        return PinnedItemCreateSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        pin = serializer.save()

        from apps.documents.serializers import PinnedItemSerializer
        response_serializer = PinnedItemSerializer(pin)

        logger.info(
            f"Item pinned: {pin.id} ({pin.item_type}) by user {request.user.username}"
        )

        return Response({
            'success': True,
            'message': 'Item pinned successfully',
            'pin': response_serializer.data
        }, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=['Pinned Items'],
    responses={
        200: OpenApiResponse(description='Pin details'),
        404: OpenApiResponse(description='Pin not found'),
    }
)
class PinnedItemDetailView(generics.RetrieveDestroyAPIView):
    """
    Get or delete a specific pinned item.

    GET /api/v1/documents/pinned/{id}/
    DELETE /api/v1/documents/pinned/{id}/
    """
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        from apps.documents.models import PinnedItem
        return PinnedItem.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        from apps.documents.serializers import PinnedItemSerializer
        return PinnedItemSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        pin_id = instance.id
        display_name = instance.get_display_name()
        instance.delete()

        logger.info(
            f"Pin removed: {pin_id} by user {request.user.username}"
        )

        return Response({
            'success': True,
            'message': f'Unpinned "{display_name}"',
            'unpinned_id': str(pin_id)
        }, status=status.HTTP_200_OK)


@extend_schema(
    tags=['Pinned Items'],
    responses={
        200: OpenApiResponse(description='Items reordered successfully'),
        400: OpenApiResponse(description='Validation error'),
    }
)
class PinnedItemReorderView(APIView):
    """
    Reorder pinned items.

    POST /api/v1/documents/pinned/reorder/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from apps.documents.serializers import PinnedItemReorderSerializer
        from apps.documents.models import PinnedItem

        serializer = PinnedItemReorderSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)

        ordered_ids = serializer.validated_data['ordered_ids']
        updated_count = PinnedItem.reorder_items(request.user, ordered_ids)

        logger.info(
            f"Pinned items reordered: {updated_count} items by user {request.user.username}"
        )

        return Response({
            'success': True,
            'message': f'Reordered {updated_count} items',
            'updated_count': updated_count
        })


@extend_schema(
    tags=['Pinned Items'],
    responses={
        200: OpenApiResponse(description='Pin updated successfully'),
        400: OpenApiResponse(description='Validation error'),
        404: OpenApiResponse(description='Pin not found'),
    }
)
class PinnedItemUpdateView(APIView):
    """
    Update a pinned item (custom label).

    PATCH /api/v1/documents/pinned/{id}/
    """
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, id):
        from apps.documents.models import PinnedItem
        from apps.documents.serializers import PinnedItemUpdateSerializer, PinnedItemSerializer

        try:
            pin = PinnedItem.objects.get(id=id, user=request.user)
        except PinnedItem.DoesNotExist:
            return Response(
                {'error': 'Pin not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = PinnedItemUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if 'custom_label' in serializer.validated_data:
            pin.custom_label = serializer.validated_data['custom_label']
            pin.save(update_fields=['custom_label', 'updated_at'])

        response_serializer = PinnedItemSerializer(pin)

        return Response({
            'success': True,
            'message': 'Pin updated successfully',
            'pin': response_serializer.data
        })


@extend_schema(
    tags=['Pinned Items'],
    responses={
        200: OpenApiResponse(description='Pin status for item'),
    }
)
class CheckPinStatusView(APIView):
    """
    Check if a specific item is pinned.

    GET /api/v1/documents/pinned/check/?item_type=DOCUMENT&item_id=uuid
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.documents.models import PinnedItem

        item_type = request.query_params.get('item_type')
        item_id = request.query_params.get('item_id')

        if not item_type or not item_id:
            return Response({
                'error': 'item_type and item_id are required'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check if pinned
        pin = None
        if item_type == 'DOCUMENT':
            pin = PinnedItem.objects.filter(
                user=request.user,
                document_id=item_id
            ).first()
        elif item_type == 'FOLDER':
            pin = PinnedItem.objects.filter(
                user=request.user,
                folder_id=item_id
            ).first()
        elif item_type in ['SHARED_DOCUMENT', 'SHARED_FOLDER']:
            pin = PinnedItem.objects.filter(
                user=request.user,
                shared_item_id=item_id
            ).first()

        return Response({
            'is_pinned': pin is not None,
            'pin_id': str(pin.id) if pin else None
        })


# ============================================================================
# DOCUMENT STATE VIEWS
# ============================================================================

@extend_schema(
    tags=['Document States'],
    responses={
        200: OpenApiResponse(description='Document state statistics'),
    }
)
class DocumentStateStatsView(APIView):
    """
    Get statistics about document states for the current user.

    Returns counts by state and pending review counts.

    GET /api/v1/documents/states/stats/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.db.models import Count
        from apps.documents.models import DocumentState

        user = request.user

        # User's documents by state
        my_docs = Document.objects.filter(owner=user, is_deleted=False)
        my_docs_by_state = dict(
            my_docs.values('state')
            .annotate(count=Count('id'))
            .values_list('state', 'count')
        )

        # Documents pending my review (documents I can approve/reject)
        # For now, staff can review any document in review state
        # In a full implementation, this would check department/role permissions
        pending_my_review = 0
        if user.is_staff:
            pending_my_review = Document.objects.filter(
                state=DocumentState.IN_REVIEW,
                is_deleted=False
            ).exclude(owner=user).count()
        else:
            # Non-staff can review documents from same department
            pending_my_review = Document.objects.filter(
                state=DocumentState.IN_REVIEW,
                department=user.department,
                is_deleted=False
            ).exclude(owner=user).count()

        # My drafts
        my_drafts = my_docs_by_state.get(DocumentState.DRAFT, 0)

        # My documents in review
        my_in_review = my_docs_by_state.get(DocumentState.IN_REVIEW, 0)

        return Response({
            'total': my_docs.count(),
            'by_state': my_docs_by_state,
            'pending_my_review': pending_my_review,
            'my_drafts': my_drafts,
            'my_in_review': my_in_review
        })


@extend_schema(
    tags=['Document States'],
    parameters=[
        OpenApiParameter(
            name='state',
            type=str,
            location=OpenApiParameter.QUERY,
            description='Filter by state (DRAFT, IN_REVIEW, APPROVED, PUBLISHED, ARCHIVED)',
            enum=['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED']
        ),
        OpenApiParameter(
            name='limit',
            type=int,
            location=OpenApiParameter.QUERY,
            description='Maximum number of results (default: 100)'
        ),
    ],
    responses={
        200: OpenApiResponse(description='Documents filtered by state'),
    }
)
class DocumentsByStateView(APIView):
    """
    List user's documents filtered by state.

    GET /api/v1/documents/states/my-documents/
    GET /api/v1/documents/states/my-documents/?state=DRAFT
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.documents.serializers import DocumentWithStateSerializer

        user = request.user

        # Base queryset - user's documents
        queryset = Document.objects.filter(
            owner=user,
            is_deleted=False
        ).select_related(
            'folder', 'department',
            'submitted_by', 'reviewed_by'
        ).prefetch_related('document_tags__tag')

        # Filter by state
        state = request.query_params.get('state')
        if state:
            queryset = queryset.filter(state=state.upper())

        # Order by updated_at
        queryset = queryset.order_by('-updated_at')

        # Apply limit
        limit = min(int(request.query_params.get('limit', 100)), 500)
        documents = list(queryset[:limit])

        serializer = DocumentWithStateSerializer(documents, many=True)

        return Response({
            'count': len(documents),
            'state_filter': state,
            'results': serializer.data
        })


@extend_schema(
    tags=['Document States'],
    parameters=[
        OpenApiParameter(
            name='limit',
            type=int,
            location=OpenApiParameter.QUERY,
            description='Maximum number of results (default: 50)'
        ),
    ],
    responses={
        200: OpenApiResponse(description='Documents pending review'),
    }
)
class PendingReviewView(APIView):
    """
    List documents pending the current user's review.

    Shows documents that the user can approve or reject based on
    their role and department.

    GET /api/v1/documents/states/pending-review/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.documents.serializers import PendingReviewSerializer
        from apps.documents.models import DocumentState

        user = request.user

        # Base queryset - documents in review, not owned by user
        queryset = Document.objects.filter(
            state=DocumentState.IN_REVIEW,
            is_deleted=False
        ).exclude(
            owner=user
        ).select_related(
            'folder', 'owner', 'department', 'submitted_by'
        )

        # Non-staff can only review from same department
        if not user.is_staff:
            queryset = queryset.filter(department=user.department)

        # Order by submission time (oldest first - FIFO)
        queryset = queryset.order_by('submitted_for_review_at')

        # Apply limit
        limit = min(int(request.query_params.get('limit', 50)), 200)
        documents = list(queryset[:limit])

        serializer = PendingReviewSerializer(documents, many=True)

        return Response({
            'count': len(documents),
            'results': serializer.data
        })


@extend_schema(
    tags=['Document States'],
    responses={
        200: OpenApiResponse(description='Document state history'),
        404: OpenApiResponse(description='Document not found'),
    }
)
class DocumentStateHistoryView(APIView):
    """
    Get state transition history for a document.

    GET /api/v1/documents/{id}/state-history/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, id):
        from apps.documents.models import DocumentStateTransition
        from apps.documents.serializers import DocumentStateTransitionSerializer

        # Get document
        try:
            document = Document.objects.select_related('department').get(
                pk=id, is_deleted=False
            )
        except Document.DoesNotExist:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check permissions
        if not request.user.is_staff:
            if document.owner != request.user and document.department != request.user.department:
                return Response(
                    {'error': 'You do not have permission to view this document'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Get state transitions
        transitions = DocumentStateTransition.objects.filter(
            document=document
        ).select_related('transitioned_by').order_by('-transitioned_at')

        serializer = DocumentStateTransitionSerializer(transitions, many=True)

        return Response({
            'document_id': str(document.id),
            'document_title': document.title,
            'current_state': document.state,
            'current_state_label': document.get_state_display(),
            'transitions': serializer.data
        })


@extend_schema(
    tags=['Document States'],
    request=inline_serializer(
        'DocumentStateChangeRequest',
        fields={
            'to_state': serializers.ChoiceField(choices=[
                ('IN_REVIEW', 'In Review'),
                ('APPROVED', 'Approved'),
                ('DRAFT', 'Draft'),
                ('PUBLISHED', 'Published'),
                ('ARCHIVED', 'Archived'),
            ]),
            'notes': serializers.CharField(required=False),
            'rejection_reason': serializers.CharField(required=False),
        }
    ),
    responses={
        200: OpenApiResponse(description='State changed successfully'),
        400: OpenApiResponse(description='Invalid state transition'),
        403: OpenApiResponse(description='Permission denied'),
        404: OpenApiResponse(description='Document not found'),
    }
)
class DocumentStateChangeView(APIView):
    """
    Change document state.

    Valid transitions:
    - DRAFT → IN_REVIEW (submit for review)
    - IN_REVIEW → APPROVED (approve)
    - IN_REVIEW → DRAFT (reject - requires rejection_reason)
    - APPROVED → PUBLISHED (publish)
    - APPROVED → ARCHIVED (archive before publishing)
    - PUBLISHED → ARCHIVED (archive)
    - ARCHIVED → DRAFT (restore)

    POST /api/v1/documents/{id}/change-state/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, id):
        from apps.documents.serializers import DocumentStateChangeSerializer, DocumentWithStateSerializer
        from apps.documents.models import DocumentState, DocumentStateTransition

        # Get document
        try:
            document = Document.objects.select_related(
                'folder', 'department', 'owner'
            ).get(pk=id, is_deleted=False)
        except Document.DoesNotExist:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Permission checks based on transition type
        user = request.user
        to_state = request.data.get('to_state')

        # Check if user can perform this transition
        can_transition = False
        error_message = None

        if to_state == DocumentState.IN_REVIEW:
            # Only owner can submit for review
            can_transition = document.owner == user
            error_message = 'Only the document owner can submit for review'

        elif to_state == DocumentState.APPROVED:
            # Staff or same-department can approve
            if document.owner == user:
                error_message = 'Cannot approve your own document'
            elif user.is_staff:
                can_transition = True
            elif user.department == document.department:
                can_transition = True
            else:
                error_message = 'You do not have permission to approve this document'

        elif to_state == DocumentState.DRAFT:
            # Reject (from IN_REVIEW) or restore (from ARCHIVED)
            if document.state == DocumentState.IN_REVIEW:
                # Rejecting - same rules as approve
                if document.owner == user:
                    error_message = 'Cannot reject your own document'
                elif user.is_staff:
                    can_transition = True
                elif user.department == document.department:
                    can_transition = True
                else:
                    error_message = 'You do not have permission to reject this document'
            elif document.state == DocumentState.ARCHIVED:
                # Restoring - owner or staff
                can_transition = document.owner == user or user.is_staff
                error_message = 'Only the document owner can restore from archive'

        elif to_state == DocumentState.PUBLISHED:
            # Owner or staff can publish after approval
            can_transition = document.owner == user or user.is_staff
            error_message = 'Only the document owner can publish'

        elif to_state == DocumentState.ARCHIVED:
            # Owner or staff can archive
            can_transition = document.owner == user or user.is_staff
            error_message = 'Only the document owner can archive'

        if not can_transition:
            return Response(
                {'error': error_message or 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Validate and perform transition
        serializer = DocumentStateChangeSerializer(
            data=request.data,
            context={'request': request, 'document': document}
        )

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            transition = serializer.save()
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Refresh document from DB
        document.refresh_from_db()

        # Log the state change
        logger.info(
            f"Document {document.id} state changed: {transition.from_state} → {transition.to_state} "
            f"by user {user.username}"
        )

        # Return updated document
        doc_serializer = DocumentWithStateSerializer(document)

        return Response({
            'success': True,
            'message': f'Document state changed to {document.get_state_display()}',
            'transition': {
                'id': str(transition.id),
                'from_state': transition.from_state,
                'to_state': transition.to_state,
                'transitioned_at': transition.transitioned_at.isoformat()
            },
            'document': doc_serializer.data
        })


@extend_schema(
    tags=['Document States'],
    responses={
        200: OpenApiResponse(description='Available state transitions'),
        404: OpenApiResponse(description='Document not found'),
    }
)
class DocumentAllowedTransitionsView(APIView):
    """
    Get allowed state transitions for a document.

    Returns the list of states the document can transition to
    based on its current state and user permissions.

    GET /api/v1/documents/{id}/allowed-transitions/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, id):
        from apps.documents.models import DocumentState, DocumentStateTransition

        # Get document
        try:
            document = Document.objects.select_related('department', 'owner').get(
                pk=id, is_deleted=False
            )
        except Document.DoesNotExist:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        user = request.user

        # Get all valid transitions from current state
        valid_transitions = DocumentStateTransition.get_allowed_transitions(document.state)

        # Filter by user permissions
        allowed = []
        for target_state in valid_transitions:
            can_perform = False

            if target_state == DocumentState.IN_REVIEW:
                can_perform = document.owner == user

            elif target_state == DocumentState.APPROVED:
                if document.owner != user:
                    can_perform = user.is_staff or user.department == document.department

            elif target_state == DocumentState.DRAFT:
                if document.state == DocumentState.IN_REVIEW:
                    # Reject
                    if document.owner != user:
                        can_perform = user.is_staff or user.department == document.department
                elif document.state == DocumentState.ARCHIVED:
                    # Restore
                    can_perform = document.owner == user or user.is_staff

            elif target_state in [DocumentState.PUBLISHED, DocumentState.ARCHIVED]:
                can_perform = document.owner == user or user.is_staff

            if can_perform:
                allowed.append({
                    'state': target_state,
                    'label': dict(DocumentState.choices).get(target_state, target_state),
                    'requires_reason': (
                        document.state == DocumentState.IN_REVIEW and
                        target_state == DocumentState.DRAFT
                    )
                })

        return Response({
            'document_id': str(document.id),
            'current_state': document.state,
            'current_state_label': document.get_state_display(),
            'allowed_transitions': allowed
        })


# ============================================================================
# TRASH DOCUMENT VIEWS
# ============================================================================

@extend_schema(
    tags=['Documents - Trash'],
    responses={
        200: OpenApiResponse(description='List of trashed documents'),
    }
)
class DocumentTrashListView(generics.ListAPIView):
    """
    List all documents in trash for the current user.

    Returns documents that have been soft-deleted.
    Includes deleted_by information for audit purposes.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        from apps.documents.serializers import TrashDocumentSerializer
        return TrashDocumentSerializer

    def get_queryset(self):
        """Get deleted documents accessible to user"""
        from apps.permissions.utils import PermissionChecker

        user = self.request.user
        queryset = Document.objects.filter(is_deleted=True).select_related(
            'owner', 'department', 'folder', 'deleted_by'
        )

        # Superusers can see all deleted documents
        if user.is_superuser:
            return queryset.order_by('-deleted_at')

        # Regular users can see their own deleted documents
        # or documents in their department
        return queryset.filter(
            Q(owner=user) | Q(department=user.department)
        ).order_by('-deleted_at')


@extend_schema(
    tags=['Documents - Trash'],
    responses={
        200: OpenApiResponse(description='Document restored successfully'),
        403: OpenApiResponse(description='Permission denied'),
        404: OpenApiResponse(description='Document not found'),
    }
)
class DocumentRestoreView(APIView):
    """
    Restore a deleted document from trash.

    The document will be restored to its original folder if it still exists.
    If the folder was deleted, the document will be moved to root.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, id):
        """Restore a document from trash"""
        from apps.permissions.utils import PermissionChecker

        user = request.user

        try:
            document = Document.objects.select_related('folder', 'owner', 'department').get(
                pk=id, is_deleted=True
            )
        except Document.DoesNotExist:
            return Response(
                {'error': 'Document not found in trash'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check permissions
        checker = PermissionChecker(user)
        has_permission = (
            user.is_superuser or
            document.owner == user or
            checker.has_global_permission('can_delete')
        )

        if not has_permission and document.folder:
            has_permission = checker.has_folder_permission(document.folder, 'can_delete')

        if not has_permission and document.department:
            has_permission = checker.has_department_permission(document.department, 'can_delete')

        if not has_permission:
            return Response(
                {'error': 'You do not have permission to restore this document'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check if folder still exists and is not deleted
        if document.folder and document.folder.is_deleted:
            document.folder = None  # Move to root if folder was deleted

        # Restore the document
        document.is_deleted = False
        document.deleted_at = None
        document.deleted_by = None
        document.save()

        logger.info(
            f"Document restored from trash: {document.id} by user {user.username}"
        )

        return Response({
            'message': f'Document "{document.title}" has been restored',
            'document_id': str(document.id),
            'folder_id': str(document.folder.id) if document.folder else None
        })


@extend_schema(
    tags=['Documents - Trash'],
    responses={
        204: OpenApiResponse(description='Document permanently deleted'),
        403: OpenApiResponse(description='Permission denied'),
        404: OpenApiResponse(description='Document not found'),
    }
)
class DocumentPermanentDeleteView(APIView):
    """
    Permanently delete a document from trash.

    WARNING: This action is irreversible!
    The document and all its files will be permanently removed.
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, id):
        """Permanently delete a document from trash"""
        from apps.permissions.utils import PermissionChecker

        user = request.user

        try:
            document = Document.objects.select_related('folder', 'owner', 'department').get(
                pk=id, is_deleted=True
            )
        except Document.DoesNotExist:
            return Response(
                {'error': 'Document not found in trash'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check permissions - only owner, superuser, or admin can permanently delete
        checker = PermissionChecker(user)
        has_permission = (
            user.is_superuser or
            document.owner == user or
            checker.has_global_permission('can_delete')
        )

        if not has_permission:
            return Response(
                {'error': 'You do not have permission to permanently delete this document'},
                status=status.HTTP_403_FORBIDDEN
            )

        document_id = str(document.id)
        document_title = document.title

        # Permanently delete the document
        document.delete()

        logger.warning(
            f"Document permanently deleted: {document_id} ({document_title}) by user {user.username}"
        )

        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    tags=['Documents - Trash'],
    responses={
        200: OpenApiResponse(description='Trash emptied successfully'),
    }
)
class DocumentEmptyTrashView(APIView):
    """
    Permanently delete all documents in trash.

    WARNING: This action is irreversible!
    All trashed documents will be permanently removed.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Empty trash - permanently delete all trashed documents"""
        from apps.permissions.utils import PermissionChecker

        user = request.user

        # Get all trashed documents accessible to user
        if user.is_superuser:
            queryset = Document.objects.filter(is_deleted=True)
        else:
            queryset = Document.objects.filter(
                is_deleted=True
            ).filter(
                Q(owner=user) | Q(department=user.department)
            )

        deleted_count = queryset.count()

        # Permanently delete all
        for doc in queryset:
            try:
                doc.delete()
            except Exception as e:
                logger.error(f"Failed to permanently delete document {doc.id}: {e}")

        logger.warning(
            f"Document trash emptied: {deleted_count} documents permanently deleted "
            f"by user {user.username}"
        )

        return Response({
            'message': f'{deleted_count} documents permanently deleted',
            'deleted_count': deleted_count
        })


@extend_schema(
    tags=['Documents - Cleanup'],
    responses={
        204: OpenApiResponse(description='Orphaned document record deleted successfully'),
        403: OpenApiResponse(description='Permission denied'),
        404: OpenApiResponse(description='Document not found'),
    }
)
class DocumentOrphanedCleanupView(APIView):
    """
    Delete an orphaned document record (database entry without file in storage).

    This endpoint is used when a document's file no longer exists in MinIO storage
    but the database record still exists. It allows users to clean up these orphaned
    records after confirmation.

    Only the document owner, superusers, or users with delete permissions can
    perform this action.
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, id):
        """Delete orphaned document record from database"""
        from apps.permissions.utils import PermissionChecker

        user = request.user

        try:
            document = Document.objects.select_related('folder', 'owner', 'department').get(pk=id)
        except Document.DoesNotExist:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check permissions - only owner, superuser, or admin can delete orphaned records
        checker = PermissionChecker(user)
        has_permission = (
            user.is_superuser or
            document.owner == user or
            checker.has_global_permission('can_delete')
        )

        if not has_permission:
            return Response(
                {'error': 'You do not have permission to delete this document record'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Verify that the file is actually missing from storage (to prevent misuse)
        if document.minio_object_key and document.minio_bucket:
            from apps.storage.services import StorageService
            storage_service = StorageService()
            if storage_service.file_exists(document.minio_bucket, document.minio_object_key):
                return Response(
                    {
                        'error': 'File exists in storage',
                        'detail': 'This document has a valid file in storage. Use the regular delete endpoint instead.'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

        document_id = str(document.id)
        document_title = document.title

        # Delete the orphaned record
        document.delete()

        logger.warning(
            f"Orphaned document record deleted: {document_id} ({document_title}) by user {user.username}"
        )

        return Response(status=status.HTTP_204_NO_CONTENT)


# =============================================================================
# Dashboard Stats
# =============================================================================


@extend_schema(
    tags=['Documents'],
    responses={
        200: OpenApiResponse(description='Dashboard document statistics'),
    }
)
class DocumentDashboardStatsView(APIView):
    """
    Aggregated document statistics for the enterprise dashboard.

    Returns total counts, storage usage, and breakdowns by department and type.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.folders.models import Folder
        from apps.documents.utils import get_user_storage_summary
        from django.db.models import BigIntegerField, Case, Count, F, Sum, When
        from datetime import timedelta

        user = request.user

        # Base queryset - non-deleted documents
        docs_qs = Document.objects.filter(is_deleted=False)

        total_documents = docs_qs.count()
        total_folders = Folder.objects.count()

        # Storage - org-wide usage so this matches the UsageTab in org settings
        org = getattr(user, 'organization', None)
        if org:
            org_storage_agg = Document.objects.filter(
                organization=org, is_deleted=False
            ).aggregate(total=models.Sum('file_size'))
            storage_used = org_storage_agg['total'] or 0
        else:
            storage_used = docs_qs.aggregate(total=models.Sum('file_size'))['total'] or 0

        # Storage limit: use the actual physical MinIO disk capacity so the
        # sidebar matches the System Settings Overview (server_total_bytes).
        from apps.documents.utils import _get_minio_server_capacity
        server_total, _ = _get_minio_server_capacity()
        if server_total:
            storage_limit = server_total
        elif org and org.max_storage_gb:
            storage_limit = int(org.max_storage_gb * (1024 ** 3))
        else:
            storage_limit = 500 * 1024 * 1024 * 1024  # 500 GB fallback

        # Documents by department
        dept_breakdown = (
            docs_qs
            .exclude(department__isnull=True)
            .values('department__name')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )
        documents_by_department = [
            {'name': row['department__name'], 'count': row['count']}
            for row in dept_breakdown
        ]

        # Documents by type
        type_breakdown = (
            docs_qs
            .values('document_type')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )
        documents_by_type = [
            {'type': row['document_type'] or 'Unknown', 'count': row['count']}
            for row in type_breakdown
        ]

        # Recent uploads (last 7 days)
        seven_days_ago = timezone.now() - timedelta(days=7)
        recent_uploads_count = docs_qs.filter(created_at__gte=seven_days_ago).count()

        # Compression / storage-savings stats
        # original_size is populated only for compressed files; fall back to file_size
        size_agg = docs_qs.aggregate(
            total_original=Sum(
                Case(
                    When(original_size__isnull=False, then=F('original_size')),
                    default=F('file_size'),
                    output_field=BigIntegerField(),
                )
            ),
            total_compressed=Sum('file_size'),
        )
        total_original_size = size_agg['total_original'] or 0
        total_compressed_size = size_agg['total_compressed'] or 0
        storage_saved = max(0, total_original_size - total_compressed_size)
        storage_saved_percent = (
            round(storage_saved / total_original_size * 100, 1)
            if total_original_size > 0 else 0.0
        )

        return Response({
            'total_documents': total_documents,
            'total_folders': total_folders,
            'storage_used_bytes': storage_used,
            'storage_limit_bytes': storage_limit,
            'documents_by_department': documents_by_department,
            'documents_by_type': documents_by_type,
            'recent_uploads_count': recent_uploads_count,
            'total_original_size_bytes': total_original_size,
            'total_compressed_size_bytes': total_compressed_size,
            'storage_saved_bytes': storage_saved,
            'storage_saved_percent': storage_saved_percent,
        })
