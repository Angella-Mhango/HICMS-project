from django.urls import path
from . import views

urlpatterns = [
    path('api/', views.get_facilities, name='facilities-list'),
    path('api/<int:facility_id>/', views.get_facility, name='facility-detail'),
    path('api/create/', views.create_facility, name='create-facility'),
    path('<int:facility_id>/departments/', views.get_facility_departments, name='facility-departments'),
    path('departments/create/', views.create_department, name='create-department'),
    path('regions/', views.get_regions, name='regions-list'),
    path('districts/create/', views.create_district, name='create-district'),
    path('regions/<int:region_id>/districts/', views.get_districts_by_region, name='districts-by-region'),
    path('districts/<int:district_id>/facilities/', views.get_facilities_by_district, name='facilities-by-district'),
]
