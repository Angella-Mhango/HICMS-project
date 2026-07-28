from django.db import migrations


def add_role_permissions(apps, schema_editor):
    table_name = 'accounts_role'
    column_name = 'permissions'

    with schema_editor.connection.cursor() as cursor:
        cursor.execute(f"PRAGMA table_info({table_name})")
        existing_columns = {row[1] for row in cursor.fetchall()}

        if column_name not in existing_columns:
            cursor.execute(
                f"ALTER TABLE {table_name} ADD COLUMN {column_name} text NOT NULL DEFAULT '[]'"
            )


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_repair_userrole_is_active'),
    ]

    operations = [
        migrations.RunPython(add_role_permissions, migrations.RunPython.noop),
    ]
