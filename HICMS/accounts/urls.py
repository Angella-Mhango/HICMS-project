from django.urls import path
from . import views

urlpatterns = [
    path('me/', views.get_user_role, name='user-role'),
    path('users/', views.user_list_create, name='user-list'),
    path('users/<int:user_id>/', views.user_detail, name='user-detail'),
    path('users/<int:user_id>/assign-role/', views.assign_role, name='assign-role'),
    path('roles/', views.user_roles, name='user-roles'),
    path('roles/create/', views.create_role, name='role-create'),
    path('roles/<int:role_id>/', views.role_detail, name='role-detail'),
    path('audit-logs/', views.get_audit_logs, name='audit-logs'),
    path('permissions/', views.get_permissions, name='permissions'),
]
