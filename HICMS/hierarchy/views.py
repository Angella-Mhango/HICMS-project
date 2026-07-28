import json

from django.contrib.auth.models import User
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from accounts.models import Role, UserRole
from facilities.models import District, Facility, Region


ADMIN_ROLES = {"admin", "national_admin", "regional_admin", "district_admin", "facility_admin"}
NATIONAL_ROLES = {"admin", "national_admin", "national_inspector"}
FACILITY_USERNAME_MAP = {
    "facility_kch": "Kamuzu Central Hospital",
    "qa_kch": "Kamuzu Central Hospital",
    "facility_qech": "Queen Elizabeth Central Hospital",
    "qa_qech": "Queen Elizabeth Central Hospital",
    "facility_mzuzu": "Mzuzu Central Hospital",
    "qa_mzuzu": "Mzuzu Central Hospital",
    "facility_karonga": "Karonga District Hospital",
    "qa_karonga": "Karonga District Hospital",
}
REGION_USERNAME_MAP = {
    "regional_central": "Central Region",
    "regional_northern": "Northern Region",
    "regional_southern": "Southern Region",
}


def _role_name(user):
    try:
        return user.userrole.role.name
    except Exception:
        return "Inspector"


def _facility_for_user(user):
    try:
        if user.userrole.facility:
            return user.userrole.facility
    except Exception:
        pass

    facility_name = FACILITY_USERNAME_MAP.get(user.username.lower())
    if facility_name:
        return Facility.objects.select_related("district", "region").filter(name__iexact=facility_name).first()
    return None


def _district_for_username(username):
    key = username.lower()
    for prefix in ("district_", "supervisor_"):
        if key.startswith(prefix):
            district_name = key.removeprefix(prefix).replace("_", " ")
            return District.objects.select_related("region").filter(name__iexact=district_name).first()
    return None


def _region_for_username(username):
    region_name = REGION_USERNAME_MAP.get(username.lower())
    if not region_name:
        return None
    return Region.objects.filter(name__iexact=region_name).first()


def _scope_for_user(user):
    role = _role_name(user).lower()
    facility = _facility_for_user(user)
    district = facility.district if facility and facility.district else _district_for_username(user.username)
    region = (
        facility.region
        if facility and facility.region
        else district.region if district and district.region
        else _region_for_username(user.username)
    )

    if role in NATIONAL_ROLES:
        level = "national"
    elif role == "regional_admin":
        level = "regional"
    elif role in {"district_admin", "district_supervisor"}:
        level = "district"
    elif role in {"facility_admin", "facility_qa"}:
        level = "facility"
    else:
        level = "facility" if facility else None

    return {
        "level": level,
        "facility": facility,
        "district": district,
        "region": region,
        "role": role,
    }


def _scope_obj(obj):
    return {"id": obj.id, "name": obj.name} if obj else None


def _user_payload(user):
    scope = _scope_for_user(user)
    facility = scope["facility"]
    district = scope["district"]
    region = scope["region"]
    return {
        "id": user.id,
        "user_id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": _role_name(user),
        "hierarchy_level": scope["level"],
        "hierarchy_display": scope["level"].title() if scope["level"] else "Standard",
        "level": scope["level"],
        "region": region.name if region else None,
        "region_id": region.id if region else None,
        "district": district.name if district else None,
        "district_id": district.id if district else None,
        "facility": facility.name if facility else None,
        "facility_id": facility.id if facility else None,
        "has_hierarchy": bool(scope["level"]),
        "can_manage_users": scope["role"] in ADMIN_ROLES,
        "can_manage_admins": scope["role"] in ADMIN_ROLES,
        "can_view_all_reports": scope["role"] in ADMIN_ROLES,
    }


