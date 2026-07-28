import json
import traceback
from datetime import datetime, timedelta
from django.db.models import Avg, Count, Q, F
from django.db.models.functions import TruncMonth
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from facilities.models import Department, Facility
from .models import (
    Inspection, InspectionType, ChecklistCategory,
    ChecklistItem, InspectionAnswer, InspectionPlan, InspectionSchedule
)
from accounts.permissions import role_required
from audit.utils import log_action



def official_inspections():
    return Inspection.objects.exclude(notes__startswith='PRE_INSPECTION')



def _schedule_meta(schedule):
    try:
        return json.loads(schedule.notes or '{}')
    except (TypeError, ValueError):
        return {}


def _schedule_notes(notes='', inspection_type=''):
    return json.dumps({
        'notes': notes or '',
        'inspection_type': inspection_type or 'ROUTINE',
    })


def _inspector_users():
    from accounts.models import UserRole
    users = [ur.user for ur in UserRole.objects.select_related('user', 'role').filter(role__name__icontains='inspector')]
    return users


def _inspection_type_options():
    return [
        {'value': choice[0], 'label': choice[1]}
        for choice in InspectionType.TYPE_CHOICES
    ]


def _serialize_schedule(schedule):
    meta = _schedule_meta(schedule)
    inspection_type = meta.get('inspection_type') or 'ROUTINE'
    inspection_type_label = dict(InspectionType.TYPE_CHOICES).get(inspection_type, inspection_type)
    inspector = schedule.assigned_inspector
    inspector_name = inspector.get_full_name().strip() if inspector and inspector.get_full_name().strip() else (inspector.username if inspector else 'Unassigned')

    return {
        'id': schedule.id,
        'plan_id': schedule.plan_id,
        'plan_title': schedule.plan.title,
        'facility_id': schedule.facility_id,
        'facility_name': schedule.facility.name,
        'district': schedule.facility.district.name if schedule.facility.district else None,
        'region': schedule.facility.region.name if schedule.facility.region else None,
        'scheduled_date': schedule.scheduled_date.isoformat(),
        'end_date': schedule.deadline.isoformat() if schedule.deadline else schedule.scheduled_date.isoformat(),
        'deadline': schedule.deadline.isoformat() if schedule.deadline else None,
        'assigned_inspector_id': schedule.assigned_inspector_id,
        'assigned_inspector_name': inspector_name,
        'inspection_type': inspection_type,
        'inspection_type_label': inspection_type_label,
        'status': schedule.status,
        'notes': meta.get('notes', ''),
        'focus_standard_ids': schedule.focus_standard_ids or [],
    }
@csrf_exempt
def submit_standard_inspection(request):
    """Compatibility wrapper for the standards app submission endpoint."""
    from standards.views import submit_standard_inspection as standards_submit

    return standards_submit(request)


