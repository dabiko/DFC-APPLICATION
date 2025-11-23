"""
Views for folder management and hierarchy.
"""
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import Http404
from django.db.models import Q, Count
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse

from apps.folders.models import Folder, FolderTemplate, SmartFolder
from apps.folders.serializers import (
    FolderListSerializer,
    FolderDetailSerializer,
    FolderCreateSerializer,
    FolderUpdateSerializer,
    FolderMoveSerializer,
    FolderTemplateSerializer,
    SmartFolderListSerializer,
    SmartFolderDetailSerializer,
    SmartFolderCreateSerializer,
    SmartFolderUpdateSerializer,
)
from apps.permissions.decorators import HasFolderPermission, FolderPermissionMixin
from apps.permissions.utils import PermissionChecker, check_permission
import logging

logger = logging.getLogger(__name__)


@extend_schema(
    tags=['Folders'],
    parameters=[
        OpenApiParameter(
            name='parent',
            type=str,
            location=OpenApiParameter.QUERY,
            description='Filter folders by parent ID (UUID). Use "null" for root folders.'
        ),
        OpenApiParameter(
            name='department',
            type=int,
            location=OpenApiParameter.QUERY,
            description='Filter folders by department ID'
        ),
    ],
    responses={
        200: FolderListSerializer(many=True),
    }
)
class FolderListCreateView(FolderPermissionMixin, generics.ListCreateAPIView):
    """
    List folders or create a new folder.

    Supports filtering by parent folder and department.
    Returns only folders the user has access to based on RBAC permissions.
    """
    permission_classes = [permissions.IsAuthenticated]
    queryset = Folder.objects.all()  # Base queryset - will be filtered in get_queryset()

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return FolderCreateSerializer
        return FolderListSerializer

    def get_queryset(self):
        """Get folders filtered by RBAC permissions and query parameters"""
        user = self.request.user

        # Get base queryset with select_related
        base_queryset = Folder.objects.select_related(
            'owner', 'department', 'parent', 'created_by'
        ).annotate(
            children_count=Count('children')
        )

        # Apply RBAC filtering using FolderPermissionMixin
        try:
            queryset = super().get_queryset()
        except AssertionError:
            queryset = base_queryset

        if queryset is None:
            queryset = base_queryset

        # Filter by parent folder
        parent_id = self.request.query_params.get('parent')
        if parent_id:
            if parent_id.lower() == 'null':
                queryset = queryset.filter(parent__isnull=True)
            else:
                queryset = queryset.filter(parent_id=parent_id)

        # Filter by department
        department_id = self.request.query_params.get('department')
        if department_id:
            queryset = queryset.filter(department_id=department_id)

        return queryset.order_by('path', 'name')

    def perform_create(self, serializer):
        """Create folder with ownership and department info"""
        # Get department from request data or user's department
        department = serializer.validated_data.get('department')
        if not department:
            department = self.request.user.department

        folder = serializer.save(
            owner=self.request.user,
            created_by=self.request.user,
            department=department
        )

        logger.info(
            f"Folder created: {folder.id} ({folder.path}) by user {self.request.user.username}"
        )


@extend_schema(
    tags=['Folders'],
    responses={
        200: FolderDetailSerializer,
        404: OpenApiResponse(description='Folder not found'),
    }
)
class FolderDetailView(generics.RetrieveAPIView):
    """
    Retrieve detailed information about a specific folder.

    Returns:
    - Full folder metadata
    - Breadcrumb trail
    - Direct children
    - Document count
    """
    serializer_class = FolderDetailSerializer
    permission_classes = [permissions.IsAuthenticated, HasFolderPermission]
    required_permission = 'can_view'
    lookup_field = 'id'

    def get_queryset(self):
        """Filter folders by RBAC permissions"""
        user = self.request.user
        queryset = Folder.objects.select_related(
            'owner', 'department', 'parent', 'created_by'
        ).prefetch_related('children')

        # Use PermissionChecker to get accessible folders
        checker = PermissionChecker(user)
        accessible_folders = checker.get_accessible_folders(queryset)

        return accessible_folders


