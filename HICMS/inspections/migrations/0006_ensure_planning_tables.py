from django.db import migrations


def ensure_planning_tables(apps, schema_editor):
    """Create planning tables on clean databases; restored databases already have them."""
    existing = set(schema_editor.connection.introspection.table_names())
    InspectionPlan = apps.get_model('inspections', 'InspectionPlan')
    InspectionSchedule = apps.get_model('inspections', 'InspectionSchedule')

    if InspectionPlan._meta.db_table not in existing:
        schema_editor.create_model(InspectionPlan)
        existing.add(InspectionPlan._meta.db_table)
    if InspectionSchedule._meta.db_table not in existing:
        schema_editor.create_model(InspectionSchedule)


class Migration(migrations.Migration):
    dependencies = [
        ('inspections', '0005_recalculate_standard_scores'),
    ]

    operations = [
        migrations.RunPython(ensure_planning_tables, migrations.RunPython.noop),
    ]
