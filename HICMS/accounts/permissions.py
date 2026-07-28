from django.http import HttpResponseForbidden
from django.core.exceptions import PermissionDenied

def role_required(allowed_roles=[]):
    def decorator(view_func):
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                raise PermissionDenied("User not authenticated")
            
            if not hasattr(request.user, 'userrole'):
                raise PermissionDenied("User has no role assigned")
            
            if request.user.userrole.role.name not in allowed_roles:
                raise PermissionDenied("User role not authorized")
                
            return view_func(request, *args, **kwargs) 
        return wrapper
    return decorator

def has_permission(user, permission_name):
    if not user.is_authenticated:
        return False
    try:
        return user.userrole.role.permissions.filter(codename=permission_name).exists()
    except (AttributeError, user.userrole.DoesNotExist):
        return False