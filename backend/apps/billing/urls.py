"""
Billing URL Configuration
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PlanViewSet,
    SubscriptionViewSet,
    PaymentMethodViewSet,
    InvoiceViewSet,
    UsageViewSet,
    CouponViewSet,
)

app_name = 'billing'

# Create router
router = DefaultRouter()
router.register(r'plans', PlanViewSet, basename='plan')
router.register(r'subscription', SubscriptionViewSet, basename='subscription')
router.register(r'payment-methods', PaymentMethodViewSet, basename='payment-method')
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'usage', UsageViewSet, basename='usage')
router.register(r'coupons', CouponViewSet, basename='coupon')

urlpatterns = [
    path('', include(router.urls)),
]
