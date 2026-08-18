from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('inspections', '0003_standardresponse'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='CorrectiveAction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('Pending', 'Pending'), ('In Progress', 'In Progress'), ('Completed', 'Completed')], default='Pending', max_length=20)),
                ('deadline', models.DateField(blank=True, null=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('inspection', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='corrective_action', to='inspections.inspection')),
            ],
            options={'db_table': 'inspections_correctiveactionrecord'},
        ),
        migrations.CreateModel(
            name='CorrectiveActionComment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('corrective_action', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='comments', to='inspections.correctiveaction')),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['created_at', 'id']},
        ),
    ]
