from django.core.validators import RegexValidator
from django.db import models
from checkin.core.types import FreeBlock

free_block_validator = RegexValidator(r"[A-G]*")

class Student(models.Model):
    # SKY API/OneRoster server code 70% done
    # A list of chars that represents all the blocks a student hasn't checked in yet
    absent_free_blocks: str = models.CharField(
        max_length=8,
        default="",
        validators=[free_block_validator]
    )
    id = models.IntegerField(primary_key=True)


class CustomSchedule(models.Model):
    day = models.DateField(unique=True)

class CustomFreeBlock(models.Model):
    schedule = models.ForeignKey(CustomSchedule, on_delete=models.CASCADE)
    label: FreeBlock = models.CharField(
        max_length=1,
        validators=[free_block_validator],
        primary_key=True
    )
    start_time = models.TimeField()


