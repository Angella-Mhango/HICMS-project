# Restores Django state for planning tables that already exist in the restored DB.

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('facilities', '0002_repair_department_created_at'),
        ('inspections', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.CreateModel(
                    name='InspectionPlan',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('title', models.CharField(max_length=200)),
                        ('description', models.TextField(blank=True)),
                        ('created_at', models.DateTimeField(auto_now_add=True)),
                        ('updated_at', models.DateTimeField(auto_now=True)),
                        ('start_date', models.DateField()),
                        ('end_date', models.DateField()),
                        ('pre_inspection_deadline', models.DateField()),
                        ('status', models.CharField(choices=[('draft', 'Draft'), ('published', 'Published'), ('in_progress', 'In Progress'), ('completed', 'Completed')], default='draft', max_length=20)),
                        ('focus_standard_ids', models.JSONField(blank=True, default=list)),
                        ('facility_ids', models.JSONField(blank=True, default=list)),
                        ('year', models.IntegerField(blank=True, null=True)),
                        ('quarter', models.CharField(default='Q1', max_length=10)),
                        ('is_recurring', models.BooleanField(default=False)),
                        ('recurrence_pattern', models.CharField(default='quarterly', max_length=50)),
                        ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
                    ],
                    options={'ordering': ['-start_date', 'title']},
                ),
                migrations.CreateModel(
                    name='InspectionSchedule',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('scheduled_date', models.DateField()),
                        ('actual_date', models.DateField(blank=True, null=True)),
                        ('deadline', models.DateField()),
                        ('focus_standard_ids', models.JSONField(blank=True, default=list)),
                        ('status', models.CharField(choices=[('scheduled', 'Scheduled'), ('rescheduled', 'Rescheduled'), ('in_progress', 'In Progress'), ('completed', 'Completed'), ('cancelled', 'Cancelled')], default='scheduled', max_length=20)),
                        ('notes', models.TextField(blank=True)),
                        ('assigned_inspector', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='inspection_schedules', to=settings.AUTH_USER_MODEL)),
                        ('facility', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='inspection_schedules', to='facilities.facility')),
                        ('plan', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='schedules', to='inspections.inspectionplan')),
                    ],
                    options={'ordering': ['scheduled_date', 'facility__name']},
                ),
            ],
        ),
    ]
