"""
Tenant utilities for multi-tenant data isolation.

Provides:
- Thread-local storage for current organization context
- Tenant-aware model manager for automatic filtering
"""
import threading
from typing import Optional


# Thread-local storage for current organization
_thread_locals = threading.local()


def set_current_organization(organization):
    """
    Set the current organization for this thread.

    Args:
        organization: Organization instance or None
    """
    _thread_locals.organization = organization


def get_current_organization():
    """
    Get the current organization for this thread.

    Returns:
        Organization instance or None
    """
    return getattr(_thread_locals, 'organization', None)


def clear_current_organization():
    """Clear the current organization from thread-local storage."""
    if hasattr(_thread_locals, 'organization'):
        del _thread_locals.organization


class TenantManager:
    """
    Custom manager that automatically filters querysets by current organization.

    Usage:
        class Document(models.Model):
            organization = models.ForeignKey(Organization, on_delete=models.PROTECT)
            # ... other fields ...

            objects = models.Manager()  # Default manager (no filtering)
            tenant_objects = TenantManager()  # Tenant-aware manager

    Then in views:
        # This will only return documents from current user's organization
        documents = Document.tenant_objects.all()
    """

    def __get__(self, instance, owner):
        """
        Called when accessing the manager from a model class.
        Returns a QuerySet filtered by current organization.
        """
        if instance is not None:
            # Accessing from instance (e.g., doc.tenant_objects) - not supported
            raise AttributeError(
                f"Manager isn't accessible via {owner.__name__} instances. "
                "Use the model class instead."
            )

        # Return a custom manager bound to the model
        from django.db import models

        class _TenantManagerImpl(models.Manager):
            def get_queryset(self):
                """Override get_queryset to filter by current organization."""
                queryset = super().get_queryset()
                organization = get_current_organization()

                if organization is not None:
                    # Filter by current organization
                    return queryset.filter(organization=organization)

                # No organization set - return all (for admin/system operations)
                return queryset

        return _TenantManagerImpl()


def require_organization(func):
    """
    Decorator to require an organization context.

    Usage:
        @require_organization
        def create_document(request):
            # This will only execute if organization is set
            ...
    """
    from functools import wraps
    from django.core.exceptions import PermissionDenied

    @wraps(func)
    def wrapper(*args, **kwargs):
        if get_current_organization() is None:
            raise PermissionDenied("Organization context required for this operation")
        return func(*args, **kwargs)

    return wrapper
