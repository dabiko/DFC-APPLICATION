"""
Utility functions and context managers for audit logging.
"""

from contextlib import contextmanager
from threading import local
from django.core.serializers.json import DjangoJSONEncoder
from apps.audit.models import AuditLog
import json

# Thread-local storage for audit context
_audit_context = local()


def set_audit_context(user=None, ip_address=None, user_agent=None, session_id=None):
    """
    Set audit context for the current thread.

    This allows automatic inclusion of user, IP address, and user agent
    in audit logs without passing them explicitly every time.

    Args:
        user: User object
        ip_address: IP address string
        user_agent: User agent string
        session_id: Session ID for tracking
    """
    _audit_context.user = user
    _audit_context.ip_address = ip_address
    _audit_context.user_agent = user_agent
    _audit_context.session_id = session_id


def get_audit_context():
    """
    Get current audit context from thread-local storage.

    Returns:
        Dict with user, ip_address, user_agent, session_id
    """
    return {
        'user': getattr(_audit_context, 'user', None),
        'ip_address': getattr(_audit_context, 'ip_address', None),
        'user_agent': getattr(_audit_context, 'user_agent', None),
        'session_id': getattr(_audit_context, 'session_id', None),
    }


def clear_audit_context():
    """Clear audit context from thread-local storage."""
    for attr in ['user', 'ip_address', 'user_agent', 'session_id']:
        if hasattr(_audit_context, attr):
            delattr(_audit_context, attr)


@contextmanager
def audit_context(user=None, ip_address=None, user_agent=None, session_id=None):
    """
    Context manager for setting audit context temporarily.

    Example:
        with audit_context(user=request.user, ip_address=get_client_ip(request)):
            # Any audit logs created here will automatically include user and IP
            AuditLog.log_action(...)
    """
    # Store previous context
    previous_context = get_audit_context()

    # Set new context
    set_audit_context(user, ip_address, user_agent, session_id)

    try:
        yield
    finally:
        # Restore previous context
        set_audit_context(**previous_context)


def model_to_dict(instance, exclude_fields=None):
    """
    Convert model instance to dict for audit logging.

    Args:
        instance: Django model instance
        exclude_fields: List of field names to exclude

    Returns:
        Dict representation of the model
    """
    from uuid import UUID
    from decimal import Decimal

    if exclude_fields is None:
        exclude_fields = []

    data = {}
    for field in instance._meta.fields:
        if field.name in exclude_fields:
            continue

        value = getattr(instance, field.name)

        # Handle special field types for JSON serialization
        if value is None:
            pass  # Keep None as is
        elif isinstance(value, UUID):  # UUID fields
            value = str(value)
        elif hasattr(value, 'isoformat'):  # DateTime fields
            value = value.isoformat()
        elif hasattr(value, 'pk'):  # Foreign key fields
            value = str(value.pk)
        elif isinstance(value, Decimal):  # Decimal fields
            value = float(value)
        elif isinstance(value, bytes):  # Byte fields
            value = value.decode('utf-8', errors='replace')

        data[field.name] = value

    return data


def log_document_action(
    action,
    document,
    user=None,
    outcome='SUCCESS',
    error_message='',
    before_value=None,
    after_value=None,
    changed_fields=None,
    metadata=None
):
    """
    Log a document-related action.

    Args:
        action: Action type (CREATE, VIEW, EDIT, DELETE, etc.)
        document: Document instance
        user: User who performed the action
        outcome: SUCCESS or FAILURE
        error_message: Error message if failed
        before_value: State before change
        after_value: State after change
        changed_fields: List of changed fields
        metadata: Additional metadata dict
    """
    context = get_audit_context()

    return AuditLog.log_action(
        user=user or context['user'],
        action=action,
        resource_type='DOCUMENT',
        resource_id=str(document.id),
        resource_name=document.title,
        outcome=outcome,
        error_message=error_message,
        before_value=before_value,
        after_value=after_value,
        changed_fields=changed_fields,
        ip_address=context['ip_address'],
        user_agent=context['user_agent'],
        metadata=metadata or {}
    )


