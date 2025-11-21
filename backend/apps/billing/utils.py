"""
Billing Utility Functions
Business logic for proration, trial management, etc.
"""

from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from .models import Subscription, Plan


def calculate_days_remaining(current_period_end):
    """Calculate days remaining in current billing period"""
    if not current_period_end:
        return 0
    delta = current_period_end - timezone.now()
    return max(0, delta.days)


def calculate_total_period_days(current_period_start, current_period_end):
    """Calculate total days in current billing period"""
    if not current_period_start or not current_period_end:
        return 0
    delta = current_period_end - current_period_start
    return max(1, delta.days)


def calculate_unused_amount(current_plan, billing_cycle, current_period_start, current_period_end):
    """Calculate unused amount from current plan"""
    days_remaining = calculate_days_remaining(current_period_end)
    total_days = calculate_total_period_days(current_period_start, current_period_end)

    if total_days == 0:
        return Decimal('0.00')

    # Get plan price based on billing cycle
    plan_price = (
        current_plan.monthly_price
        if billing_cycle == 'monthly'
        else current_plan.annual_price
    )

    # Calculate daily rate
    daily_rate = plan_price / Decimal(str(total_days))

    # Calculate unused amount
    unused_amount = daily_rate * Decimal(str(days_remaining))

    return unused_amount.quantize(Decimal('0.01'))


def calculate_new_plan_charge(new_plan, billing_cycle, current_period_end):
    """Calculate prorated charge for new plan"""
    days_remaining = calculate_days_remaining(current_period_end)

    # Get plan price based on billing cycle
    plan_price = (
        new_plan.monthly_price
        if billing_cycle == 'monthly'
        else new_plan.annual_price
    )

    # Calculate daily rate (based on standard cycle length)
    days_in_cycle = 30 if billing_cycle == 'monthly' else 365
    daily_rate = plan_price / Decimal(str(days_in_cycle))

    # Calculate prorated charge
    prorated_charge = daily_rate * Decimal(str(days_remaining))

    return prorated_charge.quantize(Decimal('0.01'))


def get_next_billing_date(current_period_end, billing_cycle):
    """Calculate next billing date after plan change"""
    if not current_period_end:
        return None

    if billing_cycle == 'monthly':
        # Next billing is 1 month after current period end
        return current_period_end + timedelta(days=30)
    else:
        # Next billing is 1 year after current period end
        return current_period_end + timedelta(days=365)


def generate_proration_description(current_plan, new_plan, current_cycle, new_cycle, proration_amount):
    """Generate human-readable proration description"""
    # Determine if upgrade or downgrade
    current_price = (
        current_plan.monthly_price
        if current_cycle == 'monthly'
        else current_plan.annual_price
    )
    new_price = (
        new_plan.monthly_price
        if new_cycle == 'monthly'
        else new_plan.annual_price
    )

    is_upgrade = new_price > current_price
    change_type = 'Upgrading' if is_upgrade else 'Downgrading'

    # Check if cycle changed
    cycle_change = ''
    if current_cycle != new_cycle:
        cycle_change = f' and switching to {new_cycle} billing'

    # Generate description based on proration amount
    if proration_amount > 0:
        return (
            f"{change_type} from {current_plan.name} to {new_plan.name}{cycle_change}. "
            f"You'll be charged the prorated amount for the remainder of this billing period."
        )
    elif proration_amount < 0:
        return (
            f"{change_type} from {current_plan.name} to {new_plan.name}{cycle_change}. "
            f"You'll receive a credit for the unused time on your current plan."
        )
    else:
        return (
            f"Switching from {current_plan.name} to {new_plan.name}{cycle_change}. "
            f"No additional charge or credit will be applied."
        )


