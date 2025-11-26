"""
User Favorites Models

Models for tracking user favorites for documents and folders.
Each user has their own set of favorites.
Includes support for organizing favorites into collections.
"""

from django.conf import settings
from django.db import models
import uuid


class FavoriteCollection(models.Model):
    """
    A collection/group for organizing favorites.

    Users can create named collections to organize their favorites
    (e.g., "Project X Files", "Monthly Reports", "Client ABC").
    Collections can be shared with other users.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    color = models.CharField(max_length=20, default='blue')  # For UI display
    icon = models.CharField(max_length=50, default='folder')  # Icon name

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='owned_collections'
    )

    # Sharing
    is_shared = models.BooleanField(default=False)
    shared_with = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='shared_collections',
        blank=True
    )

    # Share protection (optional)
    share_password = models.CharField(
        max_length=128,
        blank=True,
        null=True,
        help_text='Hashed password for accessing the shared collection'
    )
    share_expires_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text='When the share expires (null = never expires)'
    )

    # Ordering
    position = models.IntegerField(default=0)  # For drag-to-reorder collections

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_favorite_collections'
        ordering = ['position', 'name']
        verbose_name = 'Favorite Collection'
        verbose_name_plural = 'Favorite Collections'

    def __str__(self):
        return f"{self.owner.username} - {self.name}"

    @property
    def item_count(self):
        """Total number of items in this collection."""
        return self.folder_favorites.count() + self.document_favorites.count()


class FavoriteFolder(models.Model):
    """
    Track user's favorite folders.

    Each user can mark any folder they have access to as a favorite.
    Favorites are personal and not shared with other users.
    Can be organized into collections.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='favorite_folders'
    )
    folder = models.ForeignKey(
        'folders.Folder',
        on_delete=models.CASCADE,
        related_name='favorited_by'
    )

    # Collection support (optional - null means "Uncategorized")
    collection = models.ForeignKey(
        FavoriteCollection,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='folder_favorites'
    )

    # Ordering within collection
    position = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_favorite_folders'
        unique_together = ['user', 'folder']
        ordering = ['collection', 'position', '-created_at']
        verbose_name = 'Favorite Folder'
        verbose_name_plural = 'Favorite Folders'

    def __str__(self):
        return f"{self.user.username} - {self.folder.name}"


class FavoriteDocument(models.Model):
    """
    Track user's favorite documents.

    Each user can mark any document they have access to as a favorite.
    Favorites are personal and not shared with other users.
    Can be organized into collections.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='favorite_documents'
    )
    document = models.ForeignKey(
        'documents.Document',
        on_delete=models.CASCADE,
        related_name='favorited_by'
    )

    # Collection support (optional - null means "Uncategorized")
    collection = models.ForeignKey(
        FavoriteCollection,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='document_favorites'
    )

    # Ordering within collection
    position = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_favorite_documents'
        unique_together = ['user', 'document']
        ordering = ['collection', 'position', '-created_at']
        verbose_name = 'Favorite Document'
        verbose_name_plural = 'Favorite Documents'

    def __str__(self):
        return f"{self.user.username} - {self.document.title}"