def log_folder_action(
    action,
    folder,
    user=None,
    outcome='SUCCESS',
    error_message='',
    before_value=None,
    after_value=None,
    changed_fields=None,
    metadata=None
):
    """
    Log a folder-related action.

    Args:
        action: Action type (CREATE, VIEW, EDIT, DELETE, etc.)
        folder: Folder instance
        user: User who performed the action
        outcome: SUCCESS or FAILURE
        error_message: Error message if failed
        before_value: State before change
        after_value: State after change
        changed_fields: List of changed fields
        metadata: Additional metadata dict
    """
    context = get_audit_context()

    return AuditLog.log_action(
        user=user or context['user'],
        action=action,
        resource_type='FOLDER',
        resource_id=str(folder.id),
        resource_name=folder.name,
        outcome=outcome,
        error_message=error_message,
        before_value=before_value,
        after_value=after_value,
        changed_fields=changed_fields,
        ip_address=context['ip_address'],
        user_agent=context['user_agent'],
        metadata=metadata or {}
    )


def log_permission_action(
    action,
    permission,
    user=None,
    outcome='SUCCESS',
    error_message='',
    before_value=None,
    after_value=None,
    metadata=None
):
    """
    Log a permission-related action.

    Args:
        action: Action type (PERMISSION_CHANGED, etc.)
        permission: Permission instance or identifier
        user: User who performed the action
        outcome: SUCCESS or FAILURE
        error_message: Error message if failed
        before_value: State before change
        after_value: State after change
        metadata: Additional metadata dict
    """
    context = get_audit_context()

    resource_id = str(permission.id) if hasattr(permission, 'id') else None
    resource_name = str(permission) if permission else 'Unknown'

    return AuditLog.log_action(
        user=user or context['user'],
        action=action,
        resource_type='PERMISSION',
        resource_id=resource_id,
        resource_name=resource_name,
        outcome=outcome,
        error_message=error_message,
        before_value=before_value,
        after_value=after_value,
        ip_address=context['ip_address'],
        user_agent=context['user_agent'],
        metadata=metadata or {}
    )


def log_user_action(
    action,
    target_user,
    user=None,
    outcome='SUCCESS',
    error_message='',
    metadata=None
):
    """
    Log a user-related action (login, logout, password reset, etc.).

    Args:
        action: Action type (LOGIN, LOGOUT, PASSWORD_RESET, etc.)
        target_user: User instance the action is about
        user: User who performed the action (can be same as target_user)
        outcome: SUCCESS or FAILURE
        error_message: Error message if failed
        metadata: Additional metadata dict
    """
    context = get_audit_context()

    return AuditLog.log_action(
        user=user or context['user'],
        action=action,
        resource_type='USER',
        resource_id=str(target_user.id) if target_user else None,
        resource_name=target_user.get_full_name() if target_user else 'Unknown',
        outcome=outcome,
        error_message=error_message,
        ip_address=context['ip_address'],
        user_agent=context['user_agent'],
        metadata=metadata or {}
    )


def get_client_ip(request):
    """
    Extract client IP address from request.

    Handles proxied requests by checking X-Forwarded-For header.

    Args:
        request: Django request object

    Returns:
        IP address string
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '0.0.0.0')
    return ip


def get_user_agent(request):
    """
    Extract user agent from request.

    Args:
        request: Django request object

    Returns:
        User agent string
    """
    return request.META.get('HTTP_USER_AGENT', 'Unknown')


@contextmanager
def track_model_changes(instance):
    """
    Context manager to track changes to a model instance.

    Example:
        with track_model_changes(document) as tracker:
            document.title = "New Title"
            document.save()

        changed_fields, before, after = tracker.get_changes()
    """
    class ChangeTracker:
        def __init__(self, instance):
            self.instance = instance
            self.before = model_to_dict(instance, exclude_fields=['updated_at'])

        def get_changes(self):
            """Get the changes that occurred."""
            # Refresh from database to get current state
            self.instance.refresh_from_db()
            after = model_to_dict(self.instance, exclude_fields=['updated_at'])

            changed_fields, before_values, after_values = AuditLog.detect_changes(
                self.before, after
            )

            return changed_fields, before_values, after_values

    tracker = ChangeTracker(instance)
    yield tracker


# Backwards compatibility function
def log_audit_event(user, action, resource_type, resource_id=None, details=None, outcome='SUCCESS', ip_address=None, user_agent=None):
    """
    Legacy function for backwards compatibility.

    Use AuditLog.log_action() or specific log functions instead.
    """
    return AuditLog.log_action(
        user=user,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        resource_name=details.get('resource_name', '') if details else '',
        outcome=outcome,
        ip_address=ip_address,
        user_agent=user_agent,
        metadata=details or {}
    )
