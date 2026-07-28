import json
import csv
from datetime import datetime, timedelta
from io import BytesIO, StringIO
from django.http import JsonResponse, HttpResponse, FileResponse
from django.shortcuts import get_object_or_404
from django.db.models import Avg, Count, Q, Sum
from django.db.models.functions import TruncMonth, TruncDate
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

from facilities.models import Facility, Department
from inspections.models import Inspection
from audit.utils import log_action


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def compliance_report_data(request):
    """Get data for compliance report"""
    try:
        queryset = Inspection.objects.all()
        
        # Apply filters
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        facility_id = request.GET.get('facility_id')
        department_id = request.GET.get('department_id')
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        if facility_id:
            queryset = queryset.filter(facility_id=facility_id)
        if department_id:
            queryset = queryset.filter(department_id=department_id)
        
        # Group by facility
        facility_data = []
        facilities = queryset.values_list('facility_name', flat=True).distinct()
        
        for facility_name in facilities:
            facility_inspections = queryset.filter(facility_name=facility_name)
            total = facility_inspections.count()
            compliant = facility_inspections.filter(status='Compliant').count()
            non_compliant = total - compliant
            total_score = facility_inspections.aggregate(Sum('score'))['score__sum'] or 0
            avg_score = round(total_score / total, 1) if total > 0 else 0
            
            facility_data.append({
                'facility': facility_name,
                'total': total,
                'compliant': compliant,
                'non_compliant': non_compliant,
                'compliance_rate': round((compliant / total * 100), 1) if total > 0 else 0,
                'avg_score': avg_score
            })
        
        # Sort by compliance rate
        facility_data.sort(key=lambda x: x['compliance_rate'], reverse=True)
        
        return JsonResponse({
            'total_facilities': len(facility_data),
            'total_inspections': queryset.count(),
            'overall_compliance_rate': round((queryset.filter(status='Compliant').count() / queryset.count() * 100), 1) if queryset.count() > 0 else 0,
            'data': facility_data
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def performance_report_data(request):
    """Get data for department performance report"""
    try:
        queryset = Inspection.objects.all()
        
        # Apply date filters
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        department_data = []
        departments = Department.objects.filter(id__in=queryset.values_list('department_id', flat=True).distinct())
        
        for dept in departments:
            dept_inspections = queryset.filter(department=dept)
            total = dept_inspections.count()
            compliant = dept_inspections.filter(status='Compliant').count()
            total_score = dept_inspections.aggregate(Sum('score'))['score__sum'] or 0
            
            department_data.append({
                'department': dept.name,
                'facility': dept.facility.name if dept.facility else 'N/A',
                'total': total,
                'compliant': compliant,
                'compliance_rate': round((compliant / total * 100), 1) if total > 0 else 0,
                'avg_score': round(total_score / total, 1) if total > 0 else 0
            })
        
        department_data.sort(key=lambda x: x['avg_score'], reverse=True)
        
        return JsonResponse(department_data, safe=False)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def facility_summary_data(request):
    """Get data for facility summary report"""
    try:
        facilities = Facility.objects.all()
        data = []
        
        for facility in facilities:
            inspections = Inspection.objects.filter(facility=facility)
            total = inspections.count()
            compliant = inspections.filter(status='Compliant').count()
            total_score = inspections.aggregate(Sum('score'))['score__sum'] or 0
            
            # Get departments for this facility
            departments = Department.objects.filter(facility=facility)
            dept_count = departments.count()
            
            # Get last inspection date
            last_inspection = inspections.order_by('-date').first()
            
            data.append({
                'facility': facility.name,
                'type': facility.facility_type.name if facility.facility_type else 'N/A',
                'district': facility.district.name if facility.district else 'N/A',
                'region': facility.region.name if facility.region else 'N/A',
                'total_inspections': total,
                'compliance_rate': round((compliant / total * 100), 1) if total > 0 else 0,
                'avg_score': round(total_score / total, 1) if total > 0 else 0,
                'department_count': dept_count,
                'last_inspection': last_inspection.date.isoformat() if last_inspection else None
            })
        
        data.sort(key=lambda x: x['compliance_rate'], reverse=True)
        
        return JsonResponse(data, safe=False)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def inspector_activity_data(request):
    """Get data for inspector activity report"""
    try:
        # Get all unique inspectors from inspections
        inspectors = Inspection.objects.values_list('inspector', flat=True).distinct()
        data = []
        
        for inspector in inspectors:
            inspections = Inspection.objects.filter(inspector=inspector)
            total = inspections.count()
            compliant = inspections.filter(status='Compliant').count()
            total_score = inspections.aggregate(Sum('score'))['score__sum'] or 0
            
            # Get unique facilities inspected
            facilities_count = inspections.values('facility_name').distinct().count()
            
            data.append({
                'inspector': inspector,
                'total_inspections': total,
                'compliant': compliant,
                'compliance_rate': round((compliant / total * 100), 1) if total > 0 else 0,
                'avg_score': round(total_score / total, 1) if total > 0 else 0,
                'facilities_inspected': facilities_count,
                'last_inspection': inspections.order_by('-date').first().date.isoformat() if total > 0 else None
            })
        
        data.sort(key=lambda x: x['total_inspections'], reverse=True)
        
        return JsonResponse(data, safe=False)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def trend_analysis_data(request):
    """Get trend analysis data for reports"""
    try:
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        
        queryset = Inspection.objects.all()
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        # Group by month
        monthly_data = (
            queryset
            .annotate(month=TruncMonth('date'))
            .values('month')
            .annotate(
                total=Count('id'),
                compliant=Count('id', filter=Q(status='Compliant')),
                non_compliant=Count('id', filter=Q(status='Non-compliant')),
                avg_score=Avg('score')
            )
            .order_by('month')
        )
        
        data = []
        for item in monthly_data:
            if item['month']:
                data.append({
                    'month': item['month'].strftime('%b %Y'),
                    'total': item['total'],
                    'compliant': item['compliant'],
                    'non_compliant': item['non_compliant'],
                    'compliance_rate': round((item['compliant'] / item['total'] * 100), 1) if item['total'] > 0 else 0,
                    'avg_score': round(item['avg_score'], 1) if item['avg_score'] else 0
                })
        
        return JsonResponse(data, safe=False)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_report(request):
    """Generate a new report"""
    try:
        data = json.loads(request.body)
        
        report_type = data.get('report_type')
        format_type = data.get('format', 'PDF')
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        facility_id = data.get('facility_id')
        department_id = data.get('department_id')
        
        # Build filters
        filters = {
            'report_type': report_type,
            'start_date': start_date,
            'end_date': end_date,
            'facility_id': facility_id,
            'department_id': department_id
        }
        
        # Get report data based on type
        if report_type == 'COMPLIANCE':
            report_data = compliance_report_data(request).data
        elif report_type == 'PERFORMANCE':
            report_data = performance_report_data(request).data
        elif report_type == 'FACILITY':
            report_data = facility_summary_data(request).data
        elif report_type == 'INSPECTOR':
            report_data = inspector_activity_data(request).data
        elif report_type == 'TREND':
            report_data = trend_analysis_data(request).data
        else:
            return JsonResponse({'error': 'Invalid report type'}, status=400)
        
        # Log the report generation
        log_action(
            user=request.user,
            action='GENERATE_REPORT',
            model_name='Report',
            details=f'Generated {report_type} report'
        )
        
        return JsonResponse({
            'success': True,
            'message': 'Report generated successfully',
            'data': report_data,
            'filters': filters
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_reports(request):
    """Get list of generated reports"""
    try:
        from .models import Report
        reports = Report.objects.filter(generated_by=request.user).order_by('-generated_at')
        
        data = [{
            'id': r.id,
            'name': r.name,
            'report_type': r.report_type,
            'format': r.format,
            'generated_at': r.generated_at.isoformat(),
            'status': r.status,
            'total_records': r.total_records,
            'file_size': r.file_size
        } for r in reports]
        
        return JsonResponse(data, safe=False)
        
    except ImportError:
        return JsonResponse([], safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_report(request, report_id):
    """Download a generated report"""
    try:
        from .models import Report
        report = get_object_or_404(Report, id=report_id, generated_by=request.user)
        
        if report.file:
            response = FileResponse(report.file.open('rb'), as_attachment=True)
            response['Content-Disposition'] = f'attachment; filename="{report.name}.{report.format.lower()}"'
            return response
        
        return JsonResponse({'error': 'Report file not found'}, status=404)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_report(request, report_id):
    """Delete a generated report"""
    try:
        from .models import Report
        report = get_object_or_404(Report, id=report_id, generated_by=request.user)
        report.delete()
        
        return JsonResponse({'success': True, 'message': 'Report deleted'})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_csv(request):
    """Export report data as CSV"""
    try:
        data = json.loads(request.GET.get('data', '[]'))
        filename = request.GET.get('filename', 'report')
        
        output = StringIO()
        writer = csv.writer(output)
        
        if data and len(data) > 0:
            # Write headers
            headers = list(data[0].keys())
            writer.writerow(headers)
            
            # Write data
            for row in data:
                writer.writerow([row.get(header, '') for header in headers])
        
        response = HttpResponse(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{filename}_{datetime.now().strftime("%Y%m%d")}.csv"'
        
        log_action(
            user=request.user,
            action='EXPORT_CSV',
            model_name='Report',
            details=f'Exported {filename} as CSV'
        )
        
        return response
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_compliance_pdf(request):
    """Generate and export a compliance report as PDF"""
    try:
        # Create a BytesIO buffer
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=72)
        
        # Styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#166534'),
            spaceAfter=30
        )
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#15803D'),
            spaceAfter=12
        )
        normal_style = styles['Normal']
        
        # Build document
        story = []
        
        # Title
        story.append(Paragraph("Healthcare Inspection & Compliance Report", title_style))
        story.append(Paragraph(f"Generated: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}", normal_style))
        story.append(Spacer(1, 20))
        
        # Get report data
        report_data = compliance_report_data(request)
        if hasattr(report_data, 'data'):
            data = report_data.data
        else:
            data = report_data.json()
        
        # Table data
        table_data = [['Facility', 'Total', 'Compliant', 'Non-Compliant', 'Rate', 'Avg Score']]
        
        for item in data.get('data', []):
            table_data.append([
                item.get('facility', ''),
                str(item.get('total', 0)),
                str(item.get('compliant', 0)),
                str(item.get('non_compliant', 0)),
                f"{item.get('compliance_rate', 0)}%",
                str(item.get('avg_score', 0))
            ])
        
        # Create table
        table = Table(table_data, colWidths=[2*inch, 0.75*inch, 0.75*inch, 0.75*inch, 0.75*inch, 0.75*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#15803D')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(table)
        story.append(Spacer(1, 20))
        
        # Summary
        story.append(Paragraph(f"Total Facilities: {data.get('total_facilities', 0)}", normal_style))
        story.append(Paragraph(f"Total Inspections: {data.get('total_inspections', 0)}", normal_style))
        story.append(Paragraph(f"Overall Compliance Rate: {data.get('overall_compliance_rate', 0)}%", normal_style))
        story.append(Spacer(1, 30))
        story.append(Paragraph("This is a system-generated report from HICMS.", normal_style))
        
        # Build PDF
        doc.build(story)
        
        # Return PDF
        buffer.seek(0)
        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="compliance_report_{datetime.now().strftime("%Y%m%d")}.pdf"'
        
        return response
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_excel(request):
    """Export report data as Excel"""
    try:
        # Try to import openpyxl
        try:
            from openpyxl import Workbook
            from openpyxl.styles import Font, PatternFill, Alignment
        except ImportError:
            return JsonResponse({'error': 'openpyxl not installed. Run: pip install openpyxl'}, status=500)
        
        data = json.loads(request.GET.get('data', '[]'))
        filename = request.GET.get('filename', 'report')
        
        wb = Workbook()
        ws = wb.active
        ws.title = "Report"
        
        if data and len(data) > 0:
            # Write headers
            headers = list(data[0].keys())
            for col, header in enumerate(headers, 1):
                cell = ws.cell(row=1, column=col, value=header)
                cell.font = Font(bold=True)
                cell.fill = PatternFill(start_color="15803D", end_color="15803D", fill_type="solid")
                cell.font = Font(color="FFFFFF", bold=True)
                cell.alignment = Alignment(horizontal="center")
            
            # Write data
            for row, item in enumerate(data, 2):
                for col, header in enumerate(headers, 1):
                    ws.cell(row=row, column=col, value=item.get(header, ''))
        
        # Auto-adjust column widths
        for column in ws.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            ws.column_dimensions[column_letter].width = adjusted_width
        
        # Save to BytesIO
        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        
        response = HttpResponse(buffer.getvalue(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = f'attachment; filename="{filename}_{datetime.now().strftime("%Y%m%d")}.xlsx"'
        
        return response
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_schedules(request):
    """List scheduled reports"""
    try:
        from .models import ReportSchedule
        schedules = ReportSchedule.objects.filter(is_active=True).order_by('next_run')
        
        data = [{
            'id': s.id,
            'name': s.name,
            'report_type': s.report_type,
            'format': s.format,
            'frequency': s.frequency,
            'recipients': s.recipients.split(','),
            'is_active': s.is_active,
            'last_run': s.last_run.isoformat() if s.last_run else None,
            'next_run': s.next_run.isoformat() if s.next_run else None,
            'filters': s.filters
        } for s in schedules]
        
        return JsonResponse(data, safe=False)
        
    except ImportError:
        return JsonResponse([], safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_schedule(request):
    """Create a scheduled report"""
    try:
        data = json.loads(request.body)
        
        from .models import ReportSchedule
        
        schedule = ReportSchedule.objects.create(
            name=data['name'],
            report_type=data['report_type'],
            format=data.get('format', 'PDF'),
            frequency=data['frequency'],
            recipients=data['recipients'],
            filters=data.get('filters', {}),
            is_active=data.get('is_active', True)
        )
        
        log_action(
            user=request.user,
            action='CREATE_SCHEDULE',
            model_name='ReportSchedule',
            object_id=schedule.id,
            details=f'Created schedule: {schedule.name}'
        )
        
        return JsonResponse({
            'success': True,
            'message': 'Schedule created successfully',
            'id': schedule.id
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_schedule(request, schedule_id):
    """Update a scheduled report"""
    try:
        from .models import ReportSchedule
        schedule = get_object_or_404(ReportSchedule, id=schedule_id)
        data = json.loads(request.body)
        
        if 'name' in data:
            schedule.name = data['name']
        if 'report_type' in data:
            schedule.report_type = data['report_type']
        if 'format' in data:
            schedule.format = data['format']
        if 'frequency' in data:
            schedule.frequency = data['frequency']
        if 'recipients' in data:
            schedule.recipients = data['recipients']
        if 'filters' in data:
            schedule.filters = data['filters']
        if 'is_active' in data:
            schedule.is_active = data['is_active']
        
        schedule.save()
        
        return JsonResponse({'success': True, 'message': 'Schedule updated'})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_schedule(request, schedule_id):
    """Delete a scheduled report"""
    try:
        from .models import ReportSchedule
        schedule = get_object_or_404(ReportSchedule, id=schedule_id)
        schedule.delete()
        
        return JsonResponse({'success': True, 'message': 'Schedule deleted'})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)