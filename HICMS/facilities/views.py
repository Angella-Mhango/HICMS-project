from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
import json
from .models import Facility, Department, Region, District, FacilityType


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_facilities(request):
    """Get all facilities with department counts"""
    facilities = Facility.objects.select_related('facility_type', 'district', 'region').prefetch_related('departments')
    
    data = []
    for facility in facilities:
        facility_type_name = facility.facility_type.name if facility.facility_type else None
        district_name = facility.district.name if facility.district else None
        region_name = facility.region.name if facility.region else None
        
        data.append({
            "id": facility.id,
            "name": facility.name,
            "facility_type": facility_type_name,
            "facility_type_id": facility.facility_type.id if facility.facility_type else None,
            "district": district_name,
            "district_id": facility.district.id if facility.district else None,
            "region": region_name,
            "region_id": facility.region.id if facility.region else None,
            "department_count": facility.departments.count(),
            "created_at": facility.created_at,
            "updated_at": facility.updated_at
        })
    
    return JsonResponse(data, safe=False)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_facility(request, facility_id):
    """Get one facility with the same shape as the facilities list."""
    try:
        facility = Facility.objects.prefetch_related('departments').get(id=facility_id)
    except Facility.DoesNotExist:
        return JsonResponse({"error": "Facility not found"}, status=404)

    return JsonResponse({
        "id": facility.id,
        "name": facility.name,
        "facility_type": facility.facility_type.name if facility.facility_type else None,
        "facility_type_id": facility.facility_type.id if facility.facility_type else None,
        "district": facility.district.name if facility.district else None,
        "district_id": facility.district.id if facility.district else None,
        "region": facility.region.name if facility.region else None,
        "region_id": facility.region.id if facility.region else None,
        "department_count": facility.departments.count(),
        "created_at": facility.created_at,
        "updated_at": facility.updated_at,
    })


@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_facility(request):
    """Create a new facility"""
    try:
        data = json.loads(request.body)
        
        name = data.get('name')
        facility_type_name = data.get('facility_type')
        district_name = data.get('district')
        region_name = data.get('region')
        
        if not name:
            return JsonResponse({"error": "Facility name is required"}, status=400)
        
        # Get or create facility type
        facility_type = None
        if facility_type_name:
            facility_type, _ = FacilityType.objects.get_or_create(name=facility_type_name)
        
        # Get or create region
        region = None
        if region_name:
            region, _ = Region.objects.get_or_create(name=region_name)
        
        # Get or create district
        district = None
        if district_name and region:
            district, _ = District.objects.get_or_create(name=district_name, region=region)
        
        facility = Facility.objects.create(
            name=name,
            facility_type=facility_type,
            district=district,
            region=region
        )
        
        return JsonResponse({
            "success": True,
            "message": "Facility created successfully",
            "facility": {
                "id": facility.id,
                "name": facility.name,
                "facility_type": facility.facility_type.name if facility.facility_type else None,
                "district": facility.district.name if facility.district else None,
                "region": facility.region.name if facility.region else None,
                "department_count": 0
            }
        }, status=201)
        
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_facility_departments(request, facility_id):
    """Get departments for a specific facility"""
    try:
        facility = Facility.objects.get(id=facility_id)
        departments = Department.objects.filter(facility=facility).values('id', 'name')
        
        return JsonResponse({
            "id": facility.id,
            "name": facility.name,
            "facility_type": facility.facility_type.name if facility.facility_type else None,
            "district": facility.district.name if facility.district else None,
            "region": facility.region.name if facility.region else None,
            "department_count": departments.count(),
            "departments": list(departments)
        })
        
    except Facility.DoesNotExist:
        return JsonResponse({"error": "Facility not found"}, status=404)


@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_department(request):
    """Create a new department"""
    try:
        data = json.loads(request.body)
        
        facility_id = data.get('facility_id')
        department_name = data.get('name')
        
        if not facility_id or not department_name:
            return JsonResponse({"error": "Facility ID and department name are required"}, status=400)
        
        try:
            facility = Facility.objects.get(id=facility_id)
        except Facility.DoesNotExist:
            return JsonResponse({"error": "Facility not found"}, status=404)
        
        # Check if department already exists in this facility
        if Department.objects.filter(facility=facility, name=department_name).exists():
            return JsonResponse({"error": "Department already exists in this facility"}, status=400)
        
        department = Department.objects.create(
            facility=facility,
            name=department_name
        )
        
        return JsonResponse({
            "success": True,
            "message": "Department created successfully",
            "department": {
                "id": department.id,
                "name": department.name,
                "facility_id": department.facility.id,
                "facility_name": department.facility.name
            }
        }, status=201)
        
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_regions(request):
    """Get all regions"""
    regions = Region.objects.all().values('id', 'name', 'code')
    return JsonResponse(list(regions), safe=False)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_districts_by_region(request, region_id):
    """Get districts for a specific region"""
    try:
        districts = District.objects.filter(region_id=region_id).values('id', 'name', 'code', 'region_id')
        return JsonResponse(list(districts), safe=False)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_district(request):
    """Create a district under an existing region."""
    try:
        data = json.loads(request.body)
        name = (data.get('name') or '').strip()
        region_id = data.get('region_id')

        if not name or not region_id:
            return JsonResponse({"error": "District name and region are required"}, status=400)

        try:
            region = Region.objects.get(id=region_id)
        except Region.DoesNotExist:
            return JsonResponse({"error": "Region not found"}, status=404)

        if District.objects.filter(name__iexact=name, region=region).exists():
            return JsonResponse({"error": "District already exists in this region"}, status=400)

        district = District.objects.create(name=name, region=region)
        return JsonResponse({
            "success": True,
            "district": {
                "id": district.id,
                "name": district.name,
                "code": district.code,
                "region_id": region.id,
                "region_name": region.name,
            }
        }, status=201)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_facilities_by_district(request, district_id):
    """Get facilities for a specific district"""
    try:
        facilities = Facility.objects.filter(district_id=district_id).select_related('facility_type', 'district', 'region')
        data = []
        for facility in facilities:
            data.append({
                "id": facility.id,
                "name": facility.name,
                "facility_type": facility.facility_type.name if facility.facility_type else None,
                "facility_type_id": facility.facility_type_id,
                "district": facility.district.name if facility.district else None,
                "district_id": facility.district_id,
                "region": facility.region.name if facility.region else None,
                "region_id": facility.region_id,
                "department_count": facility.departments.count(),
            })
        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)
