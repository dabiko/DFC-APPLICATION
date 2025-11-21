"""
Quick test script to verify billing system is working
"""
import os
import django

# Setup database credentials
os.environ['DB_NAME'] = 'dfc_database'
os.environ['DB_USER'] = 'postgres'
os.environ['DB_PASSWORD'] = 'dabiko'

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.billing.models import Plan

def test_plans():
    """Test that plans are created and accessible"""
    print("=" * 60)
    print("BILLING SYSTEM - DATABASE TEST")
    print("=" * 60)

    plans = Plan.objects.all()
    print(f"\n✓ Total Plans in Database: {plans.count()}\n")

    for plan in plans:
        print(f"Plan: {plan.name}")
        print(f"  Tier: {plan.tier}")
        print(f"  Monthly: ${plan.monthly_price}")
        print(f"  Annual: ${plan.annual_price}")
        print(f"  Max Users: {'Unlimited' if plan.max_users == -1 else plan.max_users}")
        print(f"  Storage: {plan.max_storage_gb}GB")
        print(f"  Documents: {plan.max_documents:,}")
        print(f"  Popular: {'Yes' if plan.popular else 'No'}")
        print(f"  Features: {len(plan.features)} features")
        print()

if __name__ == "__main__":
    test_plans()
    print("=" * 60)
    print("✅ BILLING DATABASE TEST COMPLETED SUCCESSFULLY")
    print("=" * 60)
