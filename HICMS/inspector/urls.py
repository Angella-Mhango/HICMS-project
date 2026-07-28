from django.urls import path
from . import views

urlpatterns = [
    path('profile/', views.get_inspector_profile, name='inspector-profile'),
    path('profile/update/', views.update_inspector_profile, name='update-inspector-profile'),
    path('dashboard/', views.inspector_dashboard, name='inspector-dashboard'),
    path('assignments/', views.inspector_assignments, name='inspector-assignments'),
    path('statistics/', views.inspector_statistics, name='inspector-statistics'),
]