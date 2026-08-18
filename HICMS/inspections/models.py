from django.db import models
from django.contrib.auth.models import User
from facilities.models import Department, Facility
from django.db.models import Avg
import json


class InspectionType(models.Model):
    TYPE_CHOICES = [
        ('INITIAL', 'Initial Inspection - New facilities seeking licensure'),
        ('ROUTINE', 'Routine Inspection - Licensed facilities (quarterly/bi-annual)'),
        ('ILLEGAL', 'Illegal (Ad Hoc) Inspection - Unregistered facilities'),
        ('INVESTIGATIVE', 'Investigative Inspection - Response to complaints/allegations'),
    ]
    
    name = models.CharField(max_length=20, choices=TYPE_CHOICES, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return self.get_name_display()


class ChecklistCategory(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    order = models.IntegerField(default=0)
    
    class Meta:
        ordering = ['order', 'name']
        verbose_name_plural = "Checklist Categories"
    
    def __str__(self):
        return self.name


class ChecklistItem(models.Model):
    RESULT_CHOICES = [
        ('COMPLIANT', 'Compliant'),
        ('PARTIAL', 'Partially Compliant'),
        ('NON_COMPLIANT', 'Non-Compliant'),
        ('NOT_APPLICABLE', 'Not Applicable'),
    ]
    
    category = models.ForeignKey(ChecklistCategory, on_delete=models.CASCADE, related_name='items')
    item_code = models.CharField(max_length=20, unique=True, help_text="e.g., BLDG-01, ROOF-01")
    description = models.TextField(help_text="The requirement text from checklist")
    ideal_status = models.TextField(blank=True, help_text="What 'ideal' looks like")
    
    applies_to_public = models.BooleanField(default=True)
    applies_to_private = models.BooleanField(default=True)
    
    for_initial = models.BooleanField(default=True)
    for_routine = models.BooleanField(default=True)
    for_investigative = models.BooleanField(default=True)
    for_illegal = models.BooleanField(default=True)
    
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['category__order', 'order', 'item_code']
    
    def __str__(self):
        return f"{self.item_code}: {self.description[:50]}"


class Inspection(models.Model):
    VISIT_TYPE = [
        ('Baseline', 'Baseline'),
        ('Follow-up', 'Follow-up'),
        ('Observation', 'Observation'),
        ('Edit', 'Edit')
    ]
    
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, null=True, blank=True, related_name='inspections')
    facility_name = models.CharField(max_length=200)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, null=True, blank=True)
    inspector = models.CharField(max_length=100)
    visit_type = models.CharField(max_length=20, choices=VISIT_TYPE)
    
    mcm_inspection_type = models.ForeignKey(InspectionType, on_delete=models.SET_NULL, null=True, blank=True)
    
    score = models.IntegerField(default=0)
    max_score = models.IntegerField(default=100)
    benchmark = models.IntegerField(default=80)
    
    date = models.DateField(auto_now_add=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    
    status = models.CharField(max_length=20, blank=True)
    notes = models.TextField(blank=True)
    
    inspection_officer_1 = models.CharField(max_length=100, blank=True)
    inspection_officer_2 = models.CharField(max_length=100, blank=True)
    inspection_officer_1_signature = models.CharField(max_length=255, blank=True)
    inspection_officer_2_signature = models.CharField(max_length=255, blank=True)
    
    strengths = models.TextField(blank=True, help_text="What is working well")
    gaps_weaknesses = models.TextField(blank=True, help_text="Areas needing improvement")
    recommendations = models.TextField(blank=True, help_text="Recommended actions")
    
    requires_followup = models.BooleanField(default=False)
    followup_date = models.DateField(null=True, blank=True)
    suspension_recommended = models.BooleanField(default=False)

    def percentage(self):
        if self.max_score == 0:
            return 0
        return round((self.score / self.max_score) * 100, 2)

    def compliance_status(self):
        if self.percentage() >= self.benchmark:
            return "Compliant"
        return "Non-compliant"

    def color(self):
        if self.percentage() >= self.benchmark:
            return "green"
        return "red"

    def save(self, *args, **kwargs):
        if self.percentage() >= self.benchmark:
            self.status = "Compliant"
        else:
            self.status = "Non-compliant"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.facility_name} - {self.visit_type} - {self.date}"


