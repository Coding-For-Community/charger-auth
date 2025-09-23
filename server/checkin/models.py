from django.core.validators import RegexValidator
from django.db import models

from checkin.core.types import FreeBlock


def _free_blocks_field():
    return models.CharField(
        max_length=8,
        default="",
        validators=[RegexValidator(r"[A-G]*")],
        blank=True
    )

class Student(models.Model):
    """
    Represents a cary academy student.
    """
    free_blocks: str = _free_blocks_field()
    checked_in_blocks: str = _free_blocks_field()
    name = models.CharField(max_length=100, default="[Unknown]")
    email = models.EmailField(max_length=200, primary_key=True)

class CheckInRecord(models.Model):
    """
    A model used to ensure that 1 device can't sign in multiple people
    at the same time. The device ID is uniquely assigned based on fingerprint.js.
    """
    device_id = models.CharField(max_length=400, primary_key=True)
    free_blocks: str = _free_blocks_field()

class FreeBlockToday(models.Model):
    """
    Represents the time of a free block today.
    """
    block: FreeBlock = models.CharField(
        max_length=1,
        validators=[RegexValidator("[A-G]")],
        primary_key=True
    )
    time = models.TimeField()

