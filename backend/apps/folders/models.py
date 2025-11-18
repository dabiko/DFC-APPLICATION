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
