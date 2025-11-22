# Resend Email Integration Guide

This document explains how to set up and use Resend for sending transactional emails in the DFC application.

## Table of Contents
- [Overview](#overview)
- [Development Setup](#development-setup)
- [Production Setup](#production-setup)
- [Testing](#testing)
- [Available Email Templates](#available-email-templates)
- [Troubleshooting](#troubleshooting)

---

## Overview

DFC uses [Resend](https://resend.com) for sending transactional emails. Resend provides:
- **Modern API**: Simple, developer-friendly API
- **Generous Free Tier**: 3,000 emails/month free
- **Email Analytics**: Track delivery, opens, and clicks
- **Development Mode**: Test emails without actually sending them
- **React Email Support**: Build beautiful emails with React (optional)

**Tech Stack:**
- Backend: Django + Resend Python SDK
- Email Templates: Django HTML templates
- Service Layer: `EmailService` class for centralized email management

---

## Development Setup

### Step 1: Install Dependencies

Resend is already installed via `requirements.txt`. If you need to reinstall:

```bash
pip install resend
```

### Step 2: Configure Environment Variables

For **development**, emails are printed to the console by default. No Resend API key needed!

Your `.env` file should have:

```env
# Email Configuration (Development)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
RESEND_API_KEY=
USE_RESEND_IN_DEV=False
DEFAULT_FROM_EMAIL=DFC <noreply@yourdomain.com>
SUPPORT_EMAIL=support@yourdomain.com
FRONTEND_URL=http://localhost:5173
```

**What this does:**
- `EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend` → Prints emails to console instead of sending them
- `USE_RESEND_IN_DEV=False` → Disables Resend in development
- `RESEND_API_KEY=` → Leave empty for development

### Step 3: Test Email Sending

Run the development server:

```bash
python manage.py runserver
```

When you trigger a password reset, you'll see the email content printed in your terminal/console instead of being sent.

**Example Console Output:**
```
[DEV MODE] Email would be sent to: user@example.com
[DEV MODE] Subject: Password Reset Request - DFC
[DEV MODE] Content: <html>...</html>
```

---

## Production Setup

### Step 1: Sign Up for Resend

1. Go to [https://resend.com](https://resend.com)
2. Sign up for a free account (3,000 emails/month)
3. Verify your email address

### Step 2: Add Your Domain

1. Go to **Domains** in Resend dashboard
2. Click **Add Domain**
3. Enter your domain (e.g., `yourdomain.com`)
4. Follow the instructions to add DNS records:
   - SPF record
   - DKIM record
   - DMARC record (optional but recommended)

**Example DNS Records:**
```
TXT @ "v=spf1 include:_spf.resend.com ~all"
TXT resend._domainkey [DKIM value from Resend]
TXT _dmarc "v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com"
```

### Step 3: Get Your API Key

1. Go to **API Keys** in Resend dashboard
2. Click **Create API Key**
3. Name it (e.g., "DFC Production")
4. Copy the API key (starts with `re_...`)

### Step 4: Configure Production Environment

Create `.env.production` file:

```env
# Email Configuration (Production)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend  # We'll override this in settings
RESEND_API_KEY=re_your_production_api_key_here
USE_RESEND_IN_DEV=False
DEFAULT_FROM_EMAIL=DFC <noreply@yourdomain.com>
SUPPORT_EMAIL=support@yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

**Important:**
- Replace `re_your_production_api_key_here` with your actual Resend API key
- Replace `yourdomain.com` with your actual domain
- Make sure your domain is verified in Resend before sending emails

### Step 5: Deploy

When you deploy to production, make sure:
1. Your environment variables are set correctly
2. Your domain is verified in Resend
3. DNS records are propagated (can take 24-48 hours)

---

## Testing

### Test in Development (Console Output)

```bash
# Request password reset via API or frontend
curl -X POST http://localhost:8000/api/v1/auth/password/reset/request/ \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Check your terminal/console for the email output
```

### Test with Real Emails (Development)

If you want to test with real emails in development:

1. Update `.env`:
```env
USE_RESEND_IN_DEV=True
RESEND_API_KEY=re_your_test_api_key_here
```

2. Make sure you're using your personal domain or Resend's sandbox mode

3. Restart the server and test

### Test Email Templates

You can preview email templates by rendering them manually:

```python
python manage.py shell

from django.template.loader import render_to_string

context = {
    'reset_url': 'http://localhost:5173/reset-password?token=test123',
    'user_email': 'test@example.com',
    'user_name': 'Test User',
    'expires_in_minutes': 60,
    'company_name': 'DFC - Digital Filing Cabinet',
    'support_email': 'support@dfc.com',
}

html = render_to_string('emails/password_reset.html', context)
print(html)
```

---

## Available Email Templates

### 1. Password Reset Email
**Template:** `templates/emails/password_reset.html`

**Triggered when:** User requests password reset

**Variables:**
- `user_name`: User's name
- `user_email`: User's email
- `reset_url`: Full password reset URL
- `expires_in_minutes`: Token expiration time

**Usage:**
```python
from apps.users.services import EmailService

EmailService.send_password_reset_email(
    user_email='user@example.com',
    reset_token='abc123',
    reset_url='http://localhost:5173/reset-password?token=abc123',
    user_name='John Doe',
    expires_in_minutes=60
)
```

### 2. Welcome Email
**Template:** `templates/emails/welcome.html`

**Triggered when:** New user account is created

**Variables:**
- `user_name`: User's name
- `user_email`: User's email
- `login_url`: URL to login page

**Usage:**
```python
EmailService.send_welcome_email(
    user_email='newuser@example.com',
    user_name='Jane Smith',
    login_url='http://localhost:5173/login'
)
```

### 3. Password Changed Notification
**Template:** `templates/emails/password_changed.html`

**Triggered when:** User successfully changes password

**Variables:**
- `user_name`: User's name
- `change_time`: Timestamp of change
- `ip_address`: IP address of change

**Usage:**
```python
EmailService.send_password_changed_notification(
    user_email='user@example.com',
    user_name='John Doe',
    change_time='2025-11-22 12:00:00 UTC',
    ip_address='192.168.1.1'
)
```

### 4. Account Locked Notification
**Template:** `templates/emails/account_locked.html`

**Triggered when:** Account locked due to failed login attempts

**Variables:**
- `user_name`: User's name
- `locked_until`: Timestamp when account unlocks
- `failed_attempts`: Number of failed attempts

**Usage:**
```python
EmailService.send_account_locked_notification(
    user_email='user@example.com',
    user_name='John Doe',
    locked_until='2025-11-23 12:00:00',
    failed_attempts=5
)
```

### 5. Document Shared Notification
**Template:** `templates/emails/document_shared.html`

**Triggered when:** Document is shared with user

**Variables:**
- `recipient_name`: Recipient's name
- `document_name`: Name of document
- `shared_by`: Name of person who shared
- `document_url`: URL to access document
- `expires_at`: Expiration timestamp (optional)

**Usage:**
```python
EmailService.send_document_shared_notification(
    recipient_email='colleague@example.com',
    recipient_name='Jane Smith',
    document_name='Q4 Report.pdf',
    shared_by='John Doe',
    document_url='http://localhost:5173/documents/123',
    expires_at='2025-12-01 00:00:00'
)
```

---

## Troubleshooting

### Emails Not Appearing in Console

**Problem:** Password reset triggered but no email in console

**Solution:**
1. Check that `EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend` in `.env`
2. Check that `USE_RESEND_IN_DEV=False` in `.env`
3. Restart the Django server
4. Check server logs for any errors

### Emails Not Sending in Production

**Problem:** Emails not being delivered in production

**Solutions:**

1. **Check API Key:**
```bash
# Test your API key
curl https://api.resend.com/emails \
  -H "Authorization: Bearer re_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"from": "onboarding@resend.dev", "to": "your-email@example.com", "subject": "Test", "html": "<p>Test email</p>"}'
```

2. **Check Domain Verification:**
- Log into Resend dashboard
- Go to **Domains**
- Make sure your domain shows "Verified" status
- Check DNS records are correct

3. **Check Server Logs:**
```bash
# Check Django logs
tail -f /var/log/dfc/django.log

# Look for EmailService errors
grep "EmailService" /var/log/dfc/django.log
```

4. **Check Resend Dashboard:**
- Go to **Logs** in Resend dashboard
- Check for failed deliveries
- Review error messages

### Template Rendering Errors

**Problem:** Email templates not rendering correctly

**Solution:**
1. Check template path: `templates/emails/password_reset.html`
2. Verify all template variables are provided
3. Test template rendering in Django shell (see Testing section)
4. Check for syntax errors in template

### Rate Limiting

**Problem:** Hitting Resend rate limits

**Solutions:**
1. **Free Tier:** 3,000 emails/month
   - Upgrade to paid plan if needed
2. **Hourly Limits:** Check Resend docs for current limits
3. **Implement Queue:** Use Celery to queue emails during peak times

---

## Pricing

### Free Tier
- **3,000 emails/month**
- Perfect for development and small deployments

### Paid Plans
- **$20/month:** 50,000 emails
- **$80/month:** 100,000 emails
- **Custom:** Contact Resend for higher volumes

---

## Best Practices

1. **Always Use Templates:** Use the EmailService class, don't send emails directly
2. **Test Before Deploying:** Test emails in development first
3. **Monitor Deliverability:** Check Resend dashboard regularly
4. **Handle Failures Gracefully:** EmailService returns boolean - check return value
5. **Log Everything:** All email sends are logged automatically
6. **Use Tags:** EmailService adds tags automatically for analytics
7. **Keep DNS Updated:** Verify DNS records after domain changes

---

## Support

### DFC Support
- Email: support@yourdomain.com
- Documentation: This file + Django docs

### Resend Support
- Dashboard: [https://resend.com/dashboard](https://resend.com/dashboard)
- Docs: [https://resend.com/docs](https://resend.com/docs)
- Support: [https://resend.com/support](https://resend.com/support)

---

## Additional Resources

- [Resend API Reference](https://resend.com/docs/api-reference/emails/send-email)
- [Resend Python SDK](https://github.com/resendlabs/resend-python)
- [Django Email Documentation](https://docs.djangoproject.com/en/5.1/topics/email/)
- [Email Best Practices](https://resend.com/docs/knowledge-base/email-best-practices)

---

**Last Updated:** 2025-11-22
**Version:** 1.0.0
