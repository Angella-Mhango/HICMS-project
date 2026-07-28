from django.db import migrations


def add_userrole_is_active(apps, schema_editor):
    table_name = 'accounts_userrole'
    column_name = 'is_active'

    with schema_editor.connection.cursor() as cursor:
        cursor.execute(f"PRAGMA table_info({table_name})")
        existing_columns = {row[1] for row in cursor.fetchall()}

        if column_name not in existing_columns:
            cursor.execute(
                f"ALTER TABLE {table_name} ADD COLUMN {column_name} bool NOT NULL DEFAULT 1"
            )


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(add_userrole_is_active, migrations.RunPython.noop),
    ]
