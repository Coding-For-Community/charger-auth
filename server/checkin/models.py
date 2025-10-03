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
    email = models.EmailField(max_length=200, primary_key=True)
    free_blocks: str = _free_blocks_field()
    checked_in_blocks: str = _free_blocks_field()
    name = models.CharField(max_length=100, default="[Unknown]")
    has_checkin_vids = models.BooleanField(default=False)

class CheckInVideo(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='videos')
    file = models.FileField(upload_to='checkin_vids/')

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

class BackgroundExecutorRequests(models.Model):
    desire_manual_reset = models.BooleanField(default=False)

