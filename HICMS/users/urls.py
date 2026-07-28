from django.urls import path
from . import views

urlpatterns = [
    # User management
    path('', views.user_list, name='user-list'),
    path('create/', views.create_user, name='create-user'),
    path('<int:user_id>/', views.user_detail, name='user-detail'),
    path('<int:user_id>/update/', views.update_user, name='update-user'),
    path('<int:user_id>/delete/', views.delete_user, name='delete-user'),
    path('<int:user_id>/toggle-active/', views.toggle_user_active, name='toggle-active'),
    
    # Profile
    path('profile/', views.get_profile, name='get-profile'),
    path('profile/update/', views.update_profile, name='update-profile'),
    
    # Role management
    path('roles/', views.get_roles, name='get-roles'),
    path('roles/create/', views.create_role, name='create-role'),
    path('roles/<int:role_id>/update/', views.update_role, name='update-role'),
    path('roles/<int:role_id>/delete/', views.delete_role, name='delete-role'),
    
    # User activity
    path('activities/', views.user_activities, name='user-activities'),
    path('activities/<int:user_id>/', views.user_activities_detail, name='user-activities-detail'),
    
    # User search
    path('search/', views.search_users, name='search-users'),
    
    # Assign role
    path('<int:user_id>/assign-role/', views.assign_role, name='assign-role'),
]