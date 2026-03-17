"""
URL configuration for users app.
"""
from django.urls import path
from apps.users.views import (
    SafeTokenRefreshView,
    LoginView,
    LogoutView,
    RegisterView,
    ComprehensiveRegisterView,
    CurrentUserView,
    PasswordChangeView,
    UserListView,
    UserDetailView,
    DepartmentListView,
    DepartmentDetailView,
)
from apps.users.password_reset_enterprise import (
    EnterprisePasswordResetRequestView,
    TokenValidationView,
    EnterprisePasswordResetConfirmView,
)
from apps.users.views_otp import (
    send_email_otp_view,
    verify_email_otp_view,
    send_phone_otp_view,
    verify_phone_otp_view,
)
from apps.users.views_favorites import (
    FavoriteFolderListView,
    FavoriteFolderCreateView,
    FavoriteFolderDeleteView,
    FavoriteDocumentListView,
    FavoriteDocumentCreateView,
    FavoriteDocumentDeleteView,
    CheckFolderFavoriteView,
    CheckDocumentFavoriteView,
    ToggleFolderFavoriteView,
    ToggleDocumentFavoriteView,
)
from apps.users.views_collections import (
    FavoriteCollectionListView,
    FavoriteCollectionCreateView,
    FavoriteCollectionDetailView,
    FavoriteCollectionUpdateView,
    FavoriteCollectionDeleteView,
    ReorderCollectionsView,
    ReorderFavoriteFoldersView,
    ReorderFavoriteDocumentsView,
    MoveToCollectionView,
    ShareCollectionView,
    UnshareCollectionView,
    ExportFavoritesView,
    CollectionItemsView,
)
from apps.users.views_management import (
    UserManagementListView,
    UserActivateView,
    UserDeactivateView,
    UserUnlockView,
    UserResetPasswordView,
    SecurityStatsView,
    LockedAccountsView,
    UserManagementStatsView,
)

app_name = 'users'

urlpatterns = [
    # Authentication endpoints
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('register/', RegisterView.as_view(), name='register'),
    path('register/comprehensive/', ComprehensiveRegisterView.as_view(), name='comprehensive_register'),
    path('token/refresh/', SafeTokenRefreshView.as_view(), name='token_refresh'),

    # Enterprise Password reset endpoints
    path('password/reset/request/', EnterprisePasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password/reset/validate/', TokenValidationView.as_view(), name='password_reset_validate'),
    path('password/reset/confirm/', EnterprisePasswordResetConfirmView.as_view(), name='password_reset_confirm'),

    # OTP verification endpoints
    path('otp/email/send/', send_email_otp_view, name='send_email_otp'),
    path('otp/email/verify/', verify_email_otp_view, name='verify_email_otp'),
    path('otp/phone/send/', send_phone_otp_view, name='send_phone_otp'),
    path('otp/phone/verify/', verify_phone_otp_view, name='verify_phone_otp'),

    # User management endpoints
    path('me/', CurrentUserView.as_view(), name='current_user'),
    path('password/change/', PasswordChangeView.as_view(), name='password_change'),
    path('users/', UserListView.as_view(), name='user_list'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user_detail'),

    # Department endpoints
    path('departments/', DepartmentListView.as_view(), name='department_list'),
    path('departments/<int:pk>/', DepartmentDetailView.as_view(), name='department_detail'),

    # Favorites - Folders
    path('favorites/folders/', FavoriteFolderListView.as_view(), name='favorite_folders_list'),
    path('favorites/folders/add/', FavoriteFolderCreateView.as_view(), name='favorite_folder_add'),
    path('favorites/folders/<uuid:folder_id>/remove/', FavoriteFolderDeleteView.as_view(), name='favorite_folder_remove'),
    path('favorites/folders/<uuid:folder_id>/toggle/', ToggleFolderFavoriteView.as_view(), name='favorite_folder_toggle'),
    path('favorites/folders/<uuid:folder_id>/check/', CheckFolderFavoriteView.as_view(), name='favorite_folder_check'),

    # Favorites - Documents
    path('favorites/documents/', FavoriteDocumentListView.as_view(), name='favorite_documents_list'),
    path('favorites/documents/add/', FavoriteDocumentCreateView.as_view(), name='favorite_document_add'),
    path('favorites/documents/<uuid:document_id>/remove/', FavoriteDocumentDeleteView.as_view(), name='favorite_document_remove'),
    path('favorites/documents/<uuid:document_id>/toggle/', ToggleDocumentFavoriteView.as_view(), name='favorite_document_toggle'),
    path('favorites/documents/<uuid:document_id>/check/', CheckDocumentFavoriteView.as_view(), name='favorite_document_check'),

    # Favorites - Collections
    path('favorites/collections/', FavoriteCollectionListView.as_view(), name='favorite_collections_list'),
    path('favorites/collections/create/', FavoriteCollectionCreateView.as_view(), name='favorite_collection_create'),
    path('favorites/collections/<uuid:collection_id>/', FavoriteCollectionDetailView.as_view(), name='favorite_collection_detail'),
    path('favorites/collections/<uuid:collection_id>/update/', FavoriteCollectionUpdateView.as_view(), name='favorite_collection_update'),
    path('favorites/collections/<uuid:collection_id>/delete/', FavoriteCollectionDeleteView.as_view(), name='favorite_collection_delete'),
    path('favorites/collections/<uuid:collection_id>/items/', CollectionItemsView.as_view(), name='favorite_collection_items'),
    path('favorites/collections/<uuid:collection_id>/share/', ShareCollectionView.as_view(), name='favorite_collection_share'),
    path('favorites/collections/<uuid:collection_id>/unshare/', UnshareCollectionView.as_view(), name='favorite_collection_unshare'),

    # Favorites - Reorder and Move Operations
    path('favorites/collections/reorder/', ReorderCollectionsView.as_view(), name='favorite_collections_reorder'),
    path('favorites/folders/reorder/', ReorderFavoriteFoldersView.as_view(), name='favorite_folders_reorder'),
    path('favorites/documents/reorder/', ReorderFavoriteDocumentsView.as_view(), name='favorite_documents_reorder'),
    path('favorites/move/', MoveToCollectionView.as_view(), name='favorites_move_to_collection'),

    # Favorites - Export
    path('favorites/export/', ExportFavoritesView.as_view(), name='favorites_export'),

    # User Management endpoints (admin)
    path('users/<int:pk>/activate/', UserActivateView.as_view(), name='user_activate'),
    path('users/<int:pk>/deactivate/', UserDeactivateView.as_view(), name='user_deactivate'),
    path('users/<int:pk>/unlock/', UserUnlockView.as_view(), name='user_unlock'),
    path('users/<int:pk>/reset-password/', UserResetPasswordView.as_view(), name='user_reset_password'),

    # Security endpoints
    path('security/stats/', SecurityStatsView.as_view(), name='security_stats'),
    path('security/locked-accounts/', LockedAccountsView.as_view(), name='locked_accounts'),

    # Dashboard stats
    path('stats/', UserManagementStatsView.as_view(), name='user_management_stats'),
]
