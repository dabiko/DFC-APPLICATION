"""
Activity and Statistics Views

API endpoints for user activity feed and productivity statistics.
"""

from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from django.utils import timezone
from datetime import timedelta
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse

from apps.documents.models_stats import UserDocumentStats
from apps.audit.models import AuditLog


class ActivityPagination(PageNumberPagination):
    """Pagination for activity feed."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class UserStatsView(APIView):
    """
    Get user productivity statistics and insights.

    Returns cached stats, recalculates if stale (older than 5 minutes).
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        summary="Get user productivity statistics",
        description="Returns detailed statistics about user's document activity and productivity insights.",
        responses={
            200: OpenApiResponse(description="User statistics"),
        },
        tags=['Activity']
    )
    def get(self, request):
        # Get or create stats for user
        stats = UserDocumentStats.get_or_create_for_user(request.user)

        # Recalculate if stale
        force_refresh = request.query_params.get('refresh', '').lower() == 'true'
        if stats.is_stale or force_refresh:
            stats.calculate_stats()

        return Response(stats.to_dict())


class RecentActivityView(APIView):
    """
    Get user's recent activity feed.

    Returns a paginated list of recent actions performed by the user.
    """
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = ActivityPagination

    @extend_schema(
        summary="Get user's recent activity",
        description="Returns a paginated list of recent actions performed by the user.",
        parameters=[
            OpenApiParameter(
                name='days',
                type=int,
                description='Number of days to look back (default: 7, max: 30)',
                required=False
            ),
            OpenApiParameter(
                name='action',
                type=str,
                description='Filter by action type (CREATE, VIEW, EDIT, DELETE, DOWNLOAD, SHARE)',
                required=False
            ),
            OpenApiParameter(
                name='resource_type',
                type=str,
                description='Filter by resource type (DOCUMENT, FOLDER)',
                required=False
            ),
        ],
        responses={
            200: OpenApiResponse(description="Recent activity list"),
        },
        tags=['Activity']
    )
    def get(self, request):
        # Get query parameters
        days = min(int(request.query_params.get('days', 7)), 30)
        action_filter = request.query_params.get('action')
        resource_type_filter = request.query_params.get('resource_type')

        # Calculate date range
        since = timezone.now() - timedelta(days=days)

        # Build queryset
        queryset = AuditLog.objects.filter(
            user=request.user,
            timestamp__gte=since,
            outcome='SUCCESS'
        ).order_by('-timestamp')

        # Apply filters
        if action_filter:
            queryset = queryset.filter(action=action_filter.upper())

        if resource_type_filter:
            queryset = queryset.filter(resource_type=resource_type_filter.upper())

        # Paginate
        paginator = ActivityPagination()
        page = paginator.paginate_queryset(queryset, request)

        # Serialize
        activities = []
        for log in page:
            activities.append({
                'id': str(log.id),
                'action': log.action,
                'action_display': log.get_action_display(),
                'resource_type': log.resource_type,
                'resource_type_display': log.get_resource_type_display(),
                'resource_id': log.resource_id,
                'resource_name': log.resource_name,
                'timestamp': log.timestamp.isoformat(),
                'time_ago': self._get_time_ago(log.timestamp),
                'metadata': log.metadata,
            })

        return paginator.get_paginated_response(activities)

    def _get_time_ago(self, timestamp):
        """Convert timestamp to human-readable time ago string."""
        now = timezone.now()
        diff = now - timestamp

        if diff.total_seconds() < 60:
            return 'Just now'
        elif diff.total_seconds() < 3600:
            minutes = int(diff.total_seconds() / 60)
            return f'{minutes} minute{"s" if minutes > 1 else ""} ago'
        elif diff.total_seconds() < 86400:
            hours = int(diff.total_seconds() / 3600)
            return f'{hours} hour{"s" if hours > 1 else ""} ago'
        elif diff.days == 1:
            return 'Yesterday'
        elif diff.days < 7:
            return f'{diff.days} days ago'
        elif diff.days < 30:
            weeks = diff.days // 7
            return f'{weeks} week{"s" if weeks > 1 else ""} ago'
        else:
            return timestamp.strftime('%b %d, %Y')


