from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
import uuid


class Folder(models.Model):
    """
    Hierarchical folder structure for organizing documents.

    In the Department-as-Root architecture, folders MUST belong to a department.
    The department acts as the implicit root container, and folder paths include
    the department code as a prefix.

    Features:
    - Unlimited nested folder structure (parent-child relationships)
    - Materialized path for efficient tree traversal (includes department prefix)
    - Depth tracking for UI rendering (0 = root within department)
    - Confidentiality level inheritance
    - Unique folder names within same parent AND department
    - Multi-tenant organization support
    - Department-enforced data isolation

    Path Format: /{DEPARTMENT_CODE}/{FolderName}/{SubFolderName}/
    Example: /ENGAGEMENTS/Clients/ClientA/Documents/
    """

    CONFIDENTIALITY_CHOICES = [
        ('PUBLIC', 'Public'),
        ('INTERNAL', 'Internal'),
        ('CONFIDENTIAL', 'Confidential'),
        ('HIGHLY_CONFIDENTIAL', 'Highly Confidential'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Multi-tenant organization
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.PROTECT,
        related_name='folders',
        null=True,  # Nullable for migration - will be non-null after data migration
        blank=True,
        help_text='Organization this folder belongs to'
    )

    name = models.CharField(max_length=255)
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='children'
    )

    # CRITICAL: Department is REQUIRED - this is the core of Department-as-Root architecture
    # All folders must belong to exactly one department
    department = models.ForeignKey(
        'users.Department',
        on_delete=models.PROTECT,
        related_name='folders',
        help_text='Department this folder belongs to (required - acts as root container)'
    )

    # Materialized path for efficient querying
    # Format: /{DEPARTMENT_CODE}/{FolderName}/.../
    # Example: /ENGAGEMENTS/Clients/ClientA/
    path = models.TextField(
        db_index=True,
        help_text='Full folder path including department code prefix'
    )

    # Depth level in the hierarchy (0 for root folders within department)
    depth = models.IntegerField(default=0)

    # Ownership
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='owned_folders'
    )

    # Security
    confidentiality_level = models.CharField(
        max_length=20,
        choices=CONFIDENTIALITY_CHOICES,
        default='INTERNAL'
    )

    # Metadata
    description = models.TextField(blank=True)

    # Lock status
    is_locked = models.BooleanField(
        default=False,
        help_text='If True, folder and its contents cannot be modified or deleted'
    )

    # Soft delete / Trash
    is_deleted = models.BooleanField(
        default=False,
        help_text='If True, folder is in trash'
    )
    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the folder was moved to trash'
    )
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='folders_deleted',
        help_text='User who deleted this folder'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='folders_created'
    )

    class Meta:
        db_table = 'folders'
        verbose_name = 'Folder'
        verbose_name_plural = 'Folders'
        indexes = [
            models.Index(fields=['parent']),
            models.Index(fields=['path']),
            models.Index(fields=['owner']),
            models.Index(fields=['department']),
            models.Index(fields=['created_at']),
            models.Index(fields=['is_deleted']),
            models.Index(fields=['deleted_at']),
            # New indexes for department-based queries
            models.Index(fields=['department', 'parent']),
            models.Index(fields=['department', 'is_deleted']),
        ]
        # Unique folder names within same parent AND department
        # This allows same folder name in different departments when parent is null
        unique_together = [['parent', 'name', 'department']]
        ordering = ['path', 'name']

    def __str__(self):
        return self.path or self.name

    def clean(self):
        """
        Validate folder data before saving.

        Ensures:
        1. Department consistency: child folders must have same department as parent
        2. No circular references in the folder hierarchy
        """
        # Validate department consistency with parent
        if self.parent and self.parent.department_id != self.department_id:
            raise ValidationError({
                'department': 'Folder must belong to the same department as its parent folder.'
            })

        # Prevent circular references
        if self.parent:
            current = self.parent
            visited = {self.pk} if self.pk else set()
            while current:
                if current.pk in visited:
                    raise ValidationError({
                        'parent': 'Circular reference detected in folder hierarchy.'
                    })
                visited.add(current.pk)
                current = current.parent

    def save(self, *args, **kwargs):
        """
        Override save to automatically update path and depth.

        Path format: /{DEPARTMENT_CODE}/{FolderName}/.../
        The department code is always the first element in the path.
        """
        # Compute path with department prefix BEFORE validation
        # This ensures the path is available during full_clean()
        if self.parent:
            self.depth = self.parent.depth + 1
            self.path = f"{self.parent.path}{self.name}/"
        else:
            # Root folder within department - path starts with department code
            self.depth = 0
            self.path = f"/{self.department.code}/{self.name}/"

        # Run validation after path is computed
        self.full_clean()

        super().save(*args, **kwargs)

        # Update paths of all children if path changed
        self._update_children_paths()

    def _update_children_paths(self):
        """Update paths of all child folders recursively"""
        for child in self.children.all():
            child.path = f"{self.path}{child.name}/"
            child.depth = self.depth + 1
            child.save(update_fields=['path', 'depth'])

    @property
    def is_root(self):
        """Check if this is a root folder"""
        return self.parent is None

    @property
    def ancestors(self):
        """Get all ancestor folders (parent, grandparent, etc.)"""
        ancestors = []
        current = self.parent
        while current:
            ancestors.append(current)
            current = current.parent
        return reversed(ancestors)

    def get_descendants(self, include_self=False):
        """Get all descendant folders"""
        if include_self:
            return Folder.objects.filter(path__startswith=self.path)
        else:
            return Folder.objects.filter(
                path__startswith=self.path
            ).exclude(id=self.id)

    def get_breadcrumb(self):
        """Get breadcrumb trail from root to this folder"""
        breadcrumb = list(self.ancestors)
        breadcrumb.append(self)
        return breadcrumb

    def is_ancestor_of(self, folder):
        """Check if this folder is an ancestor of the given folder"""
        return folder.path.startswith(self.path) and folder.id != self.id

    def soft_delete(self, user):
        """
        Move folder and all its contents to trash.

        This marks the folder and all descendant folders as deleted.
        Documents within these folders are also marked as deleted.
        """
        from django.utils import timezone
        from apps.documents.models import Document

        now = timezone.now()

        # Mark this folder as deleted
        self.is_deleted = True
        self.deleted_at = now
        self.deleted_by = user
        self.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])

        # Mark all descendant folders as deleted
        descendant_folders = self.get_descendants()
        descendant_folders.update(
            is_deleted=True,
            deleted_at=now,
            deleted_by=user
        )

        # Mark all documents in this folder and descendants as deleted
        # Note: Document model only has is_deleted and deleted_at, not deleted_by
        folder_ids = [self.id] + list(descendant_folders.values_list('id', flat=True))
        Document.objects.filter(
            folder_id__in=folder_ids,
            is_deleted=False
        ).update(
            is_deleted=True,
            deleted_at=now
        )

        return True

    def restore(self, user):
        """
        Restore folder and all its contents from trash.

        This unmarks the folder and all descendant folders as deleted.
        Documents within these folders are also restored.
        """
        from apps.documents.models import Document

        # Check if parent folder exists and is not deleted
        if self.parent and self.parent.is_deleted:
            raise ValueError("Cannot restore folder: parent folder is still in trash")

        # Restore this folder
        self.is_deleted = False
        self.deleted_at = None
        self.deleted_by = None
        self.save(update_fields=['is_deleted', 'deleted_at', 'deleted_by'])

        # Restore all descendant folders
        descendant_folders = Folder.objects.filter(
            path__startswith=self.path,
            is_deleted=True
        ).exclude(id=self.id)
        descendant_folders.update(
            is_deleted=False,
            deleted_at=None,
            deleted_by=None
        )

        # Restore all documents that were deleted at the same time
        # Note: Document model only has is_deleted and deleted_at, not deleted_by
        folder_ids = [self.id] + list(descendant_folders.values_list('id', flat=True))
        Document.objects.filter(
            folder_id__in=folder_ids,
            is_deleted=True
        ).update(
            is_deleted=False,
            deleted_at=None
        )

        return True

    def permanent_delete(self):
        """
        Permanently delete folder and all its contents.

        This should only be called on folders that are already in trash.
        WARNING: This action is irreversible!
        """
        from apps.documents.models import Document

        # Get all descendant folder IDs
        folder_ids = [self.id] + list(self.get_descendants().values_list('id', flat=True))

        # Delete all documents in these folders (this will also delete files from storage)
        documents = Document.objects.filter(folder_id__in=folder_ids)
        for doc in documents:
            doc.delete()  # This triggers the document's delete method to clean up storage

        # Delete all descendant folders first (to avoid FK constraint issues)
        Folder.objects.filter(id__in=folder_ids).exclude(id=self.id).delete()

        # Delete this folder
        self.delete()

        return True


