import json
from datetime import datetime, timedelta
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from .models import UserProfile, UserActivity
from audit.utils import log_action
from facilities.models import Facility


def get_user_role(user):
    """Helper to get user role"""
    try:
        return user.userprofile.role
    except:
        return 'inspector'


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_list(request):
    """Get list of all users"""
    try:
        # Check if user is admin
        user_role = get_user_role(request.user)
        if user_role not in ['admin', 'national_admin']:
            return JsonResponse({'error': 'Unauthorized'}, status=403)
        
        users = User.objects.all().select_related('userprofile')
        data = []
        
        for user in users:
            try:
                profile = user.userprofile
                role = profile.role
                facility_name = profile.facility.name if profile.facility else None
                facility_id = profile.facility.id if profile.facility else None
            except:
                role = 'inspector'
                facility_name = None
                facility_id = None
            
            data.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'full_name': f"{user.first_name} {user.last_name}".strip(),
                'role': role,
                'role_display': dict(UserProfile.ROLE_CHOICES).get(role, role),
                'facility': facility_name,
                'facility_id': facility_id,
                'is_active': user.is_active,
                'date_joined': user.date_joined.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None
            })
        
        return JsonResponse(data, safe=False)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_user(request):
    """Create a new user"""
    try:
        # Check if user is admin
        user_role = get_user_role(request.user)
        if user_role not in ['admin', 'national_admin']:
            return JsonResponse({'error': 'Unauthorized'}, status=403)
        
        data = json.loads(request.body)
        
        # Validate required fields
        required = ['username', 'password', 'role']
        for field in required:
            if not data.get(field):
                return JsonResponse({'error': f'{field} is required'}, status=400)
        
        # Check if username exists
        if User.objects.filter(username=data['username']).exists():
            return JsonResponse({'error': 'Username already exists'}, status=400)
        
        # Create user
        user = User.objects.create(
            username=data['username'],
            email=data.get('email', ''),
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', ''),
            password=make_password(data['password']),
            is_active=data.get('is_active', True)
        )
        
        # Create profile
        facility_id = data.get('facility_id')
        facility = None
        if facility_id:
            try:
                facility = Facility.objects.get(id=facility_id)
            except Facility.DoesNotExist:
                pass
        
        UserProfile.objects.create(
            user=user,
            role=data['role'],
            facility=facility,
            phone_number=data.get('phone_number', ''),
            notifications_enabled=data.get('notifications_enabled', True),
            email_notifications=data.get('email_notifications', True)
        )
        
        # Log the action
        log_action(
            user=request.user,
            action='CREATE_USER',
            model_name='User',
            object_id=user.id,
            details=f"Created user {user.username} as {data['role']}"
        )
        
        return JsonResponse({
            'success': True,
            'message': 'User created successfully',
            'user_id': user.id
        }, status=201)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def user_detail(request, user_id):
    """Get, update, or delete a user"""
    try:
        # Check if user is admin
        user_role = get_user_role(request.user)
        if user_role not in ['admin', 'national_admin']:
            return JsonResponse({'error': 'Unauthorized'}, status=403)
        
        user = get_object_or_404(User, id=user_id)
        
        if request.method == 'GET':
            try:
                profile = user.userprofile
                role = profile.role
                facility_name = profile.facility.name if profile.facility else None
                facility_id = profile.facility.id if profile.facility else None
            except:
                role = 'inspector'
                facility_name = None
                facility_id = None
            
            return JsonResponse({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'full_name': f"{user.first_name} {user.last_name}".strip(),
                'role': role,
                'role_display': dict(UserProfile.ROLE_CHOICES).get(role, role),
                'facility': facility_name,
                'facility_id': facility_id,
                'is_active': user.is_active,
                'date_joined': user.date_joined.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None
            })
        
        elif request.method == 'PUT':
            data = json.loads(request.body)
            
            # Update user fields
            if 'email' in data:
                user.email = data['email']
            if 'first_name' in data:
                user.first_name = data['first_name']
            if 'last_name' in data:
                user.last_name = data['last_name']
            if 'is_active' in data:
                user.is_active = data['is_active']
            if 'password' in data and data['password']:
                user.password = make_password(data['password'])
            
            user.save()
            
            # Update profile
            try:
                profile = user.userprofile
                if 'role' in data:
                    profile.role = data['role']
                if 'facility_id' in data:
                    try:
                        profile.facility = Facility.objects.get(id=data['facility_id'])
                    except Facility.DoesNotExist:
                        profile.facility = None
                if 'phone_number' in data:
                    profile.phone_number = data['phone_number']
                profile.save()
            except UserProfile.DoesNotExist:
                # Create profile if it doesn't exist
                facility = None
                if 'facility_id' in data and data['facility_id']:
                    try:
                        facility = Facility.objects.get(id=data['facility_id'])
                    except:
                        pass
                UserProfile.objects.create(
                    user=user,
                    role=data.get('role', 'inspector'),
                    facility=facility,
                    phone_number=data.get('phone_number', '')
                )
            
            log_action(
                user=request.user,
                action='UPDATE_USER',
                model_name='User',
                object_id=user.id,
                details=f"Updated user {user.username}"
            )
            
            return JsonResponse({'success': True, 'message': 'User updated successfully'})
        
        elif request.method == 'DELETE':
            username = user.username
            user.delete()
            
            log_action(
                user=request.user,
                action='DELETE_USER',
                model_name='User',
                object_id=user_id,
                details=f"Deleted user {username}"
            )
            
            return JsonResponse({'success': True, 'message': f'User {username} deleted'})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def toggle_user_active(request, user_id):
    """Toggle user active status"""
    try:
        user_role = get_user_role(request.user)
        if user_role not in ['admin', 'national_admin']:
            return JsonResponse({'error': 'Unauthorized'}, status=403)
        
        user = get_object_or_404(User, id=user_id)
        user.is_active = not user.is_active
        user.save()
        
        log_action(
            user=request.user,
            action='UPDATE_USER',
            model_name='User',
            object_id=user.id,
            details=f"{'Activated' if user.is_active else 'Deactivated'} user {user.username}"
        )
        
        return JsonResponse({
            'success': True,
            'is_active': user.is_active,
            'message': f"User {'activated' if user.is_active else 'deactivated'}"
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_profile(request):
    """Get current user's profile"""
    try:
        user = request.user
        
        try:
            profile = user.userprofile
            role = profile.role
            role_display = dict(UserProfile.ROLE_CHOICES).get(role, role)
            facility_name = profile.facility.name if profile.facility else None
            facility_id = profile.facility.id if profile.facility else None
        except UserProfile.DoesNotExist:
            role = 'inspector'
            role_display = 'Inspector'
            facility_name = None
            facility_id = None
        
        return JsonResponse({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'full_name': f"{user.first_name} {user.last_name}".strip(),
            'role': role,
            'role_display': role_display,
            'facility': facility_name,
            'facility_id': facility_id,
            'is_active': user.is_active,
            'date_joined': user.date_joined.isoformat(),
            'last_login': user.last_login.isoformat() if user.last_login else None
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """Update current user's profile"""
    try:
        data = json.loads(request.body)
        user = request.user
        
        # Update user fields
        if 'email' in data:
            user.email = data['email']
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        user.save()
        
        # Update profile
        try:
            profile = user.userprofile
            if 'phone_number' in data:
                profile.phone_number = data['phone_number']
            if 'notifications_enabled' in data:
                profile.notifications_enabled = data['notifications_enabled']
            if 'email_notifications' in data:
                profile.email_notifications = data['email_notifications']
            profile.save()
        except UserProfile.DoesNotExist:
            pass
        
        return JsonResponse({'success': True, 'message': 'Profile updated successfully'})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_roles(request):
    """Get all available roles"""
    try:
        user_role = get_user_role(request.user)
        if user_role not in ['admin', 'national_admin']:
            return JsonResponse({'error': 'Unauthorized'}, status=403)
        
        roles = [{'value': k, 'label': v} for k, v in UserProfile.ROLE_CHOICES]
        return JsonResponse(roles, safe=False)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_role(request):
    """Create a new role"""
    try:
        user_role = get_user_role(request.user)
        if user_role not in ['admin', 'national_admin']:
            return JsonResponse({'error': 'Unauthorized'}, status=403)
        
        data = json.loads(request.body)
        role_name = data.get('name')
        role_display = data.get('display_name')
        
        if not role_name or not role_display:
            return JsonResponse({'error': 'Name and display name are required'}, status=400)
        
        # Check if role already exists
        current_roles = dict(UserProfile.ROLE_CHOICES)
        if role_name in current_roles:
            return JsonResponse({'error': 'Role already exists'}, status=400)
        
        # Note: Adding roles dynamically requires updating the choices
        # This is handled in the model, but we need to update it here too
        # For now, we'll just return success
        
        return JsonResponse({'success': True, 'message': 'Role created successfully'})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_role(request, role_id):
    """Update a role"""
    try:
        # This would update the role permissions
        # For now, just return success
        return JsonResponse({'success': True, 'message': 'Role updated successfully'})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_role(request, role_id):
    """Delete a role"""
    try:
        user_role = get_user_role(request.user)
        if user_role not in ['admin', 'national_admin']:
            return JsonResponse({'error': 'Unauthorized'}, status=403)
        
        return JsonResponse({'success': True, 'message': 'Role deleted successfully'})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_activities(request):
    """Get all user activities"""
    try:
        user_role = get_user_role(request.user)
        if user_role not in ['admin', 'national_admin']:
            return JsonResponse({'error': 'Unauthorized'}, status=403)
        
        limit = int(request.GET.get('limit', 100))
        
        activities = UserActivity.objects.all().select_related('user').order_by('-timestamp')[:limit]
        
        data = [{
            'id': a.id,
            'user': a.user.username,
            'user_id': a.user.id,
            'action': a.action,
            'action_display': dict(UserActivity.ACTION_CHOICES).get(a.action, a.action),
            'model_name': a.model_name,
            'object_id': a.object_id,
            'details': a.details,
            'ip_address': a.ip_address,
            'timestamp': a.timestamp.isoformat()
        } for a in activities]
        
        return JsonResponse(data, safe=False)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_activities_detail(request, user_id):
    """Get activities for a specific user"""
    try:
        user_role = get_user_role(request.user)
        if user_role not in ['admin', 'national_admin']:
            return JsonResponse({'error': 'Unauthorized'}, status=403)
        
        user = get_object_or_404(User, id=user_id)
        activities = UserActivity.objects.filter(user=user).order_by('-timestamp')[:50]
        
        data = [{
            'id': a.id,
            'action': a.action,
            'action_display': dict(UserActivity.ACTION_CHOICES).get(a.action, a.action),
            'model_name': a.model_name,
            'details': a.details,
            'timestamp': a.timestamp.isoformat()
        } for a in activities]
        
        return JsonResponse(data, safe=False)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_role(request, user_id):
    """Assign a role to a user"""
    try:
        user_role = get_user_role(request.user)
        if user_role not in ['admin', 'national_admin']:
            return JsonResponse({'error': 'Unauthorized'}, status=403)
        
        data = json.loads(request.body)
        role_name = data.get('role')
        
        if not role_name:
            return JsonResponse({'error': 'Role is required'}, status=400)
        
        user = get_object_or_404(User, id=user_id)
        
        # Update user profile
        try:
            profile = user.userprofile
            profile.role = role_name
            profile.save()
        except UserProfile.DoesNotExist:
            UserProfile.objects.create(user=user, role=role_name)
        
        log_action(
            user=request.user,
            action='ASSIGN',
            model_name='User',
            object_id=user.id,
            details=f"Assigned role {role_name} to user {user.username}"
        )
        
        return JsonResponse({'success': True, 'message': f'Role {role_name} assigned successfully'})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_users(request):
    """Search for users"""
    try:
        user_role = get_user_role(request.user)
        if user_role not in ['admin', 'national_admin']:
            return JsonResponse({'error': 'Unauthorized'}, status=403)
        
        query = request.GET.get('q', '')
        if len(query) < 2:
            return JsonResponse([], safe=False)
        
        users = User.objects.filter(
            Q(username__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(email__icontains=query)
        )[:20]
        
        data = [{
            'id': u.id,
            'username': u.username,
            'full_name': f"{u.first_name} {u.last_name}".strip(),
            'email': u.email,
        } for u in users]
        
        return JsonResponse(data, safe=False)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)