"""
Billing Models
Database models for subscription plans, payments, invoices, and billing
"""

import uuid
from decimal import Decimal
from datetime import datetime, timedelta
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from apps.organizations.models import Organization

User = get_user_model()


class Plan(models.Model):
    """Subscription Plan"""

    TIER_CHOICES = [
        ('trial', 'Trial'),
        ('basic', 'Basic'),
        ('professional', 'Professional'),
        ('enterprise', 'Enterprise'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    tier = models.CharField(max_length=20, choices=TIER_CHOICES, unique=True)
    description = models.TextField()

    # Pricing
    monthly_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    annual_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    currency = models.CharField(max_length=3, default='USD')

    # Plan Limits
    max_users = models.IntegerField(default=-1)  # -1 = unlimited
    max_storage_gb = models.IntegerField(default=10)
    max_documents = models.IntegerField(default=1000)
    max_folders = models.IntegerField(default=100)
    max_api_calls_per_month = models.IntegerField(default=10000)
    retention_policy_days = models.IntegerField(default=30)
    audit_log_days = models.IntegerField(default=30)
    versioning_per_document = models.IntegerField(default=5)

    # Trial
    trial_days = models.IntegerField(default=14, null=True, blank=True)

    # Features (JSON field for flexibility)
    features = models.JSONField(default=list)

    # Display
    highlighted = models.BooleanField(default=False)
    popular = models.BooleanField(default=False)
    active = models.BooleanField(default=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'billing_plans'
        ordering = ['monthly_price']
        indexes = [
            models.Index(fields=['tier']),
            models.Index(fields=['active']),
        ]

    def __str__(self):
        return f"{self.name} (${self.monthly_price}/mo)"

    @property
    def is_unlimited_users(self):
        return self.max_users == -1


class Subscription(models.Model):
    """User/Organization Subscription"""

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('trial', 'Trial'),
        ('cancelled', 'Cancelled'),
        ('expired', 'Expired'),
        ('past_due', 'Past Due'),
        ('suspended', 'Suspended'),
        ('pending', 'Pending'),
    ]

    BILLING_CYCLE_CHOICES = [
        ('monthly', 'Monthly'),
        ('annual', 'Annual'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Relationships
    organization = models.OneToOneField(
        Organization,
        on_delete=models.CASCADE,
        related_name='subscription'
    )
    plan = models.ForeignKey(
        Plan,
        on_delete=models.PROTECT,
        related_name='subscriptions'
    )

    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='trial')
    billing_cycle = models.CharField(max_length=20, choices=BILLING_CYCLE_CHOICES, default='monthly')

    # Billing Period
    current_period_start = models.DateTimeField()
    current_period_end = models.DateTimeField()

    # Cancellation
    cancel_at_period_end = models.BooleanField(default=False)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(null=True, blank=True)
    cancellation_feedback = models.TextField(null=True, blank=True)

    # Trial
    trial_start = models.DateTimeField(null=True, blank=True)
    trial_end = models.DateTimeField(null=True, blank=True)
    trial_extended = models.BooleanField(default=False)

    # Auto-renewal
    auto_renew = models.BooleanField(default=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'billing_subscriptions'
        indexes = [
            models.Index(fields=['organization']),
            models.Index(fields=['status']),
            models.Index(fields=['current_period_end']),
        ]

    def __str__(self):
        return f"{self.organization.name} - {self.plan.name}"

    @property
    def is_active(self):
        return self.status in ['active', 'trial']

    @property
    def is_trial(self):
        return self.status == 'trial'

    @property
    def days_until_renewal(self):
        if not self.current_period_end:
            return None
        delta = self.current_period_end - timezone.now()
        return max(0, delta.days)

    @property
    def trial_days_remaining(self):
        if not self.trial_end or self.status != 'trial':
            return 0
        delta = self.trial_end - timezone.now()
        return max(0, delta.days)

    @property
    def is_trial_expired(self):
        if not self.trial_end or self.status != 'trial':
            return False
        return timezone.now() > self.trial_end

    def extend_trial(self, days=7):
        """Extend trial period by specified days"""
        if self.status != 'trial' or self.trial_extended:
            return False

        if self.trial_end:
            self.trial_end = self.trial_end + timedelta(days=days)
        else:
            self.trial_end = timezone.now() + timedelta(days=days)

        self.trial_extended = True
        self.save()
        return True

    def cancel(self, at_period_end=True, reason=None, feedback=None):
        """Cancel subscription"""
        self.cancel_at_period_end = at_period_end
        self.cancelled_at = timezone.now()
        self.cancellation_reason = reason
        self.cancellation_feedback = feedback

        if not at_period_end:
            self.status = 'cancelled'

        self.save()

    def reactivate(self):
        """Reactivate cancelled subscription"""
        if self.status == 'cancelled':
            self.status = 'active'
            self.cancel_at_period_end = False
            self.cancelled_at = None
            self.save()
            return True
        return False


class PaymentMethod(models.Model):
    """Payment Method (Credit Card, Bank Account, etc.)"""

    TYPE_CHOICES = [
        ('card', 'Credit/Debit Card'),
        ('bank_account', 'Bank Account'),
        ('paypal', 'PayPal'),
    ]

    CARD_BRAND_CHOICES = [
        ('visa', 'Visa'),
        ('mastercard', 'Mastercard'),
        ('amex', 'American Express'),
        ('discover', 'Discover'),
        ('diners', 'Diners Club'),
        ('jcb', 'JCB'),
        ('unknown', 'Unknown'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='payment_methods'
    )

    # Type
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='card')
    is_default = models.BooleanField(default=False)

    # Card Details (tokenized - never store raw card numbers)
    card_brand = models.CharField(max_length=20, choices=CARD_BRAND_CHOICES, null=True, blank=True)
    card_last4 = models.CharField(max_length=4, null=True, blank=True)
    card_exp_month = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(12)]
    )
    card_exp_year = models.IntegerField(null=True, blank=True)
    card_holder_name = models.CharField(max_length=255, null=True, blank=True)

    # Bank Account Details
    bank_name = models.CharField(max_length=255, null=True, blank=True)
    bank_account_type = models.CharField(max_length=50, null=True, blank=True)
    bank_account_last4 = models.CharField(max_length=4, null=True, blank=True)
    bank_holder_name = models.CharField(max_length=255, null=True, blank=True)

    # PayPal
    paypal_email = models.EmailField(null=True, blank=True)

    # Payment Gateway Token (Stripe, etc.)
    gateway_payment_method_id = models.CharField(max_length=255, unique=True)
    gateway_customer_id = models.CharField(max_length=255)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'billing_payment_methods'
        indexes = [
            models.Index(fields=['organization']),
            models.Index(fields=['is_default']),
        ]

    def __str__(self):
        if self.type == 'card':
            return f"{self.card_brand} ending in {self.card_last4}"
        elif self.type == 'bank_account':
            return f"{self.bank_name} ending in {self.bank_account_last4}"
        return f"{self.get_type_display()}"

    def save(self, *args, **kwargs):
        # Ensure only one default payment method per organization
        if self.is_default:
            PaymentMethod.objects.filter(
                organization=self.organization,
                is_default=True
            ).exclude(id=self.id).update(is_default=False)
        super().save(*args, **kwargs)


class Invoice(models.Model):
    """Invoice for subscription billing"""

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_number = models.CharField(max_length=50, unique=True)

    # Relationships
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name='invoices'
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='invoices'
    )
    payment_method = models.ForeignKey(
        PaymentMethod,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoices'
    )

    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Amounts
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    tax = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')

    # Dates
    issue_date = models.DateTimeField(auto_now_add=True)
    due_date = models.DateTimeField()
    paid_at = models.DateTimeField(null=True, blank=True)

    # PDF
    pdf_url = models.URLField(max_length=500, null=True, blank=True)

    # Payment Gateway
    gateway_payment_intent_id = models.CharField(max_length=255, null=True, blank=True)
    gateway_charge_id = models.CharField(max_length=255, null=True, blank=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'billing_invoices'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization']),
            models.Index(fields=['subscription']),
            models.Index(fields=['status']),
            models.Index(fields=['invoice_number']),
        ]

    def __str__(self):
        return f"{self.invoice_number} - {self.organization.name}"

    def save(self, *args, **kwargs):
        # Generate invoice number if not set
        if not self.invoice_number:
            self.invoice_number = self._generate_invoice_number()
        super().save(*args, **kwargs)

    def _generate_invoice_number(self):
        """Generate unique invoice number"""
        date_str = timezone.now().strftime('%Y%m')
        count = Invoice.objects.filter(invoice_number__startswith=f'INV-{date_str}').count() + 1
        return f'INV-{date_str}-{count:04d}'

    def mark_paid(self):
        """Mark invoice as paid"""
        self.status = 'paid'
        self.paid_at = timezone.now()
        self.save()

    def mark_failed(self):
        """Mark invoice as failed"""
        self.status = 'failed'
        self.save()


class InvoiceLineItem(models.Model):
    """Line item in an invoice"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='line_items'
    )

    description = models.CharField(max_length=500)
    quantity = models.IntegerField(default=1, validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    amount = models.DecimalField(max_digits=10, decimal_places=2)

    # Period (for subscription items)
    period_start = models.DateTimeField(null=True, blank=True)
    period_end = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'billing_invoice_line_items'

    def __str__(self):
        return f"{self.description} - {self.amount}"

    def save(self, *args, **kwargs):
        # Calculate amount from quantity and unit price
        self.amount = Decimal(str(self.quantity)) * self.unit_price
        super().save(*args, **kwargs)


class Coupon(models.Model):
    """Discount coupon/promo code"""

    DISCOUNT_TYPE_CHOICES = [
        ('percentage', 'Percentage'),
        ('fixed', 'Fixed Amount'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(null=True, blank=True)

    # Discount
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPE_CHOICES)
    discount_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    currency = models.CharField(max_length=3, default='USD')

    # Redemption Limits
    max_redemptions = models.IntegerField(null=True, blank=True)
    redemptions_count = models.IntegerField(default=0)

    # Validity
    valid_from = models.DateTimeField()
    valid_to = models.DateTimeField(null=True, blank=True)

    # Plan Restrictions
    applicable_plans = models.ManyToManyField(Plan, blank=True)

    # Status
    active = models.BooleanField(default=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'billing_coupons'
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['active']),
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"

    def is_valid(self):
        """Check if coupon is currently valid"""
        now = timezone.now()

        if not self.active:
            return False

        if self.valid_from > now:
            return False

        if self.valid_to and self.valid_to < now:
            return False

        if self.max_redemptions and self.redemptions_count >= self.max_redemptions:
            return False

        return True

    def calculate_discount(self, amount):
        """Calculate discount amount"""
        if self.discount_type == 'percentage':
            return (amount * self.discount_value) / Decimal('100')
        else:
            return min(self.discount_value, amount)


class UsageRecord(models.Model):
    """Track organization usage for quota enforcement"""

    METRIC_TYPE_CHOICES = [
        ('users', 'Users'),
        ('storage', 'Storage (GB)'),
        ('documents', 'Documents'),
        ('folders', 'Folders'),
        ('api_calls', 'API Calls'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='usage_records'
    )

    metric_type = models.CharField(max_length=20, choices=METRIC_TYPE_CHOICES)
    value = models.DecimalField(max_digits=15, decimal_places=2)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'billing_usage_records'
        ordering = ['-recorded_at']
        indexes = [
            models.Index(fields=['organization', 'metric_type', 'recorded_at']),
        ]

    def __str__(self):
        return f"{self.organization.name} - {self.metric_type}: {self.value}"
