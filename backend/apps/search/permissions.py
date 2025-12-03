"""
Search Permission Filtering
CRITICAL: Ensures users only see documents they have permission to view
"""

from elasticsearch_dsl import Q
from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)


def filter_results_by_permissions(search, user):
    """
    Filter search results based on user permissions

    This is CRITICAL for security - users must only see documents they can access

    Filtering criteria:
    1. User owns the document (owner)
    2. Document is in user's department
    3. Confidentiality level allows user access
    4. Staff users see all documents (for admin purposes)

    Args:
        search: Elasticsearch DSL Search object
        user: Django User object

    Returns:
        Filtered Search object
    """
    # Staff/superuser bypass (admins see everything)
    if user.is_staff or user.is_superuser:
        return search

    # Build permission filters
    permission_queries = []

    # 1. Documents owned by user
    permission_queries.append(Q('term', **{'owner.id': str(user.id)}))

    # 2. Documents in user's department (if user has department)
    if hasattr(user, 'department') and user.department:
        permission_queries.append(Q('term', **{'department.id': user.department.id}))

    # 3. Public documents (everyone can access)
    permission_queries.append(Q('term', confidentiality_level='PUBLIC'))

    # 4. Confidentiality level filtering based on user clearance
    user_clearance = get_user_clearance_level(user)
    allowed_levels = get_allowed_confidentiality_levels(user_clearance)

    if allowed_levels and len(allowed_levels) > 1:
        # Add filter for documents with allowed confidentiality levels
        permission_queries.append(Q('terms', confidentiality_level=allowed_levels))

    # Combine with OR (user needs at least one permission)
    if permission_queries:
        combined_filter = permission_queries[0]
        for pq in permission_queries[1:]:
            combined_filter |= pq
        search = search.filter(combined_filter)

    return search


def get_user_clearance_level(user):
    """
    Get user's confidentiality clearance level

    Returns highest clearance level user has access to

    Levels:
    - 4: Highly Confidential (superuser)
    - 3: Confidential (staff)
    - 2: Internal (authenticated users)
    - 1: Public (everyone)

    Args:
        user: Django User object

    Returns:
        int: Clearance level (1-4)
    """
    if user.is_superuser:
        return 4  # Highly Confidential

    if user.is_staff:
        return 3  # Confidential

    # Check user's role for additional clearance
    # You can extend this based on your RBAC implementation
    try:
        from apps.permissions.models import UserRole
        user_roles = UserRole.objects.filter(user=user).select_related('role')

        # Check if user has Manager or Admin role
        for user_role in user_roles:
            if user_role.role.name in ['Manager', 'Admin', 'Department Head']:
                return 3  # Confidential
    except ImportError:
        pass

    return 2  # Internal (default for authenticated users)


def get_allowed_confidentiality_levels(clearance_level):
    """
    Get list of confidentiality levels user can access

    Hierarchy (case-insensitive):
    - PUBLIC (everyone)
    - INTERNAL (authenticated users)
    - CONFIDENTIAL (specific roles/departments)
    - HIGHLY_CONFIDENTIAL (authorized individuals only)

    Args:
        clearance_level: User's clearance level (1-4)

    Returns:
        list: Allowed confidentiality level strings
    """
    level_mapping = {
        1: ['PUBLIC'],
        2: ['PUBLIC', 'INTERNAL'],
        3: ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL'],
        4: ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'HIGHLY_CONFIDENTIAL'],
    }

    return level_mapping.get(clearance_level, ['PUBLIC', 'INTERNAL'])


def get_user_accessible_folders(user):
    """
    Get list of folder IDs user has access to

    This queries the folder permissions and caches the result

    Args:
        user: Django User object

    Returns:
        list: List of folder IDs (UUIDs as strings)
    """
    # Check cache first
    cache_key = f"user_folders_{user.id}"
    cached_folders = cache.get(cache_key)

    if cached_folders is not None:
        return cached_folders

    try:
        from apps.folders.models import Folder
        from apps.permissions.models import FolderPermission

        # Get folders user can access
        accessible_folder_ids = set()

        # 1. Folders owned by user
        owned_folders = Folder.objects.filter(
            created_by=user,
            is_deleted=False
        ).values_list('id', flat=True)
        accessible_folder_ids.update(str(fid) for fid in owned_folders)

        # 2. Folders in user's department
        if hasattr(user, 'department') and user.department:
            dept_folders = Folder.objects.filter(
                department=user.department,
                is_deleted=False
            ).values_list('id', flat=True)
            accessible_folder_ids.update(str(fid) for fid in dept_folders)

        # 3. Folders explicitly shared with user via permissions
        try:
            shared_folders = FolderPermission.objects.filter(
                user=user,
                can_view=True
            ).values_list('folder_id', flat=True)
            accessible_folder_ids.update(str(fid) for fid in shared_folders)
        except Exception as e:
            logger.warning(f"Error fetching shared folders: {e}")

        # 4. Public folders (if applicable)
        # Uncomment if you have a is_public field
        # public_folders = Folder.objects.filter(
        #     is_public=True,
        #     is_deleted=False
        # ).values_list('id', flat=True)
        # accessible_folder_ids.update(str(fid) for fid in public_folders)

        folder_list = list(accessible_folder_ids)

        # Cache for 1 hour
        cache.set(cache_key, folder_list, 3600)

        return folder_list

    except Exception as e:
        logger.error(f"Error getting accessible folders for user {user.id}: {e}")
        return []


def clear_user_folder_cache(user_id):
    """
    Clear cached folder permissions for a user

    Call this when:
    - User's permissions change
    - Folders are created/deleted
    - Department assignments change

    Args:
        user_id: User ID
    """
    cache_key = f"user_folders_{user_id}"
    cache.delete(cache_key)
    logger.debug(f"Cleared folder cache for user {user_id}")
