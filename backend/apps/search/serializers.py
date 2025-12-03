"""
Serializers for search app.
"""
from rest_framework import serializers
from apps.search.models import RecentSearch


class RecentSearchSerializer(serializers.ModelSerializer):
    """
    Serializer for RecentSearch model.
    """
    id = serializers.CharField(read_only=True)
    query = serializers.CharField(max_length=500)
    executed_at = serializers.DateTimeField(read_only=True, format='%Y-%m-%dT%H:%M:%S.%fZ')
    result_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = RecentSearch
        fields = ['id', 'query', 'executed_at', 'result_count']
        read_only_fields = ['id', 'executed_at', 'result_count']


class SearchSuggestionSerializer(serializers.Serializer):
    """
    Serializer for search autocomplete suggestions.
    """
    text = serializers.CharField()
    type = serializers.ChoiceField(choices=['document', 'tag', 'folder', 'user'])
    score = serializers.FloatField()
    metadata = serializers.DictField(required=False)
