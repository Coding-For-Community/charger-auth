from django.contrib import admin

from checkin.models import CustomSchedule, CustomFreeBlock, Student

# Register your models here.
admin.site.register(CustomSchedule)
admin.site.register(CustomFreeBlock)
admin.site.register(Student)
