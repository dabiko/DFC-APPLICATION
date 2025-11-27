"""
Serializers for document sharing API.
"""

from rest_framework import serializers
from django.utils import timezone
from django.contrib.auth import get_user_model
from datetime import timedelta
from apps.sharing.models import Share, ShareAccess, SharedItemAccess, ShareInvitation
from apps.documents.models import Document

User = get_user_model()


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


# ============================================================================
# Shared With Me Serializers
# ============================================================================


class SharedByUserSerializer(serializers.Serializer):
    """Serializer for the user who shared an item"""

    id = serializers.UUIDField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.EmailField()
    avatar = serializers.SerializerMethodField()
    is_external = serializers.SerializerMethodField()

    def get_avatar(self, obj):
        """Get avatar URL if available"""
        if hasattr(obj, 'profile') and obj.profile and hasattr(obj.profile, 'avatar'):
            return obj.profile.avatar.url if obj.profile.avatar else None
        return None

    def get_is_external(self, obj):
        """Check if user is external (e.g., different organization)"""
        # This can be customized based on your user model
        return getattr(obj, 'is_external', False)


class SharedItemAccessSerializer(serializers.ModelSerializer):
    """Main serializer for SharedItemAccess model (Shared with Me items)"""

    shared_by = SharedByUserSerializer(read_only=True)
    is_expired = serializers.SerializerMethodField()
    is_accessible = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()
    can_comment = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()
    time_ago = serializers.SerializerMethodField()

    class Meta:
        model = SharedItemAccess
        fields = [
            'id',
            'resource_type',
            'resource_id',
            'resource_name',
            'file_type',
            'file_size',
            'folder_path',
            'confidentiality_level',
            'thumbnail_url',
            'permission_level',
            'share_source',
            'shared_at',
            'expires_at',
            'message',
            'is_shortcut',
            'shortcut_order',
            'first_viewed_at',
            'last_accessed_at',
            'access_count',
            'is_hidden',
            'is_notified',
            'is_acknowledged',
            'is_external_share',
            'is_active',
            'shared_by',
            'is_expired',
            'is_accessible',
            'can_edit',
            'can_comment',
            'can_delete',
            'time_ago',
        ]
        read_only_fields = [
            'id', 'resource_type', 'resource_id', 'resource_name',
            'file_type', 'file_size', 'folder_path', 'confidentiality_level',
            'thumbnail_url', 'permission_level', 'share_source', 'shared_at',
            'expires_at', 'message', 'first_viewed_at', 'last_accessed_at',
            'access_count', 'is_notified', 'is_external_share', 'is_active',
            'shared_by',
        ]

    def get_is_expired(self, obj):
        return obj.is_expired()

    def get_is_accessible(self, obj):
        return obj.is_accessible()

    def get_can_edit(self, obj):
        return obj.can_edit()

    def get_can_comment(self, obj):
        return obj.can_comment()

    def get_can_delete(self, obj):
        return obj.can_delete()

    def get_time_ago(self, obj):
        """Get human-readable time since shared"""
        from django.utils.timesince import timesince
        return timesince(obj.shared_at)


class SharedItemAccessListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views"""

    shared_by_name = serializers.SerializerMethodField()
    shared_by_email = serializers.CharField(source='shared_by.email', read_only=True)
    shared_by_id = serializers.UUIDField(source='shared_by.id', read_only=True)
    time_ago = serializers.SerializerMethodField()

    class Meta:
        model = SharedItemAccess
        fields = [
            'id',
            'resource_type',
            'resource_id',
            'resource_name',
            'file_type',
            'file_size',
            'confidentiality_level',
            'permission_level',
            'shared_at',
            'is_shortcut',
            'shortcut_order',
            'is_external_share',
            'shared_by_id',
            'shared_by_name',
            'shared_by_email',
            'time_ago',
        ]

    def get_shared_by_name(self, obj):
        return obj.shared_by.get_full_name() or obj.shared_by.email

    def get_time_ago(self, obj):
        from django.utils.timesince import timesince
        return timesince(obj.shared_at)


class ShortcutUpdateSerializer(serializers.Serializer):
    """Serializer for updating shortcut status"""

    is_shortcut = serializers.BooleanField()
    order = serializers.IntegerField(required=False, min_value=0)


class SharedWithMeStatsSerializer(serializers.Serializer):
    """Serializer for shared with me statistics"""

    total = serializers.IntegerField()
    unread = serializers.IntegerField()
    documents = serializers.IntegerField()
    folders = serializers.IntegerField()
    shortcuts = serializers.IntegerField()
    external = serializers.IntegerField()
    by_permission = serializers.DictField()
    by_sharer = serializers.ListField()
    recent_count = serializers.IntegerField()


class ShareInvitationSerializer(serializers.ModelSerializer):
    """Main serializer for ShareInvitation model"""

    invited_by = SharedByUserSerializer(read_only=True)
    is_expired = serializers.SerializerMethodField()
    is_pending = serializers.SerializerMethodField()
    time_ago = serializers.SerializerMethodField()

    class Meta:
        model = ShareInvitation
        fields = [
            'id',
            'resource_type',
            'resource_id',
            'resource_name',
            'permission_level',
            'message',
            'status',
            'invited_at',
            'expires_at',
            'responded_at',
            'requires_acknowledgement',
            'acknowledgement_text',
            'invited_by',
            'is_expired',
            'is_pending',
            'time_ago',
        ]
        read_only_fields = [
            'id', 'resource_type', 'resource_id', 'resource_name',
            'permission_level', 'message', 'status', 'invited_at',
            'expires_at', 'responded_at', 'requires_acknowledgement',
            'acknowledgement_text', 'invited_by',
        ]

    def get_is_expired(self, obj):
        return obj.is_expired()

    def get_is_pending(self, obj):
        return obj.is_pending()

    def get_time_ago(self, obj):
        from django.utils.timesince import timesince
        return timesince(obj.invited_at)


class AcceptInvitationSerializer(serializers.Serializer):
    """Serializer for accepting a share invitation"""

    acknowledged = serializers.BooleanField(default=False)


class DeclineInvitationSerializer(serializers.Serializer):
    """Serializer for declining a share invitation"""

    reason = serializers.CharField(required=False, allow_blank=True, max_length=500)


class CreateShareWithUserSerializer(serializers.Serializer):
    """Serializer for sharing a document/folder with specific users"""

    document_id = serializers.UUIDField(required=False)
    folder_id = serializers.UUIDField(required=False)
    recipient_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        max_length=50
    )
    permission_level = serializers.ChoiceField(
        choices=SharedItemAccess.PermissionLevel.choices,
        default=SharedItemAccess.PermissionLevel.VIEW
    )
    message = serializers.CharField(required=False, allow_blank=True, max_length=1000)
    expires_in_days = serializers.IntegerField(required=False, min_value=1, max_value=365)
    notify = serializers.BooleanField(default=True)
    require_acceptance = serializers.BooleanField(default=False)
    require_acknowledgement = serializers.BooleanField(default=False)
    acknowledgement_text = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        """Ensure either document_id or folder_id is provided"""
        if not data.get('document_id') and not data.get('folder_id'):
            raise serializers.ValidationError(
                "Either document_id or folder_id must be provided"
            )
        if data.get('document_id') and data.get('folder_id'):
            raise serializers.ValidationError(
                "Only one of document_id or folder_id should be provided"
            )
        return data

    def validate_document_id(self, value):
        """Validate document exists"""
        if value:
            try:
                Document.objects.get(id=value, is_deleted=False)
            except Document.DoesNotExist:
                raise serializers.ValidationError("Document not found or has been deleted")
        return value

    def validate_folder_id(self, value):
        """Validate folder exists"""
        if value:
            from apps.folders.models import Folder
            try:
                Folder.objects.get(id=value, is_deleted=False)
            except Folder.DoesNotExist:
                raise serializers.ValidationError("Folder not found or has been deleted")
        return value

    def validate_recipient_ids(self, value):
        """Validate recipients exist"""
        existing_ids = set(
            User.objects.filter(id__in=value, is_active=True)
            .values_list('id', flat=True)
        )
        invalid_ids = set(value) - existing_ids
        if invalid_ids:
            raise serializers.ValidationError(
                f"Users not found: {', '.join(str(uid) for uid in invalid_ids)}"
            )
        return value

    def create(self, validated_data):
        """Create shares for all recipients"""
        from apps.folders.models import Folder

        user = self.context['request'].user
        document = None
        folder = None

        if validated_data.get('document_id'):
            document = Document.objects.get(id=validated_data['document_id'])
        else:
            folder = Folder.objects.get(id=validated_data['folder_id'])

        recipients = User.objects.filter(id__in=validated_data['recipient_ids'])
        permission_level = validated_data.get('permission_level', SharedItemAccess.PermissionLevel.VIEW)
        message = validated_data.get('message', '')
        require_acceptance = validated_data.get('require_acceptance', False)
        require_acknowledgement = validated_data.get('require_acknowledgement', False)
        acknowledgement_text = validated_data.get('acknowledgement_text', '')

        # Calculate expiration
        expires_at = None
        if validated_data.get('expires_in_days'):
            expires_at = timezone.now() + timedelta(days=validated_data['expires_in_days'])

        results = []

        for recipient in recipients:
            # Skip sharing with self
            if recipient.id == user.id:
                continue

            if require_acceptance:
                # Create invitation instead of direct share
                invitation = ShareInvitation.create_invitation(
                    document=document,
                    folder=folder,
                    invited_user=recipient,
                    invited_by=user,
                    permission_level=permission_level,
                    message=message,
                    expires_at=expires_at,
                    requires_acknowledgement=require_acknowledgement,
                    acknowledgement_text=acknowledgement_text,
                )
                results.append({
                    'type': 'invitation',
                    'recipient_id': str(recipient.id),
                    'invitation_id': str(invitation.id),
                })
            else:
                # Create direct share
                shared_access = SharedItemAccess.create_share(
                    document=document,
                    folder=folder,
                    recipient=recipient,
                    shared_by=user,
                    permission_level=permission_level,
                    message=message,
                    expires_at=expires_at,
                )
                results.append({
                    'type': 'share',
                    'recipient_id': str(recipient.id),
                    'share_id': str(shared_access.id),
                })

        return results


class SharedWithUserSerializer(serializers.Serializer):
    """Serializer for listing users a document/folder is shared with"""

    id = serializers.UUIDField()
    recipient = SharedByUserSerializer()
    permission_level = serializers.CharField()
    shared_at = serializers.DateTimeField()
    expires_at = serializers.DateTimeField(allow_null=True)
    is_active = serializers.BooleanField()


class RequestAccessSerializer(serializers.Serializer):
    """Serializer for requesting higher permission level"""

    requested_permission = serializers.ChoiceField(
        choices=SharedItemAccess.PermissionLevel.choices
    )
    reason = serializers.CharField(max_length=500)


# ============================================================================
# Notification Serializers
# ============================================================================


class NotificationSerializer(serializers.ModelSerializer):
    """Main serializer for Notification model"""

    from apps.sharing.models import Notification

    actor_name = serializers.SerializerMethodField()
    actor_email = serializers.SerializerMethodField()
    time_ago = serializers.SerializerMethodField()

    class Meta:
        from apps.sharing.models import Notification
        model = Notification
        fields = [
            'id',
            'notification_type',
            'title',
            'message',
            'actor',
            'actor_name',
            'actor_email',
            'resource_type',
            'resource_id',
            'resource_name',
            'action_url',
            'is_read',
            'read_at',
            'created_at',
            'time_ago',
        ]
        read_only_fields = [
            'id', 'notification_type', 'title', 'message', 'actor',
            'resource_type', 'resource_id', 'resource_name', 'action_url',
            'created_at',
        ]

    def get_actor_name(self, obj):
        return obj.actor.get_full_name() if obj.actor else None

    def get_actor_email(self, obj):
        return obj.actor.email if obj.actor else None

    def get_time_ago(self, obj):
        from django.utils.timesince import timesince
        return timesince(obj.created_at)


class NotificationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for notification lists"""

    from apps.sharing.models import Notification

    actor_name = serializers.SerializerMethodField()
    time_ago = serializers.SerializerMethodField()

    class Meta:
        from apps.sharing.models import Notification
        model = Notification
        fields = [
            'id',
            'notification_type',
            'title',
            'message',
            'actor_name',
            'resource_type',
            'resource_name',
            'action_url',
            'is_read',
            'created_at',
            'time_ago',
        ]

    def get_actor_name(self, obj):
        return obj.actor.get_full_name() if obj.actor else None

    def get_time_ago(self, obj):
        from django.utils.timesince import timesince
        return timesince(obj.created_at)


class NotificationPreferencesSerializer(serializers.ModelSerializer):
    """Serializer for NotificationPreferences model"""

    from apps.sharing.models import NotificationPreferences

    class Meta:
        from apps.sharing.models import NotificationPreferences
        model = NotificationPreferences
        fields = [
            'in_app_share_received',
            'in_app_share_invitation',
            'in_app_access_request',
            'in_app_share_expiring',
            'email_share_received',
            'email_share_invitation',
            'email_access_request',
            'email_share_expiring',
            'weekly_digest_enabled',
            'weekly_digest_day',
            'updated_at',
        ]
        read_only_fields = ['updated_at']


class MarkNotificationsReadSerializer(serializers.Serializer):
    """Serializer for marking notifications as read"""

    notification_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        help_text='List of notification IDs to mark as read. If empty, marks all as read.'
    )
