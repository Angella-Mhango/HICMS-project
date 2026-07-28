def has_permission(user, permission):
    if not hasattr(user, "userrole"):
        return False

    role = user.userrole.role
    permissions = role.permissions or {}

    return permissions.get(permission, False)