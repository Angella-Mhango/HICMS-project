from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from .models import (
    Standard, 
    Requirement, 
    ComplianceScale, 
    FacilityType, 
    InspectionType, 
    Department,
)
import json


def normalize_criteria(criteria, max_score=5):
    if criteria is None:
        criteria_data = {'items': []}
    elif isinstance(criteria, list):
        criteria_data = {'items': criteria}
    elif isinstance(criteria, dict):
        criteria_data = dict(criteria)
        if not isinstance(criteria_data.get('items'), list):
            criteria_data['items'] = []
    else:
        criteria_data = {'items': []}

    if 'max_score' not in criteria_data:
        criteria_data['max_score'] = max_score

    items = []
    for index, item in enumerate(criteria_data['items']):
        if isinstance(item, dict):
            items.append({
                'name': item.get('name') or '',
                'description': item.get('description', ''),
                'points': item.get('points', 1),
                'order': item.get('order', index + 1),
            })
        else:
            items.append({
                'name': str(item),
                'description': '',
                'points': 1,
                'order': index + 1,
            })

    criteria_data['items'] = [item for item in items if item['name']]
    return criteria_data



def _norm(value):
    return ''.join(ch for ch in (value or '').lower() if ch.isalnum())


def _resolve_standard_facility_type_ids(facility_id=None, facility_type_name=None):
    """Map a facility DB type/category to standards facility categories."""
    name = facility_type_name or ''

    if facility_id:
        try:
            from facilities.models import Facility
            facility = Facility.objects.select_related('facility_type').get(id=facility_id)
            name = facility.facility_type.name if facility.facility_type else name
        except Exception:
            pass

    normalized = _norm(name)
    queryset = FacilityType.objects.filter(is_active=True)

    if not normalized:
        return []
    if 'private' in normalized:
        return list(queryset.filter(name__icontains='Private').values_list('id', flat=True))
    if 'public' in normalized:
        return list(queryset.exclude(name__icontains='Private').values_list('id', flat=True))

    exact_ids = list(queryset.filter(name__iexact=name).values_list('id', flat=True))
    if exact_ids:
        return exact_ids

    return list(queryset.filter(name__icontains=name).values_list('id', flat=True))


def _resolve_standard_department_ids(department_id=None, department_name=None):
    """Map a facility department row to standards department types."""
    name = department_name or ''

    if department_id:
        try:
            from facilities.models import Department as FacilityDepartment
            department = FacilityDepartment.objects.get(id=department_id)
            name = department.name
        except Exception:
            pass

    normalized = _norm(name)
    departments = list(Department.objects.filter(is_active=True))
    matched = []

    alias_map = {
        'opd': ['outpatient', 'outpatientdepartment', 'opd'],
        'phm': ['pharmacy', 'dispensarypharmacy'],
        'lab': ['laboratory', 'lab'],
        'mat': ['maternity', 'antenatal', 'postnatal', 'labour', 'delivery'],
        'den': ['dental', 'oral'],
        'epi': ['epi', 'immunization', 'immunisation'],
        'adm': ['administration', 'admin'],
        'rec': ['records', 'medicalrecords', 'registry'],
        'emg': ['emergency', 'casualty'],
        'sur': ['surgery', 'theatre', 'operatingtheatre'],
        'mwd': ['maleward'],
        'fwd': ['femaleward'],
        'pwd': ['paediatric', 'pediatric'],
        'pnw': ['postnatal'],
        'swd': ['surgicalward'],
    }

    for department in departments:
        dept_norm = _norm(department.name)
        code_norm = _norm(department.code)
        if normalized and (normalized == dept_norm or normalized == code_norm or normalized in dept_norm or dept_norm in normalized):
            matched.append(department.id)
            continue
        aliases = alias_map.get(code_norm, [])
        if normalized and any(alias in normalized for alias in aliases):
            matched.append(department.id)

    all_department = next((department.id for department in departments if _norm(department.name) == 'alldepartments'), None)
    if all_department and all_department not in matched:
        matched.append(all_department)

    return matched


