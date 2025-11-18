from django.conf import settings
from django.db import models
import uuid


class Folder(models.Model):
    """
    Hierarchical folder structure for organizing documents.

    Features:
    - Unlimited nested folder structure (parent-child relationships)
    - Materialized path for efficient tree traversal
    - Depth tracking for UI rendering
    - Confidentiality level inheritance
    - Unique folder names within same parent
    """

    CONFIDENTIALITY_CHOICES = [
        ('PUBLIC', 'Public'),
        ('INTERNAL', 'Internal'),
        ('CONFIDENTIAL', 'Confidential'),
        ('HIGHLY_CONFIDENTIAL', 'Highly Confidential'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='children'
    )

    # Materialized path for efficient querying
    # Example: /engineering/projects/2024/
    path = models.TextField(
        help_text='Full folder path for efficient tree queries'
    )

    # Depth level in the hierarchy (0 for root folders)
    depth = models.IntegerField(default=0)

    # Ownership and department
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='owned_folders'
    )
    department = models.ForeignKey(
        'users.Department',
        on_delete=models.PROTECT,
        related_name='folders'
    )

    # Security
    confidentiality_level = models.CharField(
        max_length=20,
        choices=CONFIDENTIALITY_CHOICES,
        default='INTERNAL'
    )

    # Metadata
    description = models.TextField(blank=True)

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
        ]
        unique_together = ['parent', 'name']
        ordering = ['path', 'name']

    def __str__(self):
        return self.path or self.name

    def save(self, *args, **kwargs):
        """
        Override save to automatically update path and depth.
        """
        if self.parent:
            self.depth = self.parent.depth + 1
            self.path = f"{self.parent.path}{self.name}/"
        else:
            self.depth = 0
            self.path = f"/{self.name}/"

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
        ('star', 'Star'),
        ('bookmark', 'Bookmark'),
        ('filter', 'Filter'),
        ('search', 'Search'),
        ('tag', 'Tag'),
        ('folder_special', 'Special Folder'),
    ]

    COLOR_CHOICES = [
        ('#FF5733', 'Red'),
        ('#33FF57', 'Green'),
        ('#3357FF', 'Blue'),
        ('#FF33F5', 'Purple'),
        ('#F5FF33', 'Yellow'),
        ('#33FFF5', 'Cyan'),
        ('#FF8C33', 'Orange'),
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
        default='folder_special'
    )
    color = models.CharField(
        max_length=7,
        choices=COLOR_CHOICES,
        default='#3357FF'
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
        ]
        ordering = ['name']

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

        # Start with all non-deleted documents
        queryset = Document.objects.filter(is_deleted=False)

        # Apply permission filtering if user provided
        if user and not user.is_staff:
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
