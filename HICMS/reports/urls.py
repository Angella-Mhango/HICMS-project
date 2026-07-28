from django.urls import path
from . import views

urlpatterns = [
    # Main report endpoints
    path('generate/', views.generate_report, name='generate-report'),
    path('list/', views.list_reports, name='list-reports'),
    path('download/<int:report_id>/', views.download_report, name='download-report'),
    path('delete/<int:report_id>/', views.delete_report, name='delete-report'),
    
    # Data endpoints for reports
    path('compliance-data/', views.compliance_report_data, name='compliance-data'),
    path('performance-data/', views.performance_report_data, name='performance-data'),
    path('facility-data/', views.facility_summary_data, name='facility-data'),
    path('inspector-data/', views.inspector_activity_data, name='inspector-data'),
    path('trend-data/', views.trend_analysis_data, name='trend-data'),
    
    # Export endpoints
    path('export/compliance/', views.export_compliance_pdf, name='export-compliance'),
    path('export/csv/', views.export_csv, name='export-csv'),
    path('export/excel/', views.export_excel, name='export-excel'),
    
    # Scheduled reports
    path('schedule/', views.list_schedules, name='list-schedules'),
    path('schedule/create/', views.create_schedule, name='create-schedule'),
    path('schedule/<int:schedule_id>/', views.update_schedule, name='update-schedule'),
    path('schedule/<int:schedule_id>/delete/', views.delete_schedule, name='delete-schedule'),
]