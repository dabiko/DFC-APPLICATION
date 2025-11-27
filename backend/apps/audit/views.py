"""
Views for Audit Log API endpoints.
"""

from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from apps.audit.models import AuditLog
from apps.audit.serializers import (
    AuditLogSerializer,
    AuditLogListSerializer,
    AuditLogStatsSerializer,
    ComplianceReportSerializer,
)


class CanViewAuditLogs(permissions.BasePermission):
    """
    Permission class to check if user can view audit logs.

    Users can view audit logs if they:
    - Are a superuser
    - Are staff
    - Have the 'view_audit_log' permission
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Superusers and staff can always view
        if request.user.is_superuser or request.user.is_staff:
            return True

        # Check for specific permission
        return request.user.has_perm('audit.view_audit_log')


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing audit logs.

    Audit logs are read-only and cannot be created, updated, or deleted via the API.

    Endpoints:
    - GET /api/v1/audit/logs/ - List audit logs
    - GET /api/v1/audit/logs/{id}/ - Get audit log details
    - GET /api/v1/audit/logs/stats/ - Get audit statistics
    - POST /api/v1/audit/logs/compliance_report/ - Generate compliance report
    - GET /api/v1/audit/logs/resource/{resource_type}/{resource_id}/ - Get logs for specific resource
    """

    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, CanViewAuditLogs]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['resource_name', 'action', 'resource_type', 'user__email']
    ordering_fields = ['timestamp', 'action', 'resource_type', 'outcome']
    ordering = ['-timestamp']

    def get_serializer_class(self):
        """Use lightweight serializer for list view."""
        if self.action == 'list':
            return AuditLogListSerializer
        return AuditLogSerializer

    def get_queryset(self):
        """
        Filter queryset based on query parameters.

        Supports filtering by:
        - action: Filter by action type
        - resource_type: Filter by resource type
        - resource_id: Filter by specific resource
        - user_id: Filter by user who performed action
        - outcome: Filter by outcome (SUCCESS/FAILURE)
        - start_date: Filter by start date
        - end_date: Filter by end date
        - days: Filter by number of days back (e.g., days=7 for last 7 days)
        """
        queryset = super().get_queryset()

        # Filter by action
        action = self.request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)

        # Filter by resource type
        resource_type = self.request.query_params.get('resource_type')
        if resource_type:
            queryset = queryset.filter(resource_type=resource_type)

        # Filter by resource ID
        resource_id = self.request.query_params.get('resource_id')
        if resource_id:
            queryset = queryset.filter(resource_id=resource_id)

        # Filter by user
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        # Filter by outcome
        outcome = self.request.query_params.get('outcome')
        if outcome:
            queryset = queryset.filter(outcome=outcome)

        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if start_date:
            queryset = queryset.filter(timestamp__gte=start_date)
        if end_date:
            queryset = queryset.filter(timestamp__lte=end_date)

        # Filter by days back
        days = self.request.query_params.get('days')
        if days:
            try:
                days = int(days)
                since = timezone.now() - timedelta(days=days)
                queryset = queryset.filter(timestamp__gte=since)
            except ValueError:
                pass

        # Optimize queries
        queryset = queryset.select_related('user')

        return queryset

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get audit log statistics.

        Returns:
        - Total number of actions
        - Actions broken down by type
        - Actions broken down by user
        - Actions broken down by resource type
        - Recent actions (last 10)
        - Success rate percentage
        """
        queryset = self.get_queryset()

        # Total actions
        total_actions = queryset.count()

        # Actions by type
        actions_by_type = dict(
            queryset.values('action')
            .annotate(count=Count('id'))
            .values_list('action', 'count')
        )

        # Actions by user
        actions_by_user = dict(
            queryset.filter(user__isnull=False)
            .values('user__email')
            .annotate(count=Count('id'))
            .values_list('user__email', 'count')
        )

        # Actions by resource type
        actions_by_resource_type = dict(
            queryset.values('resource_type')
            .annotate(count=Count('id'))
            .values_list('resource_type', 'count')
        )

        # Recent actions
        recent_actions = queryset[:10]

        # Success rate
        success_count = queryset.filter(outcome='SUCCESS').count()
        success_rate = (success_count / total_actions * 100) if total_actions > 0 else 0

        # Date range
        date_range = {
            'start': queryset.last().timestamp if queryset.exists() else None,
            'end': queryset.first().timestamp if queryset.exists() else None,
        }

        data = {
            'total_actions': total_actions,
            'actions_by_type': actions_by_type,
            'actions_by_user': actions_by_user,
            'actions_by_resource_type': actions_by_resource_type,
            'recent_actions': AuditLogListSerializer(recent_actions, many=True).data,
            'success_rate': round(success_rate, 2),
            'date_range': date_range,
        }

        serializer = AuditLogStatsSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def compliance_report(self, request):
        """
        Generate a compliance report.

        Request body:
        {
            "report_type": "access" | "changes" | "user_activity" | "retention_compliance",
            "start_date": "2024-01-01T00:00:00Z",
            "end_date": "2024-12-31T23:59:59Z",
            "resource_type": "DOCUMENT" (optional),
            "user_id": "uuid" (optional)
        }

        Returns a detailed compliance report with summary statistics.
        """
        report_type = request.data.get('report_type', 'access')
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        resource_type = request.data.get('resource_type')
        user_id = request.data.get('user_id')

        # Base queryset
        queryset = self.get_queryset()

        # Apply filters
        if start_date:
            queryset = queryset.filter(timestamp__gte=start_date)
        if end_date:
            queryset = queryset.filter(timestamp__lte=end_date)
        if resource_type:
            queryset = queryset.filter(resource_type=resource_type)
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        # Report-specific filtering
        if report_type == 'access':
            # Access report: VIEW and DOWNLOAD actions
            queryset = queryset.filter(action__in=['VIEW', 'DOWNLOAD'])
        elif report_type == 'changes':
            # Change history: CREATE, EDIT, DELETE actions
            queryset = queryset.filter(action__in=['CREATE', 'EDIT', 'DELETE', 'MOVE'])
        elif report_type == 'user_activity':
            # User activity: All user actions
            queryset = queryset.filter(user__isnull=False)
        elif report_type == 'retention_compliance':
            # Retention compliance: DELETE and ARCHIVE actions
            queryset = queryset.filter(action__in=['DELETE', 'ARCHIVE'])

        # Generate summary
        total_entries = queryset.count()
        unique_users = queryset.filter(user__isnull=False).values('user').distinct().count()
        unique_resources = queryset.values('resource_type', 'resource_id').distinct().count()

        summary = {
            'total_entries': total_entries,
            'unique_users': unique_users,
            'unique_resources': unique_resources,
            'actions_breakdown': dict(
                queryset.values('action')
                .annotate(count=Count('id'))
                .values_list('action', 'count')
            ),
        }

        data = {
            'report_type': report_type,
            'start_date': start_date,
            'end_date': end_date,
            'total_entries': total_entries,
            'entries': queryset[:1000],  # Limit to 1000 entries for performance
            'summary': summary,
        }

        serializer = ComplianceReportSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='resource/(?P<resource_type>[^/.]+)/(?P<resource_id>[^/.]+)')
    def resource_logs(self, request, resource_type=None, resource_id=None):
        """
        Get all audit logs for a specific resource.

        URL: /api/v1/audit/logs/resource/{resource_type}/{resource_id}/

        Example: /api/v1/audit/logs/resource/DOCUMENT/123e4567-e89b-12d3-a456-426614174000/
        """
        queryset = self.get_queryset()
        queryset = queryset.filter(
            resource_type=resource_type.upper(),
            resource_id=resource_id
        )

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def my_activity(self, request):
        """
        Get audit logs for the current user's activity.

        Returns all actions performed by the authenticated user.
        """
        queryset = self.get_queryset()
        queryset = queryset.filter(user=request.user)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = AuditLogListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = AuditLogListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def failed_actions(self, request):
        """
        Get all failed actions (outcome=FAILURE).

        Useful for security monitoring and troubleshooting.
        """
        queryset = self.get_queryset()
        queryset = queryset.filter(outcome='FAILURE')

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
