from rest_framework import serializers
from .models import (
    Inspection, InspectionType, ChecklistCategory, 
    ChecklistItem, InspectionAnswer, TrainingInstitution
)
from facilities.models import Facility, Department


class InspectionTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = InspectionType
        fields = ['id', 'name', 'description', 'is_active']


class ChecklistCategorySerializer(serializers.ModelSerializer):
    item_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ChecklistCategory
        fields = ['id', 'name', 'description', 'order', 'item_count']
    
    def get_item_count(self, obj):
        return obj.items.filter(is_active=True).count()


class ChecklistItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = ChecklistItem
        fields = [
            'id', 'item_code', 'description', 'ideal_status',
            'category', 'category_name', 'order', 'applies_to_public',
            'applies_to_private', 'for_initial', 'for_routine',
            'for_investigative', 'for_illegal'
        ]


class InspectionAnswerSerializer(serializers.ModelSerializer):
    item_code = serializers.CharField(source='checklist_item.item_code', read_only=True)
    item_description = serializers.CharField(source='checklist_item.description', read_only=True)
    
    class Meta:
        model = InspectionAnswer
        fields = [
            'id', 'checklist_item', 'item_code', 'item_description',
            'result', 'inspector_notes', 'score_awarded', 'max_score_possible'
        ]


class InspectionListSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    compliance_percentage = serializers.SerializerMethodField()
    mcm_inspection_type_name = serializers.CharField(source='mcm_inspection_type.name', read_only=True, allow_null=True)
    
    class Meta:
        model = Inspection
        fields = [
            'id', 'facility_name', 'department_name', 'facility_type',
            'inspector', 'visit_type', 'mcm_inspection_type_name',
            'score', 'max_score', 'compliance_percentage',
            'status', 'date', 'requires_followup'
        ]
    
    def get_compliance_percentage(self, obj):
        return round(obj.percentage(), 2)


class InspectionDetailSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    answers = InspectionAnswerSerializer(many=True, read_only=True)
    mcm_inspection_type_details = InspectionTypeSerializer(source='mcm_inspection_type', read_only=True)
    
    class Meta:
        model = Inspection
        fields = '__all__'


class InspectionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Inspection
        fields = [
            'facility', 'facility_name', 'department', 'inspector',
            'visit_type', 'mcm_inspection_type', 'score', 'max_score',
            'benchmark', 'start_date', 'end_date', 'notes',
            'inspection_officer_1', 'inspection_officer_2',
            'strengths', 'gaps_weaknesses', 'recommendations',
            'requires_followup', 'followup_date', 'suspension_recommended'
        ]


class SubmitInspectionSerializer(serializers.Serializer):
    inspection_data = InspectionCreateSerializer()
    answers = serializers.ListField(
        child=serializers.DictField(),
        write_only=True
    )
    
    def create(self, validated_data):
        inspection_data = validated_data.pop('inspection_data')
        answers_data = validated_data.pop('answers')
        
        inspection = Inspection.objects.create(**inspection_data)
        
        for answer_data in answers_data:
            InspectionAnswer.objects.create(
                inspection=inspection,
                checklist_item_id=answer_data['checklist_item_id'],
                result=answer_data['result'],
                inspector_notes=answer_data.get('inspector_notes', ''),
                score_awarded=answer_data.get('score_awarded', 0),
                max_score_possible=answer_data.get('max_score_possible', 1)
            )
        
        return inspection