"""
Favorites API Views

API endpoints for managing user favorites (folders and documents).
"""

from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiResponse
from django.shortcuts import get_object_or_404

from apps.users.models_favorites import FavoriteFolder, FavoriteDocument
from apps.folders.models import Folder
from apps.documents.models import Document
from apps.users.serializers_favorites import (
    FavoriteFolderSerializer,
    FavoriteDocumentSerializer,
    FavoriteFolderListSerializer,
    FavoriteDocumentListSerializer,
)

import logging

logger = logging.getLogger(__name__)


@extend_schema(
    tags=['Favorites'],
    responses={
        200: FavoriteFolderListSerializer(many=True),
    }
)
class FavoriteFolderListView(generics.ListAPIView):
    """
    List all favorite folders for the current user.
    """
    serializer_class = FavoriteFolderListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return FavoriteFolder.objects.filter(
            user=self.request.user
        ).select_related('folder', 'folder__department')


@extend_schema(
    tags=['Favorites'],
    request=FavoriteFolderSerializer,
    responses={
        201: FavoriteFolderSerializer,
        400: OpenApiResponse(description='Already favorited or invalid folder'),
        404: OpenApiResponse(description='Folder not found'),
    }
)
class FavoriteFolderCreateView(APIView):
    """
    Add a folder to favorites.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        folder_id = request.data.get('folder_id')
        if not folder_id:
            return Response(
                {'error': 'folder_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if folder exists
        folder = get_object_or_404(Folder, id=folder_id)

        # Check if already favorited
        if FavoriteFolder.objects.filter(user=request.user, folder=folder).exists():
            return Response(
                {'error': 'Folder is already in favorites'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create favorite
        favorite = FavoriteFolder.objects.create(
            user=request.user,
            folder=folder
        )

        logger.info(f"User {request.user.username} added folder {folder.name} to favorites")

        serializer = FavoriteFolderSerializer(favorite)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=['Favorites'],
    responses={
        204: OpenApiResponse(description='Folder removed from favorites'),
        404: OpenApiResponse(description='Favorite not found'),
    }
)
class FavoriteFolderDeleteView(APIView):
    """
    Remove a folder from favorites.
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, folder_id):
        favorite = get_object_or_404(
            FavoriteFolder,
            user=request.user,
            folder_id=folder_id
        )
        folder_name = favorite.folder.name
        favorite.delete()

        logger.info(f"User {request.user.username} removed folder {folder_name} from favorites")

        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    tags=['Favorites'],
    responses={
        200: FavoriteDocumentListSerializer(many=True),
    }
)
class FavoriteDocumentListView(generics.ListAPIView):
    """
    List all favorite documents for the current user.
    """
    serializer_class = FavoriteDocumentListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return FavoriteDocument.objects.filter(
            user=self.request.user
        ).select_related('document', 'document__folder', 'document__department')


@extend_schema(
    tags=['Favorites'],
    request=FavoriteDocumentSerializer,
    responses={
        201: FavoriteDocumentSerializer,
        400: OpenApiResponse(description='Already favorited or invalid document'),
        404: OpenApiResponse(description='Document not found'),
    }
)
class FavoriteDocumentCreateView(APIView):
    """
    Add a document to favorites.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        document_id = request.data.get('document_id')
        if not document_id:
            return Response(
                {'error': 'document_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if document exists
        document = get_object_or_404(Document, id=document_id, is_deleted=False)

        # Check if already favorited
        if FavoriteDocument.objects.filter(user=request.user, document=document).exists():
            return Response(
                {'error': 'Document is already in favorites'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create favorite
        favorite = FavoriteDocument.objects.create(
            user=request.user,
            document=document
        )

        logger.info(f"User {request.user.username} added document {document.title} to favorites")

        serializer = FavoriteDocumentSerializer(favorite)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=['Favorites'],
    responses={
        204: OpenApiResponse(description='Document removed from favorites'),
        404: OpenApiResponse(description='Favorite not found'),
    }
)
class FavoriteDocumentDeleteView(APIView):
    """
    Remove a document from favorites.
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, document_id):
        favorite = get_object_or_404(
            FavoriteDocument,
            user=request.user,
            document_id=document_id
        )
        document_title = favorite.document.title
        favorite.delete()

        logger.info(f"User {request.user.username} removed document {document_title} from favorites")

        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(
    tags=['Favorites'],
    responses={
        200: {'type': 'object', 'properties': {'is_favorite': {'type': 'boolean'}}},
    }
)
class CheckFolderFavoriteView(APIView):
    """
    Check if a folder is in the user's favorites.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, folder_id):
        is_favorite = FavoriteFolder.objects.filter(
            user=request.user,
            folder_id=folder_id
        ).exists()
        return Response({'is_favorite': is_favorite})


@extend_schema(
    tags=['Favorites'],
    responses={
        200: {'type': 'object', 'properties': {'is_favorite': {'type': 'boolean'}}},
    }
)
class CheckDocumentFavoriteView(APIView):
    """
    Check if a document is in the user's favorites.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, document_id):
        is_favorite = FavoriteDocument.objects.filter(
            user=request.user,
            document_id=document_id
        ).exists()
        return Response({'is_favorite': is_favorite})


@extend_schema(
    tags=['Favorites'],
    responses={
        200: {'type': 'object', 'properties': {'is_favorite': {'type': 'boolean'}}},
        201: {'type': 'object', 'properties': {'is_favorite': {'type': 'boolean'}}},
    }
)
class ToggleFolderFavoriteView(APIView):
    """
    Toggle a folder's favorite status.
    If favorited, removes from favorites.
    If not favorited, adds to favorites.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, folder_id):
        folder = get_object_or_404(Folder, id=folder_id)

        favorite, created = FavoriteFolder.objects.get_or_create(
            user=request.user,
            folder=folder
        )

        if not created:
            # Already existed, so remove it
            favorite.delete()
            logger.info(f"User {request.user.username} removed folder {folder.name} from favorites")
            return Response({'is_favorite': False}, status=status.HTTP_200_OK)
        else:
            logger.info(f"User {request.user.username} added folder {folder.name} to favorites")
            return Response({'is_favorite': True}, status=status.HTTP_201_CREATED)


@extend_schema(
    tags=['Favorites'],
    responses={
        200: {'type': 'object', 'properties': {'is_favorite': {'type': 'boolean'}}},
        201: {'type': 'object', 'properties': {'is_favorite': {'type': 'boolean'}}},
    }
)
class ToggleDocumentFavoriteView(APIView):
    """
    Toggle a document's favorite status.
    If favorited, removes from favorites.
    If not favorited, adds to favorites.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, document_id):
        document = get_object_or_404(Document, id=document_id, is_deleted=False)

        favorite, created = FavoriteDocument.objects.get_or_create(
            user=request.user,
            document=document
        )

        if not created:
            # Already existed, so remove it
            favorite.delete()
            logger.info(f"User {request.user.username} removed document {document.title} from favorites")
            return Response({'is_favorite': False}, status=status.HTTP_200_OK)
        else:
            logger.info(f"User {request.user.username} added document {document.title} to favorites")
            return Response({'is_favorite': True}, status=status.HTTP_201_CREATED)
