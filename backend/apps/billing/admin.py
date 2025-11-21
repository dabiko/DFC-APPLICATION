"""
Billing Admin Interface
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import (
    Plan,
    Subscription,
    PaymentMethod,
    Invoice,
    InvoiceLineItem,
    Coupon,
    UsageRecord
)


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = [
        'name',
        'tier',
        'monthly_price_display',
        'annual_price_display',
        'max_users',
        'max_storage_gb',
        'highlighted',
        'popular',
        'active',
    ]
    list_filter = ['tier', 'active', 'highlighted', 'popular']
    search_fields = ['name', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'name', 'tier', 'description')
        }),
        ('Pricing', {
            'fields': ('monthly_price', 'annual_price', 'currency')
        }),
        ('Limits', {
            'fields': (
                'max_users',
                'max_storage_gb',
                'max_documents',
                'max_folders',
                'max_api_calls_per_month',
                'retention_policy_days',
                'audit_log_days',
                'versioning_per_document',
            )
        }),
        ('Features', {
            'fields': ('features', 'trial_days')
        }),
        ('Display', {
            'fields': ('highlighted', 'popular', 'active')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def monthly_price_display(self, obj):
        return f"${obj.monthly_price}"
    monthly_price_display.short_description = 'Monthly Price'

    def annual_price_display(self, obj):
        return f"${obj.annual_price}"
    annual_price_display.short_description = 'Annual Price'


class InvoiceLineItemInline(admin.TabularInline):
    model = InvoiceLineItem
    extra = 0
    readonly_fields = ['amount']
    fields = ['description', 'quantity', 'unit_price', 'amount', 'period_start', 'period_end']


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = [
        'organization',
        'plan',
        'status_badge',
        'billing_cycle',
        'current_period_end',
        'auto_renew',
        'cancel_at_period_end',
    ]
    list_filter = ['status', 'billing_cycle', 'auto_renew', 'cancel_at_period_end']
    search_fields = ['organization__name', 'plan__name']
    readonly_fields = ['id', 'created_at', 'updated_at', 'trial_days_remaining_display']
    date_hierarchy = 'created_at'
    fieldsets = (
        ('Subscription Info', {
            'fields': ('id', 'organization', 'plan', 'status', 'billing_cycle')
        }),
        ('Billing Period', {
            'fields': ('current_period_start', 'current_period_end')
        }),
        ('Trial', {
            'fields': ('trial_start', 'trial_end', 'trial_extended', 'trial_days_remaining_display'),
            'classes': ('collapse',)
        }),
        ('Cancellation', {
            'fields': (
                'cancel_at_period_end',
                'cancelled_at',
                'cancellation_reason',
                'cancellation_feedback'
            ),
            'classes': ('collapse',)
        }),
        ('Settings', {
            'fields': ('auto_renew',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def status_badge(self, obj):
        colors = {
            'active': 'green',
            'trial': 'blue',
            'cancelled': 'gray',
            'expired': 'red',
            'past_due': 'orange',
            'suspended': 'red',
            'pending': 'yellow',
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'

    def trial_days_remaining_display(self, obj):
        if obj.status == 'trial':
            return f"{obj.trial_days_remaining} days"
        return "N/A"
    trial_days_remaining_display.short_description = 'Trial Days Remaining'


@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = [
        'organization',
        'type',
        'payment_info_display',
        'is_default',
        'created_at',
    ]
    list_filter = ['type', 'is_default', 'card_brand']
    search_fields = ['organization__name', 'card_last4', 'bank_account_last4']
    readonly_fields = ['id', 'created_at', 'updated_at']
    fieldsets = (
        ('Basic Info', {
            'fields': ('id', 'organization', 'type', 'is_default')
        }),
        ('Card Details', {
            'fields': (
                'card_brand',
                'card_last4',
                'card_exp_month',
                'card_exp_year',
                'card_holder_name'
            ),
            'classes': ('collapse',)
        }),
        ('Bank Details', {
            'fields': (
                'bank_name',
                'bank_account_type',
                'bank_account_last4',
                'bank_holder_name'
            ),
            'classes': ('collapse',)
        }),
        ('PayPal', {
            'fields': ('paypal_email',),
            'classes': ('collapse',)
        }),
        ('Gateway', {
            'fields': ('gateway_payment_method_id', 'gateway_customer_id'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def payment_info_display(self, obj):
        if obj.type == 'card':
            return f"{obj.card_brand} ****{obj.card_last4}"
        elif obj.type == 'bank_account':
            return f"{obj.bank_name} ****{obj.bank_account_last4}"
        return obj.paypal_email
    payment_info_display.short_description = 'Payment Info'


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = [
        'invoice_number',
        'organization',
        'status_badge',
        'total_display',
        'due_date',
        'paid_at',
    ]
    list_filter = ['status', 'created_at']
    search_fields = ['invoice_number', 'organization__name']
    readonly_fields = ['id', 'invoice_number', 'created_at', 'updated_at']
    date_hierarchy = 'created_at'
    inlines = [InvoiceLineItemInline]
    fieldsets = (
        ('Invoice Info', {
            'fields': ('id', 'invoice_number', 'subscription', 'organization', 'payment_method')
        }),
        ('Status', {
            'fields': ('status',)
        }),
        ('Amounts', {
            'fields': ('subtotal', 'tax', 'discount', 'total', 'currency')
        }),
        ('Dates', {
            'fields': ('issue_date', 'due_date', 'paid_at')
        }),
        ('PDF', {
            'fields': ('pdf_url',),
            'classes': ('collapse',)
        }),
        ('Gateway', {
            'fields': ('gateway_payment_intent_id', 'gateway_charge_id'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def status_badge(self, obj):
        colors = {
            'paid': 'green',
            'pending': 'orange',
            'failed': 'red',
            'refunded': 'gray',
            'draft': 'blue',
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'

    def total_display(self, obj):
        return f"${obj.total}"
    total_display.short_description = 'Total'


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = [
        'code',
        'name',
        'discount_display',
        'redemptions_display',
        'valid_from',
        'valid_to',
        'active',
    ]
    list_filter = ['discount_type', 'active', 'valid_from']
    search_fields = ['code', 'name']
    readonly_fields = ['id', 'redemptions_count', 'created_at', 'updated_at']
    filter_horizontal = ['applicable_plans']
    fieldsets = (
        ('Basic Info', {
            'fields': ('id', 'code', 'name', 'description')
        }),
        ('Discount', {
            'fields': ('discount_type', 'discount_value', 'currency')
        }),
        ('Limits', {
            'fields': ('max_redemptions', 'redemptions_count')
        }),
        ('Validity', {
            'fields': ('valid_from', 'valid_to')
        }),
        ('Restrictions', {
            'fields': ('applicable_plans',)
        }),
        ('Status', {
            'fields': ('active',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def discount_display(self, obj):
        if obj.discount_type == 'percentage':
            return f"{obj.discount_value}%"
        return f"${obj.discount_value}"
    discount_display.short_description = 'Discount'

    def redemptions_display(self, obj):
        if obj.max_redemptions:
            return f"{obj.redemptions_count} / {obj.max_redemptions}"
        return f"{obj.redemptions_count} / ∞"
    redemptions_display.short_description = 'Redemptions'


@admin.register(UsageRecord)
class UsageRecordAdmin(admin.ModelAdmin):
    list_display = ['organization', 'metric_type', 'value', 'recorded_at']
    list_filter = ['metric_type', 'recorded_at']
    search_fields = ['organization__name']
    readonly_fields = ['id', 'recorded_at']
    date_hierarchy = 'recorded_at'