# ============ DASHBOARD ENDPOINTS ============

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Get dashboard statistics with filtering by admin level"""
    try:
        queryset = official_inspections()
        
        # Apply admin-level filtering
        admin_level = request.GET.get('level')
        admin_id = request.GET.get('id')
        
        if admin_level == 'region' and admin_id:
            queryset = queryset.filter(facility__region_id=admin_id)
        elif admin_level == 'district' and admin_id:
            queryset = queryset.filter(facility__district_id=admin_id)
        elif admin_level == 'facility' and admin_id:
            queryset = queryset.filter(facility_id=admin_id)
        region_id = request.GET.get('region_id')
        district_id = request.GET.get('district_id')
        facility_id = request.GET.get('facility_id')

        if region_id:
            queryset = queryset.filter(facility__region_id=region_id)
        if district_id:
            queryset = queryset.filter(facility__district_id=district_id)
        if facility_id:
            queryset = queryset.filter(facility_id=facility_id)
        # Date range filtering
        date_range = request.GET.get('date_range')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        
        if date_range == 'month':
            month_ago = datetime.now().date() - timedelta(days=30)
            queryset = queryset.filter(date__gte=month_ago)
        elif date_range == 'quarter':
            quarter_ago = datetime.now().date() - timedelta(days=90)
            queryset = queryset.filter(date__gte=quarter_ago)
        elif date_range == 'year':
            year_ago = datetime.now().date() - timedelta(days=365)
            queryset = queryset.filter(date__gte=year_ago)
        elif start_date and end_date:
            queryset = queryset.filter(date__gte=start_date, date__lte=end_date)
        
        total = queryset.count()
        compliant = queryset.filter(status='Compliant').count()
        non_compliant = queryset.filter(status='Non-compliant').count()
        avg_score = queryset.aggregate(avg=Avg('score'))['avg'] or 0
        
        compliance_rate = round((compliant / total * 100), 1) if total > 0 else 0
        
        return JsonResponse({
            'total_inspections': total,
            'compliant': compliant,
            'non_compliant': non_compliant,
            'compliance_rate': compliance_rate,
            'average_score': round(avg_score, 1)
        })
    except Exception as e:
        print(f"Error in dashboard_stats: {e}")
        return JsonResponse({'error': str(e)}, status=500)


def _filtered_official_inspections(request):
    queryset = official_inspections().select_related('facility', 'facility__district', 'facility__region', 'department')

    admin_level = request.GET.get('level')
    admin_id = request.GET.get('id')
    if admin_level == 'region' and admin_id:
        queryset = queryset.filter(facility__region_id=admin_id)
    elif admin_level == 'district' and admin_id:
        queryset = queryset.filter(facility__district_id=admin_id)
    elif admin_level == 'facility' and admin_id:
        queryset = queryset.filter(facility_id=admin_id)

    region_id = request.GET.get('region_id')
    district_id = request.GET.get('district_id')
    facility_id = request.GET.get('facility_id')
    if region_id:
        queryset = queryset.filter(facility__region_id=region_id)
    if district_id:
        queryset = queryset.filter(facility__district_id=district_id)
    if facility_id:
        queryset = queryset.filter(facility_id=facility_id)

    return queryset


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def alerts_api(request):
    """Generate active alerts from inspection records in the database."""
    try:
        inspections = _filtered_official_inspections(request)
        today = datetime.now().date()
        alerts = []

        def add_alert(alert_id, alert_type, title, message, details='', count=None):
            alerts.append({
                'id': alert_id,
                'type': alert_type,
                'title': title,
                'message': message,
                'details': details,
                'date': today.isoformat(),
                'count': count,
            })

        critical = list(inspections.filter(score__lt=50).order_by('facility_name', '-date'))
        critical_by_facility = {}
        for inspection in critical:
            critical_by_facility.setdefault(inspection.facility_name, inspection)
        if critical_by_facility:
            add_alert(
                'critical-low-scores',
                'critical',
                'Critical Compliance Issues',
                f"{len(critical_by_facility)} {'facility has' if len(critical_by_facility) == 1 else 'facilities have'} scores below 50%",
                ', '.join(f"{item.facility_name} ({item.score}%)" for item in critical_by_facility.values()),
                len(critical_by_facility),
            )

        overdue_cutoff = today - timedelta(days=30)
        overdue = list(
            inspections
            .filter(date__lt=overdue_cutoff)
            .filter(Q(status__iexact='Non-compliant') | Q(score__lt=F('benchmark')))
            .order_by('facility_name', '-date')
        )
        overdue_by_facility = {}
        for inspection in overdue:
            overdue_by_facility.setdefault(inspection.facility_name, inspection)
        if overdue_by_facility:
            add_alert(
                'overdue-corrective-actions',
                'warning',
                'Overdue Corrective Actions',
                f"{len(overdue_by_facility)} {'facility has' if len(overdue_by_facility) == 1 else 'facilities have'} unresolved non-compliance from over 30 days ago",
                ', '.join(f"{item.facility_name} ({item.date.isoformat()})" for item in overdue_by_facility.values()),
                len(overdue_by_facility),
            )

        repeat_offenders = (
            inspections
            .filter(Q(status__iexact='Non-compliant') | Q(score__lt=F('benchmark')))
            .values('facility_name')
            .annotate(non_compliant_count=Count('id'))
            .filter(non_compliant_count__gte=3)
            .order_by('-non_compliant_count')
        )
        repeat_offenders = list(repeat_offenders)
        if repeat_offenders:
            add_alert(
                'repeat-non-compliance',
                'critical',
                'Repeat Non-Compliance',
                f"{len(repeat_offenders)} {'facility has' if len(repeat_offenders) == 1 else 'facilities have'} repeated non-compliance (3+ occurrences)",
                ', '.join(f"{item['facility_name']} ({item['non_compliant_count']}x)" for item in repeat_offenders),
                len(repeat_offenders),
            )

        total = inspections.count()
        compliant = inspections.filter(status__iexact='Compliant').count()
        compliance_rate = round((compliant / total * 100), 1) if total else 0
        if 0 < compliance_rate < 60:
            add_alert(
                'low-overall-compliance',
                'warning',
                'Low Overall Compliance',
                f"Overall compliance rate is {compliance_rate}%, below the target of 80%",
                f"Current rate: {compliance_rate}% | Target: 80% | Inspections: {total}",
                None,
            )

        recent_cutoff = today - timedelta(days=7)
        recent_non_compliant = list(
            inspections
            .filter(date__gte=recent_cutoff)
            .filter(Q(status__iexact='Non-compliant') | Q(score__lt=F('benchmark')))
            .order_by('-date', 'facility_name')
        )
        if recent_non_compliant:
            add_alert(
                'recent-non-compliant',
                'info',
                'Recent Non-Compliant Inspections',
                f"{len(recent_non_compliant)} {'inspection' if len(recent_non_compliant) == 1 else 'inspections'} in the last 7 days resulted in non-compliance",
                ', '.join(f"{item.facility_name} (Score: {item.score}%)" for item in recent_non_compliant),
                len(recent_non_compliant),
            )

        pending_actions = inspections.filter(Q(status__iexact='Non-compliant') | Q(score__lt=70)).count()
        if pending_actions:
            add_alert(
                'pending-actions',
                'info',
                'Pending Actions Required',
                f"{pending_actions} {'action requires' if pending_actions == 1 else 'actions require'} follow-up",
                f"Review and address {pending_actions} non-compliant inspection records",
                pending_actions,
            )

        return JsonResponse({
            'alerts': alerts,
            'summary': {
                'critical': len([alert for alert in alerts if alert['type'] == 'critical']),
                'warning': len([alert for alert in alerts if alert['type'] == 'warning']),
                'info': len([alert for alert in alerts if alert['type'] == 'info']),
                'total': len(alerts),
                'inspection_count': total,
            }
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def summary_stats(request):
    """Get dashboard summary counts for the current filtered scope."""
    try:
        facilities = Facility.objects.all()
        inspections = official_inspections()

        level = request.GET.get('level')
        level_id = request.GET.get('id')

        if level == 'region' and level_id:
            facilities = facilities.filter(region_id=level_id)
            inspections = inspections.filter(facility__region_id=level_id)
        elif level == 'district' and level_id:
            facilities = facilities.filter(district_id=level_id)
            inspections = inspections.filter(facility__district_id=level_id)
        elif level == 'facility' and level_id:
            facilities = facilities.filter(id=level_id)
            inspections = inspections.filter(facility_id=level_id)

        month_start = datetime.now().date().replace(day=1)

        return JsonResponse({
            'total_facilities': facilities.count(),
            'active_inspectors': inspections.exclude(inspector='').values('inspector').distinct().count(),
            'this_month_inspections': inspections.filter(date__gte=month_start).count(),
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def department_performance(request):
    """Get department performance rankings"""
    try:
        data = (
            official_inspections()
            .values('department__name')
            .annotate(
                avg_score=Avg('score'),
                total_inspections=Count('id')
            )
            .filter(department__name__isnull=False)
            .order_by('-avg_score')
        )
        return JsonResponse(list(data), safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def district_comparison(request):
    """Get district comparison data"""
    try:
        data = (
            official_inspections()
            .values('facility__district__name')
            .annotate(
                avg_score=Avg('score'),
                total_inspections=Count('id'),
                compliant=Count('id', filter=Q(status='Compliant'))
            )
            .order_by('-avg_score')
        )
        return JsonResponse(list(data), safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def facility_ranking(request):
    """Get facility rankings by average score"""
    try:
        data = (
            official_inspections()
            .values('facility_name')
            .annotate(
                avg_score=Avg('score'),
                total_inspections=Count('id'),
                compliant=Count('id', filter=Q(status='Compliant'))
            )
            .order_by('-avg_score')
        )
        return JsonResponse(list(data), safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def inspection_timeline(request):
    """Get inspection timeline for Gantt chart"""
    try:
        data = []
        for inspection in official_inspections():
            data.append({
                'facility_name': inspection.facility_name,
                'department': inspection.department.name if inspection.department else 'N/A',
                'visit_type': inspection.visit_type,
                'start': inspection.start_date.isoformat() if inspection.start_date else inspection.date.isoformat(),
                'end': inspection.end_date.isoformat() if inspection.end_date else inspection.date.isoformat(),
                'status': inspection.status,
                'inspector': inspection.inspector,
                'score': inspection.score
            })
        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ============ GANTT CHART DATA ============

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def gantt_chart_data(request):
    """Get future inspection schedules for the planning Gantt chart."""
    try:
        schedules = (
            InspectionSchedule.objects
            .select_related('plan', 'facility', 'facility__district', 'facility__region', 'assigned_inspector')
            .filter(status__in=['scheduled', 'rescheduled', 'in_progress'])
            .order_by('scheduled_date', 'facility__name')
        )

        today = datetime.now().date()
        include_past = request.GET.get('include_past') == '1'
        if not include_past:
            schedules = schedules.filter(deadline__gte=today)

        facility_map = {}
        schedule_rows = []
        min_date = None
        max_date = None

        for schedule in schedules:
            item = _serialize_schedule(schedule)
            start_date = schedule.scheduled_date
            end_date = schedule.deadline or schedule.scheduled_date
            min_date = start_date if min_date is None or start_date < min_date else min_date
            max_date = end_date if max_date is None or end_date > max_date else max_date

            task = {
                'id': item['id'],
                'name': item['inspection_type_label'],
                'start': item['scheduled_date'],
                'end': item['end_date'],
                'status': item['status'],
                'assigned_to': item['assigned_inspector_name'],
                'assigned_inspector_id': item['assigned_inspector_id'],
                'inspection_type': item['inspection_type'],
                'inspection_type_label': item['inspection_type_label'],
                'progress': 0,
                'department': 'Planned Visit',
                'facility_id': item['facility_id'],
                'plan_id': item['plan_id'],
                'plan_title': item['plan_title'],
                'notes': item['notes'],
                'focus_standards': item['focus_standard_ids'],
            }

            if item['facility_id'] not in facility_map:
                facility_map[item['facility_id']] = {
                    'id': item['facility_id'],
                    'name': item['facility_name'],
                    'district': item['district'] or 'N/A',
                    'region': item['region'] or 'N/A',
                    'tasks': [],
                }
            facility_map[item['facility_id']]['tasks'].append(task)
            schedule_rows.append(item)

        plans = []
        for plan in InspectionPlan.objects.order_by('-start_date'):
            plans.append({
                'id': plan.id,
                'title': plan.title,
                'description': plan.description,
                'start_date': plan.start_date.isoformat(),
                'end_date': plan.end_date.isoformat(),
                'pre_inspection_deadline': plan.pre_inspection_deadline.isoformat(),
                'status': plan.status,
                'quarter': plan.quarter,
                'year': plan.year,
                'is_recurring': plan.is_recurring,
                'recurrence_pattern': plan.recurrence_pattern,
                'focus_standard_ids': plan.focus_standard_ids or [],
                'facility_ids': plan.facility_ids or [],
            })

        if min_date is None:
            min_date = today
            max_date = today + timedelta(days=90)

        return JsonResponse({
            'facilities': list(facility_map.values()),
            'plans': plans,
            'schedules': schedule_rows,
            'focus_areas': [],
            'timeline': {
                'min_date': min_date.isoformat(),
                'max_date': max_date.isoformat(),
                'total_days': (max_date - min_date).days if min_date and max_date else 0,
            },
        })
    except Exception as e:
        print(f"Error in gantt_chart_data: {e}")
        traceback.print_exc()
        return JsonResponse({'facilities': [], 'plans': [], 'schedules': [], 'focus_areas': [], 'timeline': {'min_date': '', 'max_date': '', 'total_days': 0}}, status=500)

# ============ INSPECTION LIST/CREATE ============

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def inspection_list_api(request):
    """Get all inspections with filtering"""
    try:
        queryset = official_inspections().select_related('department', 'facility')
        
        # Apply filters
        region_id = request.GET.get('region_id')
        district_id = request.GET.get('district_id')
        facility_id = request.GET.get('facility_id')
        
        if region_id:
            queryset = queryset.filter(facility__region_id=region_id)
        if district_id:
            queryset = queryset.filter(facility__district_id=district_id)
        if facility_id:
            queryset = queryset.filter(facility_id=facility_id)
        
        data = []
        for insp in queryset.order_by('-date', '-id'):
            data.append({
                'id': insp.id,
                'facility_name': insp.facility_name,
                'facility_id': insp.facility.id if insp.facility else None,
                'department': insp.department.name if insp.department else 'N/A',
                'department_id': insp.department.id if insp.department else None,
                'inspector': insp.inspector,
                'score': insp.score,
                'visit_type': insp.visit_type,
                'status': insp.status,
                'date': insp.date.isoformat(),
                'benchmark': insp.benchmark,
                'notes': insp.notes,
                'strengths': insp.strengths,
                'gaps_weaknesses': insp.gaps_weaknesses,
                'recommendations': insp.recommendations,
                'requires_followup': insp.requires_followup
            })
        
        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_inspection_api(request):
    """Create a new inspection"""
    try:
        data = json.loads(request.body)
        
        department_id = data.get('department_id')
        department = None
        if department_id:
            try:
                department = Department.objects.get(id=department_id)
            except Department.DoesNotExist:
                return JsonResponse({'error': 'Department not found'}, status=400)
        
        inspection = Inspection.objects.create(
            facility_name=data.get('facility_name', ''),
            department=department,
            inspector=data.get('inspector', ''),
            visit_type=data.get('visit_type', 'Baseline'),
            score=data.get('score', 0),
            max_score=data.get('max_score', 100),
            benchmark=data.get('benchmark', 80),
            notes=data.get('notes', ''),
            strengths=data.get('strengths', ''),
            gaps_weaknesses=data.get('gaps_weaknesses', ''),
            recommendations=data.get('recommendations', ''),
            start_date=data.get('start_date'),
            end_date=data.get('end_date'),
        )
        
        log_action(
            user=request.user,
            action='CREATE',
            model_name='Inspection',
            object_id=inspection.id,
            details=f'Created inspection for {inspection.facility_name}'
        )
        
        return JsonResponse({
            'success': True,
            'message': 'Inspection created successfully',
            'inspection_id': inspection.id,
            'score': inspection.score,
            'status': inspection.status
        }, status=201)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ============ CHART DATA ============

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def chart_data(request):
    """Get inspection data grouped by month for charts"""
    try:
        six_months_ago = datetime.now().date() - timedelta(days=180)
        
        inspections_by_month = (
            official_inspections()
            .filter(date__gte=six_months_ago)
            .annotate(month=TruncMonth('date'))
            .values('month')
            .annotate(
                inspections=Count('id'),
                compliant=Count('id', filter=Q(status='Compliant')),
                non_compliant=Count('id', filter=Q(status='Non-compliant'))
            )
            .order_by('month')
        )
        
        data = []
        for item in inspections_by_month:
            if item['month']:
                month_name = item['month'].strftime('%b')
                data.append({
                    'month': month_name,
                    'inspections': item['inspections'],
                    'compliant': item['compliant'],
                    'non_compliant': item['non_compliant']
                })
        
        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def compliance_trends(request):
    """Get compliance trends over time"""
    try:
        six_months_ago = datetime.now().date() - timedelta(days=180)
        
        monthly_data = (
            official_inspections()
            .filter(date__gte=six_months_ago)
            .annotate(month=TruncMonth('date'))
            .values('month')
            .annotate(
                total=Count('id'),
                compliant=Count('id', filter=Q(status='Compliant'))
            )
            .order_by('month')
        )
        
        data = []
        for item in monthly_data:
            if item['month']:
                month_name = item['month'].strftime('%b %Y')
                compliance_rate = round((item['compliant'] / item['total'] * 100), 1) if item['total'] > 0 else 0
                
                data.append({
                    'month': month_name,
                    'total': item['total'],
                    'compliant': item['compliant'],
                    'compliance_rate': compliance_rate
                })
        
        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse([], safe=False)


# ============ MCM CHECKLIST ENDPOINTS ============

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_inspection_types(request):
    """Get all MCM inspection types"""
    try:
        types = InspectionType.objects.filter(is_active=True)
        data = [{
            'id': t.id,
            'name': t.name,
            'description': t.description,
            'display_name': t.get_name_display()
        } for t in types]
        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_checklist_categories(request):
    """Get all checklist categories"""
    try:
        categories = ChecklistCategory.objects.all().order_by('order')
        data = [{
            'id': c.id,
            'name': c.name,
            'description': c.description,
            'order': c.order
        } for c in categories]
        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_checklist_items(request):
    """Get checklist items with optional filters"""
    try:
        queryset = ChecklistItem.objects.filter(is_active=True)
        
        category_id = request.GET.get('category')
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        
        facility_type = request.GET.get('facility_type')
        if facility_type == 'Public':
            queryset = queryset.filter(applies_to_public=True)
        elif facility_type == 'Private':
            queryset = queryset.filter(applies_to_private=True)
        
        inspection_type = request.GET.get('inspection_type')
        if inspection_type == 'INITIAL':
            queryset = queryset.filter(for_initial=True)
        elif inspection_type == 'ROUTINE':
            queryset = queryset.filter(for_routine=True)
        
        data = [{
            'id': item.id,
            'item_code': item.item_code,
            'description': item.description,
            'ideal_status': item.ideal_status,
            'category_id': item.category_id,
            'category_name': item.category.name
        } for item in queryset]
        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_inspection_with_checklist(request):
    """Submit an inspection with checklist answers"""
    try:
        data = json.loads(request.body)
        
        department = None
        department_id = data.get('department_id')
        if department_id:
            try:
                department = Department.objects.get(id=department_id)
            except Department.DoesNotExist:
                return JsonResponse({'error': 'Department not found'}, status=400)
        
        inspection = Inspection.objects.create(
            facility_name=data.get('facility_name', ''),
            department=department,
            inspector=data.get('inspector', ''),
            visit_type=data.get('visit_type', 'Baseline'),
            score=data.get('score', 0),
            max_score=data.get('max_score', 100),
            benchmark=data.get('benchmark', 80),
            notes=data.get('notes', ''),
            strengths=data.get('strengths', ''),
            gaps_weaknesses=data.get('gaps_weaknesses', ''),
            recommendations=data.get('recommendations', ''),
            start_date=data.get('start_date'),
            end_date=data.get('end_date'),
        )
        
        answers = data.get('answers', [])
        for answer in answers:
            checklist_item_id = answer.get('checklist_item_id')
            if checklist_item_id:
                try:
                    checklist_item = ChecklistItem.objects.get(id=checklist_item_id)
                    InspectionAnswer.objects.create(
                        inspection=inspection,
                        checklist_item=checklist_item,
                        result=answer.get('result', 'NON_COMPLIANT'),
                        inspector_notes=answer.get('notes', ''),
                        score_awarded=answer.get('score', 0),
                        max_score_possible=answer.get('max_score_possible', 1)
                    )
                except ChecklistItem.DoesNotExist:
                    continue
        
        return JsonResponse({
            'success': True,
            'inspection_id': inspection.id,
            'message': 'Inspection submitted successfully'
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    """Get current user info"""
    try:
        role = request.user.userrole.role.name
    except:
        role = 'inspector'
    
    return Response({
        'username': request.user.username,
        'role': role,
        'email': request.user.email,
        'first_name': request.user.first_name,
        'last_name': request.user.last_name
    })


def _inspection_issue_category(inspection):
    text = f"{inspection.gaps_weaknesses or ''} {inspection.recommendations or ''} {inspection.notes or ''}".lower()
    categories = [
        ('Documentation', ['document', 'record', 'file', 'credential', 'license', 'licence']),
        ('Infection Prevention', ['ipc', 'infection', 'waste', 'cleaning', 'segregation']),
        ('Equipment & Maintenance', ['equipment', 'maintenance', 'repair']),
        ('Medicines & Supplies', ['medicine', 'suppl', 'stock', 'pharmacy']),
        ('Staffing & Training', ['staff', 'training', 'cpd', 'professional']),
        ('Infrastructure & Signage', ['signage', 'room', 'infrastructure', 'patient flow']),
    ]
    for category, keywords in categories:
        if any(keyword in text for keyword in keywords):
            return category
    return 'General Compliance'


def _corrective_action_status(deadline, completed=False):
    if completed:
        return 'Completed'
    if deadline and deadline < datetime.now().date():
        return 'Overdue'
    return 'Pending'


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def corrective_actions(request):
    """Derive corrective actions from non-compliant inspections."""
    inspections = (
        official_inspections()
        .filter(Q(status='Non-compliant') | Q(score__lt=F('benchmark')))
        .select_related('facility', 'department', 'facility__district', 'facility__region', 'mcm_inspection_type')
        .order_by('-date', '-id')
    )

    region_id = request.GET.get('region_id')
    district_id = request.GET.get('district_id')
    facility_id = request.GET.get('facility_id')

    if region_id:
        inspections = inspections.filter(facility__region_id=region_id)
    if district_id:
        inspections = inspections.filter(facility__district_id=district_id)
    if facility_id:
        inspections = inspections.filter(facility_id=facility_id)

    actions = []
    for inspection in inspections:
        score = inspection.score or 0
        deadline = inspection.followup_date or (inspection.date + timedelta(days=30) if inspection.date else None)
        category = _inspection_issue_category(inspection)

        if inspection.suspension_recommended or score < 45:
            severity = 'Critical'
        elif score < 60:
            severity = 'High'
        else:
            severity = 'Medium'

        issue = inspection.gaps_weaknesses.strip() if inspection.gaps_weaknesses else f'{category} issue identified during inspection'
        recommendation = inspection.recommendations.strip() if inspection.recommendations else 'Prepare and submit a corrective action plan.'

        actions.append({
            'id': inspection.id,
            'inspection_id': inspection.id,
            'issue': issue,
            'category': category,
            'facility': inspection.facility_name or (inspection.facility.name if inspection.facility else 'Unknown Facility'),
            'facility_id': inspection.facility_id,
            'department': inspection.department.name if inspection.department else 'General',
            'department_id': inspection.department_id,
            'district': inspection.facility.district.name if inspection.facility and inspection.facility.district else None,
            'region': inspection.facility.region.name if inspection.facility and inspection.facility.region else None,
            'severity': severity,
            'deadline': deadline.isoformat() if deadline else None,
            'status': _corrective_action_status(deadline),
            'score': score,
            'inspection_date': inspection.date.isoformat() if inspection.date else None,
            'inspection_type': inspection.mcm_inspection_type.get_name_display() if inspection.mcm_inspection_type else inspection.visit_type,
            'inspector': inspection.inspector,
            'recommendation': recommendation,
            'requires_followup': inspection.requires_followup,
            'suspension_recommended': inspection.suspension_recommended,
            'comments': [],
        })

    return JsonResponse(actions, safe=False)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def schedule_options(request):
    inspectors = []
    for user in _inspector_users():
        name = user.get_full_name().strip() or user.username
        inspectors.append({'id': user.id, 'name': name, 'username': user.username})
    return JsonResponse({
        'inspectors': inspectors,
        'inspection_types': _inspection_type_options(),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_inspection_plan(request):
    try:
        data = json.loads(request.body or '{}')
        facility_ids = data.get('facility_ids') or []
        focus_standard_ids = data.get('focus_standard_ids') or []
        if not data.get('title'):
            return JsonResponse({'error': 'Plan title is required'}, status=400)
        if not facility_ids:
            return JsonResponse({'error': 'At least one facility is required'}, status=400)

        plan = InspectionPlan.objects.create(
            title=data.get('title', '').strip(),
            description=data.get('description', '').strip(),
            created_by=request.user,
            start_date=data.get('start_date'),
            end_date=data.get('end_date'),
            pre_inspection_deadline=data.get('pre_inspection_deadline') or data.get('end_date'),
            status=data.get('status', 'published'),
            focus_standard_ids=focus_standard_ids,
            facility_ids=facility_ids,
            quarter=data.get('quarter', 'Q1'),
            year=data.get('year') or datetime.now().year,
            is_recurring=data.get('is_recurring', False),
            recurrence_pattern=data.get('recurrence_pattern', 'quarterly'),
        )

        facilities = list(Facility.objects.filter(id__in=facility_ids).order_by('name'))
        inspectors = _inspector_users()
        start_date = datetime.strptime(data.get('start_date'), '%Y-%m-%d').date()
        end_date = datetime.strptime(data.get('end_date'), '%Y-%m-%d').date()
        span = max((end_date - start_date).days, 1)
        inspection_type = data.get('inspection_type') or 'ROUTINE'

        for index, facility in enumerate(facilities):
            scheduled_date = start_date + timedelta(days=min(index * max(span // max(len(facilities), 1), 1), span))
            inspector = inspectors[index % len(inspectors)] if inspectors else None
            InspectionSchedule.objects.create(
                plan=plan,
                facility=facility,
                assigned_inspector=inspector,
                scheduled_date=scheduled_date,
                deadline=min(scheduled_date + timedelta(days=1), end_date),
                focus_standard_ids=focus_standard_ids,
                status='scheduled',
                notes=_schedule_notes(data.get('notes', ''), inspection_type),
            )

        return JsonResponse({'success': True, 'id': plan.id, 'message': 'Inspection plan created successfully'}, status=201)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


def _facility_plan_status_to_model(status):
    return {
        'draft': 'draft',
        'active': 'published',
        'submitted': 'published',
        'completed': 'completed',
    }.get(status or 'draft', 'draft')


def _facility_plan_status_from_model(status):
    return {
        'draft': 'draft',
        'published': 'active',
        'in_progress': 'active',
        'completed': 'completed',
    }.get(status or 'draft', 'draft')


def _date_value(value):
    return value.isoformat() if hasattr(value, 'isoformat') else value


def _facility_plan_meta(plan):
    try:
        return json.loads(plan.description or '{}')
    except (TypeError, ValueError):
        return {
            'description': plan.description or '',
            'departments': [],
            'focal_person': '',
            'facility_plan': False,
        }


def _serialize_facility_plan(plan):
    meta = _facility_plan_meta(plan)
    department_ids = meta.get('departments') or []
    department_names = list(
        Department.objects
        .filter(id__in=department_ids)
        .order_by('name')
        .values_list('name', flat=True)
    )
    return {
        'id': plan.id,
        'title': plan.title,
        'description': meta.get('description', plan.description or ''),
        'departments': department_ids,
        'department_names': department_names,
        'preparation_date': _date_value(plan.start_date),
        'focal_person': meta.get('focal_person', ''),
        'status': meta.get('status') or _facility_plan_status_from_model(plan.status),
        'progress': 100 if plan.status == 'completed' else 50 if plan.status in ['published', 'in_progress'] else 0,
        'created_at': _date_value(plan.created_at),
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def facility_plans(request, facility_id):
    try:
        plans = []
        for plan in InspectionPlan.objects.order_by('-start_date', 'title'):
            meta = _facility_plan_meta(plan)
            if meta.get('facility_plan') and int(facility_id) in [int(fid) for fid in (plan.facility_ids or [])]:
                plans.append(_serialize_facility_plan(plan))
        return JsonResponse(plans, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_facility_plan(request):
    try:
        data = json.loads(request.body or '{}')
        facility_id = data.get('facility_id')
        department_ids = data.get('departments') or []
        preparation_date = data.get('preparation_date')

        if not data.get('title'):
            return JsonResponse({'error': 'Plan title is required'}, status=400)
        if not facility_id:
            return JsonResponse({'error': 'Facility is required'}, status=400)
        if not preparation_date:
            return JsonResponse({'error': 'Preparation date is required'}, status=400)
        if not department_ids:
            return JsonResponse({'error': 'At least one department is required'}, status=400)

        facility = get_object_or_404(Facility, id=facility_id)
        departments = Department.objects.filter(id__in=department_ids, facility=facility)
        if departments.count() != len(set(department_ids)):
            return JsonResponse({'error': 'One or more selected departments do not belong to this facility'}, status=400)

        meta = {
            'facility_plan': True,
            'description': data.get('description', '').strip(),
            'departments': department_ids,
            'focal_person': data.get('focal_person', '').strip(),
            'status': data.get('status', 'draft'),
        }
        plan = InspectionPlan.objects.create(
            title=data.get('title', '').strip(),
            description=json.dumps(meta),
            created_by=request.user,
            start_date=preparation_date,
            end_date=preparation_date,
            pre_inspection_deadline=preparation_date,
            status=_facility_plan_status_to_model(data.get('status')),
            focus_standard_ids=[],
            facility_ids=[facility.id],
            quarter=f"Q{((datetime.strptime(preparation_date, '%Y-%m-%d').date().month - 1) // 3) + 1}",
            year=datetime.strptime(preparation_date, '%Y-%m-%d').date().year,
            is_recurring=False,
            recurrence_pattern='none',
        )
        return JsonResponse({'success': True, 'plan': _serialize_facility_plan(plan)}, status=201)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
@api_view(['PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def facility_plan_detail(request, plan_id):
    try:
        plan = get_object_or_404(InspectionPlan, id=plan_id)
        if request.method == 'DELETE':
            plan.delete()
            return JsonResponse({'success': True, 'message': 'Plan deleted successfully'})

        data = json.loads(request.body or '{}')
        meta = _facility_plan_meta(plan)
        department_ids = data.get('departments', meta.get('departments') or [])
        preparation_date = data.get('preparation_date') or plan.start_date.isoformat()

        if 'title' in data:
            plan.title = data.get('title', '').strip()
        meta.update({
            'facility_plan': True,
            'description': data.get('description', meta.get('description', '')).strip(),
            'departments': department_ids,
            'focal_person': data.get('focal_person', meta.get('focal_person', '')).strip(),
            'status': data.get('status', meta.get('status', 'draft')),
        })
        plan.description = json.dumps(meta)
        plan.start_date = preparation_date
        plan.end_date = preparation_date
        plan.pre_inspection_deadline = preparation_date
        plan.status = _facility_plan_status_to_model(meta.get('status'))
        plan.save()
        return JsonResponse({'success': True, 'plan': _serialize_facility_plan(plan)})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_inspection_plan(request, plan_id):
    try:
        plan = get_object_or_404(InspectionPlan, id=plan_id)
        data = json.loads(request.body or '{}')
        for field in ['title', 'description', 'status', 'quarter', 'recurrence_pattern']:
            if field in data:
                setattr(plan, field, data[field])
        for field in ['start_date', 'end_date', 'pre_inspection_deadline']:
            if data.get(field):
                setattr(plan, field, data[field])
        if 'focus_standard_ids' in data:
            plan.focus_standard_ids = data.get('focus_standard_ids') or []
        if 'facility_ids' in data:
            plan.facility_ids = data.get('facility_ids') or []
        if 'year' in data:
            plan.year = data.get('year')
        if 'is_recurring' in data:
            plan.is_recurring = data.get('is_recurring')
        plan.save()
        return JsonResponse({'success': True, 'message': 'Inspection plan updated successfully'})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@api_view(['PATCH', 'PUT'])
@permission_classes([IsAuthenticated])
def update_inspection_schedule(request, schedule_id):
    try:
        schedule = get_object_or_404(InspectionSchedule, id=schedule_id)
        data = json.loads(request.body or '{}')
        if data.get('facility_id'):
            schedule.facility = get_object_or_404(Facility, id=data.get('facility_id'))
        if 'assigned_inspector_id' in data:
            inspector_id = data.get('assigned_inspector_id')
            schedule.assigned_inspector_id = inspector_id or None
        if data.get('scheduled_date'):
            schedule.scheduled_date = data.get('scheduled_date')
        if data.get('end_date') or data.get('deadline'):
            schedule.deadline = data.get('end_date') or data.get('deadline')
        if data.get('status'):
            schedule.status = data.get('status')
        if 'focus_standard_ids' in data:
            schedule.focus_standard_ids = data.get('focus_standard_ids') or []
        meta = _schedule_meta(schedule)
        notes = data.get('notes', meta.get('notes', ''))
        inspection_type = data.get('inspection_type', meta.get('inspection_type', 'ROUTINE'))
        schedule.notes = _schedule_notes(notes, inspection_type)
        schedule.save()
        return JsonResponse({'success': True, 'schedule': _serialize_schedule(schedule)})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)
def _pre_inspection_response(inspection):
    return {
        'id': inspection.id,
        'facility_id': inspection.facility_id,
        'facility_name': inspection.facility_name,
        'department_id': inspection.department_id,
        'department_name': inspection.department.name if inspection.department else 'General',
        'percentage': inspection.score,
        'total_score': inspection.score,
        'status': inspection.status,
        'submitted_at': inspection.date.isoformat() if inspection.date else None,
        'notes': inspection.notes,
    }


def _create_pre_inspection(request, facility_id):
    from standards.models import Requirement

    facility = get_object_or_404(Facility, id=facility_id)
    data = json.loads(request.body or '{}')
    answers = data.get('answers', {})

    department = None
    if data.get('department_id'):
        department = Department.objects.filter(id=data.get('department_id'), facility=facility).first()

    total_score = 0
    max_possible = 0

    for req_id, answer in answers.items():
        try:
            requirement = Requirement.objects.get(
                id=int(req_id),
                is_active=True,
                standard__is_active=True,
            )
        except (Requirement.DoesNotExist, TypeError, ValueError):
            continue

        total_score += int(answer.get('score') or 0)
        max_possible += int(answer.get('max_score_possible') or requirement.max_score or 0)

    percentage = int((total_score / max_possible) * 100) if max_possible else 0

    inspection = Inspection.objects.create(
        facility=facility,
        facility_name=facility.name,
        department=department,
        inspector=request.user.get_full_name() or request.user.username,
        visit_type='Observation',
        score=percentage,
        max_score=100,
        benchmark=80,
        notes='PRE_INSPECTION\n' + json.dumps({
            'department_id': data.get('department_id'),
            'answers': answers,
            'notes': data.get('notes', ''),
            'raw_score': total_score,
            'raw_max_score': max_possible,
        }),
    )

    return JsonResponse({
        'success': True,
        'message': 'Pre-inspection submitted successfully',
        **_pre_inspection_response(inspection),
    }, status=201)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def pre_inspection_detail(request, facility_id):
    if request.method == 'POST':
        return _create_pre_inspection(request, facility_id)

    facility = get_object_or_404(Facility, id=facility_id)
    inspection = (
        Inspection.objects
        .filter(facility=facility, notes__startswith='PRE_INSPECTION')
        .select_related('department', 'facility')
        .order_by('-id')
        .first()
    )

    if not inspection:
        return JsonResponse({
            'facility_id': facility.id,
            'facility_name': facility.name,
            'data': {},
        })

    return JsonResponse(_pre_inspection_response(inspection))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_pre_inspections(request):
    inspections = (
        Inspection.objects
        .filter(notes__startswith='PRE_INSPECTION')
        .select_related('department', 'facility')
        .order_by('-id')
    )
    return JsonResponse([_pre_inspection_response(inspection) for inspection in inspections], safe=False)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_pre_inspection(request, facility_id):
    return _create_pre_inspection(request, facility_id)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_standards(request):
    """Get standards from the standards app"""
    try:
        from standards.models import Standard, Requirement, ComplianceScale
        from standards.views import normalize_criteria
        
        facility_type_id = request.GET.get('facility_type_id')
        department_id = request.GET.get('department_type_id')
        
        standards = Standard.objects.filter(is_active=True)
        if facility_type_id:
            standards = standards.filter(Q(facility_type_id=facility_type_id) | Q(facility_type__isnull=True))
        
        data = []
        for standard in standards:
            requirements = standard.requirements.filter(is_active=True)
            if department_id:
                try:
                    dept_id = int(department_id)
                    requirements = requirements.filter(department_ids__contains=[dept_id])
                except (ValueError, TypeError):
                    pass
            
            req_data = []
            for req in requirements:
                criteria_data = normalize_criteria(req.criteria, req.max_score)
                req_data.append({
                    'id': req.id,
                    'name': req.name,
                    'description': req.description or '',
                    'max_score': req.max_score,
                    'order': req.order,
                    'is_active': req.is_active,
                    'criteria': criteria_data,
                    'criteria_items': criteria_data['items'],
                    'department_ids': req.department_ids or []
                })
            
            data.append({
                'id': standard.id,
                'code': standard.code,
                'name': standard.name,
                'description': standard.description,
                'order': standard.order,
                'max_score': standard.max_score,
                'is_active': standard.is_active,
                'requirements': req_data
            })
        
        return JsonResponse(data, safe=False)
    except ImportError:
        return JsonResponse([], safe=False)








