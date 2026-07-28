from .models import AuditLog

def log_action(user, action, model_name=None, object_id=None, details=None):
    """
    Log an action to the audit trail
    
    Args:
        user: The user performing the action
        action: The action being performed (CREATE, UPDATE, DELETE, etc.)
        model_name: The model being affected (User, Inspection, Facility, etc.)
        object_id: The ID of the object being affected
        details: Additional details about the action
    """
    try:
        AuditLog.objects.create(
            user=user,
            action=action,
            model=model_name or '',
            object_id=object_id,
            details=details or ''
        )
    except Exception as e:
        print(f"Error logging action: {e}")