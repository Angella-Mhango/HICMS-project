from django.db import models
from django.contrib.auth.models import User
from facilities.models import Facility


class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Administrator'),
        ('national_admin', 'National Administrator'),
        ('regional_admin', 'Regional Administrator'),
        ('district_admin', 'District Administrator'),
        ('facility_admin', 'Facility Administrator'),
        ('inspector', 'Inspector'),
        ('national_inspector', 'National Inspector'),
        ('supervisor', 'Supervisor'),
        ('facility_qa', 'Facility QA'),
        ('viewer', 'Viewer'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='userprofile')
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default='inspector')
    facility = models.ForeignKey(Facility, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    phone_number = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    
    # User preferences
    notifications_enabled = models.BooleanField(default=True)
    email_notifications = models.BooleanField(default=True)
    
    # User metadata
    last_login = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()}"
    
    def is_admin(self):
        return self.role in ['admin', 'national_admin']
    
    class Meta:
        ordering = ['user__username']


class UserActivity(models.Model):
    ACTION_CHOICES = [
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
        ('CREATE', 'Create'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
        ('VIEW', 'View'),
        ('EXPORT', 'Export'),
        ('IMPORT', 'Import'),
        ('APPROVE', 'Approve'),
        ('REJECT', 'Reject'),
        ('ASSIGN', 'Assign'),
        ('COMPLETE', 'Complete'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    model_name = models.CharField(max_length=100, blank=True)
    object_id = models.IntegerField(null=True, blank=True)
    details = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.action} at {self.timestamp}"
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name_plural = "User Activities"