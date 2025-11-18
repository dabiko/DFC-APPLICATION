"""
URL configuration for folders app.
"""
from django.urls import path
from apps.folders.views import (
    FolderListCreateView,
    FolderDetailView,
    FolderUpdateView,
    FolderDeleteView,
    FolderMoveView,
    FolderBreadcrumbView,
    FolderTreeView,
    FolderTemplateListCreateView,
    FolderTemplateDetailView,
    FolderTemplateInstantiateView,
    SmartFolderListCreateView,
    SmartFolderDetailView,
    SmartFolderDocumentsView,
    SmartFolderRefreshCountView,
)

app_name = 'folders'

urlpatterns = [
    # Folder endpoints
    path('', FolderListCreateView.as_view(), name='folder_list_create'),
    path('<uuid:id>/', FolderDetailView.as_view(), name='folder_detail'),
    path('<uuid:id>/update/', FolderUpdateView.as_view(), name='folder_update'),
    path('<uuid:id>/delete/', FolderDeleteView.as_view(), name='folder_delete'),
    path('<uuid:id>/move/', FolderMoveView.as_view(), name='folder_move'),
    path('<uuid:id>/breadcrumb/', FolderBreadcrumbView.as_view(), name='folder_breadcrumb'),

    # Folder tree view
    path('tree/', FolderTreeView.as_view(), name='folder_tree'),

    # Folder template endpoints
    path('templates/', FolderTemplateListCreateView.as_view(), name='template_list_create'),
    path('templates/<int:pk>/', FolderTemplateDetailView.as_view(), name='template_detail'),
    path('templates/<int:template_id>/instantiate/', FolderTemplateInstantiateView.as_view(), name='template_instantiate'),

    # Smart folder endpoints
    path('smart-folders/', SmartFolderListCreateView.as_view(), name='smart_folder_list_create'),
    path('smart-folders/<uuid:pk>/', SmartFolderDetailView.as_view(), name='smart_folder_detail'),
    path('smart-folders/<uuid:pk>/documents/', SmartFolderDocumentsView.as_view(), name='smart_folder_documents'),
    path('smart-folders/<uuid:pk>/refresh/', SmartFolderRefreshCountView.as_view(), name='smart_folder_refresh'),
]
