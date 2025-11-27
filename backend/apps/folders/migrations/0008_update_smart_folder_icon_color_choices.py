# Generated manually for SmartFolder icon and color choices update

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("folders", "0007_smart_folder_enhancements"),
    ]

    operations = [
        migrations.AlterField(
            model_name="smartfolder",
            name="icon",
            field=models.CharField(
                choices=[
                    ("folder-search", "Folder Search"),
                    ("folder-star", "Folder Star"),
                    ("folder-clock", "Folder Clock"),
                    ("filter", "Filter"),
                    ("search", "Search"),
                    ("star", "Star"),
                    ("bookmark", "Bookmark"),
                    ("tag", "Tag"),
                    ("calendar", "Calendar"),
                    ("briefcase", "Briefcase"),
                    ("folder_special", "Special Folder"),
                ],
                default="folder-search",
                max_length=50,
            ),
        ),
        migrations.AlterField(
            model_name="smartfolder",
            name="color",
            field=models.CharField(
                choices=[
                    ("blue", "Blue"),
                    ("green", "Green"),
                    ("yellow", "Yellow"),
                    ("orange", "Orange"),
                    ("red", "Red"),
                    ("purple", "Purple"),
                    ("pink", "Pink"),
                    ("teal", "Teal"),
                    ("indigo", "Indigo"),
                    ("gray", "Gray"),
                ],
                default="blue",
                max_length=20,
            ),
        ),
    ]
