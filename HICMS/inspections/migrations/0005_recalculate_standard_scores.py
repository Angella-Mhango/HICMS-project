import json

from django.db import migrations


MARKER = 'STANDARD_PERFORMANCE='


def criterion_points(item):
    if isinstance(item, dict):
        value = item.get('points', 0)
    else:
        value = 1
    try:
        return float(value) if value is not None else 0
    except (TypeError, ValueError):
        return 0


def recalculate_scores(apps, schema_editor):
    Inspection = apps.get_model('inspections', 'Inspection')
    Requirement = apps.get_model('standards', 'Requirement')

    for inspection in Inspection.objects.filter(notes__contains=MARKER):
        prefix, raw_snapshot = inspection.notes.rsplit(MARKER, 1)
        try:
            snapshot = json.loads(raw_snapshot.strip())
        except (TypeError, ValueError, json.JSONDecodeError):
            continue
        if not isinstance(snapshot, list):
            continue

        total_score = 0
        total_possible = 0
        changed = False
        for standard in snapshot:
            standard_id = standard.get('id')
            if not standard_id:
                continue
            possible = 0
            for requirement in Requirement.objects.filter(standard_id=standard_id):
                criteria = requirement.criteria if isinstance(requirement.criteria, dict) else {}
                items = criteria.get('items') if isinstance(criteria.get('items'), list) else []
                if items:
                    possible += round(max((criterion_points(item) for item in items), default=0))
                else:
                    possible += int(requirement.max_score or 0)
            if possible > 0 and possible != int(standard.get('possible') or 0):
                standard['possible'] = possible
                changed = True
            total_score += int(standard.get('score') or 0)
            total_possible += int(standard.get('possible') or 0)

        if not changed or total_possible <= 0:
            continue
        percentage = round((total_score / total_possible) * 100)
        inspection.score = percentage
        inspection.status = 'Compliant' if percentage >= int(inspection.benchmark or 80) else 'Non-compliant'
        inspection.notes = f"{prefix}{MARKER}{json.dumps(snapshot)}".strip()
        inspection.save(update_fields=['score', 'status', 'notes'])


class Migration(migrations.Migration):
    dependencies = [
        ('inspections', '0004_corrective_actions'),
        ('standards', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(recalculate_scores, migrations.RunPython.noop),
    ]
