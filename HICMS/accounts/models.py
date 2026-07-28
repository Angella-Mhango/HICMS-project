from django.db import models
from django.contrib.auth.models import User
from facilities.models import Facility

class Role(models.Model):
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    permissions = models.JSONField(default=list, blank=True)

    def __str__(self):
        return self.name

class UserRole(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='userrole')
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    facility = models.ForeignKey(Facility, on_delete=models.SET_NULL, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.username} - {self.role.name}"

    def is_admin(self):
        return self.role.name.lower() in ['admin', 'national_admin']
    
    @property
    def role_id(self):
        return self.role.id