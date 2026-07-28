from django.urls import path
from . import views

urlpatterns = [
    path('', views.get_standards_list, name='standards-list'),
    path('scales/', views.get_compliance_scales, name='compliance-scales'),
    path('submit/', views.submit_standard_inspection, name='submit-standard-inspection'),
    path('admin/', views.get_standards_admin, name='standards-admin'),
    path('facility-types/', views.get_facility_types, name='facility-types'),
    path('inspection-types/', views.get_inspection_types, name='inspection-types'),
    path('departments/', views.get_departments, name='departments'),
    path('preview-code/', views.preview_standard_code, name='preview-code'),
    path('admin/standard/', views.create_standard, name='create-standard'),
    path('admin/standard/<int:standard_id>/', views.update_standard, name='update-standard'),
    path('admin/standard/<int:standard_id>/archive/', views.archive_standard, name='archive-standard'),
    path('admin/requirement/', views.create_requirement, name='create-requirement'),
    path('admin/requirement/<int:requirement_id>/', views.update_requirement, name='update-requirement'),
    path('admin/requirement/<int:requirement_id>/archive/', views.archive_requirement, name='archive-requirement'),
]