from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from .models import UserProfile, UserActivity

# Unregister default User admin if already registered
try:
    admin.site.unregister(User)
except:
    pass

class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'get_role', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('username', 'email', 'first_name', 'last_name')
    
    def get_role(self, obj):
        try:
            return obj.userprofile.role
        except:
            return '-'
    get_role.short_description = 'Role'

admin.site.register(User, CustomUserAdmin)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'role', 'facility', 'phone_number', 'is_active']
    list_filter = ['role', 'is_active', 'facility']
    search_fields = ['user__username', 'user__first_name', 'user__last_name', 'phone_number']


@admin.register(UserActivity)
class UserActivityAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'model_name', 'timestamp']
    list_filter = ['action', 'timestamp']
    search_fields = ['user__username', 'action', 'model_name']
    readonly_fields = ['user', 'action', 'model_name', 'object_id', 'details', 'ip_address', 'timestamp']