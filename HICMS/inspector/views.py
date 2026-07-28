from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse, HttpResponse
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import InspectorProfile
from inspections.models import Inspection
from audit.utils import log_action


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_inspector_profile(request):
    """Get the current inspector's profile"""
    try:
        profile = request.user.inspector_profile
        data = {
            'id': profile.id,
            'username': request.user.username,
            'first_name': request.user.first_name,
            'last_name': request.user.last_name,
            'email': request.user.email,
            'specialization': profile.specialization,
            'specialization_display': profile.get_specialization_display(),
            'years_of_experience': profile.years_of_experience,
            'license_number': profile.license_number,
            'phone_number': profile.phone_number,
            'is_active': profile.is_active,
            'assigned_facilities': [
                {
                    'id': f.id,
                    'name': f.name,
                    'district': f.district.name if f.district else None
                }
                for f in profile.assigned_facilities.all()
            ]
        }
        return JsonResponse(data)
    except InspectorProfile.DoesNotExist:
        return JsonResponse({'error': 'Inspector profile not found'}, status=404)
    except AttributeError:
        return JsonResponse({'error': 'User is not an inspector'}, status=403)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_inspector_profile(request):
    """Update the inspector's profile"""
    try:
        profile = request.user.inspector_profile
        data = request.data
        
        if 'specialization' in data:
            profile.specialization = data['specialization']
        if 'years_of_experience' in data:
            profile.years_of_experience = data['years_of_experience']
        if 'license_number' in data:
            profile.license_number = data['license_number']
        if 'phone_number' in data:
            profile.phone_number = data['phone_number']
        if 'first_name' in data:
            request.user.first_name = data['first_name']
        if 'last_name' in data:
            request.user.last_name = data['last_name']
        if 'email' in data:
            request.user.email = data['email']
        
        request.user.save()
        profile.save()
        
        log_action(
            user=request.user,
            action='UPDATE_PROFILE',
            model_name='InspectorProfile',
            object_id=profile.id,
            details='Updated inspector profile'
        )
        
        return JsonResponse({'success': True, 'message': 'Profile updated successfully'})
        
    except InspectorProfile.DoesNotExist:
        return JsonResponse({'error': 'Inspector profile not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def inspector_dashboard(request):
    """Get dashboard data for an inspector"""
    try:
        profile = request.user.inspector_profile
        assignments = profile.assigned_facilities.all()
        
        # Get inspections conducted by this inspector
        my_inspections = Inspection.objects.filter(inspector=request.user.username)
        
        total_inspections = my_inspections.count()
        compliant = my_inspections.filter(status='Compliant').count()
        non_compliant = my_inspections.filter(status='Non-compliant').count()
        avg_score = my_inspections.aggregate(avg_score=models.Avg('score'))['avg_score'] or 0
        
        # Recent inspections (last 30 days)
        recent = my_inspections.order_by('-date')[:5]
        recent_data = [{
            'id': i.id,
            'facility_name': i.facility_name,
            'department': i.department.name if i.department else 'N/A',
            'visit_type': i.visit_type,
            'score': i.score,
            'status': i.status,
            'date': i.date.isoformat()
        } for i in recent]
        
        return JsonResponse({
            'total_inspections': total_inspections,
            'compliant': compliant,
            'non_compliant': non_compliant,
            'avg_score': round(avg_score, 1),
            'compliance_rate': round((compliant / total_inspections * 100), 1) if total_inspections > 0 else 0,
            'assigned_facilities_count': assignments.count(),
            'recent_inspections': recent_data
        })
        
    except InspectorProfile.DoesNotExist:
        return JsonResponse({'error': 'Inspector profile not found'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def inspector_assignments(request):
    """Get facilities assigned to this inspector"""
    try:
        profile = request.user.inspector_profile
        assignments = profile.assigned_facilities.all()
        
        data = [{
            'id': f.id,
            'name': f.name,
            'facility_type': f.facility_type.name if f.facility_type else None,
            'district': f.district.name if f.district else None,
            'region': f.region.name if f.region else None,
            'last_inspection': None,  # Will be populated with actual data
        } for f in assignments]
        
        return JsonResponse(data, safe=False)
        
    except InspectorProfile.DoesNotExist:
        return JsonResponse({'error': 'Inspector profile not found'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def inspector_statistics(request):
    """Get detailed statistics for an inspector"""
    try:
        my_inspections = Inspection.objects.filter(inspector=request.user.username)
        
        # By visit type
        by_visit_type = {}
        for vt in ['Baseline', 'Follow-up', 'Observation', 'Edit']:
            count = my_inspections.filter(visit_type=vt).count()
            if count > 0:
                by_visit_type[vt] = count
        
        # By month
        from django.db.models.functions import TruncMonth
        by_month = (
            my_inspections
            .annotate(month=TruncMonth('date'))
            .values('month')
            .annotate(count=models.Count('id'))
            .order_by('month')
        )
        monthly_data = []
        for item in by_month:
            if item['month']:
                monthly_data.append({
                    'month': item['month'].strftime('%b %Y'),
                    'count': item['count']
                })
        
        return JsonResponse({
            'by_visit_type': by_visit_type,
            'by_month': monthly_data,
            'total_inspections': my_inspections.count()
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)