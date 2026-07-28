from django.db import models
from django.contrib.auth.models import User
from facilities.models import Facility

class InspectorProfile(models.Model):
    SPECIALIZATION_CHOICES = [
        ('GENERAL', 'General Inspector'),
        ('CLINICAL', 'Clinical Inspector'),
        ('PHARMACY', 'Pharmacy Inspector'),
        ('LABORATORY', 'Laboratory Inspector'),
        ('RADIOLOGY', 'Radiology Inspector'),
        ('DENTAL', 'Dental Inspector'),
        ('MATERNITY', 'Maternity Inspector'),
        ('EMERGENCY', 'Emergency Inspector'),
        ('SURGERY', 'Surgery Inspector'),
        ('MENTAL_HEALTH', 'Mental Health Inspector'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='inspector_profile')
    specialization = models.CharField(max_length=50, choices=SPECIALIZATION_CHOICES, default='GENERAL')
    years_of_experience = models.IntegerField(default=0)
    license_number = models.CharField(max_length=50, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    assigned_facilities = models.ManyToManyField(Facility, blank=True, related_name='assigned_inspectors')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.get_specialization_display()}"
    
    class Meta:
        ordering = ['user__first_name', 'user__last_name']