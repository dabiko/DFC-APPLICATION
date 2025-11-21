"""
Django management command to create default subscription plans
Usage: python manage.py create_default_plans
"""

from django.core.management.base import BaseCommand
from decimal import Decimal
from apps.billing.models import Plan


class Command(BaseCommand):
    help = 'Create default subscription plans (Trial, Basic, Professional, Enterprise)'

    def handle(self, *args, **options):
        self.stdout.write('Creating default subscription plans...')

        plans_data = [
            {
                'name': 'Trial',
                'tier': 'trial',
                'description': 'Try DFC for free with limited features',
                'monthly_price': Decimal('0.00'),
                'annual_price': Decimal('0.00'),
                'max_users': 2,
                'max_storage_gb': 5,
                'max_documents': 100,
                'max_folders': 20,
                'max_api_calls_per_month': 1000,
                'retention_policy_days': 30,
                'audit_log_days': 7,
                'versioning_per_document': 3,
                'trial_days': 14,
                'features': [
                    '2 users',
                    '5GB storage',
                    '100 documents',
                    '20 folders',
                    'Basic search',
                    '14-day trial',
                ],
                'highlighted': False,
                'popular': False,
            },
            {
                'name': 'Basic',
                'tier': 'basic',
                'description': 'Perfect for individuals and small teams',
                'monthly_price': Decimal('9.99'),
                'annual_price': Decimal('99.99'),
                'max_users': 5,
                'max_storage_gb': 50,
                'max_documents': 1000,
                'max_folders': 100,
                'max_api_calls_per_month': 10000,
                'retention_policy_days': 90,
                'audit_log_days': 30,
                'versioning_per_document': 5,
                'trial_days': 14,
                'features': [
                    '5 users',
                    '50GB storage',
                    '1,000 documents',
                    '100 folders',
                    'Advanced search',
                    'Basic classification',
                    'Email support',
                ],
                'highlighted': False,
                'popular': False,
            },
            {
                'name': 'Professional',
                'tier': 'professional',
                'description': 'For growing businesses with advanced needs',
                'monthly_price': Decimal('29.99'),
                'annual_price': Decimal('299.99'),
                'max_users': 20,
                'max_storage_gb': 500,
                'max_documents': 10000,
                'max_folders': 1000,
                'max_api_calls_per_month': 100000,
                'retention_policy_days': 365,
                'audit_log_days': 90,
                'versioning_per_document': 10,
                'trial_days': 14,
                'features': [
                    '20 users',
                    '500GB storage',
                    '10,000 documents',
                    '1,000 folders',
                    'Advanced search with filters',
                    'AI-powered classification',
                    'OCR for scanned documents',
                    'Advanced permissions (RBAC)',
                    'Retention policies',
                    'Priority email & chat support',
                ],
                'highlighted': True,
                'popular': True,
            },
            {
                'name': 'Enterprise',
                'tier': 'enterprise',
                'description': 'Custom solutions for large organizations',
                'monthly_price': Decimal('99.99'),
                'annual_price': Decimal('999.99'),
                'max_users': -1,  # Unlimited
                'max_storage_gb': 5000,
                'max_documents': 100000,
                'max_folders': 10000,
                'max_api_calls_per_month': 1000000,
                'retention_policy_days': 2555,  # 7 years
                'audit_log_days': 365,
                'versioning_per_document': 20,
                'trial_days': 30,
                'features': [
                    'Unlimited users',
                    '5TB storage',
                    '100,000 documents',
                    '10,000 folders',
                    'All Professional features',
                    'Legal hold',
                    'Advanced audit trails',
                    'Custom integrations',
                    'Dedicated account manager',
                    '24/7 phone & email support',
                    'SLA guarantee (99.9% uptime)',
                ],
                'highlighted': False,
                'popular': False,
            },
        ]

        created_count = 0
        updated_count = 0

        for plan_data in plans_data:
            plan, created = Plan.objects.update_or_create(
                tier=plan_data['tier'],
                defaults=plan_data
            )

            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Created plan: {plan.name}')
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'→ Updated plan: {plan.name}')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nCompleted! Created: {created_count}, Updated: {updated_count}'
            )
        )
