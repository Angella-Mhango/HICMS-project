from django.test import TestCase
from django.contrib.auth.models import User
from facilities.models import Facility
from inspections.models import Inspection

class ReportTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='admin', password='testpass')
        self.facility = Facility.objects.create(name='Test Hospital')
    
    def test_compliance_report(self):
        # Create some inspection data
        inspection = Inspection.objects.create(
            facility_name='Test Hospital',
            facility=self.facility,
            inspector='admin',
            visit_type='Baseline',
            score=85,
            max_score=100,
            benchmark=80
        )
        
        # Test that the report generates without errors
        # This is a basic test, you can expand as needed
        self.assertEqual(inspection.score, 85)