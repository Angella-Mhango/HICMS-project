from django.db import models

# Create your models here.
from django.db import models

class FacilityType(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} ({self.code})"
    
    class Meta:
        ordering = ['name']


class InspectionType(models.Model):
    name = models.CharField(max_length=50)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} ({self.code})"
    
    class Meta:
        ordering = ['name']


class DepartmentType(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name} ({self.code})"
    
    class Meta:
        ordering = ['name']


class Standard(models.Model):
    CATEGORY_CHOICES = [
        ('general', 'General Information'),
        ('building', 'Building & Infrastructure'),
        ('reception', 'Reception & Waiting Area'),
        ('consultation', 'Consultation Room'),
        ('treatment', 'Treatment/Emergency Room'),
        ('dressing', 'Dressing Room'),
        ('staffing', 'Staffing'),
        ('wards', 'Wards'),
        ('maternity', 'Maternity Services'),
        ('pharmacy', 'Pharmacy'),
        ('laboratory', 'Laboratory'),
        ('theatre', 'Operating Theatre'),
        ('dental', 'Dental Services'),
        ('laundry', 'Laundry Services'),
        ('epi', 'EPI/Immunization'),
        ('waste_management', 'Waste Management'),
        ('ipc', 'Infection Prevention & Control'),
    ]
    
    code = models.CharField(max_length=50, unique=True, blank=True)
    name = models.CharField(max_length=200)
    description = models.TextField()
    ideal_status = models.TextField(blank=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    max_score = models.IntegerField(default=5)
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    facility_type = models.ForeignKey(FacilityType, on_delete=models.SET_NULL, null=True, blank=True, related_name='standards')
    inspection_type = models.ForeignKey(InspectionType, on_delete=models.SET_NULL, null=True, blank=True, related_name='standards')
    department_type = models.ForeignKey(DepartmentType, on_delete=models.SET_NULL, null=True, blank=True, related_name='standards')
    
    department_ids = models.JSONField(default=list, blank=True, help_text="List of department IDs this standard applies to")
    
    def __str__(self):
        return f"{self.code} - {self.name}"
    
    class Meta:
        ordering = ['order', 'code']


class Requirement(models.Model):
    standard = models.ForeignKey(Standard, on_delete=models.CASCADE, related_name='requirements')
    name = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    max_score = models.IntegerField(default=5)
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    criteria = models.JSONField(default=dict, blank=True)
    department_ids = models.JSONField(default=list, blank=True)
    
    def __str__(self):
        return f"{self.standard.code} - {self.name}"
    
    class Meta:
        ordering = ['order', 'id']


class ComplianceScale(models.Model):
    level = models.CharField(max_length=100)
    score = models.IntegerField()
    description = models.TextField(blank=True)
    color = models.CharField(max_length=50, default='green')
    order = models.IntegerField(default=0)
    
    def __str__(self):
        return f"{self.level} ({self.score} pts)"
    
    class Meta:
        ordering = ['order', 'score']


class Department(models.Model):
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=20, unique=True)
    facility_types = models.ManyToManyField('FacilityType', blank=True, related_name='departments')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.code} - {self.name}"

    class Meta:
        ordering = ['name']