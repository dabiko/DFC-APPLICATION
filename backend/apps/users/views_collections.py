"""
Favorite Collections API Views

API endpoints for managing favorite collections, reordering,
sharing, and exporting favorites.
"""

import csv
import json
from io import StringIO
from django.http import HttpResponse
from django.db import models, transaction
from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiResponse

from apps.users.models_favorites import FavoriteCollection, FavoriteFolder, FavoriteDocument
from apps.users.serializers_favorites import (
    FavoriteCollectionSerializer,
    FavoriteCollectionCreateSerializer,
    FavoriteCollectionDetailSerializer,
    BulkReorderSerializer,
    MoveToCollectionSerializer,
    ShareCollectionSerializer,
    ExportFavoritesSerializer,
    FavoriteFolderListSerializer,
    FavoriteDocumentListSerializer,
)
from apps.users.models import CustomUser

import logging

logger = logging.getLogger(__name__)


# ============== Collection CRUD ==============

@extend_schema(
    tags=['Favorite Collections'],
    responses={200: FavoriteCollectionSerializer(many=True)}
)
class FavoriteCollectionListView(generics.ListAPIView):
    """
    List all collections for the current user (owned + shared with user).
    """
    serializer_class = FavoriteCollectionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return FavoriteCollection.objects.filter(
            Q(owner=user) | Q(shared_with=user)
        ).distinct().select_related('owner')


