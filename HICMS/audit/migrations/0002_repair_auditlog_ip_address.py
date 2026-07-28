from django.db import migrations


def add_ip_address_if_missing(apps, schema_editor):
    table_name = "audit_auditlog"
    with schema_editor.connection.cursor() as cursor:
        existing_columns = {
            column.name for column in schema_editor.connection.introspection.get_table_description(cursor, table_name)
        }
        if "ip_address" not in existing_columns:
            cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN ip_address char(39) NULL")


class Migration(migrations.Migration):
    dependencies = [
        ("audit", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(add_ip_address_if_missing, migrations.RunPython.noop),
    ]
