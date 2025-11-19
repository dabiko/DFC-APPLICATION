"""
Retention policies and legal hold management for DFC.

This app handles:
- Retention policies for automatic document lifecycle management
- Legal holds to prevent deletion during legal proceedings
- Automated notifications before deletion
- Grace periods before final deletion
"""

default_app_config = 'apps.retention.apps.RetentionConfig'
