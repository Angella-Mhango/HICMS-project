from django.contrib import admin
from .models import Standard, Requirement, ComplianceScale

class RequirementInline(admin.TabularInline):
    model = Requirement
    extra = 1
    fields = ['name', 'max_score', 'order', 'is_active']

@admin.register(Standard)
class StandardAdmin(admin.ModelAdmin):
    list_display = ['name', 'max_score', 'order', 'is_active']
    inlines = [RequirementInline]
    ordering = ['order', 'name']

@admin.register(Requirement)
class RequirementAdmin(admin.ModelAdmin):
    list_display = ['name', 'standard', 'max_score', 'order']
    list_filter = ['standard', 'is_active']

@admin.register(ComplianceScale)
class ComplianceScaleAdmin(admin.ModelAdmin):
    list_display = ['level', 'score', 'color', 'order']