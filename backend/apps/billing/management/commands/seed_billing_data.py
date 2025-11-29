"""
Django management command to seed billing data for a user
Usage: python manage.py seed_billing_data <email>
       python manage.py seed_billing_data --all  (seeds for all users with organizations)
"""

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
import uuid

from apps.billing.models import (
    Plan, Subscription, PaymentMethod, Invoice, InvoiceLineItem, UsageRecord
)
from apps.organizations.models import Organization, OrganizationMember

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed billing data (subscription, payment methods, invoices) for a user'

    def add_arguments(self, parser):
        parser.add_argument(
            'email',
            nargs='?',
            type=str,
            help='Email of the user to seed billing data for'
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Seed billing data for all users with organizations'
        )
        parser.add_argument(
            '--plan',
            type=str,
            default='professional',
            choices=['trial', 'basic', 'professional', 'enterprise'],
            help='Plan tier to assign (default: professional)'
        )

    def handle(self, *args, **options):
        # First, ensure plans exist
        self.ensure_plans_exist()

        if options['all']:
            self.seed_all_users(options['plan'])
        elif options['email']:
            self.seed_user(options['email'], options['plan'])
        else:
            raise CommandError('Please provide an email or use --all flag')

    def ensure_plans_exist(self):
        """Ensure default plans exist in database"""
        from django.core.management import call_command

        if Plan.objects.count() == 0:
            self.stdout.write('No plans found. Creating default plans...')
            call_command('create_default_plans')
        else:
            self.stdout.write(f'Found {Plan.objects.count()} existing plans')

    def seed_all_users(self, plan_tier):
        """Seed billing data for all users with organizations"""
        members = OrganizationMember.objects.select_related('user', 'organization').all()

        if not members.exists():
            self.stdout.write(self.style.WARNING('No organization members found'))
            return

        orgs_processed = set()
        for member in members:
            if member.organization.id not in orgs_processed:
                self.seed_organization(member.organization, plan_tier)
                orgs_processed.add(member.organization.id)

        self.stdout.write(
            self.style.SUCCESS(f'\nSeeded billing data for {len(orgs_processed)} organizations')
        )

    def seed_user(self, email, plan_tier):
        """Seed billing data for a specific user"""
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise CommandError(f'User with email "{email}" not found')

        # Get user's organization membership
        membership = OrganizationMember.objects.filter(user=user).first()

        if not membership:
            raise CommandError(f'User "{email}" is not a member of any organization')

        self.seed_organization(membership.organization, plan_tier)
        self.stdout.write(
            self.style.SUCCESS(f'\nSeeded billing data for organization: {membership.organization.name}')
        )

    def seed_organization(self, organization, plan_tier):
        """Seed all billing data for an organization"""
        self.stdout.write(f'\n--- Seeding billing data for: {organization.name} ---')

        # 1. Get or create subscription
        subscription = self.create_subscription(organization, plan_tier)

        # 2. Create payment methods
        self.create_payment_methods(organization)

        # 3. Create invoices
        self.create_invoices(organization, subscription)

        # 4. Create usage records
        self.create_usage_records(organization)

    def create_subscription(self, organization, plan_tier):
        """Create or update subscription for organization"""
        try:
            plan = Plan.objects.get(tier=plan_tier)
        except Plan.DoesNotExist:
            raise CommandError(f'Plan with tier "{plan_tier}" not found. Run create_default_plans first.')

        now = timezone.now()
        period_start = now - timedelta(days=15)  # Started 15 days ago
        period_end = now + timedelta(days=15)    # Ends in 15 days

        subscription, created = Subscription.objects.update_or_create(
            organization=organization,
            defaults={
                'plan': plan,
                'status': 'active',
                'billing_cycle': 'monthly',
                'current_period_start': period_start,
                'current_period_end': period_end,
                'auto_renew': True,
                'cancel_at_period_end': False,
            }
        )

        action = 'Created' if created else 'Updated'
        self.stdout.write(self.style.SUCCESS(f'  ✓ {action} subscription: {plan.name}'))
        return subscription

    def create_payment_methods(self, organization):
        """Create sample payment methods for organization"""
        # Check if payment methods already exist
        if PaymentMethod.objects.filter(organization=organization).exists():
            self.stdout.write(self.style.WARNING('  → Payment methods already exist, skipping...'))
            return

        payment_methods_data = [
            {
                'type': 'card',
                'is_default': True,
                'card_brand': 'visa',
                'card_last4': '4242',
                'card_exp_month': 12,
                'card_exp_year': 2027,
                'card_holder_name': 'John Doe',
                'gateway_payment_method_id': f'pm_{uuid.uuid4().hex[:24]}',
                'gateway_customer_id': f'cus_{uuid.uuid4().hex[:14]}',
            },
            {
                'type': 'card',
                'is_default': False,
                'card_brand': 'mastercard',
                'card_last4': '5555',
                'card_exp_month': 6,
                'card_exp_year': 2026,
                'card_holder_name': 'John Doe',
                'gateway_payment_method_id': f'pm_{uuid.uuid4().hex[:24]}',
                'gateway_customer_id': f'cus_{uuid.uuid4().hex[:14]}',
            },
        ]

        for pm_data in payment_methods_data:
            PaymentMethod.objects.create(organization=organization, **pm_data)

        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {len(payment_methods_data)} payment methods'))

    def create_invoices(self, organization, subscription):
        """Create sample invoices for organization"""
        # Check if invoices already exist
        if Invoice.objects.filter(organization=organization).count() >= 3:
            self.stdout.write(self.style.WARNING('  → Invoices already exist, skipping...'))
            return

        now = timezone.now()
        payment_method = PaymentMethod.objects.filter(
            organization=organization,
            is_default=True
        ).first()

        invoices_data = [
            {
                'status': 'paid',
                'subtotal': subscription.plan.monthly_price,
                'total': subscription.plan.monthly_price,
                'issue_date': now - timedelta(days=60),
                'due_date': now - timedelta(days=45),
                'paid_at': now - timedelta(days=58),
                'description': f'{subscription.plan.name} - Monthly Subscription',
            },
            {
                'status': 'paid',
                'subtotal': subscription.plan.monthly_price,
                'total': subscription.plan.monthly_price,
                'issue_date': now - timedelta(days=30),
                'due_date': now - timedelta(days=15),
                'paid_at': now - timedelta(days=28),
                'description': f'{subscription.plan.name} - Monthly Subscription',
            },
            {
                'status': 'pending',
                'subtotal': subscription.plan.monthly_price,
                'total': subscription.plan.monthly_price,
                'issue_date': now,
                'due_date': now + timedelta(days=15),
                'paid_at': None,
                'description': f'{subscription.plan.name} - Monthly Subscription',
            },
        ]

        for inv_data in invoices_data:
            description = inv_data.pop('description')

            invoice = Invoice.objects.create(
                subscription=subscription,
                organization=organization,
                payment_method=payment_method,
                currency='USD',
                **inv_data
            )

            # Create line item
            InvoiceLineItem.objects.create(
                invoice=invoice,
                description=description,
                quantity=1,
                unit_price=inv_data['subtotal'],
                amount=inv_data['total'],
                period_start=invoice.issue_date,
                period_end=invoice.issue_date + timedelta(days=30),
            )

        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {len(invoices_data)} invoices with line items'))

    def create_usage_records(self, organization):
        """Create sample usage records for organization"""
        # Check if usage records already exist for this month
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        existing = UsageRecord.objects.filter(
            organization=organization,
            recorded_at__gte=month_start
        ).exists()

        if existing:
            self.stdout.write(self.style.WARNING('  → Usage records already exist for this month, skipping...'))
            return

        # Get subscription to calculate percentages
        try:
            subscription = Subscription.objects.get(organization=organization)
            plan = subscription.plan
        except Subscription.DoesNotExist:
            self.stdout.write(self.style.WARNING('  → No subscription found, skipping usage records'))
            return

        usage_data = [
            {
                'metric_type': 'users',
                'value': Decimal('3'),  # 3 users out of max
            },
            {
                'metric_type': 'storage',
                'value': Decimal(str(plan.max_storage_gb * 0.35)),  # 35% of storage used
            },
            {
                'metric_type': 'documents',
                'value': Decimal(str(int(plan.max_documents * 0.42))),  # 42% of documents used
            },
            {
                'metric_type': 'folders',
                'value': Decimal(str(int(plan.max_folders * 0.28))),  # 28% of folders used
            },
            {
                'metric_type': 'api_calls',
                'value': Decimal(str(int(plan.max_api_calls_per_month * 0.15))),  # 15% of API calls used
            },
        ]

        for usage in usage_data:
            UsageRecord.objects.create(organization=organization, **usage)

        self.stdout.write(self.style.SUCCESS(f'  ✓ Created {len(usage_data)} usage records'))
