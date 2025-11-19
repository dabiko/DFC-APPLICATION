"""
API views for document sharing.

Views:
- ShareViewSet: Authenticated CRUD operations for shares
- PublicShareAccessView: Public access to shares (no authentication required)
- PublicShareDownloadView: Direct download for authorized shares
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django.http import FileResponse, HttpResponse
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q
from django.utils import timezone
from apps.sharing.models import Share, ShareAccess
from apps.sharing.serializers import (
    ShareSerializer,
    CreateShareSerializer,
    PublicShareAccessSerializer,
    ShareAnalyticsSerializer,
    RevokeShareSerializer,
    ShareAccessSerializer
)
from apps.audit.models import AuditLog
import mimetypes


class ShareViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing document shares.

    Authenticated users can create, list, update, and delete their shares.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = ShareSerializer
    filterset_fields = ['document', 'permission', 'is_active']
    search_fields = ['document__title', 'notes']
    ordering_fields = ['created_at', 'expires_at', 'access_count']
    ordering = ['-created_at']

    def get_queryset(self):
        """Return shares created by the current user"""
        return Share.objects.filter(
            created_by=self.request.user
        ).select_related(
            'document',
            'created_by',
            'revoked_by'
        ).prefetch_related(
            'access_records'
        )

    def get_serializer_class(self):
        """Use CreateShareSerializer for creation"""
        if self.action == 'create':
            return CreateShareSerializer
        return ShareSerializer

    @action(detail=True, methods=['post'])
    def revoke(self, request, pk=None):
        """Revoke a share"""
        share = self.get_object()

        serializer = RevokeShareSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        share.revoke(request.user)

        return Response({
            'message': 'Share revoked successfully',
            'share': ShareSerializer(share, context={'request': request}).data
        })

    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        """Get detailed analytics for a share"""
        share = self.get_object()

        # Calculate analytics
        access_records = share.access_records.all()
        unique_ips = access_records.values('ip_address').distinct().count()
        unique_users = access_records.filter(user__isnull=False).values('user').distinct().count()

        recent_accesses = access_records.order_by('-accessed_at')[:20]

        analytics_data = {
            'access_count': share.access_count,
            'download_count': share.download_count,
            'view_count': share.view_count,
            'last_accessed_at': share.last_accessed_at,
            'unique_ips': unique_ips,
            'unique_users': unique_users,
            'recent_accesses': ShareAccessSerializer(recent_accesses, many=True).data
        }

        return Response(analytics_data)

    @action(detail=True, methods=['post'])
    def resend_notifications(self, request, pk=None):
        """Resend email notifications to recipients"""
        share = self.get_object()

        if not share.recipient_emails:
            return Response(
                {'error': 'No recipients configured for this share'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Send notifications
        from apps.sharing.tasks import send_share_notifications
        custom_message = request.data.get('message', '')
        send_share_notifications.delay(str(share.id), custom_message)

        return Response({'message': 'Notifications queued for sending'})

    @action(detail=False, methods=['get'])
    def my_shares(self, request):
        """Get all shares created by the current user with statistics"""
        shares = self.get_queryset()

        # Statistics
        total_shares = shares.count()
        active_shares = shares.filter(is_active=True, expires_at__gt=timezone.now()).count()
        expired_shares = shares.filter(expires_at__lte=timezone.now()).count()
        total_accesses = shares.aggregate(total=Count('access_records'))['total'] or 0

        stats = {
            'total_shares': total_shares,
            'active_shares': active_shares,
            'expired_shares': expired_shares,
            'total_accesses': total_accesses,
        }

        # Paginated shares
        page = self.paginate_queryset(shares)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            result = self.get_paginated_response(serializer.data)
            result.data['statistics'] = stats
            return result

        serializer = self.get_serializer(shares, many=True)
        return Response({
            'statistics': stats,
            'shares': serializer.data
        })


class PublicShareAccessView(APIView):
    """
    Public access to a shared document (NO AUTHENTICATION REQUIRED).

    GET: View share details and document metadata
    POST: Access share with optional password
    """

    permission_classes = [AllowAny]  # No authentication required

    def get(self, request, token):
        """Get share details without password (limited info)"""
        try:
            share = Share.objects.select_related('document', 'created_by').get(token=token)
        except Share.DoesNotExist:
            return Response(
                {'error': 'Invalid share link'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Return limited info without password
        return Response({
            'document_title': share.document.title,
            'document_type': share.document.document_type,
            'permission': share.permission,
            'is_password_protected': share.is_password_protected,
            'expires_at': share.expires_at,
            'is_expired': share.is_expired(),
            'is_accessible': share.is_accessible(),
            'created_by': share.created_by.get_full_name() if share.created_by else 'Unknown',
        })

    def post(self, request, token):
        """Access share with password (if required)"""
        serializer = PublicShareAccessSerializer(
            data=request.data,
            context={'token': token}
        )

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_403_FORBIDDEN
            )

        share = serializer.validated_data['share']

        # Get client info
        ip_address = self.get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        user = request.user if request.user.is_authenticated else None

        # Record access
        share.record_access(
            access_type='view',
            ip_address=ip_address,
            user_agent=user_agent,
            user=user
        )

        # Return full share and document details
        return Response({
            'share': {
                'id': str(share.id),
                'document': {
                    'id': str(share.document.id),
                    'title': share.document.title,
                    'document_type': share.document.document_type,
                    'file_size': share.document.file_size,
                    'uploaded_at': share.document.uploaded_at,
                },
                'permission': share.permission,
                'can_download': share.can_download(),
                'can_comment': share.can_comment(),
                'expires_at': share.expires_at,
                'access_count': share.access_count,
                'download_url': f'/api/v1/shares/public/{token}/download/' if share.can_download() else None,
            }
        })

    def get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class PublicShareDownloadView(APIView):
    """
    Direct download for authorized shares (NO AUTHENTICATION REQUIRED).
    """

    permission_classes = [AllowAny]

    def get(self, request, token):
        """Download the shared document"""
        try:
            share = Share.objects.select_related('document').get(token=token)
        except Share.DoesNotExist:
            return Response(
                {'error': 'Invalid share link'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if share is accessible
        if not share.is_accessible():
            return Response(
                {'error': 'This share is not accessible'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check if download is allowed
        if not share.can_download():
            return Response(
                {'error': 'Download not permitted for this share'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check password if provided in query params
        if share.is_password_protected:
            password = request.query_params.get('password')
            if not share.check_password(password):
                return Response(
                    {'error': 'Password required or incorrect'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Get client info
        ip_address = self.get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        user = request.user if request.user.is_authenticated else None

        # Record download
        share.record_access(
            access_type='download',
            ip_address=ip_address,
            user_agent=user_agent,
            user=user
        )

        # Serve file
        document = share.document

        try:
            # Get file from storage
            file_handle = document.file.open('rb')

            # Determine content type
            content_type, _ = mimetypes.guess_type(document.file_path)
            if not content_type:
                content_type = 'application/octet-stream'

            # Create response
            response = FileResponse(file_handle, content_type=content_type)
            response['Content-Disposition'] = f'attachment; filename="{document.title}"'
            response['Content-Length'] = document.file_size

            return response

        except Exception as e:
            return Response(
                {'error': f'Failed to download file: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_share_password(request, token):
    """
    Verify share password without accessing the document.
    Useful for client-side validation.
    """
    try:
        share = Share.objects.get(token=token)
    except Share.DoesNotExist:
        return Response(
            {'error': 'Invalid share link'},
            status=status.HTTP_404_NOT_FOUND
        )

    if not share.is_password_protected:
        return Response({'valid': True, 'message': 'No password required'})

    password = request.data.get('password')
    is_valid = share.check_password(password)

    return Response({
        'valid': is_valid,
        'message': 'Correct password' if is_valid else 'Incorrect password'
    })
