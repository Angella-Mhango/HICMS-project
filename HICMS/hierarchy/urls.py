from django.urls import path

from . import views


urlpatterns = [
    path("levels/", views.levels, name="hierarchy-levels"),
    path("my-admin-info/", views.my_admin_info, name="my-admin-info"),
    path("admins/<str:level_name>/", views.admins_by_level, name="admins-by-level"),
    path("create-admin/", views.create_admin, name="create-admin"),
    path("delete-admin/<int:admin_id>/", views.delete_admin, name="delete-admin"),
    path("summary/", views.summary, name="hierarchy-summary"),
    path("accessible-regions/", views.accessible_regions, name="accessible-regions"),
    path("accessible-districts/", views.accessible_districts, name="accessible-districts"),
    path("users/all/hierarchy/", views.all_user_hierarchy, name="all-user-hierarchy"),
    path("users/<int:user_id>/hierarchy/", views.user_hierarchy, name="user-hierarchy"),
    path("users/<int:user_id>/assign-level/", views.assign_user_level, name="assign-user-level"),
]
