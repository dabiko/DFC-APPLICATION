"""
Billing API Views
RESTful API endpoints for billing operations
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.shortcuts import get_object_or_404
from datetime import timedelta

from .models import (
    Plan,
    Subscription,
    PaymentMethod,
    Invoice,
    Coupon,
    UsageRecord
)
from .serializers import (
    PlanSerializer,
    SubscriptionSerializer,
    PaymentMethodSerializer,
    InvoiceSerializer,
    CouponSerializer,
    ProrationCalculationSerializer,
    TrialStatusSerializer,
    SubscriptionCreateSerializer,
    PlanChangeSerializer,
    CancellationSerializer,
    PaymentMethodCreateSerializer,
    UsageRecordSerializer,
)
from .utils import (
    calculate_proration,
    calculate_trial_days_remaining,
    is_trial_expiring_soon,
    get_trial_urgency,
    check_usage_limits,
)


class PlanViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for subscription plans

    list: Get all available plans
    retrieve: Get specific plan details
    """
    queryset = Plan.objects.filter(active=True)
    serializer_class = PlanSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter plans based on query parameters"""
        queryset = super().get_queryset()

        # Filter by tier
        tier = self.request.query_params.get('tier', None)
        if tier:
            queryset = queryset.filter(tier=tier)

        return queryset.order_by('monthly_price')


class SubscriptionViewSet(viewsets.ModelViewSet):
    """
    API endpoint for subscriptions

    list: Get current subscription
    create: Create new subscription
    update: Update subscription settings
    """
    serializer_class = SubscriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Get subscription for current user's organization"""
        user = self.request.user
        return Subscription.objects.filter(organization=user.organization)

    def list(self, request):
        """Get current subscription"""
        try:
            subscription = Subscription.objects.get(organization=request.user.organization)
            serializer = self.get_serializer(subscription)
            return Response(serializer.data)
        except Subscription.DoesNotExist:
            return Response(
                {'error': 'No active subscription found'},
                status=status.HTTP_404_NOT_FOUND
            )

    def create(self, request):
        """Create new subscription"""
        serializer = SubscriptionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        organization = request.user.organization
        plan = get_object_or_404(Plan, id=serializer.validated_data['plan_id'])

        # Check if organization already has subscription
        if hasattr(organization, 'subscription'):
            return Response(
                {'error': 'Organization already has an active subscription'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create subscription
        billing_cycle = serializer.validated_data['billing_cycle']
        trial_days = serializer.validated_data.get('trial_days', plan.trial_days or 0)

        # Set billing period
        current_period_start = timezone.now()
        if trial_days > 0:
            current_period_end = current_period_start + timedelta(days=trial_days)
            subscription_status = 'trial'
            trial_start = current_period_start
            trial_end = current_period_end
        else:
            days = 30 if billing_cycle == 'monthly' else 365
            current_period_end = current_period_start + timedelta(days=days)
            subscription_status = 'active'
            trial_start = None
            trial_end = None

        subscription = Subscription.objects.create(
            organization=organization,
            plan=plan,
            status=subscription_status,
            billing_cycle=billing_cycle,
            current_period_start=current_period_start,
            current_period_end=current_period_end,
            trial_start=trial_start,
            trial_end=trial_end,
        )

        # TODO: Process payment if not trial
        # TODO: Create first invoice

        serializer = SubscriptionSerializer(subscription)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='upgrade')
    def upgrade(self, request):
        """Upgrade to a higher plan"""
        serializer = PlanChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        subscription = get_object_or_404(
            Subscription,
            organization=request.user.organization
        )
        new_plan = get_object_or_404(Plan, id=serializer.validated_data['new_plan_id'])
        new_billing_cycle = serializer.validated_data['billing_cycle']

        # Calculate proration
        proration = calculate_proration(subscription, new_plan, new_billing_cycle)

        # Update subscription
        subscription.plan = new_plan
        subscription.billing_cycle = new_billing_cycle
        subscription.save()

        # TODO: Process payment for proration amount
        # TODO: Create invoice for upgrade

        return Response({
            'subscription': SubscriptionSerializer(subscription).data,
            'proration': proration,
        })

    @action(detail=False, methods=['post'], url_path='downgrade')
    def downgrade(self, request):
        """Downgrade to a lower plan"""
        return self.upgrade(request)  # Same logic as upgrade

    @action(detail=False, methods=['post'], url_path='cancel')
    def cancel(self, request):
        """Cancel subscription"""
        serializer = CancellationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        subscription = get_object_or_404(
            Subscription,
            organization=request.user.organization
        )

        subscription.cancel(
            at_period_end=serializer.validated_data['cancel_at_period_end'],
            reason=serializer.validated_data.get('reason'),
            feedback=serializer.validated_data.get('feedback'),
        )

        return Response(SubscriptionSerializer(subscription).data)

    @action(detail=False, methods=['post'], url_path='reactivate')
    def reactivate(self, request):
        """Reactivate cancelled subscription"""
        subscription = get_object_or_404(
            Subscription,
            organization=request.user.organization
        )

        if subscription.reactivate():
            return Response(SubscriptionSerializer(subscription).data)
        else:
            return Response(
                {'error': 'Cannot reactivate subscription'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'], url_path='proration-preview')
    def proration_preview(self, request):
        """Calculate proration for plan change (preview only)"""
        serializer = PlanChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        subscription = get_object_or_404(
            Subscription,
            organization=request.user.organization
        )
        new_plan = get_object_or_404(Plan, id=serializer.validated_data['new_plan_id'])
        new_billing_cycle = serializer.validated_data['billing_cycle']

        # Calculate proration
        proration = calculate_proration(subscription, new_plan, new_billing_cycle)

        serializer = ProrationCalculationSerializer(proration)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='trial-status')
    def trial_status(self, request):
        """Get trial status"""
        subscription = get_object_or_404(
            Subscription,
            organization=request.user.organization
        )

        if subscription.status != 'trial':
            return Response(
                {'error': 'Subscription is not in trial period'},
                status=status.HTTP_400_BAD_REQUEST
            )

        trial_data = {
            'is_active': True,
            'days_remaining': subscription.trial_days_remaining,
            'end_date': subscription.trial_end,
            'plan_id': subscription.plan.id,
            'can_extend': not subscription.trial_extended,
        }

        serializer = TrialStatusSerializer(trial_data)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='extend-trial')
    def extend_trial(self, request):
        """Extend trial period"""
        subscription = get_object_or_404(
            Subscription,
            organization=request.user.organization
        )

        days = request.data.get('additional_days', 7)

        if subscription.extend_trial(days=days):
            return Response({
                'message': f'Trial extended by {days} days',
                'new_trial_end': subscription.trial_end,
                'subscription': SubscriptionSerializer(subscription).data,
            })
        else:
            return Response(
                {'error': 'Cannot extend trial'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'], url_path='convert-trial')
    def convert_trial(self, request):
        """Convert trial to paid subscription"""
        subscription = get_object_or_404(
            Subscription,
            organization=request.user.organization
        )

        if subscription.status != 'trial':
            return Response(
                {'error': 'Subscription is not in trial period'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Convert to active subscription
        subscription.status = 'active'

        # Update billing period
        billing_cycle = subscription.billing_cycle
        days = 30 if billing_cycle == 'monthly' else 365
        subscription.current_period_start = timezone.now()
        subscription.current_period_end = subscription.current_period_start + timedelta(days=days)

        subscription.save()

        # TODO: Process first payment
        # TODO: Create invoice

        return Response(SubscriptionSerializer(subscription).data)

    @action(detail=False, methods=['patch'], url_path='auto-renew')
    def update_auto_renew(self, request):
        """Update auto-renewal setting"""
        subscription = get_object_or_404(
            Subscription,
            organization=request.user.organization
        )

        auto_renew = request.data.get('auto_renew')
        if auto_renew is not None:
            subscription.auto_renew = auto_renew
            subscription.save()

        return Response(SubscriptionSerializer(subscription).data)


class PaymentMethodViewSet(viewsets.ModelViewSet):
    """
    API endpoint for payment methods

    list: Get all payment methods
    create: Add new payment method
    destroy: Remove payment method
    """
    serializer_class = PaymentMethodSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Get payment methods for current user's organization"""
        return PaymentMethod.objects.filter(
            organization=self.request.user.organization
        ).order_by('-is_default', '-created_at')

    def create(self, request):
        """Add new payment method"""
        serializer = PaymentMethodCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        organization = request.user.organization

        # TODO: Validate payment method with payment gateway (Stripe)

        # Create payment method
        payment_method = PaymentMethod.objects.create(
            organization=organization,
            type=serializer.validated_data['type'],
            is_default=serializer.validated_data.get('is_default', False),
            gateway_payment_method_id=serializer.validated_data['gateway_payment_method_id'],
            gateway_customer_id=serializer.validated_data['gateway_customer_id'],
            # Card details
            card_brand=serializer.validated_data.get('card_brand'),
            card_last4=serializer.validated_data.get('card_last4'),
            card_exp_month=serializer.validated_data.get('card_exp_month'),
            card_exp_year=serializer.validated_data.get('card_exp_year'),
            card_holder_name=serializer.validated_data.get('card_holder_name'),
            # Bank details
            bank_name=serializer.validated_data.get('bank_name'),
            bank_account_type=serializer.validated_data.get('bank_account_type'),
            bank_account_last4=serializer.validated_data.get('bank_account_last4'),
            bank_holder_name=serializer.validated_data.get('bank_holder_name'),
            # PayPal
            paypal_email=serializer.validated_data.get('paypal_email'),
        )

        response_serializer = PaymentMethodSerializer(payment_method)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='set-default')
    def set_default(self, request, pk=None):
        """Set payment method as default"""
        payment_method = self.get_object()
        payment_method.is_default = True
        payment_method.save()

        return Response(PaymentMethodSerializer(payment_method).data)


class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for invoices

    list: Get all invoices with pagination and filters
    retrieve: Get specific invoice
    """
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Get invoices for current user's organization with filters"""
        queryset = Invoice.objects.filter(
            organization=self.request.user.organization
        )

        # Filter by status
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by date range
        date_from = self.request.query_params.get('date_from', None)
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)

        date_to = self.request.query_params.get('date_to', None)
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)

        # Filter by amount range
        min_amount = self.request.query_params.get('min_amount', None)
        if min_amount:
            queryset = queryset.filter(total__gte=min_amount)

        max_amount = self.request.query_params.get('max_amount', None)
        if max_amount:
            queryset = queryset.filter(total__lte=max_amount)

        return queryset.order_by('-created_at')

    @action(detail=True, methods=['get'], url_path='download')
    def download(self, request, pk=None):
        """Download invoice PDF"""
        invoice = self.get_object()

        if invoice.pdf_url:
            return Response({'url': invoice.pdf_url})
        else:
            # TODO: Generate PDF if not exists
            return Response(
                {'error': 'PDF not available'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'], url_path='retry-payment')
    def retry_payment(self, request, pk=None):
        """Retry failed payment"""
        invoice = self.get_object()

        if invoice.status != 'failed':
            return Response(
                {'error': 'Invoice is not in failed state'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # TODO: Process payment
        # TODO: Update invoice status

        return Response(InvoiceSerializer(invoice).data)


class UsageViewSet(viewsets.ViewSet):
    """
    API endpoint for usage metrics and alerts
    """
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """Get current usage metrics"""
        organization = request.user.organization

        try:
            subscription = organization.subscription
        except Subscription.DoesNotExist:
            return Response(
                {'error': 'No active subscription found'},
                status=status.HTTP_404_NOT_FOUND
            )

        plan = subscription.plan

        # Get latest usage records
        latest_usage = {}
        for metric_type in ['users', 'storage', 'documents', 'folders', 'api_calls']:
            record = UsageRecord.objects.filter(
                organization=organization,
                metric_type=metric_type
            ).order_by('-recorded_at').first()
            latest_usage[metric_type] = float(record.value) if record else 0

        # Calculate percentages
        def calc_percentage(current, limit):
            if limit <= 0 or limit == -1:  # -1 means unlimited
                return 0
            return min(100, round((current / limit) * 100, 1))

        # Build response matching frontend UsageMetrics type
        usage_data = {
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

        return Response(usage_data)

    @action(detail=False, methods=['get'], url_path='alerts')
    def alerts(self, request):
        """Get usage alerts"""
        organization = request.user.organization

        try:
            subscription = organization.subscription
        except Subscription.DoesNotExist:
            return Response([])  # Return empty array if no subscription

        plan = subscription.plan

        # Get latest usage records
        latest_usage = {}
        for metric_type in ['users', 'storage', 'documents', 'folders', 'api_calls']:
            record = UsageRecord.objects.filter(
                organization=organization,
                metric_type=metric_type
            ).order_by('-recorded_at').first()
            latest_usage[metric_type] = float(record.value) if record else 0

        # Calculate percentages and generate alerts
        alerts = []

        # Check storage
        if plan.max_storage_gb > 0:
            storage_pct = (latest_usage.get('storage', 0) / plan.max_storage_gb) * 100
            if storage_pct >= 95:
                alerts.append({
                    'id': 'exceeded_storage',
                    'type': 'storage',
                    'severity': 'critical',
                    'message': 'Storage limit almost reached',
                    'currentValue': latest_usage.get('storage', 0),
                    'limitValue': plan.max_storage_gb,
                    'percentage': min(100, round(storage_pct, 1)),
                    'dismissed': False,
                })
            elif storage_pct >= 80:
                alerts.append({
                    'id': 'warning_storage',
                    'type': 'storage',
                    'severity': 'warning',
                    'message': f'Storage usage at {round(storage_pct)}%',
                    'currentValue': latest_usage.get('storage', 0),
                    'limitValue': plan.max_storage_gb,
                    'percentage': round(storage_pct, 1),
                    'dismissed': False,
                })

        # Check documents
        if plan.max_documents > 0:
            docs_pct = (latest_usage.get('documents', 0) / plan.max_documents) * 100
            if docs_pct >= 95:
                alerts.append({
                    'id': 'exceeded_documents',
                    'type': 'documents',
                    'severity': 'critical',
                    'message': 'Document limit almost reached',
                    'currentValue': int(latest_usage.get('documents', 0)),
                    'limitValue': plan.max_documents,
                    'percentage': min(100, round(docs_pct, 1)),
                    'dismissed': False,
                })
            elif docs_pct >= 80:
                alerts.append({
                    'id': 'warning_documents',
                    'type': 'documents',
                    'severity': 'warning',
                    'message': f'Document usage at {round(docs_pct)}%',
                    'currentValue': int(latest_usage.get('documents', 0)),
                    'limitValue': plan.max_documents,
                    'percentage': round(docs_pct, 1),
                    'dismissed': False,
                })

        return Response(alerts)


class CouponViewSet(viewsets.ViewSet):
    """
    API endpoint for coupons
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='validate')
    def validate_coupon(self, request):
        """Validate coupon code"""
        code = request.data.get('code')

        if not code:
            return Response(
                {'error': 'Coupon code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            coupon = Coupon.objects.get(code=code)
        except Coupon.DoesNotExist:
            return Response(
                {'error': 'Invalid coupon code'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not coupon.is_valid():
            return Response(
                {'error': 'Coupon is expired or no longer valid'},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(CouponSerializer(coupon).data)

    @action(detail=False, methods=['post'], url_path='apply')
    def apply_coupon(self, request):
        """Apply coupon to subscription"""
        code = request.data.get('code')

        if not code:
            return Response(
                {'error': 'Coupon code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            coupon = Coupon.objects.get(code=code)
        except Coupon.DoesNotExist:
            return Response(
                {'error': 'Invalid coupon code'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not coupon.is_valid():
            return Response(
                {'error': 'Coupon is expired or no longer valid'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # TODO: Apply coupon to subscription/invoice
        # TODO: Increment redemption count

        return Response({
            'message': 'Coupon applied successfully',
            'coupon': CouponSerializer(coupon).data,
        })