@extend_schema(
    tags=['Favorite Collections'],
    request=FavoriteCollectionCreateSerializer,
    responses={
        201: FavoriteCollectionSerializer,
        400: OpenApiResponse(description='Invalid data'),
    }
)
class FavoriteCollectionCreateView(APIView):
    """
    Create a new favorite collection.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = FavoriteCollectionCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Get the next position
        max_position = FavoriteCollection.objects.filter(
            owner=request.user
        ).aggregate(models.Max('position'))['position__max'] or 0

        collection = FavoriteCollection.objects.create(
            owner=request.user,
            position=max_position + 1,
            **serializer.validated_data
        )

        logger.info(f"User {request.user.username} created collection '{collection.name}'")

        return Response(
            FavoriteCollectionSerializer(collection, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )


@extend_schema(
    tags=['Favorite Collections'],
    responses={
        200: FavoriteCollectionDetailSerializer,
        404: OpenApiResponse(description='Collection not found'),
    }
)
class FavoriteCollectionDetailView(APIView):
    """
    Get details of a specific collection.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, collection_id):
        try:
            collection = FavoriteCollection.objects.filter(
                Q(owner=request.user) | Q(shared_with=request.user),
                id=collection_id
            ).distinct().select_related('owner').prefetch_related('shared_with').get()
        except FavoriteCollection.DoesNotExist:
            return Response(
                {'error': 'Collection not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = FavoriteCollectionDetailSerializer(collection, context={'request': request})
        return Response(serializer.data)


@extend_schema(
    tags=['Favorite Collections'],
    request=FavoriteCollectionCreateSerializer,
    responses={
        200: FavoriteCollectionSerializer,
        403: OpenApiResponse(description='Not allowed to edit this collection'),
        404: OpenApiResponse(description='Collection not found'),
    }
)
class FavoriteCollectionUpdateView(APIView):
    """
    Update a collection (only owner can update).
    """
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, collection_id):
        try:
            collection = FavoriteCollection.objects.get(
                id=collection_id,
                owner=request.user
            )
        except FavoriteCollection.DoesNotExist:
            return Response(
                {'error': 'Collection not found or you are not the owner'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = FavoriteCollectionCreateSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        for attr, value in serializer.validated_data.items():
            setattr(collection, attr, value)
        collection.save()

        logger.info(f"User {request.user.username} updated collection '{collection.name}'")

        return Response(
            FavoriteCollectionSerializer(collection, context={'request': request}).data
        )

    def patch(self, request, collection_id):
        return self.put(request, collection_id)


@extend_schema(
    tags=['Favorite Collections'],
    responses={
        204: OpenApiResponse(description='Collection deleted'),
        403: OpenApiResponse(description='Not allowed to delete this collection'),
        404: OpenApiResponse(description='Collection not found'),
    }
)
class FavoriteCollectionDeleteView(APIView):
    """
    Delete a collection (only owner can delete).
    Items in the collection will become uncategorized.
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, collection_id):
        try:
            collection = FavoriteCollection.objects.get(
                id=collection_id,
                owner=request.user
            )
        except FavoriteCollection.DoesNotExist:
            return Response(
                {'error': 'Collection not found or you are not the owner'},
                status=status.HTTP_404_NOT_FOUND
            )

        collection_name = collection.name
        collection.delete()  # Items' collection FK will be set to NULL

        logger.info(f"User {request.user.username} deleted collection '{collection_name}'")

        return Response(status=status.HTTP_204_NO_CONTENT)


# ============== Reorder Operations ==============

@extend_schema(
    tags=['Favorite Collections'],
    request=BulkReorderSerializer,
    responses={
        200: OpenApiResponse(description='Collections reordered successfully'),
        400: OpenApiResponse(description='Invalid data'),
    }
)
class ReorderCollectionsView(APIView):
    """
    Reorder collections (drag-to-reorder).
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = BulkReorderSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        items = serializer.validated_data['items']

        for item in items:
            FavoriteCollection.objects.filter(
                id=item['item_id'],
                owner=request.user
            ).update(position=item['position'])

        logger.info(f"User {request.user.username} reordered collections")

        return Response({'message': 'Collections reordered successfully'})


@extend_schema(
    tags=['Favorite Collections'],
    request=BulkReorderSerializer,
    responses={
        200: OpenApiResponse(description='Items reordered successfully'),
        400: OpenApiResponse(description='Invalid data'),
    }
)
class ReorderFavoriteFoldersView(APIView):
    """
    Reorder favorite folders within a collection or globally.
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = BulkReorderSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        items = serializer.validated_data['items']

        for item in items:
            FavoriteFolder.objects.filter(
                id=item['item_id'],
                user=request.user
            ).update(position=item['position'])

        logger.info(f"User {request.user.username} reordered favorite folders")

        return Response({'message': 'Folders reordered successfully'})


@extend_schema(
    tags=['Favorite Collections'],
    request=BulkReorderSerializer,
    responses={
        200: OpenApiResponse(description='Items reordered successfully'),
        400: OpenApiResponse(description='Invalid data'),
    }
)
class ReorderFavoriteDocumentsView(APIView):
    """
    Reorder favorite documents within a collection or globally.
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = BulkReorderSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        items = serializer.validated_data['items']

        for item in items:
            FavoriteDocument.objects.filter(
                id=item['item_id'],
                user=request.user
            ).update(position=item['position'])

        logger.info(f"User {request.user.username} reordered favorite documents")

        return Response({'message': 'Documents reordered successfully'})


@extend_schema(
    tags=['Favorite Collections'],
    request=MoveToCollectionSerializer,
    responses={
        200: OpenApiResponse(description='Items moved successfully'),
        400: OpenApiResponse(description='Invalid data'),
        404: OpenApiResponse(description='Collection not found'),
    }
)
class MoveToCollectionView(APIView):
    """
    Move favorites to a collection (or to uncategorized if collection_id is null).
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = MoveToCollectionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        collection_id = data['collection_id']
        item_ids = data['item_ids']
        item_type = data['item_type']

        # Validate collection ownership if provided
        collection = None
        if collection_id:
            try:
                collection = FavoriteCollection.objects.get(
                    id=collection_id,
                    owner=request.user
                )
            except FavoriteCollection.DoesNotExist:
                return Response(
                    {'error': 'Collection not found or you are not the owner'},
                    status=status.HTTP_404_NOT_FOUND
                )

        # Move items
        if item_type == 'folder':
            FavoriteFolder.objects.filter(
                id__in=item_ids,
                user=request.user
            ).update(collection=collection)
        else:
            FavoriteDocument.objects.filter(
                id__in=item_ids,
                user=request.user
            ).update(collection=collection)

        logger.info(
            f"User {request.user.username} moved {len(item_ids)} {item_type}(s) "
            f"to collection '{collection.name if collection else 'Uncategorized'}'"
        )

        return Response({'message': f'{len(item_ids)} item(s) moved successfully'})


# ============== Share Operations ==============

@extend_schema(
    tags=['Favorite Collections'],
    request=ShareCollectionSerializer,
    responses={
        200: FavoriteCollectionDetailSerializer,
        403: OpenApiResponse(description='Not allowed to share this collection'),
        404: OpenApiResponse(description='Collection not found'),
    }
)
class ShareCollectionView(APIView):
    """
    Share a collection with other users.
    Supports optional password protection and expiration date.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, collection_id):
        from django.contrib.auth.hashers import make_password

        try:
            collection = FavoriteCollection.objects.get(
                id=collection_id,
                owner=request.user
            )
        except FavoriteCollection.DoesNotExist:
            return Response(
                {'error': 'Collection not found or you are not the owner'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = ShareCollectionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user_ids = serializer.validated_data['user_ids']
        password = serializer.validated_data.get('password')
        expires_at = serializer.validated_data.get('expires_at')
        remove_password = serializer.validated_data.get('remove_password', False)

        # Get valid users (excluding the owner)
        users = CustomUser.objects.filter(
            id__in=user_ids
        ).exclude(id=request.user.id)

        # Update shared_with
        collection.shared_with.set(users)
        collection.is_shared = users.exists()

        # Handle password protection
        if remove_password:
            collection.share_password = None
        elif password:
            # Hash the password before storing
            collection.share_password = make_password(password)

        # Handle expiration
        collection.share_expires_at = expires_at

        collection.save()

        logger.info(
            f"User {request.user.username} shared collection '{collection.name}' "
            f"with {users.count()} user(s)"
            f"{' (password protected)' if collection.share_password else ''}"
            f"{f' (expires: {expires_at})' if expires_at else ''}"
        )

        return Response(
            FavoriteCollectionDetailSerializer(collection, context={'request': request}).data
        )


@extend_schema(
    tags=['Favorite Collections'],
    responses={
        200: OpenApiResponse(description='Sharing removed'),
        404: OpenApiResponse(description='Collection not found'),
    }
)
class UnshareCollectionView(APIView):
    """
    Remove all sharing from a collection.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, collection_id):
        try:
            collection = FavoriteCollection.objects.get(
                id=collection_id,
                owner=request.user
            )
        except FavoriteCollection.DoesNotExist:
            return Response(
                {'error': 'Collection not found or you are not the owner'},
                status=status.HTTP_404_NOT_FOUND
            )

        collection.shared_with.clear()
        collection.is_shared = False
        collection.save()

        logger.info(f"User {request.user.username} unshared collection '{collection.name}'")

        return Response({'message': 'Collection sharing removed'})


# ============== Export Operations ==============

@extend_schema(
    tags=['Favorite Collections'],
    request=ExportFavoritesSerializer,
    responses={
        200: OpenApiResponse(description='Export file'),
        400: OpenApiResponse(description='Invalid parameters'),
    }
)
class ExportFavoritesView(APIView):
    """
    Export favorites list as JSON or CSV.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ExportFavoritesSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        export_format = data.get('format', 'json')
        collection_id = data.get('collection_id')
        include_folders = data.get('include_folders', True)
        include_documents = data.get('include_documents', True)

        # Build queryset filters
        folder_filter = {'user': request.user}
        document_filter = {'user': request.user}

        if collection_id:
            folder_filter['collection_id'] = collection_id
            document_filter['collection_id'] = collection_id

        # Get data
        folders = []
        documents = []

        if include_folders:
            folder_qs = FavoriteFolder.objects.filter(
                **folder_filter
            ).select_related('folder', 'folder__department', 'collection')
            folders = FavoriteFolderListSerializer(folder_qs, many=True).data

        if include_documents:
            document_qs = FavoriteDocument.objects.filter(
                **document_filter
            ).select_related('document', 'document__folder', 'document__department', 'collection')
            documents = FavoriteDocumentListSerializer(document_qs, many=True).data

        # Generate export
        if export_format == 'json':
            return self._export_json(folders, documents)
        else:
            return self._export_csv(folders, documents)

    def _export_json(self, folders, documents):
        """Export as JSON file."""
        export_data = {
            'exported_at': str(self.request.user),
            'folders': folders,
            'documents': documents,
            'total_folders': len(folders),
            'total_documents': len(documents),
        }

        response = HttpResponse(
            json.dumps(export_data, indent=2, default=str),
            content_type='application/json'
        )
        response['Content-Disposition'] = 'attachment; filename="favorites_export.json"'
        return response

    def _export_csv(self, folders, documents):
        """Export as CSV file."""
        output = StringIO()
        writer = csv.writer(output)

        # Header
        writer.writerow([
            'Type', 'Name', 'Path', 'Collection', 'Department',
            'Confidentiality', 'File Type', 'File Size', 'Added Date'
        ])

        # Folders
        for folder in folders:
            writer.writerow([
                'Folder',
                folder.get('folder_name', ''),
                folder.get('folder_path', ''),
                folder.get('collection_name', 'Uncategorized'),
                folder.get('department_name', ''),
                folder.get('confidentiality_level', ''),
                '',
                '',
                folder.get('created_at', ''),
            ])

        # Documents
        for doc in documents:
            writer.writerow([
                'Document',
                doc.get('document_title', '') or doc.get('file_name', ''),
                doc.get('folder_name', ''),
                doc.get('collection_name', 'Uncategorized'),
                doc.get('department_name', ''),
                doc.get('confidentiality_level', ''),
                doc.get('file_type', ''),
                doc.get('file_size', ''),
                doc.get('created_at', ''),
            ])

        response = HttpResponse(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="favorites_export.csv"'
        return response


# ============== Collection Items View ==============

@extend_schema(
    tags=['Favorite Collections'],
    responses={
        200: OpenApiResponse(description='Collection items'),
        404: OpenApiResponse(description='Collection not found'),
    }
)
class CollectionItemsView(APIView):
    """
    Get all items in a specific collection.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, collection_id):
        # Validate access to collection
        try:
            collection = FavoriteCollection.objects.filter(
                Q(owner=request.user) | Q(shared_with=request.user),
                id=collection_id
            ).distinct().get()
        except FavoriteCollection.DoesNotExist:
            return Response(
                {'error': 'Collection not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get folders and documents in this collection
        folders = FavoriteFolder.objects.filter(
            user=request.user,
            collection=collection
        ).select_related('folder', 'folder__department')

        documents = FavoriteDocument.objects.filter(
            user=request.user,
            collection=collection
        ).select_related('document', 'document__folder', 'document__department')

        return Response({
            'collection': FavoriteCollectionSerializer(collection, context={'request': request}).data,
            'folders': FavoriteFolderListSerializer(folders, many=True).data,
            'documents': FavoriteDocumentListSerializer(documents, many=True).data,
        })
