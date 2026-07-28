from django.db import models
from django.contrib.auth.models import User
from facilities.models import Facility, Department
import json


class Report(models.Model):
    REPORT_TYPES = [
        ('COMPLIANCE', 'Compliance Report'),
        ('PERFORMANCE', 'Department Performance Report'),
        ('FACILITY', 'Facility Summary Report'),
        ('INSPECTOR', 'Inspector Activity Report'),
        ('TREND', 'Trend Analysis Report'),
        ('FULL', 'Full System Report'),
    ]
    
    FORMAT_CHOICES = [
        ('PDF', 'PDF'),
        ('CSV', 'CSV'),
        ('EXCEL', 'Excel'),
        ('JSON', 'JSON'),
    ]
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    ]
    
    name = models.CharField(max_length=200)
    report_type = models.CharField(max_length=20, choices=REPORT_TYPES)
    format = models.CharField(max_length=10, choices=FORMAT_CHOICES, default='PDF')
    file = models.FileField(upload_to='reports/%Y/%m/%d/', null=True, blank=True)
    
    # Filters
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    facility = models.ForeignKey(Facility, on_delete=models.SET_NULL, null=True, blank=True)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True)
    filters = models.JSONField(default=dict, blank=True)
    
    # Metadata
    generated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    error_message = models.TextField(blank=True)
    
    # Stats
    total_records = models.IntegerField(default=0)
    file_size = models.IntegerField(default=0, help_text="File size in bytes")
    
    def __str__(self):
        return f"{self.name} - {self.report_type} ({self.format})"
    
    class Meta:
        ordering = ['-generated_at']


class ReportSchedule(models.Model):
    """Scheduled reports for automatic generation"""
    FREQUENCY_CHOICES = [
        ('DAILY', 'Daily'),
        ('WEEKLY', 'Weekly'),
        ('MONTHLY', 'Monthly'),
        ('QUARTERLY', 'Quarterly'),
    ]
    
    name = models.CharField(max_length=200)
    report_type = models.CharField(max_length=20, choices=Report.REPORT_TYPES)
    format = models.CharField(max_length=10, choices=Report.FORMAT_CHOICES, default='PDF')
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES)
    
    recipients = models.TextField(help_text="Comma-separated email addresses")
    filters = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    last_run = models.DateTimeField(null=True, blank=True)
    next_run = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} - {self.frequency}"
    
    class Meta:
        ordering = ['next_run']