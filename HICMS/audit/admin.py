from django.contrib import admin
from .models import AuditLog

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'model', 'timestamp']
    list_filter = ['action', 'timestamp']
    search_fields = ['user__username', 'model']
    readonly_fields = ['user', 'action', 'model', 'object_id', 'details', 'timestamp']