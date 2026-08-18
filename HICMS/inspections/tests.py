import json

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from facilities.models import Department, District, Facility, Region
from .models import Inspection


class StandardsPerformanceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='dashboard-admin', password='test-password')
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_returns_met_and_not_met_standard_performance(self):
        snapshots = [
            {'id': 1, 'code': 'STD-1', 'name': 'Standard one', 'score': 8, 'possible': 10},
            {'id': 2, 'code': 'STD-2', 'name': 'Standard two', 'score': 6, 'possible': 10},
        ]
        Inspection.objects.create(
            facility_name='Test facility',
            inspector='Inspector',
            visit_type='Baseline',
            notes=f"STANDARD_PERFORMANCE={json.dumps(snapshots)}",
        )

        response = self.client.get('/inspections/standards-performance/filtered/?level=national')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [
            {'standard': 'STD-1', 'standard_name': 'Standard one', 'performance': 80.0, 'status': 'Met'},
            {'standard': 'STD-2', 'standard_name': 'Standard two', 'performance': 60.0, 'status': 'Not met'},
        ])


class DashboardLocationFilterTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='location-admin', password='test-password')
        self.client = APIClient()
        self.client.force_authenticate(self.user)

        north = Region.objects.create(name='North')
        south = Region.objects.create(name='South')
        north_district = District.objects.create(name='North district', region=north)
        south_district = District.objects.create(name='South district', region=south)
        north_facility = Facility.objects.create(name='North facility', region=north, district=north_district)
        south_facility = Facility.objects.create(name='South facility', region=south, district=south_district)
        north_department = Department.objects.create(name='North department', facility=north_facility)
        south_department = Department.objects.create(name='South department', facility=south_facility)

        Inspection.objects.create(
            facility=north_facility, facility_name=north_facility.name, department=north_department,
            inspector='North inspector', visit_type='Baseline', score=70,
            notes='STANDARD_PERFORMANCE=' + json.dumps([
                {'id': 1, 'code': 'NORTH', 'name': 'North standard', 'score': 9, 'possible': 10},
            ]),
        )
        Inspection.objects.create(
            facility=south_facility, facility_name=south_facility.name, department=south_department,
            inspector='South inspector', visit_type='Baseline', score=40,
            notes='STANDARD_PERFORMANCE=' + json.dumps([
                {'id': 2, 'code': 'SOUTH', 'name': 'South standard', 'score': 4, 'possible': 10},
            ]),
        )
        self.query = f'?level=region&id={north.id}'

    def test_every_dashboard_dataset_honors_selected_location(self):
        expected_counts = {
            '/inspections/dashboard/filtered/': ('total_inspections', 1),
            '/inspections/summary/filtered/': ('total_facilities', 1),
        }
        for url, (key, expected) in expected_counts.items():
            with self.subTest(url=url):
                response = self.client.get(url + self.query)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()[key], expected)

        list_endpoints = [
            '/inspections/dashboard/departments/',
            '/inspections/dashboard/districts/',
            '/inspections/dashboard/facilities/',
            '/inspections/dashboard/timeline/',
            '/inspections/chart-data/filtered/',
            '/inspections/compliance-trends/filtered/',
            '/inspections/standards-performance/filtered/',
        ]
        for url in list_endpoints:
            with self.subTest(url=url):
                response = self.client.get(url + self.query)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(len(response.json()), 1)
                self.assertNotIn('South', json.dumps(response.json()))

    def test_corrective_action_status_and_comments_are_persisted(self):
        response = self.client.get('/inspections/corrective-actions/' + self.query)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        action_id = response.json()[0]['id']

        response = self.client.patch(
            f'/inspections/corrective-actions/{action_id}/',
            {'status': 'In Progress'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'In Progress')

        response = self.client.post(
            f'/inspections/corrective-actions/{action_id}/comments/',
            {'comment': 'Remediation work has started.'},
            format='json',
        )
        self.assertEqual(response.status_code, 201)

        refreshed = self.client.get('/inspections/corrective-actions/' + self.query).json()[0]
        self.assertEqual(refreshed['status'], 'In Progress')
        self.assertEqual(refreshed['comments'][0]['text'], 'Remediation work has started.')