class FolderTemplate(models.Model):
    """
    Predefined folder templates for recurring structures.

    Examples:
    - Project Folders (Project/Documents/Images/Reports)
    - Employee Files (Personal/Payroll/Performance/Training)
    - Client Records (Profile/Contracts/Invoices/Communications)
    """
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField()
    structure = models.JSONField(
        help_text='JSON structure defining the folder hierarchy'
    )
    department = models.ForeignKey(
        'users.Department',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='folder_templates'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='folder_templates_created'
    )

    class Meta:
        db_table = 'folder_templates'
        verbose_name = 'Folder Template'
        verbose_name_plural = 'Folder Templates'
        ordering = ['name']

    def __str__(self):
        return self.name


class SmartFolder(models.Model):
    """
    Dynamic folders based on saved search criteria.

    Smart folders automatically populate with documents matching
    specified search/filter criteria in real-time.

    Features:
    - JSON-based search criteria
    - Real-time document matching
    - Department-specific or personal smart folders
    - Shareable configurations
    - Support for complex queries (AND, OR conditions)

    Example criteria:
    {
        "document_type": "INVOICE",
        "confidentiality_level": "CONFIDENTIAL",
        "date_range": {"from": "2024-01-01", "to": "2024-12-31"},
        "tags": ["urgent", "finance"],
        "folder_path": "/Accounts/"
    }
    """

    ICON_CHOICES = [
        ('folder-search', 'Folder Search'),
        ('folder-star', 'Folder Star'),
        ('folder-clock', 'Folder Clock'),
        ('filter', 'Filter'),
        ('search', 'Search'),
        ('star', 'Star'),
        ('bookmark', 'Bookmark'),
        ('tag', 'Tag'),
        ('calendar', 'Calendar'),
        ('briefcase', 'Briefcase'),
        ('folder_special', 'Special Folder'),
    ]

    COLOR_CHOICES = [
        ('blue', 'Blue'),
        ('green', 'Green'),
        ('yellow', 'Yellow'),
        ('orange', 'Orange'),
        ('red', 'Red'),
        ('purple', 'Purple'),
        ('pink', 'Pink'),
        ('teal', 'Teal'),
        ('indigo', 'Indigo'),
        ('gray', 'Gray'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Basic info
    name = models.CharField(
        max_length=255,
        help_text='Display name for the smart folder'
    )
    description = models.TextField(
        blank=True,
        help_text='Description of what documents this smart folder contains'
    )

    # Search criteria (JSON)
    criteria = models.JSONField(
        help_text='JSON object defining search/filter criteria'
    )

    # Visual customization
    icon = models.CharField(
        max_length=50,
        choices=ICON_CHOICES,
        default='folder-search'
    )
    color = models.CharField(
        max_length=20,
        choices=COLOR_CHOICES,
        default='blue'
    )

    # Ownership and visibility
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='smart_folders_owned',
        help_text='User who created this smart folder'
    )
    department = models.ForeignKey(
        'users.Department',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='smart_folders',
        help_text='If set, smart folder is visible to entire department'
    )
    is_personal = models.BooleanField(
        default=True,
        help_text='If True, only visible to owner; if False, shared with department'
    )
    is_global = models.BooleanField(
        default=False,
        help_text='If True, visible to all users (admin-created smart folders)'
    )

    # Metadata
    is_active = models.BooleanField(
        default=True,
        help_text='Whether this smart folder is active'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='smart_folders_created'
    )

    # Statistics (cached)
    document_count = models.IntegerField(
        default=0,
        help_text='Cached count of matching documents (updated periodically)'
    )
    last_count_update = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When document_count was last updated'
    )

    # Scope settings for "My Documents" feature
    include_owned = models.BooleanField(
        default=True,
        help_text='Include documents owned by the user'
    )
    include_shared = models.BooleanField(
        default=False,
        help_text='Include documents shared with the user'
    )

    # Display settings
    display_order = models.IntegerField(
        default=0,
        db_index=True,
        help_text='Order in which to display in sidebar'
    )
    is_visible = models.BooleanField(
        default=True,
        help_text='Whether to show in sidebar'
    )

    class Meta:
        db_table = 'smart_folders'
        verbose_name = 'Smart Folder'
        verbose_name_plural = 'Smart Folders'
        indexes = [
            models.Index(fields=['owner']),
            models.Index(fields=['department']),
            models.Index(fields=['is_personal']),
            models.Index(fields=['is_global']),
            models.Index(fields=['is_active']),
            models.Index(fields=['created_at']),
            models.Index(fields=['owner', 'display_order']),
            models.Index(fields=['owner', 'is_visible']),
        ]
        ordering = ['display_order', 'name']

    def __str__(self):
        return f"{self.name} ({'Personal' if self.is_personal else 'Shared'})"

    def get_matching_documents(self, user=None):
        """
        Get all documents matching this smart folder's criteria.

        Args:
            user: Optional user object for permission filtering

        Returns:
            QuerySet of matching documents
        """
        from apps.documents.models import Document
        from django.db.models import Q
        from django.utils import timezone
        from datetime import timedelta

        # Start with all non-deleted documents
        queryset = Document.objects.filter(is_deleted=False)

        # Apply scope filtering based on include_owned and include_shared
        effective_user = user or self.owner
        scope_filter = Q()

        if self.include_owned:
            scope_filter |= Q(owner=effective_user)

        if self.include_shared:
            # TODO: Add shared document filtering when sharing model is integrated
            pass

        if scope_filter:
            queryset = queryset.filter(scope_filter)
        elif user and not user.is_staff:
            # Fallback to department filter if no scope specified
            queryset = queryset.filter(department=user.department)

        # Apply search criteria
        criteria = self.criteria

        # Document type filter
        if 'document_type' in criteria:
            if isinstance(criteria['document_type'], list):
                queryset = queryset.filter(document_type__in=criteria['document_type'])
            else:
                queryset = queryset.filter(document_type=criteria['document_type'])

        # Confidentiality level filter
        if 'confidentiality_level' in criteria:
            if isinstance(criteria['confidentiality_level'], list):
                queryset = queryset.filter(confidentiality_level__in=criteria['confidentiality_level'])
            else:
                queryset = queryset.filter(confidentiality_level=criteria['confidentiality_level'])

        # Date range filter
        if 'date_range' in criteria:
            date_range = criteria['date_range']
            if 'from' in date_range:
                queryset = queryset.filter(document_date__gte=date_range['from'])
            if 'to' in date_range:
                queryset = queryset.filter(document_date__lte=date_range['to'])

        # Folder path filter (documents in specific folder or its descendants)
        if 'folder_path' in criteria:
            queryset = queryset.filter(folder__path__startswith=criteria['folder_path'])

        # Folder ID filter
        if 'folder_id' in criteria:
            if isinstance(criteria['folder_id'], list):
                queryset = queryset.filter(folder_id__in=criteria['folder_id'])
            else:
                queryset = queryset.filter(folder_id=criteria['folder_id'])

        # Tags filter
        if 'tags' in criteria:
            from apps.documents.models import Tag
            tag_names = criteria['tags']
            if isinstance(tag_names, list):
                # Documents must have ALL specified tags
                for tag_name in tag_names:
                    queryset = queryset.filter(document_tags__tag__name=tag_name)
            else:
                queryset = queryset.filter(document_tags__tag__name=tag_names)

        # File type filter (MIME type)
        if 'file_type' in criteria:
            if isinstance(criteria['file_type'], list):
                queryset = queryset.filter(file_type__in=criteria['file_type'])
            else:
                queryset = queryset.filter(file_type__icontains=criteria['file_type'])

        # File size filter (in bytes)
        if 'file_size_min' in criteria:
            queryset = queryset.filter(file_size__gte=criteria['file_size_min'])
        if 'file_size_max' in criteria:
            queryset = queryset.filter(file_size__lte=criteria['file_size_max'])

        # Owner filter
        if 'owner_id' in criteria:
            if isinstance(criteria['owner_id'], list):
                queryset = queryset.filter(owner_id__in=criteria['owner_id'])
            else:
                queryset = queryset.filter(owner_id=criteria['owner_id'])

        # Department filter
        if 'department_id' in criteria:
            if isinstance(criteria['department_id'], list):
                queryset = queryset.filter(department_id__in=criteria['department_id'])
            else:
                queryset = queryset.filter(department_id=criteria['department_id'])

        # Full-text search filter
        if 'search_text' in criteria:
            search_text = criteria['search_text']
            queryset = queryset.filter(
                Q(title__icontains=search_text) |
                Q(extracted_text__icontains=search_text) |
                Q(identifier__icontains=search_text)
            )

        # Created date range
        if 'created_date_range' in criteria:
            created_range = criteria['created_date_range']
            if 'from' in created_range:
                queryset = queryset.filter(created_at__gte=created_range['from'])
            if 'to' in created_range:
                queryset = queryset.filter(created_at__lte=created_range['to'])

        # Relative date filter (today, this_week, this_month, last_7_days, last_30_days)
        if 'relative_date' in criteria:
            relative = criteria['relative_date']
            now = timezone.now()

            if relative == 'today':
                start = now.replace(hour=0, minute=0, second=0, microsecond=0)
                queryset = queryset.filter(updated_at__gte=start)
            elif relative == 'this_week':
                start = now - timedelta(days=now.weekday())
                start = start.replace(hour=0, minute=0, second=0, microsecond=0)
                queryset = queryset.filter(updated_at__gte=start)
            elif relative == 'this_month':
                start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                queryset = queryset.filter(updated_at__gte=start)
            elif relative == 'last_7_days':
                start = now - timedelta(days=7)
                queryset = queryset.filter(updated_at__gte=start)
            elif relative == 'last_30_days':
                start = now - timedelta(days=30)
                queryset = queryset.filter(updated_at__gte=start)

        # Document state filter (DRAFT, IN_REVIEW, APPROVED, etc.)
        if 'state' in criteria:
            states = criteria['state']
            if isinstance(states, list):
                queryset = queryset.filter(state__in=states)
            else:
                queryset = queryset.filter(state=states)

        # Name/title contains filter
        if 'name_contains' in criteria:
            name_query = criteria['name_contains']
            queryset = queryset.filter(
                Q(title__icontains=name_query) |
                Q(file_name__icontains=name_query)
            )

        return queryset.distinct()

    def update_document_count(self):
        """Update the cached document count"""
        from django.utils import timezone
        self.document_count = self.get_matching_documents().count()
        self.last_count_update = timezone.now()
        self.save(update_fields=['document_count', 'last_count_update'])

    def is_accessible_by(self, user):
        """Check if user has access to this smart folder"""
        if self.is_global:
            return True
        if self.owner == user:
            return True
        if not self.is_personal and self.department == user.department:
            return True
        if user.is_staff:
            return True
        return False

    @classmethod
    def get_next_order(cls, user) -> int:
        """Get the next display order for a new smart folder."""
        last_folder = cls.objects.filter(owner=user).order_by('-display_order').first()
        if last_folder:
            return last_folder.display_order + 1
        return 0

    @classmethod
    def reorder_items(cls, user, ordered_ids: list) -> int:
        """
        Reorder smart folders based on provided ID list.

        Args:
            user: The user whose smart folders to reorder
            ordered_ids: List of smart folder IDs in desired order

        Returns:
            int: Number of items updated
        """
        updated_count = 0
        for index, folder_id in enumerate(ordered_ids):
            updated = cls.objects.filter(
                id=folder_id,
                owner=user
            ).update(display_order=index)
            updated_count += updated
        return updated_count

    def save(self, *args, **kwargs):
        # Auto-set display_order for new items
        if self._state.adding and self.display_order == 0:
            self.display_order = self.get_next_order(self.owner)
        super().save(*args, **kwargs)
