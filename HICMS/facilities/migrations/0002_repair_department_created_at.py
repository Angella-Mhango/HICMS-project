from django.db import migrations
from django.utils import timezone


def add_department_created_at(apps, schema_editor):
    table_name = "facilities_department"
    column_name = "created_at"

    with schema_editor.connection.cursor() as cursor:
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = {row[1] for row in cursor.fetchall()}

        if column_name not in columns:
            now = timezone.now().isoformat().replace("'", "''")
            cursor.execute(
                f"ALTER TABLE {table_name} ADD COLUMN {column_name} datetime NOT NULL DEFAULT '{now}'"
            )


class Migration(migrations.Migration):
    dependencies = [
        ("facilities", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(add_department_created_at, migrations.RunPython.noop),
    ]
