from django.core.validators import RegexValidator
from django.db import models
from checkin.core.types import FreeBlock

free_block_validator = RegexValidator(r"[A-G]*")

class Student(models.Model):
    free_blocks: str = models.CharField(
        max_length=8,
        default="",
        validators=[free_block_validator]
    )
    checked_in_blocks: str = models.CharField(
        max_length=8,
        default="",
        validators=[free_block_validator]
    )
    id = models.IntegerField(primary_key=True)
    name = models.CharField(max_length=100, default="[Unknown]")
    email = models.EmailField(max_length=200, default="[Unknown]")

class CustomSchedule(models.Model):
    day = models.DateField(unique=True)

class CustomFreeBlock(models.Model):
    schedule = models.ForeignKey(CustomSchedule, on_delete=models.CASCADE)
    label: FreeBlock = models.CharField(max_length=1, validators=[free_block_validator])
    start_time = models.TimeField()