def _filter_standards_queryset(request):
    facility_id = request.GET.get('facility_id')
    facility_type_name = request.GET.get('facility_type_name')
    legacy_facility_type_id = request.GET.get('facility_type_id')
    inspection_type_id = request.GET.get('inspection_type_id')

    standards = Standard.objects.filter(is_active=True)
    base_standards = standards

    facility_type_ids = _resolve_standard_facility_type_ids(facility_id, facility_type_name)
    if facility_type_ids:
        standards = standards.filter(Q(facility_type_id__in=facility_type_ids) | Q(facility_type__isnull=True))
    elif legacy_facility_type_id:
        standards = standards.filter(Q(facility_type_id=legacy_facility_type_id) | Q(facility_type__isnull=True))

    if inspection_type_id:
        standards = standards.filter(Q(inspection_type_id=inspection_type_id) | Q(inspection_type__isnull=True))

    if (facility_type_ids or legacy_facility_type_id or facility_id or facility_type_name) and not standards.exists():
        standards = base_standards
        if inspection_type_id:
            standards = standards.filter(Q(inspection_type_id=inspection_type_id) | Q(inspection_type__isnull=True))

    return standards


def _filter_requirements_for_department(requirements, department_ids):
    if not department_ids:
        return requirements

    filtered = []
    for requirement in requirements:
        req_department_ids = requirement.department_ids or []
        standard_department_ids = requirement.standard.department_ids or []
        standard_department_type_id = requirement.standard.department_type_id
        applies_to_all = not req_department_ids and not standard_department_ids and not standard_department_type_id

        if applies_to_all:
            filtered.append(requirement)
            continue
        if standard_department_type_id and standard_department_type_id in department_ids:
            filtered.append(requirement)
            continue
        if any(dept_id in department_ids for dept_id in req_department_ids):
            filtered.append(requirement)
            continue
        if any(dept_id in department_ids for dept_id in standard_department_ids):
            filtered.append(requirement)

    return filtered
