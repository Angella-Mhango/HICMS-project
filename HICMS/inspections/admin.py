from django.contrib import admin
from .models import Inspection, InspectionType, ChecklistCategory, ChecklistItem, InspectionAnswer, TrainingInstitution
from django.utils.safestring import mark_safe


class InspectionAnswerInline(admin.TabularInline):
    model = InspectionAnswer
    extra = 0
    fields = ['checklist_item', 'result', 'inspector_notes', 'score_awarded']
    raw_id_fields = ['checklist_item']


@admin.register(InspectionType)
class InspectionTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name']


@admin.register(ChecklistCategory)
class ChecklistCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'order']
    ordering = ['order']
    search_fields = ['name']


@admin.register(ChecklistItem)
class ChecklistItemAdmin(admin.ModelAdmin):
    list_display = ['item_code', 'description_preview', 'category', 'applies_to_public', 'applies_to_private']
    list_filter = ['category', 'applies_to_public', 'applies_to_private', 'for_initial', 'for_routine']
    search_fields = ['item_code', 'description']
    
    def description_preview(self, obj):
        return obj.description[:60] + "..." if len(obj.description) > 60 else obj.description
    description_preview.short_description = "Description"


@admin.register(Inspection)
class InspectionAdmin(admin.ModelAdmin):
    list_display = (
        "facility_name",
        "department",
        "visit_type",
        "mcm_inspection_type",
        "score",
        "benchmark",
        "colored_status",
        "date",
        "requires_followup",
    )
    list_filter = ["visit_type", "department", "date", "mcm_inspection_type", "status", "requires_followup"]
    search_fields = ["facility_name", "inspector", "inspection_officer_1", "inspection_officer_2"]
    exclude = ("status",)
    inlines = [InspectionAnswerInline]
    readonly_fields = ['date']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('facility', 'facility_name', 'department', 'inspector', 'visit_type', 'mcm_inspection_type')
        }),
        ('Inspection Officers', {
            'fields': ('inspection_officer_1', 'inspection_officer_2', 'inspection_officer_1_signature', 'inspection_officer_2_signature')
        }),
        ('Scores', {
            'fields': ('score', 'max_score', 'benchmark')
        }),
        ('Assessment', {
            'fields': ('strengths', 'gaps_weaknesses', 'recommendations')
        }),
        ('Follow-up', {
            'fields': ('requires_followup', 'followup_date', 'suspension_recommended')
        }),
        ('Dates & Notes', {
            'fields': ('start_date', 'end_date', 'notes')
        }),
    )

    def colored_status(self, obj):
        if obj.percentage() >= obj.benchmark:
            return mark_safe('<span style="color:green;font-weight:bold;">✔ Compliant</span>')
        return mark_safe('<span style="color:red;font-weight:bold;">✖ Non-Compliant</span>')
    colored_status.short_description = "Compliance Status"


@admin.register(TrainingInstitution)
class TrainingInstitutionAdmin(admin.ModelAdmin):
    list_display = ['name', 'registration_number', 'inspection_status', 'last_inspection_date']
    list_filter = ['inspection_status']
    search_fields = ['name', 'registration_number']


@admin.register(InspectionAnswer)
class InspectionAnswerAdmin(admin.ModelAdmin):
    list_display = ['inspection', 'checklist_item', 'result', 'score_awarded']
    list_filter = ['result', 'checklist_item__category']
    raw_id_fields = ['inspection', 'checklist_item']