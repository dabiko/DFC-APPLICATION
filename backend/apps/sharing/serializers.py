"""
Serializers for document sharing API.
"""

from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta
from apps.sharing.models import Share, ShareAccess
from apps.documents.models import Document


class ShareAccessSerializer(serializers.ModelSerializer):
    """Serializer for ShareAccess model (analytics)"""

    user_email = serializers.SerializerMethodField()

    class Meta:
        model = ShareAccess
        fields = [
            'id', 'access_type', 'user', 'user_email',
            'ip_address', 'user_agent', 'accessed_at',
            'country', 'city'
        ]
        read_only_fields = fields

    def get_user_email(self, obj):
        return obj.user.email if obj.user else None


class ShareSerializer(serializers.ModelSerializer):
    """Main serializer for Share model"""

    document_title = serializers.CharField(source='document.title', read_only=True)
    document_id = serializers.UUIDField(source='document.id', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)
    share_url = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    is_accessible = serializers.SerializerMethodField()

    # Write-only fields
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Share
        fields = [
            'id', 'document', 'document_id', 'document_title',
            'token', 'permission', 'password', 'is_password_protected',
            'expires_at', 'is_active', 'recipient_emails',
            'access_count', 'download_count', 'view_count', 'last_accessed_at',
            'created_by', 'created_by_name', 'created_by_email',
            'created_at', 'updated_at', 'revoked_at', 'revoked_by',
            'allow_public_access', 'max_access_count', 'notes',
            'share_url', 'is_expired', 'is_accessible'
        ]
        read_only_fields = [
            'id', 'token', 'access_count', 'download_count', 'view_count',
            'last_accessed_at', 'created_by', 'created_at', 'updated_at',
            'revoked_at', 'revoked_by', 'is_password_protected'
        ]

    def get_share_url(self, obj):
        request = self.context.get('request')
        return obj.get_share_url(request)

    def get_is_expired(self, obj):
        return obj.is_expired()

    def get_is_accessible(self, obj):
        return obj.is_accessible()

    def validate_document(self, value):
        """Ensure document exists and user has permission"""
        user = self.context['request'].user
        if value.is_deleted:
            raise serializers.ValidationError("Cannot share a deleted document")
        # Could add permission check here
        return value

    def validate_expires_at(self, value):
        """Ensure expiration date is in the future"""
        if value and value <= timezone.now():
            raise serializers.ValidationError("Expiration date must be in the future")
        return value

    def validate_recipient_emails(self, value):
        """Validate email addresses"""
        from django.core.validators import EmailValidator
        validator = EmailValidator()
        for email in value:
            validator(email)
        return value

    def create(self, validated_data):
        """Create share with password hashing"""
        password = validated_data.pop('password', None)
        validated_data['created_by'] = self.context['request'].user

        share = Share.objects.create(**validated_data)

        if password:
            share.set_password(password)
            share.save()

        # Send notifications if recipients specified
        if share.recipient_emails:
            from apps.sharing.tasks import send_share_notifications
            send_share_notifications.delay(str(share.id))

        return share

    def update(self, instance, validated_data):
        """Update share with password hashing"""
        password = validated_data.pop('password', None)

        if password:
            instance.set_password(password)
        elif password == '':  # Empty string removes password
            instance.set_password(None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance


class CreateShareSerializer(serializers.Serializer):
    """Simplified serializer for creating shares"""

    document = serializers.UUIDField()
    permission = serializers.ChoiceField(choices=Share.PERMISSION_CHOICES, default=Share.VIEW_ONLY)
    password = serializers.CharField(required=False, allow_blank=True)
    expires_in_days = serializers.IntegerField(required=False, min_value=1, max_value=365)
    recipient_emails = serializers.ListField(
        child=serializers.EmailField(),
        required=False,
        allow_empty=True
    )
    allow_public_access = serializers.BooleanField(default=True)
    max_access_count = serializers.IntegerField(required=False, min_value=1, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate_document(self, value):
        """Ensure document exists"""
        try:
            document = Document.objects.get(id=value, is_deleted=False)
            return document
        except Document.DoesNotExist:
            raise serializers.ValidationError("Document not found or has been deleted")

    def create(self, validated_data):
        """Create share"""
        user = self.context['request'].user
        document = validated_data['document']
        password = validated_data.pop('password', None)
        expires_in_days = validated_data.pop('expires_in_days', None)

        # Calculate expiration date
        expires_at = None
        if expires_in_days:
            expires_at = timezone.now() + timedelta(days=expires_in_days)

        share = Share.objects.create(
            document=document,
            permission=validated_data.get('permission', Share.VIEW_ONLY),
            recipient_emails=validated_data.get('recipient_emails', []),
            expires_at=expires_at,
            allow_public_access=validated_data.get('allow_public_access', True),
            max_access_count=validated_data.get('max_access_count'),
            notes=validated_data.get('notes', ''),
            created_by=user
        )

        if password:
            share.set_password(password)
            share.save()

        # Send notifications
        if share.recipient_emails:
            from apps.sharing.tasks import send_share_notifications
            send_share_notifications.delay(str(share.id))

        return share


class PublicShareAccessSerializer(serializers.Serializer):
    """Serializer for accessing a public share"""

    password = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        """Validate share access"""
        token = self.context.get('token')

        try:
            share = Share.objects.select_related('document').get(token=token)
        except Share.DoesNotExist:
            raise serializers.ValidationError("Invalid share link")

        if not share.is_accessible():
            if share.is_expired():
                raise serializers.ValidationError("This share has expired")
            elif not share.is_active:
                raise serializers.ValidationError("This share has been revoked")
            elif share.max_access_count and share.access_count >= share.max_access_count:
                raise serializers.ValidationError("This share has reached its access limit")
            else:
                raise serializers.ValidationError("This share is not accessible")

        # Check password if required
        if share.is_password_protected:
            password = data.get('password')
            if not share.check_password(password):
                raise serializers.ValidationError("Incorrect password")

        data['share'] = share
        return data


class ShareAnalyticsSerializer(serializers.Serializer):
    """Serializer for share analytics"""

    access_count = serializers.IntegerField()
    download_count = serializers.IntegerField()
    view_count = serializers.IntegerField()
    last_accessed_at = serializers.DateTimeField()
    unique_ips = serializers.IntegerField()
    unique_users = serializers.IntegerField()
    recent_accesses = ShareAccessSerializer(many=True, read_only=True)


class RevokeShareSerializer(serializers.Serializer):
    """Serializer for revoking a share"""

    reason = serializers.CharField(required=False, allow_blank=True)