def is_admin_user(user):
    try:
        role_name = user.userrole.role.name.lower()
        return role_name in ['admin', 'national_admin', 'national admin']
    except:
        return False


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_facility_types(request):
    facility_types = FacilityType.objects.filter(is_active=True)
    data = [{'id': ft.id, 'name': ft.name, 'code': ft.code} for ft in facility_types]
    return JsonResponse(data, safe=False)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_inspection_types(request):
    inspection_types = InspectionType.objects.filter(is_active=True)
    data = [{'id': it.id, 'name': it.name, 'code': it.code} for it in inspection_types]
    return JsonResponse(data, safe=False)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_departments(request):
    try:
        departments = Department.objects.filter(is_active=True)
        data = [{
            'id': d.id,
            'name': d.name,
            'code': d.code,
            'facility_types': [ft.id for ft in d.facility_types.all()]
        } for d in departments]
        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def preview_standard_code(request):
    try:
        data = json.loads(request.body)
        facility_type_id = data.get('facility_type_id')
        inspection_type_id = data.get('inspection_type_id')
        department_id = data.get('department_type_id')
        
        if not all([facility_type_id, inspection_type_id, department_id]):
            return JsonResponse({'preview_code': None})
        
        facility_type = FacilityType.objects.get(id=facility_type_id)
        inspection_type = InspectionType.objects.get(id=inspection_type_id)
        department = Department.objects.get(id=department_id)
        
        ft_code = facility_type.code
        dept_code = department.code
        it_code = inspection_type.code
        prefix = f"{ft_code}-{dept_code}-{it_code}"
        count = Standard.objects.filter(code__startswith=prefix).count() + 1
        number = str(count).zfill(3)
        
        return JsonResponse({
            'preview_code': f"{prefix}-{number}",
            'prefix': prefix,
            'next_number': count
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_standards_list(request):
    department_id = request.GET.get('department_id') or request.GET.get('department_type_id')
    department_name = request.GET.get('department_name')
    department_ids = _resolve_standard_department_ids(department_id, department_name)

    standards = _filter_standards_queryset(request).prefetch_related('requirements')

    data = []
    for standard in standards:
        requirements = _filter_requirements_for_department(
            list(standard.requirements.filter(is_active=True)),
            department_ids,
        )

        standard_data = {
            'id': standard.id,
            'code': standard.code,
            'name': standard.name,
            'description': standard.description,
            'order': standard.order,
            'max_score': standard.max_score,
            'is_active': standard.is_active,
            'facility_type_id': standard.facility_type_id,
            'inspection_type_id': standard.inspection_type_id,
            'department_type_id': standard.department_type_id,
            'department_ids': standard.department_ids or [],
            'requirements': []
        }

        for req in requirements:
            scales = ComplianceScale.objects.all().order_by('score')
            criteria_data = normalize_criteria(req.criteria, req.max_score)

            standard_data['requirements'].append({
                'id': req.id,
                'name': req.name,
                'description': req.description or req.name,
                'scale_min': 0,
                'scale_max': req.max_score,
                'scale_labels': {
                    scale.score: scale.level
                    for scale in scales
                    if scale.score <= req.max_score
                },
                'criteria': criteria_data,
                'criteria_items': criteria_data['items'],
                'max_score': req.max_score,
                'is_active': req.is_active,
                'weight': 1.0,
                'department_ids': req.department_ids or []
            })

        if standard_data['requirements']:
            data.append(standard_data)

    data.sort(key=lambda x: x['order'])
    return JsonResponse(data, safe=False)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_compliance_scales(request):
    scales = ComplianceScale.objects.all().order_by('order', 'score')
    data = [{
        'id': s.id,
        'level': s.level,
        'score': s.score,
        'description': s.description,
        'color': s.color
    } for s in scales]
    return JsonResponse(data, safe=False)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_standard_inspection(request):
    try:
        data = json.loads(request.body)
        
        required_fields = ['facility_name', 'responses']
        for field in required_fields:
            if field not in data:
                return JsonResponse({"error": f"Missing required field: {field}"}, status=400)
        
        if not data['responses'] or len(data['responses']) == 0:
            return JsonResponse({"error": "No responses provided"}, status=400)
        
        for idx, resp in enumerate(data['responses']):
            if 'requirement_id' not in resp:
                return JsonResponse({"error": f"Response {idx} missing requirement_id"}, status=400)
            if 'score' not in resp:
                return JsonResponse({"error": f"Response {idx} missing score"}, status=400)
            
            try:
                requirement = Requirement.objects.get(
                    id=resp['requirement_id'],
                    is_active=True,
                    standard__is_active=True,
                )
                possible_score = int(resp.get('max_score_possible') or requirement.max_score or 0)
                if possible_score <= 0:
                    return JsonResponse({
                        "error": f"Requirement {requirement.id} has no possible score configured"
                    }, status=400)
                if resp['score'] < 0 or resp['score'] > possible_score:
                    return JsonResponse({
                        "error": f"Score for requirement {requirement.id} must be between 0 and {possible_score}"
                    }, status=400)
            except Requirement.DoesNotExist:
                return JsonResponse({"error": f"Requirement {resp['requirement_id']} is archived or not found"}, status=400)
        
        from facilities.models import Department as FacilityDepartment, Facility
        facility = None
        if data.get('facility_id'):
            facility = Facility.objects.filter(id=data.get('facility_id')).first()

        department = None
        if data.get('department_id'):
            try:
                department = FacilityDepartment.objects.get(id=data['department_id'])
            except FacilityDepartment.DoesNotExist:
                pass

        notes = data.get('notes', '') or ''
        if data.get('inspection_type_id'):
            notes = f"{notes}\nINSPECTION_TYPE_ID={data.get('inspection_type_id')}".strip()

        from inspections.models import Inspection
        inspection = Inspection.objects.create(
            facility=facility,
            facility_name=data.get('facility_name') or (facility.name if facility else ''),
            department=department,
            inspector=data.get('inspector', ''),
            visit_type=data.get('visit_type', 'Follow-up'),
            score=0,
            max_score=100,
            benchmark=80,
            notes=notes,
            strengths=data.get('strengths', ''),
            gaps_weaknesses=data.get('gaps_weaknesses', ''),
            recommendations=data.get('recommendations', ''),
            start_date=data.get('start_date'),
            end_date=data.get('end_date'),
        )
        total_score = 0
        max_possible = 0
        standard_totals = {}
        
        for resp_data in data['responses']:
            requirement = Requirement.objects.get(
                id=resp_data['requirement_id'],
                is_active=True,
                standard__is_active=True,
            )
            possible_score = int(resp_data.get('max_score_possible') or requirement.max_score or 0)
            total_score += int(resp_data['score'])
            max_possible += possible_score
            standard = requirement.standard
            standard_total = standard_totals.setdefault(standard.id, {
                'id': standard.id,
                'code': standard.code,
                'name': standard.name,
                'score': 0,
                'possible': 0,
            })
            standard_total['score'] += int(resp_data['score'])
            standard_total['possible'] += possible_score
        
        percentage_score = int((total_score / max_possible) * 100) if max_possible > 0 else 0
        inspection.score = percentage_score
        # Keep a durable, per-inspection standards snapshot in an existing column.
        # This avoids blocking inspection submission on an unapplied schema migration.
        inspection.notes = f"{notes}\nSTANDARD_PERFORMANCE={json.dumps(list(standard_totals.values()))}".strip()
        inspection.save()
        
        return JsonResponse({
            "success": True,
            "inspection_id": inspection.id,
            "score": percentage_score,
            "status": "Compliant" if percentage_score >= inspection.benchmark else "Non-compliant",
            "message": "Inspection submitted successfully"
        }, status=201)
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_standards_admin(request):
    if not is_admin_user(request.user):
        return JsonResponse({"error": "Admin access required"}, status=403)
    
    standards = Standard.objects.all().select_related(
        'facility_type', 'inspection_type'
    ).prefetch_related('requirements')
    
    data = []
    for standard in standards:
        standard_data = {
            'id': standard.id,
            'code': standard.code,
            'name': standard.name,
            'description': standard.description or '',
            'ideal_status': standard.ideal_status or '',
            'category': standard.category,
            'max_score': standard.max_score,
            'order': standard.order,
            'is_active': standard.is_active,
            'facility_type': {
                'id': standard.facility_type.id,
                'name': standard.facility_type.name,
                'code': standard.facility_type.code
            } if standard.facility_type else None,
            'inspection_type': {
                'id': standard.inspection_type.id,
                'name': standard.inspection_type.name,
                'code': standard.inspection_type.code
            } if standard.inspection_type else None,
            'requirements': []
        }
        
        for req in standard.requirements.all():
            criteria_data = normalize_criteria(req.criteria, req.max_score)
            
            standard_data['requirements'].append({
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
        
        data.append(standard_data)
    
    return JsonResponse(data, safe=False)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_standard(request):
    if not is_admin_user(request.user):
        return JsonResponse({"error": "Admin access required"}, status=403)
    
    try:
        data = json.loads(request.body)
        
        required = ['name', 'facility_type_id', 'inspection_type_id']
        for field in required:
            if not data.get(field):
                return JsonResponse({"error": f"{field} is required"}, status=400)
        
        facility_type = get_object_or_404(FacilityType, id=data['facility_type_id'])
        inspection_type = get_object_or_404(InspectionType, id=data['inspection_type_id'])
        
        from django.db import IntegrityError
        
        ft_code = facility_type.code or "FT"
        it_code = inspection_type.code or "IT"
        prefix = f"{ft_code}-{it_code}"
        
        existing_codes = Standard.objects.filter(code__startswith=prefix).values_list('code', flat=True)
        existing_numbers = []
        for code in existing_codes:
            try:
                parts = code.split('-')
                if len(parts) >= 3:
                    num = int(parts[-1])
                    existing_numbers.append(num)
            except (ValueError, IndexError):
                continue
        
        if existing_numbers:
            next_number = max(existing_numbers) + 1
        else:
            next_number = 1
        
        code = f"{prefix}-{str(next_number).zfill(3)}"
        
        standard = Standard.objects.create(
            name=data['name'].strip(),
            description=data.get('description', '').strip(),
            ideal_status=data.get('ideal_status', '').strip(),
            category=data.get('category', 'general'),
            facility_type=facility_type,
            inspection_type=inspection_type,
            max_score=int(data.get('max_score', 5)),
            order=int(data.get('order', 0)),
            is_active=data.get('is_active', True),
            code=code
        )
        
        return JsonResponse({
            "success": True,
            "id": standard.id,
            "code": standard.code,
            "message": f"Standard '{standard.code}' created successfully"
        }, status=201)
        
    except IntegrityError:
        try:
            import random
            code = f"{prefix}-{str(random.randint(1, 999)).zfill(3)}"
            standard = Standard.objects.create(
                name=data['name'].strip(),
                description=data.get('description', '').strip(),
                ideal_status=data.get('ideal_status', '').strip(),
                category=data.get('category', 'general'),
                facility_type=facility_type,
                inspection_type=inspection_type,
                max_score=int(data.get('max_score', 5)),
                order=int(data.get('order', 0)),
                is_active=data.get('is_active', True),
                code=code
            )
            return JsonResponse({
                "success": True,
                "id": standard.id,
                "code": standard.code,
                "message": f"Standard '{standard.code}' created successfully"
            }, status=201)
        except:
            return JsonResponse({"error": "Could not generate a unique code. Please try again."}, status=400)
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_standard(request, standard_id):
    if not is_admin_user(request.user):
        return JsonResponse({"error": "Admin access required"}, status=403)
    
    try:
        standard = get_object_or_404(Standard, id=standard_id)
        data = json.loads(request.body)
        
        if data.get('name'):
            standard.name = data['name'].strip()
        if data.get('description') is not None:
            standard.description = data['description'].strip()
        if data.get('ideal_status') is not None:
            standard.ideal_status = data['ideal_status'].strip()
        if data.get('category'):
            standard.category = data['category']
        if data.get('max_score') is not None:
            standard.max_score = int(data['max_score'])
        if data.get('order') is not None:
            standard.order = int(data['order'])
        if data.get('is_active') is not None:
            standard.is_active = data['is_active']
        
        if data.get('facility_type_id'):
            standard.facility_type = get_object_or_404(FacilityType, id=data['facility_type_id'])
        if data.get('inspection_type_id'):
            standard.inspection_type = get_object_or_404(InspectionType, id=data['inspection_type_id'])
        
        standard.save()
        
        return JsonResponse({
            "success": True,
            "message": f"Standard '{standard.code}' updated successfully"
        })
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def archive_standard(request, standard_id):
    if not is_admin_user(request.user):
        return JsonResponse({"error": "Admin access required"}, status=403)
    
    try:
        standard = get_object_or_404(Standard, id=standard_id)
        standard.is_active = not standard.is_active
        standard.save()
        
        return JsonResponse({
            "success": True,
            "is_active": standard.is_active,
            "message": f"Standard '{standard.code}' {'activated' if standard.is_active else 'archived'} successfully"
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_requirement(request):
    if not is_admin_user(request.user):
        return JsonResponse({"error": "Admin access required"}, status=403)
    
    try:
        data = json.loads(request.body)
        
        if not data.get('name'):
            return JsonResponse({"error": "Requirement name is required"}, status=400)
        if not data.get('standard_id'):
            return JsonResponse({"error": "standard_id is required"}, status=400)
        
        standard = get_object_or_404(Standard, id=data['standard_id'])
        
        requirement = Requirement.objects.create(
            standard=standard,
            name=data['name'].strip(),
            description=data.get('description', '').strip(),
            max_score=int(data.get('max_score', 5)),
            order=int(data.get('order', 0)),
            is_active=data.get('is_active', True),
            criteria=data.get('criteria', {'items': []}),
            department_ids=data.get('department_ids', [])
        )
        
        return JsonResponse({
            "success": True,
            "id": requirement.id,
            "message": f"Requirement '{requirement.name}' created successfully"
        }, status=201)
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_requirement(request, requirement_id):
    if not is_admin_user(request.user):
        return JsonResponse({"error": "Admin access required"}, status=403)
    
    try:
        requirement = get_object_or_404(Requirement, id=requirement_id)
        data = json.loads(request.body)
        
        if data.get('name'):
            requirement.name = data['name'].strip()
        if data.get('description') is not None:
            requirement.description = data['description'].strip()
        if data.get('max_score') is not None:
            requirement.max_score = int(data['max_score'])
        if data.get('order') is not None:
            requirement.order = int(data['order'])
        if data.get('is_active') is not None:
            requirement.is_active = data['is_active']
        if 'criteria' in data:
            criteria = data['criteria'] or {}
            if not isinstance(criteria, dict):
                criteria = {}
            if 'items' not in criteria:
                criteria['items'] = []
            if not isinstance(criteria['items'], list):
                criteria['items'] = []
            requirement.criteria = criteria
        if 'department_ids' in data:
            requirement.department_ids = data['department_ids']
        
        requirement.save()
        
        return JsonResponse({
            "success": True,
            "message": f"Requirement '{requirement.name}' updated successfully"
        })
        
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def archive_requirement(request, requirement_id):
    if not is_admin_user(request.user):
        return JsonResponse({"error": "Admin access required"}, status=403)
    
    try:
        requirement = get_object_or_404(Requirement, id=requirement_id)
        requirement.is_active = not requirement.is_active
        requirement.save()
        
        return JsonResponse({
            "success": True,
            "is_active": requirement.is_active,
            "message": f"Requirement '{requirement.name}' {'activated' if requirement.is_active else 'archived'} successfully"
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)





