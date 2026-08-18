from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0003_repair_role_permissions'),
    ]

    operations = [
        migrations.AddField(
            model_name='role',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
    ]
