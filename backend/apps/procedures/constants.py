"""
Constants for the Procedures app.
"""

# File validation
ALLOWED_EXTENSIONS = [
    'pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt',
    'png', 'jpg', 'jpeg', 'gif', 'svg',
    'mp4', 'webm', 'ogg', 'mp3',
    'txt', 'csv', 'json',
]

MAX_FILE_SIZE_MB = 100
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

# Lifecycle
EDITABLE_STATES = ['draft']
SUBMITTABLE_STATES = ['draft']
PUBLISHABLE_STATES = ['approved']
RETIRABLE_STATES = ['published']