def _can_view_user(admin_user, target_user):
    admin_scope = _scope_for_user(admin_user)
    target_scope = _scope_for_user(target_user)

    if admin_user.id == target_user.id:
        return True
    if admin_scope["level"] == "national":
        return True
    if admin_scope["level"] == "regional":
        return (
            target_scope["level"] != "national"
            and admin_scope["region"]
            and target_scope["region"]
            and admin_scope["region"].id == target_scope["region"].id
        )
    if admin_scope["level"] == "district":
        return (
            target_scope["level"] not in {"national", "regional"}
            and admin_scope["district"]
            and target_scope["district"]
            and admin_scope["district"].id == target_scope["district"].id
        )
    if admin_scope["level"] == "facility":
        return (
            target_scope["level"] not in {"national", "regional", "district"}
            and admin_scope["facility"]
            and target_scope["facility"]
            and admin_scope["facility"].id == target_scope["facility"].id
        )
    return False


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def levels(request):
    return JsonResponse([
        {"id": "national", "name": "national", "label": "National", "display_name": "National"},
        {"id": "regional", "name": "regional", "label": "Regional", "display_name": "Regional"},
        {"id": "district", "name": "district", "label": "District", "display_name": "District"},
        {"id": "facility", "name": "facility", "label": "Facility", "display_name": "Facility"},
    ], safe=False)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_admin_info(request):
    scope = _scope_for_user(request.user)
    level = scope["level"] or "facility"
    return JsonResponse({
        "user": _user_payload(request.user),
        "level": level,
        "level_name": level.title(),
        "region": _scope_obj(scope["region"]),
        "district": _scope_obj(scope["district"]),
        "facility": _scope_obj(scope["facility"]),
        "can_manage_users": scope["role"] in ADMIN_ROLES,
        "can_manage_admins": scope["role"] in ADMIN_ROLES,
        "can_manage_roles": scope["level"] == "national",
        "can_view_all_reports": scope["role"] in ADMIN_ROLES,
        "is_superuser": request.user.is_superuser,
        "is_staff": request.user.is_staff,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admins_by_level(request, level_name):
    users = User.objects.select_related("userrole", "userrole__role", "userrole__facility").order_by("username")
    users = [user for user in users if _scope_for_user(user)["level"] == level_name and _can_view_user(request.user, user)]
    return JsonResponse([_user_payload(user) for user in users], safe=False)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_admin(request):
    return JsonResponse({
        "success": False,
        "error": "Hierarchy admin creation is not available in the restored backend.",
    }, status=501)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_admin(request, admin_id):
    return JsonResponse({
        "success": False,
        "error": "Hierarchy admin deletion is not available in the restored backend.",
    }, status=501)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def summary(request):
    return JsonResponse({
        "regions": Region.objects.count(),
        "districts": District.objects.count(),
        "facilities": Facility.objects.count(),
        "admins": User.objects.filter(is_staff=True).count(),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def accessible_regions(request):
    regions = Region.objects.all().order_by("name")
    return JsonResponse([{"id": region.id, "name": region.name} for region in regions], safe=False)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def accessible_districts(request):
    districts = District.objects.all().select_related("region").order_by("name")
    return JsonResponse([
        {
            "id": district.id,
            "name": district.name,
            "region_id": district.region_id,
            "region_name": district.region.name if district.region else None,
        }
        for district in districts
    ], safe=False)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def all_user_hierarchy(request):
    users = User.objects.select_related("userrole", "userrole__role", "userrole__facility").order_by("username")
    users = [user for user in users if _can_view_user(request.user, user)]
    return JsonResponse([_user_payload(user) for user in users], safe=False)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_hierarchy(request, user_id):
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)
    if not _can_view_user(request.user, user):
        return JsonResponse({"error": "User is outside your administrative scope"}, status=403)
    return JsonResponse(_user_payload(user))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def assign_user_level(request, user_id):
    user = get_object_or_404(User, id=user_id)
    if not _can_view_user(request.user, user):
        return JsonResponse({"error": "User is outside your administrative scope"}, status=403)

    try:
        data = json.loads(request.body or "{}")
        level = data.get("level_id") or data.get("level")
        role_name = {
            "national": "national_admin",
            "regional": "regional_admin",
            "region": "regional_admin",
            "district": "district_admin",
            "facility": "facility_admin",
        }.get(level)

        if not role_name:
            return JsonResponse({"error": "Please select a valid hierarchy level"}, status=400)

        facility = None
        if level in {"regional", "region"} and data.get("region_id"):
            facility = Facility.objects.filter(region_id=data.get("region_id")).order_by("name").first()
        elif level == "district" and data.get("district_id"):
            facility = Facility.objects.filter(district_id=data.get("district_id")).order_by("name").first()
        elif level == "facility" and data.get("facility_id"):
            facility = Facility.objects.filter(id=data.get("facility_id")).first()

        role = get_object_or_404(Role, name=role_name)
        user_role, _ = UserRole.objects.get_or_create(user=user, defaults={"role": role})
        user_role.role = role
        user_role.facility = facility
        user_role.save()
    except Exception as exc:
        return JsonResponse({"error": str(exc)}, status=400)

    return JsonResponse({
        "success": True,
        "message": "Hierarchy level assigned successfully.",
    })
