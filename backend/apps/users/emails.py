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
            'user_name': user.get_full_name() or user.username,
            'user_email': user.email,
            'company_name': company_name,
            'login_url': login_url,
            'support_email': settings.SUPPORT_EMAIL,
        }

        # Render HTML version (enterprise template)
        html_content = render_to_string('emails/welcome.html', context)

        # Simple text version as fallback
        text_content = f"""
        Hello {context['user_name']},

        We're excited to have you on board! Your account has been successfully created with the email address {context['user_email']}.

        You now have access to our secure enterprise document management system.

        Sign in to your account: {login_url}

        Getting Started with DFC:
        - Upload & Organize Documents: Securely store your files with our structured folder hierarchy
        - Powerful Search & Filter: Find any document instantly with full-text search and advanced filters
        - Secure Collaboration: Share documents safely with team members and track all activity
        - Version Control & Audit Trail: Track document versions and view complete activity history

        Pro Tip: Use tags and metadata to categorize your documents. This makes finding them later much easier!

        Security First: Enable two-factor authentication (2FA) in your account settings for an extra layer of security.

        If you have any questions or need assistance, contact support: {settings.SUPPORT_EMAIL}

        Best regards,
        The DFC Team
        {company_name}
        """

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
    from django.template.loader import render_to_string
    from django.conf import settings
    from django.core.mail import EmailMultiAlternatives
    from django.utils import timezone
    import logging

    logger = logging.getLogger(__name__)

    try:
        # Calculate locked until time
        locked_until = user.account_locked_until
        if locked_until:
            locked_until_str = locked_until.strftime('%Y-%m-%d %H:%M:%S UTC')
        else:
            locked_until_str = 'Unknown'

        # Render email template
        context = {
            'user_name': user.get_full_name() or user.username,
            'failed_attempts': user.MAX_FAILED_LOGIN_ATTEMPTS,
            'locked_until': locked_until_str,
            'support_email': settings.SUPPORT_EMAIL,
            'company_name': user.organization.name if user.organization else 'CCC PLC',
        }

        html_content = render_to_string('emails/account_locked.html', context)
        text_content = f"""
        Hello {context['user_name']},

        Your Digital Filing Cabinet account has been locked due to {context['failed_attempts']} consecutive failed login attempts.

        Account Status: LOCKED
        Locked Until: {locked_until_str}

        If this was you:
        - Wait until the lock period expires
        - Try logging in again with the correct password
        - If you've forgotten your password, use the "Forgot Password" option

        If this wasn't you:
        - Your account may be under attack - contact our security team immediately
        - Email: {settings.SUPPORT_EMAIL}

        Best regards,
        The DFC Security Team
        """

        # Create email
        subject = 'Security Alert: Account Locked - Digital Filing Cabinet'
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email],
        )
        email.attach_alternative(html_content, "text/html")

        # Send email
        email.send(fail_silently=False)

        logger.info(f"Account locked email sent successfully to {user.email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send account locked email to {user.email}: {str(e)}")
        return False


def send_account_unlocked_email(user):
    """
    Send account unlocked notification email to user after password reset.

    Args:
        user: CustomUser instance

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    from django.template.loader import render_to_string
    from django.conf import settings
    from django.core.mail import EmailMultiAlternatives
    from django.utils import timezone
    import logging

    logger = logging.getLogger(__name__)

    try:
        # Render email template
        context = {
            'user_name': user.get_full_name() or user.username,
            'unlock_time': timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC'),
            'support_email': settings.SUPPORT_EMAIL,
            'company_name': user.organization.name if user.organization else 'CCC PLC',
            'login_url': f"{settings.FRONTEND_URL}/login",
        }

        html_content = render_to_string('emails/account_unlocked.html', context)
        text_content = f"""
        Hello {context['user_name']},

        Good news! Your Digital Filing Cabinet account has been successfully unlocked.

        Unlocked At: {context['unlock_time']}
        Reason: Password successfully reset

        You can now log in with your new password at:
        {context['login_url']}

        Security Recommendations:
        - Use a strong, unique password
        - Enable two-factor authentication (2FA)
        - Monitor your account for suspicious activity
        - Never share your password with anyone

        If you did not reset your password, please contact our security team immediately at {settings.SUPPORT_EMAIL}

        Best regards,
        The DFC Security Team
        """

        # Create email
        subject = 'Account Unlocked - Digital Filing Cabinet'
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email],
        )
        email.attach_alternative(html_content, "text/html")

        # Send email
        email.send(fail_silently=False)

        logger.info(f"Account unlocked email sent successfully to {user.email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send account unlocked email to {user.email}: {str(e)}")
        return False


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


def send_email_otp(email, otp_code, user_name=None, expiry_minutes=10):
    """
    Send OTP verification code to email address.

    Args:
        email: Email address to send OTP to
        otp_code: The OTP code to send
        user_name: Optional user name for personalization
        expiry_minutes: Number of minutes until code expires (default: 10)

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    from django.template.loader import render_to_string
    from django.conf import settings
    from django.core.mail import EmailMultiAlternatives
    import logging

    logger = logging.getLogger(__name__)

    try:
        # Render email template
        context = {
            'user_name': user_name or 'there',
            'otp_code': otp_code,
            'expiry_minutes': expiry_minutes,
            'support_email': settings.SUPPORT_EMAIL,
            'company_name': 'Digital Filing Cabinet',
        }

        html_content = render_to_string('emails/email_otp.html', context)
        text_content = f"""
        Hello {context['user_name']},

        Please use the verification code below to complete your registration with Digital Filing Cabinet.

        YOUR VERIFICATION CODE: {otp_code}

        This code will expire in {expiry_minutes} minutes.

        Instructions:
        - Enter this code in the verification form on the registration page
        - The code is case-sensitive, so please enter it exactly as shown
        - This code can only be used once
        - If you didn't request this code, you can safely ignore this email

        Security Reminder:
        Never share this code with anyone. DFC staff will never ask for your verification code.

        If you didn't request this verification, please contact our security team immediately at {settings.SUPPORT_EMAIL}

        Best regards,
        The DFC Team
        {context['company_name']}
        """

        # Create email
        subject = 'Email Verification Code - Digital Filing Cabinet'
        email_message = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[email],
        )
        email_message.attach_alternative(html_content, "text/html")

        # Send email
        email_message.send(fail_silently=False)

        logger.info(f"Email OTP sent successfully to {email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send email OTP to {email}: {str(e)}")
        return False