@extend_schema(
    tags=['Folders'],
    request=FolderUpdateSerializer,
    responses={
        200: FolderDetailSerializer,
        400: OpenApiResponse(description='Validation error'),
        403: OpenApiResponse(description='Permission denied'),
        404: OpenApiResponse(description='Folder not found'),
    }
)
class FolderUpdateView(generics.UpdateAPIView):
    """
    Update folder metadata (name, description, confidentiality level).

    Note: To move a folder, use the folder move endpoint instead.
    Requires 'can_edit' permission on the folder.
    """
    serializer_class = FolderUpdateSerializer
    permission_classes = [permissions.IsAuthenticated, HasFolderPermission]
    required_permission = 'can_edit'
    lookup_field = 'id'

    def get_queryset(self):
        """Filter folders by RBAC permissions"""
        user = self.request.user
        queryset = Folder.objects.all()

        # Use PermissionChecker to get editable folders
        checker = PermissionChecker(user)
        accessible_folders = checker.get_accessible_folders(queryset)

        return accessible_folders

    def update(self, request, *args, **kwargs):
        """Update folder and return full details"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        folder = serializer.save()

        logger.info(
            f"Folder updated: {folder.id} ({folder.path}) by user {request.user.username}"
        )

        response_serializer = FolderDetailSerializer(folder)
        return Response(response_serializer.data)


@extend_schema(
    tags=['Folders'],
    responses={
        204: OpenApiResponse(description='Folder deleted successfully'),
        400: OpenApiResponse(description='Folder not empty'),
        403: OpenApiResponse(description='Permission denied'),
        404: OpenApiResponse(description='Folder not found'),
    }
)
class FolderDeleteView(generics.DestroyAPIView):
    """
    Delete a folder.

    Only empty folders (no documents, no subfolders) can be deleted.
    Requires 'can_delete' permission on the folder.
    """
    permission_classes = [permissions.IsAuthenticated, HasFolderPermission]
    required_permission = 'can_delete'
    lookup_field = 'id'

    def get_queryset(self):
        """Filter folders by RBAC permissions"""
        user = self.request.user
        queryset = Folder.objects.all()

        # Use PermissionChecker to get deletable folders
        checker = PermissionChecker(user)
        accessible_folders = checker.get_accessible_folders(queryset)

        return accessible_folders

    def perform_destroy(self, instance):
        """Check if folder is empty before deleting"""
        # Check for documents
        if instance.documents.filter(is_deleted=False).exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'error': 'Cannot delete folder with documents'})

        # Check for subfolders
        if instance.children.exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'error': 'Cannot delete folder with subfolders'})

        logger.info(
            f"Folder deleted: {instance.id} ({instance.path}) by user {self.request.user.username}"
        )

        instance.delete()


@extend_schema(
    tags=['Folders'],
    request=FolderMoveSerializer,
    responses={
        200: FolderDetailSerializer,
        400: OpenApiResponse(description='Validation error'),
        403: OpenApiResponse(description='Permission denied'),
        404: OpenApiResponse(description='Folder not found'),
    }
)
class FolderMoveView(APIView):
    """
    Move a folder to a different parent location.

    Prevents circular references and maintains folder hierarchy integrity.
    Requires 'can_edit' permission on the folder.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, id):
        """Move folder to new parent"""
        try:
            # Get folder
            user = request.user
            folder = Folder.objects.select_related('parent', 'department').get(id=id)

            # Check RBAC permissions
            if not check_permission(user, 'can_edit', folder):
                return Response(
                    {'error': 'You do not have permission to move this folder'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Validate move operation
            serializer = FolderMoveSerializer(
                data=request.data,
                context={'request': request, 'instance': folder}
            )
            serializer.is_valid(raise_exception=True)

            # Get new parent
            new_parent = serializer.validated_data.get('new_parent')

            # Store old path for logging
            old_path = folder.path

            # Update parent
            folder.parent = new_parent
            folder.save()  # This will automatically update paths via save() method

            logger.info(
                f"Folder moved: {folder.id} from {old_path} to {folder.path} "
                f"by user {user.username}"
            )

            # Return updated folder details
            response_serializer = FolderDetailSerializer(folder)
            return Response(response_serializer.data)

        except Folder.DoesNotExist:
            raise Http404('Folder not found')


@extend_schema(
    tags=['Folders'],
    responses={
        200: OpenApiResponse(description='Breadcrumb trail'),
        404: OpenApiResponse(description='Folder not found'),
    }
)
class FolderBreadcrumbView(APIView):
    """
    Get breadcrumb navigation trail for a folder.

    Returns the path from root to the specified folder.
    Requires 'can_view' permission on the folder.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, id):
        """Get breadcrumb trail"""
        try:
            folder = Folder.objects.select_related('department').get(id=id)

            # Check RBAC permissions
            if not check_permission(request.user, 'can_view', folder):
                return Response(
                    {'error': 'Permission denied'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Build breadcrumb list
            breadcrumbs = []
            for ancestor in folder.get_breadcrumb():
                breadcrumbs.append({
                    'id': ancestor.id,
                    'name': ancestor.name,
                    'path': ancestor.path,
                })

            return Response({'breadcrumbs': breadcrumbs})

        except Folder.DoesNotExist:
            raise Http404('Folder not found')


@extend_schema(
    tags=['Folders'],
    parameters=[
        OpenApiParameter(
            name='root',
            type=str,
            location=OpenApiParameter.QUERY,
            description='Root folder ID to build tree from. If not provided, returns all root folders.'
        ),
    ],
    responses={
        200: OpenApiResponse(description='Folder tree structure'),
    }
)
class FolderTreeView(APIView):
    """
    Get hierarchical folder tree structure.

    Returns nested folder structure suitable for tree views.
    Uses RBAC to filter accessible folders.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get folder tree"""
        user = request.user
        root_id = request.query_params.get('root')

        # Base queryset with RBAC permissions
        base_queryset = Folder.objects.select_related('owner', 'department')
        checker = PermissionChecker(user)
        queryset = checker.get_accessible_folders(base_queryset)

        if root_id:
            # Get tree from specific root
            try:
                root_folder = queryset.get(id=root_id)
                folders = queryset.filter(path__startswith=root_folder.path).order_by('path')
            except Folder.DoesNotExist:
                raise Http404('Root folder not found')
        else:
            # Get all root folders
            folders = queryset.filter(parent__isnull=True).order_by('path')

        # Build tree structure
        tree = self._build_tree(folders, root_id)

        return Response({'tree': tree})

    def _build_tree(self, folders, root_id=None):
        """Build nested tree structure from flat folder list"""
        folder_dict = {}
        tree = []

        # Create folder dictionary
        for folder in folders:
            folder_dict[str(folder.id)] = {
                'id': str(folder.id),
                'name': folder.name,
                'path': folder.path,
                'depth': folder.depth,
                'confidentiality_level': folder.confidentiality_level,
                'children_count': folder.children.count(),
                'documents_count': folder.documents.filter(is_deleted=False).count(),
                'children': []
            }

        # Build tree hierarchy
        for folder in folders:
            folder_data = folder_dict[str(folder.id)]
            if folder.parent_id and str(folder.parent_id) in folder_dict:
                folder_dict[str(folder.parent_id)]['children'].append(folder_data)
            else:
                tree.append(folder_data)

        return tree


# Folder Template Views

@extend_schema(
    tags=['Folder Templates'],
    responses={
        200: FolderTemplateSerializer(many=True),
    }
)
class FolderTemplateListCreateView(generics.ListCreateAPIView):
    """
    List folder templates or create a new template.

    Templates are predefined folder structures that can be instantiated.
    """
    serializer_class = FolderTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Get templates filtered by department or global templates"""
        user = self.request.user
        queryset = FolderTemplate.objects.filter(is_active=True)

        if not user.is_staff:
            # Show department-specific templates and global templates (no department)
            queryset = queryset.filter(
                Q(department=user.department) | Q(department__isnull=True)
            )

        return queryset.order_by('name')

    def perform_create(self, serializer):
        """Set created_by when creating template"""
        template = serializer.save(created_by=self.request.user)

        logger.info(
            f"Folder template created: {template.id} ({template.name}) "
            f"by user {self.request.user.username}"
        )


@extend_schema(
    tags=['Folder Templates'],
    responses={
        200: FolderTemplateSerializer,
        404: OpenApiResponse(description='Template not found'),
    }
)
class FolderTemplateDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a folder template.

    Only staff or template creator can modify/delete templates.
    """
    serializer_class = FolderTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter templates by permissions"""
        user = self.request.user
        queryset = FolderTemplate.objects.all()

        if not user.is_staff:
            queryset = queryset.filter(created_by=user)

        return queryset


@extend_schema(
    tags=['Folder Templates'],
    responses={
        201: FolderDetailSerializer,
        400: OpenApiResponse(description='Validation error'),
        404: OpenApiResponse(description='Template not found'),
    }
)
class FolderTemplateInstantiateView(APIView):
    """
    Create folders from a template.

    Instantiates a folder structure based on the template definition.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, template_id):
        """Instantiate template"""
        try:
            # Get template
            user = request.user
            template = FolderTemplate.objects.get(id=template_id, is_active=True)

            # Check permissions
            if not user.is_staff:
                if template.department and template.department != user.department:
                    return Response(
                        {'error': 'Permission denied'},
                        status=status.HTTP_403_FORBIDDEN
                    )

            # Get parent folder (optional)
            parent_id = request.data.get('parent_folder')
            parent_folder = None
            if parent_id:
                try:
                    parent_folder = Folder.objects.get(id=parent_id)
                except Folder.DoesNotExist:
                    return Response(
                        {'error': 'Parent folder not found'},
                        status=status.HTTP_404_NOT_FOUND
                    )

            # Instantiate template
            from apps.folders.utils import instantiate_template
            root_folder = instantiate_template(
                template=template,
                parent_folder=parent_folder,
                owner=user,
                department=user.department
            )

            logger.info(
                f"Template instantiated: {template.id} ({template.name}) -> {root_folder.id} "
                f"by user {user.username}"
            )

            # Return created folder structure
            response_serializer = FolderDetailSerializer(root_folder)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except FolderTemplate.DoesNotExist:
            raise Http404('Template not found')
        except Exception as e:
            logger.error(f"Template instantiation failed: {e}")
            return Response(
                {'error': 'Template instantiation failed', 'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================================================
# SMART FOLDER VIEWS
# ============================================================================

@extend_schema(
    tags=['Smart Folders'],
    responses={
        200: SmartFolderListSerializer(many=True),
    }
)
class SmartFolderListCreateView(generics.ListCreateAPIView):
    """
    List smart folders or create a new smart folder.

    Returns smart folders accessible to the user:
    - Personal smart folders (owned by user)
    - Department smart folders (if user is in that department)
    - Global smart folders (visible to all)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return SmartFolderCreateSerializer
        return SmartFolderListSerializer

    def get_queryset(self):
        """Get smart folders accessible to user"""
        user = self.request.user

        # Build query for accessible smart folders
        queryset = SmartFolder.objects.select_related(
            'owner', 'department', 'created_by'
        )

        if user.is_staff:
            # Staff can see all smart folders
            return queryset.filter(is_active=True).order_by('-created_at')

        # Regular users see:
        # 1. Their own personal smart folders
        # 2. Department smart folders for their department
        # 3. Global smart folders
        return queryset.filter(
            Q(owner=user) |  # Personal
            Q(department=user.department, is_personal=False) |  # Department
            Q(is_global=True)  # Global
        ).filter(is_active=True).order_by('-created_at')

    def perform_create(self, serializer):
        """Create smart folder with ownership"""
        smart_folder = serializer.save(
            owner=self.request.user,
            created_by=self.request.user
        )

        logger.info(
            f"Smart folder created: {smart_folder.id} ({smart_folder.name}) "
            f"by user {self.request.user.username}"
        )


@extend_schema(
    tags=['Smart Folders'],
    responses={
        200: SmartFolderDetailSerializer,
        403: OpenApiResponse(description='Permission denied'),
        404: OpenApiResponse(description='Smart folder not found'),
    }
)
class SmartFolderDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a smart folder.

    Only the owner or admin can update/delete.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return SmartFolderUpdateSerializer
        return SmartFolderDetailSerializer

    def get_queryset(self):
        """Get smart folders accessible to user"""
        user = self.request.user

        if user.is_staff:
            return SmartFolder.objects.all()

        return SmartFolder.objects.filter(
            Q(owner=user) |
            Q(department=user.department, is_personal=False) |
            Q(is_global=True)
        )

    def perform_update(self, serializer):
        """Only owner or admin can update"""
        smart_folder = self.get_object()
        user = self.request.user

        if smart_folder.owner != user and not user.is_staff:
            return Response(
                {'error': 'Only the owner can update this smart folder'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer.save()
        logger.info(
            f"Smart folder updated: {smart_folder.id} by user {user.username}"
        )

    def perform_destroy(self, instance):
        """Only owner or admin can delete"""
        user = self.request.user

        if instance.owner != user and not user.is_staff:
            return Response(
                {'error': 'Only the owner can delete this smart folder'},
                status=status.HTTP_403_FORBIDDEN
            )

        logger.info(
            f"Smart folder deleted: {instance.id} ({instance.name}) by user {user.username}"
        )
        instance.delete()


@extend_schema(
    tags=['Smart Folders'],
    responses={
        200: OpenApiResponse(
            description='List of documents matching smart folder criteria'
        ),
        403: OpenApiResponse(description='Permission denied'),
        404: OpenApiResponse(description='Smart folder not found'),
    }
)
class SmartFolderDocumentsView(APIView):
    """
    Get all documents matching a smart folder's criteria.

    Returns documents filtered by the smart folder's search criteria
    and the user's permissions.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        """Get matching documents"""
        try:
            smart_folder = SmartFolder.objects.get(pk=pk)
        except SmartFolder.DoesNotExist:
            raise Http404('Smart folder not found')

        # Check if user has access to this smart folder
        if not smart_folder.is_accessible_by(request.user):
            return Response(
                {'error': 'You do not have access to this smart folder'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get matching documents
        documents = smart_folder.get_matching_documents(user=request.user)

        # Serialize documents
        from apps.documents.serializers import DocumentListSerializer
        serializer = DocumentListSerializer(
            documents,
            many=True,
            context={'request': request}
        )

        logger.info(
            f"Smart folder documents retrieved: {smart_folder.id} "
            f"({documents.count()} docs) by user {request.user.username}"
        )

        return Response({
            'smart_folder': {
                'id': str(smart_folder.id),
                'name': smart_folder.name,
                'criteria': smart_folder.criteria
            },
            'count': documents.count(),
            'documents': serializer.data
        })


@extend_schema(
    tags=['Smart Folders'],
    responses={
        200: OpenApiResponse(description='Document count updated'),
        403: OpenApiResponse(description='Permission denied'),
        404: OpenApiResponse(description='Smart folder not found'),
    }
)
class SmartFolderRefreshCountView(APIView):
    """
    Refresh the cached document count for a smart folder.

    Recalculates the number of documents matching the criteria.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        """Refresh document count"""
        try:
            smart_folder = SmartFolder.objects.get(pk=pk)
        except SmartFolder.DoesNotExist:
            raise Http404('Smart folder not found')

        # Check if user has access
        if not smart_folder.is_accessible_by(request.user):
            return Response(
                {'error': 'You do not have access to this smart folder'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Update count
        smart_folder.update_document_count()

        logger.info(
            f"Smart folder count refreshed: {smart_folder.id} "
            f"({smart_folder.document_count} docs) by user {request.user.username}"
        )

        return Response({
            'id': str(smart_folder.id),
            'name': smart_folder.name,
            'document_count': smart_folder.document_count,
            'last_count_update': smart_folder.last_count_update
        })