class ActivitySummaryView(APIView):
    """
    Get activity summary for dashboard widgets.

    Returns a condensed summary of recent activity suitable for widgets.
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        summary="Get activity summary for widgets",
        description="Returns a condensed summary of recent activity for dashboard widgets.",
        responses={
            200: OpenApiResponse(description="Activity summary"),
        },
        tags=['Activity']
    )
    def get(self, request):
        now = timezone.now()
        today = now.date()
        week_ago = now - timedelta(days=7)

        # Get user's audit logs
        user_logs = AuditLog.objects.filter(
            user=request.user,
            outcome='SUCCESS'
        )

        # Today's activity
        today_logs = user_logs.filter(timestamp__date=today)

        # This week's activity
        week_logs = user_logs.filter(timestamp__gte=week_ago)

        # Recent activity (last 5 items)
        recent_logs = user_logs.order_by('-timestamp')[:5]

        recent_items = []
        for log in recent_logs:
            recent_items.append({
                'id': str(log.id),
                'action': log.action,
                'action_display': log.get_action_display(),
                'resource_type': log.resource_type,
                'resource_name': log.resource_name,
                'timestamp': log.timestamp.isoformat(),
                'time_ago': self._get_time_ago(log.timestamp),
            })

        # Activity breakdown by action type
        action_breakdown = {}
        for action in ['CREATE', 'VIEW', 'EDIT', 'DOWNLOAD', 'SHARE', 'DELETE']:
            action_breakdown[action.lower()] = {
                'today': today_logs.filter(action=action).count(),
                'this_week': week_logs.filter(action=action).count(),
            }

        return Response({
            'today': {
                'total': today_logs.count(),
                'breakdown': action_breakdown,
            },
            'this_week': {
                'total': week_logs.count(),
            },
            'recent_activity': recent_items,
            'generated_at': now.isoformat(),
        })

    def _get_time_ago(self, timestamp):
        """Convert timestamp to human-readable time ago string."""
        now = timezone.now()
        diff = now - timestamp

        if diff.total_seconds() < 60:
            return 'Just now'
        elif diff.total_seconds() < 3600:
            minutes = int(diff.total_seconds() / 60)
            return f'{minutes}m ago'
        elif diff.total_seconds() < 86400:
            hours = int(diff.total_seconds() / 3600)
            return f'{hours}h ago'
        elif diff.days == 1:
            return 'Yesterday'
        else:
            return f'{diff.days}d ago'


class ProductivityInsightsView(APIView):
    """
    Get productivity insights and recommendations.

    Analyzes user activity patterns and provides insights.
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        summary="Get productivity insights",
        description="Analyzes user activity patterns and provides productivity insights and recommendations.",
        responses={
            200: OpenApiResponse(description="Productivity insights"),
        },
        tags=['Activity']
    )
    def get(self, request):
        # Get or create stats
        stats = UserDocumentStats.get_or_create_for_user(request.user)

        # Recalculate if stale
        if stats.is_stale:
            stats.calculate_stats()

        insights = []

        # Streak insight
        if stats.current_streak_days > 0:
            insights.append({
                'type': 'streak',
                'title': f'{stats.current_streak_days} day streak!',
                'description': f"You've been active for {stats.current_streak_days} consecutive days.",
                'icon': 'flame',
                'color': 'orange',
            })

        # Productivity comparison
        if stats.uploads_this_week > stats.avg_uploads_per_week * 1.2:
            insights.append({
                'type': 'productivity_up',
                'title': 'Above average week!',
                'description': f"You've uploaded {stats.uploads_this_week} documents this week, more than your average.",
                'icon': 'trending-up',
                'color': 'green',
            })
        elif stats.uploads_this_week < stats.avg_uploads_per_week * 0.5 and stats.avg_uploads_per_week > 0:
            insights.append({
                'type': 'productivity_down',
                'title': 'Quiet week',
                'description': f"You've uploaded fewer documents than usual this week.",
                'icon': 'trending-down',
                'color': 'yellow',
            })

        # Most active day insight
        if stats.most_active_day:
            insights.append({
                'type': 'most_active_day',
                'title': f'Most productive on {stats.most_active_day}s',
                'description': f"You tend to be most active on {stats.most_active_day}s.",
                'icon': 'calendar',
                'color': 'blue',
            })

        # Storage insight
        if stats.storage_used_bytes > 1024 * 1024 * 100:  # > 100MB
            insights.append({
                'type': 'storage',
                'title': f'Using {stats.storage_used_formatted}',
                'description': f"You have {stats.total_documents} documents stored.",
                'icon': 'hard-drive',
                'color': 'purple',
            })

        # Recent activity insight
        if stats.recent_activity_count > 10:
            insights.append({
                'type': 'active_today',
                'title': 'Very active today!',
                'description': f"You've performed {stats.recent_activity_count} actions in the last 24 hours.",
                'icon': 'zap',
                'color': 'green',
            })

        # Document state insights
        drafts = stats.documents_by_state.get('DRAFT', 0)
        if drafts > 5:
            insights.append({
                'type': 'pending_drafts',
                'title': f'{drafts} drafts pending',
                'description': "Consider reviewing and submitting your draft documents.",
                'icon': 'file-edit',
                'color': 'yellow',
            })

        return Response({
            'insights': insights,
            'stats_summary': {
                'total_documents': stats.total_documents,
                'current_streak': stats.current_streak_days,
                'longest_streak': stats.longest_streak_days,
                'uploads_this_week': stats.uploads_this_week,
                'avg_uploads_per_week': round(stats.avg_uploads_per_week, 1),
                'most_active_day': stats.most_active_day,
                'storage_used': stats.storage_used_formatted,
            },
            'generated_at': timezone.now().isoformat(),
        })
