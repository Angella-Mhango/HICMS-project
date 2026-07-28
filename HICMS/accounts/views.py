from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
import json
from .models import UserRole, Role
from audit.utils import log_action
from facilities.models import Facility


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


def _get_user_role(user):
    try:
        return user.userrole
    except UserRole.DoesNotExist:
        return None


def _role_name(user):
    user_role = _get_user_role(user)
    return user_role.role.name if user_role and user_role.role else "No Role"


def _facility_for_user(user, user_role=None):
    if user_role is None:
        user_role = _get_user_role(user)
    if user_role and user_role.facility:
        return user_role.facility

    facility_name = FACILITY_USERNAME_MAP.get(user.username.lower())
    if facility_name:
        return Facility.objects.select_related("district", "region").filter(name__iexact=facility_name).first()
    return None


def _district_for_username(username):
    key = username.lower()
    for prefix in ("district_", "supervisor_"):
        if key.startswith(prefix):
            district_name = key.removeprefix(prefix).replace("_", " ")
            from facilities.models import District

            return District.objects.select_related("region").filter(name__iexact=district_name).first()
    return None


def _region_for_username(username):
    region_name = REGION_USERNAME_MAP.get(username.lower())
    if not region_name:
        return None
    from facilities.models import Region

    return Region.objects.filter(name__iexact=region_name).first()


def _scope_for_user(user):
    user_role = _get_user_role(user)
    role = user_role.role.name.lower() if user_role and user_role.role else ""
    facility = _facility_for_user(user, user_role)
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
        "role": role,
        "facility": facility,
        "district": district,
        "region": region,
    }


def _representative_facility_for_scope(scope):
    if scope["facility"]:
        return scope["facility"]
    if scope["district"]:
        return Facility.objects.filter(district=scope["district"]).order_by("name").first()
    if scope["region"]:
        return Facility.objects.filter(region=scope["region"]).order_by("name").first()
    return None


def _is_admin(user):
    return _role_name(user).lower() in ADMIN_ROLES