def calculate_proration(subscription, new_plan, new_billing_cycle):
    """
    Calculate complete proration for a plan change

    Returns dict with:
    - unused_amount: Credit from current plan
    - new_plan_amount: Charge for new plan
    - proration_amount: Net amount (positive = charge, negative = credit)
    - effective_date: When change takes effect
    - next_billing_date: Next billing date
    - description: Human-readable description
    """
    current_plan = subscription.plan
    billing_cycle = subscription.billing_cycle
    current_period_start = subscription.current_period_start
    current_period_end = subscription.current_period_end

    # Calculate unused amount from current plan
    unused_amount = calculate_unused_amount(
        current_plan,
        billing_cycle,
        current_period_start,
        current_period_end
    )

    # Calculate new plan charge
    new_plan_amount = calculate_new_plan_charge(
        new_plan,
        new_billing_cycle,
        current_period_end
    )

    # Net proration amount (positive = charge, negative = credit)
    proration_amount = new_plan_amount - unused_amount

    # Effective date is now
    effective_date = timezone.now()

    # Next billing date
    next_billing_date = get_next_billing_date(current_period_end, new_billing_cycle)

    # Generate description
    description = generate_proration_description(
        current_plan,
        new_plan,
        billing_cycle,
        new_billing_cycle,
        proration_amount
    )

    return {
        'unused_amount': unused_amount,
        'new_plan_amount': new_plan_amount,
        'proration_amount': proration_amount,
        'effective_date': effective_date,
        'next_billing_date': next_billing_date,
        'description': description,
    }


def calculate_trial_days_remaining(trial_end):
    """Calculate days remaining in trial"""
    if not trial_end:
        return 0
    delta = trial_end - timezone.now()
    return max(0, delta.days)


def is_trial_expiring_soon(trial_end, warning_days=7):
    """Check if trial is expiring soon"""
    if not trial_end:
        return False
    days_remaining = calculate_trial_days_remaining(trial_end)
    return 0 < days_remaining <= warning_days


def get_trial_urgency(days_remaining):
    """Get trial urgency level"""
    if days_remaining <= 1:
        return 'critical'
    elif days_remaining <= 3:
        return 'high'
    elif days_remaining <= 7:
        return 'medium'
    else:
        return 'low'


def calculate_discount(amount, discount_type, discount_value):
    """Calculate discount amount"""
    if discount_type == 'percentage':
        discount = (amount * discount_value) / Decimal('100')
    else:  # fixed
        discount = min(discount_value, amount)

    return discount.quantize(Decimal('0.01'))


def apply_discount(amount, discount_type, discount_value):
    """Calculate final amount after discount"""
    discount = calculate_discount(amount, discount_type, discount_value)
    final_amount = max(Decimal('0.00'), amount - discount)
    return final_amount.quantize(Decimal('0.01'))


def check_usage_limits(organization, subscription):
    """
    Check if organization is within plan limits

    Returns dict with:
    - within_limits: bool
    - exceeded: list of exceeded limits
    - warnings: list of warnings (>80% usage)
    """
    plan = subscription.plan
    exceeded = []
    warnings = []

    # Check users
    if plan.max_users != -1:  # -1 = unlimited
        user_count = organization.current_user_count
        if user_count > plan.max_users:
            exceeded.append({
                'metric': 'users',
                'current': user_count,
                'limit': plan.max_users,
            })
        elif user_count >= plan.max_users * 0.8:
            warnings.append({
                'metric': 'users',
                'current': user_count,
                'limit': plan.max_users,
                'percentage': int((user_count / plan.max_users) * 100),
            })

    # TODO: Add checks for storage, documents, folders when those models are implemented

    return {
        'within_limits': len(exceeded) == 0,
        'exceeded': exceeded,
        'warnings': warnings,
    }


def can_perform_action(organization, subscription, action):
    """
    Check if organization can perform an action based on plan limits

    Actions: 'add_user', 'upload_document', 'create_folder', 'api_call'
    """
    limits_check = check_usage_limits(organization, subscription)

    if action == 'add_user':
        # Check if user limit exceeded
        for item in limits_check['exceeded']:
            if item['metric'] == 'users':
                return False, f"User limit exceeded ({item['current']}/{item['limit']})"

    # TODO: Add checks for other actions

    return True, None
