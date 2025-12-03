from django.db import models
from apps.users.models import CustomUser


class RecentSearch(models.Model):
    """
    Track recent search queries for each user.

    Provides personalized search history and quick access to
    previous searches in the command palette.
    """
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='recent_searches'
    )
    query = models.CharField(max_length=500)
    executed_at = models.DateTimeField(auto_now_add=True)
    result_count = models.IntegerField(default=0)

    class Meta:
        db_table = 'search_recent_searches'
        ordering = ['-executed_at']
        indexes = [
            models.Index(fields=['user', '-executed_at']),
        ]
        verbose_name = 'Recent Search'
        verbose_name_plural = 'Recent Searches'

    def __str__(self):
        return f"{self.user.username}: {self.query} ({self.executed_at})"
