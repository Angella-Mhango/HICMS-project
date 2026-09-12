import json
from datetime import date, timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from facilities.models import Department, District, Facility, Region
from accounts.models import Role, UserRole
from standards.models import Requirement, Standard
from .models import Inspection, InspectionPlan


class FacilityQAPlanningTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.role = Role.objects.create(name='facility_qa')
        self.facility = Facility.objects.create(name='QA facility')
        self.other_facility = Facility.objects.create(name='Other facility')
        self.department = Department.objects.create(name='QA department', facility=self.facility)
        self.user = User.objects.create_user(username='qa-planner', password='test-password')
        UserRole.objects.create(user=self.user, role=self.role, facility=self.facility)
        self.client.force_authenticate(self.user)

    def test_qa_can_create_list_and_submit_own_facility_plan(self):
        Inspection.objects.create(facility=self.facility, facility_name=self.facility.name, inspector='qa', visit_type='Observation', notes='PRE_INSPECTION')
        response = self.client.post('/inspections/facility/plans/create/', {
            'title': 'QA readiness plan',
            'facility_id': self.facility.id,
            'departments': [self.department.id],
            'preparation_date': '2026-09-15',
            'status': 'draft',
        }, format='json')

        self.assertEqual(response.status_code, 201)
        plan_id = response.json()['plan']['id']
        plans = self.client.get(f'/inspections/facility/{self.facility.id}/plans/').json()
        self.assertEqual(len(plans), 1)

        submitted = self.client.patch(
            f'/inspections/facility/plans/{plan_id}/', {'status': 'submitted'}, format='json'
        )
        self.assertEqual(submitted.status_code, 200)
        self.assertEqual(submitted.json()['plan']['status'], 'submitted')

    def test_qa_cannot_access_or_create_for_another_facility(self):
        response = self.client.get(f'/inspections/facility/{self.other_facility.id}/plans/')
        self.assertEqual(response.status_code, 403)

        response = self.client.post('/inspections/facility/plans/create/', {
            'title': 'Out of scope',
            'facility_id': self.other_facility.id,
            'departments': [self.department.id],
            'preparation_date': '2026-09-15',
        }, format='json')
        self.assertEqual(response.status_code, 403)
        self.assertFalse(InspectionPlan.objects.exists())


class InspectionPlanFocusStandardTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='plan-admin', password='test-password')
        UserRole.objects.create(user=self.user, role=Role.objects.create(name='national_admin'))
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.facility = Facility.objects.create(name='Plan facility')
        self.standard = Standard.objects.create(
            code='PLAN-1', name='Plan standard', description='Test', category='general'
        )
        self.payload = {
            'title': 'Focused inspection plan',
            'start_date': (date.today() + timedelta(days=1)).isoformat(),
            'end_date': (date.today() + timedelta(days=30)).isoformat(),
            'pre_inspection_deadline': (date.today() + timedelta(days=1)).isoformat(),
            'facility_ids': [self.facility.id],
            'focus_standard_ids': [self.standard.id],
        }

    def test_selected_standard_is_saved_to_plan_and_schedule(self):
        response = self.client.post('/inspections/plans/create/', self.payload, format='json')

        self.assertEqual(response.status_code, 201)
        plan = InspectionPlan.objects.get(id=response.json()['id'])
        self.assertEqual(plan.focus_standard_ids, [self.standard.id])
        self.assertEqual(plan.schedules.get().focus_standard_ids, [self.standard.id])

        gantt = self.client.get('/inspections/gantt-chart-data/').json()
        self.assertEqual(gantt['focus_areas'][0]['id'], self.standard.id)

    def test_plan_rejects_archived_focus_standard(self):
        self.standard.is_active = False
        self.standard.save(update_fields=['is_active'])

        response = self.client.post('/inspections/plans/create/', self.payload, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertFalse(InspectionPlan.objects.exists())

    def test_editing_focus_standards_updates_existing_schedules(self):
        create_response = self.client.post('/inspections/plans/create/', self.payload, format='json')
        replacement = Standard.objects.create(
            code='PLAN-2', name='Replacement standard', description='Test', category='general'
        )

        response = self.client.put(
            f"/inspections/plans/{create_response.json()['id']}/",
            {'focus_standard_ids': [replacement.id]},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        plan = InspectionPlan.objects.get(id=create_response.json()['id'])
        self.assertEqual(plan.focus_standard_ids, [replacement.id])
        self.assertEqual(plan.schedules.get().focus_standard_ids, [replacement.id])

    def test_schedule_rejects_end_date_before_visit_date(self):
        create_response = self.client.post('/inspections/plans/create/', self.payload, format='json')
        schedule = InspectionPlan.objects.get(id=create_response.json()['id']).schedules.get()

        response = self.client.patch(
            f'/inspections/schedules/{schedule.id}/',
            {'scheduled_date': '2026-09-20', 'end_date': '2026-09-19'},
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        schedule.refresh_from_db()
        self.assertNotEqual(schedule.scheduled_date.isoformat(), '2026-09-20')

    def test_completed_schedule_moves_from_upcoming_to_past_visits(self):
        create_response = self.client.post('/inspections/plans/create/', self.payload, format='json')
        schedule = InspectionPlan.objects.get(id=create_response.json()['id']).schedules.get()

        response = self.client.patch(
            f'/inspections/schedules/{schedule.id}/', {'status': 'completed'}, format='json'
        )
        self.assertEqual(response.status_code, 200)

        upcoming = self.client.get('/inspections/gantt-chart-data/').json()
        past = self.client.get('/inspections/gantt-chart-data/?view=past').json()
        self.assertEqual(upcoming['schedules'], [])
        self.assertEqual(past['schedules'][0]['status'], 'completed')
        self.assertIsNotNone(past['schedules'][0]['actual_date'])


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
            {'standard': 'STD-1', 'standard_name': 'Standard one', 'performance': 80.0, 'status': 'Met', 'met': 1, 'not_met': 0},
            {'standard': 'STD-2', 'standard_name': 'Standard two', 'performance': 60.0, 'status': 'Not met', 'met': 0, 'not_met': 1},
        ])

    def test_single_choice_scale_uses_highest_option_as_possible_score(self):
        standard = Standard.objects.create(
            code='SCALE-1', name='Scale standard', description='Test', category='general', max_score=100,
        )
        requirement = Requirement.objects.create(
            standard=standard,
            name='Staff availability',
            max_score=5,
            criteria={'items': [
                {'name': 'Highest', 'points': 5},
                {'name': 'Partial', 'points': 3},
                {'name': 'None', 'points': 0},
            ]},
        )

        response = self.client.post('/inspections/submit-standards/', {
            'facility_name': 'Test facility',
            'responses': [{
                'requirement_id': requirement.id,
                'score': 5,
                'max_score_possible': 9,
                'criteria_scores': {'Highest': True, 'Partial': False, 'None': False},
            }],
        }, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['score'], 100)
        inspection = Inspection.objects.get(id=response.json()['inspection_id'])
        self.assertIn('"score": 5, "possible": 5', inspection.notes)

    def test_zero_point_scale_option_remains_zero(self):
        standard = Standard.objects.create(
            code='SCALE-0', name='Zero scale', description='Test', category='general', max_score=5,
        )
        requirement = Requirement.objects.create(
            standard=standard,
            name='Availability',
            max_score=5,
            criteria={'items': [{'name': 'Available', 'points': 5}, {'name': 'None', 'points': 0}]},
        )
        response = self.client.post('/inspections/submit-standards/', {
            'facility_name': 'Test facility',
            'responses': [{
                'requirement_id': requirement.id,
                'score': 1,
                'criteria_scores': {'Available': False, 'None': True},
            }],
        }, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['score'], 0)


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

    def test_facility_qa_dashboard_is_strictly_limited_to_assigned_facility(self):
        qa_user = User.objects.create_user(username='qa-north', password='test-password')
        qa_role = Role.objects.create(name='facility_qa')
        north_facility = Facility.objects.get(name='North facility')
        UserRole.objects.create(user=qa_user, role=qa_role, facility=north_facility)
        self.client.force_authenticate(qa_user)

        # Even an explicit national query cannot broaden a facility QA officer's scope.
        stats = self.client.get('/inspections/dashboard/filtered/?level=national').json()
        standards = self.client.get('/inspections/standards-performance/filtered/?level=national').json()

        self.assertEqual(stats['total_inspections'], 1)
        self.assertEqual(stats['assessed_facilities'], 1)
        self.assertEqual(len(standards), 1)
        self.assertNotIn('South', json.dumps(standards))


class PlanApprovalWorkflowTests(FacilityQAPlanningTests):
    def test_preinspection_approval_assignment_workflow(self):
        payload = {'title': 'Requested visit', 'facility_id': self.facility.id,
                   'departments': [self.department.id], 'preparation_date': '2027-01-12', 'status': 'submitted'}
        url = '/inspections/facility/plans/create/'
        self.assertEqual(self.client.post(url, payload, format='json').status_code, 400)
        Inspection.objects.create(facility=self.facility, facility_name=self.facility.name,
                                  inspector='qa', visit_type='Observation', notes='PRE_INSPECTION')
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, 201)
        plan = InspectionPlan.objects.get(id=response.json()['plan']['id'])
        self.assertFalse(plan.schedules.exists())
        review = '/inspections/facility/plans/review/'
        self.assertEqual(self.client.patch(review, {'id': plan.id, 'action': 'approve'}, format='json').status_code, 403)
        admin = User.objects.create_user(username='national-reviewer')
        UserRole.objects.create(user=admin, role=Role.objects.create(name='national_admin'))
        inspector = User.objects.create_user(username='assigned-inspector')
        UserRole.objects.create(user=inspector, role=Role.objects.create(name='inspector'))
        self.client.force_authenticate(admin)
        self.assertEqual(len(self.client.get(review).json()), 1)
        self.assertEqual(self.client.patch(review, {'id': plan.id, 'action': 'assign', 'inspector_id': inspector.id}, format='json').status_code, 400)
        self.assertEqual(self.client.patch(review, {'id': plan.id, 'action': 'approve'}, format='json').status_code, 200)
        self.assertEqual(plan.schedules.count(), 1)
        self.assertEqual(self.client.patch(review, {'id': plan.id, 'action': 'approve'}, format='json').status_code, 400)
        self.assertEqual(self.client.patch(review, {'id': plan.id, 'action': 'assign', 'inspector_id': inspector.id}, format='json').status_code, 200)
        self.assertEqual(len(self.client.get('/inspections/gantt-chart-data/').json()['schedules']), 1)
        self.client.force_authenticate(inspector)
        self.assertEqual(len(self.client.get('/inspections/schedules/assigned/').json()), 1)
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.get('/inspections/schedules/assigned/').json(), [])
        self.assertEqual(self.client.patch(f'/inspections/facility/plans/{plan.id}/', {'status': 'draft'}, format='json').status_code, 403)