def _can_view_user(admin_user, target_user):
    admin_scope = _scope_for_user(admin_user)
    target_scope = _scope_for_user(target_user)

    if admin_user.id == target_user.id:
        return True
    if admin_scope["level"] == "national":
        return True
    if admin_scope["level"] == "regional":
        return (
            target_scope["level"] not in {"national"}
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


def _serialize_user(user):
    user_role = _get_user_role(user)
    role_name = user_role.role.name if user_role and user_role.role else "No Role"
    role_id = user_role.role.id if user_role and user_role.role else None
    scope = _scope_for_user(user)
    facility = scope["facility"]
    district = scope["district"]
    region = scope["region"]

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "is_active": user.is_active,
        "date_joined": user.date_joined.isoformat() if user.date_joined else None,
        "role": role_name,
        "role_id": role_id,
        "facility": facility.name if facility else None,
        "facility_id": facility.id if facility else None,
        "district": district.name if district else None,
        "district_id": district.id if district else None,
        "region": region.name if region else None,
        "region_id": region.id if region else None,
        "hierarchy_level": scope["level"],
        "hierarchy_display": scope["level"].title() if scope["level"] else "Standard",
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_role(request):
    try:
        user_role = request.user.userrole
        role_name = user_role.role.name
        facility_id = user_role.facility.id if user_role.facility else None
        facility_name = user_role.facility.name if user_role.facility else None
    except:
        role_name = "inspector"
        facility_id = None
        facility_name = None

    return JsonResponse({
        "username": request.user.username,
        "role": role_name,
        "facility_id": facility_id,
        "facility_name": facility_name,
        "email": request.user.email,
        "first_name": request.user.first_name,
        "last_name": request.user.last_name,
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def user_list_create(request):
    if not _is_admin(request.user):
        return JsonResponse({"error": "Admin only"}, status=403)

    if request.method == 'GET':
        users = User.objects.select_related("userrole", "userrole__role", "userrole__facility").order_by("username")
        user_list = [_serialize_user(user) for user in users if _can_view_user(request.user, user)]

        return JsonResponse(user_list, safe=False)

    if request.method == 'POST':
        try:
            data = json.loads(request.body)

            if not data.get("username") or not data.get("password"):
                return JsonResponse({"error": "Username and password required"}, status=400)

            user = User.objects.create(
                username=data["username"],
                email=data.get("email", ""),
                first_name=data.get("first_name", ""),
                last_name=data.get("last_name", ""),
                password=make_password(data["password"]),
                is_active=data.get("is_active", True)
            )

            role = Role.objects.filter(id=data.get("role_id")).first() if data.get("role_id") else None
            role_name = data.get("role", "inspector")
            if not role:
                role = Role.objects.filter(name__iexact=role_name).first()

            if not role:
                return JsonResponse({"error": f"Role '{role_name}' does not exist"}, status=400)

            facility = Facility.objects.filter(id=data.get("facility_id")).first() if data.get("facility_id") else None
            if not facility and _scope_for_user(request.user)["level"] != "national":
                facility = _representative_facility_for_scope(_scope_for_user(request.user))

            UserRole.objects.create(
                user=user,
                role=role,
                facility=facility,
            )

            log_action(
                user=request.user,
                action="CREATE_USER",
                model_name="User",
                object_id=user.id,
                details=f"Created {user.username} as {role.name}"
            )

            return JsonResponse({"success": True, "message": "User created successfully"})

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def user_detail(request, user_id):
    if not _is_admin(request.user):
        return JsonResponse({"error": "Unauthorized"}, status=403)

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)

    if not _can_view_user(request.user, user):
        return JsonResponse({"error": "User is outside your administrative scope"}, status=403)

    if request.method == 'GET':
        return JsonResponse(_serialize_user(user))

    if request.method in ['PUT', 'PATCH']:
        try:
            data = json.loads(request.body)

            user.email = data.get("email", user.email)
            user.first_name = data.get("first_name", user.first_name)
            user.last_name = data.get("last_name", user.last_name)
            user.is_active = data.get("is_active", user.is_active)

            if data.get("password"):
                user.password = make_password(data["password"])

            user.save()

            role = None
            if data.get("role_id"):
                role = Role.objects.get(id=data["role_id"])
            elif data.get("role"):
                role = Role.objects.get(name=data["role"])
            if role:
                user_role, _ = UserRole.objects.get_or_create(user=user, defaults={"role": role})
                user_role.role = role
                if "facility_id" in data:
                    user_role.facility = Facility.objects.filter(id=data.get("facility_id")).first()
                user_role.save()

            log_action(
                user=request.user,
                action="UPDATE_USER",
                model_name="User",
                object_id=user.id
            )

            return JsonResponse({"success": True, "message": "User updated successfully"})

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    if request.method == 'DELETE':
        try:
            username = user.username
            user_id = user.id
            user.delete()

            log_action(
                user=request.user,
                action="DELETE_USER",
                model_name="User",
                object_id=user_id
            )

            return JsonResponse({"success": True, "message": f"{username} deleted"})

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_roles(request):
    roles = Role.objects.all().values('id', 'name', 'description', 'permissions')
    return JsonResponse(list(roles), safe=False)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_role(request):
    if _scope_for_user(request.user)["level"] != "national":
        return JsonResponse({"error": "Only national admins can manage roles"}, status=403)

    try:
        data = json.loads(request.body)
        name = (data.get("name") or "").strip()
        if not name:
            return JsonResponse({"error": "Role name is required"}, status=400)
        role = Role.objects.create(
            name=name,
            description=data.get("description", ""),
            permissions=data.get("permissions", []),
        )
        return JsonResponse({
            "success": True,
            "id": role.id,
            "message": "Role created successfully",
        }, status=201)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def role_detail(request, role_id):
    if _scope_for_user(request.user)["level"] != "national":
        return JsonResponse({"error": "Only national admins can manage roles"}, status=403)

    role = get_object_or_404(Role, id=role_id)

    if request.method == 'PUT':
        try:
            data = json.loads(request.body)
            role.name = data.get("name", role.name)
            role.description = data.get("description", role.description)
            role.permissions = data.get("permissions", role.permissions)
            role.save()
            return JsonResponse({"success": True, "message": "Role updated successfully"})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    if UserRole.objects.filter(role=role).exists():
        return JsonResponse({"error": "Cannot delete a role that is assigned to users"}, status=400)

    role.delete()
    return JsonResponse({"success": True, "message": "Role deleted successfully"})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_role(request, user_id):
    if not _is_admin(request.user):
        return JsonResponse({"error": "Unauthorized"}, status=403)

    target_user = get_object_or_404(User, id=user_id)
    if not _can_view_user(request.user, target_user):
        return JsonResponse({"error": "User is outside your administrative scope"}, status=403)

    try:
        data = json.loads(request.body)
        role = get_object_or_404(Role, id=data.get("role_id"))
        user_role, _ = UserRole.objects.get_or_create(user=target_user, defaults={"role": role})
        user_role.role = role
        user_role.save()
        return JsonResponse({"success": True, "message": "Role assigned successfully"})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_permissions(request):
    from django.contrib.auth.models import Permission
    
    permissions = Permission.objects.all().values('id', 'name', 'codename')
    return JsonResponse(list(permissions), safe=False)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_audit_logs(request):
    if not _is_admin(request.user):
        return JsonResponse({"error": "Unauthorized"}, status=403)

    from audit.models import AuditLog

    logs = AuditLog.objects.all().order_by('-timestamp')[:100]

    data = []
    for log in logs:
        data.append({
            "id": log.id,
            "user": log.user.username if log.user else "System",
            "action": log.action,
            "model": log.model,
            "object_id": log.object_id,
            "details": log.details or "",
            "timestamp": log.timestamp.strftime('%Y-%m-%d %H:%M:%S')
        })

    return JsonResponse(data, safe=False)
