"""
Email utilities for user-related communications.
"""
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
import logging

logger = logging.getLogger(__name__)


def send_welcome_email(user, company_name=None):
    """
    Send a welcome email to newly registered users.

    Args:
        user: CustomUser instance
        company_name: Optional company name override (defaults to user.organization.name)

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        # Get company name from organization or use provided value
        if not company_name and user.organization:
            company_name = user.organization.name
        elif not company_name:
            company_name = "Your Organization"

        # Construct URLs (adjust based on your frontend URL configuration)
        base_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        login_url = f"{base_url}/login"
        terms_url = f"{base_url}/terms"
        privacy_url = f"{base_url}/privacy"
        help_url = f"{base_url}/help"

        # Email context
        context = {
            'user_first_name': user.first_name or 'there',
            'user_email': user.email,
            'username': user.username,
            'employee_id': user.employee_id or 'N/A',
            'company_name': company_name,
            'login_url': login_url,
            'terms_url': terms_url,
            'privacy_url': privacy_url,
            'help_url': help_url,
        }

        # Render HTML and text versions
        html_content = render_to_string('users/emails/welcome.html', context)
        text_content = render_to_string('users/emails/welcome.txt', context)

        # Email subject
        subject = f'Welcome to Digital Filing Cabinet - {company_name}'

        # From email
        from_email = getattr(
            settings,
            'DEFAULT_FROM_EMAIL',
            'noreply@digitalfilingcabinet.com'
        )

        # Create email message with both HTML and text versions
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=[user.email],
        )

        # Attach HTML version
        email.attach_alternative(html_content, "text/html")

        # Send email
        email.send(fail_silently=False)

        logger.info(f"Welcome email sent successfully to {user.email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send welcome email to {user.email}: {str(e)}")
        return False


def send_password_reset_email(user, reset_token):
    """
    Send password reset email to user.

    Args:
        user: CustomUser instance
        reset_token: Password reset token

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    # TODO: Implement password reset email
    pass


def send_account_locked_email(user):
    """
    Send account locked notification email to user.

    Args:
        user: CustomUser instance

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    # TODO: Implement account locked email
    pass


def send_mfa_enabled_email(user):
    """
    Send MFA enabled confirmation email to user.

    Args:
        user: CustomUser instance

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    # TODO: Implement MFA enabled email
    pass
