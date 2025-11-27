"""
API views for document sharing.

Views:
- ShareViewSet: Authenticated CRUD operations for shares
- PublicShareAccessView: Public access to shares (no authentication required)
- PublicShareDownloadView: Direct download for authorized shares
- SharedWithMeViewSet: "Shared with Me" functionality
- ShareInvitationViewSet: Share invitation management
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
from datetime import timedelta
from apps.sharing.models import (
    Share, ShareAccess, SharedItemAccess, ShareInvitation,
    Notification, NotificationPreferences
)
from apps.sharing.serializers import (
    ShareSerializer,
    CreateShareSerializer,
    PublicShareAccessSerializer,
    ShareAnalyticsSerializer,
    RevokeShareSerializer,
    ShareAccessSerializer,
    SharedItemAccessSerializer,
    SharedItemAccessListSerializer,
    ShortcutUpdateSerializer,
    SharedWithMeStatsSerializer,
    ShareInvitationSerializer,
    AcceptInvitationSerializer,
    DeclineInvitationSerializer,
    CreateShareWithUserSerializer,
    RequestAccessSerializer,
    NotificationSerializer,
    NotificationListSerializer,
    NotificationPreferencesSerializer,
    MarkNotificationsReadSerializer,
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


# ============================================================================
# Shared With Me Views
# ============================================================================


class SharedWithMeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for "Shared with Me" functionality.

    Lists all documents and folders shared with the current user.
    Supports filtering, shortcuts, and statistics.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = SharedItemAccessSerializer

    def get_queryset(self):
        """Return items shared with the current user"""
        queryset = SharedItemAccess.objects.filter(
            recipient=self.request.user,
            is_active=True,
            is_hidden=False
        ).select_related('shared_by')

        # Apply filters
        resource_type = self.request.query_params.get('resource_type')
        if resource_type:
            queryset = queryset.filter(resource_type=resource_type)

        shared_by = self.request.query_params.get('shared_by')
        if shared_by:
            queryset = queryset.filter(shared_by_id=shared_by)

        permission_level = self.request.query_params.get('permission_level')
        if permission_level:
            queryset = queryset.filter(permission_level=permission_level)

        is_external = self.request.query_params.get('is_external')
        if is_external is not None:
            queryset = queryset.filter(is_external_share=is_external.lower() == 'true')

        is_shortcut = self.request.query_params.get('is_shortcut')
        if is_shortcut is not None:
            queryset = queryset.filter(is_shortcut=is_shortcut.lower() == 'true')

        # Date filters
        date_from = self.request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(shared_at__gte=date_from)

        date_to = self.request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(shared_at__lte=date_to)

        # Search
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(resource_name__icontains=search) |
                Q(shared_by__first_name__icontains=search) |
                Q(shared_by__last_name__icontains=search) |
                Q(shared_by__email__icontains=search)
            )

        return queryset.order_by('-is_shortcut', 'shortcut_order', '-shared_at')

    def get_serializer_class(self):
        """Use lightweight serializer for list views"""
        if self.action == 'list':
            return SharedItemAccessListSerializer
        return SharedItemAccessSerializer

    def list(self, request, *args, **kwargs):
        """
        List shared items with grouping by shortcuts and time.
        """
        queryset = self.filter_queryset(self.get_queryset())

        # Separate shortcuts from regular items
        shortcuts = queryset.filter(is_shortcut=True).order_by('shortcut_order')
        regular_items = queryset.filter(is_shortcut=False)

        # Group regular items by time
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=today_start.weekday())
        month_start = today_start.replace(day=1)

        today_items = regular_items.filter(shared_at__gte=today_start)
        this_week_items = regular_items.filter(
            shared_at__gte=week_start,
            shared_at__lt=today_start
        )
        this_month_items = regular_items.filter(
            shared_at__gte=month_start,
            shared_at__lt=week_start
        )
        earlier_items = regular_items.filter(shared_at__lt=month_start)

        serializer_class = self.get_serializer_class()

        return Response({
            'shortcuts': serializer_class(shortcuts, many=True).data,
            'today': serializer_class(today_items[:50], many=True).data,
            'this_week': serializer_class(this_week_items[:50], many=True).data,
            'this_month': serializer_class(this_month_items[:50], many=True).data,
            'earlier': serializer_class(earlier_items[:50], many=True).data,
            'total_count': queryset.count(),
        })

    @action(detail=True, methods=['post'])
    def shortcut(self, request, pk=None):
        """Add or remove item from shortcuts"""
        item = self.get_object()
        serializer = ShortcutUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        is_shortcut = serializer.validated_data['is_shortcut']
        order = serializer.validated_data.get('order')

        if is_shortcut:
            # Check max shortcuts limit
            current_count = SharedItemAccess.objects.filter(
                recipient=request.user,
                is_shortcut=True
            ).count()

            if current_count >= SharedItemAccess.MAX_SHORTCUTS and not item.is_shortcut:
                return Response(
                    {'error': f'Maximum {SharedItemAccess.MAX_SHORTCUTS} shortcuts allowed'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            item.add_shortcut(order)
        else:
            item.remove_shortcut()

        return Response({
            'success': True,
            'is_shortcut': item.is_shortcut,
            'shortcut_order': item.shortcut_order
        })

    @action(detail=True, methods=['post'])
    def hide(self, request, pk=None):
        """Hide an item from the list"""
        item = self.get_object()
        item.hide()

        return Response({'success': True, 'message': 'Item hidden from list'})

    @action(detail=True, methods=['post'])
    def unhide(self, request, pk=None):
        """Unhide an item"""
        item = get_object_or_404(
            SharedItemAccess,
            pk=pk,
            recipient=request.user
        )
        item.unhide()

        return Response({'success': True, 'message': 'Item restored to list'})

    @action(detail=True, methods=['post'])
    def access(self, request, pk=None):
        """Record access to a shared item"""
        item = self.get_object()
        item.record_access()

        return Response({'success': True})

    @action(detail=True, methods=['delete'])
    def leave(self, request, pk=None):
        """Remove yourself from a share (leave shared folder/document)"""
        item = self.get_object()

        # Don't actually delete, just mark as inactive
        item.is_active = False
        item.save(update_fields=['is_active'])

        # Log the action
        AuditLog.log_action(
            user=request.user,
            action='SHARED_ACCESS_LEAVE',
            resource_type=item.resource_type,
            resource_id=str(item.resource_id),
            resource_name=item.resource_name,
            details={
                'shared_by': str(item.shared_by.id),
            }
        )

        return Response({'success': True, 'message': 'You have left this shared item'})

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get statistics for shared with me items"""
        user = request.user
        base_queryset = SharedItemAccess.objects.filter(
            recipient=user,
            is_active=True,
            is_hidden=False
        )

        # Calculate stats
        total = base_queryset.count()
        unread = base_queryset.filter(first_viewed_at__isnull=True).count()
        documents = base_queryset.filter(resource_type=SharedItemAccess.ResourceType.DOCUMENT).count()
        folders = base_queryset.filter(resource_type=SharedItemAccess.ResourceType.FOLDER).count()
        shortcuts = base_queryset.filter(is_shortcut=True).count()
        external = base_queryset.filter(is_external_share=True).count()

        # By permission
        by_permission = {}
        for level in SharedItemAccess.PermissionLevel:
            by_permission[level.value] = base_queryset.filter(permission_level=level.value).count()

        # By sharer (top 10)
        by_sharer = list(
            base_queryset.values(
                'shared_by__id',
                'shared_by__first_name',
                'shared_by__last_name',
                'shared_by__email'
            ).annotate(count=Count('id')).order_by('-count')[:10]
        )

        # Recent (last 7 days)
        week_ago = timezone.now() - timedelta(days=7)
        recent_count = base_queryset.filter(shared_at__gte=week_ago).count()

        # Pending invitations count
        pending_invitations = ShareInvitation.objects.filter(
            invited_user=user,
            status=ShareInvitation.Status.PENDING
        ).count()

        return Response({
            'total': total,
            'unread': unread,
            'documents': documents,
            'folders': folders,
            'shortcuts': shortcuts,
            'external': external,
            'by_permission': by_permission,
            'by_sharer': by_sharer,
            'recent_count': recent_count,
            'pending_invitations': pending_invitations,
        })

    @action(detail=False, methods=['get'])
    def hidden(self, request):
        """Get list of hidden items"""
        queryset = SharedItemAccess.objects.filter(
            recipient=request.user,
            is_active=True,
            is_hidden=True
        ).select_related('shared_by')

        serializer = SharedItemAccessListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def request_access(self, request, pk=None):
        """Request higher permission level for a shared item"""
        item = self.get_object()
        serializer = RequestAccessSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        requested_permission = serializer.validated_data['requested_permission']
        reason = serializer.validated_data['reason']

        # Log the access request
        AuditLog.log_action(
            user=request.user,
            action='SHARED_ACCESS_REQUEST',
            resource_type=item.resource_type,
            resource_id=str(item.resource_id),
            resource_name=item.resource_name,
            details={
                'current_permission': item.permission_level,
                'requested_permission': requested_permission,
                'reason': reason,
                'owner_id': str(item.shared_by.id),
            }
        )

        # TODO: Send notification to the owner
        # This would typically trigger an email or in-app notification

        return Response({
            'success': True,
            'message': 'Access request submitted successfully'
        })


class ShareInvitationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for managing share invitations.

    Users can view, accept, or decline invitations.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = ShareInvitationSerializer

    def get_queryset(self):
        """Return pending invitations for the current user"""
        return ShareInvitation.objects.filter(
            invited_user=self.request.user
        ).select_related('invited_by').order_by('-invited_at')

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get only pending invitations"""
        queryset = self.get_queryset().filter(status=ShareInvitation.Status.PENDING)

        # Filter out expired
        queryset = queryset.filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
        )

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Accept a share invitation"""
        invitation = self.get_object()

        serializer = AcceptInvitationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        acknowledged = serializer.validated_data.get('acknowledged', False)

        try:
            shared_access = invitation.accept(acknowledged=acknowledged)
            return Response({
                'success': True,
                'message': 'Invitation accepted',
                'shared_item': SharedItemAccessSerializer(shared_access).data
            })
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def decline(self, request, pk=None):
        """Decline a share invitation"""
        invitation = self.get_object()

        serializer = DeclineInvitationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reason = serializer.validated_data.get('reason', '')

        try:
            invitation.decline(reason=reason)
            return Response({
                'success': True,
                'message': 'Invitation declined'
            })
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def share_with_users(request):
    """
    Share a document or folder with specific users.

    This creates SharedItemAccess records (direct shares) or
    ShareInvitation records (if acceptance is required).
    """
    serializer = CreateShareWithUserSerializer(
        data=request.data,
        context={'request': request}
    )
    serializer.is_valid(raise_exception=True)

    results = serializer.save()

    # Log the sharing action
    resource_type = 'DOCUMENT' if request.data.get('document_id') else 'FOLDER'
    resource_id = request.data.get('document_id') or request.data.get('folder_id')

    AuditLog.log_action(
        user=request.user,
        action='SHARE_WITH_USERS',
        resource_type=resource_type,
        resource_id=str(resource_id),
        resource_name='',  # Could fetch from DB if needed
        details={
            'recipient_count': len(results),
            'results': results,
        }
    )

    # Create notifications for recipients
    from apps.sharing.tasks import create_share_notification

    for result in results:
        notification_type = 'SHARE_INVITATION' if result['type'] == 'invitation' else 'SHARE_RECEIVED'

        # Get resource name
        if request.data.get('document_id'):
            from apps.documents.models import Document
            try:
                doc = Document.objects.get(id=request.data.get('document_id'))
                resource_name = doc.title
            except Document.DoesNotExist:
                resource_name = 'Unknown'
        else:
            from apps.folders.models import Folder
            try:
                folder = Folder.objects.get(id=request.data.get('folder_id'))
                resource_name = folder.name
            except Folder.DoesNotExist:
                resource_name = 'Unknown'

        # Queue notification task
        create_share_notification.delay(
            recipient_id=result['recipient_id'],
            shared_by_id=str(request.user.id),
            resource_type=resource_type,
            resource_id=str(resource_id),
            resource_name=resource_name,
            permission_level=request.data.get('permission_level', 'VIEW'),
            notification_type=notification_type,
            send_email=request.data.get('notify', True),
        )

    return Response({
        'success': True,
        'message': f'Shared with {len(results)} user(s)',
        'results': results
    })


