"""
Email validators for organization management.
Ensures users register with business emails, not personal/free providers.
"""
from django.core.exceptions import ValidationError
from django.core.validators import validate_email as django_validate_email


# List of blocked free email providers (personal/temporary email services)
BLOCKED_EMAIL_DOMAINS = [
    # Major free providers
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
    'live.com', 'msn.com', 'aol.com', 'mail.com',
    'icloud.com', 'me.com', 'mac.com',
    'protonmail.com', 'proton.me', 'pm.me',
    'yandex.com', 'yandex.ru', 'mail.ru',
    'zoho.com', 'gmx.com', 'gmx.net',

    # Temporary/disposable email services
    'tempmail.com', '10minutemail.com', 'guerrillamail.com',
    'mailinator.com', 'maildrop.cc', 'throwaway.email',
    'sharklasers.com', 'guerrillamail.info', 'grr.la',
    'spam4.me', 'trashmail.com', 'fakeinbox.com',
    'temp-mail.org', 'getnada.com', 'emailondeck.com',

    # Educational (optional - uncomment if you want to block these)
    # 'edu', '.edu.ng', '.edu.gh',
]


def validate_business_email(value):
    """
    Validate that email is a business/company email.

    Blocks:
    - Free email providers (Gmail, Yahoo, Hotmail, etc.)
    - Temporary/disposable email services
    - Invalid email formats

    Args:
        value (str): Email address to validate

    Raises:
        ValidationError: If email is from a blocked domain or invalid
    """
    # First, validate it's a proper email format
    try:
        django_validate_email(value)
    except ValidationError:
        raise ValidationError(
            'Please enter a valid email address.',
            code='invalid_email'
        )

    # Extract domain from email
    email_lower = value.lower().strip()

    if '@' not in email_lower:
        raise ValidationError(
            'Please enter a valid email address.',
            code='invalid_email'
        )

    domain = email_lower.split('@')[1]

    # Check if domain is in blocked list
    if domain in BLOCKED_EMAIL_DOMAINS:
        raise ValidationError(
            'Please use your business or company email address. '
            'Free email providers (Gmail, Yahoo, Hotmail, etc.) are not allowed. '
            'We require a company domain to ensure organizational security.',
            code='personal_email_not_allowed'
        )

    # Additional check for common patterns
    if any(keyword in domain for keyword in ['temp', 'disposable', 'trash', 'fake', 'throwaway']):
        raise ValidationError(
            'Temporary or disposable email addresses are not allowed. '
            'Please use your business email address.',
            code='disposable_email_not_allowed'
        )

    return value


def extract_domain_from_email(email):
    """
    Extract domain from email address.

    Args:
        email (str): Email address

    Returns:
        str: Domain part of email (e.g., 'cccplc.net' from 'user@cccplc.net')
    """
    if '@' not in email:
        return None

    return email.lower().strip().split('@')[1]


def is_same_organization_domain(email1, email2):
    """
    Check if two emails belong to the same organization domain.

    Args:
        email1 (str): First email address
        email2 (str): Second email address

    Returns:
        bool: True if domains match, False otherwise
    """
    domain1 = extract_domain_from_email(email1)
    domain2 = extract_domain_from_email(email2)

    if not domain1 or not domain2:
        return False

    return domain1 == domain2
