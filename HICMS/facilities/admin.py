from django.contrib import admin
from .models import Facility, Department, Region, District, FacilityType

@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):
    list_display = ['name', 'code']
    search_fields = ['name']

@admin.register(District)
class DistrictAdmin(admin.ModelAdmin):
    list_display = ['name', 'region', 'code']
    list_filter = ['region']
    search_fields = ['name']

@admin.register(FacilityType)
class FacilityTypeAdmin(admin.ModelAdmin):
    list_display = ['name']
    search_fields = ['name']

@admin.register(Facility)
class FacilityAdmin(admin.ModelAdmin):
    list_display = ['name', 'facility_type', 'district', 'region']
    list_filter = ['facility_type', 'district', 'region']
    search_fields = ['name']

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'facility']
    list_filter = ['facility']
    search_fields = ['name']