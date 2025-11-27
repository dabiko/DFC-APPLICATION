"""
User Document Statistics Model

Tracks productivity metrics and document statistics for each user.
Uses caching and periodic updates for performance.
"""

from django.conf import settings
from django.db import models
from django.utils import timezone
from datetime import timedelta
import uuid


class UserDocumentStats(models.Model):
    """
    Cached statistics for user document activity.

    Updated periodically (every 5 minutes) or on demand.
    Provides insights for productivity tracking.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='document_stats'
    )

    # Document counts
    total_documents = models.IntegerField(default=0)
    total_folders = models.IntegerField(default=0)

    # Time-based counts
    documents_today = models.IntegerField(default=0)
    documents_this_week = models.IntegerField(default=0)
    documents_this_month = models.IntegerField(default=0)

    # Activity counts
    uploads_today = models.IntegerField(default=0)
    uploads_this_week = models.IntegerField(default=0)
    uploads_this_month = models.IntegerField(default=0)

    views_today = models.IntegerField(default=0)
    views_this_week = models.IntegerField(default=0)
    views_this_month = models.IntegerField(default=0)

    downloads_today = models.IntegerField(default=0)
    downloads_this_week = models.IntegerField(default=0)
    downloads_this_month = models.IntegerField(default=0)

    shares_today = models.IntegerField(default=0)
    shares_this_week = models.IntegerField(default=0)
    shares_this_month = models.IntegerField(default=0)

    edits_today = models.IntegerField(default=0)
    edits_this_week = models.IntegerField(default=0)
    edits_this_month = models.IntegerField(default=0)

    # Storage
    storage_used_bytes = models.BigIntegerField(default=0)

    # Document type breakdown (JSON)
    documents_by_type = models.JSONField(default=dict, blank=True)

    # Confidentiality breakdown (JSON)
    documents_by_confidentiality = models.JSONField(default=dict, blank=True)

    # State breakdown (JSON)
    documents_by_state = models.JSONField(default=dict, blank=True)

    # Weekly activity trend (JSON) - last 7 days
    # Format: {"2024-01-01": {"uploads": 5, "views": 10, ...}, ...}
    weekly_activity = models.JSONField(default=dict, blank=True)

    # Monthly activity trend (JSON) - last 30 days aggregated by week
    monthly_activity = models.JSONField(default=dict, blank=True)

    # Streak tracking
    current_streak_days = models.IntegerField(default=0)
    longest_streak_days = models.IntegerField(default=0)
    last_activity_date = models.DateField(null=True, blank=True)

    # Averages
    avg_uploads_per_day = models.FloatField(default=0.0)
    avg_uploads_per_week = models.FloatField(default=0.0)

    # Most active
    most_active_day = models.CharField(max_length=20, blank=True, default='')  # e.g., "Monday"
    most_active_hour = models.IntegerField(null=True, blank=True)  # 0-23

    # Recent activity summary
    recent_activity_count = models.IntegerField(default=0)  # Last 24 hours

    # Timestamps
    last_calculated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_document_stats'
        verbose_name = 'User Document Stats'
        verbose_name_plural = 'User Document Stats'

    def __str__(self):
        return f"Stats for {self.user.username}"

    @property
    def storage_used_formatted(self):
        """Return human-readable storage size."""
        bytes_val = self.storage_used_bytes
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if bytes_val < 1024:
                return f"{bytes_val:.1f} {unit}"
            bytes_val /= 1024
        return f"{bytes_val:.1f} PB"

    @property
    def is_stale(self):
        """Check if stats need to be recalculated (older than 5 minutes)."""
        if not self.last_calculated_at:
            return True
        return timezone.now() - self.last_calculated_at > timedelta(minutes=5)

    @classmethod
    def get_or_create_for_user(cls, user):
        """Get or create stats for a user."""
        stats, created = cls.objects.get_or_create(user=user)
        return stats

    def calculate_stats(self):
        """
        Recalculate all statistics for the user.
        This is called periodically or on demand.
        """
        from apps.documents.models import Document
        from apps.folders.models import Folder
        from apps.audit.models import AuditLog
        from django.db.models import Sum, Count
        from django.db.models.functions import TruncDate

        now = timezone.now()
        today = now.date()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)

        # Document counts
        user_documents = Document.objects.filter(
            uploaded_by=self.user,
            is_deleted=False
        )

        self.total_documents = user_documents.count()
        self.total_folders = Folder.objects.filter(
            owner=self.user,
            is_deleted=False
        ).count()

        # Time-based document counts
        self.documents_today = user_documents.filter(
            created_at__date=today
        ).count()

        self.documents_this_week = user_documents.filter(
            created_at__gte=week_ago
        ).count()

        self.documents_this_month = user_documents.filter(
            created_at__gte=month_ago
        ).count()

        # Storage calculation
        storage = user_documents.aggregate(total=Sum('file_size'))
        self.storage_used_bytes = storage['total'] or 0

        # Document type breakdown
        type_counts = user_documents.values('document_type').annotate(
            count=Count('id')
        )
        self.documents_by_type = {
            item['document_type']: item['count']
            for item in type_counts if item['document_type']
        }

        # Confidentiality breakdown
        conf_counts = user_documents.values('confidentiality_level').annotate(
            count=Count('id')
        )
        self.documents_by_confidentiality = {
            item['confidentiality_level']: item['count']
            for item in conf_counts if item['confidentiality_level']
        }

        # State breakdown
        state_counts = user_documents.values('state').annotate(
            count=Count('id')
        )
        self.documents_by_state = {
            item['state']: item['count']
            for item in state_counts if item['state']
        }

        # Activity from audit logs
        user_logs = AuditLog.objects.filter(
            user=self.user,
            outcome='SUCCESS'
        )

        # Count activities by type and time period
        activity_types = {
            'uploads': ['CREATE'],
            'views': ['VIEW'],
            'downloads': ['DOWNLOAD'],
            'shares': ['SHARE'],
            'edits': ['EDIT'],
        }

        for activity_name, actions in activity_types.items():
            # Today
            today_count = user_logs.filter(
                action__in=actions,
                timestamp__date=today
            ).count()
            setattr(self, f'{activity_name}_today', today_count)

            # This week
            week_count = user_logs.filter(
                action__in=actions,
                timestamp__gte=week_ago
            ).count()
            setattr(self, f'{activity_name}_this_week', week_count)

            # This month
            month_count = user_logs.filter(
                action__in=actions,
                timestamp__gte=month_ago
            ).count()
            setattr(self, f'{activity_name}_this_month', month_count)

        # Weekly activity trend (last 7 days)
        weekly_data = {}
        for i in range(7):
            date = today - timedelta(days=i)
            date_str = date.isoformat()
            day_logs = user_logs.filter(timestamp__date=date)

            weekly_data[date_str] = {
                'uploads': day_logs.filter(action='CREATE').count(),
                'views': day_logs.filter(action='VIEW').count(),
                'downloads': day_logs.filter(action='DOWNLOAD').count(),
                'shares': day_logs.filter(action='SHARE').count(),
                'edits': day_logs.filter(action='EDIT').count(),
                'total': day_logs.count(),
            }
        self.weekly_activity = weekly_data

        # Recent activity count (last 24 hours)
        self.recent_activity_count = user_logs.filter(
            timestamp__gte=now - timedelta(hours=24)
        ).count()

        # Calculate streak
        self._calculate_streak()

        # Calculate averages (over last 30 days)
        if self.documents_this_month > 0:
            self.avg_uploads_per_day = self.uploads_this_month / 30
            self.avg_uploads_per_week = self.uploads_this_month / 4
        else:
            self.avg_uploads_per_day = 0
            self.avg_uploads_per_week = 0

        # Find most active day and hour
        self._calculate_most_active_periods()

        self.save()
        return self

    def _calculate_streak(self):
        """Calculate activity streak days."""
        from apps.audit.models import AuditLog
        from django.db.models.functions import TruncDate

        today = timezone.now().date()

        # Get distinct activity dates (ordered by date descending)
        active_dates = AuditLog.objects.filter(
            user=self.user,
            outcome='SUCCESS',
            action__in=['CREATE', 'EDIT', 'VIEW', 'DOWNLOAD', 'SHARE']
        ).annotate(
            date=TruncDate('timestamp')
        ).values_list('date', flat=True).distinct().order_by('-date')

        active_dates = list(active_dates)

        if not active_dates:
            self.current_streak_days = 0
            self.last_activity_date = None
            return

        self.last_activity_date = active_dates[0]

        # Check if streak is still active (activity today or yesterday)
        if active_dates[0] < today - timedelta(days=1):
            self.current_streak_days = 0
            return

        # Count consecutive days
        streak = 1
        for i in range(1, len(active_dates)):
            expected_date = active_dates[i-1] - timedelta(days=1)
            if active_dates[i] == expected_date:
                streak += 1
            else:
                break

        self.current_streak_days = streak
        if streak > self.longest_streak_days:
            self.longest_streak_days = streak

    def _calculate_most_active_periods(self):
        """Calculate most active day of week and hour."""
        from apps.audit.models import AuditLog
        from django.db.models import Count
        from django.db.models.functions import ExtractWeekDay, ExtractHour

        # Most active day
        day_counts = AuditLog.objects.filter(
            user=self.user,
            outcome='SUCCESS'
        ).annotate(
            weekday=ExtractWeekDay('timestamp')
        ).values('weekday').annotate(
            count=Count('id')
        ).order_by('-count')

        if day_counts:
            # Django's ExtractWeekDay: 1=Sunday, 2=Monday, ..., 7=Saturday
            day_names = ['', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
            most_active = day_counts[0]['weekday']
            self.most_active_day = day_names[most_active] if 1 <= most_active <= 7 else ''

        # Most active hour
        hour_counts = AuditLog.objects.filter(
            user=self.user,
            outcome='SUCCESS'
        ).annotate(
            hour=ExtractHour('timestamp')
        ).values('hour').annotate(
            count=Count('id')
        ).order_by('-count')

        if hour_counts:
            self.most_active_hour = hour_counts[0]['hour']

    def to_dict(self):
        """Convert stats to dictionary for API response."""
        return {
            'total_documents': self.total_documents,
            'total_folders': self.total_folders,
            'documents_today': self.documents_today,
            'documents_this_week': self.documents_this_week,
            'documents_this_month': self.documents_this_month,
            'uploads_today': self.uploads_today,
            'uploads_this_week': self.uploads_this_week,
            'uploads_this_month': self.uploads_this_month,
            'views_today': self.views_today,
            'views_this_week': self.views_this_week,
            'views_this_month': self.views_this_month,
            'downloads_today': self.downloads_today,
            'downloads_this_week': self.downloads_this_week,
            'downloads_this_month': self.downloads_this_month,
            'shares_today': self.shares_today,
            'shares_this_week': self.shares_this_week,
            'shares_this_month': self.shares_this_month,
            'edits_today': self.edits_today,
            'edits_this_week': self.edits_this_week,
            'edits_this_month': self.edits_this_month,
            'storage_used_bytes': self.storage_used_bytes,
            'storage_used_formatted': self.storage_used_formatted,
            'documents_by_type': self.documents_by_type,
            'documents_by_confidentiality': self.documents_by_confidentiality,
            'documents_by_state': self.documents_by_state,
            'weekly_activity': self.weekly_activity,
            'monthly_activity': self.monthly_activity,
            'current_streak_days': self.current_streak_days,
            'longest_streak_days': self.longest_streak_days,
            'last_activity_date': self.last_activity_date.isoformat() if self.last_activity_date else None,
            'avg_uploads_per_day': round(self.avg_uploads_per_day, 2),
            'avg_uploads_per_week': round(self.avg_uploads_per_week, 2),
            'most_active_day': self.most_active_day,
            'most_active_hour': self.most_active_hour,
            'recent_activity_count': self.recent_activity_count,
            'last_calculated_at': self.last_calculated_at.isoformat() if self.last_calculated_at else None,
        }
