from django.test import TestCase
from django.contrib.auth.models import User
from .models import InspectorProfile

class InspectorProfileTests(TestCase):
    def test_create_inspector_profile(self):
        user = User.objects.create_user(username='inspector1', password='testpass123')
        profile = InspectorProfile.objects.create(
            user=user,
            specialization='GENERAL',
            years_of_experience=5
        )
        self.assertEqual(profile.user.username, 'inspector1')
        self.assertEqual(profile.specialization, 'GENERAL')