class InspectionAnswer(models.Model):
    RESULT_CHOICES = [
        ('COMPLIANT', 'Compliant'),
        ('PARTIAL', 'Partially Compliant'),
        ('NON_COMPLIANT', 'Non-Compliant'),
        ('NOT_APPLICABLE', 'Not Applicable'),
    ]
    
    inspection = models.ForeignKey(Inspection, on_delete=models.CASCADE, related_name='answers')
    checklist_item = models.ForeignKey(ChecklistItem, on_delete=models.CASCADE)
    result = models.CharField(max_length=20, choices=RESULT_CHOICES)
    inspector_notes = models.TextField(blank=True)
    score_awarded = models.IntegerField(default=0)
    max_score_possible = models.IntegerField(default=1)
    
    class Meta:
        unique_together = ['inspection', 'checklist_item']
        verbose_name_plural = "Inspection Answers"
    
    def __str__(self):
        return f"{self.inspection} - {self.checklist_item.item_code}: {self.get_result_display()}"


class StandardResponse(models.Model):
    """A scored standards requirement captured as part of an inspection."""
    inspection = models.ForeignKey(Inspection, on_delete=models.CASCADE, related_name='standard_responses')
    requirement = models.ForeignKey('standards.Requirement', on_delete=models.PROTECT, related_name='inspection_responses')
    score = models.IntegerField(default=0)
    max_score_possible = models.IntegerField(default=0)

    class Meta:
        unique_together = ['inspection', 'requirement']

    def __str__(self):
        return f"{self.inspection} - {self.requirement}: {self.score}/{self.max_score_possible}"


class CorrectiveAction(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('In Progress', 'In Progress'),
        ('Completed', 'Completed'),
    ]

    inspection = models.OneToOneField(Inspection, on_delete=models.CASCADE, related_name='corrective_action')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    deadline = models.DateField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'inspections_correctiveactionrecord'

    def __str__(self):
        return f"Corrective action for inspection {self.inspection_id}"


class CorrectiveActionComment(models.Model):
    corrective_action = models.ForeignKey(CorrectiveAction, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at', 'id']



class InspectionPlan(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    start_date = models.DateField()
    end_date = models.DateField()
    pre_inspection_deadline = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    focus_standard_ids = models.JSONField(default=list, blank=True)
    facility_ids = models.JSONField(default=list, blank=True)
    year = models.IntegerField(null=True, blank=True)
    quarter = models.CharField(max_length=10, default='Q1')
    is_recurring = models.BooleanField(default=False)
    recurrence_pattern = models.CharField(max_length=50, default='quarterly')

    class Meta:
        ordering = ['-start_date', 'title']

    def __str__(self):
        return self.title


class InspectionSchedule(models.Model):
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('rescheduled', 'Rescheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    plan = models.ForeignKey(InspectionPlan, on_delete=models.CASCADE, related_name='schedules')
    facility = models.ForeignKey(Facility, on_delete=models.CASCADE, related_name='inspection_schedules')
    assigned_inspector = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='inspection_schedules')
    scheduled_date = models.DateField()
    actual_date = models.DateField(null=True, blank=True)
    deadline = models.DateField()
    focus_standard_ids = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['scheduled_date', 'facility__name']

    def __str__(self):
        return f"{self.facility.name} - {self.plan.title} - {self.scheduled_date}"

class TrainingInstitution(models.Model):
    name = models.CharField(max_length=200)
    registration_number = models.CharField(max_length=50, unique=True)
    physical_address = models.TextField()
    postal_address = models.CharField(max_length=200, blank=True)
    phone = models.CharField(max_length=20)
    email = models.EmailField()
    programs_offered = models.TextField(help_text="List of clinical programs")
    last_inspection_date = models.DateField(null=True, blank=True)
    inspection_status = models.CharField(max_length=20, choices=[
        ('COMPLIANT', 'Compliant'),
        ('NON_COMPLIANT', 'Non-Compliant'),
        ('PENDING', 'Pending Inspection'),
    ], default='PENDING')
    
    def __str__(self):
        return self.name





