"""
Billing Serializers
DRF serializers for API endpoints
"""

from rest_framework import serializers
from decimal import Decimal
from .models import (
    Plan,
    Subscription,
    PaymentMethod,
    Invoice,
    InvoiceLineItem,
    Coupon,
    UsageRecord
)


class PlanSerializer(serializers.ModelSerializer):
    """Plan serializer"""

    price = serializers.SerializerMethodField()
    limits = serializers.SerializerMethodField()
    trial = serializers.SerializerMethodField()

    class Meta:
        model = Plan
        fields = [
            'id',
            'name',
            'tier',
            'description',
            'price',
            'features',
            'limits',
            'trial',
            'highlighted',
            'popular',
            'active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_price(self, obj):
        return {
            'monthly': float(obj.monthly_price),
            'annual': float(obj.annual_price),
            'currency': obj.currency,
            'custom': obj.tier == 'enterprise',
        }

    def get_limits(self, obj):
        return {
            'users': obj.max_users,
            'storageGB': obj.max_storage_gb,
            'documents': obj.max_documents,
            'folders': obj.max_folders,
            'apiCallsPerMonth': obj.max_api_calls_per_month,
            'retentionPolicyDays': obj.retention_policy_days,
            'auditLogDays': obj.audit_log_days,
            'versioningPerDocument': obj.versioning_per_document,
            'trialDays': obj.trial_days,
        }

    def get_trial(self, obj):
        return obj.tier == 'trial' or obj.trial_days is not None


class UsageMetricsSerializer(serializers.Serializer):
    """Usage metrics serializer"""

    users = serializers.DictField()
    storage = serializers.DictField()
    documents = serializers.DictField()
    folders = serializers.DictField()
    apiCalls = serializers.DictField()


class SubscriptionSerializer(serializers.ModelSerializer):
    """Subscription serializer"""

    plan = PlanSerializer(read_only=True)
    plan_id = serializers.UUIDField(write_only=True, required=False)
    usage = serializers.SerializerMethodField()
    organization_id = serializers.UUIDField(source='organization.id', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    is_trial = serializers.BooleanField(read_only=True)
    days_until_renewal = serializers.IntegerField(read_only=True)
    trial_days_remaining = serializers.IntegerField(read_only=True)

    class Meta:
        model = Subscription
        fields = [
            'id',
            'organization_id',
            'organization_name',
            'plan',
            'plan_id',
            'status',
            'billing_cycle',
            'current_period_start',
            'current_period_end',
            'cancel_at_period_end',
            'cancelled_at',
            'trial_start',
            'trial_end',
            'auto_renew',
            'usage',
            'is_active',
            'is_trial',
            'days_until_renewal',
            'trial_days_remaining',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'organization_id',
            'organization_name',
            'status',
            'current_period_start',
            'current_period_end',
            'cancelled_at',
            'trial_start',
            'trial_end',
            'created_at',
            'updated_at',
        ]

    def get_usage(self, obj):
        """Get current usage metrics from UsageRecord"""
        org = obj.organization
        plan = obj.plan

        # Get latest usage records
        latest_usage = {}
        for metric_type in ['users', 'storage', 'documents', 'folders', 'api_calls']:
            record = UsageRecord.objects.filter(
                organization=org,
                metric_type=metric_type
            ).order_by('-recorded_at').first()
            latest_usage[metric_type] = float(record.value) if record else 0

        # Calculate percentages
        def calc_percentage(current, limit):
            if limit <= 0 or limit == -1:  # -1 means unlimited
                return 0
            return min(100, round((current / limit) * 100, 1))

        return {
            'users': {
                'current': int(latest_usage.get('users', 0)),
                'limit': plan.max_users,
            },
            'storage': {
                'currentGB': latest_usage.get('storage', 0),
                'limitGB': plan.max_storage_gb,
                'percentage': calc_percentage(latest_usage.get('storage', 0), plan.max_storage_gb),
            },
            'documents': {
                'current': int(latest_usage.get('documents', 0)),
                'limit': plan.max_documents,
                'percentage': calc_percentage(latest_usage.get('documents', 0), plan.max_documents),
            },
            'folders': {
                'current': int(latest_usage.get('folders', 0)),
                'limit': plan.max_folders,
            },
            'apiCalls': {
                'currentMonth': int(latest_usage.get('api_calls', 0)),
                'limit': plan.max_api_calls_per_month,
                'percentage': calc_percentage(latest_usage.get('api_calls', 0), plan.max_api_calls_per_month),
            },
        }


class PaymentMethodSerializer(serializers.ModelSerializer):
    """Payment method serializer"""

    card = serializers.SerializerMethodField()
    bank_account = serializers.SerializerMethodField()
    paypal = serializers.SerializerMethodField()

    class Meta:
        model = PaymentMethod
        fields = [
            'id',
            'type',
            'is_default',
            'card',
            'bank_account',
            'paypal',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_card(self, obj):
        if obj.type == 'card':
            return {
                'brand': obj.card_brand,
                'last4': obj.card_last4,
                'expiryMonth': obj.card_exp_month,
                'expiryYear': obj.card_exp_year,
                'holderName': obj.card_holder_name,
            }
        return None

    def get_bank_account(self, obj):
        if obj.type == 'bank_account':
            return {
                'bankName': obj.bank_name,
                'accountType': obj.bank_account_type,
                'last4': obj.bank_account_last4,
                'holderName': obj.bank_holder_name,
            }
        return None

    def get_paypal(self, obj):
        if obj.type == 'paypal':
            return {
                'email': obj.paypal_email,
            }
        return None


class InvoiceLineItemSerializer(serializers.ModelSerializer):
    """Invoice line item serializer"""

    period = serializers.SerializerMethodField()

    class Meta:
        model = InvoiceLineItem
        fields = [
            'id',
            'description',
            'quantity',
            'amount',
            'period',
        ]

    def get_period(self, obj):
        if obj.period_start and obj.period_end:
            return {
                'start': obj.period_start.isoformat(),
                'end': obj.period_end.isoformat(),
            }
        return None


class InvoiceSerializer(serializers.ModelSerializer):
    """Invoice serializer"""

    items = InvoiceLineItemSerializer(source='line_items', many=True, read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    payment_method_id = serializers.UUIDField(source='payment_method.id', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id',
            'invoice_number',
            'organization_name',
            'subscription',
            'payment_method_id',
            'status',
            'subtotal',
            'tax',
            'discount',
            'total',
            'currency',
            'items',
            'issue_date',
            'due_date',
            'paid_at',
            'pdf_url',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'invoice_number',
            'organization_name',
            'items',
            'issue_date',
            'created_at',
        ]


class CouponSerializer(serializers.ModelSerializer):
    """Coupon serializer"""

    applicable_plan_ids = serializers.ListField(
        child=serializers.UUIDField(),
        source='applicable_plans',
        required=False
    )

    class Meta:
        model = Coupon
        fields = [
            'id',
            'code',
            'name',
            'description',
            'discount_type',
            'discount_value',
            'currency',
            'max_redemptions',
            'redemptions_count',
            'valid_from',
            'valid_to',
            'applicable_plan_ids',
            'active',
        ]
        read_only_fields = ['id', 'redemptions_count']


class ProrationCalculationSerializer(serializers.Serializer):
    """Proration calculation result serializer"""

    unused_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    new_plan_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    proration_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    effective_date = serializers.DateTimeField()
    next_billing_date = serializers.DateTimeField()
    description = serializers.CharField()


class TrialStatusSerializer(serializers.Serializer):
    """Trial status serializer"""

    is_active = serializers.BooleanField()
    days_remaining = serializers.IntegerField()
    end_date = serializers.DateTimeField()
    plan_id = serializers.UUIDField()
    can_extend = serializers.BooleanField()


class SubscriptionCreateSerializer(serializers.Serializer):
    """Subscription creation request serializer"""

    plan_id = serializers.UUIDField()
    billing_cycle = serializers.ChoiceField(choices=['monthly', 'annual'])
    payment_method_id = serializers.UUIDField(required=False)
    coupon_code = serializers.CharField(max_length=50, required=False)
    trial_days = serializers.IntegerField(min_value=0, max_value=90, required=False)


class PlanChangeSerializer(serializers.Serializer):
    """Plan change request serializer"""

    new_plan_id = serializers.UUIDField()
    billing_cycle = serializers.ChoiceField(choices=['monthly', 'annual'])
    effective_date = serializers.DateTimeField(required=False)


class CancellationSerializer(serializers.Serializer):
    """Subscription cancellation request serializer"""

    cancel_at_period_end = serializers.BooleanField(default=True)
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True)
    feedback = serializers.CharField(required=False, allow_blank=True)


class PaymentMethodCreateSerializer(serializers.Serializer):
    """Payment method creation serializer"""

    type = serializers.ChoiceField(choices=['card', 'bank_account', 'paypal'])
    gateway_payment_method_id = serializers.CharField(max_length=255)
    gateway_customer_id = serializers.CharField(max_length=255)
    is_default = serializers.BooleanField(default=False)

    # Card details (for display only, actual card data comes from gateway)
    card_brand = serializers.CharField(max_length=20, required=False)
    card_last4 = serializers.CharField(max_length=4, required=False)
    card_exp_month = serializers.IntegerField(min_value=1, max_value=12, required=False)
    card_exp_year = serializers.IntegerField(required=False)
    card_holder_name = serializers.CharField(max_length=255, required=False)

    # Bank details
    bank_name = serializers.CharField(max_length=255, required=False)
    bank_account_type = serializers.CharField(max_length=50, required=False)
    bank_account_last4 = serializers.CharField(max_length=4, required=False)
    bank_holder_name = serializers.CharField(max_length=255, required=False)

    # PayPal
    paypal_email = serializers.EmailField(required=False)


class UsageRecordSerializer(serializers.ModelSerializer):
    """Usage record serializer"""

    organization_name = serializers.CharField(source='organization.name', read_only=True)

    class Meta:
        model = UsageRecord
        fields = [
            'id',
            'organization_name',
            'metric_type',
            'value',
            'recorded_at',
        ]
        read_only_fields = ['id', 'organization_name', 'recorded_at']
