from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('inspections', '0002_inspectionschedule'),
        ('standards', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='StandardResponse',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('score', models.IntegerField(default=0)),
                ('max_score_possible', models.IntegerField(default=0)),
                ('inspection', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='standard_responses', to='inspections.inspection')),
                ('requirement', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='inspection_responses', to='standards.requirement')),
            ],
            options={'unique_together': {('inspection', 'requirement')}},
        ),
    ]
