"""
Django settings for DFC project.

Settings are split into base, development, and production modules.
The active settings module is determined by the DJANGO_SETTINGS_MODULE environment variable.

Default: config.settings.development
"""

import os

# Determine which settings to use
ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')

if ENVIRONMENT == 'production':
    from .production import *  # noqa
elif ENVIRONMENT == 'testing':
    from .testing import *  # noqa
else:
    from .development import *  # noqa
