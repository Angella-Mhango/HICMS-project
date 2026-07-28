from django.contrib import admin
from .models import InspectorProfile

@admin.register(InspectorProfile)
class InspectorProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'specialization', 'is_active']
    list_filter = ['is_active', 'specialization']
    search_fields = ['user__username', 'user__first_name', 'user__last_name']