# ============================================================================
# Notification Views
# ============================================================================


class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing user notifications.

    Supports listing, reading, and marking notifications as read.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        """Return notifications for the current user"""
        return Notification.objects.filter(
            recipient=self.request.user
        ).select_related('actor').order_by('-created_at')

    def get_serializer_class(self):
        """Use lightweight serializer for list views"""
        if self.action == 'list':
            return NotificationListSerializer
        return NotificationSerializer

    def list(self, request, *args, **kwargs):
        """
        List notifications with counts.
        """
        queryset = self.filter_queryset(self.get_queryset())

        # Get counts
        total_count = queryset.count()
        unread_count = queryset.filter(is_read=False).count()

        # Apply pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            response.data['total_count'] = total_count
            response.data['unread_count'] = unread_count
            return response

        serializer = self.get_serializer(queryset[:50], many=True)
        return Response({
            'results': serializer.data,
            'total_count': total_count,
            'unread_count': unread_count,
        })

    @action(detail=False, methods=['get'])
    def unread(self, request):
        """Get only unread notifications"""
        queryset = self.get_queryset().filter(is_read=False)[:20]
        serializer = NotificationListSerializer(queryset, many=True)
        return Response({
            'results': serializer.data,
            'unread_count': self.get_queryset().filter(is_read=False).count(),
        })

    @action(detail=False, methods=['get'])
    def count(self, request):
        """Get notification counts"""
        queryset = self.get_queryset()
        return Response({
            'total': queryset.count(),
            'unread': queryset.filter(is_read=False).count(),
        })

    @action(detail=True, methods=['post'])
    def read(self, request, pk=None):
        """Mark a single notification as read"""
        notification = self.get_object()
        notification.mark_as_read()
        return Response({'success': True, 'is_read': True})

    @action(detail=False, methods=['post'])
    def mark_read(self, request):
        """Mark multiple notifications as read"""
        serializer = MarkNotificationsReadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        notification_ids = serializer.validated_data.get('notification_ids', [])

        if notification_ids:
            # Mark specific notifications as read
            updated = Notification.objects.filter(
                recipient=request.user,
                id__in=notification_ids,
                is_read=False
            ).update(is_read=True, read_at=timezone.now())
        else:
            # Mark all as read
            updated = Notification.objects.filter(
                recipient=request.user,
                is_read=False
            ).update(is_read=True, read_at=timezone.now())

        return Response({
            'success': True,
            'marked_count': updated,
        })

    @action(detail=False, methods=['delete'])
    def clear_all(self, request):
        """Delete all notifications for the user"""
        deleted_count, _ = Notification.objects.filter(
            recipient=request.user
        ).delete()

        return Response({
            'success': True,
            'deleted_count': deleted_count,
        })

    @action(detail=False, methods=['delete'])
    def clear_read(self, request):
        """Delete only read notifications"""
        deleted_count, _ = Notification.objects.filter(
            recipient=request.user,
            is_read=True
        ).delete()

        return Response({
            'success': True,
            'deleted_count': deleted_count,
        })


class NotificationPreferencesView(APIView):
    """
    View for managing user notification preferences.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get current user's notification preferences"""
        preferences = NotificationPreferences.get_or_create_for_user(request.user)
        serializer = NotificationPreferencesSerializer(preferences)
        return Response(serializer.data)

    def patch(self, request):
        """Update notification preferences"""
        preferences = NotificationPreferences.get_or_create_for_user(request.user)
        serializer = NotificationPreferencesSerializer(
            preferences,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def put(self, request):
        """Replace notification preferences"""
        preferences = NotificationPreferences.get_or_create_for_user(request.user)
        serializer = NotificationPreferencesSerializer(
            preferences,
            data=request.data
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
