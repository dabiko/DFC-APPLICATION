"""
Email Service for DFC Application

Centralized email service using Resend for all transactional emails.
Supports development and production environments with appropriate configurations.
"""
import logging
from typing import Optional, Dict, Any
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


class EmailService:
    """
    Centralized email service for DFC application.

    Uses Resend API for sending transactional emails with support for:
    - HTML and plain text templates
    - Development/production environment switching
    - Error handling and logging
    - Email tracking and analytics
    """

    @staticmethod
    def _send_email(
        to_email: str,
        subject: str,
        html_content: str,
        from_email: Optional[str] = None,
        reply_to: Optional[str] = None,
        tags: Optional[Dict[str, str]] = None
    ) -> bool:
        """
        Internal method to send email via Resend API.

        Args:
            to_email: Recipient email address
            subject: Email subject line
            html_content: HTML content of the email
            from_email: Sender email (defaults to DEFAULT_FROM_EMAIL)
            reply_to: Reply-to email address
            tags: Optional tags for email tracking

        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            # Use console backend for development (only if not using actual email)
            if settings.DEBUG and not settings.USE_RESEND_IN_DEV:
                logger.info(f"[DEV MODE] Email would be sent to: {to_email}")
                logger.info(f"[DEV MODE] Subject: {subject}")
                logger.info(f"[DEV MODE] Content: {html_content[:200]}...")
                return True

            # Check if Resend is available and configured
            try:
                import resend
                has_resend = True
            except ImportError:
                has_resend = False

            # Use Resend if available and API key is configured
            if has_resend and settings.RESEND_API_KEY:
                # Set API key
                resend.api_key = settings.RESEND_API_KEY

                # Prepare email data
                email_data = {
                    "from": from_email or settings.DEFAULT_FROM_EMAIL,
                    "to": [to_email],
                    "subject": subject,
                    "html": html_content,
                    "text": strip_tags(html_content),  # Plain text fallback
                }

                # Add optional fields
                if reply_to:
                    email_data["reply_to"] = [reply_to]

                if tags:
                    email_data["tags"] = tags

                # Send email via Resend
                response = resend.Emails.send(email_data)
                logger.info(f"Email sent via Resend to {to_email}. Message ID: {response.get('id')}")
                return True
            else:
                # Fall back to Django's email backend (SMTP, etc.)
                from django.core.mail import EmailMultiAlternatives

                logger.info(f"Sending email via Django email backend to {to_email}")

                email = EmailMultiAlternatives(
                    subject=subject,
                    body=strip_tags(html_content),
                    from_email=from_email or settings.DEFAULT_FROM_EMAIL,
                    to=[to_email],
                    reply_to=[reply_to] if reply_to else None,
                )
                email.attach_alternative(html_content, "text/html")
                email.send(fail_silently=False)

                logger.info(f"Email sent successfully via Django backend to {to_email}")
                return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}", exc_info=True)
            return False

    @classmethod
    def send_password_reset_email(
        cls,
        user_email: str,
        reset_token: str,
        reset_url: str,
        user_name: Optional[str] = None,
        expires_in_minutes: int = 60
    ) -> bool:
        """
        Send password reset email to user.

        Args:
            user_email: User's email address
            reset_token: Password reset token
            reset_url: Full URL for password reset
            user_name: User's name (optional)
            expires_in_minutes: Token expiration time in minutes

        Returns:
            bool: True if email sent successfully
        """
        context = {
            'reset_url': reset_url,
            'user_email': user_email,
            'user_name': user_name or user_email.split('@')[0],
            'expires_in_minutes': expires_in_minutes,
            'company_name': 'DFC - Digital Filing Cabinet',
            'support_email': settings.SUPPORT_EMAIL,
        }

        try:
            html_content = render_to_string('emails/password_reset.html', context)

            return cls._send_email(
                to_email=user_email,
                subject='Password Reset Request - DFC',
                html_content=html_content,
                tags={'type': 'password_reset', 'category': 'transactional'}
            )
        except Exception as e:
            logger.error(f"Error rendering password reset email template: {str(e)}", exc_info=True)
            return False

    @classmethod
    def send_welcome_email(
        cls,
        user_email: str,
        user_name: str,
        login_url: str
    ) -> bool:
        """
        Send welcome email to new user.

        Args:
            user_email: User's email address
            user_name: User's full name
            login_url: URL to login page

        Returns:
            bool: True if email sent successfully
        """
        context = {
            'user_name': user_name,
            'user_email': user_email,
            'login_url': login_url,
            'company_name': 'DFC - Digital Filing Cabinet',
            'support_email': settings.SUPPORT_EMAIL,
        }

        try:
            html_content = render_to_string('emails/welcome.html', context)

            return cls._send_email(
                to_email=user_email,
                subject='Welcome to DFC - Digital Filing Cabinet',
                html_content=html_content,
                tags={'type': 'welcome', 'category': 'onboarding'}
            )
        except Exception as e:
            logger.error(f"Error rendering welcome email template: {str(e)}", exc_info=True)
            return False

    @classmethod
    def send_password_changed_notification(
        cls,
        user_email: str,
        user_name: str,
        change_time: str,
        ip_address: Optional[str] = None
    ) -> bool:
        """
        Send notification when password is changed.

        Args:
            user_email: User's email address
            user_name: User's name
            change_time: Timestamp of password change
            ip_address: IP address from which change was made

        Returns:
            bool: True if email sent successfully
        """
        context = {
            'user_name': user_name,
            'change_time': change_time,
            'ip_address': ip_address,
            'company_name': 'DFC - Digital Filing Cabinet',
            'support_email': settings.SUPPORT_EMAIL,
        }

        try:
            html_content = render_to_string('emails/password_changed.html', context)

            return cls._send_email(
                to_email=user_email,
                subject='Your DFC Password Has Been Changed',
                html_content=html_content,
                tags={'type': 'password_changed', 'category': 'security'}
            )
        except Exception as e:
            logger.error(f"Error rendering password changed email template: {str(e)}", exc_info=True)
            return False

    @classmethod
    def send_account_locked_notification(
        cls,
        user_email: str,
        user_name: str,
        locked_until: str,
        failed_attempts: int
    ) -> bool:
        """
        Send notification when account is locked due to failed login attempts.

        Args:
            user_email: User's email address
            user_name: User's name
            locked_until: Timestamp when account will be unlocked
            failed_attempts: Number of failed attempts

        Returns:
            bool: True if email sent successfully
        """
        context = {
            'user_name': user_name,
            'locked_until': locked_until,
            'failed_attempts': failed_attempts,
            'company_name': 'DFC - Digital Filing Cabinet',
            'support_email': settings.SUPPORT_EMAIL,
        }

        try:
            html_content = render_to_string('emails/account_locked.html', context)

            return cls._send_email(
                to_email=user_email,
                subject='Security Alert: Your DFC Account Has Been Locked',
                html_content=html_content,
                tags={'type': 'account_locked', 'category': 'security'}
            )
        except Exception as e:
            logger.error(f"Error rendering account locked email template: {str(e)}", exc_info=True)
            return False

    @classmethod
    def send_document_shared_notification(
        cls,
        recipient_email: str,
        recipient_name: str,
        document_name: str,
        shared_by: str,
        document_url: str,
        expires_at: Optional[str] = None
    ) -> bool:
        """
        Send notification when a document is shared with user.

        Args:
            recipient_email: Recipient's email address
            recipient_name: Recipient's name
            document_name: Name of shared document
            shared_by: Name of person who shared the document
            document_url: URL to access the document
            expires_at: Expiration timestamp (if applicable)

        Returns:
            bool: True if email sent successfully
        """
        context = {
            'recipient_name': recipient_name,
            'document_name': document_name,
            'shared_by': shared_by,
            'document_url': document_url,
            'expires_at': expires_at,
            'company_name': 'DFC - Digital Filing Cabinet',
        }

        try:
            html_content = render_to_string('emails/document_shared.html', context)

            return cls._send_email(
                to_email=recipient_email,
                subject=f'{shared_by} shared a document with you - DFC',
                html_content=html_content,
                tags={'type': 'document_shared', 'category': 'collaboration'}
            )
        except Exception as e:
            logger.error(f"Error rendering document shared email template: {str(e)}", exc_info=True)
            return False
