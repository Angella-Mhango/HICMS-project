from django.urls import path
from . import views

urlpatterns = [
    # Dashboard endpoints
    path('dashboard/', views.dashboard_stats, name='dashboard-stats'),
    path('dashboard/filtered/', views.dashboard_stats, name='dashboard-stats-filtered'),
    path('dashboard/stats/', views.dashboard_stats),
    path('dashboard/departments/', views.department_performance),
    path('dashboard/districts/', views.district_comparison),
    path('dashboard/facilities/', views.facility_ranking),
    path('dashboard/timeline/', views.inspection_timeline),
    
    # API endpoints
    path('api/', views.inspection_list_api, name='inspection-list-api'),
    path('api/create/', views.create_inspection_api, name='create-inspection-api'),
    path('api/filtered/', views.inspection_list_api, name='inspection-list-filtered'),
    
    # Chart endpoints
    path('chart-data/', views.chart_data, name='chart-data'),
    path('chart-data/filtered/', views.chart_data, name='chart-data-filtered'),
    path('compliance-trends/', views.compliance_trends, name='compliance-trends'),
    path('compliance-trends/filtered/', views.compliance_trends, name='compliance-trends-filtered'),
    path('standards-performance/filtered/', views.standards_performance, name='standards-performance-filtered'),
    path('summary/filtered/', views.summary_stats, name='summary-stats-filtered'),
    path('alerts/', views.alerts_api, name='alerts-api'),
    
    # Ranking endpoints
    path('facility-ranking/', views.facility_ranking, name='facility-ranking'),
    path('department-performance/', views.department_performance, name='department-performance'),
    
    # Gantt Chart
    path('gantt-chart-data/', views.gantt_chart_data, name='gantt-chart-data'),
    
    # User endpoint
    path('users/me/', views.current_user),
    
    # MCM Checklist endpoints
    path('inspection-types/', views.get_inspection_types, name='inspection-types'),
    path('checklist-categories/', views.get_checklist_categories, name='checklist-categories'),
    path('checklist-items/', views.get_checklist_items, name='checklist-items'),
    path('submit-inspection/', views.submit_inspection_with_checklist, name='submit-inspection'),
    path('submit-standards/', views.submit_standard_inspection, name='submit-standards'),
    path('corrective-actions/', views.corrective_actions, name='corrective-actions'),
    path('corrective-actions/<int:action_id>/', views.corrective_action_detail, name='corrective-action-detail'),
    path('corrective-actions/<int:action_id>/comments/', views.corrective_action_comments, name='corrective-action-comments'),
    
    # Future inspection planning endpoints
    path('schedules/options/', views.schedule_options, name='schedule-options'),
    path('schedules/<int:schedule_id>/', views.update_inspection_schedule, name='update-inspection-schedule'),
    path('plans/create/', views.create_inspection_plan, name='create-inspection-plan'),
    path('plans/<int:plan_id>/', views.update_inspection_plan, name='update-inspection-plan'),
    path('facility/<int:facility_id>/plans/', views.facility_plans, name='facility-plans'),
    path('facility/plans/create/', views.create_facility_plan, name='create-facility-plan'),
    path('facility/plans/<int:plan_id>/', views.facility_plan_detail, name='facility-plan-detail'),
        # Pre-inspection endpoints
    path('pre-inspection/<int:facility_id>/', views.pre_inspection_detail, name='pre-inspection'),
    path('pre-inspection/list/', views.list_pre_inspections, name='pre-inspections-list'),
    path('pre-inspection/<int:facility_id>/save/', views.save_pre_inspection, name='save-pre-inspection'),
    
    # Standards endpoint
    path('standards/', views.get_standards, name='get-standards'),
]

