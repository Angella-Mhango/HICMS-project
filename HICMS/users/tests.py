from django.test import TestCase
from django.contrib.auth.models import User
from .models import UserProfile

class UserTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='admin', password='testpass')
        UserProfile.objects.create(user=self.admin, role='admin')
        
        self.inspector = User.objects.create_user(username='inspector', password='testpass')
        UserProfile.objects.create(user=self.inspector, role='inspector')
    
    def test_user_profile_creation(self):
        profile = UserProfile.objects.get(user=self.admin)
        self.assertEqual(profile.role, 'admin')
    
    def test_user_role(self):
        self.assertEqual(self.admin.userprofile.role, 'admin')
        self.assertEqual(self.inspector.userprofile.role, 'inspector')