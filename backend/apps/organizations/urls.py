"""
URL configuration for organization API endpoints.
"""
from django.urls import path
from . import views

app_name = 'organizations'

urlpatterns = [
    # Organization details
    path('me/', views.OrganizationDetailView.as_view(), name='organization-detail'),

    # Organization settings and usage
    path('settings/', views.OrganizationSettingsView.as_view(), name='organization-settings'),
    path('usage/', views.OrganizationUsageView.as_view(), name='organization-usage'),

    # Members
    path('members/', views.OrganizationMembersView.as_view(), name='organization-members'),
    path('members/<int:member_id>/remove/', views.RemoveOrganizationMemberView.as_view(), name='remove-member'),
    path('members/<int:member_id>/role/', views.UpdateMemberRoleView.as_view(), name='update-member-role'),

    # Invitations
    path('invitations/', views.InvitationListView.as_view(), name='invitation-list'),
    path('invitations/create/', views.InvitationCreateView.as_view(), name='invitation-create'),
    path('invitations/accept/', views.InvitationAcceptView.as_view(), name='invitation-accept'),

    # Statistics
    path('stats/', views.organization_stats, name='organization-stats'),
]
