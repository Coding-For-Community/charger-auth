from django.db import models
from django.contrib import admin
from checkin.models import Student
from config import settings


class SubscriptionData(models.Model):
    subscription = models.JSONField()
    student = models.ForeignKey(Student, on_delete=models.CASCADE)


if settings.DEBUG:
    admin.site.register(SubscriptionData)
