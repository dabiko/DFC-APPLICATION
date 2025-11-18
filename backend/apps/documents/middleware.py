"""
Middleware for document management.
"""
from django.http import JsonResponse
from apps.documents.utils import check_storage_quota
import logging

logger = logging.getLogger(__name__)


class StorageQuotaMiddleware:
    """
    Middleware to enforce storage quota before file uploads.

    Checks if the user's department has sufficient storage quota
    before allowing file uploads to proceed.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Only check for upload endpoints
        if request.method == 'POST' and self._is_upload_request(request):
            # Check if user is authenticated
            if not request.user.is_authenticated:
                return self.get_response(request)

            # Get file size from request
            file_size = self._get_file_size(request)

            if file_size:
                # Check storage quota
                can_upload, message = check_storage_quota(request.user, file_size)

                if not can_upload:
                    logger.warning(
                        f"Upload blocked for user {request.user.username}: {message}"
                    )
                    return JsonResponse(
                        {
                            'error': 'Storage quota exceeded',
                            'detail': message
                        },
                        status=413  # HTTP 413 Payload Too Large
                    )

        response = self.get_response(request)
        return response

    def _is_upload_request(self, request):
        """Check if this is a file upload request"""
        upload_paths = [
            '/api/v1/documents/upload/',
            '/api/v1/documents/chunked-upload/',
        ]
        return any(path in request.path for path in upload_paths)

    def _get_file_size(self, request):
        """Extract file size from request"""
        # For regular file uploads
        if 'file' in request.FILES:
            return request.FILES['file'].size

        # For chunked uploads (get total size from metadata)
        if 'file_size' in request.POST:
            try:
                return int(request.POST['file_size'])
            except (ValueError, TypeError):
                pass

        # For chunked upload chunks
        if 'chunk' in request.FILES and 'file_size' in request.POST:
            try:
                return int(request.POST['file_size'])
            except (ValueError, TypeError):
                pass

        return None
