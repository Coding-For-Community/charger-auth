from django.core.validators import RegexValidator
from django.db import models

class Student(models.Model):
    free_blocks: str = models.CharField(
        max_length=8,
        default="",
        validators=[RegexValidator(r"[A-G]*")],
        blank=True
    )
    checked_in_blocks: str = models.CharField(
        max_length=8,
        default="",
        validators=[RegexValidator(r"[A-G]*")],
        blank=True
    )
    name = models.CharField(max_length=100, default="[Unknown]")
    email = models.EmailField(max_length=200, primary_key=True)
